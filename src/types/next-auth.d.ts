import type { DefaultSession } from 'next-auth'

// Extend Auth.js's default session/JWT shapes with the fields our
// callbacks (src/auth.ts) actually populate — id and isAdmin.
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      isAdmin: boolean
    } & DefaultSession['user']
  }

  interface User {
    isAdmin?: boolean
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string
    isAdmin?: boolean
  }
}
