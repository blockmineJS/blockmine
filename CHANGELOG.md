# История версий


### [1.19.1](https://github.com/blockmineJS/blockmine/compare/v1.19.0...v1.19.1) (2025-10-01)


### 🐛 Исправления

* изменение порядка ботов теперь корректное ([9663737](https://github.com/blockmineJS/blockmine/commit/9663737505201468dd2233bf5658be5b2442f583))
* фиксим новой вкладки прокси ([7ebdb7d](https://github.com/blockmineJS/blockmine/commit/7ebdb7d0df6c4e5cd6a9b15576cc1907ab7fcd74))

## [1.19.0](https://github.com/blockmineJS/blockmine/compare/v1.18.5...v1.19.0) (2025-08-23)


### 🐛 Исправления

* баз команда dev исправлена. теперь не считает алиасы как отдельные кмд ([782c01e](https://github.com/blockmineJS/blockmine/commit/782c01e12f273a04cf78a5772b7be628d22f5791))
* добавлена автоматическая установка недостающих модулей для плагинов при их загрузке ([27154f1](https://github.com/blockmineJS/blockmine/commit/27154f1d2c588f8d8371493f1d28646ff9d764f7))
* зависимости плагин устанавливаются ([a7314c4](https://github.com/blockmineJS/blockmine/commit/a7314c4d1c66ef7021d6c265ebbb270c50a3ab62))
* изменять версия у созданного сервера теперь можно ([a55e3c9](https://github.com/blockmineJS/blockmine/commit/a55e3c9d6a06b9ebd95722aa6487e2b79bda07ff))
* исправление проблем с импортом ([ef9fde2](https://github.com/blockmineJS/blockmine/commit/ef9fde2aa8b1390910600bfd930c444cbff2d01e))
* починили установку локальную ([1b28e07](https://github.com/blockmineJS/blockmine/commit/1b28e071d4846b62dd6360f4709a0e263841960b))
* права юзеров теперь может менять только владелец панели (первый юзер) ([94312d7](https://github.com/blockmineJS/blockmine/commit/94312d7b9c09aabb704f163f8e3205abf7c2acdc))


### ✨ Новые возможности

* когда другой юзер заходит в панель, другие клиенты увидят уведомление что он зашел ([a689b4e](https://github.com/blockmineJS/blockmine/commit/a689b4ee91e0dc187b3eeddc75600e880730b885))
* новая кнопочка - прокси. позволяет установить прокси сразу множеству ботов ([ac75d65](https://github.com/blockmineJS/blockmine/commit/ac75d655289a4b4b4560555ac1fecbcdb199b822))
* теперь можно для других юзеров назначать определенных ботов которыми они могут управлять ([484685b](https://github.com/blockmineJS/blockmine/commit/484685b1821fa3ad8907f4ab320762cf1c6a3959))

### [1.18.5](https://github.com/blockmineJS/blockmine/compare/v1.18.4...v1.18.5) (2025-08-15)


### 🐛 Исправления

* теперь чейнджлог показывает не только минорные версии ([1a8a1d4](https://github.com/blockmineJS/blockmine/commit/1a8a1d405d02b34df37d8e9f19dcd3989f197b41))

### [1.18.4](https://github.com/blockmineJS/blockmine/compare/v1.18.3...v1.18.4) (2025-08-15)


### 🐛 Исправления

* в диалог настроек плагина добавлена новая вкладка - данные. данные из бд плагина ([b532993](https://github.com/blockmineJS/blockmine/commit/b53299383132684e37a8426643ab1346bcf60d86))
* граф стор. чуть изменен дизайн ([c51abcd](https://github.com/blockmineJS/blockmine/commit/c51abcd9e6fe025f8a7b6c85d0b9eb71eb68546a))
* любимая переделка страницы плагинов ([d2f2b59](https://github.com/blockmineJS/blockmine/commit/d2f2b59b3c649e7f5c0eb5f5242d9908311c2c02))
* страница история версий изменена. теперь можно смотреть прошлые ([c5fc95e](https://github.com/blockmineJS/blockmine/commit/c5fc95eb92c9fc0759d76bbd9ec2b46cd7b7f825))

### [1.18.3](https://github.com/blockmineJS/blockmine/compare/v1.18.2...v1.18.3) (2025-08-07)

### [1.18.2](https://github.com/blockmineJS/blockmine/compare/v1.18.1...v1.18.2) (2025-08-07)


### 🐛 Исправления

* добавлена обработка ошибок при подготовке данных для импорта бота ([4e1c67d](https://github.com/blockmineJS/blockmine/commit/4e1c67d1d85ffc792b462b5f5ed0fc7daf2c45b9))
* добавлено авто заполнение владельцев при импорте бота ([10e8fde](https://github.com/blockmineJS/blockmine/commit/10e8fdec16f4d3d6b3cd42dfceee66eb8576f6ce))
* добавлено скрытое заголовок и описание для диалога создания нового бота ([1c8f87a](https://github.com/blockmineJS/blockmine/commit/1c8f87a6a8d723fb3ebdfa4abfdf6e32823f853d))
* увеличен лимит на размер загружаемых файлов. поможет при импорте больших ботов ([a45cf0a](https://github.com/blockmineJS/blockmine/commit/a45cf0ab368de0a021ee708d40a0d64a192ae3c9))
* улучшен интерфейс для мобильных устройств ([b5684a3](https://github.com/blockmineJS/blockmine/commit/b5684a34b92ce5a819b3e7a82e11c05679d890c7))

### [1.18.1](https://github.com/blockmineJS/blockmine/compare/v1.18.0...v1.18.1) (2025-08-03)


### 🐛 Исправления

* добавлен механизм перезапуска ботов при некоторых противных ошибках ([2eb34e3](https://github.com/blockmineJS/blockmine/commit/2eb34e3e63aaa72e5fb641d7ab155baa92dbde63))
* копирование кода/графов и всё что дает возможность скопировать в буфер обмена, починено ([dbe4ee6](https://github.com/blockmineJS/blockmine/commit/dbe4ee6bb2e19d99cfaaef33130c27803d5988a8))
* мелкие фиксы крон паттерна у планировщика. больше логов для наблюдений ([c33e7c8](https://github.com/blockmineJS/blockmine/commit/c33e7c895b3daf60bcde187cf1334ab38bb71592))

## [1.18.0](https://github.com/blockmineJS/blockmine/compare/v1.17.1...v1.18.0) (2025-07-26)


### ✨ Новые возможности

* добавлена новая кнопка - "Предложить улучшение". Поможет адептам составить свой запрос ([d741881](https://github.com/blockmineJS/blockmine/commit/d7418813e53d15fcd16c0517cea033d019ed355b))
* добавлено глубокое объединение настроек для плагинов и улучшена установка зависимостей ([452af4b](https://github.com/blockmineJS/blockmine/commit/452af4b67325f3faebe12c136a40f77515e805c0))

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