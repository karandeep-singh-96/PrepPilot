'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { MailCheck } from 'lucide-react'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const supabase = createClient()

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      toast.error(error.message)
    } else {
      setConfirmed(true)
    }
    setLoading(false)
  }

  if (confirmed) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md space-y-6 text-center">
          <div className="flex justify-center">
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-full">
              <MailCheck className="w-8 h-8 text-green-400" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Check your email</h1>
            <p className="mt-2 text-muted-foreground">
              We sent a confirmation link to <strong className="text-foreground">{email}</strong>.
              Click the link to activate your account.
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            Already confirmed?{' '}
            <Link href="/login" className="text-primary font-medium hover:text-primary/80">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            PrepPilot
          </h1>
          <p className="text-sm text-muted-foreground">AI-powered interview preparation</p>
        </div>
        <Card className="glass-card border-white/[0.08]">
          <CardHeader>
            <CardTitle className="text-foreground">Create account</CardTitle>
            <CardDescription>Start preparing for your target company today</CardDescription>
          </CardHeader>
          <form onSubmit={handleSignup}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Sam Sharma"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  className="bg-white/5 border-white/10 focus:border-primary/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="bg-white/5 border-white/10 focus:border-primary/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Min 8 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="bg-white/5 border-white/10 focus:border-primary/50"
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Creating account...' : 'Create account'}
              </Button>
              <p className="text-sm text-center text-muted-foreground">
                Already have an account?{' '}
                <Link href="/login" className="text-primary font-medium hover:text-primary/80">
                  Sign in
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
