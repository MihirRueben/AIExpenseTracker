import express from 'express';
import {
    getTransactions,
    getTransactionById,
    createTransaction,
    analyzeTransactions,
    updateTransaction,
    deleteTransaction
} from '../controllers/transactionController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// All transaction routes require authentication
router.use(protect);

// Get all transactions for the authenticated user
router.get('/', getTransactions);

// Get a specific transaction by ID
router.get('/:id', getTransactionById);

// Create a new transaction
router.post('/', createTransaction);

// Analyze transactions
router.post('/analyze', analyzeTransactions);

// Update a transaction
router.put('/:id', updateTransaction);

// Delete a transaction
router.delete('/:id', deleteTransaction);

export default router;