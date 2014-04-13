var should = require('should'); 
var assert = require('assert');
var request = require('superagent');  
var config = require('./config-test.json');

describe('RegularUser', function() {
  var baseurl = 'localhost:5000/api';
  var dummyImage = "test/ashrag.png";
  var adminLoginToken = null;
  var loginToken1 = null, loginToken2 = null, loginToken3 = null, newLoginToken = null;
  var testlogin1 = 'test1', password1 = 'pass1';
  var testlogin2 = 'test2', password2 = 'pass2';
  var testlogin3 = 'test3', password3 = 'pass3';
  var settingid = 0;
  var today = new Date();
  var todayid = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  var schedule3todelete = 0;
  var userid1, userid2, userid3;
  var gameschedule1, gameschedule2, gameschedule3, gameschedule4, gameschedule5, gameschedule6;
  var gameid, gameid2;
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
// tenter de supprimer la dispo de user2 OK

// PLANNING
// consulter son planning (verifier taille ?) OK
// consulter ses updates (verifier taille ?) OK

// Commentaires: TODO !

// GAMES
// valider la partie de l'AM OK
// tenter de valider la partie du soir OK 
// tenter de supprimer la partie de l'AM
// tenter de reformer la partie de l'AM OK
// reformer la partie du soir OK
// annuler la partie du soir OK
// quitter la partie de l'AM OK

// HISTORY
// consulter historique de la timeframe/setting OK
// consulter historique de soi-meme OK
// consulter historique du setting OK


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
          gameschedule1 = res.body.id;
          request.post(baseurl + '/schedule')
            .set('Authorization', 'Bearer ' + loginToken1)
            .send({ dayid : todayid, timeframe : 'EVENING', role : 'PLAYER', setting : settingid})
            .end(function(err, res) {
                if (err) {
                    throw err;
                }
              gameschedule2 = res.body.id;
              request.post(baseurl + '/schedule')
                .set('Authorization', 'Bearer ' + loginToken2)
                .send({ dayid : todayid, timeframe : 'AFTERNOON', role : 'PLAYER', setting : settingid})
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }
                  gameschedule3 = res.body.id;
                  request.post(baseurl + '/schedule')
                    .set('Authorization', 'Bearer ' + loginToken2)
                    .send({ dayid : todayid, timeframe : 'EVENING', role : 'GM', setting : settingid})
                    .end(function(err, res) {
                        if (err) {
                            throw err;
                        }
                      gameschedule4 = res.body.id;
                      request.post(baseurl + '/schedule')
                        .set('Authorization', 'Bearer ' + loginToken3)
                        .send({ dayid : todayid, timeframe : 'AFTERNOON', role : 'PLAYER', setting : settingid})
                        .end(function(err, res) {
                            if (err) {
                                throw err;
                            }
                          gameschedule5 = res.body.id;
                          request.post(baseurl + '/schedule')
                            .set('Authorization', 'Bearer ' + loginToken3)
                            .send({ dayid : todayid, timeframe : 'EVENING', role : 'PLAYER', setting : settingid})
                            .end(function(err, res) {
                                if (err) {
                                    throw err;
                                }
                              gameschedule6 = res.body.id;
                              request.post(baseurl + '/schedule')
                                .set('Authorization', 'Bearer ' + loginToken3)
                                .send({ dayid : (todayid+1), timeframe : 'AFTERNOON', role : 'PLAYER', setting : settingid})
                                .end(function(err, res) {
                                    if (err) {
                                        throw err;
                                    }
                                    schedule3todelete = res.body.id; 
                                    done();
                            });
                        });
                    });
                });
            });
          });
        });
    });

    it('should not allow to remove someone else\'s schedule', function(done) {
    request.del(baseurl + '/schedule/' + schedule3todelete)
        .set('Authorization', 'Bearer ' + loginToken1)
    .end(function(err, res) {
          if (err) {
            throw err;
          }
          res.should.have.status(403);
          res.should.be.html;
          res.text.should.equal('Erreur: Pas touche !');
          done();
        });
    });

    it('should allow to remove your own schedule', function(done) {
    request.del(baseurl + '/schedule/' + schedule3todelete)
        .set('Authorization', 'Bearer ' + loginToken3)
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

  describe('Planning', function() {

    it('should fetch the Planning for today and the new setting', function(done) {
    request.get(baseurl + '/planning?minday=' + todayid + '&maxday=' + todayid + '&setting=' + settingid)
        .set('Authorization', 'Bearer ' + loginToken1)
        .end(function(err, res) {
          if (err) {
            throw err;
          }

          res.should.have.status(200);
          res.should.be.json;
          res.body.should.be.an.Array;
          res.body.should.have.length(6);
          done();
        });
    });

    it('should fetch the max update timestamp for today and the new setting', function(done) {
    request.get(baseurl + '/updates?minday=' + todayid + '&maxday=' + todayid + '&setting=' + settingid)
        .set('Authorization', 'Bearer ' + loginToken1)
        .end(function(err, res) {
          if (err) {
            throw err;
          }

          res.should.have.status(200);
          res.should.be.json;
          res.body.should.be.an.Array;
          res.body.should.have.length(2);
          done();
        });
    });

  });

  describe('Games', function() {

    it('should allow to validate one\'s game', function(done) {
    request.post(baseurl + '/game')
        .set('Authorization', 'Bearer ' + loginToken1)
        .send({ masterschedule : gameschedule1, players  :  { test2 : { id : gameschedule3 }}})
        .end(function(err, res) {
          if (err) {
            throw err;
          }

          res.should.have.status(200);
          res.should.be.json;
          res.body.masterschedule.should.equal(gameschedule1);
          res.body.players.should.be.an.Object;
          res.body.players.should.eql({ test2 : { id : gameschedule3 }});
          gameid = res.body.id;
          done();
        });
    });

    it('should not allow to validate a game as a player', function(done) {
    request.post(baseurl + '/game')
        .set('Authorization', 'Bearer ' + loginToken1)
        .send({ masterschedule : gameschedule2, players  : { test2 : { id : gameschedule4 }}})
        .end(function(err, res) {
          if (err) {
            throw err;
          }

          res.should.have.status(403);
          res.should.be.html;
          res.text.should.equal('Erreur: T\'es pas MJ !');
          done();
        });
    });

    it('should not allow to validate someone else\'s game', function(done) {
    request.post(baseurl + '/game')
        .set('Authorization', 'Bearer ' + loginToken1)
        .send({ masterschedule : gameschedule4, players  : { test1 : { id : gameschedule2 }}})
        .end(function(err, res) {
          if (err) {
            throw err;
          }

          res.should.have.status(403);
          res.should.be.html;
          res.text.should.equal('Erreur: Pas touche !');
          done();
        });
    });

    it('should allow to reform one\'s game', function(done) {
    request.put(baseurl + '/game/' + gameid)
        .set('Authorization', 'Bearer ' + loginToken1)
        .send({ masterschedule : gameschedule1, players  : { test3 : { id : gameschedule5 }}})
        .end(function(err, res) {
          if (err) {
            throw err;
          }

          res.should.have.status(200);
          res.should.be.json;
          res.body.masterschedule.should.equal(gameschedule1);
          res.body.players.should.be.an.Object;
          res.body.players.should.eql({ test3 : { id : gameschedule5 }});
          done();
        });
    });

    it('should not allow to reform someone else\'s game', function(done) {
    request.post(baseurl + '/game')
        .set('Authorization', 'Bearer ' + loginToken2)
        .send({ masterschedule : gameschedule4, players  :  { test1 : { id : gameschedule2 }, test3 : { id : gameschedule6 }}})
        .end(function(err, res) {
        if (err) {
            throw err;
        }
        gameid2 = res.body.id;
        request.put(baseurl + '/game/' + gameid2)
            .set('Authorization', 'Bearer ' + loginToken1)
            .send({ masterschedule : gameschedule4, players  : { test1 : { id : gameschedule2 }}})
            .end(function(err, res) {
              if (err) {
                throw err;
              }
    
              res.should.have.status(403);
              res.should.be.html;
              res.text.should.equal('Erreur: Pas touche !');
              done();
            });
        });
    });

    it('should allow to cancel one\'s game', function(done) {
    request.del(baseurl + '/schedule/' + gameschedule1)
        .set('Authorization', 'Bearer ' + loginToken1)
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

    it('should not allow to cancel someone else\'s game', function(done) {
    request.del(baseurl + '/schedule/' + gameschedule4)
        .set('Authorization', 'Bearer ' + loginToken1)
        .end(function(err, res) {
          if (err) {
            throw err;
          }

          res.should.have.status(403);
          res.should.be.html;
          res.text.should.equal('Erreur: Pas touche !');
          done();
        });
    });

    it('should allow to leave a game', function(done) {
    request.del(baseurl + '/schedule/' + gameschedule2)
        .set('Authorization', 'Bearer ' + loginToken1)
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

    it('should see a consistent planning', function(done) {
    request.get(baseurl + '/planning?minday=' + todayid + '&maxday=' + todayid + '&setting=' + settingid)
        .set('Authorization', 'Bearer ' + loginToken1)
        .end(function(err, res) {
          if (err) {
            throw err;
          }

          res.should.have.status(200);
          res.should.be.json;
          res.body.should.be.an.Array;
          res.body.should.have.length(4);
          res.body.should.containEql({ idschedule : gameschedule3, dayid : todayid, timeframe : 'AFTERNOON', setting : settingid, game : null, player : 'test2', role : 'PLAYER', idcomment : null, message : null});
          res.body.should.containEql({ idschedule : gameschedule5, dayid : todayid, timeframe : 'AFTERNOON', setting : settingid, game : null, player : 'test3', role : 'PLAYER', idcomment : null, message : null});
          res.body.should.containEql({ idschedule : gameschedule4, dayid : todayid, timeframe : 'EVENING', setting : settingid, game : gameid2, player : 'test2', role : 'GM', idcomment : null, message : null});
          res.body.should.containEql({ idschedule : gameschedule6, dayid : todayid, timeframe : 'EVENING', setting : settingid, game : gameid2, player : 'test3', role : 'PLAYER', idcomment : null, message : null});
          
          done();
        });
    });

  });

  describe('History', function() {

    it('should show the history for the new setting this afternoon', function(done) {
    request.get(baseurl + '/history?dayid=' + todayid + '&timeframe=AFTERNOON&setting=' + settingid)
        .set('Authorization', 'Bearer ' + loginToken1)
        .end(function(err, res) {
          if (err) {
            throw err;
          }

          res.should.have.status(200);
          res.should.be.json;
          res.body.should.be.an.Array;
          res.body.length.should.be.above(0);
          done();
        });
    });

    it('should show the history for the new setting', function(done) {
    request.get(baseurl + '/history/setting/' + settingid)
        .set('Authorization', 'Bearer ' + loginToken1)
        .end(function(err, res) {
          if (err) {
            throw err;
          }

          res.should.have.status(200);
          res.should.be.json;
          res.body.should.be.an.Array;
          res.body.length.should.be.above(0);
          done();
        });
    });

    it('should show the history for a test user', function(done) {
    request.get(baseurl + '/history/user/test1')
        .set('Authorization', 'Bearer ' + loginToken1)
        .end(function(err, res) {
          if (err) {
            throw err;
          }

          res.should.have.status(200);
          res.should.be.json;
          res.body.should.be.an.Array;
          res.body.length.should.be.above(0);
          done();
        });
    });
  });


  describe('UserStatus', function() {
    it('should show a non-admin status', function(done) {
	    request.get(baseurl + '/status')
        .set('Authorization', 'Bearer ' + loginToken1)
		.end(function(err, res) {
		  if (err) {
		    throw err;
		  }
          res.should.have.status(200);
          res.should.be.json;
		  res.body.should.eql({ admin : false });
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
        it('should not be possible for a regular user to use ' + feature.url, function(done) {
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

  describe('Authentication', function() {
    it('should grant a new token', function(done) {
	    request.get(baseurl + '/relogin')
        .set('Authorization', 'Bearer ' + loginToken1)
		.end(function(err, res) {
		  if (err) {
		    throw err;
		  }
        res.should.have.status(200);
        res.should.be.json;
        res.body.should.have.property('token');
        res.body.should.have.property('gui');
        res.body.gui.should.equal('regular');
        newLoginToken = res.body.token;
		done();
      });
    });
    
    it('should not allow using the previous token', function(done) {
        request.get(baseurl + '/relogin')
        .set('Authorization', 'Bearer ' + loginToken1)
        .end(function(err, res) {
          if (err) {
            throw err;
          }
        res.should.have.status(403);
        res.should.be.html;
        res.text.should.equal('Token expiré');
        done();
      });
    });
    
    it('should allow to expire the new token', function(done) {
        request.get(baseurl + '/expireToken')
        .set('Authorization', 'Bearer ' + newLoginToken)
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
    
    it('should not allow using the new token', function(done) {
        request.get(baseurl + '/relogin')
        .set('Authorization', 'Bearer ' + newLoginToken)
        .end(function(err, res) {
          if (err) {
            throw err;
          }
        res.should.have.status(403);
        res.should.be.html;
        res.text.should.equal('Token expiré');
        done();
      });
    });
    
    it('should allow resetting one\'s password', function(done) {
        request.post(baseurl + '/login').send({
            username : testlogin1,
            password : password1
        }).end(function(err, res) {
            if (err) {
                throw err;
            }
            res.should.have.status(200);
            loginToken1 = res.body.token;
            request.get(baseurl + '/resetPassword')
            .set('Authorization', 'Bearer ' + loginToken1)
            .end(function(err, res) {
              if (err) {
                throw err;
              }
            res.should.have.status(200);
            res.should.be.html;
            res.text.should.equal('Reset PW OK');
            done();
        });
      });
    });
    
    it('should not allow using the previous token', function(done) {
        request.get(baseurl + '/relogin')
        .set('Authorization', 'Bearer ' + loginToken1)
        .end(function(err, res) {
          if (err) {
            throw err;
          }
        res.should.have.status(403);
        res.should.be.html;
        res.text.should.equal('Token expiré');
        done();
      });
    });
    
    it('should not allow using the previous password', function(done) {
        request.post(baseurl + '/login').send({
            username : testlogin1,
            password : password1
        }).end(function(err, res) {
            if (err) {
                throw err;
            }
            res.should.have.status(403);
            res.should.be.html;
            res.text.should.equal('Enlève tes moufles et retape ton mot de passe');
            done();
        });
    });
    
  });

});

