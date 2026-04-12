import { useRef, useState } from 'react'
import { Upload, File, X, Loader2 } from 'lucide-react'
import { uploadDocument } from '../../services/storage'
import type { DocumentFile } from '../../types'

interface FileUploadProps {
  applicationId: string
  category: string
  label: string
  accept?: string
  multiple?: boolean
  existingFiles?: DocumentFile[]
  onUpload: (files: DocumentFile[]) => void
  required?: boolean
}

export default function FileUpload({
  applicationId,
  category,
  label,
  accept = '.pdf',
  multiple = false,
  existingFiles = [],
  onUpload,
  required,
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return
    setError('')
    setUploading(true)

    try {
      const uploaded: DocumentFile[] = []
      for (const file of Array.from(fileList)) {
        if (file.size > 10 * 1024 * 1024) {
          setError(`${file.name} exceeds 10MB limit`)
          continue
        }
        const doc = await uploadDocument(applicationId, category, file)
        uploaded.push(doc)
      }
      onUpload([...existingFiles, ...uploaded])
    } catch {
      setError('Upload failed. Please try again.')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const removeFile = (index: number) => {
    const updated = existingFiles.filter((_, i) => i !== index)
    onUpload(updated)
  }

  return (
    <div>
      <label className="block text-sm font-medium text-text mb-1.5">
        {label}
        {required && <span className="text-danger ml-1">*</span>}
      </label>

      {/* Existing files */}
      {existingFiles.length > 0 && (
        <div className="space-y-2 mb-3">
          {existingFiles.map((f, i) => (
            <div
              key={i}
              className="flex items-center gap-2 p-2 rounded-lg bg-surface-alt border border-border text-sm"
            >
              <File className="w-4 h-4 text-primary shrink-0" />
              <a
                href={f.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline truncate flex-1"
              >
                {f.name}
              </a>
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="p-1 rounded hover:bg-danger-light text-text-dim hover:text-danger"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload area */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-border
          rounded-lg text-sm text-text-secondary hover:border-primary-light hover:text-primary
          hover:bg-primary-50 transition-colors disabled:opacity-50 cursor-pointer"
      >
        {uploading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Upload className="w-4 h-4" />
        )}
        {uploading ? 'Uploading...' : `Upload ${accept.toUpperCase().replace('.', '')} file`}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={(e) => handleFiles(e.target.files)}
        className="hidden"
      />

      {error && <p className="text-xs text-danger mt-1">{error}</p>}
    </div>
  )
}
