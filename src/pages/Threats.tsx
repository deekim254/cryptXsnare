import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, Shield, Filter, Download, Eye, CheckCircle2, Clock, User, Globe, Database } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getThreats } from "../api";

/* 
// Removed duplicate default export ThreatsPage to resolve redeclaration error.
// If you need this component, move it to a separate file or export it as a named export.
*/

interface ThreatAlert {
  id: string;
  type: string;
  severity: string;
  status: string;
  title: string;  
  description: string | null;
  source_ip: unknown;
  source_domain: string | null;
  source_url: string | null;
  indicators: any;
  metadata: any;
  assigned_to: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export default function Threats() {
  const [alerts, setAlerts] = useState<ThreatAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    severity: 'all',
    status: 'all',
    type: 'all',
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAlert, setSelectedAlert] = useState<ThreatAlert | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();


  const fetchAlerts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('threat_alerts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAlerts(data || []);
    } catch (error) {
      console.error('Error fetching alerts:', error);
      toast({
        title: "Error loading alerts",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const updateAlertStatus = async (alertId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('threat_alerts')
        .update({ 
          status: newStatus as 'open' | 'investigating' | 'resolved' | 'false_positive',
          updated_at: new Date().toISOString()
        })
        .eq('id', alertId);

      if (error) throw error;

      setAlerts(prev => prev.map(alert => 
        alert.id === alertId 
          ? { ...alert, status: newStatus, updated_at: new Date().toISOString() }
          : alert
      ));

      toast({
        title: "Alert updated",
        description: `Status changed to ${newStatus}`,
      });
    } catch (error) {
      console.error('Error updating alert:', error);
      toast({
        title: "Error updating alert",
        variant: "destructive",
      });
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    const matchesSearch = searchTerm === "" || 
      alert.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.source_domain?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSeverity = filter.severity === 'all' || alert.severity === filter.severity;
    const matchesStatus = filter.status === 'all' || alert.status === filter.status;
    const matchesType = filter.type === 'all' || alert.type === filter.type;
    
    return matchesSearch && matchesSeverity && matchesStatus && matchesType;
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'bg-muted';
      case 'medium': return 'bg-warning';
      case 'high': return 'bg-orange-500';
      case 'critical': return 'bg-destructive';
      default: return 'bg-muted';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-destructive';
      case 'investigating': return 'bg-warning';
      case 'resolved': return 'bg-success';
      case 'false_positive': return 'bg-muted';
      default: return 'bg-muted';
    }
  };

  const exportAlerts = () => {
    const csv = [
      ['ID', 'Type', 'Severity', 'Status', 'Title', 'Description', 'Source', 'Created'],
      ...filteredAlerts.map(alert => [
        alert.id,
        alert.type,
        alert.severity,
        alert.status,
        alert.title,
        alert.description || '',
        alert.source_domain || alert.source_ip || alert.source_url || '',
        alert.created_at
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `threat-alerts-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export completed",
      description: `${filteredAlerts.length} alerts exported to CSV`,
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Threat Alerts</h1>
          <p className="text-muted-foreground">
            Monitor and manage security alerts and incidents
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportAlerts}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button onClick={fetchAlerts}>
            <Shield className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            <Input
              placeholder="Search alerts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Select value={filter.severity} onValueChange={(value) => setFilter(prev => ({ ...prev, severity: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filter.status} onValueChange={(value) => setFilter(prev => ({ ...prev, status: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="investigating">Investigating</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="false_positive">False Positive</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filter.type} onValueChange={(value) => setFilter(prev => ({ ...prev, type: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="url">URL</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="network">Network</SelectItem>
                <SelectItem value="file">File</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              onClick={() => {
                setFilter({ severity: 'all', status: 'all', type: 'all' });
                setSearchTerm("");
              }}
            >
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Alerts List */}
      <Card>
        <CardHeader>
          <CardTitle>
            Security Alerts ({filteredAlerts.length})
          </CardTitle>
          <CardDescription>
            Recent threat detections and security incidents
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading alerts...</p>
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No alerts found matching your criteria</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAlerts.map((alert) => (
                <div key={alert.id} className="flex items-start justify-between p-4 rounded-lg border">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="flex gap-2">
                      <Badge className={getSeverityColor(alert.severity)}>
                        {alert.severity.toUpperCase()}
                      </Badge>
                      <Badge className={getStatusColor(alert.status)}>
                        {alert.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                      <Badge variant="outline">
                        {alert.type.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{alert.title}</h3>
                      {alert.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {alert.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        {alert.source_domain && (
                          <span>Domain: {alert.source_domain}</span>
                        )}
                        {alert.source_ip && (
                          <span>IP: {String(alert.source_ip)}</span>
                        )}
                        {alert.source_url && (
                          <span>URL: {alert.source_url}</span>
                        )}
                        <span>
                          {new Date(alert.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setSelectedAlert(alert);
                        setDialogOpen(true);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {alert.status === 'open' && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => updateAlertStatus(alert.id, 'investigating')}
                      >
                        Investigate
                      </Button>
                    )}
                    {alert.status === 'investigating' && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => updateAlertStatus(alert.id, 'resolved')}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Resolve
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alert Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Threat Alert Details
            </DialogTitle>
            <DialogDescription>
              Comprehensive view of the security alert and investigation details
            </DialogDescription>
          </DialogHeader>
          
          {selectedAlert && (
            <div className="space-y-6">
              {/* Header Info */}
              <div className="grid gap-4">
                <div className="flex items-center gap-2">
                  <Badge className={getSeverityColor(selectedAlert.severity)}>
                    {selectedAlert.severity.toUpperCase()}
                  </Badge>
                  <Badge className={getStatusColor(selectedAlert.status)}>
                    {selectedAlert.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                  <Badge variant="outline">
                    {selectedAlert.type.toUpperCase()}
                  </Badge>
                </div>
                <h2 className="text-xl font-semibold">{selectedAlert.title}</h2>
                {selectedAlert.description && (
                  <p className="text-muted-foreground">{selectedAlert.description}</p>
                )}
              </div>

              <Separator />

              {/* Source Information */}
              <div className="space-y-3">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Source Information
                </h3>
                <div className="grid gap-2 text-sm">
                  {selectedAlert.source_domain && (
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Domain:</span>
                      <span className="font-mono bg-muted px-2 py-1 rounded">{selectedAlert.source_domain}</span>
                    </div>
                  )}
                  {selectedAlert.source_ip && (
                    <div className="flex items-center gap-2">
                      <span className="font-medium">IP Address:</span>
                      <span className="font-mono bg-muted px-2 py-1 rounded">{String(selectedAlert.source_ip)}</span>
                    </div>
                  )}
                  {selectedAlert.source_url && (
                    <div className="flex items-center gap-2">
                      <span className="font-medium">URL:</span>
                      <span className="font-mono bg-muted px-2 py-1 rounded text-xs break-all">{selectedAlert.source_url}</span>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Indicators of Compromise */}
              {selectedAlert.indicators && (
                <>
                  <div className="space-y-3">
                    <h3 className="text-lg font-medium flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      Indicators of Compromise
                    </h3>
                    <div className="bg-muted p-4 rounded-lg">
                      <pre className="text-sm whitespace-pre-wrap font-mono">
                        {JSON.stringify(selectedAlert.indicators, null, 2)}
                      </pre>
                    </div>
                  </div>
                  <Separator />
                </>
              )}

              {/* Metadata */}
              {selectedAlert.metadata && (
                <>
                  <div className="space-y-3">
                    <h3 className="text-lg font-medium flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      Additional Metadata
                    </h3>
                    <div className="bg-muted p-4 rounded-lg">
                      <pre className="text-sm whitespace-pre-wrap font-mono">
                        {JSON.stringify(selectedAlert.metadata, null, 2)}
                      </pre>
                    </div>
                  </div>
                  <Separator />
                </>
              )}

              {/* Timeline */}
              <div className="space-y-3">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Timeline
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">Created:</span>
                    <span>{new Date(selectedAlert.created_at).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">Last Updated:</span>
                    <span>{new Date(selectedAlert.updated_at).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Assignment Info */}
              <div className="space-y-3">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Assignment & Attribution
                </h3>
                <div className="space-y-2">
                  {selectedAlert.assigned_to && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium">Assigned to:</span>
                      <span>{selectedAlert.assigned_to}</span>
                    </div>
                  )}
                  {selectedAlert.created_by && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium">Created by:</span>
                      <span>{selectedAlert.created_by}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">Alert ID:</span>
                    <span className="font-mono bg-muted px-2 py-1 rounded text-xs">{selectedAlert.id}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4">
                {selectedAlert.status === 'open' && (
                  <Button 
                    onClick={() => {
                      updateAlertStatus(selectedAlert.id, 'investigating');
                      setSelectedAlert({...selectedAlert, status: 'investigating'});
                    }}
                  >
                    Start Investigation
                  </Button>
                )}
                {selectedAlert.status === 'investigating' && (
                  <Button 
                    onClick={() => {
                      updateAlertStatus(selectedAlert.id, 'resolved');
                      setDialogOpen(false);
                    }}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Mark as Resolved
                  </Button>
                )}
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