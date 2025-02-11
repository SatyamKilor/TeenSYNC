import express, { urlencoded } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import connectDB from "./utils/db.js";
import userRoute from "./routes/user.route.js";
import postRoute from "./routes/post.route.js";
import messageRoute from "./routes/message.route.js";
import path from 'path';
import { login } from "./controllers/user.controller.js";

dotenv.config({});

const app = express();
const PORT = process.env.PORT || 3000;


app.use(express.json());
app.use(cookieParser());
app.use(urlencoded({extended: true}));

// file setup to use ejs
app.set('view engine', 'ejs');


//routes

app.get("/", (req, res)=>{
    return res.render("index.ejs"); 
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
    res.render("profile.ejs", { user });  // Pass the user data to the EJS template
});

app.get('/edit', (req, res)=>{
    const userCookie = req.cookies.user;

    if (!userCookie) {
        return res.redirect('/login');  // Redirect to login if user data is not found in cookie
    }

    const user = JSON.parse(userCookie); // Parse the user data from cookie
    res.render("editProfile.ejs", { user });
});


const corsOptions = {
    origin: 'http://localhost:5173',
    credentials: true,
};

app.use(cors(corsOptions));

app.use("/api/v1/user", userRoute);
app.use("/api/v1/post", postRoute);
app.use("/api/v1/messgae", messageRoute);


app.listen(PORT, ()=>{
    connectDB();
    console.log(`Server listening on port ${PORT}`);
});
