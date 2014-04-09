var should = require('should'); 
var assert = require('assert');
var request = require('superagent');  
var config = require('./config-test.json');

describe('RegularUser', function() {
  var baseurl = 'localhost:5000/tfg';
  var adminLoginToken = null;
  var loginToken1 = null;
  var testlogin1 = 'test1', password1 = 'pass1';
  var testlogin2 = 'test2', password2 = 'pass2';
  var testlogin3 = 'test3', password3 = 'pass3';

// before: se logger en tant qu'admin, recuperer le token, creer l'utilisateur de test

// LOGIN
// login

// SETTINGS
// creer un setting (recuperer l'id), lister les settings, modifier un setting
// ajouter une image de setting, voir une image de setting, supprimer une image de setting

// DISPOS
// BEFORE: admin se met dispo en tant que MJ au jour J, l'AM
// BEFORE: admin se met dispo en tant que PJ au jour J, le soir
// enregister une dispo sur le setting en tant que PJ au jour J, l'AM
// enregister une dispo sur le setting en tant que MJ au jour J, le soir
// tenter de supprimer la dispo
// tenter de valider la partie de l'aprem

// PLANNING
// consulter son planning (verifier taille ?)
// consulter ses updates (verifier taille ?)

// Commentaires: TODO !

// GAMES
// BEFORE: MJ valide la partie du soir
// valider la partie du soir
// tenter de supprimer la partie de l'AM
// tenter de reformer la partie de l'AM
// reformer la partie du soir
// annuler la partie du soir
// quitter la partie de l'AM

// HISTORY
// consulter historique de la timeframe/setting
// consulter historique de soi-meme
// consulter historique du setting


// LOGIN
// relogin
// expirer son token
// se relogger et reinitialiser son mot de passe

// after: detruire le setting, detruire l'utilisateur de test, expirer le token d'admin

  before(function(done) {
        request.post(baseurl + '/login')
        .send({username : config.testAdmin.login, password : config.testAdmin.password})
        .end(function(err, res) {
          if (err) {
            throw err;
          }
          adminLoginToken = res.body.token;
          request.post(baseurl + '/admin/user')
            .set('Authorization', 'Bearer ' + adminLoginToken)
            .send({ user : { name : testlogin1, email : null, password : password1, isadmin : false, status : 0}})
            .end(function(err, res) {
              if (err) {
                throw err;
              }
              userid1 = res.body.id;
              request.post(baseurl + '/admin/user')
                .set('Authorization', 'Bearer ' + adminLoginToken)
                .send({ user : { name : testlogin2, email : null, password : password2, isadmin : false, status : 0}})
                .end(function(err, res) {
                  if (err) {
                    throw err;
                  }
                  userid2 = res.body.id;
                  request.post(baseurl + '/admin/user')
                    .set('Authorization', 'Bearer ' + adminLoginToken)
                    .send({ user : { name : testlogin3, email : null, password : password3, isadmin : false, status : 0}})
                    .end(function(err, res) {
                      if (err) {
                        throw err;
                      }
                      userid3 = res.body.id;
                      done();
                    });
                });
            });
        });
  });

  after(function(done) {
      request.del(baseurl + '/admin/user/' + userid1)
        .set('Authorization', 'Bearer ' + adminLoginToken)
        .end(function(err, res) {
          if (err) {
            throw err;
          }
          request.del(baseurl + '/admin/user/' + userid2)
            .set('Authorization', 'Bearer ' + adminLoginToken)
            .end(function(err, res) {
              if (err) {
                throw err;
              }
              request.del(baseurl + '/admin/user/' + userid3)
                .set('Authorization', 'Bearer ' + adminLoginToken)
                .end(function(err, res) {
                  if (err) {
                    throw err;
                  }
                  request.get(baseurl + '/expireToken')
                    .set('Authorization', 'Bearer ' + adminLoginToken)
                    .end(function(err, res) {
                      if (err) {
                        throw err;
                      }
                      done();
                    });
                });
            });
        });
    });


  describe('Login', function() {
    it('should return a valid token', function(done) {
	    request.post(baseurl + '/login')
		.send({username : testlogin1, password : password1})
		.end(function(err, res) {
		  if (err) {
		    throw err;
		  }
                  res.should.have.status(200);
                  res.should.be.json;
                  res.body.should.have.property('token');
                  res.body.should.have.property('gui');
                  res.body.gui.should.equal('regular');
                  loginToken1 = res.body.token;
		  done();
                });
    });
  });


  describe('DefaultPicture', function() {

    it('should show the default gif', function(done) {
    request.get(baseurl + '/viewSettingPic/0')
        .set('Authorization', 'Bearer ' + loginToken1)
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


  describe('ListSettings', function() {

    it('should return a list of settings', function(done) {
    request.get(baseurl + '/setting')
        .set('Authorization', 'Bearer ' + loginToken1)
	.end(function(err, res) {
          if (err) {
            throw err;
          }
          res.should.have.status(200);
          res.should.be.json;
          res.body.should.be.an.Array;
          done();
        });
    });
  });


  var loginFeatures = [
    -{ method : request.get, url : '/relogin' },
    -{ method : request.get, url : '/resetPassword' },
    { method : request.get, url : '/setting' },
    { method : request.put, url : '/setting' },
    { method : request.put, url : '/setting/pic/0' },
    { method : request.put, url : '/schedule' },
    { method : request.del, url : '/schedule/0' },
    { method : request.post, url : '/comment' },
    { method : request.put, url : '/game' },
    { method : request.post, url : '/game/0' },
    { method : request.get, url : '/planning' },
    { method : request.get, url : '/updates' },
    { method : request.get, url : '/history' },
    { method : request.get, url : '/history/user/a' },
    { method : request.get, url : '/history/setting/0' },
  ];

  var adminFeatures = [
    { method : request.get, url : '/user' },
    { method : request.put, url : '/user' },
    { method : request.del, url : '/user/a' },
    { method : request.del, url : '/setting/0' },
    { method : request.get, url : '/resetPassword/a' },
    { method : request.get, url : '/spoof/a' },
    { method : request.del, url : '/setting/pic/0' }
  ];

  describe('RequiresAdmin', function() {
 	 adminFeatures.forEach(function (feature) {
	    it('should not be possible for anonymous to use ' + feature.url, function(done) {
		    feature.method(baseurl + '/admin' + feature.url)
		        .set('Authorization', 'Bearer ' + loginToken1)
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

