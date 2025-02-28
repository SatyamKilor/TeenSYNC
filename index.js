import express, { urlencoded } from "express";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import connectDB from "./utils/db.js";
import userRoute from "./routes/user.route.js";
import postRoute from "./routes/post.route.js";
import messageRoute from "./routes/message.route.js";
import { login } from "./controllers/user.controller.js";
import { Post } from "./models/post.model.js";
import { User } from "./models/user.model.js";
import { Server } from "socket.io"; 
import http from "http";
import { Conversation } from "./models/conversation.model.js";
import { Message } from "./models/message.model.js";
import { log } from "console";

dotenv.config({});

const app = express();
const PORT = process.env.PORT || 3000;


const server = http.createServer(app); 
const io = new Server(server);  

app.use(express.json());
app.use(cookieParser());
app.use(urlencoded({extended: true}));

app.set('view engine', 'ejs');

//real time chatting logic
 let activeUsers = {};

 io.on('connection', (socket) => {

    socket.on('userConnected', (userId) => {
        activeUsers[userId] = socket.id;
    });

    socket.on('sendMessage', async (message, receiverId, senderId) => {
        const receiverSocketId = activeUsers[receiverId];
        if (receiverSocketId) {
            socket.to(receiverSocketId).emit('receiveMessage', {message});
        }

        try{
            
            let conversation = await Conversation.findOne({
                participants: {$all:[senderId, receiverId]}
            });
    
            if(!conversation){
                conversation = await Conversation.create({
                    participants:[senderId, receiverId]
                })
            };
    
            const newMessage = await Message.create({
                senderId,
                receiverId,
                message
            })
    
            if(newMessage) conversation.messages.push(newMessage._id);
            await Promise.all([conversation.save(), newMessage.save()]);
        }   
        
        catch(err){
            console.log(err);
        }

    });

    socket.on('disconnect', () => {
        for (let userId in activeUsers) {
            if (activeUsers[userId] === socket.id) {
                delete activeUsers[userId];
                break;
            }
        }
    });
});


//routes

app.get("/", (req, res)=>{
    return res.render("index.ejs"); 
});


app.get("/home", async(req, res)=>{

    const posts = await Post.find();
    const users = await User.find();
    const loggedUserCookie = req.cookies.user;
    const loggedUser = JSON.parse(loggedUserCookie);

    return res.render("home.ejs", {posts, users, loggedUser}); 
});


app.get('/chat', async (req, res) => {

    const loggedUserCookie = req.cookies.user;
    const loggedUser = JSON.parse(loggedUserCookie);
    const otherUsers = await User.find({ _id: { $ne: loggedUser._id } });
    
    res.render('testChat.ejs', {loggedUser, otherUsers});
});

app.get('/chat/:id', async (req, res) => {

    const loggedUserCookie = req.cookies.user;
    const loggedUser = JSON.parse(loggedUserCookie);
    const otherUsers = await User.find({ _id: { $ne: loggedUser._id } });
    const recUser = await User.findById(req.params.id);
    const {conversationId} = req.query;
    const conversation = await Conversation.findById(conversationId).populate('messages participants');

    
    res.render('testChatwithMessages.ejs', {loggedUser , recUser, otherUsers, conversation});
});

app.get("/register", (req, res)=>{
    return res.render("register.ejs"); 
});

app.get("/sign-in", (req, res)=>{
    return res.render("register.ejs");
})

app.get("/login", (req, res)=>{
    return res.render("login.ejs");
})

app.post("/login", login)

app.get("/profile", (req, res) => {
    const userCookie = req.cookies.user;

    if (!userCookie) {
        return res.redirect('/login');  // Redirect to login if user data is not found in cookie
    }

    const user = JSON.parse(userCookie); // Parse the user data from cookie

    res.render("profile.ejs", { user: user });  // Pass the user data to the EJS template
});


app.get('/:id/profile', async (req, res) => {
    const userId = req.params.id;
    const user = await User.findById(userId).populate({
        path: 'posts'
    });

    const loggedUserCookie = req.cookies.user;
    const loggedUser = JSON.parse(loggedUserCookie);
    
    res.render('otherProfile.ejs', { user, loggedUser });
});


app.get('/edit', (req, res)=>{
    const userCookie = req.cookies.user;

    if (!userCookie) {
        return res.redirect('/login');  // Redirect to login if user data is not found in cookie
    }

    const user = JSON.parse(userCookie); // Parse the user data from cookie
    res.render("editProfile.ejs", { user });
});

app.get('/new-post', (req, res)=>{
    res.render('newPost.ejs');
});

app.get('/delete-post/:id', (req,res)=>{
    let postId = req.params.id;
    res.render("deletePost.ejs", {postId});
});

app.get('/edit-post/:id', async (req,res)=>{
    try {
        const postId = req.params.id;
        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).send('Post not found');
        }
        res.render('editPost', { 
            postId: post._id, 
            postBio: post.caption 
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error retrieving post');
    }
});

app.get('/search', async (req, res)=>{
    const users = await User.find();  // Fetch all users
   
    const userCookie = req.cookies.user;
    const user = JSON.parse(userCookie);
    const userID = user._id;
    
    
    res.render('searchPage.ejs', {users, userID});
});

app.use("/api/v1/user", userRoute);
app.use("/api/v1/post", postRoute);
app.use("/api/v1/messgae", messageRoute);


server.listen(PORT, ()=>{
    connectDB();
    console.log(`Server listening on port ${PORT}`);
});
