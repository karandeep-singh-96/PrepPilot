import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AppHeader } from '@/components/app-header'
import { ChevronLeft, Mic, Code, User, ArrowRight } from 'lucide-react'
import type { RoundType } from '@/types'

const ROUND_CONFIG: Record<RoundType, { label: string; description: string; icon: React.ReactNode; inputLabel: string }> = {
  intro: {
    label: 'Introduction',
    description: '"Tell me about yourself" and career narrative',
    icon: <User className="w-5 h-5" />,
    inputLabel: 'Text',
  },
  behavioral: {
    label: 'Behavioral & Culture Fit',
    description: 'STAR-format situational questions',
    icon: <Mic className="w-5 h-5" />,
    inputLabel: 'Voice',
  },
  technical: {
    label: 'Technical',
    description: 'Coding, DSA, SQL, system design',
    icon: <Code className="w-5 h-5" />,
    inputLabel: 'Code / Text',
  },
}

export default async function RolePage({
  params,
}: {
  params: Promise<{ company: string; role: string }>
}) {
  const { company: companySlug, role: roleSlug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: company }, { data: role }] = await Promise.all([
    supabase.from('companies').select('*').eq('slug', companySlug).single(),
    supabase.from('roles').select('*').eq('slug', roleSlug).single(),
  ])

  if (!company || !role) notFound()

  const { data: roundCounts } = await supabase
    .from('questions')
    .select('round_type')
    .eq('company_id', company.id)
    .eq('role_id', role.id)

  const counts: Record<string, number> = {}
  roundCounts?.forEach((q: any) => {
    counts[q.round_type] = (counts[q.round_type] || 0) + 1
  })

  const rounds: RoundType[] = ['intro', 'behavioral', 'technical']

  return (
    <div className="min-h-screen">
      <AppHeader user={user} />
      <main className="max-w-3xl mx-auto px-4 py-10">
        <Link
          href={`/practice/${companySlug}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors duration-200"
        >
          <ChevronLeft className="w-4 h-4" /> {company.name}
        </Link>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">{company.name} — {role.name}</h1>
          <p className="mt-1 text-muted-foreground">Choose a round to practice</p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {rounds.map(round => {
            const config = ROUND_CONFIG[round]
            const count = counts[round] || 0
            if (count === 0) return null

            return (
              <Link key={round} href={`/practice/${companySlug}/${roleSlug}/${round}`}>
                <Card className="cursor-pointer group border-white/[0.08] bg-card/60 hover:border-primary/40 hover:bg-card transition-all duration-200 hover:shadow-lg hover:shadow-primary/5">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary group-hover:bg-primary/20 transition-colors duration-200">
                          {config.icon}
                        </div>
                        <div>
                          <CardTitle className="text-base text-foreground group-hover:text-primary transition-colors duration-200">
                            {config.label}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground mt-0.5">{config.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <Badge variant="outline" className="border-white/10 text-muted-foreground">
                            {count} questions
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">{config.inputLabel}</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-200" />
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            )
          })}
        </div>
      </main>
    </div>
  )
}
