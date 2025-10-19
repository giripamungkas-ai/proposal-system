'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Upload,
  File,
  X,
  CheckCircle,
  AlertCircle,
  FolderOpen,
  Download,
  Trash2
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface FileUploadProps {
  projectId: number
  projectName: string
  userRole: string
  allowedFolders: string[]
  onUploadComplete?: (files: any[]) => void
  className?: string
}

interface UploadFile {
  file: File
  id: string
  progress: number
  status: 'pending' | 'uploading' | 'success' | 'error'
  error?: string
  folder?: string
}

const FOLDER_LABELS = {
  attachments: 'Attachments',
  technical: 'Technical Documents',
  proposal: 'Proposal Documents',
  bidding: 'Bidding Documents'
}

const FOLDER_DESCRIPTIONS = {
  attachments: 'General project attachments, contracts, requirements',
  technical: 'Technical specifications, architecture documents',
  proposal: 'Proposal drafts, final proposals, presentations',
  bidding: 'Final bid documents, pricing sheets, terms'
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export default function FileUpload({
  projectId,
  projectName,
  userRole,
  allowedFolders,
  onUploadComplete,
  className
}: FileUploadProps) {
  const [files, setFiles] = useState<UploadFile[]>([])
  const [selectedFolder, setSelectedFolder] = useState<string>('')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    const newFiles: UploadFile[] = acceptedFiles.map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      progress: 0,
      status: 'pending',
      folder: selectedFolder
    }))

    setFiles(prev => [...prev, ...newFiles])

    // Show errors for rejected files
    rejectedFiles.forEach(({ file, errors }) => {
      const errorFile: UploadFile = {
        file,
        id: Math.random().toString(36).substr(2, 9),
        progress: 0,
        status: 'error',
        error: errors.map(e => e.message).join(', ')
      }
      setFiles(prev => [...prev, errorFile])
    })
  }, [selectedFolder])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: MAX_FILE_SIZE,
    multiple: true,
    disabled: !selectedFolder || isUploading
  })

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId))
  }

  const uploadFiles = async () => {
    if (!selectedFolder || files.length === 0) return

    setIsUploading(true)
    setUploadProgress(0)

    const validFiles = files.filter(f => f.status === 'pending')
    const totalFiles = validFiles.length

    try {
      const formData = new FormData()
      validFiles.forEach(f => {
        formData.append('files', f.file)
      })
      formData.append('projectId', projectId.toString())
      formData.append('folder', selectedFolder)
      formData.append('status', 'DRAFT')

      // Update file statuses
      setFiles(prev => prev.map(f =>
        f.status === 'pending' ? { ...f, status: 'uploading', progress: 0 } : f
      ))

      // Simulate progress (in real app, use XMLHttpRequest for progress tracking)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 200)

      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      const result = await response.json()

      if (result.status === 'success') {
        // Update successful files
        const uploadedFilenames = result.data.uploadedFiles.map((f: any) => f.originalName)
        setFiles(prev => prev.map(f => {
          if (f.status === 'uploading' && uploadedFilenames.includes(f.file.name)) {
            return { ...f, status: 'success', progress: 100 }
          }
          if (f.status === 'uploading' && !uploadedFilenames.includes(f.file.name)) {
            return { ...f, status: 'error', error: 'Upload failed' }
          }
          return f
        }))

        onUploadComplete?.(result.data.uploadedFiles)

        // Clear successful files after a delay
        setTimeout(() => {
          setFiles(prev => prev.filter(f => f.status !== 'success'))
        }, 2000)
      } else {
        // Mark all as failed
        setFiles(prev => prev.map(f =>
          f.status === 'uploading' ? { ...f, status: 'error', error: result.message } : f
        ))
      }
    } catch (error) {
      setFiles(prev => prev.map(f =>
        f.status === 'uploading' ? { ...f, status: 'error', error: 'Upload failed' } : f
      ))
    } finally {
      setIsUploading(false)
      setTimeout(() => setUploadProgress(0), 1000)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getStatusIcon = (status: UploadFile['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'uploading':
        return <Upload className="h-4 w-4 text-blue-500 animate-pulse" />
      default:
        return <File className="h-4 w-4 text-gray-500" />
    }
  }

  const hasErrors = files.some(f => f.status === 'error')
  const canUpload = selectedFolder && files.some(f => f.status === 'pending') && !isUploading

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FolderOpen className="h-5 w-5" />
          Document Upload - {projectName}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Folder Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Select Folder</label>
          <Select value={selectedFolder} onValueChange={setSelectedFolder}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a folder to upload to" />
            </SelectTrigger>
            <SelectContent>
              {allowedFolders.map(folder => (
                <SelectItem key={folder} value={folder}>
                  <div className="flex flex-col items-start">
                    <span className="font-medium">{FOLDER_LABELS[folder as keyof typeof FOLDER_LABELS]}</span>
                    <span className="text-xs text-muted-foreground">
                      {FOLDER_DESCRIPTIONS[folder as keyof typeof FOLDER_DESCRIPTIONS]}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedFolder && (
            <Badge variant="secondary" className="w-fit">
              {FOLDER_LABELS[selectedFolder as keyof typeof FOLDER_LABELS]}
            </Badge>
          )}
        </div>

        {/* Dropzone */}
        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
            isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25",
            (!selectedFolder || isUploading) && "opacity-50 cursor-not-allowed"
          )}
        >
          <input {...getInputProps()} />
          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          {isDragActive ? (
            <p className="text-sm">Drop the files here...</p>
          ) : (
            <div className="space-y-1">
              <p className="text-sm">
                {selectedFolder ? 'Drag & drop files here, or click to select' : 'Select a folder first'}
              </p>
              <p className="text-xs text-muted-foreground">
                Maximum file size: 10MB. Multiple files supported.
              </p>
            </div>
          )}
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Files to Upload</label>
              {hasErrors && (
                <Badge variant="destructive" className="text-xs">
                  Some files have errors
                </Badge>
              )}
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {files.map(file => (
                <div key={file.id} className="flex items-center gap-2 p-2 border rounded-lg">
                  {getStatusIcon(file.status)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.file.size)}
                      {file.error && <span className="text-red-500 ml-1">{file.error}</span>}
                    </p>
                    {file.status === 'uploading' && (
                      <Progress value={file.progress} className="h-1 mt-1" />
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(file.id)}
                    disabled={file.status === 'uploading'}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload Progress */}
        {isUploading && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Uploading...</label>
              <span className="text-sm text-muted-foreground">{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="h-2" />
          </div>
        )}

        {/* Upload Button */}
        <div className="flex justify-end">
          <Button
            onClick={uploadFiles}
            disabled={!canUpload}
            className="min-w-24"
          >
            {isUploading ? 'Uploading...' : 'Upload Files'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
