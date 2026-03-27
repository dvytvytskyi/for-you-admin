import axios from 'axios';
import { Brackets } from 'typeorm';
import { AppDataSource } from '../config/database';
import { PropertyFinderProject } from '../entities/PropertyFinderProject';
import dotenv from 'dotenv';
import { s3Client, S3_CONFIG } from '../config/s3';
import { PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'crypto';

dotenv.config();

export class PropertyFinderService {
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private authUrl = 'https://atlas.propertyfinder.com/v1/auth/token';
  private baseUrl = 'https://atlas.propertyfinder.com/v1';
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor() {
    this.apiKey = process.env.PROPERTY_FINDER_API_KEY || '';
    this.apiSecret = process.env.PROPERTY_FINDER_API_SECRET || '';
  }

  /**
   * Mirror image to S3
   */
  private async mirrorToS3(imageUrl: string, listingId: string): Promise<string> {
    try {
        if (!imageUrl || imageUrl.includes('your-objectstorage.com') || imageUrl.includes('foryou.fra1')) return imageUrl;

        const hash = crypto.createHash('md5').update(imageUrl).digest('hex');
        const key = `property-finder/listings/${listingId}/${hash}.jpg`;
        const finalUrl = `${S3_CONFIG.publicUrl}/${key}`;

        // Check if already exists
        try {
            await s3Client.send(new HeadObjectCommand({ Bucket: S3_CONFIG.bucketName, Key: key }));
            return finalUrl;
        } catch (e) {
            // Not found, proceed to upload
        }

        const response = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 15000 });
        const buffer = Buffer.from(response.data, 'binary');

        await s3Client.send(new PutObjectCommand({
            Bucket: S3_CONFIG.bucketName,
            Key: key,
            Body: buffer,
            ContentType: 'image/jpeg',
            ACL: 'public-read' as any
        }));

        console.log(`[S3] Mirror Success: ${key}`);
        return finalUrl;
    } catch (err: any) {
        console.error(`[S3] Mirror Failed ${imageUrl}:`, err.message);
        return imageUrl;
    }
  }

  private async authenticate(): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    if (this.accessToken && now < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const response = await axios.post(this.authUrl, {
        apiKey: this.apiKey,
        apiSecret: this.apiSecret
      }, { timeout: 10000 });

      this.accessToken = response.data.accessToken;
      this.tokenExpiry = now + (response.data.expiresIn || 1800) - 60;
      
      if (!this.accessToken) throw new Error('Failed to get access token');
      return this.accessToken;
    } catch (error: any) {
      console.error('[PropertyFinder] Auth Error:', error.response?.data || error.message);
      throw new Error('Property Finder Authentication failed');
    }
  }

  private async getHeaders() {
    const token = await this.authenticate();
    return {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'X-PF-Country': 'ae',
      'X-Domain': 'propertyfinder.ae'
    };
  }

  private async getWithRetry(url: string, config: any, retries = 3): Promise<any> {
    for (let i = 0; i < retries; i++) {
        try {
            return await axios.get(url, { ...config, timeout: 20000 });
        } catch (error: any) {
            const status = error.response?.status;
            if ((status === 502 || status === 503 || status === 504) && i < retries - 1) {
                console.warn(`[PropertyFinder] ${status} at ${url}, retrying ${i+1}/${retries}...`);
                await new Promise(r => setTimeout(r, 2000 * (i + 1)));
                continue;
            }
            throw error;
        }
    }
  }

  /**
   * Fetches full location details (including coordinates) by location ID
   */
  async getLocationMetadata(locationId: string): Promise<any> {
    try {
        const headers = await this.getHeaders();
        const resp = await this.getWithRetry(`${this.baseUrl}/locations`, { 
            headers, 
            params: { 'filter[id]': locationId } 
        });
        const loc = resp.data.data?.[0];
        if (loc) {
            console.log(`[PropertyFinder] Fetched metadata for location ${locationId}: ${loc.name}`);
            return loc;
        }
        return null;
    } catch (error: any) {
        console.warn(`[PropertyFinder] Failed to fetch location metadata for ${locationId}:`, error.message);
        return null;
    }
  }

  async syncAllProjects(): Promise<{ synced: number; unitsSynced: number; failed: number }> {
    const projectMap = new Map<string, any[]>();
    const locationCache = new Map<string, any>();
    let unitsSynced = 0;
    
    try {
      const headers = await this.getHeaders();
      let page = 1;
      let totalPages = 1;
      
      console.log('[PropertyFinder] Starting full sync across all listings...');
      
            const richFields = 'amenities,description,age,category,type,developer,media,price,location,uaeEmirate,projectStatus,furnishingType,finishingType,compliance,street,parkingSlots,plotSize,size,assignedTo,createdBy,availableFrom,floorNumber,hasGarden,hasKitchen,hasParkingOnSite,landNumber,mojDeedLocationDescription,numberOfFloors,ownerName,plotNumber,unitNumber,bedrooms,bathrooms';

            do {
                try {
                const listingsResp = await this.getWithRetry(`${this.baseUrl}/listings`, { 
                    headers, 
                    params: { perPage: 100, page, include: richFields } 
                });
            
            const results = listingsResp.data.results || [];
            totalPages = listingsResp.data.pagination?.totalPages || 1;
            
            for (const listing of results) {
                const pfProjectId = (listing.project?.id || listing.location?.id)?.toString();
                
                if (pfProjectId) {
                    if (!projectMap.has(pfProjectId)) projectMap.set(pfProjectId, []);
                    
                    projectMap.get(pfProjectId)?.push({
                        ...listing, 
                        price: listing.price,
                        size: listing.size,
                        bedrooms: listing.bedrooms,
                        bathrooms: listing.bathrooms,
                        type: listing.type,
                        projectStatus: listing.projectStatus,
                        state: listing.state,
                        updatedAt: listing.updatedAt
                    });
                    unitsSynced++;
                }
            }
            console.log(`[PropertyFinder] Cached page ${page}/${totalPages} (${results.length} listings)`);
            page++;
          } catch (e: any) {
              console.error(`[PropertyFinder] Failed to fetch page ${page}:`, e.message);
              break;
          }
      } while (page <= totalPages);

      console.log(`[PropertyFinder] Discovered ${projectMap.size} unique projects and ${unitsSynced} units.`);

      let synced = 0;
      let failed = 0;
      const projectRepo = AppDataSource.getRepository(PropertyFinderProject);

      for (const [pfId, units] of projectMap.entries()) {
          try {
              let projectMetadata: any = {};
              try {
                  const resp = await this.getWithRetry(`${this.baseUrl}/projects/${pfId}`, { headers }, 1);
                  projectMetadata = resp.data || {};
              } catch (e: any) {
                  // If metadata fetch failed, we will try to get location info properly below
                  // console.warn(`[PropertyFinder] Project Metadata fetch failed for project ${pfId} (Status: ${e.response?.status?e.response.status:e.message}). Using listing data.`);
              }

              let project = await projectRepo.findOne({ where: { pfId } });
              if (!project) project = new PropertyFinderProject();
              
              // Use data from the first unit as basis for project metadata
              const firstUnit = units[0] || {};
              const locationId = (projectMetadata.location?.id || firstUnit.location?.id || pfId).toString();
              
              // Enrich location with coordinates if missing
              let enrichedLocation = projectMetadata.location || firstUnit.location || { id: pfId };
              if (!enrichedLocation.coordinates || !enrichedLocation.name) {
                  if (locationCache.has(locationId)) {
                      enrichedLocation = locationCache.get(locationId);
                  } else {
                      const fullLoc = await this.getLocationMetadata(locationId);
                      if (fullLoc) {
                          enrichedLocation = fullLoc;
                          locationCache.set(locationId, fullLoc);
                      }
                  }
              }

              // Mirror ALL images for ALL units in this project
              const processedUnits = [];
              for (const unit of units) {
                  const mirroredUnit = JSON.parse(JSON.stringify(unit));
                  if (mirroredUnit.media && mirroredUnit.media.images) {
                      for (const img of mirroredUnit.media.images) {
                          if (img.original?.url) {
                              img.original.url = await this.mirrorToS3(img.original.url, pfId);
                          }
                          if (img.watermarked?.url) {
                              img.watermarked.url = await this.mirrorToS3(img.watermarked.url, pfId);
                          }
                      }
                  }
                  // Overwrite location in units too
                  mirroredUnit.location = enrichedLocation;
                  processedUnits.push(mirroredUnit);
              }

              project.pfId = pfId;
              project.offeringType = firstUnit.offeringType || (firstUnit.price?.type === 'yearly' ? 'rent' : 'sale');
              project.title = projectMetadata.title || firstUnit.title || { en: enrichedLocation.name || `Project ${pfId}` };
              project.developer = projectMetadata.developer || firstUnit.developer || "Various Developers";
              project.location = enrichedLocation;
              project.dldId = projectMetadata.dldId || firstUnit.compliance?.listingAdvertisementNumber;
              project.startingPrice = projectMetadata.startingPrice || (firstUnit.price?.amounts?.sale || firstUnit.price?.amounts?.yearly || 0).toString();
              
              // Set cover image from mirrored first image
              if (processedUnits[0]?.media?.images?.[0]?.original?.url) {
                  project.coverImage = processedUnits[0].media.images[0].original.url;
              }

              // Transform to new grouped structure
              project.fullData = {
                  id: firstUnit.id,
                  title: project.title,
                  description: firstUnit.description || { en: '', ar: '' },
                  price: {
                      amounts: firstUnit.price?.amounts || { sale: 0, yearly: 0 },
                      type: firstUnit.price?.type || 'sale',
                      currency: firstUnit.price?.currency || 'AED'
                  },
                  location: project.location,
                  developer: project.developer,
                  media: firstUnit.media || { images: [], videos: [] },
                  specifications: {
                      bedrooms: firstUnit.bedrooms?.toString() || '0',
                      bathrooms: firstUnit.bathrooms?.toString() || '0',
                      size: Number(firstUnit.size) || 0,
                      plotSize: Number(firstUnit.plotSize) || 0,
                      type: firstUnit.type || 'apartment',
                      category: firstUnit.category || 'residential',
                      furnishingType: firstUnit.furnishingType || 'unfurnished',
                      finishingType: firstUnit.finishingType || 'fully-finished',
                      floorNumber: firstUnit.floorNumber?.toString() || '',
                      parkingSlots: Number(firstUnit.parkingSlots) || 0,
                      numberOfFloors: Number(firstUnit.numberOfFloors) || 0
                  },
                  status: {
                      projectStatus: firstUnit.projectStatus || 'completed',
                      age: firstUnit.age || '',
                      availableFrom: firstUnit.availableFrom || ''
                  },
                  amenities: firstUnit.amenities || [],
                  legal_compliance: {
                      type: firstUnit.compliance?.type || 'rera',
                      reference: firstUnit.reference || '',
                      listingAdvertisementNumber: firstUnit.compliance?.listingAdvertisementNumber || project.dldId || '',
                      landNumber: firstUnit.landNumber || '',
                      plotNumber: firstUnit.plotNumber || '',
                      unitNumber: firstUnit.unitNumber || ''
                  },
                  internal_meta: {
                      reference: firstUnit.reference || '',
                      uaeEmirate: firstUnit.uaeEmirate || 'dubai',
                      hasGarden: firstUnit.hasGarden || false,
                      hasKitchen: firstUnit.hasKitchen || false,
                      hasParkingOnSite: firstUnit.hasParkingOnSite || false,
                      mojDeedLocationDescription: firstUnit.mojDeedLocationDescription || ''
                  },
                  units_count: processedUnits.length,
                  ...projectMetadata
              };
              project.units = processedUnits;
              project.lastSyncAt = new Date();

              await projectRepo.save(project);
              synced++;
          } catch (error: any) {
              console.error(`[PropertyFinder] Error saving project ${pfId}:`, error.message);
              failed++;
          }
      }

      return { synced, unitsSynced, failed };
    } catch (error: any) {
        console.error('[PropertyFinder] Sync failed:', error.message);
        return { synced: 0, unitsSynced: 0, failed: 0 };
    }
  }

  async getLocations(search: string = ''): Promise<any[]> {
    try {
        const headers = await this.getHeaders();
        const resp = await this.getWithRetry(`${this.baseUrl}/locations`, { 
            headers, 
            params: { search, perPage: 100 } 
        });
        return resp.data.data || [];
    } catch (error: any) {
        console.error('[PropertyFinder] Failed to fetch locations:', error.message);
        return [];
    }
  }

  async getProjects(filters: any = {}) {
       console.log('[PropertyFinder] Fetching projects with filters:', JSON.stringify(filters));
       const {
          page = 1,
          perPage = 24,
          search = '',
          category = 'all',
          status = 'all',
          location = null,
          developer = null,
          priceMin = null,
          priceMax = null,
          sizeMin = null,
          sizeMax = null,
          bedrooms = null,
          furnishingType = null,
          sortBy = 'updatedAt',
          sortOrder = 'DESC',
          type = 'all' // sale or rent
      } = filters;

      const projectRepo = AppDataSource.getRepository(PropertyFinderProject);
      const query = projectRepo.createQueryBuilder('project');

      // Search (fuzzy search in title, location name, and developer name)
      if (search) {
          query.andWhere(
              new Brackets(qb => {
                  qb.where("project.title->>'en' ILIKE :search", { search: `%${search}%` })
                    .orWhere("project.title->>'ar' ILIKE :search", { search: `%${search}%` })
                    .orWhere('project."fullData"->\'location\'->>\'name\' ILIKE :search', { search: `%${search}%` })
                    .orWhere('project."fullData"->\'developer\'->>\'name\' ILIKE :search', { search: `%${search}%` })
                    .orWhere("project.developer::text ILIKE :search", { search: `%${search}%` })
                    .orWhere(`EXISTS (
                        SELECT 1 FROM jsonb_array_elements(project."fullData"->'location'->'tree') AS loc_tree
                        WHERE loc_tree->>'name' ILIKE :search
                    )`, { search: `%${search}%` });
              })
          );
      }

      // Category filter (residential/commercial)
      if (category && category !== 'all') {
          query.andWhere('project."fullData"->\'specifications\'->>\'category\' = :category', { category });
      }

      // Status filter (off-plan/completed)
      if (status && status !== 'all') {
          console.log('[PropertyFinder] Applying status filter:', status);
          if (status === 'off-plan') {
              query.andWhere(
                  new Brackets(qb => {
                      qb.where("project.\"fullData\"->'status'->>'completionStatus' ILIKE :op", { op: '%off_plan%' })
                        .orWhere("project.\"fullData\"->'status'->>'completionStatus' ILIKE :opDash", { opDash: '%off-plan%' })
                        .orWhere("project.\"fullData\"->'status'->>'projectStatus' ILIKE :op", { op: '%off_plan%' })
                        .orWhere("project.\"fullData\"->'status'->>'projectStatus' ILIKE :opDash", { opDash: '%off-plan%' });
                  })
              );
          } else if (status === 'completed') {
              query.andWhere(
                  new Brackets(qb => {
                      qb.where("project.\"fullData\"->'status'->>'completionStatus' ILIKE :comp", { comp: '%completed%' })
                        .orWhere("project.\"fullData\"->'status'->>'projectStatus' ILIKE :comp", { comp: '%completed%' });
                  })
              );
          } else {
              query.andWhere('project."fullData"->\'status\'->>\'projectStatus\' = :status', { status });
          }
      }

      // Location filter (ID, Name, or Emirate)
      const locationVal = location || filters.areaId;
      if (locationVal) {
          query.andWhere(
              new Brackets(qb => {
                  qb.where("project.location->>'name' ILIKE :locVal", { locVal: locationVal })
                    .orWhere("project.location->>'id' = :locVal", { locVal: locationVal })
                    .orWhere('project."fullData"->\'internal_meta\'->>\'uaeEmirate\' ILIKE :locVal', { locVal: locationVal })
                    .orWhere(`EXISTS (
                        SELECT 1 FROM jsonb_array_elements(project."fullData"->'location'->'tree') AS loc_tree
                        WHERE loc_tree->>'name' ILIKE :locVal OR loc_tree->>'id' = :locVal
                    )`, { locVal: locationVal });
              })
          );
      }

      // Developer filter (ID or Name)
      if (developer) {
          query.andWhere(
              "(project.developer->>'id' = :devVal OR project.developer->>'name' ILIKE :devVal OR project.developer->>'slug' = :devVal)",
              { devVal: developer }
          );
      }

      // Price Range filter - automatically switches based on type
      if (priceMin !== null && priceMin !== undefined && priceMin !== '') {
          const minVal = Number(priceMin);
          if (type === 'rent') {
              query.andWhere("COALESCE((project.\"fullData\"->'price'->'amounts'->>'yearly')::numeric, (project.startingPrice)::numeric, 0) >= :minVal", { minVal });
          } else {
              query.andWhere("NULLIF(project.startingPrice, '')::numeric >= :minVal", { minVal });
          }
      }
      if (priceMax !== null && priceMax !== undefined && priceMax !== '') {
          const maxVal = Number(priceMax);
          if (type === 'rent') {
              query.andWhere("COALESCE((project.\"fullData\"->'price'->'amounts'->>'yearly')::numeric, (project.startingPrice)::numeric, 0) <= :maxVal", { maxVal });
          } else {
              query.andWhere("NULLIF(project.startingPrice, '')::numeric <= :maxVal", { maxVal });
          }
      }

      // Size Range filter
      if (sizeMin !== null && sizeMin !== undefined && sizeMin !== '') {
          query.andWhere("EXISTS (SELECT 1 FROM jsonb_array_elements(project.units) AS unit WHERE (unit->>'size')::numeric >= :sizeMin)", { sizeMin: Number(sizeMin) });
      }
      if (sizeMax !== null && sizeMax !== undefined && sizeMax !== '') {
          query.andWhere("EXISTS (SELECT 1 FROM jsonb_array_elements(project.units) AS unit WHERE (unit->>'size')::numeric <= :sizeMax)", { sizeMax: Number(sizeMax) });
      }

      // Bedrooms filter (Value, Array, or Comma-separated string)
      if (bedrooms) {
          let rawBeds = Array.isArray(bedrooms) ? bedrooms : [bedrooms];
          if (typeof bedrooms === 'string' && bedrooms.includes(',')) {
              rawBeds = bedrooms.split(',').filter(b => b.trim() !== '');
          }

          const bedsList: string[] = [];
          let hasSixPlus = false;

          rawBeds.forEach(b => {
              if (b === '6+' || Number(b) >= 6) {
                  hasSixPlus = true;
              } else if (b === 'studio' || b === '0') {
                  bedsList.push('studio', '0');
              } else if (b !== null && b !== '') {
                  bedsList.push(String(b));
              }
          });

          if (bedsList.length > 0 || hasSixPlus) {
              query.andWhere(new Brackets(qb => {
                  if (bedsList.length > 0) {
                      qb.where("EXISTS (SELECT 1 FROM jsonb_array_elements(project.units) AS unit WHERE unit->>'bedrooms' IN (:...bedsList))", { bedsList });
                  }
                  if (hasSixPlus) {
                      const method = bedsList.length > 0 ? 'orWhere' : 'where';
                      qb[method]("EXISTS (SELECT 1 FROM jsonb_array_elements(project.units) AS unit WHERE (CASE WHEN unit->>'bedrooms' ~ '^[0-9]+$' THEN (unit->>'bedrooms')::numeric ELSE 0 END) >= 6)");
                  }
              }));
          }
      }

      // Furnishing Type filter
      if (furnishingType) {
          query.andWhere("EXISTS (SELECT 1 FROM jsonb_array_elements(project.units) AS unit WHERE unit->>'furnishingType' = :furnishingType)", { furnishingType });
      }

      // Type filter (Sale or Rent)
      if (type && type !== 'all') {
          query.andWhere("project.offeringType = :type", { type });
      }

      // Sorting
      let orderByField = 'project.updatedAt';
      const validSortOrder = ['ASC', 'DESC'].includes(sortOrder?.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';

      if (sortBy === 'price') {
          // Динамічне сортування: якщо оренда, беремо yearly з JSON, інакше startingPrice
          orderByField = `(
              CASE 
                WHEN project."fullData"->'price'->>'type' = 'yearly' THEN (project."fullData"->'price'->'amounts'->>'yearly')::numeric
                WHEN NULLIF(project.startingPrice, '') IS NOT NULL THEN (project.startingPrice)::numeric
                ELSE 0 
              END
          )`;
      } else if (sortBy === 'size') {
          // Sort by the average or min size of units in this project
          orderByField = '(SELECT MIN((u->>\'size\')::numeric) FROM jsonb_array_elements(project.units) AS u)';
      } else if (sortBy === 'createdAt') {
          orderByField = 'project.createdAt';
      } else if (sortBy === 'updatedAt') {
          orderByField = 'project.updatedAt';
      }

      query.orderBy(orderByField, validSortOrder as any);

      // Log generated SQL for debugging
      console.log('[PropertyFinder] SQL:', query.getSql());
      console.log('[PropertyFinder] Parameters:', JSON.stringify(query.getParameters()));

      // Execute with pagination
      try {
          const [items, total] = await query
              .skip((page - 1) * perPage)
              .take(perPage)
              .getManyAndCount();
          
          const mappedItems = items.map((project: any) => {
              const fullData = project.fullData || {};
              const media = fullData.media || {};
              const isRent = fullData.price?.type === 'yearly' || (!fullData.price?.amounts?.sale && fullData.price?.amounts?.yearly);
              const displayPrice = isRent ? (fullData.price?.amounts?.yearly || 0) : (Number(project.startingPrice) || 0);

              return {
                  ...project,
                  // Compatibility fields for main website
                  name: project.title?.en || project.title?.en_custom || 'Unnamed Project',
                  images: project.coverImage ? [project.coverImage] : (media.images ? [media.images[0]?.original?.url] : []),
                  price: Number(displayPrice) || 0,
                  priceAED: Number(displayPrice) || 0,
                  developer: project.developer?.name || project.developer || 'Various Developers',
                  location: project.location?.name || project.location?.path_name || 'Dubai, UAE',
                  status: fullData.status?.projectStatus || fullData.status?.completionStatus || (fullData.status?.completionStatus?.includes('off_plan') ? 'off-plan' : 'completed'),
                  category: fullData.specifications?.category || 'residential',
                  type: isRent ? 'rent' : 'sale'
              };
          });
          
          return {
              projects: mappedItems,
              pagination: {
                  total,
                  page,
                  limit: perPage,
                  totalPages: Math.ceil(total / perPage)
              }
          };
      } catch (err: any) {
          console.error('[PropertyFinder] Query Execution Error:', err.message, err.stack);
          return { projects: [], pagination: { total: 0, page: 1, limit: perPage, totalPages: 0 } };
      }
  }

  /**
   * Returns a unique list of locations found in projects (from our DB)
   */
    async getUniqueLocationsFromProjects(): Promise<any[]> {
        try {
            const query = `
                SELECT DISTINCT
                    loc->>'id' as id,
                    loc->>'name' as name
                FROM property_finder_projects,
                jsonb_array_elements("fullData"->'location'->'tree') loc
                WHERE loc->>'type' = 'COMMUNITY'
                ORDER BY name ASC
            `;
            const results = await AppDataSource.query(query);
            return results.map((r: any) => ({
                id: r.id,
                name: r.name
            }));
        } catch (error: any) {
            console.error('[PropertyFinderService] getUniqueLocationsFromProjects Error:', error.message);
            return [];
        }
    }

  /**
   * Returns a lightweight list of all projects with coordinates for the map
   */
    async getProjectsForMap(status: string = 'all'): Promise<any[]> {
        let statusFilter = '';
        if (status && status !== 'all') {
            if (status === 'off-plan') {
                statusFilter = `
                    AND (
                        "fullData"->'status'->>'completionStatus' ILIKE '%off_plan%'
                        OR "fullData"->'status'->>'completionStatus' ILIKE '%off-plan%'
                        OR "fullData"->'status'->>'projectStatus' ILIKE '%off_plan%'
                        OR "fullData"->'status'->>'projectStatus' ILIKE '%off-plan%'
                    )
                `;
            } else if (status === 'completed') {
                statusFilter = `
                    AND (
                        "fullData"->'status'->>'completionStatus' ILIKE '%completed%'
                        OR "fullData"->'status'->>'projectStatus' ILIKE '%completed%'
                    )
                `;
            } else {
                // Sanitize status to prevent SQL injection if it's dynamic
                const safeStatus = status.replace(/[';]/g, '');
                statusFilter = `AND ("fullData"->'status'->>'projectStatus' = '${safeStatus}')`;
            }
        }

        const query = `
            SELECT 
                "pfId" as id,
                "title"->>'en' as name,
                "startingPrice" as price,
                "location"->>'name' as area,
                "offeringType" as type,
                "coverImage" as image,
                COALESCE("location"->'coordinates'->>'lat', "location"->'coordinates'->>'latitude') as lat,
                COALESCE("location"->'coordinates'->>'lon', "location"->'coordinates'->>'lng', "location"->'coordinates'->>'longitude') as lng
            FROM property_finder_projects
            WHERE ("location"->'coordinates'->>'lat' IS NOT NULL OR "location"->'coordinates'->>'latitude' IS NOT NULL)
            ${statusFilter};
        `;
        try {
            return await AppDataSource.query(query);
        } catch (error: any) {
            console.error('[PropertyFinder] Map fetch error:', error.message);
            return [];
        }
    }
}
