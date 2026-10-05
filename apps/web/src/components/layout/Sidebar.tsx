import {
  LayoutDashboard,
  Compass,
  AlertTriangle,
  Radio,
  Users2,
  Shield,
} from 'lucide-react';

export type NavPage = 'dashboard' | 'patrols' | 'incidents' | 'alerts' | 'conflicts';

interface SidebarProps {
  activePage: NavPage;
  onNavigate: (page: NavPage) => void;
  alertsCount?: number;
}

export function Sidebar({ activePage, onNavigate, alertsCount = 0 }: SidebarProps) {
  const navItems = [
    {
      id: 'dashboard' as NavPage,
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'patrols' as NavPage,
      label: 'Patrol Monitoring',
      icon: Compass,
      badge: 'UC01',
    },
    {
      id: 'incidents' as NavPage,
      label: 'Wildlife / Poaching',
      icon: AlertTriangle,
      badge: 'UC02',
    },
    {
      id: 'alerts' as NavPage,
      label: 'Wildlife Risk Alerts',
      icon: Radio,
      badge: alertsCount > 0 ? `${alertsCount}` : 'UC03',
      alertHighlight: alertsCount > 0,
    },
    {
      id: 'conflicts' as NavPage,
      label: 'Human-Wildlife Conflict',
      icon: Users2,
      badge: 'UC04',
    },
  ];

  return (
    <aside className="w-64 bg-[#FAF7EE] border-r border-[#D1B370]/60 flex flex-col shrink-0 select-none shadow-sm">
      {/* Brand Header */}
      <div className="h-16 px-5 border-b border-[#D1B370]/60 flex items-center gap-3 bg-[#FAF7EE]">
        <div className="w-9 h-9 rounded-lg bg-[#3E8E41] flex items-center justify-center text-white shadow-md shadow-[#3E8E41]/30">
          <Shield className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-[#1C2A1E] tracking-tight leading-none">
            SMART WILDLIFE
          </h1>
          <span className="text-[10px] text-[#A76D40] font-bold tracking-wider uppercase">
            Conservation HQ
          </span>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#A76D40]">
          Operational Views
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors duration-150 ${
                isActive
                  ? 'bg-[#3E8E41] text-white shadow-sm'
                  : 'text-stone-700 hover:text-stone-900 hover:bg-[#D1B370]/20'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-[#A76D40]'}`} />
              <span className="flex-1 text-left truncate">{item.label}</span>
              {item.badge && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    isActive
                      ? 'bg-[#2E6B31] text-white'
                      : item.alertHighlight
                      ? 'bg-[#A76D40]/15 text-[#A76D40] border border-[#A76D40]/40'
                      : 'bg-[#D1B370]/30 text-[#6B501B] border border-[#D1B370]/50'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Park Manager Profile Footer */}
      <div className="p-3 border-t border-[#D1B370]/60 bg-[#FAF7EE]">
        <div className="flex items-center gap-3 p-2 rounded-lg bg-[#F5F5DC] border border-[#D1B370]/50">
          <div className="w-8 h-8 rounded-full bg-[#3E8E41]/15 text-[#3E8E41] flex items-center justify-center font-bold text-xs">
            PM
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-stone-900 truncate">Dr. Kamal Jayasuriya</p>
            <p className="text-[10px] text-[#A76D40] font-medium truncate">Park Manager • Yala</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
