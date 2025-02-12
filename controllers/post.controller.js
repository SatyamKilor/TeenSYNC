import sharp from "sharp";
import cloudinary from "cloudinary";
import jwt from "jsonwebtoken";
import getDataUri from "../utils/dataUri.js";
import {Post} from "../models/post.model.js"
import {User} from "../models/user.model.js";
import { Comment } from "../models/comment.model.js";

export const addNewPost = async (req, res)=>{
    try{
        const {caption} = req.body;
        const image = req.file;
        const authorID = req.id;
        
        if(!image){
            return res.status(400).json({
                message: "Please upload a file",
                success: false
            });
        }

        //image upload
        const optimisedImageBuffer = await sharp(image.buffer).resize({width: 800, height: 800, fit: 'inside'})
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


        const updatedUser = {
            _id: user._id,
            username: user.username,
            email: user.email,
            profilePicture: user.profilePicture,
            bio: user.bio,
            followers: user.followers,
            following: user.following,
            posts: await Promise.all(
                user.posts.map(async (postId) => {
                    const post = await Post.findById(postId);
                    if (post.author.equals(user._id)) {
                        return post;
                    }
                    return null;
                })
            ) || []
        };

        
                res.cookie('user', JSON.stringify(updatedUser), {
                    httpOnly: true,
                    sameSite: 'strict',
                    maxAge: 1 * 24 * 60 * 60 * 1000, // 1 day
                });
        
                // Generate a new JWT token with the updated user data
                const newToken = jwt.sign(
                    { userId: user._id },  // User ID is embedded in the token
                    process.env.SECRET_KEY,  // Your JWT secret
                    { expiresIn: '1h' }  // Adjust the expiration time
                );
        
                // Set the new JWT token in the cookie (or use any other method to send it back)
                res.cookie('token', newToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });

        return res.redirect(`/profile`);
    }
    catch(err){
        console.log(err);
    }
};

export const editPost = async (req, res)=>{
    try{
        const { bio } = req.body; 
        const postId = req.params.id; 
        const authorID = req.id;  
        const user = await User.findById(authorID);

        const post = await Post.findById(postId);

        if (post && post.author.toString() === authorID) {
                post.caption = bio;  
                await post.save();  
            }

        const updatedUser = {
            _id: user._id,
            username: user.username,
            email: user.email,
            profilePicture: user.profilePicture,
            bio: user.bio,
            followers: user.followers,
            following: user.following,
            posts: await Promise.all(
                user.posts.map(async (postId) => {
                    const post = await Post.findById(postId);
                    if (post.author.equals(user._id)) {
                        return post;
                    }
                    return null;
                })
            ) || []
        };

        
                res.cookie('user', JSON.stringify(updatedUser), {
                    httpOnly: true,
                    sameSite: 'strict',
                    maxAge: 1 * 24 * 60 * 60 * 1000, // 1 day
                });
        
                // Generate a new JWT token with the updated user data
                const newToken = jwt.sign(
                    { userId: user._id },  // User ID is embedded in the token
                    process.env.SECRET_KEY,  // Your JWT secret
                    { expiresIn: '1h' }  // Adjust the expiration time
                );
        
                // Set the new JWT token in the cookie (or use any other method to send it back)
                res.cookie('token', newToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });

        return res.redirect(`/profile`);
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
export const getUserPosts = async (req, res) => {
    try {
        const authorId = req.id;  // Assuming req.id contains the logged-in user's ID
        const posts = await Post.find({ author: authorId }).sort({ createdAt: -1 }).populate({
            path: 'author',
            select: "username, profilePicture"
        }).populate({
            path: 'comments',
            sort: { createdAt: -1 },
            populate: {
                path: 'author',
                select: "username, profilePicture"
            }
        });

        return res.status(200).json({
            posts,
            success: true
        });
    } catch (err) {
        console.log(err);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch posts"
        });
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
       // Update the user cookie with the new user data
               const updatedUser = {
                   _id: user._id,
                   username: user.username,
                   email: user.email,
                   profilePicture: user.profilePicture,
                   bio: user.bio,
                   followers: user.followers,
                   following: user.following,
                   posts: await Promise.all(
                       user.posts.map(async (postId) => {
                           const post = await Post.findById(postId);
                           if (post.author.equals(user._id)) {
                               return post;
                           }
                           return null;
                       })
                   ) || []
               };
       
               res.cookie('user', JSON.stringify(updatedUser), {
                   httpOnly: true,
                   sameSite: 'strict',
                   maxAge: 1 * 24 * 60 * 60 * 1000, // 1 day
               });
       
               // Generate a new JWT token with the updated user data
               const newToken = jwt.sign(
                   { userId: user._id },  // User ID is embedded in the token
                   process.env.SECRET_KEY,  // Your JWT secret
                   { expiresIn: '1h' }  // Adjust the expiration time
               );
       
               // Set the new JWT token in the cookie (or use any other method to send it back)
               res.cookie('token', newToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
       
               // Redirect to the profile page after successful update
               return res.redirect('/profile'); // Redirect to the user's profile page after update

        
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