import { useState, useRef, useEffect } from 'react'
import { streamAgentChat } from '@/lib/skipAi'
import { GenieMark } from '@/components/GenieMark'
import pb from '@/lib/pocketbase/client'

interface Message {
  id: string
  role: 'assistant' | 'user'
  content: string
  streaming?: boolean
}

const suggestions = [
  'Como estao as coisas hoje?',
  'Como esta minha agenda?',
  'Quais emails preciso responder?',
  'Qual campanha esta gastando mais?',
]

function SparkleIcon({ size = 16 }: { size?: number }) {
  return <GenieMark size={size} />
}

function SyncIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M23 4v6h-6M1 20v-6h6" />
      <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
    </svg>
  )
}

function SendIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14M13 5l7 7-7 7" />
    </svg>
  )
}

// Markdown renderer — handles **bold**, *italic*, numbered lists, bullet lists, headers
function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const key = `line-${i}`

    if (line.trim() === '') {
      elements.push(<div key={key} className="h-2" />)
      continue
    }

    if (line.startsWith('### ')) {
      elements.push(
        <div key={key} className="font-semibold text-[13px] text-zinc-900 mt-2 mb-1">
          {renderInline(line.slice(4))}
        </div>,
      )
      continue
    }
    if (line.startsWith('## ')) {
      elements.push(
        <div key={key} className="font-semibold text-[13px] text-zinc-900 mt-2 mb-1">
          {renderInline(line.slice(3))}
        </div>,
      )
      continue
    }
    if (line.startsWith('# ')) {
      elements.push(
        <div key={key} className="font-bold text-[14px] text-zinc-900 mt-2 mb-1">
          {renderInline(line.slice(2))}
        </div>,
      )
      continue
    }

    const numMatch = line.match(/^(\d+)[.)]\s+(.*)/)
    if (numMatch) {
      elements.push(
        <div key={key} className="flex gap-2 my-0.5">
          <span className="text-brand font-medium text-[13px] shrink-0 w-5">{numMatch[1]}.</span>
          <span className="text-[13px] text-zinc-700 leading-relaxed flex-1">
            {renderInline(numMatch[2])}
          </span>
        </div>,
      )
      continue
    }

    const bulletMatch = line.match(/^[-*]\s+(.*)/)
    if (bulletMatch) {
      elements.push(
        <div key={key} className="flex gap-2 my-0.5">
          <span className="text-brand text-[13px] shrink-0">•</span>
          <span className="text-[13px] text-zinc-700 leading-relaxed flex-1">
            {renderInline(bulletMatch[1])}
          </span>
        </div>,
      )
      continue
    }

    elements.push(
      <div key={key} className="text-[13px] text-zinc-700 leading-relaxed">
        {renderInline(line)}
      </div>,
    )
  }

  return <>{elements}</>
}

function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = []
  let remaining = text
  let key = 0

  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*([^*]+)\*\*/)
    if (boldMatch && boldMatch.index !== undefined) {
      if (boldMatch.index > 0) {
        parts.push(<span key={key++}>{remaining.substring(0, boldMatch.index)}</span>)
      }
      parts.push(
        <strong key={key++} className="font-semibold text-zinc-900">
          {boldMatch[1]}
        </strong>,
      )
      remaining = remaining.substring(boldMatch.index + boldMatch[0].length)
      continue
    }

    const italicMatch = remaining.match(/\*([^*]+)\*/)
    if (italicMatch && italicMatch.index !== undefined) {
      if (italicMatch.index > 0) {
        parts.push(<span key={key++}>{remaining.substring(0, italicMatch.index)}</span>)
      }
      parts.push(
        <em key={key++} className="italic">
          {italicMatch[1]}
        </em>,
      )
      remaining = remaining.substring(italicMatch.index + italicMatch[0].length)
      continue
    }

    parts.push(<span key={key++}>{remaining}</span>)
    break
  }

  return <>{parts}</>
}

