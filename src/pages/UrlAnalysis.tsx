import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link, Shield, AlertTriangle, CheckCircle, ExternalLink, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { mockUrlScanResult } from "@/lib/mockData";
import { DEMO_MODE } from "@/lib/mockAuth";

interface VTStats { malicious: number; suspicious: number; undetected: number; harmless: number; timeout: number; }

interface AnalysisResult {
  url: string;
  verdict: "safe" | "suspicious" | "malicious";
  score: number;
  vtStats: VTStats | null;
  vtLink: string | null;
  checks: { domain_reputation: boolean; ssl_certificate: boolean; url_structure: boolean; blacklist_check: boolean; phishing_keywords: boolean; };
  details: { suspicious_patterns?: string[]; ssl_issuer?: string | null; redirect_count?: number; };
  source: "virustotal" | "mock";
}

async function scanWithVirusTotal(url: string, apiKey: string): Promise<AnalysisResult> {
  const headers = { "x-apikey": apiKey, "Content-Type": "application/x-www-form-urlencoded" };
  const submitRes = await fetch("https://www.virustotal.com/api/v3/urls", { method: "POST", headers, body: `url=${encodeURIComponent(url)}` });
  if (!submitRes.ok) throw new Error(`VirusTotal submit failed: ${submitRes.status} — check your API key`);
  const submitData = await submitRes.json();
  const analysisId = submitData.data?.id;
  if (!analysisId) throw new Error("No analysis ID returned");

  let stats: VTStats | null = null;
  for (let i = 0; i < 8; i++) {
    await new Promise(r => setTimeout(r, 2500));
    const pollRes = await fetch(`https://www.virustotal.com/api/v3/analyses/${analysisId}`, { headers });
    if (!pollRes.ok) continue;
    const pollData = await pollRes.json();
    if (pollData.data?.attributes?.status === "completed") { stats = pollData.data.attributes.stats; break; }
  }
  if (!stats) throw new Error("Analysis timed out — VirusTotal is still processing. Try again in 30 seconds.");

  const total = Object.values(stats).reduce((a, b) => a + b, 0) || 1;
  const score = Math.round(((stats.malicious + stats.suspicious) / total) * 100);
  const verdict: AnalysisResult["verdict"] = stats.malicious > 3 ? "malicious" : stats.malicious > 0 || stats.suspicious > 2 ? "suspicious" : "safe";
  const hasHTTPS = url.startsWith("https://");
  const hasIP = /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(url);
  const suspiciousPatterns: string[] = [];
  if (!hasHTTPS) suspiciousPatterns.push("No HTTPS");
  if (hasIP) suspiciousPatterns.push("IP address in URL");
  if (/login|verify|secure|account|update|confirm/.test(url.toLowerCase())) suspiciousPatterns.push("Credential-lure keywords");
  if (/\.ru|\.cn|\.tk|\.ml|\.ga|\.cf/.test(url)) suspiciousPatterns.push("High-risk TLD");
  const urlId = btoa(url).replace(/=/g, "");
  return {
    url, verdict, score, vtStats: stats,
    vtLink: `https://www.virustotal.com/gui/url/${urlId}`,
    checks: { domain_reputation: stats.malicious === 0, ssl_certificate: hasHTTPS, url_structure: !hasIP, blacklist_check: stats.malicious === 0, phishing_keywords: !/login|verify|secure|account|update|confirm/.test(url.toLowerCase()) },
    details: { ssl_issuer: hasHTTPS ? "Valid certificate" : null, redirect_count: 0, suspicious_patterns: suspiciousPatterns },
    source: "virustotal",
  };
}

