class PermissionChecker {
    check(user, permissionName) {
        if (!user || !permissionName) return false;

        const groups = user.groups || [];
        for (const group of groups) {
            const perms = group.permissions || [];
            for (const perm of perms) {
                const name = typeof perm === 'string' ? perm : perm.name;
                if (this._matches(name, permissionName)) return true;
            }
        }
        return false;
    }

    checkAny(user, permissionNames) {
        return permissionNames.some(p => this.check(user, p));
    }

    checkAll(user, permissionNames) {
        return permissionNames.every(p => this.check(user, p));
    }

    _matches(pattern, permission) {
        if (pattern === permission) return true;
        if (pattern.endsWith('.*')) {
            const prefix = pattern.slice(0, -2);
            return permission === prefix || permission.startsWith(prefix + '.');
        }
        return false;
    }
}

module.exports = PermissionChecker;
