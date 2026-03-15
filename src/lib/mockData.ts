// ============================================================
//  MOCK DATA LAYER — replaces all Supabase calls for demo/dev
//  All data is realistic and cybersecurity-domain accurate
// ============================================================

import { Alert } from "@/services/alertService";
import { Case } from "@/services/caseService";

// ── Helpers ──────────────────────────────────────────────────
const daysAgo = (n: number) =>
  new Date(Date.now() - n * 86_400_000).toISOString();
const hoursAgo = (n: number) =>
  new Date(Date.now() - n * 3_600_000).toISOString();
const minsAgo = (n: number) =>
  new Date(Date.now() - n * 60_000).toISOString();

// ── Alerts ───────────────────────────────────────────────────
export const mockAlerts: Alert[] = [
  {
    id: "a1",
    source: "IDS/IPS",
    type: "Port Scan Detected",
    severity: "critical",
    status: "open",
    assigned_to: null,
    metadata: { src_ip: "185.220.101.47", dst_ip: "10.0.1.15", ports_scanned: 1024 },
    created_at: minsAgo(12),
    updated_at: minsAgo(12),
  },
  {
    id: "a2",
    source: "Email Gateway",
    type: "Phishing Attempt",
    severity: "high",
    status: "acknowledged",
    assigned_to: "analyst@cryptixsnare.io",
    metadata: { sender: "ceo-spoofed@malicious.ru", subject: "Urgent wire transfer needed" },
    created_at: hoursAgo(2),
    updated_at: hoursAgo(1),
  },
  {
    id: "a3",
    source: "EDR",
    type: "Ransomware Behaviour",
    severity: "critical",
    status: "in_progress",
    assigned_to: "analyst@cryptixsnare.io",
    metadata: { host: "DESKTOP-HR03", process: "svchost.exe", files_encrypted: 43 },
    created_at: hoursAgo(3),
    updated_at: hoursAgo(2),
  },
  {
    id: "a4",
    source: "SIEM",
    type: "Brute Force Login",
    severity: "high",
    status: "open",
    assigned_to: null,
    metadata: { src_ip: "91.234.55.12", target: "vpn.corpnet.local", attempts: 847 },
    created_at: hoursAgo(4),
    updated_at: hoursAgo(4),
  },
  {
    id: "a5",
    source: "Firewall",
    type: "Outbound C2 Traffic",
    severity: "critical",
    status: "open",
    assigned_to: null,
    metadata: { src_ip: "10.0.2.88", dst_ip: "94.102.49.190", protocol: "HTTPS", bytes: 2400000 },
    created_at: hoursAgo(5),
    updated_at: hoursAgo(5),
  },
  {
    id: "a6",
    source: "Web Proxy",
    type: "Malicious URL Access",
    severity: "medium",
    status: "resolved",
    assigned_to: "analyst@cryptixsnare.io",
    metadata: { user: "jmwangi", url: "http://dl.trojan-dl.cc/payload.exe" },
    created_at: daysAgo(1),
    updated_at: hoursAgo(6),
  },
  {
    id: "a7",
    source: "DLP",
    type: "Sensitive Data Exfiltration",
    severity: "high",
    status: "acknowledged",
    assigned_to: null,
    metadata: { user: "contractor_05", files: ["payroll_2025.xlsx", "board_minutes.pdf"], dst: "personal_dropbox" },
    created_at: daysAgo(1),
    updated_at: daysAgo(1),
  },
  {
    id: "a8",
    source: "Network Monitor",
    type: "Lateral Movement",
    severity: "high",
    status: "in_progress",
    assigned_to: "analyst@cryptixsnare.io",
    metadata: { src_host: "DESKTOP-HR03", dst_hosts: ["FILESERVER-01", "DC-01"], protocol: "SMB" },
    created_at: daysAgo(2),
    updated_at: daysAgo(1),
  },
  {
    id: "a9",
    source: "Vulnerability Scanner",
    type: "Critical CVE Detected",
    severity: "high",
    status: "open",
    assigned_to: null,
    metadata: { cve: "CVE-2024-21413", asset: "MAILSERVER-02", cvss: 9.8 },
    created_at: daysAgo(2),
    updated_at: daysAgo(2),
  },
  {
    id: "a10",
    source: "IDS/IPS",
    type: "SQL Injection Attempt",
    severity: "medium",
    status: "closed",
    assigned_to: "analyst@cryptixsnare.io",
    metadata: { src_ip: "103.21.244.0", target: "api.corpnet.local/login", payload: "' OR 1=1--" },
    created_at: daysAgo(3),
    updated_at: daysAgo(2),
  },
  {
    id: "a11",
    source: "SIEM",
    type: "Impossible Travel",
    severity: "medium",
    status: "open",
    assigned_to: null,
    metadata: { user: "aoko", login1_location: "Nairobi, KE", login2_location: "Moscow, RU", gap_minutes: 30 },
    created_at: daysAgo(3),
    updated_at: daysAgo(3),
  },
  {
    id: "a12",
    source: "Email Gateway",
    type: "Malicious Attachment",
    severity: "low",
    status: "resolved",
    assigned_to: null,
    metadata: { file: "invoice_march.doc", sha256: "a1b2c3d4e5f6...", quarantined: true },
    created_at: daysAgo(4),
    updated_at: daysAgo(3),
  },
];

