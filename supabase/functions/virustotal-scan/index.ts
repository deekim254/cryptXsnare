import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, file_hash, scan_type } = await req.json();
    const virusTotalApiKey = Deno.env.get('VIRUSTOTAL_API_KEY');
    
    if (!virusTotalApiKey) {
      throw new Error('VirusTotal API key not configured');
    }

    let vtResponse;
    let apiUrl;
    
    // Determine scan type - URL or file hash
    if (scan_type === 'url' && url) {
      // URL scan
      apiUrl = `https://www.virustotal.com/vtapi/v2/url/report?apikey=${virusTotalApiKey}&resource=${encodeURIComponent(url)}`;
    } else if (scan_type === 'file' && file_hash) {
      // File hash scan
      apiUrl = `https://www.virustotal.com/vtapi/v2/file/report?apikey=${virusTotalApiKey}&resource=${file_hash}`;
    } else {
      throw new Error('Invalid scan parameters');
    }

    console.log(`VirusTotal scan initiated for ${scan_type}: ${url || file_hash}`);
    
    const response = await fetch(apiUrl);
    const data = await response.json();
    
    if (data.response_code === 1) {
      // Analysis available
      const positiveScans = data.positives || 0;
      const totalScans = data.total || 0;
      const riskScore = totalScans > 0 ? (positiveScans / totalScans) : 0;
      
      vtResponse = {
        scan_id: data.scan_id,
        resource: data.resource,
        permalink: data.permalink,
        positives: positiveScans,
        total: totalScans,
        risk_score: riskScore,
        scan_date: data.scan_date,
        scans: data.scans,
        verdict: positiveScans > 0 ? (positiveScans > 3 ? 'malicious' : 'suspicious') : 'safe'
      };
      
      // Store results in Supabase
      const { data: user } = await supabase.auth.getUser(req.headers.get('Authorization')?.replace('Bearer ', '') || '');
      
      if (user?.user) {
        await supabase.from('scan_results').insert({
          type: 'file',
          target: url || file_hash,
          status: 'completed',
          score: riskScore,
          results: vtResponse,
          created_by: user.user.id,
        });
        
        // Create threat alert if high risk
        if (riskScore > 0.3) {
          await supabase.from('threat_alerts').insert({
            type: 'file',
            severity: riskScore > 0.7 ? 'critical' : (riskScore > 0.5 ? 'high' : 'medium'),
            title: `Malicious ${scan_type} detected by VirusTotal`,
            description: `${positiveScans}/${totalScans} engines detected threats in ${url || file_hash}`,
            source_url: scan_type === 'url' ? url : undefined,
            indicators: { virus_total_positives: positiveScans, virus_total_total: totalScans },
            metadata: vtResponse,
            created_by: user.user.id,
          });
        }
      }
      
    } else if (data.response_code === 0) {
      // Not found - submit for analysis
      vtResponse = {
        message: 'Resource not found in VirusTotal database. Submitting for analysis...',
        status: 'submitted',
        verdict: 'unknown'
      };
      
      // Submit URL/file for scanning
      if (scan_type === 'url') {
        const submitUrl = `https://www.virustotal.com/vtapi/v2/url/scan`;
        const formData = new FormData();
        formData.append('apikey', virusTotalApiKey);
        formData.append('url', url);
        
        const submitResponse = await fetch(submitUrl, {
          method: 'POST',
          body: formData
        });
        const submitData = await submitResponse.json();
        vtResponse.scan_id = submitData.scan_id;
      }
    } else {
      vtResponse = {
        error: 'VirusTotal API error',
        message: data.verbose_msg || 'Unknown error occurred',
        verdict: 'error'
      };
    }

    console.log('VirusTotal scan completed:', vtResponse);

    return new Response(JSON.stringify(vtResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Error in VirusTotal scan:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      verdict: 'error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});