const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const MongoClient = require('mongodb').MongoClient;
const session = require('express-session');
const datetime = require('node-datetime');
const dbhelp = require('./dbhelp');
const server = require('http').Server(app);
const io = require('socket.io')(server);

var urlEncodedParser = bodyParser.urlencoded({extended: false});
var connections = [];

app.set('view engine', 'ejs');
app.use('/public', express.static('public'));

app.use(session({
    secret: 'LHqH4IXmGa7yQPVCZn53wTanhAirvmZe',
    saveUninitialized: true,
}));
app.get('/', async function (req, res) {
  if (req.session.role) {
    var client = await MongoClient.connect('mongodb://localhost:27017');
    client.db('todos').collection('todo').find({ userTodoId: req.session.userID }).toArray(function (err, result) {
      if (err) throw err;
      res.render('home', {role: req.session.role, todosList: result, change: true});
      client.close();
    });
  }
  else {

    res.render('login');
  }
});

app.post('/login', urlEncodedParser, async function (req, res) {
  var client = await MongoClient.connect('mongodb://localhost:27017');
  var result = await client.db('todos').collection('users').findOne({ email: req.body.email.toLowerCase(), password: req.body.password });
  if (result) {
    if (result.active) {
      req.session.role = result.role;
      req.session.userID = result._id;
      res.redirect('/');
    } else {
      res.render('login', { account_disabled: true });
    }
  }
  else {
    res.render('login', { login_failed: true });
  }
  client.close();
});

app.get('/signUp', function (req, res) {
  res.render('signUp')
});

