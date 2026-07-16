import { Router } from 'express';
import {
  getTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  bulkDeleteTransactions,
  getTransactionStats,
} from '../controllers/transactionController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

// Protect all routes
router.use(protect);

// Stats endpoint (must be before /:id)
router.get('/stats', getTransactionStats);

// CRUD
router.get('/', getTransactions);
router.get('/:id', getTransactionById);
router.post('/', createTransaction);
router.put('/:id', updateTransaction);
router.delete('/', bulkDeleteTransactions);   // bulk delete (body: { ids: [] })
router.delete('/:id', deleteTransaction);

export default router;
