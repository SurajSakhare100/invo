import mongoose from 'mongoose';
import Customer from '../models/Customer';
import Invoice from '../models/Invoice';
import Transaction from '../models/Transaction';
import User from '../models/User';

const CUSTOMERS_DATA = [
  { name: 'Aarav Sharma', email: 'aarav@techflow.in', phone: '+91 98765 43210', company: 'TechFlow Solutions', address: '42 MG Road, Koregaon Park', city: 'Pune', country: 'India', status: 'Active' },
  { name: 'Emily Carter', email: 'emily@pixelcraft.com', phone: '+1 (415) 555-0192', company: 'PixelCraft Studios', address: '88 Market St, Suite 400', city: 'San Francisco', country: 'United States', status: 'Active' },
  { name: 'James O\'Brien', email: 'james@cloudnine.co.uk', phone: '+44 20 7946 0958', company: 'CloudNine Ltd', address: '12 Baker Street', city: 'London', country: 'United Kingdom', status: 'Active' },
  { name: 'Priya Patel', email: 'priya@designhub.in', phone: '+91 87654 32109', company: 'DesignHub Creative', address: '15 FC Road, Shivaji Nagar', city: 'Pune', country: 'India', status: 'Active' },
  { name: 'Lucas Müller', email: 'lucas@autobahn.de', phone: '+49 30 1234 5678', company: 'Autobahn Digital GmbH', address: 'Friedrichstraße 43', city: 'Berlin', country: 'Germany', status: 'Active' },
  { name: 'Sofia Rossi', email: 'sofia@bellavista.it', phone: '+39 06 9876 5432', company: 'BellaVista Design', address: 'Via Roma 28', city: 'Milan', country: 'France', status: 'Lead' },
  { name: 'Ravi Krishnan', email: 'ravi@nexgen.in', phone: '+91 76543 21098', company: 'NexGen Infotech', address: '5th Floor, Hinjewadi IT Park', city: 'Pune', country: 'India', status: 'Active' },
];

const ITEMS_DATA = [
  { description: 'UI/UX Design Services', qty: 1, unitPrice: 1500, total: 1500 },
  { description: 'React Development Retainer', qty: 1, unitPrice: 3200, total: 3200 },
  { description: 'API Integrations & Backend', qty: 1, unitPrice: 2200, total: 2200 },
  { description: 'Cloud DevOps Setup', qty: 1, unitPrice: 1800, total: 1800 },
  { description: 'SEO optimization retainer', qty: 1, unitPrice: 750, total: 750 },
];

/**
 * Seeds demo data for a specific user (called after registration).
 * Only seeds if the user has no existing customers.
 */
export async function seedDemoDataForUser(userId: mongoose.Types.ObjectId | string): Promise<void> {
  try {
    const userObjectId = new mongoose.Types.ObjectId(String(userId));

    // Skip if user already has data
    const existing = await Customer.countDocuments({ user: userObjectId });
    if (existing > 0) return;

    console.log(`🌱 Seeding demo data for new user ${userId}...`);

    // 1. Create Customers
    const createdCustomers = [];
    for (let i = 0; i < CUSTOMERS_DATA.length; i++) {
      const c = CUSTOMERS_DATA[i];
      const customer = new Customer({
        ...c,
        customerId: `CUST-${String(i + 1).padStart(4, '0')}`,
        totalInvoices: 0,
        totalSpent: 0,
        user: userObjectId,
      });
      await customer.save();
      createdCustomers.push(customer);
    }

    // 2. Create Invoices spread across last 12 months
    const statuses = ['Draft', 'Pending', 'Unpaid', 'Success', 'Failed'] as const;
    const currencies = ['USD', 'EUR', 'GBP', 'INR'];
    const createdInvoices = [];
    const now = new Date();

    for (let i = 0; i < 24; i++) {
      const cust = createdCustomers[i % createdCustomers.length];
      const randomItem = ITEMS_DATA[i % ITEMS_DATA.length];
      const currency = currencies[i % currencies.length];
      const status = statuses[i % statuses.length];
      const daysAgo = Math.floor((i / 24) * 365);
      const createdAt = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
      const dueDate = new Date(createdAt.getTime() + 14 * 24 * 60 * 60 * 1000);

      const invoice = new Invoice({
        invoiceNumber: `INV-${String(i + 1).padStart(4, '0')}`,
        client: cust.name,
        clientEmail: cust.email,
        amount: randomItem.total,
        currency,
        status,
        dueDate,
        items: [randomItem],
        notes: 'Net 14 payment terms.',
        createdAt,
        updatedAt: createdAt,
        user: userObjectId,
      });
      await invoice.save();
      createdInvoices.push(invoice);
    }

    // 3. Create Transactions for non-Draft / non-Unpaid invoices
    const paymentMethods = ['Card', 'Bank Transfer', 'Cash', 'PayPal'] as const;
    let txnCounter = 1;

    for (const inv of createdInvoices) {
      if (inv.status === 'Draft' || inv.status === 'Unpaid') continue;

      const matchingCust = createdCustomers.find((c) => c.email === inv.clientEmail);
      const txnStatus = inv.status === 'Success' ? 'Success'
        : inv.status === 'Failed' ? 'Failed'
        : 'Pending';

      const transaction = new Transaction({
        transactionId: `TXN-${String(txnCounter++).padStart(4, '0')}`,
        invoice: inv._id,
        invoiceNumber: inv.invoiceNumber,
        customer: matchingCust ? matchingCust._id : null,
        customerName: inv.client,
        amount: inv.amount,
        currency: inv.currency,
        paymentMethod: paymentMethods[txnCounter % paymentMethods.length],
        status: txnStatus,
        referenceNumber: `REF-${Math.floor(100000000 + Math.random() * 900000000)}`,
        paymentDate: inv.createdAt,
        notes: `Auto-generated payment for ${inv.invoiceNumber}`,
        user: userObjectId,
      });
      await transaction.save();

      if (matchingCust && txnStatus === 'Success') {
        matchingCust.totalSpent += inv.amount;
        matchingCust.totalInvoices += 1;
        await matchingCust.save();
      }
    }

    console.log(`🎉 Demo data seeded successfully for user ${userId}`);
  } catch (error) {
    console.error('❌ Demo data seeding failed:', error);
  }
}

/**
 * Called on server startup — seeds demo data for the first user found
 * if the database is empty. This ensures data is visible on first login.
 */
export async function autoSeedIfEmpty() {
  try {
    const customerCount = await Customer.countDocuments();
    if (customerCount > 0) {
      console.log('✅ Database is already populated. Skipping auto-seeding.');
      return;
    }

    const firstUser = await User.findOne().sort({ createdAt: 1 }).lean();
    if (!firstUser) {
      console.log('⚠️  No users found in DB. Skipping auto-seeding (will run after first registration).');
      return;
    }

    await seedDemoDataForUser(String(firstUser._id));
  } catch (error) {
    console.error('❌ Auto-seeding failed:', error);
  }
}
