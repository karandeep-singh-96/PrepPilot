import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { isAdmin, supabaseAdmin } from '@/lib/admin'

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function mapRole(sheetRole: string): { name: string; slug: string } {
  const normalized = sheetRole.trim().toLowerCase()
  if (normalized.includes('data analyst')) return { name: 'Data Analyst', slug: 'data_analyst' }
  return { name: 'SDE', slug: 'sde' }
}

function mapRoundType(topic: string, subTopic: string): 'intro' | 'behavioral' | 'technical' {
  const t = (topic || '').trim().toLowerCase()
  const st = (subTopic || '').trim().toLowerCase()
  if (t === 'behavioural' || t === 'behavioral') {
    if (st.includes('introduction') || st.includes('tell me about yourself')) return 'intro'
    return 'behavioral'
  }
  return 'technical'
}

function parseDifficulty(d: string | undefined): 'Easy' | 'Medium' | 'Hard' {
  if (!d) return 'Medium'
  const lower = d.trim().toLowerCase()
  if (lower === 'easy') return 'Easy'
  if (lower === 'hard') return 'Hard'
  return 'Medium'
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current); current = ''
    } else {
      current += char
    }
  }
  result.push(current)
  return result
}

function parseCSV(content: string): Record<string, string>[] {
  const lines = content.split('\n').filter(l => l.trim())
  const headers = parseCSVLine(lines[0]).map(h => h.trim())
  const rows: Record<string, string>[] = []
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => { row[h] = (values[idx] || '').trim() })
    const company = row['Company'] || row['company']
    const question = row['Question'] || row['question']
    const role = row['Role'] || row['role']
    if (company && question && role) rows.push(row)
  }
  return rows
}

export async function POST(request: Request) {
  // Check admin auth
  const authClient = await createServerClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!await isAdmin(user.email || '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const content = await file.text()
  const rows = parseCSV(content)

  if (rows.length === 0) {
    return NextResponse.json({ error: 'No valid rows found. Ensure CSV has Company, Role, Question columns.' }, { status: 400 })
  }

  // Collect unique companies and roles
  const companyNames = [...new Set(rows.map(r => r['Company'] || r['company']))]
  const uniqueRoleSlugs = [...new Set(rows.map(r => mapRole(r['Role'] || r['role']).slug))]

  // Upsert companies
  const { data: companies } = await supabaseAdmin
    .from('companies')
    .upsert(companyNames.map(name => ({ name, slug: slugify(name) })), { onConflict: 'slug' })
    .select()

  // Upsert roles
  const roleObjects = uniqueRoleSlugs.map(slug => ({
    slug,
    name: slug === 'data_analyst' ? 'Data Analyst' : 'SDE',
  }))
  const { data: roles } = await supabaseAdmin
    .from('roles')
    .upsert(roleObjects, { onConflict: 'slug' })
    .select()

  const companyMap = Object.fromEntries((companies || []).map(c => [c.name, c.id]))
  const roleMap = Object.fromEntries((roles || []).map(r => [r.slug, r.id]))

  // Fetch existing question texts per company+role to deduplicate
  const { data: existingQuestions } = await supabaseAdmin
    .from('questions')
    .select('company_id, role_id, question_text')

  const existingSet = new Set(
    (existingQuestions || []).map(q =>
      `${q.company_id}|${q.role_id}|${q.question_text.trim().toLowerCase()}`
    )
  )

  // Build questions, skipping duplicates
  let skipped = 0
  const toInsert: any[] = []

  for (const row of rows) {
    const companyName = row['Company'] || row['company']
    const roleRaw = row['Role'] || row['role']
    const questionText = row['Question'] || row['question']
    const topic = row['Topic'] || row['topic'] || 'General'
    const subTopic = row['Sub-topic'] || row['sub_topic'] || row['Sub Topic'] || null
    const difficulty = parseDifficulty(row['Difficulty'] || row['difficulty'])
    const roundType = mapRoundType(topic, subTopic || '')

    const companyId = companyMap[companyName]
    const role = mapRole(roleRaw)
    const roleId = roleMap[role.slug]

    if (!companyId || !roleId) continue

    const key = `${companyId}|${roleId}|${questionText.trim().toLowerCase()}`
    if (existingSet.has(key)) {
      skipped++
      continue
    }

    existingSet.add(key) // prevent duplicates within the same upload
    toInsert.push({
      company_id: companyId,
      role_id: roleId,
      round_type: roundType,
      topic,
      sub_topic: subTopic,
      difficulty,
      question_text: questionText,
      is_verified: true,
    })
  }

  if (toInsert.length > 0) {
    const { error } = await supabaseAdmin.from('questions').insert(toInsert)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    total: rows.length,
    inserted: toInsert.length,
    skipped,
  })
}
