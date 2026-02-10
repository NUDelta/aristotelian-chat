import { useState, useEffect } from 'react'
import { useSession } from '../../context/useSession'
import { parseModelOutput, extractBiases } from '../../utils/parseModelOutput'
import { useAbortController } from '../../hooks/useAbortController'
import { BiasCard } from './BiasCard'
import type { Bias } from '../../context/SessionContextDef'

export function Tab3ChallengeBiases() {
  const {
    experience,
    tab1Summary,
    tab1History,
    myIdeas,
    allSuggestedIdeas,
    ideaComments,
    biases,
    setBiases,
    biasComments,
    biasIdeaComments,
  } = useSession()

  const [isLoading, setIsLoading] = useState(false)
  const [currentBiasIndex, setCurrentBiasIndex] = useState(0)
  const [biasSets, setBiasSets] = useState<Bias[][]>(() =>
    biases && biases.length > 0 ? [biases] : []
  )
  const [activeSetIndex, setActiveSetIndex] = useState(0)
  const { createAbortSignal, isAborted } = useAbortController()

  const handleAnalyze = async () => {
    if (!tab1Summary) {
      alert('Please complete Tab 1 first')
      return
    }

    const signal = createAbortSignal()
    setIsLoading(true)
    try {
      // Convert tab1History to API format (remove id field)
      const historyForAPI = (tab1History || []).map(({ id, ...msg }) => ({
        role: msg.role,
        content: msg.content,
      }))

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'challenge-biases',
          experience,
          summary: tab1Summary,
          history: historyForAPI,
          myIdeas,
          allSuggestedIdeas,
          ideaComments,
          biasComments,
          biasIdeaComments,
          previousBiases: biases || undefined,
        }),
        signal,
      })

      if (!response.ok) {
        // Try to get error message from response
        let errorMessage = 'Failed to analyze biases'
        try {
          const errorData = await response.json()
          errorMessage = errorData.message || errorData.error || errorMessage
        } catch {
          errorMessage = response.statusText || errorMessage
        }
        throw new Error(errorMessage)
      }

      const data = await response.json()
      
      // Validate response has rawText
      if (!data.rawText || typeof data.rawText !== 'string') {
        throw new Error('Invalid response format from server')
      }

      const { parsed } = parseModelOutput(data.rawText)
      const extractedBiases = extractBiases(parsed)

      if (extractedBiases.length > 0) {
        // Ensure bias ids are unique per analysis run so comments don't leak across analyses
        const analysisIndex = biasSets.length
        const normalizedBiases: Bias[] = extractedBiases.map((bias, index) => ({
          ...bias,
          id: `analysis_${analysisIndex}_${bias.id || `bias_${index + 1}`}`,
        }))

        // Update shared context with the latest set
        setBiases(normalizedBiases)

        // Append as a new analysis set (without deleting earlier ones)
        setBiasSets((prev) => {
          const next = [...prev, normalizedBiases]
          // Switch to the newest analysis tab
          setActiveSetIndex(next.length - 1)
          return next
        })

        // Reset to first bias in this new set
        setCurrentBiasIndex(0)
      } else {
        console.error('No biases found in response:', { rawText: data.rawText, parsed })
        alert('No biases were identified. Please try again.')
      }
    } catch (error) {
      // Don't show error for aborted requests
      if (error instanceof Error && error.name === 'AbortError') {
        return
      }
      console.error('Error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      alert(`Failed to analyze biases: ${errorMessage}`)
    } finally {
      // Only reset loading if this request wasn't aborted
      if (!isAborted(signal)) {
        setIsLoading(false)
      }
    }
  }

  // Run analysis once when tab first opens (if conditions are met and we don't have results)
  useEffect(() => {
    if (!experience || !tab1Summary || biasSets.length > 0 || isLoading) return

    // Optionally: require some ideas before running biases
    // if (myIdeas.length === 0 && allSuggestedIdeas.length === 0) return

    handleAnalyze()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [experience, tab1Summary, biasSets.length])

  // Keep local biasSets in sync if biases were populated externally (e.g. via import)
  useEffect(() => {
    if (biases && biases.length > 0 && biasSets.length === 0) {
      setBiasSets([biases])
      setActiveSetIndex(0)
      setCurrentBiasIndex(0)
    }
  }, [biases, biasSets.length])

  return (
    <div className="flex h-full flex-col bg-transparent overflow-hidden">
      <header className="shrink-0 border-b border-gray-700 px-6 py-4 bg-gray-800">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-gray-200">Challenge Your Biases</h2>
            <p className="text-sm text-gray-400 mt-1">
              Review how you might be narrowing this experience, then explore ideas that stretch your perspective.
            </p>
          </div>
          <button
            onClick={handleAnalyze}
            disabled={isLoading || !tab1Summary}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {isLoading
              ? 'Analyzing...'
              : biasSets.length > 0
              ? 'Add Updated Analysis'
              : 'Analyze Biases'}
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400">Analyzing your ideas for potential biases...</p>
          </div>
        ) : biasSets.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400">
              Click &quot;Analyze Biases&quot; to identify potential biases in your thinking.
            </p>
          </div>
        ) : biasSets[activeSetIndex] && biasSets[activeSetIndex].length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400">No biases were identified. Try refreshing the analysis.</p>
          </div>
        ) : (
          <div className="flex items-center justify-center px-6 py-6 relative min-h-full">
            {/* Analysis Tabs */}
            {biasSets.length > 1 && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                {biasSets.map((set, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setActiveSetIndex(index)
                      setCurrentBiasIndex(0)
                      // Keep shared context biases aligned with active analysis
                      setBiases(set)
                    }}
                    className={`px-3 py-1 rounded-full text-xs border transition ${
                      index === activeSetIndex
                        ? 'bg-purple-600 text-white border-purple-500'
                        : 'bg-gray-800 text-gray-300 border-gray-600 hover:border-purple-400 hover:text-purple-200'
                    }`}
                  >
                    {index === 0 ? 'Initial analysis' : `Updated analysis ${index}`}
                  </button>
                ))}
              </div>
            )}

            {/* Left Arrow - Fixed to left side of screen */}
            <button
              onClick={() => setCurrentBiasIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentBiasIndex === 0}
              className="fixed left-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-gray-700 hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition text-gray-300"
              aria-label="Previous bias"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>

            {/* Center Card */}
            <div className="flex-1 flex justify-center max-w-2xl">
              <BiasCard bias={biasSets[activeSetIndex][currentBiasIndex]} />
            </div>

            {/* Right Arrow - Fixed to right side of screen */}
            <button
              onClick={() =>
                setCurrentBiasIndex((prev) =>
                  Math.min(biasSets[activeSetIndex].length - 1, prev + 1)
                )
              }
              disabled={currentBiasIndex === biasSets[activeSetIndex].length - 1}
              className="fixed right-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-gray-700 hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition text-gray-300"
              aria-label="Next bias"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
        )}
      </div>

      {biasSets.length > 0 && biasSets[activeSetIndex] && biasSets[activeSetIndex].length > 0 && (
        <div className="shrink-0 border-t border-gray-700 px-6 py-3 bg-gray-800 relative">
          {/* Page Indicator - Fixed above footer text */}
          {biasSets[activeSetIndex].length > 1 && (
            <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 z-20 flex gap-2">
              {biasSets[activeSetIndex].map((_, index) => (
                <button
                  key={index}
                    onClick={() => setCurrentBiasIndex(index)}
                  className={`h-2 rounded-full transition ${
                    index === currentBiasIndex
                      ? 'w-8 bg-purple-600'
                      : 'w-2 bg-gray-600 hover:bg-gray-500'
                  }`}
                  aria-label={`Go to bias ${index + 1}`}
                />
              ))}
            </div>
          )}
          <p className="text-xs text-gray-400 text-center">
            Accepted challenging ideas can be added to your list on Tab 2.
          </p>
        </div>
      )}
    </div>
  )
}
