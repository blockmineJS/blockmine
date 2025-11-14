export function debounce(func, wait) {
  let timeout;
  let lastArgs;
  let lastContext;

  const debouncedFn = function executedFunction(...args) {
    lastContext = this;
    lastArgs = args;

    const later = () => {
      timeout = null;
      func.apply(lastContext, lastArgs);
    };

    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };

  debouncedFn.flush = function() {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;

      // Немедленно вызываем функцию с последними аргументами
      if (lastArgs) {
        func.apply(lastContext, lastArgs);
        lastArgs = null;
        lastContext = null;
      }
    }
  };

  return debouncedFn;
}
