# Code Analysis: Best Practices and Violations

## Critical Issues

### Error Handling

**Problem**: Using `alert()` for user-facing errors (15 instances)

- **Impact**: Poor UX, blocks interaction, not accessible, breaks user flow
- **Locations**:
  - Tab1DefineExperience.tsx: lines 27, 33, 126, 229
  - Tab2GenerateIdeas.tsx: lines 41, 103
  - Tab3ChallengeBiases.tsx: lines 24, 72, 81
  - ExportButton.tsx: lines 31, 46, 56, 60, 98, 107, 113, 117 (NEW - includes import functionality)
- **Fix**: Implement a toast/notification system or inline error messages (see StickyNoteBoard example)

### API Error Exposure

**Problem**: api/chat.ts exposes error details to client in development mode

- **Impact**: Security risk, potential information leakage (stack traces, API key status)
- **Location**: api/chat.ts lines 433-436
- **Fix**: Sanitize error messages in production, never expose stack traces to clients

### Console Logging in Production

**Problem**: 19+ instances of console.log/error/warn that will appear in production

- **Impact**: Performance overhead, potential information leakage, cluttered browser console
- **Locations**:
  - Tab1DefineExperience.tsx: 8 instances (debug logs, errors)
  - Tab2GenerateIdeas.tsx: 1 instance
  - Tab3ChallengeBiases.tsx: 2 instances
  - parseModelOutput.ts: 1 instance
  - MessageBubble.tsx: 3 instances
- **Fix**: Use conditional logging based on NODE_ENV or implement a logging service

## High Priority Issues

### Code Duplication

**Problem**: Similar API call patterns repeated across all three tabs

- **Impact**: Maintenance burden, inconsistent error handling, bugs propagate
- **Locations**:
  - Tab1DefineExperience.tsx: sendMessage function
  - Tab2GenerateIdeas.tsx: handleGenerateMore function
  - Tab3ChallengeBiases.tsx: handleAnalyze function
- **Common patterns duplicated**:
  - History conversion: `tab1History.map(({ id, ...msg }) => ({ role, content }))`
  - Error handling: try/catch with abort signal checking
  - Response parsing: parseModelOutput pattern
- **Fix**: Extract to a custom hook (e.g., `useApiCall` or `useChatApi`)

### Missing Error Boundaries ✅ FIXED

**Problem**: No React error boundaries to catch component errors

- **Impact**: Entire app can crash from one component error, poor user experience
- **Status**: ✅ **FIXED** - Added ErrorBoundary component wrapping app and tab content
- **Location**: `src/components/ErrorBoundary.tsx`
- **Implementation**: Error boundaries catch React errors and show user-friendly recovery UI

### Type Safety Gaps ⚠️ PARTIALLY FIXED

**Problem**: Runtime type validation missing for API responses

- **Impact**: Runtime errors from malformed data, no type guarantees
- **Status**: ⚠️ **PARTIALLY FIXED** - Added basic validation for Bias structure and API responses
- **Fixed**:
  - ✅ Bias structure validation in extractBiases()
  - ✅ API response structure validation in all three tabs (checks for object and rawText)
- **Remaining**:
  - parseModelOutput.ts:47 - `as ParsedOutput` without full validation (basic structure check only)
  - api/chat.ts:162 - `as ChatMessage[]` without validation
- **Future Fix**: Add comprehensive runtime type validation using Zod for all types

### Missing Validation for Bias Structure ✅ FIXED

**Problem**: No validation that Bias objects from API match expected structure

- **Impact**: Runtime errors if API returns malformed Bias objects (missing fields, wrong types)
- **Status**: ✅ **FIXED** - Added runtime validation in extractBiases() function
- **Location**: `src/utils/parseModelOutput.ts` - extractBiases() now validates structure
- **Implementation**: Validates required fields (id, title, explanation, challengingIdeas[]) and filters invalid objects

## Medium Priority Issues

### Hardcoded Strings

**Problem**: Magic strings like 'tab1', 'tab2', 'tab3' throughout codebase

- **Impact**: Typos cause bugs, harder to refactor
- **Locations**: App.tsx and tab components
- **Fix**: Extract to constants/enums:
  ```typescript
  export const TABS = {
    DEFINE_EXPERIENCE: "tab1",
    GENERATE_IDEAS: "tab2",
    CHALLENGE_BIASES: "tab3",
  } as const;
  ```

### Missing Accessibility

**Problem**: Missing ARIA labels, keyboard navigation issues

- **Impact**: Poor accessibility for screen readers and keyboard users
- **Locations**:
  - Tab navigation buttons (App.tsx)
  - Form inputs (ExperienceInput, Tab1 textarea)
  - Bias card buttons (BiasCard.tsx)
  - Carousel arrows (Tab3ChallengeBiases.tsx)
  - OnboardingModal (ESC key support added ✅)
  - HelpButton and ExportButton (NEW)
