import { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Plus, Trash2 } from 'lucide-react';
import type { Invoice, InvoiceFormData } from '../types';
import { STATUS_OPTIONS, CURRENCIES } from '../data/data';

const itemSchema = z.object({
  description: z.string().min(1, 'Description required'),
  qty: z.coerce.number().min(1, 'Min 1'),
  unitPrice: z.coerce.number().min(0, 'Min 0'),
  total: z.coerce.number(),
});

const invoiceSchema = z.object({
  client: z.string().min(1, 'Client name required'),
  clientEmail: z.string().email('Valid email required'),
  amount: z.coerce.number().min(0.01, 'Amount must be > 0'),
  currency: z.string().min(1),
  status: z.enum(['Draft', 'Pending', 'Unpaid', 'Success', 'Failed']),
  dueDate: z.string().min(1, 'Due date required'),
  items: z.array(itemSchema),
  notes: z.string(),
});



interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: InvoiceFormData) => Promise<void>;
  invoice?: Invoice | null;
  loading?: boolean;
}

export function InvoiceModal({
  isOpen,
  onClose,
  onSubmit,
  invoice,
  loading = false,
}: InvoiceModalProps) {
  const isEditing = !!invoice;

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      client: '',
      clientEmail: '',
      amount: 0,
      currency: 'USD',
      status: 'Draft',
      dueDate: '',
      items: [],
      notes: '',
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  // Watch items to auto-calculate amount
  const watchedItems = watch('items');
  useEffect(() => {
    if (watchedItems.length > 0) {
      const total = watchedItems.reduce((sum, item) => {
        const t = (Number(item.qty) || 0) * (Number(item.unitPrice) || 0);
        return sum + t;
      }, 0);
      setValue('amount', parseFloat(total.toFixed(2)));
    }
  }, [watchedItems, setValue]);

  // Pre-fill when editing
  useEffect(() => {
    if (invoice) {
      reset({
        client: invoice.client,
        clientEmail: invoice.clientEmail,
        amount: invoice.amount,
        currency: invoice.currency,
        status: invoice.status,
        dueDate: invoice.dueDate.split('T')[0],
        items: invoice.items,
        notes: invoice.notes,
      });
    } else {
      reset({
        client: '',
        clientEmail: '',
        amount: 0,
        currency: 'USD',
        status: 'Draft',
        dueDate: '',
        items: [],
        notes: '',
      });
    }
  }, [invoice, reset, isOpen]);

  const handleFormSubmit = async (values: any) => {
    await onSubmit(values as InvoiceFormData);
  };

  const addItem = () => {
    append({ description: '', qty: 1, unitPrice: 0, total: 0 });
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
              {isEditing ? 'Edit Invoice' : 'Create New Invoice'}
            </h2>
            {isEditing && (
              <p className="text-xs text-gray-400 mt-0.5">{invoice?.invoiceNumber}</p>
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
          id="invoice-form"
          onSubmit={handleSubmit(handleFormSubmit)}
          className="flex-1 overflow-y-auto px-6 py-5 space-y-5"
        >
          {/* Client Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Client Name <span className="text-red-500">*</span>
              </label>
              <input
                {...register('client')}
                placeholder="Acme Corp."
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400 transition-all"
              />
              {errors.client && (
                <p className="text-xs text-red-500 mt-1">{errors.client.message}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Client Email <span className="text-red-500">*</span>
              </label>
              <input
                {...register('clientEmail')}
                type="email"
                placeholder="client@example.com"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400 transition-all"
              />
              {errors.clientEmail && (
                <p className="text-xs text-red-500 mt-1">{errors.clientEmail.message}</p>
              )}
            </div>
          </div>

          {/* Amount, Currency, Status, Due Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Amount <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <select
                  {...register('currency')}
                  className="px-2 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 bg-white"
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
                  placeholder="0.00"
                  className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400 transition-all"
                />
              </div>
              {errors.amount && (
                <p className="text-xs text-red-500 mt-1">{errors.amount.message}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Due Date <span className="text-red-500">*</span>
              </label>
              <input
                {...register('dueDate')}
                type="date"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400 transition-all"
              />
              {errors.dueDate && (
                <p className="text-xs text-red-500 mt-1">{errors.dueDate.message}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Status</label>
            <select
              {...register('status')}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 bg-white"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-600">Line Items</label>
              <button
                type="button"
                onClick={addItem}
                className="flex items-center gap-1 text-xs font-semibold text-black hover:text-gray-600 transition-colors"
              >
                <Plus size={14} /> Add Item
              </button>
            </div>

            {fields.length === 0 ? (
              <div className="text-center py-6 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 text-sm">
                No items yet. Click "Add Item" to add line items.
              </div>
            ) : (
              <div className="space-y-2">
                {/* Column headers */}
                <div className="grid grid-cols-[1fr_80px_100px_24px] gap-2 text-[11px] font-semibold text-gray-400 px-1">
                  <span>Description</span>
                  <span>Qty</span>
                  <span>Unit Price</span>
                  <span />
                </div>
                {fields.map((field, index) => {
                  const qty = Number(watchedItems[index]?.qty || 0);
                  const price = Number(watchedItems[index]?.unitPrice || 0);
                  const lineTotal = (qty * price).toFixed(2);
                  return (
                    <div key={field.id} className="grid grid-cols-[1fr_80px_100px_24px] gap-2 items-center">
                      <input
                        {...register(`items.${index}.description`)}
                        placeholder="Service description"
                        className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
                      />
                      <input
                        {...register(`items.${index}.qty`)}
                        type="number"
                        min="1"
                        placeholder="1"
                        className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 text-center"
                      />
                      <div className="flex items-center gap-1">
                        <input
                          {...register(`items.${index}.unitPrice`)}
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          className="w-full px-2 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
                        />
                        <span className="text-xs text-gray-400 whitespace-nowrap">= ${lineTotal}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="w-6 h-6 rounded-lg hover:bg-red-50 flex items-center justify-center transition-colors group"
                      >
                        <Trash2 size={13} className="text-gray-300 group-hover:text-red-500" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Notes</label>
            <textarea
              {...register('notes')}
              placeholder="Additional notes or payment terms..."
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
            form="invoice-form"
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 rounded-xl bg-[#7ED957] text-black text-sm font-bold hover:bg-[#6fcf4a] transition-colors disabled:opacity-70 flex items-center gap-2 shadow-sm"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                {isEditing ? 'Saving…' : 'Creating…'}
              </>
            ) : isEditing ? (
              'Save Changes'
            ) : (
              'Create Invoice'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
