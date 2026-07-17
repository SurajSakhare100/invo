import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer';
import type { InvoiceItem, InvoiceColumn } from '../types';

// ─── Currency formatting ──────────────────────────────────────────────────────
// @react-pdf/renderer uses built-in Helvetica which can't render ₹ via
// Intl.NumberFormat (it outputs "1" instead of "₹"). We format manually.

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
  AUD: 'A$',
  CAD: 'C$',
  JPY: '¥',
  CNY: '¥',
  SGD: 'S$',
  AED: 'AED ',
};

function fmt(amount: number, currency: string): string {
  const formatted = amount.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return `${formatted}`;
}

function fmtDate(d: string): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// ─── Palette ─────────────────────────────────────────────────────────────────

const p = {
  black: '#0f0f0f',
  green: '#7ED957',
  gray100: '#f9fafb',
  gray200: '#e5e7eb',
  gray400: '#9ca3af',
  gray600: '#4b5563',
  gray700: '#374151',
  gray900: '#111827',
  white: '#ffffff',
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    backgroundColor: p.white,
    paddingHorizontal: 48,
    paddingVertical: 44,
    fontSize: 10,
    color: p.gray900,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: p.black,
    marginHorizontal: -48,
    marginTop: -44,
    paddingHorizontal: 48,
    paddingVertical: 28,
    marginBottom: 32,
  },
  brandName: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: p.green, letterSpacing: -0.5 },
  brandSub: { fontSize: 10, color: p.gray400, marginTop: 2 },
  invoiceLabel: { fontSize: 24, fontFamily: 'Helvetica-Bold', color: p.white, letterSpacing: -1 },
  invoiceNumber: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: p.green, marginTop: 2 },

  partiesRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 28 },
  party: { flex: 1 },
  sectionLabel: {
    fontSize: 8, fontFamily: 'Helvetica-Bold', color: p.gray400,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6,
  },
  partyName: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: p.gray900, marginBottom: 2 },
  partyDetail: { fontSize: 10, color: p.gray600, marginBottom: 1 },

  tableContainer: {
    borderWidth: 1, borderColor: p.gray200, borderRadius: 8,
    overflow: 'hidden', marginBottom: 16,
  },
  tableHeader: {
    flexDirection: 'row', backgroundColor: p.gray100,
    paddingVertical: 8, paddingHorizontal: 12,
  },
  thText: {
    fontSize: 8, fontFamily: 'Helvetica-Bold', color: p.gray400,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row', paddingVertical: 9, paddingHorizontal: 12,
    borderTopWidth: 1, borderTopColor: p.gray200,
  },
  tdText: { fontSize: 10, color: p.gray700 },
  tdBold: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: p.gray900 },

  // Fixed columns
  colDesc: { flex: 1 },
  colQty: { width: 36, textAlign: 'center' },
  colPrice: { width: 68, textAlign: 'right' },
  colTotal: { width: 76, textAlign: 'right' },
  // Extra columns share equal fixed width
  colExtra: { width: 64, textAlign: 'center' },

  totalsBlock: { alignItems: 'flex-end', marginBottom: 24 },
  totalsBox: {
    width: 220, borderWidth: 1, borderColor: p.gray200,
    borderRadius: 8, overflow: 'hidden',
  },
  subtotalRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 8, paddingHorizontal: 16,
    backgroundColor: p.gray100, borderBottomWidth: 1, borderBottomColor: p.gray200,
  },
  subtotalLabel: { fontSize: 10, color: p.gray600 },
  subtotalValue: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: p.gray700 },
  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 10, paddingHorizontal: 16, backgroundColor: p.black,
  },
  totalLabel: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: p.gray400 },
  totalValue: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: p.green },

  notesBox: {
    borderWidth: 1, borderColor: p.gray200, borderRadius: 8,
    padding: 14, backgroundColor: p.gray100, marginBottom: 24,
  },
  notesLabel: {
    fontSize: 8, fontFamily: 'Helvetica-Bold', color: p.gray400,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5,
  },
  notesText: { fontSize: 10, color: p.gray600, lineHeight: 1.6 },

  footer: {
    marginTop: 'auto', borderTopWidth: 1, borderTopColor: p.gray200,
    paddingTop: 14, textAlign: 'center',
  },
  footerText: { fontSize: 9, color: p.gray400 },
  footerGreen: { color: p.green, fontFamily: 'Helvetica-Bold' },
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
  // User-defined extra columns to show in the line items table
  extraColumns: InvoiceColumn[];
  amount: number;
  currency: string;
  notes: string;
  appName?: string;
}

// ─── Document ─────────────────────────────────────────────────────────────────

