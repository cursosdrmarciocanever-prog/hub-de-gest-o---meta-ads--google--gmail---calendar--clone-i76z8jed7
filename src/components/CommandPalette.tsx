import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Home, Megaphone, CalendarDays, Mail, Plug, BarChart3 } from 'lucide-react'
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command'
import pb from '@/lib/pocketbase/client'

// Busca global (⌘K / Ctrl+K). Também abre via evento "open-cmdk" (TopBar).
export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [emails, setEmails] = useState<any[]>([])
  const [events, setEvents] = useState<any[]>([])
  const navigate = useNavigate()

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    const openEvt = () => setOpen(true)
    document.addEventListener('keydown', down)
    window.addEventListener('open-cmdk', openEvt)
    return () => {
      document.removeEventListener('keydown', down)
      window.removeEventListener('open-cmdk', openEvt)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    ;(async () => {
      try {
        setCampaigns(await pb.collection('campaigns').getFullList({ sort: '-spend' }))
      } catch {
        /* ignore */
      }
      try {
        setEmails(await pb.collection('gmail_messages').getFullList({ sort: '-date' }))
      } catch {
        /* ignore */
      }
      try {
        setEvents(await pb.collection('calendar_events').getFullList({ sort: 'start_time' }))
      } catch {
        /* ignore */
      }
    })()
  }, [open])

  const go = (path: string) => {
    setOpen(false)
    navigate(path)
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Buscar campanhas, emails, eventos..." />
      <CommandList>
        <CommandEmpty>Nada encontrado.</CommandEmpty>
        <CommandGroup heading="Ir para">
          <CommandItem value="ir hoje inicio home briefing" onSelect={() => go('/')}>
            <Home />
            Hoje
          </CommandItem>
          <CommandItem value="ir dashboard metricas kpis" onSelect={() => go('/dashboard')}>
            <BarChart3 />
            Dashboard
          </CommandItem>
          <CommandItem value="ir campanhas meta ads" onSelect={() => go('/campaigns')}>
            <Megaphone />
            Campanhas
          </CommandItem>
          <CommandItem value="ir agenda calendario eventos" onSelect={() => go('/calendar')}>
            <CalendarDays />
            Agenda
          </CommandItem>
          <CommandItem value="ir emails gmail caixa" onSelect={() => go('/emails')}>
            <Mail />
            Emails
          </CommandItem>
          <CommandItem value="ir integracoes conectar contas" onSelect={() => go('/connect')}>
            <Plug />
            Integrações
          </CommandItem>
        </CommandGroup>
        {campaigns.length > 0 && (
          <CommandGroup heading="Campanhas">
            {campaigns.slice(0, 25).map((c) => (
              <CommandItem
                key={c.id}
                value={'campanha ' + (c.name || '')}
                onSelect={() => go('/campaign/' + c.id)}
              >
                <Megaphone />
                <span className="truncate">{c.name}</span>
                <span className="ml-auto text-[11px] text-zinc-400 capitalize">{c.status}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {emails.length > 0 && (
          <CommandGroup heading="Emails">
            {emails.slice(0, 15).map((m) => (
              <CommandItem
                key={m.id}
                value={'email ' + (m.subject || '') + ' ' + (m.from_email || '')}
                onSelect={() => go('/emails')}
              >
                <Mail />
                <span className="truncate">{m.subject || '(Sem assunto)'}</span>
                <span className="ml-auto text-[11px] text-zinc-400 truncate max-w-[140px]">
                  {m.from_email}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {events.length > 0 && (
          <CommandGroup heading="Eventos">
            {events.slice(0, 15).map((ev) => (
              <CommandItem
                key={ev.id}
                value={'evento ' + (ev.title || '')}
                onSelect={() => go('/calendar')}
              >
                <CalendarDays />
                <span className="truncate">{ev.title || '(Sem título)'}</span>
                {ev.start_time && (
                  <span className="ml-auto text-[11px] text-zinc-400">
                    {new Date(ev.start_time).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'short',
                    })}
                  </span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  )
}
