import { useEffect } from 'react';

/**
 * Hook для глобальных горячих клавиш IDE
 */
export const useKeyboardShortcuts = ({
    onToggleSidebar,
    onTogglePanel,
    onOpenSearch,
    onOpenExplorer,
    onQuickOpen,
    onSaveFile,
    onCloseActiveTab,
    onNextTab,
    onPrevTab,
    onNewFile,
}) => {
    useEffect(() => {
        const handleKeyDown = (event) => {
            const { ctrlKey, shiftKey, altKey, metaKey, key, code } = event;
            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            const cmdOrCtrl = isMac ? metaKey : ctrlKey;

            // Ctrl+S - Save File (highest priority, works everywhere including Monaco)
            if (cmdOrCtrl && !shiftKey && key.toLowerCase() === 's') {
                event.preventDefault();
                event.stopPropagation();
                onSaveFile?.();
                return;
            }

            // Ctrl+Shift+F - Global Search
            if (cmdOrCtrl && shiftKey && key.toLowerCase() === 'f') {
                event.preventDefault();
                event.stopPropagation();
                onOpenSearch?.();
                return;
            }

            // Ctrl+B - Toggle Sidebar
            if (cmdOrCtrl && !shiftKey && key.toLowerCase() === 'b') {
                event.preventDefault();
                event.stopPropagation();
                onToggleSidebar?.();
                return;
            }

            // Ctrl+` (backtick) - Toggle Terminal Panel
            if (cmdOrCtrl && key === '`') {
                event.preventDefault();
                event.stopPropagation();
                onTogglePanel?.();
                return;
            }

            // Ctrl+P - Quick Open
            if (cmdOrCtrl && !shiftKey && key.toLowerCase() === 'p') {
                event.preventDefault();
                event.stopPropagation();
                onQuickOpen?.();
                return;
            }

            // Ctrl+Shift+E - Open Explorer
            if (cmdOrCtrl && shiftKey && key.toLowerCase() === 'e') {
                event.preventDefault();
                event.stopPropagation();
                onOpenExplorer?.();
                return;
            }

            // Ctrl+W or Ctrl+F4 - Close Active Tab
            if ((cmdOrCtrl && key.toLowerCase() === 'w') || (ctrlKey && code === 'F4')) {
                // Only prevent if we're not in an input
                if (document.activeElement?.tagName !== 'INPUT' &&
                    document.activeElement?.tagName !== 'TEXTAREA') {
                    event.preventDefault();
                    event.stopPropagation();
                    onCloseActiveTab?.();
                }
                return;
            }

            // Ctrl+Tab - Next Tab
            if (cmdOrCtrl && key === 'Tab' && !shiftKey) {
                event.preventDefault();
                event.stopPropagation();
                onNextTab?.();
                return;
            }

            // Ctrl+Shift+Tab - Previous Tab
            if (cmdOrCtrl && shiftKey && key === 'Tab') {
                event.preventDefault();
                event.stopPropagation();
                onPrevTab?.();
                return;
            }

            // Ctrl+N - New File
            if (cmdOrCtrl && !shiftKey && key.toLowerCase() === 'n') {
                event.preventDefault();
                event.stopPropagation();
                onNewFile?.();
                return;
            }
        };

        // Use capture phase (true) to intercept events BEFORE Monaco Editor gets them
        window.addEventListener('keydown', handleKeyDown, true);

        return () => {
            window.removeEventListener('keydown', handleKeyDown, true);
        };
    }, [
        onToggleSidebar,
        onTogglePanel,
        onOpenSearch,
        onOpenExplorer,
        onQuickOpen,
        onSaveFile,
        onCloseActiveTab,
        onNextTab,
        onPrevTab,
        onNewFile,
    ]);
};
