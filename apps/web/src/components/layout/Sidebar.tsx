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
    <aside className="w-64 bg-slate-950 border-r border-slate-800/80 flex flex-col shrink-0 select-none">
      {/* Brand Header */}
      <div className="h-16 px-5 border-b border-slate-800/80 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-sky-600 flex items-center justify-center text-white shadow-md shadow-sky-600/30">
          <Shield className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-white tracking-tight leading-none">
            SMART WILDLIFE
          </h1>
          <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">
            Conservation HQ
          </span>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Operational Views
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
                isActive
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span className="flex-1 text-left truncate">{item.label}</span>
              {item.badge && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    isActive
                      ? 'bg-sky-700 text-white'
                      : item.alertHighlight
                      ? 'bg-rose-950 text-rose-300 border border-rose-800'
                      : 'bg-slate-800 text-slate-400'
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
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/50">
        <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-900/60 border border-slate-800/60">
          <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-xs text-sky-400">
            PM
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">Dr. Kamal Jayasuriya</p>
            <p className="text-[10px] text-slate-400 truncate">Park Manager • Yala</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
