import { useEffect, useState, useRef } from 'react'
import type { ChatMessage } from '../../context/SessionContextDef'

type MessageBubbleProps = {
  message: ChatMessage
  isStreaming?: boolean
}

export function MessageBubble({ message, isStreaming = false }: MessageBubbleProps) {
  const [displayedLines, setDisplayedLines] = useState<string[]>([])
  const currentIdxRef = useRef(0)
  const processedMessageIdRef = useRef<string | null>(null)
  const lastContentRef = useRef<string>('')
  const cleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    const isNewMessage = processedMessageIdRef.current !== message.id
    const isContentUpdate = !isNewMessage && lastContentRef.current !== message.content

    // Skip if same message and content hasn't changed
    if (!isNewMessage && !isContentUpdate) {
      return
    }

    // Clean up any previous timers
    if (cleanupRef.current) {
      cleanupRef.current()
      cleanupRef.current = null
    }

    console.log('MessageBubble received message:', message)
    
    // Defer state updates to avoid synchronous setState in effect body
    const timeoutId = setTimeout(() => {
      if (message.role === 'assistant' && message.content) {
        const content = message.content.trim()
        
        // If content is empty, show a placeholder
        if (!content) {
          console.warn('Empty message content received:', message)
          setDisplayedLines(['(Empty message)'])
          processedMessageIdRef.current = message.id
          lastContentRef.current = message.content
          return
        }
        
        console.log('MessageBubble processing content:', content)
        
        const lines = content.split('\n').filter((line) => line.trim() !== '')
        
        // If all lines were filtered out (only whitespace), show the original content
        if (lines.length === 0) {
          setDisplayedLines([content])
          processedMessageIdRef.current = message.id
          lastContentRef.current = message.content
          return
        }

        // For single-line messages, show immediately
        if (lines.length === 1) {
          setDisplayedLines([lines[0]])
          processedMessageIdRef.current = message.id
          lastContentRef.current = message.content
          return
        }

        // For multi-line messages, reset animation if it's a new message
        if (isNewMessage) {
          setDisplayedLines([])
          currentIdxRef.current = 0
        }
        
        processedMessageIdRef.current = message.id
        lastContentRef.current = message.content

        const revealNextLine = () => {
          if (currentIdxRef.current < lines.length) {
            setDisplayedLines((prev) => {
              const next = [...prev, lines[currentIdxRef.current]]
              currentIdxRef.current++
              return next
            })
          }
        }

        // Only start animation if it's a new message or if we haven't started yet
        if (isNewMessage || currentIdxRef.current === 0) {
          // Initial delay
          const timer = setTimeout(() => {
            revealNextLine()
          }, 50)

          const interval = setInterval(() => {
            if (currentIdxRef.current < lines.length) {
              revealNextLine()
            } else {
              clearInterval(interval)
            }
          }, 80)

          cleanupRef.current = () => {
            clearTimeout(timer)
            clearInterval(interval)
          }
        } else {
          // For content updates during streaming, update all lines immediately
          setDisplayedLines(lines)
        }
      } else {
        // User messages show immediately
        setDisplayedLines([message.content])
        processedMessageIdRef.current = message.id
        lastContentRef.current = message.content
      }
    }, 0)

    return () => {
      clearTimeout(timeoutId)
      if (cleanupRef.current) {
        cleanupRef.current()
        cleanupRef.current = null
      }
    }
  }, [message])

  const isUser = message.role === 'user'
  const isComplete = !isStreaming && displayedLines.length > 0

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 px-4`}
    >
      <div
        className={`max-w-[85%] rounded-lg px-4 py-3 ${
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-gray-700 text-gray-100'
        }`}
      >
        {message.role === 'assistant' ? (
          <div className="space-y-1">
            {displayedLines.map((line, idx) => (
              <p
                key={`${line}-${idx}`}
                className={`transition-opacity duration-300 ${
                  idx === displayedLines.length - 1 && !isComplete
                    ? 'opacity-70'
                    : 'opacity-100'
                }`}
              >
                {line}
              </p>
            ))}
            {isStreaming && (
              <span className="inline-block w-2 h-4 bg-gray-400 animate-pulse ml-1" />
            )}
          </div>
        ) : (
          <p className="whitespace-pre-wrap">{message.content}</p>
        )}
      </div>
    </div>
  )
}

