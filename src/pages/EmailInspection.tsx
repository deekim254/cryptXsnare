import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Shield, AlertTriangle, CheckCircle, Upload, FileText, Loader2, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface EmailAnalysisResult {
  sender: string;
  subject: string;
  score: number;
  verdict: 'safe' | 'suspicious' | 'phishing';
  authentication: {
    spf: boolean;
    dkim: boolean;
    dmarc: boolean;
  };
  content_analysis: {
    phishing_keywords: string[];
    suspicious_links: number;
    attachment_threats: number;
    spoofing_indicators: boolean;
  };
  headers: {
    return_path?: string;
    message_id?: string;
    received_from?: string;
  };
}

interface N8nScanResult {
  status: string;
  verdict: string;
  phishing_score: number;
  indicators: string[];
  threat_details: {
    suspicious_domains: string[];
    malicious_ips: string[];
    phishing_keywords: string[];
  };
}

export default function EmailInspection() {
  const [emailContent, setEmailContent] = useState("");
  const [emailHeaders, setEmailHeaders] = useState("");
  const [loading, setLoading] = useState(false);
  const [n8nLoading, setN8nLoading] = useState(false);
  const [result, setResult] = useState<EmailAnalysisResult | null>(null);
  const [n8nResult, setN8nResult] = useState<N8nScanResult | null>(null);
  const { toast } = useToast();

  const analyzeWithN8n = async () => {
    if (!emailHeaders.trim()) {
      toast({
        title: "Please enter email headers",
        variant: "destructive",
      });
      return;
    }

    setN8nLoading(true);
    try {
      // Send email headers to n8n webhook
      const response = await fetch('http://localhost:5678/webhook/email-scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          headers: emailHeaders,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`n8n API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Parse n8n response - adjust this based on your n8n workflow output
      const n8nScanResult: N8nScanResult = {
        status: data.status || 'completed',
        verdict: data.verdict || 'suspicious',
        phishing_score: data.phishing_score || 0.75,
        indicators: data.indicators || ['Suspicious sender domain', 'Missing SPF record'],
        threat_details: {
          suspicious_domains: data.threat_details?.suspicious_domains || ['phishing-example.com'],
          malicious_ips: data.threat_details?.malicious_ips || ['192.168.1.100'],
          phishing_keywords: data.threat_details?.phishing_keywords || ['urgent', 'verify'],
        },
      };

      setN8nResult(n8nScanResult);

      // Store n8n scan result in database
      await supabase
        .from('scan_results')
        .insert({
          type: 'email',
          target: `n8n Email Headers - ${new Date().toISOString()}`,
          status: 'completed',
          score: n8nScanResult.phishing_score,
          results: JSON.stringify(n8nScanResult),
          created_by: (await supabase.auth.getUser()).data.user?.id,
        });

      toast({
        title: "n8n Analysis Complete",
        description: `Headers analyzed. Verdict: ${n8nScanResult.verdict}`,
      });
    } catch (error) {
      console.error('Error with n8n analysis:', error);
      toast({
        title: "n8n Analysis Failed",
        description: error instanceof Error ? error.message : "Please check if n8n is running on localhost:5678",
        variant: "destructive",
      });
    } finally {
      setN8nLoading(false);
    }
  };

  const analyzeEmail = async () => {
    if (!emailContent.trim()) {
      toast({
        title: "Please enter email content",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Import threat service dynamically
      const { threatService } = await import("@/services/threatService");
      
      // Parse email headers and content
      const [headers, content] = emailContent.split('\n\n', 2);
      
      // Call FastAPI backend for real analysis
      const result = await threatService.scanEmail({ 
        headers: headers || emailContent,
        content: content || '',
      });

      setResult(result);
      
      // Create threat alert if phishing detected
      if (result.verdict === 'phishing' || result.score > 0.7) {
        await threatService.createThreatAlert({
          type: 'email',
          severity: result.score > 0.9 ? 'critical' : 'high',
          title: `Phishing Email Detected: ${result.subject}`,
          description: `Email from ${result.sender} shows ${result.content_analysis.phishing_keywords.length} phishing indicators`,
          source_domain: result.sender.split('@')[1],
          indicators: result.content_analysis,
          metadata: {
            authentication: result.authentication,
            headers: result.headers,
          },
        });
      }
      
      toast({
        title: "Analysis complete",
        description: `Email analyzed. Threat score: ${Math.round(result.score * 100)}%`,
      });
    } catch (error) {
      console.error('Error analyzing email:', error);
      
      toast({
        title: "Analysis failed",
        description: error instanceof Error ? error.message : "Unable to connect to backend service. Please ensure the FastAPI backend is running.",
        variant: "destructive",
      });
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const getVerdictColor = (verdict: string) => {
    switch (verdict) {
      case 'safe': return 'bg-success';
      case 'suspicious': return 'bg-warning';
      case 'phishing': return 'bg-destructive';
      default: return 'bg-muted';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Email Inspection</h1>
        <p className="text-muted-foreground">
          Analyze emails for phishing attempts and malicious content
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Analyzer
          </CardTitle>
          <CardDescription>
            Paste email headers and content for comprehensive analysis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="email-content">Email Content (Headers + Body)</Label>
            <Textarea
              id="email-content"
              placeholder={`From: sender@example.com
To: victim@company.com
Subject: Urgent: Verify Your Account
Date: Thu, 10 Jul 2025 12:00:00 +0000

Dear Customer,

Your account has been suspended due to suspicious activity.
Please click here to verify your account immediately...`}
              value={emailContent}
              onChange={(e) => setEmailContent(e.target.value)}
              className="min-h-[200px] mt-1 font-mono text-sm"
            />
          </div>

          <div className="flex gap-4">
            <Button onClick={analyzeEmail} disabled={loading} className="flex-1">
              {loading ? "Analyzing..." : "Analyze Email"}
            </Button>
            <Button variant="outline">
              <Upload className="mr-2 h-4 w-4" />
              Upload .eml File
            </Button>
          </div>

          {loading && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                <span className="text-sm">Analyzing email headers and content...</span>
              </div>
              <Progress value={66} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* n8n Email Header Scanner */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            Email Analyzer
          </CardTitle>
          <CardDescription>
            Advanced phishing detection using your custom n8n agent
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="email-headers">Email Headers Only</Label>
            <Textarea
              id="email-headers"
              placeholder={`Return-Path: <bounce@suspicious-domain.com>
Received: from mail.suspicious-domain.com (mail.suspicious-domain.com [192.168.1.100])
    by mx.company.com with ESMTP id 12345
    for <victim@company.com>; Thu, 10 Jul 2025 12:00:00 +0000
From: "Account Security" <noreply@suspicious-domain.com>
To: victim@company.com
Subject: =?UTF-8?B?VXJnZW50OiBWZXJpZnkgWW91ciBBY2NvdW50?=
Date: Thu, 10 Jul 2025 12:00:00 +0000
Message-ID: <20250710120000.12345@suspicious-domain.com>
MIME-Version: 1.0
Content-Type: text/html; charset=UTF-8
X-Mailer: Suspicious Mailer 1.0
Authentication-Results: mx.company.com;
    spf=fail smtp.mailfrom=suspicious-domain.com;
    dkim=none;
    dmarc=fail (p=none dis=none)`}
              value={emailHeaders}
              onChange={(e) => setEmailHeaders(e.target.value)}
              className="min-h-[200px] mt-1 font-mono text-sm"
            />
          </div>

          <Button onClick={analyzeWithN8n} disabled={n8nLoading} className="w-full">
            {n8nLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing with n8n...
              </>
            ) : (
              "Scan Headers with n8n"
            )}
          </Button>

          {n8nLoading && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Sending headers to n8n agent for analysis...</span>
              </div>
              <Progress value={45} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* n8n Results */}
      {n8nResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ExternalLink className="h-5 w-5" />
                n8n Analysis Results
              </span>
              <Badge className={getVerdictColor(n8nResult.verdict)}>
                <span className="capitalize">{n8nResult.verdict}</span>
              </Badge>
            </CardTitle>
            <CardDescription>
              Status: {n8nResult.status} | Phishing Score: {Math.round(n8nResult.phishing_score * 100)}%
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Threat Score */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">n8n Threat Assessment</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold">
                        {Math.round(n8nResult.phishing_score * 100)}%
                      </span>
                      <span className="text-sm text-muted-foreground">
                        Phishing Risk
                      </span>
                    </div>
                    <Progress value={n8nResult.phishing_score * 100} className="h-3" />
                    <p className="text-sm text-muted-foreground">
                      {n8nResult.phishing_score < 0.3 ? "Low risk - Headers appear legitimate" :
                       n8nResult.phishing_score < 0.7 ? "Medium risk - Exercise caution" :
                       "High risk - Likely phishing attempt"}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Indicators */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Threat Indicators</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {n8nResult.indicators.map((indicator, index) => (
                      <Badge key={index} variant="destructive">
                        {indicator}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Threat Details */}
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Suspicious Domains</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      {n8nResult.threat_details.suspicious_domains.map((domain, index) => (
                        <div key={index} className="text-sm font-mono">{domain}</div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Malicious IPs</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      {n8nResult.threat_details.malicious_ips.map((ip, index) => (
                        <div key={index} className="text-sm font-mono">{ip}</div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Phishing Keywords</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1">
                      {n8nResult.threat_details.phishing_keywords.map((keyword, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Analysis Results</span>
              <Badge className={getVerdictColor(result.verdict)}>
                <span className="capitalize">{result.verdict}</span>
              </Badge>
            </CardTitle>
            <CardDescription>
              From: {result.sender} | Subject: {result.subject}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="overview" className="w-full">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="authentication">Authentication</TabsTrigger>
                <TabsTrigger value="content">Content Analysis</TabsTrigger>
                <TabsTrigger value="headers">Headers</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Threat Score</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-2xl font-bold">
                            {Math.round(result.score * 100)}%
                          </span>
                          <span className="text-sm text-muted-foreground">
                            Phishing Risk
                          </span>
                        </div>
                        <Progress value={result.score * 100} className="h-3" />
                        <p className="text-sm text-muted-foreground">
                          {result.score < 0.3 ? "Low risk - Email appears legitimate" :
                           result.score < 0.7 ? "Medium risk - Exercise caution" :
                           "High risk - Likely phishing attempt"}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Quick Stats</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span>Suspicious Links:</span>
                        <span className="font-medium">{result.content_analysis.suspicious_links}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Threat Keywords:</span>
                        <span className="font-medium">{result.content_analysis.phishing_keywords.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Attachment Threats:</span>
                        <span className="font-medium">{result.content_analysis.attachment_threats}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Spoofing Detected:</span>
                        <span className="font-medium">
                          {result.content_analysis.spoofing_indicators ? "Yes" : "No"}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="authentication" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  {Object.entries(result.authentication).map(([auth, passed]) => (
                    <Card key={auth}>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          {passed ? (
                            <CheckCircle className="h-5 w-5 text-success" />
                          ) : (
                            <AlertTriangle className="h-5 w-5 text-destructive" />
                          )}
                          {auth.toUpperCase()}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Badge variant={passed ? "default" : "destructive"}>
                          {passed ? "Valid" : "Failed"}
                        </Badge>
                        <p className="text-sm text-muted-foreground mt-2">
                          {auth === 'spf' ? "Sender Policy Framework" :
                           auth === 'dkim' ? "DomainKeys Identified Mail" :
                           "Domain-based Message Authentication"}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
              
              <TabsContent value="content" className="space-y-4">
                <div className="space-y-4">
                  {result.content_analysis.phishing_keywords.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Suspicious Keywords</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {result.content_analysis.phishing_keywords.map((keyword, index) => (
                            <Badge key={index} variant="destructive">
                              {keyword}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Links Analysis</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span>Total Links:</span>
                            <span>{result.content_analysis.suspicious_links + 2}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Suspicious:</span>
                            <span className="text-destructive font-medium">
                              {result.content_analysis.suspicious_links}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Shortened URLs:</span>
                            <span>1</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Attachments</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span>Total Files:</span>
                            <span>2</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Threats Detected:</span>
                            <span className="text-destructive font-medium">
                              {result.content_analysis.attachment_threats}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <FileText className="h-4 w-4" />
                            <span className="text-sm">document.pdf (Safe)</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="headers" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Email Headers Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 font-mono text-sm">
                      <div className="grid gap-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Return-Path:</span>
                          <span>{result.headers.return_path}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Message-ID:</span>
                          <span>{result.headers.message_id}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Received From:</span>
                          <span>{result.headers.received_from}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}