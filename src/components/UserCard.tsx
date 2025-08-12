'use client';

import { Users, Calendar, Hash, CheckCircle, XCircle, Loader2, Shield, Key, Server, Database } from 'lucide-react';
import type { IAMUser, OrganizationUser, CrossAccountUserAccess } from '@/types/aws';

interface BaseUserCardProps {
  onClick?: () => void;
  isSelected?: boolean;
  isLoading?: boolean;
  className?: string;
}

interface SingleAccountUserCardProps extends BaseUserCardProps {
  variant: 'single-account';
  user: IAMUser;
  statusText?: string;
}

interface OrganizationUserCardProps extends BaseUserCardProps {
  variant: 'organization';
  user: OrganizationUser;
  accountAccess: CrossAccountUserAccess[];
  statusText?: string;
  isExpanded?: boolean;
  onLoadAccess?: () => void;
  loadingAccess?: boolean;
}

type UserCardProps = SingleAccountUserCardProps | OrganizationUserCardProps;

export default function UserCard(props: UserCardProps) {
  const { onClick, isSelected, className, variant } = props;

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getAccessStatusIcon = (hasAccess: boolean) => {
    return hasAccess ? (
      <CheckCircle className="w-4 h-4 text-green-500" />
    ) : (
      <XCircle className="w-4 h-4 text-red-500" />
    );
  };

  const getServiceIcon = (service: string) => {
    switch (service.toLowerCase()) {
      case 's3':
        return <Database className="w-3 h-3" />;
      case 'ec2':
        return <Server className="w-3 h-3" />;
      case 'iam':
        return <Key className="w-3 h-3" />;
      case 'lambda':
        return <Server className="w-3 h-3" />;
      default:
        return <Shield className="w-3 h-3" />;
    }
  };

  const getAccessTypeColor = (accessType?: string) => {
    switch (accessType) {
      case 'IAM':
        return 'bg-blue-100 text-blue-800';
      case 'SSO':
        return 'bg-green-100 text-green-800';
      case 'AssumedRole':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (variant === 'single-account') {
    const { user } = props;
    
    return (
      <div
        onClick={onClick}
        className={`border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
          isSelected
            ? 'border-blue-500 bg-blue-50 shadow-md'
            : 'border-gray-200 hover:border-gray-300 bg-white'
        } ${className || ''}`}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center mb-2">
              <h4 className="text-sm font-medium text-gray-900 mr-3">
                {user.UserName}
              </h4>
              {isSelected && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Selected
                </span>
              )}
            </div>
            
            <div className="space-y-1 text-xs text-gray-600">
              <div className="flex items-center">
                <Hash className="h-3 w-3 mr-1" />
                <span className="font-mono">{user.UserId}</span>
              </div>
              <div className="flex items-center">
                <Calendar className="h-3 w-3 mr-1" />
                <span>Created {formatDate(user.CreateDate)}</span>
              </div>
              {user.Path !== '/' && (
                <div className="text-gray-500">
                  Path: {user.Path}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Organization variant
  const { user: orgUser, accountAccess, statusText, isExpanded, loadingAccess } = props as OrganizationUserCardProps;
  const user = orgUser.user;

  return (
    <div className={`p-6 ${className || ''}`}>
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={onClick}
      >
        <div className="flex items-center">
          <div className="bg-blue-100 rounded-full p-2 mr-3">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              {user.DisplayName || user.UserName}
            </h3>
            <p className="text-sm text-gray-500">
              {user.UserName}
            </p>
            {user.Emails.length > 0 && (
              <p className="text-sm text-gray-400">
                {user.Emails[0].Value}
              </p>
            )}
            <p className="text-xs text-gray-400">
              Home Account: {orgUser.homeAccountId}
            </p>
            {/* Quick Service Preview */}
            {accountAccess.length > 0 && !isExpanded && (
              <div className="mt-1">
                {(() => {
                  const accessibleAccounts = accountAccess.filter(a => a.hasAccess);
                  const uniqueServices = new Set(
                    accessibleAccounts.flatMap(acc => 
                      acc.detailedAccess?.map(detail => detail.service) || []
                    )
                  );
                  const serviceArray = Array.from(uniqueServices).slice(0, 4);
                  
                  if (serviceArray.length > 0) {
                    return (
                      <div className="flex items-center space-x-1">
                        {serviceArray.map((service, index) => (
                          <div key={index} className="flex items-center bg-blue-50 px-1 py-0.5 rounded text-xs text-blue-700">
                            {getServiceIcon(service)}
                            <span className="ml-1 capitalize">{service}</span>
                          </div>
                        ))}
                        {uniqueServices.size > 4 && (
                          <span className="text-xs text-gray-400">+{uniqueServices.size - 4}</span>
                        )}
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {loadingAccess ? (
            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
          ) : accountAccess.length > 0 ? (
            <div className="text-right">
              <div className="text-sm text-gray-500">
                {accountAccess.filter(a => a.hasAccess).length} / {accountAccess.length} accounts
              </div>
              {accountAccess.length > 0 && (
                <div className="text-xs text-gray-400">
                  {(() => {
                    const accessibleAccounts = accountAccess.filter(a => a.hasAccess);
                    const totalPermissionSets = accessibleAccounts.reduce((sum, acc) => 
                      sum + (acc.permissionSets?.length || acc.roles?.length || 0), 0
                    );
                    const uniqueServices = new Set(
                      accessibleAccounts.flatMap(acc => 
                        acc.detailedAccess?.map(detail => detail.service) || []
                      )
                    );
                    
                    if (totalPermissionSets > 0 && uniqueServices.size > 0) {
                      return `${totalPermissionSets} permission sets • ${uniqueServices.size} services`;
                    } else if (totalPermissionSets > 0) {
                      return `${totalPermissionSets} permission sets`;
                    } else if (accessibleAccounts.length > 0) {
                      return 'Access configured';
                    }
                    return '';
                  })()}
                </div>
              )}
            </div>
          ) : (
            <span className="text-sm text-gray-400">
              {statusText || 'Click to load access info'}
            </span>
          )}
          <svg 
            className={`w-5 h-5 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 pl-12">
          {loadingAccess ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="ml-2 text-gray-600">Loading account access...</span>
            </div>
          ) : accountAccess.length > 0 ? (
            <>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Account Access</h4>
              <div className="space-y-4">
                {accountAccess.map((access) => (
                  <div 
                    key={access.accountId}
                    className="border rounded-lg bg-white shadow-sm"
                  >
                    {/* Account Header */}
                    <div className="p-4 border-b border-gray-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-900">
                          {access.accountName || access.accountId}
                        </span>
                        {getAccessStatusIcon(access.hasAccess)}
                      </div>
                      <div className="text-xs text-gray-500 mb-2">
                        ID: {access.accountId}
                      </div>
                      {access.hasAccess && access.accessType && (
                        <div className="mb-2">
                          <span className={`inline-block px-2 py-1 text-xs rounded-full ${getAccessTypeColor(access.accessType)}`}>
                            {access.accessType}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Detailed Permission Information */}
                    {access.hasAccess && (
                      <div className="p-4">
                        {/* Permission Sets */}
                        {access.permissionSets && access.permissionSets.length > 0 && (
                          <div className="mb-4">
                            <h5 className="text-xs font-medium text-gray-700 mb-2 flex items-center">
                              <Shield className="w-3 h-3 mr-1" />
                              Permission Sets ({access.permissionSets.length})
                            </h5>
                            <div className="space-y-2">
                              {access.permissionSets.map((permSet, index) => (
                                <div key={index} className="bg-blue-50 rounded p-2">
                                  <div className="text-xs font-medium text-blue-900 mb-1">
                                    {permSet.name}
                                  </div>
                                  {permSet.description && (
                                    <div className="text-xs text-blue-700 mb-1">
                                      {permSet.description}
                                    </div>
                                  )}
                                  {permSet.sessionDuration && (
                                    <div className="text-xs text-blue-600">
                                      Session: {permSet.sessionDuration}
                                    </div>
                                  )}
                                  {permSet.managedPolicies && permSet.managedPolicies.length > 0 && (
                                    <div className="mt-1">
                                      <div className="text-xs text-blue-600 mb-1">AWS Managed Policies:</div>
                                      {permSet.managedPolicies.map((policy, pIndex) => (
                                        <div key={pIndex} className="text-xs text-blue-800 truncate">
                                          • {policy.split('/').pop() || policy}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  {permSet.customerManagedPolicies && permSet.customerManagedPolicies.length > 0 && (
                                    <div className="mt-1">
                                      <div className="text-xs text-blue-600 mb-1">Customer Managed Policies:</div>
                                      {permSet.customerManagedPolicies.map((policy, pIndex) => (
                                        <div key={pIndex} className="text-xs text-blue-800">
                                          • {policy.name}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Detailed Resource Access */}
                        {access.detailedAccess && access.detailedAccess.length > 0 && (
                          <div className="mb-4">
                            <h5 className="text-xs font-medium text-gray-700 mb-2 flex items-center">
                              <Key className="w-3 h-3 mr-1" />
                              Service Permissions
                            </h5>
                            <div className="space-y-2">
                              {access.detailedAccess.map((detail, index) => (
                                <div key={index} className="bg-gray-50 rounded p-2">
                                  <div className="flex items-center mb-1">
                                    {getServiceIcon(detail.service)}
                                    <span className="text-xs font-medium text-gray-800 ml-1 capitalize">
                                      {detail.service}
                                    </span>
                                    <span className={`ml-2 text-xs px-1 rounded ${
                                      detail.effect === 'Allow' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                    }`}>
                                      {detail.effect}
                                    </span>
                                  </div>
                                  
                                  {/* Actions */}
                                  <div className="mb-1">
                                    <div className="text-xs text-gray-600">Actions:</div>
                                    <div className="text-xs text-gray-800 max-h-16 overflow-y-auto">
                                      {detail.actions.length > 3 ? (
                                        <>
                                          {detail.actions.slice(0, 3).map((action, aIndex) => (
                                            <div key={aIndex}>• {action}</div>
                                          ))}
                                          <div className="text-gray-500">... +{detail.actions.length - 3} more</div>
                                        </>
                                      ) : (
                                        detail.actions.map((action, aIndex) => (
                                          <div key={aIndex}>• {action}</div>
                                        ))
                                      )}
                                    </div>
                                  </div>
                                  
                                  {/* Resources */}
                                  <div className="mb-1">
                                    <div className="text-xs text-gray-600">Resources:</div>
                                    <div className="text-xs text-gray-800 max-h-16 overflow-y-auto">
                                      {detail.resources.length > 2 ? (
                                        <>
                                          {detail.resources.slice(0, 2).map((resource, rIndex) => (
                                            <div key={rIndex} className="truncate">• {resource}</div>
                                          ))}
                                          <div className="text-gray-500">... +{detail.resources.length - 2} more</div>
                                        </>
                                      ) : (
                                        detail.resources.map((resource, rIndex) => (
                                          <div key={rIndex} className="truncate">• {resource}</div>
                                        ))
                                      )}
                                    </div>
                                  </div>
                                  
                                  {/* Conditions */}
                                  {detail.condition && (
                                    <div className="text-xs text-gray-600">
                                      Conditions: {JSON.stringify(detail.condition, null, 2).length > 50 ? 'Complex conditions applied' : JSON.stringify(detail.condition)}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Legacy Permission Sets Display (fallback) */}
                        {access.roles && access.roles.length > 0 && (!access.permissionSets || access.permissionSets.length === 0) && (
                          <div className="mb-2">
                            <div className="text-xs text-gray-600 mb-1">Permission Sets:</div>
                            {access.roles.map((role: string, index: number) => (
                              <div key={index} className="text-xs text-blue-600 truncate">
                                {role.split('/').pop() || role}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Footer */}
                    <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
                      <div className="text-xs text-gray-400">
                        Checked: {new Date(access.lastChecked).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
