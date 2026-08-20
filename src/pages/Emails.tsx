import { useState, useEffect } from 'react'
import { AppShell } from '@/components/AppShell'
import { ConnectPrompt } from '@/components/ConnectPrompt'
import { ChatPanel } from '@/components/ChatPanel'
import { GenieInsight } from '@/components/GenieInsight'
import { Markdown } from '@/components/Markdown'
import { Skeleton } from '@/components/ui/skeleton'
import { Pagination } from '@/components/Pagination'
import { useRealtime } from '@/hooks/use-realtime'
import { useConnections } from '@/hooks/use-connections'
import { streamAgentChat } from '@/lib/skipAi'
import { htmlToText, isAutomatedEmail } from '@/lib/text'
import pb from '@/lib/pocketbase/client'
import {
  Mail,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Sparkles,
  PenLine,
  ArrowLeft,
  Send,
} from 'lucide-react'

interface GmailMessage {
  id: string
  message_id: string
  from_email: string
  subject: string
  snippet: string
  date: string
  is_unread: boolean
  needs_reply: boolean
}

interface MessageDetail {
  loading: boolean
  error: string
  text: string
  gmailUrl: string
  to: string
}

// Gmail devolve o corpo em base64url; decodifica no browser (UTF-8).
function decodeB64Url(b64: string): string {
  try {
    const norm = b64.replace(/-/g, '+').replace(/_/g, '/')
    const bin = atob(norm)
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
    return new TextDecoder('utf-8').decode(bytes)
  } catch {
    return ''
  }
}

function senderName(from: string): string {
  const m = from.match(/^"?([^"<]+)"?\s*</)
  return (m ? m[1] : from.split('@')[0]).trim()
}

const filters = [
  { key: 'all', label: 'Todos' },
  { key: 'unread', label: 'Não lidos' },
  { key: 'reply', label: 'Responder' },
] as const

type FilterKey = (typeof filters)[number]['key']

