# Separation of Concerns Analysis

## Overall Assessment: ⚠️ **Moderate** - Some good patterns, but significant violations

The codebase has a reasonable structure but mixes concerns in several areas. For a prototype, this is acceptable, but would need refactoring for production.

---

## ✅ **Well-Separated Concerns**

### 1. **State Management** ✅

- **Location**: `src/context/SessionContext.tsx`
- **Status**: Good separation
- **What's good**:
  - All application state centralized in one context
  - Clear separation between UI state and business state
  - State management logic isolated from components

### 2. **Utility Functions** ✅

- **Locations**: `src/utils/`
  - `parseModelOutput.ts` - Response parsing logic
  - `messageUtils.ts` - Message creation utilities
  - `validation.ts` - Validation utilities
  - `exportUtils.ts` - Export/import functionality (NEW)
- **Status**: Good separation
- **What's good**:
  - Pure functions, no side effects
  - Reusable across components
  - Easy to test
  - Export/import utilities properly separated from UI components

### 3. **Component Structure** ✅

- **Status**: Good separation
- **What's good**:
  - Components are focused on UI rendering
  - Clear component hierarchy
  - Presentation components separated (BiasCard, MessageBubble, OnboardingModal, HelpButton)
  - Export/Import functionality separated into dedicated component

### 4. **API Endpoint** ✅

- **Location**: `api/chat.ts`
- **Status**: Good separation
- **What's good**:
  - Server-side logic separate from client
  - Request validation isolated
  - Error handling centralized

---

## ⚠️ **Separation Violations**

### 1. **API Calls in Components** ❌ **CRITICAL**

**Problem**: Components directly handle HTTP requests, response parsing, and error handling

**Locations**:

- `Tab1DefineExperience.tsx`: `sendMessage()` function (lines 25-138)
- `Tab2GenerateIdeas.tsx`: `handleGenerateMore()` function (lines 39-109)
- `Tab3ChallengeBiases.tsx`: `handleAnalyze()` function (lines 22-94)

**What's mixed**:

- HTTP request logic (`fetch()`)
- Request payload construction
- Response validation
- Response parsing (`parseModelOutput()`)
- Error handling
- State updates
- UI concerns (loading states, alerts)

**Impact**:

- Hard to test business logic
- Duplicated code across 3 components
- Changes to API require updating multiple files
- Components are too large and complex

**Fix**: Extract to service layer

```typescript
// src/services/chatApi.ts
export const chatApi = {
  defineExperience: async (params) => { ... },
  generateIdeas: async (params) => { ... },
  challengeBiases: async (params) => { ... }
}
```

---

### 2. **Business Logic in Components** ❌ **HIGH PRIORITY**

**Problem**: Components contain business logic that should be in services/utilities

**Examples**:

**Tab1DefineExperience.tsx**:

- History conversion: `tab1History.map(({ id, ...msg }) => ({ role, content }))`
- Response validation logic
- Summary extraction and state management
- Auto-start conversation logic (useEffect with complex conditions)

**Tab2GenerateIdeas.tsx**:

- History conversion (duplicated)
- Response validation (duplicated)
- Idea deduplication logic
- State coordination between myIdeas and allSuggestedIdeas

**Tab3ChallengeBiases.tsx**:

- History conversion (duplicated)
- Response validation (duplicated)
- Bias extraction and validation
- Auto-analysis trigger logic

**Impact**:

- Components are 200-350 lines (should be < 100)
- Business logic hard to test
- Logic duplicated across components
- Changes require updating multiple files

**Fix**: Extract to services/hooks

```typescript
// src/services/historyService.ts
export function convertHistoryForAPI(history: ChatMessage[]) { ... }

// src/hooks/useChatApi.ts
export function useChatApi() {
  const sendMessage = async (...) => { ... }
  return { sendMessage, isLoading, error }
}
```

---

### 3. **Data Transformation in Components** ⚠️ **MEDIUM PRIORITY**

**Problem**: Components handle data format conversions

**Locations**:

- All three tabs convert `ChatMessage[]` to API format
- Components parse and extract data from API responses
- Components handle data validation

**Example**:

```typescript
// Repeated in all 3 tabs:
const historyForAPI = (tab1History || []).map(({ id, ...msg }) => ({
  role: msg.role,
  content: msg.content,
}));
```

**Impact**:

- Duplication
- Inconsistent transformations
- Hard to change API contract

**Fix**: Extract to service

```typescript
// src/services/chatService.ts
export function prepareHistoryForAPI(history: ChatMessage[]) { ... }
export function parseChatResponse(response: Response) { ... }
```

