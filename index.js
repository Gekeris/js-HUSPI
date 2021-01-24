const express = require('express');
const bodyParser = require('body-parser');
const MongoClient = require('mongodb').MongoClient;
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
});

app.post('/', urlEncodedParser, function (req, res) {
  MongoClient.connect('mongodb://localhost:27017', function (err, client) {
    if (err) { console.log(err); return; }

    var login_successful = false;
    client.db('todos').collection('users').findOne({ email: req.body.email.toLowerCase(), password: req.body.password, active: true }, function (err2, result) {
      if (err2) { console.log(err2); return; }
      if (result) login_successful = true;

      if (login_successful) {
        req.session.role = result.role;
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

app.get('/signUp', function (req, res) {
  res.render('signUp')
});

app.post('/signUp', urlEncodedParser, function (req, res) {
  if (req.body.name.length > 0 && req.body.surname.length > 0 && req.body.email.length > 0 && req.body.password.length > 0) {
    MongoClient.connect('mongodb://localhost:27017', function (err, client) {
      var collection =client.db('todos').collection('users');
      collection.findOne({ email: req.body.email.toLowerCase() }, function (err2, result) {
        if (err) { console.log(err2); return;}
        if (result) { res.render('login', {signUp_failed: true}); client.close(); }
        else {
          var user = {
            name: req.body.name,
            surname: req.body.surname,
            email: req.body.email.toLowerCase(),
            password: req.body.password,
            active: true,
            role: req.body.role
          };
          collection.insertOne(user, function (err3, result) {
            if (err3) { console.log(err3); return; }
            req.session.role = result.role;
            req.session.email = result.email;
            client.close();
            res.redirect('/');
          });
        };
      });
    });
  }
  else {
    res.render('signUp', {empty_fields: true});
  };
});

app.use(function(req, res, next) {
  if (req.session.role) {
    next();
  }
  else {
    res.redirect('/');
  }
});

app.get('/logout', function (req, res) {
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
      }

      collection.updateOne(re, {$set: { "Completed" : cmp, "Data" : cmpData} }, function (err2) {
        if (err2) throw err2;
        client.close();
        res.redirect('/');
      });
    });
  });
});

app.post('/createTodo', urlEncodedParser, function (req, res) {
  res.render("editTodo")
});

app.post('/newTodo', urlEncodedParser, function (req, res) {
  if (req.body.Name.length > 0 && req.body.Text.length > 0) {
    var todo = {
      email: req.session.email,
      Name: req.body.Name,
	    Data: "",
	    Completed: false,
	    Text: req.body.Text
	  };
    MongoClient.connect('mongodb://localhost:27017', function (err, client) {
      client.db('todos').collection('todo').insertOne(todo, function (err, result) {
        if (err) {
          console.log(err);
          return;
        }
        client.close();
        res.redirect('/');
      });
    });
  }
  else {
    res.render('editTodo', { empty_fields: true });
  }
});

app.post('/editTodoList', urlEncodedParser, function (req, res) {
  MongoClient.connect('mongodb://localhost:27017', function (err, client) {
    var collection = client.db('todos').collection('todo');
    collection.find({ }).toArray(function (err, result) {
      if (err) throw err;
      var re = result.find(x => x._id == req.body.todo_id);

      if (re) {
        client.close();
        res.render("editTodo", {Name: re.Name, Text: re.Text, todo_id: req.body.todo_id});
      }
      else {
        res.redirect('/');
      }
    });
  });
});

app.post('/editTodo', urlEncodedParser, function (req, res) {
    MongoClient.connect('mongodb://localhost:27017', function (err, client) {
      var collection = client.db('todos').collection('todo');
      collection.find({ }).toArray(function (err, result) {
        if (err) throw err;
        var re = result.find(x => x._id == req.body.todo_id);

        if (req.body.Name.length > 0 && req.body.Text.length > 0) {
          collection.updateOne(re, {$set: { "Name": req.body.Name, "Text": req.body.Text, "Data": "" , "Completed": false, } }, function (err2) {
            if (err2) throw err2;
            client.close();
            res.redirect('/');
          });
        }
        else {
          res.render("editTodo", {Name: re.Name, Text: re.Text, todo_id: req.body.todo_id, empty_fields: true});
        }
      });
    });

});

app.post('/removeTodo', urlEncodedParser, function (req, res) {
  MongoClient.connect('mongodb://localhost:27017', function (err, client) {
    var collection = client.db('todos').collection('todo');
    collection.find({ }).toArray(function (err, result) {
      if (err) throw err;
      var re = result.find(x => x._id == req.body.todo_id);

      collection.deleteOne(re, function (err2) {
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
