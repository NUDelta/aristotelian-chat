Analyzing the current architecture to identify areas for flexibility:

[4 tools called]

Here are recommendations to make the design more flexible for future changes:

## Architecture flexibility recommendations

### 1. Extract prompts to a configuration system

**Current issue:** Prompts are hardcoded in `api/chat.ts` as template strings.

**Solution:** Create a prompts configuration system:

```typescript
// src/config/prompts.ts
export type PromptConfig = {
  systemPrompt: (context: PromptContext) => string
  userMessage?: (context: PromptContext) => string
  requiredContext?: string[]
}

export type PromptContext = {
  experience: string
  history?: ChatMessage[]
  myIdeas?: string[]
  allSuggestedIdeas?: string[]
  [key: string]: unknown // Allow extensibility
}

export const PROMPTS: Record<string, PromptConfig> = {
  'define-experience': {
    systemPrompt: (ctx) => `You are helping the user define what the human experience of "${ctx.experience}" means to them...`,
    requiredContext: ['experience']
  },
  'generate-ideas': {
    systemPrompt: (ctx) => `You are generating new ideas...`,
    userMessage: () => 'Generate new ideas...',
    requiredContext: ['experience', 'myIdeas', 'allSuggestedIdeas']
  },
  // Easy to add new prompts here
}
```

**Benefits:**
- Change prompts without touching API code
- Version prompts
- A/B test different prompts
- Load prompts from external sources

### 2. Create a tab registry/configuration system

**Current issue:** Tabs are hardcoded in `App.tsx` with manual enable/disable logic.

**Solution:** Create a tab configuration system:

```typescript
// src/config/tabs.ts
export type TabConfig = {
  id: string
  label: string
  component: React.ComponentType
  enabled: (session: SessionState) => boolean
  order: number
}

export const TAB_CONFIGS: TabConfig[] = [
  {
    id: 'define-experience',
    label: 'Tab 1: Define Experience',
    component: Tab1DefineExperience,
    enabled: (session) => true, // Always enabled
    order: 1
  },
  {
    id: 'generate-ideas',
    label: 'Tab 2: Generate Ideas',
    component: Tab2GenerateIdeas,
    enabled: (session) => session.tab1Summary !== null,
    order: 2
  },
  {
    id: 'challenge-biases',
    label: 'Tab 3: Challenge Internal Patterns',
    component: Tab3ChallengeBiases,
    enabled: (session) => session.tab1Summary !== null && session.allSuggestedIdeas.length > 0,
    order: 3
  }
]
```

**Benefits:**
- Add/remove/reorder tabs by updating config
- Dynamic tab rendering
- Centralized enable/disable logic
- Easy to conditionally show tabs

### 3. Make state management generic

**Current issue:** SessionContext has hardcoded `tab1History`, `tab2...`, etc.

**Solution:** Use a generic tab-based state store:

```typescript
// src/context/SessionContext.tsx
type TabState = {
  [key: string]: unknown // Generic state per tab
}

type SessionContextType = {
  experience: string
  setExperience: (v: string) => void
  
  // Generic tab state
  getTabState: <T>(tabId: string) => T | undefined
  setTabState: <T>(tabId: string, state: T) => void
  
  // Common patterns (can still have typed helpers)
  getTabHistory: (tabId: string) => ChatMessage[]
  setTabHistory: (tabId: string, history: ChatMessage[]) => void
  
  resetSession: () => void
}
```

**Alternative:** Keep typed helpers but make them tab-agnostic:

```typescript
type TabData = {
  history?: ChatMessage[]
  summary?: string | null
  ideas?: string[]
  [key: string]: unknown
}

type SessionContextType = {
  experience: string
  tabs: Record<string, TabData>
  setTabData: (tabId: string, data: Partial<TabData>) => void
  getTabData: (tabId: string) => TabData
}
```

### 4. Make API mode system extensible

**Current issue:** `VALID_MODES` is a hardcoded array, and mode handling uses if/else chains.

**Solution:** Create a mode handler registry:

```typescript
// api/modes/index.ts
export type ModeHandler = {
  name: string
  validateRequest: (body: ChatRequest) => boolean
  buildPrompt: (body: ChatRequest) => { systemPrompt: string; messages: ChatMessage[] }
  parseResponse: (rawText: string) => unknown
}

export const MODE_HANDLERS: Record<string, ModeHandler> = {
  'define-experience': {
    name: 'define-experience',
    validateRequest: (body) => !!body.history,
    buildPrompt: (body) => ({ /* ... */ }),
    parseResponse: (text) => ({ /* ... */ })
  },
  // Easy to add new modes
}

// In api/chat.ts
const handler = MODE_HANDLERS[body.mode]
if (!handler) {
  return res.status(400).json({ error: 'Invalid mode' })
}
```

### 5. Create a workflow configuration

**Current issue:** Workflow steps and dependencies are implicit.

**Solution:** Define workflows explicitly:

```typescript
// src/config/workflows.ts
export type WorkflowStep = {
  id: string
  tabId: string
  mode: string
  dependsOn?: string[] // Step IDs that must complete first
  autoStart?: boolean
}

export const DEFAULT_WORKFLOW: WorkflowStep[] = [
  {
    id: 'define',
    tabId: 'define-experience',
    mode: 'define-experience',
    autoStart: true
  },
  {
    id: 'generate',
    tabId: 'generate-ideas',
    mode: 'generate-ideas',
    dependsOn: ['define']
  },
  {
    id: 'challenge',
    tabId: 'challenge-biases',
    mode: 'challenge-biases',
    dependsOn: ['define', 'generate']
  }
]
```

### 6. Component registry pattern

**Current issue:** Tab components are directly imported in `App.tsx`.

**Solution:** Use lazy loading and a registry:

```typescript
// src/components/Tabs/registry.ts
export const TabComponents = {
  'define-experience': lazy(() => import('./Tab1DefineExperience')),
  'generate-ideas': lazy(() => import('./Tab2GenerateIdeas')),
  'challenge-biases': lazy(() => import('./Tab3ChallengeBiases')),
} as const
```

### Implementation priority

1. High priority:
   - Extract prompts to config (enables prompt changes without code changes)
   - Create tab registry (enables adding tabs easily)

2. Medium priority:
   - Generic state management (enables new tab types without context changes)
   - Mode handler registry (enables new API modes)

3. Low priority:
   - Workflow configuration (useful for complex multi-step flows)
   - Component lazy loading (performance optimization)

### Quick wins

1. Move prompts to `src/config/prompts.ts` — immediate flexibility
2. Create `src/config/tabs.ts` — easy tab management
3. Extract mode validation to a separate file — cleaner API code

These changes make the system more maintainable and extensible. Should I implement any of these?

---

## Recent Additions

### Export/Import System ✅ ADDED

**Status**: ✅ **IMPLEMENTED**

- **Location**: `src/utils/exportUtils.ts`, `src/components/ExportButton.tsx`
- **Features**:
  - Export session data to JSON format
  - Import previously exported sessions
  - Validates imported data structure
  - Restores full session state
- **Extensibility**: 
  - Export format is versioned (`version: "1.0"`)
  - Validation functions can be extended for new data types
  - Import/export utilities are separated from UI components

### Onboarding System ✅ ADDED

**Status**: ✅ **IMPLEMENTED**

- **Location**: `src/components/OnboardingModal.tsx`, `src/components/HelpButton.tsx`
- **Features**:
  - First-time user onboarding modal
  - Always-available help button
  - localStorage-based persistence
- **Extensibility**:
  - Modal content can be easily updated
  - Help system can be extended with context-specific help
  - Can be extended to show different onboarding for different features