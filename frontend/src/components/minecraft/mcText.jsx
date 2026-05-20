import React from 'react';

/**
 * Парсер § цветовых кодов Minecraft в React-элементы.
 *
 *   §0 чёрный    §1 тёмно-синий  §2 тёмно-зелёный §3 тёмно-голубой
 *   §4 тёмно-красный §5 пурпурный §6 золотой       §7 серый
 *   §8 тёмно-серый  §9 синий     §a зелёный        §b голубой
 *   §c красный      §d розовый   §e жёлтый         §f белый
 *   §l жирный   §o курсив  §n подчёркнутый  §m зачёркнутый
 *   §k обфусцированный (рандомные символы) — тут просто оставляем плейсхолдер
 *   §r сброс
 */

const COLOR_MAP = {
    '0': '#000000', '1': '#0000aa', '2': '#00aa00', '3': '#00aaaa',
    '4': '#aa0000', '5': '#aa00aa', '6': '#ffaa00', '7': '#aaaaaa',
    '8': '#555555', '9': '#5555ff', 'a': '#55ff55', 'b': '#55ffff',
    'c': '#ff5555', 'd': '#ff55ff', 'e': '#ffff55', 'f': '#ffffff',
};

/**
 * Парсит строку с § кодами и возвращает массив React-элементов.
 * Также понимает chat-component JSON: '{"text":"...","extra":[...]}'
 */
export function parseMcText(text, fallbackColor = '#fff') {
    if (text == null) return null;

    // Если уже не строка (например объект chat component) — превратим в строку с § кодами
    if (typeof text !== 'string') {
        return parseMcText(componentToLegacy(text), fallbackColor);
    }

    // Если строка похожа на JSON chat component — пробуем распарсить
    const trimmed = text.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
            const parsed = JSON.parse(trimmed);
            return parseMcText(componentToLegacy(parsed), fallbackColor);
        } catch (e) {
            // не JSON — fall through
        }
    }

    const segments = [];
    let current = { color: fallbackColor, bold: false, italic: false, underline: false, strike: false, text: '' };
    const flush = () => {
        if (current.text) {
            segments.push({ ...current });
            current = { ...current, text: '' };
        }
    };

    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (ch === '§' || ch === '\u00a7' || ch === '&') {
            const next = text[i + 1]?.toLowerCase();
            if (!next) { current.text += ch; continue; }
            if (COLOR_MAP[next]) {
                flush();
                current.color = COLOR_MAP[next];
                current.bold = false;
                current.italic = false;
                current.underline = false;
                current.strike = false;
                i++; continue;
            }
            if (next === 'l') { flush(); current.bold = true; i++; continue; }
            if (next === 'o') { flush(); current.italic = true; i++; continue; }
            if (next === 'n') { flush(); current.underline = true; i++; continue; }
            if (next === 'm') { flush(); current.strike = true; i++; continue; }
            if (next === 'k') { i++; continue; } // skip obfuscated
            if (next === 'r') {
                flush();
                current = { color: fallbackColor, bold: false, italic: false, underline: false, strike: false, text: '' };
                i++; continue;
            }
            // Неизвестный код — оставляем
            current.text += ch;
        } else {
            current.text += ch;
        }
    }
    flush();

    return segments.map((s, i) => {
        const decorations = [];
        if (s.underline) decorations.push('underline');
        if (s.strike) decorations.push('line-through');
        return (
            <span
                key={i}
                style={{
                    color: s.color,
                    fontWeight: s.bold ? 'bold' : 'normal',
                    fontStyle: s.italic ? 'italic' : 'normal',
                    textDecoration: decorations.join(' ') || 'none',
                }}
            >
                {s.text}
            </span>
        );
    });
}

/**
 * Преобразует chat-component JSON в legacy строку с § кодами.
 * Поддерживает {text, color, bold, italic, underlined, strikethrough, extra:[]}
 */
const COLOR_TO_CODE = {
    black: '0', dark_blue: '1', dark_green: '2', dark_aqua: '3',
    dark_red: '4', dark_purple: '5', gold: '6', gray: '7',
    dark_gray: '8', blue: '9', green: 'a', aqua: 'b',
    red: 'c', light_purple: 'd', yellow: 'e', white: 'f',
};

export function componentToLegacy(comp) {
    if (comp == null) return '';
    if (typeof comp === 'string') return comp;
    if (Array.isArray(comp)) return comp.map(componentToLegacy).join('');

    let out = '';
    // Цвет
    if (comp.color && COLOR_TO_CODE[comp.color]) out += '§' + COLOR_TO_CODE[comp.color];
    else if (typeof comp.color === 'string' && comp.color.startsWith('#')) {
        // hex color, не поддерживается legacy — пропускаем
    }
    if (comp.bold) out += '§l';
    if (comp.italic) out += '§o';
    if (comp.underlined) out += '§n';
    if (comp.strikethrough) out += '§m';
    if (comp.obfuscated) out += '§k';

    if (typeof comp.text === 'string') out += comp.text;
    if (typeof comp.translate === 'string' && Array.isArray(comp.with)) {
        out += comp.with.map(componentToLegacy).join(' ');
    }
    if (Array.isArray(comp.extra)) {
        for (const e of comp.extra) out += componentToLegacy(e);
    }
    return out;
}

/**
 * Удаляет все § коды из строки
 */
export function stripMcCodes(text) {
    if (!text) return '';
    return String(text).replace(/[§\u00a7&][0-9a-fk-orx]/gi, '');
}

/**
 * Минимальный React-компонент для отображения форматированного MC текста
 */
export const McText = ({ text, fallbackColor }) => {
    return <>{parseMcText(text, fallbackColor)}</>;
};

export default McText;
