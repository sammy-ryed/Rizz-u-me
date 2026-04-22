'use client'

import { useEffect, useMemo, useState } from 'react'

type Difficulty = 'easy' | 'medium' | 'hard'

interface QuizQuestion {
  id: string
  prompt: string
  options: string[]
  answerIndex: number
  explanation: string
  skill: string
  difficulty: Difficulty
}

interface ThinkResponse {
  quiz: QuizQuestion[]
  recommendedDifficulty: Difficulty
  rationale: string
}

interface ThinkLabProps {
  resume: string
  jobDescription: string
}

interface DashboardRound {
  score: number
  total: number
  difficulty: Difficulty
  at: string
}

interface DashboardState {
  rounds: number
  answered: number
  correct: number
  streak: number
  bestStreak: number
  roundHistory: DashboardRound[]
}

const DASHBOARD_KEY = 'rizzume-think-dashboard-v1'
const MAX_HISTORY = 8

const DEFAULT_DASHBOARD: DashboardState = {
  rounds: 0,
  answered: 0,
  correct: 0,
  streak: 0,
  bestStreak: 0,
  roundHistory: [],
}

const DIFFICULTY_RANK: Difficulty[] = ['easy', 'medium', 'hard']

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function safeNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function shiftDifficulty(current: Difficulty, direction: -1 | 0 | 1): Difficulty {
  const currentIndex = DIFFICULTY_RANK.indexOf(current)
  const nextIndex = Math.max(0, Math.min(DIFFICULTY_RANK.length - 1, currentIndex + direction))
  return DIFFICULTY_RANK[nextIndex]
}

function parseDashboard(rawValue: string | null): DashboardState {
  if (!rawValue) return DEFAULT_DASHBOARD

  try {
    const parsed: unknown = JSON.parse(rawValue)
    if (!isObject(parsed)) return DEFAULT_DASHBOARD

    const rawHistory = Array.isArray(parsed.roundHistory) ? parsed.roundHistory : []
    const roundHistory: DashboardRound[] = rawHistory
      .map((item) => {
        if (!isObject(item)) return null

        const difficultyValue = item.difficulty
        const difficulty: Difficulty =
          difficultyValue === 'easy' || difficultyValue === 'medium' || difficultyValue === 'hard'
            ? difficultyValue
            : 'medium'

        return {
          score: safeNumber(item.score),
          total: Math.max(1, safeNumber(item.total, 1)),
          difficulty,
          at: typeof item.at === 'string' ? item.at : new Date().toISOString(),
        }
      })
      .filter((item): item is DashboardRound => item !== null)
      .slice(0, MAX_HISTORY)

    return {
      rounds: safeNumber(parsed.rounds),
      answered: safeNumber(parsed.answered),
      correct: safeNumber(parsed.correct),
      streak: safeNumber(parsed.streak),
      bestStreak: safeNumber(parsed.bestStreak),
      roundHistory,
    }
  } catch {
    return DEFAULT_DASHBOARD
  }
}

function formatTimestamp(isoString: string): string {
  const date = new Date(isoString)
  if (Number.isNaN(date.getTime())) return 'Unknown time'

  const day = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  const time = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  return `${day} ${time}`
}

