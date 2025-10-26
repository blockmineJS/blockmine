class BreakLoopSignal extends Error {
    constructor() {
        super("Loop break signal");
        this.name = "BreakLoopSignal";
    }
}

module.exports = BreakLoopSignal;
