import { useState, useRef } from 'react'
import { useSession } from '../context/useSession'

type ExportButtonProps = {
  onImportComplete?: () => void
}
import {
  formatSessionForExport,
  downloadJSON,
  copyToClipboard,
  generateExportFilename,
  validateImportData,
  convertImportToSessionData,
  readFileAsText,
} from '../utils/exportUtils'

export function ExportButton({ onImportComplete }: ExportButtonProps = {}) {
  const {
    experience,
    tab1History,
    tab1Summary,
    myIdeas,
    allSuggestedIdeas,
    tab3ChallengingIdeas,
    biases,
    biasDecisions,
    biasUserIdeas,
    ideaComments,
    importSession,
  } = useSession()

  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const hasDataToExport =
    experience.trim() !== '' ||
    tab1History.length > 0 ||
    tab1Summary !== null ||
    myIdeas.length > 0 ||
    allSuggestedIdeas.length > 0 ||
    Object.keys(ideaComments).length > 0 ||
    (biases && biases.length > 0)

  const handleExport = async (action: 'download' | 'copy') => {
    if (!hasDataToExport) {
      alert('No data to export')
      return
    }

    setIsExporting(true)
    try {
      const exportData = formatSessionForExport({
        experience,
        tab1History,
        tab1Summary,
        myIdeas,
        allSuggestedIdeas,
        tab3ChallengingIdeas,
        biases,
        biasDecisions,
        biasUserIdeas,
        ideaComments,
      })

      const jsonString = JSON.stringify(exportData, null, 2)

      if (action === 'download') {
        const filename = generateExportFilename(experience)
        downloadJSON(jsonString, filename)
      } else {
        await copyToClipboard(jsonString)
        alert('Copied to clipboard!')
      }
    } catch (error) {
      console.error('Export failed:', error)
      alert('Failed to export. Please try again.')
    } finally {
      setIsExporting(false)
      setShowMenu(false)
    }
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
    setShowMenu(false)
  }

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsImporting(true)
    try {
      const fileContent = await readFileAsText(file)
      const parsed = JSON.parse(fileContent)
      const validated = validateImportData(parsed)

      if (!validated) {
        alert('Invalid file format. Please select a valid exported session file.')
        return
      }

      // Confirm before importing (will overwrite current session)
      const confirmMessage = hasDataToExport
        ? 'This will replace your current session. Are you sure you want to continue?'
        : 'Import this session?'
      
      if (!window.confirm(confirmMessage)) {
        return
      }

      const sessionData = convertImportToSessionData(validated)
      importSession(sessionData)
      alert('Session imported successfully!')
      onImportComplete?.()
    } catch (error) {
      console.error('Import failed:', error)
      alert('Failed to import session. Please check that the file is a valid exported session.')
    } finally {
      setIsImporting(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <div className="relative">
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileImport}
        className="hidden"
        aria-label="Import session file"
      />
      <button
        onClick={() => setShowMenu(!showMenu)}
        disabled={isExporting || isImporting}
        className="px-4 py-2 bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
        aria-label={hasDataToExport ? 'Export/Import session' : 'Import session'}
      >
        {hasDataToExport ? (
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        ) : (
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
            />
          </svg>
        )}
        <span className="text-sm">{hasDataToExport ? 'Export/Import' : 'Import'}</span>
      </button>

      {showMenu && (
        <>
          {/* Backdrop to close menu */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowMenu(false)}
          />
          {/* Menu */}
          <div className="absolute right-0 mt-2 w-56 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-20 overflow-hidden">
            {hasDataToExport && (
              <>
                <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase border-b border-gray-700">
                  Export
                </div>
                <button
                  onClick={() => handleExport('download')}
                  disabled={isExporting || isImporting}
                  className="w-full px-4 py-2 text-left text-sm text-gray-200 hover:bg-gray-700 transition flex items-center gap-2 disabled:opacity-50"
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
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  {isExporting ? 'Exporting...' : 'Download JSON'}
                </button>
                <button
                  onClick={() => handleExport('copy')}
                  disabled={isExporting || isImporting}
                  className="w-full px-4 py-2 text-left text-sm text-gray-200 hover:bg-gray-700 transition flex items-center gap-2 disabled:opacity-50"
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
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  {isExporting ? 'Copying...' : 'Copy to Clipboard'}
                </button>
                <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase border-t border-b border-gray-700">
                  Import
                </div>
              </>
            )}
            {!hasDataToExport && (
              <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase border-b border-gray-700">
                Import
              </div>
            )}
            <button
              onClick={handleImportClick}
              disabled={isExporting || isImporting}
              className="w-full px-4 py-2 text-left text-sm text-gray-200 hover:bg-gray-700 transition flex items-center gap-2 disabled:opacity-50"
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
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                />
              </svg>
              {isImporting ? 'Importing...' : 'Import JSON File'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

