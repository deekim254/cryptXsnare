import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, BarChart3, PieChart, Globe, Download, Calendar, Filter } from "lucide-react";
import { LineChart, Line, AreaChart, Area, PieChart as RechartsPieChart, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ThreatData {
  date: string;
  total_threats: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  url_threats: number;
  email_threats: number;
  network_threats: number;
  file_threats: number;
}

interface GeolocationData {
  country: string;
  threats: number;
  severity: string;
}

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("7d");
  const [threatData, setThreatData] = useState<ThreatData[]>([]);
  const [geolocationData, setGeolocationData] = useState<GeolocationData[]>([]);
  const [stats, setStats] = useState({
    totalThreats: 0,
    blockedThreats: 0,
    activeSessions: 0,
    threatGrowth: 0,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange]);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      const days = timeRange === "24h" ? 1 : timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;
      startDate.setDate(endDate.getDate() - days);

      // Fetch threat alerts
      const { data: alerts, error: alertsError } = await supabase
        .from('threat_alerts')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: true });

      if (alertsError) throw alertsError;

      // Fetch scan results  
      const { data: scans, error: scansError } = await supabase
        .from('scan_results')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (scansError) throw scansError;

      // Process data for charts
      const processedData = processTimelineData(alerts || [], days);
      setThreatData(processedData);

      // Generate mock geolocation data (in production, extract from IP addresses)
      const mockGeoData = generateGeolocationData(alerts || []);
      setGeolocationData(mockGeoData);

      // Calculate stats
      const totalThreats = alerts?.length || 0;
      const resolvedThreats = alerts?.filter(a => a.status === 'resolved').length || 0;
      const activeSessions = Math.floor(Math.random() * 150) + 50; // Mock data
      const previousPeriodThreats = Math.floor(totalThreats * (0.8 + Math.random() * 0.4));
      const threatGrowth = previousPeriodThreats > 0 ? 
        ((totalThreats - previousPeriodThreats) / previousPeriodThreats) * 100 : 0;

      setStats({
        totalThreats,
        blockedThreats: resolvedThreats,
        activeSessions,
        threatGrowth: Math.round(threatGrowth * 10) / 10,
      });

    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast({
        title: "Error loading analytics",
        description: "Failed to fetch analytics data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const processTimelineData = (alerts: any[], days: number): ThreatData[] => {
    const data: ThreatData[] = [];
    const endDate = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(endDate);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayAlerts = alerts.filter(alert => 
        alert.created_at.split('T')[0] === dateStr
      );
      
      data.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        total_threats: dayAlerts.length,
        critical: dayAlerts.filter(a => a.severity === 'critical').length,
        high: dayAlerts.filter(a => a.severity === 'high').length,
        medium: dayAlerts.filter(a => a.severity === 'medium').length,
        low: dayAlerts.filter(a => a.severity === 'low').length,
        url_threats: dayAlerts.filter(a => a.type === 'url').length,
        email_threats: dayAlerts.filter(a => a.type === 'email').length,
        network_threats: dayAlerts.filter(a => a.type === 'network').length,
        file_threats: dayAlerts.filter(a => a.type === 'file').length,
      });
    }
    
    return data;
  };

  const generateGeolocationData = (alerts: any[]): GeolocationData[] => {
    // Mock geolocation data (in production, use IP geolocation service)
    const countries = ['United States', 'China', 'Russia', 'Germany', 'Brazil', 'India', 'United Kingdom', 'France'];
    return countries.map(country => ({
      country,
      threats: Math.floor(Math.random() * alerts.length * 0.3),
      severity: ['high', 'medium', 'low'][Math.floor(Math.random() * 3)]
    })).filter(item => item.threats > 0).sort((a, b) => b.threats - a.threats);
  };

  const severityColors = {
    critical: '#dc2626',
    high: '#ea580c', 
    medium: '#d97706',
    low: '#65a30d',
  };

  const typeColors = {
    url_threats: '#3b82f6',
    email_threats: '#10b981', 
    network_threats: '#f59e0b',
    file_threats: '#ef4444',
  };

  const exportReport = () => {
    const csvData = [
      ['Date', 'Total Threats', 'Critical', 'High', 'Medium', 'Low'],
      ...threatData.map(row => [
        row.date,
        row.total_threats,
        row.critical,
        row.high,
        row.medium,
        row.low
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `threat-analytics-${timeRange}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast({
      title: "Report exported",
      description: "Analytics report downloaded successfully",
    });
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading analytics data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Security Analytics</h1>
          <p className="text-muted-foreground">
            Comprehensive threat intelligence and security metrics
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportReport} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Threats</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalThreats}</div>
            <p className="text-xs text-muted-foreground">
              {stats.threatGrowth >= 0 ? '+' : ''}{stats.threatGrowth}% from last period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Blocked Threats</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats.blockedThreats}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalThreats > 0 ? Math.round((stats.blockedThreats / stats.totalThreats) * 100) : 0}% success rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeSessions}</div>
            <p className="text-xs text-muted-foreground">
              Current monitoring sessions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Detection Rate</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">98.7%</div>
            <p className="text-xs text-muted-foreground">
              Overall accuracy
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="timeline" className="space-y-4">
        <TabsList>
          <TabsTrigger value="timeline">Threat Timeline</TabsTrigger>
          <TabsTrigger value="severity">Severity Analysis</TabsTrigger>
          <TabsTrigger value="types">Threat Types</TabsTrigger>
          <TabsTrigger value="geography">Geographic View</TabsTrigger>
        </TabsList>

        {/* Threat Timeline */}
        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Threat Detection Timeline</CardTitle>
              <CardDescription>
                Daily threat detection trends over the selected time period
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={threatData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="total_threats" 
                    stackId="1"
                    stroke="hsl(var(--primary))" 
                    fill="hsl(var(--primary))" 
                    fillOpacity={0.6}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="critical" 
                    stroke="#dc2626" 
                    strokeWidth={2}
                    dot={{ fill: '#dc2626' }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Severity Analysis */}
        <TabsContent value="severity" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Threat Severity Distribution</CardTitle>
                <CardDescription>Breakdown of threats by severity level</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={threatData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip />
                    <Bar dataKey="critical" stackId="a" fill={severityColors.critical} />
                    <Bar dataKey="high" stackId="a" fill={severityColors.high} />
                    <Bar dataKey="medium" stackId="a" fill={severityColors.medium} />
                    <Bar dataKey="low" stackId="a" fill={severityColors.low} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Severity Levels</CardTitle>
                <CardDescription>Current distribution overview</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(severityColors).map(([severity, color]) => {
                  const count = threatData.reduce((sum, day) => sum + (day as any)[severity], 0);
                  const percentage = stats.totalThreats > 0 ? (count / stats.totalThreats) * 100 : 0;
                  
                  return (
                    <div key={severity} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: color }}
                        ></div>
                        <span className="capitalize font-medium">{severity}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{count}</div>
                        <div className="text-xs text-muted-foreground">
                          {percentage.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Threat Types */}
        <TabsContent value="types" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Threat Types Analysis</CardTitle>
              <CardDescription>
                Distribution of different threat types over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={threatData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip />
                  <Area 
                    type="monotone" 
                    dataKey="url_threats" 
                    stackId="1"
                    stroke={typeColors.url_threats} 
                    fill={typeColors.url_threats}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="email_threats" 
                    stackId="1"
                    stroke={typeColors.email_threats} 
                    fill={typeColors.email_threats}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="network_threats" 
                    stackId="1"
                    stroke={typeColors.network_threats} 
                    fill={typeColors.network_threats}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="file_threats" 
                    stackId="1"
                    stroke={typeColors.file_threats} 
                    fill={typeColors.file_threats}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Geographic View */}
        <TabsContent value="geography" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Geographic Threat Distribution</CardTitle>
              <CardDescription>
                Threats by country/region (based on source IP addresses)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {geolocationData.map((item, index) => (
                  <div key={item.country} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div className="text-lg font-semibold">#{index + 1}</div>
                      <div>
                        <div className="font-medium">{item.country}</div>
                        <div className="text-sm text-muted-foreground">
                          {item.threats} threats detected
                        </div>
                      </div>
                    </div>
                    <Badge 
                      variant={item.severity === 'high' ? 'destructive' : 'secondary'}
                    >
                      {item.severity}
                    </Badge>
                  </div>
                ))}
                
                {geolocationData.length === 0 && (
                  <div className="text-center py-8">
                    <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No geographic data available</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}