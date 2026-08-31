import { prisma } from '../config/prisma.js';

export const statController = {
  // GET /api/stats
  async getStats(req, res, next) {
    try {
      const [totalCases, totalFeaturedFaqs, cases] = await Promise.all([
        prisma.case.count(),
        prisma.case.count({ where: { isFeaturedOnHome: true } }),
        prisma.case.findMany({
          select: {
            category: true,
            isCustom: true
          }
        })
      ]);

      // Category breakdown
      const categoriesMap = {};
      let customCasesCount = 0;
      let builtInCasesCount = 0;

      cases.forEach((c) => {
        // Category
        categoriesMap[c.category] = (categoriesMap[c.category] || 0) + 1;

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
            totalFaqs: totalFeaturedFaqs,
            customCasesCount,
            builtInCasesCount
          },
          categories: categoriesMap
        }
      });
    } catch (error) {
      next(error);
    }
  }
};
