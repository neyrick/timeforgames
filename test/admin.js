var should = require('should'); 
var assert = require('assert');
var request = require('superagent');  
var config = require('./config-test.json');

describe('AdminUser', function() {
  var baseurl = 'localhost:5000/api';  
  var dummyImage = "test/ashrag.png";
  var adminLoginToken = null;
  var loginToken1 = null;
  var settingid = 0;
  var adminName = 'tempAdminUser';
  var adminPassword = 'tempPassword';
  var adminUserid;
  var regularName = 'test1';
  var regularPassword = 'testPass1';
  var regularUserId;

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
            .send({ user : { name : adminName, email : null, password : adminPassword, isadmin : true, status : 0}})
            .end(function(err, res) {
              if (err) {
                throw err;
              }
              adminUserid = res.body.id;
              done();
            });
        });
  });

  after(function(done) {
          request.del(baseurl + '/user/' + adminUserid)
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



    describe('Login', function() {
        it('should return a valid token', function(done) {
            request.post(baseurl + '/login').send({
                username : adminName,
                password : adminPassword
            }).end(function(err, res) {
                if (err) {
                    throw err;
                }
                res.should.have.status(200);
                res.should.be.json;
                res.body.should.have.property('token');
                res.body.should.have.property('gui');
                res.body.gui.should.equal('admin');
                loginToken1 = res.body.token;
                done();
            });
        });

        it('should show admin status', function(done) {
            request.get(baseurl + '/status')
            .set('Authorization', 'Bearer ' + loginToken1)
            .end(function(err, res) {
              if (err) {
                throw err;
              }
              res.should.have.status(200);
              res.should.be.json;
              res.body.should.eql({ admin : true });
              done();
          });
        });
    }); 

    describe('Admins', function() {
        it('should return the list of admins', function(done) {
	    request.get(baseurl + '/admins')
		.set('Authorization', 'Bearer ' + loginToken1)
	    .end(function(err, res) {
		  if (err) {
		    throw err;
		  }
		  res.should.have.status(200);
		  res.should.be.json;
		  res.body.should.be.an.Array;
		  res.body.length.should.be.above(0);
		  res.body.should.containEql("testAdmin");
		  res.body.should.containEql(adminName);
		  done();
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
          res.body.mode.should.equal(0);
          settingid = res.body.id;
          done();
        });
    });

    it('should allow to edit the new setting', function(done) {
    request.put(baseurl + '/setting/' + settingid)
        .set('Authorization', 'Bearer ' + loginToken1)
        .send({ setting: { name : 'Chronique Test Auto', mode : 1, status : 0}})
        .end(function(err, res) {
          if (err) {
            throw err;
          }

          res.should.have.status(200);
          res.should.be.json;
          res.body.mode.should.equal(1);
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

    it('should delete the setting picture', function(done) {
        request.del(baseurl + '/setting/pic/' + settingid)
        .set('Authorization', 'Bearer ' + loginToken1)
        .end(function(err, res) {
          if (err) {
            throw err;
          }
          res.should.have.status(200);
          res.should.be.html;
          res.text.should.equal('Delete Setting Picture ok');
          done();
        });
    });

    it('should allow to delete the new setting', function(done) {
    request.del(baseurl + '/setting/' + settingid)
        .set('Authorization', 'Bearer ' + loginToken1)
        .end(function(err, res) {
          if (err) {
            throw err;
          }

          res.should.have.status(200);
          res.should.be.html;
          res.text.should.equal("Delete OK");
          done();
        });
    });

  });

  describe('UsersManagement', function() {

    it('should create a new inactive user', function(done) {
      request.post(baseurl + '/user')
        .set('Authorization', 'Bearer ' + loginToken1)
        .send({ user : { name : regularName, email : null, password : regularPassword, isadmin : false, status : 1}})
        .end(function(err, res) {
          if (err) {
            throw err;
          }
          res.should.have.status(200);
          res.should.be.json;
          res.body.status.should.equal(1);
          regularUserId = res.body.id;
          request.post(baseurl + '/login')
          .send({username : regularName, password : regularPassword})
          .end(function(err, res) {
              if (err) {
                throw err;
              }
              res.should.have.status(403);              
              res.should.be.html;
              res.text.should.equal('Compte désactivé');
              done();
          });
        });
    });

    it('should prevent creation of a user with the same name', function(done) {
      request.post(baseurl + '/user')
        .set('Authorization', 'Bearer ' + loginToken1)
        .send({ user : { name : regularName, email : null, isadmin : false, status : 0}})
        .end(function(err, res) {
          if (err) {
            throw err;
          }
          res.should.have.status(500);
          res.should.be.html;
          res.text.should.equal('L\'utilisateur ' + regularName + ' existe déjà');
          done();
        });
    });

    it('should retrieve the list of users', function(done) {
      request.get(baseurl + '/user')
        .set('Authorization', 'Bearer ' + loginToken1)
        .end(function(err, res) {
          if (err) {
            throw err;
          }
          res.should.have.status(200);
          res.should.be.json;
          res.body.should.be.an.Array;
          res.body.length.should.be.above(0);
          res.body.should.containEql({ id : regularUserId, name : regularName, email : null, isadmin : false, status : 1});
          done();
        });
    });

    it('should edit and ensable the new user', function(done) {
      request.put(baseurl + '/user/' + regularUserId)
        .set('Authorization', 'Bearer ' + loginToken1)
        .send({ user : { name : regularName, email : null, status : 0}})
        .end(function(err, res) {
          if (err) {
            throw err;
          }
          res.should.have.status(200);
          res.should.be.json;
          res.body.status.should.equal(0);
          request.post(baseurl + '/login')
          .send({username : regularName, password : regularPassword})
          .end(function(err, res) {
              if (err) {
                throw err;
              }
              res.should.have.status(200);              
              res.should.be.json;
              done();
          });
        });
    });
    
    it('should reset the new user\'s password', function(done) {
      request.get(baseurl + '/resetPassword/' + regularName)
        .set('Authorization', 'Bearer ' + loginToken1)
        .end(function(err, res) {
          if (err) {
            throw err;
          }
          res.should.have.status(200);
          res.should.be.html;
          res.text.should.equal('Reset PW OK');
          request.post(baseurl + '/login')
          .send({username : regularName, password : regularPassword})
          .end(function(err, res) {
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

    it('should spoof as the new user', function(done) {
      request.get(baseurl + '/spoof/' + regularName)
        .set('Authorization', 'Bearer ' + loginToken1)
        .end(function(err, res) {
          if (err) {
            throw err;
          }
          res.should.have.status(200);
          res.should.be.json;
          res.body.should.have.property('token');
          var spoofedToken = res.body.token;

          request.get(baseurl + '/status')
          .set('Authorization', 'Bearer ' + spoofedToken)
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
    
    it('should delete the new user', function(done) {
        request.post(baseurl + '/login').send({
            username : adminName,
            password : adminPassword
        }).end(function(err, res) {
          if (err) {
                throw err;
          }
          loginToken1 = res.body.token;        
          request.del(baseurl + '/user/' + regularUserId)
            .set('Authorization', 'Bearer ' + loginToken1)
            .end(function(err, res) {
              if (err) {
                throw err;
              }
              res.should.have.status(200);
              res.should.be.html;
              res.text.should.equal('Delete OK');
              done();
            });
        });
    });
  });
  
});

