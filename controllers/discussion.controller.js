import { Discussion } from "../models/discussion.model.js";
import sharp from "sharp";
import cloudinary from "cloudinary";
import jwt from "jsonwebtoken";
import getDataUri from "../utils/dataUri.js";

export const createDiscussion = async (req, res) => {
    try {
        const { title, description } = req.body;
        const profilePicture = req.file;

        let cloudResponse;
            //image upload
                const optimisedImageBuffer = await sharp(profilePicture.buffer).resize({width: 800, height: 800, fit: 'inside'})
                .toFormat('jpeg', {quality: 80})
                .toBuffer(); 
        
                const fileUri = `data:content/jpeg;base64,${optimisedImageBuffer.toString('base64')}`;
        
                 cloudResponse = await cloudinary.uploader.upload(fileUri);

        if (!title || !description) {
            return res.status(400).send('Title and description are required');
        }

        await Discussion.create({
            title,
            description,
            chatDP: cloudResponse?.secure_url 
        });

        return res.redirect('/discussions');
    } catch (err) {
        console.log(err);
        return res.status(500).send('An error occurred while creating the discussion');
    }
};


export const deleteDiscussion = async (req, res) => {
    const discussionId = req.params.id;
    await Discussion.findByIdAndDelete(discussionId);
    return res.redirect('/discussions');
};