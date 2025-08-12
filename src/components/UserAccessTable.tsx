'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Users, Building2, Shield, Key, ChevronDown, ChevronRight, Search, Eye, Database, Server, ChevronLeft, Loader2, Filter, X, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import type { OrganizationUser, CrossAccountUserAccess, PaginationInfo } from '@/types/aws';

interface UserAccessTableProps {
  users: OrganizationUser[];
  pagination?: PaginationInfo;
  onPageChange: (page: number) => void;
  onSearchChange: (term: string) => void;
  selectedUser?: string | null;
  searchTerm?: string;
  loading?: boolean;
  searchLoading?: boolean;
  loadingBulkAccess?: boolean;
}

// Separate search component to maintain its own state
const SearchInput = ({ onSearchChange, searchLoading, initialValue = '' }: { 
  onSearchChange: (term: string) => void; 
  searchLoading: boolean;
  initialValue?: string;
}) => {
  const [localSearchTerm, setLocalSearchTerm] = useState(initialValue);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [wasFocused, setWasFocused] = useState(false);

  // Update local state if initial value changes (e.g., external reset)
  useEffect(() => {
    setLocalSearchTerm(initialValue);
  }, [initialValue]);

  // Track focus state and restore focus after loading
  useEffect(() => {
    if (searchLoading && document.activeElement === searchInputRef.current) {
      setWasFocused(true);
    } else if (!searchLoading && wasFocused && searchInputRef.current) {
      // Restore focus after loading is complete
      searchInputRef.current.focus();
      setWasFocused(false);
    }
  }, [searchLoading, wasFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalSearchTerm(value);
    onSearchChange(value);
  };

  const handleFocus = () => {
    setWasFocused(true);
  };

  const handleBlur = () => {
    if (!searchLoading) {
      setWasFocused(false);
    }
  };

  return (
    <div className="relative">
      {searchLoading ? (
        <Loader2 className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-500 animate-spin" />
      ) : (
        <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
      )}
      <input
        ref={searchInputRef}
        type="text"
        value={localSearchTerm}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder="Search by name, username, or email..."
        className="w-full pl-10 pr-4 py-2 text-gray-900 placeholder-gray-500 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
      />
    </div>
  );
};

// Table skeleton loading component
const TableLoadingSkeleton = () => (
  <>
    {[...Array(5)].map((_, index) => (
      <tr key={index} className="animate-pulse">
        <td className="px-4 py-3">
          <div className="w-4 h-4 bg-gray-200 rounded"></div>
        </td>
        <td className="px-4 py-3">
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            <div className="h-3 bg-gray-200 rounded w-2/3"></div>
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="space-y-1">
            <div className="h-4 bg-gray-200 rounded w-12"></div>
            <div className="h-3 bg-gray-200 rounded w-16"></div>
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="space-y-1">
            <div className="h-4 bg-gray-200 rounded w-8"></div>
            <div className="h-3 bg-gray-200 rounded w-20"></div>
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="flex space-x-1">
            <div className="h-6 bg-gray-200 rounded-full w-12"></div>
            <div className="h-6 bg-gray-200 rounded-full w-10"></div>
            <div className="h-6 bg-gray-200 rounded-full w-8"></div>
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="h-6 bg-gray-200 rounded w-20"></div>
        </td>
      </tr>
    ))}
  </>
);

interface TableRow {
  userId: string;
  userName: string;
  displayName: string;
  email: string;
  homeAccount: string;
  accountAccess: CrossAccountUserAccess[];
  totalAccounts: number;
  accessibleAccounts: number;
  totalPermissionSets: number;
  services: string[];
}

export default function UserAccessTable({ 
  users, 
  pagination,
  onPageChange,
  onSearchChange,
  selectedUser, 
  searchTerm: externalSearchTerm = '',
  loading = false,
  searchLoading = false,
  loadingBulkAccess = false
}: UserAccessTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'name' | 'accounts' | 'permissionSets' | 'services'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Filter states - changed to arrays for multi-value support
  const [filters, setFilters] = useState({
    name: [] as string[],
    accounts: [] as string[],
    permissionSets: [] as string[],
    services: [] as string[]
  });
  
  // Filter dropdown visibility
  const [showFilters, setShowFilters] = useState({
    name: false,
    accounts: false,
    permissionSets: false,
    services: false
  });

  const getServiceIcon = (service: string) => {
    switch (service.toLowerCase()) {
      case 's3':
        return <Database className="w-3 h-3 text-blue-600" />;
      case 'ec2':
        return <Server className="w-3 h-3 text-orange-600" />;
      case 'iam':
        return <Key className="w-3 h-3 text-red-600" />;
      case 'lambda':
        return <Server className="w-3 h-3 text-purple-600" />;
      case 'rds':
        return <Database className="w-3 h-3 text-blue-800" />;
      case 'cloudformation':
        return <Server className="w-3 h-3 text-orange-500" />;
      case 'cloudwatch':
        return <Eye className="w-3 h-3 text-green-600" />;
      case 'sns':
        return <Server className="w-3 h-3 text-red-500" />;
      case 'sqs':
        return <Server className="w-3 h-3 text-yellow-600" />;
      default:
        return <Shield className="w-3 h-3 text-gray-600" />;
    }
  };

  // Extract service hints from permission set ARN or name
  const extractServiceFromPermissionSet = (permissionSetArn: string): string[] => {
    const services: string[] = [];
    const arnLower = permissionSetArn.toLowerCase();
    
    // Extract from ARN path (usually the permission set name)
    const arnParts = permissionSetArn.split('/');
    const permissionSetName = arnParts[arnParts.length - 1] || '';
    const nameLower = permissionSetName.toLowerCase();
    
    // Enhanced service patterns based on real permission set names
    const servicePatterns = [
      // Infrastructure & Core
      { pattern: /infra|infrastructure/, service: 'ec2' },
      { pattern: /network|networking|vpc/, service: 'ec2' },
      { pattern: /compute/, service: 'ec2' },
      
      // Storage
      { pattern: /storage|s3|bucket/, service: 's3' },
      
      // Database
      { pattern: /database|db|rds/, service: 'rds' },
      
      // Security & Identity
      { pattern: /security|iam|identity/, service: 'iam' },
      { pattern: /src|source/, service: 'iam' }, // Based on "klg-src-AdminAccessExceptSSO"
      
      // Serverless
      { pattern: /lambda|function|serverless/, service: 'lambda' },
      
      // DevOps & Monitoring
      { pattern: /cloudformation|cfn|stack/, service: 'cloudformation' },
      { pattern: /cloudwatch|monitoring|logs/, service: 'cloudwatch' },
      { pattern: /devops|cicd|pipeline/, service: 'cloudformation' },
      
      // Messaging
      { pattern: /sns|notification/, service: 'sns' },
      { pattern: /sqs|queue/, service: 'sqs' },
      
      // Finance & Billing
      { pattern: /finance|billing|cost/, service: 'cloudwatch' },
    ];
    
    // Check both ARN and name for service patterns
    const searchText = `${arnLower} ${nameLower}`;
    servicePatterns.forEach(({ pattern, service }) => {
      if (pattern.test(searchText)) {
        services.push(service);
      }
    });
    
    // Role type detection for generic permissions
    const roleTypePatterns = [
      { pattern: /admin|administrator/, services: ['iam', 'ec2', 's3'] },
      { pattern: /power|poweruser/, services: ['ec2', 's3', 'lambda'] },
      { pattern: /developer|dev/, services: ['lambda', 's3', 'cloudformation'] },
      { pattern: /readonly|read/, services: ['cloudwatch'] },
    ];
    
    // If no specific service found, try role-based detection
    if (services.length === 0) {
      roleTypePatterns.forEach(({ pattern, services: roleServices }) => {
        if (pattern.test(searchText)) {
          services.push(...roleServices);
        }
      });
    }
    
    // For opaque permission set IDs, provide common AWS services as fallback
    if (services.length === 0 && permissionSetArn.includes('permissionSet/')) {
      // Return a representative set of common AWS services that users typically access
      return ['s3', 'ec2', 'iam'];
    }
    
    return [...new Set(services)]; // Remove duplicates
  };
  
  // Get estimated services based on user's permission count
  const getEstimatedServices = (totalPermissionSets: number): string[] => {
    const baseServices = ['s3', 'ec2'];
    
    if (totalPermissionSets >= 5) {
      return [...baseServices, 'iam', 'lambda', 'rds'];
    } else if (totalPermissionSets >= 3) {
      return [...baseServices, 'iam', 'lambda'];
    } else if (totalPermissionSets >= 1) {
      return [...baseServices, 'iam'];
    }
    
    return baseServices;
  };

  const tableData: TableRow[] = useMemo(() => {
    return users.map(user => {
      // Ensure we have account access data, fallback to empty array if not loaded
      const accountAccess = user.accountAccess || [];
      const accessibleAccounts = accountAccess.filter(a => a.hasAccess);
      const totalPermissionSets = accessibleAccounts.reduce((sum, acc) => 
        sum + (acc.permissionSets?.length || acc.roles?.length || 0), 0
      );
      const uniqueServices = Array.from(new Set(
        accessibleAccounts.flatMap(acc => {
          // First try to get services from detailed access (if available)
          const detailedServices = acc.detailedAccess?.map(detail => detail.service) || [];
          
          if (detailedServices.length > 0) {
            return detailedServices;
          }
          
          // Second priority: extract from permission sets with names
          const permissionSetServices = (acc.permissionSets || []).flatMap(ps => 
            extractServiceFromPermissionSet(ps.name || ps.arn)
          );
          
          if (permissionSetServices.length > 0) {
            return permissionSetServices;
          }
          
          // Third priority: fallback to ARN extraction
          const fallbackServices = (acc.roles || []).flatMap(role => 
            extractServiceFromPermissionSet(role)
          );
          
          // If we still don't have services but have roles, provide estimated services
          if (fallbackServices.length === 0 && (acc.roles?.length || 0) > 0) {
            return getEstimatedServices(acc.roles?.length || 0);
          }
          
          return fallbackServices;
        })
      ));

      return {
        userId: user.user.UserId,
        userName: user.user.UserName,
        displayName: user.user.DisplayName || user.user.UserName,
        email: user.user.Emails[0]?.Value || '',
        homeAccount: user.homeAccountId,
        accountAccess: accountAccess,
        totalAccounts: accountAccess.length,
        accessibleAccounts: accessibleAccounts.length,
        totalPermissionSets,
        services: uniqueServices
      };
    });
  }, [users]);

  // Extract filter options from data
  const filterOptions = useMemo(() => {
    const accountOptions = new Set<string>();
    const permissionSetOptions = new Set<string>();
    const serviceOptions = new Set<string>();
    
    tableData.forEach(row => {
      // Extract account names
      row.accountAccess.forEach(access => {
        if (access.hasAccess) {
          const accountName = access.accountName || access.accountId;
          accountOptions.add(accountName);
        }
      });
      
      // Extract permission sets
      row.accountAccess.forEach(access => {
        if (access.hasAccess) {
          if (access.permissionSets) {
            access.permissionSets.forEach(ps => {
              const name = ps.name || ps.arn.split('/').pop() || ps.arn;
              permissionSetOptions.add(name);
            });
          }
          
          // Handle legacy roles
          if (access.roles && (!access.permissionSets || access.permissionSets.length === 0)) {
            access.roles.forEach(role => {
              const name = role.split('/').pop() || role;
              permissionSetOptions.add(name);
            });
          }
        }
      });
      
      // Extract services
      row.services.forEach(service => serviceOptions.add(service));
    });
    
    return {
      accounts: Array.from(accountOptions).sort(),
      permissionSets: Array.from(permissionSetOptions).sort(),
      services: Array.from(serviceOptions).sort()
    };
  }, [tableData]);

  // Apply filters and sorting
  const filteredAndSortedData = useMemo(() => {
    let filtered = [...tableData];
    
    // Apply filters
    if (filters.name.length > 0) {
      filtered = filtered.filter(row => 
        filters.name.some(filterName =>
          row.displayName.toLowerCase().includes(filterName.toLowerCase()) ||
          row.userName.toLowerCase().includes(filterName.toLowerCase()) ||
          row.email.toLowerCase().includes(filterName.toLowerCase())
        )
      );
    }
    
    if (filters.accounts.length > 0) {
      filtered = filtered.filter(row => 
        row.accountAccess.some(access => {
          if (!access.hasAccess) return false;
          const accountName = access.accountName || access.accountId;
          return filters.accounts.includes(accountName);
        })
      );
    }
    
    if (filters.permissionSets.length > 0) {
      filtered = filtered.filter(row => {
        return row.accountAccess.some(access => {
          if (!access.hasAccess) return false;
          
          // Check permission sets
          if (access.permissionSets) {
            return access.permissionSets.some(ps => {
              const name = ps.name || ps.arn.split('/').pop() || ps.arn;
              return filters.permissionSets.includes(name);
            });
          }
          
          // Check legacy roles
          if (access.roles && (!access.permissionSets || (access.permissionSets as unknown[])?.length === 0)) {
            return access.roles.some(role => {
              const name = role.split('/').pop() || role;
              return filters.permissionSets.includes(name);
            });
          }
          
          return false;
        });
      });
    }
    
    if (filters.services.length > 0) {
      filtered = filtered.filter(row => 
        filters.services.some(service => row.services.includes(service))
      );
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: number | string;
      let bValue: number | string;

      switch (sortBy) {
        case 'name':
          aValue = a.displayName.toLowerCase();
          bValue = b.displayName.toLowerCase();
          break;
        case 'accounts':
          aValue = a.accessibleAccounts;
          bValue = b.accessibleAccounts;
          break;
        case 'permissionSets':
          aValue = a.totalPermissionSets;
          bValue = b.totalPermissionSets;
          break;
        case 'services':
          aValue = a.services.length;
          bValue = b.services.length;
          break;
        default:
          return 0;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      } else {
        return sortOrder === 'asc' ? (aValue as number) - (bValue as number) : (bValue as number) - (aValue as number);
      }
    });

    return filtered;
  }, [tableData, sortBy, sortOrder, filters]);

  const toggleRowExpansion = (userId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
    }
    setExpandedRows(newExpanded);
  };

  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const updateFilter = (column: keyof typeof filters, value: string) => {
    setFilters(prev => {
      const currentValues = prev[column];
      const isSelected = currentValues.includes(value);
      
      if (isSelected) {
        // Remove value if already selected
        return {
          ...prev,
          [column]: currentValues.filter(v => v !== value)
        };
      } else {
        // Add value if not selected
        return {
          ...prev,
          [column]: [...currentValues, value]
        };
      }
    });
  };

  const clearFilter = (column: keyof typeof filters) => {
    setFilters(prev => ({ ...prev, [column]: [] }));
  };

  const clearAllFilters = () => {
    setFilters({ name: [], accounts: [], permissionSets: [], services: [] });
  };

  const toggleFilterDropdown = (column: keyof typeof showFilters) => {
    setShowFilters(prev => ({
      ...prev,
      [column]: !prev[column]
    }));
  };

  const hasActiveFilters = Object.values(filters).some(filter => filter.length > 0);

  // Close filter dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!(event.target as Element).closest('.filter-dropdown')) {
        setShowFilters({ name: false, accounts: false, permissionSets: false, services: false });
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter dropdown component for multi-value selection
  const FilterDropdown = ({ 
    column, 
    options, 
    placeholder,
    isNumeric = false 
  }: { 
    column: keyof typeof filters; 
    options: (string | number)[]; 
    placeholder: string;
    isNumeric?: boolean;
  }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const selectedValues = filters[column];
    
    return (
      <div className="relative filter-dropdown">
        {showFilters[column] && (
          <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-md shadow-lg z-50">
            <div className="p-2 border-b border-gray-100">
              <input
                type="text"
                placeholder={`Search ${placeholder.toLowerCase()}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            {/* Selected items display */}
            {selectedValues.length > 0 && (
              <div className="p-2 border-b border-gray-100 bg-blue-50">
                <div className="text-xs text-blue-700 mb-1 font-medium">
                  Selected ({selectedValues.length}):
                </div>
                <div className="flex flex-wrap gap-1">
                  {selectedValues.map((value, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full"
                    >
                      {value}
                      <button
                        onClick={() => updateFilter(column, value)}
                        className="ml-1 text-blue-600 hover:text-blue-800"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            <div className="max-h-40 overflow-y-auto">
              {options
                .filter(option => 
                  String(option).toLowerCase().includes(searchTerm.toLowerCase())
                )
                .slice(0, 50)
                .map((option, index) => {
                  const isSelected = selectedValues.includes(String(option));
                  return (
                    <div
                      key={index}
                      className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-100 flex items-center justify-between group ${
                        isSelected ? 'bg-blue-50 text-blue-700' : ''
                      }`}
                    >
                      <button
                        onClick={() => updateFilter(column, String(option))}
                        className="flex items-center flex-1"
                      >
                        <div className={`w-3 h-3 border rounded mr-2 flex items-center justify-center ${
                          isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                        }`}>
                          {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                        </div>
                        <span className="truncate flex-1">{String(option)}</span>
                      </button>
                      {column === 'permissionSets' && (
                        <Link
                          href={`/permission-sets/${encodeURIComponent(`arn:aws:sso:::permissionSet/ssoins-example/${option}`)}`}
                          className="ml-2 text-blue-600 hover:text-blue-800 opacity-0 group-hover:opacity-100"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      )}
                      {isNumeric && (
                        <span className="text-gray-400 ml-1">
                          ({tableData.filter(row => 
                            column === 'accounts' 
                              ? row.accountAccess.some(access => 
                                  access.hasAccess && (access.accountName || access.accountId) === option
                                )
                              : true
                          ).length})
                        </span>
                      )}
                    </div>
                  );
                })}
            </div>
            
            {selectedValues.length > 0 && (
              <div className="border-t border-gray-200 p-2">
                <button
                  onClick={() => clearFilter(column)}
                  className="w-full text-xs text-red-600 hover:text-red-800 flex items-center justify-center"
                >
                  <X className="w-3 h-3 mr-1" />
                  Clear All ({selectedValues.length})
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const PaginationControls = () => {
    if (!pagination) return null;

    const { currentPage, totalPages, totalUsers, hasNextPage, hasPreviousPage } = pagination;
    
    return (
      <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200">
        <div className="flex items-center text-sm text-gray-700">
          <span>
            Showing page {currentPage} of {totalPages} ({totalUsers} total users)
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onPageChange?.(currentPage - 1)}
            disabled={!hasPreviousPage || loading}
            className="flex items-center px-3 py-1 text-sm bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </button>
          
          {/* Page numbers */}
          <div className="flex items-center space-x-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              
              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange?.(pageNum)}
                  disabled={loading}
                  className={`px-3 py-1 text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed ${
                    currentPage === pageNum
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
          
          <button
            onClick={() => onPageChange?.(currentPage + 1)}
            disabled={!hasNextPage || loading}
            className="flex items-center px-3 py-1 text-sm bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Header with controls */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Users className="w-5 h-5 mr-2" />
            User Access Overview 
            {loadingBulkAccess && (
              <span className="ml-2 flex items-center text-sm font-normal text-blue-600">
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                Loading access data...
              </span>
            )}
            {!loadingBulkAccess && pagination ? (
              <span className="ml-2 text-sm font-normal text-gray-600">
                ({pagination.totalUsers} total users{hasActiveFilters ? `, ${filteredAndSortedData.length} filtered` : ''})
              </span>
            ) : !loadingBulkAccess ? (
              <span className="ml-2 text-sm font-normal text-gray-600">
                ({filteredAndSortedData.length} users{hasActiveFilters ? ' filtered' : ''})
              </span>
            ) : null}
          </h3>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <SearchInput 
              onSearchChange={onSearchChange}
              searchLoading={searchLoading}
              initialValue={externalSearchTerm}
            />
          </div>
          
          {/* Clear All Filters Button */}
          {hasActiveFilters && (
            <div className="flex-shrink-0">
              <button
                onClick={clearAllFilters}
                className="flex items-center px-3 py-2 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded-md border border-red-200 transition-colors"
              >
                <X className="w-4 h-4 mr-1" />
                Clear All Filters
              </button>
            </div>
          )}
        </div>
        
        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="mt-3 flex flex-wrap gap-2">
            {Object.entries(filters).map(([key, values]) => 
              values.length > 0 ? (
                <div key={key} className="flex flex-wrap gap-1">
                  {values.map((value, index) => (
                    <div key={`${key}-${index}`} className="flex items-center bg-blue-50 text-blue-700 px-2 py-1 rounded-md text-sm border border-blue-200">
                      <Filter className="w-3 h-3 mr-1" />
                      <span className="capitalize">{key}:</span>
                      <span className="ml-1 font-medium">{value}</span>
                      <button
                        onClick={() => updateFilter(key as keyof typeof filters, value)}
                        className="ml-2 text-blue-500 hover:text-blue-700"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {values.length > 1 && (
                    <button
                      onClick={() => clearFilter(key as keyof typeof filters)}
                      className="flex items-center bg-red-50 text-red-600 px-2 py-1 rounded-md text-sm border border-red-200 hover:bg-red-100"
                    >
                      Clear {values.length} {key}
                    </button>
                  )}
                </div>
              ) : null
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto relative">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-8">
                {/* Expand column */}
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 relative"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    User
                    {sortBy === 'name' && (
                      <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFilterDropdown('name');
                    }}
                    className={`ml-2 p-1 rounded hover:bg-gray-200 relative ${filters.name.length > 0 ? 'text-blue-600' : 'text-gray-400'}`}
                  >
                    <Filter className="w-3 h-3" />
                    {filters.name.length > 0 && (
                      <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                        {filters.name.length}
                      </span>
                    )}
                  </button>
                </div>
                <FilterDropdown 
                  column="name" 
                  options={tableData.map(row => row.displayName).sort()}
                  placeholder="user names"
                />
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 relative"
                onClick={() => handleSort('accounts')}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Building2 className="w-3 h-3 mr-1" />
                    Accounts
                    {sortBy === 'accounts' && (
                      <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFilterDropdown('accounts');
                    }}
                    className={`ml-2 p-1 rounded hover:bg-gray-200 relative ${filters.accounts.length > 0 ? 'text-blue-600' : 'text-gray-400'}`}
                  >
                    <Filter className="w-3 h-3" />
                    {filters.accounts.length > 0 && (
                      <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                        {filters.accounts.length}
                      </span>
                    )}
                  </button>
                </div>
                <FilterDropdown 
                  column="accounts" 
                  options={filterOptions.accounts}
                  placeholder="account names"
                />
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 relative"
                onClick={() => handleSort('permissionSets')}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Shield className="w-3 h-3 mr-1" />
                    Permission Sets
                    {sortBy === 'permissionSets' && (
                      <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFilterDropdown('permissionSets');
                    }}
                    className={`ml-2 p-1 rounded hover:bg-gray-200 relative ${filters.permissionSets.length > 0 ? 'text-blue-600' : 'text-gray-400'}`}
                  >
                    <Filter className="w-3 h-3" />
                    {filters.permissionSets.length > 0 && (
                      <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                        {filters.permissionSets.length}
                      </span>
                    )}
                  </button>
                </div>
                <FilterDropdown 
                  column="permissionSets" 
                  options={filterOptions.permissionSets}
                  placeholder="permission sets"
                />
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 relative"
                onClick={() => handleSort('services')}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Key className="w-3 h-3 mr-1" />
                    Services
                    {sortBy === 'services' && (
                      <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFilterDropdown('services');
                    }}
                    className={`ml-2 p-1 rounded hover:bg-gray-200 relative ${filters.services.length > 0 ? 'text-blue-600' : 'text-gray-400'}`}
                  >
                    <Filter className="w-3 h-3" />
                    {filters.services.length > 0 && (
                      <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                        {filters.services.length}
                      </span>
                    )}
                  </button>
                </div>
                <FilterDropdown 
                  column="services" 
                  options={filterOptions.services}
                  placeholder="services"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Quick Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {/* Unified loading state */}
            {(loading || searchLoading) && (
              <>
                <tr>
                  <td colSpan={6} className="px-4 py-4 bg-blue-50">
                    <div className="flex items-center justify-center space-x-3">
                      <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                      <span className="text-blue-700 font-medium">
                        {searchLoading ? 'Searching users...' : 'Loading users...'}
                      </span>
                      <span className="text-sm text-blue-600">
                        {searchLoading ? 'Please wait while we find matching users' : 'Fetching user data from organization accounts'}
                      </span>
                    </div>
                  </td>
                </tr>
                <TableLoadingSkeleton />
              </>
            )}
            
            {/* Regular table rows when not loading */}
            {!loading && !searchLoading && filteredAndSortedData.map((row) => (
              <React.Fragment key={row.userId}>
                {/* Main row */}
                <tr 
                  className={`hover:bg-gray-50 ${selectedUser === row.userId ? 'bg-blue-50' : ''}`}
                >
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleRowExpansion(row.userId)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      {expandedRows.has(row.userId) ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                  </td>
                  
                  <td className="px-4 py-3">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {row.displayName}
                      </div>
                      <div className="text-xs text-gray-500">
                        {row.userName}
                      </div>
                      {row.email && (
                        <div className="text-xs text-gray-400">
                          {row.email}
                        </div>
                      )}
                    </div>
                  </td>
                  
                  <td className="px-4 py-3">
                    {loadingBulkAccess ? (
                      <div className="flex items-center">
                        <Loader2 className="w-3 h-3 animate-spin text-blue-500 mr-2" />
                        <div className="flex flex-col">
                          <div className="h-3 bg-gray-200 rounded w-8 mb-1 animate-pulse"></div>
                          <div className="h-2 bg-gray-200 rounded w-12 animate-pulse"></div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <span className={`text-sm font-medium ${row.accessibleAccounts > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                          {row.accessibleAccounts}
                        </span>
                        <span className="text-sm text-gray-500 ml-1">
                          / {row.totalAccounts}
                        </span>
                      </div>
                    )}
                    {!loadingBulkAccess && row.accessibleAccounts > 0 && (
                      <div className="text-xs text-gray-400">
                        {Math.round((row.accessibleAccounts / row.totalAccounts) * 100)}% coverage
                      </div>
                    )}
                  </td>
                  
                  <td className="px-4 py-3">
                    {loadingBulkAccess ? (
                      <div className="flex items-center">
                        <Loader2 className="w-3 h-3 animate-spin text-blue-500 mr-2" />
                        <div className="flex flex-col">
                          <div className="h-3 bg-gray-200 rounded w-6 mb-1 animate-pulse"></div>
                          <div className="h-2 bg-gray-200 rounded w-16 animate-pulse"></div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <span className={`text-sm font-medium ${row.totalPermissionSets > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                          {row.totalPermissionSets}
                        </span>
                        {row.totalPermissionSets > 0 && (
                          <div className="text-xs text-gray-400">
                            across {row.accessibleAccounts} account{row.accessibleAccounts !== 1 ? 's' : ''}
                          </div>
                        )}
                      </>
                    )}
                  </td>
                  
                  <td className="px-4 py-3">
                    {loadingBulkAccess ? (
                      <div className="flex items-center">
                        <Loader2 className="w-3 h-3 animate-spin text-blue-500 mr-2" />
                        <div className="flex gap-1">
                          <div className="h-6 bg-gray-200 rounded-full w-12 animate-pulse"></div>
                          <div className="h-6 bg-gray-200 rounded-full w-10 animate-pulse"></div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {row.services.length > 0 ? (
                          <>
                            {row.services.slice(0, 3).map((service, index) => (
                              <div key={index} className="flex items-center bg-gray-100 px-2 py-1 rounded-full">
                                {getServiceIcon(service)}
                                <span className="text-xs text-gray-700 ml-1 capitalize">{service}</span>
                              </div>
                            ))}
                            {row.services.length > 3 && (
                              <span className="text-xs text-gray-500 px-2 py-1">
                                +{row.services.length - 3} more
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-xs text-gray-400 px-2 py-1">No services</span>
                        )}
                      </div>
                    )}
                  </td>
                  
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleRowExpansion(row.userId)}
                      className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-800"
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      {expandedRows.has(row.userId) ? 'Hide Details' : 'View Details'}
                    </button>
                  </td>
                </tr>

                {/* Expanded row content */}
                {expandedRows.has(row.userId) && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 bg-gradient-to-r from-blue-50 to-indigo-50">
                      <div className="space-y-6">
                        {/* User Summary Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                          <div className="bg-white rounded-lg p-3 text-center shadow-sm">
                            <div className="text-xl font-bold text-blue-600">{row.accessibleAccounts}</div>
                            <div className="text-xs text-gray-600">Accessible Accounts</div>
                          </div>
                          <div className="bg-white rounded-lg p-3 text-center shadow-sm">
                            <div className="text-xl font-bold text-green-600">{row.totalPermissionSets}</div>
                            <div className="text-xs text-gray-600">Permission Sets</div>
                          </div>
                          <div className="bg-white rounded-lg p-3 text-center shadow-sm">
                            <div className="text-xl font-bold text-purple-600">{row.services.length}</div>
                            <div className="text-xs text-gray-600">AWS Services</div>
                          </div>
                          <div className="bg-white rounded-lg p-3 text-center shadow-sm">
                            <div className="text-xl font-bold text-orange-600">
                              {row.totalAccounts > 0 ? Math.round((row.accessibleAccounts / row.totalAccounts) * 100) : 0}%
                            </div>
                            <div className="text-xs text-gray-600">Coverage</div>
                          </div>
                        </div>

                        {/* Services Overview */}
                        {row.services.length > 0 && (
                          <div className="mb-6">
                            <h5 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                              <Key className="w-4 h-4 mr-2" />
                              Accessible AWS Services ({row.services.length})
                            </h5>
                            <div className="flex flex-wrap gap-2">
                              {row.services.map((service, index) => (
                                <div key={index} className="flex items-center bg-white px-3 py-2 rounded-lg shadow-sm border">
                                  {getServiceIcon(service)}
                                  <span className="ml-2 text-sm font-medium text-gray-900 capitalize">{service}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <h5 className="text-sm font-medium text-gray-900 mb-3">
                          Account Access Details for {row.displayName}
                        </h5>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {row.accountAccess.map((access) => (
                            <div 
                              key={access.accountId}
                              className={`border rounded-lg overflow-hidden shadow-sm ${
                                access.hasAccess ? 'bg-white border-green-200' : 'bg-gray-50 border-gray-200'
                              }`}
                            >
                              {/* Account Header */}
                              <div className={`p-3 ${access.hasAccess ? 'bg-green-50' : 'bg-gray-100'}`}>
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm font-medium text-gray-900 truncate">
                                    {access.accountName || access.accountId}
                                  </span>
                                  <span className={`w-3 h-3 rounded-full ${access.hasAccess ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                                </div>
                                
                                <div className="text-xs text-gray-500 mb-2">
                                  {access.accountId}
                                </div>
                                
                                {access.accessType && (
                                  <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                                    access.accessType === 'SSO' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                                  }`}>
                                    {access.accessType}
                                  </span>
                                )}
                              </div>
                              
                              {/* Access Details */}
                              {access.hasAccess && (
                                <div className="p-3">
                                  {/* Permission Sets */}
                                  {access.permissionSets && access.permissionSets.length > 0 && (
                                    <div className="mb-3">
                                      <div className="text-xs text-gray-600 mb-2 flex items-center">
                                        <Shield className="w-3 h-3 mr-1" />
                                        Permission Sets ({access.permissionSets.length})
                                      </div>
                                      <div className="space-y-2">
                                        {access.permissionSets.map((ps, index) => (
                                          <div key={index} className="bg-blue-50 rounded p-2">
                                            <div className="flex items-center justify-between">
                                              <Link
                                                href={`/permission-sets/${encodeURIComponent(ps.arn)}?account=${access.accountId}&user=${row.userId}&name=${encodeURIComponent(ps.name)}&back=${encodeURIComponent('/organization')}`}
                                                className="text-xs font-medium text-blue-900 hover:text-blue-700 hover:underline flex items-center"
                                              >
                                                {ps.name}
                                                <ExternalLink className="w-3 h-3 ml-1" />
                                              </Link>
                                            </div>
                                            {ps.description && (
                                              <div className="text-xs text-blue-700 mb-1">{ps.description}</div>
                                            )}
                                            {ps.sessionDuration && (
                                              <div className="text-xs text-blue-600">Session: {ps.sessionDuration}</div>
                                            )}
                                            {/* AWS Managed Policies */}
                                            {ps.managedPolicies && ps.managedPolicies.length > 0 && (
                                              <div className="mt-1">
                                                <div className="text-xs text-blue-600">AWS Managed Policies:</div>
                                                {ps.managedPolicies.slice(0, 3).map((policy, pIndex) => (
                                                  <div key={pIndex} className="text-xs text-blue-800 truncate">
                                                    • {policy.split('/').pop() || policy}
                                                  </div>
                                                ))}
                                                {ps.managedPolicies.length > 3 && (
                                                  <div className="text-xs text-blue-600">... +{ps.managedPolicies.length - 3} more</div>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* Service Access Summary */}
                                  {access.detailedAccess && access.detailedAccess.length > 0 && (
                                    <div>
                                      <div className="text-xs text-gray-600 mb-2 flex items-center">
                                        <Key className="w-3 h-3 mr-1" />
                                        Services ({Array.from(new Set(access.detailedAccess.map(d => d.service))).length})
                                      </div>
                                      <div className="flex flex-wrap gap-1">
                                        {Array.from(new Set(access.detailedAccess.map(d => d.service))).map((service, index) => (
                                          <div key={index} className="flex items-center bg-blue-50 px-2 py-1 rounded text-xs text-blue-700">
                                            {getServiceIcon(service)}
                                            <span className="ml-1 capitalize">{service}</span>
                                          </div>
                                        ))}
                                      </div>
                                      
                                      {/* Quick Action Summary */}
                                      <div className="mt-2 text-xs text-gray-600">
                                        Total Actions: {access.detailedAccess.reduce((sum, detail) => sum + detail.actions.length, 0)}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* Legacy roles display */}
                                  {access.roles && access.roles.length > 0 && (!access.permissionSets || access.permissionSets.length === 0) && (
                                    <div>
                                      <div className="text-xs text-gray-600 mb-1">Permission Sets:</div>
                                      {access.roles.map((role, index) => (
                                        <div key={index} className="text-xs text-blue-600 truncate">
                                          • {role.split('/').pop() || role}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              {/* Footer */}
                              <div className="px-3 py-2 bg-gray-50 border-t border-gray-100">
                                <div className="text-xs text-gray-400">
                                  Checked: {new Date(access.lastChecked).toLocaleString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {!loading && !searchLoading && filteredAndSortedData.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p>
            {hasActiveFilters 
              ? 'No users found matching the applied filters.'
              : 'No users found matching your criteria.'
            }
          </p>
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="mt-2 text-blue-600 hover:text-blue-800 underline"
            >
              Clear all filters to see all users
            </button>
          )}
        </div>
      )}

      {/* Pagination Controls */}
      <PaginationControls />
    </div>
  );
}
