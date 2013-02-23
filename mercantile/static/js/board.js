define(["kinetic"], function(Kinetic) {

var SIZE = 75;

var Piece = function(board, player, type, x, y) {
    var self = this;
    self.board = board
    self.type = type;
    self.x = x; self.y = y;

    var p = new Kinetic.Image({
        x: x * SIZE, y: y * SIZE, width: SIZE, height: SIZE,
        image: Piece.imgs[player][type]
    });
    board.pieceLayer.add(p);
}
Piece.imgs = {white: {}, black: {}}

var Board = function(stage) {
    var self = this;
    var board = new Kinetic.Layer();
    stage.add(board);

    _.each(_.range(8), function(sy) {
        _.each(_.range(8), function(sx) {
            var checker = (sx + sy) % 2 == 0 ? "white" : "#444";
            var square = new Kinetic.Rect({
                x: (sx * SIZE), y: (sy * SIZE), width: SIZE, height: SIZE,
                fill: checker, stroke: "grey", strokeWidth: 2
            });
            board.add(square);
        });
    });

    stage.draw();

    self.pieces = [];
    self.pieceLayer = new Kinetic.Layer();
    stage.add(self.pieceLayer);

    var order = _.flatten(_.map(["l", "d"], function(c) {
        return _.map(["k", "q", "r", "b", "n", "p"], function(p) {
            return p + c;
        });
    }));

    var setup = function() {
        _.each(["white", "black"], function(player) {
            // Major pieces first.
            var r = player === "white" ? 0 : 7;
            _.each(['r', 'n', 'b', 'k', 'q', 'b', 'n', 'r'], function(p, ix) {
                self.pieces.push(new Piece(self, player, p, ix, r))
            });

            // Now add pawns.
            var r = player === "white" ? 1 : 6;
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

return Board;
});
