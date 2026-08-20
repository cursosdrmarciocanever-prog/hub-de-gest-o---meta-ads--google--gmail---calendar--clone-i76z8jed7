import { useState, useEffect, createContext, useContext } from 'react'
import { Megaphone, Mail, CalendarDays } from 'lucide-react'
import { GenieMark } from '@/components/GenieMark'
import { Constellation } from '@/components/Constellation'
import pb from '@/lib/pocketbase/client'

interface AuthContextType {
  isLoggedIn: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthGate')
  return ctx
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(pb.authStore.isValid)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const unsubscribe = pb.authStore.onChange(() => {
      setIsLoggedIn(pb.authStore.isValid)
    })
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe()
    }
  }, [])

  const login = async (email: string, password: string) => {
    setLoading(true)
    try {
      await pb.collection('users').authWithPassword(email, password)
      setIsLoggedIn(true)
    } finally {
      setLoading(false)
    }
  }

  const signup = async (name: string, email: string, password: string) => {
    setLoading(true)
    try {
      await pb.collection('users').create({
        name,
        email,
        password,
        passwordConfirm: password,
      })
      await pb.collection('users').authWithPassword(email, password)
      setIsLoggedIn(true)
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    pb.authStore.clear()
    setIsLoggedIn(false)
  }

  if (!isLoggedIn) {
    return <LoginScreen onLogin={login} onSignup={signup} loading={loading} />
  }

  return (
    <AuthContext.Provider value={{ isLoggedIn, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

// Exemplos práticos do que o Hub faz — "o Genie trabalhando" flutuando no hero.
const examples = [
  {
    icon: Megaphone,
    color: '#7cb1ff',
    tag: 'Meta Ads',
    body: 'Summer Sale está com ROAS 3,5x — sua melhor campanha da semana.',
  },
  {
    icon: Mail,
    color: '#ff9a8a',
    tag: 'Precisa responder',
    body: 'Rodrigo mandou a proposta comercial. Quer que eu rascunhe a resposta?',
  },
  {
    icon: CalendarDays,
    color: '#8ad0ff',
    tag: 'Hoje, 10:45',
    body: 'Consultoria com Rodrigo. Já preparei um resumo pra você chegar pronto.',
  },
]

function LoginScreen({
  onLogin,
  onSignup,
  loading,
}: {
  onLogin: (email: string, password: string) => Promise<void>
  onSignup: (name: string, email: string, password: string) => Promise<void>
  loading: boolean
}) {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      if (mode === 'login') {
        await onLogin(email, password)
      } else {
        await onSignup(name, email, password)
      }
    } catch (err: any) {
      if (mode === 'login') {
        setError('Email ou senha incorretos')
      } else {
        const emailErr = err?.data?.data?.email?.message
        const passErr = err?.data?.data?.password?.message
        setError(
          emailErr ||
            passErr ||
            'Nao foi possivel criar a conta. Verifique os dados e tente de novo.',
        )
      }
    }
  }

  const switchMode = (next: 'login' | 'signup') => {
    setMode(next)
    setError('')
  }

  return (
    <div className="min-h-screen flex bg-[#0B1E2D]">
      {/* ===== Painel visual (escuro, imersivo) ===== */}
      <div className="hidden lg:flex lg:w-[58%] flex-col justify-between p-12 xl:p-16 relative overflow-hidden">
        <Constellation />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(to top, rgba(11,30,45,0.88) 0%, rgba(11,30,45,0) 42%)',
          }}
        />

        {/* logo — só o wordmark */}
        <div className="relative z-10 shrink-0"></div>

        {/* exemplos práticos flutuando (o Genie trabalhando) */}
        <div className="absolute top-14 right-10 xl:right-14 z-10 w-[300px] space-y-3 hidden xl:block">
          {examples.map((ex, i) => (
            <div
              key={ex.tag}
              className="animate-float bg-white/[0.06] backdrop-blur-md border border-white/10 rounded-2xl px-4 py-3 shadow-xl"
              style={{ animationDelay: `${i * 0.9}s` }}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 rounded-md bg-white/10 flex items-center justify-center">
                  <ex.icon size={13} style={{ color: ex.color }} />
                </div>
                <span className="text-[11px] font-semibold text-white/85 uppercase tracking-wider">
                  {ex.tag}
                </span>
              </div>
              <p className="text-[12.5px] text-blue-100/70 leading-snug">{ex.body}</p>
            </div>
          ))}
        </div>

        {/* headline gigante */}
        <div className="relative z-10 shrink-0 max-w-xl">
          <h1 className="font-display text-[56px] xl:text-[72px] text-white leading-[0.92]">
            Um gênio pro
            <br />
            seu marketing.
          </h1>
          <p className="text-[15px] xl:text-[16px] text-blue-100/70 mt-5 leading-relaxed max-w-md">
            Meta Ads, Gmail e Agenda num só painel. O Genie analisa, resume e prepara tudo — você só
            pergunta.
          </p>
        </div>
      </div>

      {/* ===== Form (claro) ===== */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-[#f7f5f0] relative overflow-hidden">
        {/* GenieMark decorativo, grande e azul, sangrando no canto */}
        <div className="absolute -bottom-16 -right-16 text-brand/10 pointer-events-none select-none">
          <GenieMark size={320} />
        </div>

        <div className="w-full max-w-sm relative z-10">
          {/* logo mobile */}
          <div className="lg:hidden flex flex-col items-center mb-8">
            <div className="text-brand mb-3">
              <GenieMark size={48} />
            </div>
            <h1 className="font-display text-[26px] text-zinc-900">Hub</h1>
          </div>

          <div className="mb-7">
            <h2 className="font-display text-[38px] text-zinc-900 leading-[1.05]">
              {mode === 'login' ? 'Bem-vindo de volta' : 'Crie sua conta'}
            </h2>
            <p className="text-[13px] text-zinc-400 mt-1.5">
              {mode === 'login'
                ? 'Entre para acessar seu Hub.'
                : 'Leva menos de um minuto para começar.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
                  Nome
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full mt-1.5 text-[14px] bg-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand/20 border border-zinc-200"
                  placeholder="Seu nome"
                  required
                />
              </div>
            )}
            <div>
              <label className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full mt-1.5 text-[14px] bg-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand/20 border border-zinc-200"
                placeholder="seu@email.com"
                required
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
                Senha
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full mt-1.5 text-[14px] bg-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand/20 border border-zinc-200"
                placeholder={mode === 'signup' ? 'Mínimo 8 caracteres' : '••••••••'}
                minLength={mode === 'signup' ? 8 : undefined}
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 rounded-lg px-3 py-2">
                <p className="text-[12px] text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 text-[15px] font-medium text-white bg-brand-gradient rounded-xl hover:brightness-110 transition-all disabled:opacity-50 shadow-sm"
            >
              {loading
                ? mode === 'login'
                  ? 'Entrando...'
                  : 'Criando conta...'
                : mode === 'login'
                  ? 'Entrar'
                  : 'Criar conta'}
            </button>

            <p className="text-[13px] text-zinc-400 text-center pt-1">
              {mode === 'login' ? (
                <>
                  Não tem conta?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('signup')}
                    className="font-medium text-brand hover:underline"
                  >
                    Criar conta
                  </button>
                </>
              ) : (
                <>
                  Já tem conta?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className="font-medium text-brand hover:underline"
                  >
                    Entrar
                  </button>
                </>
              )}
            </p>
          </form>

          <div className="mt-8 pt-5 border-t border-zinc-200/60">
            <p className="text-[11px] text-zinc-400 text-center">
              Só testando? Acesso demo:{' '}
              <span className="font-mono text-zinc-500">demo@hub.com / demo123456</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
