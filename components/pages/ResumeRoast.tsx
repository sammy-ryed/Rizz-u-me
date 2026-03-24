'use client'

import { useState } from 'react'

interface RoastData {
  score: number
  roast: string[]
  fixes: string[]
  positives: string[]
}

interface ResumeRoastProps {
  resume: string
  setResume: (value: string) => void
}

export function ResumeRoast({ resume, setResume }: ResumeRoastProps) {
  const [intensity, setIntensity] = useState(7)
  const [loading, setLoading] = useState(false)
  const [roast, setRoast] = useState<RoastData | null>(null)
  const [error, setError] = useState('')

  const handleRoast = async () => {
    if (!resume.trim()) {
      setError('Please paste your resume')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/roast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume, intensity }),
      })

      const data = await response.json()

      if (data.error) {
        setError(data.error)
      } else {
        setRoast(data)
      }
    } catch (err) {
      setError('Failed to roast resume')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="pg-header">
        <div>
          <div className="pg-eyebrow">Feedback</div>
          <h2 className="pg-title">Get Roasted</h2>
        </div>
      </div>

      <div style={{ marginBottom: '32px' }}>
        <div className="input-label">Your Resume</div>
        <textarea
          value={resume}
          onChange={(e) => setResume(e.target.value)}
          placeholder="Paste your resume..."
          className="textarea"
        />
      </div>

      <div className="slider-wrap">
        <div className="slider-header">
          <div className="slider-name">Roast Intensity</div>
          <div className="slider-val">{intensity}</div>
        </div>
        <input
          type="range"
          min="1"
          max="10"
          value={intensity}
          onChange={(e) => setIntensity(parseInt(e.target.value))}
        />
      </div>

      <button
        onClick={handleRoast}
        disabled={loading}
        className="btn btn-red"
      >
        {loading ? 'Roasting...' : 'Give Me The Roast'}
      </button>

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

      {roast && (
        <div style={{ marginTop: '48px' }}>
          <div className="roast-verdict">
            <div className="score-display">
              <div className="score-big">{roast.score}</div>
              <div className="score-unit">/10</div>
            </div>
          </div>

          {roast.roast.length > 0 && (
            <div style={{ marginTop: '32px' }}>
              <div className="card-header ch-red">The Roast</div>
              <div className="roast-list">
                {roast.roast.map((item, idx) => (
                  <div key={idx} className="roast-entry">
                    <span className="re-icon">🔥</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="roast-entry-list">
            <div style={{ marginTop: '32px' }}>
              <div className="card-header ch-red">What To Fix</div>
              <div className="roast-list">
                {roast.fixes.map((item, idx) => (
                  <div key={idx} className="roast-entry">
                    <span className="re-icon">🔧</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginTop: '32px' }}>
              <div className="card-header ch-green">What's Good</div>
              <div className="roast-list">
                {roast.positives.map((item, idx) => (
                  <div key={idx} className="roast-entry">
                    <span className="re-icon">✓</span>
                    <span>{item}</span>
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
