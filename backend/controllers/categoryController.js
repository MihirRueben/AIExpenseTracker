import pool from "../db.js";

export const getCategories = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM categories WHERE is_default = TRUE OR user_id = $1 ORDER BY type, name`,
      [req.userId],
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const createCategory = async (req, res) => {
    try {
        const { name, type, icon, color } = req.body;
        
        // 1. Grab the authorized user's ID (matching the variable set by your middleware)
        const userId = req.userId || req.user?.id; 

        // Sanity check to protect against missing IDs
        if (!userId) {
            return res.status(401).json({ message: 'User identity not found in request context' });
        }

        // 2. Making sure user_id ($1) is included in target columns and values array
        const query = `
            INSERT INTO categories (user_id, name, type, icon, color, is_default)
            VALUES ($1, $2, $3, $4, $5, FALSE)
            RETURNING *;
        `;

        const values = [userId, name, type, icon, color];
        const result = await pool.query(query, values);

        return res.status(201).json(result.rows[0]);

    } catch (error) {
        console.error("Error creating category:", error);
        return res.status(500).json({ message: error.message });
    }
};

export const updateCategory = async (req, res) => {
  const { id } = req.params;
  const { name, icon, color } = req.body;

  try {
    // 1. Force the URL string parameter into a clean integer 
    const categoryId = parseInt(id, 10);
    const userId = req.userId;

    console.log(`Attempting update on Category ID: ${categoryId} by User ID: ${userId}`);

    // 2. Execute the update query
    const result = await pool.query(
      `UPDATE categories 
       SET name = COALESCE($1, name), 
           icon = COALESCE($2, icon), 
           color = COALESCE($3, color) 
       WHERE id = $4 AND user_id = $5 
       RETURNING *`,
      [name, icon, color, categoryId, userId]
    );
    
    // 3. If no rows were updated, it means the category doesn't exist OR belongs to someone else
    if (result.rows.length === 0) {
      console.log(` Update blocked: Category ${categoryId} not found or doesn't belong to User ${userId}`);
      return res.status(404).json({ 
        message: "Category not found or unauthorized to edit. Remember: Default global categories (IDs 1-17) cannot be modified." 
      });
    }
    
    console.log(`Category ${categoryId} updated successfully!`);
    return res.json(result.rows[0]);

  } catch (error) {
    console.error("Error updating category:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

export const deleteCategory = async (req, res) => {
    const { id } = req.params;
    
    try {
        const result = await pool.query(
            "DELETE FROM categories WHERE id = $1 AND user_id = $2 RETURNING *",
            [id, req.userId],
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Category not found" });
        }
        
        res.json({ message: "Category deleted successfully" });
    } catch (error) {
        console.error("Error deleting category:", error);
        res.status(500).json({ message: "Server error" });
    }
};