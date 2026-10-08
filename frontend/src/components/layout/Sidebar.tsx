import React from 'react';
import { NavLink } from 'react-router-dom';
import { useUiStore } from '@/stores/uiStore';
import { cn } from '@/lib/utils';
import {
  Hexagon,
  LayoutDashboard,
  Network,
  Copy,
  FlaskConical,
  AlertTriangle,
  Gauge,
  Shield,
  Container,
  Globe,
  Wallet,
  Cloud,
  Cpu,
  Zap,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

// Navigation groups definition
const navGroups = [
  {
    title: 'OVERVIEW',
    items: [
      { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      { name: 'Architecture', path: '/architecture', icon: Network },
      { name: 'Digital Twin', path: '/twin', icon: Copy },
    ]
  },
  {
    title: 'INTELLIGENCE',
    items: [
      { name: 'Simulation Lab', path: '/simulation', icon: FlaskConical },
      { name: 'Failure Prediction', path: '/predictions', icon: AlertTriangle },
      { name: 'Arch. Optimizer', path: '/optimizer', icon: Cpu },
      { name: 'Chaos Lab', path: '/chaos', icon: Zap },
    ]
  },
  {
    title: 'ANALYSIS',
    items: [
      { name: 'Performance', path: '/performance', icon: Gauge },
      { name: 'Security', path: '/security', icon: Shield },
      { name: 'Kubernetes', path: '/kubernetes', icon: Container },
      { name: 'Network', path: '/network', icon: Globe },
      { name: 'Cost Intelligence', path: '/cost', icon: Wallet },
      { name: 'Multi-Cloud', path: '/multicloud', icon: Cloud },
    ]
  },
  {
    title: 'TOOLS',
    items: [
      { name: 'Reports', path: '/reports', icon: FileText },
      { name: 'Settings', path: '/settings', icon: Settings },
    ]
  }
];

export const Sidebar = () => {
  const { sidebarCollapsed, toggleSidebar } = useUiStore();

  return (
    <aside className={cn(
      "flex flex-col bg-[#0c1222] border-r border-slate-800 transition-all duration-300 z-20 h-screen",
      sidebarCollapsed ? "w-[72px]" : "w-[260px]"
    )}>
      {/* Logo Area */}
      <div className="h-14 flex items-center px-4 border-b border-slate-800 shrink-0">
        <Hexagon className="h-6 w-6 text-brand-500 shrink-0" />
        {!sidebarCollapsed && (
          <div className="ml-3 flex flex-col justify-center overflow-hidden whitespace-nowrap">
            <span className="text-sm font-semibold text-slate-100 leading-tight">CloudTwin Nexus</span>
            <span className="text-[10px] font-medium text-slate-500 tracking-wider">ARCHITECTURE INTELLIGENCE</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 custom-scrollbar">
        {navGroups.map((group, idx) => (
          <div key={group.title} className={cn("mb-6", sidebarCollapsed && "flex flex-col items-center")}>
            {!sidebarCollapsed && (
              <h3 className="px-5 text-xs font-semibold text-slate-500 mb-2 tracking-wider">
                {group.title}
              </h3>
            )}
            
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.name}>
                    <NavLink
                      to={item.path}
                      className={({ isActive }) => cn(
                        "flex items-center px-5 py-2 text-sm font-medium transition-colors relative group",
                        sidebarCollapsed ? "justify-center px-0 w-12 mx-auto rounded-lg" : "w-full",
                        isActive
                          ? "text-brand-400 bg-brand-600/20"
                          : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                      )}
                      title={sidebarCollapsed ? item.name : undefined}
                    >
                      {({ isActive }) => (
                        <>
                          {/* Active border indicator */}
                          {isActive && !sidebarCollapsed && (
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-500 rounded-r" />
                          )}
                          <Icon className={cn("h-5 w-5 shrink-0", isActive ? "text-brand-400" : "text-slate-400 group-hover:text-slate-300")} />
                          {!sidebarCollapsed && (
                            <span className="ml-3 whitespace-nowrap overflow-hidden text-ellipsis">
                              {item.name}
                            </span>
                          )}
                        </>
                      )}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Collapse Toggle */}
      <button
        onClick={toggleSidebar}
        className="h-12 flex items-center justify-center border-t border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors shrink-0"
      >
        {sidebarCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
      </button>
    </aside>
  );
};
