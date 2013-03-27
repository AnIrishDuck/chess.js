define(["underscore", "rules/base"], function(_, BaseRules) {
var ThiefRules = _.clone(BaseRules);

ThiefRules.validMoves = function(piece) {
    var base = BaseRules.validMoves(piece);
    var steal = function(sq) {
        var attack = {x: sq.x, y: sq.y}
        var otherType = piece.board.occupant(sq.x, sq.y).type;
        if(piece.type !== otherType && piece.type !== 'k') {
            attack.promote = [piece.type, otherType]
        }
        return attack
    }

    base.captures = _.map(base.captures, function(capture) {
        return steal(capture);
    });

    return base;
}

return ThiefRules;
});
