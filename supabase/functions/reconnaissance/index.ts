import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface ReconResult {
  type: string;
  data: any;
  error?: string;
  timestamp: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Get user from auth header
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Invalid authentication');
    }

    const { target_domain, recon_types } = await req.json();

    if (!target_domain) {
      return new Response(
        JSON.stringify({ error: 'target_domain is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results: ReconResult[] = [];
    const timestamp = new Date().toISOString();

    // Default to all recon types if none specified
    const types = recon_types || ['whois', 'dns', 'subdomains', 'emails', 'shodan', 'techstack'];

    console.log(`Starting reconnaissance for ${target_domain} with types:`, types);

    // Run each reconnaissance tool
    for (const type of types) {
      try {
        let result: any;
        
        switch (type) {
          case 'whois':
            result = await performWhoisLookup(target_domain);
            break;
          case 'dns':
            result = await performDNSLookup(target_domain);
            break;
          case 'subdomains':
            result = await performSubdomainEnumeration(target_domain);
            break;
          case 'emails':
            result = await performEmailHarvesting(target_domain);
            break;
          case 'shodan':
            result = await performShodanLookup(target_domain);
            break;
          case 'techstack':
            result = await performTechStackDetection(target_domain);
            break;
          default:
            console.warn(`Unknown recon type: ${type}`);
            continue;
        }

        results.push({
          type,
          data: result,
          timestamp
        });

        // Store result in database
        const { error: insertError } = await supabase
          .from('recon_results')
          .insert({
            user_id: user.id,
            target_domain,
            recon_type: type,
            results: result,
            status: 'completed'
          });

        if (insertError) {
          console.error(`Error storing ${type} result:`, insertError);
        }

      } catch (error) {
        console.error(`Error in ${type} reconnaissance:`, error);
        results.push({
          type,
          data: null,
          error: error.message,
          timestamp
        });

        // Store error in database
        await supabase
          .from('recon_results')
          .insert({
            user_id: user.id,
            target_domain,
            recon_type: type,
            results: {},
            status: 'error',
            error_message: error.message
          });
      }
    }

    console.log(`Reconnaissance completed for ${target_domain}`);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        target_domain,
        results,
        completed_at: timestamp
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in reconnaissance function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// WHOIS Lookup Implementation
async function performWhoisLookup(domain: string): Promise<any> {
  console.log(`Performing WHOIS lookup for ${domain}`);
  
  // Using whois API service
  try {
    const response = await fetch(`https://api.whoisjson.com/v1/whois?key=free&domain=${domain}`);
    const data = await response.json();
    
    if (response.ok && data) {
      return {
        registrar: data.registrar_name || 'Unknown',
        creation_date: data.creation_date || null,
        expiration_date: data.expiration_date || null,
        name_servers: data.name_servers || [],
        status: data.status || [],
        contacts: {
          registrant: data.contacts?.registrant || null,
          admin: data.contacts?.admin || null,
          tech: data.contacts?.tech || null
        },
        raw_data: data
      };
    } else {
      throw new Error('WHOIS lookup failed');
    }
  } catch (error) {
    console.error('WHOIS lookup error:', error);
    return {
      error: 'WHOIS lookup failed',
      message: error.message
    };
  }
}

// DNS Lookup Implementation
async function performDNSLookup(domain: string): Promise<any> {
  console.log(`Performing DNS lookup for ${domain}`);
  
  const records = {};
  const recordTypes = ['A', 'AAAA', 'MX', 'NS', 'TXT', 'CNAME'];
  
  for (const type of recordTypes) {
    try {
      const response = await fetch(`https://dns.google/resolve?name=${domain}&type=${type}`);
      const data = await response.json();
      
      if (data.Answer) {
        records[type] = data.Answer.map((record: any) => ({
          name: record.name,
          data: record.data,
          ttl: record.TTL
        }));
      }
    } catch (error) {
      console.error(`DNS ${type} lookup error:`, error);
      records[type] = [];
    }
  }
  
  return {
    domain,
    records,
    timestamp: new Date().toISOString()
  };
}

// Subdomain Enumeration using crt.sh
async function performSubdomainEnumeration(domain: string): Promise<any> {
  console.log(`Performing subdomain enumeration for ${domain}`);
  
  try {
    const response = await fetch(`https://crt.sh/?q=%.${domain}&output=json`);
    const data = await response.json();
    
    if (Array.isArray(data)) {
      const subdomains = new Set<string>();
      
      data.forEach((cert: any) => {
        if (cert.name_value) {
          cert.name_value.split('\n').forEach((name: string) => {
            if (name.includes(domain) && !name.startsWith('*')) {
              subdomains.add(name.trim());
            }
          });
        }
      });
      
      return {
        domain,
        subdomains: Array.from(subdomains).sort(),
        count: subdomains.size,
        certificates_found: data.length
      };
    }
    
    return { domain, subdomains: [], count: 0 };
  } catch (error) {
    console.error('Subdomain enumeration error:', error);
    throw new Error(`Subdomain enumeration failed: ${error.message}`);
  }
}

// Email Harvesting using Hunter.io
async function performEmailHarvesting(domain: string): Promise<any> {
  console.log(`Performing email harvesting for ${domain}`);
  
  const hunterApiKey = Deno.env.get('HUNTER_IO_API_KEY');
  
  if (!hunterApiKey) {
    return {
      domain,
      emails: [],
      error: 'Hunter.io API key not configured',
      mock_data: {
        emails: [
          `info@${domain}`,
          `contact@${domain}`,
          `support@${domain}`,
          `admin@${domain}`
        ],
        note: 'This is mock data. Configure HUNTER_IO_API_KEY for real results.'
      }
    };
  }
  
  try {
    const response = await fetch(
      `https://api.hunter.io/v2/domain-search?domain=${domain}&api_key=${hunterApiKey}`
    );
    const data = await response.json();
    
    if (response.ok && data.data) {
      return {
        domain,
        emails: data.data.emails || [],
        organization: data.data.organization || null,
        confidence: data.data.confidence || null,
        sources: data.data.sources || [],
        meta: data.meta || {}
      };
    } else {
      throw new Error(data.errors?.[0]?.details || 'Hunter.io API error');
    }
  } catch (error) {
    console.error('Email harvesting error:', error);
    throw new Error(`Email harvesting failed: ${error.message}`);
  }
}

// Shodan Lookup
async function performShodanLookup(domain: string): Promise<any> {
  console.log(`Performing Shodan lookup for ${domain}`);
  
  const shodanApiKey = Deno.env.get('SHODAN_API_KEY');
  
  if (!shodanApiKey) {
    return {
      domain,
      services: [],
      error: 'Shodan API key not configured',
      mock_data: {
        services: [
          { port: 80, service: 'HTTP', banner: 'nginx/1.18.0' },
          { port: 443, service: 'HTTPS', banner: 'nginx/1.18.0 SSL' },
          { port: 22, service: 'SSH', banner: 'OpenSSH 8.0' }
        ],
        note: 'This is mock data. Configure SHODAN_API_KEY for real results.'
      }
    };
  }
  
  try {
    // First resolve domain to IP
    const dnsResponse = await fetch(`https://dns.google/resolve?name=${domain}&type=A`);
    const dnsData = await dnsResponse.json();
    
    if (!dnsData.Answer || dnsData.Answer.length === 0) {
      throw new Error('Could not resolve domain to IP');
    }
    
    const ip = dnsData.Answer[0].data;
    
    // Query Shodan for the IP
    const response = await fetch(`https://api.shodan.io/shodan/host/${ip}?key=${shodanApiKey}`);
    const data = await response.json();
    
    if (response.ok) {
      return {
        domain,
        ip,
        country: data.country_name || null,
        city: data.city || null,
        org: data.org || null,
        isp: data.isp || null,
        services: data.data?.map((service: any) => ({
          port: service.port,
          service: service.product || service._shodan?.module || 'Unknown',
          banner: service.data?.substring(0, 200) || '',
          version: service.version || null
        })) || [],
        vulns: data.vulns || [],
        last_update: data.last_update || null
      };
    } else {
      throw new Error(data.error || 'Shodan API error');
    }
  } catch (error) {
    console.error('Shodan lookup error:', error);
    throw new Error(`Shodan lookup failed: ${error.message}`);
  }
}

// Tech Stack Detection
async function performTechStackDetection(domain: string): Promise<any> {
  console.log(`Performing tech stack detection for ${domain}`);
  
  try {
    const url = domain.startsWith('http') ? domain : `https://${domain}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ReconBot/1.0)'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const html = await response.text();
    const headers = Object.fromEntries(response.headers.entries());
    
    const technologies = [];
    
    // Basic technology detection
    if (headers['server']) {
      technologies.push({
        name: 'Server',
        value: headers['server'],
        confidence: 100
      });
    }
    
    if (headers['x-powered-by']) {
      technologies.push({
        name: 'Framework',
        value: headers['x-powered-by'],
        confidence: 90
      });
    }
    
    // Content-based detection
    const detectionRules = [
      { name: 'WordPress', pattern: /wp-content|wp-includes/i, confidence: 95 },
      { name: 'React', pattern: /react|__REACT_DEVTOOLS_GLOBAL_HOOK__/i, confidence: 85 },
      { name: 'Angular', pattern: /ng-version|angular/i, confidence: 85 },
      { name: 'Vue.js', pattern: /vue\.js|__vue__|v-if/i, confidence: 85 },
      { name: 'jQuery', pattern: /jquery/i, confidence: 80 },
      { name: 'Bootstrap', pattern: /bootstrap/i, confidence: 75 },
      { name: 'Cloudflare', pattern: /cloudflare|cf-ray/i, confidence: 90 },
      { name: 'Google Analytics', pattern: /google-analytics|gtag/i, confidence: 95 }
    ];
    
    detectionRules.forEach(rule => {
      if (rule.pattern.test(html) || rule.pattern.test(JSON.stringify(headers))) {
        technologies.push({
          name: rule.name,
          value: 'Detected',
          confidence: rule.confidence
        });
      }
    });
    
    return {
      domain,
      url,
      technologies,
      headers: headers,
      title: html.match(/<title>(.*?)<\/title>/i)?.[1] || 'No title found',
      status_code: response.status
    };
    
  } catch (error) {
    console.error('Tech stack detection error:', error);
    throw new Error(`Tech stack detection failed: ${error.message}`);
  }
}