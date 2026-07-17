import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { InvoiceItem, InvoiceColumn } from '../types';

// ─── Currency formatting ──────────────────────────────────────────────────────
// @react-pdf/renderer's built-in Helvetica cannot render the ₹ glyph via
// Intl.NumberFormat — it silently drops the symbol and outputs just "1".
// We format manually using a symbol map so every currency renders correctly.

const SYM: Record<string, string> = {
  INR: '₹', USD: '$', EUR: '€', GBP: '£',
  AUD: 'A$', CAD: 'C$', JPY: '¥', CNY: '¥',
  SGD: 'S$', AED: 'AED ',
};

function fmtAmt(amount: number, currency: string): string {
  const sym = SYM[currency.toUpperCase()] ?? `${currency} `;
  // No trailing .00 — but keep meaningful decimals (1500 → "1,500", 1500.5 → "1,500.5")
  const num = amount.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return `${sym}${num}`;
}

function fmtDate(d: string): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

// ─── Palette ─────────────────────────────────────────────────────────────────

const c = {
  black: '#0f0f0f', green: '#7ED957',
  g100: '#f9fafb', g200: '#e5e7eb', g400: '#9ca3af',
  g600: '#4b5563', g700: '#374151', g900: '#111827',
  white: '#ffffff',
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica', backgroundColor: c.white,
    paddingHorizontal: 48, paddingVertical: 44, fontSize: 10, color: c.g900,
  },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    backgroundColor: c.black, marginHorizontal: -48, marginTop: -44,
    paddingHorizontal: 48, paddingVertical: 28, marginBottom: 32,
  },
  brandName: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: c.green, letterSpacing: -0.5 },
  brandSub:  { fontSize: 10, color: c.g400, marginTop: 2 },
  invLabel:  { fontSize: 24, fontFamily: 'Helvetica-Bold', color: c.white, letterSpacing: -1 },
  invNum:    { fontSize: 11, fontFamily: 'Helvetica-Bold', color: c.green, marginTop: 2 },

  // Parties
  partiesRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 28 },
  party: { flex: 1 },
  secLabel: {
    fontSize: 8, fontFamily: 'Helvetica-Bold', color: c.g400,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6,
  },
  partyName:   { fontSize: 13, fontFamily: 'Helvetica-Bold', color: c.g900, marginBottom: 2 },
  partyDetail: { fontSize: 10, color: c.g600, marginBottom: 1 },

  // Table
  table: { borderWidth: 1, borderColor: c.g200, borderRadius: 8, overflow: 'hidden', marginBottom: 16 },
  thead: { flexDirection: 'row', backgroundColor: c.g100, paddingVertical: 8, paddingHorizontal: 12 },
  th:    { fontSize: 8, fontFamily: 'Helvetica-Bold', color: c.g400, textTransform: 'uppercase', letterSpacing: 0.5 },
  trow:  { flexDirection: 'row', paddingVertical: 9, paddingHorizontal: 12, borderTopWidth: 1, borderTopColor: c.g200 },
  td:    { fontSize: 10, color: c.g700 },
  tdbold: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: c.g900 },

  // Fixed column widths
  cDesc:  { flex: 1 },
  cQty:   { width: 36, textAlign: 'center' },
  cPrice: { width: 70, textAlign: 'right' },
  cTotal: { width: 78, textAlign: 'right' },
  // Extra user-defined columns — 64pt each, centred
  cExtra: { width: 64, textAlign: 'center' },

  // Totals
  totalsWrap: { alignItems: 'flex-end', marginBottom: 24 },
  totalsBox:  { width: 220, borderWidth: 1, borderColor: c.g200, borderRadius: 8, overflow: 'hidden' },
  subRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 8, paddingHorizontal: 16,
    backgroundColor: c.g100, borderBottomWidth: 1, borderBottomColor: c.g200,
  },
  subLabel: { fontSize: 10, color: c.g600 },
  subVal:   { fontSize: 10, fontFamily: 'Helvetica-Bold', color: c.g700 },
  totRow:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 16, backgroundColor: c.black },
  totLabel: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: c.g400 },
  totVal:   { fontSize: 14, fontFamily: 'Helvetica-Bold', color: c.green },

  // Notes
  notesBox: {
    borderWidth: 1, borderColor: c.g200, borderRadius: 8,
    padding: 14, backgroundColor: c.g100, marginBottom: 24,
  },
  notesLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: c.g400, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 },
  notesText:  { fontSize: 10, color: c.g600, lineHeight: 1.6 },

  // Footer
  footer:     { marginTop: 'auto', borderTopWidth: 1, borderTopColor: c.g200, paddingTop: 14, textAlign: 'center' },
  footerText: { fontSize: 9, color: c.g400 },
  footerGreen: { color: c.green, fontFamily: 'Helvetica-Bold' },
});

// ─── Props ────────────────────────────────────────────────────────────────────

