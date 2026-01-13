import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Home,
  Palette,
  Box,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useNavigate, useLocation } from 'react-router-dom';

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ElementType;
  href: string;
}

const sidebarItems: SidebarItem[] = [
  { id: 'home', label: 'Projects', icon: Home, href: '/dashboard' },
  { id: 'style-capsules', label: 'Style Capsule Library', icon: Palette, href: '/style-capsules' },
  { id: 'assets', label: 'Asset Library', icon: Box, href: '/assets' },
];

interface GlobalSidebarProps {
  // Remove custom navigation props - we'll use React Router directly
}

export function GlobalSidebar({}: GlobalSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { signOut, user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <motion.aside
      initial={{ width: 280 }}
      animate={{ width: collapsed ? 72 : 280 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="relative flex flex-col h-screen bg-sidebar border-r border-sidebar-border"
      style={{ background: 'var(--gradient-sidebar)' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-6 border-b border-sidebar-border">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/20 shadow-gold">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col"
          >
            <span className="font-display text-xl font-semibold text-foreground tracking-tight">
              Aiuteur
            </span>
            <span className="text-xs text-muted-foreground">
              Narrative to Film
            </span>
          </motion.div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {sidebarItems.map((item) => {
          const isActive = location.pathname === item.href || 
            (item.href !== '/dashboard' && location.pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => navigate(item.href)}
              className={cn(
                'sidebar-item w-full',
                isActive && 'sidebar-item-active'
              )}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="truncate"
                >
                  {item.label}
                </motion.span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User Actions */}
      <div className="px-3 py-4 border-t border-sidebar-border space-y-1">
        {user && (
          <button
            onClick={handleSignOut}
            className="sidebar-item w-full text-destructive hover:bg-destructive/10"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="truncate"
              >
                Sign Out
              </motion.span>
            )}
          </button>
        )}

        {/* Collapse Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="sidebar-item w-full justify-center"
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </motion.aside>
  );
}
