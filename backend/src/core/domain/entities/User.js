class User {
    constructor({ id, username, isBlacklisted, botId, groups } = {}) {
        this.id = id;
        this.username = username;
        this.isBlacklisted = isBlacklisted || false;
        this.botId = botId;
        this.groups = groups || [];
    }

    hasPermission(permissionName) {
        for (const group of this.groups) {
            const perms = group.permissions || [];
            for (const perm of perms) {
                const name = perm.name || perm;
                if (name === permissionName) return true;
                if (name.endsWith('.*')) {
                    const prefix = name.slice(0, -2);
                    if (permissionName.startsWith(prefix)) return true;
                }
            }
        }
        return false;
    }

    getGroupNames() {
        return this.groups.map(g => g.name || g);
    }

    toJSON() {
        return {
            id: this.id,
            username: this.username,
            isBlacklisted: this.isBlacklisted,
            botId: this.botId,
            groups: this.getGroupNames(),
        };
    }
}

module.exports = User;
