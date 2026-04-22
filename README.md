# Rizzume

Your AI job-prep wingman for when your resume currently says "hardworking team player" 11 times and recruiters still leave you on read.

Rizzume helps you go from:
- "I attended meetings"
to
- "I shipped features, improved conversion 18%, and can explain tradeoffs without panicking."

## What This App Does

1. Resume Updater
- Rewrites your resume bullets against a target job description.
- Adds hireability insights, missing keywords, ATS fixes, and interview prep focus areas.

2. Job Hunt (Internship-focused)
- Extracts your likely target role from resume text.
- Pulls listings from Adzuna and JSearch.
- Uses AI scoring to rank jobs by resume fit.

3. Learning Roadmap
- Shows skill gaps as Learn First, Learn Next, and Nice to Have.

4. Resume Roast
- Adjustable intensity. Low = coach mode. High = emotional damage with useful fixes.

5. Interview Simulator
- Asks role-specific questions from your JD.
- Scores answers and adapts difficulty.

6. Think Lab (Adaptive Learning Engine)
- Generates personalized quizzes.
- Evaluates each answer instantly.
- Recommends next difficulty based on performance.
- Tracks rounds, streaks, and accuracy on a local dashboard.

## How It Works (Under The Hood)

1. Frontend
- Single-page multi-section UI built with Next.js App Router + React hooks.
- Sidebar switches between feature panels.

2. API Layer
- All AI work happens on server routes under app/api.
- Resume/JD text is sent to route handlers, prompt-engineered, and parsed into structured JSON.

3. AI Provider
- Groq Chat Completions powers:
	- resume rewrite
	- roadmap generation
	- roast analysis
	- interview feedback + next questions
	- job profile extraction + job scoring
	- Think Lab quiz generation

4. Job Data Sources
- Adzuna API for job listings.
- JSearch (RapidAPI) as a second source.

5. Persistence
- No backend database by default.
- Think Lab stats are saved in browser localStorage.

## Tech Stack

- Next.js 14 (App Router)
- React 18
- TypeScript (strict)
- CSS (custom, no heavy UI framework)
- Groq API (model in code: llama-3.3-70b-versatile)
- Adzuna Jobs API
- JSearch via RapidAPI
- pdf-parse for resume PDF text extraction

## Prerequisites

- Node.js 18+ (Node 20 LTS recommended)
- npm 9+
- API keys (details below)

## Local Setup

1. Install dependencies

PowerShell:

		npm install

2. Create local env file

PowerShell:

		Copy-Item .env.example .env.local

macOS/Linux:

		cp .env.example .env.local

3. Fill .env.local with your keys

At minimum, set GROQ_API_KEY.
For Job Hunt, also add Adzuna and/or JSearch credentials.

4. Start dev server

		npm run dev

5. Open app

http://localhost:3000

## Environment Variables

See .env.example for the exact template.

Required for core AI features:
- GROQ_API_KEY

Used for job listings:
- ADZUNA_API_ID
- ADZUNA_API_KEY
- JSEARCH_RAPIDAPI_KEY (or RAPIDAPI_KEY as fallback)
- JSEARCH_RAPIDAPI_HOST (optional, default: jsearch.p.rapidapi.com)

## API Keys: Where To Get Them

1. Groq
- Go to https://console.groq.com
- Create an account/login.
- Open API Keys and create a new key.
- Put it in .env.local as GROQ_API_KEY.

2. Adzuna
- Go to https://developer.adzuna.com
- Create an application.
- Copy app_id and app_key.
- Put them in .env.local as ADZUNA_API_ID and ADZUNA_API_KEY.

3. JSearch (RapidAPI)
- Go to https://rapidapi.com and subscribe to JSearch API.
- Copy your RapidAPI key.
- Set JSEARCH_RAPIDAPI_KEY in .env.local.
- Keep host as default unless provider changes it.

## Run Scripts

- npm run dev
	Starts local development server.

- npm run build
	Production build + type checks.

- npm run start
	Runs built app.

- npm run lint
	Lint command exists, but this project may prompt for initial ESLint setup depending on local environment and dependency versions.

## API Routes

- POST /api/update-resume
	Resume rewrite + hireability analysis + ATS improvements.

- POST /api/job-hunt
	Profile extraction, external listing fetch, and AI ranking.

- POST /api/roadmap
	Skill-gap roadmap generation.

- POST /api/roast
	Intensity-based resume critique with fixes.

- POST /api/interview
	Interview session start/answer loop with adaptive difficulty.

- POST /api/think
	Adaptive quiz generation for Think Lab.

- POST /api/parse-pdf
	PDF-to-text extraction for resume upload.

## Project Structure (Important Bits)

.
|- app/
|  |- api/
|  |  |- interview/
|  |  |- job-hunt/
|  |  |- parse-pdf/
|  |  |- roadmap/
|  |  |- roast/
|  |  |- think/
|  |  |- update-resume/
|  |- globals.css
|  |- layout.tsx
|  |- page.tsx
|- components/
|  |- LayoutClient.tsx
|  |- pages/
|- lib/
|  |- groq.ts
|- .env.example
|- package.json

## Troubleshooting

1. Error: GROQ_API_KEY is not set
- Add GROQ_API_KEY to .env.local.
- Restart dev server.

2. Job Hunt returns empty results
- Ensure at least one job source is configured:
	- Adzuna creds, and/or
	- JSearch RapidAPI key
- Try location values like Bengaluru, Hyderabad, Pune, Chennai, Mumbai, Delhi NCR.

3. PDF parsing fails
- Ensure uploaded file is a valid text-based PDF (not an image-only scan).

4. Lint setup conflict
- If npm run lint prompts and fails due dependency mismatch, keep shipping with npm run build first, then standardize ESLint versions in package.json before re-enabling lint in CI.

## Security Notes

- Never commit .env.local.
- Keep API keys server-side only.
- Rotate keys if you accidentally leak them.

## Final Word

This app will not magically get you hired while you sleep.
It will absolutely reduce resume fluff, expose skill gaps, force better prep, and make you less likely to freeze in interviews.

So yes, still do the work.
Just do it with better tooling and more rizz.

