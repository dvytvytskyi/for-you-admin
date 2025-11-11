import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { Property } from '../entities/Property';
import * as fs from 'fs';
import * as path from 'path';

interface PropertyWithoutCoords {
  id: string;
  name: string;
  propertyType: string;
  areaName: string;
  cityName: string;
  countryName: string;
  latitude: number | null;
  longitude: number | null;
}

async function checkPropertiesWithoutCoordinates() {
  try {
    console.log('🔄 Connecting to database...');
    await AppDataSource.initialize();
    console.log('✅ Database connected\n');

    const propertyRepository = AppDataSource.getRepository(Property);

    // Find all properties where latitude or longitude is null
    const propertiesWithoutCoords = await propertyRepository
      .createQueryBuilder('property')
      .leftJoinAndSelect('property.area', 'area')
      .leftJoinAndSelect('area.city', 'city')
      .leftJoinAndSelect('city.country', 'country')
      .where('property.latitude IS NULL OR property.longitude IS NULL')
      .orderBy('property.propertyType', 'ASC')
      .addOrderBy('property.name', 'ASC')
      .getMany();

    console.log(`📊 Found ${propertiesWithoutCoords.length} properties without coordinates\n`);

    // Group by property type
    const offPlanWithoutCoords = propertiesWithoutCoords.filter(
      (p) => p.propertyType === 'off-plan'
    );
    const secondaryWithoutCoords = propertiesWithoutCoords.filter(
      (p) => p.propertyType === 'secondary'
    );

    console.log('📋 Breakdown by property type:\n');
    console.log('='.repeat(80));
    console.log(`Off-Plan: ${offPlanWithoutCoords.length}`);
    console.log(`Secondary: ${secondaryWithoutCoords.length}`);
    console.log(`Total: ${propertiesWithoutCoords.length}`);
    console.log('='.repeat(80) + '\n');

    // Prepare data for report
    const reportData: PropertyWithoutCoords[] = propertiesWithoutCoords.map((p) => ({
      id: p.id,
      name: p.name,
      propertyType: p.propertyType,
      areaName: p.area?.nameEn || 'N/A',
      cityName: p.area?.city?.nameEn || 'N/A',
      countryName: p.area?.city?.country?.nameEn || 'N/A',
      latitude: p.latitude,
      longitude: p.longitude,
    }));

    // Display first 20 properties
    console.log('📋 First 20 properties without coordinates:\n');
    console.log('='.repeat(120));
    console.log(
      `${'Name'.padEnd(40)} ${'Type'.padEnd(12)} ${'Area'.padEnd(30)} ${'City'.padEnd(20)} ${'Coords'.padEnd(15)}`
    );
    console.log('='.repeat(120));

    for (const prop of reportData.slice(0, 20)) {
      const coordsStatus =
        prop.latitude === null && prop.longitude === null
          ? 'Both NULL'
          : prop.latitude === null
          ? 'Lat NULL'
          : 'Lng NULL';
      console.log(
        `${prop.name.substring(0, 39).padEnd(40)} ${prop.propertyType.padEnd(12)} ${prop.areaName.substring(0, 29).padEnd(30)} ${prop.cityName.substring(0, 19).padEnd(20)} ${coordsStatus.padEnd(15)}`
      );
    }

    if (reportData.length > 20) {
      console.log(`\n... and ${reportData.length - 20} more properties\n`);
    }

    console.log('='.repeat(120) + '\n');

    // Save to markdown file
    const reportPath = path.resolve(process.cwd(), 'properties-without-coordinates.md');
    let markdown = '# Properties Without Coordinates\n\n';
    markdown += `**Date:** ${new Date().toISOString()}\n\n`;
    markdown += `**Total Properties Without Coordinates:** ${propertiesWithoutCoords.length}\n\n`;
    markdown += `**Off-Plan:** ${offPlanWithoutCoords.length}\n`;
    markdown += `**Secondary:** ${secondaryWithoutCoords.length}\n\n`;

    markdown += '## All Properties Without Coordinates\n\n';
    markdown +=
      '| Name | Type | Area | City | Country | Latitude | Longitude |\n';
    markdown +=
      '|------|------|------|------|---------|----------|-----------|\n';

    for (const prop of reportData) {
      const lat = prop.latitude === null ? '❌ NULL' : prop.latitude.toString();
      const lng = prop.longitude === null ? '❌ NULL' : prop.longitude.toString();
      markdown += `| ${prop.name} | ${prop.propertyType} | ${prop.areaName} | ${prop.cityName} | ${prop.countryName} | ${lat} | ${lng} |\n`;
    }

    fs.writeFileSync(reportPath, markdown, 'utf-8');
    console.log(`✅ Report saved to: ${reportPath}\n`);

    // Also save as JSON
    const jsonPath = path.resolve(process.cwd(), 'properties-without-coordinates.json');
    fs.writeFileSync(jsonPath, JSON.stringify(reportData, null, 2), 'utf-8');
    console.log(`✅ JSON data saved to: ${jsonPath}\n`);

    // Summary by area
    const areaCounts = reportData.reduce((acc, prop) => {
      const key = `${prop.areaName} (${prop.cityName})`;
      if (!acc[key]) {
        acc[key] = { offPlan: 0, secondary: 0, total: 0 };
      }
      if (prop.propertyType === 'off-plan') {
        acc[key].offPlan++;
      } else {
        acc[key].secondary++;
      }
      acc[key].total++;
      return acc;
    }, {} as Record<string, { offPlan: number; secondary: number; total: number }>);

    console.log('📊 Properties without coordinates by area (top 20):\n');
    console.log('='.repeat(100));
    console.log(
      `${'Area'.padEnd(50)} ${'Off-Plan'.padStart(10)} ${'Secondary'.padStart(10)} ${'Total'.padStart(10)}`
    );
    console.log('='.repeat(100));

    const sortedAreas = Object.entries(areaCounts).sort(
      (a, b) => b[1].total - a[1].total
    );

    for (const [area, counts] of sortedAreas.slice(0, 20)) {
      console.log(
        `${area.substring(0, 49).padEnd(50)} ${counts.offPlan.toString().padStart(10)} ${counts.secondary.toString().padStart(10)} ${counts.total.toString().padStart(10)}`
      );
    }

    if (sortedAreas.length > 20) {
      console.log(`\n... and ${sortedAreas.length - 20} more areas\n`);
    }

    console.log('='.repeat(100) + '\n');

    await AppDataSource.destroy();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error checking properties:', error);
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
    process.exit(1);
  }
}

checkPropertiesWithoutCoordinates();

