import express from 'express';
import { Brackets } from 'typeorm';
import { AppDataSource } from '../../config/database';
import { Property, PropertyType } from '../../entities/Property';
import { Country } from '../../entities/Country';
import { City } from '../../entities/City';
import { Area } from '../../entities/Area';
import { Developer } from '../../entities/Developer';
import { Facility } from '../../entities/Facility';
import { Course } from '../../entities/Course';
import { CourseProgress } from '../../entities/CourseProgress';
import { News } from '../../entities/News';
import { Vacancy, VacancyStatus } from '../../entities/Vacancy';
import { VacancyRequest } from '../../entities/VacancyRequest';
import { PropertyFinderProject } from '../../entities/PropertyFinderProject';
import { successResponse, errorResponse } from '../../utils/response';
import { Conversions } from '../../utils/conversions';
import { authenticateApiKeyWithSecret, AuthRequest } from '../../middleware/auth';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Curated list of areas to show in public API
const ALLOWED_AREAS = [
  'Al Barari',
  'Al Barsha 1',
  'Al Safa',
  'Arabian Ranches 3',
  'Arjan',
  'Barsha South',
  'Bluewaters Island',
  'Business Bay',
  'Cherrywoods',
  'City of Arabia',
  'Damac Hills 2',
  'Damac Lagoons',
  'Discovery Gardens',
  'Downtown Dubai',
  'Dubai Creek Harbour',
  'Dubai Design District',
  'Dubai Harbour',
  'Dubai Healthcare City',
  'Dubai Hills',
  'Dubai Industrial City',
  'Dubai International Financial Centre (DIFC)',
  'Dubai Internet City',
  'Dubai Investment Park',
  'Dubai Marina',
  'Dubai Maritime City',
  'Dubai Production City',
  'Dubai Silicon Oasis',
  'Dubai Sports City',
  'Dubai Studio City',
  'Dubailand',
  'International City',
  'Jumeirah Lake Towers (JLT)',
  'Jumeirah Village Triangle (JVT)',
  'La Mer',
  'Madinat Jumeirah Living',
  'Mina Rashid',
  'Mirdif Hills',
  'Mohammed Bin Rashid City (MBR)',
  'Motor City',
  'Sobha Hartland',
  'Tilal Al Ghaf',
  'Town Square',
  'Uptown Dubai',
  'Wadi Al Safa 4'
];

// Helper function to generate slug from title
function generateSlug(title: string): string {
  if (!title) return '';
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PROPERTY_ID_SUFFIX_REGEX = /(?:^property-|-)([0-9a-f]{8})$/i;

const joinPropertyRelations = (qb: any, relations: string[]) => {
  const aliases: Record<string, string> = {
    country: 'country',
    city: 'city',
    area: 'area',
    developer: 'developer',
    facilities: 'facilities',
    units: 'units',
    parentProject: 'parentProject'
  };

  relations.forEach((relation) => {
    const alias = aliases[relation] || relation;
    qb.leftJoinAndSelect(`property.${relation}`, alias);
  });
};

async function findPropertyByIdentifier(identifier: string, relations: string[] = []): Promise<Property | null> {
  const repo = AppDataSource.getRepository(Property);

  if (UUID_REGEX.test(identifier)) {
    const byId = await repo.findOne({ where: { id: identifier }, relations });
    if (byId) return byId;
  }

  const bySlug = await repo.findOne({ where: { slug: identifier }, relations });
  if (bySlug) return bySlug;

  const suffixMatch = identifier.match(PROPERTY_ID_SUFFIX_REGEX);
  if (suffixMatch) {
    const idSuffix = suffixMatch[1].toLowerCase();
    const qb = repo.createQueryBuilder('property');
    joinPropertyRelations(qb, relations);

    const bySuffix = await qb
      .where('LOWER(LEFT(property.id::text, 8)) = :idSuffix', { idSuffix })
      .orderBy('property."updatedAt"', 'DESC')
      .getOne();

    if (bySuffix) return bySuffix;
  }

  return null;
}

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

const AREA_PROXIMITY_POINTS = [
  {
    id: 'burj-khalifa',
    titleEn: 'Burj Khalifa',
    titleRu: 'Башня Халифа',
    coordinates: [55.2744, 25.1972] as [number, number]
  },
  {
    id: 'dubai-marina',
    titleEn: 'Dubai Marina',
    titleRu: 'Дубай Марина',
    coordinates: [55.1403, 25.08] as [number, number]
  },
  {
    id: 'dubai-airport',
    titleEn: 'Dubai Airport',
    titleRu: 'Международный аэропорт Дубая',
    coordinates: [55.3657, 25.2532] as [number, number]
  },
  {
    id: 'dubai-hills',
    titleEn: 'Dubai Hills',
    titleRu: 'Дубай Хиллс',
    coordinates: [55.244, 25.1048] as [number, number]
  }
];

const buildAreaContent = (area: any) => ({
  generalInformation: {
    en: area.content_general_information_en || null,
    ru: area.content_general_information_ru || null
  },
  quickAccessDescription: {
    en: area.content_quick_access_description_en || null,
    ru: area.content_quick_access_description_ru || null
  }
});

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

const normalizeUrl = (url: string | null | undefined) => {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  const domain = process.env.BACKEND_URL || 'https://admin.foryou-realestate.com';
  let path = url;
  if (path.startsWith('storage')) path = '/' + path;
  if (path.startsWith('uploads')) path = '/' + path;
  return `${domain}${path.startsWith('/') ? '' : '/'}${path}`;
};

// GET /api/public/news/latest - Get 3 most recent news articles
router.get('/news/latest', authenticateApiKeyWithSecret, async (req, res) => {
  try {
    console.log('[Public API] GET /api/public/news/latest request');

    const news = await AppDataSource.getRepository(News)
      .createQueryBuilder('news')
      .where('news.isPublished = :isPublished', { isPublished: true })
      .andWhere('news.publishedAt IS NOT NULL')
      .andWhere('news.publishedAt <= :now', { now: new Date() })
      .orderBy('news.publishedAt', 'DESC')
      .take(3)
      .getMany();

    const data = news.map(item => ({
      id: item.id,
      slug: generateSlug(item.title),
      title: item.title,
      titleRu: item.titleRu,
      description: item.description,
      descriptionRu: item.descriptionRu,
      image: item.imageUrl,
      publishedAt: item.publishedAt,
    }));

    res.json(successResponse(data));
  } catch (error: any) {
    console.error('Error fetching latest news:', error);
    res.status(500).json(errorResponse('Failed to fetch latest news', error.message));
  }
});

// GET /api/public/data - Get all public data (returns ALL properties from ALL areas, no filtering)
router.get('/data', authenticateApiKeyWithSecret, async (req: AuthRequest, res) => {
  try {
    console.log('[Public API] GET /api/public/data request:', {
      hasApiKey: !!req.apiKey,
      apiKeyName: req.apiKey?.name,
    });

    // Extract userId from JWT if present
    let userId: string | undefined;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        if (process.env.ADMIN_JWT_SECRET) {
          const decoded: any = jwt.verify(token, process.env.ADMIN_JWT_SECRET);
          userId = decoded.id || decoded.userId;
        }
      } catch (e) {
        // Ignore invalid token
      }
    }

    // Fetch ALL catalog data (excluding properties to keep payload light)
    const [countries, cities, areasRaw, developers, facilities, courses, progressList, pfLocations, pfDevelopers] = await Promise.all([
      AppDataSource.getRepository(Country).find({
        order: { nameEn: 'ASC' },
      }),
      AppDataSource.getRepository(City).find({
        relations: ['country'],
        order: { nameEn: 'ASC' },
      }),
      AppDataSource.getRepository(Area).find({
        relations: ['city', 'city.country'],
        order: { nameEn: 'ASC' },
      }),
      AppDataSource.getRepository(Developer).find({
        order: { name: 'ASC' },
      }),
      AppDataSource.getRepository(Facility).find({
        order: { nameEn: 'ASC' },
      }),
      AppDataSource.getRepository(Course).find({
        relations: ['contents', 'links'],
        order: { order: 'ASC' },
      }),
      userId ? AppDataSource.getRepository(CourseProgress).find({ where: { userId } }) : Promise.resolve([]),
      // Unique locations from Property Finder projects
      AppDataSource.query(`
        SELECT DISTINCT 
          location->>'id' as id, 
          COALESCE(location->>'name', location->>'path_name') as name,
          location->>'slug' as slug
        FROM property_finder_projects 
        WHERE location IS NOT NULL
        ORDER BY name ASC
      `),
      // Unique developers from Property Finder projects
      AppDataSource.query(`
        SELECT DISTINCT 
          developer->>'id' as id, 
          developer->>'name' as name,
          developer->>'slug' as slug
        FROM property_finder_projects 
        WHERE developer IS NOT NULL
        ORDER BY name ASC
      `),
    ]);

    const progressMap = new Map(progressList.map(p => [p.courseId, p]));

    // Parse area images from simple-array format
    // TypeORM simple-array automatically converts comma-separated string to array
    // But we need to ensure it's always an array and clean URLs
    const areas = areasRaw.map(area => {
      if (area.images) {
        let images: any = area.images;

        // TypeORM simple-array should return array, but handle both cases
        if (typeof images === 'string') {
          // Remove outer curly braces if present (PostgreSQL array format)
          let cleaned = images.trim();
          if (cleaned.startsWith('{') && cleaned.endsWith('}')) {
            cleaned = cleaned.slice(1, -1).trim();
          }
          // Split by comma and clean each URL
          images = cleaned
            .split(',')
            .map((url: string) => {
              let urlCleaned = url.trim();
              // Remove any remaining curly braces
              if (urlCleaned.startsWith('{') && urlCleaned.endsWith('}')) {
                urlCleaned = urlCleaned.slice(1, -1).trim();
              }
              return urlCleaned;
            })
            .filter((url: string) => url.length > 0);
        } else if (Array.isArray(images)) {
          // Already an array, just clean each URL
          images = images
            .map((url: any) => {
              if (typeof url !== 'string') return '';
              let urlCleaned = url.trim();
              // Remove any curly braces
              if (urlCleaned.startsWith('{') && urlCleaned.endsWith('}')) {
                urlCleaned = urlCleaned.slice(1, -1).trim();
              }
              return urlCleaned;
            })
            .filter((url: string) => url.length > 0 && (url.startsWith('http://') || url.startsWith('https://')));
        }

        area.images = Array.isArray(images) && images.length > 0 ? images : undefined;
      } else {
        area.images = undefined;
      }
      return area;
    });

    // Properties excluded for performance with 24k+ records
    const transformedProperties: any[] = [];
    
    // For summary metadata, get totals by type if needed, or just return empty for now since they are excluded
    const propertyCounts: Record<string, number> = {};
    // Note: Actually these counts were manually set to 0 in original code
    const secondaryCount = 0;
    const offPlanCount = 0;

    console.log('[Public API] ✅ Response sent:', {
      totalProperties: transformedProperties.length,
      propertyCounts,
    });

    res.json(successResponse({
      properties: transformedProperties,
      countries: countries.map(c => ({
        id: c.id,
        nameEn: c.nameEn,
        nameRu: c.nameRu,
        nameAr: c.nameAr,
        code: c.code,
      })),
      cities: cities.map(c => ({
        id: c.id,
        nameEn: c.nameEn,
        nameRu: c.nameRu,
        nameAr: c.nameAr,
        countryId: c.countryId,
        country: c.country ? {
          id: c.country.id,
          nameEn: c.country.nameEn,
          nameRu: c.country.nameRu,
          nameAr: c.country.nameAr,
          code: c.country.code,
        } : null,
      })),
      areas: areas.map(a => ({
        id: a.id,
        nameEn: a.nameEn,
        nameRu: a.nameRu,
        nameAr: a.nameAr,
        cityId: a.cityId,
        city: a.city ? {
          id: a.city.id,
          nameEn: a.city.nameEn,
          nameRu: a.city.nameRu,
          nameAr: a.city.nameAr,
          countryId: a.city.countryId,
          country: a.city.country ? {
            id: a.city.country.id,
            nameEn: a.city.country.nameEn,
            nameRu: a.city.country.nameRu,
            nameAr: a.city.country.nameAr,
            code: a.city.country.code,
          } : null,
        } : null,
        description: a.description || null,
        infrastructure: a.infrastructure || null,
        images: a.images || null,
      })),
      developers: developers.map(d => ({
        id: d.id,
        name: d.name,
        logo: normalizeUrl(d.logo),
        description: d.description,
        createdAt: d.createdAt,
      })),
      facilities: facilities.map(f => ({
        id: f.id,
        nameEn: f.nameEn,
        nameRu: f.nameRu,
        nameAr: f.nameAr,
        iconName: f.iconName,
        createdAt: f.createdAt,
      })),
      courses: courses.map(c => ({
        id: c.id,
        title: c.title,
        description: c.description,
        order: c.order,
        contents: c.contents?.sort((a, b) => a.order - b.order).map(content => ({
          id: content.id,
          type: content.type,
          title: content.title,
          description: content.description,
          imageUrl: content.imageUrl,
          videoUrl: content.videoUrl,
          order: content.order,
        })) || [],
        links: c.links?.sort((a, b) => a.order - b.order).map(link => ({
          id: link.id,
          title: link.title,
          url: link.url,
          order: link.order,
        })) || [],
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        userProgress: progressMap.has(c.id) ? {
          status: progressMap.get(c.id)!.status,
          completionPercentage: progressMap.get(c.id)!.progressPercentage
        } : {
          status: 'NOT_STARTED',
          completionPercentage: 0
        }
      })),
      meta: {
        totalProperties: transformedProperties.length,
        totalSecondaryProperties: secondaryCount,
        totalOffPlanProperties: offPlanCount,
        propertyCounts, // Add empty for now as it's not populated here
        totalCountries: countries.length,
        totalCities: cities.length,
        totalAreas: areas.length,
        totalDevelopers: developers.length,
        totalFacilities: facilities.length,
        totalCourses: courses.length,
        lastUpdated: new Date().toISOString(),
      },
      propertyFinder: {
        locations: pfLocations,
        developers: pfDevelopers
      }
    }));
  } catch (error: any) {
    console.error('Error fetching public data:', error);
    res.status(500).json(errorResponse('Failed to fetch data', error.message));
  }
});

