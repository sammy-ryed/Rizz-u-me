'use client'

import { useState } from 'react'
import jsPDF from 'jspdf'

interface DiffLine {
  original: string
  updated: string
  changed: boolean
}

interface AddItem {
  item: string
  why: string
  example: string
}

interface HireabilityData {
  score: number
  summary: string
  top_gaps: string[]
}

interface UpdateResumeResponse {
  original: string[]
  updated: string[]
  changes: string[]
  hireability?: HireabilityData
  must_add?: AddItem[]
  missing_keywords?: string[]
  ats_fixes?: string[]
  interview_focus?: string[]
}

interface ResumeUpdaterProps {
  resume: string
  setResume: (value: string) => void
  jobDescription: string
  setJobDescription: (value: string) => void
}

export function ResumeUpdater({
  resume,
  setResume,
  jobDescription,
  setJobDescription,
}: ResumeUpdaterProps) {
  const [loading, setLoading] = useState(false)
  const [diffs, setDiffs] = useState<DiffLine[]>([])
  const [changes, setChanges] = useState<string[]>([])
  const [hireability, setHireability] = useState<HireabilityData | null>(null)
  const [mustAdd, setMustAdd] = useState<AddItem[]>([])
  const [missingKeywords, setMissingKeywords] = useState<string[]>([])
  const [atsFixes, setAtsFixes] = useState<string[]>([])
  const [interviewFocus, setInterviewFocus] = useState<string[]>([])
  const [error, setError] = useState('')
  const hireabilityOutOfTen = hireability
    ? (hireability.score <= 10 ? hireability.score : Number((hireability.score / 10).toFixed(1)))
    : null

  const handleDownloadPdf = () => {
    if (diffs.length === 0) {
      setError('No updated resume available yet')
      return
    }

    const doc = new jsPDF({ unit: 'pt', format: 'a4' })
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 40
    const maxWidth = pageWidth - margin * 2
    let y = margin

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.text('Updated Resume', margin, y)
    y += 26

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)

    const updatedLines = diffs.map((diff) => diff.updated)
    updatedLines.forEach((line) => {
      const wrapped = doc.splitTextToSize(line, maxWidth)
      const neededHeight = wrapped.length * 14 + 8

      if (y + neededHeight > pageHeight - margin) {
        doc.addPage()
        y = margin
      }

      doc.text(wrapped, margin, y)
      y += wrapped.length * 14 + 8
    })

    doc.save('updated-resume.pdf')
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/parse-pdf', {
        method: 'POST',
        body: formData,
      })
      const data = await response.json()
      if (data.error) {
        setError(data.error)
      } else {
        setResume(data.text || '')
      }
    } catch (err) {
      setError('Failed to parse PDF')
    }
  }

  const handleUpdate = async () => {
    const resumeTrimmed = (resume || '').trim()
    const jobDescTrimmed = (jobDescription || '').trim()

    if (!resumeTrimmed || !jobDescTrimmed) {
      setError('Please provide both resume and job description')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/update-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume: resumeTrimmed, jobDescription: jobDescTrimmed }),
      })

      const data: UpdateResumeResponse = await response.json()

      if ((data as any).error) {
        setError((data as any).error)
      } else {
        const original = Array.isArray(data.original) ? data.original : []
        const updated = Array.isArray(data.updated) ? data.updated : []

        const diffLines: DiffLine[] = original.map(
          (orig: string, idx: number) => ({
            original: orig,
            updated: updated[idx] || orig,
            changed: updated[idx] !== orig,
          })
        )
        setDiffs(diffLines)
        setChanges(Array.isArray(data.changes) ? data.changes : [])
        setHireability(data.hireability || null)
        setMustAdd(Array.isArray(data.must_add) ? data.must_add : [])
        setMissingKeywords(
          Array.isArray(data.missing_keywords) ? data.missing_keywords : []
        )
        setAtsFixes(Array.isArray(data.ats_fixes) ? data.ats_fixes : [])
        setInterviewFocus(
          Array.isArray(data.interview_focus) ? data.interview_focus : []
        )
      }
    } catch (err) {
      setError('Failed to update resume')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="pg-header">
        <div>
          <div className="pg-eyebrow">Resume Polish</div>
          <h2 className="pg-title">Rewrite Your Bullets</h2>
        </div>
      </div>

      <div style={{ marginBottom: '32px' }}>
        <div className="input-label">Your Resume</div>
        <textarea
          value={resume}
          onChange={(e) => setResume(e.target.value)}
          placeholder="Paste your resume text here..."
          className="textarea"
          style={{ marginBottom: '24px' }}
        />
        <div className="input-label">PDF Upload (Optional)</div>
        <input
          type="file"
          accept=".pdf"
          onChange={handleFileUpload}
          style={{ marginBottom: '24px', fontSize: '0.875rem', color: 'var(--muted)' }}
        />
      </div>

      <div style={{ marginBottom: '32px' }}>
        <div className="input-label">Job Description</div>
        <textarea
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          placeholder="Paste the job description..."
          className="textarea"
        />
      </div>

      <div className="btn-row">
        <button onClick={handleUpdate} disabled={loading} className="btn btn-primary">
          {loading ? 'Updating...' : 'Update Resume'}
        </button>

        <button onClick={handleDownloadPdf} disabled={diffs.length === 0} className="btn btn-ghost">
          Download PDF
        </button>
      </div>

      {error && (
        <div style={{
          padding: '16px 20px',
          background: 'rgba(214,58,26,0.05)',
          border: '1px solid rgba(214,58,26,0.2)',
          color: 'var(--red)',
          marginTop: '32px'
        }}>
          {error}
        </div>
      )}

      {diffs.length > 0 && (
        <div style={{ marginTop: '48px' }}>
          {hireability && (
            <div className="insight-card">
              <div className="insight-head">
                <div className="insight-title">
                  Hireability Snapshot
                </div>
                <div className="insight-score">
                  {hireabilityOutOfTen}/10
                </div>
              </div>
              <p className="insight-text">{hireability.summary}</p>
              {hireability.top_gaps?.length > 0 && (
                <div>
                  <div className="insight-sub">Top gaps to close:</div>
                  <div className="chip-row">
                    {hireability.top_gaps.map((gap, idx) => (
                      <span key={idx} className="chip chip-warning">
                        {gap}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {(mustAdd.length > 0 || missingKeywords.length > 0 || atsFixes.length > 0 || interviewFocus.length > 0) && (
            <div className="insight-grid">
              <div className="insight-card">
                <div className="insight-block-title">
                  What To Add To Get Hired
                </div>
                {mustAdd.length === 0 && (
                  <p className="insight-muted">No specific additions detected yet.</p>
                )}
                <div className="stack-sm">
                  {mustAdd.map((item, idx) => (
                    <div key={idx} className="mini-card">
                      <div className="mini-title">{item.item}</div>
                      <div className="mini-why">Why: {item.why}</div>
                      <div className="mini-example">Example: {item.example}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="insight-card stack-md">
                <div>
                  <div className="insight-block-title">
                    Missing Keywords
                  </div>
                  <div className="chip-row">
                    {missingKeywords.map((k, idx) => (
                      <span key={idx} className="chip chip-purple">
                        {k}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="insight-block-title">
                    ATS Fixes
                  </div>
                  <ul className="list-copy">
                    {atsFixes.map((fix, idx) => (
                      <li key={idx}>{fix}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <div className="insight-block-title">
                    Interview Focus
                  </div>
                  <ul className="list-copy">
                    {interviewFocus.map((topic, idx) => (
                      <li key={idx}>{topic}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {changes.length > 0 && (
            <div className="insight-card">
              <div className="insight-block-title">
                Why These Changes Help
              </div>
              <ul className="list-copy">
                {changes.map((change, idx) => (
                  <li key={idx}>{change}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="diff-row">
          <div className="diff-box">
            <div className="diff-header old">
              — Original
            </div>
            <div className="diff-body">
              {diffs.map((diff, idx) => (
                <div
                  key={idx}
                  className={`diff-line ${
                    diff.changed
                      ? 'removed'
                      : 'unchanged'
                  }`}
                >
                  {diff.original}
                </div>
              ))}
            </div>
          </div>

          <div className="diff-box">
            <div className="diff-header new">
              + Updated
            </div>
            <div className="diff-body">
              {diffs.map((diff, idx) => (
                <div
                  key={idx}
                  className={`diff-line ${
                    diff.changed
                      ? 'added'
                      : 'unchanged'
                  }`}
                >
                  {diff.updated}
                </div>
              ))}
            </div>
          </div>
          </div>
        </div>
      )}
    </>
  )
}
