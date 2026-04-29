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

// Agent 1: Search and extract raw questions from the web
async function scrapeQuestions(company: string, roleName: string): Promise<string> {
  const scraper = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    tools: [{ googleSearch: {} }] as any,
    systemInstruction: `You are an interview research agent. Your only job is to search the web and extract real interview questions that actual candidates reported being asked at specific companies. Search Glassdoor, AmbitionBox, LeetCode Discuss, GeeksForGeeks, LinkedIn, and Naukri interview experiences. Focus on posts from 2022 onwards. Extract questions verbatim as candidates reported them — never fabricate or generalise. If a question is incomplete or cut off, note it as-is.`,
  })

  const prompt = `Search for real interview questions asked at ${company} for the ${roleName} role.

Search specifically for:
- "${company} ${roleName} interview experience"
- "${company} data analyst interview questions glassdoor"
- "${company} interview questions ambitionbox"
- site:glassdoor.com "${company}" interview
- site:ambitionbox.com "${company}" interview

Extract every specific question you find that was actually asked. Include:
- Technical questions: SQL, Python, statistics, case studies, data modelling, Excel, Power BI, dashboards
- Behavioral questions: situational, leadership, conflict, teamwork
- Introduction questions: tell me about yourself, walk me through your resume

For each question return a JSON object:
- question_text: exact question as reported (must be a complete, answerable question)
- topic: broad topic (SQL, Python, Statistics, Behavioural, Case Study, System Design, etc.)
- sub_topic: specific area
- difficulty: Easy / Medium / Hard
- round_type: technical / behavioral / intro
- source_hint: where you found it (e.g. "Glassdoor review", "AmbitionBox experience")

If you find fewer than 5 real questions for ${company} ${roleName}, respond with exactly: NOT_FOUND

Otherwise return only a JSON array, no other text.`

  const result = await scraper.generateContent(prompt)
  return result.response.text()
}

// Agent 2: Validate and filter questions for quality and relevance
async function validateQuestions(
  rawQuestions: any[],
  company: string,
  roleName: string
): Promise<any[]> {
  const validator = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: `You are a quality control agent for interview question banks. You review questions scraped from the web and ensure only high-quality, relevant, complete questions are published to candidates. You are strict — a candidate's interview prep depends on the quality of what you approve.`,
  })

  const prompt = `You are reviewing interview questions scraped from the web for ${company} — ${roleName} role.

Here are the raw scraped questions:
${JSON.stringify(rawQuestions, null, 2)}

Review each question and REJECT it if any of the following are true:
- The question is incomplete or cut off mid-sentence
- The question is too vague to be answerable (e.g. "Tell me about SQL" is not a question)
- The question is clearly not relevant to the ${roleName} role at ${company}
- The question is a generic filler not specific to an interview (e.g. "What is your name?")
- The question is a duplicate of another in the list
- The question text is actually a topic heading, not a question

For CODING and TECHNICAL questions specifically, also check:
- Is the problem statement complete? A good coding question must clearly describe: what the input is, what the output should be, and what the candidate is expected to do
- Is it a real algorithmic/technical problem — not just "explain what a JOIN is" (that's a concept question, not a coding question — change round_type to technical but don't treat it as coding)
- Is it solvable? Reject questions that are too ambiguous to have a clear answer
- Is it relevant to the role? For Data Analyst: SQL queries, Python for data, statistics problems, data modelling scenarios. For SDE: DSA, algorithms, system design, OOP
- If a coding question is mostly complete but missing minor context (e.g. missing constraints or example), rewrite it to add the missing parts while preserving the original problem

For questions that are ALMOST good but slightly incomplete or unclear — rewrite them to be complete and specific while keeping the original intent.

After filtering and fixing, return the best 20 questions (or fewer if not enough pass quality check).

Return ONLY a JSON array with the same fields: question_text, topic, sub_topic, difficulty, round_type.
No other text before or after the array.

If fewer than 5 questions pass quality check, respond with exactly: INSUFFICIENT_QUALITY`

  const result = await validator.generateContent(prompt)
  return extractJSON(result.response.text())
}

export async function POST(request: Request) {
  const { company, role } = await request.json()

  if (!company?.trim() || !role?.trim()) {
    return NextResponse.json({ error: 'Company and role are required' }, { status: 400 })
  }

  const authClient = await createServerClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const companySlug = slugify(company.trim())
  const roleSlug = role === 'SDE' ? 'sde' : 'data_analyst'

  // If company+role already has questions, redirect immediately
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

  const roleName = role === 'SDE' ? 'Software Development Engineer (SDE)' : 'Data Analyst'

  // Agent 1: Scrape
  let rawText = ''
  try {
    rawText = await scrapeQuestions(company.trim(), roleName)
  } catch (err) {
    console.error('Scraper agent error:', err)
    return NextResponse.json({
      error: 'not_found',
      message: `We couldn't find interview questions for ${company.trim()}. Try again or check the company name.`,
    }, { status: 404 })
  }

  if (rawText.trim().startsWith('NOT_FOUND') || !rawText.includes('[')) {
    return NextResponse.json({
      error: 'not_found',
      message: `We couldn't find enough interview experiences for ${company.trim()} — ${roleName}. This company may not have enough publicly reported interviews yet.`,
    }, { status: 404 })
  }

  const rawQuestions = extractJSON(rawText)
  if (rawQuestions.length === 0) {
    return NextResponse.json({
      error: 'not_found',
      message: `We couldn't find enough interview experiences for ${company.trim()} — ${roleName}.`,
    }, { status: 404 })
  }

  // Agent 2: Validate
  let validatedQuestions: any[] = []
  try {
    validatedQuestions = await validateQuestions(rawQuestions, company.trim(), roleName)
  } catch (err) {
    console.error('Validator agent error:', err)
    return NextResponse.json({
      error: 'not_found',
      message: `We found some questions but couldn't verify their quality. Please try again.`,
    }, { status: 404 })
  }

  if (validatedQuestions.length < 5) {
    return NextResponse.json({
      error: 'not_found',
      message: `We found interview experiences for ${company.trim()} but the questions didn't meet our quality standard. Try again or check back later.`,
    }, { status: 404 })
  }

  // Save to DB
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

  const questionsToInsert = validatedQuestions.map((q: any) => ({
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
