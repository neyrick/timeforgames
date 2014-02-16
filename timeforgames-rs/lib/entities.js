var persist = require("persist");
var type = persist.type;

var setting = persist.define("setting", {
          "name": type.STRING,
          "code": type.STRING,
          "mode": type.INTEGER,
          "status": type.INTEGER
    }, { tableName: "setting" });
    
var game = persist.define("game", {}, { tableName: "game" }).hasOne(setting, { createHasMany: false, foreignKey : "masterschedule"});
    
var schedule = persist.define("schedule", {
          "dayid": type.INTEGER,
          "timeframe": type.STRING,
          "player": type.STRING,
          "role": type.STRING
    }, { tableName: "schedule" }).hasOne(setting, { createHasMany: false, foreignKey : "setting"}).hasOne(game, { createHasMany: false, foreignKey : "game"});
    
var comment = persist.define("comment", {
          "dayid": type.INTEGER,
          "timeframe": type.STRING,
          "player": type.STRING,
          "message": type.STRING
    }, { tableName: "comment" }).hasOne(setting, { createHasMany: false, foreignKey : "setting"});

var history = persist.define("history", {
          "address": type.STRING,
          "tstamp": type.DATETIME,
          "dayid": type.INTEGER,
          "timeframe": type.STRING,
          "player": type.STRING,
          "action": type.STRING,
          "data": type.JSON
    }, { tableName: "history" }).hasOne(setting, { createHasMany: false, foreignKey : "setting"});

var player = persist.define("player", {
          "name": type.STRING,
          "email": type.STRING
    }, { tableName: "player" });


exports.setting = setting;
exports.game = game;
exports.schedule = schedule;
exports.comment = comment;
exports.history = history;
exports.player = player;
