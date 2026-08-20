import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, RefreshCw, ArrowRight, Lock } from 'lucide-react'
import { GenieMark } from '@/components/GenieMark'
import pb from '@/lib/pocketbase/client'

interface EmptyStateProps {
  metaConnected: boolean
  googleConnected: boolean
  onSynced?: () => void
}

function MetaLogo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#1877F2">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  )
}

function GoogleLogo({ size = 20 }: { size?: number }) {
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

export function EmptyState({ metaConnected, googleConnected, onSynced }: EmptyStateProps) {
  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState('')

  // Variante "conectado mas sem dados": o caminho é sincronizar, não reconectar.
  if (metaConnected) {
    const handleSync = async () => {
      setSyncing(true)
      setSyncError('')
      try {
        const resp = await fetch(pb.baseUrl + '/backend/v1/meta-ads/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: pb.authStore.token || '' },
          body: JSON.stringify({}),
        })
        const data = await resp.json()
        if (!resp.ok) {
          setSyncError(data.error || data.message || 'Erro ao sincronizar')
        } else {
          onSynced?.()
        }
      } catch {
        setSyncError('Erro de conexão. Tente novamente.')
      } finally {
        setSyncing(false)
      }
    }

    return (
      <div className="max-w-md mx-auto pt-16 text-center">
        <div className="text-brand flex justify-center mb-6">
          <GenieMark size={56} />
        </div>
        <h2 className="text-[22px] font-semibold text-zinc-900 tracking-tight mb-2">
          Quase lá — falta sincronizar
        </h2>
        <p className="text-[14px] text-zinc-500 mb-7 max-w-sm mx-auto leading-relaxed">
          Sua conta de Meta Ads está conectada. Puxe as campanhas para o Genie começar a analisar —
          a primeira sincronização leva cerca de um minuto.
        </p>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="inline-flex items-center gap-2 px-6 py-3 text-[14px] font-medium text-white bg-brand-gradient rounded-xl hover:brightness-110 transition-all disabled:opacity-60 shadow-sm"
        >
          <RefreshCw size={15} className={syncing ? 'animate-spin' : ''} />
          {syncing ? 'Sincronizando...' : 'Sincronizar agora'}
        </button>
        {syncError && (
          <div className="mt-4 bg-red-50 rounded-xl px-4 py-3 text-left">
            <p className="text-[12px] text-red-600">{syncError}</p>
          </div>
        )}
        <p className="text-[12px] text-zinc-400 mt-6">
          Precisa trocar a conta?{' '}
          <Link to="/connect" className="text-zinc-600 font-medium hover:underline">
            Integrações
          </Link>
        </p>
      </div>
    )
  }

  // Variante "recém-instalado": checklist de onboarding.
  const steps = [
    {
      title: 'Conectar Meta Ads',
      description: 'Campanhas, conjuntos e métricas do Facebook e Instagram',
      done: metaConnected,
      logo: <MetaLogo />,
      tint: 'bg-[#1877F2]/10',
      to: '/connect',
    },
    {
      title: 'Conectar Google',
      description: 'Gmail e Google Calendar no mesmo painel',
      done: googleConnected,
      logo: <GoogleLogo />,
      tint: 'bg-white border border-zinc-100',
      to: '/connect',
    },
    {
      title: 'Explorar com o Genie',
      description: 'Pergunte qualquer coisa sobre suas campanhas, e-mails e agenda',
      done: false,
      logo: <GenieMark size={20} animated={false} />,
      tint: 'bg-brand-subtle',
      to: undefined as string | undefined,
    },
  ]
  const doneCount = steps.filter((s) => s.done).length

  return (
    <div className="max-w-xl mx-auto pt-12">
      <div className="text-center mb-8">
        <div className="text-brand flex justify-center mb-5">
          <GenieMark size={60} />
        </div>
        <h1 className="text-[26px] font-semibold text-zinc-900 tracking-tight mb-2">
          Bem-vindo ao Hub
        </h1>
        <p className="text-[14px] text-zinc-500 max-w-md mx-auto leading-relaxed">
          Reúna Meta Ads, Gmail e Calendar num só painel — e deixe o Genie transformar tudo em
          insights. Comece conectando suas contas.
        </p>
      </div>

      <div className="surface rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] font-semibold text-zinc-600">Primeiros passos</span>
            <span className="text-[11px] text-zinc-400 tabular-nums">{doneCount} de 3</span>
          </div>
          <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-gradient rounded-full transition-all duration-500"
              style={{ width: `${(doneCount / 3) * 100}%` }}
            />
          </div>
        </div>

        <div className="divide-y divide-zinc-50">
          {steps.map((step, i) => {
            const locked = i === 2 && !metaConnected && !googleConnected
            const inner = (
              <div className="flex items-center gap-4 px-5 py-4">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    step.done ? 'bg-brand' : step.tint
                  } ${locked ? 'opacity-40 grayscale' : ''}`}
                >
                  {step.done ? <Check size={18} className="text-white" /> : step.logo}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-[14px] font-medium ${locked ? 'text-zinc-400' : 'text-zinc-900'}`}
                  >
                    {step.title}
                  </p>
                  <p className="text-[12px] text-zinc-400 mt-0.5">{step.description}</p>
                </div>
                {step.done ? (
                  <span className="text-[12px] text-brand font-medium shrink-0">Pronto</span>
                ) : locked ? (
                  <span className="inline-flex items-center gap-1 text-[11px] text-zinc-300 shrink-0">
                    <Lock size={12} />
                  </span>
                ) : step.to ? (
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[12px] font-medium text-white bg-brand-gradient rounded-lg shrink-0 hover:brightness-110 transition-all">
                    Conectar
                    <ArrowRight size={13} />
                  </span>
                ) : null}
              </div>
            )
            return step.to && !step.done ? (
              <Link
                key={step.title}
                to={step.to}
                className="block hover:bg-zinc-50/60 transition-colors"
              >
                {inner}
              </Link>
            ) : (
              <div key={step.title}>{inner}</div>
            )
          })}
        </div>
      </div>

      <p className="text-center text-[12px] text-zinc-400 mt-5">
        Novo por aqui? Tudo tem passo a passo com prints nas{' '}
        <Link to="/connect" className="text-zinc-600 font-medium hover:underline">
          Integrações
        </Link>
        .
      </p>
    </div>
  )
}
