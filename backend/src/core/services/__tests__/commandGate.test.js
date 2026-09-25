const { checkCommandAccess } = require('../../commandGate');

const base = {
    commandName: 'pay',
    prefix: '@',
    isEnabled: true,
    allowedChatTypes: ['chat'],
    argumentsDef: [{ name: 'target', required: true }, { name: 'amount', required: false }],
    args: { target: 'Steve' },
    typeChat: 'chat',
    permissionName: 'economy.pay',
    cooldown: 10,
    asOwner: false,
    permissions: ['economy.pay'],
    cooldownLeft: 0,
};

describe('command access gate', () => {
    it('lets an owner skip chat type, permission and cooldown', () => {
        const result = checkCommandAccess({
            ...base,
            asOwner: true,
            typeChat: 'private',
            permissions: [],
            cooldownLeft: 8,
        });
        expect(result.allowed).toBe(true);
    });

    it('still requires arguments from an owner', () => {
        const result = checkCommandAccess({ ...base, asOwner: true, args: {} });
        expect(result.allowed).toBe(false);
        expect(result.reason).toBe('args');
        expect(result.messages[0].message).toContain('target');
    });

    it('stops a player on the wrong chat without a message', () => {
        const result = checkCommandAccess({ ...base, typeChat: 'private' });
        expect(result).toEqual({ allowed: false, reason: 'chat', messages: [] });
    });

    it('stops a player without the permission', () => {
        const result = checkCommandAccess({ ...base, permissions: [] });
        expect(result.reason).toBe('permission');
        expect(result.messages[0].message).toContain('pay');
    });

    it('stops a player while cooldown remains', () => {
        const result = checkCommandAccess({ ...base, cooldownLeft: 4 });
        expect(result.reason).toBe('cooldown');
        expect(result.messages[0].message).toContain('4');
    });

    it('lets a cooldown bypass permission through', () => {
        const result = checkCommandAccess({
            ...base,
            permissions: ['economy.pay', 'economy.cooldown.bypass'],
            cooldownLeft: 4,
        });
        expect(result.allowed).toBe(true);
    });
});
