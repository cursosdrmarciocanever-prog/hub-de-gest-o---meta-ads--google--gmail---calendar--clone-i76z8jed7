import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  page: number
  pageCount: number
  onPage: (p: number) => void
  label?: string
  compact?: boolean
}

// Lista de páginas com elipses: 1 … 4 5 6 … 20
function pageList(page: number, pageCount: number): (number | 'gap')[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1)
  const out: (number | 'gap')[] = [1]
  if (page > 3) out.push('gap')
  const start = Math.max(2, page - 1)
  const end = Math.min(pageCount - 1, page + 1)
  for (let i = start; i <= end; i++) out.push(i)
  if (page < pageCount - 2) out.push('gap')
  out.push(pageCount)
  return out
}

export function Pagination({ page, pageCount, onPage, label, compact }: PaginationProps) {
  if (pageCount <= 1) return null

  const arrowCls =
    'w-8 h-8 flex items-center justify-center rounded-lg text-zinc-500 hover:bg-white hover:text-zinc-900 disabled:opacity-30 disabled:hover:bg-transparent transition-colors'

  return (
    <div className="flex items-center justify-between gap-3 mt-4 px-1 flex-wrap">
      {label && !compact ? <span className="text-[12px] text-zinc-400">{label}</span> : <span />}
      <div className="flex items-center gap-1">
        <button onClick={() => onPage(page - 1)} disabled={page === 1} className={arrowCls}>
          <ChevronLeft size={16} />
        </button>
        {compact ? (
          <span className="px-2 text-[12px] text-zinc-500 tabular-nums">
            {page} / {pageCount}
          </span>
        ) : (
          pageList(page, pageCount).map((p, i) =>
            p === 'gap' ? (
              <span key={'gap' + i} className="w-7 text-center text-[13px] text-zinc-300">
                …
              </span>
            ) : (
              <button
                key={p}
                onClick={() => onPage(p)}
                className={`min-w-8 h-8 px-2 rounded-lg text-[12px] font-medium tabular-nums transition-colors ${
                  p === page
                    ? 'bg-brand text-white'
                    : 'text-zinc-500 hover:bg-white hover:text-zinc-900'
                }`}
              >
                {p}
              </button>
            ),
          )
        )}
        <button onClick={() => onPage(page + 1)} disabled={page === pageCount} className={arrowCls}>
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}
