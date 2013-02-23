define(["kinetic"], function(Kinetic) {

var Board = function(stage) {
    var board = new Kinetic.Layer();
    stage.add(board);

    var SIZE = 50;
    _.each(_.range(8), function(sy) {
        _.each(_.range(8), function(sx) {
            var checker = (sx + sy) % 2 == 0 ? "white" : "black";
            var square = new Kinetic.Rect({
                x: (sx * SIZE), y: (sy * SIZE), width: SIZE, height: SIZE,
                fill: checker, stroke: "grey", strokeWidth: 2
            });
            board.add(square);
        });
    });

    stage.draw();

    var pieces = new Kinetic.Layer();
    stage.add(pieces);

    var setup = function() {
        _.each(pieceImgs, function(img, ix) {
            var p = new Kinetic.Image({
                x: ix * SIZE, y: 0, width: SIZE, height: SIZE,
                image: img
            });
            pieces.add(p);
        });
        stage.draw();
    }
    var setupCb = _.after(2 * 6, setup);

    var pieceImgs = _.flatten(_.map(["l", "d"], function(c) {
        return _.map(["k", "q", "r", "b", "n", "p"], function(p) {
            var i = new Image();
            i.onload = setupCb;
            i.src = "pieces/" + p + c + ".svg"
            return i;
        });
    }));
}

return Board;
});
