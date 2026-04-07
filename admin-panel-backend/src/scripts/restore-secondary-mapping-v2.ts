
import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { Property, PropertyType } from '../entities/Property';
import { PropertyFinderProject } from '../entities/PropertyFinderProject';
import * as fs from 'fs';
import * as path from 'path';

/**
 * RESTORE SECONDARY MAPPING AND RE-MAP PHOTOS (VERSION 2.1)
 * 
 * 1. Loads all_pf_projects_rich.json to update PropertyFinderProject table.
 * 2. Uses BOTH PropertyFinderProject and OFF_PLAN Property tables as photo sources.
 * 3. Removes placeholders and remaps SECONDARY properties.
 */

const PLACEHOLDER_LOGO = 'https://foryou-realestate.com/logo.png';

function normalize(str: string): string {
    return (str || '')
        .toLowerCase()
        .replace(/\b(the|tower|towers|residence|residences|building|apartments|villa|villas|hotel|tower[\s]?a|tower[\s]?b|tower[\s]?c|tower[\s]?d|tower[\s]?1|tower[\s]?2|tower[\s]?3|tower[\s]?4|tower[\s]?5)\b/gi, '')
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Utility to parse photos string into array
 */
function parsePhotos(photos: any): string[] {
    if (!photos) return [];
    if (Array.isArray(photos)) return photos;
    if (typeof photos === 'string') {
        const p = photos.trim();
        if (p.startsWith('[') && p.endsWith(']')) {
            try { return JSON.parse(p); } catch (e) {}
        }
        return p.split(',').map(v => v.trim()).filter(Boolean);
    }
    return [];
}

async function run() {
    try {
        console.log('🚀 Starting restoration script v2.1...');
        if (!AppDataSource.isInitialized) {
            await AppDataSource.initialize();
        }
        console.log('✅ DB Connected');

        const pfRepo = AppDataSource.getRepository(PropertyFinderProject);
        const propRepo = AppDataSource.getRepository(Property);

        // 1. Update PropertyFinderProject from RICH JSON
        const jsonPath = path.resolve(__dirname, '../../../all_pf_projects_rich.json');
        if (fs.existsSync(jsonPath)) {
            console.log('📂 Loading all_pf_projects_rich.json...');
            const richProjects = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
            let projectsUpdated = 0;
            for (const rp of richProjects) {
                const project = await pfRepo.findOne({ where: { pfId: rp.pfId } });
                if (project && rp.coverImage && !rp.coverImage.includes('logo.png')) {
                    project.coverImage = rp.coverImage;
                    if (!project.fullData) project.fullData = {};
                    if (!project.fullData.media) project.fullData.media = { images: [] };
                    if (!project.fullData.media.images || project.fullData.media.images.length === 0) {
                        project.fullData.media.images = [{ original: { url: rp.coverImage } }];
                    }
                    await pfRepo.save(project);
                    projectsUpdated++;
                }
            }
            console.log(`✅ Updated ${projectsUpdated} PF Projects with photos.`);
        }

        // 2. Prepare Match Sources
        console.log('📦 Preparing match sources (PF Projects + Off-Plan Properties)...');
        
        // Source A: PF Projects
        const allPf = await pfRepo.find();
        const pfByNormTitle = new Map<string, string[]>();
        allPf.forEach(p => {
            const title = (typeof p.title === 'string' ? p.title : p.title?.en) || '';
            const norm = normalize(title);
            if (norm) {
                const photos: string[] = [];
                if (p.coverImage) photos.push(p.coverImage);
                const fd = p.fullData || {};
                if (fd.media?.images && Array.isArray(fd.media.images)) {
                    fd.media.images.forEach((img: any) => {
                        const url = img.original?.url || img.watermarked?.url;
                        if (url && !photos.includes(url)) photos.push(url);
                    });
                }
                if (photos.length > 0) pfByNormTitle.set(norm, photos);
            }
        });

        // Source B: Off-Plan Properties
        const allOffplan = await propRepo.find({ where: { propertyType: PropertyType.OFF_PLAN } });
        const offplanByNormName = new Map<string, string[]>();
        allOffplan.forEach(op => {
            const photos = parsePhotos(op.photos);
            const norm = normalize(op.name);
            if (norm && photos.length > 0 && !photos[0].includes('logo.png')) {
                offplanByNormName.set(norm, photos);
            }
        });

        console.log(`📊 Sources ready: ${pfByNormTitle.size} PF projects, ${offplanByNormName.size} Off-plan properties.`);

        // 3. Process Secondary Properties
        const totalSecondary = await propRepo.count({ where: { propertyType: PropertyType.SECONDARY } });
        console.log(`🔍 Scanning ${totalSecondary} secondary properties...`);
        
        let propertiesMapped = 0;
        let placeholdersRemoved = 0;
        const BATCH_SIZE = 100;

        for (let i = 0; i < totalSecondary; i += BATCH_SIZE) {
            const batch = await propRepo.find({
                where: { propertyType: PropertyType.SECONDARY },
                skip: i,
                take: BATCH_SIZE
            });

            const updateQueue = [];

            for (const prop of batch) {
                let hasChanges = false;
                let currentPhotos = parsePhotos(prop.photos);

                // a. Remove logo.png
                const originalCount = currentPhotos.length;
                currentPhotos = currentPhotos.filter(p => !p.includes('logo.png'));
                if (currentPhotos.length !== originalCount) {
                    placeholdersRemoved++;
                    hasChanges = true;
                }

                // b. Map if no photos
                if (currentPhotos.length === 0) {
                    const normBuilding = normalize(prop.buildingName || prop.name || '');
                    
                    // Priority 1: Match with Off-plan table (highest quality)
                    let match = offplanByNormName.get(normBuilding);
                    
                    // Priority 2: Match with PF Projects table
                    if (!match) match = pfByNormTitle.get(normBuilding);

                    if (match && match.length > 0) {
                        currentPhotos = match.slice(0, 15);
                        hasChanges = true;
                        propertiesMapped++;
                    }
                }

                if (hasChanges) {
                    prop.photos = currentPhotos;
                    updateQueue.push(propRepo.save(prop));
                }
            }
            
            if (updateQueue.length > 0) await Promise.all(updateQueue);
            process.stdout.write(`\r   Progress: ${Math.min(i + BATCH_SIZE, totalSecondary)}/${totalSecondary} | Mapped: ${propertiesMapped} | Cleaned: ${placeholdersRemoved}`);
        }

        console.log('\n\n✨ Restoration Complete!');
        console.log(`   Placeholders removed:  ${placeholdersRemoved}`);
        console.log(`   Properties remapped:   ${propertiesMapped}`);

    } catch (error) {
        console.error('💥 Critical Error:', error);
    } finally {
        if (AppDataSource.isInitialized) await AppDataSource.destroy();
        process.exit(0);
    }
}

run();
