export default function NotFound() {
  return (
    <div className="flex h-screen items-center justify-center bg-zinc-50">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-zinc-900">Pagina nao encontrada</h1>
        <p className="text-sm text-zinc-400 mt-2">Volte para o dashboard.</p>
        <a
          href="/"
          className="inline-block mt-4 px-4 py-2 text-sm font-medium text-white bg-zinc-900 rounded-lg hover:bg-zinc-800"
        >
          Voltar
        </a>
      </div>
    </div>
  )
}
