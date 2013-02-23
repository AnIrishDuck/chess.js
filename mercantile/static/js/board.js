define(["kinetic"], function(Kinetic) {

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

    p.on('mouseover', function() {
        document.body.style.cursor = 'pointer';
        var highlight = function(x, y, color, opacity) {
            board.moveLayer.add(new Kinetic.Rect({
                x: x * SIZE, y: y * SIZE,
                width: SIZE, height: SIZE, fill: color, opacity: opacity
            }));
        }

        highlight(self.x, self.y, "#ff0", 0.5);

        var valid = self.validMoves();
        _.each(valid.moves, function(sq) {
            highlight(sq.x, sq.y, "#0f0", 0.5);
        });
        _.each(valid.captures, function(sq) {
            highlight(sq.x, sq.y, "#f00", 0.5);
        });

        board.moveLayer.draw();
    });

    p.on('mouseout', function() {
        document.body.style.cursor = 'default';
        board.moveLayer.removeChildren();
        board.moveLayer.draw();
    });
    board.pieceLayer.add(p);
}
Piece.imgs = {white: {}, black: {}};
Piece.pawnDir = {white: 1, black: -1};
Piece.pawnStart = {white: 1, black: 6};

Piece.prototype.validMoves = function() {
    var self = this;

    var enemyAt = function(x, y) {
        return (self.board.validSquare(x, y) &&
                self.board.occupied(x, y) &&
                self.board.occupant(x, y).player !== self.player);
    }

    var moveBy = function(dx, dy) {
        var x = self.x + dx; var y = self.y + dy;
        var sq = {x: x, y: y};
        var noActions = {moves: [], captures: []};
        if(!self.board.validSquare(x, y)) {
            return noActions;
        }
        if(self.board.occupied(x, y)) {
            if(enemyAt(x, y)) {
                return {moves: [], captures: [sq]};
            }
            else { return noActions }
        }
        else {
            return {moves: [sq], captures: []}
        }
    }

    var unobstructed = function(dx, dy) {
        var x = self.x + dx; var y = self.y + dy;
        var val = {moves: [], captures: []};

        while(self.board.validSquare(x, y) && !self.board.occupied(x, y)) {
            val.moves.push({x: x, y: y})
            x += dx; y += dy;
        }

        if(enemyAt(x, y)) {
            val.captures = [{x: x, y: y}];
        }

        return val;
    }

    var combine = function() {
        return {
            moves: _.flatten(_.pluck(arguments, "moves")),
            captures: _.flatten(_.pluck(arguments, "captures"))
        }
    }

    var moves = {
        p: function() {
            var dy = Piece.pawnDir[self.player];
            var next = unobstructed(0, dy).moves;
            var firstRank = self.y === Piece.pawnStart[self.player];

            next = next.slice(0, firstRank ? 2 : 1);

            var captures = [1, -1].map(function(dx) {
                return {x: self.x + dx, y: self.y + dy}
            });
            var hasEnemy = function(s) { return enemyAt(s.x, s.y) }

            return {moves: next, captures: _.filter(captures, hasEnemy)};
        },
        r: function() {
            return combine(unobstructed(0, 1), unobstructed(0, -1),
                           unobstructed(1, 0), unobstructed(-1, 0));
        },
        b: function() {
            return combine(unobstructed(1, 1), unobstructed(1, -1),
                           unobstructed(-1, 1), unobstructed(-1, -1));
        },
        q: function() {
            return combine(moves.r(), moves.b());
        },
        k: function() {
            var delta1d = [-1, 0, 1];
            var delta2d = _.flatten(_.map(delta1d, function(dx) {
                return _.map(delta1d, function(dy) {
                    return {dx: dx, dy: dy};
                })
            }));
            delta2d = _.reject(delta2d, function(sq) {
                return sq.dx === 0 && sq.dy === 0;
            });
            neighbors = _.map(delta2d, function(sq) {
                return moveBy(sq.dx, sq.dy);
            });
            return combine.apply(undefined, neighbors);
        }
    }
    return moves[self.type]();
}

var Board = function(stage) {
    var self = this;
    var board = new Kinetic.Layer();
    stage.add(board);

    _.each(_.range(8), function(sy) {
        _.each(_.range(8), function(sx) {
            var checker = (sx + sy) % 2 == 0 ? "white" : "#444";
            var square = new Kinetic.Rect({
                x: (sx * SIZE), y: (sy * SIZE), width: SIZE, height: SIZE,
                fill: checker, stroke: "grey", strokeWidth: 2
            });
            board.add(square);
        });
    });

    stage.draw();

    self.moveLayer = new Kinetic.Layer();
    stage.add(self.moveLayer);

    self.pieces = [];
    self.pieceLayer = new Kinetic.Layer();
    stage.add(self.pieceLayer);

    var order = _.flatten(_.map(["l", "d"], function(c) {
        return _.map(["k", "q", "r", "b", "n", "p"], function(p) {
            return p + c;
        });
    }));

    var setup = function() {
        _.each(["white", "black"], function(player) {
            // Major pieces first.
            var r = player === "white" ? 0 : 7;
            _.each(['r', 'n', 'b', 'k', 'q', 'b', 'n', 'r'], function(p, ix) {
                self.pieces.push(new Piece(self, player, p, ix, r))
            });

            // Now add pawns.
            var r = Piece.pawnStart[player];
            _.each(_.range(8), function(ix) {
                self.pieces.push(new Piece(self, player, "p", ix, r))
            });
        });
        stage.draw();
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

Board.prototype.occupant = function(x, y) {
    var ts = _.filter(this.pieces, function(p) { return p.x == x && p.y == y})
    return ts[0];
}

Board.prototype.occupied = function(x, y) {
    return this.occupant(x, y) !== undefined;
}

Board.prototype.validSquare = function(x, y) {
    return x >= 0 && y >= 0 && x < 8 && y < 8;
}

return Board;
});
