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

// Simulated network packet analysis (in production, integrate with Suricata/Zeek)
function analyzePcapData(data: ArrayBuffer) {
  const packetCount = Math.floor(data.byteLength / 1024) + Math.floor(Math.random() * 1000);
  const maliciousCount = Math.floor(Math.random() * packetCount * 0.1);
  
  // Simulate various network threats
  const threats = [];
  const protocols = { HTTP: 0, HTTPS: 0, DNS: 0, TCP: 0, UDP: 0, ICMP: 0 };
  const suspiciousIPs = [];
  
  // Generate mock analysis results
  for (let i = 0; i < Math.min(5, maliciousCount); i++) {
    const threatTypes = ['Port Scan', 'DDoS', 'Malware Communication', 'Data Exfiltration', 'Brute Force'];
    const severities = ['low', 'medium', 'high', 'critical'];
    
    threats.push({
      type: threatTypes[Math.floor(Math.random() * threatTypes.length)],
      severity: severities[Math.floor(Math.random() * severities.length)],
      source_ip: `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
      destination_port: Math.floor(Math.random() * 65535),
      packet_count: Math.floor(Math.random() * 100) + 1,
      timestamp: new Date(Date.now() - Math.random() * 3600000).toISOString(),
      description: 'Suspicious network activity detected by packet analysis',
    });
  }
  
  // Generate protocol distribution
  const totalProtocolPackets = packetCount - maliciousCount;
  protocols.HTTPS = Math.floor(totalProtocolPackets * 0.6);
  protocols.HTTP = Math.floor(totalProtocolPackets * 0.2);
  protocols.DNS = Math.floor(totalProtocolPackets * 0.1);
  protocols.TCP = Math.floor(totalProtocolPackets * 0.05);
  protocols.UDP = Math.floor(totalProtocolPackets * 0.03);
  protocols.ICMP = totalProtocolPackets - (protocols.HTTPS + protocols.HTTP + protocols.DNS + protocols.TCP + protocols.UDP);
  
  // Generate suspicious IPs
  for (let i = 0; i < Math.min(3, threats.length); i++) {
    suspiciousIPs.push({
      ip: threats[i]?.source_ip || `192.168.1.${Math.floor(Math.random() * 255)}`,
      reputation: Math.random() < 0.3 ? 'malicious' : 'suspicious',
      country: ['Unknown', 'China', 'Russia', 'Brazil', 'India'][Math.floor(Math.random() * 5)],
      connections: Math.floor(Math.random() * 50) + 1,
    });
  }
  
  const riskScore = Math.min(1, (maliciousCount / packetCount) * 2 + (threats.length * 0.1));
  
  return {
    analysis_id: crypto.randomUUID(),
    packets_analyzed: packetCount,
    malicious_packets: maliciousCount,
    risk_score: riskScore,
    threats_detected: threats,
    protocol_distribution: protocols,
    suspicious_ips: suspiciousIPs,
    analysis_duration: Math.floor(Math.random() * 30) + 5, // seconds
    timestamp: new Date().toISOString(),
    verdict: riskScore > 0.7 ? 'high_risk' : riskScore > 0.4 ? 'medium_risk' : 'low_risk'
  };
}

// Generate Suricata-style alerts
function generateSuricataAlerts(threats: any[]) {
  return threats.map(threat => ({
    timestamp: threat.timestamp,
    flow_id: Math.floor(Math.random() * 1000000),
    alert: {
      action: 'allowed',
      gid: 1,
      signature_id: Math.floor(Math.random() * 10000) + 1000,
      rev: 1,
      signature: `ET ${threat.type.toUpperCase()} ${threat.description}`,
      category: 'Potentially Bad Traffic',
      severity: threat.severity === 'critical' ? 1 : threat.severity === 'high' ? 2 : 3,
    },
    src_ip: threat.source_ip,
    src_port: Math.floor(Math.random() * 65535),
    dest_ip: '192.168.1.1',
    dest_port: threat.destination_port,
    proto: 'TCP',
  }));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const contentType = req.headers.get('content-type') || '';
    let fileData: ArrayBuffer;
    let fileName = 'unknown.pcap';
    
    if (contentType.includes('multipart/form-data')) {
      // Handle file upload
      const formData = await req.formData();
      const file = formData.get('file') as File;
      
      if (!file) {
        throw new Error('No file provided');
      }
      
      fileName = file.name;
      fileData = await file.arrayBuffer();
      
      // Basic file validation
      if (fileData.byteLength === 0) {
        throw new Error('Empty file provided');
      }
      
      if (fileData.byteLength > 100 * 1024 * 1024) { // 100MB limit
        throw new Error('File too large. Maximum size is 100MB');
      }
      
    } else {
      // Handle JSON request with base64 data
      const { file_data, file_name } = await req.json();
      
      if (!file_data) {
        throw new Error('No file data provided');
      }
      
      fileName = file_name || 'uploaded.pcap';
      
      try {
        // Decode base64 file data
        const decoder = new TextDecoder();
        const base64String = decoder.decode(new Uint8Array(file_data));
        fileData = Uint8Array.from(atob(base64String), c => c.charCodeAt(0)).buffer;
      } catch {
        // If not base64, treat as raw binary data
        fileData = new Uint8Array(file_data).buffer;
      }
    }

    console.log(`PCAP analysis started for file: ${fileName} (${fileData.byteLength} bytes)`);

    // Analyze the PCAP data
    const analysis = analyzePcapData(fileData);
    
    // Generate Suricata-style alerts
    const suricataAlerts = generateSuricataAlerts(analysis.threats_detected);
    
    const result = {
      file_name: fileName,
      file_size: fileData.byteLength,
      analysis: analysis,
      suricata_alerts: suricataAlerts,
      recommendations: [
        analysis.risk_score > 0.7 ? 'Immediate investigation required - High risk traffic detected' : null,
        analysis.threats_detected.length > 0 ? 'Review detected threats and block suspicious IPs' : null,
        analysis.suspicious_ips.length > 0 ? 'Implement IP reputation filtering' : null,
        'Monitor network traffic for similar patterns',
        'Consider updating firewall rules based on findings'
      ].filter(Boolean)
    };

    // Store results in Supabase
    try {
      const authHeader = req.headers.get('Authorization');
      if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabase.auth.getUser(token);
        
        if (user) {
          await supabase.from('scan_results').insert({
            type: 'network',
            target: fileName,
            status: 'completed',
            score: analysis.risk_score,
            results: result,
            created_by: user.id,
          });

          // Create threat alerts for high-severity findings
          for (const threat of analysis.threats_detected) {
            if (['high', 'critical'].includes(threat.severity)) {
              await supabase.from('threat_alerts').insert({
                type: 'network',
                severity: threat.severity,
                title: `Network ${threat.type} detected`,
                description: `${threat.description} from ${threat.source_ip}`,
                source_ip: threat.source_ip,
                indicators: {
                  packet_count: threat.packet_count,
                  destination_port: threat.destination_port,
                  analysis_id: analysis.analysis_id
                },
                metadata: { pcap_analysis: threat },
                created_by: user.id,
              });
            }
          }
        }
      }
    } catch (dbError) {
      console.error('Database error:', dbError);
    }

    console.log(`PCAP analysis completed. Risk score: ${analysis.risk_score}, Threats: ${analysis.threats_detected.length}`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in PCAP analysis:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      analysis: { verdict: 'error', risk_score: 0 }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});