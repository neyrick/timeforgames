var should = require('should'); 
var assert = require('assert');
var request = require('superagent');  

describe('Anonymous', function() {
  var baseurl = 'localhost:5000/api';

  before(function(done) {

    done();
  });

  describe('DefaultPicture', function() {

    it('should show the default gif', function(done) {
    request.get(baseurl + '/setting/pic/0')
	.end(function(err, res) {
          if (err) {
            throw err;
          }

          res.should.have.status(200);
          res.should.have.header('Content-Type', 'image/gif');
          done();
        });
    });
  });

  describe('AnonymousStatus', function() {
    it('should show an empty status for anonymous', function(done) {
	    request.get(baseurl + '/status')
		.end(function(err, res) {
		  if (err) {
		    throw err;
		  }
                  res.should.have.status(200);
                  res.should.be.json;
		  res.body.should.eql({});
		  done();
                });
    });
  });

  describe('ExpireToken', function() {
    it('should accept but ignore empty token expiry', function(done) {
	    request.get(baseurl + '/expireToken')
		.end(function(err, res) {
		  if (err) {
		    throw err;
		  }
                  res.should.have.status(200);
                  res.should.be.html;
		  res.text.should.equal('OK');
		  done();
                });
    });
  });

  describe('FailedLogin', function() {
    it('should return a failed login attempt', function(done) {
	    request.post(baseurl + '/login')
		.send({username : 'a', password : 'a'})
		.end(function(err, res) {
		  if (err) {
		    throw err;
		  }
                  res.should.have.status(403);
		  res.text.should.equal('a? Connais pas!');
		  done();
                });
    });
  });

  var loginFeatures = [
    { method : request.get, url : '/relogin' },
    { method : request.get, url : '/resetPassword' },
    { method : request.get, url : '/setting' },
    { method : request.post, url : '/setting' },
    { method : request.put, url : '/setting/pic/0' },
    { method : request.post, url : '/schedule' },
    { method : request.del, url : '/schedule/0' },
    { method : request.post, url : '/comment' },
    { method : request.post, url : '/game' },
    { method : request.put, url : '/game/0' },
    { method : request.get, url : '/planning' },
    { method : request.get, url : '/updates' },
    { method : request.get, url : '/history' },
    { method : request.get, url : '/history/user/a' },
    { method : request.get, url : '/history/setting/0' },
  ];

  var adminFeatures = [
    { method : request.get, url : '/user' },
    { method : request.post, url : '/user' },
    { method : request.put, url : '/user/0' },
    { method : request.del, url : '/user/a' },
    { method : request.put, url : '/setting/0' },
    { method : request.del, url : '/setting/0' },
    { method : request.get, url : '/resetPassword/a' },
    { method : request.get, url : '/spoof/a' },
    { method : request.del, url : '/setting/pic/0' }
  ];

  describe('RequiresLogin', function() {
 	 loginFeatures.forEach(function (feature) {
	    it('should not be possible for anonymous to use ' + feature.url, function(done) {
		    feature.method(baseurl + feature.url)
			.end(function(err, res) {
			  if (err) {
			    throw err;
			  }
		          res.should.have.status(403);
			  res.text.should.equal('Fonction réservée aux utilisateurs connectés');
			  done();
		        });
	    });
	  });
  });

  describe('RequiresAdmin', function() {
 	 adminFeatures.forEach(function (feature) {
	    it('should not be possible for anonymous to use ' + feature.url, function(done) {
		    feature.method(baseurl + feature.url)
			.end(function(err, res) {
			  if (err) {
			    throw err;
			  }
		          res.should.have.status(403);
			  res.text.should.equal('Fonction réservée aux administrateurs');
			  done();
		        });
	    });
	  });
  });



/*
    request(url)
	.post('/tfg/login')
	.send(body)
	.end(function(err, res) {
          if (err) {
            throw err;
          }

          res.should.have.status(400);
          done();
        });
    });
*/
/*
    it('should correctly update an existing account', function(done){
	var body = {
		firstName: 'JP',
		lastName: 'Berd'
	};
	request(url)
		.put('/api/profiles/vgheri')
		.send(body)
		.expect('Content-Type', /json/)
		.expect(200) //Status code
		.end(function(err,res) {
			if (err) {
				throw err;
			}
			// Should.js fluent syntax applied
			res.body.should.have.property('_id');
	                res.body.firstName.should.equal('JP');
	                res.body.lastName.should.equal('Berd');                    
	                res.body.creationDate.should.not.equal(null);
			done();
		});
	});
*/
});

