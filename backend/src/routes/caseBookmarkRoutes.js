import { Router } from 'express'
import {
  listMyCaseBookmarks,
  addCaseBookmark,
  removeCaseBookmark,
} from '../controllers/caseBookmarkController.js'

export const caseBookmarkRouter = Router()

// Seluruh endpoint bookmark selalu dalam konteks user yang sedang login.
caseBookmarkRouter.get('/', listMyCaseBookmarks)
caseBookmarkRouter.post('/:caseId', addCaseBookmark)
caseBookmarkRouter.delete('/:caseId', removeCaseBookmark)
