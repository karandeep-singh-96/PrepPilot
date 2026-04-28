import { NextRequest, NextResponse } from 'next/server'
import { generateFeedback } from '@/lib/ai/feedback'
import { createClient } from '@/lib/supabase/server'
import type { RoundType } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { questionId, answer, sessionId } = await request.json()
    if (!questionId || !answer || !sessionId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data: question, error: qError } = await supabase
      .from('questions')
      .select('*')
      .eq('id', questionId)
      .single()

    if (qError || !question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    }

    const feedback = await generateFeedback(
      question.round_type as RoundType,
      question.question_text,
      answer
    )

    const inputType = question.round_type === 'technical' ? 'code' :
      question.round_type === 'behavioral' ? 'voice' : 'text'

    const { data: response, error: rError } = await supabase
      .from('responses')
      .insert({
        session_id: sessionId,
        question_id: questionId,
        input_type: inputType,
        user_answer: answer,
        ai_feedback: feedback,
        score: feedback.overall_score,
      })
      .select()
      .single()

    if (rError) {
      return NextResponse.json({ error: 'Failed to save response' }, { status: 500 })
    }

    return NextResponse.json({ feedback, responseId: response.id })
  } catch (error) {
    console.error('Feedback error:', error)
    return NextResponse.json({ error: 'Failed to generate feedback' }, { status: 500 })
  }
}