---

### 4. **Error Handling Mixed with Business Logic** ⚠️ **MEDIUM PRIORITY**

**Problem**: Error handling logic scattered throughout components

**What's mixed**:

- Error extraction from responses
- Error message formatting
- User notification (alerts)
- Abort signal handling
- Loading state management

**Example from Tab2GenerateIdeas.tsx**:

```typescript
if (!response.ok) {
  let errorMessage = "Failed to generate ideas";
  try {
    const errorData = await response.json();
    errorMessage = errorData.message || errorData.error || errorMessage;
  } catch {
    errorMessage = response.statusText || errorMessage;
  }
  throw new Error(errorMessage);
}
```

**Impact**:

- Inconsistent error handling
- Hard to standardize error messages
- Error handling logic duplicated

**Fix**: Centralize error handling

```typescript
// src/utils/errorHandling.ts
export function extractErrorFromResponse(response: Response) { ... }
export function handleApiError(error: unknown) { ... }
```

---

### 5. **State Update Logic in Components** ⚠️ **LOW PRIORITY**

**Problem**: Components directly manipulate multiple state variables

**Examples**:

- `Tab1DefineExperience.tsx`: Updates `tab1History`, `tab1Summary`, `isFinishedTab1`
- `Tab2GenerateIdeas.tsx`: Updates `myIdeas`, `allSuggestedIdeas`
- `BiasCard.tsx`: Updates `myIdeas`, `allSuggestedIdeas`, `tab3ChallengingIdeas`, `biasDecisions`

**Impact**:

- State updates scattered
- Easy to introduce bugs (state out of sync)
- Hard to reason about state changes

**Fix**: Extract to custom hooks or services

```typescript
// src/hooks/useIdeas.ts
export function useIdeas() {
  const addIdea = (idea: string, source: 'user' | 'ai' | 'bias') => { ... }
  return { addIdea, removeIdea, ... }
}
```

---

## 📊 **Architecture Layers (Current vs. Ideal)**

### Current Architecture:

```
Components (UI + Business Logic + API Calls)
    ↓
Context (State Management)
    ↓
Utils (Pure Functions)
    ↓
API Endpoint
```

### Ideal Architecture:

```
Components (UI Only)
    ↓
Hooks (React-specific logic)
    ↓
Services (Business Logic + API Calls)
    ↓
Context (State Management)
    ↓
Utils (Pure Functions)
    ↓
API Endpoint
```

---

## 🔧 **Recommended Refactoring (Priority Order)**

### Phase 1: Extract API Service (High Impact)

1. Create `src/services/chatApi.ts`
   - Move all `fetch()` calls
   - Centralize request/response handling
   - Standardize error handling

### Phase 2: Extract Business Logic (High Impact)

2. Create `src/services/chatService.ts`

   - History conversion
   - Response parsing coordination
   - Data transformation

3. Create custom hooks:
   - `useChatApi()` - API calls with loading/error states
   - `useIdeas()` - Ideas management
   - `useBiasAnalysis()` - Bias analysis logic

### Phase 3: Improve Error Handling (Medium Impact)

4. Create `src/utils/errorHandling.ts`
   - Standardize error extraction
   - User-friendly error messages
   - Error logging

### Phase 4: State Management (Low Impact)

5. Consider consolidating related state
   - Ideas state could be unified
   - Bias state management

---

## 📈 **Metrics**

### Component Complexity:

- `Tab1DefineExperience.tsx`: **358 lines** (should be < 150)
- `Tab2GenerateIdeas.tsx`: **232 lines** (should be < 150)
- `Tab3ChallengeBiases.tsx`: **224 lines** (should be < 150)

### Code Duplication:

- History conversion: **3 instances**
- Error handling pattern: **3 instances**
- Response validation: **3 instances**
- API call structure: **3 instances**

### Separation Score: **6/10**

- ✅ State management: 9/10
- ✅ Utilities: 8/10
- ⚠️ Components: 5/10 (too much business logic)
- ❌ API layer: 4/10 (no service abstraction)
- ⚠️ Error handling: 5/10 (scattered)

---

## ✅ **For Prototype: Acceptable**

The current separation is **acceptable for a prototype** because:

- Code is functional and works
- Structure is understandable
- Not overly complex for the scope
- Can be refactored incrementally

**However**, for production, you should:

1. Extract API service layer (prevents bugs from duplication)
2. Extract business logic hooks (makes testing easier)
3. Centralize error handling (improves UX consistency)