export function ChatPanel({
  open,
  onClose,
  pendingQuestion,
  onConsumeQuestion,
}: {
  open: boolean
  onClose: () => void
  pendingQuestion?: string | null
  onConsumeQuestion?: () => void
}) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Ola! Eu sou o Genie. Posso analisar suas campanhas de Meta Ads, emails do Gmail e sua agenda do Google. O que voce quer saber?',
    },
  ])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState<string>('')
  const [conversationId, setConversationId] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const autoSyncedRef = useRef(false)
  const sentPendingRef = useRef<string | null>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (open && !autoSyncedRef.current) {
      autoSyncedRef.current = true
      doSync(true)
    }
  }, [open])

  const doSync = async (silent = false) => {
    if (!silent) setIsSyncing(true)
    setSyncStatus('Sincronizando...')
    try {
      const resp = await fetch(pb.baseUrl + '/backend/v1/google/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: pb.authStore.token || '' },
        body: JSON.stringify({}),
      })
      const data = await resp.json()
      if (resp.ok) {
        setSyncStatus(`${data.events || 0} eventos + ${data.messages || 0} emails`)
        setTimeout(() => setSyncStatus(''), 3000)
      } else if (data.error === 'Google not connected') {
        if (!silent) setSyncStatus('Google nao conectado')
        setTimeout(() => setSyncStatus(''), 3000)
      } else {
        if (!silent) setSyncStatus('Erro: ' + (data.error || ''))
        setTimeout(() => setSyncStatus(''), 3000)
      }
    } catch {
      if (!silent) setSyncStatus('Erro de conexao')
      setTimeout(() => setSyncStatus(''), 3000)
    } finally {
      if (!silent) setIsSyncing(false)
    }
  }

  const send = async (text: string) => {
    const content = text.trim()
    if (!content || isStreaming) return

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content }
    const aiId = crypto.randomUUID()
    const aiMsg: Message = { id: aiId, role: 'assistant', content: '', streaming: true }

    setMessages((prev) => [...prev, userMsg, aiMsg])
    setInput('')
    setIsStreaming(true)
    abortRef.current = new AbortController()

    try {
      const res = await fetch(pb.baseUrl + '/backend/v1/genie/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: pb.authStore.token || '' },
        body: JSON.stringify({ message: content, conversation_id: conversationId }),
        signal: abortRef.current.signal,
      })

      const result = await streamAgentChat(res, {
        onChunk: (_delta, full) => {
          setMessages((prev) => prev.map((m) => (m.id === aiId ? { ...m, content: full } : m)))
        },
        signal: abortRef.current.signal,
      })

      setMessages((prev) =>
        prev.map((m) => (m.id === aiId ? { ...m, content: result.content, streaming: false } : m)),
      )
      setConversationId(res.headers.get('X-Conversation-Id') ?? result.conversation_id ?? null)
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiId
            ? { ...m, content: 'Erro ao processar a resposta. Tente novamente.', streaming: false }
            : m,
        ),
      )
    } finally {
      setIsStreaming(false)
      abortRef.current = null
    }
  }

  // Pergunta pré-preenchida vinda do GenieCard / TopBar: dispara uma vez ao abrir.
  useEffect(() => {
    if (open && pendingQuestion && sentPendingRef.current !== pendingQuestion) {
      sentPendingRef.current = pendingQuestion
      send(pendingQuestion)
      onConsumeQuestion?.()
    }
    if (!open) sentPendingRef.current = null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pendingQuestion])

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/10 z-40" onClick={onClose} />}
      <div
        className={`fixed right-0 top-0 h-full w-[440px] bg-white z-50 flex flex-col transition-transform duration-300 shadow-pop ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-card-border">
          <div className="flex items-center gap-3">
            <span className="text-brand">
              <SparkleIcon size={30} />
            </span>
            <div>
              <h2 className="text-[15px] font-semibold text-zinc-900">Genie</h2>
              <p className="text-[11px] text-zinc-500 mt-0.5">Meta Ads + Gmail + Calendar</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => doSync(false)}
              disabled={isSyncing}
              title="Sincronizar Google"
              className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50 transition-colors disabled:opacity-30"
            >
              {isSyncing ? <span className="text-[12px] animate-pulse">...</span> : <SyncIcon />}
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50 transition-colors"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Sync status bar */}
        {syncStatus && (
          <div className="px-5 py-2 bg-brand-subtle border-b border-brand-border">
            <p className="text-[11px] text-brand font-medium flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-brand" />
              {syncStatus}
            </p>
          </div>
        )}

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-5 space-y-5 bg-[#f7f5f0]">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              {/* Avatar */}
              {msg.role === 'user' ? (
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-zinc-200 text-zinc-600">
                  <span className="text-[11px] font-semibold">VC</span>
                </div>
              ) : (
                <div className="w-7 h-7 flex items-center justify-center shrink-0 text-brand">
                  <SparkleIcon size={22} />
                </div>
              )}
              {/* Bubble */}
              <div className={`max-w-[80%] ${msg.role === 'user' ? 'flex justify-end' : ''}`}>
                <div
                  className={`px-4 py-3 rounded-2xl text-[13px] leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-zinc-900 text-white rounded-tr-md'
                      : 'bg-white text-zinc-700 shadow-card rounded-tl-md border border-card-border'
                  }`}
                >
                  {msg.content ? (
                    msg.role === 'assistant' ? (
                      renderMarkdown(msg.content)
                    ) : (
                      msg.content
                    )
                  ) : msg.streaming ? (
                    <span className="inline-flex gap-1 items-center py-1">
                      <span className="w-1.5 h-1.5 bg-zinc-300 rounded-full animate-pulse" />
                      <span
                        className="w-1.5 h-1.5 bg-zinc-300 rounded-full animate-pulse"
                        style={{ animationDelay: '0.2s' }}
                      />
                      <span
                        className="w-1.5 h-1.5 bg-zinc-300 rounded-full animate-pulse"
                        style={{ animationDelay: '0.4s' }}
                      />
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Suggestions */}
        {messages.length <= 1 && (
          <div className="px-5 py-4 border-t border-card-border bg-white">
            <p className="text-[11px] text-zinc-500 font-medium mb-3">Sugestoes</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="px-3 py-1.5 text-[12px] text-zinc-600 bg-zinc-50 hover:bg-brand-subtle hover:text-zinc-900 rounded-full transition-colors border border-zinc-200"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="px-5 py-4 border-t border-card-border bg-white">
          <div className="flex gap-2 items-end">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  send(input)
                }
              }}
              placeholder="Pergunte algo ao Genie..."
              disabled={isStreaming}
              className="flex-1 text-[13px] bg-zinc-50 rounded-xl px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-brand/20 border border-zinc-200 disabled:opacity-50"
            />
            <button
              onClick={() => send(input)}
              disabled={isStreaming || !input.trim()}
              className="w-11 h-11 flex items-center justify-center rounded-xl bg-brand text-white hover:bg-brand-strong transition-colors disabled:opacity-30 shrink-0"
            >
              {isStreaming ? <span className="text-[14px] animate-pulse">...</span> : <SendIcon />}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
