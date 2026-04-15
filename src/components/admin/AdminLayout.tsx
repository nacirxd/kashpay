import aureonLogo from "@/assets/aureon-pay-logo.svg";
import { useNavigate, useLocation } from "react-router-dom";
import { useAdmin } from "@/contexts/AdminContext";
import {
  LayoutDashboard, Users, Package, Wallet, LogOut, Shield,
} from "lucide-react";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/admin/dashboard" },
  { icon: Users, label: "Usuários", path: "/admin/users" },
  { icon: Package, label: "Produtos", path: "/admin/products" },
  { icon: Wallet, label: "Saques", path: "/admin/withdrawals" },
];

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAdmin();

  const handleLogout = async () => {
    await logout();
    navigate("/admin/login");
  };

  return (
    <div className="flex h-screen bg-[#0f1117] text-gray-100">
      <aside className="w-64 border-r border-gray-800 bg-[#13151d] flex flex-col">
        <div className="flex h-16 items-center gap-2 px-6 border-b border-gray-800">
          <Shield className="h-6 w-6 text-emerald-500" />
          <span className="font-bold text-lg">Admin Panel</span>
        </div>
        <nav className="p-4 space-y-1 flex-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="p-4 border-t border-gray-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-gray-500 hover:text-red-400 hover:bg-gray-800 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
};

export default AdminLayout;
