import { prisma } from '../config/prisma.js';

export const caseController = {
  // GET /api/cases
  async getAllCases(req, res, next) {
    try {
      const { search = '', category = '', severity = '' } = req.query;

      const where = {};

      if (category && category !== 'all') {
        where.category = category;
      }

      if (severity && severity !== 'all') {
        where.severity = severity;
      }

      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { summary: { contains: search, mode: 'insensitive' } },
          { problemContext: { contains: search, mode: 'insensitive' } }
        ];
      }

      const cases = await prisma.case.findMany({
        where,
        orderBy: { createdAt: 'desc' }
      });

      res.json({
        success: true,
        count: cases.length,
        data: cases
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
          error: 'Case tidak ditemukan.'
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

  // POST /api/cases (Auth required)
  async createCase(req, res, next) {
    try {
      const {
        id,
        title,
        category,
        severity = 'medium',
        tags = [],
        summary = '',
        problemContext = '',
        actionSteps = [],
        dosAndDonts = { dos: [], donts: [] },
        snippets = [],
        isCustom = true
      } = req.body;

      if (!title || !category) {
        return res.status(400).json({
          success: false,
          error: 'Title dan Category wajib diisi.'
        });
      }

      const caseId = id || `case-${Date.now()}`;

      const newCase = await prisma.case.create({
        data: {
          id: caseId,
          title,
          category,
          severity,
          tags,
          summary,
          problemContext,
          actionSteps,
          dosAndDonts,
          snippets,
          isCustom
        }
      });

      res.status(201).json({
        success: true,
        message: 'Case berhasil dibuat.',
        data: newCase
      });
    } catch (error) {
      next(error);
    }
  },

  // PUT /api/cases/:id (Auth required)
  async updateCase(req, res, next) {
    try {
      const { id } = req.params;
      const {
        title,
        category,
        severity,
        tags,
        summary,
        problemContext,
        actionSteps,
        dosAndDonts,
        snippets
      } = req.body;

      const existing = await prisma.case.findUnique({
        where: { id }
      });

      if (!existing) {
        return res.status(404).json({
          success: false,
          error: 'Case tidak ditemukan.'
        });
      }

      const updatedCase = await prisma.case.update({
        where: { id },
        data: {
          ...(title !== undefined && { title }),
          ...(category !== undefined && { category }),
          ...(severity !== undefined && { severity }),
          ...(tags !== undefined && { tags }),
          ...(summary !== undefined && { summary }),
          ...(problemContext !== undefined && { problemContext }),
          ...(actionSteps !== undefined && { actionSteps }),
          ...(dosAndDonts !== undefined && { dosAndDonts }),
          ...(snippets !== undefined && { snippets })
        }
      });

      res.json({
        success: true,
        message: 'Case berhasil diperbarui.',
        data: updatedCase
      });
    } catch (error) {
      next(error);
    }
  },

  // DELETE /api/cases/:id (Auth required)
  async deleteCase(req, res, next) {
    try {
      const { id } = req.params;

      const existing = await prisma.case.findUnique({
        where: { id }
      });

      if (!existing) {
        return res.status(404).json({
          success: false,
          error: 'Case tidak ditemukan.'
        });
      }

      await prisma.case.delete({
        where: { id }
      });

      res.json({
        success: true,
        message: 'Case berhasil dihapus.'
      });
    } catch (error) {
      next(error);
    }
  }
};
