class RewindSignal extends Error {
    constructor(target) {
        super('Rewind signal');
        this.name = 'RewindSignal';
        this.target = target;
    }
}

module.exports = RewindSignal;
