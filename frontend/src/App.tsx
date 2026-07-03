import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { Layout } from './components/Layout'
import { AdminRoute, ProtectedRoute } from './components/ProtectedRoute'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { CatalogPage } from './pages/CatalogPage'
import { CredentialsPage } from './pages/CredentialsPage'
import { ProposalsPage } from './pages/ProposalsPage'
import { ProposalNewPage } from './pages/ProposalNewPage'
import { MyRunsPage } from './pages/MyRunsPage'
import { RunScriptPage } from './pages/RunScriptPage'
import { RunDetailPage } from './pages/RunDetailPage'
import { AdminReviewPage } from './pages/AdminReviewPage'
import { AdminAuditPage } from './pages/AdminAuditPage'
import { AdminScriptsPage } from './pages/AdminScriptsPage'
import { NotificationsPage } from './pages/NotificationsPage'

const queryClient = new QueryClient()

export default function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="catalog" element={<CatalogPage />} />
              <Route path="catalog/:scriptId/run" element={<RunScriptPage />} />
              <Route path="credentials" element={<CredentialsPage />} />
              <Route path="proposals" element={<ProposalsPage />} />
              <Route path="proposals/new" element={<ProposalNewPage />} />
              <Route path="runs" element={<MyRunsPage />} />
              <Route path="runs/:runId" element={<RunDetailPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route
                path="admin/review"
                element={
                  <AdminRoute>
                    <AdminReviewPage />
                  </AdminRoute>
                }
              />
              <Route
                path="admin/scripts"
                element={
                  <AdminRoute>
                    <AdminScriptsPage />
                  </AdminRoute>
                }
              />
              <Route
                path="admin/audit"
                element={
                  <AdminRoute>
                    <AdminAuditPage />
                  </AdminRoute>
                }
              />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
