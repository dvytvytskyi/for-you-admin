'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table'
import Badge from '@/components/ui/badge/Badge'

interface UserSession {
    id: string;
    referenceId: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    referrer?: string;
    locale?: string;
    createdAt: string;
}

export default function UserActivityPage() {
    const router = useRouter()
    const [sessions, setSessions] = useState<UserSession[]>([])
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)

    useEffect(() => {
        loadSessions(page)
    }, [page])

    const loadSessions = async (p: number) => {
        setLoading(true)
        try {
            const { data } = await api.get(`/user-activity?page=${p}&limit=20`)
            setSessions(data.data?.sessions || [])
            setTotalPages(data.data?.totalPages || 1)
        } catch (error) {
            console.error('Error loading sessions:', error)
            setSessions([])
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold text-gray-800 dark:text-white">
                    User Activity (Sessions)
                </h1>
            </div>

            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
                <div className="max-w-full overflow-x-auto">
                    <Table>
                        <TableHeader className="border-b border-gray-100 dark:border-white/5">
                            <TableRow>
                                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-theme-xs dark:text-gray-400 text-start">
                                    Reference ID
                                </TableCell>
                                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-theme-xs dark:text-gray-400 text-start">
                                    UTM Source
                                </TableCell>
                                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-theme-xs dark:text-gray-400 text-start">
                                    UTM Campaign
                                </TableCell>
                                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-theme-xs dark:text-gray-400 text-start">
                                    Locale
                                </TableCell>
                                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-theme-xs dark:text-gray-400 text-start">
                                    Created At
                                </TableCell>
                            </TableRow>
                        </TableHeader>

                        <TableBody className="divide-y divide-gray-100 dark:divide-white/5">
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="px-5 py-8 text-center text-gray-500">
                                        Loading...
                                    </TableCell>
                                </TableRow>
                            ) : sessions.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="px-5 py-8 text-center text-gray-500">
                                        No sessions found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                sessions.map((session) => (
                                    <TableRow
                                        key={session.id}
                                        className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                                        onClick={() => router.push(`/user-activity/${session.referenceId}`)}
                                    >
                                        <TableCell className="px-5 py-4">
                                            <span className="block font-medium text-brand-500 text-theme-sm">
                                                {session.referenceId}
                                            </span>
                                        </TableCell>
                                        <TableCell className="px-5 py-4">
                                            <span className="block text-gray-500 text-theme-sm dark:text-gray-400">
                                                {session.utmSource || '-'}
                                            </span>
                                        </TableCell>
                                        <TableCell className="px-5 py-4">
                                            <span className="block text-gray-500 text-theme-sm dark:text-gray-400">
                                                {session.utmCampaign || '-'}
                                            </span>
                                        </TableCell>
                                        <TableCell className="px-5 py-4">
                                            <span className="block text-gray-500 text-theme-sm dark:text-gray-400">
                                                {session.locale || '-'}
                                            </span>
                                        </TableCell>
                                        <TableCell className="px-5 py-4">
                                            <span className="block text-gray-500 text-theme-sm dark:text-gray-400">
                                                {new Date(session.createdAt).toLocaleString()}
                                            </span>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-white/5">
                    <button
                        disabled={page === 1}
                        onClick={() => setPage(page - 1)}
                        className="px-3 py-1 text-sm border rounded-md disabled:opacity-50"
                    >
                        Prev
                    </button>
                    <span className="text-sm text-gray-500">
                        Page {page} of {totalPages}
                    </span>
                    <button
                        disabled={page === totalPages}
                        onClick={() => setPage(page + 1)}
                        className="px-3 py-1 text-sm border rounded-md disabled:opacity-50"
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    )
}
