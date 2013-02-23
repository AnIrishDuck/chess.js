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
        var start = new Kinetic.Rect({
            x: self.x * SIZE, y: self.y * SIZE,
            width: SIZE, height: SIZE, fill: "#ff0", opacity: 0.75
        });
        board.moveLayer.add(start);

        var valid = self.validMoves();
        _.each(valid, function(sq) {
            var move = new Kinetic.Rect({
                x: sq.x * SIZE, y: sq.y * SIZE,
                width: SIZE, height: SIZE, fill: "#0f0", opacity: 0.5
            });
            board.moveLayer.add(move);
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
    var unobstructed = function(dx, dy) {
        var x = self.x + dx; var y = self.y + dy;
        var moves = [];
        while(self.board.validSquare(x, y) && !self.board.occupied(x, y)) {
            moves.push({x: x, y: y})
            x += dx; y += dy;
        }
        return moves;
    }
    var moves = {
        p: function() {
            var next = _.map(_.range(1, 3), function(amt) {
                return {
                    x: self.x,
                    y: self.y + amt * Piece.pawnDir[self.player]
                }
            });
            if(self.y === Piece.pawnStart[self.player]) {
                return next;
            }
            else {
                return next.slice(0, 1);
            }
        },
        r: function() {
            return _.flatten([unobstructed(0, 1), unobstructed(0, -1),
                              unobstructed(1, 0), unobstructed(-1, 0)]);
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
            var r = player === "white" ? 1 : 6;
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

Board.prototype.occupied = function(x, y) {
    var ts = _.filter(this.pieces, function(p) { return p.x == x && p.y == y})
    return ts.length > 0;
}

Board.prototype.validSquare = function(x, y) {
    return x >= 0 && y >= 0 && x < 8 && y < 8;
}

return Board;
});
