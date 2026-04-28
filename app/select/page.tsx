import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AppHeader } from '@/components/app-header'
import { ArrowRight, Sparkles, Telescope } from 'lucide-react'
import { getLastSession } from '@/lib/stats'
import { CompanySearch } from '@/components/discover/company-search'

export default async function SelectPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: companies }, lastSession, { data: discoveries }] = await Promise.all([
    supabase.from('companies').select('*').order('name'),
    getLastSession(supabase, user.id),
    supabase
      .from('user_discoveries')
      .select('company_id, role_id, companies(id, name, slug), roles(id, name, slug)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
  ])

  const lastCompany = lastSession?.companies as any
  const lastRole = lastSession?.roles as any

  // Slugs of discovered companies to exclude from main grid
  const discoveredSlugs = new Set(
    discoveries?.map((d: any) => d.companies?.slug).filter(Boolean)
  )

  const curatedCompanies = companies?.filter(c => !discoveredSlugs.has(c.slug)) || []

  return (
    <div className="min-h-screen">
      <AppHeader user={user} />
      <main className="max-w-4xl mx-auto px-4 py-10">

        {lastSession && lastCompany && lastRole && (
          <Link href={`/practice/${lastCompany.slug}/${lastRole.slug}`} className="block mb-8">
            <div className="relative overflow-hidden rounded-xl border border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 transition-all duration-200 p-4 cursor-pointer group">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />
              <div className="flex items-center justify-between relative">
                <div>
                  <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-1 flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3" />
                    Continue where you left off
                  </p>
                  <p className="text-base font-semibold text-foreground">
                    {lastCompany.name} · {lastRole.name}
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-primary shrink-0 group-hover:translate-x-1 transition-transform duration-200" />
              </div>
            </div>
          </Link>
        )}

        {/* Discovered companies */}
        {discoveries && discoveries.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <Telescope className="w-4 h-4 text-accent" />
              <h2 className="text-sm font-semibold text-accent uppercase tracking-widest">Discovered by you</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {discoveries.map((d: any) => {
                const company = d.companies
                const role = d.roles
                if (!company || !role) return null
                return (
                  <Link key={`${company.slug}-${role.slug}`} href={`/practice/${company.slug}/${role.slug}`}>
                    <Card className="h-full cursor-pointer group border-accent/20 bg-accent/5 hover:border-accent/40 hover:bg-accent/10 transition-all duration-200">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base text-foreground group-hover:text-accent transition-colors duration-200">
                          {company.name}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">{role.name}</p>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-accent/70 transition-colors duration-200">
                          <span>Start practicing</span>
                          <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform duration-200" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* Curated companies */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Choose a company</h1>
          <p className="mt-1 text-muted-foreground">Select the company you&apos;re preparing for</p>
        </div>

        {curatedCompanies.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-lg">No companies available yet.</p>
            <p className="text-sm mt-1">Check back soon — content is being added.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {curatedCompanies.map(company => (
              <Link key={company.id} href={`/practice/${company.slug}`}>
                <Card className="h-full cursor-pointer group border-white/[0.08] bg-card/60 hover:border-primary/40 hover:bg-card transition-all duration-200 hover:shadow-lg hover:shadow-primary/5">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base text-foreground group-hover:text-primary transition-colors duration-200">
                      {company.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-primary/70 transition-colors duration-200">
                      <span>Start practicing</span>
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform duration-200" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        <CompanySearch />
      </main>
    </div>
  )
}
