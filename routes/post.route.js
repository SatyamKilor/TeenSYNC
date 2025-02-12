import express from "express";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import upload from "../middlewares/multer.js";
import {addComment, addNewPost, bookmarkPost, deletePost, editPost, getAllPosts, getComments, getUserPosts, unUpvote, upvote} from "../controllers/post.controller.js";

const router = express.Router();

router.route("/addpost").post(isAuthenticated, upload.single('contents'), addNewPost);
router.route("/edit/:id").post(isAuthenticated, editPost);
router.route("/all").get(isAuthenticated, getAllPosts);
router.route("/userpost/all").get(isAuthenticated, getUserPosts);
router.route("/:id/upvote").get(isAuthenticated,upvote);
router.route("/:id/unupvote").get(isAuthenticated,unUpvote);
router.route("/:id/comment").post(isAuthenticated,addComment);
router.route("/:id/comment/all").post(isAuthenticated,getComments);
router.route("/delete/:id").post(isAuthenticated,deletePost);
router.route("/:id/bookmark").post(isAuthenticated,bookmarkPost);

export default router;