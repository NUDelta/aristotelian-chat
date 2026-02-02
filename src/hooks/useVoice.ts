import { useState, useRef, useCallback, useEffect } from 'react'

type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking'

export function useVoice() {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle')
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Start recording audio
  const startListening = useCallback(async () => {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      })
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      // Collect audio chunks
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event)
        setVoiceState('idle')
      }

      // Start recording
      mediaRecorder.start(100) // Collect data every 100ms
      setVoiceState('listening')
    } catch (error) {
      console.error('Error starting audio recording:', error)
      alert('Failed to access microphone. Please check your permissions.')
      setVoiceState('idle')
    }
  }, [])

  // Stop recording and transcribe with Whisper
  const stopListening = useCallback(async (): Promise<string> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || voiceState !== 'listening') {
        resolve('')
        return
      }

      const mediaRecorder = mediaRecorderRef.current

      mediaRecorder.onstop = async () => {
        try {
          setVoiceState('processing')

          // Create audio blob from chunks
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })

          // Convert to base64
          const reader = new FileReader()
          reader.onloadend = async () => {
            try {
              const base64Audio = (reader.result as string).split(',')[1] // Remove data URL prefix

              // Send to Whisper API
              const response = await fetch('/api/whisper', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(base64Audio),
              })

              if (!response.ok) {
                throw new Error('Failed to transcribe audio')
              }

              const data = await response.json()
              const transcript = data.text || ''

              setVoiceState('idle')
              resolve(transcript)
            } catch (error) {
              console.error('Error transcribing audio:', error)
              setVoiceState('idle')
              resolve('')
            }
          }

          reader.onerror = () => {
            console.error('Error reading audio file')
            setVoiceState('idle')
            resolve('')
          }

          reader.readAsDataURL(audioBlob)
        } catch (error) {
          console.error('Error processing audio:', error)
          setVoiceState('idle')
          resolve('')
        } finally {
          // Clean up
          if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop())
            streamRef.current = null
          }
          audioChunksRef.current = []
        }
      }

      // Stop recording
      if (mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop()
      }
    })
  }, [voiceState])

  // Speak text using Eleven Labs
  const speakText = useCallback(async (text: string, onComplete?: () => void) => {
    if (!text.trim()) return

    try {
      setVoiceState('speaking')

      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate speech')
      }

      const audioBlob = await response.blob()
      const audioUrl = URL.createObjectURL(audioBlob)

      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }

      const audio = new Audio(audioUrl)
      audioRef.current = audio

      audio.onended = () => {
        setVoiceState('idle')
        URL.revokeObjectURL(audioUrl)
        if (onComplete) {
          onComplete()
        }
      }

      audio.onerror = () => {
        setVoiceState('idle')
        URL.revokeObjectURL(audioUrl)
        console.error('Error playing audio')
      }

      await audio.play()
    } catch (error) {
      console.error('Error speaking text:', error)
      setVoiceState('idle')
    }
  }, [])

  // Cleanup
  const cleanup = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    audioChunksRef.current = []
    setVoiceState('idle')
  }, [])

  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [cleanup])

  return {
    voiceState,
    startListening,
    stopListening,
    speakText,
    cleanup,
  }
}
