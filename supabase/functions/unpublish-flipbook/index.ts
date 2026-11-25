import { withSupabase } from 'npm:@supabase/server@1'

const origins = new Set((Deno.env.get('ALLOWED_ORIGINS') ?? 'http://localhost:5173').split(',').map(value => value.trim()).filter(Boolean))
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const json = (body: Record<string, unknown>, status = 200, origin = '') => Response.json(body, { status, headers: { 'content-type': 'application/json', ...(origin ? { 'access-control-allow-origin': origin, vary: 'Origin' } : {}) } })

const handler = withSupabase({ auth: 'user' }, async (request, context) => {
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)
  const input = await request.json().catch(() => null) as Record<string, unknown> | null
  const actorId = typeof context.userClaims?.id === 'string' ? context.userClaims.id : ''
  if (!input || typeof input.slug !== 'string' || !slugPattern.test(input.slug)) return json({ error: 'invalid_request' }, 400)
  const { error } = await context.supabaseAdmin.rpc('admin_unpublish_flipbook', { p_actor_admin_id: actorId, p_slug: input.slug })
  return error ? json({ error: 'unpublish_rejected' }, 409) : json({ status: 'unpublished', slug: input.slug })
})

export default { fetch: async (request: Request) => {
  const origin = request.headers.get('origin') ?? ''
  if (origin && !origins.has(origin)) return json({ error: 'origin_not_allowed' }, 403)
  if (request.method === 'OPTIONS') return origin ? new Response(null, { status: 204, headers: { 'access-control-allow-origin': origin, 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'authorization, apikey, content-type', vary: 'Origin' } }) : json({ error: 'origin_not_allowed' }, 403)
  const response = await handler(request)
  if (!origin) return response
  const headers = new Headers(response.headers); headers.set('access-control-allow-origin', origin); headers.set('vary', 'Origin')
  return new Response(response.body, { status: response.status, headers })
} }
