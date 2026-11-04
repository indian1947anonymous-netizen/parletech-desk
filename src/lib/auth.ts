import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

// Ensure canonical URL is set in production/Render so redirects never point to internal container localhost
if (!process.env.AUTH_URL && process.env.NODE_ENV === 'production') {
  process.env.AUTH_URL = process.env.RENDER_EXTERNAL_URL || 'https://parletech-desk.onrender.com'
}
if (!process.env.NEXTAUTH_URL && process.env.AUTH_URL) {
  process.env.NEXTAUTH_URL = process.env.AUTH_URL
}
if (!process.env.AUTH_TRUST_HOST) {
  process.env.AUTH_TRUST_HOST = 'true'
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

const googleClientId = process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID || ''
const googleClientSecret = process.env.AUTH_GOOGLE_SECRET || process.env.GOOGLE_CLIENT_SECRET || ''

const providers: any[] = [
  Credentials({
    name: 'credentials',
    credentials: {
      email: { label: 'Email', type: 'email' },
      password: { label: 'Password', type: 'password' },
    },
    async authorize(credentials) {
      const parsed = loginSchema.safeParse(credentials)
      if (!parsed.success) return null

      const { email, password } = parsed.data

      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        select: {
          id: true,
          name: true,
          email: true,
          password: true,
          role: true,
          image: true,
          isActive: true,
          jobTitle: true,
          department: true,
        },
      })

      if (!user || !user.password || !user.isActive) return null

      const isValid = await bcrypt.compare(password, user.password)
      if (!isValid) return null

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        image: user.image,
        jobTitle: user.jobTitle,
        department: user.department,
      }
    },
  }),
]

// Add Google OAuth provider if credentials configured
if (googleClientId && googleClientSecret) {
  providers.push(
    Google({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
      allowDangerousEmailAccountLinking: true,
    })
  )
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET || 'parletech-desk-secret-key-change-in-production-abc123',
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  providers,
  callbacks: {
    async redirect({ url, baseUrl }) {
      const publicOrigin = process.env.AUTH_URL || process.env.NEXTAUTH_URL || 'https://parletech-desk.onrender.com'
      if (url.startsWith('/')) {
        return `${publicOrigin}${url}`
      }
      if (url.startsWith(publicOrigin)) {
        return url
      }
      if (url.includes('localhost') || url.includes('10000')) {
        return `${publicOrigin}/dashboard`
      }
      return `${publicOrigin}/dashboard`
    },
    async signIn({ user, account }) {
      if (account?.provider === 'google' && user.email) {
        const email = user.email.toLowerCase()
        const existing = await prisma.user.findUnique({ where: { email } })
        if (!existing) {
          const created = await prisma.user.create({
            data: {
              email,
              name: user.name || email.split('@')[0],
              image: user.image,
              role: 'END_USER',
              isActive: true,
            },
          })
          ;(user as any).id = created.id
          ;(user as any).role = created.role
        } else {
          ;(user as any).id = existing.id
          ;(user as any).role = existing.role
          ;(user as any).jobTitle = existing.jobTitle
          ;(user as any).department = existing.department
        }
      }
      return true
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role || 'END_USER'
        token.jobTitle = (user as any).jobTitle
        token.department = (user as any).department
      }
      if (!token.role && token.email) {
        const dbUser = await prisma.user.findUnique({ where: { email: token.email.toLowerCase() } })
        if (dbUser) {
          token.id = dbUser.id
          token.role = dbUser.role
          token.jobTitle = dbUser.jobTitle
          token.department = dbUser.department
        }
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        const u = session.user as any
        u.id = token.id as string
        u.role = token.role as string
        u.jobTitle = token.jobTitle as string
        u.department = token.department as string
      }
      return session
    },
  },
})
