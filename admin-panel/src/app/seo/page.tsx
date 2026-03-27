'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { PlusIcon, DashboardIcon, ListIcon, PieChartIcon } from '@/icons'
import Button from '@/components/ui/button/Button'
import SeoDevelopersList from '@/components/seo/SeoDevelopersList'
import SeoAreasList from '@/components/seo/SeoAreasList'

export default function SeoPage() {
    const [activeTab, setActiveTab] = useState('developers')

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-semibold text-gray-800 dark:text-white">AI SEO</h1>
                  <p className="text-sm text-gray-500 mt-1">Manage developers and areas for analytical SEO purposes</p>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
                <div className="border-b border-gray-100 dark:border-gray-800">
                    <nav className="flex -mb-px">
                        <button
                            onClick={() => setActiveTab('developers')}
                            className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                                activeTab === 'developers'
                                    ? 'border-brand-500 text-brand-500'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-400'
                            }`}
                        >
                            Developers
                        </button>
                        <button
                            onClick={() => setActiveTab('areas')}
                            className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                                activeTab === 'areas'
                                    ? 'border-brand-500 text-brand-500'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-400'
                            }`}
                        >
                            Areas
                        </button>
                    </nav>
                </div>

                <div className="p-6">
                    {activeTab === 'developers' && <SeoDevelopersList />}
                    {activeTab === 'areas' && <SeoAreasList />}
                </div>
            </div>
        </div>
    )
}
