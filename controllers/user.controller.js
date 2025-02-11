import {User} from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import getDataUri from "../utils/dataUri.js";
import cloudinary from "../utils/cloudinary.js";
import {Post} from '../models/post.model.js'

export const register = async(req , res) => {
    try{
        const {email, password} = req.body;
        if(!email || !password){
            return res.status(401).json({
                message: "Something is missing, please fill all the fields.",
                success: false,
            });
        }
        const user = await User.findOne({email});
        if(user){
            return res.status(401).json({
                message: "User with same email address already exists.",
                success: false,
            });
        }

        function generatedAnonUsername(){
            const randomNum = Math.floor(1000+ Math.random()*9000);
            return `ANON${randomNum}`;
        }

        const username = generatedAnonUsername();

        const hashedPassword = await bcrypt.hash(password, 10);

        await User.create({
            username,
            email,
            password: hashedPassword,
        });

        return res.redirect('/login?message=account_created');


    }
    catch(error){
        console.log(error);
    }
}

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(401).json({
                message: "Something is missing, please fill all the fields.",
                success: false,
            });
        }

        let user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({
                message: "User does not exist",
                success: false,
            });
        }

        const isPasswordMatch = await bcrypt.compare(password, user.password);

        if (!isPasswordMatch) {
            return res.status(401).json({
                message: "Incorrect Password, Please try again.",
                success: false,
            });
        }

        const token = await jwt.sign({ userId: user._id }, process.env.SECRET_KEY, { expiresIn: "1d" });

        // Optionally populate posts if needed, as before
        const populatedPosts = await Promise.all(
            user.posts.map(async (postId) => {
                const post = await Post.findById(postId);
                if (post.author.equals(user._id)) {
                    return post;
                }
                return null;
            })
        );

        user = {
            _id: user._id,
            username: user.username,
            email: user.email,
            profilePicture: user.profilePicture,
            bio: user.bio,
            accountStatus: user.accountStatus,
            followers: user.followers,
            following: user.following,
            posts: populatedPosts || []
        };

        // Set token cookie
        res.cookie('token', token, {
            httpOnly: true,
            sameSite: 'strict',
            maxAge: 1 * 24 * 60 * 60 * 1000, // 1 day
        });

        // Set user data cookie
        res.cookie('user', JSON.stringify(user), {
            httpOnly: true,
            sameSite: 'strict',
            maxAge: 1 * 24 * 60 * 60 * 1000, // 1 day
        });

        // Redirect to home
        return res.redirect('/profile');
    } catch (error) {
        console.log(error);
        res.status(500).send("Internal Server Error");
    }
};


export const logout = async(_, res) => {
    try {
        // Clear the authentication cookie
        res.cookie("token", "", { maxAge: 0 });

        // Redirect the user to the homepage
        return res.redirect('/');  // Redirect to the homepage after logout
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Something went wrong during logout",
            success: false,
        });
    }
};


export const getProfile = async(req, res)=>{
    try{
        const userId = req.params.id;
        let user = await User.findById(userId).select("-password");

        return res.status(200).json({
            user,
            success: true,
        });
    }
    catch(error){
        console.log(error);
    }
};

export const editProfile = async (req, res) => {
    try {
        const userId = req.id;  // Assuming user ID is stored in req.id
        const { bio, email } = req.body;
        const profilePicture = req.file;
        let cloudResponse;

        // If a new profile picture is uploaded, handle it
        if (profilePicture) {
            const fileUri = getDataUri(profilePicture);  // Assuming getDataUri converts image to URI
            cloudResponse = await cloudinary.uploader.upload(fileUri); // Upload to cloud
        }

        // Find the user by ID, excluding password from the response
        const user = await User.findById(userId).select("-password");

        if (!user) {
            return res.status(404).json({
                message: "User not found",
                success: false,
            });
        }

        // Update bio if provided
        if (bio) {
            user.bio = bio;
        }

        if (email) {
            user.email = email;
        }

        // Update profile picture if uploaded
        if (profilePicture) {
            user.profilePicture = cloudResponse.secure_url;  // Update with cloud URL
        }

        // Save the user document after changes
        await user.save();

        // Update the user cookie with the new user data
        const updatedUser = {
            _id: user._id,
            username: user.username,
            email: user.email,
            profilePicture: user.profilePicture,
            bio: user.bio,
            accountStatus: user.accountStatus,
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
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Something went wrong while updating profile",
            success: false,
        });
    }
};


export const getSuggestedUsers = async(req, res) =>{
    try{
        const suggestedUsers = await User.find({_id: {$ne: req.id}}).select("-password");

        if(!suggestedUsers){
            return res.status(400).json({
                message: "Currently no users to suggest",
                // success: false
            });
        }; 
        
        return res.status(200).json({
            success: true,
            user: suggestedUsers
        });
    }
    catch(err){
        console.log(err);
    }
};

export const followOrUnfollowUser = async(req, res)=>{
    try{
        const followKarneWala = req.id; //main user
        const jiskoFollowKarunga = req.params.id; //user to follow

        if(followKarneWala === jiskoFollowKarunga){
            return res.status(400).json({
                message: "You cannot follow yourself",
                success: false,
            });
        }

        const user = await User.findById(followKarneWala);
        const targetUser = await User.findById(jiskoFollowKarunga);

        if(!user || !targetUser){
            return res.status(400).json({
                message: "User not found",
                success: false,
            }); 
        }

        const isFollowing = user.following.includes(jiskoFollowKarunga);
        if(isFollowing){
            await Promise.all([
                User.updateOne({_id: followKarneWala}, {$pull: {following: jiskoFollowKarunga}}),
            
                User.updateOne({_id: jiskoFollowKarunga}, {$pull: {followers: followKarneWala}}),
            ])

            return res.status(200).json({
                message: "Unfollowed Successfully",
                success: true,
            });
        } else {
            await Promise.all([
                User.updateOne({_id: followKarneWala}, {$push: {following: jiskoFollowKarunga}}),
            
                User.updateOne({_id: jiskoFollowKarunga}, {$push: {followers: followKarneWala}}),
            ])
            return res.status(200).json({
                message: "Followed Successfully",
                success: true,
            });
        }

    }
    catch(err){
        console.log(err);
        
    }
};

export const deleteAccount = async(req, res) =>{
    try{
        const {email, password} = req.body;

        if(!email || !password){
            return res.status(401).json({
                message: "Something is missing, please fill all the fields.",
                success: false,
            });
        }

        const userId = req.id;
        const user = await User.findById(userId);

        if(!user){
            return res.status(401).json({
                message: "User with given email does not exist, please try again.",
                success: false,
            });
        }

        if(user.email !== email){
            return res.status(401).json({
                message: "You are not authorized to delete this account.",
                success: false,
            });
        }

        const isPassMatch = await bcrypt.compare(password, user.password);

        if(!isPassMatch){
            return res.status(401).json({
                message: "Incorrect Password, Please try again.",
                success: false,
            });
        } else {
            await User.deleteOne({email});
            return res.status(200).json({
                message: "Account deleted successfully.",
                success: true,
            });
        }
    }
    catch(err){
        console.log(err);
        
    }
};
