const express = require('express');
const bodyParser = require('body-parser');
const MongoClient = require('mongodb').MongoClient;
const format = require('util').format;
const session = require('express-session');
const datatime = require('node-datetime');

var app = express();
var urlEncodedParser = bodyParser.urlencoded({extended: false});

app.set('view engine', 'ejs');
app.use('/public', express.static('public'));

app.use(session({
    secret: 'LHqH4IXmGa7yQPVCZn53wTanhAirvmZe',
    saveUninitialized: true,
}));

app.get('/', function (req, res) {
  if (req.session.role) {
    MongoClient.connect('mongodb://localhost:27017', function (err, client) {
      client.db('todos').collection('todo').find({ email: req.session.email }).toArray(function (err, result) {
        if (err) throw err;
        res.render('home', {role: req.session.role, todosList: result});
        client.close();
      });
    });
  }
  else {
    res.render('login');
  }
  console.log("//////////////////////////////////////////");
  console.log("req.session.role: " + req.session.role);
  console.log("req.session.email: " + req.session.email);
});

app.post('/', urlEncodedParser, function (req, res) {
  MongoClient.connect('mongodb://localhost:27017', function (err, client) {
    if (err) { console.log(err); return; }

    console.log("//////////////////////////////////////////");
    console.log("login email: " + req.body.email.toLowerCase());
    console.log("login password: " + req.body.password);

    var login_successful = false;
    client.db('todos').collection('users').findOne({ email: req.body.email.toLowerCase(), password: req.body.password, active: true }, function (err2, result) {
      if (err2) { console.log(err2); return; }
      if (result) login_successful = true;

      console.log("login result: " + result);

      if (login_successful) {
        if (result.role == "admin") {
          req.session.role = "admin";
        }
        else {
          req.session.role = "user";
        }
        req.session.email = result.email;
        res.redirect('/');
      }
      else {
        res.render('login', { login_failed: true });
      }
      client.close();
    });
  });
});

app.get('/logout', function (req, res) {
  console.log("//////////////////////////////////////////");
  console.log("logout role: " + req.session.role);
  console.log("logout email: " + req.session.email);
  req.session.role = undefined;
  req.session.email = undefined;
  res.redirect('/');
});

app.get('/userlist', function (req, res) {
  if (req.session.role == "admin") {
    res.render("userlist");
  }
  else{
    res.render("404");
  }
});

app.post('/complete', urlEncodedParser, function (req, res) {
  MongoClient.connect('mongodb://localhost:27017', function (err, client) {
    var collection = client.db('todos').collection('todo');
    collection.find({ }).toArray(function (err, result) {
      if (err) throw err;
      var re = result.find(x => x._id == req.body.todo_id);
      var cmp = false;
      var cmpData = "";
      if (req.body.completedCheckbox) {
        cmp = true;
        cmpData = datatime.create().format('d.m.Y H:M:S');
        console.log("cmpData " + cmpData);
      }

      console.log("req.body.completedCheckbox " + req.body.completedCheckbox);
      collection.updateOne(re, {$set: { "Completed" : cmp, "Data" : cmpData} }, function (err2) {
        if (err2) throw err2;
        client.close();
        res.redirect('/');
      });
    });
  });
});

// app.use(function(req, res, next) {
//   res.render('404');
// });

app.listen(3000, function () {
  console.log("Server start at port - 3000");
});
