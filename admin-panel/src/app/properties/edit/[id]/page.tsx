'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { api } from '@/lib/api'
import axios from 'axios'
import Button from '@/components/ui/button/Button'
import Input from '@/components/form/input/InputField'
import TextArea from '@/components/form/input/TextArea'
import Select from '@/components/form/Select'
import SearchableSelect from '@/components/form/SearchableSelect'
import Label from '@/components/form/Label'
import Checkbox from '@/components/form/input/Checkbox'

// Property Type enum
enum PropertyType {
  OFF_PLAN = 'off-plan',
  SECONDARY = 'secondary',
}

// Unit Type enum
enum UnitType {
  APARTMENT = 'apartment',
  VILLA = 'villa',
  PENTHOUSE = 'penthouse',
  TOWNHOUSE = 'townhouse',
  OFFICE = 'office',
}

// Validation schemas
const unitSchema = z.object({
  unitId: z.string().min(1, 'Unit ID is required'),
  type: z.nativeEnum(UnitType),
  planImage: z.string().optional(),
  totalSize: z.string().min(1, 'Total size is required'),
  balconySize: z.string().optional(),
  price: z.string().min(1, 'Price is required'),
})

const offPlanSchema = z.object({
  propertyType: z.literal(PropertyType.OFF_PLAN),
  name: z.string().min(1, 'Name is required'),
  photos: z.array(z.string()).min(1, 'At least one photo is required'),
  countryId: z.string().min(1, 'Country is required'),
  cityId: z.string().min(1, 'City is required'),
  areaId: z.string().min(1, 'Area is required'),
  latitude: z.union([z.string(), z.number()]).transform((val) => {
    if (val === null || val === undefined || val === '') return ''
    return String(val).trim()
  }).refine((val) => val.length > 0, { message: 'Latitude is required' }),
  longitude: z.union([z.string(), z.number()]).transform((val) => {
    if (val === null || val === undefined || val === '') return ''
    return String(val).trim()
  }).refine((val) => val.length > 0, { message: 'Longitude is required' }),
  priceFrom: z.union([z.string(), z.number()]).transform((val) => {
    if (val === null || val === undefined || val === '') return ''
    return String(val).trim()
  }).refine((val) => val.length > 0, { message: 'Price from is required' }),
  bedroomsFrom: z.union([z.string(), z.number()]).transform((val) => {
    if (val === null || val === undefined || val === '') return ''
    return String(val).trim()
  }).refine((val) => val.length > 0, { message: 'Bedrooms from is required' }),
  bedroomsTo: z.union([z.string(), z.number()]).transform((val) => {
    if (val === null || val === undefined || val === '') return ''
    return String(val).trim()
  }).refine((val) => val.length > 0, { message: 'Bedrooms to is required' }),
  bathroomsFrom: z.union([z.string(), z.number()]).transform((val) => {
    if (val === null || val === undefined || val === '') return ''
    return String(val).trim()
  }).refine((val) => val.length > 0, { message: 'Bathrooms from is required' }),
  bathroomsTo: z.union([z.string(), z.number()]).transform((val) => {
    if (val === null || val === undefined || val === '') return ''
    return String(val).trim()
  }).refine((val) => val.length > 0, { message: 'Bathrooms to is required' }),
  sizeFrom: z.union([z.string(), z.number()]).transform((val) => {
    if (val === null || val === undefined || val === '') return ''
    return String(val).trim()
  }).refine((val) => val.length > 0, { message: 'Size from is required' }),
  sizeTo: z.union([z.string(), z.number()]).transform((val) => {
    if (val === null || val === undefined || val === '') return ''
    return String(val).trim()
  }).refine((val) => val.length > 0, { message: 'Size to is required' }),
  description: z.string().min(1, 'Description is required').max(400, 'Description cannot exceed 400 characters'),
  descriptionRu: z.string().optional(),
  facilityIds: z.array(z.string()).optional(),
  developerId: z.string().optional(),
  paymentPlan: z.string().optional(),
  isForYouChoice: z.boolean().optional(),
})

