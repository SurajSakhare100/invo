import { Request, Response } from 'express';
import Customer from '../models/Customer';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { buildSort } from '../utils/queryFilters';

// GET /api/customers — list with filter, search, pagination
export const getCustomers = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      status,
      search,
      page = '1',
      limit = '10',
      country,
      sortBy,
      sortOrder,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

    // Build filter query
    const query: Record<string, unknown> = { user: (req as AuthenticatedRequest).user?.id };

    if (status && status !== 'All') {
      query.status = status;
    }

    if (country && country !== 'All') {
      query.country = country;
    }

    if (search) {
      const regex = new RegExp(search as string, 'i');
      query.$or = [
        { name: regex },
        { customerId: regex },
        { email: regex },
        { company: regex },
        { phone: regex },
      ];
    }

    const sort = buildSort('customers', sortBy as string | undefined, sortOrder as string | undefined);

    const [customers, total] = await Promise.all([
      Customer.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Customer.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: customers,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error });
  }
};

// GET /api/customers/:id
export const getCustomerById = async (req: Request, res: Response): Promise<void> => {
  try {
    const customer = await Customer.findOne({ _id: req.params.id, user: (req as AuthenticatedRequest).user?.id }).lean();
    if (!customer) {
      res.status(404).json({ success: false, message: 'Customer not found' });
      return;
    }
    res.json({ success: true, data: customer });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error });
  }
};

// POST /api/customers
export const createCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, phone, company, address, city, country, status, notes } = req.body;

    const customer = new Customer({
      name,
      email,
      phone: phone || '',
      company: company || '',
      address: address || '',
      city: city || '',
      country: country || '',
      status: status || 'Active',
      notes: notes || '',
      user: (req as AuthenticatedRequest).user?.id,
    });

    await customer.save();
    res.status(201).json({ success: true, data: customer });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'name' in error && (error as { name: string }).name === 'ValidationError') {
      res.status(400).json({ success: false, message: 'Validation error', error });
      return;
    }
    res.status(500).json({ success: false, message: 'Server error', error });
  }
};

// PUT /api/customers/:id
export const updateCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, phone, company, address, city, country, status, notes } = req.body;

    const customer = await Customer.findOneAndUpdate(
      { _id: req.params.id, user: (req as AuthenticatedRequest).user?.id },
      { name, email, phone, company, address, city, country, status, notes },
      { new: true, runValidators: true }
    ).lean();

    if (!customer) {
      res.status(404).json({ success: false, message: 'Customer not found' });
      return;
    }
    res.json({ success: true, data: customer });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error });
  }
};

// DELETE /api/customers/:id
export const deleteCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const customer = await Customer.findOneAndDelete({ _id: req.params.id, user: (req as AuthenticatedRequest).user?.id });
    if (!customer) {
      res.status(404).json({ success: false, message: 'Customer not found' });
      return;
    }
    res.json({ success: true, message: 'Customer deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error });
  }
};

// DELETE /api/customers (bulk)
export const bulkDeleteCustomers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ success: false, message: 'ids array is required' });
      return;
    }
    const result = await Customer.deleteMany({ _id: { $in: ids }, user: (req as AuthenticatedRequest).user?.id });
    res.json({ success: true, message: `Deleted ${result.deletedCount} customer(s)` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error });
  }
};

// GET /api/customers/stats — summary counts per status
export const getCustomerStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const stats = await Customer.aggregate([
      { $match: { user: new (require('mongoose').Types.ObjectId)((_req as AuthenticatedRequest).user?.id) } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalSpent: { $sum: '$totalSpent' },
        },
      },
    ]);
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error });
  }
};
