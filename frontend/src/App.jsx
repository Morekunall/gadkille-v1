import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { UiProvider } from './context/UiContext';
import Layout from './components/layout/Layout';
import AdminLayout from './components/layout/AdminLayout';
import HomePage from './pages/HomePage';
import FortDetailsPage from './pages/FortDetailsPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import VerifyEmailPage from './pages/auth/VerifyEmailPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import CompleteProfilePage from './pages/auth/CompleteProfilePage';
import UserDashboardPage from './pages/dashboard/UserDashboardPage';
import AdminDashboardPage from './pages/dashboard/AdminDashboardPage';
import ProtectedRoute from './components/routing/ProtectedRoute';
import ExplorePage from './pages/ExplorePage';
import PlanTripPage from './pages/PlanTripPage';
import ContactPage from './pages/ContactPage';

function App() {
  return (
    <AuthProvider>
      <UiProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/explore" element={<ExplorePage />} />
              <Route path="/plan-trip" element={<PlanTripPage />} />
              <Route path="/group-tours" element={<Navigate to="/plan-trip" replace />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/fort/:slug" element={<FortDetailsPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/verify-email" element={<VerifyEmailPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/complete-profile" element={<CompleteProfilePage />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <UserDashboardPage />
                  </ProtectedRoute>
                }
              />
            </Route>

            <Route
              element={
                <ProtectedRoute adminOnly>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/admin" element={<AdminDashboardPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </UiProvider>
    </AuthProvider>
  );
}

export default App;
