import { NextRequest, NextResponse } from 'next/server'
import { callGroq } from '@/lib/groq'

type JobSource = 'adzuna' | 'jsearch'

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

interface JSearchJob {
  job_id?: string
  job_title?: string
  employer_name?: string
  job_city?: string
  job_state?: string
  job_country?: string
  job_description?: string
  job_apply_link?: string
  job_google_link?: string
  job_min_salary?: number
  job_max_salary?: number
  job_salary_currency?: string
  job_employment_type?: string
}

interface NormalizedJob {
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
  source: JobSource
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
  source: JobSource
}

interface JobScore {
  matchScore: number
  matchedSkills: string[]
  missingSkills: string[]
  reasoning: string
}

function parsePossiblyWrappedJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON object found in model response')
    }
    return JSON.parse(jsonMatch[0])
  }
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((v): v is string => typeof v === 'string')
    .map((v) => v.trim())
    .filter(Boolean)
}

async function callGroqJson(prompt: string, system: string): Promise<unknown> {
  const response = await callGroq(prompt, system)
  return parsePossiblyWrappedJson(response)
}

async function extractJobProfile(resume: string): Promise<{
  jobTitle: string
  skills: string[]
  experienceLevel: string
  desiredLocations: string[]
}> {
  const prompt = `Analyze this resume and extract:
1. The primary internship role/title the person should target
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
    'You are a resume analyst. The user prefers internships, so infer internship-friendly target roles. Return ONLY valid JSON with double quotes for all keys and strings.'

  const parsed = await callGroqJson(prompt, system)
  const obj = (parsed && typeof parsed === 'object' ? parsed : {}) as Record<string, unknown>

  const normalizedLevel =
    typeof obj.experienceLevel === 'string' && obj.experienceLevel.trim()
      ? obj.experienceLevel.trim().toLowerCase()
      : 'entry'

  return {
    jobTitle:
      typeof obj.jobTitle === 'string' && obj.jobTitle.trim()
        ? obj.jobTitle.trim()
        : 'Software Engineering Intern',
    skills: toStringArray(obj.skills),
    experienceLevel: normalizedLevel,
    desiredLocations: toStringArray(obj.desiredLocations),
  }
}

async function searchAdzunaJobs(
  jobTitle: string,
  location: string = 'Bengaluru',
  country: string = 'in',
  limit: number = 6
): Promise<NormalizedJob[]> {
  const apiId = process.env.ADZUNA_API_ID
  const apiKey = process.env.ADZUNA_API_KEY

  if (!apiId || !apiKey) {
    throw new Error('Adzuna API credentials not configured')
  }

  try {
    // Adzuna API endpoint (default country: India)
    const safeCountry = (country || 'in').toLowerCase()
    const url = new URL(`https://api.adzuna.com/v1/api/jobs/${safeCountry}/search/1`)
    const internshipQuery = /\b(intern|internship|trainee|graduate)\b/i.test(jobTitle)
      ? jobTitle
      : `${jobTitle} internship OR intern OR trainee OR graduate`

    url.searchParams.set('app_id', apiId)
    url.searchParams.set('app_key', apiKey)
    url.searchParams.set('results_per_page', String(limit))
    url.searchParams.set('what', internshipQuery)
    url.searchParams.set('where', location)
    url.searchParams.set('sort_by', 'date')

    const response = await fetch(url.toString())
    if (!response.ok) {
      throw new Error(`Adzuna API error: ${response.status}`)
    }

    const data = await response.json()
    const results: AdzunaJob[] = Array.isArray(data.results) ? data.results : []

    return results.slice(0, limit).map((job) => ({
      id: String(job.id || `${job.title}-${Date.now()}`),
      title: job.title || 'Untitled internship',
      company: asDisplayString(job.company, 'Unknown company'),
      location: asDisplayString(job.location, 'Unknown location'),
      description: (job.description || '').substring(0, 500),
      salaryMin: job.salary_min,
      salaryMax: job.salary_max,
      salaryCurrency: job.salary_currency,
      contractType: job.contract_time,
      url: job.redirect_url || job.URL || '#',
      source: 'adzuna',
    }))
  } catch (error) {
    console.error('Adzuna search error:', error)
    // Return empty array on error so other sources can still be shown.
    return []
  }
}

