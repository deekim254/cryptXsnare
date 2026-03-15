import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Search, 
  Globe, 
  Mail, 
  Shield, 
  Database, 
  Server, 
  Eye, 
  Download, 
  Clock, 
  AlertCircle,
  CheckCircle2,
  Loader2,
  Network,
  MapPin,
  Code
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { DEMO_MODE } from "@/lib/mockAuth";
import { mockReconResults } from "@/lib/mockData";

interface ReconResult {
  id: string;
  target_domain: string;
  recon_type: string;
  results: any;
  status: string;
  error_message?: string;
  created_at: string;
}

interface ReconResponse {
  type: string;
  data: any;
  error?: string;
  timestamp: string;
}

export default function Reconnaissance() {
  const [targetDomain, setTargetDomain] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [reconResults, setReconResults] = useState<ReconResult[]>([]);
  const [currentScanResults, setCurrentScanResults] = useState<ReconResponse[]>([]);
  const [selectedResult, setSelectedResult] = useState<ReconResult | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("scanner");
  const { toast } = useToast();

  // Fetch previous reconnaissance results
  const fetchReconResults = async () => {
    if (DEMO_MODE) {
      setReconResults(mockReconResults as any);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('recon_results')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setReconResults(data || []);
    } catch (error) {
      console.error('Error fetching recon results:', error);
      setReconResults(mockReconResults as any);
    }
  };

  useEffect(() => {
    fetchReconResults();
  }, []);

  // Start reconnaissance scan
  const startReconnaissance = async () => {
    if (!targetDomain.trim()) {
      toast({
        title: "Domain required",
        description: "Please enter a target domain",
        variant: "destructive",
      });
      return;
    }

    setIsScanning(true);
    setCurrentScanResults([]);

    if (DEMO_MODE) {
      // Simulate a scan with a short delay
      await new Promise(r => setTimeout(r, 2000));
      const simulatedResults = [
        { type: "whois",      data: { registrar: "GoDaddy", creation_date: "2020-01-15", expiration_date: "2027-01-15", name_servers: ["ns1.godaddy.com", "ns2.godaddy.com"] }, timestamp: new Date().toISOString() },
        { type: "dns",        data: { records: { A: ["104.21.45.67"], MX: ["mail." + targetDomain], TXT: ["v=spf1 include:_spf.google.com ~all"] } }, timestamp: new Date().toISOString() },
        { type: "subdomains", data: { count: 5, subdomains: ["mail", "vpn", "api", "dev", "admin"] }, timestamp: new Date().toISOString() },
        { type: "techstack",  data: { technologies: ["Nginx 1.24", "React", "Cloudflare"], headers: { server: "cloudflare" } }, timestamp: new Date().toISOString() },
      ];
      setCurrentScanResults(simulatedResults);
      toast({ title: "Reconnaissance completed", description: `Scan completed for ${targetDomain} (demo)` });
      setIsScanning(false);
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await supabase.functions.invoke('reconnaissance', {
        body: {
          target_domain: targetDomain.trim(),
          recon_types: ['whois', 'dns', 'subdomains', 'emails', 'shodan', 'techstack']
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      setCurrentScanResults(response.data.results || []);
      toast({
        title: "Reconnaissance completed",
        description: `Scan completed for ${targetDomain}`,
      });

      // Refresh the results list
      await fetchReconResults();
      setActiveTab("results");

    } catch (error) {
      console.error('Reconnaissance error:', error);
      toast({
        title: "Reconnaissance failed",
        description: error.message || "An error occurred during reconnaissance",
        variant: "destructive",
      });
    } finally {
      setIsScanning(false);
    }
  };

  // Export results to CSV
  const exportToCSV = () => {
    const csvContent = [
      ['Domain', 'Type', 'Status', 'Created At', 'Data'],
      ...reconResults.map(result => [
        result.target_domain,
        result.recon_type,
        result.status,
        new Date(result.created_at).toLocaleString(),
        JSON.stringify(result.results).substring(0, 100) + '...'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reconnaissance-results-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export completed",
      description: `${reconResults.length} results exported to CSV`,
    });
  };

  // Get icon for reconnaissance type
  const getReconIcon = (type: string) => {
    switch (type) {
      case 'whois': return <Globe className="h-4 w-4" />;
      case 'dns': return <Network className="h-4 w-4" />;
      case 'subdomains': return <Globe className="h-4 w-4" />;
      case 'emails': return <Mail className="h-4 w-4" />;
      case 'shodan': return <Shield className="h-4 w-4" />;
      case 'techstack': return <Code className="h-4 w-4" />;
      default: return <Database className="h-4 w-4" />;
    }
  };

  // Get badge color for status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-success';
      case 'error': return 'bg-destructive';
      case 'pending': return 'bg-warning';
      default: return 'bg-muted';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reconnaissance</h1>
          <p className="text-muted-foreground">
            OSINT and information gathering for cybersecurity analysis
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToCSV} disabled={reconResults.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button onClick={fetchReconResults}>
            <Database className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="scanner">Scanner</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* Scanner Tab */}
        <TabsContent value="scanner" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Target Reconnaissance
              </CardTitle>
              <CardDescription>
                Enter a domain to perform comprehensive OSINT reconnaissance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="example.com"
                    value={targetDomain}
                    onChange={(e) => setTargetDomain(e.target.value)}
                    disabled={isScanning}
                  />
                </div>
                <Button 
                  onClick={startReconnaissance} 
                  disabled={isScanning || !targetDomain.trim()}
                >
                  {isScanning ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Scanning...
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      Start Recon
                    </>
                  )}
                </Button>
              </div>

              {/* Reconnaissance Tools Overview */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Globe className="h-5 w-5 text-blue-500" />
                      <div>
                        <h4 className="font-semibold">WHOIS & DNS</h4>
                        <p className="text-sm text-muted-foreground">Domain registration info</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Network className="h-5 w-5 text-green-500" />
                      <div>
                        <h4 className="font-semibold">Subdomains</h4>
                        <p className="text-sm text-muted-foreground">Certificate transparency logs</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Mail className="h-5 w-5 text-purple-500" />
                      <div>
                        <h4 className="font-semibold">Email Harvesting</h4>
                        <p className="text-sm text-muted-foreground">Hunter.io integration</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>  
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-red-500" />
                      <div>
                        <h4 className="font-semibold">Shodan</h4>
                        <p className="text-sm text-muted-foreground">Exposed services & ports</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Code className="h-5 w-5 text-orange-500" />
                      <div>
                        <h4 className="font-semibold">Tech Stack</h4>
                        <p className="text-sm text-muted-foreground">Technologies & frameworks</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Database className="h-5 w-5 text-cyan-500" />
                      <div>
                        <h4 className="font-semibold">Full Report</h4>
                        <p className="text-sm text-muted-foreground">Comprehensive analysis</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          {/* Current Scan Results */}
          {currentScanResults.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Current Scan Results</CardTitle>
                <CardDescription>
                  Live results from the ongoing reconnaissance scan
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {currentScanResults.map((result, index) => (
                    <div key={index} className="flex items-start gap-4 p-4 rounded-lg border">
                      <div className="flex items-center gap-2">
                        {getReconIcon(result.type)}
                        <Badge variant="outline">
                          {result.type.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="flex-1">
                        {result.error ? (
                          <div className="flex items-center gap-2 text-destructive">
                            <AlertCircle className="h-4 w-4" />
                            <span>Error: {result.error}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-success">
                            <CheckCircle2 className="h-4 w-4" />
                            <span>Completed successfully</span>
                          </div>
                        )}
                        <p className="text-sm text-muted-foreground mt-1">
                          {new Date(result.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Results Tab */}
        <TabsContent value="results" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Latest Results</CardTitle>
              <CardDescription>
                Recent reconnaissance results grouped by domain
              </CardDescription>
            </CardHeader>
            <CardContent>
              {reconResults.length === 0 ? (
                <div className="text-center py-8">
                  <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No reconnaissance results found</p>
                  <p className="text-sm text-muted-foreground">Start a scan to see results here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Array.from(new Set(reconResults.map(r => r.target_domain)))
                    .slice(0, 5)
                    .map(domain => {
                      const domainResults = reconResults.filter(r => r.target_domain === domain);
                      const latestResult = domainResults[0];
                      
                      return (
                        <div key={domain} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <Globe className="h-5 w-5 text-primary" />
                              <div>
                                <h3 className="font-semibold">{domain}</h3>
                                <p className="text-sm text-muted-foreground">
                                  Last scanned: {new Date(latestResult.created_at).toLocaleString()}
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedResult(latestResult);
                                setDialogOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </Button>
                          </div>
                          
                          <div className="flex gap-2 flex-wrap">
                            {domainResults.slice(0, 6).map(result => (
                              <Badge 
                                key={result.id} 
                                className={getStatusColor(result.status)}
                              >
                                {getReconIcon(result.recon_type)}
                                <span className="ml-1">{result.recon_type}</span>
                              </Badge>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Scan History</CardTitle>
              <CardDescription>
                Complete history of all reconnaissance activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              {reconResults.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No scan history available</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {reconResults.map(result => (
                    <div key={result.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        {getReconIcon(result.recon_type)}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{result.target_domain}</span>
                            <Badge variant="outline">{result.recon_type}</Badge>
                            <Badge className={getStatusColor(result.status)}>
                              {result.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {new Date(result.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedResult(result);
                          setDialogOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Result Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedResult && getReconIcon(selectedResult.recon_type)}
              Reconnaissance Details
            </DialogTitle>
            <DialogDescription>
              Detailed view of the reconnaissance results
            </DialogDescription>
          </DialogHeader>
          
          {selectedResult && (
            <div className="space-y-6">
              {/* Header Info */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">{selectedResult.target_domain}</h2>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline">{selectedResult.recon_type}</Badge>
                    <Badge className={getStatusColor(selectedResult.status)}>
                      {selectedResult.status}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {new Date(selectedResult.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Results Data */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Results</h3>
                {selectedResult.status === 'error' ? (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-destructive">
                      <AlertCircle className="h-5 w-5" />
                      <span className="font-medium">Error occurred during scan</span>
                    </div>
                    {selectedResult.error_message && (
                      <p className="text-sm mt-2">{selectedResult.error_message}</p>
                    )}
                  </div>
                ) : (
                  <div className="bg-muted/50 rounded-lg p-4">
                    <pre className="text-sm whitespace-pre-wrap font-mono overflow-x-auto">
                      {JSON.stringify(selectedResult.results, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}