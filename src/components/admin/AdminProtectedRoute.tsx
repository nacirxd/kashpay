import { useAdmin } from "@/contexts/AdminContext";
import { Navigate } from "react-router-dom";

const AdminProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { sessionToken, loading } = useAdmin();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0f1117]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  if (!sessionToken) {
    return <Navigate to="/almanaque/login" replace />;
  }

  return <>{children}</>;
};

export default AdminProtectedRoute;
