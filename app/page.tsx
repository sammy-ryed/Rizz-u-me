'use client'

import { useState } from 'react'
import { ResumeUpdater } from '@/components/pages/ResumeUpdater'
import { Roadmap } from '@/components/pages/Roadmap'
import { ResumeRoast } from '@/components/pages/ResumeRoast'
import { InterviewSimulator } from '@/components/pages/InterviewSimulator'
import { JobHunt } from '@/components/pages/JobHunt'
import { ThinkLab } from '../components/pages/ThinkLab'

export default function Home() {
  const [resume, setResume] = useState('')
  const [jobDescription, setJobDescription] = useState('')

  return (
    <>
      {/* LANDING PAGE */}
      <div id="landing" className="page active">
        <div className="landing-left">
          <div>
            <div className="hero-kicker">Welcome to Rizz<span style={{ color: '#C53518' }}>u</span>me</div>
            <h1 className="hero-headline">
              <span className="red">Your</span> AI Job Coach
            </h1>
            <p className="hero-body">
              Polish your resume, learn what's missing, practice interviews, and land the job.
            </p>
            <button className="hero-cta" onClick={() => (window as any).goTo('updater')}>
              Get Started
            </button>
          </div>
        </div>
        <div className="landing-right">
          <div>
            <div className="hero-kicker">Features</div>
            <div className="stat-row">
              <div className="stat-num">200%</div>
              <div className="stat-label">Better Resume</div>
            </div>
            <div className="stat-row">
              <div className="stat-num">5min</div>
              <div className="stat-label">Setup Time</div>
            </div>
            <div className="stat-row">
              <div className="stat-num">∞</div>
              <div className="stat-label">Practice</div>
            </div>
          </div>
        </div>
      </div>

      {/* RESUME UPDATER */}
      <div id="updater" className="page">
        <ResumeUpdater
          resume={resume}
          setResume={setResume}
          jobDescription={jobDescription}
          setJobDescription={setJobDescription}
        />
      </div>

      {/* ROADMAP */}
      <div id="roadmap" className="page">
        <Roadmap
          resume={resume}
          setResume={setResume}
          jobDescription={jobDescription}
          setJobDescription={setJobDescription}
        />
      </div>

      {/* ROAST */}
      <div id="roast" className="page">
        <ResumeRoast resume={resume} setResume={setResume} />
      </div>

      {/* THINK */}
      <div id="think" className="page">
        <ThinkLab resume={resume} jobDescription={jobDescription} />
      </div>

      {/* INTERVIEW */}
      <div id="interview" className="page">
        <InterviewSimulator resume={resume} jobDescription={jobDescription} />
      </div>

      {/* JOB HUNT */}
      <div id="job-hunt" className="page">
        <JobHunt resume={resume} setResume={setResume} />
      </div>
    </>
  )
}
