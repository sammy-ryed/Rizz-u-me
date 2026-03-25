import { NextRequest, NextResponse } from 'next/server'
import { callGroq } from '@/lib/groq'

interface AdzunaJob {
  id: string
  title: string
  company: string | { display_name?: string }
  location: string | { display_name?: string }
  latitude: number
  longitude: number
  description: string
  salary_min?: number
  salary_max?: number
  salary_currency?: string
  contract_time?: string
  URL?: string
  redirect_url?: string
  created: string
}

function asDisplayString(value: unknown, fallback: string): string {
  if (typeof value === 'string' && value.trim()) return value
  if (value && typeof value === 'object' && 'display_name' in (value as Record<string, unknown>)) {
    const displayName = (value as { display_name?: unknown }).display_name
    if (typeof displayName === 'string' && displayName.trim()) return displayName
  }
  return fallback
}

interface ScoredJob {
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

async function extractJobProfile(resume: string): Promise<{
  jobTitle: string
  skills: string[]
  experienceLevel: string
  desiredLocations: string[]
}> {
  const prompt = `Analyze this resume and extract:
1. The primary job title/role the person should target
2. All key technical and soft skills
3. Experience level (entry, mid, senior)
4. Preferred locations (if any mentioned)

Resume:
${JSON.stringify(resume)}

Return ONLY valid JSON (no markdown, no explanation):
{
  "jobTitle": "string",
  "skills": ["skill1", "skill2"],
  "experienceLevel": "entry|mid|senior",
  "desiredLocations": ["location1", "location2"]
}`

  const system =
    'You are a resume analyst. Extract job profile information. Return ONLY valid JSON with double quotes for all keys and strings.'

  try {
    const response = await callGroq(prompt, system)
    let result = JSON.parse(response)
    return result
  } catch (parseError) {
    const response = await callGroq(prompt, system)
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON found in response')
    const cleaned = jsonMatch[0]
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '')
    const result = JSON.parse(cleaned)
    return result
  }
}

async function searchAdzunaJobs(
  jobTitle: string,
  location: string = 'Bengaluru',
  country: string = 'in'
): Promise<AdzunaJob[]> {
  const apiId = process.env.ADZUNA_API_ID
  const apiKey = process.env.ADZUNA_API_KEY

  if (!apiId || !apiKey) {
    throw new Error('Adzuna API credentials not configured')
  }

  try {
    // Adzuna API endpoint (default country: India)
    const safeCountry = (country || 'in').toLowerCase()
    const url = new URL(`https://api.adzuna.com/v1/api/jobs/${safeCountry}/search/1`)
    url.searchParams.set('app_id', apiId)
    url.searchParams.set('app_key', apiKey)
    url.searchParams.set('results_per_page', '10')
    url.searchParams.set('what', jobTitle)
    url.searchParams.set('where', location)
    url.searchParams.set('full_time', '1')

    const response = await fetch(url.toString())
    if (!response.ok) {
      throw new Error(`Adzuna API error: ${response.status}`)
    }

    const data = await response.json()
    return data.results || []
  } catch (error) {
    console.error('Adzuna search error:', error)
    // Return empty array on error to prevent blocking
    return []
  }
}

async function scoreJobs(
  jobs: AdzunaJob[],
  resume: string,
  resumeSkills: string[]
): Promise<ScoredJob[]> {
  if (jobs.length === 0) return []

  const jobSummaries = jobs
    .map(
      (job) =>
        `Title: ${job.title}\nCompany: ${asDisplayString(job.company, 'Unknown company')}\nDescription: ${job.description.substring(0, 500)}...`
    )
    .join('\n\n---\n\n')

  const prompt = `Score these jobs against this resume and the candidate's skills.

Resume Skills: ${JSON.stringify(resumeSkills)}

Resume Summary:
${JSON.stringify(resume.substring(0, 2000))}

Jobs to Score:
${JSON.stringify(jobSummaries)}

For each job, provide:
1. Match score (0-100)
2. Which resume skills are matched
3. What key skills are missing
4. Brief reasoning

Return ONLY valid JSON (no markdown):
{
  "jobScores": [
    {
      "jobTitle": "string",
      "matchScore": number,
      "matchedSkills": ["skill1"],
      "missingSkills": ["skill1"],
      "reasoning": "string"
    }
  ]
}`

  const system =
    'You are a job matching expert. Score jobs based on resume fit. Return ONLY valid JSON with proper escaping.'

  try {
    const response = await callGroq(prompt, system)
    const parsed = JSON.parse(response)
    return parsed.jobScores || []
  } catch (parseError) {
    const response = await callGroq(prompt, system)
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return []
    const cleaned = jsonMatch[0]
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '')
    try {
      const parsed = JSON.parse(cleaned)
      return parsed.jobScores || []
    } catch {
      return []
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { resume, location = 'Bengaluru', country = 'in' } = body

    if (!resume || resume.trim().length === 0) {
      return NextResponse.json({ error: 'Resume is required' }, { status: 400 })
    }

    // Step 1: Extract job profile from resume
    const jobProfile = await extractJobProfile(resume)

    // Step 2: Search Adzuna for jobs
    const adzunaJobs = await searchAdzunaJobs(jobProfile.jobTitle, location, country)

    if (adzunaJobs.length === 0) {
      return NextResponse.json({
        results: [],
        message: 'No jobs found matching your profile',
      })
    }

    // Step 3: Score jobs against resume
    const jobScores = await scoreJobs(adzunaJobs, resume, jobProfile.skills)

    // Step 4: Combine and rank results
    const scoredJobs: ScoredJob[] = adzunaJobs
      .map((job, index) => {
        const score = jobScores[index] || {
          matchScore: 50,
          matchedSkills: [],
          missingSkills: [],
          reasoning: 'Job scored automatically',
        }

        return {
          id: job.id,
          title: job.title,
          company: asDisplayString(job.company, 'Unknown company'),
          location: asDisplayString(job.location, 'Unknown location'),
          description: job.description.substring(0, 300),
          salaryMin: job.salary_min,
          salaryMax: job.salary_max,
          salaryCurrency: job.salary_currency,
          contractType: job.contract_time,
          url: job.redirect_url || job.URL || '#',
          matchScore: score.matchScore,
          matchedSkills: score.matchedSkills || [],
          missingSkills: score.missingSkills || [],
          reasoning: score.reasoning || '',
        }
      })
      .sort((a, b) => b.matchScore - a.matchScore)

    return NextResponse.json({
      results: scoredJobs,
      jobProfile,
      totalJobs: scoredJobs.length,
    })
  } catch (error: any) {
    console.error('Job Hunt error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch jobs' },
      { status: 500 }
    )
  }
}
