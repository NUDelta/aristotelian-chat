import type { Bias } from '../context/SessionContextDef'

/**
 * Validates that an object matches the Bias structure
 * Returns the validated Bias or null if invalid
 */
export function validateBias(data: unknown): Bias | null {
  if (!data || typeof data !== 'object') {
    return null
  }

  const obj = data as Record<string, unknown>

  // Check required fields
  if (
    typeof obj.id !== 'string' ||
    typeof obj.title !== 'string' ||
    typeof obj.explanation !== 'string' ||
    !Array.isArray(obj.challengingIdeas)
  ) {
    return null
  }

  // Validate challengingIdeas array contains only strings
  if (!obj.challengingIdeas.every((item) => typeof item === 'string')) {
    return null
  }

  return {
    id: obj.id,
    title: obj.title,
    explanation: obj.explanation,
    challengingIdeas: obj.challengingIdeas as string[],
  }
}

/**
 * Validates an array of Bias objects
 * Returns only valid Bias objects
 */
export function validateBiases(data: unknown): Bias[] {
  if (!Array.isArray(data)) {
    return []
  }

  const validated: Bias[] = []
  for (const item of data) {
    const validatedBias = validateBias(item)
    if (validatedBias) {
      validated.push(validatedBias)
    }
  }

  return validated
}

/**
 * Validates that a value is a string array
 */
export function validateStringArray(data: unknown): string[] {
  if (!Array.isArray(data)) {
    return []
  }

  return data.filter((item) => typeof item === 'string')
}

