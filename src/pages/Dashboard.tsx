import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, AlertTriangle, FolderOpen, Activity, FileWarning } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BackendStatus } from "@/components/BackendStatus";
import { AlertsSummary } from "@/components/dashboard/AlertsSummary";
import { SeverityChart } from "@/components/dashboard/SeverityChart";
import { AlertsTimeSeriesChart } from "@/components/dashboard/AlertsTimeSeriesChart";
import { CaseTrendsChart } from "@/components/dashboard/CaseTrendsChart";
import { CaseStatusChart } from "@/components/dashboard/CaseStatusChart";
import { DEMO_MODE } from "@/lib/mockAuth";
import { mockDashboardMetrics } from "@/lib/mockData";

interface DashboardMetrics {
  kpis: {
    totalAlerts: number;
    criticalAlerts: number;
    activeCases: number;
    totalCases: number;
  };
  alertsTimeSeries: Array<{
    date: string;
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  }>;
  severityDistribution: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  caseStatusDistribution: {
    open: number;
    in_progress: number;
    resolved: number;
    closed: number;
  };
  casePriorityDistribution: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  caseTrends: Array<{
    date: string;
    open: number;
    closed: number;
    resolved: number;
  }>;
}

export default function Dashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardMetrics();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchDashboardMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardMetrics = async () => {
    try {
      if (DEMO_MODE) {
        setMetrics(mockDashboardMetrics);
        return;
      }
      const { data, error } = await supabase.functions.invoke('dashboard-metrics');
      if (error) throw error;
      setMetrics(data);
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
      // Fallback to mock data on any error
      setMetrics(mockDashboardMetrics);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">SIEM Dashboard</h1>
            <p className="text-muted-foreground">
              Real-time security metrics and analytics
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-2 animate-pulse" />
            <p className="text-muted-foreground">Loading dashboard metrics...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">SIEM Dashboard</h1>
            <p className="text-muted-foreground">
              Real-time security metrics and analytics
            </p>
          </div>
          <Button onClick={fetchDashboardMetrics} variant="outline">
            <Activity className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </div>
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <FileWarning className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">Failed to load dashboard metrics</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">SIEM Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time security metrics and analytics
          </p>
        </div>
        <Button onClick={fetchDashboardMetrics} variant="outline">
          <Activity className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Backend Status */}
      <BackendStatus />

      {/* Key Performance Indicators */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.kpis.totalAlerts}</div>
            <p className="text-xs text-muted-foreground">
              All security alerts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Alerts</CardTitle>
            <Shield className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{metrics.kpis.criticalAlerts}</div>
            <p className="text-xs text-muted-foreground">
              Immediate attention required
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Cases</CardTitle>
            <FolderOpen className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{metrics.kpis.activeCases}</div>
            <p className="text-xs text-muted-foreground">
              Open and in progress
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cases</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.kpis.totalCases}</div>
            <p className="text-xs text-muted-foreground">
              All tracked incidents
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Time Series Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <AlertsTimeSeriesChart data={metrics.alertsTimeSeries} />
        <CaseTrendsChart data={metrics.caseTrends} />
      </div>

      {/* Distribution Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <SeverityChart data={metrics.severityDistribution} />
        <CaseStatusChart data={metrics.caseStatusDistribution} />
      </div>

      {/* Recent Activity */}
      <AlertsSummary />
    </div>
  );
}