import { withSupabase } from 'npm:@supabase/server@1'

type ProvisionRequest = {
  targetAdminId?: unknown
  displayName?: unknown
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function json(body: Record<string, unknown>, status = 200) {
  return Response.json(body, { status, headers: { 'content-type': 'application/json; charset=utf-8' } })
}

const LOCAL_DEV_ORIGIN = 'http://localhost:5173'

function corsHeaders() {
  return {
    'access-control-allow-origin': LOCAL_DEV_ORIGIN,
    'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type, x-retry-count, traceparent, tracestate, baggage',
    'access-control-allow-methods': 'POST, OPTIONS',
    'vary': 'Origin',
  }
}

const protectedHandler = withSupabase({ auth: 'user' }, async (request, context) => {
    if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

    const callerId = typeof context.userClaims?.id === 'string' ? context.userClaims.id : null
    if (!callerId || !UUID_PATTERN.test(callerId)) return json({ error: 'unauthorized' }, 401)

    let input: ProvisionRequest
    try {
      input = await request.json() as ProvisionRequest
    } catch {
      return json({ error: 'invalid_request' }, 400)
    }

    const targetAdminId = typeof input.targetAdminId === 'string' ? input.targetAdminId : ''
    const displayName = typeof input.displayName === 'string' ? input.displayName.trim() : null
    if (!UUID_PATTERN.test(targetAdminId) || (displayName !== null && displayName.length > 120)) {
      return json({ error: 'invalid_request' }, 400)
    }

    // This check is deliberately independent of the RPC. A caller must already
    // be an active application admin; a signed-in Auth user is insufficient.
    const { data: callerProfile, error: callerError } = await context.supabaseAdmin
      .from('admin_profiles')
      .select('id')
      .eq('id', callerId)
      .eq('access_status', 'active')
      .maybeSingle()
    if (callerError) return json({ error: 'temporarily_unavailable' }, 503)
    if (!callerProfile) return json({ error: 'forbidden' }, 403)

    // The RPC is intentionally not created by this source file. It must be
    // reviewed in a separate migration because it performs the atomic profile
    // creation + audit write under a privileged database boundary.
    const { error: provisionError } = await context.supabaseAdmin.rpc('admin_provision_profile', {
      p_actor_admin_id: callerId,
      p_target_admin_id: targetAdminId,
      p_display_name: displayName,
      p_correlation_id: crypto.randomUUID(),
    })
    if (provisionError) {
      console.error('admin_provision_failed', { code: provisionError.code, callerId })
      return json({ error: 'provisioning_failed' }, 409)
    }

    return json({ status: 'provisioned', targetAdminId }, 201)
})

export default {
  fetch: async (request: Request) => {
    const origin = request.headers.get('origin')
    if (origin && origin !== LOCAL_DEV_ORIGIN) return json({ error: 'origin_not_allowed' }, 403)
    if (request.method === 'OPTIONS') {
      if (origin !== LOCAL_DEV_ORIGIN) return json({ error: 'origin_not_allowed' }, 403)
      return new Response(null, { status: 204, headers: corsHeaders() })
    }
    const response = await protectedHandler(request)
    if (origin !== LOCAL_DEV_ORIGIN) return response
    const headers = new Headers(response.headers)
    for (const [key, value] of Object.entries(corsHeaders())) headers.set(key, value)
    return new Response(response.body, { status: response.status, headers })
  },
}
