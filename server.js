const express = require('express');
const path = require('path');
const app = express();
const dotenv = require('dotenv');
dotenv.config({ path: ".env"});

connectDB = require("./server/database/connection");
connectDB();

const session = require('express-session');
const MongoStore = require('connect-mongo');
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URI })
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb', parameterLimit: 50000 }));
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, "assets")));
app.use("/css", express.static("assets/css"));
app.use("/img", express.static("assets/img"));
app.use("/js", express.static("assets/js"));

app.use(async (req, res, next) => {
    return next();
});

app.use('/', require('./server/routes/router'));
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
