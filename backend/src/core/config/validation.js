/**
 * Конфигурация для валидации
 *
 * Строгая валидация (выброс исключений) включена в dev/test окружениях
 * В production валидация тоже выполняется, но только логирует ошибки
 * вместо выброса исключений для предотвращения полного падения
 */
const VALIDATION_ENABLED = true;

/**
 * Строгий режим валидации - выбрасывать исключения при ошибках
 * В production отключен для graceful degradation
 */
const VALIDATION_STRICT_MODE = process.env.NODE_ENV !== 'production';

/**
 * Максимальная глубина рекурсии для операций обхода графа
 * Предотвращает бесконечные циклы в циклических структурах графа
 * Значение 100 выбрано как норм лимит для типичной глубины графов
 */
const MAX_RECURSION_DEPTH = 100;

module.exports = {
    VALIDATION_ENABLED,
    VALIDATION_STRICT_MODE,
    MAX_RECURSION_DEPTH,
};
