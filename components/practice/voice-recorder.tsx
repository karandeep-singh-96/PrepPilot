'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Mic, MicOff, RotateCcw, Check } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  transcript: string
  confirmed: boolean
  onTranscriptChange: (t: string) => void
  onConfirm: () => void
  onReset: () => void
}

type RecordingState = 'idle' | 'recording' | 'transcribing' | 'done' | 'error'

export function VoiceRecorder({ transcript, confirmed, onTranscriptChange, onConfirm, onReset }: Props) {
  const [state, setState] = useState<RecordingState>('idle')
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = e => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        setState('transcribing')
        await transcribeAudio()
      }

      mediaRecorder.start()
      setState('recording')
    } catch {
      toast.error('Microphone access denied. Please allow microphone access and try again.')
      setState('error')
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop()
  }

  async function transcribeAudio() {
    try {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
      const formData = new FormData()
      formData.append('audio', blob, 'recording.webm')

      const res = await fetch('/api/transcribe', { method: 'POST', body: formData })
      if (!res.ok) throw new Error('Transcription failed')

      const { transcript: text } = await res.json()
      onTranscriptChange(text)
      setState('done')
    } catch {
      toast.error('Transcription failed. You can type your answer instead.')
      setState('error')
    }
  }

  function handleReset() {
    setState('idle')
    onReset()
  }

  if (confirmed) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">Your answer (transcribed)</label>
          <button onClick={handleReset} className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-1">
            <RotateCcw className="w-3 h-3" /> Re-record
          </button>
        </div>
        <div className="bg-gray-50 border rounded-md p-3 text-sm text-gray-800 min-h-[100px]">
          {transcript}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <label className="text-sm font-medium text-gray-700">Record your answer</label>

      {state === 'idle' && (
        <div className="space-y-3">
          <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg py-10 gap-3">
            <Mic className="w-8 h-8 text-gray-300" />
            <p className="text-sm text-gray-500">Speak your answer clearly. Aim for 60–120 seconds.</p>
            <Button onClick={startRecording} className="gap-2">
              <Mic className="w-4 h-4" /> Start recording
            </Button>
          </div>
          <div className="text-center">
            <span className="text-xs text-gray-400">or </span>
            <button
              className="text-xs text-primary underline"
              onClick={() => setState('done')}
            >
              type instead
            </button>
          </div>
        </div>
      )}

      {state === 'recording' && (
        <div className="flex flex-col items-center justify-center border-2 border-red-200 bg-red-50 rounded-lg py-10 gap-3">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-red-700">Recording...</span>
          </div>
          <p className="text-xs text-red-500">Speak clearly. Press stop when done.</p>
          <Button variant="destructive" onClick={stopRecording} className="gap-2">
            <MicOff className="w-4 h-4" /> Stop recording
          </Button>
        </div>
      )}

      {state === 'transcribing' && (
        <div className="flex flex-col items-center justify-center border rounded-lg py-10 gap-3">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Transcribing your answer...</p>
        </div>
      )}

      {(state === 'done' || state === 'error') && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              {state === 'error' ? 'Type your answer below' : 'Review your transcript — edit if needed'}
            </span>
            <button onClick={handleReset} className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-1">
              <RotateCcw className="w-3 h-3" /> Re-record
            </button>
          </div>
          <Textarea
            value={transcript}
            onChange={e => onTranscriptChange(e.target.value)}
            placeholder="Your transcribed answer will appear here. You can edit it..."
            className="min-h-[150px] text-sm resize-none"
          />
          {transcript.trim().length > 20 && (
            <Button onClick={onConfirm} className="w-full gap-2">
              <Check className="w-4 h-4" /> Confirm answer
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
