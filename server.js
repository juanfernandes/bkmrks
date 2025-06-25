const express = require('express')
const fs = require('fs').promises
const path = require('path')
const cors = require('cors')

const app = express()
const PORT = process.env.PORT || 3001
const BOOKMARKS_FILE = path.join(__dirname, 'bookmarks.json')

// Middleware
app.use(cors())
app.use(express.json())

// Initialize bookmarks file with default data if it doesn't exist
const initializeBookmarksFile = async () => {
  try {
    await fs.access(BOOKMARKS_FILE)
  } catch (error) {
    // File doesn't exist, create it with default bookmarks
    const defaultBookmarks = [
      {
        id: 1,
        title: 'React Documentation',
        url: 'https://react.dev',
        category: 'Development',
        description: 'Official React documentation and guides',
        dateAdded: new Date().toISOString().split('T')[0]
      },
      {
        id: 2,
        title: 'MDN Web Docs',
        url: 'https://developer.mozilla.org',
        category: 'Development',
        description: 'Web development resources and references',
        dateAdded: new Date().toISOString().split('T')[0]
      },
      {
        id: 3,
        title: 'GitHub',
        url: 'https://github.com',
        category: 'Tools',
        description: 'Code hosting and collaboration platform',
        dateAdded: new Date().toISOString().split('T')[0]
      }
    ]

    await fs.writeFile(BOOKMARKS_FILE, JSON.stringify(defaultBookmarks, null, 2))
    console.log('Created bookmarks.json with default data')
  }
}

// Read bookmarks from file
const readBookmarks = async () => {
  try {
    const data = await fs.readFile(BOOKMARKS_FILE, 'utf8')
    return JSON.parse(data)
  } catch (error) {
    console.error('Error reading bookmarks:', error)
    return []
  }
}

// Write bookmarks to file
const writeBookmarks = async (bookmarks) => {
  try {
    await fs.writeFile(BOOKMARKS_FILE, JSON.stringify(bookmarks, null, 2))
    return true
  } catch (error) {
    console.error('Error writing bookmarks:', error)
    return false
  }
}

// Routes

// GET /api/bookmarks - Get all bookmarks
app.get('/api/bookmarks', async (req, res) => {
  try {
    const bookmarks = await readBookmarks()
    res.json(bookmarks)
  } catch (error) {
    res.status(500).json({ error: 'Failed to read bookmarks' })
  }
})

// POST /api/bookmarks - Add a new bookmark
app.post('/api/bookmarks', async (req, res) => {
  try {
    const { title, url, category, description } = req.body

    if (!title || !url) {
      return res.status(400).json({ error: 'Title and URL are required' })
    }

    const bookmarks = await readBookmarks()
    const newBookmark = {
      id: Date.now(),
      title,
      url,
      category: category || '',
      description: description || '',
      dateAdded: new Date().toISOString().split('T')[0]
    }

    bookmarks.push(newBookmark)
    const success = await writeBookmarks(bookmarks)

    if (success) {
      res.status(201).json(newBookmark)
    } else {
      res.status(500).json({ error: 'Failed to save bookmark' })
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to add bookmark' })
  }
})

// PUT /api/bookmarks/:id - Update a bookmark
app.put('/api/bookmarks/:id', async (req, res) => {
  try {
    const bookmarkId = parseInt(req.params.id)
    const { title, url, category, description } = req.body

    if (!title || !url) {
      return res.status(400).json({ error: 'Title and URL are required' })
    }

    const bookmarks = await readBookmarks()
    const bookmarkIndex = bookmarks.findIndex(b => b.id === bookmarkId)

    if (bookmarkIndex === -1) {
      return res.status(404).json({ error: 'Bookmark not found' })
    }

    bookmarks[bookmarkIndex] = {
      ...bookmarks[bookmarkIndex],
      title,
      url,
      category: category || '',
      description: description || ''
    }

    const success = await writeBookmarks(bookmarks)

    if (success) {
      res.json(bookmarks[bookmarkIndex])
    } else {
      res.status(500).json({ error: 'Failed to update bookmark' })
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to update bookmark' })
  }
})

// DELETE /api/bookmarks/:id - Delete a bookmark
app.delete('/api/bookmarks/:id', async (req, res) => {
  try {
    const bookmarkId = parseInt(req.params.id)
    const bookmarks = await readBookmarks()
    const filteredBookmarks = bookmarks.filter(b => b.id !== bookmarkId)

    if (filteredBookmarks.length === bookmarks.length) {
      return res.status(404).json({ error: 'Bookmark not found' })
    }

    const success = await writeBookmarks(filteredBookmarks)

    if (success) {
      res.json({ message: 'Bookmark deleted successfully' })
    } else {
      res.status(500).json({ error: 'Failed to delete bookmark' })
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete bookmark' })
  }
})

// DELETE /api/bookmarks - Clear all bookmarks
app.delete('/api/bookmarks', async (req, res) => {
  try {
    const success = await writeBookmarks([])

    if (success) {
      res.json({ message: 'All bookmarks cleared successfully' })
    } else {
      res.status(500).json({ error: 'Failed to clear bookmarks' })
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear bookmarks' })
  }
})

// POST /api/bookmarks/import - Import bookmarks
app.post('/api/bookmarks/import', async (req, res) => {
  try {
    const { bookmarks: importedBookmarks } = req.body

    if (!Array.isArray(importedBookmarks)) {
      return res.status(400).json({ error: 'Invalid bookmarks format' })
    }

    const currentBookmarks = await readBookmarks()

    // Add unique IDs to imported bookmarks to avoid conflicts
    const bookmarksWithNewIds = importedBookmarks.map(bookmark => ({
      ...bookmark,
      id: Date.now() + Math.random()
    }))

    const allBookmarks = [...currentBookmarks, ...bookmarksWithNewIds]
    const success = await writeBookmarks(allBookmarks)

    if (success) {
      res.json({
        message: `Successfully imported ${importedBookmarks.length} bookmarks`,
        count: importedBookmarks.length
      })
    } else {
      res.status(500).json({ error: 'Failed to import bookmarks' })
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to import bookmarks' })
  }
})

// GET /api/bookmarks/export - Export bookmarks
app.get('/api/bookmarks/export', async (req, res) => {
  try {
    const bookmarks = await readBookmarks()
    const fileName = `bookmarks-${new Date().toISOString().split('T')[0]}.json`

    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`)
    res.setHeader('Content-Type', 'application/json')
    res.json(bookmarks)
  } catch (error) {
    res.status(500).json({ error: 'Failed to export bookmarks' })
  }
})

// Initialize and start server
const startServer = async () => {
  await initializeBookmarksFile()

  app.listen(PORT, () => {
    console.log(`Bookmark server running on http://localhost:${PORT}`)
    console.log(`Bookmarks file: ${BOOKMARKS_FILE}`)
  })
}

startServer().catch(console.error)
