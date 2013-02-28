/* NOTE: for some bizarre reason, if kinetic is included first RequireJS goes
   bonkers. */
define(["rules/base", "kinetic"], function(BaseRules, Kinetic) {

var SIZE = 75;

var Piece = function(board, player, type, x, y) {
    var self = this;
    self.board = board;
    self.player = player;
    self.type = type;
    self.x = x; self.y = y;

    var p = new Kinetic.Image({
        x: x * SIZE, y: y * SIZE, width: SIZE, height: SIZE,
        image: Piece.imgs[player][type]
    });
    self.avatar = p;

    p.on('click', function() {
        board.moveLayer.removeChildren();
        self.addMoveUI(board.moveLayer);
    });

    p.on('mouseover', function() { self.addMoveUI(board.hoverLayer) });

    p.on('mouseout', function() {
        document.body.style.cursor = 'default';
        board.hoverLayer.removeChildren();
        board.hoverLayer.draw();
    });
    board.pieceLayer.add(p);
}
Piece.imgs = {white: {}, black: {}};

/* Post the specified move to the server. */
Piece.prototype.postMove = function(x, y, promotion) {
    var self = this;

    var cols = "abcdefgh";
    var move = cols[self.x] + self.y + "-" + cols[x] + y;
    if(promotion !== null) {
        move += promotion;
    }

    var url = self.board.url + "?move=" + move + "&turn=" + self.board.turn;
    $.post(url, function() {
        console.log("POST", move);
        self.board.update();
    }).fail(function() {
        alert("POST to server failed. Try reloading this page.");
    });
}

Piece.prototype.moveTo = function(x, y, promotion, animate) {
    var self = this;
    self.board.moveLayer.removeChildren();
    self.board.hoverLayer.removeChildren();

    self.board.moveLayer.hide();
    self.board.hoverLayer.hide();
    self.board.moveLayer.draw();
    self.board.hoverLayer.draw();

    var distance = Math.max(Math.abs(self.x -x), Math.abs(self.y - y));
    var moveTime = 0.125 + (1.0 * distance / 8);

    var fin = function() {
        self.board.moves.push({from: {x: self.x, y: self.y},
                               to: {x: x, y: y}});
        self.x = x; self.y = y;
        self.lastMove = self.board.turn;
        self.type = promotion || self.type;
        self.avatar.setImage(Piece.imgs[self.player][self.type]);
        self.board.moveLayer.show();
        self.board.hoverLayer.show();
        self.board.stage.draw();
    }

    var castle = self.type === 'k' && Math.abs(self.x - x) === 2;
    if(castle) {
        var rook = self.board.occupant(self.x - x > 0 ? 0 : 7, self.y);
        var rookNewX = x + (self.x - x > 0 ? 1 : -1);
        var oldFin = fin;
        var fin = function() {
            rook.x = rookNewX;
            oldFin();
        }
        if(animate) {
            rook.avatar.transitionTo({
                x: rookNewX * SIZE, duration: moveTime
            });
        }
        else {
            rook.avatar.setX(rookNewX * SIZE);
        }
    }

    var pawnCapture = self.type === 'p' && x !== self.x
    if(self.board.occupied(x, y) || pawnCapture) {
        var take = self.board.occupant(x, y);
        if(pawnCapture && take === undefined) {
            take = self.board.occupant(x, y - Piece.pawnDir[self.player]);
        }

        var oldFin = fin;
        var fin = function() {
            self.board.pieces = _.reject(self.board.pieces, function(p) {
                return p.x === take.x && p.y === take.y;
            });
            take.avatar.hide();
            oldFin();
        }
    }

    if(animate) {
        self.avatar.transitionTo({
            x: x * SIZE, y: y * SIZE, duration: moveTime,
            callback: fin
        });
    }
    else {
        self.avatar.setX(x * SIZE);
        self.avatar.setY(y * SIZE);
        fin();
    }
}

/* Adds UI allowing player to choose among the valid moves for this piece
   on a given layer. */
Piece.prototype.addMoveUI = function(layer) {
    var self = this;

    if(self.player === self.board.player &&
       self.board.activePlayer() === self.player) {
        document.body.style.cursor = 'pointer';
        var highlight = function(x, y, color, opacity) {
            var hi = new Kinetic.Rect({
                x: x * SIZE, y: y * SIZE,
                width: SIZE, height: SIZE, fill: color, opacity: opacity
            })
            layer.add(hi);
            return hi;
        }

        highlight(self.x, self.y, "#ff0", 0.5);

        var valid = self.validMoves();
        _.each(valid.moves, function(sq) {
            var move = highlight(sq.x, sq.y, "#0f0", 0.5);
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
            var capture = highlight(sq.x, sq.y, "#f00", 0.5);
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
Piece.prototype.addPromoUI = function(layer, sq) {
    var self = this;

    var OPTION_SIZE = 25;
    var start = {x: sq.x * SIZE, y: sq.y * SIZE};

    layer.add(new Kinetic.Rect({
        x: start.x - 1, y: start.y - 1,
        width: sq.promote.length * OPTION_SIZE + 2,
        height: OPTION_SIZE + 2,
        fill: "#888", stroke: "#ccc", strokeWidth: 2.0
    }));

    _.each(sq.promote, function(t, ix) {
        var img = Piece.imgs[self.player][t]
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
            x: sq.x * SIZE, y: sq.y * SIZE,
            width: SIZE, height: SIZE, image: img
        });
        option.on("click", function() {
            self.postMove(sq.x, sq.y, t);
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

var Board = function(url, stage) {
    var self = this;

    self.url = url;
    self.stage = stage;
    self.turn = 0;

    var board = new Kinetic.Layer();
    stage.add(board);

    _.each(_.range(8), function(sy) {
        _.each(_.range(8), function(sx) {
            var checker = (sx + sy) % 2 == 0 ? "white" : "#444";
            var square = new Kinetic.Rect({
                x: (sx * SIZE), y: (sy * SIZE), width: SIZE, height: SIZE,
                fill: checker, stroke: "grey", strokeWidth: 2
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

    self.pieces = [];
    self.moves = [];
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
        _.each(BaseRules.startingPieces(self, Piece), function(p) {
            p.validMoves = function() {
                return BaseRules.validMoves(this);
            }
            self.pieces.push(p);
        });
        stage.draw();
        self.onReady();
    }
    var setupCb = _.after(2 * 6, setup);

    _.each(order, function(imgId) {
        var i = new Image();
        i.onload = setupCb;
        i.src = "pieces/" + imgId + ".svg"
        var imgs = imgId[1] === 'l' ? Piece.imgs.white : Piece.imgs.black;
        imgs[imgId[0]] = i;
        return i;
    });
}
Board.moveOrder = ["white", "black"];
Board.playerText = {
    white: {white: "Your turn, White.", black: "Waiting on Black..."},
    black: {black: "Your turn, Black.", white: "Waiting on White..."},
    spec: {
        white: "Spectating: White to move.",
        black: "Spectating: Black to move."
    }
}

/* This function is called once the board has been set up. */
Board.prototype.onReady = function() {}

/* Returns the piece occupying the given x, y square on the board. */
Board.prototype.occupant = function(x, y) {
    var ts = _.filter(this.pieces, function(p) { return p.x == x && p.y == y})
    return ts[0];
}

/* Returns true if the given square is occupied. */
Board.prototype.occupied = function(x, y) {
    return this.occupant(x, y) !== undefined;
}

/* Returns the player that can currently move. */
Board.prototype.activePlayer = function() {
    return Board.moveOrder[this.turn % Board.moveOrder.length];
}

/* Returns true if the given square coordinates are valid. */
Board.prototype.validSquare = function(x, y) {
    return x >= 0 && y >= 0 && x < 8 && y < 8;
}

/* Checks for any updates on the server, and plays back any necessary moves for
   the user. */
Board.prototype.update = function() {
    var self = this;
    $.get(self.url, function(data) {
        self.player = data.player;
        self.replay(data.moves.slice(self.turn));
        self.turn = data.moves.length;
        $("#player").html(Board.playerText[self.player][self.activePlayer()]);
    });
}

/* Replays the given list of moves for the player. */
Board.prototype.replay = function(moves) {
    var self = this;

    var parseMove = function(move) {
        var result = {};
        var rows = "abcdefgh";
        result.mover = self.occupant(rows.indexOf(move[0]), parseInt(move[1]));
        result.x = rows.indexOf(move[3]);
        result.y = parseInt(move[4]);
        if(move.length === 6) {
            result.promo = move[5];
        }
        else {
            result.promo = null;
        }
        return result;
    }
    _.each(moves, function(text) {
        console.log("UPDATE", text);
        var move = parseMove(text);
        move.mover.moveTo(move.x, move.y, move.promo, moves.length === 1);
    });
}

return Board;
});
