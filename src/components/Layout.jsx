import React from 'react';
import Sidebar from './Sidebar';
import { useSidebar } from '@/contexts/SidebarContext';
import { cn } from '@/lib/utils';

const Layout = ({ children, fullHeight = false, className = '' }) => {
  const { isCollapsed } = useSidebar();

  return (
    <div className={cn(
      "w-full max-w-full min-h-screen bg-slate-50/50 flex overflow-x-hidden relative",
      fullHeight ? "h-screen overflow-hidden" : ""
    )}>
      <Sidebar />
      <main className={cn(
        "min-w-0 flex-1 transition-all duration-300 ease-in-out box-border",
        fullHeight ? "h-screen overflow-hidden p-3.5 lg:p-4 flex flex-col" : "p-4 sm:p-6 lg:p-8 min-h-screen",
        isCollapsed 
          ? "ml-[76px] w-[calc(100%-76px)] max-w-[calc(100%-76px)]" 
          : "ml-[260px] w-[calc(100%-260px)] max-w-[calc(100%-260px)]",
        className
      )}>
        <div className="w-full max-w-full min-w-0 flex-1">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
