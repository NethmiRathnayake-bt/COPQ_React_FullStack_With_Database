-- ============================================================================
-- Cost of Poor Quality (COPQ) Management System - MySQL Database Schema & Seed
-- Compatible with XAMPP / MariaDB / MySQL 8.0+
-- ============================================================================

CREATE DATABASE IF NOT EXISTS copq_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE copq_system;

-- 1. System Rate Configuration Table
CREATE TABLE IF NOT EXISTS rate_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_label VARCHAR(255) NOT NULL,
    rate_value DECIMAL(15, 6) NOT NULL,
    unit VARCHAR(50) DEFAULT 'LKR/Hr',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO rate_settings (setting_key, setting_label, rate_value, unit) VALUES
('rework_hourly_rate', 'Rework / Reinspection / Retesting Hourly Rate', 903.906337, 'LKR/Hr'),
('qc_waiting_hourly_rate', 'Line Stoppage / Waiting for QC Hourly Rate', 1334.319390, 'LKR/Hr')
ON DUPLICATE KEY UPDATE rate_value = VALUES(rate_value);

-- 2. Product Price Master (For Warranty & External Returns Valuation)
CREATE TABLE IF NOT EXISTS product_price_master (
    id INT AUTO_INCREMENT PRIMARY KEY,
    material_code VARCHAR(100) NOT NULL UNIQUE,
    material_name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    unit_cost_lkr DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Sample Seed Prices from Raw Report
INSERT INTO product_price_master (material_code, material_name, category, unit_cost_lkr) VALUES
('XG1-075CM', 'GLS PIN TYPE 75W CLEAR BULB', 'Lighting', 145.00),
('724-1027', 'ECO LED Pin type 12.5W 6500K', 'Lighting', 420.00),
('722-1305', 'Orange DOB LED B22 03W 6500K', 'Lighting', 180.00),
('722-1311', 'Orange DOB LED B22 05W 6500K', 'Lighting', 210.00),
('722-1325', 'Orange DOB LED B22 12W 6500K', 'Lighting', 340.00),
('102-5021', 'ORANGE DOB LED B22 15W 6500K', 'Lighting', 450.00),
('102-5025', 'ORANGE DOB LED B22 18W 6500K', 'Lighting', 520.00)
ON DUPLICATE KEY UPDATE unit_cost_lkr = VALUES(unit_cost_lkr);

-- 3. Monthly COPQ Summary Records
CREATE TABLE IF NOT EXISTS monthly_copq_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    period_key VARCHAR(20) NOT NULL UNIQUE, -- e.g., '2026-09'
    period_label VARCHAR(50) NOT NULL,      -- e.g., 'September 2026'
    sort_order INT NOT NULL,
    
    -- Internal Failure Metrics
    scrap_cost DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    
    -- Rework Breakdown (Hours)
    ckd_rework_hrs DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    gangs_rework_hrs DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    pcel_rework_hrs DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    voltex_gangs_rework_hrs DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    voltex_socket_rework_hrs DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    socket_rework_hrs DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    loss_matrix_rework_g_hrs DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    rework_hourly_rate DECIMAL(15, 6) NOT NULL DEFAULT 903.906337,
    rework_total_cost DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    
    -- QC Downtime Breakdown
    qc_waiting_hrs DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    qc_hourly_rate DECIMAL(15, 6) NOT NULL DEFAULT 1334.319390,
    downtime_qc_cost DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    
    total_internal_cost DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    
    -- External Failure Metrics
    warranty_returns_cost DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    total_external_cost DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    
    -- Grand Total COPQ
    total_copq DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 4. Detailed Scrap Line Items per Month
CREATE TABLE IF NOT EXISTS scrap_line_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    period_key VARCHAR(20) NOT NULL,
    material_code VARCHAR(100),
    material_description VARCHAR(255),
    quantity DECIMAL(15, 3),
    uom VARCHAR(20),
    plant VARCHAR(50),
    storage_location VARCHAR(50),
    amount_lkr DECIMAL(18, 2) NOT NULL,
    FOREIGN KEY (period_key) REFERENCES monthly_copq_records(period_key) ON DELETE CASCADE
);

-- 5. Detailed Warranty Return Line Items per Month
CREATE TABLE IF NOT EXISTS warranty_return_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    period_key VARCHAR(20) NOT NULL,
    reference_no VARCHAR(100),
    category VARCHAR(100),
    distributor_name VARCHAR(255),
    material_code VARCHAR(100),
    material_name VARCHAR(255),
    fault_reason VARCHAR(255),
    received_qty INT DEFAULT 0,
    rejected_qty INT DEFAULT 0,
    unit_cost_lkr DECIMAL(15, 2) DEFAULT 0.00,
    total_cost_lkr DECIMAL(18, 2) DEFAULT 0.00,
    FOREIGN KEY (period_key) REFERENCES monthly_copq_records(period_key) ON DELETE CASCADE
);

