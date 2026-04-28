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

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
    })
    if (error) {
      toast.error(error.message)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md space-y-6 text-center">
          <div className="flex justify-center">
            <div className="p-4 bg-primary/10 border border-primary/20 rounded-full">
              <MailCheck className="w-8 h-8 text-primary" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Check your email</h1>
            <p className="mt-2 text-muted-foreground">
              We sent a password reset link to <strong className="text-foreground">{email}</strong>.
            </p>
          </div>
          <Link href="/login" className="text-sm text-primary font-medium hover:text-primary/80 block">
            Back to sign in
          </Link>
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
        </div>
        <Card className="glass-card border-white/[0.08]">
          <CardHeader>
            <CardTitle className="text-foreground">Reset password</CardTitle>
            <CardDescription>Enter your email and we&apos;ll send you a reset link</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
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
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Sending...' : 'Send reset link'}
              </Button>
              <Link href="/login" className="text-sm text-center text-muted-foreground hover:text-foreground">
                Back to sign in
              </Link>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
