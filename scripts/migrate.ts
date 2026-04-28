import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://wvoccrbqwciinvqsxyuy.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!SUPABASE_SERVICE_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is required')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function migrate() {
  const { error } = await supabase.rpc('exec_sql', {
    sql: 'alter table questions add column if not exists is_verified boolean not null default true;'
  })

  if (error) {
    // Try direct insert approach — add a dummy row to test, or use pg directly
    console.error('Migration error:', error.message)
    console.log('\nPlease run this SQL manually in Supabase SQL Editor:')
    console.log('alter table questions add column if not exists is_verified boolean not null default true;')
    process.exit(1)
  }

  console.log('Migration complete: is_verified column added to questions table.')
}

migrate().catch(console.error)
