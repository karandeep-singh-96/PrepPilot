'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

interface UploadResult {
  total: number
  inserted: number
  skipped: number
}

export function CSVUpload() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<UploadResult | null>(null)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) { setFile(f); setResult(null); setError('') }
  }

  async function handleUpload() {
    if (!file || loading) return
    setLoading(true)
    setError('')
    setResult(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/admin/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Upload failed')
      } else {
        setResult(data)
        setFile(null)
        if (inputRef.current) inputRef.current.value = ''
        router.refresh()
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-white/[0.08] bg-card/60">
      <CardHeader>
        <CardTitle className="text-base text-foreground flex items-center gap-2">
          <Upload className="w-4 h-4" />
          Upload Questions CSV
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Required columns: <span className="text-foreground font-medium">Company, Role, Question</span>
          {' '}· Optional: Topic, Sub-topic, Difficulty, Round
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className="border-2 border-dashed border-white/10 rounded-lg p-6 text-center cursor-pointer hover:border-primary/40 transition-colors duration-200"
          onClick={() => inputRef.current?.click()}
        >
          <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          {file ? (
            <p className="text-sm text-foreground font-medium">{file.name}</p>
          ) : (
            <p className="text-sm text-muted-foreground">Click to select a CSV file</p>
          )}
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        <Button onClick={handleUpload} disabled={!file || loading} className="w-full gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {loading ? 'Uploading...' : 'Upload & Process'}
        </Button>

        {result && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
            <CheckCircle className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="text-green-400 font-medium">Upload successful</p>
              <p className="text-muted-foreground mt-0.5">
                {result.inserted} added · {result.skipped} skipped (duplicates) · {result.total} total in file
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
