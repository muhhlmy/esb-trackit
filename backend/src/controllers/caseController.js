import { prisma } from '../config/prisma.js';

export const caseController = {
  // GET /api/cases - Mengambil seluruh FAQ Articles
  async getAllCases(req, res, next) {
    try {
      const { search = '', category = '', featured = '', all = 'false' } = req.query;
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const where = {};

      if (category && category !== 'all') {
        where.category = category;
      }

      if (featured === 'true') {
        where.isFeaturedOnHome = true;
      }

      if (all !== 'true') {
        where.isPublished = true;
      }

      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { summary: { contains: search, mode: 'insensitive' } },
          { problemContext: { contains: search, mode: 'insensitive' } }
        ];
      }

      const orderBy = featured === 'true'
        ? [{ homeOrder: 'asc' }, { createdAt: 'desc' }]
        : [{ homeOrder: 'asc' }, { createdAt: 'desc' }];

      const cases = await prisma.case.findMany({
        where,
        include: {
          interactions: {
            where: {
              createdAt: { gte: thirtyDaysAgo }
            },
            select: { type: true }
          }
        },
        orderBy
      });

      const formatted = cases.map((c) => {
        let views = 0;
        let clicks = 0;
        let helpful = 0;
        let unhelpful = 0;

        c.interactions.forEach((inter) => {
          if (inter.type === 'view') views++;
          else if (inter.type === 'click') clicks++;
          else if (inter.type === 'helpful') helpful++;
          else if (inter.type === 'unhelpful') unhelpful++;
        });

        const score = views * 1 + clicks * 2 + helpful * 3 - unhelpful * 2;
        const { interactions, ...caseData } = c;

        return {
          ...caseData,
          stats: {
            views,
            clicks,
            helpful,
            unhelpful,
            score
          }
        };
      });

      res.json({
        success: true,
        count: formatted.length,
        data: formatted
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/cases/popular - Top Popular FAQs (30 days score)
  async getPopularCases(req, res, next) {
    try {
      const limit = parseInt(req.query.limit, 10) || 5;
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const cases = await prisma.case.findMany({
        where: {
          isPublished: true
        },
        include: {
          interactions: {
            where: {
              createdAt: { gte: thirtyDaysAgo }
            },
            select: { type: true }
          }
        }
      });

      const scored = cases.map((c) => {
        let views = 0;
        let clicks = 0;
        let helpful = 0;
        let unhelpful = 0;

        c.interactions.forEach((inter) => {
          if (inter.type === 'view') views++;
          else if (inter.type === 'click') clicks++;
          else if (inter.type === 'helpful') helpful++;
          else if (inter.type === 'unhelpful') unhelpful++;
        });

        const score = views * 1 + clicks * 2 + helpful * 3 - unhelpful * 2;
        const { interactions, ...caseData } = c;

        return {
          ...caseData,
          stats: {
            views,
            clicks,
            helpful,
            unhelpful,
            score
          }
        };
      });

      scored.sort((a, b) => b.stats.score - a.stats.score || b.stats.views - a.stats.views);

      res.json({
        success: true,
        count: Math.min(scored.length, limit),
        data: scored.slice(0, limit)
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/cases/:id
  async getCaseById(req, res, next) {
    try {
      const { id } = req.params;
      const caseItem = await prisma.case.findUnique({
        where: { id }
      });

      if (!caseItem) {
        return res.status(404).json({
          success: false,
          error: 'Case/FAQ article tidak ditemukan.'
        });
      }

      res.json({
        success: true,
        data: caseItem
      });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/cases (DocEditor create)
  async createCase(req, res, next) {
    try {
      const {
        id,
        title,
        category = 'hardware',
        tags = [],
        summary = '',
        problemContext = '',
        actionSteps = [],
        dosAndDonts = { dos: [], donts: [] },
        snippets = [],
        isCustom = true,
        isFeaturedOnHome = false,
        homeOrder,
        isPublished = true
      } = req.body;

      if (!title || !category) {
        return res.status(400).json({
          success: false,
          error: 'Title dan Category wajib diisi.'
        });
      }

      const caseId = id || `faq-${Date.now().toString(36)}`;

      let order = homeOrder;
      if (order === undefined || order === null) {
        const last = await prisma.case.findFirst({
          orderBy: { homeOrder: 'desc' }
        });
        order = last ? last.homeOrder + 1 : 0;
      }

      const newCase = await prisma.case.create({
        data: {
          id: caseId,
          title,
          category,
          tags,
          summary,
          problemContext,
          actionSteps,
          dosAndDonts,
          snippets,
          isCustom,
          isFeaturedOnHome: Boolean(isFeaturedOnHome),
          homeOrder: order,
          isPublished: Boolean(isPublished)
        }
      });

      res.status(201).json({
        success: true,
        message: 'FAQ Article berhasil dibuat.',
        data: newCase
      });
    } catch (error) {
      next(error);
    }
  },

  // PUT /api/cases/:id (DocEditor update)
  async updateCase(req, res, next) {
    try {
      const { id } = req.params;
      const {
        title,
        category,
        tags,
        summary,
        problemContext,
        actionSteps,
        dosAndDonts,
        snippets,
        isFeaturedOnHome,
        homeOrder,
        isPublished
      } = req.body;

      const existing = await prisma.case.findUnique({
        where: { id }
      });

      if (!existing) {
        return res.status(404).json({
          success: false,
          error: 'FAQ Article tidak ditemukan.'
        });
      }

      const updatedCase = await prisma.case.update({
        where: { id },
        data: {
          ...(title !== undefined && { title }),
          ...(category !== undefined && { category }),
          ...(tags !== undefined && { tags }),
          ...(summary !== undefined && { summary }),
          ...(problemContext !== undefined && { problemContext }),
          ...(actionSteps !== undefined && { actionSteps }),
          ...(dosAndDonts !== undefined && { dosAndDonts }),
          ...(snippets !== undefined && { snippets }),
          ...(isFeaturedOnHome !== undefined && { isFeaturedOnHome: Boolean(isFeaturedOnHome) }),
          ...(homeOrder !== undefined && { homeOrder: Number(homeOrder) }),
          ...(isPublished !== undefined && { isPublished: Boolean(isPublished) })
        }
      });

      res.json({
        success: true,
        message: 'FAQ Article berhasil diperbarui.',
        data: updatedCase
      });
    } catch (error) {
      next(error);
    }
  },

  // PUT /api/cases/home-reorder (Batch reorder)
  async reorderHomeCases(req, res, next) {
    try {
      const { orders } = req.body; // Array of { id, homeOrder, isFeaturedOnHome }

      if (!Array.isArray(orders)) {
        return res.status(400).json({
          success: false,
          error: 'Format data urutan tidak valid.'
        });
      }

      const updates = orders.map((item) =>
        prisma.case.update({
          where: { id: item.id },
          data: {
            homeOrder: item.homeOrder,
            ...(item.isFeaturedOnHome !== undefined && { isFeaturedOnHome: Boolean(item.isFeaturedOnHome) })
          }
        })
      );

      await prisma.$transaction(updates);

      res.json({
        success: true,
        message: 'Urutan FAQ Homepage berhasil diperbarui.'
      });
    } catch (error) {
      next(error);
    }
  },

  // DELETE /api/cases/:id
  async deleteCase(req, res, next) {
    try {
      const { id } = req.params;

      const existing = await prisma.case.findUnique({
        where: { id }
      });

      if (!existing) {
        return res.status(404).json({
          success: false,
          error: 'FAQ Article tidak ditemukan.'
        });
      }

      await prisma.case.delete({
        where: { id }
      });

      res.json({
        success: true,
        message: 'FAQ Article berhasil dihapus.'
      });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/cases/:id/interaction (View, Click, Helpful, Unhelpful)
  async recordInteraction(req, res, next) {
    try {
      const { id } = req.params;
      const { type, sessionId } = req.body;

      const validTypes = ['view', 'click', 'helpful', 'unhelpful'];
      if (!type || !validTypes.includes(type)) {
        return res.status(400).json({
          success: false,
          error: `Tipe interaksi tidak valid.`
        });
      }

      const existing = await prisma.case.findUnique({
        where: { id }
      });

      if (!existing) {
        return res.status(404).json({
          success: false,
          error: 'FAQ Article tidak ditemukan.'
        });
      }

      const interaction = await prisma.caseInteraction.create({
        data: {
          caseId: id,
          type,
          sessionId: sessionId || null
        }
      });

      res.status(201).json({
        success: true,
        message: `Interaksi ${type} berhasil dicatat.`,
        data: interaction
      });
    } catch (error) {
      next(error);
    }
  }
};
