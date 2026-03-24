import { NextRequest, NextResponse } from 'next/server'
import { callGroq } from '@/lib/groq'

export async function POST(req: NextRequest) {
  try {
    const { resume, intensity } = await req.json()

    if (!resume) {
      return NextResponse.json(
        { error: 'Resume is required' },
        { status: 400 }
      )
    }

    const intensityLevel =
      intensity < 4 ? 'gentle' : intensity < 7 ? 'honest' : 'ruthless'

    const prompt = `You are a MERCILESSLY HARSH resume critic. Be savage, brutally honest, and don't hold back. Tear this resume apart. Criticisms should be CUTTING, SPECIFIC, and make the person feel their mistakes.

Return ONLY valid JSON. No markdown, no explanation, no extra text.

CRITICAL FORMATTING REQUIREMENTS:
- Use double quotes for ALL keys and string values
- Escape all newlines as \\n (backslash followed by 'n')
- Do NOT add trailing commas
- Do NOT include any text before or after the JSON object

Resume:
${JSON.stringify(resume)}

Give ${Math.max(3, Math.ceil(intensity / 2))} BRUTAL criticisms, ${Math.max(3, Math.ceil(intensity / 2))} deep fixes, and ${Math.max(1, Math.ceil(intensity / 5))} grudging positives.

Return a JSON object with this exact structure:
{
  "score": ${intensity},
  "roast": ["criticism 1", ...],
  "fixes": ["concrete fix 1", ...],
  "positives": ["good thing 1", ...]
}`

    const response = await callGroq(
      prompt,
      `You are a brutally honest but fair resume critic. Intensity: ${intensityLevel}. Return ONLY valid JSON.`
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
      { error: 'Failed to roast resume' },
      { status: 500 }
    )
  }
}
