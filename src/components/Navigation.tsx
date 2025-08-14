'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, Shield, AlertTriangle, Settings } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function Navigation() {
  const pathname = usePathname();
  const { session } = useAuth();

  const navigationItems = [
    {
      href: '/',
      label: 'Dashboard',
      icon: Home
    },
    {
      href: '/organization',
      label: 'Organization',
      icon: Users
    },
    {
      href: '/permission-sets',
      label: 'Permission Sets',
      icon: Shield
    },
    {
      href: '/risk-analysis',
      label: 'Risk Analysis',
      icon: AlertTriangle
    }
  ];

  return (
    <div className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <nav className="flex space-x-8">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-2 py-4 text-sm font-medium border-b-2 transition-colors duration-200 ${
                    isActive
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Settings Section */}
          <div className="flex items-center space-x-4">
            {session?.isAuthenticated ? (
              <Link
                href="/settings"
                className={`flex items-center space-x-2 py-2 px-3 text-sm font-medium rounded-md transition-colors duration-200 ${
                  pathname === '/settings'
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </Link>
            ) : (
              <Link
                href="/auth/login"
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
