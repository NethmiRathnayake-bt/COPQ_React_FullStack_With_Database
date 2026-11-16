const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// GET all monthly COPQ records ordered chronologically
router.get('/records', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM monthly_copq_records ORDER BY sort_order ASC, period_key ASC');
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Error fetching COPQ records:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET rate settings
router.get('/rates', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM rate_settings');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// UPDATE rate settings
router.put('/rates', async (req, res) => {
  const { rework_hourly_rate, qc_waiting_hourly_rate } = req.body;
  try {
    if (rework_hourly_rate !== undefined) {
      await pool.query('UPDATE rate_settings SET rate_value = ? WHERE setting_key = "rework_hourly_rate"', [rework_hourly_rate]);
    }
    if (qc_waiting_hourly_rate !== undefined) {
      await pool.query('UPDATE rate_settings SET rate_value = ? WHERE setting_key = "qc_waiting_hourly_rate"', [qc_waiting_hourly_rate]);
    }
    res.json({ success: true, message: 'Rates updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET Product Price Master
router.get('/prices', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM product_price_master ORDER BY material_code ASC');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// UPSERT Product Prices (Bulk or Single)
router.post('/prices', async (req, res) => {
  const { items } = req.body; // Array of { material_code, material_name, category, unit_cost_lkr }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: 'No items provided' });
  }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (const item of items) {
      await conn.query(
        `INSERT INTO product_price_master (material_code, material_name, category, unit_cost_lkr)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE material_name = VALUES(material_name), category = VALUES(category), unit_cost_lkr = VALUES(unit_cost_lkr)`,
        [item.material_code, item.material_name || '', item.category || 'General', Number(item.unit_cost_lkr) || 0]
      );
    }
    await conn.commit();
    res.json({ success: true, message: `${items.length} price records saved.` });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ success: false, message: err.message });
  } finally {
    conn.release();
  }
});

// POST / UPSERT Monthly COPQ Calculation
router.post('/records', async (req, res) => {
  const {
    period_key,
    period_label,
    sort_order = 99,
    scrap_cost = 0,
    ckd_rework_hrs = 0,
    gangs_rework_hrs = 0,
    pcel_rework_hrs = 0,
    voltex_gangs_rework_hrs = 0,
    voltex_socket_rework_hrs = 0,
    socket_rework_hrs = 0,
    loss_matrix_rework_g_hrs = 0,
    rework_hourly_rate = 903.906337,
    qc_waiting_hrs = 0,
    qc_hourly_rate = 1334.319390,
    warranty_returns_cost = 0,
    scrap_items = [],
    warranty_items = []
  } = req.body;

  if (!period_key || !period_label) {
    return res.status(400).json({ success: false, message: 'Period key and label are required.' });
  }

  // Exact COPQ Calculation Formulas
  const totalReworkHrs =
    Number(ckd_rework_hrs) +
    Number(gangs_rework_hrs) +
    Number(pcel_rework_hrs) +
    Number(voltex_gangs_rework_hrs) +
    Number(voltex_socket_rework_hrs) +
    Number(socket_rework_hrs) +
    Number(loss_matrix_rework_g_hrs);

  const rework_total_cost = Number((totalReworkHrs * Number(rework_hourly_rate)).toFixed(2));
  const downtime_qc_cost = Number((Number(qc_waiting_hrs) * Number(qc_hourly_rate)).toFixed(2));
  const total_internal_cost = Number((Number(scrap_cost) + rework_total_cost + downtime_qc_cost).toFixed(2));
  const total_external_cost = Number(Number(warranty_returns_cost).toFixed(2));
  const total_copq = Number((total_internal_cost + total_external_cost).toFixed(2));

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.query(
      `INSERT INTO monthly_copq_records (
        period_key, period_label, sort_order,
        scrap_cost,
        ckd_rework_hrs, gangs_rework_hrs, pcel_rework_hrs,
        voltex_gangs_rework_hrs, voltex_socket_rework_hrs, socket_rework_hrs, loss_matrix_rework_g_hrs,
        rework_hourly_rate, rework_total_cost,
        qc_waiting_hrs, qc_hourly_rate, downtime_qc_cost,
        total_internal_cost, warranty_returns_cost, total_external_cost, total_copq
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        period_label = VALUES(period_label),
        scrap_cost = VALUES(scrap_cost),
        ckd_rework_hrs = VALUES(ckd_rework_hrs),
        gangs_rework_hrs = VALUES(gangs_rework_hrs),
        pcel_rework_hrs = VALUES(pcel_rework_hrs),
        voltex_gangs_rework_hrs = VALUES(voltex_gangs_rework_hrs),
        voltex_socket_rework_hrs = VALUES(voltex_socket_rework_hrs),
        socket_rework_hrs = VALUES(socket_rework_hrs),
        loss_matrix_rework_g_hrs = VALUES(loss_matrix_rework_g_hrs),
        rework_hourly_rate = VALUES(rework_hourly_rate),
        rework_total_cost = VALUES(rework_total_cost),
        qc_waiting_hrs = VALUES(qc_waiting_hrs),
        qc_hourly_rate = VALUES(qc_hourly_rate),
        downtime_qc_cost = VALUES(downtime_qc_cost),
        total_internal_cost = VALUES(total_internal_cost),
        warranty_returns_cost = VALUES(warranty_returns_cost),
        total_external_cost = VALUES(total_external_cost),
        total_copq = VALUES(total_copq)`,
      [
        period_key, period_label, sort_order,
        Number(scrap_cost),
        Number(ckd_rework_hrs), Number(gangs_rework_hrs), Number(pcel_rework_hrs),
        Number(voltex_gangs_rework_hrs), Number(voltex_socket_rework_hrs), Number(socket_rework_hrs), Number(loss_matrix_rework_g_hrs),
        Number(rework_hourly_rate), rework_total_cost,
        Number(qc_waiting_hrs), Number(qc_hourly_rate), downtime_qc_cost,
        total_internal_cost, total_external_cost, total_copq
      ]
    );

    if (Array.isArray(scrap_items) && scrap_items.length > 0) {
      await conn.query('DELETE FROM scrap_line_items WHERE period_key = ?', [period_key]);
      for (const s of scrap_items) {
        await conn.query(
          `INSERT INTO scrap_line_items (period_key, material_code, material_description, quantity, uom, plant, storage_location, amount_lkr)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [period_key, s.material_code || '', s.material_description || '', s.quantity || 0, s.uom || '', s.plant || '', s.storage_location || '', s.amount_lkr || 0]
        );
      }
    }

    if (Array.isArray(warranty_items) && warranty_items.length > 0) {
      await conn.query('DELETE FROM warranty_return_items WHERE period_key = ?', [period_key]);
      for (const w of warranty_items) {
        await conn.query(
          `INSERT INTO warranty_return_items (period_key, reference_no, category, distributor_name, material_code, material_name, fault_reason, received_qty, rejected_qty, unit_cost_lkr, total_cost_lkr)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [period_key, w.reference_no || '', w.category || '', w.distributor_name || '', w.material_code || '', w.material_name || '', w.fault_reason || '', w.received_qty || 0, w.rejected_qty || 0, w.unit_cost_lkr || 0, w.total_cost_lkr || 0]
        );
      }
    }

    await conn.commit();
    res.json({
      success: true,
      message: `COPQ record for ${period_label} saved successfully!`,
      computed: {
        totalReworkHrs,
        rework_total_cost,
        downtime_qc_cost,
        total_internal_cost,
        total_external_cost,
        total_copq
      }
    });
  } catch (err) {
    await conn.rollback();
    console.error('Error saving COPQ record:', err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    conn.release();
  }
});

// DELETE a monthly record
router.delete('/records/:period_key', async (req, res) => {
  try {
    await pool.query('DELETE FROM monthly_copq_records WHERE period_key = ?', [req.params.period_key]);
    res.json({ success: true, message: 'Record deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
