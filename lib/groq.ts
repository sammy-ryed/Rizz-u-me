'use server'

export async function callGroq(prompt: string, system: string = 'You are a helpful assistant.') {
  try {
    const apiKey = process.env.GROQ_API_KEY
    
    if (!apiKey) {
      throw new Error('GROQ_API_KEY is not set')
    }

    // Use REST API directly instead of SDK
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: system,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 2048,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(
        `Groq API error: ${response.status} - ${JSON.stringify(errorData)}`
      )
    }

    const data = await response.json()
    return data.choices[0]?.message?.content || ''
  } catch (error: any) {
    console.error('[Groq] Error:', error)
    throw new Error(`Groq API failed: ${error?.message || 'Unknown error'}`)
  }
}

export async function callGroqStream(
  prompt: string,
  system: string = 'You are a helpful assistant.'
) {
  const apiKey = process.env.GROQ_API_KEY
  
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not set')
  }

  return fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'Accept': 'text/event-stream',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: system,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 2048,
      stream: true,
    }),
  })
}


