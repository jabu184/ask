# Ask by urspace.com (Free Survey Engine)

A privacy-focused, modern, lightweight, free survey platform by urspace.com. Built with Node.js, Express, SQLite (WAL mode), React (Vite SPA), Tailwind CSS, and Chart.js.

## 🚀 Highlights & Features

- **Creator Authentication:** Email + password accounts secured via `bcryptjs` and HTTP-only JWT cookies + Bearer token authorization.
- **Creator Dashboard:** Survey list with submission counters, active/closed status badges, one-click live toggle, and quick-copy links.
- **Survey Builder:** Reorderable questions with 8+ question types:
  - **Multiple Choice:** Single selection option pills with dynamic add/remove.
  - **Checkboxes:** Multi-selection checkboxes.
  - **Single Text Box:** Single-line text input for short answers.
  - **Comment Box:** Multi-line text feedback.
  - **Star Rating (1–5 Stars):** Visual interactive 5-star rating widget.
  - **Slider (1–100):** Interactive range slider with dynamic numeric badge.
  - **Ranking (Ordering):** Drag-and-drop / arrow-based priority ordering.
  - **True / False & 1–10 Scale:** Built-in binary and 10-point scales.
  - Optional vs. Required question enforcement.
- **Public Survey View:** Mobile-first, distraction-free interface at `/s/:surveyId`.
  - Atomic submissions using SQLite transactions.
  - Strictly anonymous responses.
  - Clean "Survey Closed" state when toggled inactive.
- **Analytics & Export Engine:**
  - Real-time Chart.js graphs and aggregated distributions.
  - **Individual Response Inspection:** View responses one-by-one, table view with date/time of submission, edit answers, and delete responses.
  - One-click tabular exports to **CSV** (`json2csv`) and **Excel (.xlsx)** (`xlsx`).
  - One-click tabular exports to **CSV** (`json2csv`) and **Excel (.xlsx)** (`xlsx`).
- **Production Containerization:**
  - Multi-stage Docker container serving client and API on port 3000 mapped to host port **3003**.
  - Persistent SQLite volume at `./data:/app/data` (`surveys.db`).

---

## 📁 Project Structure

```
survey/
├── client/                     # React (Vite) + Tailwind CSS + Chart.js
│   ├── src/
│   │   ├── components/         # Navbar, ProtectedRoute, etc.
│   │   ├── context/            # AuthContext
│   │   ├── pages/              # Login, Register, Dashboard, Builder, PublicSurvey, Analytics
│   │   └── services/           # Axios API client
├── server/                     # Express.js + better-sqlite3 + Export Engine
│   ├── src/
│   │   ├── config/             # SQLite WAL configuration & schema migrations
│   │   ├── middleware/         # JWT authentication
│   │   ├── routes/             # Auth, Surveys, Public, and Export routes
│   │   └── index.js            # Express entrypoint & static client serving
├── Dockerfile                  # Multi-stage production container build
├── docker-compose.yml          # Container service mapping (3003:3000, ./data:/app/data)
├── deploy-oracle.sh            # Oracle Linux VM deployment script with iptables rule
├── deploy-remote.ps1           # Windows PowerShell packaging & deployment runner
└── README.md
```

---

## 🚢 Deployment to Oracle Cloud Linux VM

### Option A: One-Command Remote Deploy (from Windows)
From your local Windows terminal, run:
```powershell
.\deploy-remote.ps1 -RemoteHost "<YOUR_ORACLE_VM_IP>" -RemoteUser "ubuntu"
```
*Note: The script automatically detects your downloaded key `C:\Users\vboxuser\Downloads\ssh-key-2026-08-29.key` if available.*

This script:
1. Bundles the application into `surveylite-standalone.tar.gz` (excluding `node_modules` and `.git`).
2. Transfers the bundle to `~/surveylite` on the VM via `scp`.
3. Invokes `deploy-oracle.sh` over SSH.

### Option B: Manual VM Deployment
On your Oracle VM:
```bash
# 1. Clone or extract into ~/surveylite
cd ~/surveylite

# 2. Run the deployment script
chmod +x deploy-oracle.sh
./deploy-oracle.sh
```

The script automatically:
- Creates persistent directory `./data` with appropriate permissions.
- Opens host port `3003` via `iptables` and saves rule persistence.
- Builds and runs the container via `docker compose up -d --build`.

---

## 💻 Local Development

### 1. Server
```bash
cd server
npm install
npm run dev
```
Server runs at `http://localhost:3000`.

### 2. Client
```bash
cd client
npm install
npm run dev
```
Client runs at `http://localhost:5173` and proxies `/api` to `http://localhost:3000`.
