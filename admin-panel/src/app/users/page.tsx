'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import Image from 'next/image'
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table'
import Badge from '@/components/ui/badge/Badge'
import Button from '@/components/ui/button/Button'
import { PencilIcon, TrashBinIcon, PlusIcon } from '@/icons'

export default function UsersPage() {
  const router = useRouter()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [userType, setUserType] = useState<'agent' | 'investor'>('agent')

  useEffect(() => {
    loadUsers()
  }, [userType])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/users')
      const allUsers = data.data || []

      // Map backend data to frontend format
      const mappedUsers = allUsers.map((user: any) => ({
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        phone: user.phone,
        type: user.role === 'BROKER' ? 'agent' : user.role === 'INVESTOR' ? 'investor' : null,
        role: user.role,
        status: user.status?.toLowerCase() || 'inactive',
        avatar: user.avatar || 'https://i.pravatar.cc/150?img=5',
        properties: user.role === 'BROKER' ? 0 : undefined, // TODO: Get actual count from backend
        budget: user.role === 'INVESTOR' ? '-' : undefined, // TODO: Get actual budget from backend
      }))

      // Filter by user type (exclude CLIENT and null types)
      const filtered = mappedUsers.filter((user: any) => {
        if (!user.type) return false // Exclude CLIENT and other roles
        if (userType === 'agent') return user.type === 'agent'
        if (userType === 'investor') return user.type === 'investor'
        return false
      })

      setUsers(filtered)
    } catch (error) {
      console.error('Error loading users:', error)
      // Fallback to empty array on error
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async (id: string) => {
    setDeleteId(id)
  }

  const confirmDelete = async () => {
    if (!deleteId) return

    setIsDeleting(true)
    try {
      await api.delete(`/users/${deleteId}`)
      // Remove from local state
      setUsers(users.filter(u => u.id !== deleteId))
      setDeleteId(null)
    } catch (error) {
      console.error('Error deleting user:', error)
      alert('Failed to delete user')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white">
          Users
        </h1>
        <Button className="flex items-center gap-2" onClick={() => router.push('/users/add')}>
          <PlusIcon className="w-4 h-4" />
          Add User
        </Button>
      </div>

      {/* User Type Toggle */}
      <div className="inline-flex rounded-lg border border-gray-200 p-1 dark:border-gray-800 dark:bg-gray-900">
        <button
          onClick={() => setUserType('agent')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${userType === 'agent'
            ? 'bg-brand-500 text-white'
            : 'text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5'
            }`}
        >
          Agent
        </button>
        <button
          onClick={() => setUserType('investor')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${userType === 'investor'
            ? 'bg-brand-500 text-white'
            : 'text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5'
            }`}
        >
          Investor
        </button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/5">
              <TableRow>
                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-theme-xs dark:text-gray-400 text-start">
                  User
                </TableCell>
                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-theme-xs dark:text-gray-400 text-start">
                  Email
                </TableCell>
                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-theme-xs dark:text-gray-400 text-start">
                  Phone
                </TableCell>
                {userType === 'agent' ? (
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-theme-xs dark:text-gray-400 text-start">
                    Properties
                  </TableCell>
                ) : userType === 'investor' ? (
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-theme-xs dark:text-gray-400 text-start">
                    Budget
                  </TableCell>
                ) : null}
                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-theme-xs dark:text-gray-400 text-start">
                  Status
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
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="px-5 py-8 text-center text-gray-500">
                    No users
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow
                    key={user.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                    onClick={() => router.push(`/users/${user.id}`)}
                  >
                    <TableCell className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 overflow-hidden rounded-full">
                          <Image
                            width={40}
                            height={40}
                            src={user.avatar}
                            alt={user.name}
                            className="object-cover w-full h-full"
                          />
                        </div>
                        <span className="block font-medium text-gray-800 text-theme-sm dark:text-white/90">
                          {user.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <span className="block text-gray-500 text-theme-sm dark:text-gray-400">
                        {user.email}
                      </span>
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <span className="block text-gray-500 text-theme-sm dark:text-gray-400">
                        {user.phone}
                      </span>
                    </TableCell>
                    {userType === 'agent' ? (
                      <TableCell className="px-5 py-4">
                        <span className="block text-gray-800 text-theme-sm dark:text-white/90 font-medium">
                          {user.properties || 0}
                        </span>
                      </TableCell>
                    ) : userType === 'investor' ? (
                      <TableCell className="px-5 py-4">
                        <span className="block text-gray-800 text-theme-sm dark:text-white/90 font-medium">
                          {user.budget || '-'}
                        </span>
                      </TableCell>
                    ) : null}
                    <TableCell className="px-5 py-4">
                      <Badge
                        size="sm"
                        color={
                          user.status === 'active' ? 'success' :
                            user.status === 'pending' ? 'warning' :
                              'error'
                        }
                      >
                        {user.status === 'active' ? 'Active' :
                          user.status === 'pending' ? 'Pending' :
                            user.status === 'blocked' ? 'Blocked' :
                              user.status === 'rejected' ? 'Rejected' :
                                'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => router.push(`/users/${user.id}`)}
                          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                          title="View/Edit"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(user.id); }}
                          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500 hover:text-red-600 dark:hover:text-red-400"
                          title="Delete"
                        >
                          <TrashBinIcon className="w-4 h-4" />
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

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white rounded-xl shadow-lg dark:bg-gray-800 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Confirm Delete
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Are you sure you want to delete this user? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteId(null)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={confirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
