const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const passwordValidator = require("password-validator");
const bcrypt = require("bcrypt");
const ejs = require("ejs")
const session = require("express-session");
const passport = require("passport");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');
const app = express();

app.use(express.static(__dirname + "/public"));
app.set("view engine", "ejs");

mongoose.connect("mongodb://localhost/noteDB",{useNewUrlParser: true,useUnifiedTopology: true,useFindAndModify: false});
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
    console.log("db connected");
});

const noteSchema = new mongoose.Schema({
    username : String,
    note : String,
    
})

const Note = mongoose.model("Note", noteSchema);
const userSchema = new mongoose.Schema({
    username : String,
    name : String,
    email : String,
    password : String,
    googleId : String
})
userSchema.plugin(findOrCreate);
const User = mongoose.model("User", userSchema);

app.use(bodyParser.urlencoded({extended : true}));

app.use(session({
    secret:"hello this is secret",
    resave:false,
    saveUninitialized:false
}))

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function(user, done) {
    done(null, user.id);
  });
  
  passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
      done(err, user);
    });
  });
passport.use(new GoogleStrategy({
    clientID: "31111754385sljvjsadhvhsdvjhsadhvjdvbsadvbwahs9-orv4h80rmbe8kf0cjrdfj8jkagvi7bkc.apps.googleusercontent.com",
    clientSecret: "HN9fPUXPvsdvbusdvgsdacvbsdjgbvjhsagvjsbjvbsdhvbhsR2_N-UYw0CnHXrOY",
    callbackURL: "http://localhost:3000/auth/google/secret"
  },
  function(accessToken, refreshToken, profile, cb) {
    
    User.findOrCreate({ googleId: profile.id}, function (err, user) {
        console.log(user)
      return cb(err, user);
     
    });
  }
));
app.get("/",(req,res) =>{
    if(req.session.user){
        res.redirect("/noteapp");
    }
    else{
        res.render("register");
    }
    
    
})
app.get("/profile",(req,res)=>{
    if(req.isAuthenticated()){
        res.send("hello i am log in");
    }
    else{
        res.send("not log in");
    }
})
app.get('/google',
  passport.authenticate('google', { scope: ['profile'] }));

  app.get('/auth/google/secret', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
   
    req.session.user = req.user.googleId;
    console.log(req.user.email)
    res.redirect('/noteapp/'+req.session.user);
  });

app.get("/noteapp/delete/:id", (req,res)=>{
    Note.findOneAndRemove({_id : req.params.id },(err)=>{
        if(err){
            console.log(err)
        }
        else{
            res.redirect("/noteapp");
        }
    })
})
app.post("/post",(req,res)=>{
    var noteText = req.body.noteText;
    var note = new Note({note : noteText, username : req.session.user});
    note.save();
  
    setTimeout(function r(){
        res.redirect("/noteapp");
    } , 100);
    
})

app.get("/register",(req,res)=>{
    if(req.session.user){
        res.redirect("/noteapp");
    }
    else{
        res.render("register");
    }
    
})
app.post("/register",(req,res)=>{
    
    var username = req.body.username;
    var name = req.body.name;
    var email = req.body.email;
    var password = req.body.password;
    const passwordSchema =new passwordValidator();
    passwordSchema.is().min(8);
    passwordSchema.is().max(100);
    passwordSchema.has().uppercase();
    passwordSchema.has().lowercase();
    passwordSchema.has().digits(2);
    User.find({"email" : email},(err,result)=>{
        if(err){
            console.log(err);
        }
        else{
            if(result.length == 0){
                if(passwordSchema.validate(password)){
                    bcrypt.hash(password, 10,(err,hash)=>{
                        var user = new User({
                            username:username,
                            name:name,
                            password:hash,
                            email:email
                        })
                        user.save();
                        res.redirect("/noteapp");
                    })
                }
                else{
                    console.log("password nees to change")
                }
            }
            else{
                console.log("email already exist");
            }
        }
    })
})
app.get("/login", (req,res)=>{
    if(req.session.user){
        res.redirect("/noteapp");
    }
    else{
        res.render("login");
    }
})
app.post("/login", (req,res)=>{
    var username = req.body.username;
    var password = req.body.password;
    User.find({"username": username},(err,result)=>{
        if(err){
            console.log(err)
        }
        else{
            bcrypt.compare(password, result[0].password,(err,result)=>{
                if(result == true){
                    req.session.user = username;
                    res.redirect("/noteapp/"+username);
                }
            })
        }
    })
})
app.get("/logout",(req,res)=>{
    req.session.destroy(function(err){
        if(err){
            console.log(err);
        }
        else{
            res.redirect("/register");
        }
    })
})
app.get("/noteapp", (req,res)=>{
    if(req.session.user){
        res.redirect("/noteapp/"+req.session.user);
    }
    else{
        res.redirect("login");
    }
})
app.get("/noteapp/:uName", (req,res)=>{
    if(req.session.user){
      if(req.session.user == req.params.uName){

      
            console.log("same")
            console.log(req.params.uName);
            Note.find({username : req.session.user},(err,result)=>{
                if(err){
                    console.log(err)
                }
                else{
                    console.log(result)
                    console.log("he")
                    // console.log(result)
                    res.render("noteapp", {notes : result});
                }
            })
        
      }
      else{
          console.log("not match");
          console.log(req.params.uName);
          res.redirect("/login")
      }
        
    }
    else{
        console.log("session not available");
    }
})


app.listen(3000,(req,res) =>{
    console.log("server started");
})