'use client'

import { useState } from 'react'

interface Skill {
  skill: string
  why: string
  resources?: string
}

interface RoadmapData {
  learn_first: Skill[]
  learn_next: Skill[]
  nice_to_have: Skill[]
}

interface RoadmapProps {
  resume: string
  setResume: (value: string) => void
  jobDescription: string
  setJobDescription: (value: string) => void
}

export function Roadmap({
  resume,
  setResume,
  jobDescription,
  setJobDescription,
}: RoadmapProps) {
  const [loading, setLoading] = useState(false)
  const [roadmap, setRoadmap] = useState<RoadmapData | null>(null)
  const [error, setError] = useState('')

  const handleGenerate = async () => {
    if (!resume.trim() || !jobDescription.trim()) {
      setError('Please provide both resume and job description')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/roadmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume, jobDescription }),
      })

      const data = await response.json()

      if (data.error) {
        setError(data.error)
      } else {
        setRoadmap(data)
      }
    } catch (err) {
      setError('Failed to generate roadmap')
    } finally {
      setLoading(false)
    }
  }

  const SkillCard = ({ skill }: { skill: Skill }) => (
    <div className="roadmap-item">
      <div className="ri-skill">{skill.skill}</div>
      <div className="ri-why">{skill.why}</div>
    </div>
  )

  return (
    <>
      <div className="pg-header">
        <div>
          <div className="pg-eyebrow">Skills</div>
          <h2 className="pg-title">Your Learning Path</h2>
        </div>
      </div>

      <div className="two-col" style={{ marginBottom: '32px' }}>
        <div>
          <div className="input-label">Your Resume</div>
          <textarea
            value={resume}
            onChange={(e) => setResume(e.target.value)}
            placeholder="Paste your resume..."
            className="textarea"
          />
        </div>
        <div>
          <div className="input-label">Job Description</div>
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste the job description..."
            className="textarea"
          />
        </div>
      </div>

      <button
        onClick={handleGenerate}
        disabled={loading}
        className="btn btn-primary"
      >
        {loading ? 'Generating...' : 'Generate Roadmap'}
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

      {roadmap && (
        <div className="three-col" style={{ marginTop: '48px' }}>
          <div>
            <div className="col-label red">
              Priority 1
            </div>
            {roadmap.learn_first.map((skill, idx) => (
              <SkillCard key={idx} skill={skill} />
            ))}
          </div>

          <div>
            <div className="col-label amber">
              Priority 2
            </div>
            {roadmap.learn_next.map((skill, idx) => (
              <SkillCard key={idx} skill={skill} />
            ))}
          </div>

          <div>
            <div className="col-label green">
              Nice to Have
            </div>
            {roadmap.nice_to_have.map((skill, idx) => (
              <SkillCard key={idx} skill={skill} />
            ))}
          </div>
        </div>
      )}
    </>
  )
}
