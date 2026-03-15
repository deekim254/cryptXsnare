import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';

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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

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

    const { action, target, reason, severity } = await req.json();

    console.log(`Automated response triggered: ${action} for ${target} by user ${authCheck.userId}`);

    let result;

    switch (action) {
      case 'block_ip':
        result = await blockIP(target, reason, severity);
        break;
      case 'quarantine_email':
        result = await quarantineEmail(target, reason, severity);
        break;
      case 'block_domain':
        result = await blockDomain(target, reason, severity);
        break;
      case 'auto_remediate':
        result = await autoRemediate(target, reason, severity);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    // Log the automated response
    const { error: logError } = await supabase
      .from('audit_logs')
      .insert({
        user_id: authCheck.userId,
        action: `automated_${action}`,
        resource_type: 'security_response',
        resource_id: target,
        details: {
          target,
          reason,
          severity,
          result,
          automated: true
        }
      });

    if (logError) {
      console.error('Failed to log automated response:', logError);
    }

    // Create alert for the automated action
    const { error: alertError } = await supabase
      .from('threat_alerts')
      .insert({
        title: `Automated ${action.replace('_', ' ')} executed`,
        description: `Automatically ${action.replace('_', ' ')} for ${target}. Reason: ${reason}`,
        type: 'system',
        severity: severity || 'medium',
        source_ip: target.includes('.') ? target : null,
        source_domain: !target.includes('.') ? target : null,
        created_by: authCheck.userId,
        metadata: {
          automated_response: true,
          original_target: target,
          action_taken: action,
          result
        }
      });

    if (alertError) {
      console.error('Failed to create alert:', alertError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        action,
        target,
        result,
        message: `Successfully executed ${action} for ${target}`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in automated response:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function blockIP(ip: string, reason: string, severity: string) {
  console.log(`Blocking IP: ${ip} - Reason: ${reason}`);
  
  // Simulate firewall rule creation
  const firewallRule = {
    id: `fw_${Date.now()}`,
    type: 'block_ip',
    target: ip,
    action: 'DROP',
    reason,
    created_at: new Date().toISOString(),
    status: 'active'
  };

  // In a real implementation, this would integrate with actual firewall APIs
  // (pfSense, iptables, cloud provider APIs, etc.)
  
  return {
    rule_id: firewallRule.id,
    status: 'blocked',
    method: 'firewall_rule',
    details: `IP ${ip} added to blacklist`
  };
}

async function quarantineEmail(emailId: string, reason: string, severity: string) {
  console.log(`Quarantining email: ${emailId} - Reason: ${reason}`);
  
  // Simulate email quarantine
  const quarantineAction = {
    id: `quar_${Date.now()}`,
    email_id: emailId,
    action: 'quarantine',
    reason,
    created_at: new Date().toISOString(),
    status: 'quarantined'
  };

  // In a real implementation, this would integrate with email security APIs
  // (Microsoft Defender, Proofpoint, etc.)
  
  return {
    quarantine_id: quarantineAction.id,
    status: 'quarantined',
    method: 'email_security_api',
    details: `Email ${emailId} moved to quarantine`
  };
}

async function blockDomain(domain: string, reason: string, severity: string) {
  console.log(`Blocking domain: ${domain} - Reason: ${reason}`);
  
  // Simulate DNS blocking
  const dnsBlock = {
    id: `dns_${Date.now()}`,
    domain,
    action: 'block',
    reason,
    created_at: new Date().toISOString(),
    status: 'blocked'
  };

  // In a real implementation, this would integrate with DNS security services
  // (OpenDNS, Cloudflare for Teams, Pi-hole API, etc.)
  
  return {
    block_id: dnsBlock.id,
    status: 'blocked',
    method: 'dns_block',
    details: `Domain ${domain} added to block list`
  };
}

async function autoRemediate(target: string, reason: string, severity: string) {
  console.log(`Auto-remediating: ${target} - Reason: ${reason}`);
  
  const actions = [];
  
  // Determine remediation actions based on severity and target type
  if (severity === 'critical' || severity === 'high') {
    if (target.match(/^\d+\.\d+\.\d+\.\d+$/)) {
      // IP address - block immediately
      actions.push(await blockIP(target, reason, severity));
    } else if (target.includes('@')) {
      // Email - quarantine
      actions.push(await quarantineEmail(target, reason, severity));
    } else {
      // Domain - block
      actions.push(await blockDomain(target, reason, severity));
    }
  }

  return {
    actions_taken: actions.length,
    details: actions,
    remediation_level: severity === 'critical' ? 'immediate' : 'standard'
  };
}