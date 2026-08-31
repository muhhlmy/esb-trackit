import { prisma } from '../config/prisma.js';

export const statController = {
  // GET /api/stats
  async getStats(req, res, next) {
    try {
      const [totalCases, totalTemplates, cases] = await Promise.all([
        prisma.case.count(),
        prisma.template.count(),
        prisma.case.findMany({
          select: {
            category: true,
            severity: true,
            isCustom: true
          }
        })
      ]);

      // Category breakdown
      const categoriesMap = {};
      const severityMap = { high: 0, medium: 0, low: 0 };
      let customCasesCount = 0;
      let builtInCasesCount = 0;

      cases.forEach((c) => {
        // Category
        categoriesMap[c.category] = (categoriesMap[c.category] || 0) + 1;

        // Severity
        const sev = (c.severity || 'medium').toLowerCase();
        if (severityMap[sev] !== undefined) {
          severityMap[sev]++;
        } else {
          severityMap[sev] = 1;
        }

        // Custom vs Builtin
        if (c.isCustom) {
          customCasesCount++;
        } else {
          builtInCasesCount++;
        }
      });

      res.json({
        success: true,
        data: {
          summary: {
            totalCases,
            totalTemplates,
            customCasesCount,
            builtInCasesCount
          },
          categories: categoriesMap,
          severities: severityMap
        }
      });
    } catch (error) {
      next(error);
    }
  }
};
