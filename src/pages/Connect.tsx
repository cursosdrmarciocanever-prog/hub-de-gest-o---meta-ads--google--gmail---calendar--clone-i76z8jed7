import { useState, useEffect } from 'react'
import { AppShell } from '@/components/AppShell'
import { ChatPanel } from '@/components/ChatPanel'
import { Link } from 'react-router-dom'
import { Check, ArrowRight, ExternalLink, Lightbulb, Copy } from 'lucide-react'
import pb from '@/lib/pocketbase/client'

const IMG =
  'https://cgnqqqxmdwuyeppebghl.supabase.co/storage/v1/object/public/cecs-attachments/hub-tutorial'

function GoogleLogo({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  )
}

function MetaLogo({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#1877F2">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  )
}

// Imagem de tutorial: largura total, abaixo do texto, para ler de verdade.
function Shot({ src, alt }: { src: string; alt: string }) {
  return (
    <img
      src={`${IMG}/${src}`}
      alt={alt}
      loading="lazy"
      className="w-full rounded-lg border border-zinc-200 shadow-sm"
    />
  )
}

export default function Connect() {
  const [token, setToken] = useState('')
  const [accountId, setAccountId] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [metaConnected, setMetaConnected] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<any>(null)
  const [error, setError] = useState('')
  const [existingMetaConn, setExistingMetaConn] = useState<any>(null)
  const [chatOpen, setChatOpen] = useState(false)

  const [googleConnected, setGoogleConnected] = useState(false)
  const [googleEmail, setGoogleEmail] = useState('')
  const [googleLoading, setGoogleLoading] = useState(false)
  const [googleSyncing, setGoogleSyncing] = useState(false)
  const [googleSyncResult, setGoogleSyncResult] = useState('')
  const [googleConfigured, setGoogleConfigured] = useState<boolean | null>(null)

  // Wizard: 1..3 = Meta, 4..6 = Google
  const [step, setStep] = useState(1)
  const [copied, setCopied] = useState(false)
  const redirectUri = pb.baseUrl.replace(/\/$/, '') + '/backend/v1/google/callback'

  const tab = step <= 3 ? 'meta' : 'google'
  const localStep = step <= 3 ? step : step - 3
  const accent = tab === 'meta' ? '#1877F2' : '#4285F4'

  useEffect(() => {
    async function init() {
      try {
        const conns = await pb.collection('meta_connections').getFullList({})
        if (conns.length > 0) {
          setExistingMetaConn(conns[0])
          setMetaConnected(true)
          setAccountId(conns[0].account_id || '')
        }
      } catch (e) {
        /* ignore */
      }
      try {
        const gConns = await pb.collection('google_connections').getFullList({})
        if (gConns.length > 0 && gConns[0].status === 'connected') {
          setGoogleConnected(true)
          setGoogleEmail(gConns[0].email || '')
        }
      } catch (e) {
        /* ignore */
      }
      try {
        const resp = await fetch(pb.baseUrl + '/backend/v1/config/status', {
          headers: { Authorization: pb.authStore.token || '' },
        })
        const data = await resp.json()
        setGoogleConfigured(!!data.google_configured)
      } catch {
        setGoogleConfigured(false)
      }
    }
    init()
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'google_connected') {
        setGoogleConnected(true)
        setGoogleEmail(event.data.email || '')
        setGoogleLoading(false)
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  const handleMetaConnect = async () => {
    if (!token.trim() || !accountId.trim()) {
      setError('Cole o token de acesso e o ID da conta antes de conectar.')
      return
    }
    setConnecting(true)
    setError('')
    try {
      const resp = await fetch(pb.baseUrl + '/backend/v1/meta-ads/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: pb.authStore.token || '' },
        body: JSON.stringify({ token, account_id: accountId }),
      })
      const data = await resp.json()
      if (!resp.ok) {
        setError(data.error || 'Erro ao conectar')
        return
      }
      const conns = await pb.collection('meta_connections').getFullList({})
      setExistingMetaConn(conns[0] || null)
      setMetaConnected(true)
      setToken('')
      handleMetaSync() // primeira conexão → já sincroniza automaticamente
    } catch (e: any) {
      setError('Erro: ' + (e.message || ''))
    } finally {
      setConnecting(false)
    }
  }

  const handleMetaSync = async () => {
    setSyncing(true)
    setSyncResult(null)
    setError('')
    try {
      const resp = await fetch(pb.baseUrl + '/backend/v1/meta-ads/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: pb.authStore.token || '' },
        body: JSON.stringify({ account_id: accountId }),
      })
      const data = await resp.json()
      if (resp.ok) setSyncResult(data)
      else setError(data.error || data.message || 'Erro ao sincronizar')
    } catch (e: any) {
      setError('Erro: ' + (e.message || ''))
    } finally {
      setSyncing(false)
    }
  }

  const handleGoogleAuth = async () => {
    setGoogleLoading(true)
    setError('')
    try {
      const resp = await fetch(pb.baseUrl + '/backend/v1/google/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: pb.authStore.token || '' },
        body: JSON.stringify({}),
      })
      const data = await resp.json()
      if (data.authUrl) window.open(data.authUrl, 'google_auth', 'width=600,height=700')
      else {
        setError(data.error || 'Erro')
        setGoogleLoading(false)
      }
    } catch (e: any) {
      setError('Erro: ' + (e.message || ''))
      setGoogleLoading(false)
    }
  }

  const handleGoogleSync = async () => {
    setGoogleSyncing(true)
    setGoogleSyncResult('')
    try {
      const resp = await fetch(pb.baseUrl + '/backend/v1/google/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: pb.authStore.token || '' },
        body: JSON.stringify({}),
      })
      const data = await resp.json()
      if (resp.ok) {
        setGoogleSyncResult(`${data.events || 0} eventos + ${data.messages || 0} emails`)
        setTimeout(() => setGoogleSyncResult(''), 4000)
      } else {
        setGoogleSyncResult('Erro: ' + (data.error || ''))
        setTimeout(() => setGoogleSyncResult(''), 4000)
      }
    } catch {
      setGoogleSyncResult('Erro de conexao')
      setTimeout(() => setGoogleSyncResult(''), 4000)
    } finally {
      setGoogleSyncing(false)
    }
  }

  const handleGoogleDisconnect = async () => {
    try {
      await fetch(pb.baseUrl + '/backend/v1/google/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: pb.authStore.token || '' },
        body: JSON.stringify({}),
      })
      setGoogleConnected(false)
      setGoogleEmail('')
    } catch (e) {
      /* ignore */
    }
  }

  const handleMetaDisconnect = async () => {
    try {
      if (existingMetaConn) await pb.collection('meta_connections').delete(existingMetaConn.id)
    } catch (e) {
      /* ignore */
    }
    setMetaConnected(false)
    setExistingMetaConn(null)
    setToken('')
    setAccountId('')
  }

  const connectedCount = (metaConnected ? 1 : 0) + (googleConnected ? 1 : 0)

  const NavFooter = ({ prev, next, done }: { prev?: number; next?: number; done?: boolean }) => (
    <div className="flex items-center justify-between px-5 py-3 bg-zinc-50/60 border-t border-zinc-100">
      {prev ? (
        <button
          onClick={() => setStep(prev)}
          className="text-[13px] text-zinc-400 hover:text-zinc-700 transition-colors"
        >
          ← Anterior
        </button>
      ) : (
        <span />
      )}
      {next ? (
        <button
          onClick={() => setStep(next)}
          className="px-4 py-2 text-[13px] font-medium text-white rounded-lg transition-opacity hover:opacity-90"
          style={{ backgroundColor: accent }}
        >
          Próximo →
        </button>
      ) : done ? (
        <span className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium text-emerald-600 bg-emerald-50 rounded-lg">
          <Check size={14} /> Fim do guia
        </span>
      ) : (
        <span />
      )}
    </div>
  )

  const StepTitle = ({ n, children }: { n: number; children: React.ReactNode }) => (
    <div className="flex items-center gap-2.5">
      <span
        className="w-6 h-6 rounded-full text-white text-[12px] font-bold flex items-center justify-center shrink-0"
        style={{ backgroundColor: accent }}
      >
        {n}
      </span>
      <p className="text-[14px] font-semibold text-zinc-800">{children}</p>
    </div>
  )

  return (
    <AppShell onChatClick={() => setChatOpen(true)}>
      <header className="px-8 py-6">
        <h1 className="font-display text-[32px] text-zinc-900 leading-none">Integrações</h1>
        <p className="text-[13px] text-zinc-400 mt-0.5">
          Conecte suas contas à esquerda. O passo a passo com prints está sempre à direita.
        </p>
      </header>

      <main className="flex-1 overflow-y-auto px-8 pb-10">
        <div className="min-w-0">
          {/* Progresso */}
          <div className="flex items-center gap-3 bg-white rounded-2xl shadow-card border border-zinc-100/50 px-5 py-4 mb-6">
            <div className="flex-1">
              <p className="text-[13px] font-semibold text-zinc-900">
                {connectedCount === 2
                  ? 'Tudo conectado 🎉'
                  : `${connectedCount} de 2 integrações conectadas`}
              </p>
              <p className="text-[12px] text-zinc-400 mt-0.5">
                {connectedCount === 2
                  ? 'Seu Hub está completo. Sincronize quando quiser atualizar.'
                  : 'Conecte o Meta Ads e o Google para o Genie enxergar tudo.'}
              </p>
            </div>
            <div className="flex gap-1.5 shrink-0">
              <span
                className={`w-8 h-1.5 rounded-full ${metaConnected ? 'bg-brand' : 'bg-zinc-200'}`}
              />
              <span
                className={`w-8 h-1.5 rounded-full ${googleConnected ? 'bg-brand' : 'bg-zinc-200'}`}
              />
            </div>
          </div>

          <div className="grid lg:grid-cols-[400px_1fr] gap-8 items-start">
            {/* ===== ESQUERDA — CONEXÃO ===== */}
            <div className="space-y-5">
              {/* Meta Ads */}
              <div className="bg-white rounded-2xl shadow-card border border-zinc-100/50 overflow-hidden">
                <div className="flex items-center gap-4 px-6 py-5">
                  <div className="w-10 h-10 rounded-lg bg-[#1877F2]/10 flex items-center justify-center shrink-0">
                    <MetaLogo />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5">
                      <span className="text-[14px] font-medium text-zinc-900">Meta Ads</span>
                      {metaConnected ? (
                        <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          {accountId ? 'act_' + accountId : 'Conectado'}
                        </span>
                      ) : (
                        <span className="text-[11px] text-zinc-400">Não conectado</span>
                      )}
                    </div>
                    <p className="text-[12px] text-zinc-400 mt-0.5">
                      Campanhas e métricas do Facebook e Instagram
                    </p>
                  </div>
                  {metaConnected && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={handleMetaSync}
                        disabled={syncing}
                        className="px-3 py-1.5 text-[11px] font-medium text-zinc-600 bg-zinc-50 rounded-lg hover:bg-zinc-100 transition-colors disabled:opacity-50"
                      >
                        {syncing ? '...' : 'Sincronizar'}
                      </button>
                      <button
                        onClick={handleMetaDisconnect}
                        className="px-3 py-1.5 text-[11px] font-medium text-zinc-400 hover:text-red-500 transition-colors"
                      >
                        Desconectar
                      </button>
                    </div>
                  )}
                </div>

                {!metaConnected && (
                  <div className="border-t border-zinc-100 px-6 py-5 space-y-4">
                    <div>
                      <label className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider mb-1.5 block">
                        Access Token
                      </label>
                      <input
                        type="password"
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                        placeholder="EAAG..."
                        className="w-full text-[13px] bg-zinc-50 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand/20 border border-zinc-200 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider mb-1.5 block">
                        Ad Account ID
                      </label>
                      <input
                        type="text"
                        value={accountId}
                        onChange={(e) => setAccountId(e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="1234567890"
                        className="w-full text-[13px] bg-zinc-50 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand/20 border border-zinc-200 font-mono"
                      />
                    </div>
                    <button
                      onClick={handleMetaConnect}
                      disabled={connecting}
                      className="w-full py-2.5 text-[13px] font-medium text-white bg-brand rounded-xl hover:bg-brand-strong transition-colors disabled:opacity-50"
                    >
                      {connecting ? 'Validando com a Meta...' : 'Conectar Meta Ads'}
                    </button>
                    <button
                      onClick={() => setStep(1)}
                      className="w-full text-[12px] text-[#1877F2] font-medium hover:underline"
                    >
                      Não sei pegar o token — ver passo a passo →
                    </button>
                  </div>
                )}
              </div>

              {/* Google */}
              <div className="bg-white rounded-2xl shadow-card border border-zinc-100/50 overflow-hidden">
                <div className="flex items-center gap-4 px-6 py-5">
                  <div className="w-10 h-10 rounded-lg bg-white border border-zinc-100 flex items-center justify-center shrink-0">
                    <GoogleLogo />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5">
                      <span className="text-[14px] font-medium text-zinc-900">Google</span>
                      {googleConnected ? (
                        <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          {googleEmail || 'Conectado'}
                        </span>
                      ) : (
                        <span className="text-[11px] text-zinc-400">Não conectado</span>
                      )}
                    </div>
                    <p className="text-[12px] text-zinc-400 mt-0.5">Gmail e Google Calendar</p>
                    {googleSyncResult && (
                      <p className="text-[11px] text-emerald-600 mt-1">{googleSyncResult}</p>
                    )}
                  </div>
                  {googleConnected && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={handleGoogleSync}
                        disabled={googleSyncing}
                        className="px-3 py-1.5 text-[11px] font-medium text-zinc-600 bg-zinc-50 rounded-lg hover:bg-zinc-100 transition-colors disabled:opacity-50"
                      >
                        {googleSyncing ? '...' : 'Sincronizar'}
                      </button>
                      <button
                        onClick={handleGoogleDisconnect}
                        className="px-3 py-1.5 text-[11px] font-medium text-zinc-400 hover:text-red-500 transition-colors"
                      >
                        Desconectar
                      </button>
                    </div>
                  )}
                </div>

                {!googleConnected && (
                  <div className="border-t border-zinc-100 px-6 py-5">
                    <button
                      onClick={handleGoogleAuth}
                      disabled={googleLoading || googleConfigured === false}
                      className="w-full py-2.5 text-[13px] font-medium text-white bg-brand rounded-xl hover:bg-brand-strong transition-colors disabled:opacity-50"
                    >
                      {googleLoading ? 'Abrindo o Google...' : 'Conectar com o Google'}
                    </button>
                    {googleConfigured === false ? (
                      <button
                        onClick={() => setStep(4)}
                        className="w-full text-[12px] text-[#4285F4] font-medium hover:underline mt-2"
                      >
                        App do Google ainda não configurado — ver setup →
                      </button>
                    ) : (
                      <p className="text-[11px] text-zinc-400 text-center mt-2">
                        Abre uma janela do Google — só escolher a conta e autorizar.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                  <p className="text-[13px] text-red-600">{error}</p>
                  <p className="text-[12px] text-red-400 mt-1">
                    Confira o passo a passo ao lado para gerar o token e o ID corretos. →
                  </p>
                </div>
              )}

              {syncResult && (
                <div className="bg-white rounded-2xl shadow-card border border-zinc-100/50 p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-9 h-9 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                      <Check size={16} className="text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-[14px] font-semibold text-zinc-900">
                        Sincronização concluída
                      </p>
                      <p className="text-[12px] text-zinc-400">
                        {syncResult.account || 'Conta Meta Ads'}
                        {syncResult.new_records?.campaigns
                          ? ` · ${syncResult.new_records.campaigns} campanhas novas`
                          : ' · dados atualizados'}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-3 mb-5">
                    {[
                      { label: 'Campanhas', value: syncResult.synced?.campaigns ?? 0 },
                      { label: 'Conjuntos', value: syncResult.synced?.adsets ?? 0 },
                      { label: 'Anúncios', value: syncResult.synced?.ads ?? 0 },
                      { label: 'Métricas novas', value: syncResult.synced?.metrics ?? 0 },
                    ].map((s) => (
                      <div key={s.label} className="bg-zinc-50 rounded-xl px-3 py-2.5 text-center">
                        <p className="text-[18px] font-semibold text-zinc-900 tabular-nums">
                          {s.value}
                        </p>
                        <p className="text-[11px] text-zinc-400">{s.label}</p>
                      </div>
                    ))}
                  </div>
                  <Link
                    to="/"
                    className="flex items-center justify-center gap-2 w-full py-3 text-[14px] font-medium text-white bg-zinc-900 rounded-xl hover:bg-zinc-800 transition-colors"
                  >
                    Ver no Dashboard
                    <ArrowRight size={15} />
                  </Link>
                </div>
              )}
            </div>

            {/* ===== DIREITA — WIZARD ===== */}
            <aside className="lg:sticky lg:top-2">
              <div className="bg-white rounded-2xl shadow-card border border-zinc-100/50 overflow-hidden">
                {/* Abas */}
                <div className="flex border-b border-zinc-100">
                  <button
                    onClick={() => setStep(1)}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 text-[13px] font-medium transition-colors ${
                      tab === 'meta'
                        ? 'text-[#1877F2] border-b-2 border-[#1877F2] bg-[#1877F2]/5'
                        : 'text-zinc-400 hover:text-zinc-700'
                    }`}
                  >
                    <MetaLogo size={15} />
                    Meta Ads
                  </button>
                  <button
                    onClick={() => setStep(4)}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 text-[13px] font-medium transition-colors ${
                      tab === 'google'
                        ? 'text-[#4285F4] border-b-2 border-[#4285F4] bg-[#4285F4]/5'
                        : 'text-zinc-400 hover:text-zinc-700'
                    }`}
                  >
                    <GoogleLogo size={15} />
                    Google
                  </button>
                </div>

                {/* Progresso da seção */}
                <div className="flex items-center gap-1 px-5 pt-3">
                  {[1, 2, 3].map((s) => (
                    <span
                      key={s}
                      className="h-1 flex-1 rounded-full transition-colors"
                      style={{ backgroundColor: s <= localStep ? accent : '#f4f4f5' }}
                    />
                  ))}
                  <span className="text-[10px] text-zinc-400 ml-2 w-8 text-right tabular-nums">
                    {localStep}/3
                  </span>
                </div>

                {/* ===== META ===== */}
                {step === 1 && (
                  <div>
                    <div className="px-5 pt-4 pb-5 space-y-3">
                      <StepTitle n={1}>Gere o token de acesso</StepTitle>
                      <ol className="text-[13px] text-zinc-500 leading-relaxed space-y-1.5 list-decimal pl-4">
                        <li>
                          Abra o{' '}
                          <a
                            href="https://developers.facebook.com/tools/explorer/"
                            target="_blank"
                            rel="noreferrer"
                            className="text-[#1877F2] font-medium hover:underline"
                          >
                            Explorador da Graph API
                          </a>
                          .
                        </li>
                        <li>
                          Em <strong>Facebook App</strong>, selecione seu app (ou crie um, é
                          gratuito).
                        </li>
                        <li>
                          Em <strong>Permissions</strong>, adicione{' '}
                          <code className="text-[12px] bg-zinc-100 rounded px-1.5 py-0.5 text-zinc-700 font-mono">
                            ads_read
                          </code>
                          .
                        </li>
                        <li>
                          Clique <strong>Generate Access Token</strong> e autorize.
                        </li>
                        <li>
                          Copie o token (começa com{' '}
                          <code className="text-[12px] bg-zinc-100 rounded px-1.5 py-0.5 text-zinc-700 font-mono">
                            EAAG
                          </code>
                          ) e cole no campo <strong>Access Token</strong>.
                        </li>
                      </ol>
                      <Shot
                        src="meta-token.jpg"
                        alt="Graph API Explorer com ads_read e Generate Access Token"
                      />
                    </div>
                    <NavFooter next={2} />
                  </div>
                )}

                {step === 2 && (
                  <div>
                    <div className="px-5 pt-4 pb-5 space-y-3">
                      <StepTitle n={2}>Pegue o ID da conta de anúncios</StepTitle>
                      <ol className="text-[13px] text-zinc-500 leading-relaxed space-y-1.5 list-decimal pl-4">
                        <li>
                          No mesmo Explorador, cole a consulta{' '}
                          <code className="text-[12px] bg-zinc-100 rounded px-1.5 py-0.5 text-zinc-700 font-mono">
                            me?fields=adaccounts&#123;name&#125;
                          </code>{' '}
                          e clique <strong>Submit</strong>.
                        </li>
                        <li>
                          Vai aparecer seu ID no formato{' '}
                          <code className="text-[12px] bg-zinc-100 rounded px-1.5 py-0.5 text-zinc-700 font-mono">
                            act_1234567890
                          </code>
                          .
                        </li>
                        <li>
                          Copie <strong>só os números</strong> e cole no campo{' '}
                          <strong>Ad Account ID</strong>.
                        </li>
                      </ol>
                      <Shot
                        src="meta-account.jpg"
                        alt="Consulta adaccounts no Graph API Explorer"
                      />
                    </div>
                    <NavFooter prev={1} next={3} />
                  </div>
                )}

                {step === 3 && (
                  <div>
                    <div className="px-5 pt-4 pb-5 space-y-3">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-6 h-6 rounded-full text-white flex items-center justify-center shrink-0"
                          style={{ backgroundColor: accent }}
                        >
                          <Lightbulb size={13} />
                        </span>
                        <p className="text-[14px] font-semibold text-zinc-800">
                          Token de teste vs permanente
                        </p>
                      </div>
                      <div className="space-y-2.5 text-[13px] text-zinc-500 leading-relaxed">
                        <p>
                          🔵 O token do Explorador <strong>expira em ~1-2 horas</strong> — perfeito
                          pra testar agora.
                        </p>
                        <p>
                          🟢 Para uma conexão que <strong>não expira</strong>, gere um token de{' '}
                          <a
                            href="https://business.facebook.com/settings/system-users"
                            target="_blank"
                            rel="noreferrer"
                            className="text-[#1877F2] font-medium hover:underline"
                          >
                            Usuário do Sistema
                          </a>{' '}
                          no Gerenciador de Negócios, com a permissão{' '}
                          <code className="text-[12px] bg-zinc-100 rounded px-1.5 py-0.5 text-zinc-700 font-mono">
                            ads_read
                          </code>
                          .
                        </p>
                      </div>
                    </div>
                    <NavFooter prev={2} done />
                  </div>
                )}

                {/* ===== GOOGLE ===== */}
                {step === 4 && (
                  <div>
                    <div className="px-5 pt-4 pb-5 space-y-3">
                      <StepTitle n={1}>Crie o projeto e ative as APIs</StepTitle>
                      <ol className="text-[13px] text-zinc-500 leading-relaxed space-y-1.5 list-decimal pl-4">
                        <li>
                          Acesse o{' '}
                          <a
                            href="https://console.cloud.google.com"
                            target="_blank"
                            rel="noreferrer"
                            className="text-[#4285F4] font-medium hover:underline"
                          >
                            Google Cloud Console
                          </a>{' '}
                          e crie um projeto.
                        </li>
                        <li>
                          Em <strong>APIs & Services → Library</strong>, ative a{' '}
                          <strong>Gmail API</strong> e a <strong>Google Calendar API</strong>.
                        </li>
                      </ol>
                      <Shot src="g-project.jpg" alt="Criar projeto no Google Cloud" />
                      <Shot src="g-api.jpg" alt="Ativar a Gmail API" />
                    </div>
                    <NavFooter next={5} />
                  </div>
                )}

                {step === 5 && (
                  <div>
                    <div className="px-5 pt-4 pb-5 space-y-3">
                      <StepTitle n={2}>Configure a tela de consentimento</StepTitle>
                      <ol className="text-[13px] text-zinc-500 leading-relaxed space-y-1.5 list-decimal pl-4">
                        <li>
                          Em <strong>OAuth consent screen</strong>, escolha o tipo{' '}
                          <strong>External</strong> e preencha o nome do app.
                        </li>
                        <li>
                          Em <strong>Scopes</strong>, adicione{' '}
                          <code className="text-[12px] bg-zinc-100 rounded px-1.5 py-0.5 text-zinc-700 font-mono">
                            gmail.readonly
                          </code>{' '}
                          e{' '}
                          <code className="text-[12px] bg-zinc-100 rounded px-1.5 py-0.5 text-zinc-700 font-mono">
                            calendar.readonly
                          </code>
                          .
                        </li>
                        <li>Adicione seu e-mail como usuário de teste e salve.</li>
                      </ol>
                      <Shot src="g-consent.jpg" alt="Tela de consentimento OAuth External" />
                      <Shot src="g-scopes.jpg" alt="Adicionar escopos readonly" />
                    </div>
                    <NavFooter prev={4} next={6} />
                  </div>
                )}

                {step === 6 && (
                  <div>
                    <div className="px-5 pt-4 pb-5 space-y-3">
                      <StepTitle n={3}>Crie o Client ID e salve os secrets</StepTitle>
                      <ol className="text-[13px] text-zinc-500 leading-relaxed space-y-1.5 list-decimal pl-4">
                        <li>
                          Em <strong>Credentials → Create Credentials → OAuth client ID</strong>,
                          escolha <strong>Web application</strong>.
                        </li>
                        <li>Cole este URI em "Authorized redirect URIs":</li>
                      </ol>
                      <div className="flex items-center gap-2 bg-zinc-50 rounded-lg border border-zinc-200 px-3 py-2">
                        <code className="text-[11px] text-zinc-600 truncate flex-1 font-mono">
                          {redirectUri}
                        </code>
                        <button
                          onClick={() => {
                            navigator.clipboard?.writeText(redirectUri)
                            setCopied(true)
                            setTimeout(() => setCopied(false), 2000)
                          }}
                          className="shrink-0 text-zinc-400 hover:text-zinc-900"
                          title="Copiar"
                        >
                          {copied ? (
                            <Check size={14} className="text-emerald-500" />
                          ) : (
                            <Copy size={14} />
                          )}
                        </button>
                      </div>
                      <Shot src="g-redirect.jpg" alt="Colar o redirect URI" />
                      <ol
                        className="text-[13px] text-zinc-500 leading-relaxed space-y-1.5 list-decimal pl-4"
                        start={3}
                      >
                        <li>
                          Copie o <strong>Client ID</strong> e o <strong>Client Secret</strong>.
                        </li>
                        <li>Configure no Skip (Secrets):</li>
                      </ol>
                      <div className="bg-zinc-50 rounded-lg px-3 py-2 font-mono text-[11px] text-zinc-600 space-y-0.5">
                        <p>GOOGLE_CLIENT_ID</p>
                        <p>GOOGLE_CLIENT_SECRET</p>
                        <p>GOOGLE_REDIRECT_URI = (o URI acima)</p>
                      </div>
                      <Shot src="g-creds.jpg" alt="Client ID e Client Secret" />
                    </div>
                    <NavFooter prev={5} done />
                  </div>
                )}
              </div>
            </aside>
          </div>
        </div>
      </main>
      <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} />
    </AppShell>
  )
}
