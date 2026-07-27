import React from 'react';
import Sidebar from './Sidebar';

const Layout = ({ children }) => {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-[260px] p-6 lg:p-8 min-h-screen">
        {children}
      </main>
    </div>
  );
};

export default Layout;
