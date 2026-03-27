'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table'
import Button from '@/components/ui/button/Button'
import { PlusIcon, PencilIcon, TrashBinIcon } from '@/icons'
import { Modal } from '@/components/ui/modal'
import Input from '@/components/form/input/InputField'
import Label from '@/components/form/Label'
import RichTextEditor from '@/components/form/RichTextEditor'

export default function SeoAreasList() {
    const [areas, setAreas] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [syncing, setSyncing] = useState(false)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [currentArea, setCurrentArea] = useState<any>(null)

    const [formName, setFormName] = useState('')
    const [formDescription, setFormDescription] = useState('')
    const [formAnalysis, setFormAnalysis] = useState('')
    const [formPhotos, setFormPhotos] = useState<string[]>([])

    const loadAreas = async () => {
        setLoading(true)
        try {
            const { data } = await api.get('/seo/areas')
            setAreas(data.data || [])
        } catch (error) {
            console.error('Error loading seo areas:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { loadAreas() }, [])

    const handleSync = async () => {
        setSyncing(true)
        try {
            const { data } = await api.post('/seo-sync/sync-locations')
            alert(`Sync successful! Created ${data.created} new areas out of ${data.total} found.`)
            loadAreas()
        } catch (error: any) {
            console.error('Sync error:', error)
            alert('Failed to sync: ' + (error.response?.data?.error || error.message))
        } finally {
            setSyncing(false)
        }
    }

    const handleEdit = (area: any = null) => {
        if (area) {
            setCurrentArea(area)
            setFormName(area.name || '')
            setFormDescription(area.description || '')
            setFormAnalysis(typeof area.analyticalInfo === 'string' ? area.analyticalInfo : JSON.stringify(area.analyticalInfo || ''))
            setFormPhotos(area.photos || [])
        } else {
            setCurrentArea(null)
            setFormName('')
            setFormDescription('')
            setFormAnalysis('')
            setFormPhotos([])
        }
        setIsEditModalOpen(true)
    }

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this area from SEO?')) {
            try {
                await api.delete(`/seo/areas/${id}`)
                loadAreas()
            } catch (error) {
                console.error('Error deleting area:', error)
            }
        }
    }

    const handleSave = async () => {
        const payload = {
            name: formName,
            description: formDescription,
            analyticalInfo: formAnalysis,
            photos: formPhotos
        }

        try {
            if (currentArea) {
                await api.patch(`/seo/areas/${currentArea.id}`, payload)
            } else {
                await api.post('/areas', payload) // Wait! I should use /seo/areas
            }
            setIsEditModalOpen(false)
            loadAreas()
        } catch (error) {
            console.error('Error saving area:', error)
        }
    }

    // Fix the POST endpoint for areas in handleSave if needed. 
    // In seo.routes.ts it's /areas (inside the router which is mounted at /api/seo)
    // So api.post('/seo/areas') is correct.

    const handleSaveFinal = async () => {
        const payload = {
            name: formName,
            description: formDescription,
            analyticalInfo: formAnalysis,
            photos: formPhotos
        }

        try {
            if (currentArea) {
                await api.patch(`/seo/areas/${currentArea.id}`, payload)
            } else {
                await api.post('/seo/areas', payload)
            }
            setIsEditModalOpen(false)
            loadAreas()
        } catch (error) {
            console.error('Error saving area:', error)
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">Areas for SEO</h1>
                <div className="flex gap-3">
                    <Button 
                        variant="outline" 
                        onClick={handleSync} 
                        disabled={syncing}
                        className="border-brand-500/20 text-brand-600 hover:bg-brand-50"
                    >
                        {syncing ? 'Syncing...' : 'Sync with Property Finder'}
                    </Button>
                    <Button className="flex items-center gap-2" onClick={() => handleEdit()}>
                        <PlusIcon className="w-4 h-4" /> Add New Area
                    </Button>
                </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
                <Table>
                    <TableHeader className="bg-gray-50 dark:bg-white/[0.03]">
                        <TableRow>
                            <TableCell isHeader>Name</TableCell>
                            <TableCell isHeader>Created</TableCell>
                            <TableCell isHeader className="text-right">Actions</TableCell>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={3} className="text-center py-8">Loading...</TableCell></TableRow>
                        ) : areas.length === 0 ? (
                            <TableRow><TableCell colSpan={3} className="text-center py-8">No areas in AI SEO</TableCell></TableRow>
                        ) : (
                            areas.map((area) => (
                                <TableRow key={area.id}>
                                    <TableCell className="font-medium">{area.name}</TableCell>
                                    <TableCell className="text-gray-500 text-sm">{new Date(area.createdAt).toLocaleDateString()}</TableCell>
                                    <TableCell className="text-right flex justify-end gap-2">
                                        <button onClick={() => handleEdit(area)} className="p-2 text-gray-500 hover:text-brand-500"><PencilIcon className="w-4 h-4" /></button>
                                        <button onClick={() => handleDelete(area.id)} className="p-2 text-gray-500 hover:text-error-500"><TrashBinIcon className="w-4 h-4" /></button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <Modal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                className="max-w-4xl"
            >
                <div className="p-6">
                    <h2 className="text-xl font-bold mb-6">{currentArea ? 'Edit SEO Area' : 'Add SEO Area'}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div>
                                <Label>Area Name</Label>
                                <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="E.g. Dubai Marina" />
                            </div>
                            <div>
                                <Label>Photos (List URLs separated by newline)</Label>
                                <textarea
                                    className="w-full rounded-lg border border-gray-200 dark:border-gray-800 bg-transparent p-3 text-sm"
                                    rows={4}
                                    value={formPhotos.join('\n')}
                                    onChange={(e) => setFormPhotos(e.target.value.split('\n').filter(Boolean))}
                                    placeholder="https://url1\nhttps://url2"
                                />
                            </div>
                        </div>

                        <div className="space-y-4 col-span-2">
                            <div>
                                <Label>Description</Label>
                                <RichTextEditor value={formDescription} onChange={setFormDescription} />
                            </div>
                            <div>
                                <Label>Analytical Information</Label>
                                <RichTextEditor value={formAnalysis} onChange={setFormAnalysis} />
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                        <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveFinal}>Save Changes</Button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}
