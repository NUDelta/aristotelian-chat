import type { ChatMessage, Bias } from '../context/SessionContextDef'

export type ExportData = {
  version: string
  exportedAt: string
  experience: {
    name: string
    summary: string | null
    conversation: Array<{
      role: 'user' | 'assistant'
      content: string
      timestamp?: string
    }>
  }
  ideas: {
    myIdeas: string[]
    aiSuggested: string[]
    biasChallenging: string[]
  }
  biases: Array<{
    id: string
    title: string
    explanation: string
    decision: 'accepted' | 'rejected' | undefined
    aiChallengingIdeas: string[]
    userAddedIdeas: string[]
  }>
}

type SessionData = {
  experience: string
  tab1History: ChatMessage[]
  tab1Summary: string | null
  myIdeas: string[]
  allSuggestedIdeas: string[]
  tab3ChallengingIdeas: string[]
  biases: Bias[] | null
  biasDecisions: Record<string, 'accepted' | 'rejected' | undefined>
  biasUserIdeas: Record<string, string[]>
  ideaComments: Record<string, string>
}

/**
 * Formats session data into export structure
 */
export function formatSessionForExport(data: SessionData): ExportData {
  return {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    experience: {
      name: data.experience,
      summary: data.tab1Summary,
      conversation: data.tab1History.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
    },
    ideas: {
      myIdeas: data.myIdeas,
      aiSuggested: data.allSuggestedIdeas.filter(
        (idea) => !data.tab3ChallengingIdeas.includes(idea)
      ),
      biasChallenging: data.tab3ChallengingIdeas,
    },
    biases: (data.biases || []).map((bias) => ({
      id: bias.id,
      title: bias.title,
      explanation: bias.explanation,
      decision: data.biasDecisions[bias.id],
      aiChallengingIdeas: bias.challengingIdeas,
      userAddedIdeas: data.biasUserIdeas[bias.id] || [],
    })),
  }
}

/**
 * Downloads data as JSON file
 */
export function downloadJSON(data: string, filename: string): void {
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Copies text to clipboard
 */
export async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    // Fallback for older browsers
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.opacity = '0'
    document.body.appendChild(textArea)
    textArea.select()
    document.execCommand('copy')
    document.body.removeChild(textArea)
  }
}

/**
 * Generates a filename for the export
 */
export function generateExportFilename(experience: string): string {
  const sanitized = experience
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50)
  const timestamp = new Date().toISOString().split('T')[0]
  return `aristotelian-chat-${sanitized || 'session'}-${timestamp}.json`
}

/**
 * Validates and parses imported JSON data
 */
export function validateImportData(data: unknown): ExportData | null {
  if (!data || typeof data !== 'object') {
    return null
  }

  const obj = data as Record<string, unknown>

  // Check for required top-level fields
  if (
    typeof obj.version !== 'string' ||
    typeof obj.experience !== 'object' ||
    typeof obj.ideas !== 'object' ||
    !Array.isArray(obj.biases)
  ) {
    return null
  }

  const exp = obj.experience as Record<string, unknown>
  const ideas = obj.ideas as Record<string, unknown>

  // Validate experience structure
  if (
    typeof exp.name !== 'string' ||
    (exp.summary !== null && typeof exp.summary !== 'string') ||
    !Array.isArray(exp.conversation)
  ) {
    return null
  }

  // Validate ideas structure
  if (
    !Array.isArray(ideas.myIdeas) ||
    !Array.isArray(ideas.aiSuggested) ||
    !Array.isArray(ideas.biasChallenging)
  ) {
    return null
  }

  // Validate biases structure
  for (const bias of obj.biases) {
    if (
      typeof bias !== 'object' ||
      typeof (bias as Record<string, unknown>).id !== 'string' ||
      typeof (bias as Record<string, unknown>).title !== 'string' ||
      typeof (bias as Record<string, unknown>).explanation !== 'string' ||
      !Array.isArray((bias as Record<string, unknown>).aiChallengingIdeas) ||
      !Array.isArray((bias as Record<string, unknown>).userAddedIdeas)
    ) {
      return null
    }
  }

  return obj as ExportData
}

/**
 * Converts exported data back to session data format
 */
export function convertImportToSessionData(importData: ExportData): {
  experience: string
  tab1History: ChatMessage[]
  tab1Summary: string | null
  myIdeas: string[]
  allSuggestedIdeas: string[]
  tab3ChallengingIdeas: string[]
  biases: Bias[] | null
  biasDecisions: Record<string, 'accepted' | 'rejected' | undefined>
  biasUserIdeas: Record<string, string[]>
  ideaComments: Record<string, string>
} {
  // Convert conversation back to ChatMessage format
  const tab1History: ChatMessage[] = importData.experience.conversation.map((msg, index) => ({
    id: `msg-${Date.now()}-${index}`,
    role: msg.role,
    content: msg.content,
  }))

  // Reconstruct allSuggestedIdeas (AI suggested + bias challenging)
  const allSuggestedIdeas = [
    ...importData.ideas.aiSuggested,
    ...importData.ideas.biasChallenging,
  ]

  // Reconstruct biases
  const biases: Bias[] = importData.biases.map((bias) => ({
    id: bias.id,
    title: bias.title,
    explanation: bias.explanation,
    challengingIdeas: bias.aiChallengingIdeas,
  }))

  // Reconstruct biasDecisions
  const biasDecisions: Record<string, 'accepted' | 'rejected' | undefined> = {}
  importData.biases.forEach((bias) => {
    if (bias.decision) {
      biasDecisions[bias.id] = bias.decision
    }
  })

  // Reconstruct biasUserIdeas
  const biasUserIdeas: Record<string, string[]> = {}
  importData.biases.forEach((bias) => {
    if (bias.userAddedIdeas.length > 0) {
      biasUserIdeas[bias.id] = bias.userAddedIdeas
    }
  })

  return {
    experience: importData.experience.name,
    tab1History,
    tab1Summary: importData.experience.summary,
    myIdeas: importData.ideas.myIdeas,
    allSuggestedIdeas,
    tab3ChallengingIdeas: importData.ideas.biasChallenging,
    biases: biases.length > 0 ? biases : null,
    biasDecisions,
    biasUserIdeas,
    ideaComments: {},
  }
}

/**
 * Reads a file as text
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      if (e.target?.result && typeof e.target.result === 'string') {
        resolve(e.target.result)
      } else {
        reject(new Error('Failed to read file'))
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}

