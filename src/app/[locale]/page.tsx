'use client';

import React from 'react';
import Timeline from '@components/organisms/Timeline';
import MainLayout from '@components/templates/MainLayout';

const HomePage: React.FC = () => {
  return (
    <div className="flex flex-1 items-center justify-center">
      <MainLayout>
        <Timeline />
      </MainLayout>
    </div>
  );
};

export default HomePage;
