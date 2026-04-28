'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, Loader2, AlertCircle } from 'lucide-react'

const SEARCH_MESSAGES = [
  'Searching Glassdoor, LeetCode, GeeksForGeeks...',
  'Reading interview experiences...',
  'Curating top questions with AI...',
  'Almost there...',
]

export function CompanySearch() {
  const [company, setCompany] = useState('')
  const [role, setRole] = useState<'SDE' | 'Data Analyst'>('SDE')
  const [loading, setLoading] = useState(false)
  const [msgIndex, setMsgIndex] = useState(0)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!company.trim() || loading) return

    setLoading(true)
    setError('')
    setMsgIndex(0)

    const interval = setInterval(() => {
      setMsgIndex(i => (i + 1 < SEARCH_MESSAGES.length ? i + 1 : i))
    }, 4000)

    try {
      const res = await fetch('/api/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company: company.trim(), role }),
      })

      const data = await res.json()

      if (!res.ok || data.error) {
        setError(data.message || 'Something went wrong. Please try again.')
        return
      }

      router.push(`/practice/${data.companySlug}/${data.roleSlug}`)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      clearInterval(interval)
      setLoading(false)
    }
  }

  return (
    <div className="mt-12 pt-8 border-t border-white/[0.06]">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-foreground">Can&apos;t find your company?</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Our AI agent will search the web for real interview experiences and curate the top questions for you.
        </p>
      </div>

      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="Company name (e.g. Google, Swiggy, Razorpay)"
          value={company}
          onChange={e => setCompany(e.target.value)}
          disabled={loading}
          className="flex-1 bg-white/5 border-white/10 focus:border-primary/50"
        />
        <select
          value={role}
          onChange={e => setRole(e.target.value as 'SDE' | 'Data Analyst')}
          disabled={loading}
          className="h-9 rounded-md border border-white/10 bg-white/5 px-3 text-sm text-foreground focus:border-primary/50 focus:outline-none"
        >
          <option value="SDE">SDE</option>
          <option value="Data Analyst">Data Analyst</option>
        </select>
        <Button type="submit" disabled={!company.trim() || loading} className="gap-2 shrink-0">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          {loading ? 'Searching...' : 'Search'}
        </Button>
      </form>

      {loading && (
        <p className="mt-3 text-xs text-muted-foreground animate-pulse">
          {SEARCH_MESSAGES[msgIndex]}
        </p>
      )}

      {error && (
        <div className="mt-3 flex items-start gap-2 text-sm text-destructive">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}
    </div>
  )
}
