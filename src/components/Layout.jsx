import React from 'react';
import Sidebar from './Sidebar';
import { useSidebar } from '@/contexts/SidebarContext';
import { cn } from '@/lib/utils';

const Layout = ({ children }) => {
  const { isCollapsed } = useSidebar();

  return (
    <div className="flex min-h-screen bg-slate-50/50">
      <Sidebar />
      <main className={cn(
        "flex-1 p-6 lg:p-8 min-h-screen transition-all duration-300 ease-in-out",
        isCollapsed ? "ml-[76px]" : "ml-[260px]"
      )}>
        {children}
      </main>
    </div>
  );
};

export default Layout;
