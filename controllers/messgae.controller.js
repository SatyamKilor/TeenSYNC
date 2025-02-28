import {Conversation} from "../models/conversation.model.js";
import {Message} from "../models/message.model.js";


export const sendMessage = async (req, res)=>{
    try{
        const senderId = req.id;
        const recieverId = req.params.id;
        const {message} = req.body;
        
        let conversation = await Conversation.findOne({
            participants: {$all:[senderId, recieverId]}
        });

        if(!conversation){
            conversation = await Conversation.create({
                participants:[senderId, recieverId]
            })
        };

        const newMessage = await Message.create({
            senderId,
            recieverId,
            message
        })

        if(newMessage) conversation.messages.push(newMessage._id);
        await Promise.all([conversation.save(), newMessage.save()]);

        return res.redirect(`/chat/${recieverId}?conversationId=${conversation._id}`);

    }
    catch(err){
        console.log(err);
        
    }
};

export const getMessage = async(req, res)=>{
    try {
        const senderId = req.id;
        const receiverId = req.params.id;

        let conversation = await Conversation.findOne({
            participants: { $all: [senderId, receiverId] }
        });

        if (!conversation) {
            conversation = await Conversation.create({
                participants:[senderId, receiverId]
            })
        }

        return res.redirect(`/chat/${receiverId}?conversationId=${conversation._id}`);

    }
    catch(err){
        console.log(err);
        
    }
};