// ── Cases ────────────────────────────────────────────────────
export const mockCases: Case[] = [
  {
    id: "c1",
    title: "Ransomware Infection — HR Department",
    description: "EDR flagged ransomware-like behaviour on DESKTOP-HR03. 43 files encrypted before containment. Investigating patient-zero and lateral spread to FILESERVER-01.",
    status: "in_progress",
    priority: "critical",
    created_by: "analyst@cryptixsnare.io",
    assigned_to: "analyst@cryptixsnare.io",
    created_at: hoursAgo(3),
    updated_at: hoursAgo(1),
  },
  {
    id: "c2",
    title: "C2 Beacon — Finance Workstation",
    description: "Sustained outbound HTTPS traffic to known C2 IP 94.102.49.190. Host 10.0.2.88 may be compromised. Memory dump requested.",
    status: "open",
    priority: "critical",
    created_by: "analyst@cryptixsnare.io",
    assigned_to: null,
    created_at: hoursAgo(5),
    updated_at: hoursAgo(5),
  },
  {
    id: "c3",
    title: "VPN Brute Force Campaign",
    description: "847 failed login attempts against vpn.corpnet.local from IP 91.234.55.12 over 30 minutes. IP blocked at perimeter; reviewing for successful auth.",
    status: "open",
    priority: "high",
    created_by: "analyst@cryptixsnare.io",
    assigned_to: null,
    created_at: hoursAgo(4),
    updated_at: hoursAgo(4),
  },
  {
    id: "c4",
    title: "Insider Threat — Contractor Data Exfil",
    description: "Contractor account uploaded payroll and board minutes to personal cloud storage. HR notified. Legal hold placed on account.",
    status: "in_progress",
    priority: "high",
    created_by: "analyst@cryptixsnare.io",
    assigned_to: "analyst@cryptixsnare.io",
    created_at: daysAgo(1),
    updated_at: hoursAgo(8),
  },
  {
    id: "c5",
    title: "Critical CVE on Mail Server",
    description: "CVE-2024-21413 (CVSS 9.8) detected on MAILSERVER-02. Patch pending change-control approval. Temporary WAF rule deployed.",
    status: "open",
    priority: "high",
    created_by: "analyst@cryptixsnare.io",
    assigned_to: null,
    created_at: daysAgo(2),
    updated_at: daysAgo(2),
  },
  {
    id: "c6",
    title: "Phishing Campaign Targeting Finance",
    description: "3 finance staff received spoofed CEO email requesting wire transfer. No successful transfers. Staff interviewed. Awareness training scheduled.",
    status: "resolved",
    priority: "medium",
    created_by: "analyst@cryptixsnare.io",
    assigned_to: "analyst@cryptixsnare.io",
    created_at: daysAgo(3),
    updated_at: daysAgo(1),
  },
  {
    id: "c7",
    title: "SQL Injection Probe on Login API",
    description: "Multiple SQL injection payloads detected from 103.21.244.0 against /login endpoint. No successful extraction. IP blocked, WAF rule updated.",
    status: "closed",
    priority: "medium",
    created_by: "analyst@cryptixsnare.io",
    assigned_to: "analyst@cryptixsnare.io",
    created_at: daysAgo(4),
    updated_at: daysAgo(2),
  },
];

