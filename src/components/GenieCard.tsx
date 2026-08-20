import { useEffect, useRef, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { GenieMark } from '@/components/GenieMark'
import { GenieThinking } from '@/components/GenieThinking'
import { Markdown } from '@/components/Markdown'
import { streamAgentChat } from '@/lib/skipAi'
import pb from '@/lib/pocketbase/client'

const quickQuestions = [
  'Qual campanha está gastando mais?',
  'Onde estou perdendo dinheiro?',
  'O que devo priorizar hoje?',
]

const INSIGHT_PROMPT =
  'Em no máximo 2 frases curtas, destaque a principal oportunidade ou o principal alerta ' +
  'das campanhas de Meta Ads no período atual. Seja direto, específico e use números quando ' +
  'possível. Não cumprimente nem se apresente.'

export function GenieCard({ onAsk, hasData }: { onAsk: (q?: string) => void; hasData: boolean }) {
  const [insight, setInsight] = useState('')
  const [loading, setLoading] = useState(true)
  const done = useRef(false)

  useEffect(() => {
    if (done.current) return
    done.current = true
    if (!hasData) {
      setLoading(false)
      return
    }
    ;(async () => {
      try {
        const res = await fetch(pb.baseUrl + '/backend/v1/genie/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: pb.authStore.token || '',
          },
          body: JSON.stringify({ message: INSIGHT_PROMPT }),
        })
        const result = await streamAgentChat(res, {
          onChunk: (_delta, full) => setInsight(full),
        })
        setInsight(result.content || '')
      } catch {
        setInsight('')
      } finally {
        setLoading(false)
      }
    })()
  }, [hasData])

  return (
    <div className="surface rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 bg-brand-subtle border-b border-brand-border">
        <span className="text-brand">
          <GenieMark size={20} />
        </span>
        <span className="text-[13px] font-semibold text-zinc-900">Genie</span>
        <span className="ml-auto text-[10px] font-semibold text-brand uppercase tracking-wider">
          Insight
        </span>
      </div>

      <div className="p-4">
        {loading ? (
          <GenieThinking />
        ) : insight ? (
          <div className="text-[13px] text-zinc-700 leading-relaxed">
            <Markdown text={insight} />
          </div>
        ) : (
          <p className="text-[13px] text-zinc-500 leading-relaxed">
            Conecte suas contas para o Genie analisar seus dados e apontar oportunidades
            automaticamente.
          </p>
        )}

        <div className="mt-4 space-y-1.5">
          {quickQuestions.map((q) => (
            <button
              key={q}
              onClick={() => onAsk(q)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left text-[12px] text-zinc-600 bg-zinc-50 hover:bg-brand-subtle hover:text-zinc-900 transition-colors group"
            >
              <span className="flex-1">{q}</span>
              <ArrowRight
                size={13}
                className="text-zinc-300 group-hover:text-brand transition-colors shrink-0"
              />
            </button>
          ))}
        </div>

        <button
          onClick={() => onAsk()}
          className="w-full mt-2 h-9 rounded-xl border border-brand-border text-brand text-[12px] font-medium hover:bg-brand-subtle transition-colors"
        >
          Abrir conversa
        </button>
      </div>
    </div>
  )
}
