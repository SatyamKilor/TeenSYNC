import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    username: { type: String, required: true,  unique: true, immutable: true },
    email: { type: String, required: true, unique: true},
    password: {type: String, required: true},
    accountType: {type: String, required: true, default: "user"},
    profilePicture: {type: String, default: "https://i.pinimg.com/474x/65/25/a0/6525a08f1df98a2e3a545fe2ace4be47.jpg"},
    bio: {type: String, max: 50, default: ""},
    followers: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
    following: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
    posts: [{type: mongoose.Schema.Types.ObjectId, ref: 'Post'}]
}, {timestamps: true});

export const User = mongoose.model('User', userSchema);