'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import NotificationCenter from '@/components/notifications/NotificationCenter'
import { useToast } from '@/components/notifications/ToastProvider'
import {
  Bell,
  BellRing,
  Settings,
  LogOut,
  User,
  Search,
  Menu,
  X
} from 'lucide-react'
import { signOut, useSession } from 'next-auth/react'
import { cn } from '@/lib/utils'

interface HeaderProps {
  user: {
    name?: string | null
    email?: string | null
    role?: string
  }
  onSidebarToggle?: () => void
  sidebarOpen?: boolean
}

export default function Header({ user, onSidebarToggle, sidebarOpen }: HeaderProps) {
  const { data: session } = useSession()
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const toast = useToast()

  const handleSignOut = () => {
    signOut({ callbackUrl: '/login' })
    toast.info('Signing out...', 'You will be redirected to login page')
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      // Implement search functionality
      toast.info('Search', `Searching for: ${searchQuery}`)
      setShowSearch(false)
      setSearchQuery('')
    }
  }

  // Trigger sample notifications for demo
  const triggerSampleNotifications = async () => {
    try {
      const response = await fetch('/api/notifications/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: 'SAMPLE_ALL',
          sendEmail: false
        })
      })

      if (response.ok) {
        toast.success('Notifications Triggered', 'Sample notifications have been created')
      }
    } catch (error) {
      toast.error('Failed', 'Could not trigger notifications')
    }
  }

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        {/* Left side */}
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onSidebarToggle}
            className="lg:hidden"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>

          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-semibold text-gray-900">MDMEDIA</h1>
            <Badge variant="secondary" className="text-xs">
              Proposal System
            </Badge>
          </div>
        </div>

        {/* Center - Search */}
        <div className="hidden md:flex flex-1 max-w-lg mx-8">
          {showSearch ? (
            <form onSubmit={handleSearch} className="relative w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onBlur={() => setTimeout(() => setShowSearch(false), 200)}
                placeholder="Search projects, proposals, files..."
                className="w-full px-4 py-2 pl-10 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                autoFocus
              />
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowSearch(false)}
                className="absolute right-1 top-1"
              >
                <X className="h-4 w-4" />
              </Button>
            </form>
          ) : (
            <Button
              variant="outline"
              onClick={() => setShowSearch(true)}
              className="w-full justify-start text-muted-foreground"
            >
              <Search className="h-4 w-4 mr-2" />
              Search projects, proposals, files...
            </Button>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-3">
          {/* Demo button - only visible in development */}
          {process.env.NODE_ENV === 'development' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={triggerSampleNotifications}
              className="text-xs"
            >
              Trigger Demo
            </Button>
          )}

          {/* Notifications */}
          <NotificationCenter userId={user?.role ? parseInt(session?.user?.id || '0') : undefined} />

          {/* User menu */}
          <div className="flex items-center space-x-2">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-medium text-gray-900">{user?.name}</span>
              <span className="text-xs text-gray-500">{user?.role?.replace('_', ' ')}</span>
            </div>
            <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center">
              <User className="h-4 w-4 text-white" />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-1">
            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="text-red-600 hover:text-red-700"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile search */}
      {showSearch && (
        <div className="md:hidden mt-3">
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects, proposals, files..."
              className="w-full px-4 py-2 pl-10 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              autoFocus
            />
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowSearch(false)}
              className="absolute right-1 top-1"
            >
              <X className="h-4 w-4" />
            </Button>
          </form>
        </div>
      )}
    </header>
  )
}
