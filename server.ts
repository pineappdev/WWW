import { prepareDatabase, logIn, addUser, addJson, getGameSchemas, getGameSchema } from './databaseBackend';
import { validateFile } from './validate';


let session = require('cookie-session');
let flash = require('connect-flash');
let exp_flash = require('express-flash');
let passport = require('passport');
let LocalStrategy = require('passport-local').Strategy;
let express = require('express');
let app = express();
let sqlite3 = require('sqlite3');
let cookie_parser = require('cookie-parser');
let body_parser = require('body-parser');
let multer = require('multer');
let upload = multer();

app.use(express.static(__dirname));   // set working directory
app.use(cookie_parser('secret'));
app.use(body_parser.urlencoded({ extended: true }));
app.use(body_parser.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: 'secret', name: 'session_id', saveUninitialized: false, resave: true, cookie: { expires: false } }));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
app.use(exp_flash());
app.use(express.json());
app.use(function (req, res, next) {
    res.locals.success_messages = req.flash('success_messages');
    res.locals.error_messages = req.flash('error_messages');
    next();
});


let nunjucks = require('nunjucks');
nunjucks.configure(__dirname + '/static/templates', {
    autoescape: true,
    express: app
});

app.get('/', (req, res) => {
    let data = {};
    if (req.user) {
        data['username'] = req.user.username;
    }

    let err = req.flash('error');
    if (err) {
        data['message'] = err;
    }
    res.render(__dirname + '/static/templates/signup.html', data
    );
});

app.post('/sendJson', upload.single('jsonFile'), (req, res) => {
    let data: Object;
    if (req.file.mimetype != 'application/json') {
        req.flash('error', 'File should have .json extension');
        res.redirect('/');
    }
    else if (!(data = validateFile(req.file.buffer.toString()))) {
        req.flash('error', 'Invalid file provided');
        res.redirect('/');
    }
    else {
        addJson(req.body.jsonName, req.file.buffer.toString(), data["planets"], data["ships"]).then(
            (response) => {
                res.redirect('/');
            },
            (error) => {
                req.flash('error', error.toString());
                res.redirect('/');
            }
        );
    }
});

app.post('/game', (req, res) => {
    let data = {};

    if (req.user) {
        data["nickname"] = req.user.username;
    }
    else {
        data["nickname"] = req.body.nickname;   // came here from chooseSituation -> begginnings.html
    }

    let promise = getGameSchema(req.body.schema.toString()).then((file_content) => {
        data['schema'] = file_content;
        res.render(__dirname + '/static/templates/mainScreen.html', data);
    },
        (error) => {
            req.flash('error', error);
            res.redirect('/');
        });
});


/*
*                     POST     REDIRECT            POST
*               /login -> /play -> /chooseSituation -> /game
*           POST
*   FLOW: / ->        REDIRECT     POST                POST
*               /play -> /startGame -> /chooseSituation -> /game
*
*               /register
*           <-
*         redirect
*/

// app.get('/game/:nickname', (req, res) => {
//     let data = {};

//     data["nickname"] = req.params.nickname.toString();

//     console.log('schema in /game/nickname ', req.body.schema);

//     res.render(__dirname + '/static/templates/mainScreen.html', data);
// });

app.get('/startGame', (req, res) => {
    res.render(__dirname + '/static/templates/startScreen.html');
});

passport.serializeUser(function (username, done) {
    return done(null, username);
});

passport.deserializeUser(function (username, done) {
    return done(null, username);
});

passport.use('local-login-register', new LocalStrategy(
    {
        usernameField: 'username',
        passwordField: 'password',
    },
    function (username, password, done) {
        return addUser(username, password, done);
    }
));

passport.use(new LocalStrategy(
    {
        usernameField: 'username',
        passwordField: 'password',
    },
    function (username, password, done) {
        return logIn(username, password, done);
    }
));

app.get('/logout', (req, res) => {
    req.logout();
    res.redirect('/');
});

app.post('/register',
    passport.authenticate('local-login-register',
        {
            failureRedirect: '/',
            successRedirect: '/',
            failureFlash: true,
        }),
);

app.post('/login',
    passport.authenticate('local', {
        failureRedirect: '/',
        failureFlash: true,
        successRedirect: '/'
    }),
);

app.post('/chooseSituation', (req, res) => {
    let data = {};
    if (req.user) {
        data["username"] = req.user.username;
    }
    else {
        data["nickname"] = req.body.username;   // came here from /startGame, filling appropriate form
    }

    let p = getGameSchemas().then((rows) => {
        data['schemas'] = rows;
        res.render(__dirname + '/static/templates/beginnings.html', data);
    },
        (error) => {
            req.flash('error', error);
            res.redirect('/');
        });
});

app.get('/downloadSchema/:filename', (req, res) => {
    getGameSchema(req.params.filename).then((file) => {
        res.send(file);
    },
        (error) => {
            req.flash('error', error);
            res.redirect('back');
        });
});

app.post('/play', (req, res) => {
    // console.log("req.body.schema in /play ", req.body.schema);
    if (req.user) {
        res.redirect(307, '/chooseSituation');
    }
    else {
        res.redirect('/startGame');
    }
});

prepareDatabase();

let server = app.listen(8080, () => {
    let host = server.address().address;
    let port = server.address().port;

    console.log("http://%s:%s", host, port);
});


