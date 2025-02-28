import express from 'express';
import { createDiscussion, deleteDiscussion } from '../controllers/discussion.controller.js';
import upload from '../middlewares/multer.js';

const router = express.Router();

router.route('/create').post(upload.single('profilePicture'), createDiscussion);
router.route('/delete/:id').get(deleteDiscussion);

export default router;