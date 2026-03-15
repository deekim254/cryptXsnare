import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Authorization helper
async function checkUserRole(supabase: any, authHeader: string | null, requiredRoles: string[]) {
  if (!authHeader) {
    return { authorized: false, error: 'Missing authorization header' };
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  
  if (userError || !user) {
    return { authorized: false, error: 'Invalid token' };
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return { authorized: false, error: 'User profile not found' };
  }

  if (!requiredRoles.includes(profile.role)) {
    return { authorized: false, error: 'Insufficient permissions' };
  }

  return { authorized: true, userId: user.id, role: profile.role };
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

async function sendSlackAlert(alert: any) {
  const slackWebhookUrl = Deno.env.get('SLACK_WEBHOOK_URL');
  
  if (!slackWebhookUrl) {
    throw new Error('Slack webhook URL not configured');
  }

  const color = {
    'low': '#36a64f',      // green
    'medium': '#ff9900',   // orange  
    'high': '#ff6b6b',     // red
    'critical': '#dc143c'   // dark red
  }[alert.severity] || '#808080';

  const slackMessage = {
    text: `🚨 Security Alert: ${alert.title}`,
    attachments: [{
      color: color,
      fields: [
        {
          title: 'Severity',
          value: alert.severity.toUpperCase(),
          short: true
        },
        {
          title: 'Type',
          value: alert.type.toUpperCase(),
          short: true
        },
        {
          title: 'Description',
          value: alert.description,
          short: false
        },
        {
          title: 'Source',
          value: alert.source_domain || alert.source_ip || alert.source_url || 'Unknown',
          short: true
        },
        {
          title: 'Time',
          value: new Date(alert.created_at).toLocaleString(),
          short: true
        }
      ],
      footer: 'Phishing Detection System',
      ts: Math.floor(new Date(alert.created_at).getTime() / 1000)
    }]
  };

  const response = await fetch(slackWebhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(slackMessage)
  });

  if (!response.ok) {
    throw new Error(`Slack API error: ${response.status}`);
  }

  return { success: true, platform: 'slack' };
}

async function sendTwilioSMS(alert: any, phoneNumber: string) {
  const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const twilioToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  
  if (!twilioSid || !twilioToken) {
    throw new Error('Twilio credentials not configured');
  }

  const message = `🚨 SECURITY ALERT (${alert.severity.toUpperCase()})\n` +
                 `${alert.title}\n` +
                 `Type: ${alert.type}\n` +
                 `${alert.description}\n` +
                 `Time: ${new Date(alert.created_at).toLocaleString()}`;

  // In production, use actual Twilio from phone number
  const fromNumber = '+1234567890'; // Replace with your Twilio number
  
  const formData = new FormData();
  formData.append('To', phoneNumber);
  formData.append('From', fromNumber);
  formData.append('Body', message.substring(0, 1600)); // SMS limit

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + btoa(`${twilioSid}:${twilioToken}`),
    },
    body: formData
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Twilio API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return { success: true, platform: 'twilio', message_sid: data.sid };
}

async function sendTeamsAlert(alert: any, teamsWebhookUrl: string) {
  const color = {
    'low': 'good',
    'medium': 'warning',
    'high': 'attention',
    'critical': 'attention'
  }[alert.severity] || 'default';

  const teamsMessage = {
    "@type": "MessageCard",
    "@context": "https://schema.org/extensions",
    "summary": `Security Alert: ${alert.title}`,
    "themeColor": color === 'good' ? '00FF00' : color === 'warning' ? 'FFA500' : 'FF0000',
    "sections": [{
      "activityTitle": `🚨 ${alert.title}`,
      "activitySubtitle": `Severity: ${alert.severity.toUpperCase()} | Type: ${alert.type.toUpperCase()}`,
      "facts": [
        {
          "name": "Description",
          "value": alert.description
        },
        {
          "name": "Source", 
          "value": alert.source_domain || alert.source_ip || alert.source_url || 'Unknown'
        },
        {
          "name": "Time",
          "value": new Date(alert.created_at).toLocaleString()
        }
      ],
      "markdown": true
    }]
  };

  const response = await fetch(teamsWebhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(teamsMessage)
  });

  if (!response.ok) {
    throw new Error(`Teams API error: ${response.status}`);
  }

  return { success: true, platform: 'teams' };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check authorization - require analyst or admin role
    const authHeader = req.headers.get('authorization');
    const authCheck = await checkUserRole(supabase, authHeader, ['admin', 'analyst']);
    
    if (!authCheck.authorized) {
      return new Response(
        JSON.stringify({ error: authCheck.error }),
        { 
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { alert_id, platforms, phone_number, teams_webhook_url } = await req.json();
    
    if (!alert_id) {
      throw new Error('Alert ID is required');
    }

    console.log(`Processing alert integrations for alert: ${alert_id} by user ${authCheck.userId}`);

    // Fetch alert from database
    const { data: alert, error } = await supabase
      .from('threat_alerts')
      .select('*')
      .eq('id', alert_id)
      .single();

    if (error || !alert) {
      throw new Error('Alert not found');
    }

    const results = [];
    const errors = [];

    // Send to requested platforms
    if (platforms.includes('slack')) {
      try {
        const result = await sendSlackAlert(alert);
        results.push(result);
      } catch (error) {
        console.error('Slack notification failed:', error);
        errors.push({ platform: 'slack', error: error.message });
      }
    }

    if (platforms.includes('twilio') && phone_number) {
      try {
        const result = await sendTwilioSMS(alert, phone_number);
        results.push(result);
      } catch (error) {
        console.error('Twilio SMS failed:', error);
        errors.push({ platform: 'twilio', error: error.message });
      }
    }

    if (platforms.includes('teams') && teams_webhook_url) {
      try {
        const result = await sendTeamsAlert(alert, teams_webhook_url);
        results.push(result);
      } catch (error) {
        console.error('Teams notification failed:', error);
        errors.push({ platform: 'teams', error: error.message });
      }
    }

    // Update alert with notification status
    await supabase
      .from('threat_alerts')
      .update({
        metadata: {
          ...alert.metadata,
          notifications_sent: {
            timestamp: new Date().toISOString(),
            platforms: results.map(r => r.platform),
            errors: errors
          }
        }
      })
      .eq('id', alert_id);

    console.log(`Alert notifications completed. Successful: ${results.length}, Failed: ${errors.length}`);

    return new Response(JSON.stringify({
      alert_id: alert_id,
      notifications_sent: results,
      errors: errors,
      success: results.length > 0
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in alert integrations:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});