// GET /api/public/courses - Get all courses (public access with API key)
router.get('/courses', authenticateApiKeyWithSecret, async (req, res) => {
  try {
    // Extract userId from JWT if present
    let userId: string | undefined;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        if (process.env.ADMIN_JWT_SECRET) {
          const decoded: any = jwt.verify(token, process.env.ADMIN_JWT_SECRET);
          userId = decoded.id || decoded.userId;
        }
      } catch (e) {
        // Ignore invalid token
      }
    }

    const [courses, progressList] = await Promise.all([
      AppDataSource.getRepository(Course).find({
        relations: ['contents', 'links'],
        order: { order: 'ASC' },
      }),
      userId ? AppDataSource.getRepository(CourseProgress).find({ where: { userId } }) : Promise.resolve([]),
    ]);

    const progressMap = new Map(progressList.map(p => [p.courseId, p]));

    const transformedCourses = courses.map(c => ({
      id: c.id,
      title: c.title,
      description: c.description,
      order: c.order,
      contents: c.contents?.sort((a, b) => a.order - b.order).map(content => ({
        id: content.id,
        type: content.type,
        title: content.title,
        description: content.description,
        imageUrl: content.imageUrl,
        videoUrl: content.videoUrl,
        order: content.order,
      })) || [],
      links: c.links?.sort((a, b) => a.order - b.order).map(link => ({
        id: link.id,
        title: link.title,
        url: link.url,
        order: link.order,
      })) || [],
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      userProgress: progressMap.has(c.id) ? {
        status: progressMap.get(c.id)!.status,
        completionPercentage: progressMap.get(c.id)!.progressPercentage
      } : {
        status: 'NOT_STARTED',
        completionPercentage: 0
      }
    }));

    res.json(successResponse(transformedCourses));
  } catch (error: any) {
    console.error('Error fetching courses:', error);
    res.status(500).json(errorResponse('Failed to fetch courses', error.message));
  }
});

// GET /api/public/courses/:id - Get single course by ID
router.get('/courses/:id', authenticateApiKeyWithSecret, async (req, res) => {
  try {
    const course = await AppDataSource.getRepository(Course).findOne({
      where: { id: req.params.id },
      relations: ['contents', 'links'],
    });

    if (!course) {
      return res.status(404).json(errorResponse('Course not found'));
    }

    // Extract userId from JWT if present
    let userId: string | undefined;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        if (process.env.ADMIN_JWT_SECRET) {
          const decoded: any = jwt.verify(token, process.env.ADMIN_JWT_SECRET);
          userId = decoded.id || decoded.userId;
        }
      } catch (e) {
        // Ignore invalid token
      }
    }

    let progress = userId ? await AppDataSource.getRepository(CourseProgress)
      .findOne({ where: { userId, courseId: course.id } }) : null;

    const transformedCourse = {
      id: course.id,
      title: course.title,
      description: course.description,
      order: course.order,
      contents: course.contents?.sort((a, b) => a.order - b.order).map(content => ({
        id: content.id,
        type: content.type,
        title: content.title,
        description: content.description,
        imageUrl: content.imageUrl,
        videoUrl: content.videoUrl,
        order: content.order,
      })) || [],
      links: course.links?.sort((a, b) => a.order - b.order).map(link => ({
        id: link.id,
        title: link.title,
        url: link.url,
        order: link.order,
      })) || [],
      createdAt: course.createdAt,
      updatedAt: course.updatedAt,
      userProgress: progress ? {
        status: progress.status,
        completionPercentage: progress.progressPercentage
      } : {
        status: 'NOT_STARTED',
        completionPercentage: 0
      }
    };

    res.json(successResponse(transformedCourse));
  } catch (error: any) {
    console.error('Error fetching course:', error);
    res.status(500).json(errorResponse('Failed to fetch course', error.message));
  }
});

// GET /api/public/featured-areas - Optimized endpoint for popular locations
router.get('/featured-areas', authenticateApiKeyWithSecret, async (req: AuthRequest, res) => {
  try {
    console.log('[Public API] GET /api/public/featured-areas request');

    const data = await AppDataSource.getRepository(Area).createQueryBuilder('area')
      .leftJoin(Property, 'property', 'property.areaId = area.id')
      .select([
        'area.id as id',
        'area.slug as slug',
        'area.nameEn as "nameEn"',
        'area.nameRu as "nameRu"',
        'area.mainImage as "mainImage"',
        'area.images as images',
        'area.isFeatured as "isFeatured"',
        'area.priority as priority'
      ])
      .addSelect('COUNT(property.id)::int', 'propertiesCount')
      .where('area.isactive = :isActive', { isActive: true })
      .andWhere('area.nameEn IN (:...names)', { names: ALLOWED_AREAS })
      .groupBy('area.id, area.slug, area.nameEn, area.nameRu, area.mainimage, area.images, area.isfeatured, area.priority')
      .having('COUNT(property.id) > 0')
      .orderBy('area.priority', 'DESC')
      .addOrderBy('COUNT(property.id)', 'DESC')
      .getRawMany();

    const transformedData = data.map(item => {
      const imagesArray = parseSimpleArray(item.images);
      let mainImage = item.mainImage;

      if (!mainImage && imagesArray.length > 0 && imagesArray[0]) {
        mainImage = imagesArray[0];
      }

      if (mainImage && (mainImage.startsWith('/storage') || mainImage.startsWith('/uploads'))) {
        const domain = process.env.BACKEND_URL || 'https://admin.foryou-realestate.com';
        mainImage = `${domain}${mainImage}`;
      }

      return {
        id: item.id,
        slug: item.slug,
        nameEn: item.nameEn,
        nameRu: item.nameRu,
        mainImage: mainImage,
        propertiesCount: item.propertiesCount,
        isFeatured: item.isFeatured,
        priority: item.priority
      };
    });

    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.json(successResponse(transformedData));
  } catch (error: any) {
    console.error('Error fetching featured-areas:', error);
    res.status(500).json(errorResponse('Failed to fetch featured areas', error.message));
  }
});

// GET /api/public/areas/featured - Get featured/popular areas for home page
router.get('/areas/featured', authenticateApiKeyWithSecret, async (req: AuthRequest, res) => {
  try {
    console.log('[Public API] GET /api/public/areas/featured request');

    // Priority list of area names
    const FEATURED_AREA_NAMES = [
      'Jumeirah Lake Towers (JLT)',
      'Downtown Dubai',
      'Madinat Jumeirah Living',
      'Damac Hills 2',
      'Dubai Harbour',
      'Dubai Marina'
    ];

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();

    let areas: any[] = [];
    try {
      // Fetch featured areas by the isfeatured flag
      const areasRaw = await queryRunner.query(`
        SELECT 
          area.id,
          area."cityId",
          area."nameEn",
          area."nameRu",
          area."nameAr",
          area.description,
          area."descriptionRu",
          area.images,
          area.mainimage,
          area.slug,
          area.isfeatured,
          area.priority
        FROM areas area
        WHERE area.isactive = true 
        AND area.isfeatured = true
        ORDER BY area.priority DESC, area."nameEn" ASC
      `);

      const areaIds = areasRaw.map((a: any) => a.id);

      if (areaIds.length > 0) {
        // Fetch related City and Country data
        const citiesData = await queryRunner.query(`
          SELECT DISTINCT
            city.id,
            city."nameEn",
            city."nameRu",
            city."nameAr",
            city."countryId"
          FROM cities city
          WHERE city.id IN (
            SELECT DISTINCT "cityId" FROM areas WHERE id = ANY($1::uuid[])
          )
        `, [areaIds]);

        const countryIds = [...new Set(citiesData.map((c: any) => c.countryId))];
        const countriesData = countryIds.length > 0 ? await queryRunner.query(`
          SELECT 
            country.id,
            country."nameEn",
            country."nameRu",
            country."nameAr",
            country.code
          FROM countries country
          WHERE country.id = ANY($1::uuid[])
        `, [countryIds]) : [];

        const citiesMap = new Map(citiesData.map((c: any) => [c.id, c]));
        const countriesMap = new Map(countriesData.map((c: any) => [c.id, c]));

        areas = areasRaw.map((areaRaw: any) => {
          const city: any = citiesMap.get(areaRaw.cityId);
          const country: any = city ? countriesMap.get(city.countryId) : null;

          return {
            id: areaRaw.id,
            cityId: areaRaw.cityId,
            nameEn: areaRaw.nameEn,
            nameRu: areaRaw.nameRu,
            nameAr: areaRaw.nameAr,
            city: city ? {
              id: city.id,
              nameEn: city.nameEn,
              nameRu: city.nameRu,
              nameAr: city.nameAr,
              countryId: city.countryId,
              country: country ? {
                id: country.id,
                nameEn: country.nameEn,
                nameRu: country.nameRu,
                nameAr: country.nameAr,
                code: country.code,
              } : null,
            } : null,
            description: areaRaw.description || null,
            infrastructure: areaRaw.infrastructure || null,
            images: areaRaw.images || null,
          };
        });
      }
    } finally {
      await queryRunner.release();
    }

    if (areas.length === 0) {
      return res.json(successResponse([]));
    }

    const areaIds = areas.map(a => a.id);

    // Calculate project counts
    const countsQuery = await AppDataSource
      .getRepository(Property)
      .createQueryBuilder('property')
      .select('property.areaId', 'areaId')
      .addSelect('COUNT(property.id)', 'total')
      .addSelect("SUM(CASE WHEN property.propertyType IN ('off-plan', 'new-launches', 'exclusive-for-you') THEN 1 ELSE 0 END)", 'offPlan')
      .addSelect("SUM(CASE WHEN property.propertyType IN ('secondary', 'rent', 'commercial') THEN 1 ELSE 0 END)", 'secondary')
      .where('property.areaId IN (:...areaIds)', { areaIds }) // Removed 'off-plan' only filter to get true totals
      .groupBy('property.areaId')
      .getRawMany();

    const areaPropertyCounts = new Map<string, { total: number; offPlan: number; secondary: number }>();
    areas.forEach(a => areaPropertyCounts.set(a.id, { total: 0, offPlan: 0, secondary: 0 }));

    countsQuery.forEach((row: any) => {
      areaPropertyCounts.set(row.areaId, {
        total: parseInt(row.total, 10) || 0,
        offPlan: parseInt(row.offPlan, 10) || 0,
        secondary: parseInt(row.secondary, 10) || 0,
      });
    });

    const processedAreas = areas.map(area => {
      const counts = areaPropertyCounts.get(area.id)!;
      return {
        ...area,
        projectsCount: counts
      };
    });

    // Filters:
    // 1. projectsCount.total > 0
    // 2. Has images (images array exists and length > 0)
    const filteredAreas = processedAreas.filter(area => {
      const hasProjects = area.projectsCount.total > 0;

      let hasImages = false;
      if (area.images) {
        if (Array.isArray(area.images) && area.images.length > 0) hasImages = true;
        else if (typeof area.images === 'string' && area.images.length > 2) hasImages = true; // "{}", "[]" loose check, logic matches main EP parsing 
      }

      return hasProjects && hasImages;
    });

    // Formatting images strictly as array (same logic as main endpoint)
    const formattedAreas = filteredAreas.map(area => {
      let images: any = area.images;
      if (typeof images === 'string') {
        let cleaned = images.trim();
        if (cleaned.startsWith('{') && cleaned.endsWith('}')) cleaned = cleaned.slice(1, -1).trim();
        images = cleaned.split(',').map((url: string) => {
          let urlCleaned = url.trim();
          if (urlCleaned.startsWith('{') && urlCleaned.endsWith('}')) urlCleaned = urlCleaned.slice(1, -1).trim();
          return urlCleaned;
        }).filter((url: string) => url.length > 0);
      }

      // Ensure we strictly have an array for the response
      if (!Array.isArray(images)) images = [];

      return {
        ...area,
        description: area.description || null,
        infrastructure: area.infrastructure || null,
        images: images.length > 0 ? images : null
      };
    });

    // Additional check after formatting: ensure images is not null if we strictly require images
    const finalValidAreas = formattedAreas.filter(a => a.images !== null && a.images.length > 0);

    // Sorting: Matches the order in FEATURED_AREA_NAMES
    finalValidAreas.sort((a, b) => {
      const indexA = FEATURED_AREA_NAMES.indexOf(a.nameEn);
      const indexB = FEATURED_AREA_NAMES.indexOf(b.nameEn);
      return indexA - indexB;
    });

    res.json(successResponse(finalValidAreas));

  } catch (error: any) {
    console.error('Error fetching featured areas:', error);
    res.status(500).json(errorResponse('Failed to fetch featured areas', error.message));
  }
});

