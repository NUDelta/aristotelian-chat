/**
 * Parses OpenAI response text to extract JSON markers from markdown code blocks
 */

import type { Bias } from '../context/SessionContextDef'
export type { Bias }

export type ParsedSummary = {
  type: 'summary'
  complete: boolean
  content: string
}

export type ParsedSuggestedIdeas = {
  type: 'suggested_ideas'
  items: string[]
}

export type ParsedBiases = {
  type: 'biases'
  items: Bias[]
}

export type ParsedChallengingIdeas = {
  type: 'challenging_ideas'
  items: string[]
}

export type ParsedOutput =
  | ParsedSummary
  | ParsedSuggestedIdeas
  | ParsedBiases
  | ParsedChallengingIdeas

/**
 * Extracts JSON markers from markdown code blocks in the response text
 */
export function parseModelOutput(rawText: string): {
  parsed: ParsedOutput[]
  cleanText: string
} {
  const jsonBlockRegex = /```json\s*([\s\S]*?)\s*```/g
  const parsed: ParsedOutput[] = []
  let cleanText = rawText

  let match
  while ((match = jsonBlockRegex.exec(rawText)) !== null) {
    try {
      const jsonContent = match[1].trim()
      const parsedJson = JSON.parse(jsonContent) as ParsedOutput
      parsed.push(parsedJson)
      // Remove the JSON block from clean text
      cleanText = cleanText.replace(match[0], '').trim()
    } catch (e) {
      console.error('Failed to parse JSON marker:', e)
    }
  }

  return { parsed, cleanText }
}

/**
 * Extracts summary from parsed output
 */
export function extractSummary(parsed: ParsedOutput[]): string | null {
  const summary = parsed.find((p) => p.type === 'summary' && p.complete)
  return summary ? (summary as ParsedSummary).content : null
}

/**
 * Extracts suggested ideas from parsed output
 */
export function extractSuggestedIdeas(parsed: ParsedOutput[]): string[] {
  const ideas = parsed.find((p) => p.type === 'suggested_ideas')
  return ideas ? (ideas as ParsedSuggestedIdeas).items : []
}

/**
 * Extracts biases from parsed output
 * Validates the structure before returning
 */
export function extractBiases(parsed: ParsedOutput[]): Bias[] {
  const biases = parsed.find((p) => p.type === 'biases')
  if (!biases) {
    return []
  }

  const parsedBiases = biases as ParsedBiases
  if (!Array.isArray(parsedBiases.items)) {
    return []
  }

  // Validate each bias object
  const validated: Bias[] = []
  for (const item of parsedBiases.items) {
    if (
      item &&
      typeof item === 'object' &&
      typeof item.id === 'string' &&
      typeof item.title === 'string' &&
      typeof item.explanation === 'string' &&
      Array.isArray(item.challengingIdeas) &&
      item.challengingIdeas.every((idea) => typeof idea === 'string')
    ) {
      validated.push(item as Bias)
    }
  }

  return validated
}

/**
 * Extracts challenging ideas from parsed output
 */
export function extractChallengingIdeas(parsed: ParsedOutput[]): string[] {
  const ideas = parsed.find((p) => p.type === 'challenging_ideas')
  return ideas ? (ideas as ParsedChallengingIdeas).items : []
}

