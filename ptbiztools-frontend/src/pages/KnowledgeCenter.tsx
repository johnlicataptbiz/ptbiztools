import { useEffect, useMemo, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
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
  const [searchParams, setSearchParams] = useSearchParams()

  const selectedSlugParam = searchParams.get('slug')

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

    if (loaded.length === 0) {
      setSelectedId(null)
      setLoading(false)
      return
    }

    const bySlug = selectedSlugParam
      ? loaded.find((doc) => doc.slug && doc.slug === selectedSlugParam)
      : null
    const byCurrentId = selectedId ? loaded.find((doc) => doc.id === selectedId) : null
    const fallback = loaded[0]

    setSelectedId((bySlug || byCurrentId || fallback).id)
    setLoading(false)
  }

  useEffect(() => {
    void loadDocs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!selectedSlugParam || docs.length === 0) return

    const requested = docs.find((doc) => doc.slug && doc.slug === selectedSlugParam)
    if (requested && requested.id !== selectedId) {
      setSelectedId(requested.id)
    }
  }, [docs, selectedId, selectedSlugParam])

  const selectedDoc = useMemo(
    () => docs.find((doc) => doc.id === selectedId) || null,
    [docs, selectedId],
  )

  const handleSelectDoc = (doc: KnowledgeDoc) => {
    setSelectedId(doc.id)

    if (!doc.slug) return

    const next = new URLSearchParams(searchParams)
    next.set('slug', doc.slug)
    setSearchParams(next, { replace: true })
  }

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
          <button className="knowledge-refresh-btn" onClick={() => void loadDocs()}>
            <RefreshCw size={14} />
            Refresh
          </button>
          {isAdmin && (
            <button className="knowledge-seed-btn" onClick={() => void handleSeed()} disabled={seedLoading}>
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
                onClick={() => handleSelectDoc(doc)}
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
                  <p>
                    {selectedDoc.category} · {selectedDoc.source || 'Internal'}
                    {selectedDoc.version ? ` · v${selectedDoc.version}` : ''}
                  </p>
                </header>
                <div className="knowledge-content">{selectedDoc.content}</div>
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
