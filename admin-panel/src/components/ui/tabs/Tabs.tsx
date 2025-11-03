import React, { ReactNode, useState } from 'react'

interface Tab {
  key: string
  label: string
  children: ReactNode
}

interface TabsProps {
  items: Tab[]
  defaultActiveKey?: string
}

export default function Tabs({ items, defaultActiveKey }: TabsProps) {
  const [activeKey, setActiveKey] = useState(defaultActiveKey || items[0]?.key)

  return (
    <div className="w-full">
      {/* Tab Headers */}
      <div className="border-b border-gray-200 dark:border-gray-800">
        <div className="flex gap-2">
          {items.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveKey(tab.key)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                activeKey === tab.key
                  ? 'border-brand-500 text-brand-500 dark:text-brand-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {items.find((tab) => tab.key === activeKey)?.children}
      </div>
    </div>
  )
}

