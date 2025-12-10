import { useState, useEffect } from 'react'
import { useSession } from '../context/useSession'

type ExperienceInputProps = {
  onExperienceSubmitted?: () => void
}

export function ExperienceInput({ onExperienceSubmitted }: ExperienceInputProps) {
  const { experience, setExperience, resetSession } = useSession()
  const [draftExperience, setDraftExperience] = useState('')

  // Sync draft with experience when experience changes externally
  useEffect(() => {
    if (experience) {
      setDraftExperience(experience)
    }
  }, [experience])

  const handleSubmit = () => {
    const value = draftExperience.trim()
    
    if (value) {
      // Reset session before setting new experience
      resetSession()
      // Update global experience
      setExperience(value)
      // Optionally switch to Tab 1
      onExperienceSubmitted?.()
    }
  }

  const handleClear = () => {
    resetSession()
    setExperience('')
    setDraftExperience('')
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !experience) {
      handleSubmit()
    }
  }

  const hasExperience = experience.trim() !== ''

  return (
    <div className="w-full">
      <div className="flex items-center gap-2">
        <label htmlFor="experience" className="text-sm font-medium text-gray-300 shrink-0 whitespace-nowrap">
          I'm exploring the experience of…
        </label>
        <div className="flex-1 relative min-w-0">
          <input
            id="experience"
            type="text"
            value={draftExperience}
            onChange={(e) => !hasExperience && setDraftExperience(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={hasExperience ? undefined : "e.g., 'finding peace', 'feeling accomplished'"}
            disabled={hasExperience}
            className={`w-full rounded-md border border-gray-600 px-3 py-2 bg-gray-700 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500 text-sm ${
              hasExperience ? 'cursor-default opacity-90' : ''
            }`}
          />
        </div>
        {hasExperience ? (
          <button
            onClick={handleClear}
            className="rounded-full p-2 hover:bg-gray-600 transition text-gray-300 hover:text-gray-100"
            aria-label="Clear experience"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!draftExperience.trim()}
            className="rounded-full p-2 hover:bg-gray-600 transition disabled:opacity-50 disabled:cursor-not-allowed text-gray-300 hover:text-gray-100"
            aria-label="Submit experience"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
