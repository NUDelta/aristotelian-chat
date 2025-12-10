import type { ChatMessage } from '../context/SessionContextDef'

/**
 * Generates a unique ID for a chat message
 */
export function generateMessageId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Creates a new ChatMessage with a generated ID
 */
export function createChatMessage(
  role: 'user' | 'assistant',
  content: string
): ChatMessage {
  return {
    id: generateMessageId(),
    role,
    content,
  }
}

