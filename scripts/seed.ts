import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const SUPABASE_URL = 'https://wvoccrbqwciinvqsxyuy.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!SUPABASE_SERVICE_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY env var is required for seeding')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function mapRole(sheetRole: string): { name: string; slug: string } {
  const normalized = sheetRole.trim().toLowerCase()
  if (normalized.includes('data analyst')) return { name: 'Data Analyst', slug: 'data_analyst' }
  return { name: 'SDE', slug: 'sde' }
}

function mapRoundType(topic: string, subTopic: string): 'intro' | 'behavioral' | 'technical' {
  const t = topic.trim().toLowerCase()
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

function parseCSV(content: string): Record<string, string>[] {
  const lines = content.split('\n').filter(l => l.trim())
  const headers = parseCSVLine(lines[0])
  const rows: Record<string, string>[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    if (values.length < headers.length) continue
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => {
      row[h.trim()] = (values[idx] || '').trim()
    })
    if (row['Company'] && row['Question']) rows.push(row)
  }
  return rows
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
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  result.push(current)
  return result
}

async function seed() {
  const csvPath = process.argv[2]
  if (!csvPath) {
    console.error('Usage: npx ts-node scripts/seed.ts <path-to-csv>')
    process.exit(1)
  }

  const content = fs.readFileSync(path.resolve(csvPath), 'utf-8')
  const rows = parseCSV(content)
  console.log(`Parsed ${rows.length} questions`)

  // Collect unique companies and roles
  const companyNames = [...new Set(rows.map(r => r['Company']))]
  const roleMappings = [...new Set(rows.map(r => r['Role']))].map(mapRole)
  const uniqueRoles = Object.values(
    Object.fromEntries(roleMappings.map(r => [r.slug, r]))
  )

  // Upsert companies
  const { data: companies, error: companyError } = await supabase
    .from('companies')
    .upsert(
      companyNames.map(name => ({ name, slug: slugify(name) })),
      { onConflict: 'slug' }
    )
    .select()
  if (companyError) { console.error('Company upsert error:', companyError); process.exit(1) }

  // Upsert roles
  const { data: roles, error: roleError } = await supabase
    .from('roles')
    .upsert(uniqueRoles, { onConflict: 'slug' })
    .select()
  if (roleError) { console.error('Role upsert error:', roleError); process.exit(1) }

  const companyMap = Object.fromEntries((companies || []).map(c => [c.name, c.id]))
  const roleMap = Object.fromEntries((roles || []).map(r => [r.slug, r.id]))

  console.log('Companies seeded:', Object.keys(companyMap).join(', '))
  console.log('Roles seeded:', Object.keys(roleMap).join(', '))

  // Build questions
  const questions = rows.map(row => {
    const role = mapRole(row['Role'])
    const roundType = mapRoundType(row['Topic'], row['Sub-topic'])
    return {
      company_id: companyMap[row['Company']],
      role_id: roleMap[role.slug],
      round_type: roundType,
      topic: row['Topic'],
      sub_topic: row['Sub-topic'] || null,
      difficulty: parseDifficulty(row['Difficulty']),
      question_text: row['Question'],
      original_round: row['Round'] || null,
    }
  }).filter(q => q.company_id && q.role_id)

  // Insert in batches of 100
  let inserted = 0
  for (let i = 0; i < questions.length; i += 100) {
    const batch = questions.slice(i, i + 100)
    const { error } = await supabase.from('questions').insert(batch)
    if (error) { console.error('Question insert error:', error); process.exit(1) }
    inserted += batch.length
    console.log(`Inserted ${inserted}/${questions.length} questions`)
  }

  console.log('Seed complete.')
}

seed().catch(console.error)
