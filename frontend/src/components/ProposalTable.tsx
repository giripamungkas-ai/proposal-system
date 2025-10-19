'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Eye, Edit, Download, Calendar, User, DollarSign } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Proposal {
  id: number
  title: string
  status: string
  budget?: number
  createdAt: string
  requestedBy: {
    name: string
    email: string
  }
  projectCode: string
  deadline?: string
}

interface ProposalTableProps {
  proposals: Proposal[]
  onView?: (proposal: Proposal) => void
  onEdit?: (proposal: Proposal) => void
  onDownload?: (proposal: Proposal) => void
  className?: string
}

const statusColors = {
  DRAFT: 'bg-gray-100 text-gray-800',
  PENDING_SALES_MANAGER_APPROVAL: 'bg-yellow-100 text-yellow-800',
  REJECTED_BY_SALES_MANAGER: 'bg-red-100 text-red-800',
  PENDING_PO_COMPLETION: 'bg-blue-100 text-blue-800',
  PO_IN_PROGRESS: 'bg-indigo-100 text-indigo-800',
  PENDING_BS_PROPOSAL: 'bg-purple-100 text-purple-800',
  BS_IN_PROGRESS: 'bg-pink-100 text-pink-800',
  BS_PENDING_MANAGER_APPROVAL: 'bg-orange-100 text-orange-800',
  PROPOSAL_FINALIZED: 'bg-green-100 text-green-800',
  CLOSED: 'bg-gray-100 text-gray-800',
  ON_HOLD: 'bg-amber-100 text-amber-800',
  CANCELLED: 'bg-red-100 text-red-800',
}

export default function ProposalTable({
  proposals,
  onView,
  onEdit,
  onDownload,
  className
}: ProposalTableProps) {
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null)

  const handleRowClick = (proposal: Proposal) => {
    setSelectedProposal(proposal)
    onView?.(proposal)
  }

  const formatCurrency = (amount?: number) => {
    if (!amount) return 'N/A'
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  return (
    <>
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Latest Proposals</CardTitle>
            <Button variant="outline" size="sm">
              View All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project Code</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Requested By</TableHead>
                  <TableHead>Budget</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {proposals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No proposals found
                    </TableCell>
                  </TableRow>
                ) : (
                  proposals.map((proposal) => (
                    <TableRow
                      key={proposal.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleRowClick(proposal)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                            {proposal.projectCode}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[200px] truncate" title={proposal.title}>
                          {proposal.title}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={cn("text-xs", statusColors[proposal.status as keyof typeof statusColors])}
                        >
                          {proposal.status.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-3 w-3" />
                          </div>
                          <div>
                            <div className="text-sm font-medium">{proposal.requestedBy.name}</div>
                            <div className="text-xs text-muted-foreground truncate max-w-[100px]">
                              {proposal.requestedBy.email}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <DollarSign className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{formatCurrency(proposal.budget)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{formatDate(proposal.createdAt)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRowClick(proposal)
                            }}
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                          {onEdit && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                onEdit(proposal)
                              }}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                          )}
                          {onDownload && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                onDownload(proposal)
                              }}
                            >
                              <Download className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Proposal Detail Modal */}
      {selectedProposal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{selectedProposal.title}</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedProposal(null)}
                >
                  ×
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Project Code</label>
                  <p className="text-sm">{selectedProposal.projectCode}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <div className="mt-1">
                    <Badge
                      variant="secondary"
                      className={statusColors[selectedProposal.status as keyof typeof statusColors]}
                    >
                      {selectedProposal.status.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Budget</label>
                  <p className="text-sm">{formatCurrency(selectedProposal.budget)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Created</label>
                  <p className="text-sm">{formatDate(selectedProposal.createdAt)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Requested By</label>
                  <p className="text-sm">{selectedProposal.requestedBy.name}</p>
                  <p className="text-xs text-muted-foreground">{selectedProposal.requestedBy.email}</p>
                </div>
                {selectedProposal.deadline && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Deadline</label>
                    <p className="text-sm">{formatDate(selectedProposal.deadline)}</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setSelectedProposal(null)}>
                  Close
                </Button>
                {onEdit && (
                  <Button onClick={() => {
                    onEdit(selectedProposal)
                    setSelectedProposal(null)
                  }}>
                    Edit Proposal
                  </Button>
                )}
                {onDownload && (
                  <Button variant="secondary" onClick={() => {
                    onDownload(selectedProposal)
                  }}>
                    Download
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}
