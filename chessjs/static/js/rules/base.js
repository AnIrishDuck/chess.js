define(["underscore"], function(_) {

var BaseRules = {};

/* Some useful constants. */
BaseRules.startRank = {white: 0, black: 7};
BaseRules.pawnDir = {white: 1, black: -1};
BaseRules.pawnStart = {white: 1, black: 6};
BaseRules.pawnPromote = {white: BaseRules.startRank.black,
                         black: BaseRules.startRank.white};

/* We use single-character codes to define piece types.
   k: King
   q: Queen
   b: Bishop
   n: Knight
   r: Rook */
BaseRules.lastRank = ['r', 'n', 'b', 'k', 'q', 'b', 'n', 'r'];

/* Determines the valid moves for a given piece. This function simply uses
   standard rules for determing piece movement. */
BaseRules.validMoves = function(piece) {

    var enemyAt = function(x, y) {
        return (piece.board.validSquare(x, y) &&
                piece.board.occupied(x, y) &&
                piece.board.occupant(x, y).player !== piece.player);
    }

    var steal = function(sq) {
        var attack = {x: sq.x, y: sq.y}
        var otherType = piece.board.occupant(sq.x, sq.y).type;
        if(piece.type !== otherType && piece.type !== 'k') {
            attack.promote = [piece.type, otherType]
        }
        return attack
    }

    var moveBy = function(dx, dy) {
        var x = piece.x + dx; var y = piece.y + dy;
        var sq = {x: x, y: y};
        var noActions = {moves: [], captures: []};
        if(!piece.board.validSquare(x, y)) {
            return noActions;
        }
        if(piece.board.occupied(x, y)) {
            if(enemyAt(x, y)) {
                return {moves: [], captures: [steal(sq)]};
            }
            else { return noActions }
        }
        else {
            return {moves: [sq], captures: []}
        }
    }

    var unobstructed = function(dx, dy) {
        var x = piece.x + dx; var y = piece.y + dy;
        var val = {moves: [], captures: []};

        while(piece.board.validSquare(x, y) && !piece.board.occupied(x, y)) {
            val.moves.push({x: x, y: y})
            x += dx; y += dy;
        }

        if(enemyAt(x, y)) {
            val.captures = [steal({x: x, y: y})];
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
            var dy = BaseRules.pawnDir[piece.player];
            var next = unobstructed(0, dy).moves;
            var firstRank = piece.y === BaseRules.pawnStart[piece.player];

            next = next.slice(0, firstRank ? 2 : 1);

            var captures = [1, -1].map(function(dx) {
                return {x: piece.x + dx, y: piece.y + dy}
            });
            var hasEnemy = function(s) { return enemyAt(s.x, s.y) }
            captures = _.map(_.filter(captures, hasEnemy), steal);

            var enPassant = _.filter([-1, 1], function(dx) {
                var other = piece.board.occupant(piece.x + dx, piece.y);
                var lastMove = undefined;
                if(piece.board.moves.length > 0) {
                    lastMove = piece.board.moves[piece.board.moves.length - 1];
                }
                return (other !== undefined && other.type === 'p' &&
                        other.lastMove !== undefined &&
                        other.lastMove === piece.board.turn - 1 &&
                        (lastMove.from.y === BaseRules.pawnStart.white ||
                         lastMove.from.y === BaseRules.pawnStart.black));
            });
            enPassant = _.map(enPassant, function(dx) {
                return {x: piece.x + dx, y: piece.y + dy}
            });
            captures = _.flatten([enPassant, captures]);

            var addPromo = function(s) {
                if(s.y === BaseRules.pawnPromote[piece.player]) {
                    s.promote = ['q', 'r', 'b', 'n'];
                }
                return s;
            }

            return {moves: _.map(next, addPromo),
                    captures: _.map(captures, addPromo)};
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
            var castles = _.filter([0, 7], function(rookPos) {
                var rook = piece.board.occupant(rookPos, piece.y);
                return (piece.lastMove === undefined &&
                        rook !== undefined && rook.lastMove === undefined);
            });
            var castleMoves = {captures: []};
            castleMoves.moves = _.map(castles, function(rookPos) {
                var dxToRook = piece.x - rookPos;
                var dx = -Math.floor(2 * (Math.abs(dxToRook) / dxToRook));
                return {x: piece.x + dx,
                        y: piece.y}
            });
            var allMoves = _.flatten([neighbors, castleMoves]);
            return combine.apply(undefined, allMoves);
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

    return moves[piece.type]();
}

/* This function is called to determine the starting pieces on the board. */
BaseRules.startingPieces = function(board, Piece) {
    var pieces = [];
    _.each(["white", "black"], function(player) {
        // Major pieces first.
        var rank = BaseRules.startRank[player];
        _.each(BaseRules.lastRank, function(t, col) {
            pieces.push(new Piece(board, player, t, col, rank));
        });

        // Now add pawns.
        var rank = BaseRules.pawnStart[player];
        _.each(_.range(8), function(col) {
            pieces.push(new Piece(board, player, "p", col, rank));
        });
    });
    return pieces;
}

return BaseRules;
});
