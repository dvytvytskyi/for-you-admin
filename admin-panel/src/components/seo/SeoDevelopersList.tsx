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

export default function SeoDevelopersList() {
    const [developers, setDevelopers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [syncing, setSyncing] = useState(false)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [currentDev, setCurrentDev] = useState<any>(null)

    // Form states
    const [formName, setFormName] = useState('')
    const [formLogo, setFormLogo] = useState('')
    const [formDescription, setFormDescription] = useState('')
    const [formAnalysis, setFormAnalysis] = useState('')
    const [formPhotos, setFormPhotos] = useState<string[]>([])

    const loadDevelopers = async () => {
        setLoading(true)
        try {
            const { data } = await api.get('/seo/developers')
            setDevelopers(data.data || [])
        } catch (error) {
            console.error('Error loading seo developers:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { loadDevelopers() }, [])

    const handleSyncProjects = async () => {
        setSyncing(true)
        try {
            const { data } = await api.post('/seo-sync/sync-projects')
            alert(`Sync completed!\nProjects: ${data.syncedProjects}\nUnits: ${data.unitsSynced}\nFailed: ${data.failed}`)
            loadDevelopers()
        } catch (error: any) {
            console.error('Sync error:', error)
            alert('Failed to sync projects: ' + (error.response?.data?.error || error.message))
        } finally {
            setSyncing(false)
        }
    }

    const handleEdit = (dev: any = null) => {
        if (dev) {
            setCurrentDev(dev)
            setFormName(dev.name || '')
            setFormLogo(dev.logoUrl || '')
            setFormDescription(dev.description || '')
            // In SeoDeveloper entity we have analyticalInfo as JSONB
            // If it's stored as text, we use it as text for RichTextEditor
            setFormAnalysis(typeof dev.analyticalInfo === 'string' ? dev.analyticalInfo : JSON.stringify(dev.analyticalInfo || ''))
            setFormPhotos(dev.photos || [])
        } else {
            setCurrentDev(null)
            setFormName('')
            setFormLogo('')
            setFormDescription('')
            setFormAnalysis('')
            setFormPhotos([])
        }
        setIsEditModalOpen(true)
    }

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this developer from SEO?')) {
            try {
                await api.delete(`/seo/developers/${id}`)
                loadDevelopers()
            } catch (error) {
                console.error('Error deleting developer:', error)
            }
        }
    }

    const handleSave = async () => {
        const payload = {
            name: formName,
            logoUrl: formLogo,
            description: formDescription,
            analyticalInfo: formAnalysis,
            photos: formPhotos
        }

        try {
            if (currentDev) {
                await api.patch(`/seo/developers/${currentDev.id}`, payload)
            } else {
                await api.post('/seo/developers', payload)
            }
            setIsEditModalOpen(false)
            loadDevelopers()
        } catch (error) {
            console.error('Error saving developer:', error)
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">Developers & Projects</h1>
                <div className="flex gap-3">
                    <Button 
                        variant="outline" 
                        onClick={handleSyncProjects} 
                        disabled={syncing}
                        className="border-brand-500/20 text-brand-600 hover:bg-brand-50"
                    >
                        {syncing ? 'Syncing Projects & Units...' : 'Sync Projects from PF'}
                    </Button>
                    <Button className="flex items-center gap-2" onClick={() => handleEdit()}>
                        <PlusIcon className="w-4 h-4" /> Add New Developer
                    </Button>
                </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
                <Table>
                    <TableHeader className="bg-gray-50 dark:bg-white/[0.03]">
                        <TableRow>
                            <TableCell isHeader>Logo</TableCell>
                            <TableCell isHeader>Name</TableCell>
                            <TableCell isHeader>Created</TableCell>
                            <TableCell isHeader className="text-right">Actions</TableCell>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={4} className="text-center py-8">Loading...</TableCell></TableRow>
                        ) : developers.length === 0 ? (
                            <TableRow><TableCell colSpan={4} className="text-center py-8">No developers in AI SEO</TableCell></TableRow>
                        ) : (
                            developers.map((dev) => (
                                <TableRow key={dev.id}>
                                    <TableCell>
                                        {dev.logoUrl && <img src={dev.logoUrl} className="h-8 w-auto" alt="" />}
                                    </TableCell>
                                    <TableCell className="font-medium">{dev.name}</TableCell>
                                    <TableCell className="text-gray-500 text-sm">{new Date(dev.createdAt).toLocaleDateString()}</TableCell>
                                    <TableCell className="text-right flex justify-end gap-2">
                                        <button onClick={() => handleEdit(dev)} className="p-2 text-gray-500 hover:text-brand-500"><PencilIcon className="w-4 h-4" /></button>
                                        <button onClick={() => handleDelete(dev.id)} className="p-2 text-gray-500 hover:text-error-500"><TrashBinIcon className="w-4 h-4" /></button>
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
                    <h2 className="text-xl font-bold mb-6">{currentDev ? 'Edit SEO Developer' : 'Add SEO Developer'}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-1">
                    <div className="space-y-4">
                        <div>
                            <Label>Developer Name</Label>
                            <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="E.g. Emaar Properties" />
                        </div>
                        <div>
                            <Label>Logo URL</Label>
                            <Input value={formLogo} onChange={(e) => setFormLogo(e.target.value)} placeholder="https://..." />
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
                            <RichTextEditor
                                value={formDescription}
                                onChange={setFormDescription}
                            />
                        </div>
                        <div>
                            <Label>Analytical Information</Label>
                            <RichTextEditor
                                value={formAnalysis}
                                onChange={setFormAnalysis}
                            />
                        </div>
                    </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                    <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
                    <Button onClick={handleSave}>Save Changes</Button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}
