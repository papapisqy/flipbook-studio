import { withSupabase } from 'npm:@supabase/server@1'

type RequestBody = {
  operation?: unknown
  bookId?: unknown
  draftId?: unknown
  expectedRevision?: unknown
  title?: unknown
  draftMetadata?: unknown
  idempotencyKey?: unknown
  pageId?: unknown
  position?: unknown
  content?: unknown
  componentId?: unknown
  componentType?: unknown
  configuration?: unknown
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const MAX_TITLE_LENGTH = 200
const MAX_JSON_BYTES = 256 * 1024

function json(body: Record<string, unknown>, status = 200) {
  return Response.json(body, status === 204 ? undefined : { status, headers: { 'content-type': 'application/json; charset=utf-8' } })
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value)
}

function isMetadataObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && new TextEncoder().encode(JSON.stringify(value)).byteLength <= MAX_JSON_BYTES
}

function isValidTitle(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= MAX_TITLE_LENGTH
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

const DEFAULT_ORIGIN = 'http://localhost:5173'
const allowedOrigins = new Set((Deno.env.get('ALLOWED_ORIGINS') ?? DEFAULT_ORIGIN).split(',').map((value) => value.trim()).filter(Boolean))

function corsHeaders(origin: string) {
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type, x-retry-count, traceparent, tracestate, baggage',
    'access-control-allow-methods': 'POST, OPTIONS',
    'vary': 'Origin',
  }
}