// GET /api/public/areas - Get all areas with project counts
// GET /api/public/areas - Get all areas with project counts
router.get('/areas', authenticateApiKeyWithSecret, async (req: AuthRequest, res) => {
  try {
    const { cityId, page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      // Use shared ALLOWED_AREAS constant

      // Base WHERE clause: active AND has properties AND is in allowed list
      let whereClause = `
        WHERE area.isactive = true 
        AND EXISTS (SELECT 1 FROM properties p WHERE p."areaId" = area.id)
      `;

      const whereParams: any[] = [];
      let paramIndex = 1;

      // Add filter by allowed names
      whereClause += ` AND area."nameEn" = ANY($${paramIndex++}::text[])`;
      whereParams.push(ALLOWED_AREAS);

      if (cityId) {
        whereClause += ` AND area."cityId" = $${paramIndex++}`;
        whereParams.push(cityId);
      }

      // Get count of areas that have active properties
      const countResult = await queryRunner.query(`
         SELECT COUNT(*) as total FROM areas area ${whereClause}
       `, whereParams);
      const totalItems = parseInt(countResult[0].total, 10);

      // Fetch areas with exactly the requested fields
      const areasRaw = await queryRunner.query(`
         SELECT 
           area.id,
           area."cityId",
           area."nameEn",
           area."nameRu",
           area."nameAr",
           area.description,
           area."descriptionRu",
           area.infrastructure,
           area.images,
           area.mainimage,
           area.slug,
           area.isfeatured,
           area.priority,
           area.content_general_information_en,
           area.content_general_information_ru,
           area.content_quick_access_description_en,
           area.content_quick_access_description_ru
         FROM areas area
         ${whereClause}
         ORDER BY area.priority DESC, area."nameEn" ASC
         LIMIT $${paramIndex++} OFFSET $${paramIndex++}
       `, [...whereParams, limitNum, skip]);

      const areaIds = areasRaw.map((a: any) => a.id);
      let data: any[] = [];

      if (areaIds.length > 0) {
        // Fetch cities
        const citiesData = await queryRunner.query(`
           SELECT id, "nameEn", "nameRu"
           FROM cities
           WHERE id = ANY($1::uuid[])
         `, [[...new Set(areasRaw.map((a: any) => a.cityId)) as any]]);
        const citiesMap = new Map(citiesData.map((c: any) => [c.id, c]));

        // Get property stats
        const statsQuery = await AppDataSource.getRepository(Property)
          .createQueryBuilder('p')
          .select('p.areaId', 'areaId')
          .addSelect('COUNT(p.id)', 'total')
          .addSelect("SUM(CASE WHEN p.propertyType IN ('off-plan', 'new-launches', 'exclusive-for-you') THEN 1 ELSE 0 END)", 'offPlan')
          .addSelect("SUM(CASE WHEN p.propertyType IN ('secondary', 'rent', 'commercial') THEN 1 ELSE 0 END)", 'secondary')
          .where('p.areaId IN (:...areaIds)', { areaIds })
          .groupBy('p.areaId')
          .getRawMany();

        const statsMap = new Map();
        statsQuery.forEach(s => {
          statsMap.set(s.areaId, {
            totalProperties: parseInt(s.total, 10) || 0,
            offPlan: parseInt(s.offPlan, 10) || 0,
            secondary: parseInt(s.secondary, 10) || 0
          });
        });

        data = areasRaw.map((area: any) => {
          const city = citiesMap.get(area.cityId);
          const stats = statsMap.get(area.id) || { totalProperties: 0, offPlan: 0, secondary: 0 };

          const imagesArray = parseSimpleArray(area.images);
          let mainImage = area.mainimage; // Fixed from mainImage to mainimage

          if (!mainImage && imagesArray.length > 0 && imagesArray[0]) {
            mainImage = imagesArray[0];
          }

          if (typeof mainImage === 'string') {
            mainImage = mainImage.trim();
            if (mainImage.startsWith('{')) mainImage = mainImage.substring(1);
            if (mainImage.endsWith('}')) mainImage = mainImage.substring(0, mainImage.length - 1);
          }

          if (mainImage && (mainImage.startsWith('/storage') || mainImage.startsWith('/uploads'))) {
            const domain = process.env.BACKEND_URL || 'https://admin.foryou-realestate.com';
            mainImage = `${domain}${mainImage}`;
          }

          return {
            id: area.id,
            cityId: area.cityId,
            nameEn: area.nameEn,
            nameRu: area.nameRu,
            nameAr: area.nameAr,
            slug: area.slug || generateSlug(area.nameEn),
            mainImage,
            images: imagesArray,
            descriptionEn: area.description?.description || '',
            descriptionRu: area.descriptionRu?.description || '',
            infrastructure: area.infrastructure || null,
            content: buildAreaContent(area),
            proximityPoints: AREA_PROXIMITY_POINTS,
            city: city ? {
              id: (city as any).id,
              nameEn: (city as any).nameEn,
              nameRu: (city as any).nameRu
            } : null,
            projectsCount: {
              total: stats.totalProperties,
              offPlan: stats.offPlan,
              secondary: stats.secondary
            }
          };
        });
      }

      res.json(successResponse({
        data,
        meta: {
          pagination: {
            page: pageNum,
            pageSize: limitNum,
            pageCount: Math.ceil(totalItems / limitNum),
            total: totalItems
          }
        }
      }));
    } finally {
      await queryRunner.release();
    }
  } catch (error: any) {
    console.error('Error fetching areas:', error);
    res.status(500).json(errorResponse('Failed to fetch areas', error.message));
  }
});

// GET /api/public/developers - Get all developers with project counts
// GET /api/public/developers/featured - Get featured developers
router.get('/developers/featured', authenticateApiKeyWithSecret, async (req: AuthRequest, res) => {
  try {
    console.log('[Public API] GET /api/public/developers/featured request');

    const FEATURED_DEVELOPER_NAMES = [
      'Emaar Properties',
      'Damac',
      'Yas Developers',
      'Danube',
      'Azizi',
      'Binghatti',
      'Imtiaz',
      'Meraas'
    ];

    const developers = await AppDataSource.getRepository(Developer).find({
      where: FEATURED_DEVELOPER_NAMES.map(name => ({ name })),
    });

    // In case some names didn't match perfectly, try search with ILIKE for the missing ones
    if (developers.length < FEATURED_DEVELOPER_NAMES.length) {
      const foundNames = new Set(developers.map(d => d.name));
      const missingNames = FEATURED_DEVELOPER_NAMES.filter(n => !foundNames.has(n));

      for (const name of missingNames) {
        const fuzzyMatch = await AppDataSource.getRepository(Developer)
          .createQueryBuilder('dev')
          .where('dev.name ILIKE :name', { name: `%${name}%` })
          .getOne();
        if (fuzzyMatch && !foundNames.has(fuzzyMatch.name)) {
          developers.push(fuzzyMatch);
          foundNames.add(fuzzyMatch.name);
        }
      }
    }

    // Get counts for these developers
    const developerIds = developers.map(d => d.id);
    let countsQuery: any[] = [];
    if (developerIds.length > 0) {
      countsQuery = await AppDataSource
        .getRepository(Property)
        .createQueryBuilder('property')
        .select('property.developerId', 'developerId')
        .addSelect('COUNT(property.id)', 'total')
        .where('property.developerId IN (:...developerIds)', { developerIds })
        .groupBy('property.developerId')
        .getRawMany();
    }

    const normalizeUrl = (url: string | null | undefined) => {
      if (!url) return null;
      if (url.startsWith('http')) return url;
      const domain = process.env.BACKEND_URL || 'https://admin.foryou-realestate.com';
      let path = url;
      if (path.startsWith('storage')) path = '/' + path;
      if (path.startsWith('uploads')) path = '/' + path;
      return `${domain}${path.startsWith('/') ? '' : '/'}${path}`;
    };

    const countsMap = new Map(countsQuery.map(c => [c.developerId, parseInt(c.total, 10)]));

    const response = developers.map(d => {
      const rawImages = (d.images || []).map(img => normalizeUrl(img)).filter(Boolean) as string[];
      let imagesArray = rawImages;
      let previewImage = normalizeUrl(d.previewImage) || null; // Strictly null if empty

      if (rawImages.length > 2) {
        imagesArray = rawImages.slice(1, -1);
        if (!previewImage) previewImage = rawImages[1] || null;
      } else {
        imagesArray = [];
        if (!previewImage && rawImages.length > 0) {
          previewImage = rawImages[0] || null;
        }
      }

      return {
        id: d.id,
        name: d.name,
        nameEn: d.name,
        nameRu: d.nameRu || d.name,
        slug: d.slug || generateSlug(d.name),
        logo: normalizeUrl(d.logo) || null,
        previewImage,
        images: imagesArray,
        projectsCount: countsMap.get(d.id) || 0
      };
    });

    // Sort according to the priority list
    response.sort((a, b) => {
      const indexA = FEATURED_DEVELOPER_NAMES.findIndex(n => a.name.includes(n));
      const indexB = FEATURED_DEVELOPER_NAMES.findIndex(n => b.name.includes(n));
      return indexA - indexB;
    });

    res.json(successResponse(response));
  } catch (error: any) {
    res.status(500).json(errorResponse('Failed to fetch featured developers', error.message));
  }
});

