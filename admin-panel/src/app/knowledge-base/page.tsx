'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table'
import Badge from '@/components/ui/badge/Badge'
import Button from '@/components/ui/button/Button'
import { PencilIcon, TrashBinIcon, PlusIcon } from '@/icons'

export default function KnowledgeBasePage() {
  const router = useRouter()
  const [courses, setCourses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    loadCourses()
  }, [])

  const loadCourses = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/courses')
      const coursesData = data.data || []
      // Format dates and ensure proper structure
      const formattedCourses = coursesData.map((course: any) => ({
        ...course,
        createdAt: course.createdAt ? new Date(course.createdAt).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        }) : '-',
      }))
      setCourses(formattedCourses)
    } catch (error) {
      console.error('Error loading courses:', error)
      setCourses([])
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteCourse = async (courseId: string) => {
    if (!confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
      return
    }

    setDeletingId(courseId)
    try {
      await api.delete(`/courses/${courseId}`)
      await loadCourses()
    } catch (error) {
      console.error('Error deleting course:', error)
      alert('Failed to delete course. Please try again.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white">
          Knowledge Base
        </h1>
        <Button className="flex items-center gap-2" onClick={() => router.push('/knowledge-base/add')}>
          <PlusIcon className="w-4 h-4" />
          Add Course
        </Button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/5">
              <TableRow>
                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-theme-xs dark:text-gray-400 text-start">
                  Title
                </TableCell>
                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-theme-xs dark:text-gray-400 text-start">
                  Description
                </TableCell>
                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-theme-xs dark:text-gray-400 text-start">
                  Order
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
                  <TableCell colSpan={5} className="px-5 py-8 text-center text-gray-500">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : courses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="px-5 py-8 text-center text-gray-500">
                    No courses found
                  </TableCell>
                </TableRow>
              ) : (
                courses.map((course) => (
                  <TableRow 
                    key={course.id} 
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                    onClick={() => router.push(`/knowledge-base/${course.id}`)}
                  >
                    <TableCell className="px-5 py-4">
                      <span className="block font-medium text-gray-800 text-theme-sm dark:text-white/90">
                        {course.title}
                      </span>
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <span className="block text-gray-500 text-theme-sm dark:text-gray-400 line-clamp-2">
                        {course.description || '-'}
                      </span>
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <span className="block text-gray-800 text-theme-sm dark:text-white/90 font-medium">
                        {course.order ?? 0}
                      </span>
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <span className="block text-gray-500 text-theme-sm dark:text-gray-400">
                        {course.createdAt || '-'}
                      </span>
                    </TableCell>
                    <TableCell className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => router.push(`/knowledge-base/${course.id}`)}
                          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                          title="View/Edit"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteCourse(course.id)}
                          disabled={deletingId === course.id}
                          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-50"
                          title="Delete"
                        >
                          {deletingId === course.id ? (
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
    </div>
  )
}
