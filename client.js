var restify = require('restify');

var client = restify.createJsonClient({
  url: 'http://127.0.0.1:5000',
  version: '*'
});
/*
client.get('/gg/setting', function(err, req, res, obj) {
  console.log('%j', obj);
});
*/
var mysetting = { code: "TB", name: "Terres Balafrées", mode: 0, status: 0};
client.put('/gg/setting', mysetting, function(err, req, res, obj) {
  console.log('%j', obj);
  console.log('Erreur: ' + err);
});