export default function Emails() {
  const [chatOpen, setChatOpen] = useState(false)
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null)
  const [messages, setMessages] = useState<GmailMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState('')
  const [sendingReport, setSendingReport] = useState(false)
  const [reportStatus, setReportStatus] = useState('')
  const [filter, setFilter] = useState<FilterKey>('all')
  const [selected, setSelected] = useState<GmailMessage | null>(null)
  const [detail, setDetail] = useState<MessageDetail | null>(null)
  const [genieMode, setGenieMode] = useState<'resumo' | 'rascunho' | null>(null)
  const [genieText, setGenieText] = useState('')
  const [genieStreaming, setGenieStreaming] = useState(false)
  const [page, setPage] = useState(1)
  const connections = useConnections()

  const loadMessages = async () => {
    try {
      const records = await pb
        .collection('gmail_messages')
        .getFullList({ sort: '-date', perPage: 50 })
      setMessages(
        records.map((r: any) => ({
          id: r.id,
          message_id: r.message_id || '',
          from_email: r.from_email || '',
          subject: r.subject || '',
          snippet: r.snippet || '',
          date: r.date,
          is_unread: r.is_unread,
          needs_reply: r.needs_reply && !isAutomatedEmail(r.from_email || '', r.subject || ''),
        })),
      )
    } catch (e) {
      console.error('Failed:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMessages()
  }, [])

  useRealtime('gmail_messages', () => loadMessages())

  const handleSync = async () => {
    setSyncing(true)
    setSyncStatus('')
    try {
      const resp = await fetch(pb.baseUrl + '/backend/v1/google/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: pb.authStore.token || '' },
        body: JSON.stringify({}),
      })
      const data = await resp.json()
      if (resp.ok) {
        setSyncStatus(`${data.messages || 0} emails atualizados`)
        loadMessages()
      } else {
        setSyncStatus('Erro: ' + (data.error || data.message || ''))
      }
      setTimeout(() => setSyncStatus(''), 4000)
    } catch {
      setSyncStatus('Erro de conexão')
      setTimeout(() => setSyncStatus(''), 4000)
    } finally {
      setSyncing(false)
    }
  }

  const handleSendReport = async () => {
    setSendingReport(true)
    setReportStatus('')
    try {
      const resp = await fetch(pb.baseUrl + '/backend/v1/report/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: pb.authStore.token || '' },
        body: JSON.stringify({ period: '7d', site_url: window.location.origin }),
      })
      const data = await resp.json()
      if (resp.ok && data.sent) {
        setReportStatus('Relatório enviado para ' + (data.to || 'seu email'))
      } else if (resp.ok && !data.sent) {
        setReportStatus(
          data.reason === 'no_metrics'
            ? 'Nenhuma métrica encontrada nessa conta'
            : data.reason === 'no_data'
              ? 'Sem métricas no período'
              : 'Relatório não enviado',
        )
      } else {
        setReportStatus('Erro: ' + (data.error || data.message || 'falha ao enviar'))
      }
      setTimeout(() => setReportStatus(''), 5000)
    } catch {
      setReportStatus('Erro de conexão')
      setTimeout(() => setReportStatus(''), 5000)
    } finally {
      setSendingReport(false)
    }
  }

  const openMessage = async (msg: GmailMessage) => {
    setSelected(msg)
    setGenieMode(null)
    setGenieText('')
    setDetail({ loading: true, error: '', text: '', gmailUrl: '', to: '' })
    try {
      const resp = await fetch(pb.baseUrl + '/backend/v1/gmail/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: pb.authStore.token || '' },
        body: JSON.stringify({ message_id: msg.message_id }),
      })
      const data = await resp.json()
      if (!resp.ok) {
        setDetail({
          loading: false,
          error: data.error || 'Não foi possível carregar o email',
          text: '',
          gmailUrl: '',
          to: '',
        })
        return
      }
      const raw = decodeB64Url(data.body_b64 || '')
      const text = data.mime === 'text/html' ? htmlToText(raw) : raw.trim()
      setDetail({
        loading: false,
        error: '',
        text: text || msg.snippet,
        gmailUrl: data.gmail_url || '',
        to: data.to || '',
      })
    } catch {
      setDetail({
        loading: false,
        error: 'Erro de conexão ao carregar o email',
        text: '',
        gmailUrl: '',
        to: '',
      })
    }
  }

  const runGenie = async (mode: 'resumo' | 'rascunho') => {
    if (!selected || !detail || genieStreaming) return
    setGenieMode(mode)
    setGenieText('')
    setGenieStreaming(true)
    const emailContext =
      'Email de: ' +
      selected.from_email +
      '\nAssunto: ' +
      selected.subject +
      '\nCorpo:\n' +
      (detail.text || selected.snippet).slice(0, 4000)
    const prompt =
      mode === 'resumo'
        ? 'Resuma o email abaixo em no máximo 3 frases, destacando o que é pedido e se há prazo. Sem cumprimentos.\n\n' +
          emailContext
        : 'Escreva um rascunho de resposta em pt-BR para o email abaixo: tom profissional e cordial, direto ao ponto, pronto pra eu copiar e enviar. Apenas o texto da resposta, sem assunto e sem explicações.\n\n' +
          emailContext
    try {
      const res = await fetch(pb.baseUrl + '/backend/v1/genie/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: pb.authStore.token || '' },
        body: JSON.stringify({ message: prompt }),
      })
      const result = await streamAgentChat(res, {
        onChunk: (_d, full) => setGenieText(full),
      })
      setGenieText(result.content || '')
    } catch {
      setGenieText('Não consegui processar agora. Tente de novo.')
    } finally {
      setGenieStreaming(false)
    }
  }

  const askGenie = (q?: string) => {
    setPendingQuestion(q ?? null)
    setChatOpen(true)
  }

  const googleReady = connections.googleConnected
  const filtered = messages.filter((m) => {
    if (filter === 'unread') return m.is_unread
    if (filter === 'reply') return m.needs_reply
    return true
  })
  const emailPageSize = 12
  const emailPageCount = Math.max(1, Math.ceil(filtered.length / emailPageSize))
  const emailPage = Math.min(page, emailPageCount)
  const pagedEmails = filtered.slice((emailPage - 1) * emailPageSize, emailPage * emailPageSize)
  useEffect(() => {
    setPage(1)
  }, [filter])

  return (
    <AppShell onChatClick={() => askGenie()}>
      <header className="px-8 py-5 flex items-end justify-between flex-wrap gap-3 shrink-0">
        <div>
          <h1 className="font-display text-[32px] text-zinc-900 leading-none">Emails</h1>{' '}
          <p className="text-[13px] text-zinc-400 mt-0.5">
            {googleReady && connections.googleEmail
              ? connections.googleEmail
              : 'Mensagens do Gmail'}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap justify-end">
          {reportStatus && <span className="text-[12px] text-emerald-600">{reportStatus}</span>}
          <button
            onClick={handleSendReport}
            disabled={sendingReport}
            title="Envia um resumo das métricas dos últimos 7 dias para o seu email"
            className="inline-flex items-center gap-2 px-4 py-2 text-[12px] font-medium text-white bg-zinc-900 rounded-xl hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            <Send size={13} className={sendingReport ? 'animate-pulse' : ''} />
            {sendingReport ? 'Enviando...' : 'Enviar relatório'}
          </button>
          {googleReady && (
            <>
              {syncStatus && <span className="text-[12px] text-emerald-600">{syncStatus}</span>}
              <button
                onClick={handleSync}
                disabled={syncing}
                className="inline-flex items-center gap-2 px-4 py-2 text-[12px] font-medium text-zinc-600 bg-white border border-card-border rounded-xl hover:text-zinc-900 hover:border-zinc-300 transition-colors disabled:opacity-50"
              >
                <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
                {syncing ? 'Sincronizando...' : 'Sincronizar'}
              </button>
            </>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-hidden px-8 pb-8 flex flex-col gap-4">
        {googleReady && !loading && messages.length > 0 && (
          <div className="shrink-0">
            <GenieInsight
              prompt={
                'Em no maximo 3 frases, resuma minha caixa de entrada: quantos emails precisam de resposta, qual o mais importante (remetente + assunto) e o que pode esperar. Sem cumprimentos.'
              }
              questions={[
                'Quais emails preciso responder hoje?',
                'Resuma os não lidos',
                'Tem algo urgente na caixa?',
              ]}
              onAsk={askGenie}
            />
          </div>
        )}

        {loading || connections.loading ? (
          <div className="flex-1 flex gap-4 min-h-0">
            <div className="w-[340px] space-y-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="surface rounded-xl p-4">
                  <Skeleton className="h-3 w-32 mb-2" />
                  <Skeleton className="h-4 w-52 mb-2" />
                  <Skeleton className="h-3 w-full" />
                </div>
              ))}
            </div>
            <div className="flex-1 surface rounded-2xl" />
          </div>
        ) : !googleReady && messages.length === 0 ? (
          <ConnectPrompt service="google" />
        ) : messages.length === 0 ? (
          <div className="surface rounded-2xl p-8 text-center max-w-lg mx-auto mt-4">
            <Mail size={32} className="text-zinc-300 mx-auto mb-3" />
            <p className="text-[13px] text-zinc-400 mb-4">Nenhuma mensagem sincronizada</p>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="inline-flex items-center gap-2 px-4 py-2 text-[12px] font-medium text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Sincronizando...' : 'Sincronizar agora'}
            </button>
          </div>
        ) : (
          <div className="flex-1 flex gap-4 min-h-0">
            {/* Lista */}
            <aside
              className={`w-full lg:w-[340px] shrink-0 flex-col min-h-0 ${selected ? 'hidden lg:flex' : 'flex'}`}
            >
              <div className="flex items-center gap-1 mb-3 shrink-0 bg-white rounded-lg p-0.5 border border-card-border w-fit">
                {filters.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setFilter(f.key)}
                    className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-colors ${
                      filter === f.key
                        ? 'bg-zinc-900 text-white'
                        : 'text-zinc-500 hover:text-zinc-900'
                    }`}
                  >
                    {f.label}
                    {f.key === 'reply' && messages.filter((m) => m.needs_reply).length > 0 && (
                      <span className="ml-1.5 text-[10px] text-red-500 font-semibold">
                        {messages.filter((m) => m.needs_reply).length}
                      </span>
                    )}
                  </button>
                ))}
              </div>
              <div className="flex-1 overflow-y-auto space-y-1 pr-1">
                {filtered.length === 0 ? (
                  <p className="text-[12px] text-zinc-400 px-2 py-6 text-center">
                    Nada nesse filtro.
                  </p>
                ) : (
                  pagedEmails.map((msg) => {
                    const active = selected?.id === msg.id
                    return (
                      <button
                        key={msg.id}
                        onClick={() => openMessage(msg)}
                        className={`w-full text-left rounded-xl px-4 py-3 transition-colors border ${
                          active
                            ? 'bg-white border-brand-border shadow-card'
                            : 'bg-white/60 border-transparent hover:bg-white hover:border-card-border'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-0.5">
                          {msg.is_unread && (
                            <span className="w-1.5 h-1.5 rounded-full bg-brand shrink-0" />
                          )}
                          <span
                            className={`text-[12px] truncate ${msg.is_unread ? 'font-semibold text-zinc-900' : 'font-medium text-zinc-600'}`}
                          >
                            {senderName(msg.from_email)}
                          </span>
                          <span className="ml-auto text-[10px] text-zinc-400 shrink-0 tabular-nums">
                            {msg.date
                              ? new Date(msg.date).toLocaleDateString('pt-BR', {
                                  day: '2-digit',
                                  month: 'short',
                                })
                              : ''}
                          </span>
                        </div>
                        <p
                          className={`text-[13px] truncate ${msg.is_unread ? 'font-medium text-zinc-900' : 'text-zinc-700'}`}
                        >
                          {msg.subject || '(Sem assunto)'}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-[11px] text-zinc-400 truncate flex-1">{msg.snippet}</p>
                          {msg.needs_reply && (
                            <span className="flex items-center gap-1 text-[9px] font-medium text-red-500 bg-red-50 px-1.5 py-0.5 rounded shrink-0">
                              <AlertCircle size={9} /> Responder
                            </span>
                          )}
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
              <Pagination page={emailPage} pageCount={emailPageCount} onPage={setPage} compact />
            </aside>

            {/* Leitor */}
            <section
              className={`flex-1 surface rounded-2xl flex-col min-h-0 overflow-hidden ${selected ? 'flex' : 'hidden lg:flex'}`}
            >
              {!selected ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <Mail size={28} className="text-zinc-200 mx-auto mb-3" />
                    <p className="text-[13px] text-zinc-400">Selecione um email para ler aqui</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="px-6 py-4 border-b border-zinc-100 shrink-0">
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => setSelected(null)}
                        className="lg:hidden w-7 h-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-900 shrink-0 mt-0.5"
                      >
                        <ArrowLeft size={15} />
                      </button>
                      <div className="w-8 h-8 rounded-full bg-brand-subtle border border-brand-border flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-[12px] font-semibold text-brand">
                          {senderName(selected.from_email)[0]?.toUpperCase() || '?'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className="text-[15px] font-semibold text-zinc-900 leading-snug">
                          {selected.subject || '(Sem assunto)'}
                        </h2>
                        <p className="text-[12px] text-zinc-400 mt-0.5 truncate">
                          {selected.from_email}
                          {selected.date
                            ? ' · ' +
                              new Date(selected.date).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : ''}
                        </p>
                      </div>
                      {detail?.gmailUrl && (
                        <a
                          href={detail.gmailUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-zinc-600 bg-zinc-50 rounded-lg hover:bg-zinc-100 hover:text-zinc-900 transition-colors shrink-0"
                        >
                          Responder no Gmail
                          <ExternalLink size={11} />
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <button
                        onClick={() => runGenie('resumo')}
                        disabled={genieStreaming || detail?.loading}
                        className="inline-flex items-center gap-1.5 px-3 h-7 rounded-full bg-brand-subtle border border-brand-border text-[12px] font-medium text-brand hover:brightness-95 transition-all disabled:opacity-50"
                      >
                        <Sparkles size={11} />
                        Resumir
                      </button>
                      <button
                        onClick={() => runGenie('rascunho')}
                        disabled={genieStreaming || detail?.loading}
                        className="inline-flex items-center gap-1.5 px-3 h-7 rounded-full bg-brand-subtle border border-brand-border text-[12px] font-medium text-brand hover:brightness-95 transition-all disabled:opacity-50"
                      >
                        <PenLine size={11} />
                        Rascunhar resposta
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto px-6 py-5">
                    {genieMode && (
                      <div className="mb-5 rounded-xl bg-brand-subtle/60 border border-brand-border px-4 py-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Sparkles size={12} className="text-brand" />
                          <span className="text-[11px] font-semibold text-brand uppercase tracking-wider">
                            {genieMode === 'resumo' ? 'Resumo' : 'Rascunho de resposta'}
                          </span>
                          {genieMode === 'rascunho' && genieText && !genieStreaming && (
                            <button
                              onClick={() => navigator.clipboard?.writeText(genieText)}
                              className="ml-auto text-[11px] font-medium text-zinc-500 hover:text-zinc-900"
                            >
                              Copiar
                            </button>
                          )}
                        </div>
                        {genieText ? (
                          <div className="text-[13px] text-zinc-700 leading-relaxed">
                            <Markdown text={genieText} />
                          </div>
                        ) : (
                          <div className="space-y-2 py-1">
                            <div className="h-3 rounded bg-white/70 animate-pulse" />
                            <div className="h-3 rounded bg-white/70 animate-pulse w-3/4" />
                          </div>
                        )}
                      </div>
                    )}

                    {detail?.loading ? (
                      <div className="space-y-2.5">
                        <Skeleton className="h-3.5 w-full" />
                        <Skeleton className="h-3.5 w-11/12" />
                        <Skeleton className="h-3.5 w-4/5" />
                        <Skeleton className="h-3.5 w-full" />
                        <Skeleton className="h-3.5 w-2/3" />
                      </div>
                    ) : detail?.error ? (
                      <p className="text-[13px] text-red-500">{detail.error}</p>
                    ) : (
                      <p className="text-[13px] text-zinc-700 leading-relaxed whitespace-pre-wrap break-words">
                        {detail?.text}
                      </p>
                    )}
                  </div>
                </>
              )}
            </section>
          </div>
        )}
      </main>
      <ChatPanel
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        pendingQuestion={pendingQuestion}
        onConsumeQuestion={() => setPendingQuestion(null)}
      />
    </AppShell>
  )
}
