import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";

import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import ProductForm from "./pages/ProductForm";
import Integrations from "./pages/Integrations";
import IntegrationDetail from "./pages/IntegrationDetail";
import Settings from "./pages/Settings";
import Finances from "./pages/Finances";
import Checkout from "./pages/Checkout";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/registro" element={<Register />} />
            <Route path="/checkout/:id" element={<Checkout />} />

            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/produtos" element={<ProtectedRoute><Products /></ProtectedRoute>} />
            <Route path="/produtos/novo" element={<ProtectedRoute><ProductForm /></ProtectedRoute>} />
            <Route path="/produtos/:id" element={<ProtectedRoute><ProductForm /></ProtectedRoute>} />
            <Route path="/integracoes" element={<ProtectedRoute><Integrations /></ProtectedRoute>} />
            <Route path="/integracoes/:tipo" element={<ProtectedRoute><IntegrationDetail /></ProtectedRoute>} />
            <Route path="/configuracoes" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/financas" element={<ProtectedRoute><Finances /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
