import { useMemo } from "react";
import { Progress } from "@/components/ui/progress";
import { Trophy } from "lucide-react";

const TIERS = [
  { label: "Bronze", min: 0, max: 100_000, color: "text-amber-700", bg: "bg-amber-100", icon: "🥉" },
  { label: "Prata", min: 100_000, max: 500_000, color: "text-slate-500", bg: "bg-slate-100", icon: "🥈" },
  { label: "Ouro", min: 500_000, max: 1_000_000, color: "text-yellow-500", bg: "bg-yellow-100", icon: "🥇" },
  { label: "Diamante", min: 1_000_000, max: 5_000_000, color: "text-cyan-500", bg: "bg-cyan-100", icon: "💎" },
  { label: "Elite", min: 5_000_000, max: 10_000_000, color: "text-purple-500", bg: "bg-purple-100", icon: "👑" },
];

function formatTierValue(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(0)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
  return v.toString();
}

interface Props {
  userName: string;
  totalRevenue: number;
}

const UserProgressHeader = ({ userName, totalRevenue }: Props) => {
  const { tier, progress } = useMemo(() => {
    const t = TIERS.find((t) => totalRevenue < t.max) || TIERS[TIERS.length - 1];
    const range = t.max - t.min;
    const prog = Math.min(((totalRevenue - t.min) / range) * 100, 100);
    return { tier: t, progress: Math.max(prog, 0) };
  }, [totalRevenue]);

  const firstName = userName?.split(" ")[0] || "usuário";

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 rounded-xl border border-border/50 bg-card p-5 shadow-soft">
      <h2 className="text-lg font-semibold">
        Olá, <span className="capitalize">{firstName}</span>
      </h2>

      <div className="flex items-center gap-3">
        <div className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${tier.bg} ${tier.color}`}>
          <span className="text-base">{tier.icon}</span>
          {tier.label}
          <span className="font-normal opacity-70">
            MT {formatTierValue(tier.min)} – {formatTierValue(tier.max)}
          </span>
        </div>
        <div className="w-32">
          <Progress value={progress} className="h-2" />
        </div>
        <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm uppercase">
          {firstName.slice(0, 2)}
        </div>
      </div>
    </div>
  );
};

export default UserProgressHeader;
