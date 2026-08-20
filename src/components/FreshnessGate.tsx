import { useState, useEffect } from 'react'
import { GenieMark } from '@/components/GenieMark'
import pb from '@/lib/pocketbase/client'

const STALE_MS = 60 * 60 * 1000 // 1h — dados mais velhos que isso forçam atualizar ao abrir
const DEBOUNCE_MS = 10 * 60 * 1000 // não repete a checagem se já rodou nos últimos 10 min

// Ao abrir o app depois de um tempo, força uma sincronização antes de liberar,
// pra o Genie não responder com dados desatualizados.
//
// O debounce é por TEMPO (localStorage), não por sessão: uma aba que fica dias
// aberta ainda re-checa quando o dado envelhece — sessionStorage duraria a aba
// inteira e a gate nunca voltaria a disparar.
export function FreshnessGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const lastRun = Number(localStorage.getItem('hub_freshness_at') || 0)
      if (lastRun && Date.now() - lastRun < DEBOUNCE_MS) {
        setReady(true)
        return
      }
      localStorage.setItem('hub_freshness_at', String(Date.now()))

      let metaStale = false
      let hasGoogle = false
      try {
        const m = await pb.collection('meta_connections').getFullList({})
        const conn = m.find((c: any) => c.status === 'connected')
        if (conn) {
          const last = conn.last_sync ? new Date(conn.last_sync).getTime() : 0
          metaStale = Date.now() - last > STALE_MS
        }
      } catch {
        /* ignore */
      }
      try {
        const g = await pb.collection('google_connections').getFullList({})
        hasGoogle = g.some((c: any) => c.status === 'connected')
      } catch {
        /* ignore */
      }

      // só bloqueia se os dados do Meta estão realmente velhos
      if (cancelled) return
      if (!metaStale) {
        setReady(true)
        return
      }

      const jobs: Promise<unknown>[] = [
        fetch(pb.baseUrl + '/backend/v1/meta-ads/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: pb.authStore.token || '' },
          body: JSON.stringify({}),
        }).catch(() => {}),
      ]
      if (hasGoogle) {
        jobs.push(
          fetch(pb.baseUrl + '/backend/v1/google/sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: pb.authStore.token || '',
            },
            body: JSON.stringify({}),
          }).catch(() => {}),
        )
      }
      // libera assim que terminar, com teto de 30s pra nunca travar o usuário
      const timeout = new Promise((r) => setTimeout(r, 30000))
      await Promise.race([Promise.allSettled(jobs), timeout])
      if (!cancelled) setReady(true)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (ready) return <>{children}</>

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0B1E2D] text-center px-6">
      <div className="text-white mb-6">
        <GenieMark size={64} />
      </div>
      <h1 className="font-display text-[30px] text-white leading-tight">Atualizando seus dados</h1>
      <p className="text-[14px] text-blue-100/60 mt-2.5 max-w-xs leading-relaxed">
        Buscando o que há de mais recente pra o Genie te responder com dados atuais.
      </p>
      <div className="mt-6 flex gap-1.5">
        <span className="w-2 h-2 rounded-full bg-blue-300/70 animate-pulse" />
        <span
          className="w-2 h-2 rounded-full bg-blue-300/70 animate-pulse"
          style={{ animationDelay: '0.2s' }}
        />
        <span
          className="w-2 h-2 rounded-full bg-blue-300/70 animate-pulse"
          style={{ animationDelay: '0.4s' }}
        />
      </div>
    </div>
  )
}
