const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function tokenize(input) {
    const tokens = [];
    const re = /\s*(===|!==|==|!=|<=|>=|&&|\|\||[()\[\].!<>+\-*/%,?:]|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\d+\.?\d*|[A-Za-z_$][A-Za-z0-9_$]*)/y;
    let lastIndex = 0;
    re.lastIndex = 0;
    while (lastIndex < input.length) {
        if (/\s/.test(input[lastIndex]) && re.lastIndex === lastIndex) {
            // allow leading whitespace handled by regex
        }
        re.lastIndex = lastIndex;
        const m = re.exec(input);
        if (!m || m.index !== lastIndex) {
            // skip pure trailing whitespace
            const rest = input.slice(lastIndex);
            if (/^\s*$/.test(rest)) break;
            throw new Error(`Unexpected token at: ${rest.slice(0, 10)}`);
        }
        tokens.push(m[1]);
        lastIndex = re.lastIndex;
    }
    return tokens;
}

function parse(tokens) {
    let pos = 0;
    const peek = () => tokens[pos];
    const next = () => tokens[pos++];

    function parseExpression() {
        return parseLogicalOr();
    }

    function parseBinary(subParser, ops) {
        let left = subParser();
        while (ops.includes(peek())) {
            const op = next();
            const right = subParser();
            left = { type: 'binary', op, left, right };
        }
        return left;
    }

    const parseLogicalOr = () => parseBinary(parseLogicalAnd, ['||']);
    const parseLogicalAnd = () => parseBinary(parseEquality, ['&&']);
    const parseEquality = () => parseBinary(parseRelational, ['===', '!==', '==', '!=']);
    const parseRelational = () => parseBinary(parseAdditive, ['<', '<=', '>', '>=']);
    const parseAdditive = () => parseBinary(parseMultiplicative, ['+', '-']);
    const parseMultiplicative = () => parseBinary(parseUnary, ['*', '/', '%']);

    function parseUnary() {
        if (peek() === '!' || peek() === '-') {
            const op = next();
            return { type: 'unary', op, arg: parseUnary() };
        }
        return parseMember();
    }

    function parseMember() {
        let node = parsePrimary();
        while (peek() === '.' || peek() === '[') {
            if (next() === '.') {
                const prop = next();
                if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(prop)) {
                    throw new Error(`Invalid property: ${prop}`);
                }
                node = { type: 'member', object: node, property: { type: 'literal', value: prop }, computed: false };
            } else {
                const expr = parseExpression();
                if (next() !== ']') throw new Error('Expected ]');
                node = { type: 'member', object: node, property: expr, computed: true };
            }
        }
        return node;
    }

    function parsePrimary() {
        const t = peek();
        if (t === undefined) throw new Error('Unexpected end of expression');
        if (t === '(') {
            next();
            const expr = parseExpression();
            if (next() !== ')') throw new Error('Expected )');
            return expr;
        }
        if (t[0] === '"' || t[0] === "'") {
            next();
            return { type: 'literal', value: JSON.parse('"' + t.slice(1, -1).replace(/\\'/g, "'").replace(/"/g, '\\"') + '"') };
        }
        if (/^\d/.test(t)) {
            next();
            return { type: 'literal', value: Number(t) };
        }
        if (t === 'true') { next(); return { type: 'literal', value: true }; }
        if (t === 'false') { next(); return { type: 'literal', value: false }; }
        if (t === 'null') { next(); return { type: 'literal', value: null }; }
        if (t === 'undefined') { next(); return { type: 'literal', value: undefined }; }
        if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(t)) {
            next();
            return { type: 'identifier', name: t };
        }
        throw new Error(`Unexpected token: ${t}`);
    }

    const ast = parseExpression();
    if (pos < tokens.length) throw new Error(`Unexpected token: ${tokens[pos]}`);
    return ast;
}

function evaluate(node, scope) {
    switch (node.type) {
        case 'literal':
            return node.value;
        case 'identifier':
            if (FORBIDDEN_KEYS.has(node.name)) return undefined;
            if (!Object.prototype.hasOwnProperty.call(scope, node.name)) return undefined;
            return scope[node.name];
        case 'unary': {
            const v = evaluate(node.arg, scope);
            return node.op === '!' ? !v : -v;
        }
        case 'member': {
            const obj = evaluate(node.object, scope);
            if (obj == null) return undefined;
            const key = node.computed ? evaluate(node.property, scope) : node.property.value;
            const keyStr = String(key);
            if (FORBIDDEN_KEYS.has(keyStr)) return undefined;
            return obj[keyStr];
        }
        case 'binary': {
            const l = evaluate(node.left, scope);
            if (node.op === '&&') return l && evaluate(node.right, scope);
            if (node.op === '||') return l || evaluate(node.right, scope);
            const r = evaluate(node.right, scope);
            switch (node.op) {
                case '===': return l === r;
                case '!==': return l !== r;
                case '==': return l == r;
                case '!=': return l != r;
                case '<': return l < r;
                case '<=': return l <= r;
                case '>': return l > r;
                case '>=': return l >= r;
                case '+': return l + r;
                case '-': return l - r;
                case '*': return l * r;
                case '/': return l / r;
                case '%': return l % r;
                default: throw new Error(`Unknown operator: ${node.op}`);
            }
        }
        default:
            throw new Error(`Unknown node type: ${node.type}`);
    }
}

function evaluateSafeExpression(expression, scope = {}) {
    const tokens = tokenize(String(expression));
    const ast = parse(tokens);
    return evaluate(ast, scope);
}

module.exports = { evaluateSafeExpression };
