// NONPRODUCTION PREPARATION ONLY. Deploy only after separate approval.
import { createClient } from 'npm:@supabase/supabase-js@2'

const url = Deno.env.get('SUPABASE_URL') ?? ''
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const client = createClient(url, serviceKey, { auth: { persistSession: false } })
const origin = 'http://localhost:5173'
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const ACTIVITY_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43,128}$/

function response(body: Record<string, unknown>, status = 200, requestId = '', correlationId = '') {
  return new Response(JSON.stringify(body), { status, headers: {
    'content-type': 'application/json', 'access-control-allow-origin': origin,
    'access-control-allow-headers': 'x-activity-session, content-type, idempotency-key, x-correlation-id',
    'access-control-allow-methods': 'POST, OPTIONS', 'cache-control': 'no-store',
    ...(requestId ? { 'x-request-id': requestId } : {}),
    ...(correlationId ? { 'x-correlation-id': correlationId } : {}),
  }})
}

function safeCorrelationId(value: string | null, fallback: string) {
  return value && /^[A-Za-z0-9._:-]{1,128}$/.test(value) ? value : fallback
}

function audit(event: string, fields: Record<string, unknown>) {
  // Structured, secret-free evidence. Never log bearer tokens, payloads, answers, or raw PII.
  console.info(JSON.stringify({ event, ...fields }))
}

async function persistAudit(event: string, fields: Record<string, unknown>) {
  audit(event, fields)
  const { error } = await client.from('activity_submit_audit_events').insert({
    request_id: fields.request_id,
    correlation_id: fields.correlation_id,
    event_type: event,
    server_timestamp_utc: fields.server_timestamp_utc,
    actor_subject_hash: fields.actor_subject_hash ?? null,
    attempt_id: fields.attempt_id ?? null,
    activity_version_id: fields.activity_version_id ?? null,
    transaction_status: fields.transaction_status ?? 'unknown',
    reason_code: fields.reason ?? null,
    function_version: 'submit-activity-local',
    migration_version: '20261119080000',
  })
  if (error) console.error(JSON.stringify({ event: 'audit_persist_failed', request_id: fields.request_id, correlation_id: fields.correlation_id }))
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (request) => {
  const requestId = crypto.randomUUID()
  const correlationId = safeCorrelationId(request.headers.get('x-correlation-id'), requestId)
  const receivedAt = new Date().toISOString()
  await persistAudit('request_received', { request_id: requestId, correlation_id: correlationId, server_timestamp_utc: receivedAt, method: request.method, transaction_status: 'not_started' })
  if (request.method === 'OPTIONS') return response({}, 204, requestId, correlationId)
  if (request.method !== 'POST') {
    await persistAudit('request_rejected', { request_id: requestId, correlation_id: correlationId, server_timestamp_utc: new Date().toISOString(), reason: 'method_not_allowed', transaction_status: 'not_started' })
    return response({ error: 'method_not_allowed' }, 405, requestId, correlationId)
  }
  const contentLength = Number(request.headers.get('content-length') ?? 0)
  if (contentLength > 65536) {
    await persistAudit('request_rejected', { request_id: requestId, correlation_id: correlationId, server_timestamp_utc: new Date().toISOString(), reason: 'request_too_large', transaction_status: 'not_started' })
    return response({ error: 'request_too_large' }, 413, requestId, correlationId)
  }
  try {
    const body = await request.json() as Record<string, unknown>
    // Students do not use Supabase Auth. This endpoint accepts only a
    // server-issued, attempt-bound activity session token.
    const token = request.headers.get('x-activity-session')
    const key = request.headers.get('idempotency-key')
    if (!token || !ACTIVITY_TOKEN_PATTERN.test(token) || !key || !UUID_PATTERN.test(key) || typeof body.attempt_id !== 'string' || typeof body.activity_version_id !== 'string') {
      await persistAudit('request_rejected', { request_id: requestId, correlation_id: correlationId, server_timestamp_utc: new Date().toISOString(), reason: 'invalid_request', transaction_status: 'not_started' })
      return response({ error: 'invalid_request' }, 400, requestId, correlationId)
    }
    const payload = body.payload ?? {}
    const fingerprint = await sha256(JSON.stringify(payload))
    const tokenHash = await sha256(token)
    const { data, error } = await client.rpc('student_submit_activity', {
      p_attempt_id: body.attempt_id, p_session_token_hash: tokenHash,
      p_activity_version_id: body.activity_version_id, p_payload: payload,
      p_idempotency_key: key, p_request_fingerprint: fingerprint,
    })
    if (error) {
      const reason = error.message === 'idempotency_mismatch' ? 'idempotency_conflict' : 'submit_rejected'
      await persistAudit(error.message === 'idempotency_mismatch' ? 'idempotency_conflict' : 'request_rejected', { request_id: requestId, correlation_id: correlationId, server_timestamp_utc: new Date().toISOString(), reason, transaction_status: 'rolled_back_or_rejected', attempt_id: body.attempt_id, activity_version_id: body.activity_version_id })
      return response({ error: error.message === 'idempotency_mismatch' ? 'idempotency_mismatch' : 'submit_rejected' }, 409, requestId, correlationId)
    }
    await persistAudit('submit_accepted', { request_id: requestId, correlation_id: correlationId, server_timestamp_utc: new Date().toISOString(), transaction_status: 'committed', attempt_id: body.attempt_id, activity_version_id: body.activity_version_id })
    return response(data as Record<string, unknown>, 200, requestId, correlationId)
  } catch {
    await persistAudit('request_rejected', { request_id: requestId, correlation_id: correlationId, server_timestamp_utc: new Date().toISOString(), reason: 'malformed_request', transaction_status: 'not_started' })
    return response({ error: 'invalid_request' }, 400, requestId, correlationId)
  }
})
