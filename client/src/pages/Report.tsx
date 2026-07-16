import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Bell,
  RefreshCw,
  TrendingUp,
  Award,
  LineChart as LineIcon,
  DollarSign,
} from 'lucide-react';
import { Sidebar } from '../components/Sidebar';
import { FilterDropdown } from '../components/FilterDropdown';
import { analyticsService } from '../services/analyticsService';
import { REPORT_PERIODS } from '../data/data';

// ─── Skeleton Loader ─────────────────────────────────────────────────────────
function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-gray-100 rounded-lg ${className}`}
    />
  );
}

// ─── Dynamic SVG Line Chart ───────────────────────────────────────────────────
function RevenueLineChart({
  data,
  loading,
}: {
  data: { month: string; revenue: number }[];
  loading: boolean;
}) {
  const WIDTH = 500;
  const HEIGHT = 200;
  const PADDING_X = 10;
  const PADDING_Y = 20;

  const maxRevenue = useMemo(
    () => Math.max(...data.map((d) => d.revenue), 1),
    [data]
  );

  // Map data to SVG coordinates
  const points = useMemo(() => {
    if (data.length === 0) return [];
    const step = (WIDTH - PADDING_X * 2) / Math.max(data.length - 1, 1);
    return data.map((d, i) => {
      const x = PADDING_X + i * step;
      const y =
        PADDING_Y +
        (HEIGHT - PADDING_Y * 2) * (1 - d.revenue / maxRevenue);
      return { x, y, ...d };
    });
  }, [data, maxRevenue]);

  // Build smooth polyline path
  const linePath = useMemo(() => {
    if (points.length < 2) return '';
    return points
      .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
      .join(' ');
  }, [points]);

  const areaPath = useMemo(() => {
    if (points.length < 2) return '';
    const last = points[points.length - 1];
    const first = points[0];
    return (
      linePath +
      ` L ${last.x} ${HEIGHT - PADDING_Y} L ${first.x} ${HEIGHT - PADDING_Y} Z`
    );
  }, [linePath, points]);

  const formatAmount = (v: number) =>
    v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v}`;

  if (loading) {
    return (
      <div className="relative h-64 w-full flex items-center justify-center">
        <Skeleton className="w-full h-48" />
      </div>
    );
  }

  const allZero = data.every((d) => d.revenue === 0);

  if (allZero) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-gray-300 gap-2">
        <LineIcon size={32} />
        <p className="text-sm font-medium">No revenue data for this period</p>
      </div>
    );
  }

  return (
    <div className="relative h-64 w-full">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full h-full"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7ED957" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#7ED957" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0.25, 0.5, 0.75, 1].map((t) => {
          const y = PADDING_Y + (HEIGHT - PADDING_Y * 2) * (1 - t);
          return (
            <g key={t}>
              <line
                x1={PADDING_X}
                y1={y}
                x2={WIDTH - PADDING_X}
                y2={y}
                stroke="#f3f4f6"
                strokeWidth="1"
              />
              <text
                x={PADDING_X - 2}
                y={y + 4}
                fontSize="9"
                fill="#9ca3af"
                textAnchor="end"
              >
                {formatAmount(maxRevenue * t)}
              </text>
            </g>
          );
        })}

        {/* Area fill */}
        {areaPath && (
          <path d={areaPath} fill="url(#revGradient)" />
        )}

        {/* Line stroke */}
        {linePath && (
          <path
            d={linePath}
            fill="none"
            stroke="#7ED957"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Data points */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="4" fill="#7ED957" stroke="white" strokeWidth="2" />
            {/* Tooltip-style value on hover via title */}
            <title>{p.month}: {formatAmount(p.revenue)}</title>
          </g>
        ))}
      </svg>

      {/* X-axis labels */}
      <div
        className="flex justify-between text-[10px] text-gray-400 font-semibold mt-1 px-2"
        style={{ marginTop: '-4px' }}
      >
        {data.map((d, i) => (
          <span key={i}>{d.month}</span>
        ))}
      </div>
    </div>
  );
}

