'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import Badge from '@/components/ui/badge/Badge'
import Button from '@/components/ui/button/Button'
import Image from 'next/image'

export default function ProjectDetailsPage() {
  const { id } = useParams()
  const router = useRouter()
  const [project, setProject] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadProject = async () => {
      try {
        const { data } = await api.get(`/property-finder/projects/${id}`)
        setProject(data.data)
      } catch (error) {
        console.error('Error loading project details:', error)
      } finally {
        setLoading(false)
      }
    }
    loadProject()
  }, [id])

  if (loading) return <div className="p-8 text-center text-gray-500">Loading details...</div>
  if (!project) return <div className="p-8 text-center text-red-500">Project not found</div>

  const raw = project.fullData || {}
  const media = raw.media || {}
  const images = media.images || []
  const amenities = raw.amenities || []
  const description = typeof raw.description === 'string' ? raw.description : (raw.description?.en || 'No description available.');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
            <button 
                onClick={() => router.back()}
                className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors"
            >
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
            </button>
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{project.title?.en || project.title}</h1>
                <p className="text-sm text-gray-500">{project.location?.name || project.location} • PF ID: {project.pfId}</p>
            </div>
        </div>
        <div className="flex gap-3">
             <Badge color={raw.completionStatus?.includes('off_plan') ? 'warning' : 'success'}>
                {(raw.completionStatus || 'UNKNOWN').replace('_', ' ').toUpperCase()}
            </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content (Left) */}
        <div className="lg:col-span-2 space-y-6">
            {/* Image Gallery */}
            <div className="rounded-2xl border border-gray-200 bg-white p-2 dark:border-gray-800 dark:bg-gray-900">
                <div className="grid grid-cols-2 gap-2">
                    {images.slice(0, 4).map((img: any, idx: number) => (
                        <div key={idx} className={`relative overflow-hidden rounded-xl ${idx === 0 ? 'col-span-2 aspect-video' : 'aspect-square'}`}>
                            <Image 
                                src={img.original?.url || img.url || ''} 
                                alt={`Project image ${idx}`} 
                                fill 
                                className="object-cover"
                            />
                        </div>
                    ))}
                    {images.length === 0 && (
                        <div className="col-span-2 aspect-video bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center text-gray-400">
                            No images available
                        </div>
                    )}
                </div>
            </div>

            {/* Description */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Project Description</h3>
                <div className="prose prose-sm dark:prose-invert max-w-none text-gray-600 dark:text-gray-400 whitespace-pre-line">
                    {description}
                </div>
            </div>

             {/* Amenities */}
             <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Amenities</h3>
                <div className="flex flex-wrap gap-2">
                    {amenities.map((amenity: any, idx: number) => (
                        <div key={idx} className="px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300">
                            {amenity.name?.en || amenity.name || amenity}
                        </div>
                    ))}
                    {amenities.length === 0 && <span className="text-gray-400 italic">No amenities listed.</span>}
                </div>
            </div>

            {/* Units */}
            <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 overflow-hidden shadow-sm">
                <div className="p-6 border-b border-gray-100 dark:border-gray-800">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Available Units ({project.units?.length || 0})</h3>
                    <p className="text-sm text-gray-400">Inventory directly from your Property Finder listings</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 dark:bg-white/[0.03]">
                            <tr>
                                <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500 tracking-wider">Unit #</th>
                                <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500 tracking-wider">Type</th>
                                <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500 tracking-wider">Price (AED)</th>
                                <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500 tracking-wider">Size</th>
                                <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500 tracking-wider">Beds</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {(project.units || []).map((unit: any, idx: number) => (
                                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                                    <td className="px-6 py-4 font-bold text-gray-900 dark:text-white/90">{unit.unitNumber || unit.reference || unit.pfId}</td>
                                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400 capitalize">{unit.type}</td>
                                    <td className="px-6 py-4 text-brand-500 font-bold">
                                        {unit.price?.onRequest ? 'On Request' : (unit.price?.amounts?.sale || unit.price || 0).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400 font-medium">{unit.size?.value || unit.size} {unit.size?.unit || 'sqft'}</td>
                                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400 font-medium">{unit.bedrooms}</td>
                                </tr>
                            ))}
                            {(!project.units || project.units.length === 0) && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic">
                                        No specific units discovered yet. Try syncing listings.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        {/* Sidebar (Right) */}
        <div className="space-y-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900 shadow-sm">
                <h3 className="text-sm font-semibold uppercase text-gray-400 mb-4 tracking-wider">Quick Info</h3>
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">Developer</span>
                        <span className="text-sm font-bold text-brand-500">{project.developer?.name || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">Starting Price</span>
                        <span className="text-sm font-bold text-gray-900 dark:text-white uppercase">{project.startingPrice}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">DLD ID</span>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{project.dldId || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">Category</span>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase">{raw.category}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">Last Sync</span>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{new Date(project.lastSyncAt).toLocaleDateString()}</span>
                    </div>
                </div>
                
                <div className="mt-8">
                     <Button className="w-full">Export to PDF (Soon)</Button>
                </div>
            </div>

            {/* Raw Data Preview (Debug) */}
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 dark:border-gray-800 dark:bg-gray-950">
                <h3 className="text-xs font-mono uppercase text-gray-400 mb-2">Internal Raw Data</h3>
                <pre className="text-[10px] overflow-auto max-h-64 font-mono text-gray-500 scrollbar-hide">
                    {JSON.stringify(raw, null, 2)}
                </pre>
            </div>
        </div>
      </div>
    </div>
  )
}
