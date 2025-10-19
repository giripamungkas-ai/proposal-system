'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TrendingUp, TrendingDown, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DashboardCardProps {
  title: string
  value: string | number
  change?: {
    value: number
    type: 'increase' | 'decrease'
    period: string
  }
  badge?: {
    text: string
    variant: 'default' | 'secondary' | 'destructive' | 'outline'
  }
  icon?: React.ReactNode
  onClick?: () => void
  className?: string
  description?: string
}

export default function DashboardCard({
  title,
  value,
  change,
  badge,
  icon,
  onClick,
  className,
  description
}: DashboardCardProps) {
  const isClickable = !!onClick

  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all duration-200 hover:shadow-lg",
        isClickable && "cursor-pointer hover:scale-[1.02] active:scale-[0.98]",
        className
      )}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="flex items-center space-x-2">
          {badge && (
            <Badge variant={badge.variant} className="text-xs">
              {badge.text}
            </Badge>
          )}
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold">{value}</div>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">
                {description}
              </p>
            )}
            {change && (
              <div className="flex items-center mt-2 text-xs">
                {change.type === 'increase' ? (
                  <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-600 mr-1" />
                )}
                <span
                  className={cn(
                    "font-medium",
                    change.type === 'increase' ? "text-green-600" : "text-red-600"
                  )}
                >
                  {change.value > 0 ? '+' : ''}{change.value}%
                </span>
                <span className="text-muted-foreground ml-1">
                  {change.period}
                </span>
              </div>
            )}
          </div>
          {isClickable && (
            <Button
              variant="ghost"
              size="sm"
              className="ml-2 opacity-60 hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation()
                onClick?.()
              }}
            >
              <Eye className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
