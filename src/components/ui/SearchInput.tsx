import React, { useState, useRef, useEffect } from 'react';
import { Search, Loader2 } from 'lucide-react';

interface SearchInputProps {
  onSearchChange: (term: string) => void;
  searchLoading: boolean;
  initialValue?: string;
  placeholder?: string;
}

export function SearchInput({ 
  onSearchChange, 
  searchLoading, 
  initialValue = '',
  placeholder = "Search users..."
}: SearchInputProps) {
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
    // Select all text when focused for better UX
    if (searchInputRef.current) {
      searchInputRef.current.select();
    }
  };

  return (
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        {searchLoading ? (
          <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
        ) : (
          <Search className="h-4 w-4 text-gray-400" />
        )}
      </div>
      <input
        ref={searchInputRef}
        type="text"
        value={localSearchTerm}
        onChange={handleChange}
        onFocus={handleFocus}
        placeholder={placeholder}
        disabled={searchLoading}
        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      />
    </div>
  );
}
