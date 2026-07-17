import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PDFViewer, pdf } from '@react-pdf/renderer';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Download,
  Send,
  Save,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { Sidebar } from '../components/Sidebar';
import { InvoicePDFTemplate } from '../components/InvoicePDFTemplate';
import type { InvoicePDFData } from '../components/InvoicePDFTemplate';
import { invoiceService } from '../services/invoiceService';
import { useAuth } from '../context/AuthContext';
import { CURRENCIES, STATUS_OPTIONS } from '../data/data';
import type { InvoiceFormData } from '../types';

// ─── Schema ──────────────────────────────────────────────────────────────────

const itemSchema = z.object({
  description: z.string().min(1, 'Required'),
  qty: z.coerce.number().min(1, 'Min 1'),
  unitPrice: z.coerce.number().min(0, 'Min 0'),
  total: z.coerce.number(),
});

const schema = z.object({
  client: z.string().min(1, 'Client name required'),
  clientEmail: z.string().email('Valid email required'),
  currency: z.string().min(1),
  status: z.enum(['Draft', 'Pending', 'Unpaid', 'Success', 'Failed']),
  dueDate: z.string().min(1, 'Due date required'),
  items: z.array(itemSchema),
  notes: z.string(),
  amount: z.coerce.number().min(0),
});

type FormValues = z.infer<typeof schema>;

// ─── Input style helpers ──────────────────────────────────────────────────────

const inputCls =
  'w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400 transition-all bg-white';
const labelCls = 'block text-xs font-semibold text-gray-600 mb-1.5';

// ─── Component ────────────────────────────────────────────────────────────────

