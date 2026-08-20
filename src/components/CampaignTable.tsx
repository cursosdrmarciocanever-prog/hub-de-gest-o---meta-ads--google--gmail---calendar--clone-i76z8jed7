import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { getRoasColor } from '@/lib/dashboard-utils'
import { Pagination } from '@/components/Pagination'

interface Campaign {
  id: string
  name: string
  status: string
  spend: number
  impressions: number
  conversions: number
  roas: number
  objective?: string
}

type SortCol = 'name' | 'status' | 'spend' | 'impressions' | 'conversions' | 'roas'
type SortDir = 'asc' | 'desc'

const dotColor: Record<string, string> = {
  active: 'bg-brand',
  paused: 'bg-amber-400',
  draft: 'bg-zinc-300',
}
const statusLabel: Record<string, string> = {
  active: 'Ativa',
  paused: 'Pausada',
  draft: 'Rascunho',
}
const objectiveLabel: Record<string, string> = {
  traffic: 'Tráfego',
  awareness: 'Reconhecimento',
  engagement: 'Engajamento',
  leads: 'Leads',
  sales: 'Vendas',
  app_promotion: 'App',
}

// pageSize opcional: quando definido, a tabela pagina (o sort continua global,
// aplicado antes de fatiar a página). Sem pageSize, mostra tudo (ex.: top-5 do dashboard).
export function CampaignTable({
  campaigns,
  pageSize,
}: {
  campaigns: Campaign[]
  pageSize?: number
}) {
  const [sortCol, setSortCol] = useState<SortCol>('spend')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [page, setPage] = useState(1)

  // volta pra 1 ao reordenar ou quando a lista muda (troca de filtro na página)
  useEffect(() => {
    setPage(1)
  }, [campaigns.length, sortCol, sortDir])

  if (campaigns.length === 0) {
    return (
      <div className="surface rounded-2xl p-6">
        <h3 className="text-[14px] font-semibold text-zinc-900 mb-5">Campanhas</h3>
        <div className="flex items-center justify-center py-10">
          <p className="text-[13px] text-zinc-400">Nenhuma campanha encontrada</p>
        </div>
      </div>
    )
  }

  const sorted = [...campaigns].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1
    if (sortCol === 'name') return dir * a.name.localeCompare(b.name)
    if (sortCol === 'status') return dir * a.status.localeCompare(b.status)
    return dir * ((a[sortCol] as number) - (b[sortCol] as number))
  })

  const pageCount = pageSize ? Math.ceil(sorted.length / pageSize) : 1
  const current = Math.min(page, pageCount)
  const rows = pageSize ? sorted.slice((current - 1) * pageSize, current * pageSize) : sorted

  const maxConversions = Math.max(...campaigns.map((c) => c.conversions), 1)

  const toggleSort = (col: SortCol) => {
    if (sortCol === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortCol(col)
      setSortDir('desc')
    }
  }

  const headers: { key: SortCol; label: string; align?: string; width: string }[] = [
    { key: 'name', label: 'Nome', width: 'flex-1 min-w-[180px]' },
    { key: 'status', label: 'Status', width: 'w-20' },
    { key: 'impressions', label: 'Impressões', align: 'justify-end', width: 'w-24' },
    { key: 'conversions', label: 'Conversões', align: 'justify-end', width: 'w-28' },
    { key: 'roas', label: 'ROAS', align: 'justify-end', width: 'w-16' },
    { key: 'spend', label: 'Investimento', align: 'justify-end', width: 'w-28' },
  ]

  const rangeStart = pageSize ? (current - 1) * pageSize + 1 : 1
  const rangeEnd = pageSize ? Math.min(current * pageSize, sorted.length) : sorted.length

  return (
    <div className="surface rounded-2xl p-6">
      <div className="mb-5">
        <h3 className="text-[14px] font-semibold text-zinc-900">Campanhas</h3>
        <p className="text-[11px] text-zinc-500 mt-0.5">{campaigns.length} campanhas</p>
      </div>
      {/* Colunas têm largura fixa: sem o wrapper de scroll elas estouram o card em telas menores */}
      <div className="overflow-x-auto -mx-2 px-2">
        <div className="min-w-[640px] space-y-0.5">
          <div className="flex items-center gap-3 px-2 pb-2 border-b border-zinc-100">
            {headers.map((h) => (
              <button
                key={h.key}
                onClick={() => toggleSort(h.key)}
                className={`flex items-center gap-1 text-[11px] font-medium text-zinc-500 uppercase tracking-wider hover:text-zinc-900 transition-colors ${h.align || ''} ${h.width}`}
              >
                {h.label}
                {sortCol === h.key ? (
                  sortDir === 'asc' ? (
                    <ChevronUp size={12} className="text-zinc-900" />
                  ) : (
                    <ChevronDown size={12} className="text-zinc-900" />
                  )
                ) : (
                  <ChevronsUpDown size={12} className="text-zinc-300" />
                )}
              </button>
            ))}
          </div>
          {rows.map((c) => (
            <Link
              key={c.id}
              to={'/campaign/' + c.id}
              className="flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-zinc-50 transition-colors cursor-pointer group"
            >
              <div className="flex-1 min-w-[180px] flex items-center gap-2.5">
                <div
                  className={
                    'w-1.5 h-1.5 rounded-full shrink-0 ' + (dotColor[c.status] || 'bg-zinc-300')
                  }
                />
                <div className="min-w-0">
                  <span className="text-[13px] font-medium text-zinc-900 truncate block">
                    {c.name}
                  </span>
                  {c.objective && (
                    <span className="text-[11px] text-zinc-400">
                      {objectiveLabel[c.objective] || c.objective}
                    </span>
                  )}
                </div>
              </div>
              <div className="w-20">
                <span className="text-[11px] text-zinc-500">
                  {statusLabel[c.status] || c.status}
                </span>
              </div>
              <div className="w-24 text-right">
                <span className="text-[12px] text-zinc-500 tabular-nums">
                  {c.impressions.toLocaleString('pt-BR')}
                </span>
              </div>
              <div className="w-28 flex items-center justify-end gap-2">
                <div className="w-12 h-1 bg-zinc-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand rounded-full transition-all"
                    style={{ width: `${(c.conversions / maxConversions) * 100}%` }}
                  />
                </div>
                <span className="text-[12px] text-zinc-600 tabular-nums w-8 text-right">
                  {c.conversions.toLocaleString('pt-BR')}
                </span>
              </div>
              <div className="w-16 text-right">
                <span className={`text-[12px] font-semibold tabular-nums ${getRoasColor(c.roas)}`}>
                  {c.roas.toFixed(2)}x
                </span>
              </div>
              <div className="w-28 text-right">
                <span className="text-[12px] text-zinc-600 tabular-nums">
                  R$ {(c.spend || 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
      <Pagination
        page={current}
        pageCount={pageCount}
        onPage={setPage}
        label={`${rangeStart}–${rangeEnd} de ${sorted.length}`}
      />
    </div>
  )
}
