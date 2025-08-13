'use client';

import React from 'react';
import { Shield, AlertTriangle, CheckCircle, Info, TrendingUp } from 'lucide-react';
import type { RiskLevel } from '@/types/risk-analysis';

interface RiskIndicatorProps {
  riskLevel: RiskLevel;
  riskScore: number;
  size?: 'sm' | 'md' | 'lg';
  showScore?: boolean;
  className?: string;
}

export default function RiskIndicator({ 
  riskLevel, 
  riskScore, 
  size = 'md', 
  showScore = false,
  className = '' 
}: RiskIndicatorProps) {
  const sizeConfig = {
    sm: { icon: 'w-3 h-3', text: 'text-xs', padding: 'px-1.5 py-0.5' },
    md: { icon: 'w-4 h-4', text: 'text-sm', padding: 'px-2 py-1' },
    lg: { icon: 'w-5 h-5', text: 'text-base', padding: 'px-3 py-1.5' }
  };

  const config = {
    'CRITICAL': { 
      bg: 'bg-red-100', 
      text: 'text-red-800', 
      border: 'border-red-200',
      icon: AlertTriangle,
      label: 'Critical'
    },
    'HIGH': { 
      bg: 'bg-orange-100', 
      text: 'text-orange-800', 
      border: 'border-orange-200',
      icon: TrendingUp,
      label: 'High'
    },
    'MEDIUM': { 
      bg: 'bg-yellow-100', 
      text: 'text-yellow-800', 
      border: 'border-yellow-200',
      icon: Shield,
      label: 'Medium'
    },
    'LOW': { 
      bg: 'bg-blue-100', 
      text: 'text-blue-800', 
      border: 'border-blue-200',
      icon: Info,
      label: 'Low'
    },
    'INFO': { 
      bg: 'bg-gray-100', 
      text: 'text-gray-800', 
      border: 'border-gray-200',
      icon: CheckCircle,
      label: 'Info'
    }
  };

  const { bg, text, border, icon: Icon, label } = config[riskLevel];
  const { icon: iconSize, text: textSize, padding } = sizeConfig[size];

  return (
    <span 
      className={`inline-flex items-center rounded-full font-medium border ${bg} ${text} ${border} ${padding} ${textSize} ${className}`}
      title={`Risk Level: ${label} (Score: ${riskScore}/10)`}
    >
      <Icon className={`${iconSize} mr-1`} />
      {label}
      {showScore && (
        <span className="ml-1 font-bold">
          {riskScore}/10
        </span>
      )}
    </span>
  );
}
