var should = require("should");
var rules = require("../chessjs/rules");
var _ = require("underscore");

var checkMoves = function(moves, done) {
    debugger;
    rules.withRules("base", function(Board, BaseRules) {
        var board = new Board();
        board.setup();
        var parsed = _.map(moves, function(m) { return board.parseMove(m) });
        _.each(parsed, function(move) {
            var rightSquare = function(pm) {
                return pm.x === move.x && pm.y === move.y;
            }

            var allMoves = move.mover.validMoves();
            var moves = allMoves.moves.filter(rightSquare);
            var caps = allMoves.captures.filter(rightSquare);
            should.equal(moves.length + caps.length, 1);

            move.mover.moveTo(move.x, move.y, move.promo);
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
});
