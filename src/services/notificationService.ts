import { supabase } from "@/integrations/supabase/client";

export interface NotificationPreferences {
  id?: string;
  user_id: string;
  email_enabled: boolean;
  slack_enabled: boolean;
  sms_enabled: boolean;
  slack_webhook_url?: string;
  phone_number?: string;
  notify_on_alert: boolean;
  notify_on_case_assigned: boolean;
  notify_on_case_updated: boolean;
}

class NotificationService {
  async getPreferences(): Promise<NotificationPreferences | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching notification preferences:', error);
      return null;
    }

    return data;
  }

  async updatePreferences(preferences: Partial<NotificationPreferences>): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Check if preferences exist
    const existing = await this.getPreferences();

    if (existing) {
      const { error } = await supabase
        .from('notification_preferences')
        .update(preferences)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating notification preferences:', error);
        return false;
      }
    } else {
      const { error } = await supabase
        .from('notification_preferences')
        .insert({
          user_id: user.id,
          ...preferences,
        });

      if (error) {
        console.error('Error creating notification preferences:', error);
        return false;
      }
    }

    return true;
  }

  async sendNotification(
    userId: string,
    title: string,
    message: string,
    type: 'alert' | 'case_assigned' | 'case_updated',
    metadata?: Record<string, any>
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase.functions.invoke('send-notification', {
        body: {
          user_id: userId,
          title,
          message,
          type,
          metadata,
        },
      });

      if (error) {
        console.error('Error sending notification:', error);
        return false;
      }

      console.log('Notification sent:', data);
      return true;
    } catch (error) {
      console.error('Failed to send notification:', error);
      return false;
    }
  }
}

export const notificationService = new NotificationService();