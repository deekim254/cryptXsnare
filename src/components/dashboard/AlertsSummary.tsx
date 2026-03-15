import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Shield, Clock, CheckCircle } from "lucide-react";
import { alertService, Alert } from "@/services/alertService";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

const severityColors = {
  low: 'bg-green-500',
  medium: 'bg-yellow-500', 
  high: 'bg-orange-500',
  critical: 'bg-red-500'
};

const statusColors = {
  open: 'bg-red-100 text-red-800',
  acknowledged: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-800'
};

export function AlertsSummary() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadRecentAlerts();
  }, []);

  const loadRecentAlerts = async () => {
    try {
      setLoading(true);
      const response = await alertService.listAlerts({ limit: 5 });
      setAlerts(response.alerts);
    } catch (error) {
      console.error('Error loading alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const criticalCount = alerts.filter(a => a.severity === 'critical' && a.status === 'open').length;
  const openCount = alerts.filter(a => a.status === 'open').length;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Recent Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Recent Alerts
          </div>
          <div className="flex gap-2">
            {criticalCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {criticalCount} Critical
              </Badge>
            )}
            {openCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {openCount} Open
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {alerts.length > 0 ? (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div key={alert.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${severityColors[alert.severity]}`} />
                  <div>
                    <p className="font-medium text-sm">{alert.source}</p>
                    <p className="text-xs text-muted-foreground">{alert.type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`${statusColors[alert.status]} text-xs`}>
                    {alert.status === 'open' && <AlertTriangle className="h-3 w-3 mr-1" />}
                    {alert.status === 'acknowledged' && <Clock className="h-3 w-3 mr-1" />}
                    {alert.status === 'resolved' && <CheckCircle className="h-3 w-3 mr-1" />}
                    {alert.status.replace('_', ' ')}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
            ))}
            <div className="pt-2">
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={() => navigate('/alerts')}
              >
                View All Alerts
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">No recent alerts</p>
            <Button 
              variant="outline" 
              className="mt-2" 
              onClick={() => navigate('/alerts')}
            >
              Manage Alerts
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}