'use client'

import { useState, useCallback, useEffect } from 'react'
import { api } from '@/lib/api'
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table'
import Badge from '@/components/ui/badge/Badge'
import Button from '@/components/ui/button/Button'
import Input from '@/components/form/input/InputField'
import Pagination from '@/components/tables/Pagination'
import { PlusIcon, GridIcon, ListIcon } from '@/icons'
import ProjectCard from '@/components/property-finder/ProjectCard'

interface ProjectsListProps {
  initialProjects: any[]
  initialTotalCount: number
  initialTotalPages: number
}

export default function ProjectsList({ 
  initialProjects, 
  initialTotalCount, 
  initialTotalPages 
}: ProjectsListProps) {
  const [projects, setProjects] = useState<any[]>(initialProjects)
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(24)
  const [totalCount, setTotalCount] = useState(initialTotalCount)
  const [totalPages, setTotalPages] = useState(initialTotalPages)

  // Advanced Filters
  const [status, setStatus] = useState<string>('all')
  const [location, setLocation] = useState('')
  const [developer, setDeveloper] = useState('')
  const [priceMin, setPriceMin] = useState('')
  const [priceMax, setPriceMax] = useState('')
  const [sizeMin, setSizeMin] = useState('')
  const [sizeMax, setSizeMax] = useState('')
  const [bedrooms, setBedrooms] = useState<number[]>([])
  const [furnishingType, setFurnishingType] = useState('')
  const [sortBy, setSortBy] = useState('updatedAt')
  const [sortOrder, setSortOrder] = useState('DESC')

  // Metadata for filters
  const [locNames, setLocNames] = useState<any[]>([])
  const [devNames, setDevNames] = useState<any[]>([])
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const { data } = await api.get('/public/data')
        if (data.success && data.data.propertyFinder) {
          setLocNames(data.data.propertyFinder.locations || [])
          setDevNames(data.data.propertyFinder.developers || [])
        }
      } catch (e) {
        console.error('Failed to fetch filter metadata', e)
      }
    }
    fetchMetadata()
  }, [])

  const loadProjects = useCallback(async (isInitial = false) => {
    if (isInitial && initialProjects.length > 0) return;
    
    setLoading(true)
    try {
      const params: any = {
        page: currentPage,
        perPage: itemsPerPage,
        search: searchQuery,
        status: status !== 'all' ? status : undefined,
        location: location || undefined,
        developer: developer || undefined,
        priceMin: priceMin || undefined,
        priceMax: priceMax || undefined,
        sizeMin: sizeMin || undefined,
        sizeMax: sizeMax || undefined,
        furnishingType: furnishingType || undefined,
        sortBy,
        sortOrder
      }

      if (bedrooms.length > 0) {
        params.bedrooms = bedrooms
      }

      const { data } = await api.get('/property-finder/projects', { params })

      if (data.data) {
          setProjects(data.data.items || [])
          setTotalCount(data.data.pagination.total || 0)
          setTotalPages(data.data.pagination.totalPages || 1)
      }
    } catch (error) {
      console.error('Error loading PF projects:', error)
    } finally {
      setLoading(false)
    }
  }, [currentPage, searchQuery, itemsPerPage, status, location, developer, priceMin, priceMax, sizeMin, sizeMax, bedrooms, furnishingType, sortBy, sortOrder])

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  const toggleBedroom = (val: number) => {
    setBedrooms(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val])
    setCurrentPage(1)
  }

  const handleSync = async () => {
    if (!confirm('Start synchronization with Property Finder? This may take a minute.')) return
    
    setSyncing(true)
    try {
      await api.post('/property-finder/sync')
      alert('Synchronization started in background. Please refresh in a minute.')
    } catch (error) {
      console.error('Sync error:', error)
      alert('Failed to start sync')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-2xl font-semibold text-gray-800 dark:text-white">Property Finder Projects</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Explore synced projects for use on main website
            </p>
        </div>
        <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className={showFilters ? 'bg-gray-100 dark:bg-white/10' : ''}
            >
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </Button>
            <Button
              className="flex items-center gap-2"
              onClick={handleSync}
              disabled={syncing}
              variant={syncing ? 'outline' : 'primary'}
            >
              {syncing ? 'Syncing...' : 'Sync Now'}
            </Button>
        </div>
      </div>

      {showFilters && (
        <div className="p-5 rounded-xl border border-gray-200 bg-white/50 backdrop-blur-sm dark:bg-white/[0.03] dark:border-white/[0.08] grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-2">
          {/* Status */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-500 uppercase">Project Status</label>
            <select 
              value={status} 
              onChange={e => { setStatus(e.target.value); setCurrentPage(1); }}
              className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none transition-all"
            >
              <option value="all">All Statuses</option>
              <option value="off-plan">Off-Plan</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          {/* Location */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-500 uppercase">Location</label>
            <select 
              value={location} 
              onChange={e => { setLocation(e.target.value); setCurrentPage(1); }}
              className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none transition-all"
            >
              <option value="">All Locations</option>
              {locNames.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
            </select>
          </div>

          {/* Developer */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-500 uppercase">Developer</label>
            <select 
              value={developer} 
              onChange={e => { setDeveloper(e.target.value); setCurrentPage(1); }}
              className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none transition-all"
            >
              <option value="">All Developers</option>
              {devNames.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
            </select>
          </div>

          {/* Furnishing */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-500 uppercase">Furnishing</label>
            <select 
              value={furnishingType} 
              onChange={e => { setFurnishingType(e.target.value); setCurrentPage(1); }}
              className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none transition-all"
            >
              <option value="">Any</option>
              <option value="unfurnished">Unfurnished</option>
              <option value="furnished">Furnished</option>
              <option value="partly_furnished">Partly Furnished</option>
            </select>
          </div>

          {/* Price Range */}
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-medium text-gray-500 uppercase">Price Range (AED)</label>
            <div className="flex items-center gap-2">
              <Input 
                placeholder="Min Price" 
                value={priceMin} 
                onChange={e => { setPriceMin(e.target.value); setCurrentPage(1); }} 
              />
              <span className="text-gray-400">to</span>
              <Input 
                placeholder="Max Price" 
                value={priceMax} 
                onChange={e => { setPriceMax(e.target.value); setCurrentPage(1); }} 
              />
            </div>
          </div>

          {/* Size Range */}
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-medium text-gray-500 uppercase">Size Range (sq. ft.)</label>
            <div className="flex items-center gap-2">
              <Input 
                placeholder="Min Size" 
                value={sizeMin} 
                onChange={e => { setSizeMin(e.target.value); setCurrentPage(1); }} 
              />
              <span className="text-gray-400">to</span>
              <Input 
                placeholder="Max Size" 
                value={sizeMax} 
                onChange={e => { setSizeMax(e.target.value); setCurrentPage(1); }} 
              />
            </div>
          </div>

          {/* Bedrooms */}
          <div className="space-y-2 md:col-span-4">
            <label className="text-xs font-medium text-gray-500 uppercase">Bedrooms</label>
            <div className="flex flex-wrap gap-2">
              {[0, 1, 2, 3, 4, 5, 6, 7].map(num => (
                <button
                  key={num}
                  onClick={() => toggleBedroom(num)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                    bedrooms.includes(num)
                      ? 'bg-brand-500 text-white border-brand-500'
                      : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-600 hover:border-brand-500 hover:text-brand-500'
                  }`}
                >
                  {num === 0 ? 'Studio' : `${num} BR`}
                </button>
              ))}
            </div>
          </div>

          {/* Sorting Control */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-500 uppercase">Sort By</label>
            <div className="flex gap-2">
              <select 
                value={sortBy} 
                onChange={e => { setSortBy(e.target.value); setCurrentPage(1); }}
                className="flex-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none transition-all"
              >
                <option value="updatedAt">Updated</option>
                <option value="price">Price</option>
                <option value="size">Size</option>
                <option value="createdAt">Created</option>
              </select>
              <button 
                onClick={() => { setSortOrder(prev => prev === 'ASC' ? 'DESC' : 'ASC'); setCurrentPage(1); }}
                className="p-2 border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                title={sortOrder === 'ASC' ? 'Ascending' : 'Descending'}
              >
                {sortOrder === 'ASC' ? '↑' : '↓'}
              </button>
            </div>
          </div>

          <div className="md:col-span-3 flex justify-end items-end pb-1">
             <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  setStatus('all'); setLocation(''); setDeveloper(''); setPriceMin(''); setPriceMax('');
                  setSizeMin(''); setSizeMax(''); setBedrooms([]); setFurnishingType('');
                  setSortBy('updatedAt'); setSortOrder('DESC'); setSearchQuery('');
                  setCurrentPage(1);
                }}
             >
               Reset All Filters
             </Button>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-4">
            {/* View Mode Toggle */}
            <div className="flex gap-1 rounded-lg border border-gray-200 p-1 dark:border-gray-800 dark:bg-gray-900">
                <button 
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-gray-100 dark:bg-gray-800 text-brand-500' : 'text-gray-400 hover:bg-gray-50'}`}
                >
                    <GridIcon className="w-5 h-5" />
                </button>
                <button 
                    onClick={() => setViewMode('table')}
                    className={`p-2 rounded-md transition-colors ${viewMode === 'table' ? 'bg-gray-100 dark:bg-gray-800 text-brand-500' : 'text-gray-400 hover:bg-gray-50'}`}
                >
                    <ListIcon className="w-5 h-5" />
                </button>
            </div>
        </div>

        <div className="w-full sm:w-auto sm:min-w-[400px]">
          <Input
            type="text"
            placeholder="Search projects by title or PF ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
            <div className="text-gray-500 text-lg animate-pulse">Loading projects...</div>
        </div>
      ) : projects.length === 0 ? (
        <div className="flex h-64 items-center justify-center rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-800 text-center p-8">
            <div>
                <div className="text-gray-400 mb-2">
                    <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                </div>
                <div className="text-gray-500 font-medium">No projects found.</div>
                <div className="text-sm text-gray-400 mt-1">Try a different search term or adjust filters.</div>
            </div>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {projects.map(project => (
                <ProjectCard key={project.pfId} project={project} />
            ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
            <div className="max-w-full overflow-x-auto">
            <Table>
                <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                <TableRow>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Project</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Developer</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Location</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Price (Starting)</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Status</TableCell>
                </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                    {projects.map((project) => (
                    <TableRow key={project.pfId} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer" onClick={() => window.location.href = `/property-finder/${project.id}`}>
                        <TableCell className="px-5 py-4">
                        <div>
                            <span className="block font-medium text-theme-sm text-gray-800 dark:text-white/90">
                            {project.title?.en || 'N/A'}
                            </span>
                            <span className="block text-gray-500 text-theme-xs dark:text-gray-400">
                            PF ID: {project.pfId}
                            </span>
                        </div>
                        </TableCell>
                        <TableCell className="px-5 py-4 text-gray-500 text-theme-sm dark:text-gray-400">
                        {project.developer?.name || project.developer || 'N/A'}
                        </TableCell>
                        <TableCell className="px-5 py-4 text-gray-500 text-theme-sm dark:text-gray-400">
                        {project.location?.name || project.location || 'N/A'}
                        </TableCell>
                        <TableCell className="px-5 py-4 text-gray-800 text-theme-sm dark:text-white/90 font-medium">
                        {project.startingPrice || '-'}
                        </TableCell>
                        <TableCell className="px-5 py-4 text-start">
                        {project.status ? (
                            <Badge size="sm" color={project.status.includes('off-plan') ? 'warning' : 'success'}>
                            {project.status.replace('_', ' ').toUpperCase()}
                            </Badge>
                        ) : '-'}
                        </TableCell>
                    </TableRow>
                    ))}
                </TableBody>
            </Table>
            </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Showing {projects.length} of {totalCount} projects
        </p>
        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        )}
      </div>
    </div>
  )
}
