import { Router, Request, Response } from 'express';
import { AppDataSource } from '../../config/database';

const router = Router();

/**
 * Helper to recursively extract routes from Express Router stack
 */
function getRoutes(stack: any[], prefix: string = ''): any[] {
  const routes: any[] = [];

  stack.forEach((layer: any) => {
    if (layer.route) {
      // Direct route
      const path = prefix + layer.route.path;
      const methods = Object.keys(layer.route.methods).map(m => m.toUpperCase());
      routes.push({ path, methods, type: 'route' });
    } else if (layer.name === 'router' && layer.handle.stack) {
      // Nested router
      const newPrefix = prefix + (layer.regexp.source.replace('\\/', '/').replace('^\\', '').replace('\\/?(?=\\/|$)', '') || '');
      routes.push(...getRoutes(layer.handle.stack, newPrefix));
    }
  });

  return routes;
}

/**
 * GET /api/system/info
 * Returns all registered routes and database entities
 */
router.get('/info', async (req: Request, res: Response) => {
  try {
    // 1. Extract Entities (Tables)
    const tables = AppDataSource.entityMetadatas.map(metadata => ({
      name: metadata.name,
      tableName: metadata.tableName,
      columns: metadata.columns.map(col => ({
        name: col.propertyName,
        type: col.type,
        isNullable: col.isNullable,
      })),
    }));

    // 2. Extract Routes
    // Express stores the whole router stack in req.app._router.stack
    const allRoutes = getRoutes(req.app._router.stack);

    res.json({
      success: true,
      data: {
        tables,
        routes: allRoutes,
        system: {
          nodeVersion: process.version,
          platform: process.platform,
          memory: process.memoryUsage(),
          uptime: process.uptime(),
        }
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
