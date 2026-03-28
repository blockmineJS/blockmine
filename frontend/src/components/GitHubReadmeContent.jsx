import React, { useMemo } from 'react';
import DOMPurify from 'dompurify';
import 'github-markdown-css/github-markdown.css';
import '@/components/github-readme.css';

export default function GitHubReadmeContent({ html, fallback, className = '', bodyClassName = '' }) {
    const sanitizedHtml = useMemo(() => {
        if (!html) {
            return '';
        }

        return DOMPurify.sanitize(html, {
            USE_PROFILES: { html: true },
            ADD_ATTR: ['target', 'rel', 'class', 'align']
        });
    }, [html]);

    if (!sanitizedHtml) {
        return fallback || null;
    }

    return (
        <div className={`github-readme-shell ${className}`.trim()}>
            <article
                className={`markdown-body github-readme-body ${bodyClassName}`.trim()}
                dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
            />
        </div>
    );
}
