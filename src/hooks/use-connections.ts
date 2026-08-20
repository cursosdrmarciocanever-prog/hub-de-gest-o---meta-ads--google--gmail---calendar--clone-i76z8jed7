import { useState, useEffect, useCallback } from 'react'
import pb from '@/lib/pocketbase/client'

export interface ConnectionsState {
  loading: boolean
  metaConnected: boolean
  metaAccountId: string
  metaAccountName: string
  metaConnectionId: string
  lastSync: string
  googleConnected: boolean
  googleEmail: string
}

const initial: ConnectionsState = {
  loading: true,
  metaConnected: false,
  metaAccountId: '',
  metaAccountName: '',
  metaConnectionId: '',
  lastSync: '',
  googleConnected: false,
  googleEmail: '',
}

/** Estado central das conexões Meta/Google — evita 4 cópias do mesmo fetch. */
export function useConnections() {
  const [state, setState] = useState<ConnectionsState>(initial)

  const refresh = useCallback(async () => {
    const next = { ...initial, loading: false }
    try {
      const m = await pb.collection('meta_connections').getFullList({})
      const conn = m.find((c: any) => c.status === 'connected') || m[0]
      if (conn) {
        next.metaConnected = conn.status === 'connected'
        next.metaAccountId = conn.account_id || ''
        next.metaAccountName = conn.account_name || ''
        next.metaConnectionId = conn.id
        next.lastSync = conn.last_sync || ''
      }
    } catch {
      /* sem permissão / offline */
    }
    try {
      const g = await pb.collection('google_connections').getFullList({})
      const conn = g.find((c: any) => c.status === 'connected')
      if (conn) {
        next.googleConnected = true
        next.googleEmail = conn.email || ''
      }
    } catch {
      /* sem permissão / offline */
    }
    setState(next)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { ...state, refresh }
}

/** "há 5 min", "há 2 h", "há 3 dias" — vazio se nunca sincronizou. */
export function formatLastSync(iso: string): string {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  if (isNaN(then)) return ''
  const diffMin = Math.floor((Date.now() - then) / 60000)
  if (diffMin < 1) return 'agora mesmo'
  if (diffMin < 60) return `há ${diffMin} min`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `há ${diffH} h`
  const diffD = Math.floor(diffH / 24)
  return diffD === 1 ? 'há 1 dia' : `há ${diffD} dias`
}
