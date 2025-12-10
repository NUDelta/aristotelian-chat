import { useState } from 'react'
import { SessionProvider } from './context/SessionContext'
import { useSession } from './context/useSession'
import { ExperienceInput } from './components/ExperienceInput'
import { Tab1DefineExperience } from './components/Tabs/Tab1DefineExperience'
import { Tab2GenerateIdeas } from './components/Tabs/Tab2GenerateIdeas'
import { Tab3ChallengeBiases } from './components/Tabs/Tab3ChallengeBiases'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ExportButton } from './components/ExportButton'
import { OnboardingModal } from './components/OnboardingModal'
import { HelpButton } from './components/HelpButton'

function AppContent() {
  const [activeTab, setActiveTab] = useState<'tab1' | 'tab2' | 'tab3'>('tab1')
  const { tab1Summary } = useSession()

  const isTab2Enabled = tab1Summary !== null
  const isTab3Enabled = tab1Summary !== null

  return (
    <div className="flex h-screen flex-col bg-gray-900 text-gray-100">
      <OnboardingModal />
      {/* Header Section */}
      <header className="shrink-0 border-b border-gray-700 bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-100 shrink-0">
              Aristotelian<span className="text-blue-400">Chat</span>
            </h1>
            <div className="flex-1 min-w-0">
              <ExperienceInput onExperienceSubmitted={() => setActiveTab('tab1')} />
            </div>
            <div className="shrink-0 flex items-center gap-2">
              <HelpButton />
              <ExportButton onImportComplete={() => setActiveTab('tab1')} />
            </div>
          </div>
        </div>
      </header>
      
      {/* Tabs Navigation */}
      <nav className="shrink-0 border-b border-gray-700 bg-gray-800">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('tab1')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'tab1'
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Tab 1: Define Experience
            </button>
            <button
              onClick={() => setActiveTab('tab2')}
              disabled={!isTab2Enabled}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'tab2'
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : isTab2Enabled
                  ? 'text-gray-400 hover:text-gray-200'
                  : 'text-gray-600 cursor-not-allowed'
              }`}
            >
              Tab 2: Generate Ideas
            </button>
            <button
              onClick={() => setActiveTab('tab3')}
              disabled={!isTab3Enabled}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'tab3'
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : isTab3Enabled
                  ? 'text-gray-400 hover:text-gray-200'
                  : 'text-gray-600 cursor-not-allowed'
              }`}
            >
              Tab 3: Challenge Biases
            </button>
          </div>
        </div>
      </nav>

      {/* Tab Content */}
      <main className="flex-1 overflow-hidden">
        <ErrorBoundary>
          {activeTab === 'tab1' && <Tab1DefineExperience />}
          {activeTab === 'tab2' && <Tab2GenerateIdeas />}
          {activeTab === 'tab3' && <Tab3ChallengeBiases />}
        </ErrorBoundary>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <SessionProvider>
        <AppContent />
      </SessionProvider>
    </ErrorBoundary>
  )
}
