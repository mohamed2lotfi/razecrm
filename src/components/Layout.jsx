import React from 'react';
import Sidebar from './Sidebar';
import { useSidebar } from '@/contexts/SidebarContext';
import { cn } from '@/lib/utils';

const Layout = ({ children, fullHeight = false }) => {
  const { isCollapsed } = useSidebar();

  return (
    <div className={cn("flex bg-slate-50/50", fullHeight ? "h-screen overflow-hidden" : "min-h-screen")}>
      <Sidebar />
      <main className={cn(
        "flex-1 transition-all duration-300 ease-in-out",
        fullHeight ? "h-screen overflow-hidden p-3.5 lg:p-4 flex flex-col" : "p-6 lg:p-8 min-h-screen",
        isCollapsed ? "ml-[76px]" : "ml-[260px]"
      )}>
        {children}
      </main>
    </div>
  );
};

export default Layout;
