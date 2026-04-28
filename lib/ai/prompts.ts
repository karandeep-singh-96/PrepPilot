import type { RoundType } from '@/types'

export function buildFeedbackPrompt(
  roundType: RoundType,
  question: string,
  answer: string
): { system: string; user: string } {
  const system = `You are a senior interview coach. Evaluate candidate answers and return structured JSON feedback. Be specific, direct, and constructive — not generic. Always reference the actual answer content in your feedback.`

  if (roundType === 'intro') {
    return {
      system,
      user: `Question: "${question}"

Candidate answer: "${answer}"

Evaluate this introduction and return JSON in this exact format:
{
  "type": "intro",
  "opening_hook": { "score": <0-100>, "feedback": "<specific 1-2 sentence feedback>" },
  "career_narrative": { "score": <0-100>, "feedback": "<specific 1-2 sentence feedback>" },
  "length": { "score": <0-100>, "feedback": "<was it too short/long/right? ideal is 60-90 seconds of speech>" },
  "clarity": { "score": <0-100>, "feedback": "<was it clear, logical, easy to follow?>" },
  "closing": { "score": <0-100>, "feedback": "<did they end with a strong, purposeful close?>" },
  "overall_score": <0-100>,
  "summary": "<2-3 sentence coach summary with the top 1 strength and top 1 thing to improve>"
}`,
    }
  }

  if (roundType === 'behavioral') {
    return {
      system,
      user: `Question: "${question}"

Candidate answer: "${answer}"

Evaluate this behavioral answer and return JSON in this exact format:
{
  "type": "behavioral",
  "overall_score": <0-100>,
  "summary": "<2-3 sentence overall coach summary>",
  "interviewer_intent": "<what the interviewer is really trying to assess with this question — the underlying trait or signal they are looking for>",
  "verdict": "<direct verdict on why this answer worked or didn't work — be specific and honest, reference the actual answer>",
  "improvement_tips": ["<specific actionable tip 1>", "<specific actionable tip 2>", "<specific actionable tip 3>"],
  "better_answer_example": "<a concrete example of what a strong answer to this question would look like — be specific, 3-5 sentences>"
}`,
    }
  }

  return {
    system,
    user: `Question: "${question}"

Candidate answer: "${answer}"

Evaluate this technical answer and return JSON in this exact format:
{
  "type": "technical",
  "correctness": { "score": <0-100>, "feedback": "<does the solution/logic solve the problem correctly? mention specific issues>" },
  "code_quality": { "score": <0-100>, "feedback": "<naming, structure, edge cases, time/space complexity if applicable>" },
  "communication": { "score": <0-100>, "feedback": "<did they explain their approach clearly? did they reason out loud?>" },
  "overall_score": <0-100>,
  "summary": "<2-3 sentence coach summary with the top 1 strength and top 1 thing to improve>"
}`,
  }
}
