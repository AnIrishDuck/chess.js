var should = require("should");
var rules = require("../chessjs/rules");
var _ = require("underscore");

var canMoveTo = function(piece, parsed) {
    var rightSquare = function(option) {
        return option.x === parsed.x && option.y === parsed.y;
    }

    var allMoves = parsed.mover.validMoves();
    var moves = allMoves.moves.filter(rightSquare);
    var caps = allMoves.captures.filter(rightSquare);

    return moves.length + caps.length === 1;
}

var hasMove = function(piece, move) {
    should.equal(canMoveTo(piece, move), true,
                 piece.type + " at (" + piece.x + ", " + piece.y + ") " +
                 "cannot move to (" + move.x + ", " + move.y + ")");
}

var noMoveTo = function(piece, move) {
    should.equal(canMoveTo(piece, move), false,
                 piece.type + " at (" + piece.x + ", " + piece.y + ") " +
                 "can move to (" + move.x + ", " + move.y + ")");
}

var checkMoves = function(moves, cont) {
    rules.withRules("base", function(Board, BaseRules) {
        var board = new Board();
        board.setup();
        _.each(moves, function(text, ix) {
            var parsed = board.parseMove(text);

            hasMove(parsed.mover, parsed);

            parsed.mover.moveTo(parsed.x, parsed.y, parsed.promo);
        });
        cont(board);
    });
}

var checkInvalid = function(moves, invalid, done) {
    checkMoves(moves, function(board) {
        var notAllowed = board.parseMove(invalid);

        noMoveTo(notAllowed.mover, notAllowed);

        done();
    });
}

describe('Basic rules', function() {
    it('should follow the right interface', function(done) {
        rules.withRules("base", function(Board, BaseRules) {
            should.exist(BaseRules.validMoves);
            should.exist(BaseRules.startingPieces);
            done();
        });
    });
});

describe('A board', function() {
    it('can be copied; the pieces of the copy are independent',
       function(done) {
        rules.withRules("base", function(Board, BaseRules) {
            var board = new Board();
            board.setup();
            var copy = board.copy();
            var startX = board.pieces[0].x;
            copy.pieces[0].x += 1;
            should.equal(board.pieces[0].x, startX);
            copy.pieces = copy.pieces.slice(2, 5);
            should.equal(board.pieces.length, 32);
            done();
        });
    });
});

describe('A king', function() {
    it('moves only to adjacent squares', function(done) {
        checkMoves(['d1-d3', 'a6-a5', 'd0-d1', 'a5-a4', 'd1-c2'],
                   function() { done() });
    });
    it('can castle if the intermediate squares are empty', function(done) {
        checkInvalid([], 'd0-b0', function() {});
        checkInvalid(['d1-d3', 'a6-a4', 'c0-d1', 'a4-a3'],
                     'd0-b0', function() {});
        checkMoves(['d1-d3', 'a6-a4', 'c0-d1', 'a4-a3',
                    'b0-a2', 'h6-h4', 'd0-b0'], function() { done() });
    });
    it('cannot castle through check', function(done) {
        checkInvalid(['d1-d3', 'e6-e4', 'c0-g4', 'e7-e6',
                      'b0-a2', 'e6-g4'], 'd0-b0', function() { done() });
    });
    it('can be placed into check', function(done) {
        checkMoves(['d1-d3', 'c6-c4', 'e0-a4'], function(board) {
            should.equal(board.rules.inCheck("black", board), true);
            done();
        });
    });
    it('cannot move into check', function(done) {
        checkInvalid(['d1-d3', 'e6-e4', 'h1-h3', 'f7-b3'], 'd0-d1', done);
    });
    it('cannot be placed into check by the movement of another piece',
       function(done) {
        checkInvalid(['d1-d3', 'd6-d4', 'h1-h3', 'e7-a3'], 'c1-c2', done);
    });
    it('cannot remain in check if another piece moves', function(done) {
        checkInvalid(['d1-d3', 'c6-c4', 'e0-a4'], 'h6-h5', done);
    });
});

describe('A queen', function() {
    it('can move like a rook', function(done) {
        checkMoves(['e1-e3', 'a6-a5', 'e0-e2', 'a5-a4', 'e2-a2'],
                   function() { done() });
    });
    it('can move like a bishop', function(done) {
        checkMoves(['d1-d3', 'a6-a5', 'e0-a4'],
                   function() { done() });
    });
});

describe('A rook', function() {
    it('can move on columns and rows', function(done) {
        checkMoves(['a1-a3', 'a6-a5', 'a0-a2', 'h6-h5', 'a2-h2'],
                   function() { done() });
    });
});

describe('A bishop', function() {
    it('can move on diagonals', function(done) {
        checkMoves(['d1-d3', 'a6-a5', 'c0-f3', 'a5-a4', 'f3-c6'],
                   function() { done() });
    });
});

describe('A knight', function() {
    it('moves in L shapes', function(done) {
        checkMoves(['b0-a2', 'a6-a5', 'a2-c3', 'a5-a4', 'c3-e2'],
                   function() { done() });
    });
});

describe('A pawn', function() {
    it('can move forward', function(done) {
        checkMoves(['a1-a2', 'a6-a5', 'b1-b3'], function() { done() });
    });
    it('can capture diagonally', function(done) {
        checkMoves(['a1-a3', 'b6-b4', 'a3-b4'], function() { done() });
    });
    it('can capture en passant', function(done) {
        checkMoves(['a1-a3', 'h6-h4', 'a3-a4', 'b6-b4', 'a4-b5'],
                   function() { done() });
    });
    it('cannot capture en passant after the initial move', function(done) {
        checkInvalid(['a1-a3', 'b6-b4', 'h1-h2', 'b4-b3'], 'a3-b4', done);
    });
});
