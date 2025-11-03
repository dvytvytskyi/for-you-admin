'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { api } from '@/lib/api'
import Badge from '@/components/ui/badge/Badge'
import Button from '@/components/ui/button/Button'
import Image from 'next/image'
import { useModal } from '@/hooks/useModal'
import { Modal } from '@/components/ui/modal'
import Input from '@/components/form/input/InputField'
import Label from '@/components/form/Label'

export default function UserProfilePage() {
  const router = useRouter()
  const params = useParams()
  const userId = params.id as string
  
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingMeta, setSavingMeta] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editFormData, setEditFormData] = useState<any>({})
  const [editMetaData, setEditMetaData] = useState<any>({})
  
  const { isOpen: isMetaModalOpen, openModal: openMetaModal, closeModal: closeMetaModal } = useModal()
  const { isOpen: isInfoModalOpen, openModal: openInfoModal, closeModal: closeInfoModal } = useModal()

  const handleCloseInfoModal = () => {
    setError(null)
    closeInfoModal()
  }

  const handleCloseMetaModal = () => {
    setError(null)
    closeMetaModal()
  }

  useEffect(() => {
    if (userId) {
      loadUser()
    }
  }, [userId])

  // Update edit forms when user data changes
  useEffect(() => {
    if (user) {
      setEditFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
      })
      setEditMetaData({
        role: user.role || '',
        status: user.status || '',
        avatar: user.avatar || '',
        licenseNumber: user.licenseNumber || '',
      })
    }
  }, [user])

  const loadUser = async () => {
    setLoading(true)
    try {
      const { data } = await api.get(`/users/${userId}`)
      if (data.data) {
        setUser(data.data)
      } else {
        setUser(null)
      }
    } catch (error: any) {
      console.error('Error loading user:', error)
      if (error.response?.status === 404) {
        setUser(null)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSaveInfo = async () => {
    setSaving(true)
    setError(null)
    try {
      await api.patch(`/users/${userId}`, editFormData)
      await loadUser()
      handleCloseInfoModal()
    } catch (err: any) {
      console.error('Error updating user:', err)
      setError(err.response?.data?.message || 'Failed to update user. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveMeta = async () => {
    setSavingMeta(true)
    setError(null)
    try {
      // Convert status and role to uppercase for backend
      const payload = {
        ...editMetaData,
        status: editMetaData.status?.toUpperCase(),
        role: editMetaData.role?.toUpperCase(),
      }
      await api.patch(`/users/${userId}`, payload)
      await loadUser()
      handleCloseMetaModal()
    } catch (err: any) {
      console.error('Error updating user:', err)
      setError(err.response?.data?.message || 'Failed to update user. Please try again.')
    } finally {
      setSavingMeta(false)
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const { data } = await api.post('/upload/image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      
      if (data.data?.url) {
        setEditMetaData({ ...editMetaData, avatar: data.data.url })
      }
    } catch (err) {
      console.error('Error uploading avatar:', err)
      setError('Failed to upload image. Please try again.')
    }
  }

  const handleDeleteUser = async () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true)
      return
    }

    setDeleting(true)
    setError(null)
    try {
      await api.delete(`/users/${userId}`)
      router.push('/users')
    } catch (err: any) {
      console.error('Error deleting user:', err)
      setError(err.response?.data?.message || 'Failed to delete user. Please try again.')
      setShowDeleteConfirm(false)
    } finally {
      setDeleting(false)
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'BROKER':
        return 'Broker'
      case 'INVESTOR':
        return 'Investor'
      case 'CLIENT':
        return 'Client'
      case 'ADMIN':
        return 'Admin'
      default:
        return role
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 text-brand-500 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-500 dark:text-gray-400">Loading user...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">User not found</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-white">
            User Profile
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            User ID: {userId.slice(0, 8)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {user.role !== 'ADMIN' && (
            <Button
              variant="outline"
              onClick={handleDeleteUser}
              disabled={deleting}
              className="text-error-600 border-error-300 hover:bg-error-50 dark:text-error-400 dark:border-error-800 dark:hover:bg-error-900/20"
            >
              {deleting ? (
                <>
                  <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Deleting...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M11.3333 2.00004C11.5083 2.00004 11.6763 2.07019 11.8013 2.19526C11.9263 2.32033 11.9963 2.48842 11.9963 2.66344V13.3334C11.9963 13.5084 11.9263 13.6765 11.8013 13.8016C11.6763 13.9267 11.5083 13.9968 11.3333 13.9968H4.66659C4.49157 13.9968 4.32348 13.9267 4.19841 13.8016C4.07334 13.6765 4.00319 13.5084 4.00319 13.3334V2.66344C4.00319 2.48842 4.07334 2.32033 4.19841 2.19526C4.32348 2.07019 4.49157 2.00004 4.66659 2.00004H6.66659L6.66659 1.33337C6.66659 1.15835 6.73674 0.990261 6.86181 0.865189C6.98688 0.740117 7.15497 0.669968 7.32999 0.669968H8.66999C8.84501 0.669968 9.0131 0.740117 9.13817 0.865189C9.26324 0.990261 9.33339 1.15835 9.33339 1.33337V2.00004H11.3333Z" fill="currentColor"/>
                  </svg>
                  {showDeleteConfirm ? 'Confirm Delete' : 'Delete User'}
                </>
              )}
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => router.back()}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back
          </Button>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="rounded-xl border border-error-200 bg-error-50 p-4 dark:border-error-800 dark:bg-error-900/20">
          <div className="flex items-start gap-3">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-error-600 dark:text-error-400 flex-shrink-0 mt-0.5">
              <path d="M10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18Z" stroke="currentColor" strokeWidth="2"/>
              <path d="M10 6V10M10 14H10.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-error-800 dark:text-error-200 mb-1">
                Confirm Deletion
              </h3>
              <p className="text-sm text-error-700 dark:text-error-300 mb-3">
                Are you sure you want to delete this user? This action cannot be undone.
              </p>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleDeleteUser}
                  disabled={deleting}
                  className="bg-error-600 hover:bg-error-700 text-white"
                >
                  Yes, Delete
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Profile Content */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
        <h3 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-7">
          Profile
        </h3>
        <div className="space-y-6">
          {/* User Meta Card */}
          <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-col items-center w-full gap-6 xl:flex-row">
                <div className="w-20 h-20 overflow-hidden border border-gray-200 rounded-full dark:border-gray-800">
                  <Image
                    width={80}
                    height={80}
                    src={user.avatar || 'https://i.pravatar.cc/150?img=5'}
                    alt={`${user.firstName} ${user.lastName}`}
                    className="object-cover w-full h-full"
                  />
                </div>
                <div className="order-3 xl:order-2">
                  <h4 className="mb-2 text-lg font-semibold text-center text-gray-800 dark:text-white/90 xl:text-left">
                    {user.firstName} {user.lastName}
                  </h4>
                  <div className="flex flex-col items-center gap-1 text-center xl:flex-row xl:gap-3 xl:text-left">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {getRoleLabel(user.role)}
                    </p>
                    <div className="hidden h-3.5 w-px bg-gray-300 dark:bg-gray-700 xl:block"></div>
                    <Badge size="sm" color={user.status === 'ACTIVE' ? 'success' : 'error'}>
                      {user.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              </div>
              <button
                onClick={openMetaModal}
                className="flex w-full items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200 lg:inline-flex lg:w-auto"
              >
                <svg
                  className="fill-current"
                  width="18"
                  height="18"
                  viewBox="0 0 18 18"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M15.0911 2.78206C14.2125 1.90338 12.7878 1.90338 11.9092 2.78206L4.57524 10.116C4.26682 10.4244 4.0547 10.8158 3.96468 11.2426L3.31231 14.3352C3.25997 14.5833 3.33653 14.841 3.51583 15.0203C3.69512 15.1996 3.95286 15.2761 4.20096 15.2238L7.29355 14.5714C7.72031 14.4814 8.11172 14.2693 8.42013 13.9609L15.7541 6.62695C16.6327 5.74827 16.6327 4.32365 15.7541 3.44497L15.0911 2.78206ZM12.9698 3.84272C13.2627 3.54982 13.7376 3.54982 14.0305 3.84272L14.6934 4.50563C14.9863 4.79852 14.9863 5.2734 14.6934 5.56629L14.044 6.21573L12.3204 4.49215L12.9698 3.84272ZM11.2597 5.55281L5.6359 11.1766C5.53309 11.2794 5.46238 11.4099 5.43238 11.5522L5.01758 13.5185L6.98394 13.1037C7.1262 13.0737 7.25666 13.003 7.35947 12.9002L12.9833 7.27639L11.2597 5.55281Z"
                    fill=""
                  />
                </svg>
                Edit
              </button>
            </div>
          </div>

          {/* User Info Card */}
          <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-6">
                  Personal Information
                </h4>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-7 2xl:gap-x-32">
                  <div>
                    <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                      First Name
                    </p>
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                      {user.firstName || '-'}
                    </p>
                  </div>

                  <div>
                    <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                      Last Name
                    </p>
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                      {user.lastName || '-'}
                    </p>
                  </div>

                  <div>
                    <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                      Email address
                    </p>
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                      {user.email || '-'}
                    </p>
                  </div>

                  <div>
                    <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                      Phone
                    </p>
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                      {user.phone || '-'}
                    </p>
                  </div>

                  {user.role === 'BROKER' && user.licenseNumber && (
                    <div>
                      <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                        License Number
                      </p>
                      <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                        {user.licenseNumber}
                      </p>
                    </div>
                  )}

                  <div>
                    <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                      Created At
                    </p>
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                      {user.createdAt ? formatDate(user.createdAt) : '-'}
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={openInfoModal}
                className="flex w-full items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200 lg:inline-flex lg:w-auto"
              >
                <svg
                  className="fill-current"
                  width="18"
                  height="18"
                  viewBox="0 0 18 18"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M15.0911 2.78206C14.2125 1.90338 12.7878 1.90338 11.9092 2.78206L4.57524 10.116C4.26682 10.4244 4.0547 10.8158 3.96468 11.2426L3.31231 14.3352C3.25997 14.5833 3.33653 14.841 3.51583 15.0203C3.69512 15.1996 3.95286 15.2761 4.20096 15.2238L7.29355 14.5714C7.72031 14.4814 8.11172 14.2693 8.42013 13.9609L15.7541 6.62695C16.6327 5.74827 16.6327 4.32365 15.7541 3.44497L15.0911 2.78206ZM12.9698 3.84272C13.2627 3.54982 13.7376 3.54982 14.0305 3.84272L14.6934 4.50563C14.9863 4.79852 14.9863 5.2734 14.6934 5.56629L14.044 6.21573L12.3204 4.49215L12.9698 3.84272ZM11.2597 5.55281L5.6359 11.1766C5.53309 11.2794 5.46238 11.4099 5.43238 11.5522L5.01758 13.5185L6.98394 13.1037C7.1262 13.0737 7.25666 13.003 7.35947 12.9002L12.9833 7.27639L11.2597 5.55281Z"
                    fill=""
                  />
                </svg>
                Edit
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Personal Information Modal */}
      <Modal isOpen={isInfoModalOpen} onClose={closeInfoModal} className="max-w-[700px] m-4">
        <div className="no-scrollbar relative w-full max-w-[700px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
          <div className="px-2 pr-14">
            <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
              Edit Personal Information
            </h4>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
              Update user details to keep the profile up-to-date.
            </p>
          </div>
          {error && (
            <div className="mb-4 mx-2 p-4 rounded-lg bg-error-50 border border-error-200 dark:bg-error-900/20 dark:border-error-800">
              <p className="text-sm text-error-600 dark:text-error-400">{error}</p>
            </div>
          )}
          <form className="flex flex-col" onSubmit={(e) => { e.preventDefault(); handleSaveInfo(); }}>
            <div className="custom-scrollbar h-[450px] overflow-y-auto px-2 pb-3">
              <div className="mt-7">
                <h5 className="mb-5 text-lg font-medium text-gray-800 dark:text-white/90 lg:mb-6">
                  Personal Information
                </h5>

                <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
                  <div className="col-span-2 lg:col-span-1">
                    <Label>First Name</Label>
                    <Input 
                      type="text" 
                      value={editFormData.firstName || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, firstName: e.target.value })}
                      required
                    />
                  </div>

                  <div className="col-span-2 lg:col-span-1">
                    <Label>Last Name</Label>
                    <Input 
                      type="text" 
                      value={editFormData.lastName || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, lastName: e.target.value })}
                      required
                    />
                  </div>

                  <div className="col-span-2 lg:col-span-1">
                    <Label>Email Address</Label>
                    <Input 
                      type="email" 
                      value={editFormData.email || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                      required
                    />
                  </div>

                  <div className="col-span-2 lg:col-span-1">
                    <Label>Phone</Label>
                    <Input 
                      type="text" 
                      value={editFormData.phone || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
              <Button size="sm" variant="outline" onClick={handleCloseInfoModal} disabled={saving}>
                Close
              </Button>
              <Button size="sm" type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Edit Meta Modal */}
      <Modal isOpen={isMetaModalOpen} onClose={handleCloseMetaModal} className="max-w-[700px] m-4">
        <div className="no-scrollbar relative w-full max-w-[700px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
          <div className="px-2 pr-14">
            <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
              Edit Profile
            </h4>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
              Update profile information, role, and status.
            </p>
          </div>
          {error && (
            <div className="mb-4 mx-2 p-4 rounded-lg bg-error-50 border border-error-200 dark:bg-error-900/20 dark:border-error-800">
              <p className="text-sm text-error-600 dark:text-error-400">{error}</p>
            </div>
          )}
          <form className="flex flex-col" onSubmit={(e) => { e.preventDefault(); handleSaveMeta(); }}>
            <div className="custom-scrollbar h-[450px] overflow-y-auto px-2 pb-3">
              <div>
                <h5 className="mb-5 text-lg font-medium text-gray-800 dark:text-white/90 lg:mb-6">
                  Profile Image
                </h5>
                <div className="mb-6">
                  <Label>Avatar</Label>
                  <div className="mt-2 space-y-3">
                    {editMetaData.avatar ? (
                      <div className="relative w-32 h-32 rounded-full overflow-hidden border-2 border-gray-200 dark:border-gray-700">
                        <Image
                          width={128}
                          height={128}
                          src={editMetaData.avatar}
                          alt="Avatar"
                          className="object-cover w-full h-full"
                        />
                        <button
                          type="button"
                          onClick={() => setEditMetaData({ ...editMetaData, avatar: '' })}
                          className="absolute top-1 right-1 p-1 rounded-full bg-white dark:bg-gray-800 shadow-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 hover:text-red-500"
                        >
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M4 12L12 4M4 4L12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 hover:border-brand-400 dark:hover:border-brand-600 transition-colors">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarUpload}
                          className="hidden"
                          id="avatar-upload"
                        />
                        <label
                          htmlFor="avatar-upload"
                          className="flex flex-col items-center justify-center cursor-pointer"
                        >
                          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="text-gray-400 mb-2">
                            <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15M17 8L12 3M12 3L7 8M12 3V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            Click to upload avatar
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            PNG, JPG, GIF up to 10MB
                          </span>
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-7">
                <h5 className="mb-5 text-lg font-medium text-gray-800 dark:text-white/90 lg:mb-6">
                  Account Settings
                </h5>

                <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
                  {user.role !== 'ADMIN' && (
                    <div className="col-span-2 lg:col-span-1">
                      <Label>Role</Label>
                      <select
                        value={editMetaData.role || ''}
                        onChange={(e) => setEditMetaData({ ...editMetaData, role: e.target.value })}
                        className="h-11 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 bg-transparent text-gray-800"
                      >
                        <option value="CLIENT">Client</option>
                        <option value="BROKER">Broker</option>
                        <option value="INVESTOR">Investor</option>
                      </select>
                    </div>
                  )}
                  {user.role === 'ADMIN' && (
                    <div className="col-span-2 lg:col-span-1">
                      <Label>Role</Label>
                      <div className="h-11 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 flex items-center">
                        Admin (Cannot be changed)
                      </div>
                    </div>
                  )}

                  <div className="col-span-2 lg:col-span-1">
                    <Label>Status</Label>
                    <select
                      value={editMetaData.status || ''}
                      onChange={(e) => setEditMetaData({ ...editMetaData, status: e.target.value })}
                      className="h-11 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 bg-transparent text-gray-800"
                    >
                      <option value="PENDING">Pending</option>
                      <option value="ACTIVE">Active</option>
                      <option value="BLOCKED">Blocked</option>
                      <option value="REJECTED">Rejected</option>
                    </select>
                  </div>

                  {editMetaData.role === 'BROKER' && (
                    <div className="col-span-2 lg:col-span-1">
                      <Label>License Number</Label>
                      <Input
                        type="text"
                        value={editMetaData.licenseNumber || ''}
                        onChange={(e) => setEditMetaData({ ...editMetaData, licenseNumber: e.target.value })}
                        placeholder="Enter license number"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
              <Button size="sm" variant="outline" onClick={handleCloseMetaModal} disabled={savingMeta}>
                Close
              </Button>
              <Button size="sm" type="submit" disabled={savingMeta}>
                {savingMeta ? (
                  <>
                    <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  )
}

