import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { MotionConfig } from 'motion/react';
import { AnimateUIProvider } from '@animate-ui/react/provider';
import { queryClient, setupSocketQueryInvalidation } from './lib/queryClient';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider, useAuth, homeFor } from './context/AuthContext';
import { TooltipProvider } from './components/ui/tooltip';
import PublicLayout from './components/layout/PublicLayout';
import AppShell from './components/layout/AppShell';
import LoadingState from './components/LoadingState';
import { Analytics } from '@vercel/analytics/react';
import { stripSensitiveUrlParts } from './lib/analytics';

// Vercel Web Analytics só no build da Vercel: em outros hosts (GitHub Pages, dev) o script /_vercel/insights não existe
const vercelAnalyticsEnabled = import.meta.env.VITE_VERCEL_ANALYTICS === 'true';

// Público
const Welcome = lazy(() => import('./pages/Welcome'));
const Pharmacies = lazy(() => import('./pages/public/Pharmacies'));
const Help = lazy(() => import('./pages/public/Help'));
const NotFound = lazy(() => import('./pages/public/NotFound'));
const PrivacyPolicy = lazy(() => import('./pages/legal/PrivacyPolicy'));
const TermsOfUse = lazy(() => import('./pages/legal/TermsOfUse'));
const PharmacyTerms = lazy(() => import('./pages/legal/PharmacyTerms'));

// Autenticação
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'));
const VerifyEmail = lazy(() => import('./pages/auth/VerifyEmail'));

// Compartilhadas (áreas logadas)
const NotificationsPage = lazy(() => import('./pages/shared/NotificationsPage'));
const SupportPage = lazy(() => import('./pages/shared/SupportPage'));

// Paciente
const UserDashboard = lazy(() => import('./pages/user/Dashboard'));
const NewQuote = lazy(() => import('./pages/user/NewQuote'));
const QuoteOffers = lazy(() => import('./pages/user/QuoteOffers'));
const OrderTracking = lazy(() => import('./pages/user/OrderTracking'));
const Orders = lazy(() => import('./pages/user/Orders'));
const Review = lazy(() => import('./pages/user/Review'));
const Profile = lazy(() => import('./pages/Profile'));
const PrivacyCenter = lazy(() => import('./pages/user/PrivacyCenter'));

// Farmácia
const PharmacyDashboard = lazy(() => import('./pages/pharmacy/Dashboard'));
const Requests = lazy(() => import('./pages/pharmacy/Requests'));
const SendQuote = lazy(() => import('./pages/pharmacy/SendQuote'));
const OrderManagement = lazy(() => import('./pages/pharmacy/OrderManagement'));
const Reviews = lazy(() => import('./pages/pharmacy/Reviews'));
const PharmacySettings = lazy(() => import('./pages/pharmacy/Settings'));

// Administração
const AdminOverview = lazy(() => import('./pages/admin/Overview'));
const AdminPharmacies = lazy(() => import('./pages/admin/Pharmacies'));
const AdminUsers = lazy(() => import('./pages/admin/Users'));
const AdminOrders = lazy(() => import('./pages/admin/Orders'));
const AdminPrescriptions = lazy(() => import('./pages/admin/Prescriptions'));
const AdminSupportTickets = lazy(() => import('./pages/admin/SupportTickets'));
const AdminAuditLogs = lazy(() => import('./pages/admin/AuditLogs'));
const AdminPilotMetrics = lazy(() => import('./pages/admin/PilotMetrics'));
const AdminAccount = lazy(() => import('./pages/admin/Account'));

function ProtectedRoute({ children, requiredType }) {
  const { isAuthenticated, userType } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (requiredType && userType !== requiredType) return <Navigate to={homeFor(userType)} replace />;
  return children;
}

function PageFallback() {
  return (
    <div className="container-page py-10">
      <LoadingState variant="detail" message="Carregando página..." />
    </div>
  );
}

function AppRoutes() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        {/* Site público */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Welcome />} />
          <Route path="/pharmacies" element={<Pharmacies />} />
          <Route path="/help" element={<Help />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfUse />} />
          <Route path="/pharmacy-terms" element={<PharmacyTerms />} />
        </Route>

        {/* Autenticação (layout próprio) */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-email" element={<VerifyEmail />} />

        {/* Paciente */}
        <Route element={<ProtectedRoute requiredType="PATIENT"><AppShell role="PATIENT" /></ProtectedRoute>}>
          <Route path="/dashboard" element={<UserDashboard />} />
          <Route path="/new-quote" element={<NewQuote />} />
          <Route path="/quote-offers" element={<QuoteOffers />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/order/:id" element={<OrderTracking />} />
          <Route path="/review/:id" element={<Review />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/privacy-center" element={<PrivacyCenter />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/support" element={<SupportPage />} />
        </Route>

        {/* Farmácia */}
        <Route path="/pharmacy" element={<ProtectedRoute requiredType="PHARMACY"><AppShell role="PHARMACY" /></ProtectedRoute>}>
          <Route index element={<PharmacyDashboard />} />
          <Route path="requests" element={<Requests />} />
          <Route path="send-quote/:id" element={<SendQuote />} />
          <Route path="orders" element={<OrderManagement />} />
          <Route path="reviews" element={<Reviews />} />
          <Route path="settings" element={<PharmacySettings />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="support" element={<SupportPage />} />
        </Route>

        {/* Administração */}
        <Route path="/admin" element={<ProtectedRoute requiredType="ADMIN"><AppShell role="ADMIN" /></ProtectedRoute>}>
          <Route index element={<AdminOverview />} />
          <Route path="pharmacies" element={<AdminPharmacies />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="prescriptions" element={<AdminPrescriptions />} />
          <Route path="support" element={<AdminSupportTickets />} />
          <Route path="audit" element={<AdminAuditLogs />} />
          <Route path="metrics" element={<AdminPilotMetrics />} />
          <Route path="account" element={<AdminAccount />} />
        </Route>

        {/* Rotas antigas */}
        <Route path="/admin-dashboard" element={<Navigate to="/admin" replace />} />

        {/* 404 */}
        <Route element={<PublicLayout showMobileCta={false} />}>
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

export default function App() {
  useEffect(() => {
    setupSocketQueryInvalidation();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <MotionConfig reducedMotion="user">
        <AnimateUIProvider>
          <TooltipProvider delayDuration={250}>
            <ToastProvider>
              <BrowserRouter basename={import.meta.env.BASE_URL}>
                <AuthProvider>
                  <AppRoutes />
                </AuthProvider>
              </BrowserRouter>
              {vercelAnalyticsEnabled && <Analytics beforeSend={stripSensitiveUrlParts} />}
            </ToastProvider>
          </TooltipProvider>
        </AnimateUIProvider>
      </MotionConfig>
    </QueryClientProvider>
  );
}
