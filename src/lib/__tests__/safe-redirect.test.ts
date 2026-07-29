import { describe, it, expect } from 'vitest'
import { sanitizeRedirect } from '../safe-redirect'

describe('sanitizeRedirect', () => {
  it('accepts a plain local path', () => {
    expect(sanitizeRedirect('/compare')).toBe('/compare')
    expect(sanitizeRedirect('/recommend/abc-123/results')).toBe('/recommend/abc-123/results')
  })

  it('falls back for null/undefined/empty', () => {
    expect(sanitizeRedirect(null)).toBe('/')
    expect(sanitizeRedirect(undefined)).toBe('/')
    expect(sanitizeRedirect('')).toBe('/')
  })

  it('rejects protocol-relative URLs ("//host")', () => {
    expect(sanitizeRedirect('//attacker.example')).toBe('/')
    expect(sanitizeRedirect('//attacker.example/path')).toBe('/')
  })

  it('rejects backslash tricks ("/\\host")', () => {
    expect(sanitizeRedirect('/\\attacker.example')).toBe('/')
  })

  it('rejects absolute URLs with a scheme', () => {
    expect(sanitizeRedirect('https://attacker.example')).toBe('/')
    expect(sanitizeRedirect('javascript:alert(1)')).toBe('/')
  })

  it('honours a custom fallback', () => {
    expect(sanitizeRedirect('//evil.example', '/compare')).toBe('/compare')
  })
})
