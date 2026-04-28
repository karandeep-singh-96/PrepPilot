import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function extractJSON(text: string): any[] {
  const match = text.match(/\[[\s\S]*\]/)
  if (!match) return []
  try {
    return JSON.parse(match[0])
  } catch {
    return []
  }
}

function sanitizeRoundType(rt: string): 'technical' | 'behavioral' | 'intro' {
  if (rt === 'behavioral' || rt === 'intro') return rt
  return 'technical'
}

function sanitizeDifficulty(d: string): 'Easy' | 'Medium' | 'Hard' {
  if (d === 'Easy' || d === 'Hard') return d
  return 'Medium'
}

export async function POST(request: Request) {
  const { company, role } = await request.json()

  if (!company?.trim() || !role?.trim()) {
    return NextResponse.json({ error: 'Company and role are required' }, { status: 400 })
  }

  // Get authenticated user
  const authClient = await createServerClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Service role client for writes
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const companySlug = slugify(company.trim())
  const roleSlug = role === 'SDE' ? 'sde' : 'data_analyst'

  // If company+role already has questions, just record the discovery and redirect
  const { data: existingCompany } = await supabase
    .from('companies')
    .select('id')
    .eq('slug', companySlug)
    .single()

  if (existingCompany) {
    const { data: existingRole } = await supabase
      .from('roles')
      .select('id')
      .eq('slug', roleSlug)
      .single()

    if (existingRole) {
      const { count } = await supabase
        .from('questions')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', existingCompany.id)
        .eq('role_id', existingRole.id)

      if (count && count > 0) {
        await supabase.from('user_discoveries').upsert({
          user_id: user.id,
          company_id: existingCompany.id,
          role_id: existingRole.id,
        }, { onConflict: 'user_id,company_id,role_id' })
        return NextResponse.json({ exists: true, companySlug, roleSlug })
      }
    }
  }

  // Call Gemini with Google Search grounding
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    tools: [{ googleSearch: {} }] as any,
    systemInstruction: `You are an interview research agent. Search the web and find real interview questions that candidates have been asked at specific companies for specific roles. Search across Glassdoor, LeetCode Discuss, GeeksForGeeks, LinkedIn, AmbitionBox, and similar platforms. Focus on experiences from 2022 onwards. Return only real questions reported by actual candidates — do not fabricate or generalize questions.`,
  })

  const roleName = role === 'SDE' ? 'Software Development Engineer (SDE)' : 'Data Analyst'

  const prompt = `Search for real interview questions asked at ${company.trim()} for the ${roleName} role.

Find interview experiences from Glassdoor, LeetCode Discuss, GeeksForGeeks, AmbitionBox, LinkedIn, and similar platforms.

Extract the top 20 most commonly asked or most representative questions. Include a mix of:
- Technical questions (coding, DSA, SQL, system design)
- Behavioral questions (situational, culture fit)
- Introduction questions (tell me about yourself, career goals)

For each question return a JSON object with these exact fields:
- question_text: the exact question as reported by candidates
- topic: broad topic (e.g. Arrays, Dynamic Programming, SQL, Behavioural, System Design)
- sub_topic: specific area (e.g. Two Pointers, Window Functions, Leadership)
- difficulty: exactly one of Easy / Medium / Hard
- round_type: exactly one of technical / behavioral / intro

If you cannot find real interview questions for ${company.trim()} ${roleName} respond with exactly: NOT_FOUND

Otherwise return a JSON array only, with no other text before or after.`

  let text = ''
  try {
    const result = await model.generateContent(prompt)
    text = result.response.text()
  } catch (err) {
    console.error('Gemini error:', err)
    return NextResponse.json({
      error: 'not_found',
      message: `We couldn't find interview questions for ${company.trim()}. This company may not have enough publicly reported interview experiences yet.`,
    }, { status: 404 })
  }

  if (text.trim().startsWith('NOT_FOUND') || !text.includes('[')) {
    return NextResponse.json({
      error: 'not_found',
      message: `We couldn't find interview questions for ${company.trim()}. This company may not have enough publicly reported interview experiences yet.`,
    }, { status: 404 })
  }

  const questions = extractJSON(text)

  if (questions.length === 0) {
    return NextResponse.json({
      error: 'not_found',
      message: `We couldn't find interview questions for ${company.trim()}. This company may not have enough publicly reported interview experiences yet.`,
    }, { status: 404 })
  }

  // Upsert company and role
  const { data: companyData } = await supabase
    .from('companies')
    .upsert({ name: company.trim(), slug: companySlug }, { onConflict: 'slug' })
    .select()
    .single()

  const roleFull = role === 'SDE' ? 'SDE' : 'Data Analyst'
  const { data: roleData } = await supabase
    .from('roles')
    .upsert({ name: roleFull, slug: roleSlug }, { onConflict: 'slug' })
    .select()
    .single()

  if (!companyData || !roleData) {
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }

  const questionsToInsert = questions.map((q: any) => ({
    company_id: companyData.id,
    role_id: roleData.id,
    round_type: sanitizeRoundType(q.round_type),
    topic: q.topic || 'General',
    sub_topic: q.sub_topic || null,
    difficulty: sanitizeDifficulty(q.difficulty),
    question_text: q.question_text,
    is_verified: false,
  }))

  const { error: insertError } = await supabase.from('questions').insert(questionsToInsert)
  if (insertError) {
    console.error('Insert error:', insertError)
    return NextResponse.json({ error: 'Failed to save questions' }, { status: 500 })
  }

  // Record this discovery for the user
  await supabase.from('user_discoveries').upsert({
    user_id: user.id,
    company_id: companyData.id,
    role_id: roleData.id,
  }, { onConflict: 'user_id,company_id,role_id' })

  return NextResponse.json({
    success: true,
    companySlug,
    roleSlug,
    count: questionsToInsert.length,
  })
}
