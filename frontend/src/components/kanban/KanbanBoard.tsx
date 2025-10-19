'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Plus,
  MoreHorizontal,
  Clock,
  CheckCircle,
  AlertCircle,
  Users,
  Calendar,
  Filter,
  Search,
  Download,
  Eye,
  Edit,
  Trash2,
  Archive,
  MessageSquare
} from 'lucide-react'
import { useToast } from '@/components/notifications/ToastProvider'
import { useWebSocket } from '@/hooks/useWebSocket'
import { fileSystemManager } from '@/lib/file-system'
import { getServerSession } from 'next-auth/react'

// Type definitions
export interface KanbanCard {
  id: string
  title: string
  description: string
  status: 'backlog' | 'todo' | 'in_progress' | 'review' | 'done' | 'archived'
  priority: 'low' | 'medium' | 'high' | 'critical'
  assignedTo?: {
    id: string
    name: string
    email: string
    avatar: string
  }
  projectId: string
  projectCode: string
  dueDate?: string
  progress: number
  tags: string[]
  attachments: number
  comments: number
  createdAt: string
  updatedAt: string
  createdBy: string
  metadata?: Record<string, any>
}

export interface KanbanColumn {
  id: string
  title: string
  status: string
  cards: KanbanCard[]
  color: string
  borderColor: string
  bgColor: string
  textColor: string
}

interface KanbanBoardProps {
  projectId?: string
  projectCode?: string
  viewMode?: 'board' | 'list' | 'calendar'
  filters?: {
    status?: string[]
    priority?: string[]
    assignedTo?: string[]
    tags?: string[]
    dateRange?: {
      start: string
      end: string
    }
  }
  onCardUpdate?: (card: KanbanCard) => void
  onCardMove?: (card: KanbanCard, fromStatus: string, toStatus: string) => void
  onCardDelete?: (cardId: string) => void
}

const defaultColumns: KanbanColumn[] = [
  {
    id: 'backlog',
    title: 'Backlog',
    status: 'backlog',
    cards: [],
    color: 'bg-gray-100',
    borderColor: 'border-gray-200',
    bgColor: 'bg-gray-50',
    textColor: 'text-gray-700'
  },
  {
    id: 'todo',
    title: 'To Do',
    status: 'todo',
    cards: [],
    color: 'bg-blue-100',
    borderColor: 'border-blue-200',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700'
  },
  {
    id: 'in_progress',
    title: 'In Progress',
    status: 'in_progress',
    cards: [],
    color: 'bg-yellow-100',
    borderColor: 'border-yellow-200',
    bgColor: 'bg-yellow-50',
    textColor: 'text-yellow-700'
  },
  {
    id: 'review',
    title: 'Review',
    status: 'review',
    cards: [],
    color: 'bg-purple-100',
    borderColor: 'border-purple-200',
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-700'
  },
  {
    id: 'done',
    title: 'Done',
    status: 'done',
    cards: [],
    color: 'bg-green-100',
    borderColor: 'border-green-200',
    bgColor: 'bg-green-50',
    textColor: 'text-green-700'
  },
  {
    id: 'archived',
    title: 'Archived',
    status: 'archived',
    cards: [],
    color: 'bg-gray-100',
    borderColor: 'border-gray-200',
    bgColor: 'bg-gray-50',
    textColor: 'text-gray-500'
  }
]

const priorityColors = {
  low: 'border-gray-300 bg-gray-100',
  medium: 'border-yellow-300 bg-yellow-100',
  high: 'border-orange-300 bg-orange-100',
  critical: 'border-red-300 bg-red-100'
}

const statusIcons = {
  backlog: <Clock className="h-4 w-4 text-gray-500" />,
  todo: <AlertCircle className="h-4 w-4 text-blue-500" />,
  in_progress: <Users className="h-4 w-4 text-yellow-500" />,
  review: <Eye className="h-4 w-4 text-purple-500" />,
  done: <CheckCircle className="h-4 w-4 text-green-500" />,
  archived: <Archive className="h-4 w-4 text-gray-400" />
}

