define(["underscore", "rules/base"], function(_, BaseRules) {
var Revolution = _.clone(BaseRules);

Revolution.startingPieces = function(board, Piece) {
    var base = BaseRules.startingPieces(board, Piece);

    var white = _.filter(base, function(p) { return p.player != "black" });
    white = _.filter(white, function(p) { return p.type != "p" });

    var black = _.map(_.range(4, 8), function(y) {
        var pawn = function(x) { return new Piece(board, "black", "p", x, y) };
        if(y === 4) {
            return _.map(_.range(2, 6), pawn);
        }
        else {
            return _.map(_.range(0, 8), pawn);
        }
    });

    return _.flatten([white, black]);
}

return Revolution;
});
