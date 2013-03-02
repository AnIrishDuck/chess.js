var should = require("should");
var rules = require("../chessjs/rules");
var _ = require("underscore");

var hasMove = function(piece, parsed) {
    var rightSquare = function(option) {
        return option.x === parsed.x && option.y === parsed.y;
    }

    var allMoves = parsed.mover.validMoves();
    var moves = allMoves.moves.filter(rightSquare);
    var caps = allMoves.captures.filter(rightSquare);
    should.equal(moves.length + caps.length, 1,
                 piece.type + " at (" + piece.x + ", " + piece.y + ") " +
                 "cannot move to (" + parsed.x + ", " + parsed.y + ")");
}

var checkMoves = function(moves, done) {
    rules.withRules("base", function(Board, BaseRules) {
        var board = new Board();
        board.setup();
        _.each(moves, function(text, ix) {
            var parsed = board.parseMove(text);

            hasMove(parsed.mover, parsed);

            parsed.mover.moveTo(parsed.x, parsed.y, parsed.promo);
        });
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
        checkMoves(['a1-a2', 'a6-a5', 'b1-b3'], done);
    });
    it('should allow pawn captures', function(done) {
        checkMoves(['a1-a3', 'b6-b4', 'a3-b4'], done);
    });
    it('should allow en passant captures', function(done) {
        checkMoves(['a1-a3', 'h6-h4', 'a3-a4', 'b6-b4', 'a4-b5'], done);
    });
});
