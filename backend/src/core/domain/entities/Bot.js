class Bot {
    constructor({ id, username, password, prefix, note, owners, serverId, proxyId, sortOrder, createdAt, updatedAt } = {}) {
        this.id = id;
        this.username = username;
        this.password = password;
        this.prefix = prefix || '@';
        this.note = note || null;
        this.owners = owners || '';
        this.serverId = serverId;
        this.proxyId = proxyId || null;
        this.sortOrder = sortOrder || null;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    getOwnerList() {
        if (!this.owners) return [];
        return this.owners.split(',').map(o => o.trim()).filter(Boolean);
    }

    isOwner(username) {
        return this.getOwnerList().includes(username);
    }

    toJSON() {
        return {
            id: this.id,
            username: this.username,
            prefix: this.prefix,
            note: this.note,
            owners: this.owners,
            serverId: this.serverId,
            proxyId: this.proxyId,
            sortOrder: this.sortOrder,
        };
    }
}

module.exports = Bot;
