'use client';

import { Building2 } from 'lucide-react';

interface RegionOption {
  value: string;
  label: string;
}

interface RegionSelectorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  icon?: React.ReactNode;
  description?: string;
  colorScheme?: 'green' | 'blue' | 'purple' | 'gray';
  className?: string;
}

const AWS_REGIONS: RegionOption[] = [
  { value: 'us-east-1', label: 'US East (N. Virginia)' },
  { value: 'us-east-2', label: 'US East (Ohio)' },
  { value: 'us-west-1', label: 'US West (N. California)' },
  { value: 'us-west-2', label: 'US West (Oregon)' },
  { value: 'ca-central-1', label: 'Canada (Central)' },
  { value: 'eu-west-1', label: 'Europe (Ireland)' },
  { value: 'eu-west-2', label: 'Europe (London)' },
  { value: 'eu-west-3', label: 'Europe (Paris)' },
  { value: 'eu-central-1', label: 'Europe (Frankfurt)' },
  { value: 'eu-north-1', label: 'Europe (Stockholm)' },
  { value: 'eu-south-1', label: 'Europe (Milan)' },
  { value: 'ap-northeast-1', label: 'Asia Pacific (Tokyo)' },
  { value: 'ap-northeast-2', label: 'Asia Pacific (Seoul)' },
  { value: 'ap-northeast-3', label: 'Asia Pacific (Osaka)' },
  { value: 'ap-southeast-1', label: 'Asia Pacific (Singapore)' },
  { value: 'ap-southeast-2', label: 'Asia Pacific (Sydney)' },
  { value: 'ap-southeast-3', label: 'Asia Pacific (Jakarta)' },
  { value: 'ap-south-1', label: 'Asia Pacific (Mumbai)' },
  { value: 'sa-east-1', label: 'South America (São Paulo)' },
  { value: 'af-south-1', label: 'Africa (Cape Town)' },
  { value: 'me-south-1', label: 'Middle East (Bahrain)' },
];

const getColorClasses = (colorScheme: string) => {
  switch (colorScheme) {
    case 'green':
      return {
        background: 'bg-green-50 border-green-200',
        text: 'text-green-800',
        icon: 'text-green-600',
        border: 'border-green-300',
        focus: 'focus:ring-green-500 focus:border-green-500',
        description: 'text-green-600'
      };
    case 'blue':
      return {
        background: 'bg-blue-50 border-blue-200',
        text: 'text-blue-800',
        icon: 'text-blue-600',
        border: 'border-blue-300',
        focus: 'focus:ring-blue-500 focus:border-blue-500',
        description: 'text-blue-600'
      };
    case 'purple':
      return {
        background: 'bg-purple-50 border-purple-200',
        text: 'text-purple-800',
        icon: 'text-purple-600',
        border: 'border-purple-300',
        focus: 'focus:ring-purple-500 focus:border-purple-500',
        description: 'text-purple-600'
      };
    default:
      return {
        background: 'bg-gray-50 border-gray-200',
        text: 'text-gray-800',
        icon: 'text-gray-600',
        border: 'border-gray-300',
        focus: 'focus:ring-gray-500 focus:border-gray-500',
        description: 'text-gray-600'
      };
  }
};

export default function RegionSelector({
  label,
  value,
  onChange,
  disabled = false,
  icon,
  description,
  colorScheme = 'gray',
  className = ''
}: RegionSelectorProps) {
  const colors = getColorClasses(colorScheme);
  const selectId = `region-selector-${label.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <div className={`${colors.background} border rounded-lg p-4 ${className}`}>
      <div className="flex items-center mb-2">
        {icon || <Building2 className={`w-4 h-4 ${colors.icon} mr-2`} />}
        <label htmlFor={selectId} className={`block text-sm font-medium ${colors.text}`}>
          {label}
        </label>
      </div>
      <select
        id={selectId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`block w-full px-3 py-2 border ${colors.border} rounded-md shadow-sm focus:outline-none ${colors.focus} sm:text-sm disabled:opacity-50 bg-white`}
      >
        {AWS_REGIONS.map((region) => (
          <option key={region.value} value={region.value}>
            {region.label}
          </option>
        ))}
      </select>
      {description && (
        <p className={`mt-1 text-xs ${colors.description}`}>
          {description}
        </p>
      )}
    </div>
  );
}

export { AWS_REGIONS };
export type { RegionOption, RegionSelectorProps };
