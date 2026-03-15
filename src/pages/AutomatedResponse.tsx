import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Zap, Settings, Activity, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AutoResponse {
  id: string;
  name: string;
  enabled: boolean;
  trigger_conditions: any;
  actions: any[];
  last_triggered?: string;
  success_rate: number;
}

interface ResponseRule {
  condition: string;
  severity: string;
  action: string;
  target_type: string;
}

export default function AutomatedResponse() {
  const [loading, setLoading] = useState(true);
  const [autoResponses, setAutoResponses] = useState<AutoResponse[]>([]);
  const [newRule, setNewRule] = useState<ResponseRule>({
    condition: '',
    severity: 'medium',
    action: 'block_ip',
    target_type: 'ip'
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchAutoResponses();
  }, []);

  const fetchAutoResponses = async () => {
    setLoading(true);
    try {
      // Simulate fetching automated response configurations
      const mockResponses: AutoResponse[] = [
        {
          id: '1',
          name: 'Critical IP Blocking',
          enabled: true,
          trigger_conditions: {
            severity: ['critical'],
            type: ['network', 'malware'],
            confidence_threshold: 0.8
          },
          actions: [
            { type: 'block_ip', immediate: true },
            { type: 'alert_admin', method: 'slack' }
          ],
          last_triggered: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          success_rate: 94.2
        },
        {
          id: '2', 
          name: 'Phishing Email Quarantine',
          enabled: true,
          trigger_conditions: {
            type: ['phishing', 'email'],
            confidence_threshold: 0.7
          },
          actions: [
            { type: 'quarantine_email', immediate: true },
            { type: 'notify_user', method: 'email' }
          ],
          last_triggered: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          success_rate: 98.7
        },
        {
          id: '3',
          name: 'Malicious Domain Blocking',
          enabled: false,
          trigger_conditions: {
            type: ['malware', 'c2'],
            severity: ['high', 'critical'],
            confidence_threshold: 0.85
          },
          actions: [
            { type: 'block_domain', immediate: false },
            { type: 'investigate', assign_to: 'security_team' }
          ],
          last_triggered: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          success_rate: 89.3
        }
      ];

      setAutoResponses(mockResponses);
    } catch (error) {
      console.error('Error fetching auto responses:', error);
      toast({
        title: "Error loading automated responses",
        description: "Failed to fetch configuration data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleResponse = async (id: string, enabled: boolean) => {
    try {
      setAutoResponses(prev => 
        prev.map(resp => 
          resp.id === id ? { ...resp, enabled } : resp
        )
      );

      toast({
        title: enabled ? "Response enabled" : "Response disabled",
        description: `Automated response has been ${enabled ? 'activated' : 'deactivated'}`,
      });
    } catch (error) {
      console.error('Error toggling response:', error);
      toast({
        title: "Error",
        description: "Failed to update response configuration",
        variant: "destructive",
      });
    }
  };

  const testResponse = async (responseId: string) => {
    try {
      const response = autoResponses.find(r => r.id === responseId);
      if (!response) return;

      // Simulate testing automated response
      await new Promise(resolve => setTimeout(resolve, 2000));

      toast({
        title: "Test completed",
        description: `${response.name} executed successfully in test mode`,
      });
    } catch (error) {
      console.error('Error testing response:', error);
      toast({
        title: "Test failed",
        description: "Failed to execute test response",
        variant: "destructive",
      });
    }
  };

  const createNewRule = async () => {
    try {
      if (!newRule.condition) {
        toast({
          title: "Validation error",
          description: "Please specify trigger condition",
          variant: "destructive",
        });
        return;
      }

      const newResponse: AutoResponse = {
        id: Date.now().toString(),
        name: `${newRule.action.replace('_', ' ')} for ${newRule.severity} ${newRule.target_type}`,
        enabled: false,
        trigger_conditions: {
          severity: [newRule.severity],
          target_type: [newRule.target_type],
          custom_condition: newRule.condition
        },
        actions: [{ type: newRule.action }],
        success_rate: 0
      };

      setAutoResponses(prev => [...prev, newResponse]);
      setNewRule({ condition: '', severity: 'medium', action: 'block_ip', target_type: 'ip' });

      toast({
        title: "Rule created",
        description: "New automated response rule has been added",
      });
    } catch (error) {
      console.error('Error creating rule:', error);
      toast({
        title: "Error",
        description: "Failed to create new response rule",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading automated responses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Automated Response</h1>
          <p className="text-muted-foreground">
            Configure automated security responses and incident remediation
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
        </div>
      </div>

      {/* Active Responses Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Rules</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{autoResponses.filter(r => r.enabled).length}</div>
            <p className="text-xs text-muted-foreground">
              Out of {autoResponses.length} total rules
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Actions</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-muted-foreground">
              In the last 24 hours
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">96.8%</div>
            <p className="text-xs text-muted-foreground">
              Average across all rules
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Blocked Threats</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">187</div>
            <p className="text-xs text-muted-foreground">
              Automatically blocked today
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="rules" className="space-y-4">
        <TabsList>
          <TabsTrigger value="rules">Response Rules</TabsTrigger>
          <TabsTrigger value="create">Create Rule</TabsTrigger>
          <TabsTrigger value="history">Action History</TabsTrigger>
        </TabsList>

        {/* Response Rules */}
        <TabsContent value="rules" className="space-y-4">
          <div className="space-y-4">
            {autoResponses.map((response) => (
              <Card key={response.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {response.name}
                        <Badge variant={response.enabled ? "default" : "secondary"}>
                          {response.enabled ? "Active" : "Disabled"}
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        Success rate: {response.success_rate}% • 
                        Last triggered: {response.last_triggered ? 
                          new Date(response.last_triggered).toLocaleString() : 'Never'
                        }
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => testResponse(response.id)}
                      >
                        Test
                      </Button>
                      <Switch
                        checked={response.enabled}
                        onCheckedChange={(enabled) => toggleResponse(response.id, enabled)}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Trigger Conditions</h4>
                      <div className="space-y-1 text-sm">
                        {response.trigger_conditions.severity && (
                          <p>Severity: {response.trigger_conditions.severity.join(', ')}</p>
                        )}
                        {response.trigger_conditions.type && (
                          <p>Types: {response.trigger_conditions.type.join(', ')}</p>
                        )}
                        {response.trigger_conditions.confidence_threshold && (
                          <p>Min Confidence: {response.trigger_conditions.confidence_threshold * 100}%</p>
                        )}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Actions</h4>
                      <div className="space-y-1">
                        {response.actions.map((action, idx) => (
                          <Badge key={idx} variant="outline" className="mr-1">
                            {action.type.replace('_', ' ')}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Create Rule */}
        <TabsContent value="create" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create New Response Rule</CardTitle>
              <CardDescription>
                Configure automated actions based on threat conditions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="condition">Trigger Condition</Label>
                  <Input
                    id="condition"
                    placeholder="e.g., threat_score > 0.8"
                    value={newRule.condition}
                    onChange={(e) => setNewRule({ ...newRule, condition: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Severity Level</Label>
                  <Select value={newRule.severity} onValueChange={(value) => 
                    setNewRule({ ...newRule, severity: value })
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Response Action</Label>
                  <Select value={newRule.action} onValueChange={(value) => 
                    setNewRule({ ...newRule, action: value })
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="block_ip">Block IP Address</SelectItem>
                      <SelectItem value="quarantine_email">Quarantine Email</SelectItem>
                      <SelectItem value="block_domain">Block Domain</SelectItem>
                      <SelectItem value="auto_remediate">Auto Remediate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Target Type</Label>
                  <Select value={newRule.target_type} onValueChange={(value) => 
                    setNewRule({ ...newRule, target_type: value })
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ip">IP Address</SelectItem>
                      <SelectItem value="domain">Domain</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="url">URL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={createNewRule} className="w-full">
                <Shield className="mr-2 h-4 w-4" />
                Create Response Rule
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Action History */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Automated Actions</CardTitle>
              <CardDescription>
                History of automated responses and their outcomes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  {
                    timestamp: new Date(Date.now() - 30 * 60 * 1000),
                    action: 'Blocked IP',
                    target: '192.168.1.100',
                    rule: 'Critical IP Blocking',
                    status: 'Success'
                  },
                  {
                    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
                    action: 'Quarantined Email',
                    target: 'phishing@malicious.com',
                    rule: 'Phishing Email Quarantine',
                    status: 'Success'
                  },
                  {
                    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
                    action: 'Domain Block',
                    target: 'malicious-domain.com',
                    rule: 'Malicious Domain Blocking',
                    status: 'Failed'
                  }
                ].map((action, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        action.status === 'Success' ? 'bg-green-500' : 'bg-red-500'
                      }`}></div>
                      <div>
                        <p className="font-medium">{action.action}: {action.target}</p>
                        <p className="text-sm text-muted-foreground">
                          Rule: {action.rule} • {action.timestamp.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <Badge variant={action.status === 'Success' ? 'default' : 'destructive'}>
                      {action.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}