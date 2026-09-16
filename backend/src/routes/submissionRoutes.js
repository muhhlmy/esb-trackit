import { Router } from "express";
import { authorizePermission } from "../middleware/authMiddleware.js";
import * as submissionController from "../controllers/submissionController.js";

export const submissionRouter = Router();

const requireRead = authorizePermission("submissions", "read");
const requireWrite = authorizePermission("submissions", "write");

submissionRouter.get("/", requireRead, submissionController.listSubmissions);
submissionRouter.get(
  "/:id",
  requireRead,
  submissionController.getSubmissionById,
);
submissionRouter.post("/", requireWrite, submissionController.createSubmission);
submissionRouter.put(
  "/:id",
  requireWrite,
  submissionController.updateSubmission,
);
submissionRouter.delete(
  "/:id",
  requireWrite,
  submissionController.deleteSubmission,
);