router.get('/developers', authenticateApiKeyWithSecret, async (req: AuthRequest, res) => {
  try {
    const { summary, page = '1', limit = '20' } = req.query;
    const isSummary = summary === 'true';
    const pageNum = parseInt(page.toString(), 10) || 1;
    const limitNum = parseInt(limit.toString(), 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    console.log('[Public API] GET /api/public/developers request:', {
      isSummary,
      page: pageNum,
      limit: limitNum,
      hasApiKey: !!req.apiKey,
    });

    // Отримуємо developers з пагінацією
    const [developers, totalCount] = await AppDataSource.getRepository(Developer).findAndCount({
      order: { name: 'ASC' },
      skip,
      take: limitNum,
    });

    const developerIds = developers.map(d => d.id);

    // Підрахунок properties (тільки off-plan для каталогу проектів)
    let countsQuery: any[] = [];
    if (developerIds.length > 0) {
      countsQuery = await AppDataSource
        .getRepository(Property)
        .createQueryBuilder('property')
        .select('property.developerId', 'developerId')
        .addSelect('COUNT(property.id)', 'total')
        .addSelect(
          "SUM(CASE WHEN property.propertyType IN ('off-plan', 'new-launches', 'exclusive-for-you') THEN 1 ELSE 0 END)",
          'offPlan'
        )
        .addSelect(
          "SUM(CASE WHEN property.propertyType IN ('secondary', 'rent', 'commercial') THEN 1 ELSE 0 END)",
          'secondary'
        )
        .where('property.developerId IN (:...developerIds)', { developerIds })
        .groupBy('property.developerId')
        .getRawMany();
    }

    const developerPropertyCounts = new Map<string, {
      total: number;
      offPlan: number;
      secondary: number;
    }>();

    developers.forEach(developer => {
      developerPropertyCounts.set(developer.id, {
        total: 0,
        offPlan: 0,
        secondary: 0,
      });
    });

    countsQuery.forEach((row: any) => {
      developerPropertyCounts.set(row.developerId, {
        total: parseInt(row.total, 10) || 0,
        offPlan: parseInt(row.offPlan, 10) || 0,
        secondary: parseInt(row.secondary, 10) || 0,
      });
    });

    const result = developers.map(developer => {
      const counts = developerPropertyCounts.get(developer.id) || { total: 0, offPlan: 0, secondary: 0 };

      const developerSlug = developer.slug || generateSlug(developer.name);

      // Handle images array to find a preview and hide first/last
      const rawImages = (developer.images || []).map(img => normalizeUrl(img)).filter(Boolean) as string[];
      let imagesArray = rawImages;
      let previewImage = normalizeUrl(developer.previewImage) || null; // Strictly null if empty

      if (rawImages.length > 2) {
        imagesArray = rawImages.slice(1, -1);
        if (!previewImage) previewImage = rawImages[1] || null;
      } else {
        imagesArray = [];
        if (!previewImage && rawImages.length > 0) {
          previewImage = rawImages[0] || null;
        }
      }

      const logo = normalizeUrl(developer.logo) || null;

      if (isSummary) {
        // Lightweight object for catalog list
        const descStr = developer.description || '';
        const shortDescription = descStr.substring(0, 200) + (descStr.length > 200 ? '...' : '');

        return {
          id: developer.id,
          name: developer.name,
          nameEn: developer.name,
          nameRu: developer.nameRu || developer.name,
          slug: developerSlug,
          logo,
          previewImage,
          images: imagesArray, // Send filtered images back
          shortDescription,
          projectsCount: counts.offPlan, // Usually we care about off-plan in developer lists
          totalProjects: counts.total
        };
      }

      // Full object (though main EP should probably be for list)
      return {
        id: developer.id,
        name: developer.name,
        nameEn: developer.name,
        nameRu: developer.nameRu || developer.name,
        slug: developerSlug,
        logo,
        previewImage,
        description: developer.description || null,
        descriptionEn: developer.description || null,
        descriptionRu: developer.descriptionRu || null,
        images: imagesArray,
        projectsCount: {
          total: counts.total,
          offPlan: counts.offPlan,
          secondary: counts.secondary,
        },
        createdAt: developer.createdAt,
      };
    });

    res.json(successResponse({
      data: result,
      meta: {
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limitNum)
        }
      }
    }));
  } catch (error: any) {
    console.error('Error fetching developers:', error);
    res.status(500).json(errorResponse('Failed to fetch developers', error.message));
  }
});

// GET /api/public/developers/:idOrSlug - Get single developer by ID or Slug
router.get('/developers/:identifier', authenticateApiKeyWithSecret, async (req: AuthRequest, res) => {
  try {
    const { identifier } = req.params;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);

    console.log('[Public API] GET /api/public/developers/:identifier request:', {
      identifier,
      isUuid,
    });

    // Отримуємо developer по ID або Slug
    // Якщо slug порожній в БД, пробуємо знайти по UUID або через повнотекстовий пошук за ім'ям (спрощено)
    let developer = await AppDataSource.getRepository(Developer).findOne({
      where: isUuid ? { id: identifier } : { slug: identifier },
      relations: ['areas', 'communities', 'communities.area']
    });

    // Fallback: якщо не знайшли по slug, пробуємо знайти девелопера, чий згенерований slug збігається з identifier
    if (!developer && !isUuid) {
      console.log(`[Public API] Developer NOT found by slug "${identifier}", performing fallback search...`);
      const allDevs = await AppDataSource.getRepository(Developer).find({
        relations: ['areas', 'communities', 'communities.area']
      });
      developer = allDevs.find(d => (d.slug || generateSlug(d.name)) === identifier) ?? null;
    }

    if (!developer) {
      return res.status(404).json(errorResponse('Developer not found'));
    }

    // Отримуємо підрахунок properties для цього developer
    const countsQuery = await AppDataSource
      .getRepository(Property)
      .createQueryBuilder('property')
      .select('COUNT(property.id)', 'total')
      .addSelect(
        "SUM(CASE WHEN property.propertyType IN ('off-plan', 'new-launches', 'exclusive-for-you') THEN 1 ELSE 0 END)",
        'offPlan'
      )
      .addSelect(
        "SUM(CASE WHEN property.propertyType IN ('secondary', 'rent', 'commercial') THEN 1 ELSE 0 END)",
        'secondary'
      )
      .where('property.developerId = :developerId', { developerId: developer.id })
      .getRawOne();

    const counts = {
      total: parseInt(countsQuery?.total || '0', 10),
      offPlan: parseInt(countsQuery?.offPlan || '0', 10),
      secondary: parseInt(countsQuery?.secondary || '0', 10),
    };

    const logo = normalizeUrl(developer.logo) || null;
    const gallery = (developer.images || []).map(img => normalizeUrl(img)).filter(Boolean) as string[];

    const developerResponse = {
      id: developer.id,
      name: developer.name,
      nameEn: developer.name,
      nameRu: developer.nameRu || developer.name,
      nameAr: developer.nameAr || null,
      slug: developer.slug || generateSlug(developer.name),
      logo,
      description: developer.description || null,
      descriptionRu: developer.descriptionRu || null,
      avgPricesDescription: developer.avgPricesDescription || null,
      avgPrices: developer.avgPrices || [],
      images: gallery,
      areas: (developer.areas || []).map(a => ({
        id: a.id,
        nameEn: a.nameEn,
        nameRu: a.nameRu,
        nameAr: a.nameAr,
        slug: a.slug || generateSlug(a.nameEn)
      })),
      communities: (developer.communities || []).map(c => ({
        id: c.id,
        title: c.title,
        area: c.area ? {
          id: c.area.id,
          nameEn: c.area.nameEn,
          slug: c.area.slug || generateSlug(c.area.nameEn)
        } : null,
        mapPoint: c.mapPoint,
        priceRange: c.priceRange,
        unitAvailabilities: c.unitAvailabilities,
        propertyTypes: c.propertyTypes,
        icp: c.icp,
        description: c.description,
        images: c.images // includes general, exterior, interior
      })),
      projectsCount: {
        total: counts.total,
        offPlan: counts.offPlan,
        secondary: counts.secondary,
      },
      createdAt: developer.createdAt,
    };

    res.json(successResponse(developerResponse));
  } catch (error: any) {
    console.error('Error fetching developer:', error);
    res.status(500).json(errorResponse('Failed to fetch developer', error.message));
  }
});



// GET /api/public/news - Get all published news with pagination
router.get('/news', authenticateApiKeyWithSecret, async (req: AuthRequest, res) => {
  try {
    console.log('[Public API] GET /api/public/news request:', {
      hasApiKey: !!req.apiKey,
      apiKeyName: req.apiKey?.name,
      page: req.query.page,
      limit: req.query.limit,
    });

    // Пагінація
    const pageNum = req.query.page ? parseInt(req.query.page.toString(), 10) : 1;
    const limitNum = req.query.limit ? parseInt(req.query.limit.toString(), 10) : 20;
    const MAX_LIMIT = 100;
    const finalLimit = Math.min(Math.max(limitNum, 1), MAX_LIMIT);
    const skip = (pageNum - 1) * finalLimit;

    // Створюємо query builder для опублікованих новин
    const queryBuilder = AppDataSource.getRepository(News)
      .createQueryBuilder('news')
      .where('news.isPublished = :isPublished', { isPublished: true })
      .andWhere('news.publishedAt IS NOT NULL')
      .andWhere('news.publishedAt <= :now', { now: new Date() });

    // Отримуємо загальну кількість перед пагінацією
    const totalCount = await queryBuilder.getCount();

    // Застосовуємо пагінацію та сортування
    const news = await queryBuilder
      .orderBy('news.publishedAt', 'DESC')
      .skip(skip)
      .take(finalLimit)
      .getMany();

    // Формуємо відповідь
    const newsList = news.map(item => ({
      id: item.id,
      slug: generateSlug(item.title), // Генеруємо slug з title
      title: item.title,
      titleRu: (item as any).titleRu || null, // Підтримка titleRu якщо є
      description: item.description,
      descriptionRu: (item as any).descriptionRu || null, // Підтримка descriptionRu якщо є
      image: item.imageUrl || null,
      publishedAt: item.publishedAt,
    }));

    console.log('[Public API] ✅ News response sent:', {
      totalNews: totalCount,
      returnedNews: newsList.length,
      page: pageNum,
      limit: finalLimit,
    });

    res.json(successResponse({
      data: newsList,
      total: totalCount,
      page: pageNum,
      limit: finalLimit,
      totalPages: Math.ceil(totalCount / finalLimit),
    }));
  } catch (error: any) {
    console.error('Error fetching news:', error);
    res.status(500).json(errorResponse('Failed to fetch news', error.message));
  }
});

