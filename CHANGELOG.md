# История версий


### [1.17.1](https://github.com/blockmineJS/blockmine/compare/v1.17.0...v1.17.1) (2025-07-24)


### 🐛 Исправления

* добавлена синхронизация статусов ботов каждые 10 секунд и обработка события 'bot_ready' ([c9e8bcc](https://github.com/blockmineJS/blockmine/commit/c9e8bcc5f1b31a122aa05b2bb65f3b4127dfb79a))
* исправление ошибок со скинами. вроде ([459d65b](https://github.com/blockmineJS/blockmine/commit/459d65ba40ec18da5d9a7402992c2cd6aa73a7d2))
* исправление ошибок со скинами. by сахарок ([433e5c6](https://github.com/blockmineJS/blockmine/commit/433e5c6222e385cfd0ba656c78eecd67f094b0ef))
* уменьшены лимиты логов для ботов. так много явно не надо ([d690dcd](https://github.com/blockmineJS/blockmine/commit/d690dcd5701603d455d105a2032f9262923cf5f0))

## [1.17.0](https://github.com/blockmineJS/blockmine/compare/v1.16.3...v1.17.0) (2025-07-24)


### 🐛 Исправления

* импорт ботов был улучшен. изменен, переделан, доделан, исправлен ([1a0983b](https://github.com/blockmineJS/blockmine/commit/1a0983bae10953edf1bf695a2451d21529642ce8))
* прокси теперь подключение теперь работает ([f2ed2b2](https://github.com/blockmineJS/blockmine/commit/f2ed2b2728860aabbed35cd6fc63473fd011550f))


### ✨ Новые возможности

* добавлена функция скопировать полный код плагина в редакторе плагина ([91f7a21](https://github.com/blockmineJS/blockmine/commit/91f7a2171826eb59ca933005eaf48581469c0092))
* плагины теперь могут изменять обработчики при проблемах (нет прав, не тот тип чата и др) ([eeda006](https://github.com/blockmineJS/blockmine/commit/eeda00648e3319aee72995452364d33c1b41b77a))
* теперь ботов в левом сайдбар меню можно перемещать по позициям ([95ca8dc](https://github.com/blockmineJS/blockmine/commit/95ca8dcd11872e411bb6a5a74bcf981581e9cb51))
* теперь при большом кол ве ботов, слева появится прокрутка ботов ([4e3c05d](https://github.com/blockmineJS/blockmine/commit/4e3c05dfdcb354e90b42226bf6c4af84ef328612))
* улучшена обработка настроек плагинов с поддержкой группировки ([cfc24c6](https://github.com/blockmineJS/blockmine/commit/cfc24c60d92cac3a69098f16bacdf3fbbbee2e38))

### [1.16.3](https://github.com/blockmineJS/blockmine/compare/v1.16.2...v1.16.3) (2025-07-22)


### 🐛 Исправления

* забыл в панель добавить изменения кулдауна ([88370d2](https://github.com/blockmineJS/blockmine/commit/88370d24675eec5e656c7855f17cd984a9916f73))
* обновлены условия отображения поддерживаемых серверов в плагинах ([5733673](https://github.com/blockmineJS/blockmine/commit/573367317d3a082eab21155e55fd437f1e480a48))
* при обновление владельцев, кэш юзеров сбрасывается ([37067ae](https://github.com/blockmineJS/blockmine/commit/37067ae95395d48da9cce1951dd06c059eaf5bfb))

### [1.16.2](https://github.com/blockmineJS/blockmine/compare/v1.16.1...v1.16.2) (2025-07-20)


### 🐛 Исправления

* обновление плагинов починено ([6b3c536](https://github.com/blockmineJS/blockmine/commit/6b3c5360c490dda43b0fd8cbf5b77a6c4d329543))


### 🛠 Рефакторинг

* удалены отладочные сообщения и неиспользуемый код из компонента InstalledPluginsView ([1b41026](https://github.com/blockmineJS/blockmine/commit/1b410264d1e844c76404c047c4547e86199bbb27))

### [1.16.1](https://github.com/blockmineJS/blockmine/compare/v1.16.0...v1.16.1) (2025-07-20)


### 🐛 Исправления

* настройки плагинов опять можно менять на страничке плагинов. вернул сортировку по новым ([a89f9ca](https://github.com/blockmineJS/blockmine/commit/a89f9ca49437b7ca9eac76917f809433c4c7bbf1))

## [1.16.0](https://github.com/blockmineJS/blockmine/compare/v1.15.2...v1.16.0) (2025-07-20)


### ✨ Новые возможности

* добавлен новый узел 'flow:switch' с динамическими case'ами ([81886db](https://github.com/blockmineJS/blockmine/commit/81886db75da6792d499cdc2c277494f9e39136c3))
* добавлена кнопка перезапуска бота ([db13070](https://github.com/blockmineJS/blockmine/commit/db130707637a8a5e93e8c783463ca38f0ab2bf85))

### [1.15.2](https://github.com/blockmineJS/blockmine/compare/v1.15.1...v1.15.2) (2025-07-19)

### [1.15.1](https://github.com/blockmineJS/blockmine/compare/v1.15.0...v1.15.1) (2025-07-19)


### 🐛 Исправления

* фикс. создание триггеров при установке из стора графа ([7980413](https://github.com/blockmineJS/blockmine/commit/79804133a6ff5d6f41769e7db2b6c4f1027e33f6))

## [1.15.0](https://github.com/blockmineJS/blockmine/compare/v1.14.1...v1.15.0) (2025-07-19)


### 🐛 Исправления

* в настройках когда меняешь имя бота на уже существующее, не будет ошибки ([0849f43](https://github.com/blockmineJS/blockmine/commit/0849f43a3b76640c18b1c358a56fedd801bb54ca))
* фикс парочки нод ([dd1a57e](https://github.com/blockmineJS/blockmine/commit/dd1a57e574d107a62934c3fe41aa0d4a1d90660f))


### ✨ Новые возможности

* новый функционал! Магазин графов! его можно найти в левом меню ([9e1c04c](https://github.com/blockmineJS/blockmine/commit/9e1c04cc1c512525b17591c72eb677d55e14b916))
* теперь для плагинов можно делать команды/события в графовой структуре ([e101e46](https://github.com/blockmineJS/blockmine/commit/e101e46c3e5b3fad1a0a47a74a6d64526ee72880))

### [1.14.1](https://github.com/blockmineJS/blockmine/compare/v1.14.0...v1.14.1) (2025-07-19)

## [1.14.0](https://github.com/blockmineJS/blockmine/compare/v1.13.1...v1.14.0) (2025-07-19)


### ✨ Новые возможности

* [PluginUiPage] Если бот не запущен, то на этой странице попросит запустить бота ([fda603e](https://github.com/blockmineJS/blockmine/commit/fda603ee4162b32d3bac481307dc6aca2d671d07))


### 🐛 Исправления

* импорт/экспорт починен ([bad135f](https://github.com/blockmineJS/blockmine/commit/bad135fe04c7e1dc5bb0cfc67a326a3a60e3b040))
* обновлен интерфейс отображения установленных плагинов и улучшена логика обновления плагинов ([ba50a0a](https://github.com/blockmineJS/blockmine/commit/ba50a0aec6bf656e73fb46dc575668dbc617d5ce))
* теперь бот будет принудительно убит если не сможет остановится ([7770af5](https://github.com/blockmineJS/blockmine/commit/7770af5999abf108ec38ab416d8aab3fd5c804ab))
* улучшен интерфейс переключателя темы и исправлена логика инициализации темы при монтировании компонента ([2ed06d8](https://github.com/blockmineJS/blockmine/commit/2ed06d8ed26263521741b62318cab34cf561248e))

### [1.13.1](https://github.com/blockmineJS/blockmine/compare/v1.13.0...v1.13.1) (2025-07-18)


### 🐛 Исправления

* исправлены ошибки в обработке групп и прав пользователей, обновлены иконки у плагинов ([bb4f098](https://github.com/blockmineJS/blockmine/commit/bb4f098736b3249d19e5fc83bb7baadab9e6ce9f))

## [1.13.0](https://github.com/blockmineJS/blockmine/compare/v1.12.0...v1.13.0) (2025-07-18)


### ✨ Новые возможности

* возможность сбрасывать пароль рут аккаунта ([e23181d](https://github.com/blockmineJS/blockmine/commit/e23181d29dbe730ff882d654b8ec0e80a1f007bc))

## [1.12.0](https://github.com/blockmineJS/blockmine/compare/v1.11.5...v1.12.0) (2025-07-18)


### ✨ Новые возможности

* плагины теперь могу делать свои странички что бы делать какие либо действия в панели ([2664c3c](https://github.com/blockmineJS/blockmine/commit/2664c3c1a02db4e650f8a5be7e96ebbcfe3ab0bb))
* плагины теперь могуть хранить ингформацию в базе данных ([edb12fd](https://github.com/blockmineJS/blockmine/commit/edb12fd365603bc72c82ad159ffd734cec265dcb))


### 🛠 Рефакторинг

* очередь сообщений. теперь может принимать в себя массив и задержкой отправляет сообщения ([4f193c9](https://github.com/blockmineJS/blockmine/commit/4f193c9c1c76a53ff655e63f520aa83e16c35126))

### [1.11.1](https://github.com/blockmineJS/blockmine/compare/v1.11.0...v1.11.1) (2025-07-17)


### 🐛 Исправления

* test2 ([3ada981](https://github.com/blockmineJS/blockmine/commit/3ada981363de10b9d38cf34f5eb3a00ef527d6b2))

## 1.11.0 (2025-07-17)


### ✨ Новые возможности

* **commands:** Редизайн интерфейса управления командами ([f520049](https://github.com/blockmineJS/blockmine/commit/f520049196dad133ea7957398d512c0334e85917))