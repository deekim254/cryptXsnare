import { supabase } from "@/integrations/supabase/client";
import { DEMO_MODE } from "@/lib/mockAuth";
import { mockAlerts } from "@/lib/mockData";

export interface Alert {
  id: string;
  source: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'acknowledged' | 'in_progress' | 'resolved' | 'closed';
  assigned_to?: string | null;
  metadata: any;
  created_at: string;
  updated_at: string;
}

export interface AlertFilters {
  severity?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

class AlertService {
  async listAlerts(filters: AlertFilters = {}): Promise<{ alerts: Alert[]; total: number }> {
    if (DEMO_MODE) {
      let data = [...mockAlerts];
      if (filters.severity) data = data.filter(a => a.severity === filters.severity);
      if (filters.status) data = data.filter(a => a.status === filters.status);
      const total = data.length;
      if (filters.offset) data = data.slice(filters.offset);
      if (filters.limit) data = data.slice(0, filters.limit);
      return { alerts: data, total };
    }
    try {
      let query = supabase
        .from('alerts')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (filters.severity) {
        query = query.eq('severity', filters.severity);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.limit) {
        query = query.limit(filters.limit);
      }
      if (filters.offset) {
        query = query.range(filters.offset, (filters.offset || 0) + (filters.limit || 50) - 1);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      return { alerts: (data || []) as Alert[], total: count || 0 };
    } catch (error) {
      console.error('Error listing alerts:', error);
      throw error;
    }
  }

  async getAlert(id: string): Promise<Alert> {
    try {
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Alert;
    } catch (error) {
      console.error('Error getting alert:', error);
      throw error;
    }
  }

  async createAlert(alert: Omit<Alert, 'id' | 'created_at' | 'updated_at'>): Promise<Alert> {
    try {
      const { data, error } = await supabase
        .from('alerts')
        .insert([alert])
        .select()
        .single();

      if (error) throw error;
      return data as Alert;
    } catch (error) {
      console.error('Error creating alert:', error);
      throw error;
    }
  }

  async updateAlert(id: string, updates: Partial<Alert>): Promise<Alert> {
    try {
      const { data, error } = await supabase
        .from('alerts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Alert;
    } catch (error) {
      console.error('Error updating alert:', error);
      throw error;
    }
  }

  async acknowledgeAlert(id: string): Promise<Alert> {
    return this.updateAlert(id, { status: 'acknowledged' });
  }

  async assignAlert(id: string, assignedTo: string): Promise<Alert> {
    return this.updateAlert(id, { assigned_to: assignedTo });
  }

  async resolveAlert(id: string): Promise<Alert> {
    return this.updateAlert(id, { status: 'resolved' });
  }

  async deleteAlert(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('alerts')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting alert:', error);
      throw error;
    }
  }
}

export const alertService = new AlertService();