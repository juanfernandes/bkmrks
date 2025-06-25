import React, { useState, useEffect } from 'react'
import {
  Search, Plus, Edit3, Trash2, ExternalLink,
  Tag, Bookmark, Download, Upload, RotateCcw
} from 'lucide-react'
import './App.css'

const API_BASE_URL = '/api'

const BookmarkManager = () => {
  const [bookmarks, setBookmarks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingBookmark, setEditingBookmark] = useState(null)
  const [formData, setFormData] = useState({
    title: '',
    url: '',
    category: '',
    description: ''
  })

  const apiCall = async (endpoint, options = {}) => {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }
      return await response.json()
    } catch (error) {
      console.error(`API call failed for ${endpoint}:`, error)
      throw error
    }
  }

  const loadBookmarks = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await apiCall('/bookmarks')
      setBookmarks(data)
    } catch (error) {
      setError(`Failed to load bookmarks: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBookmarks()
  }, [loadBookmarks])

  const categories = ['All', ...new Set(bookmarks.map(b => b.category).filter(Boolean))]

  const filteredBookmarks = bookmarks.filter(b => {
    const matchesSearch = b.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          b.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          b.url.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'All' || b.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const handleSubmit = async () => {
    if (!formData.title || !formData.url) return
    try {
      setError(null)
      if (editingBookmark) {
        const updated = await apiCall(`/bookmarks/${editingBookmark.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData)
        })
        setBookmarks(bookmarks.map(b => (b.id === editingBookmark.id ? updated : b)))
        setEditingBookmark(null)
      } else {
        const newBookmark = await apiCall('/bookmarks', {
          method: 'POST',
          body: JSON.stringify(formData)
        })
        setBookmarks([...bookmarks, newBookmark])
      }
      setFormData({ title: '', url: '', category: '', description: '' })
      setShowAddForm(false)
    } catch (err) {
      setError(`Failed to save bookmark: ${err.message}`)
    }
  }

  const handleEdit = (bookmark) => {
    setFormData({
      title: bookmark.title,
      url: bookmark.url,
      category: bookmark.category,
      description: bookmark.description
    })
    setEditingBookmark(bookmark)
    setShowAddForm(true)
  }

  const handleDelete = async (id) => {
    try {
      await apiCall(`/bookmarks/${id}`, { method: 'DELETE' })
      setBookmarks(bookmarks.filter(b => b.id !== id))
    } catch (err) {
      setError(`Failed to delete bookmark: ${err.message}`)
    }
  }

  const resetForm = () => {
    setFormData({ title: '', url: '', category: '', description: '' })
    setEditingBookmark(null)
    setShowAddForm(false)
  }

  const exportBookmarks = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/bookmarks/export`)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      const cd = response.headers.get('content-disposition')
      const filename = cd ? cd.split('filename=')[1]?.replace(/"/g, '') : 'bookmarks.json'
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(`Failed to export: ${err.message}`)
    }
  }

  const importBookmarks = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const imported = JSON.parse(e.target.result)
        if (!Array.isArray(imported)) throw new Error('Invalid format')
        await apiCall('/bookmarks/import', {
          method: 'POST',
          body: JSON.stringify({ bookmarks: imported })
        })
        await loadBookmarks()
        alert('Bookmarks imported!')
      } catch (err) {
        setError(`Import failed: ${err.message}`)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const clearAllBookmarks = async () => {
    if (window.confirm('Are you sure you want to delete all bookmarks?')) {
      try {
        await apiCall('/bookmarks', { method: 'DELETE' })
        setBookmarks([])
      } catch (err) {
        setError(`Failed to clear: ${err.message}`)
      }
    }
  }

  if (loading) {
    return (
      <div className='app'>
        <div className='container'>
          <div className='loading-state'>
            <Bookmark size={64} />
            <h3>Loading bookmarks...</h3>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='app'>
      <div className='container'>
        {error && (
          <div className='error-message'>
            <p>{error}</p>
            <button onClick={() => setError(null)} className='btn btn-secondary'>
              Dismiss
            </button>
          </div>
        )}

        <div className='header-card'>
          <div className='header-content'>
            <div className='header-title'>
              <Bookmark size={32} />
              <h1>Bookmark Manager</h1>
              <span className='bookmark-count'>({bookmarks.length})</span>
            </div>
            <div className='header-actions'>
              <button onClick={() => setShowAddForm(true)} className='btn btn-primary'>
                <Plus size={20} /> <span>Add Bookmark</span>
              </button>
              <button onClick={exportBookmarks} className='btn btn-secondary'>
                <Download size={20} /> <span>Export</span>
              </button>
              <label className='btn btn-secondary'>
                <Upload size={20} /> <span>Import</span>
                <input type='file' accept='.json' onChange={importBookmarks} style={{ display: 'none' }} />
              </label>
              {bookmarks.length > 0 && (
                <button onClick={clearAllBookmarks} className='btn btn-danger'>
                  <RotateCcw size={20} /> <span>Clear All</span>
                </button>
              )}
            </div>
          </div>

          <div className='search-filter-container'>
            <div className='search-box'>
              <Search size={20} className='search-icon' />
              <input
                type='text'
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder='Search bookmarks...'
                className='search-input'
              />
            </div>
            <div className='filter-box'>
              <Tag size={20} className='filter-icon' />
              <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className='filter-select'>
                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
          </div>
        </div>

        {showAddForm && (
          <div className='form-card'>
            <h2>{editingBookmark ? 'Edit Bookmark' : 'Add New Bookmark'}</h2>
            <div className='form-container'>
              <div className='form-row'>
                <div className='form-group'>
                  <label>Title *</label>
                  <input
                    type='text'
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className='form-input'
                    required
                  />
                </div>
                <div className='form-group'>
                  <label>URL *</label>
                  <input
                    type='url'
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    className='form-input'
                    required
                  />
                </div>
              </div>
              <div className='form-group'>
                <label>Category</label>
                <input
                  type='text'
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className='form-input'
                />
              </div>
              <div className='form-group'>
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className='form-textarea'
                />
              </div>
              <div className='form-buttons'>
                <button onClick={handleSubmit} className='btn btn-primary'>
                  {editingBookmark ? 'Update' : 'Add'} Bookmark
                </button>
                <button onClick={resetForm} className='btn btn-secondary'>Cancel</button>
              </div>
            </div>
          </div>
        )}

        <div className='bookmarks-grid'>
          {filteredBookmarks.map(bookmark => (
            <div key={bookmark.id} className='bookmark-card'>
              <div className='bookmark-header'>
                <h3 className='bookmark-title'>{bookmark.title}</h3>
                <div className='bookmark-actions'>
                  <button onClick={() => handleEdit(bookmark)} className='action-btn'><Edit3 size={16} /></button>
                  <button onClick={() => handleDelete(bookmark.id)} className='action-btn delete-btn'><Trash2 size={16} /></button>
                </div>
              </div>
              {bookmark.description && <p className='bookmark-description'>{bookmark.description}</p>}
              <div className='bookmark-meta'>
                {bookmark.category && <span className='bookmark-category'>{bookmark.category}</span>}
                <span className='bookmark-date'>{bookmark.dateAdded}</span>
              </div>
              <a href={bookmark.url} target='_blank' rel='noopener noreferrer' className='bookmark-link'>
                <ExternalLink size={16} /> <span className='bookmark-url'>{bookmark.url}</span>
              </a>
            </div>
          ))}
        </div>

        {filteredBookmarks.length === 0 && !loading && (
          <div className='empty-state'>
            <Bookmark size={64} />
            <h3>No bookmarks found</h3>
            <p>{searchTerm || selectedCategory !== 'All' ? 'Try adjusting your search or filter' : 'Add your first bookmark!'}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default BookmarkManager
