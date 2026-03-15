# CrytiXSnare — Network Threat Analysis Platform

> A full-stack Security Information and Event Management (SIEM) tool demonstrating core SOC analyst workflows — from threat detection and alert triage to incident case management, reconnaissance, and automated response.

**Stack:** React · TypeScript · Supabase · Tailwind CSS · Recharts · shadcn/ui

---

## Features

| Module | What it does |
|---|---|
| **SIEM Dashboard** | Real-time KPIs — total alerts, critical alerts, active cases. Time-series and severity distribution charts |
| **Alerts** | Full alert lifecycle: triage, acknowledge, assign, resolve. Filterable by severity and status |
| **Case Management** | Link alerts into investigation cases. Track status, priority, analyst assignments |
| **URL Analysis** | Multi-source threat scoring — VirusTotal + AbuseIPDB integration |
| **Email Inspection** | Analyse headers for phishing — SPF/DKIM/DMARC authentication checks |
| **Network Monitoring** | Traffic volume charts, anomaly detection, suspicious flow identification |
| **Reconnaissance** | OSINT domain recon — WHOIS, DNS, subdomain enumeration, tech stack fingerprinting |
| **Threat Intelligence** | IOC database — IPs, domains, hashes with confidence scoring and source attribution |
| **File Analysis** | Static file analysis and hash reputation lookup |
| **Automated Response** | Rule-based SOAR playbooks: auto-block TOR nodes, quarantine attachments, isolate ransomware hosts |
| **Analytics & Reports** | Trend analysis and exportable reports |

---

## Running Locally

### Prerequisites
- [Node.js](https://nodejs.org/) v18+ (LTS recommended)
- npm (comes with Node.js)

### 1. Clone the repo
```bash
git clone https://github.com/YOUR_USERNAME/network-threat-watch.git
cd network-threat-watch
```

### 2. Install dependencies
```bash
npm install
```

### 3. Create your environment file
```bash
cp .env.local.example .env.local
```

The default config runs in **Demo Mode** — no database or external services needed.

### 4. Start the development server
```bash
npm run dev
```

Open **http://localhost:5173** — the app loads straight into the dashboard as `analyst@cryptixsnare.io`. No sign-up needed in demo mode.

---

## Connecting a Real Supabase Backend

1. Create a free project at [supabase.com](https://supabase.com)
2. Push the database schema:
   ```bash
   npx supabase db push
   ```
3. Deploy the edge functions:
   ```bash
   npx supabase functions deploy
   ```
4. Update `.env.local`:
   ```env
   VITE_DEMO_MODE=false
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

---

## Deploying to Vercel (Free — 5 minutes)

1. Push the repo to GitHub
2. Go to [vercel.com](https://vercel.com) → **New Project** → import your repo
3. Add one environment variable: `VITE_DEMO_MODE` = `true`
4. Click **Deploy**

Your live URL is ready in ~90 seconds.

---

## Architecture

```
src/
├── pages/           19 feature pages (Dashboard, Alerts, Cases, Recon, etc.)
├── components/      Charts, auth, layout, sidebar
├── services/        alertService, caseService, reconService, threatService
├── lib/
│   ├── mockData.ts  Realistic demo data (alerts, cases, IOCs, network traffic)
│   └── mockAuth.ts  Demo mode session bypass
└── integrations/
    └── supabase/    Client + generated TypeScript types

supabase/
├── functions/       11 Edge Functions (Deno) — recon, threat intel, ML phishing
└── migrations/      Full DB schema (11 migration files)
```

---

## Security Concepts Demonstrated

- **SIEM workflows** — alert ingestion, triage, escalation, closure
- **Incident Response** — case-based investigation linking alerts to root causes
- **OSINT / Recon** — passive domain recon (WHOIS, DNS, subdomains, tech stack)
- **Threat Intelligence** — IOC management with confidence scoring
- **Phishing Detection** — header authentication analysis (SPF/DKIM/DMARC) + ML scoring
- **Network Analysis** — traffic anomaly detection and PCAP upload
- **SOAR** — automated playbooks triggered by detection rules
- **CVE Awareness** — vulnerability lookup integrated into alert workflow

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite |
| UI | shadcn/ui, Tailwind CSS, Recharts |
| Backend (BaaS) | Supabase — PostgreSQL + Auth + Edge Functions (Deno) |
| Backend (API) | FastAPI (Python) — see `BACKEND_CODE.md` |
| Deployment | Vercel (frontend) · Supabase (backend) |

---

*Built as a cybersecurity portfolio project — demonstrating SOC analyst workflows and full-stack security tooling. Part of a journey from IT Helpdesk to Cybersecurity.*
