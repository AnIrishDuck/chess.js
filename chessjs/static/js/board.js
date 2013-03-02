/* NOTE: for some bizarre reason, if kinetic is included first RequireJS goes
   bonkers. */
define(["rules/base", "underscore"], function(BaseRules, _) {

var Piece = function(board, player, type, x, y) {
    var self = this;
    self.board = board;
    self.player = player;
    self.type = type;
    self.x = x; self.y = y;
}

/* Calls todo if the corresponding move is a castle. */
Piece.prototype.ifCastle = function(x, y, todo) {
    var self = this;

    var castle = self.type === 'k' && Math.abs(self.x - x) === 2;
    if(castle) {
        var rook = self.board.occupant(self.x - x > 0 ? 0 : 7, self.y);
        var rookNewX = x + (self.x - x > 0 ? 1 : -1);

        todo(rook, rookNewX);
    }
}

/* Calls todo if the corresponding move is a capture. */
Piece.prototype.ifTake = function(x, y, f) {
    var self = this;

    var pawnCapture = self.type === 'p' && x !== self.x
    if(self.board.occupied(x, y) || pawnCapture) {
        var taken = self.board.occupant(x, y);
        if(pawnCapture && taken === undefined) {
            taken = self.board.occupant(x, self.y);
        }

        f(taken);
    }
}

/* Moves this unit to a given square and updates with all implications of that
   move. */
Piece.prototype.moveTo = function(x, y, promotion) {
    var self = this;

    self.ifCastle(x, y, function(rook, rookTo) {
        rook.x = rookTo;
    });

    self.ifTake(x, y, function(taken) {
        self.board.pieces = _.reject(self.board.pieces, function(p) {
            return p.x === taken.x && p.y === taken.y;
        });
    });

    self.board.moves.push({from: {x: self.x, y: self.y},
                           to: {x: x, y: y}});
    self.x = x; self.y = y;
    self.lastMove = self.board.turn;
    self.type = promotion || self.type;

    self.board.turn += 1;
}

var Board = function() {
    var self = this;

    self.turn = 0;

    self.pieces = [];
    self.moves = [];
}
Board.moveOrder = ["white", "black"];

/* Parses a text moves like 'e2-b4' or 'e7-e8q' into an object. */
Board.prototype.parseMove = function(move) {
    var self = this;

    var result = {};
    var rows = "abcdefgh";
    var row = rows.indexOf(move[0]);
    var col = parseInt(move[1]);
    result.mover = self.occupant(row, col);
    result.x = rows.indexOf(move[3]);
    result.y = parseInt(move[4]);
    if(move.length === 6) {
        result.promo = move[5];
    }
    else {
        result.promo = null;
    }
    return result;
}

/* Called to initialize the board. */
Board.prototype.setup = function() {
    var self = this;
    _.each(BaseRules.startingPieces(self, Piece), function(p) {
        p.validMoves = function() {
            return BaseRules.validMoves(this);
        }
        self.pieces.push(p);
    });
}

/* This function is called once the board has been set up. */
Board.prototype.onReady = function() {}

/* Returns the piece occupying the given x, y square on the board. */
Board.prototype.occupant = function(x, y) {
    var ts = _.filter(this.pieces, function(p) { return p.x == x && p.y == y})
    return ts[0];
}

/* Returns true if the given square is occupied. */
Board.prototype.occupied = function(x, y) {
    return this.occupant(x, y) !== undefined;
}

/* Returns the player that can currently move. */
Board.prototype.activePlayer = function() {
    return Board.moveOrder[this.turn % Board.moveOrder.length];
}

/* Returns true if the given square coordinates are valid. */
Board.prototype.validSquare = function(x, y) {
    return x >= 0 && y >= 0 && x < 8 && y < 8;
}

return Board;
});
