define(['board', 'kinetic'], function(Board, Kinetic) {

var PieceUI = function(board, obj) {
    var self = this;
    self.obj = obj;
    self.board = board;

    self.proxy = new Kinetic.Image({
        x: obj.x * self.board.size, y: obj.y * self.board.size,
        width: self.board.size, height: self.board.size,
        image: PieceUI.imgs[obj.player][obj.type]
    });

    self.proxy.on('click', function() {
        board.moveLayer.removeChildren();
        self.addMoveUI(board.moveLayer);
    });

    self.proxy.on('mouseover', function() {
        self.addMoveUI(board.hoverLayer);
    });

    self.proxy.on('mouseout', function() {
        document.body.style.cursor = 'default';
        board.hoverLayer.removeChildren();
        board.hoverLayer.draw();
    });
    board.pieceLayer.add(self.proxy);
}
PieceUI.imgs = {white: {}, black: {}};

/* Post the specified move to the server. */
PieceUI.prototype.postMove = function(x, y, promotion) {
    var self = this;

    var cols = "abcdefgh";
    var move = cols[self.obj.x] + self.obj.y + "-" + cols[x] + y;
    if(promotion !== null) {
        move += promotion;
    }

    var url = self.board.url + "?move=" + move + "&turn=" + self.board.obj.turn;
    $.post(url, function() {
        console.log("POST", move);
        self.board.update();
    }).fail(function() {
        alert("POST to server failed. Try reloading this page.");
    });
}

PieceUI.prototype.moveTo = function(x, y, promotion, animate) {
    var self = this;

    if(animate) {
        self.board.moveLayer.hide();
        self.board.hoverLayer.hide();
    }

    var distance = Math.max(Math.abs(self.obj.x -x), Math.abs(self.obj.y - y));
    var moveTime = 0.125 + (1.0 * distance / 8);

    self.obj.ifCastle(x, y, function(rook, rookTo) {
        if(animate) {
            rook.ui.proxy.transitionTo({
                x: rookTo * self.board.size, duration: moveTime
            });
        }
        else {
            rook.ui.proxy.setX(rookTo * self.board.size);
        }
    });

    var taken = null;
    self.obj.ifTake(x, y, function(piece) {
        taken = piece;
    });

    var doUpdates = function() {
        if(taken !== null) {
            taken.ui.proxy.hide();
        }

        self.proxy.setImage(PieceUI.imgs[self.obj.player][self.obj.type]);

        self.board.moveLayer.removeChildren();
        self.board.moveLayer.show();
        self.board.hoverLayer.removeChildren();
        self.board.hoverLayer.show();

        self.board.stage.draw();
    }

    self.obj.moveTo(x, y, promotion);

    if(animate) {
        self.proxy.transitionTo({
            x: x * self.board.size, y: y * self.board.size,
            duration: moveTime, callback: doUpdates
        });
    }
    else {
        self.proxy.setX(x * self.board.size);
        self.proxy.setY(y * self.board.size);
        doUpdates();
    }
}

/* Adds UI allowing player to choose among the valid moves for this piece
   on a given layer. */
PieceUI.prototype.addMoveUI = function(layer) {
    var self = this;

    if(self.obj.player === self.board.player &&
       self.obj.board.activePlayer() === self.obj.player) {
        document.body.style.cursor = 'pointer';
        var highlight = function(x, y, color, opacity) {
            var hi = new Kinetic.Rect({
                x: x * self.board.size, y: y * self.board.size,
                width: self.board.size, height: self.board.size,
                fill: color, opacity: opacity
            })
            layer.add(hi);
            return hi;
        }

        highlight(self.obj.x, self.obj.y, "#ffe100", 0.75);

        var valid = self.obj.validMoves();
        _.each(valid.moves, function(sq) {
            var move = highlight(sq.x, sq.y, "#21a310", 0.75);
            move.on('click', function() {
                if(sq.promote !== undefined) {
                    self.addPromoUI(self.board.moveLayer, sq);
                }
                else {
                    self.postMove(sq.x, sq.y, null);
                }
            });
        });
        _.each(valid.captures, function(sq) {
            var capture = highlight(sq.x, sq.y, "#dd1b1b", 0.75);
            capture.on('click', function() {
                if(sq.promote !== undefined) {
                    self.addPromoUI(self.board.moveLayer, sq);
                }
                else {
                    self.postMove(sq.x, sq.y, null);
                }
            });
        });

        layer.draw();
    }
}

/* Adds UI allowing player to choose among promotion types to a given square
   on a given layer. */
PieceUI.prototype.addPromoUI = function(layer, move) {
    var self = this;

    var OPTION_SIZE = 25;
    var start = {x: move.x * self.board.size, y: move.y * self.board.size};

    layer.add(new Kinetic.Rect({
        x: start.x - 1, y: start.y - 1,
        width: move.promote.length * OPTION_SIZE + 2,
        height: OPTION_SIZE + 2,
        fill: "#888", stroke: "#ccc", strokeWidth: 2.0
    }));

    _.each(move.promote, function(t, ix) {
        var img = PieceUI.imgs[self.obj.player][t]
        var option = new Kinetic.Image({
            x: start.x + (OPTION_SIZE * ix),
            y: start.y,
            width: OPTION_SIZE,
            height: OPTION_SIZE,
            image: img
        });

        var demo = new Kinetic.Group();
        layer.add(demo);
        demo.moveToBottom();
        var demoImg = new Kinetic.Image({
            x: move.x * self.board.size, y: move.y * self.board.size,
            width: self.board.size, height: self.board.size, image: img
        });
        option.on("click", function() {
            self.postMove(move.x, move.y, t);
        });
        option.on("mouseover", function() {
            demo.add(demoImg);
            layer.draw();
        });
        option.on("mouseout", function() {
            demo.removeChildren();
            layer.draw();
        });
        layer.add(option);
    });
    layer.draw();
}

var BoardUI = function(url, stage, size) {
    var self = this;

    self.url = url;
    self.stage = stage;
    self.size = size || 75;

    var board = new Kinetic.Layer();
    stage.add(board);

    _.each(_.range(8), function(sy) {
        _.each(_.range(8), function(sx) {
            var checker = (sx + sy) % 2 == 0 ? "#ffffff" : "#464c4c";
            var square = new Kinetic.Rect({
                x: (sx * self.size), y: (sy * self.size),
                width: self.size, height: self.size,
                fill: checker, stroke: "#000000", strokeWidth: 1
            });
            square.on("click", function() {
                self.moveLayer.removeChildren();
                self.moveLayer.draw();
            });
            board.add(square);
        });
    });

    stage.draw();

    self.hoverLayer = new Kinetic.Layer();
    stage.add(self.hoverLayer);

    self.pieceLayer = new Kinetic.Layer();
    stage.add(self.pieceLayer);

    self.moveLayer = new Kinetic.Layer();
    stage.add(self.moveLayer);

    self.uiLayer = new Kinetic.Layer();
    stage.add(self.uiLayer);

    var order = _.flatten(_.map(["l", "d"], function(c) {
        return _.map(["k", "q", "r", "b", "n", "p"], function(p) {
            return p + c;
        });
    }));

    var setup = function() {
        $.get(self.url, function(data) {
            self.rules = data.rules;
            self.player = data.player;
            require(['rules/' + self.rules], function(RuleSet) {
                self.obj = new Board(RuleSet);
                self.obj.setup();
                _.each(self.obj.pieces, function(p) {
                    p.ui = new PieceUI(self, p);
                });
                stage.draw();
                self.onReady();
            });
        });
    }
    var setupCb = _.after(2 * 6, setup);

    _.each(order, function(imgId) {
        var i = new Image();
        i.onload = setupCb;
        i.src = "pieces/" + imgId + ".svg"
        var imgs = imgId[1] === 'l' ? PieceUI.imgs.white : PieceUI.imgs.black;
        imgs[imgId[0]] = i;
        return i;
    });
}
BoardUI.moveOrder = ["white", "black"];
BoardUI.playerText = {
    white: {white: "Your turn.", black: "Waiting on Black...", me: "White"},
    black: {black: "Your turn.", white: "Waiting on White...", me: "Black"},
    spec: { white: "White to move.", black: "Black to move.", me: "Spectator" }
}

/* This function is called once the board has been set up. */
BoardUI.prototype.onReady = function() {}

/* Checks for any updates on the server, and plays back any necessary moves for
   the user. */
BoardUI.prototype.update = function() {
    var self = this;
    $.get(self.url, function(data) {
        self.replay(data.moves.slice(self.obj.turn));
        var active = self.obj.activePlayer();
        var text = BoardUI.playerText[self.player][active];
        var cap = function(s) { return s.charAt(0).toUpperCase() + s.slice(1) }
        var start = BoardUI.playerText[self.player].me + ": ";
        if(self.obj.currentState() === "check") {
            text = "Check! " + text;
        }
        if(self.obj.currentState() === "draw") {
            text = "Draw. No legal moves for " + self.obj.activePlayer() + ".";
            start = "";
        }
        if(self.obj.currentState() === "lost") {
            var winner = cap(self.obj.inactivePlayer());
            text = "Checkmate. " + winner + " wins.";
            start = "";
        }
        $("#player").html(start + text);
        $("#rules").html("rules: " + data.rules);
    });
}

/* Replays the given list of moves for the player. */
BoardUI.prototype.replay = function(moves, updateLog) {
    updateLog = updateLog !== undefined ? updateLog : true;
    var self = this;
    _.each(moves, function(text) {
        console.log("UPDATE", text);
        var move = self.obj.parseMove(text);
        if(updateLog) {
            var id = "#" + self.obj.activePlayer() + "-moves";
            var html ='<a href="#' + self.obj.turn + '">' + text + "</a><br />";
            $(id).append(html);
        }
        move.mover.ui.moveTo(move.x, move.y, move.promo, moves.length === 1);
    });
}

return BoardUI;
});
