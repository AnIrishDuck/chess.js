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
    self.avatar = p;

    var addPromo = function(layer, sq) {
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
                self.moveTo(sq.x, sq.y, t, true);
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

    var addMoves = function(layer) {
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
                    addPromo(self.board.moveLayer, sq);
                }
                else {
                    self.moveTo(sq.x, sq.y, null, true);
                }
            });
        });
        _.each(valid.captures, function(sq) {
            var capture = highlight(sq.x, sq.y, "#f00", 0.5);
            capture.on('click', function() {
                if(sq.promote !== undefined) {
                    addPromo(self.board.moveLayer, sq);
                }
                else {
                    self.moveTo(sq.x, sq.y, null, true);
                }
            });
        });

        layer.draw();
    }

    p.on('click', function() {
        board.moveLayer.removeChildren();
        addMoves(board.moveLayer);
    });

    p.on('mouseover', function() { addMoves(board.hoverLayer) });

    p.on('mouseout', function() {
        document.body.style.cursor = 'default';
        board.hoverLayer.removeChildren();
        board.hoverLayer.draw();
    });
    board.pieceLayer.add(p);
}
Piece.imgs = {white: {}, black: {}};
Piece.startRank = {white: 0, black: 7};
Piece.pawnDir = {white: 1, black: -1};
Piece.pawnStart = {white: 1, black: 6};
Piece.pawnPromote = {white: Piece.startRank.black,
                     black: Piece.startRank.white};

Piece.prototype.moveTo = function(x, y, promotion, animate) {
    var self = this;
    self.board.moveLayer.removeChildren();

    self.board.moveLayer.hide();
    self.board.hoverLayer.hide();
    self.board.moveLayer.draw();
    self.board.hoverLayer.draw();

    var fin = function() {
        self.x = x; self.y = y;
        self.type = promotion || self.type;
        self.avatar.setImage(Piece.imgs[self.player][self.type]);
        self.board.moveLayer.show();
        self.board.hoverLayer.show();
        self.board.stage.draw();
    }

    if(self.board.occupied(x, y)) {
        var take = self.board.occupant(x, y);

        var oldFin = fin;
        var fin = function() {
            self.board.pieces = _.reject(self.board.pieces, function(p) {
                return p.x === x && p.y === y;
            });
            take.avatar.hide();
            oldFin();
        }
    }

    var distance = Math.max(Math.abs(self.x -x), Math.abs(self.y - y));
    self.avatar.transitionTo({
        x: x * SIZE, y: y * SIZE, duration: 0.125 + (1.0 * distance / 8),
        callback: fin
    });
}

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

            var addPromo = function(s) {
                if(s.y === Piece.pawnPromote[self.player]) {
                    s.promote = ['q', 'r', 'b', 'n'];
                }
                return s;
            }

            return {moves: _.map(next, addPromo),
                    captures: _.map(_.filter(captures, hasEnemy), addPromo)};
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
        },
        n: function() {
            var baseDelta = [{dx: 2, dy: 1}, {dx: 1, dy: 2}];
            var rot1d = [-1, 1];
            var allDeltas = _.flatten(_.map(rot1d, function(rx) {
                return _.map(rot1d, function(ry) {
                    return _.map(baseDelta, function(d) {
                        return {dx: d.dx * rx, dy: d.dy * ry}
                    });
                });
            }));
            var jumps = _.map(allDeltas, function(sq) {
                return moveBy(sq.dx, sq.dy);
            });
            return combine.apply(undefined, jumps);
        }
    }
    return moves[self.type]();
}

var Board = function(stage) {
    var self = this;
    self.stage = stage;

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
        _.each(["white", "black"], function(player) {
            // Major pieces first.
            var r = Piece.startRank[player];
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
