import { withSupabase } from 'npm:@supabase/server@1'

// Keep a safe production fallback for the deployed application. ALLOWED_ORIGINS
// remains the source of truth and can add a custom domain or preview domains.
const origins = new Set((Deno.env.get('ALLOWED_ORIGINS') ?? 'http://localhost:5173,http://localhost:4173,https://flipbook-studio-three.vercel.app').split(',').map((value) => value.trim()).filter(Boolean))
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const json = (body: Record<string, unknown>, status = 200, origin = '') => Response.json(body, { status, headers: { 'content-type': 'application/json', ...(origin ? { 'access-control-allow-origin': origin, vary: 'Origin' } : {}) } })
const validSnapshot = (value: unknown) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const snapshot = value as { pages?: unknown; blocks?: unknown; canvasHeader?: unknown }
  if (!Array.isArray(snapshot.pages) || snapshot.pages.length < 1 || snapshot.pages.length > 200) return false
  if (typeof snapshot.canvasHeader !== 'undefined' && (typeof snapshot.canvasHeader !== 'string' || snapshot.canvasHeader.length > 500)) return false
  if (typeof snapshot.blocks !== 'undefined' && (!snapshot.blocks || typeof snapshot.blocks !== 'object' || Array.isArray(snapshot.blocks))) return false
  const pageIds = new Set<string>()
  const pagesAreValid = snapshot.pages.every(page => {
    if (!page || typeof page !== 'object' || Array.isArray(page)) return false
    const item = page as { id?: unknown; label?: unknown; body?: unknown }
    if (typeof item.id !== 'string' || item.id.length < 1 || item.id.length > 200 || pageIds.has(item.id)) return false
    pageIds.add(item.id)
    return typeof item.label === 'string' && item.label.length <= 500 && (typeof item.body === 'undefined' || typeof item.body === 'string' && item.body.length <= 20_000)
  })
  if (!pagesAreValid) return false
  if (!snapshot.blocks) return true
  const allowedTypes = new Set(['Judul', 'Teks', 'Gambar', 'Video', 'Audio', 'Tombol', 'Aktivitas', 'heading', 'text', 'image', 'video', 'audio', 'button'])
  const entries = Object.entries(snapshot.blocks as Record<string, unknown>)
  return entries.length <= 200 && entries.every(([pageId, blocks]) => pageIds.has(pageId) && Array.isArray(blocks) && blocks.length <= 50 && blocks.every(block => {
    if (!block || typeof block !== 'object' || Array.isArray(block)) return false
    const item = block as Record<string, unknown>
    return typeof item.type === 'string' && allowedTypes.has(item.type) && (typeof item.id === 'undefined' || typeof item.id === 'string' && item.id.length <= 200) && (typeof item.content === 'undefined' || typeof item.content === 'string' && item.content.length <= 20_000) && (typeof item.url === 'undefined' || typeof item.url === 'string' && item.url.length <= 4_000)
  }))
}

const handler = withSupabase({ auth: 'user' }, async (request, context) => {
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)
  const actorId = typeof context.userClaims?.id === 'string' ? context.userClaims.id : ''
  const input = await request.json().catch(() => null) as Record<string, unknown> | null
  if (!input || typeof input.slug !== 'string' || !slugPattern.test(input.slug) || typeof input.title !== 'string' || input.title.trim().length < 1 || input.title.trim().length > 200 || !validSnapshot(input.snapshot)) return json({ error: 'invalid_request' }, 400)
  const { error } = await context.supabaseAdmin.rpc('admin_publish_flipbook', { p_actor_admin_id: actorId, p_slug: input.slug, p_title: input.title.trim(), p_snapshot: input.snapshot })
  return error ? json({ error: 'publication_rejected' }, 409) : json({ status: 'published', slug: input.slug })
})

export default { fetch: async (request: Request) => {
  const origin = request.headers.get('origin')
  if (origin && !origins.has(origin)) return json({ error: 'origin_not_allowed' }, 403)
  if (request.method === 'OPTIONS') return origin ? new Response(null, { status: 204, headers: { 'access-control-allow-origin': origin, 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'authorization, apikey, content-type, x-client-info, x-supabase-api-version', vary: 'Origin' } }) : json({ error: 'origin_not_allowed' }, 403)
  const response = await handler(request)
  if (!origin) return response
  const headers = new Headers(response.headers); headers.set('access-control-allow-origin', origin); headers.set('vary', 'Origin')
  return new Response(response.body, { status: response.status, headers })
} }