const secondarySchema = z.object({
  propertyType: z.literal(PropertyType.SECONDARY),
  name: z.string().min(1, 'Name is required'),
  photos: z.array(z.string()).min(1, 'At least one photo is required'),
  countryId: z.string().min(1, 'Country is required'),
  cityId: z.string().min(1, 'City is required'),
  areaId: z.string().min(1, 'Area is required'),
  latitude: z.union([z.string(), z.number()]).transform((val) => {
    if (val === null || val === undefined || val === '') return ''
    return String(val).trim()
  }).refine((val) => val.length > 0, { message: 'Latitude is required' }),
  longitude: z.union([z.string(), z.number()]).transform((val) => {
    if (val === null || val === undefined || val === '') return ''
    return String(val).trim()
  }).refine((val) => val.length > 0, { message: 'Longitude is required' }),
  price: z.union([z.string(), z.number()]).transform((val) => {
    if (val === null || val === undefined || val === '') return ''
    return String(val).trim()
  }).refine((val) => val.length > 0, { message: 'Price is required' }),
  bedrooms: z.union([z.string(), z.number()]).transform((val) => {
    if (val === null || val === undefined || val === '') return ''
    return String(val).trim()
  }).refine((val) => val.length > 0, { message: 'Bedrooms is required' }),
  bathrooms: z.union([z.string(), z.number()]).transform((val) => {
    if (val === null || val === undefined || val === '') return ''
    return String(val).trim()
  }).refine((val) => val.length > 0, { message: 'Bathrooms is required' }),
  size: z.union([z.string(), z.number()]).transform((val) => {
    if (val === null || val === undefined || val === '') return ''
    return String(val).trim()
  }).refine((val) => val.length > 0, { message: 'Size is required' }),
  description: z.string().optional(),
  descriptionRu: z.string().optional(),
  developerId: z.string().optional(),
  isForYouChoice: z.boolean().optional(),
})

const propertySchema = z.discriminatedUnion('propertyType', [offPlanSchema, secondarySchema])

type PropertyFormData = z.infer<typeof propertySchema>

interface Country {
  id: string
  nameEn: string
  nameRu: string
  nameAr: string
  cities?: City[]
}

interface City {
  id: string
  nameEn: string
  nameRu: string
  nameAr: string
  areas?: Area[]
}

interface Area {
  id: string
  nameEn: string
  nameRu: string
  nameAr: string
}

interface Developer {
  id: string
  name: string
}

interface Facility {
  id: string
  nameEn: string
  nameRu: string
  nameAr: string
  iconName: string
}

interface Unit {
  unitId: string
  type: UnitType
  planImage?: string
  totalSize: string
  balconySize?: string
  price: string
}

const usdToAed = (usd: number) => Math.round(usd * 3.67)
const usdToEur = (usd: number) => Math.round(usd * 0.92)
const sqmToSqft = (sqm: number) => sqm * 10.764

const formatNumber = (num: number) => {
  return Math.round(num).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  })
}

