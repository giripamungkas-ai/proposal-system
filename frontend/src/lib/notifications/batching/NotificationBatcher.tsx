/**
 * Smart Notification Batching System for MDMEDIA Strategic Proposal Management System
 *
 * This system implements intelligent batching of notifications to reduce user distraction
 * while maintaining timely delivery of important information.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useToast } from '@/components/notifications/ToastProvider'
import { useWebSocket } from '@/hooks/useWebSocket'

// Types
export interface NotificationItem {
  id: string
  type: 'info' | 'success' | 'warning' | 'error' | 'system'
  title: string
  message: string
  timestamp: Date
  priority: 'low' | 'medium' | 'high' | 'critical'
  category: 'proposal' | 'project' | 'user' | 'system' | 'deadline' | 'compliance'
  metadata?: Record<string, any>
  read: boolean
  delivered: boolean
  expiresAt?: Date
  batchId?: string
  retryCount?: number
}

export interface BatchConfig {
  maxBatchSize: number
  maxWaitTime: number // milliseconds
  priorityThreshold: 'high' | 'critical' // Priority level that bypasses batching
  categories: string[] // Categories that should be batched
  quietHours: {
    start: string // HH:mm
    end: string // HH:mm
  }
  weekendMode: boolean
}

export interface BatchSummary {
  id: string
  batchId: string
  createdAt: Date
  deliveredAt?: Date
  notifications: NotificationItem[]
  totalItems: number
  categories: Record<string, number>
  priorities: Record<string, number>
  metadata: {
    deliveryMethod: 'immediate' | 'batched' | 'email' | 'sms'
    quietMode: boolean
    suppressed: number
  }
}

export interface NotificationBatcherConfig {
  projectId?: string
  userId?: string
  config?: Partial<BatchConfig>
  onBatchDelivered?: (batch: BatchSummary) => void
  onNotificationDelivered?: (notification: NotificationItem) => void
  onNotificationSuppressed?: (notification: NotificationItem) => void
}

const defaultConfig: BatchConfig = {
  maxBatchSize: 10,
  maxWaitTime: 30000, // 30 seconds
  priorityThreshold: 'high',
  categories: ['system', 'compliance', 'deadline'],
  quietHours: {
    start: '22:00',
    end: '07:00'
  },
  weekendMode: true
}

export class NotificationBatcher {
  private config: BatchConfig
  private pendingNotifications: Map<string, NotificationItem[]> = new Map()
  private batchTimers: Map<string, NodeJS.Timeout> = new Map()
  private batchIdCounter: number = 0
  private isProcessing: boolean = false
  private deliveryQueue: NotificationItem[] = []
  private lastBatchTime: Date = new Date()
  private subscribers: Map<string, (batch: BatchSummary) => void> = new Map()

  constructor(private options: NotificationBatcherConfig = {}) {
    this.config = { ...defaultConfig, ...options.config }

    // Start processing loop
    this.startProcessingLoop()

    // Clean up expired notifications
    this.startCleanupLoop()
  }

  /**
   * Add notification to batching system
   */
  addNotification(notification: Omit<NotificationItem, 'id' | 'timestamp' | 'batchId'>): string {
    const id = this.generateNotificationId()
    const fullNotification: NotificationItem = {
      ...notification,
      id,
      timestamp: new Date(),
      read: false,
      delivered: false,
      retryCount: 0
    }

    // Check if notification should be suppressed
    if (this.shouldSuppressNotification(fullNotification)) {
      this.options.onNotificationSuppressed?.(fullNotification)
      return id
    }

    // Check if notification should be delivered immediately
    if (this.shouldDeliverImmediately(fullNotification)) {
      this.deliverNotification(fullNotification)
      return id
    }

    // Add to appropriate batch
    this.addToBatch(fullNotification)

    return id
  }

  /**
   * Get pending notifications count
   */
  getPendingCount(): number {
    return Array.from(this.pendingNotifications.values())
      .reduce((total, batch) => total + batch.length, 0)
  }

  /**
   * Get all pending notifications
   */
  getPendingNotifications(): NotificationItem[] {
    return Array.from(this.pendingNotifications.values())
      .flat()
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }

  /**
   * Force deliver all pending notifications
   */
  async forceDeliverAll(): Promise<void> {
    const allNotifications = this.getPendingNotifications()

    // Clear pending notifications
    this.pendingNotifications.clear()
    this.batchTimers.forEach(timer => clearTimeout(timer))
    this.batchTimers.clear()

    // Deliver all notifications
    for (const notification of allNotifications) {
      await this.deliverNotification(notification)
    }
  }

  /**
   * Subscribe to batch delivery events
   */
  subscribe(callback: (batch: BatchSummary) => void): string {
    const subscriptionId = this.generateSubscriptionId()
    this.subscribers.set(subscriptionId, callback)
    return subscriptionId
  }

  /**
   * Unsubscribe from batch delivery events
   */
  unsubscribe(subscriptionId: string): void {
    this.subscribers.delete(subscriptionId)
  }

  /**
   * Check if notification should be suppressed
   */
  private shouldSuppressNotification(notification: NotificationItem): boolean {
    // Check quiet hours
    if (this.isQuietHours()) {
      // Only allow critical notifications during quiet hours
      return notification.priority !== 'critical'
    }

    // Check weekend mode
    if (this.config.weekendMode && this.isWeekend()) {
      // Only allow critical notifications during weekends
      return notification.priority !== 'critical'
    }

    // Check if notification is expired
    if (notification.expiresAt && notification.expiresAt < new Date()) {
      return true
    }

    return false
  }

  /**
   * Check if notification should be delivered immediately
   */
  private shouldDeliverImmediately(notification: NotificationItem): boolean {
    // High priority notifications bypass batching
    if (notification.priority === 'critical' ||
        (this.config.priorityThreshold === 'high' && notification.priority === 'high')) {
      return true
    }

    // Deadline notifications bypass batching
    if (notification.category === 'deadline') {
      return true
    }

    // System critical notifications bypass batching
    if (notification.type === 'error' && notification.category === 'system') {
      return true
    }

    return false
  }

  /**
   * Add notification to appropriate batch
   */
  private addToBatch(notification: NotificationItem): void {
    const batchKey = this.getBatchKey(notification)

    if (!this.pendingNotifications.has(batchKey)) {
      this.pendingNotifications.set(batchKey, [])
    }

    this.pendingNotifications.get(batchKey)!.push(notification)

    // Schedule batch delivery
    this.scheduleBatchDelivery(batchKey)
  }

  /**
   * Get batch key for notification
   */
  private getBatchKey(notification: NotificationItem): string {
    // Create batch key based on category and priority
    const category = notification.category || 'general'
    const priority = notification.priority || 'medium'

    // High priority notifications get their own batch
    if (priority === 'critical' || priority === 'high') {
      return `${category}_${priority}_${notification.type}`
    }

    // Batch by category
    return category
  }

  /**
   * Schedule batch delivery
   */
  private scheduleBatchDelivery(batchKey: string): void {
    // Clear existing timer for this batch
    if (this.batchTimers.has(batchKey)) {
      clearTimeout(this.batchTimers.get(batchKey))
    }

    // Schedule new timer
    const timer = setTimeout(() => {
      this.deliverBatch(batchKey)
    }, this.config.maxWaitTime)

    this.batchTimers.set(batchKey, timer)
  }

  /**
   * Deliver batch of notifications
   */
  private async deliverBatch(batchKey: string): Promise<void> {
    const notifications = this.pendingNotifications.get(batchKey) || []

    if (notifications.length === 0) {
      return
    }

    // Check if batch size threshold is met
    if (notifications.length < this.config.maxBatchSize) {
      // Check if enough time has passed since last batch
      const timeSinceLastBatch = Date.now() - this.lastBatchTime.getTime()
      if (timeSinceLastBatch < this.config.maxWaitTime) {
        // Reschedule for later
        this.scheduleBatchDelivery(batchKey)
        return
      }
    }

    // Create batch summary
    const batchId = this.generateBatchId()
    const batchSummary: BatchSummary = {
      id: this.generateId(),
      batchId,
      createdAt: new Date(),
      notifications,
      totalItems: notifications.length,
      categories: this.getCategoryCount(notifications),
      priorities: this.getPriorityCount(notifications),
      metadata: {
        deliveryMethod: 'batched',
        quietMode: this.isQuietHours(),
        suppressed: 0
      }
    }

    // Remove from pending
    this.pendingNotifications.delete(batchKey)
    this.batchTimers.delete(batchKey)
    this.lastBatchTime = new Date()

    // Deliver notifications
    await this.deliverBatch(batchSummary)
  }

  /**
   * Deliver batch summary
   */
  private async deliverBatch(batchSummary: BatchSummary): Promise<void> {
    try {
      // Mark notifications as delivered
      batchSummary.notifications.forEach(notification => {
        notification.delivered = true
        notification.batchId = batchSummary.batchId
      })

      // Notify subscribers
      this.subscribers.forEach(callback => {
        try {
          callback(batchSummary)
        } catch (error) {
          console.error('Error in batch subscriber callback:', error)
        }
      })

      // Call custom callback
      this.options.onBatchDelivered?.(batchSummary)

      // Update delivery queue
      this.deliveryQueue.push(...batchSummary.notifications)

      // Process delivery queue
      this.processDeliveryQueue()

    } catch (error) {
      console.error('Error delivering batch:', error)

      // Retry failed notifications
      const failedNotifications = batchSummary.notifications.filter(n => !n.delivered)
      for (const notification of failedNotifications) {
        notification.retryCount = (notification.retryCount || 0) + 1

        if (notification.retryCount < 3) {
          // Retry after delay
          setTimeout(() => {
            this.deliverNotification(notification)
          }, 1000 * notification.retryCount)
        }
      }
    }
  }

  /**
   * Deliver individual notification
   */
  private async deliverNotification(notification: NotificationItem): Promise<void> {
    try {
      // Mark as delivered
      notification.delivered = true

      // Call custom callback
      this.options.onNotificationDelivered?.(notification)

      // Add to delivery queue
      this.deliveryQueue.push(notification)

      // Process delivery queue
      this.processDeliveryQueue()

    } catch (error) {
      console.error('Error delivering notification:', error)

      // Retry logic
      notification.retryCount = (notification.retryCount || 0) + 1

      if (notification.retryCount < 3) {
        setTimeout(() => {
          this.deliverNotification(notification)
        }, 1000 * notification.retryCount)
      }
    }
  }

  /**
   * Process delivery queue
   */
  private processDeliveryQueue(): void {
    if (this.isProcessing) {
      return
    }

    this.isProcessing = true

    // Process queue in chunks to avoid blocking
    const processChunk = () => {
      const chunk = this.deliveryQueue.splice(0, 5)

      if (chunk.length > 0) {
        chunk.forEach(notification => {
          // Here you would integrate with actual notification systems
          // For now, we'll use the toast system
          this.showToast(notification)
        })

        // Process next chunk
        setTimeout(processChunk, 100)
      } else {
        this.isProcessing = false
      }
    }

    processChunk()
  }

  /**
   * Show toast notification
   */
  private showToast(notification: NotificationItem): void {
    const toast = useToast.getState()

    switch (notification.type) {
      case 'success':
        toast.success(notification.title, notification.message)
        break
      case 'error':
        toast.error(notification.title, notification.message)
        break
      case 'warning':
        toast.warning(notification.title, notification.message)
        break
      case 'info':
      default:
        toast.info(notification.title, notification.message)
        break
    }
  }

  /**
   * Start processing loop
   */
  private startProcessingLoop(): void {
    setInterval(() => {
      // Check for batches that need delivery
      for (const [batchKey, notifications] of this.pendingNotifications.entries()) {
        if (notifications.length >= this.config.maxBatchSize) {
          this.deliverBatch(batchKey)
        }
      }
    }, 5000) // Check every 5 seconds
  }

  /**
   * Start cleanup loop
   */
  private startCleanupLoop(): void {
    setInterval(() => {
      this.cleanupExpiredNotifications()
    }, 60000) // Clean up every minute
  }

  /**
   * Clean up expired notifications
   */
  private cleanupExpiredNotifications(): void {
    const now = new Date()

    for (const [batchKey, notifications] of this.pendingNotifications.entries()) {
      const validNotifications = notifications.filter(n =>
        !n.expiresAt || n.expiresAt > now
      )

      if (validNotifications.length !== notifications.length) {
        if (validNotifications.length === 0) {
          this.pendingNotifications.delete(batchKey)
        } else {
          this.pendingNotifications.set(batchKey, validNotifications)
        }
      }
    }
  }

  /**
   * Check if current time is in quiet hours
   */
  private isQuietHours(): boolean {
    const now = new Date()
    const currentTime = now.getHours() * 60 + now.getMinutes()

    const [startHour, startMin] = this.config.quietHours.start.split(':').map(Number)
    const [endHour, endMin] = this.config.quietHours.end.split(':').map(Number)

    const startTime = startHour * 60 + startMin
    const endTime = endHour * 60 + endMin

    return currentTime >= startTime || currentTime <= endTime
  }

  /**
   * Check if current time is weekend
   */
  private isWeekend(): boolean {
    const now = new Date()
    return now.getDay() === 0 || now.getDay() === 6
  }

  /**
   * Get category count from notifications
   */
  private getCategoryCount(notifications: NotificationItem[]): Record<string, number> {
    return notifications.reduce((acc, notification) => {
      const category = notification.category || 'general'
      acc[category] = (acc[category] || 0) + 1
      return acc
    }, {})
  }

  /**
   * Get priority count from notifications
   */
  private getPriorityCount(notifications: NotificationItem[]): Record<string, number> {
    return notifications.reduce((acc, notification) => {
      const priority = notification.priority || 'medium'
      acc[priority] = (acc[priority] || 0) + 1
      return acc
    }, {})
  }

  /**
   * Generate notification ID
   */
  private generateNotificationId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Generate batch ID
   */
  private generateBatchId(): string {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Generate subscription ID
   */
  private generateSubscriptionId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Generate ID
   */
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Get batch statistics
   */
  getBatchStatistics(): {
    const pendingCount = this.getPendingCount()
    const queueLength = this.deliveryQueue.length
    const totalBatches = this.pendingNotifications.size
    const totalSubscribers = this.subscribers.size

    return {
      pendingNotifications: pendingCount,
      deliveryQueue: queueLength,
      activeBatches: totalBatches,
      subscribers: totalSubscribers,
      isProcessing: this.isProcessing,
      lastBatchTime: this.lastBatchTime,
      config: this.config
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<BatchConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  /**
   * Get current configuration
   */
  getConfig(): BatchConfig {
    return { ...this.config }
  }
}

// Export singleton instance
export const notificationBatcher = new NotificationBatcher()

// Export types for external use
export type { NotificationItem, BatchSummary, NotificationBatcherConfig }
```

---

## 🔥 **STEP 5: Create API Endpoint for Smart Batching**

### **Create Smart Batching API**
