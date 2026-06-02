import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is not defined");
}

const stripMarkdown = (text) => {
  let cleaned = text.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/'''json\n?/g, "").replace(/```\n?$/g, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/```\n?/g, "");
  }
  return cleaned.trim();
};

export const generateMonthlyInsight = async ({
  totalIncome,
  totalExpenses,
  savingsRate,
  expenseBreakdown,
  previousMonths,
  currency = "MYR",
}) => {
  const breakdownText =
    expenseBreakdown.length > 0
      ? expenseBreakdown
          .map(
            (c) => `${c.category}: ${c.percentage}% (${c.amount.toFixed(2)})`,
          )
          .join("\n")
      : "No breakdown available yet";

  const trendText =
    previousMonths.length > 0
      ? previousMonths
          .map(
            (m) =>
              `${m.month}: Income ${currency} ${m.income.toFixed(2)}, Expenses ${currency} ${m.expenses.toFixed(2)}`,
          )
          .join("\n")
      : "No trend data available";

    const prompt = `Analyze this user's monthly financial data and generate actionable insights.
    
    Currency: ${currency}
    Total Income (this month): ${currency} ${totalIncome.toFixed(2)}
    Total Expenses (this month): ${currency} ${totalExpenses.toFixed(2)}
    Savings Rate: ${savingsRate.toFixed(1)}%

    Expense breakdown by category (this month):
    ${breakdownText}

    Previous Month Trend:
    ${trendText}

    Return ONLY valid JSON (no markdown, no commentary) in this exact structure:
    {
    "summary": "2-3 sentences summary of the user's financial health this month",
    "highlights": ["Positive observation 1", "Positive observation 2"],
    "concerns": ["Concern 1", "Concern 2"],
    "recommendations": [
    {"title": "Short title", "detail": "Actionable suggestion (1-2 sentences)"}
    ],
    "topSpendingCategory": "Category name or null",
    "estimateMonthlySavings": number,
    "healthscore": number
    }

    Constraints:
    -"healthScore" must be an integer between 0 and 100.
    - Provide 3 recommendations.
    - reference actual numbers from the data. Tone: friendly but honest.`;


    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
              responseMimeType: 'application/json'
            }
        });
       return JSON.parse(response.text);
       
    } catch (error) {
        console.error('Gemini API error (monthly insight):', error);
        throw new Error('Failed to generate monthly insight. Please try again');
    }
};

export const generateBudgetAlert = async ({
    categoryName,
    budgetAmount,
    spentAmount,
    daysIntoPeriod,
    currency = 'MYR',
}) => {
    const percentUsed = ((spentAmount/budgetAmount) * 100).toFixed(1);
    const daysLeft = totalPeriodDays - daysIntoPeriod;

    const prompt = `A user is tracking a budget. Generate a helpful alert.

    Category: ${categoryName}
    Budget: ${currency} ${budgetAmount.toFixed(2)}
    Spent so far: ${currency} ${spentAmount.toFixed(2)} (${percentUsed}% used)
    Days into period: ${daysIntoPeriod} of ${totalPeriodDays} (${daysLeft} days left)

    Return ONLY valid JSON (no markdown):
    {
        "severity": "info|warning|critical",
        "title": "Short alert title",
        "message": "1-2 sentence emphatetic message referencing actual members",
        "suggestion": ["Specific action 1", "Specific action 2", "Specific action 3"]
    }

    Severity Guide:
    - info: under 70% spent
    - warning: 70-100% spent
    - critical: over 100% spent`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        const cleaned = stripMarkdown(response.text);
        return JSON.parse(cleaned);
    } catch (error) {
        console.error('Gemini API error (budget alert):', error);
        throw new Error('Failed to generate budget alert. Please try again');
    }
};

export const generateSavingsTips = async ({ topCategories, monthlyIncome, currency ='MYR' }) => {
    const categoryText = topCategories.length > 0
        ? topCategories.map(c => `${c.category}: ${currency} ${c.amount.toFixed(2)} across ${c.transactionCount} transactions`).join('\n')
        : 'No top categories available yet';

    const prompt = `A user wants personalized savings tips based on their top spending categories.

    Monthly Income Baseline: ${currency} ${monthlyIncome.toFixed(2)}
    Top Categories (last 30 days):
    ${categoryText}

    Return ONLY valid JSON array (no markdown) in this exact structure:
    [
      {
        "category": "Category Name",
        "tip": "Specific actionable 1-2 sentence tip tailored to this category",
        "estimatedSavings": number
      }
    ]
    
    Provide exactly 4 ranked tips. Reference practical ways to shave off expenses.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    const cleaned = stripMarkdown(response.text);
    return JSON.parse(cleaned);
  } catch (error) {
    console.error('Gemini API error (savings tips):', error);
    throw new Error('Failed to generate savings tips. Please try again');
  }


};

export const analyzeTransactionList = async ({ transactions, currency = 'MYR' }) => {
  const formattedTransactions = transactions
    .slice(0, 50)
    .map(t => {
      const dateStr = typeof t.transaction_date === 'string' ? t.transaction_date : new Date(t.transaction_date).toISOString().split('T')[0];
      return `[${dateStr}] ${t.type.toUpperCase()} - ${t.category_name || 'Uncategorized'}: ${currency} ${parseFloat(t.amount).toFixed(2)} (${t.description || ''})`;
    })
    .join('\n');

  const prompt = `Analyze these ${transactions.length} transactions and provide a concise, helpful short overview.
    
    Transactions:
    ${formattedTransactions}

    Return ONLY valid JSON (no markdown):
    {
      "insight": "A friendly 2-4 sentence analysis highlighting spending patterns, spikes, or good habits based strictly on these transactions.",
      "highlight": "A short 2-4 word summary phrase (e.g., 'Stable spending', 'High dining expenses')"
    }`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    const cleaned = stripMarkdown(response.text);
    return JSON.parse(cleaned);
  } catch (error) {
    console.error('Gemini API error (transaction analysis):', error);
    throw new Error('Failed to analyze transactions. Please try again');
  }
};

export const analyzeBudgetList = async ({ budgets, currency = 'MYR', todayDate }) => {
  const budgetText = budgets
    .map(b => `${b.category_name}: Budget ${currency} ${parseFloat(b.amount).toFixed(2)}, Spent ${currency} ${parseFloat(b.spent).toFixed(2)} (${b.period} period)`)
    .join('\n');

  const prompt = `You are an automated budget analyzer. Evaluate the user's progress for their active budgets.
    
    Today's Date (for pacing awareness): ${todayDate}
    Active Budgets:
    ${budgetText}

    Return ONLY a valid JSON array (no markdown) containing an object for each budget in the EXACT order listed above:
    [
      {
        "budget_id": number_or_string,
        "status": "good|caution|concerning",
        "message": "A 1-sentence analytical verdict referencing the pacing and numbers."
      }
    ]`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    const cleaned = stripMarkdown(response.text);
    return JSON.parse(cleaned);
  } catch (error) {
    console.error('Gemini API error (budget list analysis):', error);
    throw new Error('Failed to analyze budget list. Please try again');
  }
};

export default {
  generateMonthlyInsight,
  generateBudgetAlert,
  generateSavingsTips,
  analyzeTransactionList,
  analyzeBudgetList
};

