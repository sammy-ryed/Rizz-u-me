import { NextRequest, NextResponse } from 'next/server'
import { callGroq } from '@/lib/groq'

type AddItem = {
  item: string
  why: string
  example: string
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((v): v is string => typeof v === 'string').map((v) => v.trim()).filter(Boolean)
}

function toAddItems(value: unknown): AddItem[] {
  if (!Array.isArray(value)) return []
  return value
    .map((v) => {
      if (!v || typeof v !== 'object') return null
      const obj = v as Record<string, unknown>
      const item = typeof obj.item === 'string' ? obj.item.trim() : ''
      const why = typeof obj.why === 'string' ? obj.why.trim() : ''
      const example = typeof obj.example === 'string' ? obj.example.trim() : ''
      if (!item || !why || !example) return null
      return { item, why, example }
    })
    .filter((v): v is AddItem => Boolean(v))
}

export async function POST(req: NextRequest) {
  try {
    const { resume, jobDescription } = await req.json()

    if (!resume || !jobDescription) {
      return NextResponse.json(
        { error: 'Resume and job description are required' },
        { status: 400 }
      )
    }

    const prompt = `You are a senior recruiter + resume strategist.
Your goal is to maximize hireability for this exact job while keeping the candidate honest.

Return ONLY valid JSON. No markdown, no explanation, no extra text.

CRITICAL FORMATTING REQUIREMENTS:
- Use double quotes for ALL keys and string values
- Escape all newlines as \\n (backslash followed by 'n')
- Do NOT add trailing commas
- Do NOT include any text before or after the JSON object

Schema:
{
  "original": ["bullet 1", "bullet 2"],
  "updated": ["rewritten bullet 1", "rewritten bullet 2"],
  "changes": ["what changed and why it helps"],
  "hireability": {
    "score": 0,
    "summary": "one-line assessment",
    "top_gaps": ["gap 1", "gap 2", "gap 3"]
  },
  "must_add": [
    {
      "item": "what to add",
      "why": "why recruiter cares",
      "example": "specific example bullet candidate can adapt"
    }
  ],
  "missing_keywords": ["keyword 1", "keyword 2"],
  "ats_fixes": ["ATS fix 1", "ATS fix 2"],
  "interview_focus": ["topic to prep 1", "topic to prep 2"]
}

QUALITY RULES:
- Rewrite bullets with measurable outcomes where possible (metrics, scope, impact).
- Keep claims realistic and based on resume evidence.
- Prioritize JD keywords naturally in rewritten bullets.
- "must_add" should be concrete and practical, not generic fluff.
- Keep arrays concise and high-signal.

Resume:
${JSON.stringify(resume)}

Job Description:
${JSON.stringify(jobDescription)}`

    const response = await callGroq(
      prompt,
      'You are a high-standards recruiter and resume strategist. Return ONLY valid JSON that matches schema exactly.'
    )

    let result

    // Try parsing directly first (best case)
    try {
      result = JSON.parse(response)
    } catch (parseError) {
      // Fallback: extract JSON block and sanitize
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No valid JSON found in response')
      }

      const jsonString = jsonMatch[0]
        .replace(/\\n/g, '\\n')  // already escaped newlines stay as-is
        .replace(/\n/g, '\\n')   // literal newlines become escaped
        .replace(/\r/g, '')      // remove carriage returns

      result = JSON.parse(jsonString)
    }

    const original = toStringArray(result?.original)
    const updated = toStringArray(result?.updated)
    const changes = toStringArray(result?.changes)

    const hireabilitySource =
      result && typeof result === 'object' && result.hireability && typeof result.hireability === 'object'
        ? (result.hireability as Record<string, unknown>)
        : {}

    const normalized = {
      original,
      updated,
      changes,
      hireability: {
        score:
          typeof hireabilitySource.score === 'number'
            ? Math.max(0, Math.min(100, Math.round(hireabilitySource.score)))
            : 0,
        summary:
          typeof hireabilitySource.summary === 'string'
            ? hireabilitySource.summary.trim()
            : 'No assessment available yet.',
        top_gaps: toStringArray(hireabilitySource.top_gaps),
      },
      must_add: toAddItems(result?.must_add),
      missing_keywords: toStringArray(result?.missing_keywords),
      ats_fixes: toStringArray(result?.ats_fixes),
      interview_focus: toStringArray(result?.interview_focus),
    }

    return NextResponse.json(normalized)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Failed to update resume. Please try again.' },
      { status: 500 }
    )
  }
}


