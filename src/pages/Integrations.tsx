import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { motion } from "framer-motion";
import { Facebook, BarChart3, Webhook, Tag } from "lucide-react";

const integrationTypes = [
  { tipo: "meta_ads", label: "Meta Ads", desc: "Facebook Pixel & Conversion API", icon: Facebook, path: "/integracoes/meta" },
  { tipo: "gtm", label: "Google Tag Manager", desc: "Tags e eventos centralizados", icon: Tag, path: "/integracoes/gtm" },
  { tipo: "utmify", label: "UTMify", desc: "Rastreamento de UTMs e campanhas", icon: BarChart3, path: "/integracoes/utmify" },
  { tipo: "webhook", label: "Webhook", desc: "Envie eventos para URLs externas", icon: Webhook, path: "/integracoes/webhook" },
];

const Integrations = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeMap, setActiveMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!user) return;
    supabase.from("integrations").select("tipo, ativo").eq("user_id", user.id).then(({ data }) => {
      const map: Record<string, boolean> = {};
      (data || []).forEach((d) => { map[d.tipo] = d.ativo; });
      setActiveMap(map);
    });
  }, [user]);

  return (
    <DashboardLayout>
      <h1 className="text-lg font-semibold mb-6">Integrações</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {integrationTypes.map((item, i) => (
          <motion.button
            key={item.tipo}
            onClick={() => navigate(item.path)}
            className="rounded-xl border border-border/50 bg-card p-6 shadow-soft text-left hover:border-primary/30 transition-colors"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <item.icon className="h-5 w-5" />
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${activeMap[item.tipo] ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                {activeMap[item.tipo] ? "Ativo" : "Inativo"}
              </span>
            </div>
            <h3 className="font-semibold mb-1">{item.label}</h3>
            <p className="text-sm text-muted-foreground">{item.desc}</p>
          </motion.button>
        ))}
      </div>
    </DashboardLayout>
  );
};

export default Integrations;
