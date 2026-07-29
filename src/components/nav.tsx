import Link from 'next/link'
import { auth } from '@/auth'
import { NavClient } from './nav-client'

const links = [
  { href: '/models', label: 'Models' },
  { href: '/compare', label: 'Compare' },
  { href: '/data', label: 'Data' },
  { href: '/about', label: 'About' },
  { href: 'https://docs.findbearing.org', label: 'Docs', external: true },
] as const

export async function Nav() {
  const session = await auth()
  const userEmail = session?.user?.email ?? null

  return (
    <header className="bg-navy text-cream border-b border-navy-light">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-display text-xl font-bold tracking-tight">
          Bearing
        </Link>
        <NavClient links={[...links]} userEmail={userEmail} />
      </nav>
    </header>
  )
}
