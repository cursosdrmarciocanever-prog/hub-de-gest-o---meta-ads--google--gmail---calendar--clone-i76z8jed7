import { useState, useEffect, useCallback } from 'react'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import {
  getDateRange,
  isInRange,
  computeTrend,
  formatCurrency,
  type PeriodType,
} from '@/lib/dashboard-utils'

export interface KpiData {
  label: string
  value: string
  change: string
  trend: 'up' | 'down'
  sparkline: number[]
}

export interface ChartPoint {
  date: string
  spend: number
  conversions: number
  ctr: number
  impressions: number
  clicks: number
}

export interface CampaignData {
  id: string
  name: string
  status: string
  spend: number
  impressions: number
  conversions: number
  roas: number
  objective?: string
}

export interface DashboardData {
  kpis: KpiData[]
  chartData: ChartPoint[]
  campaigns: CampaignData[]
  events: any[]
  loading: boolean
  hasData: boolean
  hasConnection: boolean
  googleConnected: boolean
  userName: string
  latestMetricDate: string
}

const initialState: DashboardData = {
  kpis: [],
  chartData: [],
  campaigns: [],
  events: [],
  loading: true,
  hasData: false,
  hasConnection: false,
  googleConnected: false,
  userName: '',
  latestMetricDate: '',
}

export function useDashboardData(
  period: PeriodType,
  customStart?: string,
  customEnd?: string,
): DashboardData {
  const [data, setData] = useState<DashboardData>(initialState)

  const fetchData = useCallback(async () => {
    const range = getDateRange(period, customStart, customEnd)
    try {
      const [metricRecords, campRecords, eventRecords] = await Promise.all([
        pb.collection('daily_metrics').getFullList({ sort: 'date', perPage: 500 }),
        pb.collection('campaigns').getFullList({ sort: '-spend' }),
        pb
          .collection('calendar_events')
          .getFullList({ sort: 'start_time', perPage: 10 })
          .catch(() => []),
      ])

      const latestMetricDate = metricRecords.length
        ? (((metricRecords[metricRecords.length - 1] as any).date || '') as string).split(' ')[0]
        : ''

      let hasConn = false,
        gConn = false,
        uName = ''
      try {
        const c = await pb.collection('meta_connections').getFullList({})
        hasConn = c.length > 0
      } catch {
        /* intentionally ignored */
      }
      try {
        const c = await pb.collection('google_connections').getFullList({})
        gConn = c.length > 0 && c[0].status === 'connected'
      } catch {
        /* intentionally ignored */
      }
      const user = pb.authStore.record as any
      if (user) uName = user.name || user.email?.split('@')[0] || 'Usuario'

      const cur = metricRecords.filter((m: any) => isInRange(m.date, range.start, range.end))
      const prev = metricRecords.filter((m: any) =>
        isInRange(m.date, range.prevStart, range.prevEnd),
      )

      const sum = (arr: any[], key: string) => arr.reduce((s, m) => s + (m[key] || 0), 0)
      const avg = (arr: any[], key: string) => (arr.length > 0 ? sum(arr, key) / arr.length : 0)

      const curSpend = sum(cur, 'spend'),
        prevSpend = sum(prev, 'spend')
      const curConv = sum(cur, 'conversions'),
        prevConv = sum(prev, 'conversions')
      const curCtr = avg(cur, 'ctr'),
        prevCtr = avg(prev, 'ctr')
      const curImp = sum(cur, 'impressions'),
        prevImp = sum(prev, 'impressions')

      const byDate: Record<string, any> = {}
      for (const m of cur) {
        const d = (m.date || '').split(' ')[0]
        if (!byDate[d])
          byDate[d] = { spend: 0, conversions: 0, ctr: 0, impressions: 0, clicks: 0, count: 0 }
        byDate[d].spend += m.spend || 0
        byDate[d].conversions += m.conversions || 0
        byDate[d].ctr += m.ctr || 0
        byDate[d].impressions += m.impressions || 0
        byDate[d].clicks += m.clicks || 0
        byDate[d].count++
      }
      const dates = Object.keys(byDate).sort()
      const chartData: ChartPoint[] = dates.map((d) => ({
        date: d,
        spend: byDate[d].spend,
        conversions: byDate[d].conversions,
        ctr: byDate[d].count > 0 ? byDate[d].ctr / byDate[d].count : 0,
        impressions: byDate[d].impressions,
        clicks: byDate[d].clicks,
      }))

      const kpis: KpiData[] = [
        {
          label: 'Investimento',
          value: formatCurrency(curSpend),
          ...computeTrend(curSpend, prevSpend),
          sparkline: dates.map((d) => byDate[d].spend),
        },
        {
          label: 'Impressões',
          value: curImp.toLocaleString('pt-BR'),
          ...computeTrend(curImp, prevImp),
          sparkline: dates.map((d) => byDate[d].impressions),
        },
        {
          label: 'Conversões',
          value: curConv.toLocaleString('pt-BR'),
          ...computeTrend(curConv, prevConv),
          sparkline: dates.map((d) => byDate[d].conversions),
        },
        {
          label: 'CTR Médio',
          value: `${curCtr.toFixed(2)}%`,
          ...computeTrend(curCtr, prevCtr),
          sparkline: dates.map((d) => (byDate[d].count > 0 ? byDate[d].ctr / byDate[d].count : 0)),
        },
      ]

      const campMetrics: Record<
        string,
        {
          spend: number
          impressions: number
          conversions: number
          roasSum: number
          roasCount: number
        }
      > = {}
      for (const m of cur) {
        const rawCid = m.campaign_id
        const cid = typeof rawCid === 'string' ? rawCid : rawCid?.id || ''
        if (!cid) continue
        if (!campMetrics[cid])
          campMetrics[cid] = { spend: 0, impressions: 0, conversions: 0, roasSum: 0, roasCount: 0 }
        campMetrics[cid].spend += m.spend || 0
        campMetrics[cid].impressions += m.impressions || 0
        campMetrics[cid].conversions += m.conversions || 0
        if (m.purchase_roas) {
          campMetrics[cid].roasSum += m.purchase_roas
          campMetrics[cid].roasCount++
        }
      }

      const campaigns: CampaignData[] = campRecords.map((r: any) => {
        const cm = campMetrics[r.id]
        return {
          id: r.id,
          name: r.name,
          status: r.status,
          spend: cm?.spend ?? (r.spend || 0),
          impressions: cm?.impressions ?? (r.impressions || 0),
          conversions: cm?.conversions ?? (r.conversions || 0),
          roas: cm?.roasCount ? cm.roasSum / cm.roasCount : r.roas || 0,
          objective: r.objective || '',
        }
      })

      setData({
        kpis,
        chartData,
        campaigns,
        events: eventRecords,
        loading: false,
        hasData: campaigns.length > 0 || chartData.length > 0,
        hasConnection: hasConn,
        googleConnected: gConn,
        userName: uName,
        latestMetricDate,
      })
    } catch (e) {
      console.error('Dashboard fetch failed:', e)
      setData((prev) => ({ ...prev, loading: false }))
    }
  }, [period, customStart, customEnd])

  useEffect(() => {
    fetchData()
  }, [fetchData])
  useRealtime('daily_metrics', () => fetchData())
  useRealtime('campaigns', () => fetchData())

  return data
}
