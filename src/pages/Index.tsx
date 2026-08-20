export default function Index() {
  return (
    <div className="flex-1 flex items-center justify-center p-6 bg-transparent">
      <div className="text-center space-y-3 group cursor-default animate-slide-up">
        <h1 className="text-xl font-medium tracking-tight text-zinc-900 dark:text-zinc-100 transition-colors duration-300 group-hover:text-black dark:group-hover:text-white">
          Substitua pelo seu Github
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 opacity-80 transition-opacity duration-300 group-hover:opacity-100 max-w-[280px] mx-auto leading-relaxed">
          Um ambiente perfeitamente limpo, pronto para você começar a construir.
        </p>
      </div>
    </div>
  )
}
