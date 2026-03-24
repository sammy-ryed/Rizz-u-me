import { NextRequest, NextResponse } from 'next/server'
import { callGroq } from '@/lib/groq'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export async function POST(req: NextRequest) {
  try {
    const { messages, action, resume, jobDescription } = await req.json()
    const jdText = typeof jobDescription === 'string' ? jobDescription.trim() : ''

    if (!jdText) {
      return NextResponse.json(
        { error: 'Job description is required to run an interview simulation.' },
        { status: 400 }
      )
    }

    const candidateContext = [
      resume ? `Candidate Resume:\n${JSON.stringify(resume)}` : '',
      `Target Job Description:\n${JSON.stringify(jdText)}`,
    ]
      .filter(Boolean)
      .join('\n\n')

    if (action === 'start') {
      // Start a new interview
      const prompt = `You are a technical interviewer.
    Create the first interview question strictly based on the provided Target Job Description.

${candidateContext ? `${candidateContext}\n\n` : ''}

    RULES:
    - Question must test a skill/responsibility explicitly present in the JD.
    - Prefer role-specific and stack-specific wording from the JD.
    - Ask one question only.
    - Keep it concise and professional.

    Only provide the question, nothing else.`

      const response = await callGroq(
        prompt,
        'You are an experienced technical interviewer. Ask one clear, engaging interview question at a time. Evaluate answers fairly.'
      )

      return NextResponse.json({
        question: response,
        score: 5,
        difficulty: 'medium',
      })
    } else if (action === 'answer') {
      // Process answer and generate feedback + next question
      if (!messages || messages.length < 2) {
        return NextResponse.json(
          { error: 'Invalid message history' },
          { status: 400 }
        )
      }

      const conversationHistory = messages
        .map(
          (m: Message) =>
            `${m.role === 'user' ? 'Candidate' : 'Interviewer'}: ${m.content}`
        )
        .join('\n\n')

      const prompt = `You are a technical interviewer conducting a mock interview. Here's the conversation so far:

${conversationHistory}

    ${candidateContext ? `\n${candidateContext}\n` : ''}

Provide feedback on the candidate's last answer (what was good, what was missing, ideal answer in 2-3 sentences). Then ask the next question.

    IMPORTANT:
    - The next question MUST be based on the Target Job Description.
    - Rotate through key JD requirements (skills, responsibilities, tools, domain).
    - Do not ask generic questions that are not tied to the JD.

Adapt difficulty: if the answer was strong (8+/10), ask something harder. If weak (below 6/10), ask something easier at the same level.

Format your response EXACTLY like this (use these exact delimiters):
FEEDBACK: [Your feedback here]
NEXT_QUESTION: [Your next question]
SCORE: [single digit 1-10]
DIFFICULTY: [easy|medium|hard]

Do NOT include any other text. Only these four delimiters.`

      const response = await callGroq(
        prompt,
        'You are a fair technical interviewer. Respond with ONLY the exact format: FEEDBACK: ... NEXT_QUESTION: ... SCORE: ... DIFFICULTY: ...'
      )

      // Parse the response
      const feedbackMatch = response.match(/FEEDBACK:\s*([\s\S]*?)(?=NEXT_QUESTION:)/)
      const questionMatch = response.match(/NEXT_QUESTION:\s*([\s\S]*?)(?=SCORE:)/)
      const scoreMatch = response.match(/SCORE:\s*(\d+)/)
      const difficultyMatch = response.match(/DIFFICULTY:\s*(easy|medium|hard)/)

      const feedback = feedbackMatch ? feedbackMatch[1].trim() : 'Good answer.'
      const nextQuestion = questionMatch ? questionMatch[1].trim() : 'Continue with your journey.'
      const score = scoreMatch ? parseInt(scoreMatch[1]) : 5
      const difficulty = (difficultyMatch ? difficultyMatch[1] : 'medium') as
        | 'easy'
        | 'medium'
        | 'hard'

      return NextResponse.json({
        feedback,
        question: nextQuestion,
        score,
        difficulty,
      })
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Failed to process interview' },
      { status: 500 }
    )
  }
}