export default function EditPropertyPage() {
  const router = useRouter()
  const params = useParams()
  const propertyId = params?.id as string

  const getReturnUrl = () => {
    if (typeof window === 'undefined') return '/properties'
    try {
      const urlParams = new URLSearchParams(window.location.search)
      const returnParams = urlParams.get('return')
      if (returnParams) return `/properties?${returnParams}`
    } catch (e) {
      console.error('Error parsing return params:', e)
    }
    return '/properties'
  }

  const [loading, setLoading] = useState(false)
  const [loadingProperty, setLoadingProperty] = useState(true)
  const [propertyType, setPropertyType] = useState<PropertyType>(PropertyType.OFF_PLAN)
  const [countries, setCountries] = useState<Country[]>([])
  const [cities, setCities] = useState<City[]>([])
  const [areas, setAreas] = useState<Area[]>([])
  const [developers, setDevelopers] = useState<Developer[]>([])
  const [facilities, setFacilities] = useState<Facility[]>([])
  const [photos, setPhotos] = useState<string[]>([])
  const [showAllPhotos, setShowAllPhotos] = useState(false)
  const [units, setUnits] = useState<Unit[]>([])

  const [priceFromValue, setPriceFromValue] = useState<string>('')
  const [priceValue, setPriceValue] = useState<string>('')
  const [sizeFromValue, setSizeFromValue] = useState<string>('')
  const [sizeToValue, setSizeToValue] = useState<string>('')
  const [sizeValue, setSizeValue] = useState<string>('')

  const dragItem = useRef<number | null>(null)
  const dragOverItem = useRef<number | null>(null)

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, position: number) => {
    dragItem.current = position
  }

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, position: number) => {
    dragOverItem.current = position
  }

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    if (dragItem.current === null || dragOverItem.current === null) return
    const copyListItems = [...photos]
    const dragItemContent = copyListItems[dragItem.current]
    copyListItems.splice(dragItem.current, 1)
    copyListItems.splice(dragOverItem.current, 0, dragItemContent)
    dragItem.current = null
    dragOverItem.current = null
    setPhotos(copyListItems)
    setValue('photos', copyListItems, { shouldValidate: true })
  }

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
    control,
    trigger,
  } = useForm<PropertyFormData>({
    resolver: zodResolver(propertySchema),
    defaultValues: {
      propertyType: PropertyType.OFF_PLAN,
    },
  })

  useEffect(() => {
    loadInitialData()
    if (propertyId) loadProperty()
  }, [propertyId])

  const loadInitialData = async () => {
    try {
      const [countriesRes, developersRes, facilitiesRes] = await Promise.all([
        api.get('/settings/countries').catch(() => ({ data: { data: [] } })),
        api.get('/settings/developers').catch(() => ({ data: { data: [] } })),
        api.get('/settings/facilities').catch(() => ({ data: { data: [] } })),
      ])

      setCountries(countriesRes.data.data || [])
      setDevelopers(developersRes.data.data || [])
      setFacilities(facilitiesRes.data.data || [])
    } catch (error) {
      console.error('Error loading initial data:', error)
    }
  }

  const loadProperty = async () => {
    setLoadingProperty(true)
    try {
      const { data } = await api.get(`/properties/${propertyId}`)
      const property = data.data

      setPropertyType(property.propertyType)

      if (property.countryId) {
        const { data: citiesData } = await api.get(`/settings/cities?countryId=${property.countryId}`)
        setCities(citiesData.data || [])
        if (property.cityId) {
          const { data: areasData } = await api.get(`/settings/areas?cityId=${property.cityId}`)
          setAreas(areasData.data || [])
        }
      }

      const formValues: any = {
        propertyType: property.propertyType,
        name: property.name || '',
        photos: property.photos || [],
        countryId: property.countryId || '',
        cityId: property.cityId || '',
        areaId: property.areaId || '',
        latitude: String(property.latitude || ''),
        longitude: String(property.longitude || ''),
        description: property.description || '',
        descriptionRu: property.descriptionRu || '',
        developerId: property.developerId || '',
        paymentPlan: property.paymentPlan || '',
        isForYouChoice: property.isForYouChoice || false,
      }

      if (property.propertyType === PropertyType.OFF_PLAN) {
        formValues.priceFrom = String(property.priceFrom || '')
        formValues.bedroomsFrom = String(property.bedroomsFrom || '')
        formValues.bedroomsTo = String(property.bedroomsTo || '')
        formValues.bathroomsFrom = String(property.bathroomsFrom || '')
        formValues.bathroomsTo = String(property.bathroomsTo || '')
        formValues.sizeFrom = String(property.sizeFrom || '')
        formValues.sizeTo = String(property.sizeTo || '')
        formValues.facilityIds = property.facilities?.map((f: Facility) => f.id) || []
      } else {
        formValues.price = String(property.price || '')
        formValues.bedrooms = String(property.bedrooms || '')
        formValues.bathrooms = String(property.bathrooms || '')
        formValues.size = String(property.size || '')
      }

      reset(formValues)
      setPhotos(property.photos || [])

      if (property.priceFrom) setPriceFromValue(String(property.priceFrom))
      if (property.price) setPriceValue(String(property.price))
      if (property.sizeFrom) setSizeFromValue(String(property.sizeFrom))
      if (property.sizeTo) setSizeToValue(String(property.sizeTo))
      if (property.size) setSizeValue(String(property.size))

      if (property.propertyType === PropertyType.OFF_PLAN && property.units) {
        setUnits(property.units.map((unit: any) => ({
          unitId: unit.unitId || '',
          type: unit.type || UnitType.APARTMENT,
          planImage: unit.planImage || '',
          totalSize: String(unit.totalSize || ''),
          balconySize: String(unit.balconySize || ''),
          price: String(unit.price || ''),
        })))
      }
    } catch (error) {
      console.error('Error loading property:', error)
      alert('Failed to load property.')
      router.push(getReturnUrl())
    } finally {
      setLoadingProperty(false)
    }
  }

  const handleCountryChange = async (countryId: string) => {
    setValue('countryId', countryId)
    setValue('cityId', '')
    setValue('areaId', '')
    setCities([])
    setAreas([])
    if (countryId) {
      const { data } = await api.get(`/settings/cities?countryId=${countryId}`)
      setCities(data.data || [])
    }
  }

  const handleCityChange = async (cityId: string) => {
    setValue('cityId', cityId)
    setValue('areaId', '')
    setAreas([])
    if (cityId) {
      const { data } = await api.get(`/settings/areas?cityId=${cityId}`)
      setAreas(data.data || [])
    }
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    try {
      const formData = new FormData()
      Array.from(files).forEach(file => formData.append('files', file))
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const { data } = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/upload/images`, formData, {
        headers: { 'Content-Type': 'multipart/form-data', ...(token && { Authorization: `Bearer ${token}` }) },
      })
      const newPhotos = data?.data?.urls || data?.urls || []
      const updatedPhotos = [...photos, ...newPhotos]
      setPhotos(updatedPhotos)
      setValue('photos', updatedPhotos, { shouldValidate: true })
      e.target.value = ''
    } catch (error) {
      console.error('Error uploading photos:', error)
    }
  }

  const removePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index)
    setPhotos(newPhotos)
    setValue('photos', newPhotos, { shouldValidate: true })
  }

  const addUnit = () => setUnits([...units, { unitId: '', type: UnitType.APARTMENT, totalSize: '', price: '' }])
  const removeUnit = (index: number) => setUnits(units.filter((_, i) => i !== index))
  const updateUnit = (index: number, field: keyof Unit, value: string) => {
    const newUnits = [...units]
    newUnits[index] = { ...newUnits[index], [field]: value }
    setUnits(newUnits)
  }

  const handleUnitImageUpload = async (index: number, file: File) => {
    try {
      const formData = new FormData()
      formData.append('file', file)
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const { data } = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/upload/image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data', ...(token && { Authorization: `Bearer ${token}` }) },
      })
      updateUnit(index, 'planImage', data?.data?.url || data?.url || '')
    } catch (error) {
      console.error('Error uploading unit image:', error)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure?')) return
    setLoading(true)
    try {
      await api.delete(`/properties/${propertyId}`)
      alert('Deleted!')
      router.push(getReturnUrl())
    } catch (error) {
      console.error('Error deleting:', error)
      setLoading(false)
    }
  }

  const onSubmit = async (data: PropertyFormData) => {
    setLoading(true)
    try {
      const payload: any = {
        propertyType: data.propertyType,
        name: data.name,
        photos,
        countryId: data.countryId,
        cityId: data.cityId,
        areaId: data.areaId,
        latitude: parseFloat(String(data.latitude)),
        longitude: parseFloat(String(data.longitude)),
        developerId: data.developerId || undefined,
        isForYouChoice: data.isForYouChoice || false,
        description: data.description,
        descriptionRu: data.descriptionRu,
      }

      if (data.propertyType === PropertyType.OFF_PLAN) {
        payload.priceFrom = parseFloat(String(data.priceFrom))
        payload.bedroomsFrom = parseInt(String(data.bedroomsFrom), 10)
        payload.bedroomsTo = parseInt(String(data.bedroomsTo), 10)
        payload.bathroomsFrom = parseInt(String(data.bathroomsFrom), 10)
        payload.bathroomsTo = parseInt(String(data.bathroomsTo), 10)
        payload.sizeFrom = parseFloat(String(data.sizeFrom))
        payload.sizeTo = parseFloat(String(data.sizeTo))
        payload.paymentPlan = data.paymentPlan || undefined
        payload.facilityIds = data.facilityIds || []
        if (units.length > 0) {
          payload.units = units.map(unit => ({
            unitId: unit.unitId,
            type: unit.type,
            planImage: unit.planImage || undefined,
            totalSize: parseFloat(unit.totalSize),
            balconySize: unit.balconySize ? parseFloat(unit.balconySize) : undefined,
            price: parseFloat(unit.price),
          }))
        }
      } else {
        payload.price = parseFloat(String(data.price))
        payload.bedrooms = parseInt(String(data.bedrooms), 10)
        payload.bathrooms = parseInt(String(data.bathrooms), 10)
        payload.size = parseFloat(String(data.size))
      }

      await api.patch(`/properties/${propertyId}`, payload)
      alert('Updated!')
      router.push(getReturnUrl())
    } catch (error) {
      console.error('Error updating:', error)
      alert('Failed to update.')
    } finally {
      setLoading(false)
    }
  }

  if (loadingProperty) return <div className="flex items-center justify-center min-h-screen">Loading...</div>

  const selectedCountryId = watch('countryId')
  const selectedCityId = watch('cityId')
  const selectedFacilities = watch('facilityIds') || []

  const unitTypeOptions = [
    { value: UnitType.APARTMENT, label: 'Apartment' },
    { value: UnitType.VILLA, label: 'Villa' },
    { value: UnitType.PENTHOUSE, label: 'Penthouse' },
    { value: UnitType.TOWNHOUSE, label: 'Townhouse' },
    { value: UnitType.OFFICE, label: 'Office' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white">Edit Property</h1>
        <Button variant="outline" onClick={() => router.push(getReturnUrl())}>Cancel</Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" {...register('name')} error={!!errors.name} />
              {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
            </div>

            <div className="md:col-span-2">
              <Checkbox
                id="isForYouChoice"
                checked={watch('isForYouChoice') || false}
                onChange={(checked) => setValue('isForYouChoice', checked)}
                label="Special from ForYou"
              />
            </div>

            <div>
              <Label>Country *</Label>
              <Select
                options={countries.map(c => ({ value: c.id, label: c.nameEn }))}
                defaultValue={selectedCountryId}
                onChange={handleCountryChange}
              />
            </div>

            <div>
              <Label>City *</Label>
              <Select
                options={cities.map(c => ({ value: c.id, label: c.nameEn }))}
                defaultValue={selectedCityId}
                onChange={handleCityChange}
              />
            </div>

            <div>
              <Label>Area *</Label>
              <Select
                options={areas.map(a => ({ value: a.id, label: a.nameEn }))}
                defaultValue={watch('areaId')}
                onChange={v => setValue('areaId', v)}
              />
            </div>

            <div>
              <Label>Latitude *</Label>
              <Input type="number" step="any" {...register('latitude')} />
            </div>

            <div>
              <Label>Longitude *</Label>
              <Input type="number" step="any" {...register('longitude')} />
            </div>
          </div>

          {/* Photos */}
          <div className="space-y-4">
            <Label>Photos *</Label>
            <input type="file" multiple onChange={handlePhotoUpload} />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {photos.map((p, i) => (
                <div
                  key={i}
                  className="relative group aspect-video cursor-move"
                  draggable
                  onDragStart={(e) => handleDragStart(e, i)}
                  onDragEnter={(e) => handleDragEnter(e, i)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => e.preventDefault()}
                >
                  <img src={p} className="w-full h-full object-cover rounded-lg pointer-events-none" />
                  <button type="button" onClick={() => removePhoto(i)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 z-10 transition-opacity">×</button>
                  <div className="absolute top-1 left-1 bg-black/50 text-white text-xs px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                    {i + 1}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Off-Plan */}
          {propertyType === PropertyType.OFF_PLAN && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold border-t pt-6">Off-Plan Details</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                <div>
                  <Label>Price From (USD) *</Label>
                  <Input type="number" {...register('priceFrom')} onChange={e => { setPriceFromValue(e.target.value); setValue('priceFrom', e.target.value) }} />
                  {priceFromValue && <p className="text-xs text-gray-500">≈ {formatNumber(usdToAed(parseFloat(priceFromValue)))} AED</p>}
                </div>
                <div>
                  <Label>Developer</Label>
                  <SearchableSelect options={developers.map(d => ({ value: d.id, label: d.name }))} defaultValue={watch('developerId')} onChange={v => setValue('developerId', v)} />
                </div>
                <div><Label>Bedrooms From</Label><Input type="number" {...register('bedroomsFrom')} /></div>
                <div><Label>Bedrooms To</Label><Input type="number" {...register('bedroomsTo')} /></div>
                <div><Label>Bathrooms From</Label><Input type="number" {...register('bathroomsFrom')} /></div>
                <div><Label>Bathrooms To</Label><Input type="number" {...register('bathroomsTo')} /></div>
                <div><Label>Size From (sqm)</Label><Input type="number" {...register('sizeFrom')} /></div>
                <div><Label>Size To (sqm)</Label><Input type="number" {...register('sizeTo')} /></div>
              </div>

              {/* Facilities */}
              <div className="space-y-4">
                <Label>Facilities</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {facilities.map(f => (
                    <Checkbox
                      key={f.id}
                      id={f.id}
                      label={f.nameEn}
                      checked={selectedFacilities.includes(f.id)}
                      onChange={checked => {
                        const next = checked ? [...selectedFacilities, f.id] : selectedFacilities.filter(id => id !== f.id)
                        setValue('facilityIds', next)
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Units */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label>Units</Label>
                  <Button type="button" size="sm" onClick={addUnit}>Add Unit</Button>
                </div>
                {units.map((u, i) => (
                  <div key={i} className="border p-4 rounded-lg grid grid-cols-2 gap-4">
                    <Input placeholder="Unit ID" value={u.unitId} onChange={e => updateUnit(i, 'unitId', e.target.value)} />
                    <Select options={unitTypeOptions} defaultValue={u.type} onChange={v => updateUnit(i, 'type', v as UnitType)} />
                    <Input type="number" placeholder="Size" value={u.totalSize} onChange={e => updateUnit(i, 'totalSize', e.target.value)} />
                    <Input type="number" placeholder="Price" value={u.price} onChange={e => updateUnit(i, 'price', e.target.value)} />
                    <Button type="button" variant="outline" size="sm" onClick={() => removeUnit(i)}>Remove</Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Secondary */}
          {propertyType === PropertyType.SECONDARY && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold border-t pt-6">Secondary Details</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                <div>
                  <Label>Price (USD) *</Label>
                  <Input type="number" {...register('price')} onChange={e => { setPriceValue(e.target.value); setValue('price', e.target.value) }} />
                  {priceValue && <p className="text-xs text-gray-500">≈ {formatNumber(usdToAed(parseFloat(priceValue)))} AED</p>}
                </div>
                <div>
                  <Label>Developer</Label>
                  <SearchableSelect options={developers.map(d => ({ value: d.id, label: d.name }))} defaultValue={watch('developerId')} onChange={v => setValue('developerId', v)} />
                </div>
                <div><Label>Bedrooms</Label><Input type="number" {...register('bedrooms')} /></div>
                <div><Label>Bathrooms</Label><Input type="number" {...register('bathrooms')} /></div>
                <div><Label>Size (sqm)</Label><Input type="number" {...register('size')} /></div>
              </div>
            </div>
          )}

          {/* COMMON DESCRIPTION */}
          <div className="space-y-6 pt-6 border-t">
            <h2 className="text-lg font-semibold">Description</h2>
            <div className="space-y-4">
              <div>
                <Label>Description (EN) *</Label>
                <TextArea rows={5} value={watch('description')} onChange={v => setValue('description', v)} />
                {errors.description && <p className="text-sm text-red-500">{errors.description.message}</p>}
              </div>
              <div>
                <Label>Description (RU)</Label>
                <TextArea rows={5} value={watch('descriptionRu')} onChange={v => setValue('descriptionRu', v)} />
              </div>
              {propertyType === PropertyType.OFF_PLAN && (
                <div>
                  <Label>Payment Plan</Label>
                  <TextArea value={watch('paymentPlan')} onChange={v => setValue('paymentPlan', v)} />
                </div>
              )}
            </div>
          </div>

          <input type="hidden" {...register('propertyType')} />
        </div>

        <div className="flex justify-between items-center">
          <Button type="button" variant="outline" onClick={handleDelete} className="text-red-600 border-red-200 hover:bg-red-50">Delete Property</Button>
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => router.push(getReturnUrl())}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Update Property'}</Button>
          </div>
        </div>
      </form>
    </div>
  )
}
