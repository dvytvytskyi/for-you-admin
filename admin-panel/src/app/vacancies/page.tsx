'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table'
import Badge from '@/components/ui/badge/Badge'
import Button from '@/components/ui/button/Button'
import { PencilIcon, TrashBinIcon, PlusIcon } from '@/icons'
import { Vacancy, VacancyStatus, VacancyRequest } from '@/types/vacancy'

export default function VacanciesPage() {
    const router = useRouter()
    const [vacancies, setVacancies] = useState<Vacancy[]>([])
    const [requests, setRequests] = useState<VacancyRequest[]>([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<'vacancies' | 'requests'>('vacancies')
    const [deletingId, setDeletingId] = useState<string | null>(null)

    useEffect(() => {
        loadVacancies()
        loadRequests()
    }, [])

    const loadVacancies = async () => {
        setLoading(true)
        try {
            const { data } = await api.get('/vacancies')
            if (data.success) {
                setVacancies(data.data || [])
            }
        } catch (error) {
            console.error('Error loading vacancies:', error)
            setVacancies([])
        } finally {
            setLoading(false)
        }
    }

    const loadRequests = async () => {
        try {
            const { data } = await api.get('/vacancies/requests/all')
            if (data.success) {
                setRequests(data.data || [])
            }
        } catch (error) {
            console.error('Error loading requests:', error)
            setRequests([])
        }
    }

    const handleDeleteVacancy = async (id: string) => {
        if (!confirm('Are you sure you want to delete this vacancy?')) {
            return
        }

        setDeletingId(id)
        try {
            await api.delete(`/vacancies/${id}`)
            await loadVacancies()
        } catch (error) {
            console.error('Error deleting vacancy:', error)
            alert('Error deleting vacancy')
        } finally {
            setDeletingId(null)
        }
    }

    const getStatusBadgeColor = (status: VacancyStatus) => {
        switch (status) {
            case VacancyStatus.PUBLISHED:
                return 'success'
            case VacancyStatus.PENDING:
                return 'warning'
            case VacancyStatus.WITHDRAWN:
                return 'error'
            default:
                return 'light'
        }
    }

    const getStatusLabel = (status: VacancyStatus) => {
        switch (status) {
            case VacancyStatus.PUBLISHED:
                return 'Published'
            case VacancyStatus.PENDING:
                return 'Pending'
            case VacancyStatus.WITHDRAWN:
                return 'Withdrawn'
            default:
                return status
        }
    }

    return (
        <div className="space-y-6">
            {/* Header with Add Button */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold text-gray-800 dark:text-white">
                    Vacancies
                </h1>
                <Button className="flex items-center gap-2" onClick={() => router.push('/vacancies/new')}>
                    <PlusIcon className="w-4 h-4" />
                    Create Vacancy
                </Button>
            </div>

            {/* Tabs */}
            <div className="inline-flex rounded-lg border border-gray-200 p-1 dark:border-gray-800 dark:bg-gray-900">
                <button
                    onClick={() => setActiveTab('vacancies')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'vacancies'
                        ? 'bg-brand-500 text-white'
                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5'
                        }`}
                >
                    Vacancies List
                </button>
                <button
                    onClick={() => setActiveTab('requests')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'requests'
                        ? 'bg-brand-500 text-white'
                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5'
                        }`}
                >
                    Requests {requests.length > 0 && `(${requests.length})`}
                </button>
            </div>

            {/* Vacancies Table */}
            {activeTab === 'vacancies' && (
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
                    <div className="max-w-full overflow-x-auto">
                        <Table>
                            <TableHeader className="border-b border-gray-100 dark:border-white/5">
                                <TableRow>
                                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-theme-xs dark:text-gray-400 text-start">
                                        Position
                                    </TableCell>
                                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-theme-xs dark:text-gray-400 text-start">
                                        Status
                                    </TableCell>
                                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-theme-xs dark:text-gray-400 text-start">
                                        Views
                                    </TableCell>
                                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-theme-xs dark:text-gray-400 text-start">
                                        Applications
                                    </TableCell>
                                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-theme-xs dark:text-gray-400 text-start">
                                        Created At
                                    </TableCell>
                                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-theme-xs dark:text-gray-400 text-start">
                                        Actions
                                    </TableCell>
                                </TableRow>
                            </TableHeader>

                            <TableBody className="divide-y divide-gray-100 dark:divide-white/5">
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="px-5 py-8 text-center text-gray-500">
                                            Loading...
                                        </TableCell>
                                    </TableRow>
                                ) : vacancies.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="px-5 py-8 text-center text-gray-500">
                                            No vacancies
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    vacancies.map((vacancy) => (
                                        <TableRow
                                            key={vacancy.id}
                                            className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                                            onClick={() => router.push(`/vacancies/${vacancy.id}`)}
                                        >
                                            <TableCell className="px-5 py-4">
                                                <div>
                                                    <span className="block font-medium text-gray-800 text-theme-sm dark:text-white/90">
                                                        {vacancy.position}
                                                    </span>
                                                    {vacancy.shortDescription && (
                                                        <span className="block text-gray-500 text-theme-xs dark:text-gray-400 mt-0.5">
                                                            {vacancy.shortDescription}
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="px-5 py-4">
                                                <Badge size="sm" color={getStatusBadgeColor(vacancy.status)}>
                                                    {getStatusLabel(vacancy.status)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="px-5 py-4">
                                                <span className="block text-gray-500 text-theme-sm dark:text-gray-400">
                                                    {vacancy.viewsCount || 0}
                                                </span>
                                            </TableCell>
                                            <TableCell className="px-5 py-4">
                                                <span className="block text-gray-500 text-theme-sm dark:text-gray-400">
                                                    {vacancy.applicationsCount || 0}
                                                </span>
                                            </TableCell>
                                            <TableCell className="px-5 py-4">
                                                <span className="block text-gray-500 text-theme-sm dark:text-gray-400">
                                                    {vacancy.createdAt
                                                        ? new Date(vacancy.createdAt).toLocaleDateString('uk-UA', {
                                                            year: 'numeric',
                                                            month: 'short',
                                                            day: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                        })
                                                        : '-'}
                                                </span>
                                            </TableCell>
                                            <TableCell className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => router.push(`/vacancies/${vacancy.id}`)}
                                                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                                                        title="Edit"
                                                    >
                                                        <PencilIcon className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteVacancy(vacancy.id)}
                                                        disabled={deletingId === vacancy.id}
                                                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-50"
                                                        title="Delete"
                                                    >
                                                        {deletingId === vacancy.id ? (
                                                            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                            </svg>
                                                        ) : (
                                                            <TrashBinIcon className="w-4 h-4" />
                                                        )}
                                                    </button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            )}

            {/* Requests Table */}
            {activeTab === 'requests' && (
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
                    <div className="max-w-full overflow-x-auto">
                        <Table>
                            <TableHeader className="border-b border-gray-100 dark:border-white/5">
                                <TableRow>
                                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-theme-xs dark:text-gray-400 text-start">
                                        Candidate
                                    </TableCell>
                                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-theme-xs dark:text-gray-400 text-start">
                                        Vacancy
                                    </TableCell>
                                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-theme-xs dark:text-gray-400 text-start">
                                        Message
                                    </TableCell>
                                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-theme-xs dark:text-gray-400 text-start">
                                        Resume
                                    </TableCell>
                                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-theme-xs dark:text-gray-400 text-start">
                                        Date
                                    </TableCell>
                                </TableRow>
                            </TableHeader>

                            <TableBody className="divide-y divide-gray-100 dark:divide-white/5">
                                {requests.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="px-5 py-8 text-center text-gray-500">
                                            No requests
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    requests.map((request) => (
                                        <TableRow key={request.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                            <TableCell className="px-5 py-4">
                                                <div>
                                                    <span className="block font-medium text-gray-800 text-theme-sm dark:text-white/90">
                                                        {request.name}
                                                    </span>
                                                    <span className="block text-gray-500 text-theme-xs dark:text-gray-400 mt-0.5">
                                                        {request.email}
                                                    </span>
                                                    {request.phone && (
                                                        <span className="block text-gray-500 text-theme-xs dark:text-gray-400">
                                                            {request.phone}
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="px-5 py-4">
                                                <span className="block text-gray-500 text-theme-sm dark:text-gray-400">
                                                    {request.vacancy?.position || 'Deleted vacancy'}
                                                </span>
                                            </TableCell>
                                            <TableCell className="px-5 py-4">
                                                <span className="block text-gray-500 text-theme-sm dark:text-gray-400 line-clamp-2">
                                                    {request.message || '-'}
                                                </span>
                                            </TableCell>
                                            <TableCell className="px-5 py-4">
                                                {request.cvUrl ? (
                                                    <a
                                                        href={request.cvUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-brand-500 hover:text-brand-600 text-theme-sm"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        Переглянути
                                                    </a>
                                                ) : (
                                                    <span className="block text-gray-500 text-theme-sm dark:text-gray-400">
                                                        None
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className="px-5 py-4">
                                                <span className="block text-gray-500 text-theme-sm dark:text-gray-400">
                                                    {request.createdAt
                                                        ? new Date(request.createdAt).toLocaleDateString('uk-UA', {
                                                            year: 'numeric',
                                                            month: 'short',
                                                            day: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                        })
                                                        : '-'}
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            )}
        </div>
    )
}
