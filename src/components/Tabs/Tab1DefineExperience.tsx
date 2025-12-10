import { useState, useEffect, useRef } from 'react'
import { useSession } from '../../context/useSession'
import { ChatMessageList } from '../chat/ChatMessageList'
import { parseModelOutput, extractSummary } from '../../utils/parseModelOutput'
import { createChatMessage } from '../../utils/messageUtils'
import { useAbortController } from '../../hooks/useAbortController'

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
  const hasInitializedRef = useRef<string>('')
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const { createAbortSignal, isAborted } = useAbortController()

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
      </div>
    </div>
  )
}
