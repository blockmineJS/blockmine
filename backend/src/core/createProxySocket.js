const net = require('net');
const { SocksClient } = require('socks');

function socksType(type) {
    const normalized = String(type || 'socks5').toLowerCase();
    if (normalized === 'socks4' || normalized === 'socks4a') return 4;
    return 5;
}

function connectViaHttpProxy(options) {
    return new Promise((resolve, reject) => {
        const socket = net.connect({
            host: options.proxyHost,
            port: Number(options.proxyPort),
        });
        const chunks = [];
        let received = 0;

        const fail = (error) => {
            socket.destroy();
            reject(error);
        };

        socket.once('error', fail);
        socket.once('connect', () => {
            const lines = [
                `CONNECT ${options.destinationHost}:${options.destinationPort} HTTP/1.1`,
                `Host: ${options.destinationHost}:${options.destinationPort}`,
            ];
            if (options.proxyUsername) {
                const token = Buffer.from(`${options.proxyUsername}:${options.proxyPassword || ''}`).toString('base64');
                lines.push(`Proxy-Authorization: Basic ${token}`);
            }
            lines.push('', '');
            socket.write(lines.join('\r\n'));
        });

        const onData = (chunk) => {
            chunks.push(chunk);
            received += chunk.length;
            const joined = Buffer.concat(chunks, received);
            const headerEnd = joined.indexOf('\r\n\r\n');
            if (headerEnd === -1) return;

            socket.removeListener('data', onData);
            const headerText = joined.subarray(0, headerEnd).toString('latin1');
            const statusLine = headerText.split('\r\n')[0] || '';
            const code = Number((statusLine.match(/HTTP\/1\.[01] (\d{3})/) || [])[1]);
            if (code !== 200) {
                fail(new Error(statusLine || 'HTTP proxy CONNECT failed'));
                return;
            }

            const rest = joined.subarray(headerEnd + 4);
            if (rest.length > 0) socket.unshift(rest);
            socket.removeListener('error', fail);
            resolve(socket);
        };

        socket.on('data', onData);
    });
}

async function createProxySocket(options) {
    const kind = String(options.type || 'socks5').toLowerCase();
    if (kind === 'http' || kind === 'https') {
        return connectViaHttpProxy(options);
    }

    const info = await SocksClient.createConnection({
        proxy: {
            host: options.proxyHost,
            port: Number(options.proxyPort),
            type: socksType(kind),
            userId: options.proxyUsername || undefined,
            password: options.proxyPassword || undefined,
        },
        command: 'connect',
        destination: {
            host: options.destinationHost,
            port: Number(options.destinationPort),
        },
    });
    return info.socket;
}

module.exports = { createProxySocket };
