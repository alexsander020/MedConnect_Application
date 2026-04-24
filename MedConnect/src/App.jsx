import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Pages
import Welcome from './pages/Welcome';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';

// User pages
import UserDashboard from './pages/user/Dashboard';
import NewQuote from './pages/user/NewQuote';
import QuoteOffers from './pages/user/QuoteOffers';
import OrderTracking from './pages/user/OrderTracking';
import Orders from './pages/user/Orders';
import Review from './pages/user/Review';

// Pharmacy pages
import PharmacyDashboard from './pages/pharmacy/Dashboard';
import Requests from './pages/pharmacy/Requests';
import SendQuote from './pages/pharmacy/SendQuote';
import OrderManagement from './pages/pharmacy/OrderManagement';
import Reviews from './pages/pharmacy/Reviews';

function ProtectedRoute({ children, requiredType }) {
  const { isAuthenticated, userType } = useAuth();
  if (!isAuthenticated) return <Navigate to="/" replace />;
  if (requiredType && userType !== requiredType) return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Welcome />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* User routes */}
      <Route path="/dashboard" element={
        <ProtectedRoute requiredType="user"><UserDashboard /></ProtectedRoute>
      } />
      <Route path="/new-quote" element={
        <ProtectedRoute requiredType="user"><NewQuote /></ProtectedRoute>
      } />
      <Route path="/quote-offers" element={
        <ProtectedRoute requiredType="user"><QuoteOffers /></ProtectedRoute>
      } />
      <Route path="/order/:id" element={
        <ProtectedRoute requiredType="user"><OrderTracking /></ProtectedRoute>
      } />
      <Route path="/orders" element={
        <ProtectedRoute requiredType="user"><Orders /></ProtectedRoute>
      } />
      <Route path="/review/:id" element={
        <ProtectedRoute requiredType="user"><Review /></ProtectedRoute>
      } />

      {/* Pharmacy routes */}
      <Route path="/pharmacy" element={
        <ProtectedRoute requiredType="pharmacy"><PharmacyDashboard /></ProtectedRoute>
      } />
      <Route path="/pharmacy/requests" element={
        <ProtectedRoute requiredType="pharmacy"><Requests /></ProtectedRoute>
      } />
      <Route path="/pharmacy/send-quote/:id" element={
        <ProtectedRoute requiredType="pharmacy"><SendQuote /></ProtectedRoute>
      } />
      <Route path="/pharmacy/orders" element={
        <ProtectedRoute requiredType="pharmacy"><OrderManagement /></ProtectedRoute>
      } />
      <Route path="/pharmacy/reviews" element={
        <ProtectedRoute requiredType="pharmacy"><Reviews /></ProtectedRoute>
      } />

      {/* Shared */}
      <Route path="/profile" element={
        <ProtectedRoute><Profile /></ProtectedRoute>
      } />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
