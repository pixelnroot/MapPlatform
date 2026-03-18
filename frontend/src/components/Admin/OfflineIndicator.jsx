import { useState, useEffect } from 'react'
import { getAll, syncQueue } from '../../utils/offlineQueue'
import { createPlace } from '../../api'

export default function OfflineIndicator() {
  const [online, setOnline] = useState(navigator.onLine)
  const [queueCount, setQueueCount] = useState(0)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    function handleOnline() {
      setOnline(true)
      doSync()
    }
    function handleOffline() { setOnline(false) }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    checkQueue()

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  async function checkQueue() {
    const items = await getAll()
    setQueueCount(items.length)
  }

  async function doSync() {
    setSyncing(true)
    const synced = await syncQueue(createPlace)
    setSyncing(false)
    checkQueue()
    if (synced > 0) alert(`Synced ${synced} offline places`)
  }

  if (online && queueCount === 0) return null

  return (
    <div style={{
      padding: '.4rem .8rem',
      fontSize: '.75rem',
      textTransform: 'uppercase',
      letterSpacing: '.08em',
      background: online ? 'rgba(0,255,157,.1)' : 'rgba(255,45,111,.1)',
      color: online ? 'var(--neon-green)' : 'var(--neon-pink)',
      border: `1px solid ${online ? 'rgba(0,255,157,.3)' : 'rgba(255,45,111,.3)'}`,
      borderRadius: '2px'
    }}>
      {!online && 'OFFLINE'}
      {online && syncing && 'SYNCING...'}
      {online && !syncing && queueCount > 0 && (
        <span>{queueCount} queued <button onClick={doSync} style={{ color: 'inherit', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Sync Now</button></span>
      )}
    </div>
  )
}
