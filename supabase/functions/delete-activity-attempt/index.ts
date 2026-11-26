import { withSupabase } from 'npm:@supabase/server@1'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const DEFAULT_ORIGIN = 'http://localhost:4173,http://localhost:5173'
const allowedOrigins = new Set((Deno.env.get('ALLOWED_ORIGINS') ?? DEFAULT_ORIGIN).split(',').map((value) => value.trim()).filter(Boolean))

function json(body: Record<string, unknown>, status = 200) {
  return Response.json(body, { status, headers: { 'content-type': 'application/json; charset=utf-8' } })
}

function cors(origin: string) {
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
    'access-control-allow-methods': 'POST, OPTIONS',
    vary: 'Origin',
  }
}

const handler = withSupabase({ auth: 'user' }, async (request, context) => {
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)
  const actorId = typeof context.userClaims?.id === 'string' ? context.userClaims.id : ''
  if (!UUID.test(actorId)) return json({ error: 'unauthorized' }, 401)

  let body: { attempt_id?: unknown }
  try { body = await request.json() } catch { return json({ error: 'invalid_request' }, 400) }
  const attemptId = String(body.attempt_id ?? '')
  if (!UUID.test(attemptId)) return json({ error: 'invalid_request' }, 400)

  const { data: profile, error: profileError } = await context.supabaseAdmin
    .from('admin_profiles').select('id').eq('id', actorId).eq('access_status', 'active').maybeSingle()
  if (profileError) return json({ error: 'temporarily_unavailable' }, 503)
  if (!profile) return json({ error: 'forbidden' }, 403)

  const { data: attempt, error: attemptError } = await context.supabaseAdmin
    .from('activity_attempts')
    .select('id,activity_version_id')
    .eq('id', attemptId)
    .maybeSingle()
  if (attemptError) return json({ error: 'temporarily_unavailable' }, 503)
  if (!attempt) return json({ error: 'not_found' }, 404)

  const { data: definition, error: definitionError } = await context.supabaseAdmin
    .from('activity_definitions').select('id').eq('id', attempt.activity_version_id).eq('owner_admin_id', actorId).maybeSingle()
  if (definitionError) return json({ error: 'temporarily_unavailable' }, 503)
  if (!definition) return json({ error: 'forbidden' }, 403)

  // Delete dependent records first because older installations may not have
  // cascading foreign keys on every activity table.
  const deletions = await Promise.all([
    context.supabaseAdmin.from('attempt_manual_marks').delete().eq('attempt_id', attemptId),
    context.supabaseAdmin.from('attempt_answers').delete().eq('attempt_id', attemptId),
    context.supabaseAdmin.from('attempt_results').delete().eq('attempt_id', attemptId),
    context.supabaseAdmin.from('activity_submit_idempotency').delete().eq('attempt_id', attemptId),
    context.supabaseAdmin.from('activity_sessions').delete().eq('attempt_id', attemptId),
  ])
  if (deletions.some(({ error }) => error)) return json({ error: 'delete_rejected' }, 422)

  const { error: deleteError } = await context.supabaseAdmin.from('activity_attempts').delete().eq('id', attemptId)
  if (deleteError) return json({ error: 'delete_rejected' }, 422)
  return json({ status: 'deleted' })
})

export default {
  fetch: async (request: Request) => {
    const origin = request.headers.get('origin')
    const isLocalOrigin = /^http:\/\/localhost(?::\d+)?$/.test(origin ?? '')
    if (origin && !allowedOrigins.has(origin) && !isLocalOrigin) return json({ error: 'origin_not_allowed' }, 403)
    if (request.method === 'OPTIONS') return !origin || (!allowedOrigins.has(origin) && !isLocalOrigin)
      ? json({ error: 'origin_not_allowed' }, 403)
      : new Response(null, { status: 204, headers: cors(origin) })
    const response = await handler(request)
    if (!origin) return response
    const headers = new Headers(response.headers)
    Object.entries(cors(origin)).forEach(([key, value]) => headers.set(key, value))
    return new Response(response.body, { status: response.status, headers })
  },
}
