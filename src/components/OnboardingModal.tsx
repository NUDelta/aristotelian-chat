import { useState, useEffect, useCallback } from 'react'

const ONBOARDING_STORAGE_KEY = 'aristotelian-chat-onboarding-seen'

// Extend Window interface for onboarding modal function
declare global {
  interface Window {
    openOnboardingModal?: () => void
  }
}

export function OnboardingModal() {
  // Initialize state based on localStorage - lazy initializer to avoid setState in effect
  const [isOpen, setIsOpen] = useState(() => {
    const hasSeenOnboarding = localStorage.getItem(ONBOARDING_STORAGE_KEY) === 'true'
    return !hasSeenOnboarding
  })

  const handleClose = useCallback(() => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true')
    setIsOpen(false)
  }, [])

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, handleClose])

  // Expose function to manually open modal (for help button)
  useEffect(() => {
    const openModal = () => {
      setIsOpen(true)
    }
    window.openOnboardingModal = openModal
    return () => {
      delete window.openOnboardingModal
    }
  }, [])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-100">
              Welcome to Aristotelian<span className="text-blue-400">Chat</span>
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-200 transition"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="space-y-6 text-gray-300">
            {/* How it works */}
            <section>
              <h3 className="text-lg font-semibold text-gray-100 mb-2">How It Works</h3>
              <p className="text-sm leading-relaxed">
                This tool helps you explore human experiences through <strong className="text-gray-200">your unique perspective</strong>. 
                The AI asks questions to understand what the experience means to <em>you</em> personally, 
                then helps you <strong className="text-gray-200">broaden your worldview</strong> and 
                <strong className="text-gray-200"> discover new insights</strong>.
              </p>
            </section>

            {/* Tab 1 */}
            <section>
              <h3 className="text-lg font-semibold text-gray-100 mb-2">Tab 1: Define Experience</h3>
              <ul className="text-sm space-y-2 list-disc list-inside ml-2">
                <li>Enter an experience you want to explore (e.g., "finding peace")</li>
                <li>The AI will ask questions one at a time to understand your perspective</li>
                <li>Answer naturally - there are no right or wrong answers. It is ok to say you don't know or you don't have an answer.</li>
                <li>
                  <strong className="text-gray-200">The conversation will automatically summarize when it feels you have provided enough information for the AI to understand your perspective</strong>, 
                  or you can click "Summarize Now" at any time if you want to move forward
                </li>
              </ul>
            </section>

            {/* Tab 2 */}
            <section>
              <h3 className="text-lg font-semibold text-gray-100 mb-2">Tab 2: Generate Ideas</h3>
              <ul className="text-sm space-y-2 list-disc list-inside ml-2">
                <li>
                  <strong className="text-gray-200">Add your own ideas first:</strong> Think of specific activities, 
                  places, or experiences related to your interpretation (e.g., "meditation class", "quiet beach", "morning journaling")
                </li>
                <li>Click "Generate More Ideas" to get AI suggestions that extend your themes</li>
                <li>Click any idea to add it to your list</li>
                <li>Ideas are color-coded: <span className="text-blue-400">blue</span> (your ideas), 
                  <span className="text-green-400"> green</span> (AI suggestions), 
                  <span className="text-purple-400"> purple</span> (bias-challenging ideas)
                </li>
              </ul>
            </section>

            {/* Tab 3 */}
            <section>
              <h3 className="text-lg font-semibold text-gray-100 mb-2">Tab 3: Challenge Internal Patterns</h3>
              <ul className="text-sm space-y-2 list-disc list-inside ml-2">
                <li>After generating ideas, the AI will identify potential biases in your thinking</li>
                <li>Review each bias and decide if it resonates with you or not</li>
                <li>If a bias resonates, you&apos;ll see ideas that challenge that assumption</li>
                <li>
                  <strong className="text-gray-200">After seeing bias-challenging ideas, you can add your own ideas</strong> that 
                  you think of from seeing that bias - just type them in the input box that appears
                </li>
                <li>These ideas will appear in blue and be added to your list on Tab 2</li>
              </ul>
            </section>
          </div>

          {/* Footer */}
          <div className="mt-6 pt-6 border-t border-gray-700 flex justify-end">
            <button
              onClick={handleClose}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
            >
              Got it!
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

