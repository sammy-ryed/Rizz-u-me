import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Read file as buffer
    const buffer = await file.arrayBuffer()

    // Dynamically import pdf-parse (requires Node.js environment)
    const pdfParse = require('pdf-parse')

    // Extract text from PDF
    const data = await pdfParse(Buffer.from(buffer))
    let text = data.text

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'No text found in PDF. Please try a different file.' },
        { status: 400 }
      )
    }

    // Clean the text: normalize newlines and remove problematic control characters
    text = text
      .replace(/\r\n/g, '\n') // normalize line endings
      .replace(/\r/g, '\n')   // normalize carriage returns
      .split('\n')             // split by newlines
      .map((line: string) => line.trim()) // trim each line
      .filter((line: string) => line.length > 0) // remove empty lines
      .join('\n') // rejoin with single newlines

    return NextResponse.json({ text })
  } catch (error) {
    console.error('PDF parse error:', error)
    return NextResponse.json(
      { error: 'Failed to parse PDF. Please ensure it\'s a valid PDF file or paste text instead.' },
      { status: 500 }
    )
  }
}



