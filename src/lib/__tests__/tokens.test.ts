import { describe, it, expect, beforeAll } from 'vitest'
import { signResetToken, verifyResetTokenSignature } from '../tokens'

beforeAll(() => {
  process.env.AUTH_SECRET = 'test-secret-not-for-production-use'
})

describe('signResetToken / verifyResetTokenSignature', () => {
  it('accepts a correctly signed token', () => {
    const uuid = 'a1b2c3d4-0000-0000-0000-000000000000'
    const token = `${uuid}.${signResetToken(uuid)}`
    const result = verifyResetTokenSignature(token)
    expect(result.valid).toBe(true)
    expect(result.uuid).toBe(uuid)
  })

  it('rejects a tampered uuid', () => {
    const uuid = 'a1b2c3d4-0000-0000-0000-000000000000'
    const signature = signResetToken(uuid)
    const tampered = `different-uuid-entirely.${signature}`
    expect(verifyResetTokenSignature(tampered).valid).toBe(false)
  })

  it('rejects a tampered signature', () => {
    const uuid = 'a1b2c3d4-0000-0000-0000-000000000000'
    const token = `${uuid}.0000000000000000000000000000000000000000000000000000000000000000`
    expect(verifyResetTokenSignature(token).valid).toBe(false)
  })

  it('rejects a malformed token (wrong number of parts)', () => {
    expect(verifyResetTokenSignature('no-dot-separator').valid).toBe(false)
    expect(verifyResetTokenSignature('too.many.parts.here').valid).toBe(false)
  })

  it('produces different signatures for different uuids', () => {
    const sigA = signResetToken('uuid-a')
    const sigB = signResetToken('uuid-b')
    expect(sigA).not.toBe(sigB)
  })
})
