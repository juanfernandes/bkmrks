// App.js
import React, { useState, useEffect } from 'react'
import { Search, Plus, Edit3, Trash2, ExternalLink, Tag, Bookmark, Download, Upload, RotateCcw } from 'lucide-react'
import './App.css'

const API_BASE_URL = 'http://localhost:3001/api'

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

  // API helper functions
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

  // Load bookmarks from server
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

  // Load bookmarks on component mount
  useEffect(() => {
    loadBookmarks()
  }, [])

  // Get unique categories
  const categories = ['All', ...new Set(bookmarks.map(bookmark => bookmark.category).filter(Boolean))]

  // Filter bookmarks based on search and category
  const filteredBookmarks = bookmarks.filter(bookmark => {
    const matchesSearch = bookmark.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         bookmark.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         bookmark.url.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'All' || bookmark.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const handleSubmit = async () => {
    if (!formData.title || !formData.url) return

    try {
      setError(null)
      
      if (editingBookmark) {
        // Update existing bookmark
        const updatedBookmark = await apiCall(`/bookmarks/${editingBookmark.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData),
        })
        
        setBookmarks(bookmarks.map(bookmark =>
          bookmark.id === editingBookmark.id ? updatedBookmark : bookmark
        ))
        setEditingBookmark(null)
      } else {
        // Add new bookmark
        const newBookmark = await apiCall('/bookmarks', {
          method: 'POST',
          body: JSON.stringify(formData),
        })
        
        setBookmarks([...bookmarks, newBookmark])
      }

      setFormData({ title: '', url: '', category: '', description: '' })
      setShowAddForm(false)
    } catch (error) {
      setError(`Failed to save bookmark: ${error.message}`)
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
      setError(null)
      await apiCall(`/bookmarks/${id}`, { method: 'DELETE' })
      setBookmarks(bookmarks.filter(bookmark => bookmark.id !== id))
    } catch (error) {
      setError(`Failed to delete bookmark: ${error.message}`)
    }
  }

  const resetForm = () => {
    setFormData({ title: '', url: '', category: '', description: '' })
    setEditingBookmark(null)
    setShowAddForm(false)
  }

  // Export bookmarks
  const exportBookmarks = async () => {
    try {
      setError(null)
      const response = await fetch(`${API_BASE_URL}/bookmarks/export`)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      
      // Get filename from response headers or use default
      const contentDisposition = response.headers.get('content-disposition')
      const filename = contentDisposition 
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : `bookmarks-${new Date().toISOString().split('T')[0]}.json`
      
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      setError(`Failed to export bookmarks: ${error.message}`)
    }
  }

  // Import bookmarks from JSON file
  const importBookmarks = (event) => {
    const file = event.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        setError(null)
        const importedBookmarks = JSON.parse(e.target.result)
        
        if (!Array.isArray(importedBookmarks)) {
          throw new Error('Invalid file format - expected an array of bookmarks')
        }

        const result = await apiCall('/bookmarks/import', {
          method: 'POST',
          body: JSON.stringify({ bookmarks: importedBookmarks }),
        })

        // Reload bookmarks from server
        await loadBookmarks()
        alert(result.message)
      } catch (error) {
        setError(`Failed to import bookmarks: ${error.message}`)
      }
    }
    
    reader.readAsText(file)
    // Reset the input so the same file can be selected again
    event.target.value = ''
  }

  // Clear all bookmarks (with confirmation)
  const clearAllBookmarks = async () => {
    if (window.confirm('Are you sure you want to delete all bookmarks? This action cannot be undone.')) {
      try {
        setError(null)
        await apiCall('/bookmarks', { method: 'DELETE' })
        setBookmarks([])
      } catch (error) {
        setError(`Failed to clear bookmarks: ${error.message}`)
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
        {/* Error Display */}
        {error && (
          <div className='error-message'>
            <p>{error}</p>
            <button onClick={() => setError(null)} className='btn btn-secondary'>
              Dismiss
            </button>
          </div>
        )}

        {/* Header */}
        <div className='header-card'>
          <div className='header-content'>
            <div className='header-title'>
              <Bookmark size={32} />
              <h1>Bookmark Manager</h1>
              <span className='bookmark-count'>({bookmarks.length} bookmarks)</span>
            </div>
            <div className='header-actions'>
              <button
                onClick={() => setShowAddForm(true)}
                className='btn btn-primary'
              >
                <Plus size={20} />
                <span>Add Bookmark</span>
              </button>

              {/* Export Button */}
              <button
                onClick={exportBookmarks}
                className='btn btn-secondary'
                title='Export bookmarks to JSON file'
              >
                <Download size={20} />
                <span>Export</span>
              </button>

              {/* Import Button */}
              <label className='btn btn-secondary' title='Import bookmarks from JSON file'>
                <Upload size={20} />
                <span>Import</span>
                <input
                  type='file'
                  accept='.json'
                  onChange={importBookmarks}
                  style={{ display: 'none' }}
                />
              </label>

              {/* Clear All Button */}
              {bookmarks.length > 0 && (
                <button
                  onClick={clearAllBookmarks}
                  className='btn btn-danger'
                  title='Clear all bookmarks'
                >
                  <RotateCcw size={20} />
                  <span>Clear All</span>
                </button>
              )}
            </div>
          </div>

          {/* Search and Filter */}
          <div className='search-filter-container'>
            <div className='search-box'>
              <Search className='search-icon' size={20} />
              <input
                type='text'
                placeholder='Search bookmarks...'
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className='search-input'
              />
            </div>
            <div className='filter-box'>
              <Tag className='filter-icon' size={20} />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className='filter-select'
              >
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Add/Edit Form */}
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
                  placeholder='e.g., Development, Tools, News'
                />
              </div>
              <div className='form-group'>
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className='form-textarea'
                  rows='3'
                  placeholder='Brief description of the bookmark'
                />
              </div>
              <div className='form-buttons'>
                <button
                  type='button'
                  onClick={handleSubmit}
                  className='btn btn-primary'
                >
                  {editingBookmark ? 'Update' : 'Add'} Bookmark
                </button>
                <button
                  type='button'
                  onClick={resetForm}
                  className='btn btn-secondary'
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bookmarks Grid */}
        <div className='bookmarks-grid'>
          {filteredBookmarks.map(bookmark => (
            <div key={bookmark.id} className='bookmark-card'>
              <div className='bookmark-header'>
                <h3 className='bookmark-title'>{bookmark.title}</h3>
                <div className='bookmark-actions'>
                  <button
                    onClick={() => handleEdit(bookmark)}
                    className='action-btn'
                  >
                    <Edit3 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(bookmark.id)}
                    className='action-btn delete-btn'
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {bookmark.description && (
                <p className='bookmark-description'>
                  {bookmark.description}
                </p>
              )}

              <div className='bookmark-meta'>
                {bookmark.category && (
                  <span className='bookmark-category'>
                    {bookmark.category}
                  </span>
                )}
                <span className='bookmark-date'>
                  {bookmark.dateAdded}
                </span>
              </div>

              <a
                href={bookmark.url}
                target='_blank'
                rel='noopener noreferrer'
                className='bookmark-link'
              >
                <ExternalLink size={16} />
                <span className='bookmark-url'>{bookmark.url}</span>
              </a>
            </div>
          ))}
        </div>

        {filteredBookmarks.length === 0 && !loading && (
          <div className='empty-state'>
            <Bookmark size={64} />
            <h3>No bookmarks found</h3>
            <p>
              {searchTerm || selectedCategory !== 'All'
                ? 'Try adjusting your search or filter criteria'
                : 'Add your first bookmark to get started!'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default BookmarkManager
