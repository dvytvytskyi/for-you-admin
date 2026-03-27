'use client'
import SeoDevelopersList from '@/components/seo/SeoDevelopersList'
import Link from 'next/link'

export default function DevelopersSeoPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-semibold text-gray-800 dark:text-white">AI SEO Developers</h1>
                  <p className="text-sm text-gray-500 mt-1">Manage developers analytical information for SEO</p>
                </div>
                <Link href="/seo" className="text-brand-500 hover:text-brand-600 text-sm font-medium">
                    ← Back to Overview
                </Link>
            </div>

            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
                <SeoDevelopersList />
            </div>
        </div>
    )
}
