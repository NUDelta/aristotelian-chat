import type { VercelRequest, VercelResponse } from '@vercel/node'
import OpenAI from 'openai'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return res.status(500).json({
      error: 'Server configuration error',
      message: 'OPENAI_API_KEY is not configured',
    })
  }

  // Check if request has audio data
  const audioData = req.body
  if (!audioData || typeof audioData !== 'string') {
    return res.status(400).json({ error: 'Audio data is required' })
  }

  try {
    const openai = new OpenAI({ apiKey })

    // Convert base64 audio to buffer
    const audioBuffer = Buffer.from(audioData, 'base64')

    // Create a File object for OpenAI SDK
    // In Node.js 18+, File is available globally
    const file = new File([audioBuffer], 'audio.webm', { type: 'audio/webm' })

    // Call OpenAI Whisper API
    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
      language: 'en',
    })

    return res.status(200).json({
      text: transcription.text,
    })
  } catch (error) {
    console.error('Error calling OpenAI Whisper API:', error)
    return res.status(500).json({
      error: 'Failed to transcribe audio',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

