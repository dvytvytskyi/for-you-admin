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
import { ChevronDown, ChevronUp, Trash2, Camera, Plus, GripVertical, Star, Maximize2, X } from 'lucide-react'

// Property Type enum
enum PropertyType {
  NEW_LAUNCHES = 'new-launches',
  OFF_PLAN = 'off-plan',
  SECONDARY = 'secondary',
  RENT = 'rent',
  EXCLUSIVE_FOR_YOU = 'exclusive-for-you',
  COMMERCIAL = 'commercial',
}

// Unit Type enum
enum UnitType {
  APARTMENT = 'apartment',
  VILLA = 'villa',
  PENTHOUSE = 'penthouse',
  TOWNHOUSE = 'townhouse',
  OFFICE = 'office',
}

// Payment Plan interfaces
interface PaymentStep {
  Payment_time: string
  Percent_of_payment: string
  Order?: number
}

interface PaymentPlan {
  Plan_name: string
  Payments: PaymentStep[]
  months_after_handover: number
}

// Validation schemas
const rangeBasedSchema = z.object({
  propertyType: z.enum([PropertyType.OFF_PLAN, PropertyType.NEW_LAUNCHES, PropertyType.EXCLUSIVE_FOR_YOU]),
  name: z.string().min(1, 'Name is required'),
  photos: z.array(z.string()).min(1, 'At least one photo is required'),
  countryId: z.string().min(1, 'Country is required'),
  cityId: z.string().min(1, 'City is required'),
  areaId: z.string().min(1, 'Area is required'),
  latitude: z.union([z.string(), z.number()]).transform(v => String(v || '').trim()).refine(v => v.length > 0, { message: 'Latitude is required' }),
  longitude: z.union([z.string(), z.number()]).transform(v => String(v || '').trim()).refine(v => v.length > 0, { message: 'Longitude is required' }),
  priceFrom: z.union([z.string(), z.number()]).transform(v => String(v || '').trim()).refine(v => v.length > 0, { message: 'Price from is required' }),
  bedroomsFrom: z.union([z.string(), z.number()]).transform(v => String(v || '').trim()).refine(v => v.length > 0, { message: 'Bedrooms from is required' }),
  bedroomsTo: z.union([z.string(), z.number()]).transform(v => String(v || '').trim()).refine(v => v.length > 0, { message: 'Bedrooms to is required' }),
  bathroomsFrom: z.union([z.string(), z.number()]).transform(v => String(v || '').trim()).refine(v => v.length > 0, { message: 'Bathrooms from is required' }),
  bathroomsTo: z.union([z.string(), z.number()]).transform(v => String(v || '').trim()).refine(v => v.length > 0, { message: 'Bathrooms to is required' }),
  sizeFrom: z.union([z.string(), z.number()]).transform(v => String(v || '').trim()).refine(v => v.length > 0, { message: 'Size from is required' }),
  sizeTo: z.union([z.string(), z.number()]).transform(v => String(v || '').trim()).refine(v => v.length > 0, { message: 'Size to is required' }),
  description: z.string().min(1, 'Description is required').max(410, 'Description is too long'),
  descriptionRu: z.string().optional(),
  facilityIds: z.array(z.string()).optional(),
  developerId: z.string().optional(),
  paymentPlan: z.string().optional(),
  isForYouChoice: z.boolean().optional(),
  status: z.string().optional(),
  saleStatus: z.string().optional(),
  readiness: z.string().optional(),
  serviceCharge: z.string().optional(),
  completionDatetime: z.string().optional(),
  layoutsPdf: z.string().optional(),
  brochureUrl: z.string().optional(),
  depositDescription: z.string().optional(),
  videoUrl: z.string().optional(),
  paymentPlansJson: z.string().optional(),
  masterPlan: z.string().optional(),
  lobby: z.string().optional(),
  interior: z.string().optional(),
  architecture: z.string().optional(),
  mapPoints: z.string().optional(),
  unitTypesJson: z.string().optional(),
  views: z.string().optional(),
  minPrice: z.string().optional(),
  maxPrice: z.string().optional(),
  minPriceAed: z.string().optional(),
  maxPriceAed: z.string().optional(),
  type: z.string().optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
})

