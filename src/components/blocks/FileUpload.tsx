'use client'

import { cn } from '@/lib/utils'
import { Upload, X, FileText } from 'lucide-react'
import { useState, useRef } from 'react'

interface FileUploadProps {
  label?: string
  accept?: string
  multiple?: boolean
  maxSizeMB?: number
  onFiles?: (files: File[]) => void
  className?: string
}

export function FileUpload({
  label = 'Upload files',
  accept,
  multiple = false,
  maxSizeMB = 10,
  onFiles,
  className,
}: FileUploadProps) {
  const [files, setFiles] = useState<File[]>([])
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = (newFiles: FileList | null) => {
    if (!newFiles) return
    const valid = Array.from(newFiles).filter(f => f.size <= maxSizeMB * 1024 * 1024)
    const updated = multiple ? [...files, ...valid] : valid.slice(0, 1)
    setFiles(updated)
    onFiles?.(updated)
  }

  const removeFile = (index: number) => {
    const updated = files.filter((_, i) => i !== index)
    setFiles(updated)
    onFiles?.(updated)
  }

  return (
    <div className={cn('space-y-3', className)}>
      {label && <label className="block text-sm font-medium text-text-primary">{label}</label>}

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'flex flex-col items-center justify-center gap-2 p-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors',
          dragOver ? 'border-brand-500 bg-brand-50' : 'border-border hover:border-brand-300 hover:bg-surface-secondary'
        )}
      >
        <Upload className="w-8 h-8 text-text-tertiary" />
        <p className="text-sm text-text-secondary">
          <span className="font-medium text-brand-600">Click to upload</span> or drag and drop
        </p>
        <p className="text-xs text-text-tertiary">Max {maxSizeMB}MB per file</p>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={e => handleFiles(e.target.files)}
          className="hidden"
        />
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, i) => (
            <div key={i} className="flex items-center gap-3 p-2 rounded border border-border bg-surface-secondary">
              <FileText className="w-4 h-4 text-text-tertiary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-text-primary truncate">{file.name}</p>
                <p className="text-xs text-text-tertiary">{(file.size / 1024).toFixed(0)} KB</p>
              </div>
              <button onClick={() => removeFile(i)} className="p-1 text-text-tertiary hover:text-status-error">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
