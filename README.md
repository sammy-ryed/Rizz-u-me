# Rizzume

Your AI job prep sidekick for when your resume says "hard worker" 14 times and still gets ghosted.

Rizzume helps you:
- rewrite resume bullets to match a job description
- get a skill roadmap for what to learn next
- get roasted with fixes that actually help
- practice interviews without calling your friends at 11 PM

## Features

### 1. Resume Updater
Paste your resume and target JD. Rizzume rewrites bullets so they sound like you have done things, not just attended things.

### 2. Learning Roadmap
Compares your resume to the JD and gives you:
- Learn First
- Learn Next
- Nice to Have

### 3. Resume Roast
Choose an intensity level and get blunt feedback. It hurts a little, but in a productive way.

### 4. Interview Simulator
Mock interview with adaptive difficulty. You answer, AI scores, gives feedback, and throws the next question.

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- React hooks
- Custom CSS UI
- Groq API (`llama-3.3-70b-versatile`)

## Quick Start

1. Clone the repo
```bash
git clone <repo-url>
cd rizzume
```

2. Install dependencies
```bash
npm install
```

3. Create env file
```bash
cp .env.local.example .env.local
```

4. Add your API key in `.env.local`
```env
GROQ_API_KEY=your_groq_api_key_here
```

5. Run the app
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## API Routes

- `POST /api/update-resume` : rewrites resume bullets for JD alignment
- `POST /api/roadmap` : generates learning priorities
- `POST /api/roast` : resume roast plus fixes
- `POST /api/interview` : interactive mock interview flow
- `POST /api/parse-pdf` : extracts PDF text

## Project Structure

```text
.
├── app/
│   ├── api/
│   │   ├── update-resume/
│   │   ├── roadmap/
│   │   ├── roast/
│   │   ├── interview/
│   │   └── parse-pdf/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── LayoutClient.tsx
│   └── pages/
│       ├── ResumeUpdater.tsx
│       ├── Roadmap.tsx
│       ├── ResumeRoast.tsx
│       └── InterviewSimulator.tsx
├── lib/
│   └── groq.ts
├── public/
└── package.json
```

## Notes

- All AI calls run server side
- No database by default, each session is fresh
- Roast mode is honest and can be aggressive if you set high intensity

## Development

- update prompts in `app/api/*/route.ts`
- tweak UI in `app/globals.css` and `components/pages/*`
- run a production check with:

```bash
npm run build
```

## License

MIT
