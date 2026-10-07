import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import PendingApproval from "@/pages/PendingApproval";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const [status, setStatus] = useState<string | null>(null);
  const [statusFor, setStatusFor] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    // Usa o último estado conhecido para entrar logo, sem ecrã de espera
    try {
      const cached = localStorage.getItem(`kp_status_${user.id}`);
      if (cached) { setStatus(cached); setStatusFor(user.id); }
    } catch { /* ignore */ }
    const load = async (attempt = 0) => {
      const { data, error } = await supabase
        .from("profiles")
        .select("status")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (error && attempt < 2) { setTimeout(() => load(attempt + 1), 800); return; }
      const s = (data?.status as string) || "pending";
      try { localStorage.setItem(`kp_status_${user.id}`, s); } catch { /* ignore */ }
      setStatus(s);
      setStatusFor(user.id);
    };
    load();
    return () => { cancelled = true; };
  }, [user?.id]);

  if (loading || (user && statusFor !== user.id)) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (status !== "active") {
    return <PendingApproval status={status || "pending"} />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
