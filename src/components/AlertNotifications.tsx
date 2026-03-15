import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, Send, Slack, MessageSquare, Phone, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { threatService } from "@/services/threatService";

interface AlertNotificationsProps {
  alertId: string;
  alertTitle: string;
  alertSeverity: string;
  onClose?: () => void;
}

export function AlertNotifications({ alertId, alertTitle, alertSeverity, onClose }: AlertNotificationsProps) {
  const [loading, setLoading] = useState(false);
  const [enabledPlatforms, setEnabledPlatforms] = useState({
    slack: false,
    teams: false,
    twilio: false,
  });
  const [phoneNumber, setPhoneNumber] = useState("");
  const [teamsWebhook, setTeamsWebhook] = useState("");
  const [sentNotifications, setSentNotifications] = useState<string[]>([]);
  const { toast } = useToast();

  const handleSendNotifications = async () => {
    const selectedPlatforms = Object.entries(enabledPlatforms)
      .filter(([_, enabled]) => enabled)
      .map(([platform]) => platform);

    if (selectedPlatforms.length === 0) {
      toast({
        title: "No platforms selected",
        description: "Please select at least one notification platform",
        variant: "destructive",
      });
      return;
    }

    // Validate required fields
    if (enabledPlatforms.twilio && !phoneNumber) {
      toast({
        title: "Phone number required",
        description: "Please enter a phone number for SMS notifications",
        variant: "destructive",
      });
      return;
    }

    if (enabledPlatforms.teams && !teamsWebhook) {
      toast({
        title: "Teams webhook required", 
        description: "Please enter a Teams webhook URL",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const result = await threatService.sendAlertNotifications(alertId, selectedPlatforms, {
        phone_number: phoneNumber || undefined,
        teams_webhook_url: teamsWebhook || undefined,
      });

      if (result.success) {
        const successfulPlatforms = result.notifications_sent.map((n: any) => n.platform);
        setSentNotifications(successfulPlatforms);
        
        toast({
          title: "Notifications sent",
          description: `Alert sent to ${successfulPlatforms.join(', ')} successfully`,
        });

        if (result.errors && result.errors.length > 0) {
          toast({
            title: "Some notifications failed",
            description: result.errors.map((e: any) => `${e.platform}: ${e.error}`).join('. '),
            variant: "destructive",
          });
        }
      } else {
        throw new Error("Failed to send notifications");
      }
    } catch (error) {
      console.error('Error sending notifications:', error);
      toast({
        title: "Notification failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-destructive';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-warning';
      case 'low': return 'bg-chart-2';
      default: return 'bg-muted';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Send Alert Notifications
        </CardTitle>
        <CardDescription>
          Send this security alert to external platforms and team members
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Alert Summary */}
        <div className="p-3 rounded-lg border">
          <div className="flex items-center gap-2 mb-2">
            <Badge className={getSeverityColor(alertSeverity)}>
              {alertSeverity.toUpperCase()}
            </Badge>
            <span className="font-medium">{alertTitle}</span>
          </div>
          <p className="text-sm text-muted-foreground">Alert ID: {alertId}</p>
        </div>

        <Separator />

        <Tabs defaultValue="platforms" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="platforms">Platforms</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="platforms" className="space-y-4">
            <div className="space-y-4">
              {/* Slack */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Slack className="h-5 w-5 text-purple-600" />
                  <div>
                    <div className="font-medium">Slack</div>
                    <div className="text-sm text-muted-foreground">
                      Send to configured Slack channel
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {sentNotifications.includes('slack') && (
                    <CheckCircle className="h-4 w-4 text-success" />
                  )}
                  <Switch
                    checked={enabledPlatforms.slack}
                    onCheckedChange={(checked) => 
                      setEnabledPlatforms(prev => ({ ...prev, slack: checked }))
                    }
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Microsoft Teams */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-5 w-5 text-blue-600" />
                  <div>
                    <div className="font-medium">Microsoft Teams</div>
                    <div className="text-sm text-muted-foreground">
                      Send to Teams channel via webhook
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {sentNotifications.includes('teams') && (
                    <CheckCircle className="h-4 w-4 text-success" />
                  )}
                  <Switch
                    checked={enabledPlatforms.teams}
                    onCheckedChange={(checked) => 
                      setEnabledPlatforms(prev => ({ ...prev, teams: checked }))
                    }
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Twilio SMS */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-green-600" />
                  <div>
                    <div className="font-medium">SMS (Twilio)</div>
                    <div className="text-sm text-muted-foreground">
                      Send SMS alert to phone number
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {sentNotifications.includes('twilio') && (
                    <CheckCircle className="h-4 w-4 text-success" />
                  )}
                  <Switch
                    checked={enabledPlatforms.twilio}
                    onCheckedChange={(checked) => 
                      setEnabledPlatforms(prev => ({ ...prev, twilio: checked }))
                    }
                    disabled={loading}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            {/* Phone Number */}
            {enabledPlatforms.twilio && (
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1234567890"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  Include country code (e.g., +1 for US)
                </p>
              </div>
            )}

            {/* Teams Webhook */}
            {enabledPlatforms.teams && (
              <div className="space-y-2">
                <Label htmlFor="teams-webhook">Teams Webhook URL</Label>
                <Input
                  id="teams-webhook"
                  type="url"
                  placeholder="https://outlook.office.com/webhook/..."
                  value={teamsWebhook}
                  onChange={(e) => setTeamsWebhook(e.target.value)}
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  Get this from your Teams channel connector settings
                </p>
              </div>
            )}

            {!enabledPlatforms.twilio && !enabledPlatforms.teams && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  Enable SMS or Teams notifications to configure settings
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button 
            onClick={handleSendNotifications} 
            disabled={loading || Object.values(enabledPlatforms).every(v => !v)}
            className="flex-1"
          >
            <Send className="mr-2 h-4 w-4" />
            {loading ? "Sending..." : "Send Notifications"}
          </Button>
          {onClose && (
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          )}
        </div>

        {sentNotifications.length > 0 && (
          <div className="bg-success/10 p-3 rounded-lg">
            <p className="text-sm font-medium text-success">
              ✓ Notifications sent successfully to: {sentNotifications.join(', ')}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}