'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Bell,
  BellRing,
  Check,
  CheckCheck,
  Mail,
  Calendar,
  User,
  FileText,
  AlertTriangle,
  TrendingUp,
  Archive,
  RefreshCw
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDateTime } from '@/lib/utils'

interface Notification {
  id: number
  title: string
  message: string
  type: string
  read: boolean
  sentAt: string
  payload: any
}

interface NotificationCenterProps {
  userId?: number
  className?: string
}

const NOTIFICATION_ICONS = {
  PROPOSAL_APPROVED: CheckCheck,
  RFP_SUBMITTED: FileText,
  PROPOSAL_REJECTED: AlertTriangle,
  PROJECT_STATUS_CHANGED: TrendingUp,
  DEADLINE_APPROACHING: Calendar,
  FILE_UPLOADED: Mail,
  WEEKLY_SUMMARY: BellRing
}

const NOTIFICATION_COLORS = {
  PROPOSAL_APPROVED: 'text-green-600 bg-green-50',
  RFP_SUBMITTED: 'text-blue-600 bg-blue-50',
  PROPOSAL_REJECTED: 'text-red-600 bg-red-50',
  PROJECT_STATUS_CHANGED: 'text-purple-600 bg-purple-50',
  DEADLINE_APPROACHING: 'text-orange-600 bg-orange-50',
  FILE_UPLOADED: 'text-gray-600 bg-gray-50',
  WEEKLY_SUMMARY: 'text-indigo-600 bg-indigo-50'
}

export default function NotificationCenter({ userId, className }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    fetchNotifications()
    // Set up real-time updates (polling every 30 seconds)
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchNotifications = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/notifications')
      const result = await response.json()

      if (result.status === 'success') {
        setNotifications(result.data.notifications)
        setUnreadCount(result.data.notifications.filter((n: Notification) => !n.read).length)
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notificationIds: number[]) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds })
      })

      if (response.ok) {
        setNotifications(prev =>
          prev.map(n =>
            notificationIds.includes(n.id) ? { ...n, read: true } : n
          )
        )
        setUnreadCount(prev => Math.max(0, prev - notificationIds.length))
      }
    } catch (error) {
      console.error('Failed to mark as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true })
      })

      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
        setUnreadCount(0)
      }
    } catch (error) {
      console.error('Failed to mark all as read:', error)
    }
  }

  const createSampleNotifications = async () => {
    // Create sample notifications for testing
    const samples = [
      {
        type: 'PROPOSAL_APPROVED',
        data: {
          projectName: 'SMS Campaign 2025',
          approverName: 'BS Manager'
        },
        sendEmail: true
      },
      {
        type: 'RFP_SUBMITTED',
        data: {
          projectName: 'Digital Advertising Q2',
          submittedByName: 'Sales Representative'
        },
        sendEmail: false
      }
    ]

    for (const sample of samples) {
      try {
        await fetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sample)
        })
      } catch (error) {
        console.error('Failed to create sample notification:', error)
      }
    }

    // Refresh notifications
    fetchNotifications()
  }

  const filteredNotifications = notifications.filter(notification => {
    switch (activeTab) {
      case 'unread':
        return !notification.read
      case 'read':
        return notification.read
      default:
        return true
    }
  })

  const getNotificationIcon = (type: string) => {
    const IconComponent = NOTIFICATION_ICONS[type as keyof typeof NOTIFICATION_ICONS] || Bell
    return IconComponent
  }

  const getNotificationColor = (type: string) => {
    return NOTIFICATION_COLORS[type as keyof typeof NOTIFICATION_COLORS] || 'text-gray-600 bg-gray-50'
  }

  return (
    <div className={cn("relative", className)}>
      {/* Notification Bell */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
      >
        {unreadCount > 0 ? (
          <BellRing className="h-4 w-4" />
        ) : (
          <Bell className="h-4 w-4" />
        )}
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      {/* Notification Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-white border rounded-lg shadow-lg z-50 max-h-[80vh] overflow-hidden">
          <Card className="border-0 shadow-none">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Notifications</CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={createSampleNotifications}
                    title="Create sample notifications"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  {unreadCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={markAllAsRead}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="all" className="text-xs">
                    All ({notifications.length})
                  </TabsTrigger>
                  <TabsTrigger value="unread" className="text-xs">
                    Unread ({unreadCount})
                  </TabsTrigger>
                  <TabsTrigger value="read" className="text-xs">
                    Read ({notifications.length - unreadCount})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="mt-0">
                  <NotificationList
                    notifications={filteredNotifications}
                    onMarkAsRead={markAsRead}
                    onRefresh={fetchNotifications}
                    loading={loading}
                  />
                </TabsContent>
                <TabsContent value="unread" className="mt-0">
                  <NotificationList
                    notifications={filteredNotifications}
                    onMarkAsRead={markAsRead}
                    onRefresh={fetchNotifications}
                    loading={loading}
                  />
                </TabsContent>
                <TabsContent value="read" className="mt-0">
                  <NotificationList
                    notifications={filteredNotifications}
                    onMarkAsRead={markAsRead}
                    onRefresh={fetchNotifications}
                    loading={loading}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

interface NotificationListProps {
  notifications: Notification[]
  onMarkAsRead: (ids: number[]) => void
  onRefresh: () => void
  loading: boolean
}

function NotificationList({ notifications, onMarkAsRead, onRefresh, loading }: NotificationListProps) {
  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      onMarkAsRead([notification.id])
    }
  }

  if (loading) {
    return (
      <div className="p-4 space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 bg-muted animate-pulse rounded" />
        ))}
      </div>
    )
  }

  if (notifications.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No notifications</p>
      </div>
    )
  }

  return (
    <ScrollArea className="h-96">
      <div className="p-2">
        {notifications.map(notification => {
          const IconComponent = getNotificationIcon(notification.type)
          const colorClass = getNotificationColor(notification.type)

          return (
            <div
              key={notification.id}
              className={cn(
                "p-3 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50 mb-2",
                !notification.read && "bg-blue-50/30 border-blue-200"
              )}
              onClick={() => handleNotificationClick(notification)}
            >
              <div className="flex items-start gap-3">
                <div className={cn("p-2 rounded-full", colorClass)}>
                  <IconComponent className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-medium text-sm truncate">
                      {notification.title}
                    </h4>
                    {!notification.read && (
                      <div className="h-2 w-2 bg-blue-600 rounded-full" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    {notification.payload?.originalMessage || notification.message}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(notification.sentAt)}
                    </span>
                    {notification.payload?.channels?.includes('email') && (
                      <Mail className="h-3 w-3 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </ScrollArea>
  )
}
