define(["underscore", "rules/base"], function(_, BaseRules) {
var Revolution = _.clone(BaseRules);

Revolution.startingPieces = function(board, Piece) {
    var base = BaseRules.startingPieces(board, Piece);

    white = _.filter(base, function(p) { return p.player != "black" });
    white = _.filter(white, function(p) { return p.type != "p" });

    var black = _.map(_.range(4, 8), function(y) {
        return _.map(_.range(0, 8), function(x) {
            return new Piece(board, "black", "p", x, y);
        });
    });

    return _.flatten([white, black]);
}

return Revolution;
});
