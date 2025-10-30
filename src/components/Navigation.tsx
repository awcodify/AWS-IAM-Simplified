'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, Shield, AlertTriangle, Settings, Building2, ChevronDown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRegion } from '@/contexts/RegionContext';
import { useAccountCapabilities } from '@/hooks/useAccountCapabilities';

interface NavItem {
  href: string;
  label: string;
  icon: typeof Home;
  requiresCapability?: 'management' | 'iam';
}

interface NavGroup {
  label: string;
  items: NavItem[];
  isDropdown?: boolean;
  requiresCapability?: 'management' | 'iam';
}

export default function Navigation() {
  const pathname = usePathname();
  const { session } = useAuth();
  const { awsRegion, ssoRegion } = useRegion();
  const capabilities = useAccountCapabilities(awsRegion, ssoRegion);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const navigationGroups: NavGroup[] = [
    {
      label: 'Dashboard',
      items: [
        {
          href: '/',
          label: 'Dashboard',
          icon: Home
        }
      ]
    },
    {
      label: 'Management Account',
      isDropdown: true,
      requiresCapability: 'management',
      items: [
        {
          href: '/accounts/management',
          label: 'Organization & SSO',
          icon: Building2,
          requiresCapability: 'management'
        },
        {
          href: '/permission-sets',
          label: 'Permission Sets',
          icon: Shield,
          requiresCapability: 'management'
        },
        {
          href: '/risk-analysis',
          label: 'Risk Analysis',
          icon: AlertTriangle,
          requiresCapability: 'management'
        }
      ]
    },
    {
      label: 'IAM (Local)',
      isDropdown: true,
      requiresCapability: 'iam',
      items: [
        {
          href: '/accounts/iam',
          label: 'IAM Users & Access',
          icon: Users,
          requiresCapability: 'iam'
        }
      ]
    }
  ];

  const hasCapability = (requirement?: 'management' | 'iam') => {
    if (!requirement) return true;
    if (requirement === 'management') return capabilities.hasManagementAccess;
    if (requirement === 'iam') return capabilities.hasIAMAccess;
    return false;
  };

  const isGroupActive = (group: NavGroup) => {
    return group.items.some(item => pathname === item.href);
  };

  const toggleDropdown = (label: string) => {
    setOpenDropdown(openDropdown === label ? null : label);
  };

  return (
    <div className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <nav className="flex space-x-1" ref={dropdownRef}>
            {navigationGroups.map((group, groupIndex) => {
              const groupHasAccess = hasCapability(group.requiresCapability);
              const isDisabled = group.requiresCapability && !groupHasAccess;
              const isActive = isGroupActive(group);
              const isOpen = openDropdown === group.label;

              if (group.isDropdown) {
                return (
                  <div key={groupIndex} className="relative">
                    <button
                      onClick={() => !isDisabled && toggleDropdown(group.label)}
                      className={`flex items-center space-x-2 py-4 px-3 text-sm font-medium border-b-2 transition-colors duration-200 ${
                        isActive
                          ? 'border-blue-500 text-blue-600'
                          : isDisabled
                          ? 'border-transparent text-gray-400 cursor-not-allowed opacity-50'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                      disabled={isDisabled}
                    >
                      <span>{group.label}</span>
                      <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isOpen && !isDisabled && (
                      <div className="absolute top-full left-0 mt-0 w-56 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                        <div className="py-1">
                          {group.items.map((item) => {
                            const Icon = item.icon;
                            const itemIsActive = pathname === item.href;
                            const itemHasAccess = hasCapability(item.requiresCapability);
                            const itemIsDisabled = item.requiresCapability && !itemHasAccess;
                            
                            return (
                              <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => !itemIsDisabled && setOpenDropdown(null)}
                                className={`flex items-center space-x-3 px-4 py-2 text-sm ${
                                  itemIsActive
                                    ? 'bg-blue-50 text-blue-600 font-medium'
                                    : itemIsDisabled
                                    ? 'text-gray-400 cursor-not-allowed opacity-50'
                                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                                }`}
                              >
                                <Icon className="h-4 w-4" />
                                <span>{item.label}</span>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              }

              // Regular non-dropdown items
              return (
                <div key={groupIndex} className="flex items-center">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const itemIsActive = pathname === item.href;
                    const itemHasAccess = hasCapability(item.requiresCapability);
                    const itemIsDisabled = item.requiresCapability && !itemHasAccess;
                    
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center space-x-2 py-4 px-3 text-sm font-medium border-b-2 transition-colors duration-200 ${
                          itemIsActive
                            ? 'border-blue-500 text-blue-600'
                            : itemIsDisabled
                            ? 'border-transparent text-gray-400 cursor-not-allowed opacity-50'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                        onClick={(e) => {
                          if (itemIsDisabled) {
                            e.preventDefault();
                          }
                        }}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
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
