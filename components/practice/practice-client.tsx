'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { VoiceRecorder } from './voice-recorder'
import { FeedbackDisplay } from './feedback-display'
import { ConversationChat, type Message } from './conversation-chat'
import { ChevronLeft, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import type { RoundType, FeedbackResult, Question, Response } from '@/types'

interface Props {
  question: Question
  company: { id: string; name: string; slug: string }
  role: { id: string; name: string; slug: string }
  roundType: RoundType
  sessionId: string
  companySlug: string
  roleSlug: string
  previousResponse: Response | null
}

const DIFFICULTY_COLOR: Record<string, string> = {
  Easy: 'bg-green-500/15 text-green-400 border-green-500/20',
  Medium: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
  Hard: 'bg-red-500/15 text-red-400 border-red-500/20',
}

type Stage = 'clarifying' | 'answering' | 'feedback'

export function PracticeClient({
  question,
  company,
  role,
  roundType,
  sessionId,
  companySlug,
  roleSlug,
  previousResponse,
}: Props) {
  const [stage, setStage] = useState<Stage>(previousResponse ? 'feedback' : 'clarifying')
  const [messages, setMessages] = useState<Message[]>([])
  const [answer, setAnswer] = useState('')
  const [transcript, setTranscript] = useState('')
  const [transcriptConfirmed, setTranscriptConfirmed] = useState(false)
  const [feedback, setFeedback] = useState<FeedbackResult | null>(
    previousResponse?.ai_feedback || null
  )
  const [loading, setLoading] = useState(false)

  const isVoice = roundType === 'behavioral'
  const isCode = roundType === 'technical'
  const submittableAnswer = isVoice ? transcript : answer
  const canSubmit = submittableAnswer.trim().length > 20

  async function handleSubmit() {
    if (!canSubmit || loading) return
    setLoading(true)
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: question.id,
          answer: submittableAnswer,
          sessionId,
        }),
      })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setFeedback(data.feedback)
      setStage('feedback')
    } catch {
      toast.error('Failed to get feedback. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleRetry() {
    setStage('clarifying')
    setMessages([])
    setAnswer('')
    setTranscript('')
    setTranscriptConfirmed(false)
    setFeedback(null)
  }

  const backHref = `/practice/${companySlug}/${roleSlug}/${roundType}`

  return (
    <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
      >
        <ChevronLeft className="w-4 h-4" /> Back to questions
      </Link>

      {/* Question card */}
      <Card className="border-white/[0.08] bg-card/60">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${DIFFICULTY_COLOR[question.difficulty]}`}>
              {question.difficulty}
            </span>
            <Badge variant="outline" className="text-xs border-white/10 text-muted-foreground">
              {question.topic}
            </Badge>
            {question.sub_topic && (
              <Badge variant="outline" className="text-xs border-white/10 text-muted-foreground">
                {question.sub_topic}
              </Badge>
            )}
          </div>
          <p className="text-base font-medium leading-relaxed text-foreground">
            {question.question_text}
          </p>
        </CardContent>
      </Card>

      {/* Stage indicator */}
      {stage !== 'feedback' && (
        <div className="flex items-center gap-2">
          <Step active={stage === 'clarifying'} done={stage === 'answering'} label="Clarify" number={1} />
          <div className="flex-1 h-px bg-white/10" />
          <Step active={stage === 'answering'} done={false} label="Answer" number={2} />
          <div className="flex-1 h-px bg-white/10" />
          <Step active={false} done={false} label="Feedback" number={3} />
        </div>
      )}

      {/* Stage: Clarifying */}
      {stage === 'clarifying' && (
        <ConversationChat
          questionText={question.question_text}
          companyName={company.name}
          roleName={role.name}
          messages={messages}
          onMessagesChange={setMessages}
          onReadyToAnswer={() => setStage('answering')}
        />
      )}

      {/* Stage: Answering */}
      {stage === 'answering' && (
        <div className="space-y-4">
          {messages.length > 0 && (
            <button
              onClick={() => setStage('clarifying')}
              className="text-xs text-muted-foreground hover:text-foreground underline transition-colors duration-200"
            >
              ← Back to clarifying questions
            </button>
          )}

          {isVoice ? (
            <VoiceRecorder
              transcript={transcript}
              confirmed={transcriptConfirmed}
              onTranscriptChange={setTranscript}
              onConfirm={() => setTranscriptConfirmed(true)}
              onReset={() => { setTranscript(''); setTranscriptConfirmed(false) }}
            />
          ) : (
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                {isCode ? 'Write your solution / explain your approach' : 'Your answer'}
              </label>
              <Textarea
                value={answer}
                onChange={e => setAnswer(e.target.value)}
                placeholder={isCode
                  ? 'Write your solution here. Include code, explain your approach, describe time/space complexity...'
                  : 'Type your answer here...'
                }
                className={`min-h-[200px] ${isCode ? 'font-mono' : ''} text-sm resize-none bg-white/5 border-white/10 focus:border-primary/50`}
              />
            </div>
          )}

          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || loading || (isVoice && !transcriptConfirmed)}
            className="w-full"
          >
            {loading ? 'Getting feedback...' : 'Submit for feedback'}
          </Button>
        </div>
      )}

      {/* Stage: Feedback */}
      {stage === 'feedback' && feedback && (
        <div className="space-y-4">
          <FeedbackDisplay feedback={feedback} />
          <Separator className="bg-white/10" />
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1 border-white/10 hover:border-white/20" onClick={handleRetry}>
              Try again
            </Button>
            <Link href={backHref} className="flex-1">
              <Button className="w-full">Next question</Button>
            </Link>
          </div>
        </div>
      )}

      {/* Previous attempt banner */}
      {stage === 'clarifying' && previousResponse && (
        <Card className="border-yellow-500/20 bg-yellow-500/5">
          <CardContent className="py-3">
            <p className="text-sm text-yellow-400">
              Previous attempt — score: <strong>{previousResponse.score}%</strong>.{' '}
              <button
                className="underline font-medium hover:text-yellow-300 transition-colors duration-200"
                onClick={() => {
                  setFeedback(previousResponse.ai_feedback)
                  setStage('feedback')
                }}
              >
                View previous feedback
              </button>
            </p>
          </CardContent>
        </Card>
      )}
    </main>
  )
}

function Step({ number, label, active, done }: { number: number; label: string; active: boolean; done: boolean }) {
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-colors duration-200 ${
        active ? 'bg-primary text-primary-foreground' :
        done ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
        'bg-white/5 text-muted-foreground border border-white/10'
      }`}>
        {done ? <CheckCircle className="w-3.5 h-3.5" /> : number}
      </div>
      <span className={`text-xs font-medium transition-colors duration-200 ${active ? 'text-foreground' : 'text-muted-foreground'}`}>
        {label}
      </span>
    </div>
  )
}
