'use client'

import { useState, useEffect } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
} from 'chart.js'
import { Bar, Pie, Line } from 'react-chartjs-2'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TrendingUp, BarChart3, PieChart, Activity } from 'lucide-react'
import { cn } from '@/lib/utils'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
)

interface ChartData {
  labels: string[]
  datasets: Array<{
    label: string
    data: number[]
    backgroundColor?: string[]
    borderColor?: string[]
    borderWidth?: number
    fill?: boolean
    tension?: number
  }>
}

interface DashboardChartsProps {
  data?: {
    pipeline: ChartData
    status: ChartData
    timeline: ChartData
  }
  className?: string
}

const defaultColors = [
  'rgba(99, 102, 241, 0.8)',
  'rgba(34, 197, 94, 0.8)',
  'rgba(251, 146, 60, 0.8)',
  'rgba(239, 68, 68, 0.8)',
  'rgba(168, 85, 247, 0.8)',
  'rgba(236, 72, 153, 0.8)',
  'rgba(14, 165, 233, 0.8)',
  'rgba(250, 204, 21, 0.8)',
]

const borderColors = [
  'rgba(99, 102, 241, 1)',
  'rgba(34, 197, 94, 1)',
  'rgba(251, 146, 60, 1)',
  'rgba(239, 68, 68, 1)',
  'rgba(168, 85, 247, 1)',
  'rgba(236, 72, 153, 1)',
  'rgba(14, 165, 233, 1)',
  'rgba(250, 204, 21, 1)',
]

export default function DashboardCharts({ data, className }: DashboardChartsProps) {
  const [selectedChart, setSelectedChart] = useState<string | null>(null)
  const [chartData, setChartData] = useState({
    pipeline: {
      labels: ['SMS Campaign', 'Digital Ads', 'Smartcard', 'Email Marketing', 'Web Development'],
      datasets: [{
        label: 'Proposals by Month',
        data: [12, 19, 8, 15, 22],
        backgroundColor: defaultColors,
        borderColor: borderColors,
        borderWidth: 1,
      }]
    },
    status: {
      labels: ['Draft', 'In Review', 'Approved', 'Rejected', 'Closed'],
      datasets: [{
        label: 'Proposals by Status',
        data: [8, 12, 15, 3, 7],
        backgroundColor: defaultColors,
        borderColor: borderColors,
        borderWidth: 1,
      }]
    },
    timeline: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      datasets: [
        {
          label: 'Submitted',
          data: [3, 5, 8, 12, 15, 18],
          borderColor: 'rgba(99, 102, 241, 1)',
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          tension: 0.4,
          fill: true,
        },
        {
          label: 'Approved',
          data: [1, 3, 5, 8, 12, 15],
          borderColor: 'rgba(34, 197, 94, 1)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          tension: 0.4,
          fill: true,
        }
      ]
    }
  })

  useEffect(() => {
    if (data) {
      setChartData(data)
    }
  }, [data])

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: false,
      },
    },
    onClick: (event: any, elements: any[]) => {
      if (elements.length > 0) {
        const element = elements[0]
        const chartId = `${element.index}-${element.datasetIndex}`
        setSelectedChart(chartId)
      }
    },
  }

  const pieOptions = {
    ...chartOptions,
    plugins: {
      ...chartOptions.plugins,
      legend: {
        position: 'right' as const,
      },
    },
  }

  const ChartModal = ({ chartType, chartData }: { chartType: string; chartData: any }) => {
    if (!selectedChart) return null

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <Card className="max-w-4xl w-full max-h-[90vh] overflow-auto">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                {chartType === 'pipeline' && <BarChart3 className="h-5 w-5" />}
                {chartType === 'status' && <PieChart className="h-5 w-5" />}
                {chartType === 'timeline' && <Activity className="h-5 w-5" />}
                <span>{chartType.charAt(0).toUpperCase() + chartType.slice(1)} Analysis</span>
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedChart(null)}
              >
                ×
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-96">
              {chartType === 'pipeline' && <Bar data={chartData} options={chartOptions} />}
              {chartType === 'status' && <Pie data={chartData} options={pieOptions} />}
              {chartType === 'timeline' && <Line data={chartData} options={chartOptions} />}
            </div>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">45</div>
                <div className="text-sm text-muted-foreground">Total Proposals</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">33%</div>
                <div className="text-sm text-muted-foreground">Approval Rate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">5.2</div>
                <div className="text-sm text-muted-foreground">Avg. Days to Approval</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <>
      <div className={cn("grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6", className)}>
        {/* Pipeline Chart */}
        <Card className="lg:col-span-2 xl:col-span-1 cursor-pointer hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Proposal Pipeline</CardTitle>
            <Badge variant="secondary" className="text-xs">
              <TrendingUp className="h-3 w-3 mr-1" />
              +12%
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="h-64" onClick={() => setSelectedChart('pipeline')}>
              <Bar data={chartData.pipeline} options={chartOptions} />
            </div>
          </CardContent>
        </Card>

        {/* Status Chart */}
        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status Distribution</CardTitle>
            <Badge variant="outline" className="text-xs">
              Live
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="h-64" onClick={() => setSelectedChart('status')}>
              <Pie data={chartData.status} options={pieOptions} />
            </div>
          </CardContent>
        </Card>

        {/* Timeline Chart */}
        <Card className="lg:col-span-2 cursor-pointer hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Trend</CardTitle>
            <Badge variant="secondary" className="text-xs">
              6 Months
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="h-64" onClick={() => setSelectedChart('timeline')}>
              <Line data={chartData.timeline} options={chartOptions} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart Modals */}
      {selectedChart === 'pipeline' && (
        <ChartModal chartType="pipeline" chartData={chartData.pipeline} />
      )}
      {selectedChart === 'status' && (
        <ChartModal chartType="status" chartData={chartData.status} />
      )}
      {selectedChart === 'timeline' && (
        <ChartModal chartType="timeline" chartData={chartData.timeline} />
      )}
    </>
  )
}
