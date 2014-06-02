var persist = require("persist");
var type = persist.type;

var setting = persist.define("setting", {
          "name": type.STRING,
          "mode": type.INTEGER,
          "status": type.INTEGER
    }, { tableName: "setting" });

var game = persist.define("game", {}, { tableName: "game" });
    
var schedule = persist.define("schedule", {
          "dayid": type.INTEGER,
          "timeframe": type.STRING,
          "player": type.STRING,
          "role": type.STRING
    }, { tableName: "schedule" }).hasOne(setting, { createHasMany: false, foreignKey : "setting"}).hasOne(game, { createHasMany: false, foreignKey : "game"});
    
game.hasOne(schedule, { createHasMany: false, foreignKey : "masterschedule"});
    
var comment = persist.define("comment", {
          "tstamp": type.DATETIME,
          "dayid": type.INTEGER,
          "timeframe": type.STRING,
          "player": type.STRING,
          "message": type.STRING
    }, { tableName: "comment" }).hasOne(setting, { createHasMany: false, foreignKey : "setting"});

var history = persist.define("history", {
          "address": type.STRING,
          "apikey": type.STRING,
          "tstamp": type.DATETIME,
          "dayid": type.INTEGER,
          "timeframe": type.STRING,
          "player": type.STRING,
          "admin": type.STRING,
          "action": type.STRING,
          "data": type.JSON
    }, { tableName: "history" }).hasOne(setting, { createHasMany: false, foreignKey : "setting"});

var player = persist.define("player", {
          "name": type.STRING,
          "email": type.STRING,
          "password": type.STRING,
          "status": type.INTEGER,
          "isadmin": type.BOOLEAN,
    }, { tableName: "player" });

var apikey = persist.define("apikey", {
          "username": type.STRING,
          "admin": type.STRING,
          "key": type.STRING
    }, { tableName: "apikey" });


exports.setting = setting;
exports.game = game;
exports.schedule = schedule;
exports.comment = comment;
exports.history = history;
exports.player = player;
exports.apikey = apikey;
