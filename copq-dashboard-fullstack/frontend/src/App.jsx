import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Calculator, Settings, Database, ShieldCheck } from 'lucide-react';
import DashboardOverview from './components/DashboardOverview';
import CopqCalculator from './components/CopqCalculator';
import SettingsAndPrices from './components/SettingsAndPrices';
import {
  INITIAL_COPQ_RECORDS,
  INITIAL_RATES,
  INITIAL_PRICE_MASTER,
} from './utils/seedData';

const API_BASE = 'http://localhost:5000/api/copq';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [records, setRecords] = useState(INITIAL_COPQ_RECORDS);
  const [rates, setRates] = useState(INITIAL_RATES);
  const [priceMaster, setPriceMaster] = useState(INITIAL_PRICE_MASTER);
  const [dbConnected, setDbConnected] = useState(false);

  // Attempt to sync with Node + MySQL Backend; gracefully fallback to local state if offline
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [recRes, rateRes, priceRes] = await Promise.all([
          fetch(`${API_BASE}/records`),
          fetch(`${API_BASE}/rates`),
          fetch(`${API_BASE}/prices`),
        ]);
        if (recRes.ok && rateRes.ok && priceRes.ok) {
          const recJson = await recRes.json();
          const rateJson = await rateRes.json();
          const priceJson = await priceRes.json();

          if (recJson.data?.length) setRecords(recJson.data);
          if (rateJson.data?.length) {
            const mappedRates = {};
            rateJson.data.forEach((r) => {
              mappedRates[r.setting_key] = Number(r.rate_value);
            });
            setRates((prev) => ({ ...prev, ...mappedRates }));
          }
          if (priceJson.data?.length) setPriceMaster(priceJson.data);
          setDbConnected(true);
        }
      } catch (err) {
        setDbConnected(false);
      }
    };
    fetchAll();
  }, []);

  const handleSaveRecord = async (payload) => {
    // Update local state immediately for snappy UX
    setRecords((prev) => {
      const exists = prev.some((r) => r.period_key === payload.period_key);
      if (exists) {
        return prev.map((r) => (r.period_key === payload.period_key ? { ...r, ...payload } : r));
      }
      return [...prev, payload];
    });

    if (dbConnected) {
      const res = await fetch(`${API_BASE}/records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Backend failed to save record');
    }
    setActiveTab('dashboard');
  };

  const handleUpdateRates = async (newRates) => {
    setRates(newRates);
    if (dbConnected) {
      await fetch(`${API_BASE}/rates`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRates),
      });
    }
  };

  const handleSavePrices = async (items) => {
    setPriceMaster((prev) => {
      const map = new Map(prev.map((p) => [p.material_code, p]));
      items.forEach((i) => map.set(i.material_code, i));
      return Array.from(map.values());
    });

    if (dbConnected) {
      await fetch(`${API_BASE}/prices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Top Navbar */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-blue-400 flex items-center justify-center shadow">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-extrabold tracking-tight leading-none">
                COPQ Intelligence Suite
              </h1>
              <span className="text-[11px] text-slate-400">
                Quality Assurance & Financial Loss Analytics
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-xl border border-slate-700/80">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'dashboard'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard & Matrix
            </button>
            <button
              onClick={() => setActiveTab('calculator')}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'calculator'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Calculator className="w-4 h-4" />
              Calculate New Month
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'settings'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Settings className="w-4 h-4" />
              Rates & Price Master
            </button>
          </nav>

          {/* DB Connection Pill */}
          <div className="hidden md:flex items-center gap-2 text-xs">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-semibold ${
                dbConnected
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                  : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              {dbConnected ? 'MySQL Connected' : 'Local Preview Mode'}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && <DashboardOverview records={records} />}
        {activeTab === 'calculator' && (
          <CopqCalculator
            rates={rates}
            priceMaster={priceMaster}
            onSaveRecord={handleSaveRecord}
          />
        )}
        {activeTab === 'settings' && (
          <SettingsAndPrices
            rates={rates}
            onUpdateRates={handleUpdateRates}
            priceMaster={priceMaster}
            onSavePrices={handleSavePrices}
          />
        )}
      </main>
    </div>
  );
}
