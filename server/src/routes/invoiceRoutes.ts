import { Router } from 'express';
import {
  getInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  bulkDeleteInvoices,
  getInvoiceStats,
  sendInvoicePdf,
} from '../controllers/invoiceController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

router.use(protect);

router.get('/stats', getInvoiceStats);
router.get('/', getInvoices);
router.get('/:id', getInvoiceById);
router.post('/', createInvoice);
router.post('/:id/send-pdf', sendInvoicePdf);
router.put('/:id', updateInvoice);
router.delete('/', bulkDeleteInvoices);
router.delete('/:id', deleteInvoice);

export default router;
