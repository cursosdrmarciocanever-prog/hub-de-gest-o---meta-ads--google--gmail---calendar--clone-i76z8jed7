import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Video,
  Sparkles,
  Mail,
  AlertCircle,
  ArrowRight,
  Megaphone,
  CalendarDays,
  RefreshCw,
} from 'lucide-react'
import { AppShell } from '@/components/AppShell'
import { ChatPanel } from '@/components/ChatPanel'
import { GenieInsight } from '@/components/GenieInsight'
import { EmptyState } from '@/components/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import { useConnections } from '@/hooks/use-connections'
import { isAutomatedEmail } from '@/lib/text'
import pb from '@/lib/pocketbase/client'

interface TodayEvent {
  id: string
  title: string
  start_time: string
  end_time: string
  attendees: string[]
  when_local: string
  meet_link: string
  html_link: string
}

interface ReplyEmail {
  id: string
  from_email: string
  subject: string
  date: string
}

function senderName(from: string): string {
  const m = from.match(/^"?([^"<]+)"?\s*</)
  return (m ? m[1] : from.split('@')[0]).trim()
}

function sameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export default function Today() {
  const [chatOpen, setChatOpen] = useState(false)
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null)
  const [events, setEvents] = useState<TodayEvent[]>([])
  const [replyEmails, setReplyEmails] = useState<ReplyEmail[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [metaSpendDay, setMetaSpendDay] = useState<{ date: string; spend: number } | null>(null)
  const [activeCampaigns, setActiveCampaigns] = useState(0)
  const [loading, setLoading] = useState(true)
  const [syncState, setSyncState] = useState<'idle' | 'syncing' | 'done'>('idle')
  const connections = useConnections()

  const loadAll = async () => {
    try {
      const [eventRecords, mailRecords, metricRecords, campRecords] = await Promise.all([
        pb
          .collection('calendar_events')
          .getFullList({ sort: 'start_time' })
          .catch(() => []),
        pb
          .collection('gmail_messages')
          .getFullList({ sort: '-date', perPage: 50 })
          .catch(() => []),
        pb
          .collection('daily_metrics')
          .getFullList({ sort: '-date', perPage: 100 })
          .catch(() => []),
        pb
          .collection('campaigns')
          .getFullList()
          .catch(() => []),
      ])

      setEvents(
        (eventRecords as any[]).map((r) => ({
          id: r.id,
          title: r.title || '(Sem título)',
          start_time: r.start_time,
          end_time: r.end_time,
          attendees: (r.attendees || '')
            .split(',')
            .map((a: string) => a.trim())
            .filter(Boolean),
          when_local: r.when_local || '',
          meet_link: r.meet_link || '',
          html_link: r.html_link || '',
        })),
      )

      const mails = mailRecords as any[]
      setUnreadCount(mails.filter((m) => m.is_unread).length)
      setReplyEmails(
        mails
          .filter((m) => m.needs_reply && !isAutomatedEmail(m.from_email || '', m.subject || ''))
          .slice(0, 3)
          .map((m) => ({
            id: m.id,
            from_email: m.from_email || '',
            subject: m.subject || '(Sem assunto)',
            date: m.date,
          })),
      )

      const metrics = metricRecords as any[]
      if (metrics.length > 0) {
        const lastDate = ((metrics[0].date || '') as string).split(' ')[0]
        const spend = metrics
          .filter((m) => ((m.date || '') as string).split(' ')[0] === lastDate)
          .reduce((s, m) => s + (m.spend || 0), 0)
        setMetaSpendDay({ date: lastDate, spend })
      }
      setActiveCampaigns((campRecords as any[]).filter((c) => c.status === 'active').length)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  // Auto-sync do Google ao entrar (no máx. 1x a cada 10 min por sessão):
  // quem abre de manhã já encontra emails e agenda atualizados.
  useEffect(() => {
    if (connections.loading || !connections.googleConnected) return
    const last = Number(sessionStorage.getItem('hub_auto_sync') || 0)
    if (Date.now() - last < 10 * 60 * 1000) return
    sessionStorage.setItem('hub_auto_sync', String(Date.now()))
    setSyncState('syncing')
    fetch(pb.baseUrl + '/backend/v1/google/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: pb.authStore.token || '' },
      body: JSON.stringify({}),
    })
      .then(() => {
        setSyncState('done')
        loadAll()
        setTimeout(() => setSyncState('idle'), 5000)
      })
      .catch(() => setSyncState('idle'))
  }, [connections.loading, connections.googleConnected])

  const askGenie = (q?: string) => {
    setPendingQuestion(q ?? null)
    setChatOpen(true)
  }

  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'
  const user = pb.authStore.record as any
  const userName = user ? user.name || user.email?.split('@')[0] || '' : ''

  const upcoming = events.filter((e) => {
    const end = new Date(e.end_time || e.start_time)
    return !isNaN(end.getTime()) && end >= now
  })
  const nextEvent = upcoming[0] || null
  const todayEvents = events.filter((e) => {
    const s = new Date(e.start_time)
    return !isNaN(s.getTime()) && sameLocalDay(s, now)
  })

  const prepareMeeting = (ev: TodayEvent) => {
    const attendeesText = ev.attendees.length > 0 ? ev.attendees.join(', ') : 'sem participantes'
    askGenie(
      `Me prepare para a reunião "${ev.title}" (${ev.when_local || 'horário na agenda'}): ` +
        `resuma o contexto que você tiver, e verifique se há emails recentes dos participantes (${attendeesText}) que eu deva ler antes.`,
    )
  }

  const anyConnection = connections.metaConnected || connections.googleConnected
  const hasContent = events.length > 0 || replyEmails.length > 0 || unreadCount > 0 || metaSpendDay

  return (
    <AppShell onChatClick={() => askGenie()}>
      <main className="flex-1 overflow-y-auto">
        {/* Hero */}
        <div className="pt-10 pb-7 px-8 text-center">
          <p className="text-[13px] text-zinc-400 capitalize mb-1.5">
            {now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <h1 className="font-display text-[42px] text-zinc-900 leading-none">
            {greeting}
            {userName ? `, ${userName}` : ''}
          </h1>{' '}
          <div className="h-5 mt-2">
            {syncState === 'syncing' && (
              <span className="inline-flex items-center gap-1.5 text-[12px] text-zinc-400">
                <RefreshCw size={11} className="animate-spin" />
                Atualizando seus dados...
              </span>
            )}
            {syncState === 'done' && (
              <span className="text-[12px] text-emerald-600">Tudo atualizado agora</span>
            )}
          </div>
        </div>

        <div className="px-8 pb-10 max-w-5xl mx-auto">
          {loading || connections.loading ? (
            <div className="grid lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2 space-y-5">
                <div className="surface rounded-2xl p-5">
                  <Skeleton className="h-4 w-28 mb-4" />
                  <Skeleton className="h-3 w-full mb-2" />
                  <Skeleton className="h-3 w-4/5" />
                </div>
                <div className="surface rounded-2xl p-5">
                  <Skeleton className="h-4 w-40 mb-4" />
                  <Skeleton className="h-3 w-full mb-2" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </div>
              <div className="surface rounded-2xl p-5">
                <Skeleton className="h-4 w-24 mb-4" />
                <Skeleton className="h-3 w-full mb-2" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
          ) : !anyConnection ? (
            <EmptyState
              metaConnected={connections.metaConnected}
              googleConnected={connections.googleConnected}
            />
          ) : (
            <div className="grid lg:grid-cols-3 gap-5 items-start">
              {/* Coluna principal */}
              <div className="lg:col-span-2 space-y-5">
                {hasContent && (
                  <GenieInsight
                    prompt={
                      'Faca meu briefing do dia em ate 4 bullets curtos: 1) emails que precisam de resposta (quantos e o mais importante); 2) proximos compromissos de hoje com horarios (use when_local); 3) algo nas campanhas Meta Ads que mereca atencao; 4) uma sugestao clara de foco pro dia. Sem cumprimentos.'
                    }
                    questions={[
                      'O que devo priorizar hoje?',
                      'Resume o que aconteceu enquanto estive fora',
                      'Como estão as campanhas?',
                    ]}
                    onAsk={askGenie}
                  />
                )}

                {/* Emails que precisam de resposta */}
                <div className="surface rounded-2xl overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-zinc-100 flex items-center gap-2">
                    <Mail size={14} className="text-zinc-400" />
                    <h3 className="text-[13px] font-semibold text-zinc-900">
                      Precisam de resposta
                    </h3>
                    {unreadCount > 0 && (
                      <span className="text-[11px] text-zinc-400">· {unreadCount} não lidos</span>
                    )}
                    <Link
                      to="/emails"
                      className="ml-auto inline-flex items-center gap-1 text-[12px] font-medium text-zinc-400 hover:text-zinc-900 transition-colors"
                    >
                      Emails
                      <ArrowRight size={12} />
                    </Link>
                  </div>
                  {replyEmails.length === 0 ? (
                    <p className="px-5 py-5 text-[13px] text-zinc-400">
                      {connections.googleConnected
                        ? 'Caixa em dia — nada esperando resposta. 🎉'
                        : 'Conecte o Google para ver seus emails aqui.'}
                    </p>
                  ) : (
                    <div className="divide-y divide-zinc-50">
                      {replyEmails.map((m) => (
                        <Link
                          key={m.id}
                          to="/emails"
                          className="flex items-center gap-3 px-5 py-3 hover:bg-zinc-50/60 transition-colors"
                        >
                          <span className="flex items-center gap-1 text-[9px] font-medium text-red-500 bg-red-50 px-1.5 py-0.5 rounded shrink-0">
                            <AlertCircle size={9} /> Responder
                          </span>
                          <span className="text-[12px] font-medium text-zinc-900 shrink-0 w-32 truncate">
                            {senderName(m.from_email)}
                          </span>
                          <span className="text-[13px] text-zinc-600 truncate flex-1">
                            {m.subject}
                          </span>
                          <span className="text-[11px] text-zinc-400 shrink-0 tabular-nums">
                            {m.date
                              ? new Date(m.date).toLocaleDateString('pt-BR', {
                                  day: '2-digit',
                                  month: 'short',
                                })
                              : ''}
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                {/* Pulso do Meta Ads */}
                {connections.metaConnected && (
                  <div className="surface rounded-2xl px-5 py-4 flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Megaphone size={14} className="text-zinc-400" />
                      <h3 className="text-[13px] font-semibold text-zinc-900">Meta Ads</h3>
                    </div>
                    <div className="flex items-center gap-5 flex-wrap">
                      {metaSpendDay && (
                        <div>
                          <p className="text-[10px] text-zinc-400 uppercase tracking-wider">
                            Último dia com dados
                          </p>
                          <p className="text-[14px] font-semibold text-zinc-900 tabular-nums">
                            R${' '}
                            {metaSpendDay.spend.toLocaleString('pt-BR', {
                              maximumFractionDigits: 0,
                            })}
                            <span className="text-[11px] font-normal text-zinc-400 ml-1.5">
                              {metaSpendDay.date.split('-').reverse().slice(0, 2).join('/')}
                            </span>
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-[10px] text-zinc-400 uppercase tracking-wider">
                          Campanhas ativas
                        </p>
                        <p className="text-[14px] font-semibold text-zinc-900 tabular-nums">
                          {activeCampaigns}
                        </p>
                      </div>
                    </div>
                    <Link
                      to="/dashboard"
                      className="ml-auto inline-flex items-center gap-1 text-[12px] font-medium text-zinc-400 hover:text-zinc-900 transition-colors"
                    >
                      Dashboard
                      <ArrowRight size={12} />
                    </Link>
                  </div>
                )}
              </div>

              {/* Pauta */}
              <div className="space-y-5">
                <div className="surface rounded-2xl overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-zinc-100 flex items-center gap-2">
                    <CalendarDays size={14} className="text-zinc-400" />
                    <h3 className="text-[13px] font-semibold text-zinc-900">Pauta</h3>
                    <Link
                      to="/calendar"
                      className="ml-auto inline-flex items-center gap-1 text-[12px] font-medium text-zinc-400 hover:text-zinc-900 transition-colors"
                    >
                      Agenda
                      <ArrowRight size={12} />
                    </Link>
                  </div>

                  {nextEvent ? (
                    <div className="px-5 py-4">
                      <p className="text-[10px] text-zinc-400 uppercase tracking-wider mb-1.5">
                        A seguir
                      </p>
                      <p className="text-[14px] font-semibold text-zinc-900 leading-snug">
                        {nextEvent.title}
                      </p>
                      <p className="text-[12px] text-zinc-500 mt-0.5 tabular-nums">
                        {(() => {
                          const s = new Date(nextEvent.start_time)
                          const e = new Date(nextEvent.end_time)
                          const day = sameLocalDay(s, now)
                            ? 'Hoje'
                            : s.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
                          return `${day}, ${s.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}${!isNaN(e.getTime()) ? '–' + e.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}`
                        })()}
                      </p>
                      {nextEvent.attendees.length > 0 && (
                        <div className="flex items-center gap-1 mt-2.5">
                          {nextEvent.attendees.slice(0, 4).map((a) => (
                            <span
                              key={a}
                              title={a}
                              className="w-6 h-6 rounded-full bg-brand-subtle border border-brand-border flex items-center justify-center text-[10px] font-semibold text-brand"
                            >
                              {a[0]?.toUpperCase()}
                            </span>
                          ))}
                          {nextEvent.attendees.length > 4 && (
                            <span className="text-[11px] text-zinc-400 ml-1">
                              +{nextEvent.attendees.length - 4}
                            </span>
                          )}
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-3.5 flex-wrap">
                        <button
                          onClick={() => prepareMeeting(nextEvent)}
                          className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg bg-brand-gradient text-white text-[12px] font-medium hover:brightness-110 transition-all"
                        >
                          <Sparkles size={12} />
                          Preparar com o Genie
                        </button>
                        {nextEvent.meet_link && (
                          <a
                            href={nextEvent.meet_link}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg bg-white border border-card-border text-[12px] font-medium text-zinc-600 hover:text-zinc-900 hover:border-zinc-300 transition-colors"
                          >
                            <Video size={12} />
                            Meet
                          </a>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="px-5 py-5 text-[13px] text-zinc-400">
                      {connections.googleConnected
                        ? 'Nada na pauta — agenda livre à frente.'
                        : 'Conecte o Google para ver sua pauta aqui.'}
                    </p>
                  )}

                  {todayEvents.length > 0 && (
                    <div className="border-t border-zinc-100 px-5 py-4">
                      <p className="text-[10px] text-zinc-400 uppercase tracking-wider mb-2.5">
                        Seu dia · {todayEvents.length}{' '}
                        {todayEvents.length === 1 ? 'evento' : 'eventos'}
                      </p>
                      <div className="space-y-2">
                        {todayEvents.map((ev) => {
                          const s = new Date(ev.start_time)
                          const past = new Date(ev.end_time || ev.start_time) < now
                          return (
                            <div key={ev.id} className="flex items-center gap-2.5">
                              <span
                                className={`text-[12px] tabular-nums shrink-0 w-10 ${past ? 'text-zinc-300' : 'text-zinc-500 font-medium'}`}
                              >
                                {isNaN(s.getTime())
                                  ? '--:--'
                                  : s.toLocaleTimeString('pt-BR', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                              </span>
                              <span
                                className={`w-1 h-1 rounded-full shrink-0 ${past ? 'bg-zinc-200' : 'bg-brand'}`}
                              />
                              <span
                                className={`text-[12px] truncate ${past ? 'text-zinc-300 line-through' : 'text-zinc-700'}`}
                              >
                                {ev.title}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
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
