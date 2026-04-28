'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import type { User } from '@supabase/supabase-js'

interface Props {
  user: User
}

export function AppHeader({ user }: Props) {
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-50 glass border-b border-white/[0.06] px-4 py-3">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <Link href="/select" className="text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          PrepPilot
        </Link>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSignOut}
          className="border-white/10 text-muted-foreground hover:text-foreground hover:border-white/20"
        >
          Sign out
        </Button>
      </div>
    </header>
  )
}
