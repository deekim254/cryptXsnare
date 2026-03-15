import { supabase } from "@/integrations/supabase/client";
import { DEMO_MODE } from "@/lib/mockAuth";
import { mockCases } from "@/lib/mockData";

export interface Case {
  id: string;
  title: string;
  description?: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  created_by: string;
  assigned_to?: string | null;
  created_at: string;
  updated_at: string;
  created_by_profile?: {
    id: string;
    full_name: string;
    email: string;
  };
  assigned_to_profile?: {
    id: string;
    full_name: string;
    email: string;
  } | null;
}

export interface CaseDetail extends Case {
  linked_alerts: Array<{
    id: string;
    case_id: string;
    alert_id: string;
    linked_at: string;
    linked_by: string;
    alert: any;
  }>;
  comments: Array<{
    id: string;
    case_id: string;
    user_id: string;
    comment: string;
    comment_type: 'comment' | 'status_change' | 'assignment' | 'alert_linked';
    metadata: any;
    created_at: string;
    user: {
      id: string;
      full_name: string;
      email: string;
    };
  }>;
}

export interface CaseFilters {
  status?: string;
  priority?: string;
}

class CaseService {
  async listCases(filters: CaseFilters = {}): Promise<Case[]> {
    if (DEMO_MODE) {
      let data = [...mockCases];
      if (filters.status) data = data.filter(c => c.status === filters.status);
      if (filters.priority) data = data.filter(c => c.priority === filters.priority);
      return data;
    }
    try {
      let query = supabase
        .from('cases')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.priority) {
        query = query.eq('priority', filters.priority);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as Case[];
    } catch (error) {
      console.error('Error listing cases:', error);
      throw error;
    }
  }

  async getCase(id: string): Promise<CaseDetail> {
    if (DEMO_MODE) {
      const found = mockCases.find(c => c.id === id);
      const base = found || mockCases[0];
      return {
        ...base,
        linked_alerts: [],
        comments: [
          {
            id: "cmt1",
            case_id: base.id,
            user_id: "demo-user-id",
            comment: "Case opened and assigned for investigation.",
            comment_type: "comment",
            metadata: {},
            created_at: base.created_at,
            user: { id: "demo-user-id", full_name: "Demo Analyst", email: "analyst@cryptixsnare.io" },
          },
        ],
      } as CaseDetail;
    }
    try {
      // Get case details
      const { data: caseData, error: caseError } = await supabase
        .from('cases')
        .select('*')
        .eq('id', id)
        .single();

      if (caseError) throw caseError;

      // Get linked alerts
      const { data: linkedAlerts, error: alertsError } = await supabase
        .from('case_alerts')
        .select(`
          *,
          alert:alerts(*)
        `)
        .eq('case_id', id)
        .order('linked_at', { ascending: false });

      if (alertsError) throw alertsError;

      // Get comments (without joins for simplicity)
      const { data: comments, error: commentsError } = await supabase
        .from('case_comments')
        .select('*')
        .eq('case_id', id)
        .order('created_at', { ascending: false });

      if (commentsError) throw commentsError;

      // Get user profiles for comments
      const userIds = [...new Set(comments?.map(c => c.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      const enrichedComments = (comments || []).map(comment => ({
        ...comment,
        user: profileMap.get(comment.user_id) || { id: comment.user_id, full_name: 'Unknown', email: '' }
      }));

      return {
        ...caseData,
        linked_alerts: linkedAlerts || [],
        comments: enrichedComments,
      } as CaseDetail;
    } catch (error) {
      console.error('Error getting case:', error);
      throw error;
    }
  }

  async createCase(caseData: {
    title: string;
    description?: string;
    priority?: string;
    assigned_to?: string;
  }): Promise<Case> {
    if (DEMO_MODE) {
      const newCase: Case = {
        id: "c-demo-" + Date.now(),
        title: caseData.title,
        description: caseData.description,
        status: "open",
        priority: (caseData.priority as any) || "medium",
        created_by: "analyst@cryptixsnare.io",
        assigned_to: caseData.assigned_to || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by_profile: { id: "demo-user-id", full_name: "Demo Analyst", email: "analyst@cryptixsnare.io" },
      };
      mockCases.unshift(newCase);
      return newCase;
    }
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('cases')
        .insert([
          {
            ...caseData,
            created_by: userData.user.id,
            status: 'open',
            priority: caseData.priority || 'medium',
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // Add initial comment
      await supabase.from('case_comments').insert([
        {
          case_id: data.id,
          user_id: userData.user.id,
          comment: 'Case created',
          comment_type: 'status_change',
          metadata: { status: 'open' },
        },
      ]);

      return data as Case;
    } catch (error) {
      console.error('Error creating case:', error);
      throw error;
    }
  }

  async updateCase(
    id: string,
    updates: {
      status?: string;
      priority?: string;
      assigned_to?: string;
      title?: string;
      description?: string;
    }
  ): Promise<Case> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('cases')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Add timeline comments
      if (updates.status) {
        await supabase.from('case_comments').insert([
          {
            case_id: id,
            user_id: userData.user.id,
            comment: `Status changed to ${updates.status}`,
            comment_type: 'status_change',
            metadata: { status: updates.status },
          },
        ]);
      }

      if (updates.assigned_to !== undefined) {
        await supabase.from('case_comments').insert([
          {
            case_id: id,
            user_id: userData.user.id,
            comment: updates.assigned_to ? 'Case assigned' : 'Assignment removed',
            comment_type: 'assignment',
            metadata: { assigned_to: updates.assigned_to },
          },
        ]);
      }

      return data as Case;
    } catch (error) {
      console.error('Error updating case:', error);
      throw error;
    }
  }

  async linkAlert(caseId: string, alertId: string): Promise<void> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { error } = await supabase.from('case_alerts').insert([
        {
          case_id: caseId,
          alert_id: alertId,
          linked_by: userData.user.id,
        },
      ]);

      if (error) throw error;

      // Add timeline comment
      await supabase.from('case_comments').insert([
        {
          case_id: caseId,
          user_id: userData.user.id,
          comment: 'Alert linked to case',
          comment_type: 'alert_linked',
          metadata: { alert_id: alertId },
        },
      ]);
    } catch (error) {
      console.error('Error linking alert:', error);
      throw error;
    }
  }

  async addComment(caseId: string, comment: string): Promise<void> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { error } = await supabase.from('case_comments').insert([
        {
          case_id: caseId,
          user_id: userData.user.id,
          comment,
          comment_type: 'comment',
        },
      ]);

      if (error) throw error;
    } catch (error) {
      console.error('Error adding comment:', error);
      throw error;
    }
  }

  async deleteCase(id: string): Promise<void> {
    try {
      const { error } = await supabase.from('cases').delete().eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting case:', error);
      throw error;
    }
  }
}

export const caseService = new CaseService();
