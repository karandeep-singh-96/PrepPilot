import { GoogleGenerativeAI } from '@google/generative-ai'
import type { FeedbackResult, RoundType } from '@/types'
import { buildFeedbackPrompt } from './prompts'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function generateFeedback(
  roundType: RoundType,
  question: string,
  answer: string
): Promise<FeedbackResult> {
  const { system, user } = buildFeedbackPrompt(roundType, question, answer)

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: system,
  })

  const result = await model.generateContent(user)
  const text = result.response.text()

  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('No JSON in AI response')

  return JSON.parse(jsonMatch[0]) as FeedbackResult
}
