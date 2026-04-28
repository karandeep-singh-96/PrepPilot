import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function isAdmin(email: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('admin_users')
    .select('email')
    .eq('email', email)
    .single()
  return !!data
}

export { supabaseAdmin }
