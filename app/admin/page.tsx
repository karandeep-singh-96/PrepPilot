import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CSVUpload } from '@/components/admin/csv-upload'
import { TeamManager } from '@/components/admin/team-manager'
import { AppHeader } from '@/components/app-header'
import { isAdmin, supabaseAdmin } from '@/lib/admin'

async function getStats() {
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

  return Array.from(statsMap.values()).sort((a, b) =>
    a.company.localeCompare(b.company) || a.role.localeCompare(b.role)
  )
}

async function getAdmins() {
  const { data } = await supabaseAdmin
    .from('admin_users')
    .select('id, email, added_at')
    .order('added_at', { ascending: true })
  return data || []
}

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (!await isAdmin(user.email || '')) redirect('/select')

  const [stats, admins] = await Promise.all([getStats(), getAdmins()])
  const total = stats.reduce((sum, s) => sum + s.count, 0)

  return (
    <div className="min-h-screen">
      <AppHeader user={user} />
      <main className="max-w-4xl mx-auto px-4 py-10 space-y-8">

        <div>
          <h1 className="text-2xl font-bold text-foreground">Admin</h1>
          <p className="mt-1 text-muted-foreground">Manage question bank and team access</p>
        </div>

        <CSVUpload />

        {/* Question bank stats */}
        <Card className="border-white/[0.08] bg-card/60">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base text-foreground">Question Bank</CardTitle>
              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                {total} total
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-0">
              {stats.map(({ company, role, count }, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between py-3 border-b border-white/[0.06] last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{company}</p>
                    <p className="text-xs text-muted-foreground">{role}</p>
                  </div>
                  <span className="text-sm font-semibold text-foreground">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <TeamManager admins={admins} currentEmail={user.email || ''} />

      </main>
    </div>
  )
}
