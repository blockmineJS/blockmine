/**
 * Безопасное копирование текста в буфер обмена с fallback методами
 * @param {string} text - Текст для копирования
 * @returns {Promise<boolean>} - true если копирование прошло успешно, false в противном случае
 */
export const copyToClipboard = async (text) => {
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
            return true;
        } else {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            textArea.style.opacity = '0';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            try {
                const successful = document.execCommand('copy');
                return successful;
            } catch (fallbackError) {
                console.error('Ошибка fallback копирования:', fallbackError);
                return false;
            } finally {
                document.body.removeChild(textArea);
            }
        }
    } catch (error) {
        console.error('Ошибка копирования в буфер обмена:', error);
        return false;
    }
}; 