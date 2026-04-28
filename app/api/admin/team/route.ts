import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { isAdmin, supabaseAdmin } from '@/lib/admin'

export async function GET() {
  const authClient = await createServerClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!await isAdmin(user.email || '')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data } = await supabaseAdmin
    .from('admin_users')
    .select('id, email, added_at')
    .order('added_at', { ascending: true })

  return NextResponse.json({ admins: data || [] })
}

export async function POST(request: Request) {
  const authClient = await createServerClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!await isAdmin(user.email || '')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { email } = await request.json()
  if (!email?.trim()) return NextResponse.json({ error: 'Email is required' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('admin_users')
    .insert({ email: email.trim().toLowerCase() })

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Email already has admin access' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(request: Request) {
  const authClient = await createServerClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!await isAdmin(user.email || '')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { email } = await request.json()

  // Prevent removing yourself
  if (email === user.email) {
    return NextResponse.json({ error: 'You cannot remove your own admin access' }, { status: 400 })
  }

  await supabaseAdmin.from('admin_users').delete().eq('email', email)
  return NextResponse.json({ success: true })
}
