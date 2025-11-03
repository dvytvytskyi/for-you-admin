'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { ApexOptions } from 'apexcharts'
import dynamic from 'next/dynamic'

const ReactApexChart = dynamic(() => import('react-apexcharts'), {
  ssr: false,
})

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalProperties: 0,
    offPlanProperties: 0,
    secondaryProperties: 0,
    totalDevelopers: 0,
    totalFacilities: 0,
    totalLocations: {
      countries: 0,
      cities: 0,
      areas: 0,
    },
    minPrice: 0,
    maxPrice: 0,
  })
  const [chartData, setChartData] = useState({
    propertiesByType: {
      categories: [] as string[],
      series: [] as number[],
    },
    propertiesByLocation: {
      categories: [] as string[],
      series: [] as number[],
    },
    propertiesByBedrooms: {
      categories: [] as string[],
      series: [] as number[],
    },
    unitTypes: {
      categories: [] as string[],
      series: [] as number[],
    },
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const [propertiesRes, developersRes, facilitiesRes, locationsRes] = await Promise.all([
        api.get('/properties'),
        api.get('/settings/developers').catch(() => ({ data: { data: [] } })),
        api.get('/settings/facilities').catch(() => ({ data: { data: [] } })),
        api.get('/settings/locations').catch(() => ({ data: { data: [] } })),
      ])

      const properties = propertiesRes.data.data || []
      const developers = developersRes.data.data || []
      const facilities = facilitiesRes.data.data || []
      const locations = locationsRes.data.data || {}


      // Calculate basic stats
      const offPlan = properties.filter((p: any) => p.propertyType === 'off-plan')
      const secondary = properties.filter((p: any) => p.propertyType === 'secondary')

      // Calculate prices
      const prices = properties
        .map((p: any) => p.price || p.priceFrom)
        .filter((p: any) => p && p > 0)
      
      const minPrice = prices.length > 0 ? Math.min(...prices) : 0
      const maxPrice = prices.length > 0 ? Math.max(...prices) : 0

      // Properties by type
      const propertiesByType = {
        categories: ['Off-Plan', 'Secondary'],
        series: [offPlan.length, secondary.length],
      }

      // Properties by city
      const locationMap = new Map<string, number>()
      properties.forEach((p: any) => {
        // Get city name from loaded city object
        if (p.city) {
          const cityName = p.city?.nameEn || p.city?.nameRu || p.city?.nameAr || null
          if (cityName) {
            locationMap.set(cityName, (locationMap.get(cityName) || 0) + 1)
          }
        }
      })
      
      const topLocations = Array.from(locationMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
      
      const propertiesByLocation = {
        categories: topLocations.map(([name]) => name),
        series: topLocations.map(([, value]) => value),
      }

      // Properties by bedrooms (for off-plan)
      const bedroomsMap = new Map<string, number>()
      offPlan.forEach((p: any) => {
        if (p.bedroomsFrom && p.bedroomsTo) {
          const range = `${p.bedroomsFrom}-${p.bedroomsTo}`
          bedroomsMap.set(range, (bedroomsMap.get(range) || 0) + 1)
        } else if (p.bedroomsFrom) {
          const label = `${p.bedroomsFrom}+`
          bedroomsMap.set(label, (bedroomsMap.get(label) || 0) + 1)
        }
      })
      const bedroomsSorted = Array.from(bedroomsMap.entries())
        .sort((a, b) => {
          const aNum = parseInt(a[0]) || 0
          const bNum = parseInt(b[0]) || 0
          return aNum - bNum
        })
      
      const propertiesByBedrooms = {
        categories: bedroomsSorted.map(([name]) => name + ' Beds'),
        series: bedroomsSorted.map(([, value]) => value),
      }

      // Unit types distribution
      const unitTypesMap = new Map<string, number>()
      properties.forEach((p: any) => {
        if (p.units && Array.isArray(p.units)) {
          p.units.forEach((unit: any) => {
            const type = unit.type || 'Unknown'
            const typeName = type.charAt(0).toUpperCase() + type.slice(1)
            unitTypesMap.set(typeName, (unitTypesMap.get(typeName) || 0) + 1)
          })
        }
      })
      const unitTypesSorted = Array.from(unitTypesMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
      
      const unitTypes = {
        categories: unitTypesSorted.map(([name]) => name),
        series: unitTypesSorted.map(([, value]) => value),
      }

      setStats({
        totalProperties: properties.length,
        offPlanProperties: offPlan.length,
        secondaryProperties: secondary.length,
        totalDevelopers: developers.length,
        totalFacilities: facilities.length,
        totalLocations: {
          countries: locations.countries?.length || 0,
          cities: locations.cities?.length || 0,
          areas: locations.areas?.length || 0,
        },
        minPrice,
        maxPrice,
      })

      setChartData({
        propertiesByType,
        propertiesByLocation,
        propertiesByBedrooms: propertiesByBedrooms.categories.length > 0 ? propertiesByBedrooms : { categories: ['No data'], series: [0] },
        unitTypes: unitTypes.categories.length > 0 ? unitTypes : { categories: ['No data'], series: [0] },
      })
    } catch (error) {
      console.error('Error loading stats', error)
    } finally {
      setLoading(false)
    }
  }

  const formatPrice = (price: number) => {
    return `$${Math.round(price).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  }

  // Chart options in BarChartOne style
  const getBarChartOptions = (categories: string[]): ApexOptions => ({
    colors: ['#465fff'],
    chart: {
      fontFamily: 'Outfit, sans-serif',
      type: 'bar',
      height: 350,
      toolbar: {
        show: false,
      },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '39%',
        borderRadius: 5,
        borderRadiusApplication: 'end',
      },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      show: true,
      width: 4,
      colors: ['transparent'],
    },
    xaxis: {
      categories,
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
      labels: {
        style: {
          colors: '#667085',
          fontSize: '12px',
        },
      },
    },
    legend: {
      show: false,
    },
    yaxis: {
      labels: {
        style: {
          colors: '#667085',
          fontSize: '12px',
        },
      },
      title: {
        text: undefined,
      },
    },
    grid: {
      yaxis: {
        lines: {
          show: true,
        },
      },
      xaxis: {
        lines: {
          show: false,
        },
      },
    },
    fill: {
      opacity: 1,
    },
    tooltip: {
      y: {
        formatter: (val: number) => `${val}`,
      },
    },
  })

  // Donut chart options (for pie charts)
  const getDonutChartOptions = (categories: string[]): ApexOptions => ({
    chart: {
      fontFamily: 'Outfit, sans-serif',
      type: 'donut',
      height: 350,
      toolbar: {
        show: false,
      },
    },
    colors: ['#465fff', '#12b76a', '#7a5af8', '#fb6514', '#ee46bc'],
    labels: categories,
    legend: {
      show: true,
      position: 'bottom',
      horizontalAlign: 'center',
      fontFamily: 'Outfit',
      labels: {
        colors: '#667085',
      },
    },
    dataLabels: {
      enabled: true,
      formatter: (val: number) => `${Math.round(val)}%`,
    },
    tooltip: {
      y: {
        formatter: (val: number) => `${val}`,
      },
    },
  })

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Properties */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Total Properties
              </p>
              <p className="mt-2 text-2xl font-semibold text-gray-800 dark:text-white">
                {loading ? '...' : stats.totalProperties}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-500/10">
              <svg className="fill-blue-500 dark:fill-blue-400" width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M10 20V14H14V20H19V12H22L12 3L2 12H5V20H10Z"/>
              </svg>
            </div>
          </div>
        </div>

        {/* Off-Plan Properties */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Off-Plan Properties
              </p>
              <p className="mt-2 text-2xl font-semibold text-gray-800 dark:text-white">
                {loading ? '...' : stats.offPlanProperties}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-50 dark:bg-green-500/10">
              <svg className="fill-green-500 dark:fill-green-400" width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7L12 12L22 7L12 2Z"/>
                <path d="M2 17L12 22L22 17V12L12 17L2 12V17Z"/>
              </svg>
            </div>
          </div>
        </div>

        {/* Developers */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Developers
              </p>
              <p className="mt-2 text-2xl font-semibold text-gray-800 dark:text-white">
                {loading ? '...' : stats.totalDevelopers}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-500/10">
              <svg className="fill-purple-500 dark:fill-purple-400" width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20Z"/>
                <path d="M12 6C9.79 6 8 7.79 8 10C8 12.21 9.79 14 12 14C14.21 14 16 12.21 16 10C16 7.79 14.21 6 12 6ZM12 12C10.9 12 10 11.1 10 10C10 8.9 10.9 8 12 8C13.1 8 14 8.9 14 10C14 11.1 13.1 12 12 12ZM12 15C9.33 15 4 16.34 4 19V20H20V19C20 16.34 14.67 15 12 15Z"/>
              </svg>
            </div>
          </div>
        </div>

        {/* Facilities */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Facilities
              </p>
              <p className="mt-2 text-2xl font-semibold text-gray-800 dark:text-white">
                {loading ? '...' : stats.totalFacilities}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-50 dark:bg-orange-500/10">
              <svg className="fill-orange-500 dark:fill-orange-400" width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7L12 12L22 7L12 2Z"/>
                <path d="M2 17L12 22L22 17V12L12 17L2 12V17Z"/>
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Price Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Min Price</p>
          <p className="mt-2 text-xl font-semibold text-gray-800 dark:text-white">
            {loading ? '...' : stats.minPrice > 0 ? formatPrice(stats.minPrice) : 'N/A'}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Max Price</p>
          <p className="mt-2 text-xl font-semibold text-gray-800 dark:text-white">
            {loading ? '...' : stats.maxPrice > 0 ? formatPrice(stats.maxPrice) : 'N/A'}
          </p>
        </div>
      </div>

      {/* Location Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Countries</p>
          <p className="mt-2 text-2xl font-semibold text-gray-800 dark:text-white">
            {loading ? '...' : stats.totalLocations.countries}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Cities</p>
          <p className="mt-2 text-2xl font-semibold text-gray-800 dark:text-white">
            {loading ? '...' : stats.totalLocations.cities}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Areas</p>
          <p className="mt-2 text-2xl font-semibold text-gray-800 dark:text-white">
            {loading ? '...' : stats.totalLocations.areas}
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Properties by Type Donut Chart */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white">
            Properties by Type
          </h3>
          {loading ? (
            <div className="flex h-[350px] items-center justify-center">
              <p className="text-gray-500 dark:text-gray-400">Loading...</p>
            </div>
          ) : (
            <div id="chart-properties-by-type">
              <ReactApexChart
                options={getDonutChartOptions(chartData.propertiesByType.categories)}
                series={chartData.propertiesByType.series}
                type="donut"
                height={350}
              />
            </div>
          )}
        </div>

        {/* Properties by City Bar Chart */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white">
            Properties by City
          </h3>
          {loading ? (
            <div className="flex h-[350px] items-center justify-center">
              <p className="text-gray-500 dark:text-gray-400">Loading...</p>
            </div>
          ) : (
            <div className="max-w-full overflow-x-auto custom-scrollbar">
              <div id="chart-top-locations" className="min-w-[500px]">
                <ReactApexChart
                  options={getBarChartOptions(chartData.propertiesByLocation.categories)}
                  series={[{ name: 'Properties', data: chartData.propertiesByLocation.series }]}
                  type="bar"
                  height={350}
                />
              </div>
            </div>
          )}
        </div>

        {/* Properties by Bedrooms Bar Chart */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white">
            Properties by Bedrooms (Off-Plan)
          </h3>
          {loading ? (
            <div className="flex h-[350px] items-center justify-center">
              <p className="text-gray-500 dark:text-gray-400">Loading...</p>
            </div>
          ) : (
            <div className="max-w-full overflow-x-auto custom-scrollbar">
              <div id="chart-bedrooms" className="min-w-[500px]">
                <ReactApexChart
                  options={getBarChartOptions(chartData.propertiesByBedrooms.categories)}
                  series={[{ name: 'Properties', data: chartData.propertiesByBedrooms.series }]}
                  type="bar"
                  height={350}
                />
              </div>
            </div>
          )}
        </div>

        {/* Unit Types Donut Chart */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white">
            Unit Types Distribution
          </h3>
          {loading ? (
            <div className="flex h-[350px] items-center justify-center">
              <p className="text-gray-500 dark:text-gray-400">Loading...</p>
            </div>
          ) : (
            <div id="chart-unit-types">
              <ReactApexChart
                options={getDonutChartOptions(chartData.unitTypes.categories)}
                series={chartData.unitTypes.series}
                type="donut"
                height={350}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
