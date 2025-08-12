'use client';

import React, { useState } from 'react';
import { 
  Shield, 
  Key, 
  FileText, 
  Clock, 
  Users, 
  ChevronDown, 
  ChevronRight,
  ExternalLink,
  Database,
  Server,
  Eye,
  AlertTriangle,
  Info
} from 'lucide-react';
import type { PermissionSetDetails as PermissionSetDetailsType } from '@/types/aws';

interface PermissionSetDetailsProps {
  permissionSet: PermissionSetDetailsType & { hasLimitedInfo?: boolean };
  permissionSetArn: string;
  contextAccountId?: string | null;
  contextUserId?: string | null;
}

interface ParsedPolicy {
  version: string;
  statements: PolicyStatement[];
}

interface PolicyStatement {
  effect: 'Allow' | 'Deny';
  actions: string[];
  resources: string[];
  conditions?: Record<string, unknown>;
  services: string[];
}

export default function PermissionSetDetails({ 
  permissionSet, 
  permissionSetArn
}: PermissionSetDetailsProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['managed-policies', 'customer-policies', 'inline-policy']));
  const [selectedPolicy, setSelectedPolicy] = useState<string | null>(null);

  const getServiceIcon = (service: string) => {
    switch (service.toLowerCase()) {
      case 's3':
        return <Database className="w-4 h-4 text-blue-600" />;
      case 'ec2':
        return <Server className="w-4 h-4 text-orange-600" />;
      case 'iam':
        return <Key className="w-4 h-4 text-red-600" />;
      case 'lambda':
        return <Server className="w-4 h-4 text-purple-600" />;
      case 'rds':
        return <Database className="w-4 h-4 text-blue-800" />;
      case 'cloudformation':
        return <Server className="w-4 h-4 text-orange-500" />;
      case 'cloudwatch':
        return <Eye className="w-4 h-4 text-green-600" />;
      case 'sns':
        return <Server className="w-4 h-4 text-red-500" />;
      case 'sqs':
        return <Server className="w-4 h-4 text-yellow-600" />;
      default:
        return <Shield className="w-4 h-4 text-gray-600" />;
    }
  };

  const parseInlinePolicy = (policyDocument?: string): ParsedPolicy | null => {
    if (!policyDocument) return null;
    
    const policy = JSON.parse(policyDocument);
    const statements: PolicyStatement[] = [];
    
    const statementArray = Array.isArray(policy.Statement) ? policy.Statement : [policy.Statement];
    
    statementArray.forEach((stmt: { Effect?: string; Action?: string | string[]; Resource?: string | string[]; Condition?: Record<string, unknown> }) => {
      const actions = Array.isArray(stmt.Action) ? stmt.Action.filter(Boolean) : stmt.Action ? [stmt.Action] : [];
      const resources = Array.isArray(stmt.Resource) ? stmt.Resource.filter(Boolean) : stmt.Resource ? [stmt.Resource] : [];
      
      // Extract services from actions
      const services = Array.from(new Set(
        actions
          .filter((action): action is string => typeof action === 'string' && action.includes(':'))
          .map((action: string) => action.split(':')[0])
      )) as string[];
      
      statements.push({
        effect: (stmt.Effect as 'Allow' | 'Deny') || 'Allow',
        actions,
        resources,
        conditions: stmt.Condition,
        services
      });
    });
    
    return {
      version: policy.Version || '2012-10-17',
      statements
    };
  };

  const getPermissionSetServices = (): string[] => {
    const services = new Set<string>();
    
    // Extract from inline policy if it exists
    if (permissionSet.inlinePolicyDocument) {
      const parsedPolicy = parseInlinePolicy(permissionSet.inlinePolicyDocument);
      if (parsedPolicy) {
        parsedPolicy.statements.forEach(statement => {
          statement.services.forEach(service => services.add(service));
        });
      }
    }
    
    return Array.from(services).sort();
  };

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Limited Info Warning */}
      {permissionSet.hasLimitedInfo && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <Info className="w-5 h-5 text-yellow-600 mr-3" />
            <div>
              <div className="text-sm font-medium text-yellow-800">Limited Information Available</div>
              <div className="text-xs text-yellow-700 mt-1">
                Detailed permission set information requires additional AWS SSO admin permissions. 
                Showing basic information only.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <Shield className="w-6 h-6 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">{permissionSet.name}</h1>
            </div>
            
            {permissionSet.description && (
              <p className="text-gray-600 mb-4">{permissionSet.description}</p>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="flex items-center">
                  <Clock className="w-5 h-5 text-blue-600 mr-2" />
                  <div>
                    <div className="text-sm font-medium text-blue-900">Session Duration</div>
                    <div className="text-xs text-blue-700">
                      {permissionSet.sessionDuration || 'Default (1 hour)'}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-purple-50 rounded-lg p-3">
                <div className="flex items-center">
                  <FileText className="w-5 h-5 text-purple-600 mr-2" />
                  <div>
                    <div className="text-sm font-medium text-purple-900">Policies</div>
                    <div className="text-xs text-purple-700">
                      {(permissionSet.managedPolicies?.length || 0) + 
                       (permissionSet.customerManagedPolicies?.length || 0) +
                       (permissionSet.inlinePolicyDocument ? 1 : 0)} total
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-green-50 rounded-lg p-3">
                <div className="flex items-center">
                  <Server className="w-5 h-5 text-green-600 mr-2" />
                  <div>
                    <div className="text-sm font-medium text-green-900">Services</div>
                    <div className="text-xs text-green-700">
                      {(() => {
                        const services = getPermissionSetServices();
                        return services.length > 0 ? `${services.length} detected` : 'None detected';
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="text-right ml-6">
            <div className="text-xs text-gray-600 mb-1 font-medium">Permission Set ARN</div>
            <div className="text-xs font-mono text-gray-800 bg-gray-100 px-2 py-1 rounded max-w-md break-all">
              {permissionSetArn}
            </div>
          </div>
        </div>
      </div>

      {/* AWS Managed Policies */}
      {permissionSet.managedPolicies && permissionSet.managedPolicies.length > 0 && (
        <div className="bg-white shadow rounded-lg">
          <button
            onClick={() => toggleSection('managed-policies')}
            className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50"
          >
            <div className="flex items-center">
              <Shield className="w-5 h-5 text-gray-600 mr-3" />
              <span className="text-lg font-medium text-gray-900">
                AWS Managed Policies ({permissionSet.managedPolicies.length})
              </span>
            </div>
            {expandedSections.has('managed-policies') ? (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronRight className="w-5 h-5 text-gray-400" />
            )}
          </button>
          
          {expandedSections.has('managed-policies') && (
            <div className="px-6 pb-6">
              <div className="space-y-3">
                {permissionSet.managedPolicies.map((policyArn, index) => {
                  const policyName = policyArn.split('/').pop() || policyArn;
                  return (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-gray-800">{policyName}</div>
                          <div className="text-xs text-gray-600 font-mono mt-1">{policyArn}</div>
                        </div>
                        <a
                          href={`https://console.aws.amazon.com/iam/home#/policies/arn:${policyArn.replace(':', '%3A').replace('/', '%2F')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm"
                        >
                          View in AWS Console
                          <ExternalLink className="w-3 h-3 ml-1" />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Customer Managed Policies */}
      {permissionSet.customerManagedPolicies && permissionSet.customerManagedPolicies.length > 0 && (
        <div className="bg-white shadow rounded-lg">
          <button
            onClick={() => toggleSection('customer-policies')}
            className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50"
          >
            <div className="flex items-center">
              <Users className="w-5 h-5 text-gray-600 mr-3" />
              <span className="text-lg font-medium text-gray-900">
                Customer Managed Policies ({permissionSet.customerManagedPolicies.length})
              </span>
            </div>
            {expandedSections.has('customer-policies') ? (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronRight className="w-5 h-5 text-gray-400" />
            )}
          </button>
          
          {expandedSections.has('customer-policies') && (
            <div className="px-6 pb-6">
              <div className="space-y-3">
                {permissionSet.customerManagedPolicies.map((policy, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="font-semibold text-gray-800">{policy.name}</div>
                    <div className="text-sm text-gray-600">Path: {policy.path}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Inline Policy */}
      {permissionSet.inlinePolicyDocument && (
        <div className="bg-white shadow rounded-lg">
          <button
            onClick={() => toggleSection('inline-policy')}
            className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50"
          >
            <div className="flex items-center">
              <FileText className="w-5 h-5 text-gray-600 mr-3" />
              <span className="text-lg font-medium text-gray-900">Inline Policy</span>
            </div>
            {expandedSections.has('inline-policy') ? (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronRight className="w-5 h-5 text-gray-400" />
            )}
          </button>
          
          {expandedSections.has('inline-policy') && (
            <div className="px-6 pb-6">
              <div className="space-y-4">
                {/* Parsed Policy Summary */}
                {(() => {
                  const parsedPolicy = parseInlinePolicy(permissionSet.inlinePolicyDocument);
                  if (parsedPolicy) {
                    return (
                      <div className="space-y-4">
                        <div className="text-sm text-gray-600 mb-3">
                          Policy Version: {parsedPolicy.version} | {parsedPolicy.statements.length} statement(s)
                        </div>
                        
                        {parsedPolicy.statements.map((statement, index) => (
                          <div key={index} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center space-x-2">
                                <span className={`px-2 py-1 text-xs font-medium rounded ${
                                  statement.effect === 'Allow' 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {statement.effect}
                                </span>
                                <span className="text-sm text-gray-600">
                                  {statement.actions.length} action(s), {statement.resources.length} resource(s)
                                </span>
                              </div>
                            </div>
                            
                            {/* Services */}
                            {statement.services.length > 0 && (
                              <div className="mb-3">
                                <div className="text-xs font-medium text-gray-700 mb-2">Services:</div>
                                <div className="flex flex-wrap gap-1">
                                  {statement.services.map((service, sIndex) => (
                                    <div key={sIndex} className="flex items-center bg-blue-50 px-2 py-1 rounded text-xs">
                                      {getServiceIcon(service)}
                                      <span className="ml-1 capitalize text-blue-800 font-medium">{service}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* Actions */}
                            <div className="mb-3">
                              <div className="text-xs font-medium text-gray-700 mb-2">Actions:</div>
                              <div className="bg-gray-50 rounded p-2 max-h-32 overflow-y-auto">
                                <div className="text-xs font-mono text-gray-700">
                                  {statement.actions.map((action, aIndex) => (
                                    <div key={aIndex}>{action}</div>
                                  ))}
                                </div>
                              </div>
                            </div>
                            
                            {/* Resources */}
                            <div>
                              <div className="text-xs font-medium text-gray-700 mb-2">Resources:</div>
                              <div className="bg-gray-50 rounded p-2 max-h-32 overflow-y-auto">
                                <div className="text-xs font-mono text-gray-700">
                                  {statement.resources.map((resource, rIndex) => (
                                    <div key={rIndex}>{resource}</div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  }
                  return null;
                })()}
                
                {/* Raw Policy Document */}
                <div className="mt-4">
                  <button
                    onClick={() => setSelectedPolicy(selectedPolicy === 'inline' ? null : 'inline')}
                    className="text-sm text-blue-600 hover:text-blue-800 mb-2"
                  >
                    {selectedPolicy === 'inline' ? 'Hide' : 'Show'} Raw Policy Document
                  </button>
                  
                  {selectedPolicy === 'inline' && (
                    <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                      <pre className="text-xs">
                        {JSON.stringify(JSON.parse(permissionSet.inlinePolicyDocument), null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Security Analysis */}
      <div className="bg-white shadow rounded-lg">
        <button
          onClick={() => toggleSection('security')}
          className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50"
        >
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-gray-600 mr-3" />
            <span className="text-lg font-medium text-gray-900">Policy Summary</span>
          </div>
          {expandedSections.has('security') ? (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-400" />
          )}
        </button>
        
        {expandedSections.has('security') && (
          <div className="px-6 pb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Policy Overview</h4>
                <div className="p-4 rounded-lg border border-gray-200 bg-gray-50">
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-700">AWS Managed Policies:</span>
                      <span className="font-semibold text-gray-800">{permissionSet.managedPolicies?.length || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700">Customer Managed Policies:</span>
                      <span className="font-semibold text-gray-800">{permissionSet.customerManagedPolicies?.length || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700">Inline Policy:</span>
                      <span className="font-semibold text-gray-800">{permissionSet.inlinePolicyDocument ? 'Yes' : 'No'}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Security Best Practices</h4>
                <div className="space-y-2 text-sm text-gray-600">
                  <div>• Review all attached policies regularly</div>
                  <div>• Monitor usage patterns and access logs</div>
                  <div>• Apply principle of least privilege</div>
                  <div>• Use time-limited access when possible</div>
                  <div>• Document business justification for permissions</div>
                  <div>• Consider MFA requirements for sensitive operations</div>
                </div>
              </div>
            </div>
            
            {/* Notable Policy Highlights */}
            {(permissionSet.managedPolicies?.some(policy => 
              policy.toLowerCase().includes('administrator') || 
              policy.toLowerCase().includes('fullaccess')
            ) || permissionSet.inlinePolicyDocument) && (
              <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start">
                  <Info className="w-5 h-5 text-amber-600 mr-3 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-amber-800">Review Recommended</div>
                    <div className="text-xs text-amber-700 mt-1">
                      This permission set includes policies that may grant broad access. Please review the specific permissions and ensure they align with the principle of least privilege.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
