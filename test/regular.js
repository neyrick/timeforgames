var should = require('should'); 
var assert = require('assert');
var request = require('superagent');  
var config = require('./config-test.json');

describe('RegularUser', function() {
  var baseurl = 'localhost:5000/api';
  var dummyImage = "test/ashrag.png";
  var adminLoginToken = null;
  var loginToken1 = null, loginToken2 = null, loginToken3 = null;
  var testlogin1 = 'test1', password1 = 'pass1';
  var testlogin2 = 'test2', password2 = 'pass2';
  var testlogin3 = 'test3', password3 = 'pass3';
  var settingid = 0;
  var today = new Date();
  var todayid = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();

// before: se logger en tant qu'admin, recuperer le token, creer l'utilisateur de test

// LOGIN
// login OK

// SETTINGS
// creer un setting (recuperer l'id), lister les settings OK
// ajouter une image de setting, voir une image de setting OK

// DISPOS
//  USER1 se met dispo en tant que MJ au jour J, l'AM OK
//  USER1 se met dispo en tant que PJ au jour J, le soir OK
//  USER2 enregister une dispo sur le setting en tant que PJ au jour J, l'AM OK
//  USER2 enregister une dispo sur le setting en tant que MJ au jour J, le soir OK
//  USER3 se met dispo en tant que PJ au jour J, l'AM OK
// tenter de supprimer la dispo de user2

// PLANNING
// consulter son planning (verifier taille ?)
// consulter ses updates (verifier taille ?)

// Commentaires: TODO !

// GAMES
// BEFORE: MJ valide la partie du soir
// valider la partie de l'AM
// tenter de valider la partie du soir
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
          request.post(baseurl + '/user')
            .set('Authorization', 'Bearer ' + adminLoginToken)
            .send({ user : { name : testlogin1, email : null, password : password1, isadmin : false, status : 0}})
            .end(function(err, res) {
              if (err) {
                throw err;
              }
              userid1 = res.body.id;
              request.post(baseurl + '/user')
                .set('Authorization', 'Bearer ' + adminLoginToken)
                .send({ user : { name : testlogin2, email : null, password : password2, isadmin : false, status : 0}})
                .end(function(err, res) {
                  if (err) {
                    throw err;
                  }
                  userid2 = res.body.id;
                  request.post(baseurl + '/user')
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
      request.del(baseurl + '/setting/' + settingid)
        .set('Authorization', 'Bearer ' + adminLoginToken)
        .end(function(err, res) {
          if (err) {
            throw err;p
          }
          request.del(baseurl + '/user/' + userid1)
            .set('Authorization', 'Bearer ' + adminLoginToken)
            .end(function(err, res) {
              if (err) {
                throw err;
              }
              request.del(baseurl + '/user/' + userid2)
                .set('Authorization', 'Bearer ' + adminLoginToken)
                .end(function(err, res) {
                  if (err) {
                    throw err;
                  }
                  request.del(baseurl + '/user/' + userid3)
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
    });



    describe('Login', function() {
        it('should return a valid token', function(done) {
            request.post(baseurl + '/login').send({
                username : testlogin1,
                password : password1
            }).end(function(err, res) {
                if (err) {
                    throw err;
                }
                res.should.have.status(200);
                res.should.be.json;
                res.body.should.have.property('token');
                res.body.should.have.property('gui');
                res.body.gui.should.equal('regular');
                loginToken1 = res.body.token;
                request.post(baseurl + '/login').send({
                    username : testlogin2,
                    password : password2
                }).end(function(err, res) {
                    if (err) {
                        throw err;
                    }
                    loginToken2 = res.body.token;
                    request.post(baseurl + '/login').send({
                        username : testlogin3,
                        password : password3
                    }).end(function(err, res) {
                        if (err) {
                            throw err;
                        }
                        loginToken3 = res.body.token;
                        done();
                    });
                });
            });
        });
    }); 

  describe('SettingsManagement', function() {

    it('should return a new setting', function(done) {
    request.post(baseurl + '/setting')
        .set('Authorization', 'Bearer ' + loginToken1)
        .send({ setting: { name : 'Chronique Test Auto', mode : 0, status : 0}})
    .end(function(err, res) {
          if (err) {
            throw err;
          }

          res.should.have.status(200);
          res.should.be.json;
          res.body.should.have.property('id');
          settingid = res.body.id;
          done();
        });
    });

    it('should show all settings including the new one', function(done) {
    request.get(baseurl + '/setting')
        .set('Authorization', 'Bearer ' + loginToken1)
    .end(function(err, res) {
          if (err) {
            throw err;
          }
          res.should.have.status(200);
          res.should.be.json;
          res.body.should.be.an.Array;
          res.body.should.containEql({ id: settingid, name : 'Chronique Test Auto', mode : 0, status : 0, code : null});
          done();
        });
    });

    it('should post a new setting picture', function(done) {
        request.put(baseurl + '/setting/pic/' + settingid)
        .set('Authorization', 'Bearer ' + loginToken1)
        .attach('image', dummyImage)
        .end(function(err, res) {
          if (err) {
            throw err;
          }
          res.should.have.status(200);
          res.text.should.equal('Store Setting Picture ok');
          done();
        });
    });

    it('should show the uploaded picture', function(done) {
    request.get(baseurl + '/setting/pic/' + settingid)
        .set('Authorization', 'Bearer ' + loginToken1)
    .end(function(err, res) {
          if (err) {
            throw err;
          }

          res.should.have.status(200);
          res.should.have.header('Content-Type', 'image/png');
          done();
        });
    });
  });

  describe('ScheduleManagement', function() {

    it('should allow to post a new schedule', function(done) {
    request.post(baseurl + '/schedule')
        .set('Authorization', 'Bearer ' + loginToken1)
        .send({ dayid : todayid, timeframe : 'AFTERNOON', role : 'GM', setting : settingid})
    .end(function(err, res) {
          if (err) {
            throw err;
          }
          res.should.have.status(200);
          res.should.be.json;
          res.body.should.have.property('id');
          res.body.player.should.equal(testlogin1);
          request.post(baseurl + '/schedule')
            .set('Authorization', 'Bearer ' + loginToken1)
            .send({ dayid : todayid, timeframe : 'EVENING', role : 'PLAYER', setting : settingid})
            .end(function(err, res) {
                if (err) {
                    throw err;
                }
              request.post(baseurl + '/schedule')
                .set('Authorization', 'Bearer ' + loginToken2)
                .send({ dayid : todayid, timeframe : 'AFTERNOON', role : 'PLAYER', setting : settingid})
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }
                  request.post(baseurl + '/schedule')
                    .set('Authorization', 'Bearer ' + loginToken2)
                    .send({ dayid : todayid, timeframe : 'EVENING', role : 'GM', setting : settingid})
                    .end(function(err, res) {
                        if (err) {
                            throw err;
                        }
                      request.post(baseurl + '/schedule')
                        .set('Authorization', 'Bearer ' + loginToken3)
                        .send({ dayid : todayid, timeframe : 'AFTERNOON', role : 'PLAYER', setting : settingid})
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
    });
  });


  describe('DefaultPicture', function() {

    it('should show the default gif', function(done) {
    request.get(baseurl + '/setting/pic/0')
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

  describe('RequiresAdmin', function() {
 	 adminFeatures.forEach(function (feature) {
	    it('should not be possible for anonymous to use ' + feature.url, function(done) {
		    feature.method(baseurl + feature.url)
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




});

