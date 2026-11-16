import * as XLSX from 'xlsx';

// Format LKR currency nicely
export const formatLKR = (val) => {
  const num = Number(val) || 0;
  return new Intl.NumberFormat('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

// 1. Parse SCRP Excel file (e.g., SCRP September.xlsx)
// Automatically excludes 'Total' / 'Grand Total' summary rows at bottom so it doesn't triple count!
export const parseScrapExcel = async (file) => {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet);

  let totalScrap = 0;
  const items = [];
  const plantBreakdown = {};

  rows.forEach((row) => {
    const mat = row['Material'];
    const amt = Number(row['Amt.in Loc.Cur.']);
    // Ignore summary/total rows where Material is blank or 'Total'
    if (mat && String(mat).trim().toLowerCase() !== 'total' && !isNaN(amt)) {
      const absAmt = Math.abs(amt);
      totalScrap += absAmt;
      const plant = row['Plant'] || 'Unknown';
      plantBreakdown[plant] = (plantBreakdown[plant] || 0) + absAmt;
      items.push({
        material_code: String(mat),
        material_description: row['Material Description'] || '',
        quantity: Number(row['Quantity']) || 0,
        uom: row['Base Unit of Measure'] || '',
        plant,
        storage_location: row['Storage Location'] || '',
        amount_lkr: Number(absAmt.toFixed(2)),
      });
    }
  });

  return {
    totalScrap: Number(totalScrap.toFixed(2)),
    rowCount: items.length,
    plantBreakdown,
    items,
  };
};

// 2. Parse Loss Matrix Excel file (e.g., Loss Matrix-September 2026 (2).xls)
// Extracts 'Total Quality Defects & Rework - G' and 'Total Measurement & Adjustment Loss R' (Waiting for QC)
export const parseLossMatrixExcel = async (file) => {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  // Prefer Sheet4 if available, otherwise search all sheets
  const targetSheetName = workbook.SheetNames.includes('Sheet4')
    ? 'Sheet4'
    : workbook.SheetNames[workbook.SheetNames.length - 1];
  const sheet = workbook.Sheets[targetSheetName];
  const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  let reworkGHours = 0;
  let waitingQcHours = 0;

  matrix.forEach((row) => {
    if (!Array.isArray(row)) return;
    const col0 = String(row[0] || '').toLowerCase();
    if (col0.includes('total quality defects & rework')) {
      const val = parseFloat(row[1]);
      if (!isNaN(val)) reworkGHours = val;
    }
    if (col0.includes('total measurement & adjustment loss r')) {
      const val = parseFloat(row[1]);
      if (!isNaN(val)) waitingQcHours = val;
    }
  });

  return {
    reworkGHours: Number(reworkGHours.toFixed(2)),
    waitingQcHours: Number(waitingQcHours.toFixed(2)),
    sheetUsed: targetSheetName,
  };
};

// 3. Parse Warranty Raw Report Excel file (e.g., Raw Report From 2026-09-01 To 2026-09-30 .xlsx)
export const parseWarrantyExcel = async (file, priceMasterList = []) => {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet);

  const priceMap = {};
  priceMasterList.forEach((p) => {
    priceMap[String(p.material_code).trim().toUpperCase()] = Number(p.unit_cost_lkr) || 0;
  });

  let totalWarrantyCost = 0;
  let totalValidUnits = 0;
  let unmatchedCodes = new Set();
  const items = [];

  rows.forEach((row) => {
    const fault = String(row['Fault Reason'] || '').trim();
    // Skip 'Good Bulb' non-defective entries if applicable
    if (fault.toLowerCase() === 'good bulb') return;

    const code = String(row['Code'] || '').trim();
    const recvQty = Number(row['Supplier Receive Qty']) || 0;
    const rejQty = Number(row['Rejected Qty']) || 0;
    const netWarrantyQty = Math.max(0, recvQty - rejQty);

    const unitCost = priceMap[code.toUpperCase()] || 0;
    if (code && unitCost === 0) {
      unmatchedCodes.add(code);
    }
    const lineCost = netWarrantyQty * unitCost;
    totalWarrantyCost += lineCost;
    totalValidUnits += netWarrantyQty;

    items.push({
      reference_no: String(row['Reference No'] || ''),
      category: String(row['Category'] || ''),
      distributor_name: String(row['Distributor Name'] || ''),
      material_code: code,
      material_name: String(row['Material Name'] || ''),
      fault_reason: fault,
      received_qty: recvQty,
      rejected_qty: rejQty,
      unit_cost_lkr: unitCost,
      total_cost_lkr: Number(lineCost.toFixed(2)),
    });
  });

  return {
    totalWarrantyCost: Number(totalWarrantyCost.toFixed(2)),
    totalValidUnits,
    rowCount: items.length,
    unmatchedCodes: Array.from(unmatchedCodes),
    items,
  };
};

// 4. Parse Price Master Excel / CSV
export const parsePriceMasterExcel = async (file) => {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet);

  return rows
    .map((r) => ({
      material_code: String(r['Code'] || r['Material'] || r['material_code'] || '').trim(),
      material_name: String(r['Material Name'] || r['Description'] || r['material_name'] || '').trim(),
      category: String(r['Category'] || r['category'] || 'General').trim(),
      unit_cost_lkr: Number(r['Unit Cost'] || r['Price'] || r['unit_cost_lkr'] || r['Cost'] || 0),
    }))
    .filter((item) => item.material_code !== '');
};

// 5. Export Summary Matrix to Excel (.xlsx) matching management report layout
export const exportCopqSummaryExcel = (records) => {
  const headers = ['Category / Metric (LKR)', ...records.map((r) => r.period_label)];

  const rows = [
    ['COPQ = External Failure Cost + Internal Failure Cost'],
    ['--- INTERNAL FAILURE COST ---'],
    ['Scrap', ...records.map((r) => Number(r.scrap_cost))],
    ['Rework/Reinspection/Retesting Cost', ...records.map((r) => Number(r.rework_total_cost))],
    ['Down time / Line Stoppage due to down time (Waiting for QC)', ...records.map((r) => Number(r.downtime_qc_cost))],
    ['Total Internal Cost', ...records.map((r) => Number(r.total_internal_cost))],
    ['--- EXTERNAL FAILURE COST ---'],
    ['Warranty Claims & Product returns', ...records.map((r) => Number(r.warranty_returns_cost))],
    ['Total External Failure Cost', ...records.map((r) => Number(r.total_external_cost))],
    ['COST OF POOR QUALITY (COPQ)', ...records.map((r) => Number(r.total_copq))],
  ];

  const wsData = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'COPQ Summary');
  XLSX.writeFile(wb, `COPQ_Management_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
};
