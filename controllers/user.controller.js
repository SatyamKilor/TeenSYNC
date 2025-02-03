import {User} from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import getDataUri from "../utils/dataUri.js";
import cloudinary from "../utils/cloudinary.js";

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

        return res.status(201).json({
            message: "Account created successfully.",
            success: true,
        });
    }
    catch(error){
        console.log(error);
    }
}

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

export const login = async (req, res) =>{
    try{
        const {email, password} = req.body;

        if(!email || !password){
            return res.status(401).json({
                message: "Something is missing, please fill all the fields.",
                success: false,
            });
        }

        let user = await User.findOne({email});
        if(!user){
            return res.status(401).json({
                message: "User does not exist",
                success: false,
            });
        }

        const isPasswordMatch = await bcrypt.compare(password, user.password);

        if(!isPasswordMatch){
            return res.status(401).json({
                message: "Incorrect Password, Please try again.",
                success: false,
            });
        }

        user = {
            _id: user._id,
            username: user.username,
            email: user.email,
            profilePicture: user.profilePicture,
            bio: user.bio,
            accountStatus: user.accountStatus,
            followers: user.followers,
            following: user.following,
        }

        const token = await jwt.sign({userId: user._id}, process.env.SECRET_KEY, {expiresIn: "1d"});

        return res.cookie('token', token, {httpOnly: true, sameSite: 'strict', maxAge: 1*24*60*60*1000}).json({
            message: `Welcom back ${user.username}`,
            success: true,
            user
        });

    }
    catch(error){
        console.log(error);
    }
};

export const logout = async(_, res) =>{
    try{
        return res.cookie("token","",{maxAge: 0}).json({
            message: "Logged out successfully",
            success: true,
        });
    }
    catch(error){
        console.log(error);
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

export const editProfile = async(req, res) =>{
    try{
        const userId = req.id;
        const {bio, accountStatus} = req.body;
        const profilePicture = req.file;
        let cloduResponse;

        if(profilePicture){
            const fileUri = getDataUri(profilePicture);
            cloduResponse = await cloudinary.uploader.upload(fileUri);
        }
        
        const user = await User.findById(userId).select("-password");

        if(!user){
            return res.status(404).json({
                message: "User not found",
                success: false,
            });
        }

        if(bio){
            user.bio = bio;
        }

        if(accountStatus){
            user.accountStatus = accountStatus;
        }

        if(profilePicture){
            user.profilePicture = cloduResponse.secure_url;
        }

        await user.save();

        return res.status(200).json({
            message: "Profile updated successfully",
            success: true,
            user
        });
    }
    catch(error){
        console.log(error);
        
    }
}

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

