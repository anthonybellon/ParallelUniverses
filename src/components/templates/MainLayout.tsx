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
    <style jsx>{`
      .main-layout {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
        min-width: 100vw;
      }
      header {
        text-align: center;
        padding: 20px;
        background-color: #f0f0f0;
      }
      main {
        flex: 1;
        display: flex;
        justify-content: center;
        align-items: center;
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
