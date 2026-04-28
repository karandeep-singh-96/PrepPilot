import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { companyId, roleId } = await request.json()
    if (!companyId || !roleId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data: session, error } = await supabase
      .from('practice_sessions')
      .insert({ user_id: user.id, company_id: companyId, role_id: roleId })
      .select()
      .single()

    if (error) return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })

    return NextResponse.json({ session })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
