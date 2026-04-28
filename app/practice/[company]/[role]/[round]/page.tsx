import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { AppHeader } from '@/components/app-header'
import { ChevronLeft, Info } from 'lucide-react'
import type { RoundType, Difficulty } from '@/types'

const DIFFICULTY_COLOR: Record<Difficulty, string> = {
  Easy: 'bg-green-500/15 text-green-400 border-green-500/20',
  Medium: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
  Hard: 'bg-red-500/15 text-red-400 border-red-500/20',
}

const ROUND_LABELS: Record<RoundType, string> = {
  intro: 'Introduction',
  behavioral: 'Behavioral & Culture Fit',
  technical: 'Technical',
}

export default async function QuestionListPage({
  params,
}: {
  params: Promise<{ company: string; role: string; round: string }>
}) {
  const { company: companySlug, role: roleSlug, round } = await params

  if (!['intro', 'behavioral', 'technical'].includes(round)) notFound()
  const roundType = round as RoundType

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: company }, { data: role }] = await Promise.all([
    supabase.from('companies').select('*').eq('slug', companySlug).single(),
    supabase.from('roles').select('*').eq('slug', roleSlug).single(),
  ])

  if (!company || !role) notFound()

  const { data: questions } = await supabase
    .from('questions')
    .select('*')
    .eq('company_id', company.id)
    .eq('role_id', role.id)
    .eq('round_type', roundType)
    .order('difficulty', { ascending: true })

  const { data: attempted } = await supabase
    .from('responses')
    .select('question_id, score, practice_sessions!inner(user_id)')
    .eq('practice_sessions.user_id', user.id)

  const attemptedMap = new Map<string, number>()
  attempted?.forEach((r: any) => {
    if (!attemptedMap.has(r.question_id) || (r.score > (attemptedMap.get(r.question_id) || 0))) {
      attemptedMap.set(r.question_id, r.score)
    }
  })

  return (
    <div className="min-h-screen">
      <AppHeader user={user} />
      <main className="max-w-3xl mx-auto px-4 py-10">
        <Link
          href={`/practice/${companySlug}/${roleSlug}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors duration-200"
        >
          <ChevronLeft className="w-4 h-4" /> {company.name} — {role.name}
        </Link>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">{ROUND_LABELS[roundType]}</h1>
          <p className="mt-1 text-muted-foreground">
            {questions?.length || 0} questions · {company.name} · {role.name}
          </p>
        </div>

        {questions?.some(q => !(q as any).is_verified) && (
          <div className="flex items-start gap-2 text-xs text-muted-foreground bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2.5 mb-5">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <p>Questions sourced from public interview experiences via AI — not manually verified.</p>
          </div>
        )}

        {!questions || questions.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p>No questions available for this round yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {questions.map((q, idx) => {
              const score = attemptedMap.get(q.id)
              const isAttempted = score !== undefined

              return (
                <Link key={q.id} href={`/practice/${companySlug}/${roleSlug}/${round}/${q.id}`}>
                  <Card className="cursor-pointer group border-white/[0.08] bg-card/60 hover:border-primary/40 hover:bg-card transition-all duration-200">
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span className="text-xs font-medium text-muted-foreground">Q{idx + 1}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${DIFFICULTY_COLOR[q.difficulty as Difficulty]}`}>
                              {q.difficulty}
                            </span>
                            {q.topic && (
                              <Badge variant="outline" className="text-xs border-white/10 text-muted-foreground">
                                {q.topic}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-foreground line-clamp-2 group-hover:text-foreground/90 transition-colors duration-200">
                            {q.question_text}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          {!isAttempted ? (
                            <span className="text-xs text-muted-foreground">Not attempted</span>
                          ) : (score ?? 0) < 70 ? (
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/20">
                              Need more practice
                            </span>
                          ) : (
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/20">
                              Attempted
                            </span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
