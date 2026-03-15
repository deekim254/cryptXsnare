import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get alerts per day (last 7 days)
    const { data: alertsPerDay, error: alertsError } = await supabaseClient
      .from('alerts')
      .select('created_at, severity')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: true });

    if (alertsError) throw alertsError;

    // Get severity distribution
    const { data: severityData, error: severityError } = await supabaseClient
      .from('alerts')
      .select('severity');

    if (severityError) throw severityError;

    // Get case status distribution
    const { data: casesData, error: casesError } = await supabaseClient
      .from('cases')
      .select('status, priority, created_at');

    if (casesError) throw casesError;

    // Get total active cases
    const activeCases = casesData?.filter(c => c.status !== 'closed' && c.status !== 'resolved').length || 0;
    
    // Get total alerts
    const totalAlerts = severityData?.length || 0;
    
    // Get critical alerts
    const criticalAlerts = severityData?.filter(a => a.severity === 'critical').length || 0;

    // Process alerts per day
    const alertsByDate = new Map<string, { total: number; critical: number; high: number; medium: number; low: number }>();
    
    alertsPerDay?.forEach(alert => {
      const date = new Date(alert.created_at).toISOString().split('T')[0];
      if (!alertsByDate.has(date)) {
        alertsByDate.set(date, { total: 0, critical: 0, high: 0, medium: 0, low: 0 });
      }
      const dayData = alertsByDate.get(date)!;
      dayData.total++;
      if (alert.severity === 'critical') dayData.critical++;
      else if (alert.severity === 'high') dayData.high++;
      else if (alert.severity === 'medium') dayData.medium++;
      else if (alert.severity === 'low') dayData.low++;
    });

    const alertsTimeSeries = Array.from(alertsByDate.entries()).map(([date, counts]) => ({
      date,
      ...counts,
    }));

    // Process severity distribution
    const severityDistribution = {
      critical: severityData?.filter(a => a.severity === 'critical').length || 0,
      high: severityData?.filter(a => a.severity === 'high').length || 0,
      medium: severityData?.filter(a => a.severity === 'medium').length || 0,
      low: severityData?.filter(a => a.severity === 'low').length || 0,
    };

    // Process case status distribution
    const caseStatusDistribution = {
      open: casesData?.filter(c => c.status === 'open').length || 0,
      in_progress: casesData?.filter(c => c.status === 'in_progress').length || 0,
      resolved: casesData?.filter(c => c.status === 'resolved').length || 0,
      closed: casesData?.filter(c => c.status === 'closed').length || 0,
    };

    // Process case priority distribution
    const casePriorityDistribution = {
      critical: casesData?.filter(c => c.priority === 'critical').length || 0,
      high: casesData?.filter(c => c.priority === 'high').length || 0,
      medium: casesData?.filter(c => c.priority === 'medium').length || 0,
      low: casesData?.filter(c => c.priority === 'low').length || 0,
    };

    // Calculate case trends (last 7 days)
    const casesByDate = new Map<string, { open: number; closed: number; resolved: number }>();
    
    casesData?.forEach(caseItem => {
      const date = new Date(caseItem.created_at).toISOString().split('T')[0];
      if (!casesByDate.has(date)) {
        casesByDate.set(date, { open: 0, closed: 0, resolved: 0 });
      }
      const dayData = casesByDate.get(date)!;
      if (caseItem.status === 'open' || caseItem.status === 'in_progress') dayData.open++;
      else if (caseItem.status === 'closed') dayData.closed++;
      else if (caseItem.status === 'resolved') dayData.resolved++;
    });

    const caseTrends = Array.from(casesByDate.entries()).map(([date, counts]) => ({
      date,
      ...counts,
    }));

    return new Response(
      JSON.stringify({
        kpis: {
          totalAlerts,
          criticalAlerts,
          activeCases,
          totalCases: casesData?.length || 0,
        },
        alertsTimeSeries,
        severityDistribution,
        caseStatusDistribution,
        casePriorityDistribution,
        caseTrends,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
