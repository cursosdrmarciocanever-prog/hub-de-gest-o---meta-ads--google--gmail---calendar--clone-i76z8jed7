import { Link } from 'react-router-dom'
import { Calendar, ArrowRight, Plug } from 'lucide-react'

interface CalendarEvent {
  id: string
  title: string
  start_time: string
  location?: string
}

// Card lateral do dashboard. Nunca desaparece: sem eventos ele mostra o estado
// vazio com caminho pra Agenda; sem Google conectado, o CTA de conexão.
export function EventsCard({
  events,
  googleConnected,
}: {
  events: CalendarEvent[]
  googleConnected: boolean
}) {
  const upcoming = (events || []).filter((e) => new Date(e.start_time) >= new Date()).slice(0, 5)

  return (
    <div className="surface rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Calendar size={15} className="text-brand" />
        <h3 className="text-[13px] font-semibold text-zinc-900">Próximos eventos</h3>
        <Link
          to="/calendar"
          className="ml-auto inline-flex items-center gap-1 text-[11px] font-medium text-zinc-400 hover:text-zinc-900 transition-colors"
        >
          Agenda
          <ArrowRight size={11} />
        </Link>
      </div>

      {!googleConnected ? (
        <div className="text-center py-3">
          <p className="text-[12px] text-zinc-400 mb-3">
            Conecte o Google para ver sua agenda e emails aqui.
          </p>
          <Link
            to="/connect"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-zinc-600 bg-zinc-50 rounded-lg hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
          >
            <Plug size={12} />
            Conectar Google
          </Link>
        </div>
      ) : upcoming.length === 0 ? (
        <p className="text-[12px] text-zinc-400 py-2">Nada agendado para os próximos dias.</p>
      ) : (
        <div className="space-y-1">
          {upcoming.map((ev) => {
            const date = new Date(ev.start_time)
            return (
              <div
                key={ev.id}
                className="flex items-center gap-3 py-2 border-b border-zinc-50 last:border-0"
              >
                <div className="text-center shrink-0 w-11">
                  <p className="text-[10px] text-zinc-400 uppercase">
                    {date.toLocaleDateString('pt-BR', { weekday: 'short' })}
                  </p>
                  <p className="text-[16px] font-semibold text-zinc-900 leading-tight">
                    {date.getDate()}
                  </p>
                </div>
                <div className="w-px h-8 bg-zinc-100" />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-zinc-900 truncate">{ev.title}</p>
                  <p className="text-[11px] text-zinc-500">
                    {date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    {ev.location ? ' - ' + ev.location : ''}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
