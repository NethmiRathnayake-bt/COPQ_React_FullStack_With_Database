# Cost of Poor Quality (COPQ) Calculation & Analytics Web Application

Full-stack **React + Vite + Tailwind CSS + Node.js (Express) + MySQL** web application built to automate monthly Cost of Poor Quality (COPQ) calculations, Excel report parsing, and executive trend visualization.

---

## 📁 Project Structure

```text
copq-dashboard-fullstack/
├── database/
│   └── copq_system.sql          # Complete MySQL schema + July 2025 - Sep 2026 seed data
├── backend/
│   ├── .env                     # Database connection configuration (XAMPP defaults)
│   ├── package.json
│   └── src/
│       ├── config/db.js         # MySQL connection pool
│       ├── routes/copqRoutes.js # REST API endpoints for records, rates & price master
│       └── server.js            # Express server entry point (Port 5000)
└── frontend/
    ├── package.json
    └── src/
        ├── components/
        │   ├── DashboardOverview.jsx  # KPIs, 5 Trend Charts & Horizontal COPQ Matrix
        │   ├── CopqCalculator.jsx     # Excel Auto-Parser (SCRP, Loss Matrix, Warranty)
        │   └── SettingsAndPrices.jsx  # Hourly Rates & Product Price Master Manager
        ├── utils/
        │   ├── excelParser.js         # SheetJS parsers & Excel report exporter
        │   └── seedData.js            # Verified historical dataset
        └── App.jsx
```

---

## 🚀 Quick Setup Guide (XAMPP + VS Code)

### Step 1: Import MySQL Database (XAMPP)
1. Start **Apache** and **MySQL** in your **XAMPP Control Panel**.
2. Open `http://localhost/phpmyadmin` in your browser.
3. Click **Import** (or **SQL** tab), select `database/copq_system.sql`, and click **Go**.
   - This creates the `copq_system` database with 5 tables and pre-loads your historical data (`July 2025` to `September 2026`).

### Step 2: Start the Node.js Backend API
Open a terminal in VS Code:
```bash
cd backend
npm install
npm start
```
The API will run on `http://localhost:5000` and connect to MySQL (`root` with empty password by default — edit `backend/.env` if your MySQL has a password).

### Step 3: Start the React Frontend
Open a second terminal in VS Code:
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser!

---

## 🧮 Calculation Logic Built into the App

1. **Total COPQ** = `Total Internal Failure Cost + Total External Failure Cost`
2. **Internal Failure Cost** = `Scrap Cost + Rework Cost + Line Stoppage (Waiting for QC) Cost`
   - **Scrap Cost**: Parsed directly from `SCRP [Month].xlsx` (`Amt.in Loc.Cur.`), automatically ignoring bottom `Total` / `Grand Total` rows so values are never triple-counted.
   - **Rework Cost**: `(Sum of 6 Section Rework Hours + Loss Matrix 'Quality Defects & Rework - G' Hours) × Rework Hourly Rate (LKR 903.91/Hr)`.
   - **Waiting for QC Cost**: `Loss Matrix 'Waiting for QC' Hours × QC Stoppage Hourly Rate (LKR 1,334.32/Hr)`.
3. **External Failure Cost**:
   - Parsed from `Raw Report.xlsx` (`(Supplier Receive Qty - Rejected Qty) × Material Unit Cost` from Price Master, excluding `Good Bulb` entries) or entered directly.
