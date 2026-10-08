import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

export const Layout = () => {
  return (
    <div className="flex h-screen w-full bg-[#080e1e] overflow-hidden text-slate-50">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 transition-all duration-300">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6 relative">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
