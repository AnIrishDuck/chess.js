define(["kinetic"], function(Kinetic) {

var Board = function(stage) {
    var board = new Kinetic.Layer();
    stage.add(board);

    var SIZE = 50;
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

    var pieces = new Kinetic.Layer();
    stage.add(pieces);

    var blackImgs = {};
    var whiteImgs = {};

    var order = _.flatten(_.map(["l", "d"], function(c) {
        return _.map(["k", "q", "r", "b", "n", "p"], function(p) {
            return p + c;
        });
    }));

    var setup = function() {
        _.each([blackImgs, whiteImgs], function(imgs) {
            // Major pieces first.
            var r = imgs === whiteImgs ? 0 : 7;
            _.each(['r', 'n', 'b', 'k', 'q', 'b', 'n', 'r'], function(p, ix) {
                var p = new Kinetic.Image({
                    x: ix * SIZE, y: r * SIZE, width: SIZE, height: SIZE,
                    image: imgs[p]
                });
                pieces.add(p);
            });

            // Add pawns.
            var r = imgs === whiteImgs ? 1 : 6;
            _.each(_.range(8), function(ix) {
                var p = new Kinetic.Image({
                    x: ix * SIZE, y: r * SIZE, width: SIZE, height: SIZE,
                    image: imgs['p']
                });
                pieces.add(p);
            });
        });
        stage.draw();
    }
    var setupCb = _.after(2 * 6, setup);

    _.each(order, function(imgId) {
        var i = new Image();
        i.onload = setupCb;
        i.src = "pieces/" + imgId + ".svg"
        var imgs = imgId[1] === 'l' ? whiteImgs : blackImgs;
        imgs[imgId[0]] = i;
        return i;
    });
}

return Board;
});
