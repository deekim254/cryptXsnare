import { supabase } from "@/integrations/supabase/client";

export interface ReconRequest {
  target_domain: string;
  recon_types?: string[];
}

export interface ReconResult {
  id: string;
  target_domain: string;
  recon_type: string;
  results: any;
  status: string;
  error_message?: string;
  created_at: string;
}

export interface ReconResponse {
  success: boolean;
  target_domain: string;
  results: Array<{
    type: string;
    data: any;
    error?: string;
    timestamp: string;
  }>;
  completed_at: string;
}

export class ReconService {
  /**
   * Start a comprehensive reconnaissance scan
   */
  static async startReconnaissance(params: ReconRequest): Promise<ReconResponse> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Authentication required');
    }

    const response = await supabase.functions.invoke('reconnaissance', {
      body: params
    });

    if (response.error) {
      throw new Error(response.error.message || 'Reconnaissance failed');
    }

    return response.data;
  }

  /**
   * Get reconnaissance results for the current user
   */
  static async getReconResults(limit: number = 50): Promise<ReconResult[]> {
    const { data, error } = await supabase
      .from('recon_results')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error('Failed to fetch reconnaissance results');
    }

    return data || [];
  }

  /**
   * Get reconnaissance results for a specific domain
   */
  static async getResultsForDomain(domain: string): Promise<ReconResult[]> {
    const { data, error } = await supabase
      .from('recon_results')
      .select('*')
      .eq('target_domain', domain)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error('Failed to fetch domain results');
    }

    return data || [];
  }

  /**
   * Get unique domains that have been scanned
   */
  static async getScannedDomains(): Promise<string[]> {
    const { data, error } = await supabase
      .from('recon_results')
      .select('target_domain')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error('Failed to fetch scanned domains');
    }

    // Get unique domains
    const domains = Array.from(new Set(data?.map(item => item.target_domain) || []));
    return domains;
  }

  /**
   * Delete reconnaissance results for a domain
   */
  static async deleteResultsForDomain(domain: string): Promise<void> {
    const { error } = await supabase
      .from('recon_results')
      .delete()
      .eq('target_domain', domain);

    if (error) {
      throw new Error('Failed to delete reconnaissance results');
    }
  }

  /**
   * Export reconnaissance results to CSV format
   */
  static exportToCSV(results: ReconResult[]): string {
    const headers = ['Domain', 'Type', 'Status', 'Created At', 'Error', 'Results Preview'];
    const rows = results.map(result => [
      result.target_domain,
      result.recon_type,
      result.status,
      new Date(result.created_at).toLocaleString(),
      result.error_message || '',
      JSON.stringify(result.results).substring(0, 100) + '...'
    ]);

    return [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
  }

  /**
   * Download CSV file
   */
  static downloadCSV(csvContent: string, filename: string): void {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  }

  /**
   * Get summary statistics for reconnaissance results
   */
  static getResultsSummary(results: ReconResult[]) {
    const totalScans = results.length;
    const uniqueDomains = new Set(results.map(r => r.target_domain)).size;
    const successfulScans = results.filter(r => r.status === 'completed').length;
    const failedScans = results.filter(r => r.status === 'error').length;
    
    const typeDistribution = results.reduce((acc, result) => {
      acc[result.recon_type] = (acc[result.recon_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalScans,
      uniqueDomains,
      successfulScans,
      failedScans,
      successRate: totalScans > 0 ? ((successfulScans / totalScans) * 100).toFixed(1) : '0',
      typeDistribution
    };
  }

  /**
   * Format reconnaissance data for display
   */
  static formatReconData(result: ReconResult) {
    if (result.status === 'error') {
      return {
        type: result.recon_type,
        status: 'error',
        error: result.error_message,
        data: null
      };
    }

    switch (result.recon_type) {
      case 'whois':
        return {
          type: 'WHOIS',
          status: 'success',
          data: {
            registrar: result.results.registrar || 'Unknown',
            created: result.results.creation_date || 'Unknown',
            expires: result.results.expiration_date || 'Unknown',
            nameservers: result.results.name_servers || []
          }
        };

      case 'dns':
        return {
          type: 'DNS Records',
          status: 'success',
          data: result.results.records || {}
        };

      case 'subdomains':
        return {
          type: 'Subdomains',
          status: 'success',
          data: {
            count: result.results.count || 0,
            subdomains: result.results.subdomains || []
          }
        };

      case 'emails':
        return {
          type: 'Email Addresses',
          status: 'success',
          data: {
            emails: result.results.emails || [],
            organization: result.results.organization || null
          }
        };

      case 'shodan':
        return {
          type: 'Shodan Intelligence',
          status: 'success',
          data: {
            services: result.results.services || [],
            country: result.results.country || null,
            org: result.results.org || null
          }
        };

      case 'techstack':
        return {
          type: 'Technology Stack',
          status: 'success',
          data: {
            technologies: result.results.technologies || [],
            server: result.results.headers?.server || null
          }
        };

      default:
        return {
          type: result.recon_type.toUpperCase(),
          status: 'success',
          data: result.results
        };
    }
  }
}