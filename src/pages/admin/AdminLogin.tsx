import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAdmin } from "@/contexts/AdminContext";
import { Shield, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

const AdminLogin = () => {
  const navigate = useNavigate();
  const { login } = useAdmin();
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim()) return;
    setLoading(true);
    const result = await login(key.trim());
    setLoading(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      navigate("/admin/dashboard");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0f1117] px-4">
      <motion.div
        className="w-full max-w-sm rounded-2xl border border-gray-800 bg-[#13151d] p-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-500/10">
            <Shield className="h-7 w-7 text-emerald-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-100">Painel Administrativo</h1>
          <p className="mt-2 text-sm text-gray-500">Insira a chave de acesso</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="password"
              placeholder="Chave de acesso"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800/50 py-3 pl-10 pr-4 text-sm text-gray-100 placeholder-gray-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
          >
            {loading ? (
              <div className="mx-auto h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              "Entrar"
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default AdminLogin;
