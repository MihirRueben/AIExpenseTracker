import express from "express";
import { 
    getCategories, 
    createCategory, 
    updateCategory, 
    deleteCategory 
} from "../controllers/categoryController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(protect);

// Get all categories for the authenticated user
router.get("/", getCategories);

// Create a new category
router.post("/", createCategory);

// Update a category
router.put("/:id", updateCategory);

// Delete a category
router.delete("/:id", deleteCategory);

export default router;