'use client'

import { useEffect, useState } from 'react'
import { Store, LogIn, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useAuth } from '@/stores/auth-store'

export function LoginScreen() {
  const login = useAuth((s) => s.login)
  const refresh = useAuth((s) => s.refresh)
  const loading = useAuth((s) => s.loading)

  const [user, setUser] = useState('')
  const [pass, setPass] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Check if already logged in via cookie (e.g. page refresh)
  useEffect(() => {
    refresh()
  }, [refresh])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const result = await login(user, pass)
    setSubmitting(false)
    if (!result.ok) {
      setError(result.error ?? 'Login failed')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-10">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-3 text-center">
          <div className="flex justify-center">
            <span className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-teal-600 text-white shadow-sm">
              <Store className="h-7 w-7" />
            </span>
          </div>
          <div>
            <CardTitle className="text-2xl">Ali POS System</CardTitle>
            <CardDescription className="pt-1">
              Sign in to access the store
            </CardDescription>
          </div>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="user">Username</Label>
              <Input
                id="user"
                value={user}
                onChange={(e) => setUser(e.target.value)}
                placeholder="admin"
                autoComplete="username"
                autoFocus
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pass">Password</Label>
              <Input
                id="pass"
                type="password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-md bg-rose-50 border border-rose-200 p-2.5 text-rose-800 text-sm">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <p className="text-xs text-muted-foreground pt-1">
              Use your administrator credentials. If you forgot them, ask
              the system owner to set <code className="font-mono">ADMIN_USER</code>
              {' '}and <code className="font-mono">ADMIN_PASS</code> in the
              server environment.
            </p>
          </CardContent>

          <CardFooter>
            <Button
              type="submit"
              className="w-full"
              disabled={submitting || loading}
            >
              {submitting || loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4 mr-2" />
                  Sign In
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
