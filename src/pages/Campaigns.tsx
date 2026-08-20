import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Search } from 'lucide-react'
import { AppShell } from '@/components/AppShell'
import { ConnectPrompt } from '@/components/ConnectPrompt'
import { ChatPanel } from '@/components/ChatPanel'
import { CampaignTable } from '@/components/CampaignTable'
import { Skeleton } from '@/components/ui/skeleton'
import { useConnections, formatLastSync } from '@/hooks/use-connections'
import { useRealtime } from '@/hooks/use-realtime'
import pb from '@/lib/pocketbase/client'

interface AccountOption {
  id: string
  name: string
}

const statusFilters = [
  { key: 'all', label: 'Todas' },
  { key: 'active', label: 'Ativas' },
  { key: 'paused', label: 'Pausadas' },
  { key: 'draft', label: 'Rascunhos' },
]

export default function Campaigns() {
  const [chatOpen, setChatOpen] = useState(false)
  const [accounts, setAccounts] = useState<AccountOption[]>([])
  const [account, setAccount] = useState('all')
  const [status, setStatus] = useState('all')
  const [query, setQuery] = useState('')
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')
  const connections = useConnections()
  const lastSyncLabel = formatLastSync(connections.lastSync)

  const load = useCallback(async () => {
    try {
      const [accs, camps] = await Promise.all([
        pb.collection('ad_accounts').getFullList({ sort: '-created' }),
        pb.collection('campaigns').getFullList({ sort: '-spend' }),
      ])
      setAccounts(accs.map((a: any) => ({ id: a.id, name: a.name || a.account_id || 'Conta' })))
      setCampaigns(camps)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useRealtime('campaigns', () => load())

  const handleSync = async () => {
    setSyncing(true)
    setSyncMsg('')
    try {
      const resp = await fetch(pb.baseUrl + '/backend/v1/meta-ads/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: pb.authStore.token || '' },
        body: JSON.stringify({}),
      })
      const data = await resp.json()
      if (resp.ok) {
        setSyncMsg('Sincronizado!')
        load()
        connections.refresh()
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

  const filtered = campaigns.filter((c: any) => {
    if (account !== 'all' && c.account_id !== account) return false
    if (status !== 'all' && c.status !== status) return false
    if (query && !(c.name || '').toLowerCase().includes(query.toLowerCase())) return false
    return true
  })

  const tableData = filtered.map((c: any) => ({
    id: c.id,
    name: c.name,
    status: c.status,
    spend: c.spend || 0,
    impressions: c.impressions || 0,
    conversions: c.conversions || 0,
    roas: c.roas || c.purchase_roas || 0,
    objective: c.objective || '',
  }))

  const hasFilters = account !== 'all' || status !== 'all' || query !== ''

  return (
    <AppShell onChatClick={() => setChatOpen(true)}>
      <header className="px-8 py-6 flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-[32px] text-zinc-900 leading-none">Campanhas</h1>
          <p className="text-[13px] text-zinc-400 mt-0.5">
            {connections.metaConnected && lastSyncLabel
              ? `Sincronizado ${lastSyncLabel}`
              : 'Todas as campanhas das suas contas'}
          </p>
        </div>
        {connections.metaConnected && (
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

      <div className="px-8 pb-4 flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 bg-white rounded-lg p-0.5 border border-card-border">
          {statusFilters.map((f) => (
            <button
              key={f.key}
              onClick={() => setStatus(f.key)}
              className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-colors ${
                status === f.key ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        {accounts.length > 1 && (
          <select
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            className="h-8 px-3 text-[12px] font-medium text-zinc-600 bg-white border border-card-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/20"
          >
            <option value="all">Todas as contas</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        )}
        <div className="relative ml-auto">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filtrar por nome..."
            className="h-8 w-56 bg-white border border-card-border rounded-lg pl-8 pr-3 text-[12px] text-zinc-700 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
        </div>
      </div>

      <main className="flex-1 overflow-y-auto px-8 pb-10">
        {loading || connections.loading ? (
          <div className="surface rounded-2xl p-6">
            <Skeleton className="h-4 w-32 mb-5" />
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-4 py-3">
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        ) : campaigns.length === 0 && !connections.metaConnected ? (
          <ConnectPrompt service="meta" />
        ) : campaigns.length === 0 ? (
          <div className="surface rounded-2xl p-12 text-center max-w-lg mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-brand-subtle border border-brand-border flex items-center justify-center mx-auto mb-4">
              <RefreshCw size={20} className="text-brand" />
            </div>
            <h2 className="text-[15px] font-semibold text-zinc-900 mb-1">
              Conta conectada — falta sincronizar
            </h2>
            <p className="text-[13px] text-zinc-400 mb-5">
              Puxe as campanhas da sua conta Meta Ads para começar.
            </p>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-[13px] font-medium text-white bg-brand rounded-xl hover:bg-brand-strong transition-colors disabled:opacity-60"
            >
              <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Sincronizando...' : 'Sincronizar agora'}
            </button>
          </div>
        ) : filtered.length === 0 && hasFilters ? (
          <div className="surface rounded-2xl p-10 text-center">
            <p className="text-[13px] text-zinc-400 mb-3">Nenhuma campanha com esses filtros.</p>
            <button
              onClick={() => {
                setStatus('all')
                setAccount('all')
                setQuery('')
              }}
              className="text-[13px] font-medium text-zinc-900 hover:underline"
            >
              Limpar filtros
            </button>
          </div>
        ) : (
          <CampaignTable campaigns={tableData} pageSize={12} />
        )}
      </main>
      <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} />
    </AppShell>
  )
}
