import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, Upload, File, CheckCircle, XCircle, Clock, Shield, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface FileAnalysisResult {
  scan_id?: string;
  resource: string;
  positives: number;
  total: number;
  risk_score: number;
  verdict: 'safe' | 'suspicious' | 'malicious' | 'error' | 'unknown';
  scans?: any;
  permalink?: string;
  message?: string;
}

interface NetworkAnalysisResult {
  analysis_id: string;
  packets_analyzed: number;
  malicious_packets: number;
  risk_score: number;
  threats_detected: any[];
  verdict: string;
}

export default function FileAnalysis() {
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<FileAnalysisResult | null>(null);
  const [networkResult, setNetworkResult] = useState<NetworkAnalysisResult | null>(null);
  const [urlToScan, setUrlToScan] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pcapInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileUpload = async (file: File, analysisType: 'virustotal' | 'pcap') => {
    if (!file) return;

    // File size validation (100MB limit)
    if (file.size > 100 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 100MB",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setUploadProgress(0);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      let result;

      if (analysisType === 'virustotal') {
        // For VirusTotal, we'll use file hash simulation since we can't actually upload files
        const arrayBuffer = await file.arrayBuffer();
        const hashArray = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', arrayBuffer)));
        const fileHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        const response = await supabase.functions.invoke('virustotal-scan', {
          body: {
            scan_type: 'file',
            file_hash: fileHash
          }
        });

        if (response.error) throw new Error(response.error.message);
        result = response.data;
        setAnalysisResult(result);
      } else if (analysisType === 'pcap') {
        // PCAP analysis
        const formData = new FormData();
        formData.append('file', file);

        const { data: { session } } = await supabase.auth.getSession();
        
        const response = await fetch(`https://kfmjpgepqezddwlakirp.supabase.co/functions/v1/pcap-analyzer`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: formData
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Network analysis failed');
        }

        result = await response.json();
        setNetworkResult(result.analysis);
      }

      clearInterval(progressInterval);
      setUploadProgress(100);

      toast({
        title: "Analysis complete",
        description: `File analyzed successfully. ${analysisType === 'virustotal' ? 'Virus scan' : 'Network analysis'} completed.`,
      });

    } catch (error) {
      console.error('File analysis error:', error);
      toast({
        title: "Analysis failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUrlScan = async () => {
    if (!urlToScan) {
      toast({
        title: "Please enter a URL",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await supabase.functions.invoke('virustotal-scan', {
        body: {
          scan_type: 'url',
          url: urlToScan
        }
      });

      if (response.error) throw new Error(response.error.message);
      
      setAnalysisResult(response.data);
      toast({
        title: "URL scan complete",
        description: `Analysis completed for ${urlToScan}`,
      });
    } catch (error) {
      console.error('URL scan error:', error);
      toast({
        title: "Scan failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getVerdictIcon = (verdict: string) => {
    switch (verdict) {
      case 'safe':
      case 'low_risk':
        return <CheckCircle className="h-5 w-5 text-success" />;
      case 'suspicious':
      case 'medium_risk':
        return <AlertTriangle className="h-5 w-5 text-warning" />;
      case 'malicious':
      case 'high_risk':
        return <XCircle className="h-5 w-5 text-destructive" />;
      case 'unknown':
        return <Clock className="h-5 w-5 text-muted-foreground" />;
      default:
        return <Shield className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getVerdictColor = (verdict: string) => {
    switch (verdict) {
      case 'safe':
      case 'low_risk':
        return 'bg-success';
      case 'suspicious':
      case 'medium_risk':
        return 'bg-warning';
      case 'malicious':
      case 'high_risk':
        return 'bg-destructive';
      case 'unknown':
        return 'bg-muted';
      default:
        return 'bg-muted';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">File & Network Analysis</h1>
        <p className="text-muted-foreground">
          Analyze files, URLs, and network traffic for security threats
        </p>
      </div>

      <Tabs defaultValue="file-scan" className="space-y-4">
        <TabsList>
          <TabsTrigger value="file-scan">File Scan</TabsTrigger>
          <TabsTrigger value="url-scan">URL Scan</TabsTrigger>
          <TabsTrigger value="network">Network Analysis</TabsTrigger>
        </TabsList>

        {/* File Upload Tab */}
        <TabsContent value="file-scan" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                File Security Scan
              </CardTitle>
              <CardDescription>
                Upload files to scan for malware and security threats using VirusTotal
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="file-upload">Select file to analyze</Label>
                  <Input
                    id="file-upload"
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, 'virustotal');
                    }}
                    accept=".exe,.pdf,.doc,.docx,.zip,.rar,.apk,.dmg,.msi"
                    className="mt-1"
                    disabled={loading}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Supported: EXE, PDF, DOC, ZIP, APK, DMG, MSI (Max 100MB)
                  </p>
                </div>

                {loading && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      <span className="text-sm">Uploading and analyzing file...</span>
                    </div>
                    <Progress value={uploadProgress} className="h-2" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* URL Scan Tab */}
        <TabsContent value="url-scan" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                URL Security Scan
              </CardTitle>
              <CardDescription>
                Scan URLs for phishing, malware, and other security threats
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="url-input">URL to scan</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="url-input"
                      type="url"
                      placeholder="https://example.com"
                      value={urlToScan}
                      onChange={(e) => setUrlToScan(e.target.value)}
                      disabled={loading}
                    />
                    <Button onClick={handleUrlScan} disabled={loading || !urlToScan}>
                      {loading ? "Scanning..." : "Scan URL"}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Network Analysis Tab */}
        <TabsContent value="network" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <File className="h-5 w-5" />
                Network Packet Analysis
              </CardTitle>
              <CardDescription>
                Upload PCAP files for network traffic analysis and threat detection
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="pcap-upload">Select PCAP file</Label>
                  <Input
                    id="pcap-upload"
                    type="file"
                    ref={pcapInputRef}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, 'pcap');
                    }}
                    accept=".pcap,.pcapng,.cap"
                    className="mt-1"
                    disabled={loading}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Supported: PCAP, PCAPNG, CAP (Max 100MB)
                  </p>
                </div>

                {loading && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      <span className="text-sm">Analyzing network traffic...</span>
                    </div>
                    <Progress value={uploadProgress} className="h-2" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Analysis Results */}
      {(analysisResult || networkResult) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Analysis Results</span>
              {analysisResult && (
                <Badge className={getVerdictColor(analysisResult.verdict)}>
                  {getVerdictIcon(analysisResult.verdict)}
                  <span className="ml-2 capitalize">{analysisResult.verdict}</span>
                </Badge>
              )}
              {networkResult && (
                <Badge className={getVerdictColor(networkResult.verdict)}>
                  {getVerdictIcon(networkResult.verdict)}
                  <span className="ml-2 capitalize">{networkResult.verdict}</span>
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analysisResult && (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {analysisResult.positives || 0}/{analysisResult.total || 0}
                    </div>
                    <p className="text-sm text-muted-foreground">Detections</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {Math.round((analysisResult.risk_score || 0) * 100)}%
                    </div>
                    <p className="text-sm text-muted-foreground">Risk Score</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold capitalize">
                      {analysisResult.verdict}
                    </div>
                    <p className="text-sm text-muted-foreground">Verdict</p>
                  </div>
                </div>

                {analysisResult.message && (
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-sm">{analysisResult.message}</p>
                  </div>
                )}

                {analysisResult.permalink && (
                  <div className="flex justify-center">
                    <Button asChild variant="outline">
                      <a href={analysisResult.permalink} target="_blank" rel="noopener noreferrer">
                        <Download className="mr-2 h-4 w-4" />
                        View Full Report
                      </a>
                    </Button>
                  </div>
                )}
              </div>
            )}

            {networkResult && (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {networkResult.packets_analyzed}
                    </div>
                    <p className="text-sm text-muted-foreground">Packets</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-destructive">
                      {networkResult.malicious_packets}
                    </div>
                    <p className="text-sm text-muted-foreground">Threats</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {Math.round(networkResult.risk_score * 100)}%
                    </div>
                    <p className="text-sm text-muted-foreground">Risk Score</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {networkResult.threats_detected?.length || 0}
                    </div>
                    <p className="text-sm text-muted-foreground">Alerts</p>
                  </div>
                </div>

                {networkResult.threats_detected && networkResult.threats_detected.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Detected Threats:</h4>
                    {networkResult.threats_detected.slice(0, 5).map((threat, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                        <div>
                          <span className="font-medium">{threat.type}</span>
                          <span className="text-sm text-muted-foreground ml-2">
                            from {threat.source_ip}
                          </span>
                        </div>
                        <Badge variant={threat.severity === 'critical' ? 'destructive' : 'secondary'}>
                          {threat.severity}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}