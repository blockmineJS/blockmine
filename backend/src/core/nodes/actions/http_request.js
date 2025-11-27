/**
 * @param {object} node - Экземпляр узла из графа.
 * @param {object} context - Контекст выполнения графа.
 * @param {object} helpers - Вспомогательные функции движка.
 * @param {function} helpers.resolvePinValue - Функция для получения значения с входного пина.
 * @param {function} helpers.traverse - Функция для перехода к следующему узлу.
 * @param {Map} helpers.memo - Карта для мемоизации значений.
 */
async function execute(node, context, helpers) {
    const { resolvePinValue, traverse, memo } = helpers;

    let url = await resolvePinValue(node, 'url', '');
    const method = await resolvePinValue(node, 'method', node.data?.method || 'GET');
    const headersInput = await resolvePinValue(node, 'headers', null);
    const queryParamsInput = await resolvePinValue(node, 'queryParams', null);
    const body = await resolvePinValue(node, 'body', '');
    const timeout = await resolvePinValue(node, 'timeout', 5000);

    if (queryParamsInput) {
        try {
            const params = typeof queryParamsInput === 'string'
                ? JSON.parse(queryParamsInput)
                : queryParamsInput;

            const urlObj = new URL(url);
            Object.entries(params).forEach(([key, value]) => {
                urlObj.searchParams.append(key, value);
            });
            url = urlObj.toString();
        } catch (e) {
            console.error('[HTTP Request] Ошибка обработки query params:', e);
        }
    }

    let headers = {};
    if (headersInput) {
        try {
            headers = typeof headersInput === 'string'
                ? JSON.parse(headersInput)
                : headersInput;
        } catch (e) {
            console.error('[HTTP Request] Ошибка парсинга headers:', e);
            headers = {};
        }
    }

    let requestBody = null;
    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        if (typeof body === 'object') {
            requestBody = JSON.stringify(body);
        } else if (typeof body === 'string') {
            // Пробуем распарсить строку как JSON
            try {
                const parsed = JSON.parse(body);
                requestBody = JSON.stringify(parsed);
            } catch {
                // Если не JSON, отправляем как есть
                requestBody = body;
            }
        } else {
            requestBody = String(body);
        }

        if (!headers['Content-Type']) {
            headers['Content-Type'] = 'application/json';
        }
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
            method,
            headers,
            body: requestBody,
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        const responseText = await response.text();
        let responseBody;
        try {
            responseBody = JSON.parse(responseText);
        } catch {
            responseBody = responseText;
        }

        const responseHeaders = {};
        response.headers.forEach((value, key) => {
            responseHeaders[key] = value;
        });

        memo.set(`${node.id}:status`, response.status);
        memo.set(`${node.id}:response`, responseBody);
        memo.set(`${node.id}:response_headers`, responseHeaders);
        memo.set(`${node.id}:success`, response.ok);
        memo.set(`${node.id}:error`, null);

        await traverse(node, 'exec');
    } catch (error) {
        console.error('[HTTP Request] Ошибка запроса:', error);

        memo.set(`${node.id}:status`, 0);
        memo.set(`${node.id}:response`, null);
        memo.set(`${node.id}:response_headers`, {});
        memo.set(`${node.id}:success`, false);
        memo.set(`${node.id}:error`, error.message);

        await traverse(node, 'exec_error');
    }
}

module.exports = {
    execute,
};
