import { Router } from 'express';
import {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  bulkDeleteCustomers,
  getCustomerStats,
} from '../controllers/customerController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

// Protect all routes
router.use(protect);

// Stats endpoint (must be before /:id)
router.get('/stats', getCustomerStats);

// CRUD
router.get('/', getCustomers);
router.get('/:id', getCustomerById);
router.post('/', createCustomer);
router.put('/:id', updateCustomer);
router.delete('/', bulkDeleteCustomers);   // bulk delete (body: { ids: [] })
router.delete('/:id', deleteCustomer);

export default router;