export function InvoicePDFTemplate({ data }: { data: InvoicePDFData }) {
  const APP = data.appName || 'Invo';
  const cols = data.extraColumns ?? [];

  return (
    <Document title={`Invoice ${data.invoiceNumber}`} author={data.senderName}>
      <Page size="A4" style={s.page}>

        {/* ── Header ── */}
        <View style={s.header}>
          <View>
            <Text style={s.brandName}>{APP}</Text>
            {data.senderCompany ? <Text style={s.brandSub}>{data.senderCompany}</Text> : null}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={s.invoiceLabel}>INVOICE</Text>
            <Text style={s.invoiceNumber}>{data.invoiceNumber}</Text>
          </View>
        </View>

        {/* ── From / Bill To / Meta ── */}
        <View style={s.partiesRow}>
          <View style={s.party}>
            <Text style={s.sectionLabel}>From</Text>
            <Text style={s.partyName}>{data.senderName}</Text>
            {data.senderCompany ? <Text style={s.partyDetail}>{data.senderCompany}</Text> : null}
            {data.senderEmail ? <Text style={s.partyDetail}>{data.senderEmail}</Text> : null}
            {data.senderPhone ? <Text style={s.partyDetail}>{data.senderPhone}</Text> : null}
            {data.senderAddress ? <Text style={s.partyDetail}>{data.senderAddress}</Text> : null}
          </View>

          <View style={{ width: 32 }} />

          <View style={s.party}>
            <Text style={s.sectionLabel}>Bill To</Text>
            <Text style={s.partyName}>{data.clientName || '—'}</Text>
            {data.clientEmail ? <Text style={s.partyDetail}>{data.clientEmail}</Text> : null}
          </View>

          <View style={{ width: 32 }} />

          <View style={[s.party, { alignItems: 'flex-end' }]}>
            <Text style={s.sectionLabel}>Details</Text>
            <Text style={s.partyDetail}>Issue: {fmtDate(data.issueDate)}</Text>
            <Text style={s.partyDetail}>Due:   {fmtDate(data.dueDate)}</Text>
            <Text style={[s.partyDetail, { fontFamily: 'Helvetica-Bold', marginTop: 4 }]}>
              {data.status}
            </Text>
          </View>
        </View>

        {/* ── Line Items ── */}
        <View style={s.tableContainer}>
          {/* Table header */}
          <View style={s.tableHeader}>
            <Text style={[s.thText, s.colDesc]}>Description</Text>
            {/* Extra columns — rendered before qty/price so they sit naturally */}
            {cols.map((col) => (
              <Text key={col.key} style={[s.thText, s.colExtra, { textAlign: 'center' }]}>
                {col.label}
              </Text>
            ))}
            <Text style={[s.thText, s.colQty]}>Qty</Text>
            <Text style={[s.thText, s.colPrice]}>Unit Price</Text>
            <Text style={[s.thText, s.colTotal]}>Total</Text>
          </View>

          {/* Rows */}
          {data.items.length === 0 ? (
            <View style={s.tableRow}>
              <Text style={[s.tdText, { flex: 1, color: p.gray400, textAlign: 'center' }]}>
                No line items
              </Text>
            </View>
          ) : (
            data.items.map((item, i) => (
              <View key={i} style={s.tableRow}>
                <Text style={[s.tdText, s.colDesc]}>{item.description}</Text>
                {cols.map((col) => (
                  <Text key={col.key} style={[s.tdText, s.colExtra]}>
                    {item.extras?.[col.key] ?? ''}
                  </Text>
                ))}
                <Text style={[s.tdText, s.colQty]}>{item.qty}</Text>
                <Text style={[s.tdText, s.colPrice]}>{fmt(item.unitPrice, data.currency)}</Text>
                <Text style={[s.tdBold, s.colTotal]}>{fmt(item.total, data.currency)}</Text>
              </View>
            ))
          )}
        </View>

        {/* ── Totals ── */}
        <View style={s.totalsBlock}>
          <View style={s.totalsBox}>
            <View style={s.subtotalRow}>
              <Text style={s.subtotalLabel}>Subtotal</Text>
              <Text style={s.subtotalValue}>{fmt(data.amount, data.currency)}</Text>
            </View>
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Total Due</Text>
              <Text style={s.totalValue}>{fmt(data.amount, data.currency)}</Text>
            </View>
          </View>
        </View>

        {/* ── Notes ── */}
        {data.notes ? (
          <View style={s.notesBox}>
            <Text style={s.notesLabel}>Notes</Text>
            <Text style={s.notesText}>{data.notes}</Text>
          </View>
        ) : null}

        {/* ── Footer ── */}
        <View style={s.footer}>
          <Text style={s.footerText}>
            Generated by <Text style={s.footerGreen}>{APP}</Text>
            {'  ·  '}Thank you for your business
          </Text>
        </View>

      </Page>
    </Document>
  );
}
