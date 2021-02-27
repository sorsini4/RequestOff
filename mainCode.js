var request   = require("request-off"); 
let crypto    = require("crypto");
let bcrypt    = require("bcrypt");
var http      = require("http");
var qString   = require("querystring");
let dbManager = require("./dbManager");
let express   = require("express");
let session   = require("express-session");
let bp        = require("body-parser");
let app       = express();
var ObjectID  = require("mongodb").ObjectId;
var mongoNum  = require("mongodb").Number;
app.use(express.static('images'))
let localUser; //this is the user, not trusted yet

function docifyRequest(postParams) {
    let doc = {
        userName: postParams.userName,
        startDate: postParams.startDate,
        endDate: postParams.endDate,
        hours: postParams.hours
    };
    return doc;
}

function compareCurrentDate(startDate) {
    var today = new Date();
    today = today.toISOString().slice(0,10);
    if(today > startDate) {
        return false;
    }
    else {
        return true;
    }
}

function received(req, res, next) {
    console.log("Request for " + req.url + " page " + new Date().toLocaleTimeString("en-US",{timeZone: "America/New_york"}));
    next();
}

//does not work
function signOut(req, res, trustedUser) {
    if(req.session.user) {
        trustedUser = localUser;
        res.redirect('/login');
    }
}

app.set('views', './views');
app.set('view engine', 'pug');
app.use(received);
app.use(session({
    secret: 'APWProj',
    saveUninitialized: false,
    resave: false
}));

app.get('/', function(req, res) {
    if(!req.session.user) {
        res.redirect('/login');
    }
    else {
        res.render('home');    
    }
});

app.get('/home', function(req, res) {
    res.render('home', { trustedUser: localUser });
});

app.get('/signup', function(req, res, next) {
    if(req.session.user) {
        res.redirect('/home');
    }
    else {
        res.render('signup');
    }
});

app.get('/login', function(req, res, next) {
    if(req.session.user) {
        res.redirect('/home');
    }
    else {
        res.render('login');
    }
});

app.get('/insertHours', function(req, res) {
    if(!req.session.user) {
        res.redirect('/login');
    }
    else {          
        res.render('insertHours', { trustedUser: localUser }); 
    }
});

app.get('/user/:_id', async(req, res)=> {
    if(!req.session.user) {
        res.redirect('/login');
    }
    else {
        let users = dbManager.get().collection("users");
        let daysOff = dbManager.get().collection("daysOff");
        
        try {
            let user = await users.findOne({ _id: req.params._id });
            let days = daysOff.find({ userName: req.params._id });
            let dayArray = await days.toArray();
            let current;
            for(item in dayArray) {
                current = new request(dayArray[item].userName, dayArray[item].startDate, dayArray[item].endDate, dayArray[item].hours);
                console.log(current);
            }
            res.render('user', {trustedUser: localUser, searchID: user._id, daysOff: dayArray});
        }
        catch(err) {
            console.log(err.message);
            res.status(500).render('error', {trustedUser: localUser, errorStat: 500, errorMSG: err.message});
        }
    }
});

var postData;
function moveOn(postData) {
    let proceed = true;
    postParams = qString.parse(postData);

    for(property in postParams) {
        if(postParams[property].toString().trim() == '') {
            proceed = false;
        }
    }
    return proceed; 
}

app.post('/signup', bp.urlencoded({extended: false}), async(req, res, next)=>{
    let exists;
    let newUser;    
    let check = false;
    const salt = await bcrypt.genSalt(10);

    newUser = {_id: req.body.userName, firstName: req.body.fName, lastName: req.body.lName, company: req.body.company, position: req.body.position, yearsAtCompany: Number(req.body.yearsAtCompany), password: await bcrypt.hash(req.body.password, salt), email: req.body.email, emailVerified: false};
    
    try {
        emailExists = await dbManager.get().collection("users").findOne({email: req.body.email}, {_id:0, email:1});
        usernameExists = await dbManager.get().collection("users").findOne({_id: req.body.userName});
    }
    catch(err) {
        console.log(err.message);
    }
    finally {
        if(emailExists || usernameExists || req.body.password != req.body.passwordAgain) {
            res.render('signup', {error: `The email, or username you entered already exists, or your passwords did not match.`});
        }
        else {
            try {
                await dbManager.get().collection("users").insertOne(newUser);
                console.log("successful insert of new user"); 
            }
            catch(err) {
                console.log(err);
                res.render('error', {errorStat: 500, errorMSG: `${err.message}`});
            }
            res.redirect('/login');
        }
    }
});

app.post('/login', bp.urlencoded({extended: false}), async(req, res, next)=>{
    
    let untrusted = {user: req.body.userName, password: req.body.password};

    try {
        let result = await dbManager.get().collection("users").findOne({_id: req.body.userName});
        let match = await bcrypt.compare(untrusted.password, result.password);        

        if(match) {
            let trusted = { _id: result._id.toString() };
            req.session.user = trusted;
            localUser = result;
            res.redirect('/insertHours');
        }
    }
    catch(err) {
        res.render('login', {error: `The username or password you entered was incorrect. Please try again.`}); 
    }
});

app.post('/insertHours', function(req, res) {
    postData = '';
    req.on('data', (data) => {
        postData += data;
    });
    
    req.on('end', async ()=> {
        console.log(postData);
        if(moveOn(postData)) {
            let col = dbManager.get().collection("daysOff");
            try {
                //if the start date is less than the end date & the curr date go ahead and continue, otherwise throw an err
                if(postParams.startDate <= postParams.endDate && compareCurrentDate(postParams.startDate)) {
                    var requestOff = new request(req.session.user._id, postParams.startDate, postParams.endDate, postParams.hours);
                    let curDoc = docifyRequest(requestOff);
                    let result = await col.insertOne(curDoc);
                }
                else {
                    throw(err);
                }
                res.render('insertHours', { trustedUser: localUser, error: `` });
            }
            catch(err) {  
                res.render('insertHours', {trustedUser: localUser, error: `The data entered was invalid. Please try again.`});
            }
        }
        else {
            res.render('insertHours', { trustedUser: localUser, error: `` });
        }
    }); 
});

//error route
app.use('*', function(err, req, res, next) {
    res.writeHead(404);
    res.end(`<h1> ERROR 404. ${req.url} NOT FOUND</h1><br><br>`);
    console.log(err);
});

app.use(function(err, req, res, next) {
    res.writeHead(500);
    res.render('error', { trustedUser: localUser, errorStat: 500, errorMSG: err.message });
});

app.listen(6900, async ()=> {
    try{
        await dbManager.get("APWProj");
        console.log("Successfully connected to port and the database.");     
    }
    catch(error){
        console.log(error.message);
    }
    console.log("Server is running....");
});