-- Seed Historical Data (July 2025 - September 2026) matching actual company records
INSERT INTO monthly_copq_records (
    period_key, period_label, sort_order,
    scrap_cost,
    ckd_rework_hrs, gangs_rework_hrs, pcel_rework_hrs, voltex_gangs_rework_hrs, voltex_socket_rework_hrs, socket_rework_hrs, loss_matrix_rework_g_hrs,
    rework_hourly_rate, rework_total_cost,
    qc_waiting_hrs, qc_hourly_rate, downtime_qc_cost,
    total_internal_cost, warranty_returns_cost, total_external_cost, total_copq
) VALUES
('2025-07', 'July 2025', 1, 12049675.63, 0,0,0,0,0,0,0, 903.906337, 3936972.72, 0, 1334.319390, 33683815.56, 49670463.91, 24751979.00, 24751979.00, 74422442.91),
('2025-08', 'August 2025', 2, 6336043.56, 0,0,0,0,0,0,0, 903.906337, 4119342.04, 80.81, 1334.319390, 107830.22, 10563215.82, 22394468.70, 22394468.70, 32957684.51),
('2025-09', 'September 2025', 3, 6586741.91, 0,0,0,0,0,0,0, 903.906337, 4545580.53, 91.63, 1334.319390, 122262.90, 11254585.34, 16218383.93, 16218383.93, 27472969.27),
('2025-10', 'October 2025', 4, 12646852.62, 0,0,0,0,0,0,0, 903.906337, 4833622.17, 124.10, 1334.319390, 165583.01, 17646057.80, 11590128.70, 11590128.70, 29236186.50),
('2025-11', 'November 2025', 5, 5767490.20, 0,0,0,0,0,0,0, 903.906337, 3684638.78, 65.23, 1334.319390, 87043.06, 9539172.07, 13034332.92, 13034332.92, 22573504.98),
('2025-12', 'December 2025', 6, 12337843.50, 0,0,0,0,0,0,0, 903.906337, 5678131.34, 63.93, 1334.319390, 85301.76, 18101276.60, 13834023.88, 13834023.88, 31935300.49),
('2026-01', 'January 2026', 7, 4556016.96, 0,0,0,0,0,0,0, 903.906337, 3517135.67, 93.99, 1334.319390, 125415.31, 8198567.94, 18458978.77, 18458978.77, 26657546.71),
('2026-02', 'February 2026', 8, 10090742.73, 0,0,0,0,0,0,0, 903.906337, 1882389.83, 71.37, 1334.319390, 95237.13, 12068369.69, 11516668.85, 11516668.85, 23585038.53),
('2026-03', 'March 2026', 9, 9564865.31, 0,0,0,0,0,0,0, 903.906337, 3621414.49, 100.61, 1334.319390, 134247.75, 13320527.54, 16198050.48, 16198050.48, 29518578.02),
('2026-04', 'April 2026', 10, 4453796.12, 0,0,0,0,0,0,0, 903.906337, 1895082.27, 74.90, 1334.319390, 99938.13, 6448816.52, 5543842.36, 5543842.36, 11992658.88),
('2026-05', 'May 2026', 11, 1368259.30, 0,0,0,0,0,0,0, 903.906337, 2257719.78, 76.97, 1334.319390, 102706.42, 3728685.50, 7570244.18, 7570244.18, 11298929.68),
('2026-06', 'June 2026', 12, 14990386.17, 0,0,0,0,0,0,0, 903.906337, 3003600.71, 33.58, 1334.319390, 44804.16, 18038791.04, 13411777.33, 13411777.33, 31450568.37),
('2026-07', 'July 2026', 13, 10841924.71, 0,0,0,0,0,0,0, 903.906337, 1871736.00, 96.28, 1334.319390, 128465.43, 12842126.14, 16106790.74, 16106790.74, 28948916.88),
('2026-08', 'August 2026', 14, 9752037.57, 0,0,0,0,0,0,0, 903.906337, 3398422.44, 98.78, 1334.319390, 131797.80, 13282257.80, 13631526.52, 13631526.52, 26913784.32),
('2026-09', 'September 2026', 15, 4362304.63, 401.70, 49.50, 13.75, 1089.95, 1411.50, 31.75, 552.46, 903.906337, 3209418.88, 82.00, 1334.319390, 109414.19, 7681137.70, 8373846.09, 8373846.09, 16054983.79)
ON DUPLICATE KEY UPDATE
    scrap_cost = VALUES(scrap_cost),
    rework_total_cost = VALUES(rework_total_cost),
    downtime_qc_cost = VALUES(downtime_qc_cost),
    total_internal_cost = VALUES(total_internal_cost),
    warranty_returns_cost = VALUES(warranty_returns_cost),
    total_external_cost = VALUES(total_external_cost),
    total_copq = VALUES(total_copq);
