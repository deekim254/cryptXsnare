import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Network, Activity, AlertTriangle, Shield, Play, Pause, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

const NetworkMonitoring = () => {
  const navigate = useNavigate();
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [networkData, setNetworkData] = useState([]);
  const [alerts, setAlerts] = useState([
    { id: 1, type: "DDoS", severity: "high", source: "192.168.1.105", timestamp: "1 min ago", description: "Unusual traffic spike detected" },
    { id: 2, type: "Port Scan", severity: "medium", source: "10.0.0.45", timestamp: "3 min ago", description: "Sequential port scanning activity" },
    { id: 3, type: "DNS Anomaly", severity: "low", source: "172.16.0.22", timestamp: "5 min ago", description: "Suspicious DNS queries detected" }
  ]);

  const protocolData = [
    { protocol: "HTTP", count: 1250, percentage: 45 },
    { protocol: "HTTPS", count: 980, percentage: 35 },
    { protocol: "DNS", count: 280, percentage: 10 },
    { protocol: "SSH", count: 140, percentage: 5 },
    { protocol: "Other", count: 140, percentage: 5 }
  ];

  // Simulate real-time network data
  useEffect(() => {
    const generateNetworkData = () => {
      const now = new Date();
      const data = [];
      for (let i = 29; i >= 0; i--) {
        const time = new Date(now.getTime() - i * 60000);
        data.push({
          time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          traffic: Math.floor(Math.random() * 100) + 20,
          threats: Math.floor(Math.random() * 10),
          blocked: Math.floor(Math.random() * 5)
        });
      }
      return data;
    };

    setNetworkData(generateNetworkData());
    
    if (isMonitoring) {
      const interval = setInterval(() => {
        setNetworkData(prev => {
          const newData = [...prev.slice(1)];
          const now = new Date();
          newData.push({
            time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            traffic: Math.floor(Math.random() * 100) + 20,
            threats: Math.floor(Math.random() * 10),
            blocked: Math.floor(Math.random() * 5)
          });
          return newData;
        });
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [isMonitoring]);

  const getSeverityColor = (severity) => {
    switch (severity) {
      case "critical": return "bg-destructive";
      case "high": return "bg-orange-500";
      case "medium": return "bg-warning";
      case "low": return "bg-chart-2";
      default: return "bg-muted";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      {/* Header */}
      <div className="border-b border-border bg-background/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                onClick={() => navigate('/')}
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div className="flex items-center space-x-3">
                <Network className="h-6 w-6 text-primary" />
                <h1 className="text-xl font-bold text-foreground">Network Monitoring</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="outline" className={`border-chart-2 text-chart-2 ${isMonitoring ? 'animate-pulse' : ''}`}>
                <Activity className="h-3 w-3 mr-1" />
                {isMonitoring ? 'Live Monitoring' : 'Monitoring Paused'}
              </Badge>
              <Button
                onClick={() => setIsMonitoring(!isMonitoring)}
                variant={isMonitoring ? "destructive" : "default"}
              >
                {isMonitoring ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                {isMonitoring ? 'Pause' : 'Start'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Network Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-card/50 border-border backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Connections</CardTitle>
              <Network className="h-4 w-4 text-chart-1" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">1,847</div>
              <p className="text-xs text-muted-foreground">+12% from last hour</p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Threats Blocked</CardTitle>
              <Shield className="h-4 w-4 text-chart-2" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">142</div>
              <p className="text-xs text-muted-foreground">Last 24 hours</p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Traffic Volume</CardTitle>
              <Activity className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">2.4 GB</div>
              <p className="text-xs text-muted-foreground">Current hour</p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Alert Level</CardTitle>
              <AlertTriangle className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">Medium</div>
              <p className="text-xs text-muted-foreground">3 active alerts</p>
            </CardContent>
          </Card>
        </div>

        {/* Real-time Traffic Chart */}
        <Card className="bg-card/50 border-border backdrop-blur-sm mb-8">
          <CardHeader>
            <CardTitle className="text-foreground">Real-time Network Traffic</CardTitle>
            <CardDescription className="text-muted-foreground">Live monitoring of network activity and threats</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={networkData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))'
                  }} 
                />
                <Line type="monotone" dataKey="traffic" stroke="hsl(var(--primary))" strokeWidth={2} name="Traffic (MB/s)" />
                <Line type="monotone" dataKey="threats" stroke="hsl(var(--destructive))" strokeWidth={2} name="Threats Detected" />
                <Line type="monotone" dataKey="blocked" stroke="hsl(var(--chart-2))" strokeWidth={2} name="Threats Blocked" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Protocol Distribution and Recent Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Protocol Distribution */}
          <Card className="bg-card/50 border-border backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-foreground">Protocol Distribution</CardTitle>
              <CardDescription className="text-muted-foreground">Current network protocol usage</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={protocolData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="protocol" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      color: 'hsl(var(--foreground))'
                    }} 
                  />
                  <Bar dataKey="count" fill="hsl(var(--chart-1))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Recent Network Alerts */}
          <Card className="bg-card/50 border-border backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-foreground">Network Security Alerts</CardTitle>
              <CardDescription className="text-muted-foreground">Recent network security events</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {alerts.map((alert) => (
                <Alert key={alert.id} className="border-border bg-card/50">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-foreground">{alert.description}</div>
                        <div className="text-sm text-muted-foreground">
                          {alert.type} from {alert.source} • {alert.timestamp}
                        </div>
                      </div>
                      <Badge className={`${getSeverityColor(alert.severity)} text-foreground`}>
                        {alert.severity}
                      </Badge>
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
              <Button variant="outline" className="w-full border-border text-muted-foreground hover:bg-muted">
                View All Network Events
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default NetworkMonitoring;