import { Search } from 'lucide-react'

// Barra superior enxuta: só a busca global (⌘K), que abre o CommandPalette.
// Sino e CTA do Genie saíram — notificações não têm backend e o Genie já tem
// entrada primária na sidebar + GenieCard.
export function TopBar() {
  const openPalette = () => window.dispatchEvent(new CustomEvent('open-cmdk'))

  return (
    <div className="h-14 shrink-0 border-b border-card-border bg-white/80 backdrop-blur-md flex items-center gap-3 px-6 z-10">
      <button
        onClick={openPalette}
        className="relative w-full max-w-md h-9 bg-zinc-50 border border-zinc-200 rounded-xl pl-9 pr-14 text-left text-[13px] text-zinc-400 hover:border-zinc-300 hover:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand/20 transition-colors"
      >
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
        Buscar campanhas, emails, eventos...
        <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-zinc-400 bg-white border border-zinc-200 rounded-md px-1.5 py-0.5 font-medium tabular-nums">
          ⌘K
        </kbd>
      </button>
      <div className="flex-1" />
    </div>
  )
}