async function searchJSearchJobs(
  jobTitle: string,
  location: string = 'Bengaluru',
  country: string = 'India',
  limit: number = 4
): Promise<NormalizedJob[]> {
  const rapidApiKey = process.env.JSEARCH_RAPIDAPI_KEY || process.env.RAPIDAPI_KEY
  const rapidApiHost = process.env.JSEARCH_RAPIDAPI_HOST || 'jsearch.p.rapidapi.com'

  if (!rapidApiKey) {
    console.warn('JSearch RapidAPI key missing. Skipping JSearch source.')
    return []
  }

  try {
    const internshipQuery = /\b(intern|internship|trainee|graduate)\b/i.test(jobTitle)
      ? jobTitle
      : `${jobTitle} internship`

    const url = new URL(`https://${rapidApiHost}/search`)
    url.searchParams.set('query', `${internshipQuery} in ${location}, ${country}`)
    url.searchParams.set('page', '1')
    url.searchParams.set('num_pages', '1')

    const response = await fetch(url.toString(), {
      headers: {
        'X-RapidAPI-Key': rapidApiKey,
        'X-RapidAPI-Host': rapidApiHost,
      },
    })

    if (!response.ok) {
      throw new Error(`JSearch API error: ${response.status}`)
    }

    const data = await response.json()
    const rows: JSearchJob[] = Array.isArray(data?.data) ? data.data : []

    return rows.slice(0, limit).map((job, index) => ({
      id: String(job.job_id || `jsearch-${index}-${Date.now()}`),
      title: job.job_title || 'Untitled internship',
      company: job.employer_name || 'Unknown company',
      location:
        [job.job_city, job.job_state, job.job_country].filter(Boolean).join(', ') ||
        location,
      description: (job.job_description || '').substring(0, 500),
      salaryMin:
        typeof job.job_min_salary === 'number' ? job.job_min_salary : undefined,
      salaryMax:
        typeof job.job_max_salary === 'number' ? job.job_max_salary : undefined,
      salaryCurrency: job.job_salary_currency,
      contractType: job.job_employment_type,
      url: job.job_apply_link || job.job_google_link || '#',
      source: 'jsearch',
    }))
  } catch (error) {
    console.error('JSearch search error:', error)
    return []
  }
}

async function scoreJobs(
  jobs: NormalizedJob[],
  resume: string,
  resumeSkills: string[]
): Promise<JobScore[]> {
  if (jobs.length === 0) return []

  const jobSummaries = jobs
    .map(
      (job) =>
        `Source: ${job.source}\nTitle: ${job.title}\nCompany: ${job.company}\nLocation: ${job.location}\nDescription: ${job.description.substring(0, 500)}...`
    )
    .join('\n\n---\n\n')

  const prompt = `Score these jobs against this resume and the candidate's skills.
The candidate prefers internships over full-time roles.

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
    'You are a job matching expert. Prioritize internship relevance while scoring resume fit. Return ONLY valid JSON with proper escaping.'

  try {
    const parsed = await callGroqJson(prompt, system)
    const obj = (parsed && typeof parsed === 'object' ? parsed : {}) as Record<string, unknown>
    const rawScores = Array.isArray(obj.jobScores) ? obj.jobScores : []

    return rawScores.map((row): JobScore => {
      const item = (row && typeof row === 'object' ? row : {}) as Record<string, unknown>
      const rawScore = typeof item.matchScore === 'number' ? item.matchScore : 50
      return {
        matchScore: Math.max(0, Math.min(100, Math.round(rawScore))),
        matchedSkills: toStringArray(item.matchedSkills),
        missingSkills: toStringArray(item.missingSkills),
        reasoning:
          typeof item.reasoning === 'string' && item.reasoning.trim()
            ? item.reasoning.trim()
            : 'Auto-scored based on resume fit.',
      }
    })
  } catch {
    return []
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

    // Step 2: Search both sources (target mix: 4 from JSearch + 6 from Adzuna)
    const [jsearchJobs, adzunaJobs] = await Promise.all([
      searchJSearchJobs(jobProfile.jobTitle, location, country === 'in' ? 'India' : country, 4),
      searchAdzunaJobs(jobProfile.jobTitle, location, country, 6),
    ])

    const combinedJobs: NormalizedJob[] = [
      ...jsearchJobs.slice(0, 4),
      ...adzunaJobs.slice(0, 6),
    ].slice(0, 10)

    if (combinedJobs.length === 0) {
      return NextResponse.json({
        results: [],
        message: 'No internships found matching your profile',
      })
    }

    // Step 3: Score internships against resume
    const jobScores = await scoreJobs(combinedJobs, resume, jobProfile.skills)

    // Step 4: Combine and rank results
    const scoredJobs: ScoredJob[] = combinedJobs
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
          company: job.company,
          location: job.location,
          description: job.description.substring(0, 300),
          salaryMin: job.salaryMin,
          salaryMax: job.salaryMax,
          salaryCurrency: job.salaryCurrency,
          contractType: job.contractType,
          url: job.url,
          matchScore: score.matchScore,
          matchedSkills: score.matchedSkills || [],
          missingSkills: score.missingSkills || [],
          reasoning: score.reasoning || '',
          source: job.source,
        }
      })
      .sort((a, b) => b.matchScore - a.matchScore)

    return NextResponse.json({
      results: scoredJobs,
      jobProfile,
      totalJobs: scoredJobs.length,
      sourceBreakdown: {
        jsearch: jsearchJobs.slice(0, 4).length,
        adzuna: adzunaJobs.slice(0, 6).length,
      },
    })
  } catch (error: any) {
    console.error('Job Hunt error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch jobs' },
      { status: 500 }
    )
  }
}
