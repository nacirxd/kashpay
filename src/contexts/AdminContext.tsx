import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AdminContextType {
  sessionToken: string | null;
  loading: boolean;
  login: (key: string, totpCode: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  adminFetch: (action: string, body?: Record<string, unknown>) => Promise<any>;
}

const AdminContext = createContext<AdminContextType>({
  sessionToken: null,
  loading: true,
  login: async () => ({}),
  logout: async () => {},
  adminFetch: async () => null,
});

export const useAdmin = () => useContext(AdminContext);

export const AdminProvider = ({ children }: { children: ReactNode }) => {
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("admin_session_token");
    if (stored) {
      setSessionToken(stored);
    }
    setLoading(false);
  }, []);

  const adminFetch = async (action: string, body: Record<string, unknown> = {}) => {
    const token = sessionToken || localStorage.getItem("admin_session_token");
    const { data, error } = await supabase.functions.invoke("admin-auth", {
      body: { action, session_token: token, ...body },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const login = async (key: string, totpCode: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("admin-auth", {
        body: { action: "login", access_key: key, totp_code: totpCode },
      });
      if (error) return { error: error.message };
      if (data?.error) return { error: data.error };
      const token = data.session_token;
      localStorage.setItem("admin_session_token", token);
      setSessionToken(token);
      return {};
    } catch (e: any) {
      return { error: e.message };
    }
  };

  const logout = async () => {
    try {
      await adminFetch("logout");
    } catch {}
    localStorage.removeItem("admin_session_token");
    setSessionToken(null);
  };

  return (
    <AdminContext.Provider value={{ sessionToken, loading, login, logout, adminFetch }}>
      {children}
    </AdminContext.Provider>
  );
};