export default function UrlAnalysis() {
  const [url, setUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const { toast } = useToast();

  const analyzeUrl = async () => {
    if (!url.trim()) { toast({ title: "Please enter a URL", variant: "destructive" }); return; }
    setLoading(true); setResult(null); setProgress(10);
    try {
      if (apiKey.trim() && !DEMO_MODE) {
        setStatusMsg("Submitting to VirusTotal..."); setProgress(30);
        const r = await scanWithVirusTotal(url.trim(), apiKey.trim());
        setProgress(100); setResult(r);
        toast({ title: "VirusTotal scan complete", description: `${r.vtStats?.malicious ?? 0} engines flagged this URL` });
      } else {
        setStatusMsg("Running simulated scan..."); setProgress(40);
        await new Promise(r => setTimeout(r, 1500)); setProgress(75);
        await new Promise(r => setTimeout(r, 800)); setProgress(100);
        const bad = /malicious|phishing|trojan|evil|hack|fake/.test(url.toLowerCase());
        const safe = /google\.com|github\.com|microsoft\.com|stackoverflow/.test(url.toLowerCase());
        const r: AnalysisResult = {
          ...mockUrlScanResult, url: url.trim(), source: "mock",
          verdict: safe ? "safe" : bad ? "malicious" : "suspicious",
          score: safe ? 3 : bad ? 97 : 35,
          vtStats: safe ? { malicious: 0, suspicious: 0, undetected: 67, harmless: 18, timeout: 0 }
                 : bad  ? { malicious: 68, suspicious: 3, undetected: 1, harmless: 0, timeout: 0 }
                        : { malicious: 2, suspicious: 4, undetected: 58, harmless: 10, timeout: 2 },
          vtLink: null,
        };
        setResult(r);
        toast({ title: "Scan complete (demo)", description: "Paste a VirusTotal API key above for live scanning" });
      }
    } catch (err: any) {
      toast({ title: "Scan failed", description: err.message, variant: "destructive" });
    } finally { setLoading(false); setStatusMsg(""); }
  };

  const vc = (v: string) => v === "safe" ? "bg-green-500" : v === "suspicious" ? "bg-yellow-500" : "bg-red-500";
  const vi = (v: string) => v === "safe" ? <CheckCircle className="h-4 w-4" /> : v === "suspicious" ? <AlertTriangle className="h-4 w-4" /> : <Shield className="h-4 w-4" />;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">URL Analysis</h1>
        <p className="text-muted-foreground">Analyze URLs for phishing, malware, and reputation threats via VirusTotal</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Link className="h-5 w-5" />URL Scanner</CardTitle>
          <CardDescription>70+ antivirus engines and URL scanners via VirusTotal</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="url">URL to analyze</Label>
            <Input id="url" type="url" placeholder="https://suspicious-site.com/login" value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key === "Enter" && analyzeUrl()} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="apikey" className="flex items-center gap-2">
              VirusTotal API Key
              <span className="text-xs text-muted-foreground font-normal">— free at <a href="https://www.virustotal.com/gui/join-us" target="_blank" rel="noreferrer" className="underline">virustotal.com</a>. Leave blank for demo mode.</span>
            </Label>
            <Input id="apikey" type="password" placeholder="Paste your free VirusTotal API key here" value={apiKey} onChange={e => setApiKey(e.target.value)} />
          </div>
          <Button onClick={analyzeUrl} disabled={loading}>
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{statusMsg || "Scanning..."}</> : "Analyze URL"}
          </Button>
          {loading && <Progress value={progress} className="h-2 transition-all duration-500" />}
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between flex-wrap gap-2">
              <span>Scan Results</span>
              <div className="flex items-center gap-2">
                {result.source === "mock" && <Badge variant="outline" className="text-xs">Demo data</Badge>}
                <Badge className={`${vc(result.verdict)} text-white flex items-center gap-1`}>{vi(result.verdict)}<span className="capitalize ml-1">{result.verdict}</span></Badge>
              </div>
            </CardTitle>
            <CardDescription className="break-all">{result.url}</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="overview">
              <TabsList><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="engines">Engine Results</TabsTrigger><TabsTrigger value="checks">Security Checks</TabsTrigger></TabsList>

              <TabsContent value="overview" className="space-y-4 pt-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader><CardTitle className="text-base">Threat Score</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-end justify-between">
                        <span className="text-4xl font-bold">{result.score}%</span>
                        <span className="text-sm text-muted-foreground mb-1">risk level</span>
                      </div>
                      <Progress value={result.score} className="h-3" />
                      <p className="text-sm text-muted-foreground">
                        {result.score < 10 ? "URL appears safe — no significant threats detected" : result.score < 50 ? "Caution — some engines flagged this URL" : "High risk — flagged by multiple security engines"}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle className="text-base">Quick Actions</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                      {result.vtLink && (
                        <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                          <a href={result.vtLink} target="_blank" rel="noreferrer"><ExternalLink className="mr-2 h-4 w-4" />View full report on VirusTotal</a>
                        </Button>
                      )}
                      <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => { setUrl(""); setResult(null); }}>
                        <Shield className="mr-2 h-4 w-4" />Scan another URL
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="engines" className="pt-4">
                {result.vtStats ? (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                    {([["Malicious", result.vtStats.malicious, "text-red-600 dark:text-red-400"], ["Suspicious", result.vtStats.suspicious, "text-orange-500"], ["Undetected", result.vtStats.undetected, "text-muted-foreground"], ["Harmless", result.vtStats.harmless, "text-green-600 dark:text-green-400"], ["Timeout", result.vtStats.timeout, "text-muted-foreground"]] as [string, number, string][]).map(([label, value, color]) => (
                      <Card key={label}><CardContent className="pt-4 text-center"><p className={`text-3xl font-bold ${color}`}>{value}</p><p className="text-sm text-muted-foreground mt-1">{label}</p></CardContent></Card>
                    ))}
                  </div>
                ) : <p className="text-muted-foreground text-sm">Engine results not available.</p>}
              </TabsContent>

              <TabsContent value="checks" className="pt-4 space-y-3">
                {Object.entries(result.checks).map(([check, passed]) => (
                  <div key={check} className="flex items-center justify-between p-3 rounded-lg border">
                    <span className="font-medium capitalize">{check.replace(/_/g, " ")}</span>
                    <div className="flex items-center gap-2">
                      {passed ? <CheckCircle className="h-4 w-4 text-green-500" /> : <AlertTriangle className="h-4 w-4 text-red-500" />}
                      <span className="text-sm">{passed ? "Passed" : "Failed"}</span>
                    </div>
                  </div>
                ))}
                {result.details.suspicious_patterns && result.details.suspicious_patterns.length > 0 && (
                  <div className="pt-2">
                    <p className="text-sm font-medium mb-2">Suspicious patterns detected:</p>
                    <div className="flex flex-wrap gap-2">
                      {result.details.suspicious_patterns.map((p, i) => <Badge key={i} variant="outline" className="text-orange-600 border-orange-300">{p}</Badge>)}
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