// ── Dashboard Metrics ─────────────────────────────────────────
export const mockDashboardMetrics = {
  kpis: {
    totalAlerts: mockAlerts.length,
    criticalAlerts: mockAlerts.filter(a => a.severity === "critical" && a.status === "open").length,
    activeCases: mockCases.filter(c => c.status === "open" || c.status === "in_progress").length,
    totalCases: mockCases.length,
  },
  alertsTimeSeries: [
    { date: daysAgo(6).slice(0,10), total: 8,  critical: 1, high: 3, medium: 3, low: 1 },
    { date: daysAgo(5).slice(0,10), total: 12, critical: 2, high: 4, medium: 4, low: 2 },
    { date: daysAgo(4).slice(0,10), total: 7,  critical: 1, high: 2, medium: 3, low: 1 },
    { date: daysAgo(3).slice(0,10), total: 15, critical: 3, high: 5, medium: 5, low: 2 },
    { date: daysAgo(2).slice(0,10), total: 10, critical: 2, high: 3, medium: 4, low: 1 },
    { date: daysAgo(1).slice(0,10), total: 18, critical: 4, high: 6, medium: 6, low: 2 },
    { date: new Date().toISOString().slice(0,10), total: 12, critical: 3, high: 4, medium: 3, low: 2 },
  ],
  severityDistribution: {
    critical: mockAlerts.filter(a => a.severity === "critical").length,
    high: mockAlerts.filter(a => a.severity === "high").length,
    medium: mockAlerts.filter(a => a.severity === "medium").length,
    low: mockAlerts.filter(a => a.severity === "low").length,
  },
  caseStatusDistribution: {
    open: mockCases.filter(c => c.status === "open").length,
    in_progress: mockCases.filter(c => c.status === "in_progress").length,
    resolved: mockCases.filter(c => c.status === "resolved").length,
    closed: mockCases.filter(c => c.status === "closed").length,
  },
  casePriorityDistribution: {
    critical: mockCases.filter(c => c.priority === "critical").length,
    high: mockCases.filter(c => c.priority === "high").length,
    medium: mockCases.filter(c => c.priority === "medium").length,
    low: mockCases.filter(c => c.priority === "low").length,
  },
  caseTrends: [
    { date: daysAgo(6).slice(0,10), open: 2, closed: 1, resolved: 0 },
    { date: daysAgo(5).slice(0,10), open: 3, closed: 1, resolved: 1 },
    { date: daysAgo(4).slice(0,10), open: 2, closed: 2, resolved: 1 },
    { date: daysAgo(3).slice(0,10), open: 4, closed: 1, resolved: 2 },
    { date: daysAgo(2).slice(0,10), open: 3, closed: 2, resolved: 1 },
    { date: daysAgo(1).slice(0,10), open: 5, closed: 1, resolved: 2 },
    { date: new Date().toISOString().slice(0,10), open: 4, closed: 0, resolved: 1 },
  ],
};

