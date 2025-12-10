import { createContext } from 'react'
import type { Dispatch, SetStateAction } from 'react'

export type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export type Bias = {
  id: string
  title: string
  explanation: string
  challengingIdeas: string[]
}

export type SessionContextType = {
  // Experience input
  experience: string
  setExperience: (v: string) => void

  // Tab 1: Define Experience
  tab1History: ChatMessage[]
  setTab1History: Dispatch<SetStateAction<ChatMessage[]>>
  tab1Summary: string | null
  setTab1Summary: Dispatch<SetStateAction<string | null>>
  isFinishedTab1: boolean
  setIsFinishedTab1: (b: boolean) => void

  // Tab 2: Generate Ideas
  myIdeas: string[]
  setMyIdeas: Dispatch<SetStateAction<string[]>>
  allSuggestedIdeas: string[]
  setAllSuggestedIdeas: Dispatch<SetStateAction<string[]>>
  tab3ChallengingIdeas: string[]
  setTab3ChallengingIdeas: Dispatch<SetStateAction<string[]>>

  // Tab 3: Challenge Biases
  biases: Bias[] | null
  setBiases: Dispatch<SetStateAction<Bias[] | null>>
  biasDecisions: Record<string, 'accepted' | 'rejected' | undefined>
  setBiasDecisions: Dispatch<SetStateAction<Record<string, 'accepted' | 'rejected' | undefined>>>
  biasUserIdeas: Record<string, string[]>
  setBiasUserIdeas: Dispatch<SetStateAction<Record<string, string[]>>>

  // Reset function
  resetSession: () => void
  // Import session function
  importSession: (data: {
    experience: string
    tab1History: ChatMessage[]
    tab1Summary: string | null
    myIdeas: string[]
    allSuggestedIdeas: string[]
    tab3ChallengingIdeas: string[]
    biases: Bias[] | null
    biasDecisions: Record<string, 'accepted' | 'rejected' | undefined>
    biasUserIdeas: Record<string, string[]>
  }) => void
}

export const SessionContext = createContext<SessionContextType | undefined>(undefined)

