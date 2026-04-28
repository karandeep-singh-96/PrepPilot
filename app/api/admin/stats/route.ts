import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { isAdmin, supabaseAdmin } from '@/lib/admin'

export async function GET() {
  const authClient = await createServerClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!await isAdmin(user.email || '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data } = await supabaseAdmin
    .from('questions')
    .select('company_id, role_id, companies(name), roles(name)')

  const statsMap = new Map<string, { company: string; role: string; count: number }>()
  data?.forEach((q: any) => {
    const key = `${q.company_id}|${q.role_id}`
    if (!statsMap.has(key)) {
      statsMap.set(key, { company: q.companies?.name, role: q.roles?.name, count: 0 })
    }
    statsMap.get(key)!.count++
  })

  const stats = Array.from(statsMap.values()).sort((a, b) =>
    a.company.localeCompare(b.company) || a.role.localeCompare(b.role)
  )

  return NextResponse.json({ stats, total: data?.length || 0 })
}