// ── Threat Intelligence ───────────────────────────────────────
export const mockThreatIntel = [
  { id: "ti1", indicator_value: "185.220.101.47",  indicator_type: "ip",     threat_type: "TOR Exit Node",        confidence_score: 95, source: "AlienVault OTX",  first_seen: daysAgo(30), last_seen: hoursAgo(2),  created_at: daysAgo(30), metadata: { asn: "AS4134", country: "DE" } },
  { id: "ti2", indicator_value: "94.102.49.190",   indicator_type: "ip",     threat_type: "C2 Server",            confidence_score: 98, source: "Abuse.ch",        first_seen: daysAgo(14), last_seen: minsAgo(30),  created_at: daysAgo(14), metadata: { malware_family: "CobaltStrike" } },
  { id: "ti3", indicator_value: "malicious.ru",    indicator_type: "domain", threat_type: "Phishing Domain",      confidence_score: 87, source: "PhishTank",       first_seen: daysAgo(7),  last_seen: hoursAgo(4),  created_at: daysAgo(7),  metadata: { registrar: "NameCheap" } },
  { id: "ti4", indicator_value: "trojan-dl.cc",   indicator_type: "domain", threat_type: "Malware Distribution", confidence_score: 99, source: "VirusTotal",      first_seen: daysAgo(60), last_seen: hoursAgo(1),  created_at: daysAgo(60), metadata: { hosted_malware: ["Emotet", "Qakbot"] } },
  { id: "ti5", indicator_value: "a1b2c3d4e5f67890abcdef1234567890", indicator_type: "hash", threat_type: "Ransomware Payload", confidence_score: 100, source: "VirusTotal", first_seen: daysAgo(5), last_seen: hoursAgo(3), created_at: daysAgo(5), metadata: { family: "LockBit 3.0" } },
  { id: "ti6", indicator_value: "91.234.55.12",   indicator_type: "ip",     threat_type: "Brute Force Bot",      confidence_score: 82, source: "AbuseIPDB",       first_seen: daysAgo(3),  last_seen: hoursAgo(4),  created_at: daysAgo(3),  metadata: { reports: 312, country: "RU" } },
  { id: "ti7", indicator_value: "103.21.244.0",   indicator_type: "ip",     threat_type: "SQL Injection Bot",    confidence_score: 76, source: "AlienVault OTX",  first_seen: daysAgo(10), last_seen: daysAgo(3),   created_at: daysAgo(10), metadata: { country: "CN", asn: "AS4134" } },
  { id: "ti8", indicator_value: "invoice_march.doc", indicator_type: "filename", threat_type: "Maldoc Lure",    confidence_score: 71, source: "Internal SOC",    first_seen: daysAgo(4),  last_seen: daysAgo(4),   created_at: daysAgo(4),  metadata: { macro_detected: true } },
];

// ── Recon Results — REAL data from your Supabase backup ──────
export const mockReconResults = [
  {
    id: "330a8342-e273-4994-8962-267df1de56c1",
    target_domain: "ku.ac.ke",
    recon_type: "whois",
    status: "completed",
    results: { error: "WHOIS lookup failed", message: "Free tier API limit reached" },
    created_at: "2025-08-21T12:02:44.559298+00",
    error_message: null,
  },
  {
    id: "6b25db9d-cd07-4d10-b364-eef442afffa2",
    target_domain: "ku.ac.ke",
    recon_type: "dns",
    status: "completed",
    results: {
      domain: "ku.ac.ke",
      records: {
        A:   [{ ttl: 10800, data: "41.89.10.16",             name: "ku.ac.ke." }],
        MX:  [{ ttl: 300,   data: "1 aspmx.l.google.com.",   name: "ku.ac.ke." },
              { ttl: 300,   data: "5 alt1.aspmx.l.google.com.", name: "ku.ac.ke." },
              { ttl: 300,   data: "5 alt2.aspmx.l.google.com.", name: "ku.ac.ke." }],
        NS:  [{ ttl: 21600, data: "ns1.kenet.or.ke.",        name: "ku.ac.ke." },
              { ttl: 21600, data: "ns2.kenet.or.ke.",        name: "ku.ac.ke." }],
        TXT: [{ ttl: 3600,  data: "v=spf1 include:_spf.google.com ~all", name: "ku.ac.ke." }],
      },
      timestamp: "2025-08-21T12:02:45.417Z",
    },
    created_at: "2025-08-21T12:02:45.546833+00",
    error_message: null,
  },
  {
    id: "7a7faf49-57df-4f75-be07-b240538542bf",
    target_domain: "ku.ac.ke",
    recon_type: "subdomains",
    status: "completed",
    results: {
      count: 187,
      domain: "ku.ac.ke",
      subdomains: [
        "aau.ku.ac.ke","accommodation.ku.ac.ke","actil.ku.ac.ke","aea.ku.ac.ke",
        "agriculture.ku.ac.ke","alumni.ku.ac.ke","applications.ku.ac.ke","apply.online.ku.ac.ke",
        "architecture.ku.ac.ke","business.ku.ac.ke","career.ku.ac.ke","cisco.ku.ac.ke",
        "cit.ku.ac.ke","e-learning.ku.ac.ke","economics.ku.ac.ke","education.ku.ac.ke",
        "engineering.ku.ac.ke","environmental.ku.ac.ke","graduates.ku.ac.ke","ict.ku.ac.ke",
        "international.ku.ac.ke","law.ku.ac.ke","mail.ku.ac.ke","medicine.ku.ac.ke",
        "nursing.ku.ac.ke","online.ku.ac.ke","pharmacy.ku.ac.ke","publichealth.ku.ac.ke",
        "radio.ku.ac.ke","repository.ku.ac.ke","research.ku.ac.ke","security.ku.ac.ke",
        "sports.ku.ac.ke","students.ku.ac.ke","wazuh.ku.ac.ke",
      ],
      certificates_found: 671,
    },
    created_at: "2025-08-21T12:02:51.559599+00",
    error_message: null,
  },
  {
    id: "7cb10870-fcdd-40df-a376-02dfae5cbd07",
    target_domain: "ku.ac.ke",
    recon_type: "emails",
    status: "completed",
    results: {
      domain: "ku.ac.ke",
      organization: "Kenyatta University",
      meta: { results: 424, limit: 10, offset: 0 },
      emails: [
        { value: "githu.george@ku.ac.ke",    position: "Chief Internal Auditor",        confidence: 99 },
        { value: "njenga.daniel@ku.ac.ke",   position: "Director of Sports",            confidence: 99 },
        { value: "muturi.margaret@ku.ac.ke", position: "Director of Career Development", confidence: 99 },
        { value: "kobia.patrick@ku.ac.ke",   position: "Director of Hospitality Services", confidence: 99 },
        { value: "mwathi.edwin@ku.ac.ke",    position: "Director of Clinical Services",  confidence: 99 },
      ],
    },
    created_at: "2025-08-21T12:02:52.584012+00",
    error_message: null,
  },
  {
    id: "c7022e4e-72bf-4734-8372-0b9f5570343a",
    target_domain: "ku.ac.ke",
    recon_type: "shodan",
    status: "error",
    results: {},
    created_at: "2025-08-21T12:02:53.040923+00",
    error_message: "Shodan lookup failed: Requires membership or higher to access",
  },
  {
    id: "4c33d46f-f767-4719-9117-663f912d786f",
    target_domain: "vercel.com",
    recon_type: "techstack",
    status: "completed",
    results: {
      url: "https://vercel.com/new",
      title: "New Project",
      status_code: 200,
      technologies: [
        { name: "Server",           value: "Vercel",           confidence: 100 },
        { name: "Framework",        value: "Next.js",          confidence: 90  },
        { name: "React",            value: "Detected",         confidence: 85  },
        { name: "Google Analytics", value: "Detected",         confidence: 95  },
      ],
      headers: { server: "Vercel", "x-powered-by": "Next.js", "x-frame-options": "DENY" },
    },
    created_at: "2025-10-09T10:24:51.786445+00",
    error_message: null,
  },
];