- **Note**: OnboardingModal has ESC key support for closing
- **Fix**:
  - Add proper ARIA labels to all interactive elements
  - Ensure keyboard navigation works (Tab, Enter, Arrow keys)
  - Add focus indicators

### Performance Concerns

**Problem**: MessageBubble re-renders on every message change

- **Impact**: Unnecessary re-renders, potential performance issues with long chat histories
- **Location**: MessageBubble.tsx
- **Fix**: Memoize components with React.memo, use useMemo for expensive computations

### State Management Complexity

**Problem**: Multiple related state arrays (myIdeas, allSuggestedIdeas, tab3ChallengingIdeas, biasUserIdeas) require careful coordination

- **Impact**: Easy to introduce bugs, state can get out of sync
- **Location**: SessionContext.tsx, Tab2GenerateIdeas.tsx, BiasCard.tsx
- **Note**: Added `biasUserIdeas` to track user-added ideas per bias in Tab 3 (NEW)
- **Fix**: Consider consolidating into a single ideas state with metadata (source, type, etc.)

### Inconsistent Error Messages

**Problem**: Different error message styles and formats across components

- **Impact**: Inconsistent user experience
- **Examples**:
  - "Please complete Tab 1 first" vs "Please complete Tab 1 first to generate ideas"
  - "Failed to analyze biases" vs "Failed to generate ideas"
- **Fix**: Standardize error messaging with a centralized error message utility

### Missing JSDoc Comments

**Problem**: Complex functions lack documentation

- **Impact**: Harder to maintain, unclear function contracts
- **Locations**:
  - sendMessage (Tab1DefineExperience.tsx)
  - handleAnalyze (Tab3ChallengeBiases.tsx)
  - handleGenerateMore (Tab2GenerateIdeas.tsx)
  - parseModelOutput (parseModelOutput.ts)
  - exportUtils.ts functions (validateImportData, convertImportToSessionData) (NEW)
- **Fix**: Add JSDoc for public APIs, complex functions, and utility functions

### Missing Loading States

**Problem**: No skeleton loaders during initial data fetch

- **Impact**: Poor perceived performance, unclear when app is loading
- **Fix**: Add skeleton loaders for:
  - Initial conversation start (Tab1)
  - Bias analysis loading (Tab3)
  - Ideas generation (Tab2)

### Export/Import Functionality ✅ ADDED

**Status**: ✅ **ADDED** - Export and Import functionality implemented

- **Location**: `src/components/ExportButton.tsx`, `src/utils/exportUtils.ts`
- **Export Features**:
  - Export entire session as JSON
  - Download as file or copy to clipboard
  - Includes all conversation, ideas, and bias analysis data
- **Import Features**:
  - Import previously exported sessions
  - Validates JSON structure before importing
  - Restores all session data (conversation, ideas, biases, decisions)
  - Button shows "Import" when no data exists, "Export/Import" when data exists
  - Confirms before overwriting current session
- **Implementation**:
  - `validateImportData()` validates imported JSON structure
  - `convertImportToSessionData()` converts export format back to session format
  - `importSession()` function in SessionContext restores all state

## Low Priority Issues

### Magic Numbers

**Problem**: Hardcoded timeouts and delays

- **Location**: MessageBubble.tsx (if still exists)
- **Fix**: Extract to named constants

### Missing Prop Validation

**Problem**: No runtime prop validation for component props

- **Impact**: Runtime errors from invalid props
- **Fix**: Consider PropTypes or runtime validation for critical components

### useEffect Dependency Warnings

**Problem**: Some useEffect hooks have exhaustive-deps disabled

- **Location**: Tab3ChallengeBiases.tsx:97
- **Impact**: Potential stale closures, missing updates
- **Fix**: Properly manage dependencies or restructure code

### No Request Cancellation on Unmount

**Problem**: API requests may continue after component unmounts

- **Impact**: Memory leaks, state updates on unmounted components
- **Note**: useAbortController hook exists but not consistently used
- **Fix**: Ensure all API calls use abort signals and cleanup on unmount

### Onboarding & Help System ✅ ADDED

**Status**: ✅ **ADDED** - Onboarding and help system implemented

- **Location**: `src/components/OnboardingModal.tsx`, `src/components/HelpButton.tsx`
- **Features**:
  - Onboarding modal shows automatically on first visit
  - Explains system purpose, workflow, and what kind of ideas to enter
  - Help button (info icon) always available in header
  - Modal can be reopened via help button
  - ESC key support for closing modal
  - Uses localStorage to remember if user has seen onboarding
- **Implementation**:
  - Modal explains Tab 1 auto-summary behavior
  - Clarifies what kind of ideas users should enter
  - Explains Tab 3 user ideas functionality
  - Matches app's dark theme design
