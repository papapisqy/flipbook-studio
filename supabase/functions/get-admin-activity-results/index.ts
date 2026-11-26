import { createClient } from 'npm:@supabase/supabase-js@2'

const service = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { persistSession: false } },
)

const origins = new Set((Deno.env.get('ALLOWED_ORIGINS') ?? 'http://localhost:4173,http://localhost:5173').split(',').map((value) => value.trim()).filter(Boolean))
const json = (body: Record<string, unknown>, status = 200, origin = '') => Response.json(body, {
  status,
  headers: {
    'content-type': 'application/json',
    'cache-control': 'no-store',
    ...(origin ? { 'access-control-allow-origin': origin, vary: 'Origin' } : {}),
  },
})

Deno.serve(async (request) => {
  const origin = request.headers.get('origin') ?? ''
  const isLocalOrigin = /^http:\/\/localhost(?::\d+)?$/.test(origin)
  if (origin && !origins.has(origin) && !isLocalOrigin) return json({ error: 'origin_not_allowed' }, 403, origin)
  if (request.method === 'OPTIONS') return new Response(null, {
    status: 204,
    headers: {
      'access-control-allow-origin': origin,
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'content-type, apikey, authorization, x-client-info, x-supabase-api-version',
      vary: 'Origin',
    },
  })
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405, origin)

  const authorization = request.headers.get('authorization') ?? ''
  const token = authorization.replace(/^Bearer\s+/i, '')
  if (!token) return json({ error: 'unauthorized' }, 401, origin)

  const { data: userData, error: userError } = await service.auth.getUser(token)
  if (userError || !userData.user) return json({ error: 'unauthorized' }, 401, origin)
  const adminId = userData.user.id

  const { data: profile } = await service.from('admin_profiles').select('id').eq('id', adminId).eq('access_status', 'active').maybeSingle()
  if (!profile) return json({ error: 'forbidden' }, 403, origin)

  const { data: definitions, error: definitionsError } = await service
    .from('activity_definitions')
    .select('id,title')
    .eq('owner_admin_id', adminId)
  if (definitionsError) return json({ error: 'unavailable' }, 503, origin)

  const definitionIds = (definitions ?? []).map((definition) => definition.id)
  if (!definitionIds.length) return json({ attempts: [] }, 200, origin)

  const { data: attempts, error: attemptsError } = await service
    .from('activity_attempts')
    .select('id,activity_version_id,student_full_name,student_class,student_school,status,finalized_at,created_at')
    .in('activity_version_id', definitionIds)
    .order('created_at', { ascending: false })
  if (attemptsError) return json({ error: 'unavailable' }, 503, origin)

  const attemptIds = (attempts ?? []).map((attempt) => attempt.id)
  const { data: results } = attemptIds.length
    ? await service.from('attempt_results').select('attempt_id,final_score,review_status').in('attempt_id', attemptIds)
    : { data: [] as Array<{ attempt_id: string; final_score: number | null; review_status: string | null }> }
  const titleById = new Map((definitions ?? []).map((definition) => [definition.id, definition.title]))
  const resultByAttempt = new Map((results ?? []).map((result) => [result.attempt_id, result]))
  const rows = (attempts ?? []).map((attempt) => ({
    ...attempt,
    lkpd_title: titleById.get(attempt.activity_version_id) ?? 'LKPD',
    result: resultByAttempt.get(attempt.id) ?? null,
  }))
  return json({ attempts: rows }, 200, origin)
})
