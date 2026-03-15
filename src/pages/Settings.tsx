import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings as SettingsIcon, Shield, Bell, Database, User, Key, Mail, MessageSquare, Smartphone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { PasswordLeakChecker } from "@/components/PasswordLeakChecker";
import { notificationService, NotificationPreferences } from "@/services/notificationService";

interface SystemSettings {
  retention_policy_days: number;
  alert_thresholds: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  email_notifications: {
    enabled: boolean;
    recipients: string[];
  };
  auto_quarantine: {
    enabled: boolean;
    threshold: number;
  };
}

export default function Settings() {
  const [settings, setSettings] = useState<SystemSettings>({
    retention_policy_days: 90,
    alert_thresholds: {
      low: 0.3,
      medium: 0.6,
      high: 0.8,
      critical: 0.9,
    },
    email_notifications: {
      enabled: true,
      recipients: [],
    },
    auto_quarantine: {
      enabled: false,
      threshold: 0.9,
    },
  });
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>({
    user_id: '',
    email_enabled: false,
    slack_enabled: false,
    sms_enabled: false,
    notify_on_alert: true,
    notify_on_case_assigned: true,
    notify_on_case_updated: false,
  });

  useEffect(() => {
    fetchSettings();
    fetchUserProfile();
    fetchNotificationPreferences();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*');

      if (error) throw error;

      const settingsMap: any = {};
      data?.forEach(setting => {
        settingsMap[setting.key] = setting.value;
      });

      setSettings({
        retention_policy_days: parseInt(settingsMap.retention_policy_days) || 90,
        alert_thresholds: settingsMap.alert_thresholds || {
          low: 0.3,
          medium: 0.6,
          high: 0.8,
          critical: 0.9,
        },
        email_notifications: settingsMap.email_notifications || {
          enabled: true,
          recipients: [],
        },
        auto_quarantine: settingsMap.auto_quarantine || {
          enabled: false,
          threshold: 0.9,
        },
      });
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        setUserProfile(profile);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const fetchNotificationPreferences = async () => {
    const prefs = await notificationService.getPreferences();
    if (prefs) {
      setNotificationPrefs(prefs);
    }
  };

  const saveNotificationPreferences = async () => {
    const success = await notificationService.updatePreferences(notificationPrefs);
    return success;
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const updates = [
        {
          key: 'retention_policy_days',
          value: settings.retention_policy_days.toString(),
          description: 'Number of days to retain threat data'
        },
        {
          key: 'alert_thresholds',
          value: settings.alert_thresholds,
          description: 'Threat score thresholds for alert severity'
        },
        {
          key: 'email_notifications',
          value: settings.email_notifications,
          description: 'Email notification settings'
        },
        {
          key: 'auto_quarantine',
          value: settings.auto_quarantine,
          description: 'Automatic quarantine settings'
        }
      ];

      for (const update of updates) {
        await supabase
          .from('system_settings')
          .upsert({
            key: update.key,
            value: update.value,
            description: update.description,
            updated_by: userProfile?.id,
          });
      }

      // Save notification preferences
      await saveNotificationPreferences();

      toast({
        title: "Settings saved",
        description: "Your changes have been applied successfully",
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error saving settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Configure system preferences and security settings
          </p>
        </div>
        <Button onClick={saveSettings} disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="password-scanner">Password Scanner</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Data Management
              </CardTitle>
              <CardDescription>
                Configure data retention and storage policies
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="retention">Data Retention Period (days)</Label>
                <Input
                  id="retention"
                  type="number"
                  value={settings.retention_policy_days}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    retention_policy_days: parseInt(e.target.value) || 90
                  }))}
                  min="1"
                  max="365"
                />
                <p className="text-sm text-muted-foreground">
                  How long to keep threat data and scan results
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Threat Detection
              </CardTitle>
              <CardDescription>
                Configure threat detection thresholds and response actions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-medium">Alert Thresholds</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="low-threshold">Low Risk Threshold</Label>
                    <Input
                      id="low-threshold"
                      type="number"
                      step="0.1"
                      min="0"
                      max="1"
                      value={settings.alert_thresholds.low}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        alert_thresholds: {
                          ...prev.alert_thresholds,
                          low: parseFloat(e.target.value) || 0.3
                        }
                      }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="medium-threshold">Medium Risk Threshold</Label>
                    <Input
                      id="medium-threshold"
                      type="number"
                      step="0.1"
                      min="0"
                      max="1"
                      value={settings.alert_thresholds.medium}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        alert_thresholds: {
                          ...prev.alert_thresholds,
                          medium: parseFloat(e.target.value) || 0.6
                        }
                      }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="high-threshold">High Risk Threshold</Label>
                    <Input
                      id="high-threshold"
                      type="number"
                      step="0.1"
                      min="0"
                      max="1"
                      value={settings.alert_thresholds.high}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        alert_thresholds: {
                          ...prev.alert_thresholds,
                          high: parseFloat(e.target.value) || 0.8
                        }
                      }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="critical-threshold">Critical Risk Threshold</Label>
                    <Input
                      id="critical-threshold"
                      type="number"
                      step="0.1"
                      min="0"
                      max="1"
                      value={settings.alert_thresholds.critical}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        alert_thresholds: {
                          ...prev.alert_thresholds,
                          critical: parseFloat(e.target.value) || 0.9
                        }
                      }))}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Automatic Response</h4>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="auto-quarantine">Auto Quarantine</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically quarantine threats above threshold
                    </p>
                  </div>
                  <Switch
                    id="auto-quarantine"
                    checked={settings.auto_quarantine.enabled}
                    onCheckedChange={(checked) => setSettings(prev => ({
                      ...prev,
                      auto_quarantine: {
                        ...prev.auto_quarantine,
                        enabled: checked
                      }
                    }))}
                  />
                </div>
                {settings.auto_quarantine.enabled && (
                  <div className="space-y-2">
                    <Label htmlFor="quarantine-threshold">Quarantine Threshold</Label>
                    <Input
                      id="quarantine-threshold"
                      type="number"
                      step="0.1"
                      min="0"
                      max="1"
                      value={settings.auto_quarantine.threshold}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        auto_quarantine: {
                          ...prev.auto_quarantine,
                          threshold: parseFloat(e.target.value) || 0.9
                        }
                      }))}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="password-scanner" className="space-y-6">
          <PasswordLeakChecker />
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          {/* Personal Notification Channels */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-primary" />
                  <CardTitle>Email Notifications</CardTitle>
                </div>
                <CardDescription>Receive notifications via email</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Label htmlFor="email-enabled">Enable Email Notifications</Label>
                  <Switch
                    id="email-enabled"
                    checked={notificationPrefs.email_enabled}
                    onCheckedChange={(checked) =>
                      setNotificationPrefs({ ...notificationPrefs, email_enabled: checked })
                    }
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  <CardTitle>Slack Notifications</CardTitle>
                </div>
                <CardDescription>Send alerts to Slack</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="slack-enabled">Enable Slack Notifications</Label>
                  <Switch
                    id="slack-enabled"
                    checked={notificationPrefs.slack_enabled}
                    onCheckedChange={(checked) =>
                      setNotificationPrefs({ ...notificationPrefs, slack_enabled: checked })
                    }
                  />
                </div>
                {notificationPrefs.slack_enabled && (
                  <div className="space-y-2">
                    <Label htmlFor="slack-webhook">Slack Webhook URL</Label>
                    <Input
                      id="slack-webhook"
                      type="url"
                      placeholder="https://hooks.slack.com/services/..."
                      value={notificationPrefs.slack_webhook_url || ''}
                      onChange={(e) =>
                        setNotificationPrefs({ ...notificationPrefs, slack_webhook_url: e.target.value })
                      }
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-primary" />
                  <CardTitle>SMS Notifications</CardTitle>
                </div>
                <CardDescription>Get text messages for alerts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="sms-enabled">Enable SMS Notifications</Label>
                  <Switch
                    id="sms-enabled"
                    checked={notificationPrefs.sms_enabled}
                    onCheckedChange={(checked) =>
                      setNotificationPrefs({ ...notificationPrefs, sms_enabled: checked })
                    }
                  />
                </div>
                {notificationPrefs.sms_enabled && (
                  <div className="space-y-2">
                    <Label htmlFor="phone-number">Phone Number</Label>
                    <Input
                      id="phone-number"
                      type="tel"
                      placeholder="+1234567890"
                      value={notificationPrefs.phone_number || ''}
                      onChange={(e) =>
                        setNotificationPrefs({ ...notificationPrefs, phone_number: e.target.value })
                      }
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Notification Events</CardTitle>
                <CardDescription>Choose which events trigger notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="notify-alert">New Alerts</Label>
                  <Switch
                    id="notify-alert"
                    checked={notificationPrefs.notify_on_alert}
                    onCheckedChange={(checked) =>
                      setNotificationPrefs({ ...notificationPrefs, notify_on_alert: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="notify-assigned">Case Assigned</Label>
                  <Switch
                    id="notify-assigned"
                    checked={notificationPrefs.notify_on_case_assigned}
                    onCheckedChange={(checked) =>
                      setNotificationPrefs({ ...notificationPrefs, notify_on_case_assigned: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="notify-updated">Case Updated</Label>
                  <Switch
                    id="notify-updated"
                    checked={notificationPrefs.notify_on_case_updated}
                    onCheckedChange={(checked) =>
                      setNotificationPrefs({ ...notificationPrefs, notify_on_case_updated: checked })
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* System Notification Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                System Notification Settings
              </CardTitle>
              <CardDescription>
                Configure system-wide notification preferences (admin only)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="system-email-notifications">System Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable system-wide email notifications
                  </p>
                </div>
                <Switch
                  id="system-email-notifications"
                  checked={settings.email_notifications.enabled}
                  onCheckedChange={(checked) => setSettings(prev => ({
                    ...prev,
                    email_notifications: {
                      ...prev.email_notifications,
                      enabled: checked
                    }
                  }))}
                />
              </div>
              
              {settings.email_notifications.enabled && (
                <div className="space-y-2">
                  <Label htmlFor="email-recipients">System Recipients</Label>
                  <Input
                    id="email-recipients"
                    placeholder="admin@company.com, security@company.com"
                    value={settings.email_notifications.recipients.join(', ')}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      email_notifications: {
                        ...prev.email_notifications,
                        recipients: e.target.value.split(',').map(email => email.trim()).filter(Boolean)
                      }
                    }))}
                  />
                  <p className="text-sm text-muted-foreground">
                    Comma-separated list of system admin email addresses
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                User Profile
              </CardTitle>
              <CardDescription>
                Manage your account information and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {userProfile && (
                <>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input value={userProfile.email} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input value={userProfile.full_name || ''} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Input value={userProfile.role} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Member Since</Label>
                    <Input value={new Date(userProfile.created_at).toLocaleDateString()} disabled />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}