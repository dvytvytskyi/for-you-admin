import express from 'express';
import { Brackets } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Property, PropertyType } from '../entities/Property';
import { authenticateJWT, authenticateApiKeyWithSecret, AuthRequest } from '../middleware/auth';
import { successResponse } from '../utils/response';
import { Conversions } from '../utils/conversions';

const router = express.Router();

// Support both JWT and API Key/Secret authentication
router.use((req: AuthRequest, res, next) => {
  const apiKey = req.headers['x-api-key'] as string;
  const apiSecret = req.headers['x-api-secret'] as string;

  // If both API key and secret are provided, use API Key/Secret authentication
  if (apiKey && apiSecret) {
    // authenticateApiKeyWithSecret is async and handles errors internally
    authenticateApiKeyWithSecret(req, res, next).catch((error) => {
      console.error('Error in authenticateApiKeyWithSecret:', error);
      // Error should already be handled in middleware, but just in case
      if (!res.headersSent) {
        res.status(500).json({ message: 'Authentication error' });
      }
    });
    return;
  }

  // Otherwise, use JWT authentication
  return authenticateJWT(req, res, next);
});

router.get('/', async (req: AuthRequest, res) => {
  try {
    console.log('[Properties API] GET /api/properties request:', {
      query: req.query,
      propertyType: req.query.propertyType,
      hasApiKey: !!req.apiKey,
      authMethod: req.apiKey ? 'API Key' : (req.user ? 'JWT' : 'Unknown'),
    });

    const {
      propertyType,
      type,
      developerId,
      cityId,
      areaId,
      areaSlug,
      bedrooms,
      sizeFrom,
      sizeTo,
      priceFrom,
      priceTo,
      minPrice,
      maxPrice,
      location,
      town,
      search,
      sortBy,
      sortOrder,
      seed,
      page,
      limit,
      summary,
      status
    } = req.query;

    const isSummary = summary === 'true' || summary === '1';

    // Перевірка чи підключено до БД
    if (!AppDataSource.isInitialized) {
      console.error('Database not initialized');
      return res.status(500).json({
        success: false,
        message: 'Database connection not initialized',
      });
    }

    // Базовий query builder
    const repo = AppDataSource.getRepository(Property);
    const queryBuilder = repo.createQueryBuilder('property');

    if (isSummary) {
      // Optimized selection for summary view
      queryBuilder
        .select([
          'property.id',
          'property.name',
          'property.price',
          'property.priceFrom',
          'property.photos',
          'property.propertyType',
          'property.bedrooms',
          'property.bedroomsFrom',
          'property.bedroomsTo',
          'property.bathrooms',
          'property.bathroomsFrom',
          'property.bathroomsTo',
          'property.size',
          'property.sizeFrom',
          'property.isForYouChoice',
          'property.createdAt'
        ])
        .leftJoinAndSelect('property.area', 'area')
        .leftJoinAndSelect('property.city', 'city');
    } else {
      // Full selection
      queryBuilder
        .leftJoinAndSelect('property.country', 'country')
        .leftJoinAndSelect('property.city', 'city')
        .leftJoinAndSelect('property.area', 'area')
        .leftJoinAndSelect('property.developer', 'developer')
        .leftJoinAndSelect('property.facilities', 'facilities');
    }

    // --- Фільтрація ---

    // 1. Market Type (Off-plan / Secondary)
    if (propertyType) {
      const marketTypes = (Array.isArray(propertyType)
        ? propertyType.map(String)
        : String(propertyType).split(',').map(s => s.trim()))
        .map(t => t.toLowerCase() === 'offplan' ? 'off-plan' : t.toLowerCase()); // Normalize

      if (marketTypes.length > 0) {
        queryBuilder.andWhere('property.propertyType IN (:...marketTypes)', { marketTypes });
      }
    }

    // 2. Strict Filter for Secondary Market: Show only mapped properties (with photos and project link)
    queryBuilder.andWhere(new Brackets(qb => {
      qb.where('property.propertyType != :secondaryType', { secondaryType: PropertyType.SECONDARY })
        .orWhere('property.parentProjectId IS NOT NULL');
    }));

    // 3. Unit Type (Apartment, Villa, etc.)
    if (type) {
      queryBuilder.leftJoin('property.units', 'units'); // Always join for filtering
      const unitTypes = (Array.isArray(type)
        ? type.map(String)
        : String(type).split(',').map(s => s.trim()))
        .map(t => t.toLowerCase()); // Normalize to match enum 'apartment', 'villa', etc.

      if (unitTypes.length > 0) {
        queryBuilder.andWhere('units.type IN (:...unitTypes)', { unitTypes });
      }
    }

    // 3. Location (City or Area name) - "OR" logic
    const effectiveLocation = location || town;
    if (effectiveLocation) {
      const locations = Array.isArray(effectiveLocation)
        ? effectiveLocation.map(String)
        : String(effectiveLocation).split(',').map(s => s.trim());

      const searchLocs = locations.filter(Boolean).map(l => `%${l.toLowerCase()}%`);

      if (searchLocs.length > 0) {
        queryBuilder.andWhere(
          new Brackets((qb: any) => {
            searchLocs.forEach((loc, index) => {
              if (index === 0) {
                qb.where(`LOWER(city.nameEn) LIKE :loc${index}`, { [`loc${index}`]: loc })
                  .orWhere(`LOWER(area.nameEn) LIKE :loc${index}`, { [`loc${index}`]: loc });
              } else {
                qb.orWhere(`LOWER(city.nameEn) LIKE :loc${index}`, { [`loc${index}`]: loc })
                  .orWhere(`LOWER(area.nameEn) LIKE :loc${index}`, { [`loc${index}`]: loc });
              }
            });
          })
        );
      }
    }

    // Exact ID filters (supporting multiple IDs)
    if (developerId) {
      const developerIds = Array.isArray(developerId)
        ? developerId
        : developerId.toString().split(',').map(id => id.trim()).filter(id => id !== '');
      if (developerIds.length > 0) {
        queryBuilder.andWhere('property.developerId IN (:...developerIds)', { developerIds });
      }
    }
    if (cityId) {
      const cityIds = Array.isArray(cityId)
        ? cityId
        : cityId.toString().split(',').map(id => id.trim()).filter(id => id !== '');
      if (cityIds.length > 0) {
        queryBuilder.andWhere('property.cityId IN (:...cityIds)', { cityIds });
      }
    }
    if (areaId) {
      const areaIds = Array.isArray(areaId)
        ? areaId
        : areaId.toString().split(',').map(id => id.trim()).filter(id => id !== '');
      if (areaIds.length > 0) {
        queryBuilder.andWhere('property.areaId IN (:...areaIds)', { areaIds });
      }
    }
    if (areaSlug) {
      queryBuilder.andWhere('area.slug = :areaSlug', { areaSlug });
    }

    // 3. Bedrooms (Smart Filter)
    if (bedrooms) {
      const beds = Array.isArray(bedrooms) ? bedrooms.map(String) : String(bedrooms).split(',');

      queryBuilder.andWhere(new Brackets((qb: any) => {
        beds.forEach((bedStr) => {
          const bed = bedStr.trim().toLowerCase();

          if (bed === 'studio') {
            qb.orWhere("(property.propertyType IN ('off-plan', 'new-launches', 'exclusive-for-you') AND property.bedroomsFrom = 0)")
              .orWhere("(property.propertyType IN ('secondary', 'rent', 'commercial') AND property.bedrooms = 0)");
          } else if (bed.includes('+') || bed.includes('>')) {
            const num = parseInt(bed.replace(/[^0-9]/g, ''), 10);
            if (!isNaN(num)) {
              qb.orWhere(`(property.propertyType IN ('off-plan', 'new-launches', 'exclusive-for-you') AND property.bedroomsTo >= :bedPlus${num})`, { [`bedPlus${num}`]: num })
                .orWhere(`(property.propertyType IN ('secondary', 'rent', 'commercial') AND property.bedrooms >= :bedPlus${num})`, { [`bedPlus${num}`]: num });
            }
          } else {
            const num = parseInt(bed, 10);
            if (!isNaN(num)) {
              qb.orWhere(`(property.propertyType IN ('off-plan', 'new-launches', 'exclusive-for-you') AND (property.bedroomsFrom <= :bedNum${num} AND property.bedroomsTo >= :bedNum${num}))`, { [`bedNum${num}`]: num })
                .orWhere(`(property.propertyType IN ('secondary', 'rent', 'commercial') AND property.bedrooms = :bedNum${num})`, { [`bedNum${num}`]: num });
            }
          }
        });
      }));
    }

    // 4. Price (Min/Max aliases)
    const effectiveMin = minPrice || priceFrom;
    const effectiveMax = maxPrice || priceTo;

    if (effectiveMin) {
      const val = parseFloat(effectiveMin.toString());
      if (!isNaN(val)) {
        queryBuilder.andWhere('(property.priceFrom >= :minPrice OR property.price >= :minPrice)', { minPrice: val });
      }
    }

    if (effectiveMax) {
      const val = parseFloat(effectiveMax.toString());
      if (!isNaN(val)) {
        queryBuilder.andWhere('(property.priceFrom <= :maxPrice OR property.price <= :maxPrice)', { maxPrice: val });
      }
    }

    // 5. Size
    if (sizeFrom) {
      const val = parseFloat(sizeFrom.toString());
      if (!isNaN(val)) queryBuilder.andWhere('(property.sizeFrom >= :sizeFrom OR property.size >= :sizeFrom)', { sizeFrom: val });
    }
    if (sizeTo) {
      const val = parseFloat(sizeTo.toString());
      if (!isNaN(val)) queryBuilder.andWhere('(property.sizeFrom <= :sizeTo OR property.size <= :sizeTo)', { sizeTo: val });
    }

    // 5. Status Phase (Off-plan / Completed)
    if (status && status !== 'all') {
      if (status === 'off-plan') {
        queryBuilder.andWhere(new Brackets(qb => {
          qb.where('property.status ILIKE :offPlanStatus', { offPlanStatus: '%Under Construction%' })
            .orWhere('property.status ILIKE :offPlanStatus2', { offPlanStatus2: '%Off Plan%' });
        }));
      } else if (status === 'completed') {
        queryBuilder.andWhere('property.status ILIKE :completedStatus', { completedStatus: '%Completed%' });
      }
    }

    // Amenities Filter
    const amenityIdsParam = req.query.amenities || req.query.amenityIds || req.query.amenity_ids;
    if (amenityIdsParam) {
      if (isSummary) {
        queryBuilder.leftJoin('property.facilities', 'facilities');
      }
      const amenityIdsList = Array.isArray(amenityIdsParam)
        ? amenityIdsParam.map(String)
        : String(amenityIdsParam).split(',').map(s => s.trim()).filter(Boolean);
      
      if (amenityIdsList.length > 0) {
        queryBuilder.andWhere('facilities.id IN (:...amenityIdsList)', { amenityIdsList });
      }
    }

    // Completion Date Filter
    const compFrom = req.query.completionDateFrom;
    const compTo = req.query.completionDateTo;
    if (compFrom) queryBuilder.andWhere('property.plannedCompletionAt >= :compFrom', { compFrom: compFrom.toString() });
    if (compTo) queryBuilder.andWhere('property.plannedCompletionAt <= :compTo', { compTo: compTo.toString() });

    // 6. Search (Name/Description/Slug-like/Developer/Location)
    if (search) {
      const searchTerm = `%${search.toString().toLowerCase()}%`;
      const slugSearch = `%${search.toString().toLowerCase().replace(/-/g, '%')}%`;

      // Ensure relations are available for search
      if (isSummary) {
        queryBuilder.leftJoin('property.developer', 'developer');
      }

      queryBuilder.andWhere(
        new Brackets(qb => {
          qb.where('LOWER(property.name) LIKE :search', { search: searchTerm })
            .orWhere('LOWER(property.description) LIKE :search', { search: searchTerm })
            .orWhere('LOWER(property.descriptionRu) LIKE :search', { search: searchTerm })
            .orWhere('LOWER(property.name) LIKE :slugSearch', { slugSearch })
            .orWhere('LOWER(developer.name) LIKE :search', { search: searchTerm })
            .orWhere('LOWER(city.nameEn) LIKE :search', { search: searchTerm })
            .orWhere('LOWER(area.nameEn) LIKE :search', { search: searchTerm });
        })
      );
    }

    // Сортування - спочатку featured (isForYouChoice = true), потім по іншим полям
    // Сортування - featured (isForYouChoice) спочатку лише якщо не вказано інше сортування
    const sortField = sortBy?.toString() || 'createdAt';
    const sortDirection = sortOrder?.toString().toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Дозволені поля для сортування
    const allowedSortFields = ['createdAt', 'name', 'price', 'priceFrom', 'size', 'sizeFrom'];

    if (sortBy === 'random') {
      const seedValue = seed?.toString() || Math.random().toString();
      // Use MD5(id + seed) for stable random ordering across pages
      queryBuilder.orderBy(`MD5(CAST(property.id AS TEXT) || :seed)`, 'ASC');
      queryBuilder.setParameter('seed', seedValue);
      // Always add featured first if wanted, or just random
      queryBuilder.addOrderBy('property.isForYouChoice', 'DESC');
    } else if (sortBy && allowedSortFields.includes(sortField)) {
      // Якщо користувач явно вказав поле для сортування, використовуємо його як основне
      queryBuilder.addOrderBy(`property.${sortField}`, sortDirection);
      // Featured об'єкти як другий критерій
      queryBuilder.addOrderBy('property.isForYouChoice', 'DESC');
    } else {
      // Стандартна поведінка: спочатку featured, потім дата
      queryBuilder.addOrderBy('property.isForYouChoice', 'DESC');
      queryBuilder.addOrderBy('property.createdAt', 'DESC');
    }

    // Пагінація - фронтенд завжди передає page та limit через infinite scroll
    // Якщо параметри не передані, використовуємо мінімальні значення для безпеки
    const pageNum = parseInt(page?.toString() || '1', 10) || 1;
    const limitNum = parseInt(limit?.toString() || '100', 10) || 100;

    // Максимальний limit для безпеки (на випадок якщо хтось передасть дуже велике значення)
    const MAX_LIMIT = 500;
    const finalLimit = Math.min(limitNum, MAX_LIMIT) || 100;
    const skip = ((pageNum - 1) * finalLimit) || 0;

    // Застосовуємо пагінацію та отримуємо дані разом з кількістю одним запитом
    queryBuilder.skip(skip).take(finalLimit);

    const [properties, totalCount] = await queryBuilder.getManyAndCount();

    console.log('[Properties API] Query results:', {
      totalProperties: properties.length,
      propertyTypes: properties.reduce((acc, p) => {
        acc[p.propertyType] = (acc[p.propertyType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      propertyTypeFilter: propertyType,
    });

    const parseSimpleArray = (val: any): string[] => {
      if (!val) return [];
      if (Array.isArray(val)) {
        return val.filter(item => typeof item === 'string' && item.length > 0 && item !== '[]');
      }
      if (typeof val === 'string') {
        let cleaned = val.trim();
        if (cleaned === '[]' || cleaned === '') return [];
        if (cleaned.startsWith('{') && cleaned.endsWith('}')) {
          cleaned = cleaned.slice(1, -1);
        }
        return cleaned.split(',').map(s => s.trim().replace(/^"|"$/g, '')).filter(s => s.length > 0 && s !== '[]');
      }
      return [];
    };

    const transformPhotos = (photos: any) => {
      const photosArray = parseSimpleArray(photos);
      return photosArray.map(photo => {
        let fullUrl = photo;
        if (photo.startsWith('/storage')) {
          const domain = process.env.BACKEND_URL || 'https://admin.foryou-realestate.com';
          fullUrl = `${domain}${photo}`;
        }
        if (fullUrl.includes('your-objectstorage.com')) {
          let small = fullUrl;
          let full = fullUrl;
          if (fullUrl.includes('_small.jpg')) {
            full = fullUrl.replace('_small.jpg', '_full.jpg');
          } else if (fullUrl.includes('_full.jpg')) {
            small = fullUrl.replace('_full.jpg', '_small.jpg');
          } else if (fullUrl.includes('_small.webp')) {
            full = fullUrl.replace('_small.webp', '_full.webp');
          } else if (fullUrl.includes('_full.webp')) {
            small = fullUrl.replace('_full.webp', '_small.webp');
          }
          return { small, full };
        }
        return { small: fullUrl, full: fullUrl };
      });
    };

    const propertiesWithConversions = properties.map(p => {
      // Для off-plan properties: area має бути рядком "areaName, cityName"
      // Для secondary properties: area залишається об'єктом
      let areaField: any = p.area;
      if (p.area && ['off-plan', 'new-launches', 'exclusive-for-you'].includes(p.propertyType)) {
        const areaName = p.area.nameEn || '';
        const cityName = p.city?.nameEn || '';
        areaField = cityName ? `${areaName}, ${cityName}` : areaName;
      }

      const photosArray = parseSimpleArray(p.photos);

      const baseData = {
        id: p.id,
        name: p.name,
        price: p.price,
        priceFrom: p.priceFrom,
        priceAED: p.price ? Conversions.usdToAed(p.price) : null,
        priceFromAED: p.priceFrom ? Conversions.usdToAed(p.priceFrom) : null,
        propertyType: p.propertyType,
        bedrooms: ['off-plan', 'new-launches', 'exclusive-for-you'].includes(p.propertyType) ? p.bedroomsFrom : p.bedrooms,
        bedroomsFrom: p.bedroomsFrom,
        bedroomsTo: p.bedroomsTo,
        bathrooms: ['off-plan', 'new-launches', 'exclusive-for-you'].includes(p.propertyType) ? p.bathroomsFrom : p.bathrooms,
        size: ['off-plan', 'new-launches', 'exclusive-for-you'].includes(p.propertyType) ? p.sizeFrom : p.size,
        sizeFrom: p.sizeFrom,
        sizeSqft: (['off-plan', 'new-launches', 'exclusive-for-you'].includes(p.propertyType) ? p.sizeFrom : p.size)
          ? Conversions.sqmToSqft(['off-plan', 'new-launches', 'exclusive-for-you'].includes(p.propertyType) ? p.sizeFrom : p.size)
          : null,
        area: areaField,
        areaId: p.areaId,
        cityId: p.cityId,
        photos: photosArray,
        images: transformPhotos(p.photos),
        isForYouChoice: p.isForYouChoice,
        createdAt: p.createdAt,
      };

      if (isSummary) {
        return baseData;
      }

      return {
        ...p,
        ...baseData,
        sizeToSqft: p.sizeTo ? Conversions.sqmToSqft(p.sizeTo) : null,
        sizeFromSqft: p.sizeFrom ? Conversions.sqmToSqft(p.sizeFrom) : null,
      };
    });

    console.log('[Properties API] ✅ Response sent:', {
      loadedProperties: propertiesWithConversions.length,
      totalCount, // Загальна кількість з урахуванням фільтрів
      page: pageNum,
      requestedLimit: limitNum,
      actualLimit: finalLimit,
    });

    const totalPages = Math.ceil(totalCount / finalLimit);

    res.setHeader('Cache-Control', 'public, max-age=60');
    res.json({
      success: true,
      data: propertiesWithConversions,
      pagination: {
        total: totalCount,
        page: pageNum,
        limit: finalLimit,
        totalPages: totalPages,
      },
    });
  } catch (error: any) {
    console.error('Error fetching properties:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch properties',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
});

// Statistics endpoint - must be before /:id route
router.get('/stats', async (req: AuthRequest, res) => {
  try {
    const propertyRepo = AppDataSource.getRepository(Property);

    // Get counts by type using aggregation
    const propertyCounts: Record<string, number> = {};
    for (const type of Object.values(PropertyType)) {
      propertyCounts[type] = await propertyRepo.count({ where: { propertyType: type } });
    }

    // Get price statistics using query builder
    const priceStats = await propertyRepo
      .createQueryBuilder('property')
      .select([
        'MIN(CASE WHEN property."propertyType" IN (\'off-plan\', \'new-launches\', \'exclusive-for-you\') THEN property."priceFrom" ELSE property.price END) as minPrice',
        'MAX(CASE WHEN property."propertyType" IN (\'off-plan\', \'new-launches\', \'exclusive-for-you\') THEN property."priceFrom" ELSE property.price END) as maxPrice',
      ])
      .where('(property."propertyType" IN (\'off-plan\', \'new-launches\', \'exclusive-for-you\') AND property."priceFrom" IS NOT NULL) OR (property."propertyType" IN (\'secondary\', \'rent\', \'commercial\') AND property.price IS NOT NULL)')
      .getRawOne();

    // Get top cities with property counts
    const topCities = await propertyRepo
      .createQueryBuilder('property')
      .leftJoin('property.city', 'city')
      .select('city.nameEn', 'cityName')
      .addSelect('COUNT(property.id)', 'count')
      .groupBy('city.id, city.nameEn')
      .orderBy('COUNT(property.id)', 'DESC')
      .limit(5)
      .getRawMany();

    // Get bedrooms distribution for off-plan
    const bedroomsStats = await propertyRepo
      .createQueryBuilder('property')
      .select([
        'property."bedroomsFrom"',
        'property."bedroomsTo"',
        'COUNT(property.id) as count',
      ])
      .where('property."propertyType" IN (:...types)', { types: [PropertyType.OFF_PLAN, PropertyType.NEW_LAUNCHES, PropertyType.EXCLUSIVE_FOR_YOU] })
      .andWhere('(property."bedroomsFrom" IS NOT NULL OR property."bedroomsTo" IS NOT NULL)')
      .groupBy('property."bedroomsFrom", property."bedroomsTo"')
      .getRawMany();

    // Get unit types distribution
    const unitTypesStats = await propertyRepo
      .createQueryBuilder('property')
      .leftJoin('property.units', 'unit')
      .select('unit.type', 'type')
      .addSelect('COUNT(unit.id)', 'count')
      .where('unit.type IS NOT NULL')
      .groupBy('unit.type')
      .orderBy('COUNT(unit.id)', 'DESC')
      .limit(5)
      .getRawMany();

    // Format bedrooms stats
    const bedroomsMap = new Map<string, number>();
    bedroomsStats.forEach((stat: any) => {
      const from = stat.property_bedroomsFrom;
      const to = stat.property_bedroomsTo;
      let label = '';
      if (from && to) {
        label = `${from}-${to}`;
      } else if (from) {
        label = `${from}+`;
      }
      if (label) {
        bedroomsMap.set(label, parseInt(stat.count, 10));
      }
    });

    const bedroomsSorted = Array.from(bedroomsMap.entries())
      .sort((a, b) => {
        const aNum = parseInt(a[0]) || 0;
        const bNum = parseInt(b[0]) || 0;
        return aNum - bNum;
      });

    res.json(successResponse({
      totalProperties: Object.values(propertyCounts).reduce((a, b) => a + b, 0),
      offPlanProperties: propertyCounts[PropertyType.OFF_PLAN],
      secondaryProperties: propertyCounts[PropertyType.SECONDARY],
      propertyCounts, // Add full breakdown
      minPrice: priceStats?.minPrice ? parseFloat(priceStats.minPrice) : 0,
      maxPrice: priceStats?.maxPrice ? parseFloat(priceStats.maxPrice) : 0,
      topCities: topCities.map((city: any) => ({
        name: city.cityName,
        count: parseInt(city.count, 10),
      })),
      bedroomsDistribution: bedroomsSorted.map(([name, count]) => ({
        name: name + ' Beds',
        count,
      })),
      unitTypesDistribution: unitTypesStats.map((stat: any) => ({
        name: (stat.type || 'Unknown').charAt(0).toUpperCase() + (stat.type || 'Unknown').slice(1),
        count: parseInt(stat.count, 10),
      })),
    }));
  } catch (error: any) {
    console.error('Error fetching properties stats:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch properties stats',
    });
  }
});

import { PdfService } from '../services/pdf.service';

router.get('/:id/presentation', async (req, res) => {
  try {
    const propertyRepo = AppDataSource.getRepository(Property);
    const property = await propertyRepo.findOne({
      where: { id: req.params.id },
      relations: ['country', 'city', 'area', 'developer', 'facilities', 'units'],
    });

    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    // Prepare data for template (similar to partial conversion logic)
    // We want clean strings for the PDF
    let areaName = property.area?.nameEn || '';
    if (property.area && ['off-plan', 'new-launches', 'exclusive-for-you'].includes(property.propertyType) && property.city) {
      areaName = `${property.area.nameEn}, ${property.city.nameEn}`;
    }

    const presentationData = {
      ...property,
      area: areaName,
      city: property.city?.nameEn || '',
      developer: property.developer?.name || '',
      type: property.propertyType,
      completion: ['secondary', 'rent', 'commercial'].includes(property.propertyType) ? 'Ready' : (property.paymentPlan ? property.paymentPlan : 'Off-Plan'),
      price: property.price ? `$${property.price.toLocaleString()}` : null,
      priceFrom: property.priceFrom ? `$${property.priceFrom.toLocaleString()}` : null,
      size: property.size ? property.size.toLocaleString() : null,
      sizeFrom: property.sizeFrom ? property.sizeFrom.toLocaleString() : null,
      sizeTo: property.sizeTo ? property.sizeTo.toLocaleString() : null,
      facilities: property.facilities || []
    };

    const { agentName, agentPhone, agentEmail, agentPhoto } = req.query;
    let agent = null;
    if (agentName || agentPhone || agentEmail) {
      agent = {
        name: agentName ? String(agentName) : '',
        phone: agentPhone ? String(agentPhone) : '',
        email: agentEmail ? String(agentEmail) : '',
        photo: agentPhoto ? String(agentPhoto) : ''
      };
    }

    const pdfService = new PdfService();
    const pdfBuffer = await pdfService.generatePropertyPresentation(presentationData, agent);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${property.name.replace(/[^a-z0-9]/gi, '_')}.pdf"`,
      'Content-Length': pdfBuffer.length
    });

    res.send(pdfBuffer);

  } catch (error: any) {
    console.error('Error generating PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate presentation',
      error: error.message
    });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const identifier = req.params.id;
    console.log(`[DEBUG] Looking up property. Identifier: "${identifier}". Checking slug/UUID...`);
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);

    const property = await AppDataSource.getRepository(Property).findOne({
      where: isUuid ? { id: identifier } : { slug: identifier },
      relations: ['country', 'city', 'area', 'developer', 'facilities', 'units'],
    });

    if (!property) {
      console.log(`[DEBUG] Property NOT FOUND for identifier: "${identifier}"`);
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    const transformPhotos = (photos: string[] | null | undefined) => {
      if (!photos || !Array.isArray(photos)) return [];
      return photos.map(photo => {
        if (photo.includes('your-objectstorage.com')) {
          let small = photo;
          let full = photo;
          if (photo.includes('_small.jpg')) {
            full = photo.replace('_small.jpg', '_full.jpg');
          } else if (photo.includes('_full.jpg')) {
            small = photo.replace('_full.jpg', '_small.jpg');
          } else if (photo.includes('_small.webp')) {
            full = photo.replace('_small.webp', '_full.webp');
          } else if (photo.includes('_full.webp')) {
            small = photo.replace('_full.webp', '_small.webp');
          }
          return { small, full };
        }
        return { small: photo, full: photo };
      });
    };

    const response = {
      ...property,
      images: transformPhotos(property.photos),
      priceFromAED: property.priceFrom ? Conversions.usdToAed(property.priceFrom) : null,
      priceAED: property.price ? Conversions.usdToAed(property.price) : null,
      sizeFromSqft: property.sizeFrom ? Conversions.sqmToSqft(property.sizeFrom) : null,
      sizeToSqft: property.sizeTo ? Conversions.sqmToSqft(property.sizeTo) : null,
      sizeSqft: property.size ? Conversions.sqmToSqft(property.size) : null,
    };

    res.json(successResponse(response));
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    // Transform string values to numbers for numeric fields
    const propertyData = { ...req.body };

    // Transform latitude and longitude (they come as strings)
    // Valid ranges: latitude -90 to 90, longitude -180 to 180
    // Database: latitude decimal(10,8), longitude decimal(11,8)
    if (propertyData.latitude !== undefined && propertyData.latitude !== null) {
      const lat = parseFloat(propertyData.latitude);
      if (isNaN(lat) || lat < -90 || lat > 90) {
        return res.status(400).json({
          success: false,
          message: 'Latitude must be between -90 and 90',
        });
      }
      propertyData.latitude = lat;
    }
    if (propertyData.longitude !== undefined && propertyData.longitude !== null) {
      const lng = parseFloat(propertyData.longitude);
      if (isNaN(lng) || lng < -180 || lng > 180) {
        return res.status(400).json({
          success: false,
          message: 'Longitude must be between -180 and 180',
        });
      }
      propertyData.longitude = lng;
    }

    // Transform Off-Plan numeric fields
    if (propertyData.priceFrom !== undefined && propertyData.priceFrom !== null && propertyData.priceFrom !== '') {
      const price = parseFloat(propertyData.priceFrom);
      if (isNaN(price) || price < 0) {
        return res.status(400).json({
          success: false,
          message: 'Price from must be a valid positive number',
        });
      }
      propertyData.priceFrom = price;
    } else {
      propertyData.priceFrom = null;
    }

    if (propertyData.bedroomsFrom !== undefined && propertyData.bedroomsFrom !== null && propertyData.bedroomsFrom !== '') {
      const bedrooms = parseInt(propertyData.bedroomsFrom, 10);
      if (isNaN(bedrooms) || bedrooms < 0) {
        return res.status(400).json({
          success: false,
          message: 'Bedrooms from must be a valid positive integer',
        });
      }
      propertyData.bedroomsFrom = bedrooms;
    } else {
      propertyData.bedroomsFrom = null;
    }

    if (propertyData.bedroomsTo !== undefined && propertyData.bedroomsTo !== null && propertyData.bedroomsTo !== '') {
      const bedrooms = parseInt(propertyData.bedroomsTo, 10);
      if (isNaN(bedrooms) || bedrooms < 0) {
        return res.status(400).json({
          success: false,
          message: 'Bedrooms to must be a valid positive integer',
        });
      }
      propertyData.bedroomsTo = bedrooms;
    } else {
      propertyData.bedroomsTo = null;
    }

    if (propertyData.bathroomsFrom !== undefined && propertyData.bathroomsFrom !== null && propertyData.bathroomsFrom !== '') {
      const bathrooms = parseInt(propertyData.bathroomsFrom, 10);
      if (isNaN(bathrooms) || bathrooms < 0) {
        return res.status(400).json({
          success: false,
          message: 'Bathrooms from must be a valid positive integer',
        });
      }
      propertyData.bathroomsFrom = bathrooms;
    } else {
      propertyData.bathroomsFrom = null;
    }

    if (propertyData.bathroomsTo !== undefined && propertyData.bathroomsTo !== null && propertyData.bathroomsTo !== '') {
      const bathrooms = parseInt(propertyData.bathroomsTo, 10);
      if (isNaN(bathrooms) || bathrooms < 0) {
        return res.status(400).json({
          success: false,
          message: 'Bathrooms to must be a valid positive integer',
        });
      }
      propertyData.bathroomsTo = bathrooms;
    } else {
      propertyData.bathroomsTo = null;
    }

    if (propertyData.sizeFrom !== undefined && propertyData.sizeFrom !== null && propertyData.sizeFrom !== '') {
      const size = parseFloat(propertyData.sizeFrom);
      if (isNaN(size) || size < 0) {
        return res.status(400).json({
          success: false,
          message: 'Size from must be a valid positive number',
        });
      }
      propertyData.sizeFrom = size;
    } else {
      propertyData.sizeFrom = null;
    }

    if (propertyData.sizeTo !== undefined && propertyData.sizeTo !== null && propertyData.sizeTo !== '') {
      const size = parseFloat(propertyData.sizeTo);
      if (isNaN(size) || size < 0) {
        return res.status(400).json({
          success: false,
          message: 'Size to must be a valid positive number',
        });
      }
      propertyData.sizeTo = size;
    } else {
      propertyData.sizeTo = null;
    }

    // Transform Secondary numeric fields
    if (propertyData.price !== undefined && propertyData.price !== null && propertyData.price !== '') {
      const price = parseFloat(propertyData.price);
      if (isNaN(price) || price < 0) {
        return res.status(400).json({
          success: false,
          message: 'Price must be a valid positive number',
        });
      }
      propertyData.price = price;
    } else {
      propertyData.price = null;
    }

    if (propertyData.bedrooms !== undefined && propertyData.bedrooms !== null && propertyData.bedrooms !== '') {
      const bedrooms = parseInt(propertyData.bedrooms, 10);
      if (isNaN(bedrooms) || bedrooms < 0) {
        return res.status(400).json({
          success: false,
          message: 'Bedrooms must be a valid positive integer',
        });
      }
      propertyData.bedrooms = bedrooms;
    } else {
      propertyData.bedrooms = null;
    }

    if (propertyData.bathrooms !== undefined && propertyData.bathrooms !== null && propertyData.bathrooms !== '') {
      const bathrooms = parseInt(propertyData.bathrooms, 10);
      if (isNaN(bathrooms) || bathrooms < 0) {
        return res.status(400).json({
          success: false,
          message: 'Bathrooms must be a valid positive integer',
        });
      }
      propertyData.bathrooms = bathrooms;
    } else {
      propertyData.bathrooms = null;
    }

    if (propertyData.size !== undefined && propertyData.size !== null && propertyData.size !== '') {
      const size = parseFloat(propertyData.size);
      if (isNaN(size) || size < 0) {
        return res.status(400).json({
          success: false,
          message: 'Size must be a valid positive number',
        });
      }
      propertyData.size = size;
    } else {
      propertyData.size = null;
    }

    // Transform units if present
    if (propertyData.units && Array.isArray(propertyData.units)) {
      propertyData.units = propertyData.units.map((unit: any) => ({
        ...unit,
        totalSize: unit.totalSize ? parseFloat(unit.totalSize) : null,
        balconySize: unit.balconySize ? parseFloat(unit.balconySize) : null,
        price: unit.price ? parseFloat(unit.price) : null,
      }));
    }

    const property = await AppDataSource.getRepository(Property).save(propertyData);

    // Fetch with relations to return complete data
    const completeProperty = await AppDataSource.getRepository(Property).findOne({
      where: { id: property.id },
      relations: ['country', 'city', 'area', 'developer', 'facilities', 'units'],
    });

    res.json(successResponse(completeProperty));
  } catch (error: any) {
    console.error('Error creating property:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create property',
      error: error.message,
    });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    console.log('[DEBUG] PATCH property request body:', JSON.stringify(req.body, null, 2));
    const propertyRepo = AppDataSource.getRepository(Property);
    const property = await propertyRepo.findOne({
      where: { id: req.params.id },
      relations: ['facilities'],
    });

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found',
      });
    }

    // Filter out fields that don't exist in Property entity
    const allowedFields = [
      'name', 'slug', 'photos', 'description', 'latitude', 'longitude',
      'countryId', 'cityId', 'areaId', 'developerId',
      'priceFrom', 'bedroomsFrom', 'bedroomsTo', 'bathroomsFrom', 'bathroomsTo',
      'sizeFrom', 'sizeTo', 'paymentPlan',
      'price', 'bedrooms', 'bathrooms', 'size', 'propertyType',
      'isForYouChoice', 'descriptionRu', 'projectedRoi', 'isInvestorFeatured',
      'commission', 'plannedCompletionAt',
      // Scraper fields
      'externalId', 'propertyUrl', 'buildingName', 'communityName', 'displayAddress',
      'addedOn', 'verified', 'reference', 'rera', 'furnishing', 'agentName',
      'agentPhone', 'agentWhatsapp', 'agentEmail', 'agentInfo', 'brokerName',
      'brokerLogo', 'brokerInfo', 'priceDuration', 'propertySubType', 'priceCurrency',
      'type', 'sizeMin',
      // Reelly fields
      'status', 'saleStatus', 'readiness', 'serviceCharge', 'completionDatetime',
      'layoutsPdf', 'brochureUrl', 'depositDescription', 'videoUrl', 'mapPoints',
      'paymentPlansJson', 'masterPlan', 'lobby', 'interior', 'architecture'
    ];

    const updateData: any = {};
    Object.keys(req.body).forEach(key => {
      if (allowedFields.includes(key)) {
        updateData[key] = req.body[key];
      }
    });

    // Transform numeric fields
    if (updateData.latitude !== undefined && updateData.latitude !== null) {
      updateData.latitude = parseFloat(updateData.latitude);
    }
    if (updateData.longitude !== undefined && updateData.longitude !== null) {
      updateData.longitude = parseFloat(updateData.longitude);
    }
    if (updateData.priceFrom !== undefined && updateData.priceFrom !== null && updateData.priceFrom !== '') {
      updateData.priceFrom = parseFloat(updateData.priceFrom);
    } else if (updateData.priceFrom === '') {
      updateData.priceFrom = null;
    }
    if (updateData.price !== undefined && updateData.price !== null && updateData.price !== '') {
      updateData.price = parseFloat(updateData.price);
    } else if (updateData.price === '') {
      updateData.price = null;
    }
    if (updateData.bedroomsFrom !== undefined && updateData.bedroomsFrom !== null && updateData.bedroomsFrom !== '') {
      updateData.bedroomsFrom = parseInt(updateData.bedroomsFrom, 10);
    } else if (updateData.bedroomsFrom === '') {
      updateData.bedroomsFrom = null;
    }
    if (updateData.bedroomsTo !== undefined && updateData.bedroomsTo !== null && updateData.bedroomsTo !== '') {
      updateData.bedroomsTo = parseInt(updateData.bedroomsTo, 10);
    } else if (updateData.bedroomsTo === '') {
      updateData.bedroomsTo = null;
    }
    if (updateData.bedrooms !== undefined && updateData.bedrooms !== null && updateData.bedrooms !== '') {
      updateData.bedrooms = parseInt(updateData.bedrooms, 10);
    } else if (updateData.bedrooms === '') {
      updateData.bedrooms = null;
    }
    if (updateData.bathroomsFrom !== undefined && updateData.bathroomsFrom !== null && updateData.bathroomsFrom !== '') {
      updateData.bathroomsFrom = parseInt(updateData.bathroomsFrom, 10);
    } else if (updateData.bathroomsFrom === '') {
      updateData.bathroomsFrom = null;
    }
    if (updateData.bathroomsTo !== undefined && updateData.bathroomsTo !== null && updateData.bathroomsTo !== '') {
      updateData.bathroomsTo = parseInt(updateData.bathroomsTo, 10);
    } else if (updateData.bathroomsTo === '') {
      updateData.bathroomsTo = null;
    }
    if (updateData.bathrooms !== undefined && updateData.bathrooms !== null && updateData.bathrooms !== '') {
      updateData.bathrooms = parseInt(updateData.bathrooms, 10);
    } else if (updateData.bathrooms === '') {
      updateData.bathrooms = null;
    }
    if (updateData.sizeFrom !== undefined && updateData.sizeFrom !== null && updateData.sizeFrom !== '') {
      updateData.sizeFrom = parseFloat(updateData.sizeFrom);
    } else if (updateData.sizeFrom === '') {
      updateData.sizeFrom = null;
    }
    if (updateData.sizeTo !== undefined && updateData.sizeTo !== null && updateData.sizeTo !== '') {
      updateData.sizeTo = parseFloat(updateData.sizeTo);
    } else if (updateData.sizeTo === '') {
      updateData.sizeTo = null;
    }
    if (updateData.size !== undefined && updateData.size !== null && updateData.size !== '') {
      updateData.size = parseFloat(updateData.size);
    } else if (updateData.size === '') {
      updateData.size = null;
    }

    // Handle facilities separately (ManyToMany relation)
    if (req.body.facilities && Array.isArray(req.body.facilities)) {
      const facilityIds = req.body.facilities.map((f: any) => typeof f === 'string' ? f : f.id).filter(Boolean);
      const { Facility } = await import('../entities/Facility');
      const facilityRepo = AppDataSource.getRepository(Facility);
      const facilities = await facilityRepo.find({
        where: facilityIds.map((id: string) => ({ id })),
      });
      property.facilities = facilities;
    }

    // Update property fields
    Object.assign(property, updateData);
    await propertyRepo.save(property);

    // Fetch updated property with all relations
    const updatedProperty = await propertyRepo.findOne({
      where: { id: req.params.id },
      relations: ['country', 'city', 'area', 'developer', 'facilities', 'units'],
    });

    res.json(successResponse(updatedProperty));
  } catch (error: any) {
    console.error('Error updating property:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update property',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

router.delete('/:id', async (req, res) => {
  await AppDataSource.getRepository(Property).delete(req.params.id);
  res.json(successResponse(null, 'Property deleted'));
});

export default router;

