export function HelpButton() {
  const handleClick = () => {
    // Open onboarding modal if available
    if (typeof window.openOnboardingModal === 'function') {
      window.openOnboardingModal()
    }
  }

  return (
    <button
      onClick={handleClick}
      className="p-2 bg-gray-700 text-gray-200 rounded-full hover:bg-gray-600 transition flex items-center justify-center"
      aria-label="Show help and information"
      title="How it works - Click for help"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    </button>
  )
}

