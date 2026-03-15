import { supabase } from "@/integrations/supabase/client";

const FASTAPI_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface UrlScanRequest {
  url: string;
  deep_scan?: boolean;
}

export interface UrlScanResult {
  url: string;
  score: number;
  verdict: 'safe' | 'suspicious' | 'malicious';
  sources: {
    virustotal?: Record<string, unknown>;
    abuseipdb?: Record<string, unknown>;
    otx?: Record<string, unknown>;
    shodan?: Record<string, unknown>;
  };
  checks: {
    domain_reputation: boolean;
    ssl_certificate: boolean;
    url_structure: boolean;
    blacklist_check: boolean;
    phishing_keywords: boolean;
  };
  details: {
    domain_age?: number;
    ssl_issuer?: string;
    redirect_count?: number;
    suspicious_patterns?: string[];
    ip_address?: string;
    location?: string;
  };
}

export interface EmailScanRequest {
  headers: string;
  content?: string;
  attachments?: string[];
}

export interface EmailScanResult {
  sender: string;
  subject: string;
  score: number;
  verdict: 'safe' | 'suspicious' | 'phishing';
  authentication: {
    spf: boolean;
    dkim: boolean;
    dmarc: boolean;
  };
  content_analysis: {
    phishing_keywords: string[];
    suspicious_links: number;
    attachment_threats: number;
    spoofing_indicators: boolean;
  };
  threat_intelligence: {
    sender_reputation?: number;
    domain_reputation?: number;
    ip_reputation?: number;
  };
  headers: {
    return_path?: string;
    message_id?: string;
    received_from?: string;
  };
}

export interface NetworkScanRequest {
  pcap_data?: string;
  traffic_logs?: string;
  source_ip?: string;
  destination_ip?: string;
}

export interface NetworkScanResult {
  source_ip: string;
  destination_ip: string;
  protocol: string;
  threat_level: 'low' | 'medium' | 'high' | 'critical';
  anomalies: string[];
  threat_indicators: {
    port_scan: boolean;
    ddos_pattern: boolean;
    suspicious_payload: boolean;
    known_malicious_ip: boolean;
  };
  geolocation?: {
    country: string;
    city: string;
    coordinates: [number, number];
  };
}

class ThreatService {
  private async makeRequest<T extends object>(endpoint: string, data: T, method: 'GET' | 'POST' = 'POST') {
    try {
      // Get the current user's JWT token for authentication
      const { data: { session } } = await supabase.auth.getSession();
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`${FASTAPI_BASE_URL}${endpoint}`, {
        method,
        headers,
        ...(method === 'POST' && { body: JSON.stringify(data) }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Error calling ${endpoint}:`, error);
      throw error;
    }
  }

  async scanUrl(request: UrlScanRequest): Promise<UrlScanResult> {
    try {
      const result = await this.makeRequest('/scan/url', request);
      
      // Store scan result in Supabase
      await this.storeScanResult('url', request.url, result);
      
      return result;
    } catch (error) {
      console.error('URL scan failed:', error);
      throw new Error('Failed to scan URL. Please check if the FastAPI backend is running.');
    }
  }

  async scanEmail(request: EmailScanRequest): Promise<EmailScanResult> {
    try {
      const result = await this.makeRequest('/scan/email', request);
      
      // Store scan result in Supabase
      await this.storeScanResult('email', 'Email Analysis', result);
      
      return result;
    } catch (error) {
      console.error('Email scan failed:', error);
      throw new Error('Failed to scan email. Please check if the FastAPI backend is running.');
    }
  }

  async scanNetwork(request: NetworkScanRequest): Promise<NetworkScanResult> {
    try {
      const result = await this.makeRequest('/scan/network', request);
      
      // Store scan result in Supabase
      await this.storeScanResult('network', `${request.source_ip} -> ${request.destination_ip}`, result);
      
      return result;
    } catch (error) {
      console.error('Network scan failed:', error);
      throw new Error('Failed to scan network traffic. Please check if the FastAPI backend is running.');
    }
  }

  async uploadPcap(file: File): Promise<{ scan_id: string }> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      
      const headers: HeadersInit = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`${FASTAPI_BASE_URL}/scan/upload-pcap`, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('PCAP upload failed:', error);
      throw new Error('Failed to upload PCAP file.');
    }
  }

  async getThreatIntelligence(indicator: string, indicator_type: 'ip' | 'domain' | 'url' | 'hash') {
    try {
      return await this.makeRequest('/threat-intel/lookup', {
        indicator,
        indicator_type,
      });
    } catch (error) {
      console.error('Threat intelligence lookup failed:', error);
      throw error;
    }
  }

  async getHealthStatus() {
    try {
      return await this.makeRequest('/health', {}, 'GET');
    } catch (error) {
      console.error('Health check failed:', error);
      return { status: 'error', message: 'Backend unavailable' };
    }
  }

  private async storeScanResult(
    type: string,
    target: string,
    results: UrlScanResult | EmailScanResult | NetworkScanResult
  ) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase
        .from('scan_results')
        .insert({
          type: type as 'url' | 'email' | 'network' | 'file',
          target,
          status: 'completed',
          score: 'score' in results && typeof results.score === 'number' ? results.score : 0,
          results: JSON.stringify(results),
          created_by: user?.id,
        });
    } catch (error) {
      console.error('Failed to store scan result:', error);
      // Don't throw here as scan was successful, just storage failed
    }
  }

  async createThreatAlert(alertData: {
    type: 'url' | 'email' | 'network' | 'file';
    severity: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    description?: string;
    source_ip?: string;
    source_domain?: string;
    source_url?: string;
    indicators?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  }) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('threat_alerts')
        .insert({
          type: alertData.type,
          severity: alertData.severity,
          title: alertData.title,
          description: alertData.description,
          source_ip: alertData.source_ip,
          source_domain: alertData.source_domain,
          source_url: alertData.source_url,
          indicators: alertData.indicators ? JSON.stringify(alertData.indicators) : null,
          metadata: alertData.metadata ? JSON.stringify(alertData.metadata) : null,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Failed to create threat alert:', error);
      throw error;
    }
  }

  // Send alert notifications
  async sendAlertNotifications(alertId: string, platforms: string[], options?: {
    phone_number?: string;
    teams_webhook_url?: string;
  }): Promise<any> {
    try {
      const response = await supabase.functions.invoke('alert-integrations', {
        body: {
          alert_id: alertId,
          platforms,
          ...options
        }
      });

      if (response.error) throw new Error(response.error.message);
      return response.data;
    } catch (error) {
      console.error('Alert notifications failed:', error);
      throw error;
    }
  }
}

export const threatService = new ThreatService();