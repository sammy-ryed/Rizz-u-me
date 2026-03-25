'use client'

import { useState } from 'react'

interface JobResult {
  id: string
  title: string
  company: string
  location: string
  description: string
  salaryMin?: number
  salaryMax?: number
  salaryCurrency?: string
  contractType?: string
  url: string
  matchScore: number
  matchedSkills: string[]
  missingSkills: string[]
  reasoning: string
}

interface JobProfile {
  jobTitle: string
  skills: string[]
  experienceLevel: string
  desiredLocations: string[]
}

interface JobHuntProps {
  resume: string
  setResume: (value: string) => void
}

export function JobHunt({ resume, setResume }: JobHuntProps) {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<JobResult[]>([])
  const [jobProfile, setJobProfile] = useState<JobProfile | null>(null)
  const [error, setError] = useState('')
  const [location, setLocation] = useState('Bengaluru')

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
        return
      }
      setResume(data.text || '')
      setError('')
    } catch {
      setError('Failed to parse PDF')
    }
  }

  const handleSearchJobs = async () => {
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/job-hunt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume, location, country: 'in' }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to search jobs')
      }

      const data = await response.json()
      setResults(data.results || [])
      setJobProfile(data.jobProfile)

      if (data.results.length === 0) {
        setError('No jobs found yet. Try Indian locations like Bengaluru, Hyderabad, Pune, Chennai, Mumbai, or Delhi NCR.')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to search jobs. Please try again.')
      console.error('Job search error:', err)
    } finally {
      setLoading(false)
    }
  }

  const getMatchColor = (score: number): string => {
    if (score >= 80) return '#22c55e'
    if (score >= 60) return '#f59e0b'
    return '#ef4444'
  }

  const getMatchLabel = (score: number): string => {
    if (score >= 80) return 'Excellent Match'
    if (score >= 60) return 'Good Match'
    return 'Possible Fit'
  }

  return (
    <div className="content-wrapper">
      <div className="section">
        <h2>Find Your Next Role</h2>
        <p style={{ color: '#ccc', marginBottom: '30px' }}>
          AI scans job listings and ranks them by how well they match your skills and
          experience.
        </p>

        <div style={{ marginBottom: '20px' }}>
          <div className="input-label">Resume (paste text or upload PDF)</div>
          <textarea
            value={resume}
            onChange={(e) => setResume(e.target.value)}
            placeholder="Paste your resume text here..."
            className="textarea"
            style={{ marginBottom: '14px' }}
          />
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileUpload}
            style={{ marginBottom: '8px', fontSize: '0.875rem', color: 'var(--muted)' }}
          />
        </div>

        {/* Search Controls */}
        <div style={{ marginBottom: '30px', display: 'flex', gap: '10px' }}>
          <input
            type="text"
            placeholder="Job location in India (e.g., Bengaluru, Hyderabad, Pune)"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            style={{
              flex: 1,
              padding: '12px',
              backgroundColor: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '4px',
              color: '#fff',
              fontFamily: 'monospace',
              fontSize: '14px',
            }}
          />
          <button
            onClick={handleSearchJobs}
            disabled={loading || !resume.trim()}
            style={{
              padding: '12px 24px',
              backgroundColor: loading || !resume.trim() ? '#666' : '#C53518',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: loading || !resume.trim() ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              transition: 'background 0.3s',
            }}
          >
            {loading ? 'Searching...' : 'Search Jobs'}
          </button>
        </div>

        {error && (
          <div
            style={{
              color: '#ef4444',
              marginBottom: '20px',
              padding: '12px',
              backgroundColor: 'rgba(239,68,68,0.1)',
              borderRadius: '4px',
              borderLeft: '3px solid #ef4444',
            }}
          >
            {error}
          </div>
        )}

        {/* Job Profile Summary */}
        {jobProfile && !loading && (
          <div
            style={{
              backgroundColor: 'rgba(255,255,255,0.05)',
              padding: '20px',
              borderRadius: '8px',
              marginBottom: '30px',
              borderLeft: '3px solid #C53518',
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: '15px' }}>Profile Extracted</h3>
            <p>
              <strong>Target Role:</strong> {jobProfile.jobTitle}
            </p>
            <p>
              <strong>Experience Level:</strong> {jobProfile.experienceLevel}
            </p>
            <p>
              <strong>Top Skills:</strong>{' '}
              {jobProfile.skills.slice(0, 5).join(', ')}
              {jobProfile.skills.length > 5 && ` +${jobProfile.skills.length - 5} more`}
            </p>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div>
            <h3 style={{ marginBottom: '20px', marginTop: '30px' }}>
              {results.length} Jobs Found
            </h3>

            {results.map((job) => (
              <div
                key={job.id}
                style={{
                  backgroundColor: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  padding: '20px',
                  marginBottom: '20px',
                  transition: 'all 0.3s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)'
                }}
              >
                {/* Job Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '15px' }}>
                  <div>
                    <h3 style={{ margin: '0 0 5px 0' }}>{job.title}</h3>
                    <p style={{ margin: '0', color: '#999', fontSize: '14px' }}>
                      {job.company} • {job.location}
                    </p>
                  </div>

                  {/* Match Score */}
                  <div
                    style={{
                      textAlign: 'center',
                      backgroundColor: 'rgba(255,255,255,0.05)',
                      padding: '15px 20px',
                      borderRadius: '8px',
                      minWidth: '100px',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '28px',
                        fontWeight: 'bold',
                        color: getMatchColor(job.matchScore),
                        marginBottom: '5px',
                      }}
                    >
                      {job.matchScore}%
                    </div>
                    <div style={{ fontSize: '12px', color: '#ccc' }}>
                      {getMatchLabel(job.matchScore)}
                    </div>
                  </div>
                </div>

                {/* Salary & Contract */}
                {(job.salaryMin || job.contractType) && (
                  <div style={{ marginBottom: '15px', display: 'flex', gap: '20px', fontSize: '14px' }}>
                    {job.salaryMin && (
                      <div>
                        <span style={{ color: '#999' }}>Salary:</span>{' '}
                        <span style={{ color: '#fff' }}>
                          £{job.salaryMin.toLocaleString()} -{' '}
                          £{(job.salaryMax || job.salaryMin).toLocaleString()}
                        </span>
                      </div>
                    )}
                    {job.contractType && (
                      <div>
                        <span style={{ color: '#999' }}>Type:</span>{' '}
                        <span style={{ color: '#fff' }}>{job.contractType}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Job Description Snippet */}
                <p
                  style={{
                    color: '#ccc',
                    fontSize: '14px',
                    marginBottom: '15px',
                    lineHeight: '1.5',
                  }}
                >
                  {job.description}
                </p>

                {/* Skills Analysis */}
                <div style={{ marginBottom: '15px' }}>
                  {job.matchedSkills.length > 0 && (
                    <div style={{ marginBottom: '10px' }}>
                      <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#999' }}>
                        ✓ Your Skills:
                      </p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {job.matchedSkills.map((skill) => (
                          <span
                            key={skill}
                            style={{
                              backgroundColor: 'rgba(34,197,94,0.2)',
                              color: '#22c55e',
                              padding: '4px 12px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              border: '1px solid rgba(34,197,94,0.3)',
                            }}
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {job.missingSkills.length > 0 && (
                    <div>
                      <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#999' }}>
                        ⊕ You Could Learn:
                      </p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {job.missingSkills.map((skill) => (
                          <span
                            key={skill}
                            style={{
                              backgroundColor: 'rgba(249,115,22,0.2)',
                              color: '#f59e0b',
                              padding: '4px 12px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              border: '1px solid rgba(249,115,22,0.3)',
                            }}
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Why this job */}
                {job.reasoning && (
                  <div
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.03)',
                      padding: '12px',
                      borderRadius: '4px',
                      fontSize: '13px',
                      color: '#ccc',
                      marginBottom: '15px',
                      borderLeft: '2px solid rgba(197,53,24,0.5)',
                    }}
                  >
                    <strong style={{ color: '#fff' }}>Why this match:</strong> {job.reasoning}
                  </div>
                )}

                {/* CTA */}
                <a
                  href={job.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-block',
                    marginTop: '10px',
                    padding: '10px 20px',
                    backgroundColor: '#C53518',
                    color: '#fff',
                    textDecoration: 'none',
                    borderRadius: '4px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    transition: 'background 0.3s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#a02d14'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#C53518'
                  }}
                >
                  View Full Job →
                </a>
              </div>
            ))}
          </div>
        )}

        {!loading && results.length === 0 && jobProfile && (
          <div
            style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: '#999',
            }}
          >
            <p>No results yet. Try searching for jobs in a different location.</p>
          </div>
        )}
      </div>
    </div>
  )
}
