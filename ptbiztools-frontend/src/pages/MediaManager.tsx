import { useEffect, useState } from 'react'
import { getVideoAssetStatus, uploadVideoAsset } from '../services/api'
import './MediaManager.css'

const MANAGED_ASSETS = [
  { key: 'intro-combined', label: 'Combined Intro Video', accept: 'video/mp4' },
] as const

function formatFileSize(bytes: number) {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  return `${Math.round(bytes / 1024)} KB`
}

export default function MediaManager() {
  const [selectedName, setSelectedName] = useState<string>('intro-combined')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [statuses, setStatuses] = useState<Record<string, number>>({})

  const refreshStatuses = async () => {
    const next: Record<string, number> = {}
    for (const item of MANAGED_ASSETS) {
      const status = await getVideoAssetStatus(item.key)
      next[item.key] = status.status
    }
    setStatuses(next)
  }

  useEffect(() => {
    refreshStatuses()
  }, [])

  const selectedAsset = MANAGED_ASSETS.find((item) => item.key === selectedName) || MANAGED_ASSETS[0]

  const handleUpload = async () => {
    if (!selectedFile) {
      setMessage(`Choose a file for ${selectedAsset.label} first.`)
      return
    }

    setUploading(true)
    setMessage('')
    try {
      const result = await uploadVideoAsset(selectedName, selectedFile, selectedFile.type || 'video/mp4')

      if (!result.ok) {
        setMessage(result.error || 'Upload failed')
        setUploading(false)
        return
      }

      setMessage(`Uploaded ${selectedName} successfully.`)
      setSelectedFile(null)
      await refreshStatuses()
    } catch (error) {
      setMessage((error as Error).message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="media-manager">
      <div className="media-header">
        <h1>Media Manager</h1>
        <p>Uploads stream as multipart form-data to object storage for high-resolution media assets.</p>
      </div>

      <div className="media-grid">
        <section className="media-card">
          <h2>Upload Intro Asset</h2>
          <label>
            Asset Slot
            <select value={selectedName} onChange={(event) => setSelectedName(event.target.value)}>
              {MANAGED_ASSETS.map((item) => (
                <option key={item.key} value={item.key}>{item.label}</option>
              ))}
            </select>
          </label>

          <label>
            File
            <input
              type="file"
              accept={selectedAsset.accept}
              onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
            />
          </label>

          <button className="media-upload-btn" onClick={handleUpload} disabled={uploading}>
            {uploading ? 'Uploading...' : 'Upload Asset'}
          </button>

          {selectedFile && (
            <p className="media-file-meta">
              Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
            </p>
          )}
        </section>

        <section className="media-card">
          <div className="media-status-header">
            <h2>Current Availability</h2>
            <button className="media-refresh-btn" onClick={refreshStatuses}>Refresh</button>
          </div>
          <div className="media-status-list">
            {MANAGED_ASSETS.map((item) => {
              const status = statuses[item.key]
              const isLive = status === 200
              return (
                <div key={item.key} className="media-status-item">
                  <div>
                    <strong>{item.label}</strong>
                    <span>{item.key}</span>
                  </div>
                  <span className={`status-pill ${isLive ? 'ok' : 'bad'}`}>
                    {status ? status : 'N/A'}
                  </span>
                </div>
              )
            })}
          </div>
        </section>
      </div>

      {message && <div className="media-message">{message}</div>}
    </div>
  )
}
