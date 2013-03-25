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

BaseRules.inCheck = function(player, board) {
    var isEnemy = function(p) { return p.player !== player }
    var enemyPieces = _.filter(board.pieces, isEnemy)
    var valid = _.map(enemyPieces, BaseRules.validMovesIgnoringCheck);
    var threatenKing = _.filter(valid, function(moves) {
        return _.any(moves.captures, function(move) {
            var takes = board.occupant(move.x, move.y);
            if(takes !== undefined) {
                return takes.type === 'k' && takes.player === player;
            }
            else { return false }
        });
    });
    return threatenKing.length > 0;
}

/* Copy the board and apply the given move to the copy.
 * NOTE: ignores promotions. */
var boardWithMove = function(piece, move) {
    var copy = piece.board.copy();
    var copiedPiece = copy.occupant(piece.x, piece.y);
    copiedPiece.moveTo(move.x, move.y, null);
    return copy;
}

/* Determines the valid moves for a given piece. May return moves that will
 * leave the king in check. */
BaseRules.validMovesIgnoringCheck = function(piece) {

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
            var neighbors = _.map(delta2d, function(sq) {
                return moveBy(sq.dx, sq.dy);
            });
            var direction = function(rookPos) {
                var dxToRook = piece.x - rookPos;
                return -Math.floor((Math.abs(dxToRook) / dxToRook));
            }
            /* Starting criteria - a king can only castle with a rook if
             * neither piece has moved. */
            var castles = _.filter([0, 7], function(rookPos) {
                var rook = piece.board.occupant(rookPos, piece.y);
                return (piece.lastMove === undefined &&
                        rook !== undefined && rook.lastMove === undefined);
            });
            /* Further criteria - a king and rook cannot castle if there are
             * intermediate pieces */
            castles = _.filter(castles, function(rookPos) {
                var positions = [rookPos, piece.x];
                positions.sort();
                var between = _.range(positions[0] + 1, positions[1] - 1)
                return _.every(between, function(x) {
                    return !piece.board.occupied(x, piece.y);
                });
            });
            /* Final criteria - a king cannot castle through check. */
            castles = _.filter(castles, function(rookPos) {
                var middle = piece.x + direction(rookPos);
                var copy = boardWithMove(piece, {x: middle, y: piece.y});
                return !BaseRules.inCheck(piece.player, copy);
            });
            var castleMoves = {captures: []};
            castleMoves.moves = _.map(castles, function(rookPos) {
                return {x: piece.x + direction(rookPos) * 2, y: piece.y}
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

/* Defines all valid moves, excluding moves that leave the king in check at the
 * end of the turn.
 * NOTE: this cannot be collapsed into validMovesIgnoringCheck because of the
 * infinite self-recursion that follows from the call below to inCheck (i.e.
 * validMoves calles inCheck, which calls validMoves for the other player,
 * which calls inCheck for the other player ...)*/
BaseRules.validMoves = function(piece) {
    var possible = BaseRules.validMovesIgnoringCheck(piece);
    /* This isn't terribly efficient, but it's simple and it clearly works. */
    var notInCheck = function(move) {
        var copy = boardWithMove(piece, move);
        return !BaseRules.inCheck(piece.player, copy);
    }
    var legal = {
        moves: _.filter(possible.moves, notInCheck),
        captures: _.filter(possible.captures, notInCheck)
    }
    return legal;
}

BaseRules.currentState = function(board) {
    var check = BaseRules.inCheck(board.activePlayer(), board);
    var isMine = function(p) { return p.player === board.activePlayer() }
    var myPieces = _.filter(board.pieces, isMine);
    var possible = _.map(myPieces, BaseRules.validMoves);
    var x = _.filter(myPieces, function(p) { return p.type === "k" });
    possible = _.reduce(possible, function(count, unit) {
        return count + unit.moves.length + unit.captures.length;
    }, 0);
    if(possible === 0) {
        return check ? "lost" : "draw";
    }
    if(check) {
        return "check"
    }
    return null;
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
