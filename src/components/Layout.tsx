import { Outlet } from 'react-router-dom'

export default function Layout() {
  return (
    <div className="min-h-screen w-full bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 flex flex-col font-sans antialiased animate-fade-in">
      <main className="flex-1 flex flex-col w-full h-full">
        <Outlet />
      </main>
    </div>
  )
}
