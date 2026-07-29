import { auth } from '@/auth'

/**
 * Thin compatibility wrapper around Auth.js's session — kept at this import
 * path so the existing call sites across the app (actions.ts, admin/*) don't
 * need to change at all. Returns the same { id, email } | null shape the old
 * custom cookie-session code returned.
 */
export async function getCurrentUser(): Promise<{ id: string; email: string } | null> {
  const session = await auth()
  if (!session?.user?.id || !session.user.email) return null
  return { id: session.user.id, email: session.user.email }
}
