import { OpenAI } from 'openai'
import type { VercelRequest, VercelResponse } from '@vercel/node'

// Initialize OpenAI client - will be created lazily to ensure env vars are loaded
let openaiClient: OpenAI | null = null

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set')
    }
    openaiClient = new OpenAI({
      apiKey,
    })
  }
  return openaiClient
}

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

type ChatRequest = {
  mode: 'define-experience' | 'generate-ideas' | 'challenge-biases'
  experience: string
  history?: ChatMessage[]
  forceSummary?: boolean
  myIdeas?: string[]
  allSuggestedIdeas?: string[]
  summary?: string
  isVoiceMode?: boolean
  isFirstVoiceMessage?: boolean
  welcomeOnly?: boolean
}

const VALID_MODES = ['define-experience', 'generate-ideas', 'challenge-biases'] as const
const MAX_EXPERIENCE_LENGTH = 500
const MAX_HISTORY_LENGTH = 100
const MAX_IDEAS_LENGTH = 100

function validateChatRequest(body: unknown): { valid: boolean; error?: string; data?: ChatRequest } {
  // Check if body exists
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body is required' }
  }

  const req = body as Record<string, unknown>

  // Validate mode
  if (!req.mode || typeof req.mode !== 'string') {
    return { valid: false, error: 'Mode is required and must be a string' }
  }
  if (!VALID_MODES.includes(req.mode as typeof VALID_MODES[number])) {
    return {
      valid: false,
      error: `Mode must be one of: ${VALID_MODES.join(', ')}`,
    }
  }

  // Validate experience
  if (!req.experience || typeof req.experience !== 'string') {
    return { valid: false, error: 'Experience is required and must be a string' }
  }
  const experience = req.experience.trim()
  if (experience.length === 0) {
    return { valid: false, error: 'Experience cannot be empty' }
  }
  if (experience.length > MAX_EXPERIENCE_LENGTH) {
    return {
      valid: false,
      error: `Experience must be ${MAX_EXPERIENCE_LENGTH} characters or less`,
    }
  }

  // Validate history if provided
  if (req.history !== undefined) {
    if (!Array.isArray(req.history)) {
      return { valid: false, error: 'History must be an array' }
    }
    if (req.history.length > MAX_HISTORY_LENGTH) {
      return {
        valid: false,
        error: `History cannot exceed ${MAX_HISTORY_LENGTH} messages`,
      }
    }
    for (let i = 0; i < req.history.length; i++) {
      const msg = req.history[i]
      if (!msg || typeof msg !== 'object') {
        return { valid: false, error: `History message ${i} is invalid` }
      }
      const message = msg as Record<string, unknown>
      if (message.role !== 'user' && message.role !== 'assistant') {
        return {
          valid: false,
          error: `History message ${i} must have role 'user' or 'assistant'`,
        }
      }
      if (!message.content || typeof message.content !== 'string') {
        return {
          valid: false,
          error: `History message ${i} must have a string content field`,
        }
      }
    }
  }

  // Validate forceSummary if provided
  if (req.forceSummary !== undefined && typeof req.forceSummary !== 'boolean') {
    return { valid: false, error: 'forceSummary must be a boolean' }
  }

  // Validate myIdeas if provided
  if (req.myIdeas !== undefined) {
    if (!Array.isArray(req.myIdeas)) {
      return { valid: false, error: 'myIdeas must be an array' }
    }
    if (req.myIdeas.length > MAX_IDEAS_LENGTH) {
      return {
        valid: false,
        error: `myIdeas cannot exceed ${MAX_IDEAS_LENGTH} items`,
      }
    }
    for (let i = 0; i < req.myIdeas.length; i++) {
      if (typeof req.myIdeas[i] !== 'string') {
        return { valid: false, error: `myIdeas[${i}] must be a string` }
      }
    }
  }

  // Validate allSuggestedIdeas if provided
  if (req.allSuggestedIdeas !== undefined) {
    if (!Array.isArray(req.allSuggestedIdeas)) {
      return { valid: false, error: 'allSuggestedIdeas must be an array' }
    }
    if (req.allSuggestedIdeas.length > MAX_IDEAS_LENGTH) {
      return {
        valid: false,
        error: `allSuggestedIdeas cannot exceed ${MAX_IDEAS_LENGTH} items`,
      }
    }
    for (let i = 0; i < req.allSuggestedIdeas.length; i++) {
      if (typeof req.allSuggestedIdeas[i] !== 'string') {
        return {
          valid: false,
          error: `allSuggestedIdeas[${i}] must be a string`,
        }
      }
    }
  }

  // Validate summary if provided
  if (req.summary !== undefined) {
    if (typeof req.summary !== 'string') {
      return { valid: false, error: 'summary must be a string' }
    }
  }

  return {
    valid: true,
    data: {
      mode: req.mode as ChatRequest['mode'],
      experience,
      history: req.history as ChatMessage[] | undefined,
      forceSummary: req.forceSummary as boolean | undefined,
      myIdeas: req.myIdeas as string[] | undefined,
      allSuggestedIdeas: req.allSuggestedIdeas as string[] | undefined,
      summary: req.summary as string | undefined,
      isVoiceMode: req.isVoiceMode as boolean | undefined,
      isFirstVoiceMessage: req.isFirstVoiceMessage as boolean | undefined,
      welcomeOnly: req.welcomeOnly as boolean | undefined,
    },
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Check for API key at the start
  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY is not set')
    return res.status(500).json({
      error: 'Server configuration error',
      message: 'OpenAI API key is not configured. Please set OPENAI_API_KEY environment variable.',
    })
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Validate request body
  const validation = validateChatRequest(req.body)
  if (!validation.valid) {
    return res.status(400).json({
      error: 'Invalid request',
      message: validation.error,
    })
  }

  const body = validation.data!

  try {
    let systemPrompt = ''
    let messages: ChatMessage[] = []

    if (body.mode === 'define-experience') {
      const voiceModeInstructions = body.isVoiceMode
        ? `\n\nIMPORTANT: You are having a SPOKEN conversation, not a written one. The user is speaking to you, and you are speaking back. 
- Be more conversational, natural, and warm in your responses
- Use a speaking tone - shorter sentences, more natural phrasing, as if you're talking face-to-face
- The user's responses are spoken, so they may be more casual, include pauses, or have slight imperfections - understand the intent
- Respond as if you're having a real conversation, not writing an email or formal text
- Keep responses concise and conversational - people speak more briefly than they write\n`
        : ''

      const welcomeMessageInstruction = body.welcomeOnly
        ? `\n\nSPECIAL INSTRUCTION: This is a WELCOME-ONLY message for the start of the conversation. Provide ONLY the following welcome message (use this exact wording, but feel free to make it feel natural and conversational):

"Hey, let's talk through this experience together. My goal is to better understand you and what the experience means to you. Feel free to respond candidly to any question I ask. I don't know is a perfect response as well."

Do NOT ask any questions yet - this is just the welcome message. Keep it warm and conversational.\n`
        : ''

      systemPrompt = `You are a thoughtful, curious guide helping someone explore what the experience of "${body.experience}" truly means to them personally and why they are struggling with it presently.

Be genuinely curious and empathetic. Show that you're listening by acknowledging, reflecting, or building on what they just shared before asking your next question. This creates a natural, flowing conversation.${voiceModeInstructions}${welcomeMessageInstruction}

IMPORTANT: Ask only ONE question at a time. 

For your FIRST question (when there's no conversation history yet):
- Start by asking the user to describe the experience they are exploring in their own life.
- The user might express things they have tried and give insights as to why they are struggling with it. 
- The question should be more insightful and thought-provoking than a simple question like "What does the experience of writing your wedding vows mean to you personally?"
- The first question should be tailored to the actual experience itself, something like "Can you tell me a bit more about writing your wedding vows? Tell me a bit about what you've tried, what you like don't like, and why you're struggling with it?"

For FOLLOW-UP questions before the stuggle is clear:
- continue to ask a single question at a time that help the user to clarify their struggle with the experience.
- dig deeper into why some things have worked and some things have not worked for them.

For later FOLLOW-UP questions (when the struggle is understood):
- First, acknowledge what they just said - reflect back, show understanding, or build on their response
- Then ask a single, thoughtful, open-ended question that digs deeper
- Continue exploring through concrete experiences, feelings, and memories
- Avoid asking them to define or explain abstractly - help them discover through examples and stories
- IMPORTANT: Do not deviate from the topic of the experience or the user's struggle with it.

Continue this pattern of listening, acknowledging, and asking one concrete question at a time until you feel you've truly understood their personal interpretation of this experience and why they are struggling with it presently, and can offer
the user with an explanation of how they currently view the experience, and how this world view might be limiting their ability to move forward with this experience.

The user might mention many ideas, before summarizing, make sure there are no other ideas mentioned by the user in relation to the eperience that have yet to be discussed. 

When you're ready to provide a summary, first acknowledge their sharing, then output a JSON marker block like this:

\`\`\`json
{"type":"summary","complete":true,"content":"...summary text..."}
\`\`\`

CRITICAL: The summary must be an INTERPRETATION and SYNTHESIS of how the user views this experience, NOT a literal recap of what they said. 

- Synthesize the underlying themes, values, and perspectives that emerge from their stories and responses
- Draw conclusions about what this experience fundamentally means to them based on patterns in what they've shared
- Capture their worldview, emotional relationship, and personal philosophy regarding this experience
- Focus on the "why" and "what it reveals" rather than just the "what they said"
- Write it as an insightful interpretation that reveals their unique perspective, not as a summary of the conversation itself
- The summary should read like a thoughtful conclusion about their relationship with this experience, showing what you've learned about how they understand and relate to it

After outputting the JSON marker, do not ask any further questions.

If the request includes forceSummary=true, you MUST immediately produce a summary based on what the user has shared in the conversation, even if the conversation is brief. Do NOT refuse to provide a summary or ask for more information. Create a summary based on whatever the user has told you, no matter how limited. Start with a brief acknowledgment, then output the summary in the JSON marker format.`

      messages = body.history || []
      if (body.forceSummary) {
        messages.push({
          role: 'user',
          content: 'Please provide a summary now based on our conversation. Even if our conversation was brief, create a summary of what I have shared about what this experience means to me personally. Include the summary in the JSON marker format.',
        })
      }
    } else if (body.mode === 'generate-ideas') {
      const allIdeas = [...(body.myIdeas || []), ...(body.allSuggestedIdeas || [])]
      const ideasList = allIdeas.length > 0 ? allIdeas.join('\n- ') : 'None yet'

      // Build context from chat history and summary
      let contextText = ''
      if (body.history && body.history.length > 0) {
        const historyText = body.history
          .map((msg) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
          .join('\n\n')
        contextText = `Here is the full conversation from Tab 1 where the user explored their experience:\n\n${historyText}\n\n`
      }

      // Use summary if provided, otherwise fall back to experience name
      const summaryText = body.summary || body.experience || 'No summary available'

      systemPrompt = `You are generating new ideas for activities/places related to the experience.

      ${contextText}Here is the user's interpretation summary (synthesized from the conversation above):
      
      ${summaryText}
      
      Here are ALL prior ideas (user + AI):
      - ${ideasList}
      
      CRITICAL INSTRUCTIONS:
      1. DO NOT simply repeat or paraphrase specific examples mentioned in the conversation or summary.
      2. Instead, identify the UNDERLYING THEMES, VALUES, and PATTERNS from the user's interpretation.
      3. EXTEND those themes into NEW, CREATIVE ideas that align with those patterns but are distinct from what was already discussed.
      4. Think about what the themes suggest about the user's deeper needs and preferences, then generate ideas that serve those needs in fresh ways.
      
      Examples of what NOT to do:
      - If the user mentioned "going to a park," don't suggest "visit a different park" or "go to Central Park"
      - If they mentioned "reading," don't suggest "read a book" or "read in a library"
      
      Examples of what TO do:
      - If the user mentioned "going to a park" (theme: being in nature, quiet spaces), suggest: "Take a nature photography walk" or "Join a silent meditation group outdoors"
      - If they mentioned "reading" (theme: intellectual stimulation, solitude), suggest: "Attend a book club discussion" or "Visit a rare book collection"
      
      Generate 5-8 diverse, creative ideas that extend the themes from the user's interpretation into new directions. Return them in a JSON marker like:
      
      \`\`\`json
      {"type":"suggested_ideas","items":["idea1","idea2",...]}
      \`\`\``

      messages = [
        {
          role: 'user',
          content: 'Generate new ideas for activities or places related to this experience.',
        },
      ]
    } else if (body.mode === 'challenge-biases') {
      const allIdeas = [...(body.myIdeas || []), ...(body.allSuggestedIdeas || [])]
      const ideasList = allIdeas.length > 0 ? allIdeas.join('\n- ') : 'None'

      // Build context from chat history
      let contextText = ''
      if (body.history && body.history.length > 0) {
        const historyText = body.history
          .map((msg) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
          .join('\n\n')
        contextText = `Here is the full conversation from Tab 1 where the user explored their experience:\n\n${historyText}\n\n`
      }

      const summaryText = body.summary || body.experience || 'No summary available'

      systemPrompt = `You are a reflective bias analyst. The user is exploring the experience of "${body.experience}".

You are given:
- The full conversation where they defined what this experience means to them.
- A summary of their interpretation.
- Their own ideas for places/activities.
- All ideas (their own + AI-suggested).

Your job:

1) Identify 3–7 meaningful biases or assumptions in how they interpret this experience and how they generate ideas.

2) For EACH bias:
   - Give it a short title.
   - Provide a rich explanation in 2–4 sentences that uses concrete examples or phrases from their conversation, summary, or ideas.
   - Generate 3–6 ideas that specifically challenge THIS bias.

3) Return all biases in a single JSON marker block like:

\`\`\`json
{
  "type": "biases",
  "items": [
    {
      "id": "bias_1",
      "title": "Prefers nature-based retreat",
      "explanation": "You tend to associate rest after burnout with being in quiet, natural spaces. For example, you mentioned parks, forests, and cabins, and didn't mention any social or urban examples. This suggests you see calm and solitude in nature as the 'correct' way to rest.",
      "challengingIdeas": [
        "Attend a low-key community art night in the city",
        "Co-work in a cozy cafe with a friend",
        "Take a playful movement class in a studio"
      ]
    }
  ]
}
\`\`\`

${contextText}Summary of the experience: ${summaryText}

User's ideas: ${body.myIdeas?.join(', ') || 'None'}
All AI-suggested ideas: ${ideasList}

Rules:
- INCLUDE the JSON block exactly once.
- Use concrete references to the user's words where possible.
- Explanations must be rich, not one-liners.
- Do not output any other JSON types.
- Each bias must have a unique id (bias_1, bias_2, etc.).
- Each bias must have 3-6 challenging ideas.`

      messages = [
        {
          role: 'user',
          content: 'Analyze the biases in my thinking and provide ideas that challenge them.',
        },
      ]
    }

    const openai = getOpenAIClient()
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      temperature: 0.9,
    })

    const rawText = completion.choices[0]?.message?.content || ''

    // Log for debugging (remove in production if needed)
    if (!rawText) {
      console.error('OpenAI returned empty content:', {
        choices: completion.choices,
        usage: completion.usage,
      })
    }

    // Parse response based on mode
    if (body.mode === 'define-experience') {
      const hasSummary = rawText.includes('"type":"summary"')
      return res.status(200).json({
        mode: 'define-experience',
        assistantMessage: rawText,
        isSummaryComplete: hasSummary,
        rawText,
      })
    } else if (body.mode === 'generate-ideas') {
      return res.status(200).json({
        mode: 'generate-ideas',
        suggestedIdeas: [],
        rawText,
      })
    } else if (body.mode === 'challenge-biases') {
      return res.status(200).json({
        mode: 'challenge-biases',
        rawText,
      })
    }
  } catch (error) {
    console.error('OpenAI API error:', error)

    // Check for common errors
    let errorMessage = 'Unknown error'
    let statusCode = 500

    if (error instanceof Error) {
      errorMessage = error.message

      // Check for missing API key
      if (errorMessage.includes('API key') || !process.env.OPENAI_API_KEY) {
        errorMessage = 'OpenAI API key is missing. Please set OPENAI_API_KEY environment variable.'
        statusCode = 500
      }
      // Check for invalid API key
      else if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        errorMessage = 'Invalid OpenAI API key. Please check your OPENAI_API_KEY.'
        statusCode = 401
      }
      // Check for rate limiting
      else if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
        errorMessage = 'Rate limit exceeded. Please try again later.'
        statusCode = 429
      }
    }

    // Always show error details in development, or if it's a known error
    const isDevelopment = process.env.NODE_ENV === 'development' || process.env.VERCEL_ENV === 'development'

    return res.status(statusCode).json({
      error: 'Failed to process request',
      message: errorMessage,
      ...(isDevelopment && {
        details: error instanceof Error ? error.stack : String(error),
        hasApiKey: !!process.env.OPENAI_API_KEY
      }),
    })
  }
}

