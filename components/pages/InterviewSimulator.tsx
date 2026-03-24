'use client'

import { useState, useRef, useEffect } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface InterviewSimulatorProps {
  resume: string
  jobDescription: string
}

export function InterviewSimulator({
  resume,
  jobDescription,
}: InterviewSimulatorProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [score, setScore] = useState(0)
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy')
  const [error, setError] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const startInterview = async () => {
    if (!jobDescription.trim()) {
      setError('Add a job description first. Interview questions are generated from the JD.')
      return
    }

    setError('')
    setLoading(true)
    setMessages([])
    setScore(0)

    try {
      const response = await fetch('/api/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [],
          action: 'start',
          resume,
          jobDescription,
        }),
      })

      const data = await response.json()

      if (data.error) {
        setError(data.error)
        setMessages([
          {
            role: 'assistant',
            content: 'Failed to start interview. Please try again.',
          },
        ])
      } else {
        setMessages([{ role: 'assistant', content: data.question }])
        setScore(data.score || 0)
        setDifficulty(data.difficulty || 'easy')
      }
    } catch (err) {
      setMessages([
        { role: 'assistant', content: 'Failed to start interview. Please try again.' },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitAnswer = async () => {
    if (!input.trim()) return

    const userMessage: Message = { role: 'user', content: input }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const response = await fetch('/api/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          action: 'answer',
          resume,
          jobDescription,
        }),
      })

      const data = await response.json()

      if (data.error) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: 'Error processing answer. Please try again.' },
        ])
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: data.feedback + '\n\n' + data.question,
          },
        ])
        setScore(data.score || score)
        setDifficulty(data.difficulty || difficulty)
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Error processing answer. Please try again.' },
      ])
    } finally {
      setLoading(false)
    }
  }

  if (messages.length === 0) {
    return (
      <>
        <div className="pg-header">
          <div>
            <div className="pg-eyebrow">Practice</div>
            <h2 className="pg-title">Mock Interview</h2>
          </div>
        </div>
        <div style={{
          marginTop: '24px',
          marginBottom: '32px',
          color: 'var(--muted)',
          lineHeight: '1.6'
        }}>
          Interview questions are generated from your job description and adapt to your answers.
        </div>
        {error && (
          <div style={{
            padding: '16px 20px',
            background: 'rgba(214,58,26,0.05)',
            border: '1px solid rgba(214,58,26,0.2)',
            color: 'var(--red)',
            marginBottom: '32px'
          }}>
            {error}
          </div>
        )}
        <button
          onClick={startInterview}
          disabled={loading || !jobDescription.trim()}
          className="btn btn-primary"
        >
          {loading ? 'Starting...' : 'Start Interview'}
        </button>
      </>
    )
  }

  return (
    <>
      <div className="pg-header">
        <div>
          <div className="pg-eyebrow">Practice</div>
          <h2 className="pg-title">Mock Interview</h2>
        </div>
      </div>

      {error && (
        <div style={{
          padding: '16px 20px',
          background: 'rgba(214,58,26,0.05)',
          border: '1px solid rgba(214,58,26,0.2)',
          color: 'var(--red)',
          marginBottom: '32px'
        }}>
          {error}
        </div>
      )}

      <div className="perf-header">
        <div className="perf-label">Interview Score</div>
        <div className="perf-track">
          <div
            className="perf-fill"
            style={{ width: `${Math.min(score * 10, 100)}%` }}
          />
        </div>
        <div className="perf-val">{score} / 10</div>
      </div>

      <div className="chat-area">
        {messages.map((msg, idx) => (
          <div key={idx} className={`bubble ${msg.role === 'user' ? 'user' : 'ai'}`}>
            {msg.role === 'assistant' && (
              <span className="difficulty-badge" style={{
                display: 'inline-block',
                padding: '4px 8px',
                marginBottom: '8px',
                background: `var(--${difficulty === 'easy' ? 'blue' : difficulty === 'medium' ? 'yellow' : 'red'})`,
                color: 'var(--paper)',
                fontSize: '10px',
                fontWeight: 'bold',
                fontFamily: 'Martian Mono, monospace',
                textTransform: 'uppercase'
              }}>
                {difficulty}
              </span>
            )}
            <br />
            {msg.content}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-row">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && !loading && handleSubmitAnswer()}
          placeholder="Type your answer..."
          className="chat-input"
          disabled={loading}
        />
        <button
          onClick={handleSubmitAnswer}
          disabled={loading || !input.trim()}
          className="btn btn-primary"
        >
          {loading ? 'Thinking...' : 'Send'}
        </button>
      </div>
    </>
  )
}
