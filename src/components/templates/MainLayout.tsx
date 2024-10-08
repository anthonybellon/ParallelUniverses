import React from 'react';

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => (
  <div className="main-layout">
    <header>
      <h1>Parallel Universe Maker</h1>
    </header>
    <main>{children}</main>
    <footer>
      <p>&copy; {new Date().getFullYear()} Parallel Universe Maker</p>
    </footer>
  </div>
);

export default MainLayout;
