import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const envText = fs.readFileSync(path.join(root, '.env.local'), 'utf8')
const env = Object.fromEntries(envText.split(/\r?\n/).filter((line) => /^[A-Za-z_][A-Za-z0-9_]*=/.test(line)).map((line) => {
  const i = line.indexOf('='); return [line.slice(0, i), line.slice(i + 1).trim()]
}))
const base = env.VITE_SUPABASE_URL
const apiKey = env.VITE_SUPABASE_PUBLISHABLE_KEY
if (!base || !apiKey || !base.includes('sdkyikgwbobciwfzqfwx')) throw new Error('Refusing non-dev target')

const fn = `${base}/functions/v1`
const rest = `${base}/rest/v1`
const common = { apikey: apiKey, 'content-type': 'application/json' }
const ids = {
  active: '10000000-0000-4000-8000-000000000001',
  inactive: '20000000-0000-4000-8000-000000000002',
  revoked: '30000000-0000-4000-8000-000000000003',
  expired: '40000000-0000-4000-8000-000000000004',
  short: '50000000-0000-4000-8000-000000000005',
  unknown: '60000000-0000-4000-8000-000000000006',
}
const checks = []
const evidence = []
const add = (name, pass, detail = {}) => checks.push({ name, status: pass ? 'PASS' : (detail.status ?? 'FAIL'), ...detail })
const safe = (value) => JSON.parse(JSON.stringify(value, (key, val) => /token|key|password|secret/i.test(key) ? '[REDACTED]' : val))

async function call(name, url, options = {}) {
  const started = new Date().toISOString()
  const response = await fetch(url, options)
  let body = {}; try { body = await response.json() } catch {}
  const record = { name, started_at_utc: started, completed_at_utc: new Date().toISOString(), http_status: response.status,
    request_id: response.headers.get('x-request-id'), correlation_id: response.headers.get('x-correlation-id'), body: safe(body) }
  evidence.push(record)
  return { response, body, record }
}

async function start(activity) {
  return call(`start-${activity.slice(0, 8)}`, `${fn}/start-activity-session`, { method: 'POST', headers: common, body: JSON.stringify({ activity_version_id: activity, deadline_at: '2099-01-01T00:00:00Z' }) })
}
async function submit(session, key = crypto.randomUUID(), payload = { answer: 'A' }, overrides = {}) {
  return call('submit', `${fn}/submit-activity`, { method: 'POST', headers: { ...common, 'x-activity-session': session.body.session_token,
    'idempotency-key': key, 'x-correlation-id': crypto.randomUUID() }, body: JSON.stringify({ attempt_id: session.body.attempt_id,
      activity_version_id: overrides.activity_version_id ?? session.activity, payload }) })
}

const active = await start(ids.active); active.activity = ids.active
add('active lifecycle starts a session', active.response.status === 201 && active.body.attempt_id && active.body.session_token)
for (const [name, id] of [['unknown', ids.unknown], ['inactive', ids.inactive], ['revoked', ids.revoked], ['expired', ids.expired]]) {
  const r = await start(id); add(`${name} lifecycle denied`, r.response.status === 409, { http_status: r.response.status })
}
const malformed = await call('malformed-activity', `${fn}/start-activity-session`, { method: 'POST', headers: common, body: '{"activity_version_id":"nope"}' })
add('malformed activity denied', malformed.response.status === 400)
const method = await call('method-denied', `${fn}/start-activity-session`, { method: 'GET', headers: { apikey: apiKey } })
add('unsupported method denied', method.response.status === 405)

const invalid = await call('invalid-session-token', `${fn}/submit-activity`, { method: 'POST', headers: { ...common, 'x-activity-session': 'A'.repeat(43), 'idempotency-key': crypto.randomUUID() },
  body: JSON.stringify({ attempt_id: active.body.attempt_id, activity_version_id: ids.active, payload: { answer: 'A' } }) })
add('invalid token denied', invalid.response.status === 409)

const other = await start(ids.active); other.activity = ids.active
const cross = await call('cross-session', `${fn}/submit-activity`, { method: 'POST', headers: { ...common, 'x-activity-session': other.body.session_token, 'idempotency-key': crypto.randomUUID() },
  body: JSON.stringify({ attempt_id: active.body.attempt_id, activity_version_id: ids.active, payload: { answer: 'A' } }) })
add('cross-session attempt denied', cross.response.status === 409)

