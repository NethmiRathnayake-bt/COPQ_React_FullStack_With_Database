import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import {
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  ShieldAlert,
  Wrench,
  Clock,
  DollarSign,
  Download,
} from 'lucide-react';
import { formatLKR, exportCopqSummaryExcel } from '../utils/excelParser';

const formatCompact = (val) => {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(0)}K`;
  return val;
};

export default function DashboardOverview({ records }) {
  const sortedRecords = useMemo(() => {
    return [...records].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  }, [records]);

  const latest = sortedRecords[sortedRecords.length - 1] || {};
  const previous = sortedRecords[sortedRecords.length - 2] || latest;

  const calcDelta = (curr, prev) => {
    const c = Number(curr) || 0;
    const p = Number(prev) || 0;
    if (p === 0) return 0;
    return (((c - p) / p) * 100).toFixed(1);
  };

  const copqDelta = calcDelta(latest.total_copq, previous.total_copq);
  const internalDelta = calcDelta(latest.total_internal_cost, previous.total_internal_cost);
  const externalDelta = calcDelta(latest.total_external_cost, previous.total_external_cost);
  const scrapDelta = calcDelta(latest.scrap_cost, previous.scrap_cost);

  const chartData = useMemo(() => {
    return sortedRecords.map((r) => ({
      name: r.period_label.replace(' 20', ' \''),
      fullLabel: r.period_label,
      Scrap: Number(r.scrap_cost),
      Rework: Number(r.rework_total_cost),
      DowntimeQC: Number(r.downtime_qc_cost),
      InternalTotal: Number(r.total_internal_cost),
      Warranty: Number(r.warranty_returns_cost),
      COPQ: Number(r.total_copq),
    }));
  }, [sortedRecords]);

  // Exclude July 2025 outlier (33.68M) from QC Downtime chart so monthly variation (44K - 165K) is clearly visible just like Excel sheet!
  const qcFilteredChartData = useMemo(() => {
    return chartData.filter((d) => d.fullLabel !== 'July 2025');
  }, [chartData]);

  return (
    <div className="space-y-6">
      {/* Top Executive Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 text-xs font-semibold bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100">
              Latest Period: {latest.period_label || 'N/A'}
            </span>
            <span className="text-xs text-slate-500">
              Formula: COPQ = Internal Failure Cost + External Failure Cost
            </span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mt-1">
            Cost of Poor Quality (COPQ) Executive Dashboard
          </h2>
        </div>

        <button
          onClick={() => exportCopqSummaryExcel(sortedRecords)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-all"
        >
          <Download className="w-4 h-4" />
          Export Matrix (.xlsx)
        </button>
      </div>

      {/* 4 KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {/* Total COPQ */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 rounded-2xl shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Total COPQ ({latest.period_label})
            </span>
            <div className="p-2 bg-white/10 rounded-lg">
              <DollarSign className="w-5 h-5 text-amber-400" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-extrabold tracking-tight">
            LKR {formatLKR(latest.total_copq)}
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold ${
                Number(copqDelta) <= 0
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'bg-rose-500/20 text-rose-300'
              }`}
            >
              {Number(copqDelta) <= 0 ? (
                <TrendingDown className="w-3.5 h-3.5" />
              ) : (
                <TrendingUp className="w-3.5 h-3.5" />
              )}
              {Math.abs(copqDelta)}%
            </span>
            <span className="text-slate-400">vs {previous.period_label}</span>
          </div>
        </div>

        {/* Internal Failure Cost */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Internal Failure Cost
            </span>
            <div className="p-2 bg-blue-50 rounded-lg">
              <Wrench className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900">
            LKR {formatLKR(latest.total_internal_cost)}
          </div>
          <div className="mt-3 flex items-center justify-between text-xs">
            <span
              className={`inline-flex items-center gap-1 font-semibold ${
                Number(internalDelta) <= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {Number(internalDelta) <= 0 ? '▼' : '▲'} {Math.abs(internalDelta)}% MoM
            </span>
            <span className="text-slate-400">
              {latest.total_copq
                ? ((Number(latest.total_internal_cost) / Number(latest.total_copq)) * 100).toFixed(1)
                : 0}
              % of COPQ
            </span>
          </div>
        </div>

        {/* External Failure Cost */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total External Failure Cost
            </span>
            <div className="p-2 bg-rose-50 rounded-lg">
              <ShieldAlert className="w-5 h-5 text-rose-600" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900">
            LKR {formatLKR(latest.total_external_cost)}
          </div>
          <div className="mt-3 flex items-center justify-between text-xs">
            <span
              className={`inline-flex items-center gap-1 font-semibold ${
                Number(externalDelta) <= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {Number(externalDelta) <= 0 ? '▼' : '▲'} {Math.abs(externalDelta)}% MoM
            </span>
            <span className="text-slate-400">
              {latest.total_copq
                ? ((Number(latest.total_external_cost) / Number(latest.total_copq)) * 100).toFixed(1)
                : 0}
              % of COPQ
            </span>
          </div>
        </div>

        {/* Scrap Cost */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Material Scrap Cost
            </span>
            <div className="p-2 bg-amber-50 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900">
            LKR {formatLKR(latest.scrap_cost)}
          </div>
          <div className="mt-3 flex items-center justify-between text-xs">
            <span
              className={`inline-flex items-center gap-1 font-semibold ${
                Number(scrapDelta) <= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {Number(scrapDelta) <= 0 ? '▼' : '▲'} {Math.abs(scrapDelta)}% MoM
            </span>
            <span className="text-slate-400">
              Rework: LKR {formatCompact(Number(latest.rework_total_cost))}
            </span>
          </div>
        </div>
      </div>

      {/* Main COPQ Trend Chart & Internal vs External Stacked Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="mb-4">
            <h3 className="text-base font-bold text-slate-900">
              Cost of Poor Quality (COPQ) Values Variation
            </h3>
            <p className="text-xs text-slate-500">
              Monthly total COPQ trajectory across all reporting periods (LKR)
            </p>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 16, left: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="copqGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tickFormatter={formatCompact} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  formatter={(value) => [`LKR ${formatLKR(value)}`, 'Total COPQ']}
                  labelFormatter={(label, payload) => payload?.[0]?.payload?.fullLabel || label}
                />
                <Area
                  type="monotone"
                  dataKey="COPQ"
                  stroke="#2563eb"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#copqGradient)"
                  dot={{ r: 3.5, fill: '#2563eb' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Internal vs External Breakdown Bar Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="mb-4">
            <h3 className="text-base font-bold text-slate-900">Internal vs External Split</h3>
            <p className="text-xs text-slate-500">Last 6 months failure cost structure</p>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.slice(-6)} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tickFormatter={formatCompact} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip formatter={(value) => `LKR ${formatLKR(value)}`} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="InternalTotal" name="Internal Cost" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Warranty" name="External (Warranty)" stackId="a" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 4 Component Variation Charts matching the Excel Workbook */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. Scrap Values Variation */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
          <h4 className="text-sm font-bold text-slate-900 mb-1">Scrap Values Variation (LKR)</h4>
          <p className="text-xs text-slate-500 mb-4">Monthly material scrap cost across plants</p>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis tickFormatter={formatCompact} tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip formatter={(v) => [`LKR ${formatLKR(v)}`, 'Scrap Cost']} />
                <Line type="monotone" dataKey="Scrap" stroke="#d97706" strokeWidth={2.2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. Rework / Reinspection / Retesting Values Variation */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
          <h4 className="text-sm font-bold text-slate-900 mb-1">
            Rework / Reinspection / Retesting Variation (LKR)
          </h4>
          <p className="text-xs text-slate-500 mb-4">Section rework + Loss Matrix G hours valuation</p>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis tickFormatter={formatCompact} tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip formatter={(v) => [`LKR ${formatLKR(v)}`, 'Rework Cost']} />
                <Line type="monotone" dataKey="Rework" stroke="#4f46e5" strokeWidth={2.2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3. Down Time / Waiting for QC Variation */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-sm font-bold text-slate-900">
              Down Time / Line Stoppage (Waiting for QC) Variation
            </h4>
            <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
              Aug 2025 – Sep 2026
            </span>
          </div>
          <p className="text-xs text-slate-500 mb-4">Measurement & Adjustment Loss R cost (LKR)</p>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={qcFilteredChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis tickFormatter={formatCompact} tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip formatter={(v) => [`LKR ${formatLKR(v)}`, 'QC Stoppage Cost']} />
                <Line type="monotone" dataKey="DowntimeQC" stroke="#0d9488" strokeWidth={2.2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 4. Warranty Claims & Product Returns Variation */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
          <h4 className="text-sm font-bold text-slate-900 mb-1">
            Warranty Claims & Product Returns Variation (LKR)
          </h4>
          <p className="text-xs text-slate-500 mb-4">External failure cost from market returns</p>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis tickFormatter={formatCompact} tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip formatter={(v) => [`LKR ${formatLKR(v)}`, 'Warranty Returns']} />
                <Line type="monotone" dataKey="Warranty" stroke="#e11d48" strokeWidth={2.2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Horizontal Matrix Summary Table matching Excel Sheet */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Cost of Poor Quality Calculation (COPQ) — Master Matrix
            </h3>
            <p className="text-xs text-slate-500">
              All values in Sri Lankan Rupees (LKR). Scroll horizontally to inspect all periods.
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs border-collapse">
            <thead>
              <tr className="bg-amber-300/90 text-slate-900 font-bold border-b border-slate-300">
                <th className="sticky left-0 z-10 bg-amber-300 px-4 py-3 text-left min-w-[270px] border-r border-slate-300">
                  Cost Category (LKR)
                </th>
                {sortedRecords.map((r) => (
                  <th key={r.period_key} className="px-4 py-3 text-right min-w-[130px] whitespace-nowrap">
                    {r.period_label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {/* Internal Failure Header */}
              <tr className="bg-orange-50/80 font-semibold text-slate-700">
                <td className="sticky left-0 z-10 bg-orange-50 px-4 py-2 border-r border-slate-200">
                  Internal Failure Cost
                </td>
                <td colSpan={sortedRecords.length}></td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="sticky left-0 z-10 bg-white px-4 py-2.5 text-slate-700 border-r border-slate-200">
                  Scrap
                </td>
                {sortedRecords.map((r) => (
                  <td key={r.period_key} className="px-4 py-2.5 text-right font-mono text-slate-800">
                    {formatLKR(r.scrap_cost)}
                  </td>
                ))}
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="sticky left-0 z-10 bg-white px-4 py-2.5 text-slate-700 border-r border-slate-200">
                  Rework / Reinspection / Retesting Cost
                </td>
                {sortedRecords.map((r) => (
                  <td key={r.period_key} className="px-4 py-2.5 text-right font-mono text-slate-800">
                    {formatLKR(r.rework_total_cost)}
                  </td>
                ))}
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="sticky left-0 z-10 bg-white px-4 py-2.5 text-slate-700 border-r border-slate-200">
                  Down time / Line Stoppage (Waiting for QC)
                </td>
                {sortedRecords.map((r) => (
                  <td key={r.period_key} className="px-4 py-2.5 text-right font-mono text-slate-800">
                    {formatLKR(r.downtime_qc_cost)}
                  </td>
                ))}
              </tr>
              <tr className="bg-blue-100/70 font-bold text-slate-900">
                <td className="sticky left-0 z-10 bg-blue-100 px-4 py-2.5 border-r border-slate-300">
                  Total Internal Cost
                </td>
                {sortedRecords.map((r) => (
                  <td key={r.period_key} className="px-4 py-2.5 text-right font-mono">
                    {formatLKR(r.total_internal_cost)}
                  </td>
                ))}
              </tr>

              {/* External Failure Header */}
              <tr className="bg-orange-50/80 font-semibold text-slate-700">
                <td className="sticky left-0 z-10 bg-orange-50 px-4 py-2 border-r border-slate-200">
                  External Failure Cost
                </td>
                <td colSpan={sortedRecords.length}></td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="sticky left-0 z-10 bg-white px-4 py-2.5 text-slate-700 border-r border-slate-200">
                  Warranty Claims & Product Returns
                </td>
                {sortedRecords.map((r) => (
                  <td key={r.period_key} className="px-4 py-2.5 text-right font-mono text-slate-800">
                    {formatLKR(r.warranty_returns_cost)}
                  </td>
                ))}
              </tr>
              <tr className="bg-blue-100/70 font-bold text-slate-900">
                <td className="sticky left-0 z-10 bg-blue-100 px-4 py-2.5 border-r border-slate-300">
                  Total External Failure Cost
                </td>
                {sortedRecords.map((r) => (
                  <td key={r.period_key} className="px-4 py-2.5 text-right font-mono">
                    {formatLKR(r.total_external_cost)}
                  </td>
                ))}
              </tr>

              {/* Grand Total COPQ */}
              <tr className="bg-amber-300 font-extrabold text-slate-950 border-t-2 border-slate-400">
                <td className="sticky left-0 z-10 bg-amber-300 px-4 py-3 border-r border-slate-400">
                  Cost of Poor Quality (COPQ)
                </td>
                {sortedRecords.map((r) => (
                  <td key={r.period_key} className="px-4 py-3 text-right font-mono">
                    {formatLKR(r.total_copq)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
