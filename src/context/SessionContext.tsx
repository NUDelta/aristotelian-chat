import { useState } from 'react'
import type { ReactNode } from 'react'
import { SessionContext, type ChatMessage, type Bias } from './SessionContextDef'

export function SessionProvider({ children }: { children: ReactNode }) {
  const [experience, setExperience] = useState<string>('')
  const [tab1History, setTab1History] = useState<ChatMessage[]>([])
  const [tab1Summary, setTab1Summary] = useState<string | null>(null)
  const [isFinishedTab1, setIsFinishedTab1] = useState<boolean>(false)
  const [myIdeas, setMyIdeas] = useState<string[]>([])
  const [allSuggestedIdeas, setAllSuggestedIdeas] = useState<string[]>([])
  const [tab3ChallengingIdeas, setTab3ChallengingIdeas] = useState<string[]>([])
  const [biases, setBiases] = useState<Bias[] | null>(null)
  const [biasDecisions, setBiasDecisions] = useState<Record<string, 'accepted' | 'rejected' | undefined>>({})
  const [biasUserIdeas, setBiasUserIdeas] = useState<Record<string, string[]>>({})

  const resetSession = () => {
    setTab1History([])
    setTab1Summary(null)
    setIsFinishedTab1(false)
    setMyIdeas([])
    setAllSuggestedIdeas([])
    setTab3ChallengingIdeas([])
    setBiases(null)
    setBiasDecisions({})
    setBiasUserIdeas({})
  }

  const importSession = (data: {
    experience: string
    tab1History: ChatMessage[]
    tab1Summary: string | null
    myIdeas: string[]
    allSuggestedIdeas: string[]
    tab3ChallengingIdeas: string[]
    biases: Bias[] | null
    biasDecisions: Record<string, 'accepted' | 'rejected' | undefined>
    biasUserIdeas: Record<string, string[]>
  }) => {
    setExperience(data.experience)
    setTab1History(data.tab1History)
    setTab1Summary(data.tab1Summary)
    setIsFinishedTab1(data.tab1Summary !== null)
    setMyIdeas(data.myIdeas)
    setAllSuggestedIdeas(data.allSuggestedIdeas)
    setTab3ChallengingIdeas(data.tab3ChallengingIdeas)
    setBiases(data.biases)
    setBiasDecisions(data.biasDecisions)
    setBiasUserIdeas(data.biasUserIdeas)
  }

  return (
    <SessionContext.Provider
      value={{
        experience,
        setExperience,
        tab1History,
        setTab1History,
        tab1Summary,
        setTab1Summary,
        isFinishedTab1,
        setIsFinishedTab1,
        myIdeas,
        setMyIdeas,
        allSuggestedIdeas,
        setAllSuggestedIdeas,
        tab3ChallengingIdeas,
        setTab3ChallengingIdeas,
        biases,
        setBiases,
        biasDecisions,
        setBiasDecisions,
        biasUserIdeas,
        setBiasUserIdeas,
        resetSession,
        importSession,
      }}
    >
      {children}
    </SessionContext.Provider>
  )
}
