import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  user_id: string;
  title: string;
  message: string;
  type: 'alert' | 'case_assigned' | 'case_updated';
  metadata?: Record<string, any>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { user_id, title, message, type, metadata } = await req.json() as NotificationRequest;

    console.log(`Sending notification to user ${user_id} - Type: ${type}`);

    // Get user preferences
    const { data: preferences, error: prefError } = await supabaseClient
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user_id)
      .single();

    if (prefError || !preferences) {
      console.log('No notification preferences found for user, skipping notifications');
      return new Response(
        JSON.stringify({ success: true, message: 'No preferences found, notifications skipped' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Check if user wants notifications for this type
    const shouldNotify = 
      (type === 'alert' && preferences.notify_on_alert) ||
      (type === 'case_assigned' && preferences.notify_on_case_assigned) ||
      (type === 'case_updated' && preferences.notify_on_case_updated);

    if (!shouldNotify) {
      console.log(`User has disabled notifications for type: ${type}`);
      return new Response(
        JSON.stringify({ success: true, message: 'Notifications disabled for this type' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const results = {
      email: null as any,
      slack: null as any,
      sms: null as any,
    };

    // Send Email
    if (preferences.email_enabled) {
      try {
        const { data: userData } = await supabaseClient.auth.admin.getUserById(user_id);
        if (userData?.user?.email) {
          const emailResult = await sendEmail(userData.user.email, title, message);
          results.email = { success: true, data: emailResult };
          console.log('Email sent successfully');
        }
      } catch (error) {
        console.error('Email sending failed:', error);
        results.email = { success: false, error: error.message };
      }
    }

    // Send Slack
    if (preferences.slack_enabled && preferences.slack_webhook_url) {
      try {
        const slackResult = await sendSlack(preferences.slack_webhook_url, title, message, metadata);
        results.slack = { success: true, data: slackResult };
        console.log('Slack notification sent successfully');
      } catch (error) {
        console.error('Slack sending failed:', error);
        results.slack = { success: false, error: error.message };
      }
    }

    // Send SMS
    if (preferences.sms_enabled && preferences.phone_number) {
      try {
        const smsResult = await sendSMS(preferences.phone_number, `${title}: ${message}`);
        results.sms = { success: true, data: smsResult };
        console.log('SMS sent successfully');
      } catch (error) {
        console.error('SMS sending failed:', error);
        results.sms = { success: false, error: error.message };
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error in send-notification function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

async function sendEmail(email: string, subject: string, body: string) {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (!resendApiKey) {
    console.log('RESEND_API_KEY not configured, skipping email');
    return { skipped: true };
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'SIEM Alerts <onboarding@resend.dev>',
      to: [email],
      subject: subject,
      html: `<h2>${subject}</h2><p>${body}</p>`,
    }),
  });

  if (!response.ok) {
    throw new Error(`Email API error: ${response.status}`);
  }

  return await response.json();
}

async function sendSlack(webhookUrl: string, title: string, message: string, metadata?: any) {
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: title,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: message,
          },
        },
        ...(metadata ? [{
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `\`\`\`${JSON.stringify(metadata, null, 2)}\`\`\``,
            },
          ],
        }] : []),
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Slack webhook error: ${response.status}`);
  }

  return { sent: true };
}

async function sendSMS(phoneNumber: string, message: string) {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const fromNumber = Deno.env.get('TWILIO_PHONE_NUMBER') || '+15005550006'; // Twilio test number

  if (!accountSid || !authToken) {
    console.log('Twilio credentials not configured, skipping SMS');
    return { skipped: true };
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      To: phoneNumber,
      From: fromNumber,
      Body: message.slice(0, 160), // SMS character limit
    }),
  });

  if (!response.ok) {
    throw new Error(`Twilio API error: ${response.status}`);
  }

  return await response.json();
}