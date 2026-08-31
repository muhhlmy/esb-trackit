import { prisma } from '../config/prisma.js';

export const templateController = {
  // GET /api/templates
  async getAllTemplates(req, res, next) {
    try {
      const templates = await prisma.template.findMany({
        orderBy: { createdAt: 'asc' }
      });

      res.json({
        success: true,
        count: templates.length,
        data: templates
      });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/templates (Auth required)
  async createTemplate(req, res, next) {
    try {
      const { id, title, category, content } = req.body;

      if (!title || !category || !content) {
        return res.status(400).json({
          success: false,
          error: 'Title, category, dan content wajib diisi.'
        });
      }

      const template = await prisma.template.create({
        data: {
          id: id || `tpl-${Date.now()}`,
          title,
          category,
          content
        }
      });

      res.status(201).json({
        success: true,
        message: 'Template berhasil dibuat.',
        data: template
      });
    } catch (error) {
      next(error);
    }
  }
};
