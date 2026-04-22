import { NextRequest, NextResponse } from 'next/server'
import { callGroq } from '@/lib/groq'

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

interface ThinkApiResponse {
  quiz: QuizQuestion[]
  recommendedDifficulty: Difficulty
  rationale: string
}

interface ThinkRequestBody {
  topic?: unknown
  focus?: unknown
  difficulty?: unknown
  questionCount?: unknown
  resume?: unknown
  jobDescription?: unknown
  performance?: {
    accuracy?: unknown
    streak?: unknown
    rounds?: unknown
  }
}

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard']

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function coerceString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function normalizeDifficulty(value: unknown, fallback: Difficulty = 'medium'): Difficulty {
  if (value === 'easy' || value === 'medium' || value === 'hard') {
    return value
  }
  return fallback
}

function clampQuestionCount(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 5
  return Math.max(3, Math.min(8, Math.floor(value)))
}

function boundedPercent(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, Math.round(value)))
}

function parseModelJson(rawResponse: string): Record<string, unknown> {
  try {
    const directParsed: unknown = JSON.parse(rawResponse)
    if (isObject(directParsed)) {
      return directParsed
    }
  } catch {
    // Fallback below handles wrapped model responses.
  }

  const jsonMatch = rawResponse.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('No JSON object found in model response')
  }

  const normalizedJson = jsonMatch[0]
    .replace(/\r/g, '')
    .replace(/\n/g, '\\n')

  const fallbackParsed: unknown = JSON.parse(normalizedJson)
  if (!isObject(fallbackParsed)) {
    throw new Error('Model response JSON was not an object')
  }

  return fallbackParsed
}

function shiftDifficulty(current: Difficulty, direction: -1 | 0 | 1): Difficulty {
  const currentIndex = DIFFICULTIES.indexOf(current)
  const nextIndex = Math.max(0, Math.min(DIFFICULTIES.length - 1, currentIndex + direction))
  return DIFFICULTIES[nextIndex]
}

function fallbackRecommendation(current: Difficulty, accuracyPercent: number): Difficulty {
  if (accuracyPercent >= 80) return shiftDifficulty(current, 1)
  if (accuracyPercent <= 40) return shiftDifficulty(current, -1)
  return current
}

function sanitizeQuestion(
  candidate: unknown,
  index: number,
  requestedDifficulty: Difficulty
): QuizQuestion | null {
  if (!isObject(candidate)) return null

  const prompt = coerceString(candidate.prompt).trim()
  if (!prompt) return null

  const rawOptions = Array.isArray(candidate.options) ? candidate.options : []
  const options = rawOptions
    .map((option) => coerceString(option).trim())
    .filter((option) => option.length > 0)
    .slice(0, 4)

  if (options.length < 2) return null

  while (options.length < 4) {
    options.push(`Option ${options.length + 1}`)
  }

  const rawAnswerIndex = candidate.answerIndex
  const numericAnswer =
    typeof rawAnswerIndex === 'number' && Number.isFinite(rawAnswerIndex)
      ? Math.floor(rawAnswerIndex)
      : 0
  const answerIndex = Math.max(0, Math.min(options.length - 1, numericAnswer))

  const explanation =
    coerceString(candidate.explanation).trim() ||
    'Review the concept behind this question and explain your reasoning aloud.'

  const skill = coerceString(candidate.skill).trim() || `Skill ${index + 1}`
  const difficulty = normalizeDifficulty(candidate.difficulty, requestedDifficulty)
  const id = coerceString(candidate.id).trim() || `q-${index + 1}`

  return {
    id,
    prompt,
    options,
    answerIndex,
    explanation,
    skill,
    difficulty,
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ThinkRequestBody

    const topic = coerceString(body.topic).trim()
    if (!topic) {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 })
    }

    const focus = coerceString(body.focus).trim()
    const difficulty = normalizeDifficulty(body.difficulty, 'medium')
    const questionCount = clampQuestionCount(body.questionCount)

    const resume = coerceString(body.resume).trim()
    const jobDescription = coerceString(body.jobDescription).trim()

    const performance = isObject(body.performance) ? body.performance : {}
    const accuracy = boundedPercent(performance.accuracy)
    const streak = Math.max(0, Math.floor(safeNumber(performance.streak)))
    const rounds = Math.max(0, Math.floor(safeNumber(performance.rounds)))

    const prompt = `You are designing an adaptive quiz for a learner.

Return ONLY valid JSON. No markdown, no explanation, no extra text.

CRITICAL FORMATTING REQUIREMENTS:
- Use double quotes for all keys and string values
- Escape all newlines as \\n
- Do not add trailing commas
- Do not include any text before or after the JSON object

Learner Data:
- Topic: ${JSON.stringify(topic)}
- Focus Notes: ${JSON.stringify(focus)}
- Requested Difficulty: ${JSON.stringify(difficulty)}
- Requested Question Count: ${questionCount}
- Overall Accuracy Percent: ${accuracy}
- Current Correct Streak: ${streak}
- Completed Rounds: ${rounds}
- Resume Context: ${JSON.stringify(resume)}
- Job Description Context: ${JSON.stringify(jobDescription)}

Build practical multiple-choice questions that are personalized to this learner context.

Return this exact JSON shape:
{
  "quiz": [
    {
      "id": "q1",
      "prompt": "question text",
      "skill": "skill being tested",
      "difficulty": "easy|medium|hard",
      "options": ["option A", "option B", "option C", "option D"],
      "answerIndex": 0,
      "explanation": "short explanation of why the correct answer is best"
    }
  ],
  "recommendedDifficulty": "easy|medium|hard",
  "rationale": "one sentence describing why the next difficulty was chosen"
}

Rules:
- Produce exactly ${questionCount} questions
- Every question must include exactly 4 options
- answerIndex must be an integer from 0 to 3
- Cover different sub-skills, do not repeat the same question pattern
- Keep questions concise and practical`

    const modelResponse = await callGroq(
      prompt,
      'You are an expert assessment designer. Output strict JSON only.'
    )

    const parsed = parseModelJson(modelResponse)

    const rawQuiz = Array.isArray(parsed.quiz) ? parsed.quiz : []
    const sanitizedQuiz = rawQuiz
      .map((question, index) => sanitizeQuestion(question, index, difficulty))
      .filter((question): question is QuizQuestion => question !== null)

    if (sanitizedQuiz.length === 0) {
      return NextResponse.json(
        { error: 'Unable to generate a valid quiz from model output' },
        { status: 502 }
      )
    }

    const quiz = sanitizedQuiz.slice(0, questionCount)
    const recommendedDifficulty = normalizeDifficulty(
      parsed.recommendedDifficulty,
      fallbackRecommendation(difficulty, accuracy)
    )

    const rationaleValue = coerceString(parsed.rationale).trim()
    const rationale =
      rationaleValue ||
      `Difficulty adjusted to ${recommendedDifficulty} based on recent performance signals.`

    const payload: ThinkApiResponse = {
      quiz,
      recommendedDifficulty,
      rationale,
    }

    return NextResponse.json(payload)
  } catch (error) {
    console.error('Think API error:', error)
    return NextResponse.json(
      { error: 'Failed to generate adaptive quiz' },
      { status: 500 }
    )
  }
}

function safeNumber(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0
  return value
}
