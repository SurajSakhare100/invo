import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { PDFViewer, pdf } from '@react-pdf/renderer';
import {
  ArrowLeft, Plus, Trash2, Download, Send,
  Save, Loader2, CheckCircle2, Columns3, X,
} from 'lucide-react';
import { Sidebar } from '../components/Sidebar';
import { InvoicePDFTemplate } from '../components/InvoicePDFTemplate';
import type { InvoicePDFData } from '../components/InvoicePDFTemplate';
import { invoiceService } from '../services/invoiceService';
import { useAuth } from '../context/AuthContext';
import { CURRENCIES, STATUS_OPTIONS } from '../data/data';
import type { InvoiceColumn, InvoiceFormData } from '../types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: '₹', USD: '$', EUR: '€', GBP: '£',
  AUD: 'A$', CAD: 'C$', JPY: '¥', SGD: 'S$',
};

function fmtAmt(amount: number, currency: string): string {
  const sym = CURRENCY_SYMBOLS[currency.toUpperCase()] ?? `${currency} `;
  const num = amount.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return `${sym}${num}`;
}

// ─── Schema ──────────────────────────────────────────────────────────────────

const itemSchema = z.object({
  description: z.string().min(1, 'Required'),
  qty:         z.number().min(1, 'Min 1'),
  unitPrice:   z.number().min(0, 'Min 0'),
  total:       z.number(),
  extras:      z.record(z.string(), z.string()).optional(),
});

const schema = z.object({
  client:      z.string().min(1, 'Client name required'),
  clientEmail: z.string().email('Valid email required'),
  currency:    z.string().min(1),
  status:      z.enum(['Draft', 'Pending', 'Unpaid', 'Success', 'Failed']),
  dueDate:     z.string().min(1, 'Due date required'),
  items:       z.array(itemSchema),
  notes:       z.string(),
  amount:      z.number().min(0),
});

type FormValues = z.infer<typeof schema>;

// ─── Style constants ──────────────────────────────────────────────────────────

const inputCls =
  'w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400 transition-all bg-white';
const labelCls = 'block text-xs font-semibold text-gray-600 mb-1.5';

// ─── Component ────────────────────────────────────────────────────────────────

