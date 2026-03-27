'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table'
import Badge from '@/components/ui/badge/Badge'

export default function UserActivityDetailsPage() {
    const router = useRouter()
    const { referenceId } = useParams()
    const [session, setSession] = useState<any>(null)
    const [activities, setActivities] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (referenceId) {
            loadSessionDetails()
        }
    }, [referenceId])

    const loadSessionDetails = async () => {
        setLoading(true)
        try {
            const { data } = await api.get(`/user-activity/${referenceId}`)
            setSession(data.data?.session || null)
            setActivities(data.data?.activities || [])
        } catch (error) {
            console.error('Error loading session details:', error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return <div className="p-6">Loading...</div>
    }

    if (!session) {
        return <div className="p-6">Session not found</div>
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <button
                    onClick={() => router.push('/user-activity')}
                    className="p-2 border rounded-md hover:bg-gray-50 dark:hover:bg-white/5"
                >
                    &larr; Back
                </button>
                <h1 className="text-2xl font-semibold text-gray-800 dark:text-white">
                    Session Details: <span className="text-brand-500">{session.referenceId}</span>
                </h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-4 bg-white rounded-xl border border-gray-200 dark:bg-gray-900 dark:border-gray-800">
                    <p className="text-sm text-gray-500">UTM Source</p>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{session.utmSource || '-'}</p>
                </div>
                <div className="p-4 bg-white rounded-xl border border-gray-200 dark:bg-gray-900 dark:border-gray-800">
                    <p className="text-sm text-gray-500">UTM Medium</p>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{session.utmMedium || '-'}</p>
                </div>
                <div className="p-4 bg-white rounded-xl border border-gray-200 dark:bg-gray-900 dark:border-gray-800">
                    <p className="text-sm text-gray-500">UTM Campaign</p>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{session.utmCampaign || '-'}</p>
                </div>
                <div className="p-4 bg-white rounded-xl border border-gray-200 dark:bg-gray-900 dark:border-gray-800">
                    <p className="text-sm text-gray-500">Locale</p>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{session.locale || '-'}</p>
                </div>
                <div className="p-4 bg-white rounded-xl border border-gray-200 dark:bg-gray-900 dark:border-gray-800">
                    <p className="text-sm text-gray-500">Referrer</p>
                    <p className="font-medium text-gray-900 dark:text-gray-100 truncate" title={session.referrer}>{session.referrer || '-'}</p>
                </div>
                <div className="p-4 bg-white rounded-xl border border-gray-200 dark:bg-gray-900 dark:border-gray-800">
                    <p className="text-sm text-gray-500">Created At</p>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{new Date(session.createdAt).toLocaleString()}</p>
                </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
                <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Activity Log</h2>
                </div>
                <div className="max-w-full overflow-x-auto">
                    <Table>
                        <TableHeader className="border-b border-gray-100 dark:border-white/5">
                            <TableRow>
                                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-theme-xs dark:text-gray-400 text-start">
                                    Action
                                </TableCell>
                                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-theme-xs dark:text-gray-400 text-start">
                                    Property ID
                                </TableCell>
                                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-theme-xs dark:text-gray-400 text-start flex-1 min-w-[200px]">
                                    URL
                                </TableCell>
                                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-theme-xs dark:text-gray-400 text-start">
                                    Created At
                                </TableCell>
                            </TableRow>
                        </TableHeader>

                        <TableBody className="divide-y divide-gray-100 dark:divide-white/5">
                            {activities.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="px-5 py-8 text-center text-gray-500">
                                        No activities logged for this session
                                    </TableCell>
                                </TableRow>
                            ) : (
                                activities.map((activity) => (
                                    <TableRow key={activity.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                        <TableCell className="px-5 py-4">
                                            <Badge size="sm" color="warning">
                                                {activity.action}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="px-5 py-4">
                                            <span className="block text-gray-500 text-theme-sm dark:text-gray-400">
                                                {activity.propertyId || '-'}
                                            </span>
                                        </TableCell>
                                        <TableCell className="px-5 py-4 truncate max-w-[300px]">
                                            <a href={activity.url} target="_blank" rel="noreferrer" className="block text-brand-500 text-theme-sm hover:underline truncate" title={activity.url}>
                                                {activity.url || '-'}
                                            </a>
                                        </TableCell>
                                        <TableCell className="px-5 py-4">
                                            <span className="block text-gray-500 text-theme-sm dark:text-gray-400">
                                                {new Date(activity.createdAt).toLocaleString()}
                                            </span>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    )
}
