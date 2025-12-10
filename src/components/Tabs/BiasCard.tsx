import { useState } from 'react'
import { useSession } from '../../context/useSession'
import type { Bias } from '../../context/SessionContextDef'

type BiasCardProps = {
  bias: Bias
}

export function BiasCard({ bias }: BiasCardProps) {
  const {
    biasDecisions,
    setBiasDecisions,
    myIdeas,
    setMyIdeas,
    allSuggestedIdeas,
    setAllSuggestedIdeas,
    tab3ChallengingIdeas,
    setTab3ChallengingIdeas,
    biasUserIdeas,
    setBiasUserIdeas,
  } = useSession()

  const [newIdeaInput, setNewIdeaInput] = useState('')
  const decision = biasDecisions[bias.id]
  const userIdeas = biasUserIdeas[bias.id] || []

  const handleReject = () => {
    setBiasDecisions((prev) => ({ ...prev, [bias.id]: 'rejected' }))
  }

  const handleAccept = () => {
    setBiasDecisions((prev) => ({ ...prev, [bias.id]: 'accepted' }))
  }

  const handleToggleIdea = (idea: string) => {
    const isAlreadyAdded = myIdeas.includes(idea)
    
    if (isAlreadyAdded) {
      // Remove from Tab 2 ideas
      setMyIdeas((prev) => prev.filter((i) => i !== idea))
    } else {
      // Add to Tab 2 state
      setMyIdeas((prev) => [...prev, idea])
      if (!allSuggestedIdeas.includes(idea)) {
        setAllSuggestedIdeas((prev) => [...prev, idea])
      }
      // Mark as Tab 3 challenging idea for purple color
      if (!tab3ChallengingIdeas.includes(idea)) {
        setTab3ChallengingIdeas((prev) => [...prev, idea])
      }
    }
  }

  const handleAddUserIdea = () => {
    const idea = newIdeaInput.trim()
    if (idea && !userIdeas.includes(idea) && !myIdeas.includes(idea)) {
      // Add to user's ideas for this bias (display in blue) - persist in session context
      setBiasUserIdeas((prev) => ({
        ...prev,
        [bias.id]: [...(prev[bias.id] || []), idea],
      }))
      // Add to Tab 2 ideas (will show as blue since it's not in tab3ChallengingIdeas)
      setMyIdeas((prev) => [...prev, idea])
      setNewIdeaInput('')
    }
  }

  const handleRemoveUserIdea = (idea: string) => {
    // Remove from this bias's user ideas
    setBiasUserIdeas((prev) => ({
      ...prev,
      [bias.id]: (prev[bias.id] || []).filter((i) => i !== idea),
    }))
    // Remove from Tab 2 ideas
    setMyIdeas((prev) => prev.filter((i) => i !== idea))
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleAddUserIdea()
    }
  }

  const isRejected = decision === 'rejected'
  const isAccepted = decision === 'accepted'

  return (
    <div
      className={`
        flex w-full max-w-2xl flex-col rounded-xl border border-gray-600 bg-gray-700/50 p-6 shadow-sm
        transition
        ${isRejected ? 'opacity-50 grayscale' : ''}
      `}
    >
      <h3 className="mb-2 text-base font-semibold text-gray-200">{bias.title}</h3>
      <p className="mb-4 text-sm text-gray-300 whitespace-pre-line">
        {bias.explanation}
      </p>

      <div className="mb-3 flex gap-2 items-center flex-wrap">
        <button
          onClick={handleReject}
          className={`rounded-full border px-3 py-1 text-sm transition ${
            isRejected
              ? 'bg-gray-600 border-gray-500 text-gray-300'
              : 'border-gray-500 text-gray-300 hover:bg-gray-600'
          }`}
        >
          ✕ Keep this bias
        </button>
        <button
          onClick={handleAccept}
          className={`rounded-full border px-3 py-1 text-sm transition ${
            isAccepted
              ? 'bg-purple-600 text-white border-purple-500'
              : 'border-purple-500 text-purple-300 hover:bg-purple-600/20'
          }`}
        >
          ✔ Open to overcoming this bias
        </button>
        {isAccepted && (
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <input
              type="text"
              value={newIdeaInput}
              onChange={(e) => setNewIdeaInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Add your own idea..."
              className="flex-1 px-3 py-1 text-sm rounded-md border border-gray-500 bg-gray-600 text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-gray-400"
            />
            <button
              onClick={handleAddUserIdea}
              disabled={!newIdeaInput.trim()}
              className="px-3 py-1 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Add
            </button>
          </div>
        )}
      </div>

      {isAccepted && (
        <div className="mt-2 border-t border-gray-600 pt-2">
          <p className="mb-2 text-xs font-semibold uppercase text-purple-400">
            Ideas that challenge this bias
          </p>
          <div className="flex flex-wrap gap-2">
            {/* AI-suggested challenging ideas (purple) */}
            {bias.challengingIdeas.map((idea) => {
              const isAdded = myIdeas.includes(idea)
              return (
                <button
                  key={idea}
                  onClick={() => handleToggleIdea(idea)}
                  className={`px-4 py-2 rounded-full text-sm transition ${
                    isAdded
                      ? 'bg-gray-600 text-gray-400 border border-gray-500'
                      : 'bg-purple-600 text-white hover:bg-purple-700'
                  }`}
                >
                  {idea}
                </button>
              )
            })}
            {/* User's own ideas (blue) */}
            {userIdeas.map((idea) => {
              const isAdded = myIdeas.includes(idea)
              return (
                <button
                  key={idea}
                  onClick={() => handleRemoveUserIdea(idea)}
                  className={`px-4 py-2 rounded-full text-sm transition ${
                    isAdded
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-600 text-gray-400 border border-gray-500'
                  }`}
                >
                  {idea}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

