'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import Image from 'next/image'
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table'
import Badge from '@/components/ui/badge/Badge'
import Button from '@/components/ui/button/Button'

export default function UsersPage() {
  const router = useRouter()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [userType, setUserType] = useState<'agent' | 'investor' | 'client'>('agent')

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
        type: user.role === 'BROKER' ? 'agent' : user.role === 'INVESTOR' ? 'investor' : 'client',
        role: user.role,
        status: user.status?.toLowerCase() || 'inactive',
        avatar: user.avatar || 'https://i.pravatar.cc/150?img=5',
        properties: user.role === 'BROKER' ? 0 : undefined, // TODO: Get actual count from backend
        budget: user.role === 'INVESTOR' ? '-' : undefined, // TODO: Get actual budget from backend
      }))
      
      // Filter by user type
      const filtered = mappedUsers.filter((user: any) => {
        if (userType === 'agent') return user.type === 'agent'
        if (userType === 'investor') return user.type === 'investor'
        if (userType === 'client') return user.type === 'client'
        return true
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

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white">
          Users
        </h1>
        <Button className="flex items-center gap-2" onClick={() => router.push('/users/add')}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          Add User
        </Button>
      </div>

      {/* User Type Toggle */}
      <div className="inline-flex rounded-lg border border-gray-200 p-1 dark:border-gray-800 dark:bg-gray-900">
        <button
          onClick={() => setUserType('agent')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            userType === 'agent'
              ? 'bg-brand-500 text-white'
              : 'text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5'
          }`}
        >
          Agent
        </button>
        <button
          onClick={() => setUserType('investor')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            userType === 'investor'
              ? 'bg-brand-500 text-white'
              : 'text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5'
          }`}
        >
          Investor
        </button>
        <button
          onClick={() => setUserType('client')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            userType === 'client'
              ? 'bg-brand-500 text-white'
              : 'text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5'
          }`}
        >
          Client
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
                  <TableCell colSpan={userType === 'client' ? 5 : 6} className="px-5 py-8 text-center text-gray-500">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={userType === 'client' ? 5 : 6} className="px-5 py-8 text-center text-gray-500">
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
                        <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M11.3333 2.00004H4.66659C3.93021 2.00004 3.33325 2.59699 3.33325 3.33337V13.3334C3.33325 14.0698 3.93021 14.6667 4.66659 14.6667H11.3333C12.0696 14.6667 12.6666 14.0698 12.6666 13.3334V5.05337C12.6666 4.68443 12.5254 4.33033 12.2754 4.08033L9.94659 1.75162C9.69659 1.50162 9.34249 1.3604 8.97355 1.3604ZM8.97355 2.3604L11.3022 4.68911H8.97355V2.3604Z" fill="currentColor"/>
                          </svg>
                        </button>
                        <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M11.3333 2.00004C11.5083 2.00004 11.6763 2.07019 11.8013 2.19526C11.9263 2.32033 11.9963 2.48842 11.9963 2.66344V13.3334C11.9963 13.5084 11.9263 13.6765 11.8013 13.8016C11.6763 13.9267 11.5083 13.9968 11.3333 13.9968H4.66659C4.49157 13.9968 4.32348 13.9267 4.19841 13.8016C4.07334 13.6765 4.00319 13.5084 4.00319 13.3334V2.66344C4.00319 2.48842 4.07334 2.32033 4.19841 2.19526C4.32348 2.07019 4.49157 2.00004 4.66659 2.00004H6.66659L6.66659 1.33337C6.66659 1.15835 6.73674 0.990261 6.86181 0.865189C6.98688 0.740117 7.15497 0.669968 7.32999 0.669968H8.66999C8.84501 0.669968 9.0131 0.740117 9.13817 0.865189C9.26324 0.990261 9.33339 1.15835 9.33339 1.33337V2.00004H11.3333Z" fill="currentColor"/>
                          </svg>
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