// ─── Dynamic Donut Chart ──────────────────────────────────────────────────────
function PaymentDonut({
  methods,
  loading,
}: {
  methods: { method: string; amount: number; percentage: number }[];
  loading: boolean;
}) {
  const METHOD_COLORS: Record<string, string> = {
    Card: '#7ED957',
    PayPal: '#60a5fa',
    'Bank Transfer': '#a78bfa',
    Cash: '#fbbf24',
  };

  const topMethod = methods[0];
  const topPct = topMethod?.percentage ?? 0;

  const formatAmount = (amount: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-4">
        <Skeleton className="w-28 h-28 rounded-full" />
        <div className="grid grid-cols-2 gap-2 w-full">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Donut */}
      <div className="flex justify-center mb-6 relative">
        <svg
          width="120"
          height="120"
          viewBox="0 0 36 36"
          className="transform -rotate-90"
        >
          {/* Background track */}
          <path
            className="text-gray-100"
            strokeWidth="3.5"
            stroke="currentColor"
            fill="none"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          />
          {/* Dynamic arc */}
          <path
            stroke={METHOD_COLORS[topMethod?.method] ?? '#7ED957'}
            strokeDasharray={`${topPct}, 100`}
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-base font-bold text-gray-800">
            {topMethod?.method ?? '—'}
          </span>
          <span className="text-[10px] font-semibold text-gray-400">
            {topPct}% share
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        {['Card', 'PayPal', 'Bank Transfer', 'Cash'].map((m) => {
          const found = methods.find((x) => x.method === m);
          return (
            <div key={m} className="flex items-center gap-1.5 text-gray-600">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: METHOD_COLORS[m] ?? '#ccc' }}
              />
              <span className="truncate">
                {m}: {formatAmount(found?.amount ?? 0)}
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Report() {
  const [period, setPeriod] = useState<string>('6m');

  const {
    data: reportData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['analyticsReport', period],
    queryFn: () => analyticsService.getReport(period),
    staleTime: 60_000, // 1 minute
  });

  const report = reportData?.data;
  const metrics = report?.metrics;

  const formatAmount = (amount: number, currency = 'USD') =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);

  // ─── Summary metric cards ────────────────────────────────────────────────
  const metricCards = [
    {
      label: 'Average Invoice Value',
      value: isLoading ? '—' : formatAmount(metrics?.averageInvoiceValue ?? 0),
      icon: <LineIcon size={22} />,
      iconBg: 'bg-indigo-50',
      iconColor: 'text-indigo-600',
    },
    {
      label: 'Transaction Success Rate',
      value: isLoading ? '—' : `${metrics?.transactionSuccessRate ?? 0}%`,
      icon: <TrendingUp size={22} />,
      iconBg: 'bg-[#7ED957]/10',
      iconColor: 'text-[#6fcf4a]',
    },
    {
      label: 'Total Success Payments',
      value: isLoading ? '—' : `${metrics?.successPaymentsCount ?? 0} recorded`,
      icon: <Award size={22} />,
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
    },
    {
      label: 'Total Revenue',
      value: isLoading ? '—' : formatAmount(metrics?.totalRevenue ?? 0),
      icon: <DollarSign size={22} />,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-500',
    },
  ];

  return (
    <div className="min-h-screen bg-[#FAFAF9] text-gray-900 font-sans flex">
      <Sidebar activePage="Reports" />

      <main className="flex-1 px-8 py-6 h-screen overflow-y-auto">
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Analytics &amp; Reports</h1>
            <p className="text-sm text-gray-400">Deep-dive performance charts &amp; metrics</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => refetch()}
              className="relative w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors bg-white shadow-sm"
              title="Refresh"
            >
              <RefreshCw
                size={16}
                className={`text-gray-600 ${isLoading ? 'animate-spin' : ''}`}
              />
            </button>
            <button className="relative w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors bg-white shadow-sm">
              <Bell size={17} className="text-gray-600" />
              <span className="absolute top-2 right-2.5 w-1.5 h-1.5 rounded-full bg-red-500" />
            </button>
          </div>
        </div>

        {/* ─── Metric Cards ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {metricCards.map((card) => (
            <div
              key={card.label}
              className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4"
            >
              <div
                className={`w-12 h-12 rounded-2xl ${card.iconBg} flex items-center justify-center ${card.iconColor} shrink-0`}
              >
                {card.icon}
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider leading-tight">
                  {card.label}
                </p>
                {isLoading ? (
                  <Skeleton className="mt-1 h-6 w-20" />
                ) : (
                  <h3 className="text-lg font-bold text-gray-800 mt-0.5 truncate">
                    {card.value}
                  </h3>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* ─── Charts Row ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          {/* Revenue Line Chart */}
          <div className="col-span-2 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-bold text-sm text-gray-800">Monthly Revenue Trend</h3>
                <p className="text-xs text-gray-400 mt-0.5">Successful payment volume timeline</p>
              </div>
              <FilterDropdown
                value={period}
                onChange={setPeriod}
                options={REPORT_PERIODS.map((p) => ({ value: p.value, label: p.label }))}
                className="shrink-0"
              />
            </div>

            <RevenueLineChart
              data={report?.monthlyRevenue ?? []}
              loading={isLoading}
            />
          </div>

          {/* Payment Channels */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-sm text-gray-800 mb-1">Payment Channels</h3>
              <p className="text-xs text-gray-400 mb-6">Revenue share by gateway</p>
            </div>
            <PaymentDonut
              methods={report?.paymentMethods ?? []}
              loading={isLoading}
            />
          </div>
        </div>

        {/* ─── Top Paying Clients ──────────────────────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-bold text-sm text-gray-700">Top Paying Clients</h3>
            <span className="text-xs text-gray-400 font-semibold">
              Ordered by customer transaction value
            </span>
          </div>

          <div className="divide-y divide-gray-50">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-5 h-3" />
                    <Skeleton className="w-9 h-9 rounded-full" />
                    <div className="space-y-1">
                      <Skeleton className="h-3 w-28" />
                      <Skeleton className="h-2 w-20" />
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <Skeleton className="h-3 w-16 ml-auto" />
                    <Skeleton className="h-2 w-20 ml-auto" />
                  </div>
                </div>
              ))
            ) : (report?.topClients?.length ?? 0) === 0 ? (
              <div className="p-10 text-center text-gray-400 text-sm flex flex-col items-center gap-2">
                <Award size={28} className="text-gray-200" />
                <p className="font-medium">No client data available yet</p>
                <p className="text-xs">Add customers and transactions to see rankings here</p>
              </div>
            ) : (
              report!.topClients.map((cust, index) => (
                <div
                  key={cust._id}
                  className="px-6 py-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-400 w-5">
                      #{String(index + 1).padStart(2, '0')}
                    </span>
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {cust.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm text-gray-800">{cust.name}</h4>
                      <p className="text-xs text-gray-400">{cust.company || 'Private Individual'}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-bold text-gray-800">
                      {formatAmount(cust.totalSpent)}
                    </span>
                    <p className="text-[10px] text-gray-400 font-semibold">
                      {cust.totalInvoices} Invoice{cust.totalInvoices !== 1 ? 's' : ''} Issued
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
