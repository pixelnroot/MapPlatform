import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getPlace, updatePlace, uploadPhoto } from '../../api'
import PlaceForm from '../../components/Admin/PlaceForm'
import AdminLayout from '../../components/Admin/AdminLayout'

export default function EditPlacePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [place, setPlace] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getPlace(id)
      .then(res => setPlace(res.data.data))
      .catch(() => navigate('/admin/places'))
      .finally(() => setLoading(false))
  }, [id])

  async function handleSubmit(formData, files) {
    try {
      await updatePlace(id, formData)

      if (files && files.length > 0) {
        const fd = new FormData()
        Array.from(files).forEach(f => fd.append('photos', f))
        await uploadPhoto(id, fd)
      }

      navigate('/admin/places')
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to update place')
    }
  }

  if (loading) return <AdminLayout><div>Loading...</div></AdminLayout>
  if (!place) return null

  const API_URL = import.meta.env.VITE_API_URL

  return (
    <AdminLayout>
      <h1>Edit Place</h1>
      {error && <div className="error-msg">{error}</div>}

      {place.photos?.length > 0 && (
        <div className="detail-photos" style={{ marginBottom: '1.5rem' }}>
          <h3>Existing Photos</h3>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {place.photos.map(photo => (
              <img
                key={photo.id}
                src={`${API_URL}/uploads/${photo.filename}`}
                alt={photo.caption || place.name}
                style={{ width: '120px', height: '90px', objectFit: 'cover', borderRadius: '6px' }}
              />
            ))}
          </div>
        </div>
      )}

      <PlaceForm initialData={place} onSubmit={handleSubmit} />
    </AdminLayout>
  )
}
