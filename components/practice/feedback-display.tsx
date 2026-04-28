'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import type { FeedbackResult, IntroFeedback, BehavioralFeedback, TechnicalFeedback, FeedbackDimension } from '@/types'

const INFO_VARIANTS = {
  blue: 'bg-blue-50 border-blue-200 text-blue-900',
  yellow: 'bg-yellow-50 border-yellow-200 text-yellow-900',
  green: 'bg-green-50 border-green-200 text-green-900',
}

function InfoBlock({ label, content, variant }: { label: string; content: string; variant: keyof typeof INFO_VARIANTS }) {
  if (!content) return null
  return (
    <div className={`rounded-lg border p-4 space-y-1.5 ${INFO_VARIANTS[variant]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</p>
      <p className="text-sm leading-relaxed">{content}</p>
    </div>
  )
}

function ScoreBar({ label, dimension }: { label: string; dimension: FeedbackDimension }) {
  const color = dimension.score >= 75 ? 'text-green-600' : dimension.score >= 50 ? 'text-yellow-600' : 'text-red-600'
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className={`text-sm font-semibold ${color}`}>{dimension.score}%</span>
      </div>
      <Progress value={dimension.score} className="h-1.5" />
      <p className="text-xs text-gray-500 leading-relaxed">{dimension.feedback}</p>
    </div>
  )
}

function OverallScore({ score }: { score: number }) {
  const color = score >= 75 ? 'bg-green-500' : score >= 50 ? 'bg-yellow-500' : 'bg-red-500'
  const label = score >= 75 ? 'Strong' : score >= 50 ? 'Developing' : 'Needs work'
  return (
    <div className="flex items-center gap-4">
      <div className={`w-16 h-16 rounded-full ${color} flex items-center justify-center text-white`}>
        <span className="text-xl font-bold">{score}</span>
      </div>
      <div>
        <p className="text-lg font-semibold text-gray-900">Overall score</p>
        <Badge variant="outline">{label}</Badge>
      </div>
    </div>
  )
}

export function FeedbackDisplay({ feedback }: { feedback: FeedbackResult }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Feedback</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <OverallScore score={feedback.overall_score} />

          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-700 leading-relaxed">{feedback.summary}</p>
          </div>

          <div className="space-y-4">
            {feedback.type === 'intro' && (
              <>
                <ScoreBar label="Opening hook" dimension={(feedback as IntroFeedback).opening_hook} />
                <ScoreBar label="Career narrative" dimension={(feedback as IntroFeedback).career_narrative} />
                <ScoreBar label="Length" dimension={(feedback as IntroFeedback).length} />
                <ScoreBar label="Clarity" dimension={(feedback as IntroFeedback).clarity} />
                <ScoreBar label="Closing" dimension={(feedback as IntroFeedback).closing} />
              </>
            )}

            {feedback.type === 'behavioral' && (
              <div className="space-y-4">
                <InfoBlock
                  label="What the interviewer is looking for"
                  content={(feedback as BehavioralFeedback).interviewer_intent}
                  variant="blue"
                />
                <InfoBlock
                  label="Why your answer worked / didn't work"
                  content={(feedback as BehavioralFeedback).verdict}
                  variant="yellow"
                />
                {(feedback as BehavioralFeedback).improvement_tips?.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-gray-700">How to improve</p>
                    <ul className="space-y-1.5">
                      {(feedback as BehavioralFeedback).improvement_tips.map((tip, i) => (
                        <li key={i} className="flex gap-2 text-sm text-gray-600">
                          <span className="text-primary font-bold shrink-0">→</span>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <InfoBlock
                  label="What a strong answer would look like"
                  content={(feedback as BehavioralFeedback).better_answer_example}
                  variant="green"
                />
              </div>
            )}

            {feedback.type === 'technical' && (
              <>
                <ScoreBar label="Correctness" dimension={(feedback as TechnicalFeedback).correctness} />
                <ScoreBar label="Code quality" dimension={(feedback as TechnicalFeedback).code_quality} />
                <ScoreBar label="Communication" dimension={(feedback as TechnicalFeedback).communication} />
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
