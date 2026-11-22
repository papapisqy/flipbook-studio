import { describe, expect, it } from 'vitest'
import { generateActivitySessionToken, hashActivitySessionToken } from '../supabase/functions/_shared/activitySession'

describe('anonymous activity session token', () => {
  it('uses high-entropy URL-safe tokens', () => {
    const token = generateActivitySessionToken()
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/)
  })
  it('stores only a deterministic hash and separates different tokens', async () => {
    const a = generateActivitySessionToken(); const b = generateActivitySessionToken()
    expect(await hashActivitySessionToken(a)).toHaveLength(64)
    expect(await hashActivitySessionToken(a)).toBe(await hashActivitySessionToken(a))
    expect(await hashActivitySessionToken(a)).not.toBe(await hashActivitySessionToken(b))
  })
})
