import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@/lib/supabase/server'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { questionText, companyName, roleName, messages } = await request.json()

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: `You are a senior interviewer at ${companyName} conducting a ${roleName} interview.
The candidate has been asked: "${questionText}"

The candidate is asking you clarifying questions before answering. Your job:
- Answer clarifying questions briefly and naturally, as a real interviewer would
- Don't give away the answer or approach
- If they ask about constraints, assumptions, or scope — answer clearly
- Keep responses short (1-3 sentences max)
- Don't coach or hint at the solution
- If they ask something irrelevant, redirect them back to the question`,
    })

    const chat = model.startChat({
      history: messages.slice(0, -1).map((m: { role: string; content: string }) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      })),
    })

    const lastMessage = messages[messages.length - 1]
    const result = await chat.sendMessage(lastMessage.content)
    const reply = result.response.text()

    return NextResponse.json({ reply })
  } catch (error) {
    console.error('Chat error:', error)
    return NextResponse.json({ error: 'Failed to get response' }, { status: 500 })
  }
}
