const net = require('net');
const { createProxySocket } = require('../createProxySocket');

function listen(server) {
    return new Promise((resolve) => {
        server.listen(0, '127.0.0.1', () => resolve(server.address().port));
    });
}

describe('createProxySocket', () => {
    test('HTTP CONNECT открывает туннель и передаёт логин', async () => {
        const requests = [];
        const proxy = net.createServer((socket) => {
            let buffer = '';
            socket.on('data', (chunk) => {
                buffer += chunk.toString('latin1');
                if (!buffer.includes('\r\n\r\n')) return;
                requests.push(buffer);
                socket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
            });
        });
        const port = await listen(proxy);

        try {
            const socket = await createProxySocket({
                type: 'http',
                proxyHost: '127.0.0.1',
                proxyPort: port,
                proxyUsername: 'user',
                proxyPassword: 'secret',
                destinationHost: 'mc.example',
                destinationPort: 25565,
            });
            socket.destroy();
        } finally {
            await new Promise((resolve) => proxy.close(resolve));
        }

        expect(requests[0]).toContain('CONNECT mc.example:25565 HTTP/1.1');
        expect(requests[0]).toContain(`Proxy-Authorization: Basic ${Buffer.from('user:secret').toString('base64')}`);
    });

    test('ответ прокси не 200 отклоняется', async () => {
        const proxy = net.createServer((socket) => {
            socket.once('data', () => {
                socket.end('HTTP/1.1 403 Forbidden\r\n\r\n');
            });
        });
        const port = await listen(proxy);

        try {
            await expect(createProxySocket({
                type: 'http',
                proxyHost: '127.0.0.1',
                proxyPort: port,
                destinationHost: 'mc.example',
                destinationPort: 25565,
            })).rejects.toThrow(/403/);
        } finally {
            await new Promise((resolve) => proxy.close(resolve));
        }
    });
});