// GET /api/public/projects - Get paginated list of off-plan projects with filtering
router.get('/projects', authenticateApiKeyWithSecret, async (req: AuthRequest, res) => {
  try {
    const {
      page = '1',
      limit = '10',
      search,
      locationId,
      cityId,
      minPrice,
      maxPrice,
      bedrooms,
      developerId,
      isInvestor,
      isAgent,
      sortBy,
      sortOrder
    } = req.query;

    console.log('[Public API] GET /api/public/projects request:', {
      page,
      limit,
      search,
      locationId,
      cityId,
      isInvestor,
      isAgent
    });

    const pageNum = parseInt(page.toString(), 10) || 1;
    const limitNum = parseInt(limit.toString(), 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    const queryBuilder = AppDataSource.getRepository(Property)
      .createQueryBuilder('property')
      .leftJoinAndSelect('property.area', 'area')
      .leftJoinAndSelect('property.city', 'city')
      .leftJoinAndSelect('property.developer', 'developer')
      .where('property.propertyType IN (:...types)', { types: ['off-plan', 'new-launches', 'exclusive-for-you'] });

    // 1. Search by name
    if (search) {
      queryBuilder.andWhere('LOWER(property.name) LIKE LOWER(:search)', { search: `%${search}%` });
    }

    // 2. Location/City filtering
    if (locationId) {
      const locationIds = Array.isArray(locationId)
        ? locationId
        : locationId.toString().split(',').map(id => id.trim()).filter(id => id !== '');
      if (locationIds.length > 0) {
        queryBuilder.andWhere('property.areaId IN (:...locationIds)', { locationIds });
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

    // 3. Price filtering
    if (minPrice) {
      queryBuilder.andWhere('property.priceFrom >= :minPrice', { minPrice: parseFloat(minPrice.toString()) });
    }
    if (maxPrice) {
      queryBuilder.andWhere('property.priceFrom <= :maxPrice', { maxPrice: parseFloat(maxPrice.toString()) });
    }

    // 4. Bedrooms filtering (overlap)
    if (bedrooms) {
      const bedroomList = bedrooms.toString().split(',').map(b => parseInt(b.trim(), 10));
      queryBuilder.andWhere(new Brackets(qb => {
        qb.where('property.bedroomsFrom IN (:...bedroomList)', { bedroomList })
          .orWhere('property.bedroomsTo IN (:...bedroomList)', { bedroomList })
          .orWhere('(property.bedroomsFrom <= :minBedroom AND property.bedroomsTo >= :maxBedroom)', {
            minBedroom: Math.min(...bedroomList),
            maxBedroom: Math.max(...bedroomList)
          });
      }));
    }

    // 5. Developer filtering
    if (developerId) {
      const developerIds = Array.isArray(developerId)
        ? developerId
        : developerId.toString().split(',').map(id => id.trim()).filter(id => id !== '');
      if (developerIds.length > 0) {
        queryBuilder.andWhere('property.developerId IN (:...developerIds)', { developerIds });
      }
    }

    // Sorting
    // Always prioritize featured projects (isForYouChoice)
    queryBuilder.orderBy('property.isForYouChoice', 'DESC');

    // Dynamic sorting based on parameters
    const sortField = sortBy?.toString().toLowerCase() || 'createdAt';
    const sortDirection = sortOrder?.toString().toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Allowed sort fields for security
    const allowedSortFields = ['createdAt', 'price'];

    if (sortField === 'price') {
      // For price sorting, use priceFrom field
      queryBuilder.addOrderBy('property.priceFrom', sortDirection);
    } else if (allowedSortFields.includes(sortField)) {
      // For other allowed fields
      queryBuilder.addOrderBy(`property.${sortField}`, sortDirection);
    } else {
      // Default fallback
      queryBuilder.addOrderBy('property.createdAt', 'DESC');
    }

    // Execution
    const [projects, total] = await queryBuilder
      .skip(skip)
      .take(limitNum)
      .getManyAndCount();

    // Transformation
    const data = projects.map(p => {
      const item: any = {
        id: p.id,
        name: p.name,
        photos: (p.photos || []).slice(0, 5),
        images: transformPhotos(p.photos).slice(0, 5),
        priceFrom: p.priceFrom,
        priceFromAED: p.priceFrom ? Conversions.usdToAed(p.priceFrom) : null,
        area: p.area ? p.area.nameEn : null,
        city: p.city ? p.city.nameEn : null,
        bedroomsFrom: p.bedroomsFrom,
        bedroomsTo: p.bedroomsTo,
        developer: p.developer ? {
          id: p.developer.id,
          name: p.developer.name
        } : null,
        plannedCompletionAt: p.plannedCompletionAt,
      };

      if (isInvestor === 'true') {
        item.paymentPlan = p.paymentPlan;
        item.projectedRoi = p.projectedRoi;
        item.isInvestorFeatured = p.isInvestorFeatured;
      }

      if (isAgent === 'true') {
        item.commission = p.commission;
      }

      return item;
    });

    res.json(successResponse({
      data,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    }));
  } catch (error: any) {
    console.error('Error fetching projects:', error);
    res.status(500).json(errorResponse('Failed to fetch projects', error.message));
  }
});

// GET /api/public/properties - General properties list with filtering (both off-plan and secondary)
router.get('/properties', authenticateApiKeyWithSecret, async (req: AuthRequest, res) => {
  try {
    const {
      page = '1',
      limit = '10',
      search,
      locationId,
      areaId,
      areaIds,
      areaSlug,
      cityId,
      priceFrom,
      priceTo,
      sizeFrom,
      sizeTo,
      minPrice,
      maxPrice,
      bedrooms,
      developerId,
      propertyType,
      sortBy,
      sortOrder,
      amenities,
      amenityIds,
      amenity_ids,
      completionDateFrom,
      completionDateTo
    } = req.query;

    console.log('[Public API] GET /api/public/properties request:', { page, limit, search, developerId, propertyType, areaId, areaIds, areaSlug });

    const pageNum = parseInt(page.toString(), 10) || 1;
    const limitNum = parseInt(limit.toString(), 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    const queryBuilder = AppDataSource.getRepository(Property)
      .createQueryBuilder('property')
      .leftJoinAndSelect('property.area', 'area')
      .leftJoinAndSelect('property.city', 'city')
      .leftJoinAndSelect('property.developer', 'developer')
      .leftJoinAndSelect('property.parentProject', 'parentProject')
      .loadRelationCountAndMap('property.unitsCount', 'property.units')
      .where('property.isActive = :isActive', { isActive: true });

    // Strict Filter for Public Site: Show only mapped secondary properties (ensuring they have photos and project linking)
    queryBuilder.andWhere(new Brackets(qb => {
      qb.where('property.propertyType != :secondaryType', { secondaryType: PropertyType.SECONDARY })
        .orWhere('property.parentProjectId IS NOT NULL');
    }));

    if (propertyType) {
      queryBuilder.andWhere('property.propertyType = :propertyType', { propertyType });
    }

    if (search) {
      const searchTerm = `%${search.toString().toLowerCase()}%`;
      queryBuilder.andWhere(new Brackets(qb => {
        qb.where('LOWER(property.name) LIKE :searchTerm', { searchTerm })
          .orWhere('LOWER(area.nameEn) LIKE :searchTerm', { searchTerm })
          .orWhere('LOWER(developer.name) LIKE :searchTerm', { searchTerm });
      }));
    }

    if (locationId || areaId || areaIds) {
      const locIds = [
        ...(locationId ? locationId.toString().split(',') : []),
        ...(areaId ? areaId.toString().split(',') : []),
        ...(areaIds ? areaIds.toString().split(',') : [])
      ].map(id => id.trim()).filter(id => id);
      
      if (locIds.length > 0) {
        queryBuilder.andWhere(new Brackets(qb => {
          qb.where('property.areaId IN (:...locIds)', { locIds })
            .orWhere('property.cityId IN (:...locIds)', { locIds });
        }));
      }
    }

    const effectiveAmenityIds = amenities || amenityIds || amenity_ids;
    if (effectiveAmenityIds) {
      const aIds = parseSimpleArray(effectiveAmenityIds);
      if (aIds.length > 0) {
        queryBuilder.innerJoin('property.facilities', 'facility')
          .andWhere('facility.id IN (:...aIds)', { aIds });
      }
    }

    const cDateFrom = completionDateFrom?.toString();
    const cDateTo = completionDateTo?.toString();
    if (cDateFrom) {
      queryBuilder.andWhere('property.plannedCompletionAt >= :cDateFrom', { cDateFrom });
    }
    if (cDateTo) {
      queryBuilder.andWhere('property.plannedCompletionAt <= :cDateTo', { cDateTo });
    }

    if (req.query.status) {
      const statusValue = req.query.status.toString().toLowerCase();
      if (statusValue === 'off-plan') {
        queryBuilder.andWhere('property.propertyType = :statusValue', { statusValue: PropertyType.OFF_PLAN });
      } else if (statusValue === 'completed') {
        queryBuilder.andWhere('property.propertyType = :statusValue', { statusValue: PropertyType.SECONDARY });
      } else {
        // Map common frontend statuses to Reelly/DB values
        const statusMap: Record<string, string[]> = {
          'on-sale': ['On Sale', 'Newly Launched', 'Start of Sales', 'Presale', 'under-construction', 'Under Construction'],
          'sold-out': ['Sold Out', 'Out of Stock'],
          'under-construction': ['Under Construction', 'under-construction'],
          'ready': ['Ready', 'Completed', 'ready']
        };
        
        if (statusMap[statusValue]) {
          queryBuilder.andWhere(new Brackets(qb => {
            qb.where('property.status IN (:...sv)', { sv: statusMap[statusValue] })
              .orWhere('property.saleStatus IN (:...sv)', { sv: statusMap[statusValue] });
          }));
        } else {
          queryBuilder.andWhere(new Brackets(qb => {
            qb.where('property.status ILIKE :sv', { sv: `%${statusValue}%` })
              .orWhere('property.saleStatus ILIKE :sv', { sv: `%${statusValue}%` });
          }));
        }
      }
    }

    if (developerId) {
      const developerIds = developerId.toString().split(',').filter(id => id);
      if (developerIds.length > 0) queryBuilder.andWhere('property.developerId IN (:...developerIds)', { developerIds });
    }

    if (bedrooms) {
      const bedList = bedrooms.toString().split(',').map(b => parseInt(b, 10)).filter(b => !isNaN(b));
      if (bedList.length > 0) {
        queryBuilder.andWhere(new Brackets(qb => {
          qb.where('property.bedroomsFrom IN (:...bedList)', { bedList })
            .orWhere('property.bedrooms IN (:...bedList)', { bedList });
        }));
      }
    }

    // Size filters
    if (sizeFrom) {
      const sMin = parseFloat(sizeFrom.toString());
      if (!isNaN(sMin)) {
        queryBuilder.andWhere('(property.sizeFrom >= :sMin OR property.size >= :sMin)', { sMin });
      }
    }
    if (sizeTo) {
      const sMax = parseFloat(sizeTo.toString());
      if (!isNaN(sMax)) {
        queryBuilder.andWhere('(property.sizeFrom <= :sMax OR property.size <= :sMax)', { sMax });
      }
    }

    // Price filters (handling both minPrice/maxPrice and priceFrom/priceTo aliases)
    const effectiveMinPrice = priceFrom || minPrice;
    const effectiveMaxPrice = priceTo || maxPrice;

    if (effectiveMinPrice) {
      const min = parseFloat(effectiveMinPrice.toString()) / Conversions.USD_TO_AED;
      if (!isNaN(min)) {
        queryBuilder.andWhere('(property.priceFrom >= :min OR property.price >= :min)', { min });
      }
    }

    if (effectiveMaxPrice) {
      const max = parseFloat(effectiveMaxPrice.toString()) / Conversions.USD_TO_AED;
      if (!isNaN(max)) {
        queryBuilder.andWhere('(property.priceFrom <= :max OR property.price <= :max)', { max });
      }
    }

    // Sort
    const sField = sortBy?.toString() || 'createdAt';
    const sOrder = sortOrder?.toString().toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const allowedFields = ['createdAt', 'name', 'price', 'priceFrom'];

    if (sField === 'random') {
      const seedVal = String(req.query.seed || req.query.random_seed || '0.5');
      // Using MD5 for stable random order based on seed.
      // Move logic to addSelect to avoid TypeORM alias scanning in orderBy.
      queryBuilder.addSelect(`md5(property.id::text || '${seedVal}')`, 'random_sort');
      queryBuilder.orderBy('random_sort', 'ASC');
    } else if (allowedFields.includes(sField)) {
      queryBuilder.orderBy(`property.${sField}`, sOrder as any);
    } else {
      queryBuilder.orderBy('property.createdAt', 'DESC');
    }

    const [items, totalCount] = await queryBuilder.skip(skip).take(limitNum).getManyAndCount();

    const data = items.map(p => {
      // Фото фолбек для списку
      let finalPhotos = p.photos || [];
      if (finalPhotos.length === 0 && p.propertyType === PropertyType.SECONDARY && p.parentProject?.coverImage) {
        finalPhotos = [p.parentProject.coverImage];
      }
      
      const images = transformPhotos(finalPhotos);
      const mainImage = images.length > 0 ? images[0].full : null;

      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        propertyType: p.propertyType,
        photos: finalPhotos.slice(0, 5),
        images: images.slice(0, 5),
        mainImage,
        previewImage: mainImage,
        priceAED: p.propertyType === 'off-plan' ? (p.priceFrom ? Conversions.usdToAed(p.priceFrom) : null) : (p.price ? Conversions.usdToAed(p.price) : null),
        area: p.area?.nameEn,
        city: p.city?.nameEn,
        developer: p.developer?.name,
        bedrooms: p.propertyType === 'off-plan' ? p.bedroomsFrom : p.bedrooms,
        bedroomsFrom: p.propertyType === 'off-plan' ? p.bedroomsFrom : null,
        bedroomsTo: p.propertyType === 'off-plan' ? p.bedroomsTo : null,
        bathrooms: p.propertyType === 'off-plan' ? p.bathroomsFrom : p.bathrooms,
        size: p.propertyType === 'off-plan' ? (p.sizeFrom ? Number(p.sizeFrom) : null) : (p.size ? Number(p.size) : null),
        sizeSqft: (p.propertyType === 'off-plan' && p.sizeFrom) ? Conversions.sqmToSqft(p.sizeFrom) : (p.size ? Conversions.sqmToSqft(p.size) : null),
        projectName: p.propertyType !== PropertyType.SECONDARY 
          ? p.name 
          : (p.parentProject ? (p.parentProject.title?.en || p.parentProject.title?.name || (typeof p.parentProject.title === 'string' ? p.parentProject.title : p.name)) : null),
        unitsCount: (p as any).unitsCount || 0
      };
    });

    res.json(successResponse({
      data,
      total: totalCount,
      meta: {
        total: totalCount,
      },
      pagination: {
        total: totalCount,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalCount / limitNum)
      }
    }));
  } catch (error: any) {
    console.error('Error in public properties list:', error);
    res.status(500).json(errorResponse('Failed to fetch properties', error.message));
  }
});

// GET /api/public/amenities-list - Get full list of amenities with project counts
router.get('/amenities-list', authenticateApiKeyWithSecret, async (req, res) => {
  try {
    const { propertyType } = req.query;

    const queryBuilder = AppDataSource.getRepository(Facility).createQueryBuilder('facility')
      .innerJoin('facility.projects', 'property') // Use innerJoin to automatically hide empty amenities
      .select([
        'facility.id as id',
        'facility.nameEn as "nameEn"',
        'facility.nameRu as "nameRu"',
        'facility.nameAr as "nameAr"',
        'facility.iconName as "iconName"'
      ])
      .addSelect('COUNT(property.id)::int', 'projectsCount')
      .where('property.isActive = :isActive', { isActive: true })
      .groupBy('facility.id, facility.nameEn, facility.nameRu, facility.nameAr, facility.iconName')
      .orderBy('"projectsCount"', 'DESC')
      .addOrderBy('facility.nameEn', 'ASC');

    if (propertyType) {
      queryBuilder.andWhere('property.propertyType = :type', { type: propertyType });
    }

    const data = await queryBuilder.getRawMany();

    res.json(successResponse(data));
  } catch (error: any) {
    console.error('Error fetching amenities list:', error);
    res.status(500).json(errorResponse('Failed to fetch amenities', error.message));
  }
});

// GET /api/public/locations - Combined cities and areas for search with project counts
router.get('/locations', authenticateApiKeyWithSecret, async (req, res) => {
  try {
    const { propertyType } = req.query;

    const [cities, areas] = await Promise.all([
      // Fetch cities with property counts
      AppDataSource.query(`
        SELECT 
          c.id, 
          c."nameEn", 
          c."nameRu", 
          c."countryId" as "parentId",
          'city' as type,
          COUNT(p.id)::int as total,
          COUNT(CASE WHEN p."propertyType" = 'off-plan' THEN 1 END)::int as "offPlan",
          COUNT(CASE WHEN p."propertyType" = 'secondary' THEN 1 END)::int as "secondary"
        FROM cities c
        LEFT JOIN properties p ON p."cityId" = c.id AND p.isactive = true
        ${propertyType ? `WHERE p."propertyType" = '${propertyType}'` : ''}
        GROUP BY c.id, c."nameEn", c."nameRu", c."countryId"
        HAVING COUNT(p.id) > 0
        ORDER BY c."nameEn" ASC
      `),
      // Fetch areas with property counts
      AppDataSource.query(`
        SELECT 
          a.id, 
          a.slug,
          a."nameEn", 
          a."nameRu", 
          a."cityId" as "parentId",
          'area' as type,
          COUNT(p.id)::int as total,
          COUNT(CASE WHEN p."propertyType" = 'off-plan' THEN 1 END)::int as "offPlan",
          COUNT(CASE WHEN p."propertyType" = 'secondary' THEN 1 END)::int as "secondary"
        FROM areas a
        LEFT JOIN properties p ON p."areaId" = a.id AND p.isactive = true
        ${propertyType ? `WHERE p."propertyType" = '${propertyType}'` : ''}
        GROUP BY a.id, a.slug, a."nameEn", a."nameRu", a."cityId"
        HAVING COUNT(p.id) > 0
        ORDER BY a."nameEn" ASC
      `)
    ]);

    const data = [
      ...cities.map((c: any) => ({
        id: c.id,
        slug: generateSlug(c.nameEn),
        nameEn: c.nameEn,
        nameRu: c.nameRu,
        type: 'city',
        parentId: c.parentId,
        projectsCount: {
          total: c.total,
          offPlan: c.offPlan,
          secondary: c.secondary
        }
      })),
      ...areas.map((a: any) => ({
        id: a.id,
        slug: a.slug,
        nameEn: a.nameEn,
        nameRu: a.nameRu,
        type: 'area',
        parentId: a.parentId,
        projectsCount: {
          total: a.total,
          offPlan: a.offPlan,
          secondary: a.secondary
        }
      }))
    ];
    res.json(successResponse(data));
  } catch (error: any) {
    console.error('Error fetching locations:', error);
    res.status(500).json(errorResponse('Failed to fetch locations', error.message));
  }
});

// GET /api/public/map-markers - Specialized endpoint for map display
router.get('/map-markers', authenticateApiKeyWithSecret, async (req, res) => {
  try {
    const { propertyType } = req.query;
    
    const whereCondition: any = { isActive: true };
    if (propertyType) {
      whereCondition.propertyType = propertyType;
    }

    const properties = await AppDataSource.getRepository(Property).find({
      where: whereCondition,
      select: [
        'id', 'latitude', 'longitude', 'propertyType', 'priceFrom', 'price', 
        'plannedCompletionAt', 'nameEn', 'nameRu', 'name', 'photos', 'slug'
      ]
    });

    const data = properties
      .filter(p => p.latitude && p.longitude && Number(p.latitude) !== 0 && Number(p.longitude) !== 0)
      .map(p => {
        const photos = p.photos || [];
        const mainImage = photos.length > 0 ? normalizeUrl(photos[0]) : null;

        return {
          id: p.id,
          lat: Number(p.latitude),
          lng: Number(p.longitude),
          propertyType: p.propertyType,
          priceAED: p.propertyType === 'off-plan' ? (p.priceFrom ? Conversions.usdToAed(p.priceFrom) : null) : (p.price ? Conversions.usdToAed(p.price) : null),
          completionDate: p.plannedCompletionAt || null,
          nameEn: p.nameEn || p.name,
          nameRu: p.nameRu || p.name,
          mainImage,
          slug: p.slug
        };
      });

    res.json(successResponse(data));
  } catch (error: any) {
    console.error('Error fetching map markers:', error);
    res.status(500).json(errorResponse('Failed to fetch map markers', error.message));
  }
});

// GET /api/public/projects/search - Autocomplete search for projects and areas
router.get('/projects/search', authenticateApiKeyWithSecret, async (req: AuthRequest, res) => {
  try {
    const { q = '', limit = '10' } = req.query;
    const limitNum = Math.min(parseInt(limit.toString(), 10) || 10, 20);

    console.log('[Public API] GET /api/public/projects/search request:', { q, limit: limitNum });

    if (!q || q.toString().length < 2) {
      return res.json(successResponse([]));
    }

    const queryBuilder = AppDataSource.getRepository(Property)
      .createQueryBuilder('property')
      .leftJoinAndSelect('property.area', 'area')
      .where('property.propertyType = :type', { type: 'off-plan' })
      .andWhere(new Brackets(qb => {
        qb.where('LOWER(property.name) LIKE LOWER(:q)', { q: `%${q}%` })
          .orWhere('LOWER(area.nameEn) LIKE LOWER(:q)', { q: `%${q}%` });
      }))
      .take(limitNum);

    const projects = await queryBuilder.getMany();

    const results = projects.map(p => ({
      id: p.id,
      name: p.name,
      location: p.area ? p.area.nameEn : 'N/A',
      photo: p.photos && p.photos.length > 0 ? p.photos[0] : null,
      type: 'project'
    }));

    res.json(successResponse(results));
  } catch (error: any) {
    console.error('Error in projects search:', error);
    res.status(500).json(errorResponse('Failed to search projects', error.message));
  }
});

// GET /api/public/projects/filter-options - Get metadata for filter options
router.get('/projects/filter-options', authenticateApiKeyWithSecret, async (req: AuthRequest, res) => {
  try {
    console.log('[Public API] GET /api/public/projects/filter-options request');

    // 1. Get areas that have off-plan projects
    const locations = await AppDataSource.getRepository(Area)
      .createQueryBuilder('area')
      .innerJoin('properties', 'property', 'property.areaId = area.id')
      .where('property.propertyType = :type', { type: 'off-plan' })
      .select(['area.id', 'area.nameEn'])
      .distinct(true)
      .orderBy('area.nameEn', 'ASC')
      .getRawMany();

    // 2. Get developers that have off-plan projects
    const developers = await AppDataSource.getRepository(Developer)
      .createQueryBuilder('developer')
      .innerJoin('properties', 'property', 'property.developerId = developer.id')
      .where('property.propertyType = :type', { type: 'off-plan' })
      .select(['developer.id', 'developer.name'])
      .distinct(true)
      .orderBy('developer.name', 'ASC')
      .getRawMany();

    // 3. Get price range
    const priceStats = await AppDataSource.getRepository(Property)
      .createQueryBuilder('property')
      .select('MIN(property."priceFrom")', 'min')
      .addSelect('MAX(property."priceFrom")', 'max')
      .where('property.propertyType = :type', { type: 'off-plan' })
      .andWhere('property."priceFrom" > 0')
      .getRawOne();

    const response = {
      locations: locations.map(l => ({ id: l.area_id, name: l.area_nameEn })),
      developers: developers.map(d => ({ id: d.developer_id, name: d.developer_name })),
      priceRange: {
        min: parseFloat(priceStats?.min || '0'),
        max: parseFloat(priceStats?.max || '0')
      },
      bedrooms: ["Studio", "1", "2", "3", "4", "5+"]
    };

    res.json(successResponse(response));
  } catch (error: any) {
    console.error('Error in filter options:', error);
    res.status(500).json(errorResponse('Failed to fetch filter options', error.message));
  }
});

router.get('/news/:slug', authenticateApiKeyWithSecret, async (req: AuthRequest, res) => {
  try {
    const { slug } = req.params;

    console.log('[Public API] GET /api/public/news/:slug request:', {
      hasApiKey: !!req.apiKey,
      apiKeyName: req.apiKey?.name,
      slug,
    });

    // Спочатку пробуємо знайти за id (якщо slug виглядає як UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    let newsItem: News | null = null;

    if (uuidRegex.test(slug)) {
      // Якщо slug виглядає як UUID, шукаємо за id
      newsItem = await AppDataSource.getRepository(News)
        .createQueryBuilder('news')
        .leftJoinAndSelect('news.contents', 'contents')
        .where('news.id = :id', { id: slug })
        .andWhere('news.isPublished = :isPublished', { isPublished: true })
        .andWhere('news.publishedAt IS NOT NULL')
        .andWhere('news.publishedAt <= :now', { now: new Date() })
        .orderBy('contents.order', 'ASC')
        .getOne();
    }

    // Якщо не знайдено за id, шукаємо за slug (якщо поле є в БД) або генеруємо slug з title
    if (!newsItem) {
      const allNews = await AppDataSource.getRepository(News)
        .createQueryBuilder('news')
        .leftJoinAndSelect('news.contents', 'contents')
        .where('news.isPublished = :isPublished', { isPublished: true })
        .andWhere('news.publishedAt IS NOT NULL')
        .andWhere('news.publishedAt <= :now', { now: new Date() })
        .orderBy('contents.order', 'ASC')
        .getMany();

      // Шукаємо за slug в БД або генеруємо slug з title
      newsItem = allNews.find(item => {
        const dbSlug = (item as any).slug;
        const generatedSlug = generateSlug(item.title);
        return dbSlug === slug || generatedSlug === slug;
      }) || null;
    }

    if (!newsItem) {
      return res.status(404).json(errorResponse('News not found'));
    }

    // Формуємо відповідь з повною інформацією
    const newsResponse = {
      id: newsItem.id,
      slug: (newsItem as any).slug || generateSlug(newsItem.title),
      title: newsItem.title,
      titleRu: (newsItem as any).titleRu || null,
      description: newsItem.description,
      descriptionRu: (newsItem as any).descriptionRu || null,
      image: newsItem.imageUrl || null,
      publishedAt: newsItem.publishedAt,
      contents: (newsItem.contents || []).sort((a, b) => a.order - b.order).map(content => ({
        type: content.type,
        title: content.title,
        description: content.description || null,
        imageUrl: content.imageUrl || null,
        videoUrl: content.videoUrl || null,
        order: content.order,
      })),
    };

    console.log('[Public API] ✅ News detail response sent:', {
      newsId: newsItem.id,
      contentsCount: newsResponse.contents.length,
    });

    res.json(successResponse(newsResponse));
  } catch (error: any) {
    console.error('Error fetching news detail:', error);
    res.status(500).json(errorResponse('Failed to fetch news detail', error.message));
  }
});


// GET /api/public/map - Get lightweight property data for map (id, coordinates, price)
router.get('/map', authenticateApiKeyWithSecret, async (req: AuthRequest, res) => {
  try {
    const {
      propertyType,
      search,
      priceFrom,
      priceTo,
      bedrooms,
      areaIds,
      areaId,
      locationId,
      areaSlug,
      areaSlugs,
      cityId,
      developerId,
      developerIds
    } = req.query;
    console.log('[Public API] GET /api/public/map request', {
      propertyType,
      search,
      priceFrom,
      priceTo,
      bedrooms,
      areaIds,
      areaId,
      locationId,
      areaSlug,
      areaSlugs,
      cityId,
      developerId,
      developerIds
    });

    const parseCsv = (value: unknown): string[] => {
      if (!value) return [];
      return String(value)
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
    };

    const queryBuilder = AppDataSource.getRepository(Property)
      .createQueryBuilder('property')
      .leftJoinAndSelect('property.area', 'area')
      .leftJoinAndSelect('property.parentProject', 'parentProject')
      .select([
        'property.id',
        'property.latitude',
        'property.longitude',
        'property.price',
        'property.priceFrom',
        'property.propertyType',
        'property.name',
        'property.photos',
        'area.nameEn',
        'area.slug',
        'parentProject.coverImage'
      ])
      .where('property.latitude IS NOT NULL')
      .andWhere('property.longitude IS NOT NULL')
      .andWhere('property.isActive = :isActive', { isActive: true });

    if (propertyType) {
      queryBuilder.andWhere('property.propertyType = :propertyType', { propertyType });
    }

    const developerFilterIds = [
      ...parseCsv(developerId),
      ...parseCsv(developerIds)
    ];
    if (developerFilterIds.length > 0) {
      queryBuilder.andWhere('property.developerId IN (:...developerFilterIds)', { developerFilterIds });
    }

    const areaIdFilter = [
      ...parseCsv(areaIds),
      ...parseCsv(areaId),
      ...parseCsv(locationId)
    ];
    if (areaIdFilter.length > 0) {
      queryBuilder.andWhere('property.areaId IN (:...areaIdFilter)', { areaIdFilter });
    }

    const areaSlugFilter = [
      ...parseCsv(areaSlug),
      ...parseCsv(areaSlugs)
    ].map((slug) => slug.toLowerCase());
    if (areaSlugFilter.length > 0) {
      queryBuilder.andWhere('LOWER(area.slug) IN (:...areaSlugFilter)', { areaSlugFilter });
    }

    const cityIdFilter = parseCsv(cityId);
    if (cityIdFilter.length > 0) {
      queryBuilder.andWhere('property.cityId IN (:...cityIdFilter)', { cityIdFilter });
    }

    if (priceFrom) {
      const minPriceUSD = parseFloat(priceFrom as string) / Conversions.USD_TO_AED;
      queryBuilder.andWhere(new Brackets(qb => {
        qb.where('property.priceFrom >= :minPrice', { minPrice: minPriceUSD })
          .orWhere('property.price >= :minPrice', { minPrice: minPriceUSD });
      }));
    }

    if (priceTo) {
      const maxPriceUSD = parseFloat(priceTo as string) / Conversions.USD_TO_AED;
      queryBuilder.andWhere(new Brackets(qb => {
        qb.where('property.priceFrom <= :maxPrice', { maxPrice: maxPriceUSD })
          .orWhere('property.price <= :maxPrice', { maxPrice: maxPriceUSD });
      }));
    }

    if (bedrooms) {
      const bedArray = (bedrooms as string).split(',').map(b => b.trim());
      if (bedArray.length > 0) {
        queryBuilder.andWhere(new Brackets(qb => {
          bedArray.forEach((bed, index) => {
            const bedNum = parseInt(bed, 10);
            const bedParam = `bed${index}`;
            if (bedNum === 0) { // Studio
              qb.orWhere(`(property.propertyType = 'off-plan' AND property.bedroomsFrom = 0)`)
                .orWhere(`(property.propertyType = 'secondary' AND property.bedrooms = 0)`);
            } else if (!isNaN(bedNum)) {
              qb.orWhere(`(property.propertyType = 'off-plan' AND (property.bedroomsFrom <= :${bedParam} AND property.bedroomsTo >= :${bedParam}))`, { [bedParam]: bedNum })
                .orWhere(`(property.propertyType = 'secondary' AND property.bedrooms = :${bedParam})`, { [bedParam]: bedNum });
            }
          });
        }));
      }
    }

    if (search) {
      const searchTerm = `%${search.toString().toLowerCase()}%`;
      const slugSearch = `%${search.toString().toLowerCase().replace(/-/g, '%')}%`;

      queryBuilder.leftJoin('property.developer', 'devSearch')
        .leftJoin('property.city', 'citSearch')
        .leftJoin('property.area', 'arSearch');

      queryBuilder.andWhere(new Brackets(qb => {
        qb.where('LOWER(property.name) LIKE :search', { search: searchTerm })
          .orWhere('LOWER(property.description) LIKE :search', { search: searchTerm })
          .orWhere('LOWER(property.descriptionRu) LIKE :search', { search: searchTerm })
          .orWhere('LOWER(property.name) LIKE :slugSearch', { slugSearch })
          .orWhere('LOWER(devSearch.name) LIKE :search', { search: searchTerm })
          .orWhere('LOWER(citSearch.nameEn) LIKE :search', { search: searchTerm })
          .orWhere('LOWER(arSearch.nameEn) LIKE :search', { search: searchTerm });
      }));
    }

    const properties = await queryBuilder.getMany();

    const mapPoints = properties.map(p => {
      let image = null;
      const finalPhotos = p.photos && p.photos.length > 0
        ? p.photos
        : (p.propertyType === PropertyType.SECONDARY && p.parentProject?.coverImage
          ? [p.parentProject.coverImage]
          : []);

      if (finalPhotos.length > 0) {
        image = normalizeUrl(finalPhotos[0]);
      }

      return {
        id: p.id,
        name: p.name,
        image,
        area: p.area?.nameEn,
        lat: typeof p.latitude === 'string' ? parseFloat(p.latitude) : p.latitude,
        lng: typeof p.longitude === 'string' ? parseFloat(p.longitude) : p.longitude,
        priceAED: p.propertyType === 'off-plan'
          ? (p.priceFrom ? Conversions.usdToAed(p.priceFrom) : null)
          : (p.price ? Conversions.usdToAed(p.price) : null),
        propertyType: p.propertyType,
      };
    });

    res.setHeader('Cache-Control', 'public, max-age=300'); // Cache for 5 mins
    res.json(mapPoints);
  } catch (error: any) {
    console.error('Error fetching map data:', error);
    res.status(500).json(errorResponse('Failed to fetch map data', error.message));
  }
});

// GET /api/public/areas-simple - Get minimal area data for filters (only areas with active listings)
router.get('/areas-simple', authenticateApiKeyWithSecret, async (req: AuthRequest, res) => {
  try {
    const areas = await AppDataSource.getRepository(Area)
      .createQueryBuilder('area')
      .select(['area.id', 'area.slug', 'area.nameEn', 'area.nameRu', 'area.cityId'])
      .where('area.isactive = :isActive', { isActive: true })
      .andWhere(qb => {
        const subQuery = qb.subQuery()
          .select('p.id')
          .from(Property, 'p')
          .where('p."areaId" = area.id')
          .limit(1)
          .getQuery();
        return `EXISTS ${subQuery}`;
      })
      .orderBy('area.nameEn', 'ASC')
      .getMany();

    const payload = areas.map((area) => ({
      id: area.id,
      slug: area.slug || generateSlug(area.nameEn),
      nameEn: area.nameEn,
      nameRu: area.nameRu,
      cityId: area.cityId
    }));

    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.json(successResponse(payload));
  } catch (error: any) {
    res.status(500).json(errorResponse('Failed to fetch areas', error.message));
  }
});

const transformUnit = (unit: any) => ({
  ...unit,
  planImage: unit.planImages?.medium || unit.planImage || null,
  planImages: unit.planImages || {
    original: unit.planImage || null,
    large: unit.planImage || null,
    medium: unit.planImage || null,
    small: unit.planImage || null,
  }
});

// GET /api/public/developers-simple - Get minimal developer data for filters
router.get('/developers-simple', authenticateApiKeyWithSecret, async (req: AuthRequest, res) => {
  try {
    const developers = await AppDataSource.getRepository(Developer)
      .createQueryBuilder('developer')
      .select(['developer.id', 'developer.name'])
      .orderBy('developer.name', 'ASC')
      .getMany();

    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.json(successResponse(developers));
  } catch (error: any) {
    res.status(500).json(errorResponse('Failed to fetch developers', error.message));
  }
});

// GET /api/public/properties/:id/summary - Get lightweight property detail for map popup
router.get('/properties/:id/summary', authenticateApiKeyWithSecret, async (req: AuthRequest, res) => {
  try {
    const identifier = req.params.id;
    const isUuid = UUID_REGEX.test(identifier);
    let property = await findPropertyByIdentifier(identifier, ['area', 'city', 'developer']);

    if (!property) {
      // Logic for Property Finder projects if regular property is not found
      const pfProject = await AppDataSource.getRepository(PropertyFinderProject).findOne({
        where: isUuid
          ? [{ id: identifier }, { pfId: identifier }]
          : [{ pfId: identifier }]
      });

      if (!pfProject) {
        return res.status(404).json(errorResponse('Property not found'));
      }

      // Format PF data for summary popup
      const fd = pfProject.fullData || {};
      const specs = fd.specifications || {};
      
      // Photos from fullData media or coverImage
      let photos: string[] = [];
      if (fd.media?.images && Array.isArray(fd.media.images)) {
        photos = fd.media.images.map((img: any) => img.original?.url || img.watermarked?.url).filter(Boolean);
      }
      if (photos.length === 0 && pfProject.coverImage) {
        photos = [pfProject.coverImage];
      }

      const response = {
        id: pfProject.pfId,
        name: (typeof pfProject.title === 'string' ? pfProject.title : (pfProject.title?.en || pfProject.title?.en_custom)) || 'Unnamed Project',
        propertyType: fd.category || 'off-plan',
        photos: photos.slice(0, 5),
        images: photos.slice(0, 5).map(url => ({ small: url, full: url })),
        price: null,
        priceFrom: Number(pfProject.startingPrice) || 0,
        priceAED: null,
        priceFromAED: Number(pfProject.startingPrice) || 0,
        bedrooms: specs.bedrooms || null,
        size: specs.size || null,
        bedroomsFrom: specs.bedrooms || null,
        sizeFrom: specs.size || null,
        location: {
          en: pfProject.location?.name || 'Dubai',
          ru: pfProject.location?.name || 'Дубай',
          ar: pfProject.location?.name || 'دبي',
        },
        area: {
          id: pfProject.location?.id,
          nameEn: pfProject.location?.name,
          nameRu: pfProject.location?.name,
          nameAr: pfProject.location?.name
        },
        city: {
          id: null,
          nameEn: 'Dubai',
          nameRu: 'Дубай'
        },
        developer: pfProject.developer ? {
          name: typeof pfProject.developer === 'string' ? pfProject.developer : (pfProject.developer.name || 'Various Developers'),
          logo: typeof pfProject.developer === 'object' ? pfProject.developer.logo : null
        } : null,
      };

      res.setHeader('Cache-Control', 'public, max-age=3600');
      return res.json(successResponse(response));
    }

    // Generate localized location strings
    const location = property.area && property.city ? {
      en: `${property.area.nameEn}, ${property.city.nameEn}`,
      ru: `${property.area.nameRu}, ${property.city.nameRu}`,
      ar: `${property.area.nameAr}, ${property.city.nameAr}`,
    } : null;

    const response = {
      id: property.id,
      name: property.name,
      propertyType: property.propertyType,
      photos: (property.photos || []).slice(0, 5),
      images: transformPhotos(property.photos).slice(0, 5),
      price: property.price,
      priceFrom: property.priceFrom,
      priceAED: property.price ? Conversions.usdToAed(property.price) : null,
      priceFromAED: property.priceFrom ? Conversions.usdToAed(property.priceFrom) : null,
      bedrooms: property.propertyType === 'off-plan' ? property.bedroomsFrom : property.bedrooms,
      size: property.propertyType === 'off-plan' ? property.sizeFrom : property.size,
      bedroomsFrom: property.propertyType === 'off-plan' ? property.bedroomsFrom : null,
      sizeFrom: property.propertyType === 'off-plan' ? property.sizeFrom : null,
      location: location,
      area: property.area ? {
        id: property.area.id,
        nameEn: property.area.nameEn,
        nameRu: property.area.nameRu,
        nameAr: property.area.nameAr
      } : null,
      city: property.city ? {
        id: property.city.id,
        nameEn: property.city.nameEn,
        nameRu: property.city.nameRu,
        nameAr: property.city.nameAr
      } : null,
      developer: property.developer ? {
        name: property.developer.name,
        logo: property.developer.logo
      } : null,
    };

    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.json(successResponse(response));
  } catch (error: any) {
    res.status(500).json(errorResponse('Failed to fetch property summary', error.message));
  }
});

// GET /api/public/properties/:id/units - Get units for a property
router.get('/properties/:id/units', authenticateApiKeyWithSecret, async (req: AuthRequest, res) => {
  try {
    const { id: identifier } = req.params;
    const property = await findPropertyByIdentifier(identifier, ['units']);

    if (!property) {
      return res.status(404).json(errorResponse('Property not found'));
    }

    res.json(successResponse(property.units || []));
  } catch (error: any) {
    console.error('Error fetching property units:', error);
    res.status(500).json(errorResponse('Failed to fetch property units', error.message));
  }
});

// GET /api/public/properties/:id - Detailed property view
router.get('/properties/:id', authenticateApiKeyWithSecret, async (req: AuthRequest, res) => {
  try {
    const identifier = req.params.id;
    const property = await findPropertyByIdentifier(identifier, [
      'country',
      'city',
      'area',
      'developer',
      'facilities',
      'units',
      'parentProject'
    ]);

    if (!property) {
      console.warn(`[Public API] 404: Property not found with identifier: ${identifier} (isUuid: ${isUuid})`);
      return res.status(404).json(errorResponse('Property not found'));
    }

    // Фото фолбек: якщо у вторинки немає фото, беремо від батьківського проекту
    let finalPhotos = property.photos || [];
    if (finalPhotos.length === 0 && property.propertyType === PropertyType.SECONDARY && property.parentProject?.coverImage) {
      finalPhotos = [property.parentProject.coverImage];
    }

    const response = {
      ...property,
      photos: finalPhotos,
      images: transformPhotos(finalPhotos),
      canonicalPath: `/properties/${property.slug || `property-${property.id.slice(0, 8)}`}`,
      priceFromAED: property.priceFrom ? Conversions.usdToAed(property.priceFrom) : null,
      priceAED: property.price ? Conversions.usdToAed(property.price) : null,
      sizeFromSqft: property.sizeFrom ? Conversions.sqmToSqft(property.sizeFrom) : null,
      sizeToSqft: property.sizeTo ? Conversions.sqmToSqft(property.sizeTo) : null,
      sizeSqft: property.size ? Conversions.sqmToSqft(property.size) : null,
      // Додаємо назву оригінального проекту для зручності
      projectName: property.propertyType !== PropertyType.SECONDARY 
        ? property.name 
        : (property.parentProject ? (property.parentProject.title?.en || property.parentProject.title?.name || (typeof property.parentProject.title === 'string' ? property.parentProject.title : property.name)) : null),
      units: (property.units || []).map(transformUnit)
    };

    res.json(successResponse(response));
  } catch (error: any) {
    res.status(500).json(errorResponse('Failed to fetch property', error.message));
  }
});

// GET /api/public/areas/:id - Detailed area view (by ID or Slug)
router.get('/areas/:id', authenticateApiKeyWithSecret, async (req: AuthRequest, res) => {
  try {
    const { id: identifier } = req.params;
    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(identifier);

    const area = await AppDataSource.getRepository(Area).findOne({
      where: isUuid ? { id: identifier } : { slug: identifier },
      relations: ['city']
    });

    if (!area) {
      return res.status(404).json(errorResponse('Area not found'));
    }

    // Fix mainImage and images
    const imagesArray = parseSimpleArray(area.images);
    let mainImage = area.mainImage;
    if (!mainImage && imagesArray.length > 0) mainImage = imagesArray[0];

    const response = {
      id: area.id,
      slug: area.slug,
      cityId: area.cityId,
      nameEn: area.nameEn,
      nameRu: area.nameRu,
      nameAr: area.nameAr,
      mainImage,
      images: imagesArray,
      isActive: area.isActive,
      isFeatured: area.isFeatured,
      priority: area.priority,
      description: area.description,
      descriptionRu: area.descriptionRu,
      infrastructure: area.infrastructure || null,
      content: {
        generalInformation: {
          en: area.contentGeneralInformationEn || null,
          ru: area.contentGeneralInformationRu || null
        },
        quickAccessDescription: {
          en: area.contentQuickAccessDescriptionEn || null,
          ru: area.contentQuickAccessDescriptionRu || null
        }
      },
      proximityPoints: AREA_PROXIMITY_POINTS,
      city: area.city ? {
        id: area.city.id,
        nameEn: area.city.nameEn
      } : null
    };

    res.json(successResponse(response));
  } catch (error: any) {
    res.status(500).json(errorResponse('Failed to fetch area detail', error.message));
  }
});

// GET /api/public/facilities - Get all facilities
router.get('/facilities', authenticateApiKeyWithSecret, async (req: AuthRequest, res) => {
  try {
    const facilities = await AppDataSource.getRepository(Facility).find({
      order: { nameEn: 'ASC' },
    });
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.json(successResponse(facilities));
  } catch (error: any) {
    res.status(500).json(errorResponse('Failed to fetch facilities', error.message));
  }
});

// GET /api/public/facilities-list - Simple list of facilities
router.get('/facilities-list', authenticateApiKeyWithSecret, async (req: AuthRequest, res) => {
  try {
    const facilities = await AppDataSource.getRepository(Facility)
      .createQueryBuilder('facility')
      .select(['facility.id', 'facility.nameEn', 'facility.nameRu', 'facility.nameAr', 'facility.iconName'])
      .orderBy('facility.nameEn', 'ASC')
      .getMany();

    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.json(successResponse(facilities));
  } catch (error: any) {
    res.status(500).json(errorResponse('Failed to fetch facilities', error.message));
  }
});

// Vacancies are now handled in public-vacancies.routes.ts
// for better localization support and cleaner code structure.

// GET /api/public/property-finder/projects - Get all PF projects with filtering and pagination
router.get('/property-finder/projects', authenticateApiKeyWithSecret, async (req, res) => {
  try {
    const { 
      search, 
      category, 
      completionStatus, 
      developerId,
      page = 1, 
      limit = 24 
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit as string, 10) || 24);
    const skip = (pageNum - 1) * limitNum;

    const queryBuilder = AppDataSource.getRepository(PropertyFinderProject)
      .createQueryBuilder('project');

    // Filters
    if (search) {
      queryBuilder.andWhere(new Brackets(qb => {
        qb.where("project.title->>'en' ILIKE :search", { search: `%${search}%` })
          .orWhere("project.title->>'ar' ILIKE :search", { search: `%${search}%` })
          .orWhere("project.pfId ILIKE :search", { search: `%${search}%` });
      }));
    }

    if (category) {
      queryBuilder.andWhere("project.fullData->>'category' = :category", { category });
    }

    if (completionStatus) {
      queryBuilder.andWhere("project.fullData->>'completionStatus' ILIKE :status", { status: `%${completionStatus}%` });
    }

    if (developerId) {
       // Search by developer ID or Name in JSON
       queryBuilder.andWhere("project.developer->>'id' = :devId", { devId: developerId });
    }

    const [items, total] = await queryBuilder
      .orderBy('project.updatedAt', 'DESC')
      .skip(skip)
      .take(limitNum)
      .getManyAndCount();

    res.json(successResponse({
      items,
      pagination: {
        total,
        page: pageNum,
        perPage: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    }));

  } catch (error: any) {
    console.error('Error fetching public PF projects:', error);
    res.status(500).json(errorResponse('Failed to fetch projects', error.message));
  }
});

// GET /api/public/property-finder/projects/:id - Get detailed PF project by ID
router.get('/property-finder/projects/:id', authenticateApiKeyWithSecret, async (req, res) => {
  try {
    const { id } = req.params;
    
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    
    // Support searching by both our UUID and PF ID
    const query = AppDataSource.getRepository(PropertyFinderProject)
      .createQueryBuilder('project');
      
    if (isUuid) {
      query.where('project.id = :id', { id })
           .orWhere('project.pfId = :id', { id });
    } else {
      query.where('project.pfId = :id', { id });
    }

    const project = await query.getOne();

    if (!project) {
      return res.status(404).json(errorResponse('Project not found'));
    }

    // Поєднуємо основні дані з повним об'єктом fullData (де тепер лежать описи, аменітіс та фото на S3)
    const enrichedProject = {
      ...project,
      ...project.fullData,
      id: project.id,
      pfId: project.pfId,
      title: project.title,
      location: project.location,
      developer: project.developer,
      startingPrice: project.startingPrice
    };

    res.json(successResponse(enrichedProject));
  } catch (error: any) {
    console.error('Error fetching public PF project details:', error);
    res.status(500).json(errorResponse('Failed to fetch project details', error.message));
  }
});

export default router;
