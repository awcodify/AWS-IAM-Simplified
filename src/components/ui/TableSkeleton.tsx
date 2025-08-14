import React from 'react';

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export function TableSkeleton({ rows = 5, columns = 4 }: TableSkeletonProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, index) => (
        <tr key={index} className="border-b border-gray-200">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <td key={colIndex} className="px-4 py-3">
              {colIndex === 0 ? (
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                  <div>
                    <div className="h-4 bg-gray-200 rounded w-24 mb-1"></div>
                    <div className="h-3 bg-gray-200 rounded w-32"></div>
                  </div>
                </div>
              ) : colIndex === 1 ? (
                <div className="h-6 bg-gray-200 rounded w-20"></div>
              ) : colIndex === 2 ? (
                <div className="flex space-x-1">
                  <div className="h-6 bg-gray-200 rounded-full w-12"></div>
                  <div className="h-6 bg-gray-200 rounded-full w-10"></div>
                  <div className="h-6 bg-gray-200 rounded-full w-8"></div>
                </div>
              ) : (
                <div className="h-6 bg-gray-200 rounded w-20"></div>
              )}
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