const fixedBasedSchema = z.object({
  propertyType: z.enum([PropertyType.SECONDARY, PropertyType.RENT, PropertyType.COMMERCIAL]),
  name: z.string().min(1, 'Name is required'),
  photos: z.array(z.string()).min(1, 'At least one photo is required'),
  countryId: z.string().min(1, 'Country is required'),
  cityId: z.string().min(1, 'City is required'),
  areaId: z.string().min(1, 'Area is required'),
  latitude: z.union([z.string(), z.number()]).transform(v => String(v || '').trim()).refine(v => v.length > 0, { message: 'Latitude is required' }),
  longitude: z.union([z.string(), z.number()]).transform(v => String(v || '').trim()).refine(v => v.length > 0, { message: 'Longitude is required' }),
  price: z.union([z.string(), z.number()]).transform(v => String(v || '').trim()).refine(v => v.length > 0, { message: 'Price is required' }),
  bedrooms: z.union([z.string(), z.number()]).transform(v => String(v || '').trim()).refine(v => v.length > 0, { message: 'Bedrooms is required' }),
  bathrooms: z.union([z.string(), z.number()]).transform(v => String(v || '').trim()).refine(v => v.length > 0, { message: 'Bathrooms is required' }),
  size: z.union([z.string(), z.number()]).transform(v => String(v || '').trim()).refine(v => v.length > 0, { message: 'Size is required' }),
  description: z.string().optional(),
  descriptionRu: z.string().optional(),
  developerId: z.string().optional(),
  isForYouChoice: z.boolean().optional(),
  externalId: z.string().optional(),
  propertyUrl: z.string().optional(),
  buildingName: z.string().optional(),
  communityName: z.string().optional(),
  displayAddress: z.string().optional(),
  addedOn: z.string().optional(),
  verified: z.boolean().optional(),
  reference: z.string().optional(),
  rera: z.string().optional(),
  furnishing: z.string().optional(),
  agentName: z.string().optional(),
  agentPhone: z.string().optional(),
  agentWhatsapp: z.string().optional(),
  agentEmail: z.string().optional(),
  brokerName: z.string().optional(),
  priceDuration: z.string().optional(),
  propertySubType: z.string().optional(),
  priceCurrency: z.string().optional(),
  type: z.string().optional(),
  sizeMin: z.string().optional(),
  status: z.string().optional(),
  saleStatus: z.string().optional(),
  readiness: z.string().optional(),
  serviceCharge: z.string().optional(),
  completionDatetime: z.string().optional(),
  layoutsPdf: z.string().optional(),
  brochureUrl: z.string().optional(),
  depositDescription: z.string().optional(),
  videoUrl: z.string().optional(),
  paymentPlansJson: z.string().optional(),
  masterPlan: z.string().optional(),
  lobby: z.string().optional(),
  interior: z.string().optional(),
  architecture: z.string().optional(),
  mapPoints: z.string().optional(),
  views: z.string().optional(),
  minPrice: z.string().optional(),
  maxPrice: z.string().optional(),
  minPriceAed: z.string().optional(),
  maxPriceAed: z.string().optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
})

const propertySchema = z.discriminatedUnion('propertyType', [rangeBasedSchema, fixedBasedSchema])

type PropertyFormData = z.infer<typeof propertySchema>

interface Country { id: string; nameEn: string }
interface City { id: string; nameEn: string }
interface Area { id: string; nameEn: string }
interface Developer { id: string; name: string }
interface Facility { id: string; nameEn: string }

interface Unit {
  id?: string
  unitId: string
  type: UnitType
  planImage?: string
  totalSize: string
  price: string
  bedrooms?: string
  floor?: string
  status?: string
}

const formatPrice = (val: string | number | null | undefined): string => {
  if (val === null || val === undefined || val === '') return '';
  const num = typeof val === 'string' ? parseFloat(val.replace(/,/g, '')) : val;
  if (isNaN(num)) return val.toString();
  return Math.round(num).toLocaleString('en-US');
}

const deformatPrice = (val: string): string => val.replace(/,/g, '').split('.')[0];

