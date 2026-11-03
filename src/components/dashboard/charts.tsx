'use client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts'

const STATUS_COLORS: Record<string, string> = {
  'Open': '#3b82f6',
  'In Progress': '#8b5cf6',
  'Waiting for Customer': '#f59e0b',
  'Waiting for Third Party': '#f97316',
  'On Hold': '#6b7280',
  'Resolved': '#22c55e',
  'Closed': '#94a3b8',
}

interface ChartData {
  name: string
  count: number
}

export function DashboardCharts({ data }: { data: ChartData[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-slate-500 text-center py-8">No ticket data yet</p>
  }
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
        <XAxis dataKey="name" tick={{ fontSize: 9 }} />
        <YAxis tick={{ fontSize: 9 }} allowDecimals={false} />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid #e2e8f0' }}
          formatter={(value) => [value, 'Tickets']}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={STATUS_COLORS[entry.name] || '#3b82f6'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

interface TrendData {
  date: string
  open: number
  resolved: number
}

export function TicketTrendChart({ data }: { data: TrendData[] }) {
  if (data.length === 0) return <p className="text-sm text-slate-500 text-center py-8">No data</p>
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="open" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Open" />
        <Bar dataKey="resolved" fill="#22c55e" radius={[4, 4, 0, 0]} name="Resolved" />
      </BarChart>
    </ResponsiveContainer>
  )
}
