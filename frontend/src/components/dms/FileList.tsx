'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  File,
  Download,
  Trash2,
  Calendar,
  User,
  HardDrive,
  FolderOpen,
  Eye
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatFileSize, formatDate } from '@/lib/utils'

interface FileListProps {
  projectId: number
  projectName: string
  userRole: string
  allowedFolders: string[]
  onFileDeleted?: () => void
  className?: string
}

interface FileItem {
  id: number
  filename: string
  originalName: string
  filepath: string
  filetype: string
  fileSize: number
  formattedSize: string
  uploadedBy: {
    name: string
    email: string
  }
  uploadedAt: string
  folder: string
  downloadUrl?: string
}

interface FileListData {
  project: {
    id: number
    projectCode: string
    projectName: string
    status: string
    requestedBy: string
  }
  files: Record<string, FileItem[]>
  statistics: {
    totalFiles: number
    totalSize: number
    formattedTotalSize: string
    folderStats: Array<{
      folder: string
      fileCount: number
      totalSize: number
      formattedTotalSize: string
    }>
  }
  permissions: {
    canUpload: boolean
    allowedFolders: string[]
    userRole: string
  }
}

const FOLDER_LABELS = {
  attachments: 'Attachments',
  technical: 'Technical Docs',
  proposal: 'Proposals',
  bidding: 'Bidding Docs'
}

const FOLDER_ICONS = {
  attachments: File,
  technical: HardDrive,
  proposal: Eye,
  bidding: FolderOpen
}

const FOLDER_COLORS = {
  attachments: 'bg-blue-100 text-blue-800',
  technical: 'bg-green-100 text-green-800',
  proposal: 'bg-purple-100 text-purple-800',
  bidding: 'bg-orange-100 text-orange-800'
}

export default function FileList({
  projectId,
  projectName,
  userRole,
  allowedFolders,
  onFileDeleted,
  className
}: FileListProps) {
  const [data, setData] = useState<FileListData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTab, setSelectedTab] = useState<string>(allowedFolders[0] || '')

  useEffect(() => {
    fetchFiles()
  }, [projectId])

  const fetchFiles = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/files/${projectId}/list`)
      const result = await response.json()

      if (result.status === 'success') {
        setData(result.data)
        // Set first available folder as selected tab
        const availableFolders = Object.keys(result.data.files)
        if (availableFolders.length > 0) {
          setSelectedTab(availableFolders[0])
        }
      } else {
        setError(result.message)
      }
    } catch (error) {
      setError('Failed to load files')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (file: FileItem) => {
    try {
      const response = await fetch(`/api/files/download/${file.id}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = file.originalName
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Download failed:', error)
    }
  }

  const handleDelete = async (fileId: number, filename: string) => {
    if (!confirm(`Are you sure you want to delete "${filename}"?`)) {
      return
    }

    try {
      const response = await fetch(`/api/files/${projectId}/list?fileId=${fileId}`, {
        method: 'DELETE'
      })

      const result = await response.json()
      if (result.status === 'success') {
        // Remove file from local state
        if (data) {
          const updatedFiles = { ...data.files }
          for (const [folder, files] of Object.entries(updatedFiles)) {
            updatedFiles[folder] = files.filter(f => f.id !== fileId)
          }
          setData({
            ...data,
            files: updatedFiles,
            statistics: {
              ...data.statistics,
              totalFiles: data.statistics.totalFiles - 1,
              totalSize: data.statistics.totalSize - (data.files[selectedTab]?.find(f => f.id === fileId)?.fileSize || 0)
            }
          })
        }
        onFileDeleted?.()
      }
    } catch (error) {
      console.error('Delete failed:', error)
    }
  }

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return '📄'
    if (fileType.includes('word') || fileType.includes('document')) return '📝'
    if (fileType.includes('sheet') || fileType.includes('excel')) return '📊'
    if (fileType.includes('presentation') || fileType.includes('powerpoint')) return '📈'
    if (fileType.includes('image')) return '🖼️'
    if (fileType.includes('zip') || fileType.includes('rar')) return '📦'
    return '📄'
  }

  if (loading) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle>Loading files...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle className="text-red-600">Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return null
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Documents - {data.project.projectName}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {data.statistics.totalFiles} files
            </Badge>
            <Badge variant="outline">
              {data.statistics.formattedTotalSize}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Project Info */}
        <div className="mb-4 p-3 bg-muted rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <div>
              <span className="font-medium">{data.project.projectCode}</span>
              <span className="text-muted-foreground ml-2">Status: {data.project.status.replace(/_/g, ' ')}</span>
            </div>
            <div className="text-muted-foreground">
              Requested by: {data.project.requestedBy}
            </div>
          </div>
        </div>

        {Object.keys(data.files).length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FolderOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No files uploaded yet</p>
            <p className="text-sm">Upload files to get started</p>
          </div>
        ) : (
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
              {Object.keys(data.files).map(folder => {
                const Icon = FOLDER_ICONS[folder as keyof typeof FOLDER_ICONS]
                const stats = data.statistics.folderStats.find(s => s.folder === folder)
                return (
                  <TabsTrigger key={folder} value={folder} className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{FOLDER_LABELS[folder as keyof typeof FOLDER_LABELS]}</span>
                    <Badge variant="secondary" className="text-xs">
                      {stats?.fileCount || 0}
                    </Badge>
                  </TabsTrigger>
                )
              })}
            </TabsList>

            {Object.entries(data.files).map(([folder, files]) => (
              <TabsContent key={folder} value={folder} className="mt-4">
                <div className="space-y-4">
                  {/* Folder Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={FOLDER_COLORS[folder as keyof typeof FOLDER_COLORS]}>
                        {FOLDER_LABELS[folder as keyof typeof FOLDER_LABELS]}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {files.length} files • {data.statistics.folderStats.find(s => s.folder === folder)?.formattedTotalSize || '0 Bytes'}
                      </span>
                    </div>
                  </div>

                  {/* Files List */}
                  {files.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">
                      <File className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No files in this folder</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {files.map(file => (
                        <div
                          key={file.id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="text-2xl">
                              {getFileIcon(file.filetype)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{file.originalName}</p>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <HardDrive className="h-3 w-3" />
                                  {file.formattedSize}
                                </span>
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {file.uploadedBy.name}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {formatDate(file.uploadedAt)}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 ml-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownload(file)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            {(userRole === 'ADMIN' || file.uploadedBy.email === userRole) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(file.id, file.originalName)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </CardContent>
    </Card>
  )
}
