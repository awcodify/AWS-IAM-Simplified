import React from 'react';
import { 
  Database, 
  Server, 
  Shield, 
  Key, 
  Eye 
} from 'lucide-react';

interface ServiceIconProps {
  service: string;
  className?: string;
}

export function ServiceIcon({ service, className = "w-3 h-3" }: ServiceIconProps) {
  const getServiceIcon = (service: string) => {
    switch (service.toLowerCase()) {
      case 's3':
        return <Database className={`${className} text-blue-600`} />;
      case 'ec2':
        return <Server className={`${className} text-orange-600`} />;
      case 'iam':
        return <Key className={`${className} text-red-600`} />;
      case 'lambda':
        return <Server className={`${className} text-purple-600`} />;
      case 'rds':
        return <Database className={`${className} text-blue-800`} />;
      case 'cloudformation':
        return <Server className={`${className} text-orange-500`} />;
      case 'cloudwatch':
        return <Eye className={`${className} text-green-600`} />;
      case 'sns':
        return <Server className={`${className} text-red-500`} />;
      case 'sqs':
        return <Server className={`${className} text-yellow-600`} />;
      default:
        return <Shield className={`${className} text-gray-600`} />;
    }
  };

  return getServiceIcon(service);
}
