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
    biasComments,
    setBiasComments,
    biasIdeaComments,
    setBiasIdeaComments,
  } = useSession()

  const [newIdeaInput, setNewIdeaInput] = useState('')
  const [isBiasCommentOpen, setIsBiasCommentOpen] = useState(false)
  const [activeIdeaForComment, setActiveIdeaForComment] = useState<string | null>(null)
  const [ideaCommentDraft, setIdeaCommentDraft] = useState('')
  const decision = biasDecisions[bias.id]
  const userIdeas = biasUserIdeas[bias.id] || []
  const biasComment = biasComments[bias.id] || ''
  const ideaCommentsForBias = biasIdeaComments[bias.id] || {}

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

  const handleBiasCommentChange = (value: string) => {
    setBiasComments((prev) => {
      const next = { ...prev }
      if (value.trim()) {
        next[bias.id] = value
      } else {
        delete next[bias.id]
      }
      return next
    })
  }

  const openIdeaCommentEditor = (idea: string) => {
    setActiveIdeaForComment(idea)
    setIdeaCommentDraft(ideaCommentsForBias[idea] || '')
  }

  const handleSaveIdeaComment = () => {
    if (!activeIdeaForComment) return
    const trimmed = ideaCommentDraft.trim()
    setBiasIdeaComments((prev) => {
      const next = { ...prev }
      const currentForBias = next[bias.id] || {}
      const updatedForBias = { ...currentForBias }
      if (trimmed) {
        updatedForBias[activeIdeaForComment] = trimmed
      } else {
        delete updatedForBias[activeIdeaForComment]
      }
      if (Object.keys(updatedForBias).length > 0) {
        next[bias.id] = updatedForBias
      } else {
        delete next[bias.id]
      }
      return next
    })
    setActiveIdeaForComment(null)
    setIdeaCommentDraft('')
  }

  return (
    <div
      className={`
        flex w-full max-w-2xl flex-col rounded-xl border border-gray-600 bg-gray-700/50 p-6 shadow-sm
        transition
        ${isRejected ? 'opacity-50 grayscale' : ''}
      `}
    >
      <h3 className="mb-2 text-base font-semibold text-gray-200">{bias.title}</h3>
      <p className="mb-2 text-sm text-gray-300 whitespace-pre-line">{bias.explanation}</p>

      <div className="mb-4 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setIsBiasCommentOpen((prev) => !prev)}
          className="flex items-center gap-1 text-xs text-gray-300 hover:text-white transition"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 10h8M8 14h5m-9 4l2-2h11a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12z"
            />
          </svg>
          <span>{biasComment ? 'Edit your note on this bias' : 'Add a note on this bias'}</span>
        </button>
        {biasComment && (
          <span className="text-[10px] uppercase tracking-wide text-purple-300">
            Note saved
          </span>
        )}
      </div>

      {(isBiasCommentOpen || biasComment) && (
        <div className="mb-4">
          <textarea
            value={biasComment}
            onChange={(e) => handleBiasCommentChange(e.target.value)}
            placeholder="How does this bias land for you? What feels accurate or off?"
            className="w-full px-3 py-2 text-sm rounded-md border border-gray-500 bg-gray-700 text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-gray-400 resize-vertical"
            rows={3}
          />
        </div>
      )}

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
              const hasComment = !!ideaCommentsForBias[idea]
              return (
                <div key={idea} className="flex items-center gap-1">
                  <button
                    onClick={() => handleToggleIdea(idea)}
                    className={`px-4 py-2 rounded-full text-sm transition ${
                      isAdded
                        ? 'bg-gray-600 text-gray-400 border border-gray-500'
                        : 'bg-purple-600 text-white hover:bg-purple-700'
                    }`}
                  >
                    {idea}
                  </button>
                  <button
                    type="button"
                    onClick={() => openIdeaCommentEditor(idea)}
                    className={`flex items-center justify-center rounded-full border w-7 h-7 text-xs transition ${
                      hasComment
                        ? 'border-purple-400 text-purple-200 bg-purple-600/20'
                        : 'border-gray-500 text-gray-300 hover:border-purple-400 hover:text-purple-200'
                    }`}
                    aria-label="Add comment on this idea"
                    title="Add comment on this idea"
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 10h8M8 14h5m-9 4l2-2h11a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12z"
                      />
                    </svg>
                  </button>
                </div>
              )
            })}
            {/* User's own ideas (blue) */}
            {userIdeas.map((idea) => {
              const isAdded = myIdeas.includes(idea)
              const hasComment = !!ideaCommentsForBias[idea]
              return (
                <div key={idea} className="flex items-center gap-1">
                  <button
                    onClick={() => handleRemoveUserIdea(idea)}
                    className={`px-4 py-2 rounded-full text-sm transition ${
                      isAdded
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-600 text-gray-400 border border-gray-500'
                    }`}
                  >
                    {idea}
                  </button>
                  <button
                    type="button"
                    onClick={() => openIdeaCommentEditor(idea)}
                    className={`flex items-center justify-center rounded-full border w-7 h-7 text-xs transition ${
                      hasComment
                        ? 'border-blue-400 text-blue-200 bg-blue-600/20'
                        : 'border-gray-500 text-gray-300 hover:border-blue-400 hover:text-blue-200'
                    }`}
                    aria-label="Add comment on this idea"
                    title="Add comment on this idea"
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 10h8M8 14h5m-9 4l2-2h11a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12z"
                      />
                    </svg>
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {activeIdeaForComment && (
        <div className="mt-4 border-t border-gray-600 pt-3">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <p className="text-xs text-gray-300">Your note on this idea for this bias:</p>
              <p className="text-xs text-purple-200 font-medium">
                “{activeIdeaForComment}”
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setActiveIdeaForComment(null)
                setIdeaCommentDraft('')
              }}
              className="text-[10px] text-gray-400 hover:text-gray-200 transition"
            >
              Close
            </button>
          </div>
          <textarea
            value={ideaCommentDraft}
            onChange={(e) => setIdeaCommentDraft(e.target.value)}
            placeholder="What do you like or not like about this idea, given this bias?"
            className="w-full px-3 py-2 text-sm rounded-md border border-gray-500 bg-gray-700 text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-gray-400 resize-vertical"
            rows={3}
          />
          <div className="mt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setIdeaCommentDraft('')
                handleSaveIdeaComment()
              }}
              className="px-3 py-1 text-xs rounded-md border border-gray-500 text-gray-300 hover:bg-gray-600 transition"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleSaveIdeaComment}
              className="px-4 py-1.5 text-xs bg-purple-600 text-white rounded-md hover:bg-purple-700 transition"
            >
              Save Note
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

