import { NextRequest, NextResponse } from 'next/server'
import { callGroq } from '@/lib/groq'

export async function POST(req: NextRequest) {
  try {
    const { resume, jobDescription } = await req.json()

    if (!resume || !jobDescription) {
      return NextResponse.json(
        { error: 'Resume and job description are required' },
        { status: 400 }
      )
    }

    const prompt = `You are a career coach. Analyze the resume and job description to identify skill gaps and create a prioritized learning roadmap.

Return ONLY valid JSON. No markdown, no explanation, no extra text.

CRITICAL FORMATTING REQUIREMENTS:
- Use double quotes for ALL keys and string values
- Escape all newlines as \\n (backslash followed by 'n')
- Do NOT add trailing commas
- Do NOT include any text before or after the JSON object

Resume:
${JSON.stringify(resume)}

Job Description:
${JSON.stringify(jobDescription)}

Return a JSON object with this exact structure:
{
  "learn_first": [{"skill": "name", "why": "reason"}, ...],
  "learn_next": [{"skill": "name", "why": "reason"}, ...],
  "nice_to_have": [{"skill": "name", "why": "reason"}, ...]
}`

    const response = await callGroq(
      prompt,
      'You are a career coach. Return ONLY valid JSON.'
    )

    let result

    try {
      result = JSON.parse(response)
    } catch (parseError) {
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No valid JSON found in response')
      }

      const jsonString = jsonMatch[0]
        .replace(/\\n/g, '\\n')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '')

      result = JSON.parse(jsonString)
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Failed to generate roadmap' },
      { status: 500 }
    )
  }
}
