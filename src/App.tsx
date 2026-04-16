import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { AdminProvider } from "@/contexts/AdminContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminProtectedRoute from "@/components/admin/AdminProtectedRoute";
import { captureUTMs } from "@/lib/utm";

import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import ProductForm from "./pages/ProductForm";
import Integrations from "./pages/Integrations";
import IntegrationDetail from "./pages/IntegrationDetail";
import Settings from "./pages/Settings";
import Finances from "./pages/Finances";
import Sales from "./pages/Sales";
import Checkout from "./pages/Checkout";
import NotFound from "./pages/NotFound";
import Unsubscribe from "./pages/Unsubscribe";

import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminWithdrawals from "./pages/admin/AdminWithdrawals";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminSms from "./pages/admin/AdminSms";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => { captureUTMs(); }, []);
  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AdminProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/registro" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/redefinirsenha" element={<ResetPassword />} />
              <Route path="/checkout/:id" element={<Checkout />} />
              <Route path="/unsubscribe" element={<Unsubscribe />} />

              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/produtos" element={<ProtectedRoute><Products /></ProtectedRoute>} />
              <Route path="/vendas" element={<ProtectedRoute><Sales /></ProtectedRoute>} />
              <Route path="/produtos/novo" element={<ProtectedRoute><ProductForm /></ProtectedRoute>} />
              <Route path="/produtos/:id" element={<ProtectedRoute><ProductForm /></ProtectedRoute>} />
              <Route path="/integracoes" element={<ProtectedRoute><Integrations /></ProtectedRoute>} />
              <Route path="/integracoes/:tipo" element={<ProtectedRoute><IntegrationDetail /></ProtectedRoute>} />
              <Route path="/configuracoes" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/financas" element={<ProtectedRoute><Finances /></ProtectedRoute>} />

              {/* Admin routes */}
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin/dashboard" element={<AdminProtectedRoute><AdminDashboard /></AdminProtectedRoute>} />
              <Route path="/admin/users" element={<AdminProtectedRoute><AdminUsers /></AdminProtectedRoute>} />
              <Route path="/admin/products" element={<AdminProtectedRoute><AdminProducts /></AdminProtectedRoute>} />
              <Route path="/admin/orders" element={<AdminProtectedRoute><AdminOrders /></AdminProtectedRoute>} />
              <Route path="/admin/withdrawals" element={<AdminProtectedRoute><AdminWithdrawals /></AdminProtectedRoute>} />
              <Route path="/admin/settings" element={<AdminProtectedRoute><AdminSettings /></AdminProtectedRoute>} />
              <Route path="/admin/sms" element={<AdminProtectedRoute><AdminSms /></AdminProtectedRoute>} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </AdminProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
