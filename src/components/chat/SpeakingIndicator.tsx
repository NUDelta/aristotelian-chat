import { useEffect, useState } from 'react'

type SpeakingIndicatorProps = {
  isUserSpeaking: boolean
  isAISpeaking: boolean
}

export function SpeakingIndicator({ 
  isUserSpeaking, 
  isAISpeaking, 
}: SpeakingIndicatorProps) {
  const [audioLevel, setAudioLevel] = useState(0)

  // Simulate audio level animation for user speaking
  useEffect(() => {
    if (!isUserSpeaking) {
      setAudioLevel(0)
      return
    }

    const interval = setInterval(() => {
      setAudioLevel(0.3 + Math.random() * 0.7)
    }, 100)

    return () => clearInterval(interval)
  }, [isUserSpeaking])

  if (!isUserSpeaking && !isAISpeaking) {
    return null
  }

  return (
    <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-gray-800 rounded-lg shadow-lg px-6 py-4 border border-gray-700">
        {isUserSpeaking && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              {/* Animated microphone with pulsing rings */}
              <div className="relative">
                <svg 
                  className="w-6 h-6 text-red-500" 
                  fill="currentColor" 
                  viewBox="0 0 20 20"
                >
                  <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                </svg>
                {/* Pulsing rings */}
                <div className="absolute inset-0 -m-2">
                  <div 
                    className="absolute inset-0 rounded-full border-2 border-red-500 animate-ping opacity-75"
                    style={{ animationDuration: '1s' }}
                  />
                  <div 
                    className="absolute inset-0 rounded-full border-2 border-red-500 animate-ping opacity-50"
                    style={{ animationDuration: '1.5s', animationDelay: '0.3s' }}
                  />
                </div>
              </div>
            </div>
            
            {/* Audio level bars */}
            <div className="flex items-end gap-1 h-6">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-red-500 rounded-full transition-all duration-100"
                  style={{
                    height: `${(audioLevel * (0.5 + (i % 2) * 0.5)) * 100}%`,
                    minHeight: isUserSpeaking ? '20%' : '0%',
                  }}
                />
              ))}
            </div>

            <span className="text-sm text-gray-300 ml-2">You are speaking...</span>
          </div>
        )}

        {isAISpeaking && !isUserSpeaking && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              {/* Animated speaker icon with sound waves */}
              <svg 
                className="w-6 h-6 text-blue-500 animate-pulse" 
                fill="currentColor" 
                viewBox="0 0 20 20"
              >
                <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.793L4.383 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.383l4-3.617a1 1 0 011.617.793zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
              </svg>
              {/* Sound wave animation */}
              <div className="flex items-center gap-1 ml-2">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1 bg-blue-500 rounded-full animate-pulse"
                    style={{
                      height: `${20 + i * 10}px`,
                      animationDelay: `${i * 0.2}s`,
                      animationDuration: '0.8s',
                    }}
                  />
                ))}
              </div>
            </div>
            <span className="text-sm text-gray-300">AI is speaking...</span>
          </div>
        )}
      </div>
    </div>
  )
}



