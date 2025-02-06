import sharp from "sharp";
import cloudinary from "cloudinary";
import {Post} from "../models/post.model.js"
import {User} from "../models/user.model.js";
import { Comment } from "../models/comment.model.js";

export const addNewPost = async (req, res)=>{
    try{
        const {caption} = req.body;
        const contents = req.file;
        const authorID = req.id;
        
        if(!contents){
            return res.status(400).json({
                message: "Please upload a file",
                success: false
            });
        }

        //image upload
        const optimisedImageBuffer = await sharp(contents.buffer).resize({width: 800, height: 800, fit: 'inside'})
        .toFormat('jpeg', {quality: 80})
        .toBuffer(); 

        const fileUri = `data:content/jpeg;base64,${optimisedImageBuffer.toString('base64')}`;

        const cloudResponse = await cloudinary.uploader.upload(fileUri);
        const post =  await Post.create({
            caption,
            contents: cloudResponse.secure_url,
            author: authorID
        });

        const user = await User.findById(authorID);
        if(user){
            user.posts.push(post._id);
            await user.save();
        }

        await post.populate({path: 'author', select:"-password"});

        return res.status(201).json({
            message: "Post created successfully",
            post,
            success: true
        });
    }
    catch(err){
        console.log(err);
    }
};

//feed
export const getAllPosts = async (req, res)=>{
    try{
        const posts = await Post.find().sort({createdAt: -1}).populate({path: 'author', select: "username, profilePicture"})
        .populate({
            path: 'comments',
            sort: {createdAt: -1},
            populate:{
                path: 'author',
                select: "username, profilePicture"
            }
        });

        return res.status(200).json({
            posts,
            success: true
        });
    }
    catch(err){
        console.log(err);
    }
};

//user only
export const getUserPosts = async (req, res)=>{
    try{
        const authorId = req.id;
        const posts = await Post.find({author: authorId}).sort({createdAt: -1}).populate({
            path: 'author',
            select: "username, profilePicture"
        }).populate({
            path: 'comments',
            sort: {createdAt: -1},
            populate:{
                path: 'author',
                select: "username, profilePicture"
            }
        });
        return res.status(200).json({
            posts,
            success: true
        });
    }
    catch(err){
        console.log(err);
    }
};

export const upvote = async(req, res)=>{
    try{
        const upvoterId = req.id;
        const postId = req.params.id;
        const post = await Post.findById(postId);

        if(!post) return res.status(404).json({
            messge: "Post not found",
            success: false
        });

        //upvote logic starts here bhai
        await post.updateOne({$addToSet: {upvotes: upvoterId}});
        await post.save();

        //implement socket.io for real time notification

        return res.status(200).json({
            message: "Post upvoted",
            success: true
        });
    }
    catch(err){
        console.log(err);
    }
};

export const unUpvote = async(req, res)=>{
    try{
        const upvoterId = req.id;
        const postId = req.params.id;
        const post = await Post.findById(postId);

        if(!post) return res.status(404).json({
            messge: "Post not found",
            success: false
        });

        //upvote logic starts here bhai
        await post.updateOne({$pull: {upvotes: upvoterId}});
        await post.save();

        //implement socket.io for real time notification

        return res.status(200).json({
            message: "Post un-upvoted",
            success: true
        });
    }
    catch(err){
        console.log(err);
    }
};

export const addComment = async(req, res)=>{
    try{
        const postId = req.params.id;
        const commentAuthorId = req.id;
        const {text} = req.body;
        const post = await Post.findById(postId);

        if(!text) return res.status(400).json({
            message: "Comment cannot be empty",
            success: false
        });

        const comment = await Comment.create({
            text,
            author: commentAuthorId,
            post: postId
        }).populate({
            path: 'author',
            select: "username, profilePicture"
        });
        
        post.comments.push(comment._id);
        await post.save();

        return res.status(201).json({
            message: "Comment added",
            comment,
            success: true
        });
    }
    catch(err){
        console.log(err);
    }
};

export const getComments = async(req, res)=>{
    try{
        const postId = req.params.id;
        const post = Post.findById(postId);

        const comments = await Comment.find({post}).populate('author', 'username, profilePicture');

        if(!comments) return res.status(404).json({
            message: 'No comments found',
            success: false
        });

        return res.status(200).json({
            message: "Found all comments",
            comments,
            success: true
        });
    }
    catch(err){
        console.log(err);
    }
};

export const deletePost = async(req, res)=>{
    try{
        const postId = req.params.id;
        const authorID = req.id;

        const post = await Post.findById(postId);
        if(!post) return res.status(404).json({
            message: 'Post not found',
            success: false
        });

        if(post.author.toString() !== authorID){
            return res.status(403).json({
                message: 'Unauthorised User Action',
                success: false
            });
        }
        await Post.findByIdAndDelete(postId);

        let user = await User.findById(authorID);
        user.posts = user.posts.filter(id => id.toString() !== postId);
        await user.save();

        await Comment.deleteMany({post: postId});
        return res.status(200).json({
            success:true,
            message:'Post deleted'
        });
    }
    catch(err){
        console.log(err);
    }
};

export const bookmarkPost = async (req, res)=>{
    try{
        const postId = req.params.id;
        const userId = req.id;
        const post = await Post.findById(postId);
        if(post) return res.status(4040).json({
            message: "Post not found",
            success: false
        });

        const user = await User.findById(userId);
        if(user.bookmarks.includes(post._id)){
            await user.updateOne({$pull: {bookmarks: post._id}});
            await user.save();
            return res.status(200).json({
                type: 'unsaved',
                message: 'Post removed from bookmarks',
                success: true
            });
        } else {
            await user.updateOne({$addToSet: {bookmarks: post._id}});
            await user.save();
            return res.status(200).json({
                type: 'saved',
                message: 'Post added to bookmarks',
                success: true
            });
        }
    }
    catch(err){
        console.log(err);
    }
};