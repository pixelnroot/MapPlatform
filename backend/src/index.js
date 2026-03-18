const express = require('express')
const cors    = require('cors')
const path    = require('path')
require('dotenv').config()

const app = express()

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Serve uploaded photos as static files
app.use('/uploads', express.static(
  path.resolve(process.env.UPLOADS_DIR || './uploads')
))

// Routes
app.use('/api/auth',       require('./routes/auth'))
app.use('/api/regions',    require('./routes/regions'))
app.use('/api/categories', require('./routes/categories'))
app.use('/api/places',     require('./routes/places'))
app.use('/api/roads',      require('./routes/roads'))
app.use('/api/search',     require('./routes/search'))
app.use('/api/admin',      require('./routes/admin'))
app.use('/api/users',      require('./routes/users'))
app.use('/api/analytics',  require('./routes/analytics'))
app.use('/api/export',     require('./routes/export'))
app.use('/api/import',     require('./routes/import'))
app.use('/api/terrain',    require('./routes/terrain'))
app.use('/api/landuse',    require('./routes/landuse'))
app.use('/api/tasks',      require('./routes/tasks'))
app.use('/api/flags',      require('./routes/flags'))
app.use('/api/api-keys',   require('./routes/apiKeys'))

// Global error handler
app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ success: false, error: err.message || 'Server error' })
})

const PORT = process.env.PORT || 5000
const runMigrations = require('./db/migrate')

runMigrations()
  .then(() => {
    app.listen(PORT, () => console.log(`API running on port ${PORT}`))
  })
  .catch(err => {
    console.error('Migration failed, starting anyway:', err.message)
    app.listen(PORT, () => console.log(`API running on port ${PORT}`))
  })
