import { randomBytes, scrypt, timingSafeEqual } from 'crypto'
import { promisify } from 'util'

const scryptAsync = promisify(scrypt)

const SCRYPT_KEYLEN = 64
const SALT_BYTES = 16

/**
 * Hash a plaintext password using Node's built-in scrypt (random salt,
 * versioned "scrypt:salt:hash" format so the scheme can evolve later
 * without breaking existing stored hashes).
 */
export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES)
  const derivedKey = (await scryptAsync(plain, salt, SCRYPT_KEYLEN)) as Buffer
  return `scrypt:${salt.toString('hex')}:${derivedKey.toString('hex')}`
}

/**
 * Verify a plaintext password against a stored hash. Returns false (rather
 * than throwing) for any malformed/corrupt stored value — treat that as
 * "not authenticated", not a crash.
 */
export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  const parts = stored.split(':')
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false

  const [, saltHex, hashHex] = parts
  let salt: Buffer
  let expected: Buffer
  try {
    salt = Buffer.from(saltHex, 'hex')
    expected = Buffer.from(hashHex, 'hex')
  } catch {
    return false
  }
  if (salt.length === 0 || expected.length !== SCRYPT_KEYLEN) return false

  const actual = (await scryptAsync(plain, salt, SCRYPT_KEYLEN)) as Buffer
  if (actual.length !== expected.length) return false
  return timingSafeEqual(actual, expected)
}
