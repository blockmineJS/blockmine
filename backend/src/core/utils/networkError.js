function isConnectTimeout(error) {
    const cause = error?.cause;
    const code = cause?.code || error?.code;
    if (code === 'UND_ERR_CONNECT_TIMEOUT' || code === 'UND_ERR_HEADERS_TIMEOUT' || code === 'UND_ERR_BODY_TIMEOUT' || code === 'ETIMEDOUT' || code === 'ECONNABORTED') {
        return true;
    }
    const name = cause?.name || error?.name;
    if (name === 'ConnectTimeoutError' || name === 'TimeoutError' || name === 'AbortError') return true;
    const message = `${error?.message || ''} ${cause?.message || ''}`.toLowerCase();
    return message.includes('timeout') || message.includes('timed out');
}

module.exports = { isConnectTimeout };
