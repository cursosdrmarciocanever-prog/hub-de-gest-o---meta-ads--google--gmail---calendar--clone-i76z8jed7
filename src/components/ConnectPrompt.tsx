import { Link } from 'react-router-dom'
import { Plug, ArrowRight } from 'lucide-react'
import { GenieMark } from '@/components/GenieMark'

function MetaLogo({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#1877F2">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  )
}

function GoogleLogo({ size = 26 }: { size?: number }) {
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

const CONFIG = {
  meta: {
    logo: <MetaLogo />,
    name: 'Meta Ads',
    color: '#1877F2',
    title: 'Suas campanhas, num só painel',
    desc: 'Conecte o Meta Ads para trazer campanhas, conjuntos e métricas — e deixar o Genie analisar tudo por você.',
    tags: ['Campanhas', 'Conjuntos', 'Métricas'],
  },
  google: {
    logo: <GoogleLogo />,
    name: 'Google',
    color: '#4285F4',
    title: 'Gmail e Agenda no seu Hub',
    desc: 'Conecte o Google para ver os e-mails que precisam de resposta e seus próximos compromissos, com preparo do Genie.',
    tags: ['Gmail', 'Calendar'],
  },
} as const

export function ConnectPrompt({ service }: { service: 'meta' | 'google' }) {
  const cfg = CONFIG[service]
  return (
    <div className="relative max-w-lg mx-auto pt-16 pb-10 text-center overflow-hidden">
      {/* GenieMark decorativo bem sutil ao fundo */}
      <div className="absolute left-1/2 -top-6 -translate-x-1/2 text-brand/[0.06] pointer-events-none">
        <GenieMark size={240} />
      </div>

      <div className="relative">
        {/* logo com glow da cor da marca */}
        <div className="relative inline-flex mb-6">
          <div
            className="absolute inset-0 rounded-3xl blur-2xl opacity-30"
            style={{ backgroundColor: cfg.color }}
          />
          <div className="relative w-16 h-16 rounded-2xl bg-white shadow-card border border-zinc-100 flex items-center justify-center">
            {cfg.logo}
          </div>
        </div>

        {/* tags do que desbloqueia */}
        <div className="flex items-center justify-center gap-1.5 mb-4">
          {cfg.tags.map((t) => (
            <span
              key={t}
              className="text-[11px] font-medium text-zinc-500 bg-white border border-zinc-200 rounded-full px-2.5 py-1"
            >
              {t}
            </span>
          ))}
        </div>

        <h2 className="font-display text-[32px] text-zinc-900 leading-[1.05]">{cfg.title}</h2>
        <p className="text-[14px] text-zinc-500 mt-3 mb-7 leading-relaxed max-w-md mx-auto">
          {cfg.desc}
        </p>

        <Link
          to="/connect"
          className="inline-flex items-center gap-2 px-6 py-3 text-[14px] font-medium text-white bg-brand-gradient rounded-xl hover:brightness-110 transition-all shadow-sm"
        >
          <Plug size={15} />
          Conectar {cfg.name}
        </Link>

        <div className="mt-4">
          <Link
            to="/connect"
            className="inline-flex items-center gap-1 text-[12px] font-medium text-zinc-400 hover:text-zinc-700 transition-colors"
          >
            Ver o passo a passo
            <ArrowRight size={12} />
          </Link>
        </div>
      </div>
    </div>
  )
}
