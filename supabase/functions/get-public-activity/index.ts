import { createClient } from 'npm:@supabase/supabase-js@2'

const client = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', { auth: { persistSession: false } })
const origins = new Set((Deno.env.get('ALLOWED_ORIGINS') ?? 'http://localhost:4173,http://localhost:5173').split(',').map(x => x.trim()).filter(Boolean))
const reply = (body: Record<string, unknown>, status = 200, origin = '') => Response.json(body, { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...(origin ? { 'access-control-allow-origin': origin, vary: 'Origin' } : {}) } })

Deno.serve(async request => {
  const origin = request.headers.get('origin') ?? ''
  const isLocalOrigin = /^http:\/\/localhost(?::\d+)?$/.test(origin)
  if (origin && !origins.has(origin) && !isLocalOrigin) return reply({ error: 'origin_not_allowed' }, 403)
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { 'access-control-allow-origin': origin, vary: 'Origin', 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'content-type, apikey, authorization, x-client-info, x-supabase-api-version' } })
  if (request.method !== 'POST') return reply({ error: 'method_not_allowed' }, 405, origin)
  try {
    const { slug } = await request.json()
    if (typeof slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return reply({ error: 'invalid_request' }, 400, origin)
    const { data: definition } = await client.from('activity_definitions').select('id,title').eq('public_slug', slug).eq('status', 'published').maybeSingle()
    if (!definition) return reply({ activity: null }, 200, origin)
    // Rubrics and correct answers are author-only data. Never include them in
    // the anonymous student contract.
    const { data: questions, error } = await client.from('activity_questions').select('id,position,question_type,prompt,options,max_score,activity_title').eq('definition_id', definition.id).order('position')
    if (error) return reply({ error: 'activity_unavailable' }, 503, origin)
    return reply({ activity: { id: definition.id, title: definition.title, questions } }, 200, origin)
  } catch { return reply({ error: 'invalid_request' }, 400, origin) }
})
