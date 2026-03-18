const fs = require('fs')
const path = require('path')
const db = require('./index')

async function runMigrations() {
  const dir = path.join(__dirname, 'migrations')
  if (!fs.existsSync(dir)) {
    console.log('[migrate] No migrations directory found, skipping')
    return
  }

  const files = fs.readdirSync(dir)
    .filter(f => f.endsWith('.sql'))
    .sort()

  if (!files.length) {
    console.log('[migrate] No migration files found')
    return
  }

  for (const file of files) {
    const sql = fs.readFileSync(path.join(dir, file), 'utf8')
    try {
      await db.query(sql)
      console.log(`[migrate] Applied ${file}`)
    } catch (err) {
      // Ignore "already exists" errors since migrations use IF NOT EXISTS
      if (err.code === '42710' || err.code === '42P07' || err.message.includes('already exists')) {
        console.log(`[migrate] ${file} (already applied)`)
      } else {
        console.error(`[migrate] Failed ${file}:`, err.message)
        throw err
      }
    }
  }
  console.log('[migrate] All migrations complete')
}

module.exports = runMigrations