export default function InvoiceBuilder() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [savedInvoiceId, setSavedInvoiceId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  // ─── Form ────────────────────────────────────────────────────────────────
  const {
    register,
    control,
    watch,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      client: '',
      clientEmail: '',
      currency: user?.currency || 'INR',
      status: 'Draft',
      dueDate: '',
      items: [{ description: '', qty: 1, unitPrice: 0, total: 0 }],
      notes: '',
      amount: 0,
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const watched = watch();

  // Auto-compute totals when items change
  useEffect(() => {
    const updatedItems = watched.items.map((item) => ({
      ...item,
      total: parseFloat(
        ((Number(item.qty) || 0) * (Number(item.unitPrice) || 0)).toFixed(2)
      ),
    }));
    const grand = updatedItems.reduce((s, i) => s + i.total, 0);
    setValue('amount', parseFloat(grand.toFixed(2)));
    // Sync individual totals
    updatedItems.forEach((item, idx) => {
      setValue(`items.${idx}.total`, item.total);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    // Watch each item's qty and unitPrice individually for stable deps
    JSON.stringify(watched.items.map((i) => [i.qty, i.unitPrice])),
  ]);

  // ─── Live PDF data ────────────────────────────────────────────────────────
  const pdfData: InvoicePDFData = {
    invoiceNumber: savedInvoiceId ? '—' : 'PREVIEW',
    issueDate: new Date().toISOString(),
    dueDate: watched.dueDate || '',
    status: watched.status,
    senderName: user?.name || '',
    senderCompany: user?.company || '',
    senderEmail: user?.companyEmail || user?.email || '',
    senderPhone: user?.phone || '',
    senderAddress: [user?.address, user?.city, user?.country].filter(Boolean).join(', '),
    clientName: watched.client,
    clientEmail: watched.clientEmail,
    items: watched.items.map((item) => ({
      description: item.description,
      qty: Number(item.qty) || 0,
      unitPrice: Number(item.unitPrice) || 0,
      total: (Number(item.qty) || 0) * (Number(item.unitPrice) || 0),
    })),
    amount: watched.amount,
    currency: watched.currency,
    notes: watched.notes,
    appName: 'Invo',
  };

  // ─── Mutations ────────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: (data: InvoiceFormData) =>
      savedInvoiceId
        ? invoiceService.updateInvoice(savedInvoiceId, data)
        : invoiceService.createInvoice(data),
    onSuccess: (res) => {
      if (!savedInvoiceId) setSavedInvoiceId(res.data._id);
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      showToast('success', 'Invoice saved successfully');
    },
    onError: () => showToast('error', 'Failed to save invoice'),
  });

  const sendPdfMutation = useMutation({
    mutationFn: async (data: InvoiceFormData) => {
      // 1. Save / update invoice first
      let invoiceId = savedInvoiceId;
      if (!invoiceId) {
        const res = await invoiceService.createInvoice(data);
        invoiceId = res.data._id;
        setSavedInvoiceId(invoiceId);
        queryClient.invalidateQueries({ queryKey: ['invoices'] });
      } else {
        await invoiceService.updateInvoice(invoiceId, data);
      }

      // 2. Generate PDF blob in browser
      const blob = await pdf(<InvoicePDFTemplate data={pdfData} />).toBlob();

      // 3. Convert to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Strip "data:application/pdf;base64," prefix
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      // 4. Send to server which will email it
      return invoiceService.sendInvoicePdf(invoiceId!, base64);
    },
    onSuccess: (res) => showToast('success', res.message || 'Invoice emailed to client'),
    onError: () => showToast('error', 'Failed to send invoice email'),
  });

  // ─── Download PDF directly in browser ────────────────────────────────────
  const handleDownload = useCallback(async () => {
    const blob = await pdf(<InvoicePDFTemplate data={pdfData} />).toBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-${watched.client || 'draft'}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }, [pdfData, watched.client]);

  // ─── Form submit (Save) ───────────────────────────────────────────────────
  const onSave = (values: FormValues) => {
    saveMutation.mutate(values as InvoiceFormData);
  };

  const onSendEmail = handleSubmit((values) => {
    sendPdfMutation.mutate(values as InvoiceFormData);
  });

  const isBusy = saveMutation.isPending || sendPdfMutation.isPending;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#FAFAF9] text-gray-900 font-sans flex">
      <Sidebar activePage="Invoices" />

      <main className="flex-1 flex flex-col h-screen overflow-hidden">

        {/* ── Top bar ── */}
        <div className="flex items-center justify-between px-8 py-4 border-b border-gray-200 bg-white shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/invoices')}
              className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft size={15} className="text-gray-600" />
            </button>
            <div>
              <h1 className="text-lg font-bold tracking-tight">New Invoice</h1>
              <p className="text-xs text-gray-400">Fill in the form — preview updates live on the right</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Download */}
            <button
              type="button"
              onClick={handleDownload}
              disabled={isBusy}
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 text-sm font-medium bg-white hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <Download size={14} />
              Download PDF
            </button>

            {/* Save */}
            <button
              type="button"
              onClick={handleSubmit(onSave)}
              disabled={isBusy}
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 text-sm font-semibold bg-white hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {saveMutation.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Save size={14} />
              )}
              Save
            </button>

            {/* Send Email */}
            <button
              type="button"
              onClick={onSendEmail}
              disabled={isBusy}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#7ED957] text-black text-sm font-bold hover:bg-[#6fcf4a] transition-colors shadow-sm disabled:opacity-60"
            >
              {sendPdfMutation.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Send size={14} />
              )}
              Save & Email PDF
            </button>
          </div>
        </div>

        {/* ── Toast ── */}
        {toast && (
          <div
            className={`mx-8 mt-3 flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-semibold shrink-0 ${
              toast.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 size={15} />}
            {toast.msg}
          </div>
        )}

        {/* ── Split body ── */}
        <div className="flex flex-1 overflow-hidden">

          {/* ── LEFT: Form ── */}
          <div className="w-[480px] shrink-0 overflow-y-auto border-r border-gray-200 px-8 py-6 space-y-5 bg-white">

            {/* Client */}
            <section>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Client</h3>
              <div className="space-y-3">
                <div>
                  <label className={labelCls}>Client Name <span className="text-red-500">*</span></label>
                  <input {...register('client')} placeholder="Acme Corp." className={inputCls} />
                  {errors.client && <p className="text-xs text-red-500 mt-1">{errors.client.message}</p>}
                </div>
                <div>
                  <label className={labelCls}>Client Email <span className="text-red-500">*</span></label>
                  <input {...register('clientEmail')} type="email" placeholder="client@example.com" className={inputCls} />
                  {errors.clientEmail && <p className="text-xs text-red-500 mt-1">{errors.clientEmail.message}</p>}
                </div>
              </div>
            </section>

            {/* Invoice Details */}
            <section>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Invoice Details</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Currency</label>
                  <select {...register('currency')} className={inputCls}>
                    {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Status</label>
                  <select {...register('status')} className={inputCls}>
                    {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Due Date <span className="text-red-500">*</span></label>
                  <input {...register('dueDate')} type="date" className={inputCls} />
                  {errors.dueDate && <p className="text-xs text-red-500 mt-1">{errors.dueDate.message}</p>}
                </div>
              </div>
            </section>

            {/* Line Items */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Line Items</h3>
                <button
                  type="button"
                  onClick={() => append({ description: '', qty: 1, unitPrice: 0, total: 0 })}
                  className="flex items-center gap-1 text-xs font-bold text-black hover:text-gray-500 transition-colors"
                >
                  <Plus size={13} /> Add Item
                </button>
              </div>

              {fields.length === 0 ? (
                <div className="text-center py-8 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 text-sm">
                  No items yet
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-[1fr_56px_88px_20px] gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-wide px-1">
                    <span>Description</span><span className="text-center">Qty</span><span className="text-right">Unit Price</span><span />
                  </div>
                  {fields.map((field, i) => {
                    const qty = Number(watched.items[i]?.qty || 0);
                    const price = Number(watched.items[i]?.unitPrice || 0);
                    const lineTotal = (qty * price).toFixed(2);
                    return (
                      <div key={field.id} className="grid grid-cols-[1fr_56px_88px_20px] gap-2 items-center">
                        <input
                          {...register(`items.${i}.description`)}
                          placeholder="Description"
                          className="px-2.5 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
                        />
                        <input
                          {...register(`items.${i}.qty`)}
                          type="number" min="1"
                          className="px-2 py-2 rounded-lg border border-gray-200 text-sm text-center focus:outline-none focus:ring-2 focus:ring-black/10"
                        />
                        <div className="relative">
                          <input
                            {...register(`items.${i}.unitPrice`)}
                            type="number" min="0" step="0.01"
                            placeholder="0.00"
                            className="w-full px-2.5 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
                          />
                          <span className="absolute -bottom-4 right-0 text-[10px] text-gray-400">= {lineTotal}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => remove(i)}
                          className="flex items-center justify-center w-5 h-5 rounded hover:bg-red-50 group transition-colors"
                        >
                          <Trash2 size={12} className="text-gray-300 group-hover:text-red-500" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Total (read-only display) */}
            <section className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
              <span className="text-sm font-semibold text-gray-600">Total</span>
              <span className="text-lg font-bold text-gray-900">
                {watched.currency} {watched.amount.toFixed(2)}
              </span>
            </section>

            {/* Notes */}
            <section>
              <label className={labelCls}>Notes</label>
              <textarea
                {...register('notes')}
                placeholder="Payment terms, additional info..."
                rows={3}
                className={`${inputCls} resize-none`}
              />
            </section>

          </div>

          {/* ── RIGHT: Live PDF Preview ── */}
          <div className="flex-1 bg-gray-100 flex flex-col overflow-hidden">
            <div className="px-6 py-3 border-b border-gray-200 bg-white flex items-center justify-between shrink-0">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Live Preview</span>
              <span className="text-[11px] text-gray-400">Updates as you type</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <PDFViewer
                width="100%"
                height="100%"
                showToolbar={false}
                style={{ border: 'none' }}
              >
                <InvoicePDFTemplate data={pdfData} />
              </PDFViewer>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
