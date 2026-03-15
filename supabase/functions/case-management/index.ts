import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const authHeader = req.headers.get('Authorization')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const url = new URL(req.url);
    const path = url.pathname.split('/').pop();
    const method = req.method;

    console.log(`Case management request: ${method} ${path}`);

    // GET /case-management - List all cases
    if (method === 'GET' && !path) {
      const status = url.searchParams.get('status');
      const priority = url.searchParams.get('priority');
      
      let query = supabase
        .from('cases')
        .select(`
          *,
          created_by_profile:profiles!cases_created_by_fkey(id, full_name, email),
          assigned_to_profile:profiles!cases_assigned_to_fkey(id, full_name, email)
        `)
        .order('created_at', { ascending: false });

      if (status) query = query.eq('status', status);
      if (priority) query = query.eq('priority', priority);

      const { data, error } = await query;
      if (error) throw error;

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // GET /case-management/:id - Get case details with linked alerts and comments
    if (method === 'GET' && path) {
      const caseId = path;

      // Get case details
      const { data: caseData, error: caseError } = await supabase
        .from('cases')
        .select(`
          *,
          created_by_profile:profiles!cases_created_by_fkey(id, full_name, email),
          assigned_to_profile:profiles!cases_assigned_to_fkey(id, full_name, email)
        `)
        .eq('id', caseId)
        .single();

      if (caseError) throw caseError;

      // Get linked alerts
      const { data: linkedAlerts, error: alertsError } = await supabase
        .from('case_alerts')
        .select(`
          *,
          alert:alerts(*)
        `)
        .eq('case_id', caseId)
        .order('linked_at', { ascending: false });

      if (alertsError) throw alertsError;

      // Get comments
      const { data: comments, error: commentsError } = await supabase
        .from('case_comments')
        .select(`
          *,
          user:profiles(id, full_name, email)
        `)
        .eq('case_id', caseId)
        .order('created_at', { ascending: false });

      if (commentsError) throw commentsError;

      const response = {
        ...caseData,
        linked_alerts: linkedAlerts,
        comments: comments,
      };

      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST /case-management - Create new case
    if (method === 'POST' && !path) {
      const body = await req.json();
      const { title, description, priority, assigned_to } = body;

      const { data, error } = await supabase
        .from('cases')
        .insert([
          {
            title,
            description,
            priority: priority || 'medium',
            assigned_to,
            created_by: user.id,
            status: 'open',
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // Add initial comment
      await supabase.from('case_comments').insert([
        {
          case_id: data.id,
          user_id: user.id,
          comment: 'Case created',
          comment_type: 'status_change',
          metadata: { status: 'open' },
        },
      ]);

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 201,
      });
    }

    // PUT /case-management/:id - Update case
    if (method === 'PUT' && path) {
      const caseId = path;
      const body = await req.json();
      const { status, priority, assigned_to, title, description } = body;

      const updates: any = {};
      if (status) updates.status = status;
      if (priority) updates.priority = priority;
      if (assigned_to !== undefined) updates.assigned_to = assigned_to;
      if (title) updates.title = title;
      if (description !== undefined) updates.description = description;

      const { data, error } = await supabase
        .from('cases')
        .update(updates)
        .eq('id', caseId)
        .select()
        .single();

      if (error) throw error;

      // Add timeline comment for status changes
      if (status) {
        await supabase.from('case_comments').insert([
          {
            case_id: caseId,
            user_id: user.id,
            comment: `Status changed to ${status}`,
            comment_type: 'status_change',
            metadata: { status },
          },
        ]);
      }

      // Add timeline comment for assignments
      if (assigned_to !== undefined) {
        await supabase.from('case_comments').insert([
          {
            case_id: caseId,
            user_id: user.id,
            comment: assigned_to ? `Case assigned` : 'Assignment removed',
            comment_type: 'assignment',
            metadata: { assigned_to },
          },
        ]);
      }

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST /case-management/:id/link-alert - Link alert to case
    if (method === 'POST' && path?.includes('/link-alert')) {
      const caseId = path.replace('/link-alert', '');
      const body = await req.json();
      const { alert_id } = body;

      const { data, error } = await supabase
        .from('case_alerts')
        .insert([
          {
            case_id: caseId,
            alert_id,
            linked_by: user.id,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // Add timeline comment
      await supabase.from('case_comments').insert([
        {
          case_id: caseId,
          user_id: user.id,
          comment: 'Alert linked to case',
          comment_type: 'alert_linked',
          metadata: { alert_id },
        },
      ]);

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 201,
      });
    }

    // POST /case-management/:id/comments - Add comment
    if (method === 'POST' && path?.includes('/comments')) {
      const caseId = path.replace('/comments', '');
      const body = await req.json();
      const { comment } = body;

      const { data, error } = await supabase
        .from('case_comments')
        .insert([
          {
            case_id: caseId,
            user_id: user.id,
            comment,
            comment_type: 'comment',
          },
        ])
        .select(`
          *,
          user:profiles(id, full_name, email)
        `)
        .single();

      if (error) throw error;

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 201,
      });
    }

    // DELETE /case-management/:id - Delete case
    if (method === 'DELETE' && path) {
      const caseId = path;

      const { error } = await supabase
        .from('cases')
        .delete()
        .eq('id', caseId);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in case-management function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
