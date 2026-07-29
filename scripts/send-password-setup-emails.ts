// One-off ops script: emails a "set your password" link to every existing
// user who signed up under the old magic-link system and has no password
// yet (password_hash IS NULL). Run once after the NextAuth migration ships;
// safe to re-run — it only resends to whoever still has no password set.
//
// Usage: npx tsx scripts/send-password-setup-emails.ts

import { config } from 'dotenv'
config({ path: '.env.local' })

import { neon } from '@neondatabase/serverless'
import { Resend } from 'resend'
import { generateResetToken } from '../src/lib/tokens'

function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_BASE_URL) return process.env.NEXT_PUBLIC_BASE_URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}

async function main() {
  const databaseUrl = process.env.NEON_DATABASE_URL
  if (!databaseUrl) {
    console.error('NEON_DATABASE_URL not set')
    process.exit(1)
  }
  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey) {
    console.error('RESEND_API_KEY not set')
    process.exit(1)
  }

  const sql = neon(databaseUrl)
  const resend = new Resend(resendApiKey)

  const users = await sql`SELECT id, email FROM users WHERE password_hash IS NULL`
  console.log(`${users.length} user(s) without a password set.`)

  for (const user of users) {
    const token = await generateResetToken(user.id as string)
    const url = new URL('/auth/set-password', getBaseUrl())
    url.searchParams.set('token', token)

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Bearing <onboarding@resend.dev>',
      to: user.email as string,
      subject: 'Set your password for Bearing',
      text: [
        'Bearing now uses email + password sign-in instead of magic links.',
        '',
        'Set your password here:',
        '',
        url.toString(),
        '',
        'This link expires in 24 hours.',
        '',
        'If you did not request this, you can safely ignore this email.',
      ].join('\n'),
    })

    console.log(`Sent to ${user.email}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
