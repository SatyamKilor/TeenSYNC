import express from 'express';
import { createDiscussion, deleteDiscussion, joinDiscussion } from '../controllers/discussion.controller.js';
import upload from '../middlewares/multer.js';
import isAuthenticated from '../middlewares/isAuthenticated.js';

const router = express.Router();

router.route('/create').post(upload.single('profilePicture'), createDiscussion);
router.route('/delete/:id').get(deleteDiscussion);
router.route('/join/:id').get(isAuthenticated ,joinDiscussion);

export default router;