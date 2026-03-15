import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, AlertCircle, CheckCircle, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { threatService } from "@/services/threatService";

interface BackendHealth {
  status: 'healthy' | 'error' | 'checking';
  message?: string;
  apis?: {
    virustotal: boolean;
    abuseipdb: boolean;
    otx: boolean;
    shodan: boolean;
  };
  last_check?: string;
}

export function BackendStatus() {
  const [health, setHealth] = useState<BackendHealth>({ status: 'checking' });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const checkHealth = async () => {
    setLoading(true);
    try {
      const result = await threatService.getHealthStatus();
      setHealth({
        status: result.status === 'healthy' ? 'healthy' : 'error',
        message: result.message,
        apis: result.apis,
        last_check: new Date().toLocaleString(),
      });
    } catch (error) {
      setHealth({
        status: 'error',
        message: 'Backend unavailable - using offline mode',
        last_check: new Date().toLocaleString(),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
    // Check health every 5 minutes
    const interval = setInterval(checkHealth, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = () => {
    switch (health.status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'checking':
        return <Activity className="h-4 w-4 text-warning animate-pulse" />;
    }
  };

  const getStatusColor = () => {
    switch (health.status) {
      case 'healthy':
        return 'bg-success';
      case 'error':
        return 'bg-destructive';
      case 'checking':
        return 'bg-warning';
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            {getStatusIcon()}
            Backend Status
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={checkHealth}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </CardTitle>
        <CardDescription className="flex items-center justify-between">
          <span>FastAPI Threat Intelligence Backend</span>
          <Badge className={getStatusColor()}>
            {health.status.toUpperCase()}
          </Badge>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {health.message && (
          <p className="text-sm text-muted-foreground">{health.message}</p>
        )}
        
        {health.apis && (
          <div className="space-y-2">
            <p className="text-sm font-medium">API Integrations:</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center justify-between text-sm">
                <span>VirusTotal</span>
                <Badge variant={health.apis.virustotal ? "default" : "destructive"}>
                  {health.apis.virustotal ? "OK" : "ERROR"}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>AbuseIPDB</span>
                <Badge variant={health.apis.abuseipdb ? "default" : "destructive"}>
                  {health.apis.abuseipdb ? "OK" : "ERROR"}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>AlienVault OTX</span>
                <Badge variant={health.apis.otx ? "default" : "destructive"}>
                  {health.apis.otx ? "OK" : "ERROR"}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Shodan</span>
                <Badge variant={health.apis.shodan ? "default" : "destructive"}>
                  {health.apis.shodan ? "OK" : "ERROR"}
                </Badge>
              </div>
            </div>
          </div>
        )}
        
        {health.last_check && (
          <p className="text-xs text-muted-foreground">
            Last checked: {health.last_check}
          </p>
        )}
        
        {health.status === 'error' && (
          <div className="bg-muted p-3 rounded-lg">
            <p className="text-sm font-medium mb-1">Offline Mode Active</p>
            <p className="text-xs text-muted-foreground">
              The system is using demo data. Deploy the FastAPI backend from BACKEND_CODE.md for full functionality.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}