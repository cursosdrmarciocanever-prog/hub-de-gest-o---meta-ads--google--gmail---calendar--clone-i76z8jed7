import { useState, useRef } from 'react'

type MetricType = 'spend' | 'conversions' | 'ctr' | 'impressions' | 'clicks'

interface ChartPoint {
  date: string
  spend: number
  conversions: number
  ctr: number
  impressions: number
  clicks: number
}

const BRAND = '#0060d6'

const metricConfig: Record<MetricType, { label: string; format: (v: number) => string }> = {
  spend: {
    label: 'Investimento',
    format: (v) => `R$ ${v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`,
  },
  conversions: {
    label: 'Conversões',
    format: (v) => v.toLocaleString('pt-BR', { maximumFractionDigits: 0 }),
  },
  ctr: { label: 'CTR', format: (v) => `${v.toFixed(2)}%` },
  impressions: {
    label: 'Impressões',
    format: (v) => v.toLocaleString('pt-BR', { maximumFractionDigits: 0 }),
  },
  clicks: {
    label: 'Cliques',
    format: (v) => v.toLocaleString('pt-BR', { maximumFractionDigits: 0 }),
  },
}

function buildSmoothPath(values: number[], w: number, h: number, pad: number): string {
  if (values.length < 2) return ''
  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min || 1
  const pts = values.map((v, i) => ({
    x: pad + (i / (values.length - 1)) * (w - pad * 2),
    y: h - pad - ((v - min) / range) * (h - pad * 2),
  }))
  let path = 'M ' + pts[0].x + ' ' + pts[0].y
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1],
      curr = pts[i]
    const cpx = (prev.x + curr.x) / 2
    path += ' C ' + cpx + ' ' + prev.y + ' ' + cpx + ' ' + curr.y + ' ' + curr.x + ' ' + curr.y
  }
  return path
}

interface PerformanceChartProps {
  data: ChartPoint[]
  metric?: MetricType
  onMetricChange?: (m: MetricType) => void
}

export function PerformanceChart({
  data,
  metric: metricProp,
  onMetricChange,
}: PerformanceChartProps) {
  const [internalMetric, setInternalMetric] = useState<MetricType>('spend')
  const metric = metricProp ?? internalMetric
  const setMetric = onMetricChange ?? setInternalMetric
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const w = 600,
    h = 220,
    pad = 15

  if (!data || data.length < 2) {
    return (
      <div className="surface rounded-2xl p-6 h-full flex items-center justify-center">
        <p className="text-[13px] text-zinc-400">Sem dados para exibir</p>
      </div>
    )
  }

  const values = data.map((d) => d[metric])
  const cfg = metricConfig[metric]
  const max = Math.max(...values),
    min = Math.min(...values),
    range = max - min || 1
  const pts = values.map((v, i) => ({
    x: pad + (i / (values.length - 1)) * (w - pad * 2),
    y: h - pad - ((v - min) / range) * (h - pad * 2),
    value: v,
    idx: i,
  }))
  const linePath = buildSmoothPath(values, w, h, pad)
  const areaPath =
    linePath + ' L ' + pts[pts.length - 1].x + ' ' + h + ' L ' + pts[0].x + ' ' + h + ' Z'
  const gradId = 'perf-' + metric
  const labelInterval = Math.max(1, Math.ceil(data.length / 7))

  const handleMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * w
    let closest = 0,
      minDist = Infinity
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

  return (
    <div className="surface rounded-2xl p-6 h-full">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h3 className="text-[14px] font-semibold text-zinc-900">{cfg.label}</h3>
          <p className="text-[11px] text-zinc-500 mt-0.5">Últimos {data.length} dias</p>
        </div>
        <div className="flex items-center gap-1 bg-zinc-50 rounded-lg p-0.5 flex-wrap border border-zinc-200/60">
          {(Object.keys(metricConfig) as MetricType[]).map((m) => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors ${
                metric === m
                  ? 'bg-white text-zinc-900 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-700'
              }`}
            >
              {metricConfig[m].label}
            </button>
          ))}
        </div>
      </div>
      <div className="relative">
        <svg
          ref={svgRef}
          width="100%"
          height={h}
          viewBox={'0 0 ' + w + ' ' + h}
          className="block"
          onMouseMove={handleMove}
          onMouseLeave={() => setHoverIdx(null)}
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={BRAND} stopOpacity="0.12" />
              <stop offset="100%" stopColor={BRAND} stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75].map((p) => (
            <line
              key={p}
              x1={pad}
              y1={pad + p * (h - pad * 2)}
              x2={w - pad}
              y2={pad + p * (h - pad * 2)}
              stroke="#f4f4f5"
              strokeWidth="1"
            />
          ))}
          <path d={areaPath} fill={'url(#' + gradId + ')'} />
          <path
            d={linePath}
            fill="none"
            stroke={BRAND}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {hovered && (
            <g>
              <line
                x1={hovered.x}
                y1={pad}
                x2={hovered.x}
                y2={h - pad}
                stroke="#d4d4d8"
                strokeWidth="1"
                strokeDasharray="3,3"
              />
              <circle
                cx={hovered.x}
                cy={hovered.y}
                r="5"
                fill="#fff"
                stroke={BRAND}
                strokeWidth="2"
              />
            </g>
          )}
        </svg>
        {hovered && (
          <div
            className="absolute pointer-events-none bg-zinc-900 text-white rounded-lg px-3 py-2 text-[12px] shadow-lg z-10"
            style={{
              left: `calc(${Math.min(88, Math.max(10, (hovered.x / w) * 100))}% - 50px)`,
              top: `${Math.max(2, (hovered.y / h) * 100 - 20)}%`,
            }}
          >
            <p className="text-[10px] text-zinc-400">{data[hovered.idx].date}</p>
            <p className="font-semibold tabular-nums">{cfg.format(hovered.value)}</p>
          </div>
        )}
      </div>
      <div className="flex justify-between mt-3 px-1">
        {data
          .filter((_, i) => i % labelInterval === 0)
          .map((d) => (
            <span key={d.date} className="text-[10px] text-zinc-400 tabular-nums">
              {d.date.split('-').reverse().slice(0, 2).join('/')}
            </span>
          ))}
      </div>
    </div>
  )
}
