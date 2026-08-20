import type { PeriodType } from '@/lib/dashboard-utils'

interface PeriodSelectorProps {
  period: PeriodType
  customStart?: string
  customEnd?: string
  onPeriodChange: (period: PeriodType, customStart?: string, customEnd?: string) => void
}

const options: { value: PeriodType; label: string }[] = [
  { value: '7d', label: '7 dias' },
  { value: '30d', label: '30 dias' },
  { value: 'custom', label: 'Personalizado' },
]

export function PeriodSelector({
  period,
  customStart,
  customEnd,
  onPeriodChange,
}: PeriodSelectorProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex bg-white rounded-lg border border-card-border p-0.5 shadow-card">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onPeriodChange(opt.value, customStart, customEnd)}
            className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-colors ${
              period === opt.value ? 'bg-brand text-white' : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {period === 'custom' && (
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={customStart || ''}
            onChange={(e) => onPeriodChange('custom', e.target.value, customEnd)}
            className="text-[12px] bg-white rounded-lg border border-card-border px-2 py-1.5 text-zinc-600 focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
          <span className="text-zinc-300 text-[12px]">→</span>
          <input
            type="date"
            value={customEnd || ''}
            onChange={(e) => onPeriodChange('custom', customStart, e.target.value)}
            className="text-[12px] bg-white rounded-lg border border-card-border px-2 py-1.5 text-zinc-600 focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
        </div>
      )}
    </div>
  )
}
