import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { PerformanceChart } from '@/components/PerformanceChart'
import { Pagination } from '@/components/Pagination'
import pb from '@/lib/pocketbase/client'

interface AdSet {
  id: string
  name: string
  status: string
  daily_budget: number
  optimization_goal: string
  spend: number
  impressions: number
  reach: number
  clicks: number
  ctr: number
  cpc: number
  cpm: number
  conversions: number
  cost_per_conversion: number
  purchase_roas: number
}

interface Ad {
  id: string
  name: string
  status: string
  creative_type: string
  headline: string
  body_text: string
  call_to_action: string
  spend: number
  impressions: number
  clicks: number
  ctr: number
  cpc: number
  conversions: number
  purchase_roas: number
  quality_ranking: string
  engagement_rate_ranking: string
  conversion_rate_ranking: string
  video_views: number
  likes: number
  comments: number
  shares: number
}

const dotColor: Record<string, string> = {
  active: 'bg-emerald-500',
  paused: 'bg-amber-400',
  deleted: 'bg-zinc-300',
  draft: 'bg-zinc-300',
}

const rankingColor: Record<string, string> = {
  above_average: 'text-emerald-600',
  average: 'text-zinc-500',
  below_average: 'text-red-400',
}

const rankingLabel: Record<string, string> = {
  above_average: 'Acima da media',
  average: 'Media',
  below_average: 'Abaixo da media',
}

function fmtMoney(v: number) {
  return 'R$ ' + (v || 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 })
}
function fmtNum(v: number) {
  return (v || 0).toLocaleString('pt-BR')
}
function fmtPct(v: number) {
  return (v || 0).toFixed(2) + '%'
}

