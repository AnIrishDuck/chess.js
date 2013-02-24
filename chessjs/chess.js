var redis = require("redis");
var express = require("express");

var app = express();

var db = redis.createClient();
db.select(8, function(err, replies) {
    db.set("white:/0000000000000000", "0000000000000000", function() {
        app.listen(3000);
        console.log("Listening on port 3000.");
    });
});

var hex = "0123456789abcdef";
var hexID = function(len) {
    var id = [];
    for(var i = 0; i < 16; i++) {
        id.push(hex[Math.floor(Math.random() * hex.length)]);
    }
    return id.join("");
}

var sendMoves = function(id, res) {
    db.lrange(id, 0, -1, function(err, replies) {
        res.json({"moves" : replies});
    });
}

var moveRE = /^[a-h][1-8]-[a-h][1-8]$/

app.use(express.logger());
app.use('/static', express.static(__dirname + '/static'));

app.post("/new", function(req, res) {
    var root = hexID();
    var ids = {}
    ids.white = hexID();
    ids.black = hexID();
    ids.spec = hexID();
    db.multi()
        .set(ids.white, "white:" + root)
        .set(ids.black, "black:" + root)
        .set(ids.spec, "spec:" + root)
        .exec(function(err, replies) {
            res.json(ids);
        })
});

var gameID = /^([^:]+):(.*)/

var route = /^\/([a-f0-9]{16})$/
app.all(route, function(req, res, next) {
    db.get(req.params[0], function(err, replies) {
        if(replies === null) {
            res.send(404, "game doesn't exist!");
            res.end();
        }
        else {
            var info = replies.match(gameID);
            req.id = info[2] + ":moves";
            req.player = info[1];
            console.log("%s => %s %s", req.params[0], req.player, req.id);
            next();
        }
    });
});

app.get(route, function(req, res) {
    sendMoves(req.id, res);
});

app.post(route, function(req, res) {
    if(moveRE.exec(req.param("move")) === null) {
        res.send(422, "invalid move!");
        res.end();
    }
    else {
        db.lpush(req.id, req.param("move"), function() {
            sendMoves(req.id, res);
        });
    }
});
