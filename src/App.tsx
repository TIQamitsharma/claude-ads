import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './pages/auth/ProtectedRoute'
import PublicRoute from './pages/auth/PublicRoute'
import AppLayout from './components/layout/AppLayout'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/auth/LoginPage'
import SignupPage from './pages/auth/SignupPage'
import ResetPasswordPage from './pages/auth/ResetPasswordPage'
import DashboardPage from './pages/DashboardPage'
import IntegrationsPage from './pages/IntegrationsPage'
import AuditPage from './pages/AuditPage'
import ResultsPage from './pages/ResultsPage'
import ResultDetailPage from './pages/ResultDetailPage'
import BrandDNAPage from './pages/BrandDNAPage'
import SettingsPage from './pages/SettingsPage'
import GoogleOAuthCallbackPage from './pages/GoogleOAuthCallbackPage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public marketing page — redirect to dashboard if logged in */}
          <Route path="/" element={<PublicRoute><LandingPage /></PublicRoute>} />

          {/* Auth routes — redirect to dashboard if already logged in */}
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/signup" element={<PublicRoute><SignupPage /></PublicRoute>} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/auth/google/callback" element={<GoogleOAuthCallbackPage />} />

          {/* Protected app */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="integrations" element={<IntegrationsPage />} />
            <Route path="audit" element={<AuditPage />} />
            <Route path="results" element={<ResultsPage />} />
            <Route path="results/:id" element={<ResultDetailPage />} />
            <Route path="brand-dna" element={<BrandDNAPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
