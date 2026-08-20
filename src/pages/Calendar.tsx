import { useState, useEffect, useCallback } from 'react'
import {
  CalendarDays,
  MapPin,
  Users,
  RefreshCw,
  Video,
  ExternalLink,
  Sparkles,
  ChevronDown,
} from 'lucide-react'
import { AppShell } from '@/components/AppShell'
import { ConnectPrompt } from '@/components/ConnectPrompt'
import { ChatPanel } from '@/components/ChatPanel'
import { GenieInsight } from '@/components/GenieInsight'
import { Skeleton } from '@/components/ui/skeleton'
import { useConnections } from '@/hooks/use-connections'
import { useRealtime } from '@/hooks/use-realtime'
import { htmlToText } from '@/lib/text'
import pb from '@/lib/pocketbase/client'

interface CalendarEvent {
  id: string
  title: string
  start_time: string
  end_time: string
  location: string
  description: string
  attendees: string[]
  when_local: string
  html_link: string
  meet_link: string
}

function dayLabel(date: Date): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(date)
  target.setHours(0, 0, 0, 0)
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000)
  if (diffDays === 0) return 'Hoje'
  if (diffDays === 1) return 'Amanhã'
  return date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
}

export default function CalendarPage() {
  const [chatOpen, setChatOpen] = useState(false)
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const connections = useConnections()

  const load = useCallback(async () => {
    try {
      const records = await pb.collection('calendar_events').getFullList({ sort: 'start_time' })
      setEvents(
        records.map((r: any) => ({
          id: r.id,
          title: r.title || '(Sem título)',
          start_time: r.start_time,
          end_time: r.end_time,
          location: r.location || '',
          description: htmlToText(r.description || ''),
          attendees: (r.attendees || '')
            .split(',')
            .map((a: string) => a.trim())
            .filter(Boolean),
          when_local: r.when_local || '',
          html_link: r.html_link || '',
          meet_link: r.meet_link || '',
        })),
      )
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useRealtime('calendar_events', () => load())

  const handleSync = async () => {
    setSyncing(true)
    setSyncMsg('')
    try {
      const resp = await fetch(pb.baseUrl + '/backend/v1/google/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: pb.authStore.token || '' },
        body: JSON.stringify({}),
      })
      const data = await resp.json()
      if (resp.ok) {
        setSyncMsg(`${data.events || 0} eventos atualizados`)
        load()
      } else {
        setSyncMsg('Erro: ' + (data.error || data.message || ''))
      }
      setTimeout(() => setSyncMsg(''), 4000)
    } catch {
      setSyncMsg('Erro de conexão')
      setTimeout(() => setSyncMsg(''), 4000)
    } finally {
      setSyncing(false)
    }
  }

  const askGenie = (q?: string) => {
    setPendingQuestion(q ?? null)
    setChatOpen(true)
  }

  const prepareMeeting = (ev: CalendarEvent) => {
    const attendeesText = ev.attendees.length > 0 ? ev.attendees.join(', ') : 'sem participantes'
    askGenie(
      `Me prepare para a reunião "${ev.title}" (${ev.when_local || 'horário na agenda'}): ` +
        `resuma o contexto que você tiver, e verifique se há emails recentes dos participantes (${attendeesText}) que eu deva ler antes.`,
    )
  }

  const now = new Date()
  const upcoming = events.filter((e) => {
    const end = new Date(e.end_time || e.start_time)
    return !isNaN(end.getTime()) && end >= now
  })

  const groups: { key: string; label: string; items: CalendarEvent[] }[] = []
  for (const ev of upcoming) {
    const d = new Date(ev.start_time)
    const key = isNaN(d.getTime()) ? 'sem-data' : d.toISOString().split('T')[0]
    let group = groups.find((g) => g.key === key)
    if (!group) {
      group = { key, label: isNaN(d.getTime()) ? 'Sem data' : dayLabel(d), items: [] }
      groups.push(group)
    }
    group.items.push(ev)
  }

  // Visão dos próximos 7 dias pro rail lateral
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() + i)
    const count = upcoming.filter((ev) => {
      const s = new Date(ev.start_time)
      return (
        !isNaN(s.getTime()) &&
        s.getFullYear() === d.getFullYear() &&
        s.getMonth() === d.getMonth() &&
        s.getDate() === d.getDate()
      )
    }).length
    return { date: d, count }
  })
  const maxDayCount = Math.max(...weekDays.map((w) => w.count), 1)
  const withMeet = upcoming.filter((e) => e.meet_link).length
  const withPeople = upcoming.filter((e) => e.attendees.length > 0).length

  const googleReady = connections.googleConnected

  return (
    <AppShell onChatClick={() => askGenie()}>
      <header className="px-8 py-6 flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-[32px] text-zinc-900 leading-none">Agenda</h1>{' '}
          <p className="text-[13px] text-zinc-400 mt-0.5">
            {googleReady && connections.googleEmail
              ? connections.googleEmail
              : 'Próximos eventos do Google Calendar'}
          </p>
        </div>
        {googleReady && (
          <div className="flex items-center gap-3">
            {syncMsg && <span className="text-[12px] text-emerald-600">{syncMsg}</span>}
            <button
              onClick={handleSync}
              disabled={syncing}
              className="inline-flex items-center gap-2 px-4 py-2 text-[12px] font-medium text-zinc-600 bg-white border border-card-border rounded-xl hover:text-zinc-900 hover:border-zinc-300 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Sincronizando...' : 'Sincronizar'}
            </button>
          </div>
        )}
      </header>

      <main className="flex-1 overflow-y-auto px-8 pb-10">
        {loading || connections.loading ? (
          <div className="max-w-2xl space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="surface rounded-2xl p-5">
                <Skeleton className="h-3 w-24 mb-3" />
                <Skeleton className="h-4 w-64 mb-2" />
                <Skeleton className="h-3 w-40" />
              </div>
            ))}
          </div>
        ) : !googleReady && upcoming.length === 0 ? (
          <ConnectPrompt service="google" />
        ) : upcoming.length === 0 ? (
          <div className="surface rounded-2xl p-10 text-center max-w-lg">
            <CalendarDays size={30} className="text-zinc-300 mx-auto mb-3" />
            <p className="text-[14px] font-medium text-zinc-900 mb-1">Agenda livre</p>
            <p className="text-[13px] text-zinc-400 mb-4">
              Nenhum evento nos próximos 7 dias — ou falta sincronizar.
            </p>
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
          <div className="max-w-5xl flex gap-6 items-start">
            <div className="flex-1 min-w-0 space-y-5">
              <GenieInsight
                prompt={
                  'Em no maximo 3 frases, faca um briefing da minha agenda: compromissos de hoje e amanha com horarios, e algo que exija preparo. Sem cumprimentos.'
                }
                questions={[
                  'Como está minha agenda hoje?',
                  'O que tenho nesta semana?',
                  'Qual meu próximo compromisso?',
                ]}
                onAsk={askGenie}
              />

              {groups.map((group) => (
                <div key={group.key}>
                  <h2 className="text-[12px] font-semibold text-zinc-500 uppercase tracking-wider mb-2 px-1">
                    {group.label}
                  </h2>
                  <div className="surface rounded-2xl divide-y divide-zinc-50">
                    {group.items.map((ev) => {
                      const start = new Date(ev.start_time)
                      const end = new Date(ev.end_time)
                      const expanded = expandedId === ev.id
                      return (
                        <div key={ev.id}>
                          <button
                            onClick={() => setExpandedId(expanded ? null : ev.id)}
                            className="w-full text-left flex items-start gap-4 px-5 py-4 hover:bg-zinc-50/60 transition-colors"
                          >
                            <div className="text-center shrink-0 w-14 pt-0.5">
                              <p className="text-[14px] font-semibold text-zinc-900 tabular-nums leading-tight">
                                {isNaN(start.getTime())
                                  ? '--:--'
                                  : start.toLocaleTimeString('pt-BR', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                              </p>
                              {!isNaN(end.getTime()) && (
                                <p className="text-[11px] text-zinc-400 tabular-nums">
                                  {end.toLocaleTimeString('pt-BR', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </p>
                              )}
                            </div>
                            <div className="w-px self-stretch bg-brand/30 rounded-full" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-[14px] font-medium text-zinc-900 truncate">
                                  {ev.title}
                                </p>
                                {ev.meet_link && (
                                  <Video size={13} className="text-brand shrink-0" />
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-1 flex-wrap">
                                {ev.location && (
                                  <span className="inline-flex items-center gap-1 text-[12px] text-zinc-400">
                                    <MapPin size={12} />
                                    {ev.location}
                                  </span>
                                )}
                                {ev.attendees.length > 0 && (
                                  <span className="inline-flex items-center gap-1 text-[12px] text-zinc-400">
                                    <Users size={12} />
                                    {ev.attendees.length}{' '}
                                    {ev.attendees.length === 1 ? 'participante' : 'participantes'}
                                  </span>
                                )}
                              </div>
                            </div>
                            <ChevronDown
                              size={15}
                              className={`text-zinc-300 shrink-0 mt-1 transition-transform ${expanded ? 'rotate-180' : ''}`}
                            />
                          </button>

                          {expanded && (
                            <div className="px-5 pb-5 pl-[92px]">
                              {ev.description && (
                                <p className="text-[13px] text-zinc-600 leading-relaxed whitespace-pre-wrap break-words mb-3">
                                  {ev.description}
                                </p>
                              )}
                              {ev.attendees.length > 0 && (
                                <div className="flex items-center gap-1.5 flex-wrap mb-4">
                                  {ev.attendees.slice(0, 6).map((a) => (
                                    <span
                                      key={a}
                                      className="px-2 py-1 rounded-md bg-zinc-50 border border-zinc-100 text-[11px] text-zinc-500"
                                    >
                                      {a}
                                    </span>
                                  ))}
                                  {ev.attendees.length > 6 && (
                                    <span className="text-[11px] text-zinc-400">
                                      +{ev.attendees.length - 6}
                                    </span>
                                  )}
                                </div>
                              )}
                              <div className="flex items-center gap-2 flex-wrap">
                                <button
                                  onClick={() => prepareMeeting(ev)}
                                  className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg bg-brand-gradient text-white text-[12px] font-medium hover:brightness-110 transition-all"
                                >
                                  <Sparkles size={12} />
                                  Preparar com o Genie
                                </button>
                                {ev.meet_link && (
                                  <a
                                    href={ev.meet_link}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg bg-white border border-card-border text-[12px] font-medium text-zinc-600 hover:text-zinc-900 hover:border-zinc-300 transition-colors"
                                  >
                                    <Video size={12} />
                                    Entrar no Meet
                                  </a>
                                )}
                                {ev.html_link && (
                                  <a
                                    href={ev.html_link}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg bg-white border border-card-border text-[12px] font-medium text-zinc-600 hover:text-zinc-900 hover:border-zinc-300 transition-colors"
                                  >
                                    Abrir no Google Calendar
                                    <ExternalLink size={11} />
                                  </a>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Rail: visão da semana */}
            <aside className="w-[300px] shrink-0 hidden xl:block space-y-4">
              <div className="surface rounded-2xl p-5">
                <h3 className="text-[13px] font-semibold text-zinc-900 mb-4">Próximos 7 dias</h3>
                <div className="space-y-2">
                  {weekDays.map((w, i) => {
                    const label =
                      i === 0
                        ? 'Hoje'
                        : i === 1
                          ? 'Amanhã'
                          : w.date.toLocaleDateString('pt-BR', { weekday: 'short' })
                    return (
                      <div key={w.date.toISOString()} className="flex items-center gap-3">
                        <span className="text-[11px] text-zinc-500 w-14 shrink-0 capitalize">
                          {label}
                        </span>
                        <span className="text-[11px] text-zinc-400 w-8 shrink-0 tabular-nums">
                          {w.date.getDate().toString().padStart(2, '0')}/
                          {(w.date.getMonth() + 1).toString().padStart(2, '0')}
                        </span>
                        <div className="flex-1 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-brand rounded-full"
                            style={{ width: `${(w.count / maxDayCount) * 100}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-medium text-zinc-600 w-4 text-right tabular-nums">
                          {w.count}
                        </span>
                      </div>
                    )
                  })}
                </div>
                <div className="mt-4 pt-4 border-t border-zinc-100 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-zinc-500">Eventos à frente</span>
                    <span className="text-[12px] font-semibold text-zinc-900 tabular-nums">
                      {upcoming.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-zinc-500">Com Meet</span>
                    <span className="text-[12px] font-semibold text-zinc-900 tabular-nums">
                      {withMeet}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-zinc-500">Com participantes</span>
                    <span className="text-[12px] font-semibold text-zinc-900 tabular-nums">
                      {withPeople}
                    </span>
                  </div>
                </div>
              </div>
            </aside>
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
