import { useEffect, useRef } from 'react'

/**
 * Custom hook to manage AbortController for fetch requests
 * Automatically cancels requests on unmount and provides a method to create new controllers
 */
export function useAbortController() {
  const abortControllerRef = useRef<AbortController | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  /**
   * Creates a new AbortController, cancelling any existing request
   * Returns the signal to pass to fetch requests
   */
  const createAbortSignal = (): AbortSignal => {
    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Create new AbortController for this request
    const abortController = new AbortController()
    abortControllerRef.current = abortController

    return abortController.signal
  }

  /**
   * Checks if the current request was aborted
   */
  const isAborted = (signal: AbortSignal): boolean => {
    return signal.aborted
  }

  return { createAbortSignal, isAborted }
}