// ── Network Traffic ───────────────────────────────────────────
export const mockNetworkTraffic = Array.from({ length: 24 }, (_, i) => ({
  hour: `${String(i).padStart(2,"0")}:00`,
  normal: Math.floor(Math.random() * 800 + 200),
  suspicious: Math.floor(Math.random() * 80 + (i >= 2 && i <= 4 ? 120 : 5)),
  blocked: Math.floor(Math.random() * 30 + 2),
}));

// ── Automated Response Rules ──────────────────────────────────
export const mockResponseRules = [
  { id: "rr1", name: "Auto-block TOR Exit Nodes", trigger: "TOR IP detected", action: "Block IP at perimeter firewall", enabled: true, last_triggered: hoursAgo(2), executions: 14 },
  { id: "rr2", name: "Quarantine Malware Attachment", trigger: "Malicious attachment in email", action: "Quarantine email + notify user", enabled: true, last_triggered: daysAgo(1), executions: 7 },
  { id: "rr3", name: "Isolate Ransomware Host", trigger: "Ransomware behaviour detected", action: "Isolate host from network via EDR", enabled: true, last_triggered: hoursAgo(3), executions: 2 },
  { id: "rr4", name: "Lock Brute-forced Account", trigger: ">10 failed logins in 5 min", action: "Disable AD account + alert manager", enabled: false, last_triggered: daysAgo(5), executions: 31 },
  { id: "rr5", name: "Enrich C2 Alert with OSINT", trigger: "Outbound C2 traffic detected", action: "Auto-query VirusTotal + AbuseIPDB", enabled: true, last_triggered: hoursAgo(5), executions: 9 },
];

