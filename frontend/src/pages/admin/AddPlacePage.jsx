import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createPlace, uploadPhoto } from '../../api'
import { enqueue, isOnline } from '../../utils/offlineQueue'
import PlaceForm from '../../components/Admin/PlaceForm'
import AdminLayout from '../../components/Admin/AdminLayout'
import OfflineIndicator from '../../components/Admin/OfflineIndicator'

export default function AddPlacePage() {
  const navigate = useNavigate()
  const [error, setError] = useState('')

  async function handleSubmit(formData, files) {
    try {
      if (!isOnline()) {
        // Queue for later sync
        await enqueue({ type: 'createPlace', data: formData })
        alert('You are offline. Place has been queued and will sync when back online.')
        navigate('/admin/places')
        return
      }

      const res = await createPlace(formData)
      const placeId = res.data.data.id

      if (files && files.length > 0) {
        const fd = new FormData()
        Array.from(files).forEach(f => fd.append('photos', f))
        await uploadPhoto(placeId, fd)
      }

      navigate('/admin/places')
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to save place')
    }
  }

  return (
    <AdminLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Add New Place</h1>
        <OfflineIndicator />
      </div>
      {error && <div className="error-msg">{error}</div>}
      <PlaceForm initialData={{}} onSubmit={handleSubmit} />
    </AdminLayout>
  )
}