app.post('/signUp', urlEncodedParser, async function (req, res) {
  if (req.body.name.length > 0 && req.body.surname.length > 0 && req.body.email.length > 0 && req.body.password.length > 0) {
    var client = await MongoClient.connect('mongodb://localhost:27017');
    var duplicate = await client.db('todos').collection('users').findOne({ email: req.body.email.toLowerCase() });
    if (duplicate) {
       client.close();
       res.render('login', { signUp_failed: true });
    }
    else {
      var user = {
        name: req.body.name,
        surname: req.body.surname,
        email: req.body.email.toLowerCase(),
        password: req.body.password,
        active: true,
        role: req.body.role
      };
      client.db('todos').collection('users').insertOne(user, async function (err) {
        if (err) { console.log(err3); return; }
        client.close();
        io.sockets.emit('newUserAlert', user);
        io.sockets.emit('userListUpdate', await dbhelp.getFullUserList());

        res.redirect('/');
      });
    };
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

io.on('connection', function (socket) {
    connections.push(socket);
    socket.on('disconnect', function (data) {
        connections.splice(connections.indexOf(socket), 1);
    })
});

app.get('/logout', function (req, res) {
  req.session.role = undefined;
  req.session.userID = undefined;
  res.redirect('/');
});

app.get('/userlist', async function (req, res) {
  if (req.session.role == "admin") {
    client = await MongoClient.connect('mongodb://localhost:27017');
    client.db('todos').collection('users').find({ }).toArray(function (err, userListArray) {
      if (err) throw err;
      client.close();
      res.render("userlist", {userListArray: userListArray});
    });
  }
  else{
    res.redirect('/');
  }
});

app.post('/complete', urlEncodedParser, async function (req, res) {
  var result = await dbhelp.findById(req.body.todo_id, "todo");
  var cmp = req.body.completedCheckbox ? true : false;
  var cmpDate = req.body.completedCheckbox ? datetime.create().format('d.m.Y H:M:S') : "";
  var client = await MongoClient.connect('mongodb://localhost:27017')
  client.db('todos').collection('todo').updateOne(result, {$set: { "Completed" : cmp, "Date" : cmpDate} }, function (err2) {
    if (err2) throw err2;
    client.close();
    res.redirect('/');
  });
});

app.get('/createTodo', function (req, res) {
  res.render("editTodo")
});

app.post('/newTodo', urlEncodedParser, async function (req, res) {
  if (req.body.Name.length > 0 && req.body.Text.length > 0) {
    var todo = {
      userTodoId: req.session.userID,
      Name: req.body.Name,
	    Date: "",
	    Completed: false,
	    Text: req.body.Text
	  };
    var client = await MongoClient.connect('mongodb://localhost:27017')
    client.db('todos').collection('todo').insertOne(todo, function (err) {
      if (err) { throw err; }
      client.close();
      res.redirect('/');
    });
  }
  else {
    res.render('editTodo', { empty_fields: true });
  }
});

app.post('/editTodoList', urlEncodedParser, async function (req, res) {
  var result = await dbhelp.findById(req.body.todo_id, "todo");
  if (result) {
    res.render("editTodo", {Name: result.Name, Text: result.Text, todo_id: result._id});
  }
  else {
    res.redirect('/');
  };
});

app.post('/editTodo', urlEncodedParser, async function (req, res) {
  var result = await dbhelp.findById(req.body.todo_id, "todo");
  if (req.body.Name.length > 0 && req.body.Text.length > 0) {
    var client = await MongoClient.connect('mongodb://localhost:27017');
    client.db('todos').collection('todo').updateOne(result, {$set: { "Name": req.body.Name, "Text": req.body.Text, "Date": "" , "Completed": false, } }, function (err) {
      if (err) throw err;
      client.close();
      res.redirect('/');
    });
  }
  else {
    res.render("editTodo", {Name: result.Name, Text: result.Text, todo_id: req.body.todo_id, empty_fields: true});
  }
});

app.post('/removeTodo', urlEncodedParser, async function (req, res) {
  var result = await dbhelp.findById(req.body.todo_id, "todo");
  var client = await MongoClient.connect('mongodb://localhost:27017');
  client.db('todos').collection('todo').deleteOne(result, function (err) {
    if (err) throw err;
    client.close();
  res.redirect('/');
  });
});

app.get('/profile', function (req, res) {
  res.redirect('/profile/' + req.session.userID);
});

app.get('/profile/:id', async function (req, res) {
  var result = await dbhelp.findById(req.params.id, 'users');
  if (req.session.role == "admin" || result._id == req.session.userID) {
    res.render('profile', { user: result, role: req.session.role});
  }
  else {
    res.redirect('/');
  };
});

app.post('/editProfile', urlEncodedParser, async function (req, res) {
  var result = await dbhelp.findById(req.body._id, 'users');
  if (req.body.Name.length > 0 && req.body.Surname.length > 0 && req.body.Email.length > 0 && req.body.Password.length > 0 ) {
    var client = await MongoClient.connect('mongodb://localhost:27017');
    client.db('todos').collection('users').updateOne(result, { $set: { "name": req.body.Name, "surname": req.body.Surname, "email": req.body.Email, "password": req.body.Password } }, async function (err) {
      if (err) { throw err };
      client.close();
      io.sockets.emit('userListUpdate', await dbhelp.getFullUserList());
      res.redirect('/');
    });
  }
  else {
    res.render('profile', { user: result, role: req.session.role, empty_fields:true});
  }
});

app.post('/removeProfile', urlEncodedParser, async function (req, res) {
  var result = await dbhelp.findById(req.body._id, 'users');
  var client = await MongoClient.connect('mongodb://localhost:27017');
  client.db('todos').collection('users').deleteOne(result, async function (err) {
    if (err) { throw err };
    client.close();
    io.sockets.emit('userListUpdate', await dbhelp.getFullUserList());
    if (result._id == req.session.userID) {
      req.session.role = undefined;
      req.session.email = undefined;
      req.session.userID = undefined;
      res.redirect('/');
    }
    else {
      res.redirect('/userlist');
    };
  });
});

app.post('/activeProlife', urlEncodedParser, async function (req, res) {
  var result = await dbhelp.findById(req.body._id, 'users');
  var client = await MongoClient.connect('mongodb://localhost:27017');
  client.db('todos').collection('users').updateOne(result, {$set: { "active": !result.active } }, async function (err) {
    if (err) { throw err };
    client.close();
    io.sockets.emit('userListUpdate', await dbhelp.getFullUserList());
    if (result._id == req.session.userID) {
      req.session.role = undefined;
      req.session.email = undefined;
      req.session.userID = undefined;
      res.redirect('/');
    }
    else {
      res.redirect('/userlist');
    };
  });
});

app.post('/todosProfile', urlEncodedParser, async function (req, res) {
  var client = await MongoClient.connect('mongodb://localhost:27017');
  var result = await client.db('todos').collection('todo').find({ userTodoId: req.body._id }).toArray();
  client.close();
  res.render('home', {role: req.session.role, todosList: result, change: false});
});

app.get('/createAccountPage', function (req, res) {
  res.render('profile', { role:req.session.role });
});

app.post('/createAccount', urlEncodedParser, async function (req, res) {
  if (req.body.Name.length > 0 && req.body.Surname.length > 0 && req.body.Email.length > 0 && req.body.Password.length > 0 ) {
    var user = {
      name: req.body.Name,
      surname: req.body.Surname,
      email: req.body.Email,
      password: req.body.Password,
      active: true,
      role: req.body.Role
    };

    var client = await MongoClient.connect('mongodb://localhost:27017')
    client.db('todos').collection('users').insertOne(user, async function (err) {
      if (err) { throw err; }
      client.close();
      io.sockets.emit('newUserAlert', user);
      io.sockets.emit('userListUpdate', await dbhelp.getFullUserList());
      res.redirect('/userlist');
    });
  }
  else {
    res.render('profile', { role:req.session.role, empty_fields: true });
  }
});

app.use(function(req, res, next) {
  res.render('404');
});

server.listen(3000, function () {
  console.log("Server start at port - 3000");
});
