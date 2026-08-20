import { useEffect, useRef, useState } from 'react'
import { ArrowRight, RefreshCw } from 'lucide-react'
import { GenieMark } from '@/components/GenieMark'
import { GenieThinking } from '@/components/GenieThinking'
import { Markdown } from '@/components/Markdown'
import { streamAgentChat } from '@/lib/skipAi'
import pb from '@/lib/pocketbase/client'

interface GenieInsightProps {
  prompt: string
  questions: string[]
  onAsk: (q?: string) => void
}

// Quando o insight falha ou vem vazio, nada de "sem análise disponível" seco:
// o Genie assume com bom humor e oferece tentar de novo.
const fallbacks = [
  'Consultei a bola de cristal e ela respondeu 404. Tenta de novo que agora vai. 🔮',
  'Fui pegar um café enquanto os dados carregavam e me perdi no caminho. ☕',
  'Silêncio total nos dados. Ou sua vida está em perfeita ordem, ou falta sincronizar. 🧘',
  'Nada pra reportar agora — nem a Meta, nem o Gmail, nem a agenda. Dia raro. Aproveita. 🌴',
  'Minha lâmpada deu tela azul. Esfrega de novo (ou clica em tentar de novo). 🪔',
]

export function GenieInsight({ prompt, questions, onAsk }: GenieInsightProps) {
  const [insight, setInsight] = useState('')
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [fallback] = useState(() => fallbacks[Math.floor(Math.random() * fallbacks.length)])
  const started = useRef(false)
  const attemptRef = useRef(0)

  const run = async () => {
    setLoading(true)
    setFailed(false)
    setInsight('')
    attemptRef.current++
    const attempt = attemptRef.current
    try {
      const res = await fetch(pb.baseUrl + '/backend/v1/genie/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: pb.authStore.token || '',
        },
        body: JSON.stringify({ message: prompt }),
      })
      if (!res.ok) throw new Error('genie unavailable')
      const result = await streamAgentChat(res, {
        onChunk: (_delta, full) => setInsight(full),
      })
      const content = (result.content || '').trim()
      if (!content) throw new Error('empty insight')
      setInsight(content)
      setLoading(false)
    } catch {
      // primeira falha: tenta de novo sozinho uma vez, em silêncio
      if (attempt === 1) {
        setTimeout(() => run(), 1500)
        return
      }
      setInsight('')
      setFailed(true)
      setLoading(false)
    }
  }

  useEffect(() => {
    if (started.current) return
    started.current = true
    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prompt])

  return (
    <div className="surface rounded-2xl p-5">
      <div className="flex items-center gap-2.5 mb-3">
        <span className="text-brand shrink-0">
          <GenieMark size={22} />
        </span>
        <span className="text-[13px] font-semibold text-zinc-900">Genie</span>
        <span className="text-[10px] font-semibold text-brand uppercase tracking-wider">
          Insight
        </span>
        {failed && (
          <button
            onClick={() => run()}
            className="ml-auto inline-flex items-center gap-1.5 text-[11px] font-medium text-zinc-400 hover:text-zinc-900 transition-colors"
          >
            <RefreshCw size={11} />
            Tentar de novo
          </button>
        )}
      </div>

      {loading ? (
        <GenieThinking />
      ) : failed ? (
        <p className="text-[13px] text-zinc-500 leading-relaxed italic">{fallback}</p>
      ) : (
        <div className="text-[13px] text-zinc-700 leading-relaxed">
          <Markdown text={insight} />
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap mt-4">
        {questions.map((q) => (
          <button
            key={q}
            onClick={() => onAsk(q)}
            className="inline-flex items-center gap-1.5 px-3 h-7 rounded-full bg-zinc-50 border border-zinc-200 text-[12px] text-zinc-600 hover:bg-brand-subtle hover:text-zinc-900 hover:border-brand-border transition-colors"
          >
            {q}
            <ArrowRight size={11} className="text-zinc-300" />
          </button>
        ))}
      </div>
    </div>
  )
}