export default function CampaignDetail() {
  const { id } = useParams()
  const [tab, setTab] = useState<'overview' | 'adsets' | 'ads'>('overview')
  const [campaign, setCampaign] = useState<any>(null)
  const [adsets, setAdsets] = useState<AdSet[]>([])
  const [ads, setAds] = useState<Ad[]>([])
  const [metrics, setMetrics] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAdset, setSelectedAdset] = useState<string | null>(null)
  const [adsetPage, setAdsetPage] = useState(1)
  const [adPage, setAdPage] = useState(1)
  const PAGE = 10

  useEffect(() => {
    async function fetch() {
      if (!id) return
      try {
        const c = await pb.collection('campaigns').getOne(id)
        setCampaign(c)

        const adsetRecords = await pb.collection('ad_sets').getFullList({
          filter: 'campaign_id = "' + id + '"',
          sort: '-spend',
        })
        setAdsets(adsetRecords as any)

        const adRecords = await pb.collection('ads').getFullList({
          filter: 'adset_id = "' + (adsetRecords[0]?.id || '') + '"',
          sort: '-spend',
        })
        setAds(adRecords as any)

        const metricRecords = await pb.collection('daily_metrics').getFullList({
          filter: 'campaign_id = "' + id + '"',
          sort: 'date',
          perPage: 500,
        })
        const byDate: Record<string, any> = {}
        for (const m of metricRecords as any) {
          const d = (m.date || '').split(' ')[0]
          if (!d) continue
          if (!byDate[d])
            byDate[d] = {
              date: d,
              spend: 0,
              conversions: 0,
              ctr: 0,
              impressions: 0,
              clicks: 0,
              count: 0,
            }
          byDate[d].spend += m.spend || 0
          byDate[d].conversions += m.conversions || 0
          byDate[d].impressions += m.impressions || 0
          byDate[d].clicks += m.clicks || 0
          byDate[d].ctr += m.ctr || 0
          byDate[d].count++
        }
        const points = Object.keys(byDate)
          .sort()
          .map((d) => ({
            ...byDate[d],
            ctr: byDate[d].count > 0 ? byDate[d].ctr / byDate[d].count : 0,
          }))
        setMetrics(points)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [id])

  async function loadAdsForAdset(adsetId: string) {
    setSelectedAdset(adsetId)
    setAdPage(1)
    const adRecords = await pb.collection('ads').getFullList({
      filter: 'adset_id = "' + adsetId + '"',
      sort: '-spend',
    })
    setAds(adRecords as any)
  }

  if (loading) {
    return (
      <AppShell>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-[13px] text-zinc-400">Carregando...</p>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      {/* Header with breadcrumb */}
      <header className="px-10 py-6">
        <div className="flex items-center gap-2 text-[12px] text-zinc-400 mb-3">
          <Link to="/campaigns" className="hover:text-zinc-900">
            Campanhas
          </Link>
          <span>/</span>
          <span className="text-zinc-900">{campaign?.name || 'Campanha'}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={'w-2 h-2 rounded-full ' + (dotColor[campaign?.status] || 'bg-zinc-300')}
            ></div>
            <h1 className="text-[22px] font-semibold text-zinc-900 tracking-tight">
              {campaign?.name}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {(['overview', 'adsets', 'ads'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={
                  'px-3.5 py-1.5 text-[12px] font-medium rounded-lg transition-colors ' +
                  (tab === t
                    ? 'bg-white text-zinc-900 shadow-card'
                    : 'text-zinc-400 hover:text-zinc-900')
                }
              >
                {t === 'overview'
                  ? 'Visao Geral'
                  : t === 'adsets'
                    ? 'Conjuntos de Anuncios'
                    : 'Anuncios'}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-10 pb-10 space-y-6">
        {/* Overview tab */}
        {tab === 'overview' && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {[
                { label: 'Spend', value: fmtMoney(campaign?.spend) },
                { label: 'ROAS', value: (campaign?.roas || 0).toFixed(1) + 'x' },
                { label: 'Impressions', value: fmtNum(campaign?.impressions) },
                { label: 'CTR', value: fmtPct(campaign?.ctr) },
                { label: 'CPC', value: fmtMoney(campaign?.cpc) },
                { label: 'Conversions', value: fmtNum(campaign?.conversions) },
              ].map((k) => (
                <div key={k.label} className="bg-white rounded-2xl p-5 shadow-card">
                  <p className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
                    {k.label}
                  </p>
                  <p className="text-[22px] font-semibold text-zinc-900 tabular-nums tracking-tight mt-2">
                    {k.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2">
                {metrics.length > 1 ? (
                  <PerformanceChart data={metrics} />
                ) : (
                  <div className="bg-white rounded-2xl p-6 shadow-card h-full min-h-[280px] flex items-center justify-center">
                    <p className="text-[13px] text-zinc-400">
                      Sem métricas diárias ainda — sincronize em Integrações para ver a evolução.
                    </p>
                  </div>
                )}
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-card">
                <h3 className="text-[14px] font-semibold text-zinc-900 mb-4">Configuracao</h3>
                <div className="space-y-3">
                  <Row label="Objetivo" value={campaign?.objective || '-'} />
                  <Row label="Tipo de compra" value={campaign?.buying_type || '-'} />
                  <Row label="Tipo de orcamento" value={campaign?.budget_type || '-'} />
                  <Row label="Orcamento" value={fmtMoney(campaign?.budget)} />
                  <Row label="Reach" value={fmtNum(campaign?.reach)} />
                  <Row label="Frequencia" value={(campaign?.frequency || 0).toFixed(2)} />
                </div>
              </div>
            </div>
          </>
        )}

        {/* Ad Sets tab */}
        {tab === 'adsets' && (
          <div className="bg-white rounded-2xl shadow-card overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-50">
              <h3 className="text-[14px] font-semibold text-zinc-900">Conjuntos de Anuncios</h3>
              <p className="text-[11px] text-zinc-400 mt-0.5">{adsets.length} conjuntos</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-zinc-50">
                    {[
                      'Nome',
                      'Status',
                      'Orcamento/dia',
                      'Spend',
                      'Impressoes',
                      'CTR',
                      'CPC',
                      'Conv.',
                      'ROAS',
                    ].map((h) => (
                      <th
                        key={h}
                        className="text-left font-medium text-zinc-400 text-[11px] px-4 py-3"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {adsets.slice((adsetPage - 1) * PAGE, adsetPage * PAGE).map((a) => (
                    <tr
                      key={a.id}
                      onClick={() => {
                        loadAdsForAdset(a.id)
                        setTab('ads')
                      }}
                      className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50/50 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3 font-medium text-zinc-900">{a.name}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className={
                              'w-1.5 h-1.5 rounded-full ' + (dotColor[a.status] || 'bg-zinc-300')
                            }
                          ></div>
                          <span className="text-zinc-500 capitalize">{a.status}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-zinc-500 tabular-nums">
                        {fmtMoney(a.daily_budget)}
                      </td>
                      <td className="px-4 py-3 text-zinc-600 tabular-nums">{fmtMoney(a.spend)}</td>
                      <td className="px-4 py-3 text-zinc-500 tabular-nums">
                        {fmtNum(a.impressions)}
                      </td>
                      <td className="px-4 py-3 text-zinc-500 tabular-nums">{fmtPct(a.ctr)}</td>
                      <td className="px-4 py-3 text-zinc-500 tabular-nums">{fmtMoney(a.cpc)}</td>
                      <td className="px-4 py-3 text-zinc-600 tabular-nums">
                        {fmtNum(a.conversions)}
                      </td>
                      <td className="px-4 py-3 font-semibold text-zinc-900 tabular-nums">
                        {(a.purchase_roas || 0).toFixed(1)}x
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {adsets.length > PAGE && (
              <div className="px-6 pb-4">
                <Pagination
                  page={adsetPage}
                  pageCount={Math.ceil(adsets.length / PAGE)}
                  onPage={setAdsetPage}
                  compact
                />
              </div>
            )}
          </div>
        )}

        {/* Ads tab */}
        {tab === 'ads' && (
          <div className="space-y-4">
            {selectedAdset && (
              <div className="flex items-center gap-2 text-[12px] text-zinc-400">
                <button onClick={() => setTab('adsets')} className="hover:text-zinc-900">
                  Conjuntos
                </button>
                <span>/</span>
                <span className="text-zinc-900">
                  {adsets.find((a) => a.id === selectedAdset)?.name || 'Anuncios'}
                </span>
              </div>
            )}
            <div className="bg-white rounded-2xl shadow-card overflow-hidden">
              <div className="px-6 py-4 border-b border-zinc-50">
                <h3 className="text-[14px] font-semibold text-zinc-900">Anuncios</h3>
                <p className="text-[11px] text-zinc-400 mt-0.5">{ads.length} anuncios</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-zinc-50">
                      {[
                        'Anuncio',
                        'Tipo',
                        'Spend',
                        'Impressoes',
                        'CTR',
                        'CPC',
                        'Conv.',
                        'ROAS',
                        'Qualidade',
                        'Engajamento',
                      ].map((h) => (
                        <th
                          key={h}
                          className="text-left font-medium text-zinc-400 text-[11px] px-4 py-3"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ads.slice((adPage - 1) * PAGE, adPage * PAGE).map((a) => (
                      <tr
                        key={a.id}
                        className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50/50 transition-colors cursor-pointer"
                      >
                        <td className="px-4 py-3">
                          <p className="font-medium text-zinc-900">{a.name}</p>
                          <p className="text-[11px] text-zinc-400 mt-0.5">{a.headline}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-zinc-500 capitalize">{a.creative_type}</span>
                        </td>
                        <td className="px-4 py-3 text-zinc-600 tabular-nums">
                          {fmtMoney(a.spend)}
                        </td>
                        <td className="px-4 py-3 text-zinc-500 tabular-nums">
                          {fmtNum(a.impressions)}
                        </td>
                        <td className="px-4 py-3 text-zinc-500 tabular-nums">{fmtPct(a.ctr)}</td>
                        <td className="px-4 py-3 text-zinc-500 tabular-nums">{fmtMoney(a.cpc)}</td>
                        <td className="px-4 py-3 text-zinc-600 tabular-nums">
                          {fmtNum(a.conversions)}
                        </td>
                        <td className="px-4 py-3 font-semibold text-zinc-900 tabular-nums">
                          {(a.purchase_roas || 0).toFixed(1)}x
                        </td>
                        <td
                          className={
                            'px-4 py-3 text-[12px] ' +
                            (rankingColor[a.quality_ranking] || 'text-zinc-500')
                          }
                        >
                          {rankingLabel[a.quality_ranking] || '-'}
                        </td>
                        <td
                          className={
                            'px-4 py-3 text-[12px] ' +
                            (rankingColor[a.engagement_rate_ranking] || 'text-zinc-500')
                          }
                        >
                          {rankingLabel[a.engagement_rate_ranking] || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {ads.length > PAGE && (
                <div className="px-6 pb-4">
                  <Pagination
                    page={adPage}
                    pageCount={Math.ceil(ads.length / PAGE)}
                    onPage={setAdPage}
                    compact
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </AppShell>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[12px] text-zinc-400">{label}</span>
      <span className="text-[13px] font-medium text-zinc-900 capitalize">{value}</span>
    </div>
  )
}
