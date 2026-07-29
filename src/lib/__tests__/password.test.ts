import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword } from '../password'

describe('hashPassword / verifyPassword', () => {
  it('round-trips: hash then verify the same password succeeds', async () => {
    const hash = await hashPassword('correct horse battery staple')
    expect(await verifyPassword('correct horse battery staple', hash)).toBe(true)
  })

  it('rejects the wrong password', async () => {
    const hash = await hashPassword('correct horse battery staple')
    expect(await verifyPassword('wrong password', hash)).toBe(false)
  })

  it('produces a different hash each time (no salt reuse)', async () => {
    const a = await hashPassword('same password')
    const b = await hashPassword('same password')
    expect(a).not.toBe(b)
    // both still verify correctly despite differing salts
    expect(await verifyPassword('same password', a)).toBe(true)
    expect(await verifyPassword('same password', b)).toBe(true)
  })

  it('stores a versioned scrypt:salt:hash format', async () => {
    const hash = await hashPassword('anything')
    const parts = hash.split(':')
    expect(parts).toHaveLength(3)
    expect(parts[0]).toBe('scrypt')
  })

  it('returns false (not a throw) for a malformed stored hash', async () => {
    await expect(verifyPassword('anything', 'not-a-valid-hash')).resolves.toBe(false)
    await expect(verifyPassword('anything', 'scrypt:onlytwoparts')).resolves.toBe(false)
    await expect(verifyPassword('anything', 'bcrypt:aa:bb')).resolves.toBe(false)
    await expect(verifyPassword('anything', 'scrypt:zzzznothex:bb')).resolves.toBe(false)
  })
})
