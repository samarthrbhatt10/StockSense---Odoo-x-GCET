import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { ActivityDay } from '../types'
import { formatShortDay } from '../utils'

const SERIES = [
  { key: 'receipts', label: 'Receipts', color: 'var(--primary)' },
  { key: 'deliveries', label: 'Deliveries', color: 'oklch(0.75 0.15 70)' },
  { key: 'transfers', label: 'Transfers', color: 'oklch(0.65 0.12 175)' },
  { key: 'adjustments', label: 'Adjustments', color: 'oklch(0.6 0.03 260)' },
] as const

const CHART_HEIGHT = 260

export function ActivityChart({ data, className }: { data: ActivityDay[]; className?: string }) {
  const total = data.reduce(
    (sum, day) => sum + day.receipts + day.deliveries + day.transfers + day.adjustments,
    0,
  )

  return (
    <Card className={cn('min-w-0', className)}>
      <CardHeader>
        <CardTitle>Completed operations, last 14 days</CardTitle>
        <CardDescription>
          {total === 1 ? '1 operation completed' : `${total} operations completed`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div style={{ height: CHART_HEIGHT }} className="w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey="date"
                tickFormatter={formatShortDay}
                tickLine={false}
                axisLine={false}
                fontSize={12}
                minTickGap={12}
                stroke="var(--muted-foreground)"
              />
              <YAxis
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                fontSize={12}
                stroke="var(--muted-foreground)"
              />
              <Tooltip
                cursor={{ fill: 'var(--muted)' }}
                labelFormatter={(label) => formatShortDay(String(label))}
                contentStyle={{
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--popover)',
                  fontSize: 12,
                }}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 12 }}
                itemSorter={(item) => SERIES.findIndex((series) => series.label === item.value)}
              />
              {SERIES.map((series) => (
                <Bar
                  key={series.key}
                  dataKey={series.key}
                  name={series.label}
                  stackId="activity"
                  fill={series.color}
                  maxBarSize={32}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
