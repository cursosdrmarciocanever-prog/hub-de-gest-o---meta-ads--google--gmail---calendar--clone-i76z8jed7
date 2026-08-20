import { Link, useLocation } from 'react-router-dom'
import { useState, useEffect, useCallback } from 'react'
import { Sun, BarChart3, Megaphone, CalendarDays, Mail, Plug, LogOut } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/components/AuthGate'
import { useRealtime } from '@/hooks/use-realtime'
import { useConnections, formatLastSync } from '@/hooks/use-connections'
import { isAutomatedEmail } from '@/lib/text'
import { GenieMark } from '@/components/GenieMark'

interface RailItemProps {
  icon: React.ReactNode
  label: string
  to?: string
  onClick?: () => void
  active?: boolean
  badge?: number
  statusDot?: string
  variant?: 'default' | 'genie'
}

// Um tile da rail: ícone + tooltip que aparece no hover (ref: rail de ícones).
function RailItem({
  icon,
  label,
  to,
  onClick,
  active,
  badge,
  statusDot,
  variant = 'default',
}: RailItemProps) {
  const tile =
    variant === 'genie'
      ? 'bg-brand-gradient text-white hover:brightness-110 shadow-sm'
      : active
        ? 'bg-white text-brand shadow-card'
        : 'text-zinc-400 hover:text-zinc-900 hover:bg-zinc-200/50'

  const inner = (
    <span
      className={`relative flex items-center justify-center w-11 h-11 rounded-xl transition-all ${tile}`}
    >
      {icon}
      {badge && badge > 0 ? (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-semibold rounded-full min-w-[17px] h-[17px] flex items-center justify-center px-1 ring-2 ring-[#f7f5f0]">
          {badge}
        </span>
      ) : null}
      {statusDot ? (
        <span
          className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-[#f7f5f0] ${statusDot}`}
        />
      ) : null}
    </span>
  )

  const tooltip = (
    <span className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1 rounded-lg bg-zinc-900 text-white text-[12px] font-medium whitespace-nowrap opacity-0 translate-x-[-4px] group-hover:opacity-100 group-hover:translate-x-0 transition-all z-50 shadow-pop">
      {label}
    </span>
  )

  const cls = 'group relative flex items-center justify-center'
  return to ? (
    <Link to={to} className={cls}>
      {inner}
      {tooltip}
    </Link>
  ) : (
    <button onClick={onClick} className={cls} aria-label={label}>
      {inner}
      {tooltip}
    </button>
  )
}

const navItems = [
  { name: 'Hoje', path: '/', icon: Sun },
  { name: 'Dashboard', path: '/dashboard', icon: BarChart3 },
  { name: 'Campanhas', path: '/campaigns', icon: Megaphone },
  { name: 'Agenda', path: '/calendar', icon: CalendarDays },
  { name: 'Emails', path: '/emails', icon: Mail, badge: true },
]

export function Sidebar({ onChatClick }: { onChatClick?: () => void }) {
  const loc = useLocation()
  const { logout } = useAuth()
  const [userName, setUserName] = useState('')
  const [unreadCount, setUnreadCount] = useState(0)
  const connections = useConnections()
  const lastSyncLabel = formatLastSync(connections.lastSync)

  const fetchUnread = useCallback(async () => {
    try {
      const msgs = await pb.collection('gmail_messages').getFullList({
        filter: 'needs_reply = true && is_unread = true',
      })
      setUnreadCount(
        msgs.filter((m: any) => !isAutomatedEmail(m.from_email || '', m.subject || '')).length,
      )
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    const u = pb.authStore.record as any
    if (u) setUserName(u.name || u.email || 'Usuario')
    fetchUnread()
    const interval = setInterval(fetchUnread, 30000)
    return () => clearInterval(interval)
  }, [fetchUnread])

  useRealtime('gmail_messages', () => fetchUnread())

  const isActive = (path: string) => {
    if (path === '/') return loc.pathname === '/'
    if (path === '/campaigns')
      return loc.pathname === '/campaigns' || loc.pathname.startsWith('/campaign/')
    return loc.pathname === path
  }

  const connDot =
    connections.googleConnected && connections.metaConnected
      ? 'bg-emerald-500'
      : connections.googleConnected || connections.metaConnected
        ? 'bg-amber-400'
        : 'bg-zinc-300'

  const connLabel =
    connections.metaConnected && lastSyncLabel
      ? `Integrações · sincronizado ${lastSyncLabel}`
      : 'Integrações'

  return (
    <div className="w-[72px] bg-[#f7f5f0] h-full flex flex-col items-center shrink-0 border-r border-zinc-200/60 py-5">
      {/* Genie — a própria marca é o gatilho do chat */}
      <button
        onClick={onChatClick}
        className="group relative text-brand mb-6 mt-1"
        aria-label="Falar com o Genie"
      >
        <GenieMark size={36} />
        <span className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1 rounded-lg bg-zinc-900 text-white text-[12px] font-medium whitespace-nowrap opacity-0 translate-x-[-4px] group-hover:opacity-100 group-hover:translate-x-0 transition-all z-50 shadow-pop">
          Fale comigo ✨
        </span>
      </button>

      {/* Navegação */}
      <nav className="flex-1 flex flex-col items-center gap-1.5">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <RailItem
              key={item.path}
              icon={<Icon size={19} />}
              label={item.name}
              to={item.path}
              active={isActive(item.path)}
              badge={item.badge ? unreadCount : undefined}
            />
          )
        })}
      </nav>

      {/* Rodapé */}
      <div className="flex flex-col items-center gap-2 mt-2">
        <RailItem
          icon={<Plug size={19} />}
          label={connLabel}
          to="/connect"
          active={isActive('/connect')}
          statusDot={connDot}
        />
        <div className="w-8 h-px bg-zinc-200/70 my-0.5" />
        <div className="group relative flex items-center justify-center">
          <div className="w-9 h-9 rounded-full bg-zinc-200 flex items-center justify-center">
            <span className="text-[12px] font-semibold text-zinc-600">
              {(userName || 'U')[0].toUpperCase()}
            </span>
          </div>
          <span className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1 rounded-lg bg-zinc-900 text-white text-[12px] font-medium whitespace-nowrap opacity-0 translate-x-[-4px] group-hover:opacity-100 group-hover:translate-x-0 transition-all z-50 shadow-pop">
            {userName || 'Usuário'}
          </span>
        </div>
        <RailItem icon={<LogOut size={17} />} label="Sair" onClick={logout} />
      </div>
    </div>
  )
}
