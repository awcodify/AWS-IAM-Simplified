'use client';

import { ReactNode } from 'react';
import Header from './Header';
import Navigation from './Navigation';
import type { AccountInfo } from '@/types/aws';

interface PageLayoutProps {
  children: ReactNode;
  accountInfo?: AccountInfo | null;
}

export default function PageLayout({ children, accountInfo }: PageLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <Header accountInfo={accountInfo} />
      
      {/* Navigation */}
      <Navigation />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </div>
    </div>
  );
}
