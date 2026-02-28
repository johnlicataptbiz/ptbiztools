import { useEffect, useMemo, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { getKnowledgeDocs, seedKnowledgeDocs, type KnowledgeDoc } from '../services/api'
import './KnowledgeCenter.css'

interface KnowledgeCenterProps {
  isAdmin: boolean
}

export default function KnowledgeCenter({ isAdmin }: KnowledgeCenterProps) {
  const [docs, setDocs] = useState<KnowledgeDoc[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [seedLoading, setSeedLoading] = useState(false)
  const [message, setMessage] = useState('')

  const loadDocs = async () => {
    setLoading(true)
    setMessage('')
    const { docs: rows, error } = await getKnowledgeDocs()
    if (error) {
      setMessage(error)
      setLoading(false)
      return
    }
    const loaded = rows || []
    setDocs(loaded)
    if (loaded.length > 0) {
      setSelectedId((prev) => prev && loaded.some((doc) => doc.id === prev) ? prev : loaded[0].id)
    } else {
      setSelectedId(null)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadDocs()
  }, [])

  const selectedDoc = useMemo(
    () => docs.find((doc) => doc.id === selectedId) || null,
    [docs, selectedId],
  )

  const handleSeed = async () => {
    setSeedLoading(true)
    setMessage('')
    const result = await seedKnowledgeDocs()
    if (!result.ok) {
      setMessage(result.error || 'Failed to seed docs')
      setSeedLoading(false)
      return
    }
    setMessage('Knowledge docs reseeded.')
    await loadDocs()
    setSeedLoading(false)
  }

  return (
    <div className="knowledge-page">
      <div className="knowledge-header">
        <div>
          <h1>Knowledge Library</h1>
          <p>Connected to backend `/api/knowledge` docs and seed endpoint.</p>
        </div>
        <div className="knowledge-actions">
          <button className="knowledge-refresh-btn" onClick={loadDocs}>
            <RefreshCw size={14} />
            Refresh
          </button>
          {isAdmin && (
            <button className="knowledge-seed-btn" onClick={handleSeed} disabled={seedLoading}>
              {seedLoading ? 'Reseeding...' : 'Reseed Docs'}
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="knowledge-empty">Loading docs...</div>
      ) : docs.length === 0 ? (
        <div className="knowledge-empty">No knowledge docs found.</div>
      ) : (
        <div className="knowledge-grid">
          <aside className="knowledge-list">
            {docs.map((doc) => (
              <button
                key={doc.id}
                className={`knowledge-item ${doc.id === selectedId ? 'active' : ''}`}
                onClick={() => setSelectedId(doc.id)}
              >
                <strong>{doc.title}</strong>
                <span>{doc.category}</span>
              </button>
            ))}
          </aside>

          <article className="knowledge-doc">
            {selectedDoc ? (
              <>
                <header>
                  <h2>{selectedDoc.title}</h2>
                  <p>{selectedDoc.category} · {selectedDoc.source || 'Internal'}</p>
                </header>
                <div className="knowledge-content">
                  {selectedDoc.content}
                </div>
              </>
            ) : (
              <div className="knowledge-empty">Select a document.</div>
            )}
          </article>
        </div>
      )}

      {message && <div className="knowledge-message">{message}</div>}
    </div>
  )
}
