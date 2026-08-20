import { useState } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface KpiCardProps {
  label: string
  value: string
  change?: string
  trend?: 'up' | 'down'
  sparkline?: number[]
  active?: boolean
  onClick?: () => void
}

const BRAND = '#0060d6'
const NEUTRAL = '#a1a1aa'

function buildSmoothPath(values: number[], w: number, h: number): string {
  if (values.length < 2) return ''
  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min || 1
  const pts = values.map((v, i) => ({
    x: (i / (values.length - 1)) * w,
    y: h - ((v - min) / range) * (h - 6) - 3,
  }))
  let path = 'M ' + pts[0].x + ' ' + pts[0].y
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1]
    const curr = pts[i]
    const cpx = (prev.x + curr.x) / 2
    path += ' C ' + cpx + ' ' + prev.y + ' ' + cpx + ' ' + curr.y + ' ' + curr.x + ' ' + curr.y
  }
  return path
}

export function KpiCard({
  label,
  value,
  change,
  trend = 'up',
  sparkline = [],
  active = false,
  onClick,
}: KpiCardProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const w = 120
  const h = 36
  const hasSparkline = sparkline && sparkline.length >= 2
  const trendTextColor = trend === 'up' ? 'text-emerald-600' : 'text-red-500'
  const lineColor = active ? BRAND : NEUTRAL
  const clickable = !!onClick

  const wrapCls = `block w-full text-left rounded-2xl p-5 transition-all ${
    active ? 'surface ring-1 ring-brand/50' : 'surface hover:shadow-card-hover'
  } ${clickable ? 'cursor-pointer' : ''}`

  const pts = hasSparkline
    ? (() => {
        const max = Math.max(...sparkline)
        const min = Math.min(...sparkline)
        const range = max - min || 1
        return sparkline.map((v, i) => ({
          x: (i / (sparkline.length - 1)) * w,
          y: h - ((v - min) / range) * (h - 6) - 3,
          value: v,
        }))
      })()
    : []

  const linePath = hasSparkline ? buildSmoothPath(sparkline, w, h) : ''
  const areaPath = hasSparkline ? linePath + ' L ' + w + ' ' + h + ' L 0 ' + h + ' Z' : ''
  const gradId = 'spark-' + label.replace(/[^a-zA-Z]/g, '') + (active ? '-a' : '')

  const handleMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!hasSparkline) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * w
    let closest = 0
    let minDist = Infinity
    for (let i = 0; i < pts.length; i++) {
      const dist = Math.abs(pts[i].x - x)
      if (dist < minDist) {
        minDist = dist
        closest = i
      }
    }
    setHoverIdx(closest)
  }

  const hovered = hoverIdx !== null ? pts[hoverIdx] : null

  const inner = (
    <>
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">{label}</p>
        {active && <span className="w-1.5 h-1.5 rounded-full bg-brand" />}
      </div>
      <span className="block mt-3 text-[26px] font-semibold text-zinc-900 tabular-nums tracking-tight leading-none">
        {hovered ? hovered.value.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) : value}
      </span>
      <div className="flex items-center justify-between mt-4 h-10">
        {change ? (
          <span
            className={`flex items-center gap-1 text-[12px] font-medium tabular-nums ${trendTextColor}`}
          >
            {trend === 'up' ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
            {change}
          </span>
        ) : (
          <span />
        )}
        {hasSparkline && (
          <svg
            width="100%"
            height={h}
            viewBox={'0 0 ' + w + ' ' + h}
            preserveAspectRatio="none"
            className="flex-1 min-w-0 max-w-[130px] ml-3"
            onMouseMove={handleMove}
            onMouseLeave={() => setHoverIdx(null)}
          >
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={lineColor} stopOpacity="0.14" />
                <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={areaPath} fill={'url(#' + gradId + ')'} />
            <path
              d={linePath}
              fill="none"
              stroke={lineColor}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {hovered && (
              <circle
                cx={hovered.x}
                cy={hovered.y}
                r="3"
                fill="#fff"
                stroke={lineColor}
                strokeWidth="1.5"
              />
            )}
          </svg>
        )}
      </div>
    </>
  )

  if (clickable) {
    return (
      <button type="button" onClick={onClick} className={wrapCls}>
        {inner}
      </button>
    )
  }
  return <div className={wrapCls}>{inner}</div>
}
