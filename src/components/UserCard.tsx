'use client';

import { Users, CheckCircle, XCircle, Loader2, Shield, Key, Server, Database } from 'lucide-react';
import type { OrganizationUser, CrossAccountUserAccess } from '@/types/aws';

interface UserCardProps {
  user: OrganizationUser;
  accountAccess: CrossAccountUserAccess[];
  statusText?: string;
  isExpanded?: boolean;
  onLoadAccess?: () => void;
  loadingAccess?: boolean;
  onClick?: () => void;
  isSelected?: boolean;
  isLoading?: boolean;
  className?: string;
}

export default function UserCard(props: UserCardProps) {
  const { onClick, isSelected, className, user, accountAccess, statusText, isExpanded, loadingAccess, isLoading } = props;

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
        return <Shield className="w-3 h-3" />;
      default:
        return <Key className="w-3 h-3" />;
    }
  };

  const identityCenterUser = user.user;

  return (
    <div
      className={`bg-white rounded-lg shadow border border-gray-200 p-4 cursor-pointer transition-all duration-200 ${
        isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'hover:border-gray-300 hover:shadow-md'
      } ${className || ''}`}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">
              {identityCenterUser.DisplayName || identityCenterUser.UserName}
            </h3>
            <p className="text-sm text-gray-500">
              {identityCenterUser.UserName}
            </p>
            {identityCenterUser.Emails.length > 0 && (
              <p className="text-sm text-gray-400">
                {identityCenterUser.Emails[0].Value}
              </p>
            )}
          </div>
        </div>
        {isLoading && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4 mb-3">
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-900">
            {accountAccess.filter(a => a.hasAccess).length} / {accountAccess.length}
          </div>
          <div className="text-xs text-gray-500">Accounts</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-900">
            {(() => {
              const accessibleAccounts = accountAccess.filter(a => a.hasAccess);
              const totalPermissionSets = accessibleAccounts.reduce((sum, acc) =>
                sum + (acc.permissionSets?.length || 0), 0
              );
              return totalPermissionSets;
            })()}
          </div>
          <div className="text-xs text-gray-500">Permission Sets</div>
        </div>
      </div>

      {/* Services Preview */}
      <div className="mb-3">
        <div className="text-xs text-gray-500 mb-1">Services Access:</div>
        <div className="flex flex-wrap gap-1">
          {(() => {
            const services = [...new Set(
              accountAccess.filter(a => a.hasAccess)
                .flatMap(acc =>
                  acc.detailedAccess?.map(detail => detail.service) || []
                )
            )].slice(0, 8);

            return services.length > 0 ? (
              services.map((service, index) => (
                <div key={index} className="flex items-center bg-gray-100 rounded px-2 py-1 text-xs">
                  {getServiceIcon(service)}
                  <span className="ml-1 capitalize">{service}</span>
                </div>
              ))
            ) : (
              <span className="text-xs text-gray-400">No services available</span>
            );
          })()}
        </div>
      </div>

      {/* Status Text */}
      {statusText && (
        <div className="text-xs text-gray-500 mb-3">
          {statusText}
        </div>
      )}

      {/* Load Access Button */}
      {props.onLoadAccess && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            props.onLoadAccess?.();
          }}
          className="w-full text-xs bg-blue-50 hover:bg-blue-100 text-blue-600 py-2 px-3 rounded transition-colors duration-200 mb-3"
          disabled={loadingAccess}
        >
          {loadingAccess ? (
            <span className="flex items-center justify-center">
              <Loader2 className="w-3 h-3 animate-spin mr-1" />
              Loading access...
            </span>
          ) : (
            'Load Access Details'
          )}
        </button>
      )}

      {/* Expanded Details */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <h4 className="font-medium text-gray-900 mb-3">Account Access Details</h4>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {accountAccess.map((access) => (
              <div key={access.accountId} className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {getAccessStatusIcon(access.hasAccess)}
                    <span className="font-medium text-sm">
                      {access.accountName}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {access.accountId}
                  </span>
                </div>

                {access.hasAccess && access.permissionSets && access.permissionSets.length > 0 && (
                  <div className="mt-2">
                    <div className="text-xs text-gray-500 mb-1">Permission Sets:</div>
                    <div className="space-y-2">
                      {access.permissionSets.map((permSet, index) => (
                        <div key={index} className="bg-gray-50 rounded p-2">
                          <div className="font-medium text-sm text-gray-900">
                            {permSet.name}
                          </div>
                          {permSet.description && (
                            <div className="text-xs text-gray-600 mt-1">
                              {permSet.description}
                            </div>
                          )}
                          {permSet.managedPolicies && permSet.managedPolicies.length > 0 && (
                            <div className="mt-1">
                              <div className="text-xs text-gray-500">Managed Policies:</div>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {permSet.managedPolicies.map((policy, pIndex) => (
                                  <span key={pIndex} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                    {policy.split('/').pop()}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!access.hasAccess && (
                  <div className="text-xs text-gray-500 mt-2">
                    No access to this account
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}