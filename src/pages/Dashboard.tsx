import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Megaphone, Plug, ArrowRight } from 'lucide-react'
import { AppShell } from '@/components/AppShell'
import { TopBar } from '@/components/TopBar'
import { ChatPanel } from '@/components/ChatPanel'
import { KpiCard } from '@/components/KpiCard'
import { GenieCard } from '@/components/GenieCard'
import { PerformanceChart } from '@/components/PerformanceChart'
import { CampaignTable } from '@/components/CampaignTable'
import { PeriodSelector } from '@/components/PeriodSelector'
import { EventsCard } from '@/components/EventsCard'
import { EmptyState } from '@/components/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import { useDashboardData } from '@/hooks/use-dashboard-data'
import type { PeriodType } from '@/lib/dashboard-utils'

type MetricType = 'spend' | 'conversions' | 'ctr' | 'impressions' | 'clicks'

const kpiMetricMap: Record<string, MetricType> = {
  Investimento: 'spend',
  Impressões: 'impressions',
  Conversões: 'conversions',
  'CTR Médio': 'ctr',
}

export default function Dashboard() {
  const [chatOpen, setChatOpen] = useState(false)
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null)
  const [period, setPeriod] = useState<PeriodType>('7d')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [metric, setMetric] = useState<MetricType>('spend')

  const {
    kpis,
    chartData,
    campaigns,
    events,
    loading,
    hasData,
    hasConnection,
    googleConnected,
    userName,
    latestMetricDate,
  } = useDashboardData(period, customStart, customEnd)

  // Conta com atividade antiga: se o período padrão vier vazio mas existirem
  // métricas em outra época, salta pro período com dados mais recentes em vez
  // de mostrar tudo zerado (parece bug, mas os dados estão certos).
  const [autoFitted, setAutoFitted] = useState(false)
  const autoFitRef = useRef(false)
  useEffect(() => {
    if (loading || autoFitRef.current || !latestMetricDate) return
    if (hasData && chartData.length === 0) {
      autoFitRef.current = true
      const end = new Date(latestMetricDate + 'T12:00:00')
      const start = new Date(end.getTime() - 29 * 86400000)
      setCustomStart(start.toISOString().split('T')[0])
      setCustomEnd(latestMetricDate)
      setPeriod('custom')
      setAutoFitted(true)
    }
  }, [loading, hasData, chartData.length, latestMetricDate])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'

  const handlePeriodChange = (p: PeriodType, cs?: string, ce?: string) => {
    setAutoFitted(false)
    setPeriod(p)
    if (cs !== undefined) setCustomStart(cs)
    if (ce !== undefined) setCustomEnd(ce)
  }

  const askGenie = (q?: string) => {
    setPendingQuestion(q ?? null)
    setChatOpen(true)
  }

  return (
    <AppShell onChatClick={() => askGenie()}>
      <TopBar />

      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="px-8 pt-7 flex items-end justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-display text-[34px] text-zinc-900 leading-none">
              {greeting}, {userName || 'Usuário'}
            </h1>{' '}
            <p className="text-[13px] text-zinc-500 mt-1">
              {new Date().toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </p>
          </div>
          <PeriodSelector
            period={period}
            customStart={customStart}
            customEnd={customEnd}
            onPeriodChange={handlePeriodChange}
          />
        </div>

        {/* Ações rápidas */}
        <div className="px-8 pt-5 pb-6 flex items-center gap-2 flex-wrap">
          <Link
            to="/campaigns"
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-white border border-card-border text-zinc-600 text-[12px] font-medium hover:text-zinc-900 hover:border-zinc-300 transition-colors"
          >
            <Megaphone size={13} />
            Campanhas
          </Link>
          <Link
            to="/connect"
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-white border border-card-border text-zinc-600 text-[12px] font-medium hover:text-zinc-900 hover:border-zinc-300 transition-colors"
          >
            <Plug size={13} />
            Integrações
          </Link>
        </div>

        {autoFitted && latestMetricDate && (
          <div className="px-8 -mt-2 pb-3">
            <p className="text-[12px] text-zinc-400">
              Sem atividade recente nessa conta — mostrando o período com dados mais atuais (até{' '}
              {new Date(latestMetricDate + 'T12:00:00').toLocaleDateString('pt-BR')}).
            </p>
          </div>
        )}

        {/* Conteúdo */}
        <div className="px-8 pb-10">
          {loading ? (
            <div className="flex gap-6 items-start">
              <div className="flex-1 min-w-0 space-y-6">
                <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="surface rounded-2xl p-5">
                      <Skeleton className="h-3 w-20 mb-3" />
                      <Skeleton className="h-7 w-28 mb-2" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  ))}
                </div>
                <div className="surface rounded-2xl p-6">
                  <Skeleton className="h-4 w-32 mb-6" />
                  <Skeleton className="h-[200px] w-full" />
                </div>
              </div>
              <aside className="w-[320px] shrink-0 space-y-5 hidden lg:block">
                <div className="surface rounded-2xl p-5">
                  <Skeleton className="h-4 w-24 mb-4" />
                  <Skeleton className="h-3 w-full mb-2" />
                  <Skeleton className="h-3 w-4/5" />
                </div>
              </aside>
            </div>
          ) : hasData ? (
            <div className="flex gap-6 items-start">
              <div className="flex-1 min-w-0 space-y-6">
                <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                  {kpis.map((kpi) => {
                    const mk = kpiMetricMap[kpi.label]
                    return (
                      <KpiCard
                        key={kpi.label}
                        {...kpi}
                        active={mk ? mk === metric : false}
                        onClick={mk ? () => setMetric(mk) : undefined}
                      />
                    )
                  })}
                </div>
                {chartData.length > 0 && (
                  <PerformanceChart data={chartData} metric={metric} onMetricChange={setMetric} />
                )}
                {campaigns.length > 0 && (
                  <div>
                    <CampaignTable campaigns={campaigns.slice(0, 5)} />
                    <div className="mt-3 text-right">
                      <Link
                        to="/campaigns"
                        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
                      >
                        Ver todas as campanhas
                        <ArrowRight size={14} />
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              <aside className="w-[320px] shrink-0 space-y-5 hidden lg:block">
                <GenieCard onAsk={askGenie} hasData={hasData} />
                <EventsCard events={events} googleConnected={googleConnected} />
              </aside>
            </div>
          ) : (
            <EmptyState metaConnected={hasConnection} googleConnected={googleConnected} />
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
