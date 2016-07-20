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
                           to: {x: x, y: y},
                           promotion: promotion});
    self.x = x; self.y = y;
    self.lastMove = self.board.turn;
    self.type = promotion || self.type;

    self.board.turn += 1;
}

var Board = function(rules) {
    var self = this;

    self.turn = 0;

    self.pieces = [];
    self.moves = [];
    self.rules = rules;
}
Board.moveOrder = ["white", "black"];
Board.rows = "abcdefgh";

Board.serializeMove = function(move) {
    var encode = function(s) { return Board.rows[s.x] + s.y }
    var promo = move.promotion ? move.promotion : "";
    return encode(move.from) + "-" + encode(move.to) + promo;
}

/* Parses a text moves like 'e2-b4' or 'e7-e8q' into an object. */
Board.prototype.parseMove = function(move) {
    var self = this;

    var result = {};
    var row = Board.rows.indexOf(move[0]);
    var col = parseInt(move[1]);
    result.mover = self.occupant(row, col);
    result.x = Board.rows.indexOf(move[3]);
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
    _.each(self.rules.startingPieces(self, Piece), function(p) {
        p.validMoves = function() {
            return self.rules.validMoves(this);
        }
        self.pieces.push(p);
    });
}

/* Called to create a copy of one board. Pieces are actually duplicated, so
 * this is a combination shallow/deep copy. The list of previous moves is
 * simply shallow copied, but that's never modified anyway. */
Board.prototype.copy = function() {
    var self = this;
    var copy = new Board();

    copy.turn = self.turn;
    copy.pieces = _.map(self.pieces, function(p) {
        return new Piece(copy, p.player, p.type, p.x, p.y);
    });
    copy.moves = _.toArray(self.moves);
    copy.rules = self.rules;

    return copy;
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

/* Returns the player that is waiting. */
Board.prototype.inactivePlayer = function() {
    return Board.moveOrder[(this.turn + 1) % Board.moveOrder.length];
}

Board.prototype.currentState = function() {
    return this.rules.currentState(this);
}

/* Returns true if the given square coordinates are valid. */
Board.prototype.validSquare = function(x, y) {
    return x >= 0 && y >= 0 && x < 8 && y < 8;
}

return Board;
});
