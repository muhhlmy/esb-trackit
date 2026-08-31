import { prisma } from '../config/prisma.js';

export const faqController = {
  // GET /api/faqs - Mengambil semua FAQs terurut berdasarkan displayOrder
  async getAllFaqs(req, res, next) {
    try {
      const { category = '', all = 'false' } = req.query;
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const where = {};
      if (category && category !== 'all') {
        where.category = category;
      }
      // Jika bukan admin query (all !== 'true'), hanya tampilkan yang isPublished: true
      if (all !== 'true') {
        where.isPublished = true;
      }

      const faqs = await prisma.faq.findMany({
        where,
        include: {
          interactions: {
            where: {
              createdAt: { gte: thirtyDaysAgo }
            },
            select: { type: true }
          }
        },
        orderBy: [
          { displayOrder: 'asc' },
          { createdAt: 'asc' }
        ]
      });

      const formatted = faqs.map((f) => {
        let views = 0;
        let clicks = 0;
        let helpful = 0;
        let unhelpful = 0;

        f.interactions.forEach((inter) => {
          if (inter.type === 'view') views++;
          else if (inter.type === 'click') clicks++;
          else if (inter.type === 'helpful') helpful++;
          else if (inter.type === 'unhelpful') unhelpful++;
        });

        const score = views * 1 + clicks * 2 + helpful * 3 - unhelpful * 2;

        const { interactions, ...faqData } = f;
        return {
          ...faqData,
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

  // GET /api/faqs/popular - Mengambil Top 5 Popular FAQs berdasarkan formula 30 hari
  async getPopularFaqs(req, res, next) {
    try {
      const limit = parseInt(req.query.limit, 10) || 5;
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const faqs = await prisma.faq.findMany({
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

      const scoredFaqs = faqs.map((f) => {
        let views = 0;
        let clicks = 0;
        let helpful = 0;
        let unhelpful = 0;

        f.interactions.forEach((inter) => {
          if (inter.type === 'view') views++;
          else if (inter.type === 'click') clicks++;
          else if (inter.type === 'helpful') helpful++;
          else if (inter.type === 'unhelpful') unhelpful++;
        });

        const score = views * 1 + clicks * 2 + helpful * 3 - unhelpful * 2;

        const { interactions, ...faqData } = f;
        return {
          ...faqData,
          stats: {
            views,
            clicks,
            helpful,
            unhelpful,
            score
          }
        };
      });

      // Sort DESC by score, then views
      scoredFaqs.sort((a, b) => b.stats.score - a.stats.score || b.stats.views - a.stats.views);

      const topPopular = scoredFaqs.slice(0, limit);

      res.json({
        success: true,
        count: topPopular.length,
        data: topPopular
      });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/faqs - Menambahkan FAQ baru (dari CMS)
  async createFaq(req, res, next) {
    try {
      const {
        id,
        question,
        category = 'general',
        summary = '',
        steps = [],
        caseId = null,
        displayOrder,
        isPublished = true
      } = req.body;

      if (!question) {
        return res.status(400).json({
          success: false,
          error: 'Pertanyaan FAQ (question) wajib diisi.'
        });
      }

      const faqId = id || `faq-${Date.now().toString(36)}`;

      // Cari urutan terbesar jika displayOrder tidak diberikan
      let order = displayOrder;
      if (order === undefined || order === null) {
        const lastFaq = await prisma.faq.findFirst({
          orderBy: { displayOrder: 'desc' }
        });
        order = lastFaq ? lastFaq.displayOrder + 1 : 0;
      }

      const newFaq = await prisma.faq.create({
        data: {
          id: faqId,
          question,
          category,
          summary,
          steps,
          caseId: caseId || null,
          displayOrder: order,
          isPublished
        }
      });

      res.status(201).json({
        success: true,
        message: 'FAQ berhasil ditambahkan ke homepage.',
        data: newFaq
      });
    } catch (error) {
      next(error);
    }
  },

  // PUT /api/faqs/reorder - Batch reordering custom order
  async reorderFaqs(req, res, next) {
    try {
      const { orders } = req.body; // Array of { id: string, displayOrder: number }

      if (!Array.isArray(orders)) {
        return res.status(400).json({
          success: false,
          error: 'Format data urutan tidak valid. Harus berupa array of { id, displayOrder }.'
        });
      }

      const updates = orders.map((item) =>
        prisma.faq.update({
          where: { id: item.id },
          data: { displayOrder: item.displayOrder }
        })
      );

      await prisma.$transaction(updates);

      res.json({
        success: true,
        message: 'Urutan FAQ berhasil diperbarui.'
      });
    } catch (error) {
      next(error);
    }
  },

  // PUT /api/faqs/:id - Update FAQ
  async updateFaq(req, res, next) {
    try {
      const { id } = req.params;
      const {
        question,
        category,
        summary,
        steps,
        caseId,
        displayOrder,
        isPublished
      } = req.body;

      const existing = await prisma.faq.findUnique({
        where: { id }
      });

      if (!existing) {
        return res.status(404).json({
          success: false,
          error: 'FAQ tidak ditemukan.'
        });
      }

      const updated = await prisma.faq.update({
        where: { id },
        data: {
          ...(question !== undefined && { question }),
          ...(category !== undefined && { category }),
          ...(summary !== undefined && { summary }),
          ...(steps !== undefined && { steps }),
          ...(caseId !== undefined && { caseId: caseId || null }),
          ...(displayOrder !== undefined && { displayOrder: Number(displayOrder) }),
          ...(isPublished !== undefined && { isPublished: Boolean(isPublished) })
        }
      });

      res.json({
        success: true,
        message: 'FAQ berhasil diperbarui.',
        data: updated
      });
    } catch (error) {
      next(error);
    }
  },

  // DELETE /api/faqs/:id - Hapus FAQ
  async deleteFaq(req, res, next) {
    try {
      const { id } = req.params;

      const existing = await prisma.faq.findUnique({
        where: { id }
      });

      if (!existing) {
        return res.status(404).json({
          success: false,
          error: 'FAQ tidak ditemukan.'
        });
      }

      await prisma.faq.delete({
        where: { id }
      });

      res.json({
        success: true,
        message: 'FAQ berhasil dihapus dari landing page.'
      });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/faqs/:id/interaction - Mencatat event interaksi
  async recordInteraction(req, res, next) {
    try {
      const { id } = req.params;
      const { type, sessionId } = req.body;

      const validTypes = ['view', 'click', 'helpful', 'unhelpful'];
      if (!type || !validTypes.includes(type)) {
        return res.status(400).json({
          success: false,
          error: `Tipe interaksi tidak valid. Harus salah satu dari: ${validTypes.join(', ')}`
        });
      }

      const existingFaq = await prisma.faq.findUnique({
        where: { id }
      });

      if (!existingFaq) {
        return res.status(404).json({
          success: false,
          error: 'FAQ tidak ditemukan.'
        });
      }

      const interaction = await prisma.faqInteraction.create({
        data: {
          faqId: id,
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
