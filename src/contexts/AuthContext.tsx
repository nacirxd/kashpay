import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ensured = new Set<string>();
    const apply = (next: Session | null) => {
      setSession((prev) => (prev?.access_token === next?.access_token ? prev : next));
      setUser((prev) => (prev?.id && prev.id === next?.user?.id ? prev : next?.user ?? null));
      setLoading(false);
      const u = next?.user;
      if (u && !ensured.has(u.id)) {
        ensured.add(u.id);
        setTimeout(async () => {
          const { data } = await supabase.from("profiles").select("id").eq("user_id", u.id).maybeSingle();
          if (!data) {
            await supabase.from("profiles").insert({
              user_id: u.id,
              nome: (u.user_metadata as any)?.nome || "",
              email: u.email || "",
            });
          }
        }, 0);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      apply(session);
    });

    supabase.auth.getSession().then(({ data: { session } }) => apply(session));

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
