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
    const otxApiKey = Deno.env.get('OTX_API_KEY');
    const abuseApiKey = Deno.env.get('ABUSEIPDB_API_KEY');
    
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
    
    const { action, indicators } = await req.json();

    console.log(`Threat intelligence action: ${action} for ${indicators?.length || 0} indicators by user ${authCheck.userId}`);

    let result;

    switch (action) {
      case 'enrich_indicators':
        result = await enrichIndicators(indicators, otxApiKey, abuseApiKey);
        break;
      case 'correlate_threats':
        result = await correlateThreats(supabase);
        break;
      case 'update_feeds':
        result = await updateThreatFeeds(supabase, otxApiKey, abuseApiKey);
        break;
      case 'analyze_patterns':
        result = await analyzePatterns(supabase);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    // Store enriched intelligence
    if (result.enrichedData) {
      for (const intel of result.enrichedData) {
        const { error } = await supabase
          .from('threat_intelligence')
          .upsert({
            indicator_value: intel.indicator,
            indicator_type: intel.type,
            threat_type: intel.threat_type,
            source: intel.source,
            confidence_score: intel.confidence,
            first_seen: intel.first_seen,
            last_seen: intel.last_seen,
            metadata: intel.metadata
          }, {
            onConflict: 'indicator_value,indicator_type'
          });

        if (error) {
          console.error('Failed to store threat intelligence:', error);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        action,
        result
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in threat intelligence:', error);
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

async function enrichIndicators(indicators: any[], otxApiKey?: string, abuseApiKey?: string) {
  console.log(`Enriching ${indicators.length} indicators`);
  
  const enrichedData = [];

  for (const indicator of indicators) {
    try {
      let enrichment: any = {
        indicator: indicator.value,
        type: indicator.type,
        source: 'multiple',
        confidence: 0.5,
        threat_type: 'unknown',
        first_seen: new Date().toISOString(),
        last_seen: new Date().toISOString(),
        metadata: {}
      };

      // OTX enrichment
      if (otxApiKey && (indicator.type === 'ip' || indicator.type === 'domain' || indicator.type === 'url')) {
        const otxData = await getOTXIntelligence(indicator.value, indicator.type, otxApiKey);
        if (otxData) {
          enrichment.confidence = Math.max(enrichment.confidence, otxData.confidence);
          enrichment.threat_type = otxData.threat_type || enrichment.threat_type;
          enrichment.metadata.otx = otxData;
        }
      }

      // AbuseIPDB enrichment for IPs
      if (abuseApiKey && indicator.type === 'ip') {
        const abuseData = await getAbuseIPDBIntelligence(indicator.value, abuseApiKey);
        if (abuseData) {
          enrichment.confidence = Math.max(enrichment.confidence, abuseData.confidence);
          enrichment.threat_type = abuseData.threat_type || enrichment.threat_type;
          enrichment.metadata.abuseipdb = abuseData;
        }
      }

      // Pattern-based analysis
      const patternAnalysis = analyzeIndicatorPatterns(indicator.value, indicator.type);
      enrichment.metadata.patterns = patternAnalysis;
      enrichment.confidence = Math.max(enrichment.confidence, patternAnalysis.confidence);

      enrichedData.push(enrichment);

    } catch (error) {
      console.error(`Failed to enrich indicator ${indicator.value}:`, error);
    }
  }

  return {
    enrichedData,
    summary: {
      total: indicators.length,
      enriched: enrichedData.length,
      high_confidence: enrichedData.filter(e => e.confidence > 0.7).length
    }
  };
}

async function getOTXIntelligence(indicator: string, type: string, apiKey: string) {
  try {
    const endpoint = type === 'ip' ? 'IPv4' : type === 'domain' ? 'hostname' : 'url';
    const response = await fetch(
      `https://otx.alienvault.com/api/v1/indicators/${endpoint}/${encodeURIComponent(indicator)}/general`,
      {
        headers: {
          'X-OTX-API-KEY': apiKey
        }
      }
    );

    if (!response.ok) {
      throw new Error(`OTX API error: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      confidence: data.pulse_info?.count > 0 ? 0.8 : 0.3,
      threat_type: data.type_title || 'unknown',
      pulse_count: data.pulse_info?.count || 0,
      first_seen: data.first_seen,
      last_seen: data.last_seen,
      tags: data.pulse_info?.pulses?.slice(0, 5).map((p: any) => p.name) || []
    };
  } catch (error) {
    console.error('OTX lookup error:', error);
    return null;
  }
}

async function getAbuseIPDBIntelligence(ip: string, apiKey: string) {
  try {
    const response = await fetch(
      `https://api.abuseipdb.com/api/v2/check?ipAddress=${ip}&maxAgeInDays=90&verbose`,
      {
        headers: {
          'Key': apiKey,
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`AbuseIPDB API error: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      confidence: data.data.abuseConfidencePercentage > 50 ? 0.9 : 0.4,
      threat_type: data.data.usageType || 'unknown',
      abuse_confidence: data.data.abuseConfidencePercentage,
      country: data.data.countryCode,
      isp: data.data.isp,
      total_reports: data.data.totalReports,
      last_reported: data.data.lastReportedAt
    };
  } catch (error) {
    console.error('AbuseIPDB lookup error:', error);
    return null;
  }
}

function analyzeIndicatorPatterns(indicator: string, type: string) {
  let confidence = 0.1;
  const patterns = [];

  if (type === 'ip') {
    // Check for suspicious IP patterns
    if (indicator.match(/^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.)/)) {
      patterns.push('private_ip');
      confidence = 0.2;
    } else if (indicator.match(/^(127\.|0\.)/)) {
      patterns.push('localhost_ip');
      confidence = 0.1;
    } else {
      patterns.push('public_ip');
      confidence = 0.5;
    }
  } else if (type === 'domain') {
    // Check for suspicious domain patterns
    if (indicator.match(/\d+\.\d+\.\d+\.\d+/)) {
      patterns.push('ip_as_domain');
      confidence = 0.7;
    } else if (indicator.includes('bit.ly') || indicator.includes('tinyurl') || indicator.includes('t.co')) {
      patterns.push('url_shortener');
      confidence = 0.6;
    } else if (indicator.match(/[0-9]{8,}/)) {
      patterns.push('numeric_domain');
      confidence = 0.8;
    }
  } else if (type === 'url') {
    // Check for suspicious URL patterns
    if (indicator.includes('data:') || indicator.includes('javascript:')) {
      patterns.push('data_uri');
      confidence = 0.9;
    } else if (indicator.match(/[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/)) {
      patterns.push('ip_in_url');
      confidence = 0.7;
    }
  }

  return { patterns, confidence };
}

async function correlateThreats(supabase: any) {
  // Get recent threat alerts
  const { data: alerts } = await supabase
    .from('threat_alerts')
    .select('*')
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false });

  const correlations = [];
  const ipClusters = new Map();
  const domainClusters = new Map();

  for (const alert of alerts || []) {
    // Group by source IP
    if (alert.source_ip) {
      if (!ipClusters.has(alert.source_ip)) {
        ipClusters.set(alert.source_ip, []);
      }
      ipClusters.get(alert.source_ip).push(alert);
    }

    // Group by domain
    if (alert.source_domain) {
      if (!domainClusters.has(alert.source_domain)) {
        domainClusters.set(alert.source_domain, []);
      }
      domainClusters.get(alert.source_domain).push(alert);
    }
  }

  // Find correlations
  for (const [ip, ipAlerts] of ipClusters) {
    if (ipAlerts.length > 3) {
      correlations.push({
        type: 'ip_clustering',
        indicator: ip,
        count: ipAlerts.length,
        confidence: Math.min(0.9, ipAlerts.length * 0.2),
        timespan: '24h'
      });
    }
  }

  return { correlations, summary: `Found ${correlations.length} threat correlations` };
}

async function updateThreatFeeds(supabase: any, otxApiKey?: string, abuseApiKey?: string) {
  const feeds = [];
  
  // Update from various threat feeds
  if (otxApiKey) {
    try {
      const response = await fetch('https://otx.alienvault.com/api/v1/pulses/subscribed', {
        headers: { 'X-OTX-API-KEY': otxApiKey }
      });
      
      if (response.ok) {
        const data = await response.json();
        feeds.push({ source: 'OTX', count: data.results?.length || 0 });
      }
    } catch (error) {
      console.error('OTX feed update error:', error);
    }
  }

  return { 
    feeds,
    updated_at: new Date().toISOString(),
    summary: `Updated ${feeds.length} threat feeds`
  };
}

async function analyzePatterns(supabase: any) {
  // Get threat intelligence data
  const { data: intel } = await supabase
    .from('threat_intelligence')
    .select('*')
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

  const patterns = {
    top_threat_types: {},
    confidence_distribution: { high: 0, medium: 0, low: 0 },
    source_breakdown: {},
    temporal_patterns: {}
  };

  for (const item of intel || []) {
    // Threat type analysis
    patterns.top_threat_types[item.threat_type] = 
      (patterns.top_threat_types[item.threat_type] || 0) + 1;

    // Confidence distribution
    if (item.confidence_score > 0.7) patterns.confidence_distribution.high++;
    else if (item.confidence_score > 0.4) patterns.confidence_distribution.medium++;
    else patterns.confidence_distribution.low++;

    // Source analysis
    patterns.source_breakdown[item.source] = 
      (patterns.source_breakdown[item.source] || 0) + 1;
  }

  return {
    patterns,
    total_analyzed: intel?.length || 0,
    analysis_period: '7 days'
  };
}