export default function InvoiceBuilder() {
  const navigate = useNavigate();
  const { id: invoiceId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isEditing = !!invoiceId;

  const [savedInvoiceId, setSavedInvoiceId] = useState<string | null>(invoiceId || null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // User-defined extra columns e.g. [{ key: 'size', label: 'Size' }]
  const [extraColumns, setExtraColumns] = useState<InvoiceColumn[]>([]);
  const [newColLabel, setNewColLabel] = useState('');
  const [showColInput, setShowColInput] = useState(false);

  const showToast = useCallback((type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // ─── Fetch existing invoice if editing ───────────────────────────────────
  const { data: existingInvoice, isLoading: loadingInvoice } = useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: () => invoiceService.getInvoiceById(invoiceId!),
    enabled: isEditing,
  });

  // ─── Form ────────────────────────────────────────────────────────────────
  const {
    register,
    control,
    watch,
    setValue,
    reset,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: async (values, context, options) => {
      // Coerce string inputs to numbers before validation
      const coerced = {
        ...values,
        amount: Number(values.amount) || 0,
        items: values.items.map((item: any) => ({
          ...item,
          qty: Number(item.qty) || 0,
          unitPrice: Number(item.unitPrice) || 0,
          total: Number(item.total) || 0,
        })),
      };
      return zodResolver(schema)(coerced, context, options);
    },
    defaultValues: {
      client:      '',
      clientEmail: '',
      currency:    user?.currency || 'INR',
      status:      'Draft',
      dueDate:     '',
      items:       [{ description: '', qty: 1, unitPrice: 0, total: 0, extras: {} }],
      notes:       '',
      amount:      0,
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const watched = watch();

  // ─── Pre-fill form when editing ───────────────────────────────────────────
  useEffect(() => {
    if (existingInvoice?.data) {
      const inv = existingInvoice.data;
      reset({
        client: inv.client,
        clientEmail: inv.clientEmail,
        currency: inv.currency,
        status: inv.status,
        dueDate: inv.dueDate.split('T')[0],
        items: inv.items.map((item) => ({
          description: item.description,
          qty: item.qty,
          unitPrice: item.unitPrice,
          total: item.total,
          extras: item.extras || {},
        })),
        notes: inv.notes,
        amount: inv.amount,
      });

      // Extract any custom columns from items
      const colKeys = new Set<string>();
      inv.items.forEach((item) => {
        if (item.extras) {
          Object.keys(item.extras).forEach((k) => colKeys.add(k));
        }
      });
      if (colKeys.size > 0) {
        setExtraColumns(
          Array.from(colKeys).map((k) => ({
            key: k,
            label: k.replace(/_\d+$/, '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          }))
        );
      }
    }
  }, [existingInvoice, reset]);

  // Auto-compute line totals + grand total whenever qty / unitPrice change
  useEffect(() => {
    watched.items.forEach((item, idx) => {
      const t = parseFloat(
        ((Number(item.qty) || 0) * (Number(item.unitPrice) || 0)).toFixed(2)
      );
      setValue(`items.${idx}.total`, t);
    });
    const grand = watched.items.reduce(
      (s, item) => s + (Number(item.qty) || 0) * (Number(item.unitPrice) || 0),
      0
    );
    setValue('amount', parseFloat(grand.toFixed(2)));
  // depend on serialised qty/price values only to avoid infinite loops
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(watched.items.map((i) => [i.qty, i.unitPrice]))]);

  // ─── Add / remove custom column ───────────────────────────────────────────
  const addColumn = () => {
    const label = newColLabel.trim();
    if (!label) return;
    const key = label.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now();
    setExtraColumns((prev) => [...prev, { key, label }]);
    setNewColLabel('');
    setShowColInput(false);
  };

  const removeColumn = (key: string) => {
    setExtraColumns((prev) => prev.filter((c) => c.key !== key));
    // Also clear that key from all items
    watched.items.forEach((_, idx) => {
      const current = watched.items[idx].extras ?? {};
      const next = { ...current };
      delete next[key];
      setValue(`items.${idx}.extras`, next);
    });
  };

  // ─── Live PDF data ────────────────────────────────────────────────────────
  const pdfData: InvoicePDFData = {
    invoiceNumber: savedInvoiceId ? (existingInvoice?.data?.invoiceNumber ?? '—') : 'PREVIEW',
    issueDate:     existingInvoice?.data?.createdAt ?? new Date().toISOString(),
    dueDate:       watched.dueDate || '',
    status:        watched.status,
    senderName:    user?.name || '',
    senderCompany: user?.company || '',
    senderEmail:   user?.companyEmail || user?.email || '',
    senderPhone:   user?.phone || '',
    senderAddress: [user?.address, user?.city, user?.country].filter(Boolean).join(', '),
    clientName:    watched.client,
    clientEmail:   watched.clientEmail,
    extraColumns,
    items: watched.items.map((item) => ({
      description: item.description,
      qty:         Number(item.qty) || 0,
      unitPrice:   Number(item.unitPrice) || 0,
      total:       (Number(item.qty) || 0) * (Number(item.unitPrice) || 0),
      extras:      item.extras ?? {},
    })),
    amount:   watched.amount,
    currency: watched.currency,
    notes:    watched.notes,
    appName:  'Invo',
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
      showToast('success', 'Invoice saved');
    },
    onError: () => showToast('error', 'Failed to save invoice'),
  });

  const sendPdfMutation = useMutation({
    mutationFn: async (data: InvoiceFormData) => {
      let invoiceId = savedInvoiceId;
      if (!invoiceId) {
        const res = await invoiceService.createInvoice(data);
        invoiceId = res.data._id;
        setSavedInvoiceId(invoiceId);
        queryClient.invalidateQueries({ queryKey: ['invoices'] });
      } else {
        await invoiceService.updateInvoice(invoiceId, data);
      }

      // Generate PDF blob in browser, convert to base64 and send to server
      const blob   = await pdf(<InvoicePDFTemplate data={pdfData} />).toBlob();
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload  = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      return invoiceService.sendInvoicePdf(invoiceId!, base64);
    },
    onSuccess: (res) => showToast('success', res.message || 'Invoice emailed to client'),
    onError:   () => showToast('error', 'Failed to send invoice email'),
  });

  // ─── Download ─────────────────────────────────────────────────────────────
  const handleDownload = useCallback(async () => {
    const blob = await pdf(<InvoicePDFTemplate data={pdfData} />).toBlob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `invoice-${watched.client || 'draft'}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }, [pdfData, watched.client]);

  const onSave      = (values: FormValues) => saveMutation.mutate(values);
  const onSendEmail = handleSubmit((values) => sendPdfMutation.mutate(values));
  const isBusy      = saveMutation.isPending || sendPdfMutation.isPending;

  // ─── Render ───────────────────────────────────────────────────────────────
  
  // Show loading spinner when fetching existing invoice
  if (isEditing && loadingInvoice) {
    return (
      <div className="min-h-screen bg-[#FAFAF9] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={40} className="animate-spin text-gray-400" />
          <p className="text-sm text-gray-500">Loading invoice...</p>
        </div>
      </div>
    );
  }

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
              <h1 className="text-lg font-bold tracking-tight">
                {isEditing ? 'Edit Invoice' : 'New Invoice'}
              </h1>
              <p className="text-xs text-gray-400">
                {isEditing && existingInvoice?.data
                  ? `${existingInvoice.data.invoiceNumber} — Form left · PDF preview right`
                  : 'Form left · live PDF preview right'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownload}
              disabled={isBusy}
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 text-sm font-medium bg-white hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <Download size={14} /> Download PDF
            </button>
            <button
              type="button"
              onClick={handleSubmit(onSave)}
              disabled={isBusy}
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 text-sm font-semibold bg-white hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {saveMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Save
            </button>
            <button
              type="button"
              onClick={onSendEmail}
              disabled={isBusy}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#7ED957] text-black text-sm font-bold hover:bg-[#6fcf4a] transition-colors shadow-sm disabled:opacity-60"
            >
              {sendPdfMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              Save & Email PDF
            </button>
          </div>
        </div>

        {/* ── Toast ── */}
        {toast && (
          <div className={`mx-8 mt-3 flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-semibold shrink-0 ${
            toast.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {toast.type === 'success' && <CheckCircle2 size={15} />}
            {toast.msg}
          </div>
        )}

        {/* ── Split body ── */}
        <div className="flex flex-1 overflow-hidden">

          {/* ── LEFT: Form ── */}
          <div className="w-[500px] shrink-0 overflow-y-auto border-r border-gray-200 px-8 py-6 space-y-6 bg-white">

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

            {/* ── Custom Columns ── */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Custom Columns</h3>
                <button
                  type="button"
                  onClick={() => setShowColInput((v) => !v)}
                  className="flex items-center gap-1 text-xs font-bold text-black hover:text-gray-500 transition-colors"
                >
                  <Columns3 size={13} /> Add Column
                </button>
              </div>

              {/* Add column input */}
              {showColInput && (
                <div className="flex items-center gap-2 mb-3">
                  <input
                    value={newColLabel}
                    onChange={(e) => setNewColLabel(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addColumn())}
                    placeholder="Column name e.g. Size, Color, SKU"
                    className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={addColumn}
                    className="px-3 py-2 rounded-xl bg-black text-white text-xs font-bold hover:bg-gray-800 transition-colors"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowColInput(false); setNewColLabel(''); }}
                    className="w-8 h-8 flex items-center justify-center rounded-xl border border-gray-200 hover:bg-gray-50"
                  >
                    <X size={13} className="text-gray-400" />
                  </button>
                </div>
              )}

              {/* Existing extra columns */}
              {extraColumns.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {extraColumns.map((col) => (
                    <span
                      key={col.key}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 border border-gray-200 text-xs font-semibold text-gray-700"
                    >
                      {col.label}
                      <button
                        type="button"
                        onClick={() => removeColumn(col.key)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <X size={11} />
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400">
                  No custom columns yet — add things like Size, Color, SKU, Weight…
                </p>
              )}
            </section>

            {/* ── Line Items ── */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Line Items</h3>
                <button
                  type="button"
                  onClick={() => append({ description: '', qty: 1, unitPrice: 0, total: 0, extras: {} })}
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
                <div className="space-y-3">
                  {/* Column headers */}
                  <div
                    className="grid gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-wide px-1"
                    style={{
                      gridTemplateColumns: `1fr ${extraColumns.map(() => '72px').join(' ')} 52px 84px 20px`,
                    }}
                  >
                    <span>Description</span>
                    {extraColumns.map((col) => (
                      <span key={col.key} className="text-center truncate">{col.label}</span>
                    ))}
                    <span className="text-center">Qty</span>
                    <span className="text-right">Unit Price</span>
                    <span />
                  </div>

                  {fields.map((field, i) => {
                    const qty   = Number(watched.items[i]?.qty || 0);
                    const price = Number(watched.items[i]?.unitPrice || 0);
                    const lineTotal = fmtAmt(qty * price, watched.currency);

                    return (
                      <div key={field.id} className="space-y-1">
                        <div
                          className="grid gap-2 items-center"
                          style={{
                            gridTemplateColumns: `1fr ${extraColumns.map(() => '72px').join(' ')} 52px 84px 20px`,
                          }}
                        >
                          {/* Description */}
                          <input
                            {...register(`items.${i}.description`)}
                            placeholder="Description"
                            className="px-2.5 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
                          />

                          {/* Extra column values */}
                          {extraColumns.map((col) => (
                            <input
                              key={col.key}
                              placeholder="—"
                              value={watched.items[i]?.extras?.[col.key] ?? ''}
                              onChange={(e) => {
                                const current = watched.items[i]?.extras ?? {};
                                setValue(`items.${i}.extras`, { ...current, [col.key]: e.target.value });
                              }}
                              className="px-2 py-2 rounded-lg border border-gray-200 text-sm text-center focus:outline-none focus:ring-2 focus:ring-black/10"
                            />
                          ))}

                          {/* Qty */}
                          <input
                            {...register(`items.${i}.qty`)}
                            type="number"
                            min="1"
                            className="px-2 py-2 rounded-lg border border-gray-200 text-sm text-center focus:outline-none focus:ring-2 focus:ring-black/10"
                          />

                          {/* Unit Price */}
                          <input
                            {...register(`items.${i}.unitPrice`)}
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0"
                            className="px-2.5 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
                          />

                          {/* Remove */}
                          <button
                            type="button"
                            onClick={() => remove(i)}
                            className="flex items-center justify-center w-5 h-5 rounded hover:bg-red-50 group transition-colors"
                          >
                            <Trash2 size={12} className="text-gray-300 group-hover:text-red-500" />
                          </button>
                        </div>

                        {/* Line total shown below the row */}
                        <div className="flex justify-end pr-6">
                          <span className="text-[11px] text-gray-400 font-medium">
                            = {lineTotal}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Grand Total */}
            <section className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
              <span className="text-sm font-semibold text-gray-600">Total</span>
              <span className="text-lg font-bold text-gray-900">
                {fmtAmt(watched.amount, watched.currency)}
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
              <PDFViewer width="100%" height="100%" showToolbar={false} style={{ border: 'none' }}>
                <InvoicePDFTemplate data={pdfData} />
              </PDFViewer>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
