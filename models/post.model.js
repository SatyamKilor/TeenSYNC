import mongoose from "mongoose";

const postScehma = new mongoose.Schema({
    author: {type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true},
    contents: {type: String},
    caption: {type: String, default: ""},
    upvotes: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
},{timestamps: true});

export const Post = mongoose.model('Post', postScehma);