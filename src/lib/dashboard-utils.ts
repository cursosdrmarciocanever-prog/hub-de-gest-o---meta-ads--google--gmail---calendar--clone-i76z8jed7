export type PeriodType = '7d' | '30d' | 'custom'

export interface DateRange {
  start: Date
  end: Date
  prevStart: Date
  prevEnd: Date
  days: number
}

export function getDateRange(
  period: PeriodType,
  customStart?: string,
  customEnd?: string,
): DateRange {
  const now = new Date()
  const end = new Date(now)
  end.setHours(23, 59, 59, 999)
  let start = new Date(now)
  let days = 7

  if (period === '7d') {
    start.setDate(start.getDate() - 7)
    days = 7
  } else if (period === '30d') {
    start.setDate(start.getDate() - 30)
    days = 30
  } else {
    if (customStart) start = new Date(customStart)
    if (customEnd) {
      end.setTime(new Date(customEnd).getTime())
      end.setHours(23, 59, 59, 999)
    }
    start.setHours(0, 0, 0, 0)
    days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000))
  }
  start.setHours(0, 0, 0, 0)

  const prevEnd = new Date(start.getTime() - 1)
  const prevStart = new Date(prevEnd.getTime() - days * 86400000)
  prevStart.setHours(0, 0, 0, 0)

  return { start, end, prevStart, prevEnd, days }
}

export function isInRange(dateStr: string, start: Date, end: Date): boolean {
  const d = new Date(dateStr)
  return d >= start && d <= end
}

export function computeTrend(current: number, previous: number) {
  if (previous === 0) return { change: current > 0 ? '+100%' : '0%', trend: 'up' as const }
  const pct = ((current - previous) / Math.abs(previous)) * 100
  return {
    change: `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`,
    trend: (pct >= 0 ? 'up' : 'down') as 'up' | 'down',
  }
}

export function formatCurrency(value: number): string {
  return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function getRoasColor(roas: number): string {
  if (roas >= 2) return 'text-emerald-600'
  if (roas >= 1) return 'text-amber-500'
  return 'text-red-500'
}
