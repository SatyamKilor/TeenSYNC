import mongoose from "mongoose";

const discussionSchema = new mongoose.Schema({

    participants : [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    }],

    messages: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message",
    }],

    title: {
        type: String,
        required: true,
    },

    description: {
        type: String,
        default: "",
    },

    chatDP: {
        type: String,
        default: "",
    }
}, {timestamps: true});

export const Discussion = mongoose.model("Discussion", discussionSchema);