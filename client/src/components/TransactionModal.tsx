import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import { TRANSACTION_STATUS_OPTIONS, PAYMENT_METHODS, CURRENCIES } from '../data/data';
import type { Transaction, TransactionFormData } from '../types';

const transactionSchema = z.object({
  customerName: z.string().min(1, 'Customer name is required'),
  amount: z.coerce.number().min(0.01, 'Amount must be greater than 0'),
  currency: z.string().min(1),
  paymentMethod: z.enum(['Cash', 'Razorpay']),
  status: z.enum(['Success', 'Pending', 'Failed', 'Refunded']),
  referenceNumber: z.string(),
  paymentDate: z.string().min(1, 'Payment date is required'),
  notes: z.string(),
});



interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: TransactionFormData) => Promise<void>;
  transaction?: Transaction | null;
  loading?: boolean;
}

export function TransactionModal({
  isOpen,
  onClose,
  onSubmit,
  transaction,
  loading = false,
}: TransactionModalProps) {
  const isEditing = !!transaction;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      customerName: '',
      amount: 0,
      currency: 'USD',
      paymentMethod: 'Cash',
      status: 'Success',
      referenceNumber: '',
      paymentDate: new Date().toISOString().split('T')[0],
      notes: '',
    },
  });

  // Pre-fill when editing
  useEffect(() => {
    if (transaction) {
      reset({
        customerName: transaction.customerName,
        amount: transaction.amount,
        currency: transaction.currency,
        paymentMethod: transaction.paymentMethod,
        status: transaction.status,
        referenceNumber: transaction.referenceNumber,
        paymentDate: transaction.paymentDate.split('T')[0],
        notes: transaction.notes,
      });
    } else {
      reset({
        customerName: '',
        amount: 0,
        currency: 'USD',
        paymentMethod: 'Cash',
        status: 'Success',
        referenceNumber: '',
        paymentDate: new Date().toISOString().split('T')[0],
        notes: '',
      });
    }
  }, [transaction, reset, isOpen]);

  const handleFormSubmit = async (values: any) => {
    await onSubmit(values as TransactionFormData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={!loading ? onClose : undefined}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {isEditing ? 'Edit Payment Record' : 'Record New Payment'}
            </h2>
            {isEditing && (
              <p className="text-xs text-gray-400 mt-0.5">{transaction?.transactionId}</p>
            )}
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors disabled:opacity-50"
          >
            <X size={16} className="text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <form
          id="transaction-form"
          onSubmit={handleSubmit(handleFormSubmit)}
          className="flex-1 overflow-y-auto px-6 py-5 space-y-5"
        >
          {/* Customer Name */}

          {/* Customer Name (Free text / Auto-filled) */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Customer / Payer Name <span className="text-red-500">*</span>
            </label>
            <input
              {...register('customerName')}
              placeholder="Enter Payer's Full Name"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400 transition-all read-only:bg-gray-50 read-only:text-gray-500"
            />
            {errors.customerName && (
              <p className="text-xs text-red-500 mt-1">{errors.customerName.message}</p>
            )}
          </div>

          {/* Amount, Currency & Payment Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Amount Paid <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <select
                  {...register('currency')}
                  disabled={isEditing}
                  className="px-2 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 bg-white disabled:bg-gray-50 disabled:text-gray-500"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <input
                  {...register('amount')}
                  type="number"
                  step="0.01"
                  min="0"
                  readOnly={isEditing}
                  placeholder="0.00"
                  className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400 transition-all read-only:bg-gray-50 read-only:text-gray-500"
                />
              </div>
              {errors.amount && (
                <p className="text-xs text-red-500 mt-1">{errors.amount.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Payment Date <span className="text-red-500">*</span>
              </label>
              <input
                {...register('paymentDate')}
                type="date"
                readOnly={isEditing}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400 transition-all read-only:bg-gray-50 read-only:text-gray-500"
              />
              {errors.paymentDate && (
                <p className="text-xs text-red-500 mt-1">{errors.paymentDate.message}</p>
              )}
            </div>
          </div>

          {/* Payment Method, Status & Reference Number */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Payment Method
              </label>
              <select
                {...register('paymentMethod')}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 bg-white"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Status
              </label>
              <select
                {...register('status')}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 bg-white"
              >
                {TRANSACTION_STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Reference Number
              </label>
              <input
                {...register('referenceNumber')}
                placeholder="e.g. TXN-1293817"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400 transition-all"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Notes</label>
            <textarea
              {...register('notes')}
              placeholder="Internal notes or description of the transaction..."
              rows={3}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400 transition-all resize-none"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-white transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            form="transaction-form"
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 rounded-xl bg-[#7ED957] text-black text-sm font-bold hover:bg-[#6fcf4a] transition-colors disabled:opacity-70 flex items-center gap-2 shadow-sm"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                {isEditing ? 'Saving…' : 'Recording…'}
              </>
            ) : isEditing ? (
              'Save Changes'
            ) : (
              'Record Payment'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
