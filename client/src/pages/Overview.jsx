import React from 'react';
import { PageHeader, Card } from '../components/common';
import { BarChart3 } from 'lucide-react';

export const Overview = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview"
        subtitle="Business overview and performance analytics"
      />

      <Card padding="spacious" className="text-center py-16">
        <div className="w-14 h-14 rounded-2xl bg-red-50 text-[#E53935] flex items-center justify-center mx-auto mb-4 shadow-xs">
          <BarChart3 className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">This is Overview Page</h2>
        <p className="text-sm text-gray-500 max-w-md mx-auto mt-1.5">
          Overview summary and fleet operational analytics section.
        </p>
      </Card>
    </div>
  );
};
