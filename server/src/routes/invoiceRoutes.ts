import { Router } from 'express';
import {
  getInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  bulkDeleteInvoices,
  getInvoiceStats,
} from '../controllers/invoiceController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

// Protect all routes
router.use(protect);

// Stats endpoint (must be before /:id)
router.get('/stats', getInvoiceStats);

// CRUD
router.get('/', getInvoices);
router.get('/:id', getInvoiceById);
router.post('/', createInvoice);
router.put('/:id', updateInvoice);
router.delete('/', bulkDeleteInvoices);   // bulk delete (body: { ids: [] })
router.delete('/:id', deleteInvoice);

export default router;
