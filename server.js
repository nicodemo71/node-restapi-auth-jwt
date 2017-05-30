//https://scotch.io/tutorials/authenticate-a-node-js-api-with-json-web-tokens
var express     = require('express');
var app         = express();
var bodyParser  = require('body-parser');
var morgan      = require('morgan');
var mongoose    = require('mongoose');

var jwt    = require('jsonwebtoken'); // used to create, sign, and verify tokens
var config = require('./config'); // get our config file
var User   = require('./models/user'); // get our mongoose model

// =======================
// configuration =========
// =======================
var port = process.env.PORT || 8080; // used to create, sign, and verify tokens
//NOTE: mongoose suggerisce di utilizzare le promise native (http://mongoosejs.com/docs/promises.html) e non più quelle proprie (come da vecchie versioni)
mongoose.Promise = require('q').Promise; //npm install q
mongoose.connect(config.database); // connect to database
app.set('superSecret', config.secret); // secret variable

// use body parser so we can get info from POST and/or URL parameters
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// use morgan to log requests to the console
app.use(morgan('dev'));

// =======================
// routes ================
// =======================
// basic route

app.get('/setup', function(req, res) {

    // create a sample user
    var nick = new User({
        name: 'Nick Lopic',
        password: 'password2',
        admin: true
    });

    // save the sample user
    nick.save(function(err) {
        if (err) throw err;

        console.log('User saved successfully');
        res.json({ success: true });
    });
});

app.get('/', function(req, res) {
    res.send('Hello! The API is at http://localhost:' + port + '/api');
});

// API ROUTES -------------------
// we'll get to these in a second
var apiRoutes = express.Router();

apiRoutes.get('/', function(req, res){
    res.json({"message" : "Benvenuto nell API router"});
});

apiRoutes.get('/users',function (req, res) {
    User.find({}, function(err, users){
        res.json(users);
    })
});

apiRoutes.post('/authenticate', function (req, res) {
   User.findOne({
       name: req.body.name
   }, function(err, user){
       if (err) throw err;

       if (!user) {
           res.json({success: false, message: 'Auth failed'});
       } else {
           var token = jwt.sign(user, app.get('superSecret'), {
               expiresIn: 1440 //24 ore
           });

           res.json({
               success: true,
               message: 'logged in',
               token: token
           })
       }
   })
});

// route middleware to verify a token
apiRoutes.use(function (req, res, next) {
    // check header or url parameters or post parameters for token
    var token = req.body.token || req.query.token || req.headers['x-access-token'];
    if (token) {
        jwt.verify(token, app.get('superSecret'), function( err, decoded) {
            if (err) {
                return res.json({success: false, message: 'failed to authenticate token'});
            } else {
                req.decoded = decoded;
                next();

            }
        })
    } else {
        //no token
        return res.status(403).send({
            success: false,
            message: 'no token provided'
        });
    }
})

app.use('/api', apiRoutes);

// =======================
// start the server ======
// =======================
app.listen(port);
console.log('Magic happens at http://localhost:' + port);