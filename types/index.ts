export type RoundType = 'intro' | 'behavioral' | 'technical'
export type RoleType = 'sde' | 'data_analyst'
export type Difficulty = 'Easy' | 'Medium' | 'Hard'

export interface Company {
  id: string
  name: string
  slug: string
  logo_url: string | null
  created_at: string
}

export interface Role {
  id: string
  name: string
  slug: RoleType
  created_at: string
}

export interface Question {
  id: string
  company_id: string
  role_id: string
  round_type: RoundType
  topic: string
  sub_topic: string | null
  difficulty: Difficulty
  question_text: string
  original_round: string | null
  created_at: string
}

export interface PracticeSession {
  id: string
  user_id: string
  company_id: string
  role_id: string
  started_at: string
  completed_at: string | null
}

export interface Response {
  id: string
  session_id: string
  question_id: string
  input_type: 'voice' | 'text' | 'code'
  user_answer: string
  ai_feedback: FeedbackResult | null
  score: number | null
  created_at: string
}

export interface FeedbackDimension {
  score: number
  feedback: string
}

export interface IntroFeedback {
  type: 'intro'
  opening_hook: FeedbackDimension
  career_narrative: FeedbackDimension
  length: FeedbackDimension
  clarity: FeedbackDimension
  closing: FeedbackDimension
  overall_score: number
  summary: string
}

export interface BehavioralFeedback {
  type: 'behavioral'
  overall_score: number
  summary: string
  interviewer_intent: string
  verdict: string
  improvement_tips: string[]
  better_answer_example: string
}

export interface TechnicalFeedback {
  type: 'technical'
  correctness: FeedbackDimension
  code_quality: FeedbackDimension
  communication: FeedbackDimension
  overall_score: number
  summary: string
}

export type FeedbackResult = IntroFeedback | BehavioralFeedback | TechnicalFeedback