// ── Threat Alerts — REAL data from your Supabase backup ──────
export const mockThreatAlerts = [
  { id: "8971e132", type: "network",  severity: "high",     status: "open",          title: "DDoS Attack Detected",        description: "Unusual traffic spike from multiple sources targeting our infrastructure", source_ip: "192.168.1.105", source_domain: null,                          created_at: "2025-08-20T08:53:42Z" },
  { id: "1a3c4380", type: "url",      severity: "critical", status: "investigating", title: "Malicious URL Detected",       description: "Known phishing domain attempting to steal credentials",                 source_ip: null,             source_domain: "phishing-site.malicious.com", created_at: "2025-08-20T06:53:42Z" },
  { id: "f0a2ac70", type: "email",    severity: "medium",   status: "open",          title: "Suspicious Email Activity",   description: "Email containing suspicious attachment detected",                       source_ip: null,             source_domain: "suspicious-sender.com",       created_at: "2025-08-20T08:23:42Z" },
  { id: "c0b3ebcc", type: "network",  severity: "high",     status: "resolved",      title: "Port Scan Attempt",            description: "Sequential port scanning activity detected and blocked",                source_ip: "10.0.0.45",      source_domain: null,                          created_at: "2025-08-20T04:53:42Z" },
  { id: "73d8f9c4", type: "url",      severity: "low",      status: "false_positive", title: "Low Risk Domain",             description: "Domain flagged by automated system but verified as safe",                source_ip: null,             source_domain: "legitimate-site.com",         created_at: "2025-08-20T02:53:42Z" },
  { id: "fa140c2f", type: "network",  severity: "medium",   status: "open",          title: "DNS Anomaly",                  description: "Suspicious DNS queries detected from internal network",                  source_ip: "172.16.0.22",    source_domain: null,                          created_at: "2025-08-20T07:53:42Z" },
];

// ── Scan Results — REAL data from your Supabase backup ───────
export const mockScanResults = [
  { id: "48b305c4", type: "url",   target: "https://gateremark.me/",                   status: "pending", score: null, created_at: "2025-07-11T13:30:37Z" },
  { id: "78312364", type: "url",   target: "https://malicious-domain.com/fake-login",  status: "pending", score: null, created_at: "2025-07-19T11:12:48Z" },
  { id: "16efbd10", type: "url",   target: "https://www.google.com",                   status: "pending", score: null, created_at: "2025-07-19T11:15:20Z" },
  { id: "7c62d91b", type: "email", target: "Email analysis - 2025-07-11",              status: "pending", score: null, created_at: "2025-07-10T18:33:45Z" },
];

// ── System Settings — REAL data from your Supabase backup ────
export const mockSystemSettings = {
  retention_policy_days: 90,
  alert_thresholds: { low: 0.3, medium: 0.6, high: 0.8, critical: 0.9 },
  email_notifications: { enabled: true, recipients: [] },
  auto_quarantine: { enabled: false, threshold: 0.9 },
};
export const mockUrlScanResult = {
  url: "http://dl.trojan-dl.cc/payload.exe",
  score: 97,
  verdict: "malicious" as const,
  sources: { virustotal: { detections: "68/72 engines" }, abuseipdb: { reports: 441 } },
  checks: { domain_reputation: false, ssl_certificate: false, url_structure: false, blacklist_check: false, phishing_keywords: true },
  details: { domain_age: 12, ssl_issuer: null, redirect_count: 2, suspicious_patterns: ["executable download", "no-SSL", "known C2 domain"], ip_address: "94.102.49.190", location: "Moscow, RU" },
};

// ── Email Scan Result (demo) ──────────────────────────────────
export const mockEmailScanResult = {
  sender: "ceo-spoofed@malicious.ru",
  subject: "Urgent wire transfer needed",
  score: 91,
  verdict: "phishing" as const,
  authentication: { spf: false, dkim: false, dmarc: false },
  content_analysis: { phishing_keywords: ["urgent", "wire transfer", "immediately", "confidential"], suspicious_links: 1, attachment_threats: 0, spoofing_indicators: true },
  threat_intelligence: { sender_reputation: 3, domain_reputation: 2, ip_reputation: 1 },
  headers: { return_path: "bounce@trojan-dl.cc", message_id: "FAKE-2025@malicious.ru", received_from: "94.102.49.190" },
};
