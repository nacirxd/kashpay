import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import PendingApproval from "@/pages/PendingApproval";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const [status, setStatus] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setStatus(null);
      setStatusLoading(false);
      return;
    }
    let cancelled = false;
    supabase
      .from("profiles")
      .select("status")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setStatus((data?.status as string) || "pending");
        setStatusLoading(false);
      });
    return () => { cancelled = true; };
  }, [user?.id]);

  if (loading || (user && statusLoading && status === null)) {
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
