/**
 * Получает следующий элемент массива по текущему индексу
 */
async function evaluate(node, pinId, context, helpers) {
    const { resolvePinValue } = helpers;
    const arr = await resolvePinValue(node, 'array', []);
    const currentIndex = await resolvePinValue(node, 'current_index', -1);
    
    const nextIndex = currentIndex + 1;
    const hasNext = Array.isArray(arr) && nextIndex >= 0 && nextIndex < arr.length;

    switch (pinId) {
        case 'next_element':
            return hasNext ? arr[nextIndex] : null;
        
        case 'next_index':
            return nextIndex;
        
        case 'has_next':
            return hasNext;
        
        default:
            return null;
    }
}

module.exports = {
    evaluate,
};




