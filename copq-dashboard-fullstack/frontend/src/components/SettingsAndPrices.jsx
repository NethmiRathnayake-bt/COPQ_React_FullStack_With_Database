import React, { useState } from 'react';
import { Settings, Plus, Upload, Save, CheckCircle2, Search } from 'lucide-react';
import { formatLKR, parsePriceMasterExcel } from '../utils/excelParser';

export default function SettingsAndPrices({ rates, onUpdateRates, priceMaster, onSavePrices }) {
  const [reworkRate, setReworkRate] = useState(rates.rework_hourly_rate);
  const [qcRate, setQcRate] = useState(rates.qc_waiting_hourly_rate);
  const [searchTerm, setSearchTerm] = useState('');
  const [newItem, setNewItem] = useState({
    material_code: '',
    material_name: '',
    category: 'Lighting',
    unit_cost_lkr: '',
  });
  const [toast, setToast] = useState('');

  const notify = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  };

  const handleRateSave = async (e) => {
    e.preventDefault();
    await onUpdateRates({
      rework_hourly_rate: Number(reworkRate),
      qc_waiting_hourly_rate: Number(qcRate),
    });
    notify('Hourly labor & downtime rates updated in database!');
  };

  const handleAddSinglePrice = async (e) => {
    e.preventDefault();
    if (!newItem.material_code || !newItem.unit_cost_lkr) return;
    await onSavePrices([
      {
        ...newItem,
        unit_cost_lkr: Number(newItem.unit_cost_lkr),
      },
    ]);
    setNewItem({ material_code: '', material_name: '', category: 'Lighting', unit_cost_lkr: '' });
    notify(`Saved unit cost for ${newItem.material_code}`);
  };

  const handleBulkPriceUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const parsed = await parsePriceMasterExcel(file);
    if (parsed.length > 0) {
      await onSavePrices(parsed);
      notify(`Imported ${parsed.length} material prices into Price Master!`);
    }
  };

  const filteredPrices = priceMaster.filter(
    (p) =>
      p.material_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.material_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {toast && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-center gap-2 text-sm font-semibold">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          {toast}
        </div>
      )}

      {/* Hourly Rate Card Configuration */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-bold text-slate-900">Standard Hourly Cost Rates (LKR / Hour)</h2>
        </div>

        <form onSubmit={handleRateSave} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Rework / Reinspection Hourly Rate (LKR/Hr)
            </label>
            <input
              type="number"
              step="0.000001"
              value={reworkRate}
              onChange={(e) => setReworkRate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-sm font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Waiting for QC / Stoppage Hourly Rate (LKR/Hr)
            </label>
            <input
              type="number"
              step="0.000001"
              value={qcRate}
              onChange={(e) => setQcRate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-sm font-bold"
            />
          </div>

          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition"
          >
            <Save className="w-4 h-4" />
            Save Rate Settings
          </button>
        </form>
      </div>

      {/* Product Price Master for External Warranty Returns */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Product Price Master (For Warranty Returns Valuation)
            </h3>
            <p className="text-xs text-slate-500">
              Used to automatically calculate External Failure Cost when uploading `Raw Report.xlsx`.
            </p>
          </div>

          <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition">
            <Upload className="w-4 h-4" />
            Bulk Import Price Excel
            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleBulkPriceUpload} className="hidden" />
          </label>
        </div>

        {/* Add / Update Single Material Price */}
        <form
          onSubmit={handleAddSinglePrice}
          className="grid grid-cols-1 sm:grid-cols-5 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200"
        >
          <input
            type="text"
            placeholder="Material Code (e.g. 722-1325)"
            value={newItem.material_code}
            onChange={(e) => setNewItem({ ...newItem, material_code: e.target.value })}
            className="px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold bg-white"
            required
          />
          <input
            type="text"
            placeholder="Material Name"
            value={newItem.material_name}
            onChange={(e) => setNewItem({ ...newItem, material_name: e.target.value })}
            className="sm:col-span-2 px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white"
          />
          <input
            type="number"
            step="0.01"
            placeholder="Unit Cost (LKR)"
            value={newItem.unit_cost_lkr}
            onChange={(e) => setNewItem({ ...newItem, unit_cost_lkr: e.target.value })}
            className="px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono font-bold bg-white"
            required
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition"
          >
            <Plus className="w-4 h-4" />
            Add / Update
          </button>
        </form>

        {/* Search & Table */}
        <div className="relative max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search material code or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-100 text-slate-700 font-bold">
              <tr>
                <th className="px-4 py-3 text-left">Material Code</th>
                <th className="px-4 py-3 text-left">Material Name</th>
                <th className="px-4 py-3 text-left">Category</th>
                <th className="px-4 py-3 text-right">Unit Cost (LKR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredPrices.map((p) => (
                <tr key={p.material_code} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-mono font-bold text-indigo-700">{p.material_code}</td>
                  <td className="px-4 py-2.5 text-slate-800">{p.material_name}</td>
                  <td className="px-4 py-2.5 text-slate-500">{p.category}</td>
                  <td className="px-4 py-2.5 text-right font-mono font-bold text-slate-900">
                    {formatLKR(p.unit_cost_lkr)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
