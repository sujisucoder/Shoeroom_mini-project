const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');

require('dotenv').config()

const hbs = require('express-handlebars');
const Handlebars = require('handlebars');

const fileUpload = require('express-fileupload');
const usersRouter = require('./routes/users');
const adminRouter = require('./routes/admin');
const { allowInsecurePrototypeAccess } = require('@handlebars/allow-prototype-access');


const app = express();
const db = require('./config/connection');
const session = require('express-session')

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

app.engine('hbs', hbs.engine({
  extname: 'hbs', defaultLayout: 'layout', layoutsDir: `${__dirname}/views/layout/`, partialsDir: `${__dirname}/views/partials`, handlebars: allowInsecurePrototypeAccess(Handlebars)

}));

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(fileUpload());
app.use(session({ secret: 'susuji', resave: true, saveUninitialized: true, cookie: { maxAge: 600000 }}))

db.connect((err) => {
  if (err) {
    console.log('database connection failed');
  } else {
    console.log('database connected');
  }
});
app.use('/', usersRouter);
app.use('/users', usersRouter);
app.use('/admin', adminRouter);


// catch 404 and forward to error handler
app.use((req, res, next) => {
  next(createError(404));
});

// error handler
app.use((err, req, res, next) => {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
