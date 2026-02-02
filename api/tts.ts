import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { text } = req.body

  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'Text is required' })
  }

  const apiKey = process.env.ELEVEN_LABS_API_KEY
  if (!apiKey) {
    return res.status(500).json({
      error: 'Server configuration error',
      message: 'ELEVEN_LABS_API_KEY is not configured',
    })
  }

  // Default voice ID (Rachel) - can be overridden with env var
  const voiceId = process.env.ELEVEN_LABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM'
  // Use newer model available on free tier (eleven_monolingual_v1 is deprecated)
  const modelId = process.env.ELEVEN_LABS_MODEL_ID || 'eleven_turbo_v2_5' // Fast, available on free tier

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify({
          text: text.trim(),
          model_id: modelId,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    )

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: { message: 'Unknown error' } }))
      console.error('Eleven Labs API error:', error)
      return res.status(response.status).json({
        error: 'Failed to generate speech',
        message: error.detail?.message || 'Unknown error',
      })
    }

    const audioBuffer = await response.arrayBuffer()
    
    res.setHeader('Content-Type', 'audio/mpeg')
    res.setHeader('Content-Length', audioBuffer.byteLength.toString())
    res.send(Buffer.from(audioBuffer))
  } catch (error) {
    console.error('Error calling Eleven Labs API:', error)
    return res.status(500).json({
      error: 'Failed to generate speech',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}



