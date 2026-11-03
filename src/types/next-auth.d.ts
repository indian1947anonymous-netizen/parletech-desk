import 'next-auth'
import '@auth/core/types'

declare module 'next-auth' {
  interface User {
    id?: string
    role?: string
    jobTitle?: string | null
    department?: string | null
  }

  interface Session {
    user: {
      id?: string
      role?: string
      jobTitle?: string | null
      department?: string | null
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }
}

declare module '@auth/core/types' {
  interface User {
    id?: string
    role?: string
    jobTitle?: string | null
    department?: string | null
  }

  interface Session {
    user: {
      id?: string
      role?: string
      jobTitle?: string | null
      department?: string | null
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }
}
