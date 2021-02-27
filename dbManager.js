const MongoClient = require('mongodb').MongoClient;
var getID = require('mongodb').ObjectID();
var url = "mongodb://127.0.0.1:27017/";
let database = {};

let mongoClient = MongoClient(url, {useUnifiedTopology: true});

//the only copy of our db
let myDB; 

var connect = async function(dbName){
    try{
	    await mongoClient.connect();
	    myDB = mongoClient.db(dbName);
	
	    if(!myDB){
	        throw new Error("Database failed connect. Please try again"); 
	    }
	    else{
	        console.log(`Connected to ${dbName}`);
	        return myDB;
	    }
    }
    catch(err){
	    console.log("error 1 " + err.message);
    }
}

//call get(db name) to initialize the db connection, after that you can call
//get() to just get the connection anywhere you want
database.get = function(dbName){
    if(myDB){
	    return myDB;
    }
    else{
    	return connect(dbName);
    }
}

//call close when you want to terminate the database connection
database.close = async function(){
    try{
	    await mongoClient.close();
	    return;
    }
    catch(err){
    	console.log(err.message);
    }
}

module.exports = database;
