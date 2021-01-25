const MongoClient = require('mongodb').MongoClient;

module.exports.findById = async function (id, _collection) {
  if (!(id && _collection))
    throw "findById empty param";
  var client = await MongoClient.connect('mongodb://localhost:27017');
  switch (_collection) {
    case "users":
      var collection = client.db('todos').collection('users');
    break;
    case "todo":
      var collection = client.db('todos').collection('todo');
    break;
    default:
      client.close();
      throw "wrong collection";
    break;
  }
  var result = await collection.find({ }).toArray();
  var obj = result.find(x => x._id == id);
  client.close();
  return obj;
};

module.exports.getFullUserList = async function () {
  var client = await MongoClient.connect('mongodb://localhost:27017');
  var collection = client.db('todos').collection('users');
  var result = await collection.find({ }).toArray();
  client.close();
  return result;
};
