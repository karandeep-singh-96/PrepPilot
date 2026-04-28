'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send } from 'lucide-react'
import { toast } from 'sonner'

export interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface Props {
  questionText: string
  companyName: string
  roleName: string
  messages: Message[]
  onMessagesChange: (messages: Message[]) => void
  onReadyToAnswer: () => void
}

export function ConversationChat({
  questionText,
  companyName,
  roleName,
  messages,
  onMessagesChange,
  onReadyToAnswer,
}: Props) {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage() {
    if (!input.trim() || loading) return

    const userMessage: Message = { role: 'user', content: input.trim() }
    const updated = [...messages, userMessage]
    onMessagesChange(updated)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionText,
          companyName,
          roleName,
          messages: updated,
        }),
      })
      if (!res.ok) throw new Error('Failed')
      const { reply } = await res.json()
      onMessagesChange([...updated, { role: 'assistant', content: reply }])
    } catch {
      toast.error('Failed to get response. Try again.')
      onMessagesChange(messages)
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-700">Ask clarifying questions</p>
        <span className="text-xs text-gray-400">Press Enter to send</span>
      </div>

      {/* Chat messages */}
      {messages.length > 0 && (
        <div className="border rounded-lg bg-white max-h-72 overflow-y-auto p-4 space-y-3">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {msg.role === 'assistant' && (
                  <p className="text-xs font-medium mb-1 opacity-60">Interviewer</p>
                )}
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-2xl px-4 py-2.5">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2">
        <Textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a clarifying question... (e.g. Can I assume the array is sorted?)"
          className="min-h-[80px] resize-none text-sm"
          disabled={loading}
        />
        <Button
          onClick={sendMessage}
          disabled={!input.trim() || loading}
          size="icon"
          className="shrink-0 h-10 w-10 self-end"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>

      {/* Ready to answer */}
      <Button onClick={onReadyToAnswer} variant="default" className="w-full">
        Ready to answer →
      </Button>
    </div>
  )
}