export function ThinkLab({ resume, jobDescription }: ThinkLabProps) {
  const [topic, setTopic] = useState('Role-aligned technical foundations')
  const [focusNote, setFocusNote] = useState('')
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [quiz, setQuiz] = useState<QuizQuestion[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [activeCorrect, setActiveCorrect] = useState<boolean | null>(null)
  const [roundAnswers, setRoundAnswers] = useState<boolean[]>([])
  const [roundCompleted, setRoundCompleted] = useState(false)

  const [recommendedDifficulty, setRecommendedDifficulty] = useState<Difficulty>('medium')
  const [aiRationale, setAiRationale] = useState('')

  const [dashboard, setDashboard] = useState<DashboardState>(DEFAULT_DASHBOARD)

  useEffect(() => {
    const saved = window.localStorage.getItem(DASHBOARD_KEY)
    setDashboard(parseDashboard(saved))
  }, [])

  useEffect(() => {
    window.localStorage.setItem(DASHBOARD_KEY, JSON.stringify(dashboard))
  }, [dashboard])

  const overallAccuracy = useMemo(() => {
    if (dashboard.answered === 0) return 0
    return Math.round((dashboard.correct / dashboard.answered) * 100)
  }, [dashboard.answered, dashboard.correct])

  const profileSignal = useMemo(() => {
    const hasResume = resume.trim().length > 0
    const hasJob = jobDescription.trim().length > 0

    if (hasResume && hasJob) return 'Personalization source: Resume + JD'
    if (hasResume) return 'Personalization source: Resume only'
    if (hasJob) return 'Personalization source: Job description only'
    return 'Personalization source: Manual topic only'
  }, [resume, jobDescription])

  const currentQuestion = quiz[currentIndex] ?? null
  const roundScore = roundAnswers.filter(Boolean).length
  const roundAccuracy = quiz.length > 0 ? Math.round((roundScore / quiz.length) * 100) : 0

  const generateQuiz = async (difficultyOverride?: Difficulty) => {
    const requestedDifficulty = difficultyOverride ?? difficulty

    setDifficulty(requestedDifficulty)
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/think', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          focus: focusNote,
          difficulty: requestedDifficulty,
          questionCount: 5,
          resume,
          jobDescription,
          performance: {
            accuracy: overallAccuracy,
            streak: dashboard.streak,
            rounds: dashboard.rounds,
          },
        }),
      })

      const data = (await response.json()) as Partial<ThinkResponse> & {
        error?: string
      }

      if (!response.ok || data.error) {
        throw new Error(data.error ?? 'Failed to generate adaptive quiz')
      }

      if (!Array.isArray(data.quiz) || data.quiz.length === 0) {
        throw new Error('No quiz questions were generated. Try another topic.')
      }

      setQuiz(data.quiz)
      setCurrentIndex(0)
      setSelectedOption(null)
      setActiveCorrect(null)
      setRoundAnswers([])
      setRoundCompleted(false)
      setRecommendedDifficulty(data.recommendedDifficulty ?? requestedDifficulty)
      setAiRationale(data.rationale ?? '')
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'Failed to generate quiz'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const submitAnswer = () => {
    if (selectedOption === null || !currentQuestion || activeCorrect !== null) return

    const isCorrect = selectedOption === currentQuestion.answerIndex
    const isLastQuestion = currentIndex === quiz.length - 1
    const nextRoundScore = roundScore + (isCorrect ? 1 : 0)

    const adaptationDirection: -1 | 0 | 1 = isLastQuestion
      ? nextRoundScore / quiz.length >= 0.8
        ? 1
        : nextRoundScore / quiz.length <= 0.4
          ? -1
          : 0
      : 0

    setActiveCorrect(isCorrect)
    setRoundAnswers((prev) => [...prev, isCorrect])

    setDashboard((prev) => {
      const answered = prev.answered + 1
      const correct = prev.correct + (isCorrect ? 1 : 0)
      const streak = isCorrect ? prev.streak + 1 : 0
      const bestStreak = Math.max(prev.bestStreak, streak)
      const rounds = prev.rounds + (isLastQuestion ? 1 : 0)

      const nextHistory = isLastQuestion
        ? [
            {
              score: nextRoundScore,
              total: quiz.length,
              difficulty,
              at: new Date().toISOString(),
            },
            ...prev.roundHistory,
          ].slice(0, MAX_HISTORY)
        : prev.roundHistory

      return {
        ...prev,
        answered,
        correct,
        streak,
        bestStreak,
        rounds,
        roundHistory: nextHistory,
      }
    })

    if (isLastQuestion) {
      setRoundCompleted(true)
      setRecommendedDifficulty(shiftDifficulty(difficulty, adaptationDirection))
    }
  }

  const nextQuestion = () => {
    if (currentIndex >= quiz.length - 1) return

    setCurrentIndex((prev) => prev + 1)
    setSelectedOption(null)
    setActiveCorrect(null)
  }

  const resetDashboard = () => {
    setDashboard(DEFAULT_DASHBOARD)
  }

  return (
    <>
      <div className="pg-header">
        <div>
          <div className="pg-eyebrow">Think</div>
          <h2 className="pg-title">Adaptive Learning Engine</h2>
        </div>
      </div>

      <div className="think-top-grid">
        <div className="think-panel">
          <div className="section-label">Personalized Quiz Builder</div>

          <div style={{ marginBottom: '16px' }}>
            <div className="input-label">Learning Topic</div>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Example: React performance, SQL indexing, cloud basics"
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <div className="input-label">Focus Notes</div>
            <textarea
              value={focusNote}
              onChange={(e) => setFocusNote(e.target.value)}
              placeholder="Tell Think what to emphasize: fundamentals, scenario-based, system design, etc."
              rows={5}
            />
          </div>

          <div className="think-actions-row">
            <div>
              <div className="input-label">Starting Difficulty</div>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as Difficulty)}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            <button
              className="btn btn-primary"
              onClick={() => void generateQuiz()}
              disabled={loading || !topic.trim()}
            >
              {loading ? 'Generating...' : 'Generate Adaptive Quiz'}
            </button>
          </div>

          <div className="think-context-pill">{profileSignal}</div>

          {aiRationale && (
            <div className="think-rationale">
              <span>AI adaptation note:</span> {aiRationale}
            </div>
          )}
        </div>

        <div className="think-panel">
          <div className="section-label">Tracking Dashboard</div>

          <div className="think-metrics-grid">
            <div className="think-metric-card">
              <div className="think-metric-label">Rounds</div>
              <div className="think-metric-value">{dashboard.rounds}</div>
            </div>
            <div className="think-metric-card">
              <div className="think-metric-label">Accuracy</div>
              <div className="think-metric-value">{overallAccuracy}%</div>
            </div>
            <div className="think-metric-card">
              <div className="think-metric-label">Current Streak</div>
              <div className="think-metric-value">{dashboard.streak}</div>
            </div>
            <div className="think-metric-card">
              <div className="think-metric-label">Best Streak</div>
              <div className="think-metric-value">{dashboard.bestStreak}</div>
            </div>
          </div>

          <div className="think-history-wrap">
            {dashboard.roundHistory.length === 0 && (
              <div className="think-history-empty">
                No rounds yet. Generate a quiz to start tracking performance.
              </div>
            )}

            {dashboard.roundHistory.map((round, index) => {
              const scorePercent = Math.round((round.score / round.total) * 100)

              return (
                <div className="think-history-row" key={`${round.at}-${index}`}>
                  <div className="think-history-head">
                    <div>
                      <strong>{round.score} / {round.total}</strong> on {round.difficulty}
                    </div>
                    <div>{formatTimestamp(round.at)}</div>
                  </div>
                  <div className="think-history-bar">
                    <div style={{ width: `${scorePercent}%` }} />
                  </div>
                </div>
              )
            })}
          </div>

          <button
            className="btn btn-ghost"
            onClick={resetDashboard}
            disabled={dashboard.answered === 0}
          >
            Reset Dashboard
          </button>
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: '16px 20px',
            background: 'rgba(214,58,26,0.05)',
            border: '1px solid rgba(214,58,26,0.2)',
            color: 'var(--red)',
            marginBottom: '24px',
          }}
        >
          {error}
        </div>
      )}

      {currentQuestion && (
        <div className="think-panel think-quiz-panel">
          <div className="think-quiz-head">
            <div className="think-question-progress">
              Question {currentIndex + 1} / {quiz.length}
            </div>
            <div className={`think-difficulty-pill think-${currentQuestion.difficulty}`}>
              {currentQuestion.difficulty}
            </div>
          </div>

          <h3 className="think-question">{currentQuestion.prompt}</h3>
          <div className="think-skill-line">Skill focus: {currentQuestion.skill}</div>

          <div className="think-options">
            {currentQuestion.options.map((option, index) => {
              const isSelected = selectedOption === index
              const isCorrectOption = activeCorrect !== null && index === currentQuestion.answerIndex
              const isWrongSelection = activeCorrect === false && isSelected

              return (
                <button
                  key={`${currentQuestion.id}-${index}`}
                  className={`think-option ${isSelected ? 'selected' : ''} ${
                    isCorrectOption ? 'correct' : ''
                  } ${isWrongSelection ? 'wrong' : ''}`}
                  onClick={() => setSelectedOption(index)}
                  disabled={activeCorrect !== null}
                >
                  <span className="think-option-key">{String.fromCharCode(65 + index)}</span>
                  <span>{option}</span>
                </button>
              )
            })}
          </div>

          {activeCorrect !== null && (
            <div className={`think-feedback ${activeCorrect ? 'good' : 'bad'}`}>
              <div className="think-feedback-title">{activeCorrect ? 'Correct' : 'Keep going'}</div>
              <div className="think-feedback-copy">{currentQuestion.explanation}</div>
            </div>
          )}

          <div className="btn-row" style={{ marginTop: '18px', alignItems: 'center' }}>
            {activeCorrect === null && (
              <button
                className="btn btn-primary"
                onClick={submitAnswer}
                disabled={selectedOption === null}
              >
                Submit Answer
              </button>
            )}

            {activeCorrect !== null && !roundCompleted && (
              <button className="btn btn-primary" onClick={nextQuestion}>
                Next Question
              </button>
            )}

            {activeCorrect !== null && roundCompleted && (
              <button
                className="btn btn-red"
                onClick={() => void generateQuiz(recommendedDifficulty)}
                disabled={loading}
              >
                {loading
                  ? 'Adapting...'
                  : `Start ${recommendedDifficulty.toUpperCase()} Round`}
              </button>
            )}

            {roundCompleted && (
              <div className="think-round-summary">
                Round score: {roundScore}/{quiz.length} ({roundAccuracy}%). Next recommended difficulty:{' '}
                <strong>{recommendedDifficulty}</strong>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
