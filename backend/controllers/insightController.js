import pool from "../db.js";
import {
  generateMonthlyInsight,
  generateBudgetAlert,
  generateSavingsTips, // Kept the naming consistent
} from "../utils/gemini.js";

const getUserCurrency = async (userId) => {
  const result = await pool.query("SELECT currency FROM users WHERE id = $1", [
    userId,
  ]);
  return result.rows[0]?.currency || "MYR";
};

export const getInsights = async (req, res) => {
  try {
    // FIXED: Added '= $1' to make it a valid WHERE clause
    const result = await pool.query(
      "SELECT * FROM ai_insights WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50",
      [req.userId],
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching insights:", error);
    res.status(500).json({ error: "Failed to fetch insights" });
  }
};

const buildMonthlyInsight = async (userId) => {
  const data = await pool.query(
    `WITH current_month AS (
      SELECT
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS expense
      FROM transactions
      WHERE user_id = $1
        AND transaction_date >= date_trunc('month', CURRENT_DATE)
    ),
    breakdown AS (
      SELECT c.name AS category, SUM(t.amount) AS amount
      FROM transactions t
      JOIN categories c ON c.id = t.category_id
      WHERE t.user_id = $1
        AND t.type = 'expense'
        AND t.transaction_date >= date_trunc('month', CURRENT_DATE)
      GROUP BY c.name
      ORDER BY amount DESC
    ),
    trend AS (
      SELECT
        to_char(date_trunc('month', transaction_date), 'YYYY-MM') AS month,
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS expenses
      FROM transactions
      WHERE user_id = $1
        AND transaction_date >= date_trunc('month', CURRENT_DATE) - INTERVAL '3 months'
        AND transaction_date < date_trunc('month', CURRENT_DATE)
      GROUP BY 1
      ORDER BY 1
    )
    SELECT
      (SELECT income FROM current_month) AS income,
      (SELECT expense FROM current_month) AS expense,
      (SELECT json_agg(breakdown) FROM breakdown) AS breakdown,
      (SELECT json_agg(trend) FROM trend) AS trend`,
    [userId],
  );

  const row = data.rows[0] || {};
  const totalIncome = parseFloat(row.income || 0);
  const totalExpenses = parseFloat(row.expense || 0);
  const savingsRate =
    totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;
  const currency = await getUserCurrency(userId);

  const content = await generateMonthlyInsight({
    totalIncome,
    totalExpenses,
    savingsRate,
    expenseBreakdown: (row.breakdown || []).map((b) => ({
      category: b.category,
      amount: parseFloat(b.amount || 0),
    })),
    // FIXED: Swapped row.breakdown to row.trend here
    previousMonths: (row.trend || []).map((t) => ({
      month: t.month,
      income: parseFloat(t.income || 0),
      expenses: parseFloat(t.expenses || 0),
    })),
    currency,
  });

  const now = new Date();
  const periodStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const periodEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  return {
    periodStart,
    periodEnd,
    content,
  };
};

const buildSavingsTips = async (userId) => {
  const top = await pool.query(
    `SELECT c.name AS category, SUM(t.amount) AS amount, COUNT(t.id) AS count
    FROM transactions t
    JOIN categories c ON c.id = t.category_id
    WHERE t.user_id = $1
    AND t.type = 'expense'
    AND t.transaction_date >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY c.name
    ORDER BY amount DESC
    LIMIT 5`,
    [userId],
  );

  const incomeResult = await pool.query(
    `SELECT COALESCE(SUM(amount),0) AS income
    FROM transactions
    WHERE user_id = $1
    AND type = 'income'
    AND transaction_date >= CURRENT_DATE - INTERVAL '30 days'`,
    [userId],
  );

  const currency = await getUserCurrency(userId);

  // FIXED: Renamed function invocation to generateSavingsTips (matching import)
  const content = await generateSavingsTips({
    topCategories: top.rows.map((r) => ({
      category: r.category,
      amount: parseFloat(r.amount || 0),
      count: parseInt(r.count, 10),
    })),
    monthlyIncome: parseFloat(incomeResult.rows[0]?.income || 0),
    currency,
  });

  return {
    content,
    periodStart: null,
    periodEnd: null,
    // Using null fields for cleaner consistency if the database schema requires them
  };
};

const buildBudgetAlert = async (userId, categoryId) => {
  if (!categoryId) {
    const err = new Error("Category Id is required for budget alert");
    err.status = 400;
    throw err;
  }

  const budgetRow = await pool.query(
    `SELECT b.*, c.name AS category_name,
      COALESCE((
      SELECT SUM(amount) FROM transactions
      WHERE user_id = b.user_id
      AND category_id = b.category_id
      AND type = 'expense'
      AND transaction_date >= date_trunc('month', CURRENT_DATE)
      ), 0) AS spent
      FROM budgets b
      JOIN categories c ON c.id = b.category_id
      WHERE b.user_id = $1
      AND b.category_id = $2`,
    [userId, categoryId],
  );

  if (budgetRow.rows.length === 0) {
    const err = new Error("Budget not found for the given category");
    err.status = 404;
    throw err;
  }

  const b = budgetRow.rows[0];
  const now = new Date();

  // FIXED: Calculated daysIntoPeriod so it isn't undefined
  const daysIntoPeriod = now.getDate();
  const totalPeriodDays = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
  ).getDate();
  const currency = await getUserCurrency(userId);

  const content = await generateBudgetAlert({
    categoryName: b.category_name,
    budgetAmount: parseFloat(b.amount),
    spentAmount: parseFloat(b.spent),
    daysIntoPeriod,
    totalPeriodDays,
    currency,
  });

  return { content, periodStart: null, periodEnd: null };
};

export const generateInsight = async (req, res) => {
  const { type, categoryId } = req.body;

  if (!type) {
    return res.status(400).json({ message: "Insight type is required" });
  }

  try {
    let result;
    if (type === "monthly_summary") {
      result = await buildMonthlyInsight(req.userId);
    } else if (type === "saving_tips") {
      // FIXED: Fixed the method name to reference the local buildSavingsTips function
      result = await buildSavingsTips(req.userId);
    } else if (type === "budget_alert") {
      result = await buildBudgetAlert(req.userId, categoryId);
    } else {
      return res.status(400).json({ message: "Invalid insight type" });
    }

    const inserted = await pool.query(
      `INSERT INTO ai_insights (user_id, insight_type, period_start, period_end, content_json) 
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.userId, type, result.periodStart, result.periodEnd, result.content],
    );

    res.status(201).json(inserted.rows[0]);
  } catch (error) {
    console.error("Error generating insight:", error);
    res
      .status(error.status || 500)
      .json({ message: error.message || "Failed to generate insight" });
  }
};
