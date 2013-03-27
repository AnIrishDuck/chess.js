/* This is just a dumb server that records rules for now. It'd be nice to
   implement rules checking in the future (that's actually the primary reason
   I decided to go with Node on the server - no need to duplicate code that
   checks move validity. */
var redis = require("redis");
var express = require("express");

var app = express();

var db = redis.createClient();
db.select(8, function(err, replies) {
    app.listen(3000);
    console.log("Listening on port 3000.");
});

var hex = "0123456789abcdef";
var hexID = function(len) {
    var id = [];
    for(var i = 0; i < 16; i++) {
        id.push(hex[Math.floor(Math.random() * hex.length)]);
    }
    return id.join("");
}

app.use(express.logger());

/* Static Routes */
app.use('/js', express.static(__dirname + '/static/js'));
app.use('/pieces', express.static(__dirname + '/static/pieces'));

app.get('/game', function(req, res) {
    res.sendfile(__dirname + "/static/page.html");
});

app.get('/new', function(req, res) {
    res.sendfile(__dirname + "/static/new.html");
});

/* Health monitoring endpoint. */
app.get('/health', function(req, res) {
  res.send({
    pid: process.pid,
    memory: process.memoryUsage(),
    uptime: process.uptime()
  })
})

/* This route is POSTed to by the static /new page when a new game is
   requested. */
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
        .set(root + ":rules", req.query.rules)
        .exec(function(err, replies) {
            res.json(ids);
        })
});

var gameID = /^([^:]+):(.*)/

/* Game view / move routes */
var route = /^\/([a-f0-9]{16})$/
app.all(route, function(req, res, next) {
    db.get(req.params[0], function(err, replies) {
        if(replies === null) {
            res.send(404, "game doesn't exist!");
            res.end();
        }
        else {
            var info = replies.match(gameID);
            req.rules = info[2] + ":rules";
            req.id = info[2] + ":moves";
            req.player = info[1];
            console.log("%s => %s %s", req.params[0], req.player, req.id);
            db.llen(req.id, function(err, replies) {
                req.turn = replies;
                console.log("turn: %s", req.turn);
                next();
            });
        }
    });
});

var sendMoves = function(req, res) {
    var game = {player: req.player}
    db.lrange(req.id, 0, -1, function(err, replies) {
        game.moves = replies;
        db.get(req.rules, function(err, reply) {
            game.rules = reply;
            res.json(game);
        });
    });
}

app.get(route, function(req, res) {
    sendMoves(req, res);
});

var moveRE = /^[a-h][0-7]-[a-h][0-7][qrbnp]?$/
app.post(route, function(req, res) {
    if(moveRE.exec(req.param("move")) === null) {
        res.send(422, "invalid move!");
        res.end();
    }
    else {
        db.watch(req.id);
        db.llen(req.id, function(err, len) {
            if(parseInt(req.param("turn")) !== len) {
                res.send(422, "wrong turn: " + len + " not " +
                         req.param("turn") + "!");
                res.end();
            }
            else {
                db.multi()
                    .rpush(req.id, req.param("move"))
                    .exec(function() { sendMoves(req, res) });
            }
        });
    }
});
