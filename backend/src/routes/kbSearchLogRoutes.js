import { Router } from "express";
import { authorizeRoles } from "../middleware/authMiddleware.js";
import { getKbSearchStats } from "../controllers/kbSearchLogController.js";

export const kbSearchLogRouter = Router();

const requireAdmin = authorizeRoles("admin", "super admin", "superadmin");

kbSearchLogRouter.get("/stats", requireAdmin, getKbSearchStats);
