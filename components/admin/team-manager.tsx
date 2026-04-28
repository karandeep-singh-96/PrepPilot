'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Plus, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface Admin {
  id: string
  email: string
  added_at: string
}

export function TeamManager({ admins, currentEmail }: { admins: Admin[]; currentEmail: string }) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)
  const router = useRouter()

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || loading) return
    setLoading(true)
    try {
      const res = await fetch('/api/admin/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error)
      } else {
        toast.success(`${email.trim()} added as admin`)
        setEmail('')
        router.refresh()
      }
    } catch {
      toast.error('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  async function handleRemove(adminEmail: string) {
    setRemoving(adminEmail)
    try {
      const res = await fetch('/api/admin/team', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error)
      } else {
        toast.success(`${adminEmail} removed`)
        router.refresh()
      }
    } catch {
      toast.error('Something went wrong')
    } finally {
      setRemoving(null)
    }
  }

  return (
    <Card className="border-white/[0.08] bg-card/60">
      <CardHeader>
        <CardTitle className="text-base text-foreground flex items-center gap-2">
          <Users className="w-4 h-4" />
          Admin Team
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleAdd} className="flex gap-2">
          <Input
            type="email"
            placeholder="teammate@scaler.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            disabled={loading}
            className="flex-1 bg-white/5 border-white/10 focus:border-primary/50"
          />
          <Button type="submit" disabled={!email.trim() || loading} className="gap-1.5 shrink-0">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Add
          </Button>
        </form>

        <div className="space-y-0">
          {admins.map(admin => (
            <div
              key={admin.id}
              className="flex items-center justify-between py-3 border-b border-white/[0.06] last:border-0"
            >
              <div>
                <p className="text-sm text-foreground">{admin.email}</p>
                {admin.email === currentEmail && (
                  <p className="text-xs text-muted-foreground">You</p>
                )}
              </div>
              {admin.email !== currentEmail && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemove(admin.email)}
                  disabled={removing === admin.email}
                  className="text-muted-foreground hover:text-destructive h-7 w-7 p-0"
                >
                  {removing === admin.email
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Trash2 className="w-3.5 h-3.5" />
                  }
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
