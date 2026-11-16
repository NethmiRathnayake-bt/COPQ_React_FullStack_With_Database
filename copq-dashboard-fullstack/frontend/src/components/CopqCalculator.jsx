import React, { useState, useMemo } from 'react';
import {
  Upload,
  Calculator,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Save,
  Sparkles,
} from 'lucide-react';
import {
  formatLKR,
  parseScrapExcel,
  parseLossMatrixExcel,
  parseWarrantyExcel,
} from '../utils/excelParser';

export default function CopqCalculator({ rates, priceMaster, onSaveRecord }) {
  const [periodKey, setPeriodKey] = useState('2026-10');
  const [periodLabel, setPeriodLabel] = useState('October 2026');

  // 1. Scrap State
  const [scrapCost, setScrapCost] = useState(0);
  const [scrapMeta, setScrapMeta] = useState(null);
  const [scrapItems, setScrapItems] = useState([]);

  // 2. Section Rework Hours (6 Sections from Quality Report)
  const [sections, setSections] = useState({
    ckd: 0,
    gangs: 0,
    pcel: 0,
    voltexGangs: 0,
    voltexSocket: 0,
    socket: 0,
  });

  // 3. Loss Matrix State (Rework G + Waiting for QC)
  const [lossMatrixReworkG, setLossMatrixReworkG] = useState(0);
  const [qcWaitingHrs, setQcWaitingHrs] = useState(0);
  const [matrixMeta, setMatrixMeta] = useState(null);

  // 4. External Failure (Warranty Returns)
  const [warrantyCost, setWarrantyCost] = useState(0);
  const [warrantyMeta, setWarrantyMeta] = useState(null);
  const [warrantyItems, setWarrantyItems] = useState([]);

  const [statusMsg, setStatusMsg] = useState(null);
  const [saving, setSaving] = useState(false);

  // Auto-format periodLabel when periodKey (YYYY-MM) changes
  const handleMonthChange = (val) => {
    setPeriodKey(val);
    if (val && val.includes('-')) {
      const [y, m] = val.split('-');
      const date = new Date(Number(y), Number(m) - 1, 1);
      setPeriodLabel(date.toLocaleString('en-US', { month: 'long', year: 'numeric' }));
    }
  };

  // Load September 2026 preset button for quick testing
  const loadSeptemberDemo = () => {
    setPeriodKey('2026-09');
    setPeriodLabel('September 2026');
    setScrapCost(4362304.63);
    setScrapMeta({ rowCount: 247, note: 'Loaded verified SCRP September.xlsx totals' });
    setSections({
      ckd: 401.7,
      gangs: 49.5,
      pcel: 13.75,
      voltexGangs: 1089.95,
      voltexSocket: 1411.5,
      socket: 31.75,
    });
    setLossMatrixReworkG(552.46);
    setQcWaitingHrs(82.0);
    setMatrixMeta({ sheetUsed: 'Sheet4', note: 'Loaded verified Loss Matrix-September 2026' });
    setWarrantyCost(8373846.09);
    setWarrantyMeta({ rowCount: 2582, note: 'Loaded verified September Warranty External Cost' });
    setStatusMsg({ type: 'info', text: 'September 2026 benchmark values loaded into calculator!' });
  };

  // File Upload Handlers
  const handleScrapUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await parseScrapExcel(file);
      setScrapCost(res.totalScrap);
      setScrapItems(res.items);
      setScrapMeta(res);
      setStatusMsg({
        type: 'success',
        text: `Scrap Excel parsed: ${res.rowCount} valid items = LKR ${formatLKR(res.totalScrap)}`,
      });
    } catch (err) {
      setStatusMsg({ type: 'error', text: `Failed to parse Scrap file: ${err.message}` });
    }
  };

  const handleLossMatrixUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await parseLossMatrixExcel(file);
      setLossMatrixReworkG(res.reworkGHours);
      setQcWaitingHrs(res.waitingQcHours);
      setMatrixMeta(res);
      setStatusMsg({
        type: 'success',
        text: `Loss Matrix (${res.sheetUsed}) parsed: Rework G = ${res.reworkGHours} Hrs, Waiting QC = ${res.waitingQcHours} Hrs`,
      });
    } catch (err) {
      setStatusMsg({ type: 'error', text: `Failed to parse Loss Matrix: ${err.message}` });
    }
  };

  const handleWarrantyUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await parseWarrantyExcel(file, priceMaster);
      setWarrantyCost(res.totalWarrantyCost);
      setWarrantyItems(res.items);
      setWarrantyMeta(res);
      setStatusMsg({
        type: res.unmatchedCodes.length > 0 ? 'warning' : 'success',
        text: `Warranty Report parsed: ${res.totalValidUnits} units across ${res.rowCount} rows = LKR ${formatLKR(
          res.totalWarrantyCost
        )}${
          res.unmatchedCodes.length > 0
            ? ` (${res.unmatchedCodes.length} material codes missing unit prices in Price Master)`
            : ''
        }`,
      });
    } catch (err) {
      setStatusMsg({ type: 'error', text: `Failed to parse Warranty Report: ${err.message}` });
    }
  };

  // Live Calculations
  const liveCalc = useMemo(() => {
    const sectionReworkSum =
      Number(sections.ckd || 0) +
      Number(sections.gangs || 0) +
      Number(sections.pcel || 0) +
      Number(sections.voltexGangs || 0) +
      Number(sections.voltexSocket || 0) +
      Number(sections.socket || 0);

    const totalReworkHrs = sectionReworkSum + Number(lossMatrixReworkG || 0);
    const reworkRate = Number(rates.rework_hourly_rate || 903.906337);
    const qcRate = Number(rates.qc_waiting_hourly_rate || 1334.31939);

    const reworkCost = totalReworkHrs * reworkRate;
    const downtimeCost = Number(qcWaitingHrs || 0) * qcRate;
    const totalInternal = Number(scrapCost || 0) + reworkCost + downtimeCost;
    const totalExternal = Number(warrantyCost || 0);
    const totalCopq = totalInternal + totalExternal;

    return {
      sectionReworkSum,
      totalReworkHrs,
      reworkRate,
      qcRate,
      reworkCost,
      downtimeCost,
      totalInternal,
      totalExternal,
      totalCopq,
    };
  }, [sections, lossMatrixReworkG, qcWaitingHrs, scrapCost, warrantyCost, rates]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const [y, m] = periodKey.split('-');
      const sortOrder = (Number(y) - 2025) * 12 + Number(m) - 6;

      await onSaveRecord({
        period_key: periodKey,
        period_label: periodLabel,
        sort_order: sortOrder > 0 ? sortOrder : 99,
        scrap_cost: Number(scrapCost),
        ckd_rework_hrs: Number(sections.ckd),
        gangs_rework_hrs: Number(sections.gangs),
        pcel_rework_hrs: Number(sections.pcel),
        voltex_gangs_rework_hrs: Number(sections.voltexGangs),
        voltex_socket_rework_hrs: Number(sections.voltexSocket),
        socket_rework_hrs: Number(sections.socket),
        loss_matrix_rework_g_hrs: Number(lossMatrixReworkG),
        rework_hourly_rate: liveCalc.reworkRate,
        rework_total_cost: Number(liveCalc.reworkCost.toFixed(2)),
        qc_waiting_hrs: Number(qcWaitingHrs),
        qc_hourly_rate: liveCalc.qcRate,
        downtime_qc_cost: Number(liveCalc.downtimeCost.toFixed(2)),
        total_internal_cost: Number(liveCalc.totalInternal.toFixed(2)),
        warranty_returns_cost: Number(liveCalc.totalExternal.toFixed(2)),
        total_external_cost: Number(liveCalc.totalExternal.toFixed(2)),
        total_copq: Number(liveCalc.totalCopq.toFixed(2)),
        scrap_items: scrapItems,
        warranty_items: warrantyItems,
      });
      setStatusMsg({
        type: 'success',
        text: `✅ Saved ${periodLabel} COPQ calculation to database and updated Dashboard!`,
      });
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Calculator className="w-6 h-6 text-indigo-600" />
            Monthly COPQ Calculation Engine
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Upload monthly Excel exports (SCRP, Loss Matrix, Warranty Raw Report) & enter section rework hours.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={loadSeptemberDemo}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl border border-indigo-200 transition"
          >
            <Sparkles className="w-4 h-4" />
            Load Sep 2026 Sample Data
          </button>

          <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
            <label className="text-xs font-semibold text-slate-600">Period:</label>
            <input
              type="month"
              value={periodKey}
              onChange={(e) => handleMonthChange(e.target.value)}
              className="bg-transparent text-sm font-bold text-slate-900 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Status Alert */}
      {statusMsg && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 text-sm font-medium ${
            statusMsg.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : statusMsg.type === 'warning'
              ? 'bg-amber-50 border-amber-200 text-amber-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          {statusMsg.type === 'error' ? (
            <AlertCircle className="w-5 h-5 shrink-0" />
          ) : (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Inputs & File Parsers */}
        <div className="lg:col-span-2 space-y-6">
          {/* STEP 1: SCRAP FILE UPLOAD */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-600">
                  1. Internal Failure — Material Scrap
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  SAP Scrap Export (`SCRP [Month].xlsx`)
                </h3>
              </div>
              <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition">
                <Upload className="w-4 h-4" />
                Upload SCRP Excel
                <input type="file" accept=".xlsx,.xls,.csv" onChange={handleScrapUpload} className="hidden" />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Total Scrap Cost (LKR) — Auto-deduplicated
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={scrapCost}
                  onChange={(e) => setScrapCost(parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs text-slate-600">
                {scrapMeta ? (
                  <div className="space-y-1">
                    <div className="font-semibold text-emerald-700">
                      ✓ Parsed {scrapMeta.rowCount} line items
                    </div>
                    {scrapMeta.plantBreakdown && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {Object.entries(scrapMeta.plantBreakdown).map(([plant, val]) => (
                          <span key={plant} className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[11px]">
                            {plant}: {formatLKR(val)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <span>
                    Upload the SAP Scrap sheet. Summary rows (&quot;Total&quot; / &quot;Grand Total&quot;) are automatically ignored to prevent double-counting.
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* STEP 2: SECTION REWORK HOURS + LOSS MATRIX */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                  2. Internal Failure — Rework & QC Downtime
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  Section Rework Hours & Loss Matrix (`Loss Matrix.xls`)
                </h3>
              </div>
              <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition">
                <FileSpreadsheet className="w-4 h-4" />
                Upload Loss Matrix
                <input type="file" accept=".xlsx,.xls" onChange={handleLossMatrixUpload} className="hidden" />
              </label>
            </div>

            {/* 6 Production Sections Grid */}
            <div>
              <p className="text-xs font-semibold text-slate-600 mb-2.5">
                Section-wise Rework Hours (from Production Rework Log):
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { key: 'ckd', label: 'CKD REWORK (Hrs)' },
                  { key: 'gangs', label: 'Gangs REWORK (Hrs)' },
                  { key: 'pcel', label: 'PCEL REWORK (Hrs)' },
                  { key: 'voltexGangs', label: 'VOLTEX Gangs REWORK' },
                  { key: 'voltexSocket', label: 'VOLTEX Socket REWORK' },
                  { key: 'socket', label: 'Socket REWORK (Hrs)' },
                ].map((sec) => (
                  <div key={sec.key} className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      {sec.label}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={sections[sec.key]}
                      onChange={(e) =>
                        setSections({ ...sections, [sec.key]: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full bg-white px-2.5 py-1.5 rounded-lg border border-slate-300 font-mono text-sm font-bold text-slate-900"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Loss Matrix Extracted Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <div className="bg-indigo-50/50 p-3.5 rounded-xl border border-indigo-100">
                <label className="block text-xs font-bold text-indigo-950 mb-1">
                  Loss Matrix: Quality Defects & Rework - G (Hrs)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={lossMatrixReworkG}
                  onChange={(e) => setLossMatrixReworkG(parseFloat(e.target.value) || 0)}
                  className="w-full bg-white px-3 py-2 rounded-lg border border-indigo-200 font-mono text-sm font-bold text-slate-900"
                />
                <span className="text-[11px] text-indigo-700 mt-1 block">
                  Added to Section Rework ({liveCalc.sectionReworkSum.toFixed(2)} + {Number(lossMatrixReworkG).toFixed(2)} = {liveCalc.totalReworkHrs.toFixed(2)} Hrs)
                </span>
              </div>

              <div className="bg-teal-50/50 p-3.5 rounded-xl border border-teal-100">
                <label className="block text-xs font-bold text-teal-950 mb-1">
                  Loss Matrix: Waiting for QC - Loss R (Hrs)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={qcWaitingHrs}
                  onChange={(e) => setQcWaitingHrs(parseFloat(e.target.value) || 0)}
                  className="w-full bg-white px-3 py-2 rounded-lg border border-teal-200 font-mono text-sm font-bold text-slate-900"
                />
                <span className="text-[11px] text-teal-700 mt-1 block">
                  Multiplied by QC Stoppage Rate (LKR {liveCalc.qcRate.toFixed(2)}/Hr)
                </span>
              </div>
            </div>
          </div>

          {/* STEP 3: WARRANTY / EXTERNAL RETURNS */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-rose-600">
                  3. External Failure — Warranty & Market Returns
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  Warranty Claims Raw Report (`Raw Report.xlsx`)
                </h3>
              </div>
              <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl transition">
                <Upload className="w-4 h-4" />
                Upload Raw Report
                <input type="file" accept=".xlsx,.xls,.csv" onChange={handleWarrantyUpload} className="hidden" />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Warranty Claims & Product Returns Cost (LKR)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={warrantyCost}
                  onChange={(e) => setWarrantyCost(parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-sm font-bold text-slate-900 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs text-slate-600">
                {warrantyMeta ? (
                  <div>
                    <div className="font-semibold text-slate-800">
                      Processed {warrantyMeta.rowCount} claim rows
                    </div>
                    {warrantyMeta.unmatchedCodes?.length > 0 && (
                      <div className="text-amber-700 mt-1">
                        ⚠ {warrantyMeta.unmatchedCodes.length} codes missing unit cost in Price Master (you can still override the total LKR on the left).
                      </div>
                    )}
                  </div>
                ) : (
                  <span>
                    Matches Material Codes against your Price Master (`(Receive Qty - Rejected Qty) × Unit Cost`) or accepts direct LKR total.
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Calculation Summary Card */}
        <div className="space-y-6">
          <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-lg sticky top-6 space-y-5">
            <div className="border-b border-slate-700 pb-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
                Live Calculation Preview
              </span>
              <h3 className="text-xl font-bold mt-0.5">{periodLabel}</h3>
            </div>

            {/* Internal Failure Breakdown */}
            <div className="space-y-2.5 text-sm">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Internal Failure Cost
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">1. Scrap Cost</span>
                <span className="font-mono font-semibold">{formatLKR(scrapCost)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">
                  2. Rework ({liveCalc.totalReworkHrs.toFixed(2)} hrs)
                </span>
                <span className="font-mono font-semibold">{formatLKR(liveCalc.reworkCost)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">
                  3. QC Stoppage ({Number(qcWaitingHrs).toFixed(2)} hrs)
                </span>
                <span className="font-mono font-semibold">{formatLKR(liveCalc.downtimeCost)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-700 font-bold text-blue-300">
                <span>Total Internal Cost</span>
                <span className="font-mono">LKR {formatLKR(liveCalc.totalInternal)}</span>
              </div>
            </div>

            {/* External Failure Breakdown */}
            <div className="space-y-2.5 text-sm pt-2">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                External Failure Cost
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">Warranty & Returns</span>
                <span className="font-mono font-semibold">{formatLKR(liveCalc.totalExternal)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-700 font-bold text-rose-300">
                <span>Total External Cost</span>
                <span className="font-mono">LKR {formatLKR(liveCalc.totalExternal)}</span>
              </div>
            </div>

            {/* Final COPQ Box */}
            <div className="bg-gradient-to-r from-amber-400 to-amber-300 text-slate-950 p-4 rounded-xl">
              <div className="text-xs font-extrabold uppercase tracking-wider">
                Total Cost of Poor Quality (COPQ)
              </div>
              <div className="text-2xl font-black font-mono mt-1">
                LKR {formatLKR(liveCalc.totalCopq)}
              </div>
            </div>

            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-extrabold text-sm rounded-xl flex items-center justify-center gap-2 shadow-md transition"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving to Database...' : `Save ${periodLabel} to Database`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
