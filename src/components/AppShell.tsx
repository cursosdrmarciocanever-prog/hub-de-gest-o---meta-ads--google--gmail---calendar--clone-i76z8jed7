import { Sidebar } from '@/components/Sidebar'

// Casca compartilhada das páginas: sidebar + coluna de conteúdo.
export function AppShell({
  children,
  onChatClick,
}: {
  children: React.ReactNode
  onChatClick?: () => void
}) {
  return (
    <div className="flex h-screen bg-[#f7f5f0]">
      <Sidebar onChatClick={onChatClick} />
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">{children}</div>
    </div>
  )
}
