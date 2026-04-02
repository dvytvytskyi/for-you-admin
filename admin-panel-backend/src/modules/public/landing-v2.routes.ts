import express from 'express';
import { AppDataSource } from '../../config/database';
import { Property } from '../../entities/Property';
import { PropertyUnit } from '../../entities/PropertyUnit';
import { successResponse, errorResponse } from '../../utils/response';
import { AmoCrmService } from '../../../services/amo-crm.service';

const router = express.Router();
const amoCrmService = new AmoCrmService();

/**
 * GET /api/v2/landing/sitemap-catalog
 * Optimized for SEO sitemap generation.
 */
router.get('/sitemap-catalog', async (req, res) => {
  try {
    const propertyRepo = AppDataSource.getRepository(Property);
    
    // Using query builder to join Area for slugs and avoid N+1
    const properties = await propertyRepo.createQueryBuilder('property')
      .leftJoinAndSelect('property.area', 'area')
      .select([
        'property.slug',
        'property.updatedAt',
        'property.unitTypesJson',
        'area.slug'
      ])
      .where('property.isActive = :isActive', { isActive: true })
      .getMany();

    const result = properties.map(p => ({
      project_slug: p.slug,
      area_slug: p.area?.slug || null,
      unit_types: p.unitTypesJson ? (Array.isArray(p.unitTypesJson) ? p.unitTypesJson.map((u: any) => u.slug || u.nameEn) : []) : [],
      updatedAt: p.updatedAt
    }));

    return res.json(result);
  } catch (error: any) {
    console.error('Error in sitemap-catalog:', error);
    return res.status(500).json(errorResponse(error.message));
  }
});

/**
 * GET /api/v2/landing/property/:project_slug/unit/:unit_slug_or_id
 * Detailed unit information by CNC/Slug.
 */
router.get('/property/:project_slug/unit/:unit_slug_or_id', async (req, res) => {
  try {
    const { project_slug, unit_slug_or_id } = req.params;
    const propertyRepo = AppDataSource.getRepository(Property);
    const unitRepo = AppDataSource.getRepository(PropertyUnit);

    const property = await propertyRepo.findOne({
      where: { slug: project_slug },
      relations: ['area']
    });

    if (!property) {
        return res.status(404).json(errorResponse('Project not found'));
    }

    // Try to find unit by unitId or id first
    let unit = await unitRepo.findOne({
      where: [
        { propertyId: property.id, unitId: unit_slug_or_id },
        { propertyId: property.id, id: unit_slug_or_id }
      ]
    });

    // If not found, check if unit_slug_or_id matches a possible slug (fallback)
    if (!unit) {
        const units = await unitRepo.find({ where: { propertyId: property.id } });
        unit = units.find(u => {
            const generatedSlug = `${u.bedrooms || 0}-bedroom-${u.type || 'unit'}`.toLowerCase();
            return generatedSlug === unit_slug_or_id.toLowerCase();
        }) || null;
    }

    if (!unit) {
      return res.status(404).json(errorResponse('Unit not found in this project'));
    }

    // Prepare response
    const response = {
      status: unit.status || (property.saleStatus || 'Available'),
      payment_plan: property.paymentPlansJson || [],
      technical_specs: {
        orientation: (unit as any).orientation || 'Sea View / Sunset', // Placeholder
        parking_spots: (unit as any).parking || 1,
        kitchen_appliances: 'Fully Integrated'
      },
      view_description: {
        en: (unit as any).viewEn || property.description?.substring(0, 100) + '...', 
        ru: (unit as any).viewRu || property.descriptionRu?.substring(0, 100) + '...',
        uk: (unit as any).viewRu || property.descriptionRu?.substring(0, 100) + '...'
      }
    };

    return res.json(response);
  } catch (error: any) {
    return res.status(500).json(errorResponse(error.message));
  }
});

/**
 * GET /api/v2/landing/property/:project_slug/investment-analytics
 */
router.get('/property/:project_slug/investment-analytics', async (req, res) => {
  try {
    const { project_slug } = req.params;
    const propertyRepo = AppDataSource.getRepository(Property);

    const property = await propertyRepo.findOne({
      where: { slug: project_slug }
    });

    if (!property) {
      return res.status(404).json(errorResponse('Property not found'));
    }

    const roiVal = parseFloat(property.projectedRoi?.replace('%', '') || '8.2');
    
    const result = {
      net_roi_avg: roiVal,
      price_appreciation_forecast: property.readiness === 'off-plan' ? "+12% to handover" : "Stable appreciation (+5-8% annual)",
      area_demand_score: 9, 
      rental_estimate_low: Math.round((property.priceFrom || 1200000) * 0.075),
      rental_estimate_high: Math.round((property.priceFrom || 1200000) * 0.09)
    };

    return res.json(result);
  } catch (error: any) {
    return res.status(500).json(errorResponse(error.message));
  }
});

/**
 * POST /api/v2/landing/lead
 */
router.post('/lead', async (req, res) => {
  try {
    const { name, phone, email, project_id, unit_id, source_url, utm_tags } = req.body;

    if (!name || !phone) {
        return res.status(400).json(errorResponse('Name and phone are required'));
    }

    // Use service to create lead and contact together
    const amoLeadId = await amoCrmService.submitEnquiryToAmo({
        name,
        email,
        phone,
        source: `Landing: ${source_url || 'Unknown'}`,
        additionalInfo: {
            project_id,
            unit_id,
            utm_tags,
            source_url
        }
    });

    return res.status(201).json(successResponse({ lead_id: amoLeadId }, 'Lead captured successfully'));
  } catch (error: any) {
    console.error('Lead capture error:', error);
    return res.status(500).json(errorResponse(error.message));
  }
});

export default router;
