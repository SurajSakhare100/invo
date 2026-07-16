import {
  ChevronDown,
  ChevronUp,
  Home,
  ArrowLeftRight,
  FileText,
  Users,
  PieChart,
  Settings,
  HelpCircle,
  LogOut,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { NavItem } from './NavItem';
import { useAuth } from '../context/AuthContext';
import { useState, useRef, useEffect } from 'react';

interface SidebarProps {
  activePage?: string;
  onNavigate?: (page: string) => void;
}

const NAV_ROUTES: Record<string, string> = {
  Dashboard: '/',
  Transactions: '/transactions',
  Wallet: '/',
  Invoices: '/invoices',
  Customers: '/customers',
  Reports: '/reports',
  Settings: '/settings',
};

export function Sidebar({ activePage = 'Invoices', onNavigate }: SidebarProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleNav = (page: string) => {
    onNavigate?.(page);
    const route = NAV_ROUTES[page];
    if (route) navigate(route);
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <aside className="w-[260px] border-r border-gray-200 bg-white flex flex-col px-4 py-6 shrink-0 min-h-screen">
      {/* Logo */}
      <div className="flex items-center gap-2 px-2 mb-8">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
          I
        </div>
        <span className="font-bold text-lg tracking-tight">Invo</span>
      </div>

      {/* Main Menu */}
      <div className="text-[11px] font-semibold text-gray-400 tracking-widest px-3 mb-2">
        MAIN MENU
      </div>
      <nav className="flex flex-col gap-1 mb-6">
        <NavItem
          icon={Home}
          label="Dashboard"
          active={activePage === 'Dashboard'}
          onClick={() => handleNav('Dashboard')}
        />
        <NavItem
          icon={ArrowLeftRight}
          label="Transactions"
          active={activePage === 'Transactions'}
          onClick={() => handleNav('Transactions')}
        />
        <NavItem
          icon={FileText}
          label="Invoices"
          active={activePage === 'Invoices'}
          onClick={() => handleNav('Invoices')}
        />
        <NavItem
          icon={Users}
          label="Customers"
          active={activePage === 'Customers'}
          onClick={() => handleNav('Customers')}
        />
        <NavItem
          icon={PieChart}
          label="Reports"
          active={activePage === 'Reports'}
          onClick={() => handleNav('Reports')}
        />
      </nav>

      {/* Preference */}
      <div className="text-[11px] font-semibold text-gray-400 tracking-widest px-3 mb-2">
        PREFERENCE
      </div>
      <nav className="flex flex-col gap-1">
        <NavItem icon={HelpCircle} label="Help Center" />
      </nav>

      {/* Footer User Dropdown */}
      <div className="mt-auto pt-4 border-t border-gray-100 relative" ref={dropdownRef}>
        {isDropdownOpen && (
          <div className="absolute bottom-[calc(100%+8px)] left-0 w-full bg-white border border-gray-200 rounded-xl shadow-lg p-2 z-50 animate-in slide-in-from-bottom-2 fade-in duration-200">
            <button
              onClick={() => {
                handleNav('Settings');
                setIsDropdownOpen(false);
              }}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-gray-50 text-left transition-colors"
            >
              <Settings size={16} className="text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Settings</span>
            </button>
            <button
              onClick={() => {
                logout();
                setIsDropdownOpen(false);
              }}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-red-50 text-left transition-colors group"
            >
              <LogOut size={16} className="text-gray-500 group-hover:text-red-500" />
              <span className="text-sm font-medium text-gray-700 group-hover:text-red-500">
                Sign Out
              </span>
            </button>
          </div>
        )}

        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className={`flex items-center justify-between w-full px-3 py-2.5 rounded-xl border border-gray-200 transition-colors ${isDropdownOpen ? 'bg-gray-50 border-gray-300' : 'hover:bg-gray-50'}`}
        >
          <div className="flex items-center gap-2 text-left">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-sm font-semibold shrink-0 shadow-inner">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="overflow-hidden">
              <div className="text-[13px] font-semibold text-gray-900 leading-tight truncate">{user?.name || 'User'}</div>
              <div className="text-[11px] text-gray-500 leading-tight truncate">{user?.company || 'Personal Account'}</div>
            </div>
          </div>
          {isDropdownOpen ? (
            <ChevronUp size={16} className="text-gray-500 shrink-0" />
          ) : (
            <ChevronDown size={16} className="text-gray-400 shrink-0" />
          )}
        </button>
      </div>
    </aside>
  );
}
