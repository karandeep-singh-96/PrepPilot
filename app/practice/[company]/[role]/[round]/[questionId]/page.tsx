import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppHeader } from '@/components/app-header'
import { PracticeClient } from '@/components/practice/practice-client'
import type { RoundType } from '@/types'

export default async function QuestionPage({
  params,
}: {
  params: Promise<{ company: string; role: string; round: string; questionId: string }>
}) {
  const { company: companySlug, role: roleSlug, round, questionId } = await params

  if (!['intro', 'behavioral', 'technical'].includes(round)) notFound()
  const roundType = round as RoundType

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: company }, { data: role }, { data: question }] = await Promise.all([
    supabase.from('companies').select('*').eq('slug', companySlug).single(),
    supabase.from('roles').select('*').eq('slug', roleSlug).single(),
    supabase.from('questions').select('*').eq('id', questionId).single(),
  ])

  if (!company || !role || !question) notFound()
  if (question.round_type !== roundType) notFound()

  let session = null
  const { data: existing } = await supabase
    .from('practice_sessions')
    .select('*')
    .eq('user_id', user.id)
    .eq('company_id', company.id)
    .eq('role_id', role.id)
    .is('completed_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .single()

  if (existing) {
    session = existing
  } else {
    const { data: newSession } = await supabase
      .from('practice_sessions')
      .insert({ user_id: user.id, company_id: company.id, role_id: role.id })
      .select()
      .single()
    session = newSession
  }

  const { data: prevResponse } = await supabase
    .from('responses')
    .select('*')
    .eq('question_id', questionId)
    .eq('session_id', session?.id || '')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  return (
    <div className="min-h-screen">
      <AppHeader user={user} />
      <PracticeClient
        question={question}
        company={company}
        role={role}
        roundType={roundType}
        sessionId={session?.id || ''}
        companySlug={companySlug}
        roleSlug={roleSlug}
        previousResponse={prevResponse || null}
      />
    </div>
  )
}
