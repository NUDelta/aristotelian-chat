import { useState } from 'react'
import { useSession } from '../../context/useSession'
import { parseModelOutput, extractSuggestedIdeas } from '../../utils/parseModelOutput'
import { useAbortController } from '../../hooks/useAbortController'

export function Tab2GenerateIdeas() {
  const {
    experience,
    tab1Summary,
    tab1History,
    myIdeas,
    setMyIdeas,
    allSuggestedIdeas,
    setAllSuggestedIdeas,
    tab3ChallengingIdeas,
  } = useSession()

  const [isLoading, setIsLoading] = useState(false)
  const [newIdeaInput, setNewIdeaInput] = useState('')
  const { createAbortSignal, isAborted } = useAbortController()

  const handleAddMyIdea = () => {
    if (newIdeaInput.trim() && !myIdeas.includes(newIdeaInput.trim())) {
      setMyIdeas([...myIdeas, newIdeaInput.trim()])
      setNewIdeaInput('')
    }
  }

  const handleRemoveMyIdea = (idea: string) => {
    setMyIdeas(myIdeas.filter((i) => i !== idea))
  }

  const handleAddSuggestedIdea = (idea: string) => {
    if (!myIdeas.includes(idea)) {
      setMyIdeas([...myIdeas, idea])
    }
  }

  const handleGenerateMore = async () => {
    if (!tab1Summary || tab1Summary.trim().length === 0) {
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

      // Ensure we have the original experience name (not the summary)
      if (!experience || experience.trim().length === 0) {
        throw new Error('Please complete Tab 1 first to generate ideas')
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'generate-ideas',
          experience, // Original experience name (must be <= 500 chars)
          summary: tab1Summary, // Summary can be longer, sent separately
          history: historyForAPI,
          myIdeas,
          allSuggestedIdeas,
        }),
        signal,
      })

      if (!response.ok) {
        // Try to get error message from response
        let errorMessage = 'Failed to generate ideas'
        try {
          const errorData = await response.json()
          errorMessage = errorData.message || errorData.error || errorMessage
        } catch {
          // If JSON parsing fails, use status text
          errorMessage = response.statusText || errorMessage
        }
        throw new Error(errorMessage)
      }

      const data = await response.json()
      
      // Validate response structure
      if (!data || typeof data !== 'object' || !data.rawText || typeof data.rawText !== 'string') {
        throw new Error('Invalid response format from server')
      }
      
      const { parsed } = parseModelOutput(data.rawText)
      const newIdeas = extractSuggestedIdeas(parsed)

      if (newIdeas.length > 0) {
        // Add to all suggested ideas (avoid duplicates)
        const uniqueNewIdeas = newIdeas.filter(
          (idea) => !allSuggestedIdeas.includes(idea) && !myIdeas.includes(idea)
        )
        setAllSuggestedIdeas([...allSuggestedIdeas, ...uniqueNewIdeas])
      }
    } catch (error) {
      // Don't show error for aborted requests
      if (error instanceof Error && error.name === 'AbortError') {
        return
      }
      console.error('Error:', error)
      alert('Failed to generate ideas. Please try again.')
    } finally {
      // Only reset loading if this request wasn't aborted
      if (!isAborted(signal)) {
        setIsLoading(false)
      }
    }
  }

  return (
    <div className="flex flex-col h-full bg-transparent">
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 px-6 py-6 overflow-hidden">
        {/* Left Column: User's Ideas */}
        <div className="flex flex-col space-y-4 min-h-0">
          <h2 className="text-xl font-semibold text-gray-200">Your Ideas</h2>
          
          <div className="flex gap-2">
            <input
              type="text"
              value={newIdeaInput}
              onChange={(e) => setNewIdeaInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddMyIdea()}
              placeholder="Add your own idea..."
              className="flex-1 px-3 py-2 bg-gray-700 text-gray-100 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleAddMyIdea}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Add
            </button>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="flex flex-wrap gap-2">
              {myIdeas.length === 0 ? (
                <p className="text-gray-400 text-sm">No ideas yet. Add some above!</p>
              ) : (
                myIdeas.map((idea) => {
                  // Check if this idea came from Tab 3 (bias challenging ideas) - purple
                  const isTab3Idea = tab3ChallengingIdeas.includes(idea)
                  // Check if this idea came from AI suggestions (Tab 2) - green
                  const isAISuggestion = allSuggestedIdeas.includes(idea) && !isTab3Idea
                  return (
                    <div
                      key={idea}
                      className={`group relative inline-flex items-center gap-2 px-4 py-2 rounded-full ${
                        isTab3Idea
                          ? 'bg-purple-600 text-white'
                          : isAISuggestion
                          ? 'bg-green-600 text-white'
                          : 'bg-blue-600 text-white'
                      }`}
                    >
                      <span className="text-sm">{idea}</span>
                      <button
                        onClick={() => handleRemoveMyIdea(idea)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-white hover:text-red-300"
                        aria-label="Remove"
                      >
                        ×
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: AI Suggested Ideas */}
        <div className="flex flex-col space-y-4 min-h-0">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-200">AI Suggestions</h2>
            <button
              onClick={handleGenerateMore}
              disabled={isLoading || !tab1Summary}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm"
            >
              {isLoading ? 'Generating...' : 'Generate More'}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="flex flex-wrap gap-2">
              {(() => {
                // Filter out ideas that are already in myIdeas
                const availableSuggestions = allSuggestedIdeas.filter(
                  (idea) => !myIdeas.includes(idea)
                )
                
                if (availableSuggestions.length === 0) {
                  if (allSuggestedIdeas.length === 0) {
                    return (
                      <p className="text-gray-400 text-sm">
                        Click "Generate More" to get suggestions!
                      </p>
                    )
                  } else {
                    return (
                      <p className="text-gray-400 text-sm">
                        All suggestions have been added. Click "Generate More" for new ideas!
                      </p>
                    )
                  }
                }
                
                return availableSuggestions.map((idea) => (
                  <button
                    key={idea}
                    onClick={() => handleAddSuggestedIdea(idea)}
                    className="px-4 py-2 bg-gray-700 text-gray-100 rounded-full hover:bg-gray-600 transition text-sm"
                  >
                    + {idea}
                  </button>
                ))
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