export default function EditPropertyPage() {
  const router = useRouter()
  const params = useParams()
  const propertyId = params?.id as string

  const isRangeBased = (type: PropertyType) =>
    [PropertyType.OFF_PLAN, PropertyType.NEW_LAUNCHES, PropertyType.EXCLUSIVE_FOR_YOU].includes(type)

  const [loading, setLoading] = useState(false)
  const [loadingProperty, setLoadingProperty] = useState(true)
  const [propertyType, setPropertyType] = useState<PropertyType>(PropertyType.OFF_PLAN)
  const [countries, setCountries] = useState<Country[]>([])
  const [cities, setCities] = useState<City[]>([])
  const [areas, setAreas] = useState<Area[]>([])
  const [developers, setDevelopers] = useState<Developer[]>([])
  const [facilities, setFacilities] = useState<Facility[]>([])
  const [photos, setPhotos] = useState<string[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [paymentPlans, setPaymentPlans] = useState<PaymentPlan[]>([])
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})
  const [isGalleryOpen, setIsGalleryOpen] = useState(false)

  const [priceFromValue, setPriceFromValue] = useState<string>('')
  const [priceValue, setPriceValue] = useState<string>('')

  // Drag and drop refs
  const dragItem = useRef<number | null>(null)
  const dragOverItem = useRef<number | null>(null)

  const { register, handleSubmit, formState: { errors }, setValue, watch, reset, control } = useForm<PropertyFormData>({
    resolver: zodResolver(propertySchema),
    defaultValues: { propertyType: PropertyType.OFF_PLAN },
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
    } catch (e) { console.error(e) }
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
        isForYouChoice: property.isForYouChoice || false,
        status: property.status || '',
        saleStatus: property.saleStatus || '',
        readiness: property.readiness || '',
        completionDatetime: property.completionDatetime || '',
        type: property.type || '',
        views: Array.isArray(property.views) ? property.views.join(', ') : '',
        minPriceAed: String(property.minPriceAed || ''),
        maxPriceAed: String(property.maxPriceAed || ''),
        minPrice: String(property.minPrice || ''),
        maxPrice: String(property.maxPrice || ''),
        seoTitle: property.seoTitle || '',
        seoDescription: property.seoDescription || '',
      }

      if (isRangeBased(property.propertyType)) {
        formValues.priceFrom = String(property.priceFrom || '')
        setPriceFromValue(String(property.priceFrom || ''))
        formValues.bedroomsFrom = String(property.bedroomsFrom || '')
        formValues.bedroomsTo = String(property.bedroomsTo || '')
        formValues.bathroomsFrom = String(property.bathroomsFrom || '')
        formValues.bathroomsTo = String(property.bathroomsTo || '')
        formValues.sizeFrom = String(property.sizeFrom || '')
        formValues.sizeTo = String(property.sizeTo || '')
        formValues.facilityIds = property.facilities?.map((f: any) => f.id) || []
        
        if (property.paymentPlansJson) {
          const normalizedPlans = Array.isArray(property.paymentPlansJson) ? property.paymentPlansJson.map((p: any) => ({
            Plan_name: p.Plan_name || 'Payment Plan',
            months_after_handover: p.months_after_handover || 0,
            Payments: Array.isArray(p.Payments) ? p.Payments.flat() : []
          })) : [];
          setPaymentPlans(normalizedPlans);
        }
      } else {
        const aedPrice = (property.price || 0) * 3.67;
        formValues.price = String(Math.round(aedPrice))
        setPriceValue(formatPrice(Math.round(aedPrice)))
        formValues.bedrooms = String(property.bedrooms || '')
        formValues.bathrooms = String(property.bathrooms || '')
        const sqftSize = (property.size || 0) * 10.764;
        formValues.size = String(Math.round(sqftSize))
        formValues.facilityIds = property.facilities?.map((f: any) => f.id) || []
        formValues.rera = property.rera || ''
        formValues.furnishing = property.furnishing || ''
        formValues.externalId = property.externalId || ''
        formValues.propertyUrl = property.propertyUrl || ''
      }

      reset(formValues)
      setPhotos(property.photos || [])
      
      if (property.units) {
        const u = property.units.map((unit: any) => ({
          id: unit.id, unitId: unit.unitId || '', type: unit.type || UnitType.APARTMENT,
          planImage: unit.planImage || '', totalSize: String(unit.totalSize || ''),
          price: formatPrice(unit.price), bedrooms: String(unit.bedrooms || '0'),
          floor: String(unit.floor || ''), status: unit.status || 'available'
        }))
        setUnits(u)
        
        const initialExpanded: Record<string, boolean> = {}
        u.forEach((unit: any) => { initialExpanded[String(unit.bedrooms || '0')] = true })
        setExpandedGroups(initialExpanded)
      }
    } catch (e) {
      console.error(e);
      alert('Failed to load property');
      router.push('/properties');
    } finally {
      setLoadingProperty(false)
    }
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return
    const formData = new FormData()
    Array.from(e.target.files).forEach(f => formData.append('files', f))
    const { data } = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/upload/images`, formData, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    const newPhotos = [...photos, ...(data.urls || [])]
    setPhotos(newPhotos); setValue('photos', newPhotos);
  }

  const handleDragStart = (e: React.DragEvent, idx: number) => { dragItem.current = idx }
  const handleDragEnter = (e: React.DragEvent, idx: number) => { dragOverItem.current = idx }
  const handleDragEnd = () => {
    if (dragItem.current === null || dragOverItem.current === null) return
    const next = [...photos]
    const item = next.splice(dragItem.current, 1)[0]
    next.splice(dragOverItem.current, 0, item)
    dragItem.current = null
    dragOverItem.current = null
    setPhotos(next)
    setValue('photos', next)
  }

  const makeMain = (idx: number) => {
    const next = [...photos];
    const item = next.splice(idx, 1)[0];
    next.unshift(item);
    setPhotos(next);
    setValue('photos', next);
  }

  const addUnit = () => setUnits([{ unitId: '', type: UnitType.APARTMENT, totalSize: '', price: '', bedrooms: '0', floor: '' }, ...units])
  const updateUnit = (idx: number, field: keyof Unit, val: string) => {
    const next = [...units]; 
    if (field === 'price') (next[idx] as any)[field] = formatPrice(val);
    else (next[idx] as any)[field] = val;
    setUnits(next);
  }

  const addPaymentPlan = () => setPaymentPlans([...paymentPlans, { Plan_name: 'New Plan', Payments: [], months_after_handover: 0 }])
  const removePaymentPlan = (idx: number) => setPaymentPlans(paymentPlans.filter((_: any, i: number) => i !== idx))
  const addPaymentStep = (pIdx: number) => {
    const next = [...paymentPlans];
    next[pIdx].Payments.push({ Payment_time: '', Percent_of_payment: '0' });
    setPaymentPlans(next);
  }
  const removePaymentStep = (pIdx: number, sIdx: number) => {
    const next = [...paymentPlans];
    next[pIdx].Payments.splice(sIdx, 1);
    setPaymentPlans(next);
  }
  const updatePaymentPlan = (idx: number, field: string, val: any) => {
    const next = [...paymentPlans]; (next[idx] as any)[field] = val; setPaymentPlans(next);
  }
  const updatePaymentStep = (pIdx: number, sIdx: number, field: string, val: any) => {
    const next = [...paymentPlans]; (next[pIdx].Payments[sIdx] as any)[field] = val; setPaymentPlans(next);
  }

  const onSubmit = async (data: PropertyFormData) => {
    setLoading(true)
    try {
      const payload: any = { ...data, photos }
      payload.latitude = parseFloat(data.latitude)
      payload.longitude = parseFloat(data.longitude)

      // Handle Reelly-specific fields
      if (data.views) {
        payload.views = data.views.split(',').map(v => v.trim()).filter(v => v.length > 0)
      }
      if (data.minPrice) payload.minPrice = parseFloat(data.minPrice)
      if (data.maxPrice) payload.maxPrice = parseFloat(data.maxPrice)
      if (data.minPriceAed) payload.minPriceAed = parseFloat(data.minPriceAed)
      if (data.maxPriceAed) payload.maxPriceAed = parseFloat(data.maxPriceAed)

      if (isRangeBased(data.propertyType)) {
        const d = data as any
        payload.priceFrom = parseFloat(d.priceFrom)
        payload.bedroomsFrom = parseInt(d.bedroomsFrom)
        payload.bedroomsTo = parseInt(d.bedroomsTo)
        payload.sizeFrom = parseFloat(d.sizeFrom)
        payload.sizeTo = parseFloat(d.sizeTo)
        payload.bathroomsFrom = parseInt(d.bathroomsFrom)
        payload.bathroomsTo = parseInt(d.bathroomsTo)
        payload.units = units.map((u: any) => ({
          unitId: u.unitId, type: u.type, planImage: u.planImage,
          totalSize: parseFloat(u.totalSize), price: parseFloat(deformatPrice(u.price)),
          bedrooms: parseFloat(u.bedrooms || '0'), floor: parseInt(u.floor || '0')
        }))
        payload.paymentPlansJson = paymentPlans.map((p: any) => ({
          ...p,
          Payments: p.Payments.map((step: any) => [step])
        }))
        payload.seoTitle = data.seoTitle || null;
        payload.seoDescription = data.seoDescription || null;
      } else {
        const d = data as any
        payload.price = parseFloat(deformatPrice(priceValue)) / 3.67; // Convert back to USD for DB
        payload.bedrooms = parseInt(d.bedrooms); 
        payload.bathrooms = parseInt(d.bathrooms); 
        payload.size = parseFloat(d.size) / 10.764; // Convert back to SQM for DB
      }

      await api.patch(`/properties/${propertyId}`, payload)
      alert('Saved success!'); router.push('/properties')
    } catch (e: any) { alert(e.response?.data?.message || e.message) } finally { setLoading(false) }
  }

  if (loadingProperty) return <div className="flex items-center justify-center min-h-screen">Loading...</div>

  const groupedUnits = units.reduce((acc: any, unit: any) => {
    const key = String(unit.bedrooms || '0');
    if (!acc[key]) acc[key] = { 
      name: key === '0' ? 'Studio' : (key === '0.5' ? '1.5 BR' : `${key} Bedroom`), 
      items: [], 
      minPrice: Infinity, maxPrice: -Infinity, 
      minSize: Infinity, maxSize: -Infinity 
    };
    const group = acc[key]; group.items.push(unit);
    const p = parseFloat(deformatPrice(unit.price)) || 0; 
    const s = parseFloat(unit.totalSize) || 0;
    if (p > 0) { if (p < group.minPrice) group.minPrice = p; if (p > group.maxPrice) group.maxPrice = p; }
    if (s > 0) { if (s < group.minSize) group.minSize = s; if (s > group.maxSize) group.maxSize = s; }
    return acc;
  }, {} as any);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20 relative">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Units & Availability</h1>
        <div className="flex gap-3">
          <Button variant="outline" size="sm" onClick={() => router.push('/properties')}>Back</Button>
          <Button size="sm" onClick={handleSubmit(onSubmit)} disabled={loading}>{loading ? 'Saving...' : 'Save All Changes'}</Button>
        </div>
      </div>

      <form className="space-y-8 relative">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Info Card */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-800 space-y-6">
              <h2 className="text-lg font-semibold flex items-center gap-2"><div className="w-1 h-5 bg-brand-500 rounded-full"></div> General Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2"><Label>Project Name *</Label><Input {...register('name')} /></div>
                <div><Label>Country</Label><Select options={countries.map((c: any) => ({ value: c.id, label: c.nameEn }))} defaultValue={watch('countryId')} onChange={(v: string) => setValue('countryId', v)} /></div>
                <div><Label>City</Label><Select options={cities.map((c: any) => ({ value: c.id, label: c.nameEn }))} defaultValue={watch('cityId')} onChange={(v: string) => { setValue('cityId', v); api.get(`/settings/cities?countryId=${watch('countryId')}`).then(() => api.get(`/settings/areas?cityId=${v}`).then((r: any) => setAreas(r.data.data))) }} /></div>
                <div><Label>Area</Label><Select options={areas.map((a: any) => ({ value: a.id, label: a.nameEn }))} defaultValue={watch('areaId')} onChange={(v: string) => setValue('areaId', v)} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Lat</Label><Input type="number" step="any" {...register('latitude')} /></div>
                  <div><Label>Lon</Label><Input type="number" step="any" {...register('longitude')} /></div>
                </div>
              </div>
            </div>

            {/* Secondary Specific Info */}
            {!isRangeBased(propertyType) && (
              <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-800 space-y-6">
                <h2 className="text-lg font-semibold flex items-center gap-2"><div className="w-1 h-5 bg-orange-500 rounded-full"></div> Sales Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label>Price (AED)</Label>
                    <Input 
                      value={priceValue} 
                      onChange={(e: any) => {
                        const v = e.target.value;
                        const deformatted = deformatPrice(v);
                        setPriceValue(formatPrice(deformatted));
                        setValue('price', deformatted);
                      }} 
                    />
                    <div className="text-[10px] font-semibold text-gray-400 mt-1 pl-1">
                      ≈ ${formatPrice(Math.round(parseFloat(deformatPrice(priceValue)) / 3.67))} USD
                    </div>
                  </div>
                  <div>
                    <Label>Size (sqft)</Label>
                    <Input type="number" {...register('size')} />
                    <div className="text-[10px] font-semibold text-gray-400 mt-1 pl-1">
                      ≈ {(parseFloat(watch('size' as any)) / 10.764).toFixed(2)} sqm
                    </div>
                  </div>
                  <div><Label>Bedrooms</Label><Input type="number" {...register('bedrooms')} /></div>
                  <div><Label>Bathrooms</Label><Input type="number" {...register('bathrooms')} /></div>
                  <div><Label>RERA Number</Label><Input {...register('rera')} /></div>
                  <div>
                    <Label>Furnishing</Label>
                    <Select 
                      options={[
                        { value: 'YES', label: 'Furnished' },
                        { value: 'NO', label: 'Unfurnished' },
                        { value: 'PARTLY', label: 'Partly Furnished' }
                      ]} 
                      defaultValue={watch('furnishing')} 
                      onChange={(v: string) => setValue('furnishing', v)} 
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Units Categories */}
            {isRangeBased(propertyType) && (
              <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-800 space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold flex items-center gap-2"><div className="w-1 h-5 bg-blue-500 rounded-full"></div> Units & Categories</h2>
                  <Button type="button" size="sm" variant="outline" onClick={addUnit} className="rounded-full shadow-sm">Add Unit</Button>
                </div>
                <div className="space-y-4">
                  {Object.keys(groupedUnits).sort((a: string, b: string) => parseFloat(a) - parseFloat(b)).map((br: string) => {
                    const group = groupedUnits[br];
                    return (
                      <div key={br} className="border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden bg-gray-50/30 dark:bg-black/10">
                         <div className="flex items-center justify-between p-5 cursor-pointer hover:bg-white dark:hover:bg-gray-800 transition-all font-medium" onClick={() => setExpandedGroups({...expandedGroups, [br]: !expandedGroups[br]})}>
                            <div className="flex-1 flex items-center justify-between mr-8">
                              <div className="w-40 font-bold text-gray-900 dark:text-white">{group.name}</div>
                              <div className="w-32 text-sm text-gray-500 font-semibold">{group.items.length} Units</div>
                              <div className="w-48 text-sm text-gray-500 font-semibold">
                                {group.minSize !== Infinity ? `${group.minSize}${group.maxSize !== group.minSize ? ` - ${group.maxSize}` : ''} m²` : '--'}
                              </div>
                              <div className="flex-1 text-sm text-gray-900 dark:text-gray-100 font-bold text-right">
                                {group.minPrice !== Infinity ? `${formatPrice(group.minPrice)}${group.maxPrice !== group.minPrice ? ` - ${formatPrice(group.maxPrice)}` : ''} AED` : '--'}
                              </div>
                            </div>
                            {expandedGroups[br] ? <ChevronUp className="w-5 h-5 text-gray-400"/> : <ChevronDown className="w-5 h-5 text-gray-400"/>}
                         </div>
                         {expandedGroups[br] && (
                          <div className="p-0 bg-white dark:bg-gray-950 border-t border-gray-100 dark:border-gray-800">
                             <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800">
                                  <tr className="text-[10px] text-gray-400 uppercase font-black tracking-widest">
                                    <th className="px-5 py-3">Plan</th>
                                    <th className="px-5 py-3">Type</th>
                                    <th className="px-5 py-3">Number</th>
                                    <th className="px-5 py-3">Floor</th>
                                    <th className="px-5 py-3">Area</th>
                                    <th className="px-5 py-3">Price</th>
                                    <th className="px-5 py-3 text-right">Actions</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-gray-900">
                                  {group.items.map((u:any, i:number) => {
                                    const rIdx = units.findIndex(uu => uu === u);
                                    return (
                                      <tr key={i} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20 text-sm">
                                        <td className="py-3 px-5">
                                          <div className="w-14 h-14 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden bg-white flex items-center justify-center p-1 group relative">
                                            {u.planImage ? (
                                              <img src={u.planImage} className="w-full h-full object-contain" />
                                            ) : (
                                              <Camera className="w-5 h-5 text-gray-200" />
                                            )}
                                          </div>
                                        </td>
                                        <td className="px-5 capitalize font-medium text-gray-600 dark:text-gray-400">{u.type}</td>
                                        <td className="px-5">
                                          <input 
                                            className="bg-transparent border-none focus:ring-0 p-0 w-24 font-bold text-gray-900 dark:text-white" 
                                            value={u.unitId} 
                                            onChange={e => updateUnit(rIdx, 'unitId', e.target.value)} 
                                            placeholder="№ 000"
                                          />
                                        </td>
                                        <td className="px-5">
                                          <input className="bg-transparent border-none focus:ring-0 p-0 w-8 text-gray-500" value={u.floor} onChange={e => updateUnit(rIdx, 'floor', e.target.value)} />
                                        </td>
                                        <td className="px-5 font-semibold text-gray-700 dark:text-gray-300">{u.totalSize} m²</td>
                                        <td className="px-5">
                                          <input className="bg-transparent border-none focus:ring-0 p-0 font-black text-brand-600 w-36" value={u.price} onChange={e => updateUnit(rIdx, 'price', e.target.value)} />
                                        </td>
                                        <td className="px-5 text-right">
                                          <div className="flex justify-end gap-2">
                                            <button type="button" onClick={() => setUnits(units.filter((_, idx)=>idx!==rIdx))} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-300 hover:text-red-500 rounded-lg transition-colors">
                                              <Trash2 className="w-4 h-4"/>
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    )
                                  })}
                                </tbody>
                             </table>
                          </div>
                         )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-8">
            {/* Payment Plans */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-800 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold flex items-center gap-2"><div className="w-1 h-5 bg-green-500 rounded-full"></div> Payment Plans</h2>
                <button type="button" onClick={addPaymentPlan} className="text-brand-600 hover:text-brand-700 font-semibold text-xs flex items-center gap-1 hover:underline">Add Plan</button>
              </div>
              <div className="space-y-6">
                  {paymentPlans.map((plan: any, pIdx: number) => {
                    const totalPrice = parseFloat(deformatPrice(priceFromValue)) || 0;
                    const totalPercent = plan.Payments.reduce((sum: number, s: any)=> sum + (parseFloat(s.Percent_of_payment)||0), 0);
                  return (
                    <div key={pIdx} className="bg-gray-50/50 dark:bg-gray-800/50 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 space-y-4">
                       <div className="flex items-center justify-between">
                          <input className="bg-transparent border-none font-semibold text-base focus:ring-0 p-0 w-40" value={plan.Plan_name} onChange={(e: any) => updatePaymentPlan(pIdx, 'Plan_name', e.target.value)} />
                          <button type="button" onClick={() => removePaymentPlan(pIdx)} className="text-red-300 hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5"/></button>
                       </div>
                       <div className="space-y-3">
                         {plan.Payments.map((step: any, sIdx: number) => (
                           <div key={sIdx} className="bg-white dark:bg-gray-900 p-3 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-1 relative group">
                              <input className="block w-full text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-transparent border-none p-0 focus:ring-0" value={step.Payment_time} onChange={(e: any) => updatePaymentStep(pIdx, sIdx, 'Payment_time', e.target.value)} />
                              <div className="flex items-center justify-between">
                                 <div className="flex items-center gap-1">
                                    <input className="w-16 text-lg font-bold bg-transparent border-none p-0 focus:ring-0" value={step.Percent_of_payment} onChange={(e: any) => updatePaymentStep(pIdx, sIdx, 'Percent_of_payment', e.target.value)} />
                                    <span className="text-gray-300 font-medium">%</span>
                                 </div>
                                 <div className="text-[10px] font-semibold text-brand-600/80 bg-brand-50/50 dark:bg-brand-900/10 px-2 py-0.5 rounded">≈ {formatPrice(totalPrice * (parseFloat(step.Percent_of_payment)/100))}</div>
                              </div>
                              <button type="button" onClick={() => removePaymentStep(pIdx, sIdx)} className="absolute top-2 right-2 text-gray-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-3 h-3"/></button>
                           </div>
                         ))}
                       </div>
                       <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700 text-[10px] mt-1">
                          <div className={`font-semibold ${Math.abs(totalPercent-100)<0.1 ? 'text-green-500' : 'text-orange-400'}`}>Total: {totalPercent}%</div>
                          <button type="button" onClick={() => addPaymentStep(pIdx)} className="text-brand-600 font-bold hover:underline">Add Step</button>
                       </div>
                       <div className="pt-2 flex items-center justify-between">
                          <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Months post-handover</span>
                          <input className="w-10 text-center font-bold text-gray-800 dark:text-white bg-gray-100/50 dark:bg-gray-800 rounded px-1 py-0.5 text-sm" type="number" value={plan.months_after_handover} onChange={(e: any) => updatePaymentPlan(pIdx, 'months_after_handover', parseInt(e.target.value))} />
                       </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Gallery Section */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-800 space-y-6">
              <div className="flex items-center justify-between">
                 <h2 className="text-lg font-semibold flex items-center gap-2"><div className="w-1 h-5 bg-purple-500 rounded-full"></div> Gallery</h2>
                 <button type="button" onClick={() => setIsGalleryOpen(true)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-brand-600 transition-colors"><Maximize2 className="w-4 h-4"/></button>
              </div>
              <div className="grid grid-cols-2 gap-4 max-h-[300px] overflow-y-auto pr-2">
                {photos.slice(0, 6).map((p, i) => (
                  <div key={i} className={`aspect-square rounded-2xl overflow-hidden border ${i === 0 ? 'border-brand-500 ring-4 ring-brand-500/10' : 'border-gray-100 dark:border-gray-800'} relative shadow-sm group`}>
                    <img src={p} className="w-full h-full object-cover" />
                    {i === 0 && <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-brand-500 text-white text-[7px] font-bold uppercase rounded shadow-lg">Main</div>}
                  </div>
                ))}
                <label className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-2xl cursor-pointer hover:bg-gray-50/50 transition-colors">
                   <Plus className="w-6 h-6 text-gray-300" />
                   <input type="file" multiple className="hidden" onChange={handlePhotoUpload} />
                </label>
              </div>
              {photos.length > 6 && <p className="text-[10px] text-center text-gray-400 font-medium">+{photos.length - 6} more images. Open manager to view all.</p>}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-800 space-y-8">
            <h2 className="text-lg font-semibold flex items-center gap-2"><div className="w-1 h-5 bg-brand-500 rounded-full"></div> Final Details & Description</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="space-y-4">
                 <div><Label>Description (EN)</Label><TextArea rows={10} value={watch('description')} onChange={v => setValue('description', v)} /></div>
                 <div><Label>Description (RU)</Label><TextArea rows={10} value={watch('descriptionRu')} onChange={v => setValue('descriptionRu', v)} /></div>
               </div>
               <div className="space-y-6">
                 <div><Label>Facilities</Label>
                    <div className="grid grid-cols-2 gap-3 p-6 bg-gray-50/30 dark:bg-black/10 rounded-3xl border border-gray-100 dark:border-gray-800">
                       {facilities.map((f: any) => (
                         <Checkbox key={f.id} id={f.id} label={f.nameEn} checked={watch('facilityIds' as any)?.includes(f.id)} onChange={(checked: boolean) => {
                           const current = watch('facilityIds' as any) || [];
                           const next = checked ? [...current, f.id] : current.filter((id: any) => id !== f.id);
                           setValue('facilityIds' as any, next);
                         }} />
                       ))}
                    </div>
                 </div>
                   <div className="grid grid-cols-2 gap-4">
                    <div><Label>Status</Label><Input {...register('status')} /></div>
                    <div><Label>Sale Status</Label><Input {...register('saleStatus')} /></div>
                    <div><Label>Readiness</Label><Input {...register('readiness')} /></div>
                    <div><Label>Completion Date</Label><Input {...register('completionDatetime')} /></div>
                    <div><Label>Property Type (Reelly)</Label><Input {...register('type')} /></div>
                    <div className="col-span-2">
                      <Label>Views (comma separated)</Label>
                      <Input {...register('views')} placeholder="Sea View, Marina View..." />
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4 p-6 bg-blue-50/20 dark:bg-blue-900/10 rounded-3xl border border-blue-100/50 dark:border-blue-800/20">
                    <div className="col-span-2 text-xs font-bold text-blue-500 uppercase tracking-widest mb-2">Price Ranges (Reelly Data)</div>
                    <div><Label>Min Price (AED)</Label><Input type="number" {...register('minPriceAed')} /></div>
                    <div><Label>Max Price (AED)</Label><Input type="number" {...register('maxPriceAed')} /></div>
                    <div><Label>Min Price (USD)</Label><Input type="number" {...register('minPrice')} /></div>
                    <div><Label>Max Price (USD)</Label><Input type="number" {...register('maxPrice')} /></div>
                  </div>

                  <div className="p-6 bg-purple-50/20 dark:bg-purple-900/10 rounded-3xl border border-purple-100/50 dark:border-purple-800/20 space-y-4">
                    <div className="text-xs font-bold text-purple-500 uppercase tracking-widest mb-2">SEO Overrides</div>
                    <div><Label>SEO Title</Label><Input {...register('seoTitle')} placeholder="Custom SEO Title" /></div>
                    <div>
                      <Label>SEO Description</Label>
                      <textarea
                        rows={3}
                        {...register('seoDescription')}
                        placeholder="Custom SEO Description"
                        className="h-auto w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 bg-transparent text-gray-800"
                      />
                    </div>
                  </div>
                </div>
            </div>
        </div>
      </form>

      {/* Gallery Manager Modal - MOVED TO BOTTOM OF TREE */}
      {isGalleryOpen && (
        <div 
          className="fixed inset-0 flex items-center justify-center p-4 sm:p-10 animate-in fade-in duration-300" 
          style={{ zIndex: 999999, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)' }}
        >
           <div className="bg-white dark:bg-gray-900 w-full max-w-6xl rounded-[40px] max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-white/10 my-10 relative">
              <div className="px-10 py-8 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900">
                 <div>
                    <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white leading-tight">Gallery Manager</h2>
                    <p className="text-sm text-gray-400 font-medium">Drag and drop to reorder. The first image is used as the cover photo.</p>
                 </div>
                 <button onClick={() => setIsGalleryOpen(false)} className="p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-full transition-all text-gray-400 hover:text-gray-900 group">
                    <X className="w-6 h-6 group-hover:scale-110 transition-transform"/>
                 </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-10 bg-gray-50/10 dark:bg-black/20 custom-scrollbar">
                 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 pb-20">
                    {photos.map((p, i) => (
                      <div 
                        key={i} 
                        className={`aspect-square rounded-[32px] overflow-hidden border-2 cursor-move group relative transition-all duration-300 ${i === 0 ? 'border-brand-500 shadow-2xl scale-100' : 'border-white dark:border-gray-800 hover:border-brand-200 hover:scale-[1.02] shadow-sm'}`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, i)}
                        onDragEnter={(e) => handleDragEnter(e, i)}
                        onDragEnd={handleDragEnd}
                        onDragOver={(e) => e.preventDefault()}
                      >
                         <img src={p} className="w-full h-full object-cover pointer-events-none transition-transform duration-500 group-hover:scale-110" />
                         
                         {/* Control Overlay */}
                         <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-between p-4 backdrop-blur-[2px]">
                            <div className="flex justify-end">
                               <button type="button" onClick={() => { const next = photos.filter((_, idx)=>idx!==i); setPhotos(next); setValue('photos', next)}} className="p-2.5 bg-red-500/90 text-white rounded-2xl shadow-xl hover:bg-red-600 transition-colors backdrop-blur-md" title="Delete">
                                  <Trash2 className="w-4 h-4" />
                               </button>
                            </div>
                            
                            {i !== 0 && (
                               <button type="button" onClick={() => makeMain(i)} className="w-full py-2.5 bg-white/90 dark:bg-gray-900/90 text-brand-600 font-bold text-[10px] uppercase tracking-[0.1em] rounded-2xl shadow-xl flex items-center justify-center gap-1.5 hover:bg-white active:scale-95 transition-all">
                                  <Star className="w-3.5 h-3.5 fill-brand-600"/> Make Cover
                               </button>
                            )}
                         </div>

                         {/* Status Badges */}
                         {i === 0 && (
                            <div className="absolute top-4 left-4 px-3 py-1.5 bg-brand-500 text-white text-[9px] font-black uppercase tracking-widest rounded-xl shadow-2xl flex items-center gap-1.5 animate-in zoom-in duration-300">
                               <Star className="w-3 h-3 fill-white" /> Cover Photo
                            </div>
                         )}
                         <div className="absolute bottom-4 right-4 w-7 h-7 flex items-center justify-center text-[10px] font-bold text-white/90 bg-black/40 rounded-xl backdrop-blur-md border border-white/10">
                            {i + 1}
                         </div>
                      </div>
                    ))}

                    <label className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-[32px] cursor-pointer hover:bg-brand-50/30 hover:border-brand-200 transition-all group shadow-sm">
                       <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center mb-3 group-hover:bg-brand-100 transition-colors">
                          <Plus className="w-6 h-6 text-gray-400 group-hover:text-brand-600" />
                       </div>
                       <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center group-hover:text-brand-600">Upload Photos</span>
                       <input type="file" multiple className="hidden" onChange={handlePhotoUpload} />
                    </label>
                 </div>
              </div>
              
              <div className="px-10 py-8 border-t border-gray-100 dark:border-gray-800 flex justify-end bg-white dark:bg-gray-900">
                 <Button onClick={() => setIsGalleryOpen(false)} className="px-12 py-6 rounded-2xl shadow-xl shadow-brand-500/20 active:scale-95 transition-transform">Save Order & Close</Button>
              </div>
           </div>
        </div>
      )}
    </div>
  )
}
