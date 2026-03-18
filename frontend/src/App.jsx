import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import MapPage          from './pages/MapPage'
import PlaceDetailPage  from './pages/PlaceDetailPage'
import AdminGuard       from './components/Admin/AdminGuard'

const LoginPage      = lazy(() => import('./pages/admin/LoginPage'))
const DashboardPage  = lazy(() => import('./pages/admin/DashboardPage'))
const PlacesListPage = lazy(() => import('./pages/admin/PlacesListPage'))
const AddPlacePage   = lazy(() => import('./pages/admin/AddPlacePage'))
const EditPlacePage  = lazy(() => import('./pages/admin/EditPlacePage'))
const CategoriesPage = lazy(() => import('./pages/admin/CategoriesPage'))
const UsersPage      = lazy(() => import('./pages/admin/UsersPage'))
const TasksPage      = lazy(() => import('./pages/admin/TasksPage'))
const AnalyticsPage  = lazy(() => import('./pages/admin/AnalyticsPage'))
const ActivityPage   = lazy(() => import('./pages/admin/ActivityPage'))
const FlagsPage      = lazy(() => import('./pages/admin/FlagsPage'))
const ImportPage     = lazy(() => import('./pages/admin/ImportPage'))
const ApiKeysPage    = lazy(() => import('./pages/admin/ApiKeysPage'))
const EmbedPage      = lazy(() => import('./pages/EmbedPage'))

function AdminFallback() {
  return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<AdminFallback />}>
        <Routes>
          <Route path="/"           element={<MapPage />} />
          <Route path="/place/:id"  element={<PlaceDetailPage />} />
          <Route path="/embed"      element={<EmbedPage />} />

          <Route path="/admin/login" element={<LoginPage />} />
          <Route path="/admin" element={<AdminGuard />}>
            <Route index                  element={<DashboardPage />} />
            <Route path="places"          element={<PlacesListPage />} />
            <Route path="categories"      element={<CategoriesPage />} />
            <Route path="add"             element={<AddPlacePage />} />
            <Route path="places/:id/edit" element={<EditPlacePage />} />
            <Route path="users"           element={<UsersPage />} />
            <Route path="tasks"           element={<TasksPage />} />
            <Route path="analytics"       element={<AnalyticsPage />} />
            <Route path="activity"        element={<ActivityPage />} />
            <Route path="flags"           element={<FlagsPage />} />
            <Route path="import"          element={<ImportPage />} />
            <Route path="api-keys"        element={<ApiKeysPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
