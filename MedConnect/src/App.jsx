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
import PharmacyLayout from './components/PharmacyLayout';
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
        <ProtectedRoute requiredType="PATIENT"><UserDashboard /></ProtectedRoute>
      } />
      <Route path="/new-quote" element={
        <ProtectedRoute requiredType="PATIENT"><NewQuote /></ProtectedRoute>
      } />
      <Route path="/quote-offers" element={
        <ProtectedRoute requiredType="PATIENT"><QuoteOffers /></ProtectedRoute>
      } />
      <Route path="/order/:id" element={
        <ProtectedRoute requiredType="PATIENT"><OrderTracking /></ProtectedRoute>
      } />
      <Route path="/orders" element={
        <ProtectedRoute requiredType="PATIENT"><Orders /></ProtectedRoute>
      } />
      <Route path="/review/:id" element={
        <ProtectedRoute requiredType="PATIENT"><Review /></ProtectedRoute>
      } />

      {/* Pharmacy routes */}
      <Route path="/pharmacy" element={
        <ProtectedRoute requiredType="PHARMACY"><PharmacyLayout /></ProtectedRoute>
      }>
        <Route index element={<PharmacyDashboard />} />
        <Route path="requests" element={<Requests />} />
        <Route path="send-quote/:id" element={<SendQuote />} />
        <Route path="orders" element={<OrderManagement />} />
        <Route path="reviews" element={<Reviews />} />
      </Route>

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
