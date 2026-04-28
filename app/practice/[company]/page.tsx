import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AppHeader } from '@/components/app-header'
import { ChevronLeft, ArrowRight } from 'lucide-react'

const ROLE_LABELS: Record<string, string> = {
  sde: 'Software Development Engineer',
  data_analyst: 'Data Analyst',
}

export default async function CompanyPage({
  params,
}: {
  params: Promise<{ company: string }>
}) {
  const { company: companySlug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: company } = await supabase
    .from('companies')
    .select('*')
    .eq('slug', companySlug)
    .single()

  if (!company) notFound()

  const { data: questions } = await supabase
    .from('questions')
    .select('role_id, roles(slug, name)')
    .eq('company_id', company.id)

  const roleSet = new Map<string, { id: string; slug: string; name: string }>()
  questions?.forEach((q: any) => {
    if (q.roles) roleSet.set(q.roles.slug, { id: q.role_id, slug: q.roles.slug, name: q.roles.name })
  })
  const roles = Array.from(roleSet.values())

  return (
    <div className="min-h-screen">
      <AppHeader user={user} />
      <main className="max-w-3xl mx-auto px-4 py-10">
        <Link
          href="/select"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors duration-200"
        >
          <ChevronLeft className="w-4 h-4" /> Back to companies
        </Link>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">{company.name}</h1>
          <p className="mt-1 text-muted-foreground">Choose your target role</p>
        </div>

        {roles.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p>No roles available for this company yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {roles.map(role => (
              <Link key={role.slug} href={`/practice/${companySlug}/${role.slug}`}>
                <Card className="h-full cursor-pointer group border-white/[0.08] bg-card/60 hover:border-primary/40 hover:bg-card transition-all duration-200 hover:shadow-lg hover:shadow-primary/5">
                  <CardHeader>
                    <CardTitle className="text-base text-foreground group-hover:text-primary transition-colors duration-200">
                      {role.name}
                    </CardTitle>
                    <CardDescription>{ROLE_LABELS[role.slug] || role.name}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                        Available
                      </Badge>
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-200" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
