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
    it('should follow the basic interface', function(done) {
        rules.withRules("base", function(Board, BaseRules) {
            should.exist(BaseRules.validMoves);
            should.exist(BaseRules.startingPieces);
            done();
        });
    });
    it('should allow pawn moves forward', function(done) {
        checkMoves(['a1-a2', 'a6-a5', 'b1-b3'], function() { done() });
    });
    it('should allow pawn captures', function(done) {
        checkMoves(['a1-a3', 'b6-b4', 'a3-b4'], function() { done() });
    });
    it('should allow en passant captures', function(done) {
        checkMoves(['a1-a3', 'h6-h4', 'a3-a4', 'b6-b4', 'a4-b5'],
                   function() { done() });
    });
    it('should not allow invalid en passant captures', function(done) {
        checkInvalid(['a1-a3', 'b6-b4', 'h1-h2', 'b4-b3'], 'a3-b4', done);
    });
});
