import { withSupabase } from 'npm:@supabase/server@1'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const origins = new Set((Deno.env.get('ALLOWED_ORIGINS') ?? 'http://localhost:5173,http://localhost:4173,https://flipbook-studio-three.vercel.app').split(',').map(value => value.trim()).filter(Boolean))
const json = (body: Record<string, unknown>, status = 200) => Response.json(body, { status, headers: { 'content-type': 'application/json; charset=utf-8' } })
const cors = (origin: string) => ({ 'access-control-allow-origin': origin, 'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type', 'access-control-allow-methods': 'POST, OPTIONS', vary: 'Origin' })

const handler = withSupabase({ auth: 'user' }, async (request, context) => {
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)
  const actorId = typeof context.userClaims?.id === 'string' ? context.userClaims.id : ''
  let body: { definition_id?: unknown }
  try { body = await request.json() } catch { return json({ error: 'invalid_request' }, 400) }
  const definitionId = String(body.definition_id ?? '')
  if (!UUID.test(actorId) || !UUID.test(definitionId)) return json({ error: 'invalid_request' }, 400)

  const { data: definition, error: definitionError } = await context.supabaseAdmin
    .from('activity_definitions').select('id').eq('id', definitionId).eq('owner_admin_id', actorId).maybeSingle()
  if (definitionError) return json({ error: 'temporarily_unavailable' }, 503)
  if (!definition) return json({ error: 'not_found' }, 404)

  // Student attempts are historical dependants. Delete them explicitly before
  // deleting the definition so older databases without cascade constraints work.
  const { data: attempts, error: attemptsError } = await context.supabaseAdmin
    .from('activity_attempts').select('id').eq('activity_version_id', definitionId)
  if (attemptsError) return json({ error: 'temporarily_unavailable' }, 503)
  const attemptIds = (attempts ?? []).map(({ id }) => id)
  if (attemptIds.length) {
    const dependentDeletes = await Promise.all([
      context.supabaseAdmin.from('attempt_manual_marks').delete().in('attempt_id', attemptIds),
      context.supabaseAdmin.from('attempt_answers').delete().in('attempt_id', attemptIds),
      context.supabaseAdmin.from('attempt_results').delete().in('attempt_id', attemptIds),
      context.supabaseAdmin.from('activity_submit_idempotency').delete().in('attempt_id', attemptIds),
      context.supabaseAdmin.from('activity_sessions').delete().in('attempt_id', attemptIds),
    ])
    if (dependentDeletes.some(({ error }) => error)) return json({ error: 'delete_rejected' }, 422)
    const { error } = await context.supabaseAdmin.from('activity_attempts').delete().in('id', attemptIds)
    if (error) return json({ error: 'delete_rejected' }, 422)
  }
  const { error: questionsError } = await context.supabaseAdmin.from('activity_questions').delete().eq('definition_id', definitionId)
  if (questionsError) return json({ error: 'delete_rejected' }, 422)
  const { error: deleteError } = await context.supabaseAdmin.from('activity_definitions').delete().eq('id', definitionId).eq('owner_admin_id', actorId)
  return deleteError ? json({ error: 'delete_rejected' }, 422) : json({ status: 'deleted' })
})

export default { fetch: async (request: Request) => {
  const origin = request.headers.get('origin') ?? ''
  if (origin && !origins.has(origin)) return json({ error: 'origin_not_allowed' }, 403)
  if (request.method === 'OPTIONS') return origin ? new Response(null, { status: 204, headers: cors(origin) }) : json({ error: 'origin_not_allowed' }, 403)
  const response = await handler(request)
  if (!origin) return response
  const headers = new Headers(response.headers)
  Object.entries(cors(origin)).forEach(([key, value]) => headers.set(key, value))
  return new Response(response.body, { status: response.status, headers })
} }
