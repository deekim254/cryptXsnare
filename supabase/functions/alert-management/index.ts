import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
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
    )

    const url = new URL(req.url)
    const path = url.pathname.split('/').slice(-1)[0]

    switch (req.method) {
      case 'GET':
        if (path === 'alerts') {
          return await handleListAlerts(supabaseClient, url)
        } else if (path.match(/^[0-9a-f-]{36}$/)) {
          return await handleGetAlert(supabaseClient, path)
        }
        break

      case 'POST':
        if (path === 'alerts') {
          return await handleCreateAlert(supabaseClient, req)
        }
        break

      case 'PUT':
        if (path.match(/^[0-9a-f-]{36}$/)) {
          return await handleUpdateAlert(supabaseClient, path, req)
        }
        break

      case 'PATCH':
        if (path.match(/^[0-9a-f-]{36}$/) && url.pathname.includes('acknowledge')) {
          return await handleAcknowledgeAlert(supabaseClient, path)
        }
        break
    }

    return new Response(
      JSON.stringify({ error: 'Not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function handleListAlerts(supabaseClient: any, url: URL) {
  const severity = url.searchParams.get('severity')
  const status = url.searchParams.get('status')
  const limit = parseInt(url.searchParams.get('limit') || '50')
  const offset = parseInt(url.searchParams.get('offset') || '0')

  let query = supabaseClient
    .from('alerts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
    .range(offset, offset + limit - 1)

  if (severity) {
    query = query.eq('severity', severity)
  }
  if (status) {
    query = query.eq('status', status)
  }

  const { data, error, count } = await query

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  return new Response(
    JSON.stringify({ alerts: data, total: count }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleGetAlert(supabaseClient: any, alertId: string) {
  const { data, error } = await supabaseClient
    .from('alerts')
    .select('*')
    .eq('id', alertId)
    .single()

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  return new Response(
    JSON.stringify(data),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleCreateAlert(supabaseClient: any, req: Request) {
  const body = await req.json()
  
  const { data, error } = await supabaseClient
    .from('alerts')
    .insert([body])
    .select()
    .single()

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  return new Response(
    JSON.stringify(data),
    { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleUpdateAlert(supabaseClient: any, alertId: string, req: Request) {
  const body = await req.json()
  
  const { data, error } = await supabaseClient
    .from('alerts')
    .update(body)
    .eq('id', alertId)
    .select()
    .single()

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  return new Response(
    JSON.stringify(data),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleAcknowledgeAlert(supabaseClient: any, alertId: string) {
  const { data, error } = await supabaseClient
    .from('alerts')
    .update({ status: 'acknowledged' })
    .eq('id', alertId)
    .select()
    .single()

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  return new Response(
    JSON.stringify(data),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}