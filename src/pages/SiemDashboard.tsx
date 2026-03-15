import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, FolderOpen, BarChart3, FileText, AlertTriangle, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function SiemDashboard() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState({
    totalAlerts: 0,
    criticalAlerts: 0,
    activeCases: 0,
    lastCaseUpdate: null as string | null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuickMetrics();
  }, []);

  const fetchQuickMetrics = async () => {
    try {
      // Fetch alerts count
      const { count: alertsCount } = await supabase
        .from('alerts')
        .select('*', { count: 'exact', head: true });

      const { count: criticalCount } = await supabase
        .from('alerts')
        .select('*', { count: 'exact', head: true })
        .eq('severity', 'critical');

      // Fetch active cases
      const { data: cases } = await supabase
        .from('cases')
        .select('status, updated_at')
        .in('status', ['open', 'in_progress'])
        .order('updated_at', { ascending: false })
        .limit(1);

      setMetrics({
        totalAlerts: alertsCount || 0,
        criticalAlerts: criticalCount || 0,
        activeCases: cases?.length || 0,
        lastCaseUpdate: cases?.[0]?.updated_at || null,
      });
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const featureCards = [
    {
      title: "Alerts",
      description: "Monitor and respond to security threats in real-time",
      icon: AlertTriangle,
      iconColor: "text-destructive",
      bgColor: "bg-destructive/10",
      stats: [
        { label: "Total Alerts", value: metrics.totalAlerts },
        { label: "Critical", value: metrics.criticalAlerts },
      ],
      buttonText: "View Alerts",
      route: "/alerts",
    },
    {
      title: "Cases",
      description: "Track and manage security incident investigations",
      icon: FolderOpen,
      iconColor: "text-warning",
      bgColor: "bg-warning/10",
      stats: [
        { label: "Active Cases", value: metrics.activeCases },
        { label: "Last Update", value: metrics.lastCaseUpdate ? "Recent" : "N/A" },
      ],
      buttonText: "Open Cases",
      route: "/cases",
    },
    {
      title: "Metrics",
      description: "Analyze threat trends and system performance",
      icon: BarChart3,
      iconColor: "text-primary",
      bgColor: "bg-primary/10",
      stats: [
        { label: "Threat Trends", value: "Active" },
        { label: "Response Time", value: "< 5m" },
      ],
      buttonText: "View Metrics",
      route: "/dashboard",
    },
    {
      title: "Reports",
      description: "Generate and export security analysis reports",
      icon: FileText,
      iconColor: "text-accent",
      bgColor: "bg-accent/10",
      stats: [
        { label: "Available Reports", value: "Coming Soon" },
        { label: "Last Export", value: "N/A" },
      ],
      buttonText: "Generate Report",
      route: "/reports",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            SIEM Dashboard
          </h1>
          <p className="text-muted-foreground text-lg">
            Security Information and Event Management - Central Command Center
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
          {featureCards.map((card) => (
            <Card key={card.title} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className={`w-12 h-12 rounded-lg ${card.bgColor} flex items-center justify-center`}>
                      <card.icon className={`h-6 w-6 ${card.iconColor}`} />
                    </div>
                    <CardTitle className="text-2xl">{card.title}</CardTitle>
                    <CardDescription className="text-base">
                      {card.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Stats */}
                <div className="grid grid-cols-2 gap-4">
                  {card.stats.map((stat) => (
                    <div key={stat.label} className="space-y-1">
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                      <p className="text-2xl font-bold">
                        {loading ? (
                          <span className="animate-pulse">...</span>
                        ) : (
                          stat.value
                        )}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Action Button */}
                <Button
                  onClick={() => navigate(card.route)}
                  className="w-full"
                  size="lg"
                >
                  {card.buttonText}
                  <card.icon className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Info Banner */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <Clock className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">System Status: Operational</p>
                <p className="text-sm text-muted-foreground">
                  All SIEM modules are running and monitoring your infrastructure
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
