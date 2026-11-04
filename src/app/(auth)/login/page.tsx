'use client'
import { useState, useEffect, Suspense } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Headphones, Loader2, Eye, EyeOff, AlertCircle, ExternalLink, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const schema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})
type FormData = z.infer<typeof schema>

function GoogleIcon() {
  return (
    <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
      />
    </svg>
  )
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [googleConfigured, setGoogleConfigured] = useState<boolean | null>(null)
  const [showGoogleModal, setShowGoogleModal] = useState(false)

  useEffect(() => {
    fetch('/api/auth/google/status')
      .then(res => res.json())
      .then(data => setGoogleConfigured(data.configured))
      .catch(() => setGoogleConfigured(false))
  }, [])

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    setError('')
    try {
      const result = await signIn('credentials', {
        email: data.email.toLowerCase(),
        password: data.password,
        redirect: false,
      })
      if (result?.error) {
        setError('Invalid email or password. Please try again.')
      } else {
        router.push(callbackUrl)
        router.refresh()
      }
    } catch {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    if (googleConfigured === false) {
      setShowGoogleModal(true)
      return
    }

    setGoogleLoading(true)
    try {
      await signIn('google', { callbackUrl })
    } catch (err: any) {
      setError(err.message || 'Google sign-in error')
      setGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="flex items-center justify-center w-11 h-11 bg-blue-600 rounded-xl shadow-lg">
            <Headphones className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">ParleTech Desk</h1>
            <p className="text-xs text-slate-500">IT Help Desk & Service Management</p>
          </div>
        </div>

        <Card className="shadow-lg border-slate-200">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Sign in to ParleTech</CardTitle>
            <CardDescription>Single sign-on or credentials</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
                {error}
              </div>
            )}

            {/* Google OAuth Auto Sign-In Button */}
            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="w-full h-10 font-semibold border-slate-300 hover:bg-slate-50 text-slate-700 flex items-center justify-center shadow-sm"
            >
              {googleLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin text-slate-500" />
              ) : (
                <GoogleIcon />
              )}
              Sign in with Google
            </Button>

            <div className="relative flex items-center justify-center">
              <div className="border-t border-slate-200 w-full" />
              <span className="bg-white px-2.5 text-[11px] font-medium text-slate-400 uppercase tracking-wider absolute">
                or sign in with email
              </span>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold text-slate-700">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@parletech.com"
                  autoComplete="email"
                  {...register('email')}
                  className="h-9"
                />
                {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-semibold text-slate-700">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    {...register('password')}
                    className="h-9 pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-red-600">{errors.password.message}</p>}
              </div>

              <Button type="submit" className="w-full h-9 font-semibold" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign In with Password
              </Button>
            </form>

            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-500 text-center font-medium mb-1">Pre-configured Demo Accounts</p>
              <div className="text-[11px] text-slate-400 text-center space-y-0.5">
                <p>Admin: <code>admin@parletech.com</code> / <code>Admin@123</code></p>
                <p>Agent: <code>john@parletech.com</code> / <code>Admin@123</code></p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Google Setup Guidance Modal if not yet configured in .env */}
      {showGoogleModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2 text-slate-900 font-bold">
                <GoogleIcon />
                <span>Google OAuth Setup Required</span>
              </div>
              <button
                onClick={() => setShowGoogleModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              To enable automatic Google Single Sign-On (SSO), add your Google Cloud OAuth Client ID & Secret to your <code>.env</code> file:
            </p>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs font-mono space-y-1 text-slate-700">
              <p>AUTH_GOOGLE_ID="your-google-client-id.apps.googleusercontent.com"</p>
              <p>AUTH_GOOGLE_SECRET="your-google-client-secret"</p>
            </div>

            <div className="text-xs text-slate-600 space-y-1.5 pt-1">
              <p className="font-semibold text-slate-800">Quick 3-step setup in Google Cloud:</p>
              <ol className="list-decimal list-inside space-y-1 text-slate-600">
                <li>Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" className="text-blue-600 underline">console.cloud.google.com</a> &gt; Credentials.</li>
                <li>Create <strong>OAuth Client ID</strong> (Web application).</li>
                <li>Add Authorized Redirect URI:
                  <code className="block bg-slate-100 p-1 rounded font-mono text-[11px] text-blue-700 mt-1 select-all">
                    http://localhost:3000/api/auth/callback/google
                  </code>
                </li>
              </ol>
            </div>

            <Button
              className="w-full text-xs font-semibold"
              onClick={() => setShowGoogleModal(false)}
            >
              Got it, continue
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
