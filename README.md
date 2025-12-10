# AristotelianChat

A guided human experience brainstorming chatbot built with Vite + React + TypeScript + TailwindCSS and Vercel Serverless Functions.

## Features

- **Tab 1: Define Experience** - Multi-turn Q&A to understand what a human experience means to the user
- **Tab 2: Generate Ideas** - Expand user-provided ideas with AI suggestions using a chip system
- **Tab 3: Challenge Biases** - Identify biases in thinking and generate ideas that challenge them. Users can also add their own ideas directly in Tab 3
- **Export/Import Session** - Export entire interactions as JSON (download or copy to clipboard) or import previous sessions to review
- **Onboarding & Help** - First-time user onboarding modal and always-available help button

## Tech Stack

- **Frontend**: Vite + React 19 + TypeScript + TailwindCSS
- **Backend**: Vercel Serverless Functions
- **AI**: OpenAI GPT-4o API

## Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn
- OpenAI API key ([Get one here](https://platform.openai.com/api-keys))
- Vercel account (for deployment)

### Getting Your OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign in or create an account
3. Click "Create new secret key"
4. Copy the key (it starts with `sk-` and you won't be able to see it again)
5. **Important**: Keep this key secure and never commit it to version control

### Local Development

1. **Install dependencies**:

   ```bash
   npm install
   ```

2. **Set up environment variables**:

   Create a `.env.local` file in the root directory:

   ```bash
   # In the project root directory
   echo "OPENAI_API_KEY=sk-your-actual-api-key-here" > .env.local
   ```

   Or manually create `.env.local` with:

   ```
   OPENAI_API_KEY=sk-your-actual-api-key-here
   ```

   **Note**: The `.env.local` file is already in `.gitignore` and won't be committed to version control.

3. **Run Vercel dev server** (recommended for full functionality):

   ```bash
   npx vercel dev
   ```

   This will:

   - Start the Vite dev server (usually on `http://localhost:5173`)
   - Start the serverless functions (usually on `http://localhost:3000`)
   - Automatically load environment variables from `.env.local` and `.env`

   **First time setup**: Vercel CLI will prompt you to link your project. You can:

   - Press Enter to skip linking (works fine for local dev)
   - Or link to an existing Vercel project if you have one

4. **Verify it's working**:

   - Open `http://localhost:5173` in your browser
   - Enter an experience (e.g., "finding peace")
   - You should see the AI's first question appear

5. **Alternative: Vite dev server only** (for frontend-only development):

   ```bash
   npm run dev
   ```

   **Note**: API calls will fail in this mode unless you have a separate backend running. Use `npx vercel dev` for full functionality.

### Troubleshooting

**Issue: "Missing credentials" or "OPENAI_API_KEY is not set"**

- **Solution 1**: Make sure `.env.local` exists in the project root (same directory as `package.json`)
- **Solution 2**: Restart `vercel dev` after creating/updating `.env.local`
- **Solution 3**: Create a `.env` file as backup (Vercel dev loads both):
  ```bash
  cp .env.local .env
  ```
- **Solution 4**: Verify the API key format - it should start with `sk-` and have no extra spaces or quotes

**Issue: "500 Internal Server Error"**

- Check the Vercel dev terminal for detailed error messages
- Verify your OpenAI API key is valid and has credits
- Check that the API key doesn't have extra spaces or quotes around it

**Issue: Vercel dev not loading environment variables**

- Make sure `.env.local` is in the project root directory
- Restart `vercel dev` completely (stop with Ctrl+C and restart)
- Check Vercel dev output for "Loaded env from .env.local" message

### Building for Production

```bash
npm run build
```

The build output will be in the `dist/` directory.

## Deployment to Vercel

1. **Push your code to GitHub**

2. **Connect to Vercel**:

   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Vercel will auto-detect the Vite configuration

3. **Add Environment Variable**:

   - Go to your Vercel project dashboard
   - Navigate to **Settings** → **Environment Variables**
   - Click **Add New**
   - Name: `OPENAI_API_KEY`
   - Value: Your OpenAI API key (starts with `sk-`)
   - Select all environments (Production, Preview, Development)
   - Click **Save**

   **Important**: After adding the environment variable, you need to redeploy:

   - Go to **Deployments** tab
   - Click the three dots (⋯) on the latest deployment
   - Click **Redeploy**

4. **Deploy**:
   - Vercel will automatically deploy on every push to main
   - The `/api/chat.ts` file will be automatically deployed as a serverless function
   - Make sure the environment variable is set before deploying

## Project Structure

```
AristotelianChat/
├── api/
│   └── chat.ts              # Vercel serverless function
├── docs/                    # Architectural documentation
│   ├── FLEXIBILITY_AND_EXTENDABILITY.md
│   ├── PRINCIPLE_PRACTICE_VIOLATIONS.md
│   └── SEPARATION_OF_CONCERNS.md
├── src/
│   ├── App.tsx              # Main app component with tab navigation
│   ├── App.css              # App-specific styles
│   ├── main.tsx             # Entry point
│   ├── index.css            # Global styles with TailwindCSS
│   ├── context/
│   │   ├── SessionContext.tsx    # Session context provider
│   │   ├── SessionContextDef.ts  # Type definitions for session context
│   │   └── useSession.ts         # Custom hook for accessing session context
│   ├── components/
│   │   ├── ExperienceInput.tsx
│   │   ├── ExportButton.tsx     # Export/Import functionality
│   │   ├── HelpButton.tsx        # Help/onboarding access
│   │   ├── OnboardingModal.tsx   # First-time user onboarding
│   │   ├── ErrorBoundary.tsx     # Error boundary component
│   │   ├── Tabs/
│   │   │   ├── Tab1DefineExperience.tsx
│   │   │   ├── Tab2GenerateIdeas.tsx
│   │   │   ├── Tab3ChallengeBiases.tsx
│   │   │   └── BiasCard.tsx      # Bias card component
│   │   └── chat/
│   │       ├── ChatMessageList.tsx
│   │       └── MessageBubble.tsx
│   ├── utils/
│   │   ├── parseModelOutput.ts   # JSON marker extraction helpers
│   │   ├── exportUtils.ts         # Export functionality utilities
│   │   ├── messageUtils.ts        # Message handling utilities
│   │   └── validation.ts          # Validation utilities
│   └── hooks/
│       └── useAbortController.ts  # Abort controller hook
└── vercel.json              # Vercel configuration
```

## How It Works

1. **Tab 1**: User enters an experience (e.g., "finding peace"). The AI asks questions one at a time to understand what this means to them. When ready, it produces a summary.

2. **Tab 2**: User can add their own ideas and click "Generate More Ideas" to get AI suggestions. Ideas are displayed as chips that can be clicked to add to the user's list. Ideas are color-coded: blue for user-typed, green for AI suggestions from Tab 2, purple for bias-challenging ideas from Tab 3.

3. **Tab 3**: After generating ideas, the AI analyzes potential biases in the user's thinking and suggests ideas that challenge those biases. Users can accept or reject biases, and add their own ideas directly in Tab 3 (displayed in blue).

4. **Export/Import**:

   - **Export**: Users can export their entire session (conversation, ideas, biases) as JSON via the Export/Import button in the header. Options include downloading as a file or copying to clipboard.
   - **Import**: Users can import previously exported sessions to review past interactions. The Import button is always available, even before starting a new chat.

5. **Onboarding & Help**:
   - First-time users see an onboarding modal explaining how the system works
   - An info icon (ℹ️) in the header provides access to help at any time
   - The onboarding explains the system's purpose, workflow, and what kind of ideas to enter

All AI responses use hybrid JSON markers embedded in markdown code blocks for structured data extraction while maintaining natural language flow.

## License

MIT
