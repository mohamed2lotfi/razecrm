import React, { createContext, useContext, useState, useEffect } from 'react';

const SidebarContext = createContext();

export const SidebarProvider = ({ children }) => {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem('crm_sidebar_collapsed');
      return saved ? JSON.parse(saved) : false;
    } catch (e) {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('crm_sidebar_collapsed', JSON.stringify(isCollapsed));
    } catch (e) {
      // ignore
    }
  }, [isCollapsed]);

  const toggleSidebar = () => setIsCollapsed(prev => !prev);

  return (
    <SidebarContext.Provider value={{ isCollapsed, toggleSidebar, setIsCollapsed }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    // Return safe fallback if not wrapped
    return {
      isCollapsed: false,
      toggleSidebar: () => {},
      setIsCollapsed: () => {}
    };
  }
  return context;
};
