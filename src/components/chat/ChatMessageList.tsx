import { useEffect, useRef } from 'react'
import type { ChatMessage } from '../../context/SessionContextDef'
import { MessageBubble } from './MessageBubble'

type ChatMessageListProps = {
  messages: ChatMessage[]
  isStreaming?: boolean
}

export function ChatMessageList({ messages, isStreaming = false }: ChatMessageListProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null)

  // Check if we're waiting for an assistant response (last message is from user or no messages yet)
  const lastMessage = messages[messages.length - 1]
  const waitingForResponse = isStreaming && (!lastMessage || lastMessage.role === 'user')

  // Auto-scroll to bottom when messages update or streaming state changes
  useEffect(() => {
    // Use requestAnimationFrame to ensure DOM has updated before scrolling
    const scrollToBottom = () => {
      if (!bottomRef.current) return

      // Find the scrollable parent container
      let scrollableParent: HTMLElement | null = bottomRef.current.parentElement
      while (scrollableParent) {
        const style = window.getComputedStyle(scrollableParent)
        if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
          break
        }
        scrollableParent = scrollableParent.parentElement
      }

      if (scrollableParent) {
        // Scroll the parent container to the bottom
        scrollableParent.scrollTo({
          top: scrollableParent.scrollHeight,
          behavior: isStreaming ? 'auto' : 'smooth',
        })
      } else {
        // Fallback to scrollIntoView
        bottomRef.current.scrollIntoView({
          behavior: isStreaming ? 'auto' : 'smooth',
          block: 'end',
        })
      }
    }

    // Double RAF to ensure layout has completed
    requestAnimationFrame(() => {
      requestAnimationFrame(scrollToBottom)
    })
  }, [messages, isStreaming]) // Use messages array directly to catch all changes

  return (
    <div className="space-y-3 px-4 py-4">
      {messages.map((message, idx) => (
        <MessageBubble
          key={message.id}
          message={message}
          isStreaming={isStreaming && idx === messages.length - 1 && message.role === 'assistant'}
        />
      ))}
      {waitingForResponse && (
        <div className="flex justify-start mb-4 px-4">
          <div className="max-w-[85%] rounded-lg px-4 py-3 bg-gray-700 text-gray-100">
            <div className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="inline-block w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="inline-block w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
            </div>
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  )
}

