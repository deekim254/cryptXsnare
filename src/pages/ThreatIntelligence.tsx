import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, Database, TrendingUp, Globe, Search, RefreshCw, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DEMO_MODE } from "@/lib/mockAuth";
import { mockThreatIntel } from "@/lib/mockData";

interface ThreatIntel {
  id: string;
  indicator_value: string;
  indicator_type: string;
  threat_type: string;
  confidence_score: number;
  source: string;
  first_seen: string;
  last_seen: string;
  created_at: string;
  metadata: any;
}

interface IntelFeed {
  name: string;
  status: string;
  last_updated: string;
  record_count: number;
  reliability: number;
}

export default function ThreatIntelligence() {
  const [loading, setLoading] = useState(true);
  const [intel, setIntel] = useState<ThreatIntel[]>([]);
  const [feeds, setFeeds] = useState<IntelFeed[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [enriching, setEnriching] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchThreatIntelligence();
    fetchIntelFeeds();
  }, []);

  const fetchThreatIntelligence = async () => {
    setLoading(true);
    if (DEMO_MODE) {
      setIntel(mockThreatIntel as any);
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('threat_intelligence')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setIntel(data || []);
    } catch (error) {
      console.error('Error fetching threat intelligence:', error);
      setIntel(mockThreatIntel as any); // fallback
    } finally {
      setLoading(false);
    }
  };

  const fetchIntelFeeds = async () => {
    // Simulate fetching intelligence feeds
    const mockFeeds: IntelFeed[] = [
      {
        name: 'AlienVault OTX',
        status: 'Active',
        last_updated: new Date().toISOString(),
        record_count: 45231,
        reliability: 94.2
      },
      {
        name: 'AbuseIPDB',
        status: 'Active', 
        last_updated: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        record_count: 12847,
        reliability: 91.8
      },
      {
        name: 'VirusTotal Intelligence',
        status: 'Syncing',
        last_updated: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        record_count: 98273,
        reliability: 96.7
      },
      {
        name: 'Internal IOCs',
        status: 'Active',
        last_updated: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        record_count: 2341,
        reliability: 99.1
      }
    ];
    setFeeds(mockFeeds);
  };

  const enrichIndicators = async () => {
    setEnriching(true);
    try {
      // Get recent indicators that need enrichment
      const recentIndicators = intel
        .filter(item => !item.metadata?.enriched)
        .slice(0, 10)
        .map(item => ({
          value: item.indicator_value,
          type: item.indicator_type
        }));

      const { data, error } = await supabase.functions.invoke('threat-intelligence', {
        body: {
          action: 'enrich_indicators',
          indicators: recentIndicators
        }
      });

      if (error) throw error;

      toast({
        title: "Enrichment completed",
        description: `Enhanced ${data.result.enrichedData?.length || 0} indicators`,
      });

      // Refresh the data
      await fetchThreatIntelligence();

    } catch (error) {
      console.error('Error enriching indicators:', error);
      toast({
        title: "Enrichment failed",
        description: "Failed to enrich threat indicators",
        variant: "destructive",
      });
    } finally {
      setEnriching(false);
    }
  };

  const correlateThreats = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('threat-intelligence', {
        body: {
          action: 'correlate_threats'
        }
      });

      if (error) throw error;

      toast({
        title: "Correlation complete",
        description: data.result.summary,
      });

    } catch (error) {
      console.error('Error correlating threats:', error);
      toast({
        title: "Correlation failed",
        description: "Failed to correlate threat data",
        variant: "destructive",
      });
    }
  };

  const updateFeeds = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('threat-intelligence', {
        body: {
          action: 'update_feeds'
        }
      });

      if (error) throw error;

      toast({
        title: "Feeds updated",
        description: data.result.summary,
      });

      await fetchIntelFeeds();

    } catch (error) {
      console.error('Error updating feeds:', error);
      toast({
        title: "Update failed",
        description: "Failed to update threat feeds",
        variant: "destructive",
      });
    }
  };

  const exportIntel = () => {
    const csvData = [
      ['Indicator', 'Type', 'Threat Type', 'Confidence', 'Source', 'First Seen', 'Last Seen'],
      ...filteredIntel.map(item => [
        item.indicator_value,
        item.indicator_type,
        item.threat_type || 'Unknown',
        item.confidence_score?.toFixed(2) || '0.00',
        item.source,
        new Date(item.first_seen).toLocaleDateString(),
        new Date(item.last_seen).toLocaleDateString()
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `threat-intelligence-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export completed",
      description: "Threat intelligence data exported successfully",
    });
  };

  const filteredIntel = intel.filter(item => {
    const matchesSearch = !searchTerm || 
      item.indicator_value.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.threat_type?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || item.indicator_type === filterType;
    
    return matchesSearch && matchesType;
  });

  const getConfidenceBadge = (score: number | null) => {
    if (!score) return <Badge variant="secondary">Unknown</Badge>;
    if (score >= 0.8) return <Badge variant="default">High</Badge>;
    if (score >= 0.5) return <Badge variant="secondary">Medium</Badge>;
    return <Badge variant="outline">Low</Badge>;
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading threat intelligence...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Threat Intelligence</h1>
          <p className="text-muted-foreground">
            Advanced threat intelligence analysis and correlation
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={enrichIndicators} disabled={enriching} variant="outline">
            <Brain className="mr-2 h-4 w-4" />
            {enriching ? 'Enriching...' : 'Enrich'}
          </Button>
          <Button onClick={correlateThreats} variant="outline">
            <TrendingUp className="mr-2 h-4 w-4" />
            Correlate
          </Button>
          <Button onClick={exportIntel} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Intelligence Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Indicators</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{intel.length.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {intel.filter(i => i.confidence_score && i.confidence_score > 0.8).length} high confidence
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Feeds</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{feeds.filter(f => f.status === 'Active').length}</div>
            <p className="text-xs text-muted-foreground">
              Out of {feeds.length} configured feeds
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Confidence</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {intel.length > 0 ? 
                (intel.reduce((sum, i) => sum + (i.confidence_score || 0), 0) / intel.length * 100).toFixed(1) + '%'
                : '0%'
              }
            </div>
            <p className="text-xs text-muted-foreground">
              Across all indicators
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fresh Intel</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {intel.filter(i => 
                new Date(i.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
              ).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Added in last 24h
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="indicators" className="space-y-4">
        <TabsList>
          <TabsTrigger value="indicators">Indicators</TabsTrigger>
          <TabsTrigger value="feeds">Intelligence Feeds</TabsTrigger>
          <TabsTrigger value="correlation">Correlation Analysis</TabsTrigger>
        </TabsList>

        {/* Indicators */}
        <TabsContent value="indicators" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Threat Indicators</CardTitle>
                  <CardDescription>
                    Comprehensive database of threat indicators and IOCs
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search indicators..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-64"
                    />
                  </div>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="ip">IP Address</SelectItem>
                      <SelectItem value="domain">Domain</SelectItem>
                      <SelectItem value="url">URL</SelectItem>
                      <SelectItem value="hash">File Hash</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {filteredIntel.slice(0, 20).map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                    <div className="flex items-center gap-3 flex-1">
                      <Badge variant="outline">{item.indicator_type}</Badge>
                      <div className="flex-1">
                        <p className="font-mono text-sm">{item.indicator_value}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.threat_type || 'Unknown threat'} • Source: {item.source}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getConfidenceBadge(item.confidence_score)}
                      <div className="text-xs text-muted-foreground">
                        {new Date(item.last_seen).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
                
                {filteredIntel.length === 0 && (
                  <div className="text-center py-8">
                    <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No threat indicators found</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Intelligence Feeds */}
        <TabsContent value="feeds" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Intelligence Feeds</CardTitle>
                  <CardDescription>
                    External threat intelligence sources and their status
                  </CardDescription>
                </div>
                <Button onClick={updateFeeds}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Update All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {feeds.map((feed, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        feed.status === 'Active' ? 'bg-green-500' : 
                        feed.status === 'Syncing' ? 'bg-yellow-500' : 'bg-gray-500'
                      }`}></div>
                      <div>
                        <p className="font-semibold">{feed.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {feed.record_count.toLocaleString()} records • 
                          {feed.reliability}% reliable • 
                          Updated {new Date(feed.last_updated).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <Badge variant={
                      feed.status === 'Active' ? 'default' : 
                      feed.status === 'Syncing' ? 'secondary' : 'outline'
                    }>
                      {feed.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Correlation Analysis */}
        <TabsContent value="correlation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Threat Correlation Analysis</CardTitle>
              <CardDescription>
                Identify patterns and relationships between threats
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">
                  Correlation analysis helps identify attack patterns and threat actor TTPs
                </p>
                <Button onClick={correlateThreats}>
                  <Brain className="mr-2 h-4 w-4" />
                  Run Correlation Analysis
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}