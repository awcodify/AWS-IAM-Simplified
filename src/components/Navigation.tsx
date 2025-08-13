'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, Shield, AlertTriangle } from 'lucide-react';

export default function Navigation() {
  const pathname = usePathname();

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
      </div>
    </div>
  );
}
