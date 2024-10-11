import React from 'react';

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => (
  <div className="min-h-[100vh] min-w-[100vw] flex-col">
    <header>
      <h1>Parallel Universe Maker</h1>
    </header>
    <div className="flex w-full">{children}</div>
    <footer>
      <p>&copy; {new Date().getFullYear()} Parallel Universe Maker</p>
    </footer>
    <style jsx>{`
      header {
        text-align: center;
        padding: 20px;
        background-color: #f0f0f0;
      }
      footer {
        text-align: center;
        padding: 10px;
        background-color: #f0f0f0;
        font-size: 14px;
      }
    `}</style>
  </div>
);

export default MainLayout;