export interface InvoicePDFData {
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  status: string;
  senderName: string;
  senderCompany: string;
  senderEmail: string;
  senderPhone: string;
  senderAddress: string;
  clientName: string;
  clientEmail: string;
  items: InvoiceItem[];
  extraColumns: InvoiceColumn[];   // user-defined extra columns
  amount: number;
  currency: string;
  notes: string;
  appName?: string;
}

// ─── Document ─────────────────────────────────────────────────────────────────

export function InvoicePDFTemplate({ data }: { data: InvoicePDFData }) {
  const APP  = data.appName || 'Invo';
  const cols = data.extraColumns ?? [];

  return (
    <Document title={`Invoice ${data.invoiceNumber}`} author={data.senderName}>
      <Page size="A4" style={s.page}>

        {/* ── Header ── */}
        <View style={s.header}>
          <View>
            <Text style={s.brandName}>{APP}</Text>
            {!!data.senderCompany && <Text style={s.brandSub}>{data.senderCompany}</Text>}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={s.invLabel}>INVOICE</Text>
            <Text style={s.invNum}>{data.invoiceNumber}</Text>
          </View>
        </View>

        {/* ── From / Bill To / Meta ── */}
        <View style={s.partiesRow}>
          <View style={s.party}>
            <Text style={s.secLabel}>From</Text>
            <Text style={s.partyName}>{data.senderName}</Text>
            {!!data.senderCompany  && <Text style={s.partyDetail}>{data.senderCompany}</Text>}
            {!!data.senderEmail    && <Text style={s.partyDetail}>{data.senderEmail}</Text>}
            {!!data.senderPhone    && <Text style={s.partyDetail}>{data.senderPhone}</Text>}
            {!!data.senderAddress  && <Text style={s.partyDetail}>{data.senderAddress}</Text>}
          </View>

          <View style={{ width: 32 }} />

          <View style={s.party}>
            <Text style={s.secLabel}>Bill To</Text>
            <Text style={s.partyName}>{data.clientName || '—'}</Text>
            {!!data.clientEmail && <Text style={s.partyDetail}>{data.clientEmail}</Text>}
          </View>

          <View style={{ width: 32 }} />

          <View style={[s.party, { alignItems: 'flex-end' }]}>
            <Text style={s.secLabel}>Details</Text>
            <Text style={s.partyDetail}>Issue: {fmtDate(data.issueDate)}</Text>
            <Text style={s.partyDetail}>Due:   {fmtDate(data.dueDate)}</Text>
            <Text style={[s.partyDetail, { fontFamily: 'Helvetica-Bold', marginTop: 4 }]}>
              {data.status}
            </Text>
          </View>
        </View>

        {/* ── Line Items ── */}
        <View style={s.table}>

          {/* Table header */}
          <View style={s.thead}>
            <Text style={[s.th, s.cDesc]}>Description</Text>
            {cols.map((col) => (
              <Text key={col.key} style={[s.th, s.cExtra]}>{col.label}</Text>
            ))}
            <Text style={[s.th, s.cQty]}>Qty</Text>
            <Text style={[s.th, s.cPrice]}>Unit Price</Text>
            <Text style={[s.th, s.cTotal]}>Total</Text>
          </View>

          {/* Rows */}
          {data.items.length === 0 ? (
            <View style={s.trow}>
              <Text style={[s.td, { flex: 1, color: c.g400, textAlign: 'center' }]}>No line items</Text>
            </View>
          ) : (
            data.items.map((item, i) => (
              <View key={i} style={s.trow}>
                <Text style={[s.td, s.cDesc]}>{item.description}</Text>
                {cols.map((col) => (
                  <Text key={col.key} style={[s.td, s.cExtra]}>
                    {item.extras?.[col.key] ?? ''}
                  </Text>
                ))}
                <Text style={[s.td, s.cQty]}>{item.qty}</Text>
                <Text style={[s.td, s.cPrice]}>{fmtAmt(item.unitPrice, data.currency)}</Text>
                <Text style={[s.tdbold, s.cTotal]}>{fmtAmt(item.total, data.currency)}</Text>
              </View>
            ))
          )}
        </View>

        {/* ── Totals ── */}
        <View style={s.totalsWrap}>
          <View style={s.totalsBox}>
            <View style={s.subRow}>
              <Text style={s.subLabel}>Subtotal</Text>
              <Text style={s.subVal}>{fmtAmt(data.amount, data.currency)}</Text>
            </View>
            <View style={s.totRow}>
              <Text style={s.totLabel}>Total Due</Text>
              <Text style={s.totVal}>{fmtAmt(data.amount, data.currency)}</Text>
            </View>
          </View>
        </View>

        {/* ── Notes ── */}
        {!!data.notes && (
          <View style={s.notesBox}>
            <Text style={s.notesLabel}>Notes</Text>
            <Text style={s.notesText}>{data.notes}</Text>
          </View>
        )}

        {/* ── Footer ── */}
        <View style={s.footer}>
          <Text style={s.footerText}>
            {'Generated by '}<Text style={s.footerGreen}>{APP}</Text>{'  ·  Thank you for your business'}
          </Text>
        </View>

      </Page>
    </Document>
  );
}
