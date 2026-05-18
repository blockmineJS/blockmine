import React, { useEffect, useState } from 'react';
import {
    getItemIconUrls,
    getCachedItemUrl,
    setCachedItemUrl,
    isItemFailed,
    markItemFailed,
} from './itemIconResolver';

/**
 * Иконка предмета: локальная PNG → CDN fallback.
 * Использует кэш успехов и неудач, чтобы не делать повторных запросов.
 */
const ItemIcon = ({ name, size = 28, style }) => {
    const [src, setSrc] = useState(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        if (!name) { setSrc(null); return; }
        setFailed(false);

        // Если уже знаем что предмет не загружается — сразу пустота
        if (isItemFailed(name)) {
            setFailed(true);
            return;
        }

        // Если успешный URL уже известен — сразу его
        const cached = getCachedItemUrl(name);
        if (cached) { setSrc(cached); return; }

        const urls = getItemIconUrls(name);
        if (urls.length === 0) {
            markItemFailed(name);
            setFailed(true);
            return;
        }

        let cancelled = false;

        const tryUrl = (idx) => {
            if (cancelled) return;
            if (idx >= urls.length) {
                markItemFailed(name);
                setFailed(true);
                return;
            }
            const img = new Image();
            img.onload = () => {
                if (cancelled) return;
                setSrc(urls[idx]);
                setCachedItemUrl(name, urls[idx]);
            };
            img.onerror = () => {
                if (cancelled) return;
                tryUrl(idx + 1);
            };
            img.src = urls[idx];
        };

        tryUrl(0);

        return () => { cancelled = true; };
    }, [name]);

    if (!src || failed) {
        return null;
    }

    return (
        <img
            src={src}
            alt={name}
            style={{
                width: size,
                height: size,
                imageRendering: 'pixelated',
                pointerEvents: 'none',
                ...style,
            }}
            draggable={false}
        />
    );
};

export default ItemIcon;
