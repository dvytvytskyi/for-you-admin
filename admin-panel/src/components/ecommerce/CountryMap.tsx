import React from "react";

// CountryMap component temporarily disabled - @react-jvectormap not installed
// This is a placeholder component
interface CountryMapProps {
  mapColor?: string;
}

const CountryMap: React.FC<CountryMapProps> = ({ mapColor }) => {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] p-8">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
          World Map
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Map component will be available soon
        </p>
      </div>
    </div>
  );
};

export default CountryMap;
