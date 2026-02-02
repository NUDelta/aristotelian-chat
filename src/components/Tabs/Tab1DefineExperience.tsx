import { useState, useEffect, useRef, useCallback } from 'react'
import { useSession } from '../../context/useSession'
import { ChatMessageList } from '../chat/ChatMessageList'
import { parseModelOutput, extractSummary } from '../../utils/parseModelOutput'
import { createChatMessage } from '../../utils/messageUtils'
import { useAbortController } from '../../hooks/useAbortController'
import { useVoice } from '../../hooks/useVoice'
import { SpeakingIndicator } from '../chat/SpeakingIndicator'

export function Tab1DefineExperience() {
  const {
    experience,
    tab1History,
    setTab1History,
    tab1Summary,
    setTab1Summary,
    isFinishedTab1,
    setIsFinishedTab1,
  } = useSession()

  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [inputMode, setInputMode] = useState<'text' | 'voice'>('text') // Default to text
  const hasInitializedRef = useRef<string>('')
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const { createAbortSignal, isAborted } = useAbortController()

  const {
    voiceState,
    startListening,
    stopListening,
    speakText,
    cleanup,
  } = useVoice()

  const [isRecording, setIsRecording] = useState(false)
  const lastSpokenMessageIdRef = useRef<string | null>(null)

  const sendMessage = async (userMessage: string, forceSummary = false) => {
    if (!experience.trim()) {
      alert('Please enter an experience first')
      return
    }

    // Validate that we have conversation history before forcing summary
    if (forceSummary && tab1History.length === 0) {
      alert('Please have a conversation first before requesting a summary')
      return
    }

    const signal = createAbortSignal()
    setIsLoading(true)

    // Only add user message to history if it's not empty (i.e., not a force summary)
    let updatedHistory = tab1History
    if (userMessage.trim() && !forceSummary) {
      const newUserMessage = createChatMessage('user', userMessage)
      updatedHistory = [...tab1History, newUserMessage]
      setTab1History(updatedHistory)
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'define-experience',
          experience,
          history: updatedHistory,
          forceSummary,
        }),
        signal,
      })

      if (!response.ok) {
        throw new Error('Failed to get response')
      }

      const data = await response.json()

      // Validate response structure
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid response format from server')
      }

      // Ensure we have rawText
      const rawText = data.rawText || data.assistantMessage || ''
      if (!rawText || typeof rawText !== 'string') {
        console.error('No text content in API response:', data)
        throw new Error('Received empty response from API')
      }

      const { parsed, cleanText } = parseModelOutput(rawText)

      // Check for summary first
      const summary = extractSummary(parsed)

      if (forceSummary) {
        // When forcing summary, validate that we got a summary
        if (!summary) {
          console.error('Expected summary but none found in response:', { rawText, parsed })
          // Try to extract any meaningful content as a fallback summary
          const fallbackSummary = (cleanText && cleanText.trim()) || rawText.trim()
          if (fallbackSummary && fallbackSummary.length > 20) {
            // Use the response as summary if it's substantial
            setTab1Summary(fallbackSummary)
            setIsFinishedTab1(true)
          } else {
            throw new Error('Unable to generate summary. Please continue the conversation and try again.')
          }
        } else {
          // When forcing summary, just set the summary without adding to chat history
          setTab1Summary(summary)
          setIsFinishedTab1(true)
        }
      } else {
        // Normal message flow - add to chat history
        // Use cleanText if it has content, otherwise fall back to rawText
        const messageContent = (cleanText && cleanText.trim()) || rawText.trim()

        console.log('Message content:', { rawText, cleanText, messageContent, parsed })

        if (!messageContent) {
          console.error('Message content is empty after parsing:', { rawText, cleanText, parsed })
          throw new Error('Message content is empty')
        }

        const assistantMessage = createChatMessage('assistant', messageContent)
        console.log('Created assistant message:', assistantMessage)

        setTab1History([...updatedHistory, assistantMessage])

        // Check if this message also contains a summary (natural completion)
        if (summary) {
          setTab1Summary(summary)
          setIsFinishedTab1(true)
        }
      }
    } catch (error) {
      // Don't show error for aborted requests
      if (error instanceof Error && error.name === 'AbortError') {
        return
      }
      console.error('Error:', error)
      alert('Failed to send message. Please try again.')
    } finally {
      // Only reset loading if this request wasn't aborted
      if (!isAborted(signal)) {
        setIsLoading(false)
        setInput('')
        // Refocus input after message is sent
        setTimeout(() => {
          inputRef.current?.focus()
        }, 0)
      }
    }
  }

  // Handle manual recording
  const handleRecordToggle = useCallback(async () => {
    if (isRecording) {
      // Stop recording and transcribe with Whisper
      setIsRecording(false)
      const transcript = await stopListening()

      console.log('Stopped recording, transcript:', transcript, 'length:', transcript.length)

      if (transcript.trim() && !isLoading && experience.trim()) {
        console.log('Sending message:', transcript.trim())
        sendMessage(transcript.trim())
      } else {
        console.warn('Not sending message:', {
          transcript: transcript.trim(),
          transcriptLength: transcript.length,
          isLoading,
          hasExperience: !!experience.trim()
        })
      }
    } else {
      // Start recording
      setIsRecording(true)
      await startListening()
    }
  }, [isRecording, startListening, stopListening, isLoading, experience, sendMessage])

  // Auto-speak assistant messages when in voice mode (only once per message)
  useEffect(() => {
    if (inputMode === 'voice' && tab1History.length > 0) {
      const lastMessage = tab1History[tab1History.length - 1]
      // Only speak if:
      // 1. It's an assistant message
      // 2. We haven't already spoken this message
      // 3. We're not currently speaking or listening
      // 4. Not loading
      if (
        lastMessage.role === 'assistant' &&
        lastMessage.id !== lastSpokenMessageIdRef.current &&
        !isLoading &&
        voiceState !== 'speaking' &&
        voiceState !== 'listening'
      ) {
        // Mark this message as spoken
        lastSpokenMessageIdRef.current = lastMessage.id
        // Wait a bit for the message to fully render, then speak
        const timer = setTimeout(() => {
          speakText(lastMessage.content)
        }, 500)
        return () => clearTimeout(timer)
      }
    }
  }, [tab1History, inputMode, isLoading, voiceState, speakText])

  // Clean up voice when switching to text mode
  useEffect(() => {
    if (inputMode === 'text') {
      stopListening()
      cleanup()
    }
  }, [inputMode, stopListening, cleanup])

  // Auto-start conversation when experience is submitted
  useEffect(() => {
    const currentExperience = experience.trim()

    // Reset initialization flag if experience changed
    if (hasInitializedRef.current !== currentExperience && currentExperience) {
      hasInitializedRef.current = ''
    }

    if (
      currentExperience &&
      tab1History.length === 0 &&
      tab1Summary === null &&
      !isLoading &&
      hasInitializedRef.current !== currentExperience
    ) {
      hasInitializedRef.current = currentExperience
      // Send initial request to get first question
      const startConversation = async () => {
        const signal = createAbortSignal()
        setIsLoading(true)
        try {
          const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              mode: 'define-experience',
              experience,
              history: [],
              forceSummary: false,
            }),
            signal,
          })

          if (!response.ok) {
            let errorMessage = `Server error: ${response.status}`
            try {
              const errorData = await response.json()
              errorMessage = errorData.message || errorData.error || errorData.details || errorMessage
            } catch {
              // If JSON parsing fails, use status text
              errorMessage = response.statusText || errorMessage
            }
            throw new Error(errorMessage)
          }

          const data = await response.json()

          // Validate response structure
          if (!data || typeof data !== 'object') {
            throw new Error('Invalid response format from server')
          }

          // Debug: log the response to see what we're getting
          console.log('API Response:', data)

          // Ensure we have rawText
          const rawText = data.rawText || data.assistantMessage || ''
          if (!rawText || typeof rawText !== 'string') {
            console.error('No text content in API response:', data)
            throw new Error('Received empty response from API')
          }

          const { parsed, cleanText } = parseModelOutput(rawText)

          // Use cleanText if it has content, otherwise fall back to rawText
          // cleanText will be empty if the response only contained JSON blocks
          const messageContent = (cleanText && cleanText.trim()) || rawText.trim()

          console.log('Message content:', { rawText, cleanText, messageContent, parsed })

          if (!messageContent) {
            console.error('Message content is empty after parsing:', { rawText, cleanText, parsed })
            throw new Error('Message content is empty')
          }

          const assistantMessage = createChatMessage('assistant', messageContent)
          console.log('Created assistant message:', assistantMessage)

          setTab1History([assistantMessage])

          // Check for summary (unlikely on first message, but handle it)
          const summary = extractSummary(parsed)
          if (summary) {
            setTab1Summary(summary)
            setIsFinishedTab1(true)
          }
        } catch (error) {
          // Don't show error for aborted requests
          if (error instanceof Error && error.name === 'AbortError') {
            return
          }
          console.error('Error starting conversation:', error)
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          alert(`Failed to start conversation: ${errorMessage}`)
        } finally {
          // Only reset loading if this request wasn't aborted
          if (!isAborted(signal)) {
            setIsLoading(false)
          }
        }
      }

      startConversation()
    }
  }, [experience, tab1History.length, tab1Summary, isLoading, setTab1History, setTab1Summary, setIsFinishedTab1, createAbortSignal, isAborted])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim() && !isLoading && experience.trim()) {
      sendMessage(input.trim())
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter, but allow Shift+Enter for new lines
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (input.trim() && !isLoading && experience.trim()) {
        sendMessage(input.trim())
      }
    }
  }

  // Auto-resize textarea based on content
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 200)}px`
    }
  }, [input])

  const handleSummarize = () => {
    if (!isLoading && experience.trim()) {
      sendMessage('', true)
    }
  }

  const hasExperience = experience.trim() !== ''
  const showPlaceholder = !hasExperience && tab1History.length === 0
  const conversationStarted = tab1History.length > 0
  const inputDisabled = isLoading || isFinishedTab1 || !hasExperience || !conversationStarted

  // Auto-focus input when it becomes enabled
  useEffect(() => {
    if (!inputDisabled && !isLoading && conversationStarted) {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 0)
    }
  }, [inputDisabled, isLoading, conversationStarted])

  return (
    <div className="flex h-full flex-col bg-transparent">
      {/* Speaking Indicator - only show in voice mode */}
      {inputMode === 'voice' && (
        <SpeakingIndicator
          isUserSpeaking={voiceState === 'listening'}
          isAISpeaking={voiceState === 'speaking'}
        />
      )}

      {/* Scrollable chat area */}
      <div className="flex-1 overflow-y-auto">
        {showPlaceholder ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-blue-400 text-lg">Enter a human experience above to begin.</p>
          </div>
        ) : (
          <>
            <ChatMessageList messages={tab1History} isStreaming={isLoading} />

            {tab1Summary && (
              <div className="border-t border-gray-700 p-4 bg-gray-750">
                <div className="max-w-4xl mx-auto">
                  <h3 className="text-lg font-semibold text-gray-200 mb-2">Summary</h3>
                  <div className="bg-gray-700 rounded-lg p-4 text-gray-100">
                    <p className="whitespace-pre-wrap">{tab1Summary}</p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Input row at the bottom */}
      <div className="shrink-0 border-t border-gray-700 bg-gray-800 p-4">
        {/* Mode Toggle */}
        <div className="max-w-4xl mx-auto mb-3">
          <div className="flex items-center justify-center gap-2">
            <span className={`text-sm ${inputMode === 'text' ? 'text-gray-300' : 'text-gray-500'}`}>
              Text
            </span>
            <button
              type="button"
              onClick={() => {
                const newMode = inputMode === 'text' ? 'voice' : 'text'
                setInputMode(newMode)

                if (newMode === 'voice') {
                  // If there's already a conversation, speak the last AI message
                  if (tab1History.length > 0 && !isLoading) {
                    const lastMessage = tab1History[tab1History.length - 1]
                    if (lastMessage.role === 'assistant') {
                      // Speak the last AI message
                      speakText(lastMessage.content)
                    }
                  }
                } else {
                  // Switching to text mode - cleanup voice
                  stopListening()
                  cleanup()
                  setIsRecording(false)
                }
              }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${inputMode === 'voice' ? 'bg-blue-600' : 'bg-gray-600'
                }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${inputMode === 'voice' ? 'translate-x-6' : 'translate-x-1'
                  }`}
              />
            </button>
            <span className={`text-sm ${inputMode === 'voice' ? 'text-gray-300' : 'text-gray-500'}`}>
              Voice
            </span>
          </div>
        </div>

        {/* Text Input - only show in text mode */}
        {inputMode === 'text' && (
          <form onSubmit={handleSubmit} className="max-w-4xl mx-auto flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Answer the question..."
              disabled={inputDisabled}
              rows={1}
              className="flex-1 px-4 py-2 bg-gray-700 text-gray-100 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 resize-none overflow-hidden min-h-[44px] max-h-[200px]"
            />
            <button
              type="submit"
              disabled={inputDisabled || !input.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Send
            </button>
            {!isFinishedTab1 && hasExperience && conversationStarted && (
              <button
                type="button"
                onClick={handleSummarize}
                disabled={isLoading}
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Summarize Now
              </button>
            )}
          </form>
        )}

        {/* Voice Mode - Record Button */}
        {inputMode === 'voice' && (
          <div className="max-w-4xl mx-auto flex flex-col items-center gap-3">
            {voiceState === 'speaking' && (
              <p className="text-sm text-gray-400">🔊 AI is speaking...</p>
            )}
            {voiceState === 'idle' && conversationStarted && !isLoading && !isRecording && (
              <button
                type="button"
                onClick={handleRecordToggle}
                disabled={isLoading}
                className="flex items-center gap-2 px-6 py-3 rounded-lg transition bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                </svg>
                <span>Record Response</span>
              </button>
            )}
            {isRecording && (
              <div className="flex flex-col items-center gap-3">
                <p className="text-sm text-gray-400">🎤 Recording... Speak now</p>
                <button
                  type="button"
                  onClick={handleRecordToggle}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-6 py-3 rounded-lg transition bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 012 0v4a1 1 0 11-2 0V7zm5 1a1 1 0 10-2 0v4a1 1 0 102 0V8z" clipRule="evenodd" />
                  </svg>
                  <span>End Recording</span>
                </button>
              </div>
            )}
            {voiceState === 'listening' && !isRecording && (
              <p className="text-sm text-gray-400">🎤 Listening...</p>
            )}
            {voiceState === 'idle' && !conversationStarted && (
              <p className="text-sm text-gray-400">Conversation will start automatically...</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