const protectedHandler = withSupabase({ auth: 'user' }, async (request, context) => {
    if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

    const callerId = typeof context.userClaims?.id === 'string' ? context.userClaims.id : null
    if (!isUuid(callerId)) return json({ error: 'unauthorized' }, 401)

    let input: RequestBody
    try {
      input = await request.json() as RequestBody
    } catch {
      return json({ error: 'invalid_request' }, 400)
    }

    const { data: profile, error: profileError } = await context.supabaseAdmin
      .from('admin_profiles')
      .select('id')
      .eq('id', callerId)
      .eq('access_status', 'active')
      .maybeSingle()
    if (profileError) return json({ error: 'temporarily_unavailable' }, 503)
    if (!profile) return json({ error: 'forbidden' }, 403)

    const correlationId = crypto.randomUUID()
    const idempotencyKey = input.idempotencyKey === undefined ? crypto.randomUUID() : input.idempotencyKey
    if (!isUuid(idempotencyKey)) return json({ error: 'invalid_request' }, 400)
    if (input.operation === 'create') {
      if (!isUuid(input.bookId) || !isUuid(input.draftId) || !isValidTitle(input.title)) {
        return json({ error: 'invalid_request' }, 400)
      }
      const { data, error } = await context.supabaseAdmin.rpc('admin_create_book_with_draft_idempotent', {
        p_actor_admin_id: callerId,
        p_book_id: input.bookId,
        p_draft_id: input.draftId,
        p_title: input.title,
        p_idempotency_key: idempotencyKey,
        p_correlation_id: correlationId,
      })
      if (error) {
        console.error('book_create_failed', { code: error.code, callerId, correlationId })
        return json({ error: 'operation_rejected', correlationId }, 409)
      }
      return json({ ...(data as Record<string, unknown>), correlationId }, 201)
    }

    if (input.operation === 'update_metadata') {
      if (!isUuid(input.bookId) || !isNonNegativeSafeInteger(input.expectedRevision) || !isValidTitle(input.title) || !isMetadataObject(input.draftMetadata)) {
        return json({ error: 'invalid_request' }, 400)
      }
      const { data, error } = await context.supabaseAdmin.rpc('admin_update_book_draft_metadata_cas_idempotent', {
        p_actor_admin_id: callerId,
        p_book_id: input.bookId,
        p_expected_revision: input.expectedRevision,
        p_title: input.title,
        p_draft_metadata: input.draftMetadata,
        p_idempotency_key: idempotencyKey,
        p_correlation_id: correlationId,
      })
      if (error) {
        console.error('book_update_rejected', { code: error.code, callerId, correlationId })
        return json({ error: 'operation_rejected', correlationId }, 409)
      }
      return json({ status: 'updated', bookId: input.bookId, revision: data, correlationId })
    }

    if (input.operation === 'archive') {
      if (!isUuid(input.bookId) || !isNonNegativeSafeInteger(input.expectedRevision)) {
        return json({ error: 'invalid_request' }, 400)
      }
      const { data, error } = await context.supabaseAdmin.rpc('admin_archive_book_cas_idempotent', {
        p_actor_admin_id: callerId,
        p_book_id: input.bookId,
        p_expected_revision: input.expectedRevision,
        p_idempotency_key: idempotencyKey,
        p_correlation_id: correlationId,
      })
      if (error) {
        console.error('book_archive_rejected', { code: error.code, callerId, correlationId })
        return json({ error: 'operation_rejected', correlationId }, 409)
      }
      return json({ status: 'archived', bookId: input.bookId, revision: data, correlationId })
    }

    if (input.operation === 'list_structure') {
      if (!isUuid(input.bookId)) return json({ error: 'invalid_request' }, 400)
      const { data, error } = await context.supabaseAdmin.rpc('admin_list_draft_structure', { p_actor_admin_id: callerId, p_book_id: input.bookId })
      if (error) return json({ error: 'operation_rejected', correlationId }, 409)
      return json({ structure: data ?? [], correlationId })
    }

    if (input.operation === 'upsert_page') {
      if (!isUuid(input.bookId) || !isUuid(input.pageId) || !isNonNegativeSafeInteger(input.expectedRevision) || !isNonNegativeSafeInteger(input.position) || !isMetadataObject(input.content)) return json({ error: 'invalid_request' }, 400)
      const { data, error } = await context.supabaseAdmin.rpc('admin_upsert_draft_page', { p_actor_admin_id: callerId, p_book_id: input.bookId, p_page_id: input.pageId, p_expected_revision: input.expectedRevision, p_position: input.position, p_content: input.content, p_correlation_id: correlationId })
      if (error) return json({ error: 'operation_rejected', correlationId }, 409)
      return json({ status: 'updated', bookId: input.bookId, pageId: input.pageId, revision: data, correlationId })
    }

    if (input.operation === 'archive_page') {
      if (!isUuid(input.bookId) || !isUuid(input.pageId) || !isNonNegativeSafeInteger(input.expectedRevision)) return json({ error: 'invalid_request' }, 400)
      const { data, error } = await context.supabaseAdmin.rpc('admin_archive_draft_page', { p_actor_admin_id: callerId, p_book_id: input.bookId, p_page_id: input.pageId, p_expected_revision: input.expectedRevision, p_correlation_id: correlationId })
      if (error) return json({ error: 'operation_rejected', correlationId }, 409)
      return json({ status: 'archived', bookId: input.bookId, pageId: input.pageId, revision: data, correlationId })
    }

    if (input.operation === 'upsert_component') {
      if (!isUuid(input.bookId) || !isUuid(input.componentId) || !isUuid(input.pageId) || !isNonNegativeSafeInteger(input.expectedRevision) || !isNonNegativeSafeInteger(input.position) || typeof input.componentType !== 'string' || input.componentType.trim() === '' || !isMetadataObject(input.configuration)) return json({ error: 'invalid_request' }, 400)
      const { data, error } = await context.supabaseAdmin.rpc('admin_upsert_draft_component', { p_actor_admin_id: callerId, p_book_id: input.bookId, p_component_id: input.componentId, p_page_id: input.pageId, p_expected_revision: input.expectedRevision, p_position: input.position, p_component_type: input.componentType, p_configuration: input.configuration, p_correlation_id: correlationId })
      if (error) return json({ error: 'operation_rejected', correlationId }, 409)
      return json({ status: 'updated', bookId: input.bookId, pageId: input.pageId, componentId: input.componentId, revision: data, correlationId })
    }

    return json({ error: 'invalid_request' }, 400)
})

export default {
  fetch: async (request: Request) => {
    const origin = request.headers.get('origin')
    if (origin && !allowedOrigins.has(origin)) return json({ error: 'origin_not_allowed' }, 403)
    if (request.method === 'OPTIONS') {
      if (!origin || !allowedOrigins.has(origin)) return json({ error: 'origin_not_allowed' }, 403)
      return new Response(null, { status: 204, headers: corsHeaders(origin) })
    }
    const response = await protectedHandler(request)
    if (!origin) return response
    const headers = new Headers(response.headers)
    for (const [key, value] of Object.entries(corsHeaders(origin))) headers.set(key, value)
    return new Response(response.body, { status: response.status, headers })
  },
}
