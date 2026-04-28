import type { SupabaseClient } from '@supabase/supabase-js'

export async function getUserStreak(supabase: SupabaseClient, userId: string): Promise<number> {
  const { data } = await supabase
    .from('practice_sessions')
    .select('started_at')
    .eq('user_id', userId)
    .order('started_at', { ascending: false })

  if (!data || data.length === 0) return 0

  const days = [...new Set(
    data.map(s => new Date(s.started_at).toISOString().split('T')[0])
  )].sort((a, b) => b.localeCompare(a))

  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

  if (days[0] !== today && days[0] !== yesterday) return 0

  let streak = 1
  for (let i = 1; i < days.length; i++) {
    const prev = new Date(days[i - 1])
    const curr = new Date(days[i])
    const diff = (prev.getTime() - curr.getTime()) / 86400000
    if (diff === 1) streak++
    else break
  }
  return streak
}

export async function getLastSession(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase
    .from('practice_sessions')
    .select(`
      id,
      started_at,
      companies(name, slug),
      roles(name, slug)
    `)
    .eq('user_id', userId)
    .order('started_at', { ascending: false })
    .limit(1)
    .single()

  return data
}

export async function getUserStats(supabase: SupabaseClient, userId: string) {
  const [{ count: sessionsCount }, { count: questionsCount }] = await Promise.all([
    supabase
      .from('practice_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId),
    supabase
      .from('responses')
      .select('practice_sessions!inner(user_id)', { count: 'exact', head: true })
      .eq('practice_sessions.user_id', userId),
  ])

  return {
    sessions: sessionsCount || 0,
    questions: questionsCount || 0,
  }
}