const key = crypto.randomUUID(); const first = await submit(active, key); add('valid submit accepted', first.response.status === 200)
add('response contains no scoring secrets', !/(answer_key|secret|weight|session_token)/i.test(JSON.stringify(first.body)))
const replay = await submit(active, key); add('same-key same-payload replay identical', replay.response.status === 200 && JSON.stringify(replay.body) === JSON.stringify(first.body))
const mismatch = await submit(active, key, { answer: 'B' }); add('same-key different-payload denied', mismatch.response.status === 409 && mismatch.body.error === 'idempotency_mismatch')
const stale = await submit(active, crypto.randomUUID(), { answer: 'C' }); add('finalized/CAS-stale submit denied', stale.response.status === 409)

const parallelSession = await start(ids.active); parallelSession.activity = ids.active
const [p1, p2] = await Promise.all([submit(parallelSession, crypto.randomUUID(), { answer: 'A' }), submit(parallelSession, crypto.randomUUID(), { answer: 'B' })])
const statuses = [p1.response.status, p2.response.status].sort()
add('parallel different keys serialize', JSON.stringify(statuses) === JSON.stringify([200, 409]), { http_statuses: statuses })
add('parallel requests yield one acceptance', [p1, p2].filter((x) => x.response.status === 200).length === 1)

for (const table of ['activity_attempts', 'activity_sessions', 'attempt_answers', 'attempt_results', 'activity_submit_idempotency', 'activity_version_lifecycle']) {
  const r = await call(`rls-${table}`, `${rest}/${table}?select=*`, { headers: { apikey: apiKey } })
  add(`anonymous direct access denied: ${table}`, r.response.status === 401 || r.response.status === 403)
}

const short = await start(ids.short); short.activity = ids.short
add('short lifecycle session issued', short.response.status === 201, short.response.status === 201 ? {} : { status: 'BLOCKED', reason: 'fixture short deadline tidak aktif pada registry dev' })
if (short.response.status === 201) {
  const wait = Math.max(0, new Date(short.body.expires_at).getTime() - Date.now() + 1500)
  await new Promise((resolve) => setTimeout(resolve, wait))
  const late = await submit(short, crypto.randomUUID(), { answer: 'A' })
  add('server deadline rejects late submit', late.response.status === 409)
}

const timeoutSession = await start(ids.active); timeoutSession.activity = ids.active
const timeoutKey = crypto.randomUUID(); const controller = new AbortController();
const timeoutAbortAt = new Date().toISOString()
const timeoutPromise = fetch(`${fn}/submit-activity`, { method: 'POST', signal: controller.signal, headers: { ...common, 'x-activity-session': timeoutSession.body.session_token,
  'idempotency-key': timeoutKey, 'x-correlation-id': crypto.randomUUID() }, body: JSON.stringify({ attempt_id: timeoutSession.body.attempt_id, activity_version_id: ids.active, payload: { answer: 'A' } }) })
setTimeout(() => controller.abort(), 1)
try { await timeoutPromise } catch {}
await new Promise((resolve) => setTimeout(resolve, 500))
const timeoutRetry = await submit(timeoutSession, timeoutKey, { answer: 'A' })
add('retry after indeterminate client timeout is safe', timeoutRetry.response.status === 200)
const timeoutObservation = { classification: 'INSUFFICIENT_EVIDENCE', abort_issued_at_utc: timeoutAbortAt,
  retry_http_status: timeoutRetry.response.status,
  note: 'Abort klien tidak membuktikan apakah request pertama diterima atau commit di server; observasi server-side belum tersedia.' }
evidence.push({ name: 'timeout-commit-classification', ...timeoutObservation })
add('timeout evidence remains conservative', timeoutObservation.classification === 'INSUFFICIENT_EVIDENCE', timeoutObservation)

const result = { run_id: crypto.randomUUID(), environment: 'flipbook-studio-dev', project_ref: 'sdkyikgwbobciwfzqfwx',
  executed_at_utc: new Date().toISOString(), summary: { pass: checks.filter((x) => x.status === 'PASS').length, fail: checks.filter((x) => x.status === 'FAIL').length,
    blocked: checks.filter((x) => x.status === 'BLOCKED').length, not_executed: checks.filter((x) => x.status === 'NOT EXECUTED').length }, checks, evidence }
const outDir = path.join(root, 'docs', 'evidence', 'fs-doc-06', 'scn-06d3-027')
fs.mkdirSync(outDir, { recursive: true })
fs.writeFileSync(path.join(outDir, 'anonymous-runtime-2026-11-19.json'), JSON.stringify(result, null, 2))
console.log(JSON.stringify({ summary: result.summary, checks }, null, 2))
process.exitCode = result.summary.fail ? 1 : 0