export default function KanbanBoard({
  projectId,
  projectCode = 'PROJECT_DEFAULT',
  viewMode = 'board',
  filters = {},
  onCardUpdate,
  onCardMove,
  onCardDelete
}: KanbanBoardProps) {
  const [columns, setColumns] = useState<KanbanColumn[]>(defaultColumns)
  const [cards, setCards] = useState<KanbanCard[]>([])
  const [draggedCard, setDraggedCard] = useState<KanbanCard | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<string[]>([])
  const [filterPriority, setFilterPriority] = useState<string[]>([])
  const [selectedCard, setSelectedCard] = useState<KanbanCard | null>(null)
  const [showCardDetails, setShowCardDetails] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const toast = useToast()
  const { sendMessage, lastMessage, isConnected } = useWebSocket({
    url: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001/ws',
    projectId,
    channel: 'kanban'
  })

  // Initialize sample data
  useEffect(() => {
    const sampleCards: KanbanCard[] = [
      {
        id: '1',
        title: 'Create BS Proposal Template',
        description: 'Design and implement standardized proposal templates for different client types',
        status: 'todo',
        priority: 'high',
        assignedTo: {
          id: 'bs1',
          name: 'John Doe',
          email: 'john.doe@mdmedia.id',
          avatar: '/avatars/john.jpg'
        },
        projectId: projectId || '1',
        projectCode,
        dueDate: '2025-01-25',
        progress: 0,
        tags: ['template', 'bs', 'proposal'],
        attachments: 2,
        comments: 3,
        createdAt: '2025-01-17T10:00:00Z',
        updatedAt: '2025-01-17T10:00:00Z',
        createdBy: 'BS Manager'
      },
      {
        id: '2',
        title: 'Review Technical Specifications',
        description: 'Review and approve technical specifications provided by PO team',
        status: 'in_progress',
        priority: 'medium',
        assignedTo: {
          id: 'bs2',
          name: 'Jane Smith',
          email: 'jane.smith@mdmedia.id',
          avatar: '/avatars/jane.jpg'
        },
        projectId: projectId || '1',
        projectCode,
        dueDate: '2025-01-22',
        progress: 60,
        tags: ['technical', 'review', 'po'],
        attachments: 5,
        comments: 8,
        createdAt: '2025-01-16T14:30:00Z',
        updatedAt: '2025-01-17T09:15:00Z',
        createdBy: 'BS Manager'
      },
      {
        id: '3',
        title: 'Client Presentation Preparation',
        description: 'Prepare client presentation slides with executive summary and technical overview',
        status: 'review',
        priority: 'high',
        assignedTo: {
          id: 'bs3',
          name: 'Mike Johnson',
          email: 'mike.johnson@mdmedia.id',
          avatar: '/avatars/mike.jpg'
        },
        projectId: projectId || '1',
        projectCode,
        dueDate: '2025-01-20',
        progress: 85,
        tags: ['presentation', 'client', 'executive'],
        attachments: 3,
        comments: 5,
        createdAt: '2025-01-15T11:20:00Z',
        updatedAt: '2025-01-17T16:45:00Z',
        createdBy: 'BS Manager'
      },
      {
        id: '4',
        title: 'Contract Documentation',
        description: 'Prepare and review contract documentation for client signature',
        status: 'done',
        priority: 'critical',
        assignedTo: {
          id: 'bs4',
          name: 'Sarah Wilson',
          email: 'sarah.wilson@mdmedia.id',
          avatar: '/avatars/sarah.jpg'
        },
        projectId: projectId || '1',
        projectCode,
        dueDate: '2025-01-18',
        progress: 100,
        tags: ['contract', 'legal', 'documentation'],
        attachments: 8,
        comments: 12,
        createdAt: '2025-01-14T09:00:00Z',
        updatedAt: '2025-01-18T15:30:00Z',
        createdBy: 'BS Manager'
      }
    ]

    setCards(sampleCards)

    // Distribute cards to columns
    const updatedColumns = defaultColumns.map(column => ({
      ...column,
      cards: sampleCards.filter(card => card.status === column.status)
    }))

    setColumns(updatedColumns)
  }, [projectId, projectCode])

  // WebSocket real-time updates
  useEffect(() => {
    if (lastMessage && isConnected) {
      const message = JSON.parse(lastMessage)

      switch (message.type) {
        case 'card_created':
          handleCardAdded(message.data)
          break
        case 'card_updated':
          handleCardUpdated(message.data)
          break
        case 'card_moved':
          handleCardMoved(message.data)
          break
        case 'card_deleted':
          handleCardDeleted(message.data)
          break
      }
    }
  }, [lastMessage, isConnected])

  const handleCardAdded = (newCard: KanbanCard) => {
    setCards(prev => [...prev, newCard])
    setColumns(prev => prev.map(column =>
      column.status === newCard.status
        ? { ...column, cards: [...column.cards, newCard] }
        : column
    ))

    toast.success('Card added successfully', {
      description: `"${newCard.title}" has been added to the board`
    })
  }

  const handleCardUpdated = (updatedCard: KanbanCard) => {
    setCards(prev => prev.map(card =>
      card.id === updatedCard.id ? updatedCard : card
    ))

    setColumns(prev => prev.map(column =>
      column.cards.map(card =>
        card.id === updatedCard.id ? updatedCard : card
      )
    ))

    toast.info('Card updated successfully', {
      description: `"${updatedCard.title}" has been updated`
    })

    if (onCardUpdate) {
      onCardUpdate(updatedCard)
    }
  }

  const handleCardMoved = (data: { card: KanbanCard; fromStatus: string; toStatus: string }) => {
    const { card, fromStatus, toStatus } = data

    setCards(prev => prev.map(c => c.id === card.id ? { ...c, status: toStatus } : c))

    setColumns(prev => {
      const newColumns = [...prev]
      const fromColumn = newColumns.find(col => col.status === fromStatus)
      const toColumn = newColumns.find(col => col.status === toStatus)

      if (fromColumn && toColumn) {
        fromColumn.cards = fromColumn.cards.filter(c => c.id !== card.id)
        toColumn.cards = [...toColumn.cards, { ...card, status: toStatus }]
      }

      return newColumns
    })

    toast.success('Card moved successfully', {
      description: `"${card.title}" moved from ${fromStatus} to ${toStatus}`
    })

    if (onCardMove) {
      onCardMove(card, fromStatus, toStatus)
    }
  }

  const handleCardDeleted = (deletedCard: KanbanCard) => {
    setCards(prev => prev.filter(card => card.id !== deletedCard.id))
    setColumns(prev => prev.map(column =>
      column.cards.filter(card => card.id !== deletedCard.id)
    ))

    toast.error('Card deleted successfully', {
      description: `"${deletedCard.title}" has been removed`
    })

    if (onCardDelete) {
      onCardDelete(deletedCard.id)
    }
  }

  const onDragEnd = useCallback((result: any) => {
    if (!result.destination) return

    const { source, destination } = result

    if (source.droppableId !== destination.droppableId) {
      const card = cards.find(c => c.id === result.draggableId)
      if (card) {
        handleCardMoved({
          card,
          fromStatus: source.droppableId,
          toStatus: destination.droppableId
        })
      }
    }
  }, [cards, handleCardMoved])

  const handleCardClick = (card: KanbanCard) => {
    setSelectedCard(card)
    setShowCardDetails(true)
  }

  const handleCardEdit = (card: KanbanCard) => {
    // Open edit modal or navigate to edit page
    toast.info('Edit card functionality', {
      description: `Editing "${card.title}"`
    })
  }

  const handleCardDelete = (card: KanbanCard) => {
    if (window.confirm(`Are you sure you want to delete "${card.title}"?`)) {
      handleCardDeleted(card)
    }
  }

  const handleAddCard = () => {
    // Open add card modal or navigate to add page
    toast.info('Add card functionality', {
      description: 'Opening add card dialog'
    })
  }

  const handleFilterChange = (type: 'status' | 'priority', value: string) => {
    if (type === 'status') {
      setFilterStatus(prev =>
        prev.includes(value)
          ? prev.filter(s => s !== value)
          : [...prev, value]
      )
    } else if (type === 'priority') {
      setFilterPriority(prev =>
        prev.includes(value)
          ? prev.filter(p => p !== value)
          : [...prev, value]
      )
    }
  }

  const filteredCards = cards.filter(card => {
    const matchesSearch = !searchQuery ||
      card.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.description.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = filterStatus.length === 0 || filterStatus.includes(card.status)
    const matchesPriority = filterPriority.length === 0 || filterPriority.includes(card.priority)

    return matchesSearch && matchesStatus && matchesPriority
  })

  // Update columns with filtered cards
  useEffect(() => {
    setColumns(prev => prev.map(column => ({
      ...column,
      cards: filteredCards.filter(card => card.status === column.status)
    })))
  }, [filteredCards])

  return (
    <div className="w-full h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold text-gray-900">
              BS Solution Board
            </h2>
            {projectId && (
              <Badge variant="outline" className="text-xs">
                {projectCode}
              </Badge>
            )}
            {isConnected ? (
              <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2" />
                Connected
              </Badge>
            ) : (
              <Badge variant="destructive" className="text-xs">
                <div className="w-2 h-2 bg-red-500 rounded-full mr-2" />
                Disconnected
              </Badge>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search cards..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
              />
            </div>

            {/* Filters */}
            <div className="flex items-center space-x-2">
              <select
                value={filterStatus.join(',') || ''}
                onChange={(e) => setFilterStatus(e.target.value.split(',').filter(Boolean))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Status</option>
                <option value="backlog">Backlog</option>
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="review">Review</option>
                <option value="done">Done</option>
                <option value="archived">Archived</option>
              </select>

              <select
                value={filterPriority.join(',') || ''}
                onChange={(e) => setFilterPriority(e.target.value.split(',').filter(Boolean))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Priority</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            {/* Add Card Button */}
            <Button
              onClick={handleAddCard}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              Add Card
            </Button>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex-1 p-4 overflow-x-auto">
          <div className="flex space-x-4 min-w-max">
            {columns.map((column) => (
              <Droppable key={column.id} droppableId={column.id}>
                <div
                  className={`w-80 min-h-[600px] ${column.bgColor} ${column.borderColor} rounded-lg border-2 ${isLoading ? 'opacity-50' : ''}`}
                >
                  {/* Column Header */}
                  <div className={`px-4 py-3 border-b ${column.borderColor} flex items-center justify-between`}>
                    <div className="flex items-center space-x-2">
                      {statusIcons[column.status as keyof typeof statusIcons]}
                      <h3 className={`font-semibold ${column.textColor}`}>
                        {column.title}
                      </h3>
                      <Badge variant="secondary" className="text-xs">
                        {column.cards.length}
                      </Badge>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Cards */}
                  <ScrollArea className="flex-1 p-4">
                    <Droppable droppableId={column.id} type="column">
                      <div className="space-y-3 min-h-[500px]">
                        {column.cards.map((card, index) => (
                          <Draggable
                            key={card.id}
                            draggableId={card.id}
                            index={index}
                          >
                            <div
                              className={`bg-white p-4 rounded-lg shadow-sm border ${column.borderColor} cursor-move hover:shadow-md transition-shadow`}
                              onClick={() => handleCardClick(card)}
                            >
                              {/* Card Header */}
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <h4 className="font-medium text-gray-900 text-sm mb-1">
                                    {card.title}
                                  </h4>
                                  <p className="text-xs text-gray-600 line-clamp-2">
                                    {card.description}
                                  </p>
                                </div>

                                <div className={`w-3 h-3 rounded-full ${priorityColors[card.priority]}`} />
                              </div>

                              {/* Card Metadata */}
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center space-x-2">
                                  {card.assignedTo && (
                                    <Avatar className="h-6 w-6">
                                      <img
                                        src={card.assignedTo.avatar}
                                        alt={card.assignedTo.name}
                                        className="w-full h-full object-cover"
                                      />
                                    </Avatar>
                                  )}

                                  {card.dueDate && (
                                    <div className="flex items-center text-xs text-gray-500">
                                      <Calendar className="h-3 w-3 mr-1" />
                                      {new Date(card.dueDate).toLocaleDateString()}
                                    </div>
                                  )}
                                </div>

                                <div className="flex items-center space-x-2 text-xs text-gray-500">
                                  {card.attachments > 0 && (
                                    <div className="flex items-center">
                                      <Download className="h-3 w-3 mr-1" />
                                      {card.attachments}
                                    </div>
                                  )}

                                  {card.comments > 0 && (
                                    <div className="flex items-center">
                                      <MessageSquare className="h-3 w-3 mr-1" />
                                      {card.comments}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Progress */}
                              {card.progress > 0 && (
                                <div className="mb-3">
                                  <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                                    <span>Progress</span>
                                    <span>{card.progress}%</span>
                                  </div>
                                  <Progress value={card.progress} className="h-2" />
                                </div>
                              )}

                              {/* Tags */}
                              {card.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-3">
                                  {card.tags.map((tag, index) => (
                                    <Badge
                                      key={index}
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              )}

                              {/* Actions */}
                              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                                <div className="flex items-center space-x-1 text-xs text-gray-500">
                                  <span>Updated {new Date(card.updatedAt).toLocaleDateString()}</span>
                                </div>

                                <div className="flex items-center space-x-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleCardEdit(card)
                                    }}
                                    className="text-gray-500 hover:text-blue-600 p-1"
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>

                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleCardDelete(card)
                                    }}
                                    className="text-gray-500 hover:text-red-600 p-1"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </Draggable>
                        ))}
                      </div>
                    </Droppable>
                  </ScrollArea>
                </div>
              </Droppable>
            ))}
          </div>
        </div>
      </DragDropContext>

      {/* Card Details Modal */}
      {showCardDetails && selectedCard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] m-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900">
                  Card Details
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCardDetails(false)}
                >
                  ×
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900">{selectedCard.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">{selectedCard.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm font-medium text-gray-700">Status</span>
                    <Badge className="mt-1">{selectedCard.status}</Badge>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-700">Priority</span>
                    <Badge className={`mt-1 ${priorityColors[selectedCard.priority]}`}>
                      {selectedCard.priority}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-700">Assigned To</span>
                    <div className="flex items-center mt-1 space-x-2">
                      <Avatar className="h-6 w-6">
                        <img
                          src={selectedCard.assignedTo?.avatar}
                          alt={selectedCard.assignedTo?.name}
                          className="w-full h-full object-cover"
                        />
                      </Avatar>
                      <span className="text-sm text-gray-600">{selectedCard.assignedTo?.name}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-700">Due Date</span>
                    <span className="text-sm text-gray-600 mt-1 block">
                      {selectedCard.dueDate ? new Date(selectedCard.dueDate).toLocaleDateString() : 'No due date'}
                    </span>
                  </div>
                </div>

                {selectedCard.progress > 0 && (
                  <div>
                    <div className="flex items-center justify-between text-sm font-medium text-gray-700 mb-2">
                      <span>Progress</span>
                      <span>{selectedCard.progress}%</span>
                    </div>
                    <Progress value={selectedCard.progress} className="h-3" />
                  </div>
                )}

                {selectedCard.tags.length > 0 && (
                  <div>
                    <span className="text-sm font-medium text-gray-700 mb-2">Tags</span>
                    <div className="flex flex-wrap gap-2">
                      {selectedCard.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between text-sm text-gray-500 pt-4 border-t border-gray-200">
                  <span>Created: {new Date(selectedCard.createdAt).toLocaleDateString()}</span>
                  <span>Updated: {new Date(selectedCard.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
