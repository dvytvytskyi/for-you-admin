'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import Image from 'next/image'
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table'
import Badge from '@/components/ui/badge/Badge'
import Button from '@/components/ui/button/Button'
import Input from '@/components/form/input/InputField'
import Pagination from '@/components/tables/Pagination'
import { PlusIcon } from '@/icons'
import Select from '@/components/form/Select'
import Label from '@/components/form/Label'

export default function PropertiesPage() {
  const router = useRouter()

  const [properties, setProperties] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [propertyType, setPropertyType] = useState<string>('off-plan')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(100)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [imageLoadingStates, setImageLoadingStates] = useState<Record<string, boolean>>({})
  const [duplicateMarkers, setDuplicateMarkers] = useState<Set<string>>(new Set())
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Filter states
  const [developers, setDevelopers] = useState<any[]>([])
  const [cities, setCities] = useState<any[]>([])
  const [areas, setAreas] = useState<any[]>([])
  const [selectedDeveloper, setSelectedDeveloper] = useState<string>('')
  const [selectedCity, setSelectedCity] = useState<string>('')
  const [selectedArea, setSelectedArea] = useState<string>('')
  const [selectedBedrooms, setSelectedBedrooms] = useState<string>('')
  const [priceFrom, setPriceFrom] = useState<string>('')
  const [priceTo, setPriceTo] = useState<string>('')
  const [sizeFrom, setSizeFrom] = useState<string>('')
  const [sizeTo, setSizeTo] = useState<string>('')
  const [showFilters, setShowFilters] = useState(true)

  // Функція для копіювання назви проекту
  const copyPropertyName = async (name: string, propertyId: string, e: React.MouseEvent) => {
    e.stopPropagation() // Запобігаємо відкриттю проекту при кліку на кнопку
    try {
      await navigator.clipboard.writeText(name)
      setCopiedId(propertyId)
      setTimeout(() => setCopiedId(null), 2000) // Скидаємо індикатор через 2 секунди
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  // Функція для нормалізації імені (приведення до нижнього регістру, видалення зайвих пробілів)
  const normalizeName = (name: string): string => {
    if (!name) return ''
    return name.toLowerCase().trim().replace(/\s+/g, ' ')
  }

  // Читаємо параметри з URL після монтування
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const urlType = params.get('type') as 'off-plan' | 'secondary'
      const urlPage = parseInt(params.get('page') || '1', 10)
      const urlSearch = params.get('search') || ''

      if (urlType) {
        setPropertyType(urlType)
      }
      if (urlPage > 0 && urlPage !== currentPage) {
        setCurrentPage(urlPage)
      }
      if (urlSearch !== searchQuery) {
        setSearchQuery(urlSearch)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Тільки при монтуванні

  // Завантажуємо всі імена проектів для перевірки дублікатів (в фоні, після основного завантаження)
  const loadAllPropertyNames = useCallback(async () => {
    try {
      // Затримка щоб не блокувати основне завантаження - чекаємо поки основні дані завантажаться
      await new Promise(resolve => setTimeout(resolve, 1000))

      const params: any = {
        propertyType: propertyType,
        limit: '10000', // Завантажуємо багато для перевірки дублікатів
        page: '1',
      }

      const { data } = await api.get('/properties', { params })

      let allProperties: any[] = []
      if (data.data?.data && Array.isArray(data.data.data)) {
        allProperties = data.data.data
      } else if (data.data && Array.isArray(data.data)) {
        allProperties = data.data
      }

      // Знаходимо дублікати серед всіх проектів
      const nameMap = new Map<string, any[]>()
      const markers = new Set<string>()

      // Групуємо проекти за нормалізованими іменами
      allProperties.forEach((property) => {
        const normalizedName = normalizeName(property.name)
        if (normalizedName) {
          if (!nameMap.has(normalizedName)) {
            nameMap.set(normalizedName, [])
          }
          nameMap.get(normalizedName)!.push(property)
        }
      })

      // Для кожної групи дублікатів (більше 1 проекту) позначаємо ВСІ як дублікати
      nameMap.forEach((group, normalizedName) => {
        if (group.length > 1) {
          // Якщо є дублікати, додаємо всі ID з групи до маркерів
          group.forEach(item => {
            if (item.id) {
              markers.add(item.id)
            }
          })
        }
      })

      setDuplicateMarkers(markers)
    } catch (error) {
      console.error('Error loading property names for duplicate detection:', error)
      setDuplicateMarkers(new Set())
    }
  }, [propertyType])

  // Завантажуємо імена для перевірки дублікатів при зміні типу проекту (в фоні, після завантаження основних даних)
  useEffect(() => {
    // Запускаємо в фоні тільки після того як основні дані завантажилися
    if (!loading && properties.length > 0) {
      loadAllPropertyNames()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, properties.length]) // loadAllPropertyNames не додаємо щоб уникнути зациклення

  // Оновлюємо URL при зміні параметрів
  useEffect(() => {
    const params = new URLSearchParams()
    if (propertyType !== 'off-plan') params.set('type', propertyType)
    if (currentPage > 1) params.set('page', currentPage.toString())
    if (searchQuery) params.set('search', searchQuery)

    const queryString = params.toString()
    const newUrl = queryString ? `/properties?${queryString}` : '/properties'

    // Оновлюємо URL без перезавантаження сторінки
    window.history.replaceState({}, '', newUrl)
  }, [propertyType, currentPage, searchQuery])

  // Скидаємо сторінку на 1 при зміні типу проекту, пошуку або фільтрів
  useEffect(() => {
    setCurrentPage(1)
  }, [propertyType, searchQuery, selectedDeveloper, selectedCity, selectedArea, selectedBedrooms, priceFrom, priceTo, sizeFrom, sizeTo])

  const loadProperties = useCallback(async () => {
    setLoading(true)
    try {
      // Формуємо параметри для запиту
      const params: any = {
        propertyType: propertyType,
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
      }

      // Додаємо пошук, якщо є
      if (searchQuery) {
        params.search = searchQuery
      }

      // Додаємо фільтри
      if (selectedDeveloper) {
        params.developerId = selectedDeveloper
      }
      if (selectedCity) {
        params.cityId = selectedCity
      }
      if (selectedArea) {
        params.areaId = selectedArea
      }
      if (selectedBedrooms) {
        params.bedrooms = selectedBedrooms
      }
      if (priceFrom) {
        params.priceFrom = priceFrom
      }
      if (priceTo) {
        params.priceTo = priceTo
      }
      if (sizeFrom) {
        params.sizeFrom = sizeFrom
      }
      if (sizeTo) {
        params.sizeTo = sizeTo
      }

      // Використовуємо params як другий аргумент axios.get для правильного форматування
      const { data } = await api.get('/properties', { params })

      // Перевіряємо структуру відповіді { data: [], pagination: {} }
      if (data.pagination && Array.isArray(data.data)) {
        setProperties(data.data)
        setTotalCount(data.pagination.total)
        setTotalPages(data.pagination.totalPages)
      } else if (data.data?.data && data.data?.pagination) {
        // Структура { data: { data: [], pagination: {} } }
        setProperties(data.data.data)
        setTotalCount(data.data.pagination.total)
        setTotalPages(data.data.pagination.totalPages)
      } else if (data.data && Array.isArray(data.data)) {
        // Fallback для старої структури (якщо бекенд ще не оновлений) or no pagination handling
        console.warn('Backend returned old format without pagination')
        setProperties(data.data)
        // Якщо пагінації немає у відповіді, вважаємо що отримали всі записи (або сторінку)
        // Але краще не перезаписувати totalCount якщо це просто помилка формату
        setTotalCount(data.data.length)
        setTotalPages(Math.ceil(data.data.length / itemsPerPage))
      } else if (data.data && data.data.data && data.data.total !== undefined) {
        // Формат з data.data.data та data.data.total (старий формат бекенду)
        setProperties(data.data.data)
        setTotalCount(data.data.total)
        setTotalPages(Math.ceil(data.data.total / (data.data.limit || itemsPerPage)))
      } else {
        // Помилка або порожня відповідь
        console.error('Unexpected response format:', data)
        setProperties([])
        setTotalCount(0)
        setTotalPages(1)
      }
    } catch (error) {
      console.error('Error loading properties:', error)
      setProperties([])
      setTotalCount(0)
      setTotalPages(1)
    } finally {
      setLoading(false)
    }
  }, [propertyType, currentPage, searchQuery, itemsPerPage, selectedDeveloper, selectedCity, selectedArea, selectedBedrooms, priceFrom, priceTo, sizeFrom, sizeTo])

  // Debounce для пошуку
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadProperties()
      // Scroll to top when tab changes
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      })
    }, searchQuery ? 300 : 0) // Затримка тільки для пошуку

    return () => clearTimeout(timeoutId)
  }, [loadProperties, propertyType, currentPage, searchQuery])

  // Scroll to top when page changes
  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }, [currentPage])

  // Load filter data
  useEffect(() => {
    const loadFilterData = async () => {
      try {
        const [developersRes, citiesRes] = await Promise.all([
          api.get('/settings/developers').catch(() => ({ data: { data: [] } })),
          api.get('/settings/cities').catch(() => ({ data: { data: [] } })),
        ])
        setDevelopers(developersRes.data.data || [])
        setCities(citiesRes.data.data || [])
      } catch (error) {
        console.error('Error loading filter data:', error)
      }
    }
    loadFilterData()
  }, [])

  // Load areas when city changes
  useEffect(() => {
    const loadAreas = async () => {
      if (selectedCity) {
        try {
          const { data } = await api.get(`/settings/areas?cityId=${selectedCity}`)
          setAreas(data.data || [])
        } catch (error) {
          console.error('Error loading areas:', error)
          setAreas([])
        }
      } else {
        setAreas([])
        setSelectedArea('')
      }
    }
    loadAreas()
  }, [selectedCity])

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white">Properties</h1>
        <Button
          className="flex items-center gap-2"
          onClick={() => router.push('/properties/add')}
        >
          <PlusIcon className="w-4 h-4" />
          Add Property
        </Button>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {/* Property Type Toggle */}
        <div className="flex flex-wrap gap-2 rounded-lg border border-gray-200 p-1 dark:border-gray-800 dark:bg-gray-900">
          {[
            { id: 'new-launches', label: 'New Launches' },
            { id: 'off-plan', label: 'Off-Plan' },
            { id: 'secondary', label: 'Secondary' },
            { id: 'rent', label: 'Rent' },
            { id: 'exclusive-for-you', label: 'Exclusive For You' },
            { id: 'commercial', label: 'Commercial' },
          ].map((type) => (
            <button
              key={type.id}
              onClick={() => setPropertyType(type.id)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${propertyType === type.id
                ? 'bg-brand-500 text-white'
                : 'text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5'
                }`}
            >
              {type.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="w-full sm:w-auto sm:min-w-[300px]">
          <Input
            type="text"
            placeholder="Search by name or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span>Filters</span>
            <svg
              className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {(selectedDeveloper || selectedCity || selectedArea || selectedBedrooms || priceFrom || priceTo || sizeFrom || sizeTo) && (
            <button
              onClick={() => {
                setSelectedDeveloper('')
                setSelectedCity('')
                setSelectedArea('')
                setSelectedBedrooms('')
                setPriceFrom('')
                setPriceTo('')
                setSizeFrom('')
                setSizeTo('')
              }}
              className="px-4 py-2 text-sm font-medium text-error-500 hover:text-error-600 hover:bg-error-50 dark:hover:bg-error-900/20 rounded-lg transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>

        {showFilters && (
          <div className="w-full">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
              {/* Developer Filter */}
              <div>
                <Label>Developer</Label>
                <Select
                  options={developers.map((d) => ({ value: d.id, label: d.name }))}
                  placeholder="All developers"
                  defaultValue={selectedDeveloper}
                  onChange={(value) => setSelectedDeveloper(value || '')}
                />
              </div>

              {/* City Filter */}
              <div>
                <Label>City</Label>
                <Select
                  options={cities.map((c) => ({ value: c.id, label: c.nameEn || c.name }))}
                  placeholder="All cities"
                  defaultValue={selectedCity}
                  onChange={(value) => {
                    setSelectedCity(value || '')
                    setSelectedArea('') // Reset area when city changes
                  }}
                />
              </div>

              {/* Area Filter */}
              <div>
                <Label>Area</Label>
                <Select
                  options={areas.map((a) => ({ value: a.id, label: a.nameEn || a.name }))}
                  placeholder="All areas"
                  defaultValue={selectedArea}
                  onChange={(value) => setSelectedArea(value || '')}
                  disabled={!selectedCity}
                />
              </div>

              {/* Bedrooms Filter */}
              <div>
                <Label>Bedrooms</Label>
                <Select
                  options={[
                    { value: '1', label: '1' },
                    { value: '2', label: '2' },
                    { value: '3', label: '3' },
                    { value: '4', label: '4' },
                    { value: '5', label: '5+' },
                  ]}
                  placeholder="All bedrooms"
                  defaultValue={selectedBedrooms}
                  onChange={(value) => setSelectedBedrooms(value || '')}
                />
              </div>

              {/* Price From */}
              <div>
                <Label>Price From (USD)</Label>
                <Input
                  type="number"
                  placeholder="Min price"
                  value={priceFrom}
                  onChange={(e) => setPriceFrom(e.target.value)}
                />
              </div>

              {/* Price To */}
              <div>
                <Label>Price To (USD)</Label>
                <Input
                  type="number"
                  placeholder="Max price"
                  value={priceTo}
                  onChange={(e) => setPriceTo(e.target.value)}
                />
              </div>

              {/* Size From */}
              <div>
                <Label>Size From (sq.m)</Label>
                <Input
                  type="number"
                  placeholder="Min size"
                  value={sizeFrom}
                  onChange={(e) => setSizeFrom(e.target.value)}
                />
              </div>

              {/* Size To */}
              <div>
                <Label>Size To (sq.m)</Label>
                <Input
                  type="number"
                  placeholder="Max size"
                  value={sizeTo}
                  onChange={(e) => setSizeTo(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Datatable */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto">
          <div className="min-w-[1102px]">
            <Table>
              {/* Table Header */}
              <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                <TableRow>
                  <TableCell
                    isHeader
                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    Property
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    Location
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    Price
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    Bedrooms
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    Size
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    Status
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    Last Visited
                  </TableCell>
                </TableRow>
              </TableHeader>

              {/* Table Body */}
              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="px-5 py-8 text-center text-gray-500">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : properties.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="px-5 py-8 text-center text-gray-500">
                      {searchQuery ? 'No properties found' : 'No properties'}
                    </TableCell>
                  </TableRow>
                ) : (
                  properties.map((property) => (
                    <TableRow
                      key={property.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                      onClick={() => {
                        // Відкриваємо в новій вкладці з параметрами для повернення
                        const params = new URLSearchParams()
                        if (propertyType !== 'off-plan') params.set('type', propertyType)
                        if (currentPage > 1) params.set('page', currentPage.toString())
                        if (searchQuery) params.set('search', searchQuery)

                        const returnParams = params.toString()
                        const url = returnParams
                          ? `/properties/edit/${property.id}?return=${encodeURIComponent(returnParams)}`
                          : `/properties/edit/${property.id}`
                        window.open(url, '_blank', 'noopener,noreferrer')
                      }}
                    >
                      <TableCell className="px-5 py-4 sm:px-6 text-start">
                        <div className="flex items-center gap-3">
                          {property.photos?.[0] ? (
                            <div className="relative w-12 h-12 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
                              {/* Skeleton loader - show while loading (undefined or true) */}
                              {imageLoadingStates[property.id] !== false && (
                                <div className="absolute inset-0 bg-gradient-to-br from-gray-300 via-gray-200 to-gray-300 dark:from-gray-600 dark:via-gray-700 dark:to-gray-600">
                                  {/* Shimmer effect */}
                                  <div className="absolute inset-0 overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
                                  </div>
                                  {/* Pulse overlay for more visibility */}
                                  <div className="absolute inset-0 bg-gray-300/50 dark:bg-gray-700/50 animate-pulse" />
                                </div>
                              )}
                              <Image
                                width={48}
                                height={48}
                                src={property.photos[0]}
                                alt={property.name || 'Property'}
                                className={`object-cover w-full h-full transition-opacity duration-300 ${imageLoadingStates[property.id] === false ? 'opacity-100' : 'opacity-0'
                                  }`}
                                onLoad={() => {
                                  setImageLoadingStates((prev) => ({
                                    ...prev,
                                    [property.id]: false,
                                  }))
                                }}
                                onError={() => {
                                  setImageLoadingStates((prev) => ({
                                    ...prev,
                                    [property.id]: false,
                                  }))
                                }}
                              />
                            </div>
                          ) : (
                            <div className="w-12 h-12 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                              <svg
                                className="w-6 h-6 text-gray-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                />
                              </svg>
                            </div>
                          )}
                          <div className="flex items-start gap-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                {duplicateMarkers.has(property.id) && (
                                  <div className="w-2 h-2 rounded-full bg-red-500 shrink-0 mr-1" title="Duplicate project name" />
                                )}
                                <span className={`block font-medium text-theme-sm ${duplicateMarkers.has(property.id)
                                  ? 'text-red-500 dark:text-red-400'
                                  : 'text-gray-800 dark:text-white/90'
                                  }`}>
                                  {property.name || 'Unnamed Property'}
                                </span>
                                <button
                                  onClick={(e) => copyPropertyName(property.name || 'Unnamed Property', property.id, e)}
                                  className="text-xs text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 ml-2 transition-colors"
                                  title={copiedId === property.id ? 'Copied!' : 'Copy property name'}
                                  type="button"
                                >
                                  {copiedId === property.id ? (
                                    <span className="text-green-500">copied</span>
                                  ) : (
                                    'copy'
                                  )}
                                </button>
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="block text-gray-500 text-theme-xs dark:text-gray-400">
                                  ID: {property.id?.slice(0, 8)}...
                                </span>
                                {property.descriptionRu && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800 uppercase" title="Russian description available">
                                    ru
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-5 py-4 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        {property.area?.nameEn || property.city?.nameEn || '-'}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-gray-800 text-start text-theme-sm dark:text-white/90 font-medium">
                        {property.price
                          ? `$${Math.round(property.price).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                          : property.priceFrom
                            ? `From $${Math.round(property.priceFrom).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                            : '-'}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        {property.bedrooms
                          ? property.bedrooms
                          : property.bedroomsFrom && property.bedroomsTo
                            ? `${property.bedroomsFrom}-${property.bedroomsTo}`
                            : '-'}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        {property.size
                          ? `${property.size} sq.m`
                          : property.sizeFrom && property.sizeTo
                            ? `${property.sizeFrom}-${property.sizeTo} sq.m`
                            : '-'}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-start">
                        <Badge size="sm" color="success">
                          Active
                        </Badge>
                      </TableCell>
                      <TableCell className="px-5 py-4 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        {property.updatedAt
                          ? new Date(property.updatedAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                          : property.createdAt
                            ? new Date(property.createdAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                            : '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {totalCount > 0
            ? `Showing ${(currentPage - 1) * itemsPerPage + 1} to ${Math.min(currentPage * itemsPerPage, totalCount)} of ${totalCount} properties`
            : 'No properties found'}
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
