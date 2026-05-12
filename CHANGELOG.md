# История версий


## [1.27.0](https://github.com/blockmineJS/blockmine/compare/v1.25.0...v1.27.0) (2026-05-12)


### 🛠 Рефакторинг

* внутренний большой рефактор бэкенда ([eb27f26](https://github.com/blockmineJS/blockmine/commit/eb27f2600218f05a8b8707adfed3a5a2298531f6))
* полноценный внутренний рефактор нод ([28387a9](https://github.com/blockmineJS/blockmine/commit/28387a917bf89e33e9715cbd03483accc136b9af))


### 🐛 Исправления

* нода "сообщение в чате" работает в локал мире ([17bbde8](https://github.com/blockmineJS/blockmine/commit/17bbde82115cecee646a10bc26f21ec23856e33e))
* пост инсталл скрипт теперь есть... ([c5248cb](https://github.com/blockmineJS/blockmine/commit/c5248cbb805057b52efaea67209bea325b2e0b31))
* причина кика теперь корректно пишется ([08de739](https://github.com/blockmineJS/blockmine/commit/08de739fc03ce35ae136b3bd5cb5b822145139cf))
* роут install local теперь может работать и через апи ключ ([03f1176](https://github.com/blockmineJS/blockmine/commit/03f117690cda3d2966a928be217ad78154d4ec87))
* address PR79 review feedback ([5dceb17](https://github.com/blockmineJS/blockmine/commit/5dceb174ef3009f47cb5a94f48f5e90c4c790feb))
* address remaining PR79 review feedback ([dde6905](https://github.com/blockmineJS/blockmine/commit/dde690593320344f181f9a13fc4dc4905872e2cf))
* close active connection on API key deletion ([2f7db12](https://github.com/blockmineJS/blockmine/commit/2f7db123b0b46c3aedf806d7d543316d7aace1f5))
* close remaining plugin workflow review issues ([9f2dd7f](https://github.com/blockmineJS/blockmine/commit/9f2dd7fa422b5b276df4da96f7b9302d489b5e9f))
* polish language selector modal ([2cebe65](https://github.com/blockmineJS/blockmine/commit/2cebe6554b21191e7f6ce8a532e243832f2a2ded))
* polish plugin list alignment and text clarity ([8c27d60](https://github.com/blockmineJS/blockmine/commit/8c27d6062625e5a55e76a193ed1d3500a88f8246))
* remove remaining emoji from english visual editor ([5a4f356](https://github.com/blockmineJS/blockmine/commit/5a4f3563fad29a4054bc98b31b5bc79c0d0b8572))


### ✨ Новые возможности

* большая переработка интерфейса и прочее ([d28e0fa](https://github.com/blockmineJS/blockmine/commit/d28e0fa4af1815476ad90ddd0fb5799db95707ea))
* в лайв дебаге появилась функция которая дает опробовать ноды без запуска бота ([bbd669f](https://github.com/blockmineJS/blockmine/commit/bbd669f463d62bffacb65b8d6066d5345a0e237f))
* новая нода - имя бота ([574eada](https://github.com/blockmineJS/blockmine/commit/574eada6af5e89b2b67159b82ca435a2f8446004))
* новая нода - прочитать/записать в стор ([eeb588e](https://github.com/blockmineJS/blockmine/commit/eeb588e1305d8bfb68cf7e388abf8b092a7865c2))
* новая нода - стоп бот ([0639ed4](https://github.com/blockmineJS/blockmine/commit/0639ed439d0263fda229f261f317d54df3876d8c))
* новая нода - таймер ([1d7899d](https://github.com/blockmineJS/blockmine/commit/1d7899d243232ae3062a84d6bc46f0f05897b40d))
* новая нода - шаффл. перемешать массив ([67e785a](https://github.com/blockmineJS/blockmine/commit/67e785aa7706eb19a489042fcf2aec20643a0b79))
* новые ноды - события ([ae4db8e](https://github.com/blockmineJS/blockmine/commit/ae4db8e8a11dcdf9c72536a850d65032fa528661))
* новые ноды. проверить право у юзера, добавить/убрать из группы ([3249483](https://github.com/blockmineJS/blockmine/commit/32494831636432013aa72978daa41bc4668a51af))
* обновлен сайдбар ([8d77a48](https://github.com/blockmineJS/blockmine/commit/8d77a4834bc60c76de6010a794b4b79926d3fed1))
* обновление mineflayer. 4.33 -> 4.37.1 . Поддерживает новые версии майнкрафта ([b7f2317](https://github.com/blockmineJS/blockmine/commit/b7f23175ba983fda2a2108d31e54d291d9d17212))
* improve plugin workflows and panel UX ([09f111a](https://github.com/blockmineJS/blockmine/commit/09f111a9c47e7fd639b345be3d95de4c203213a9))
* polish management, viewer, and toast ux ([d52e9b3](https://github.com/blockmineJS/blockmine/commit/d52e9b3d5eb56bc45c0417e10f397ad87441809e))
* polish panel ux, theming, and transitions ([1f347b4](https://github.com/blockmineJS/blockmine/commit/1f347b442cef70f579cdc74c207554f95e68d15a))
* polish plugin UX and localize panel states ([ef32fc0](https://github.com/blockmineJS/blockmine/commit/ef32fc08494c41e7a15312a2d0ed251255f3bd2b))
* refine visual editor and panel polish ([0118ec6](https://github.com/blockmineJS/blockmine/commit/0118ec6de81078845551b443e5129b41e6e064f9))

## [1.25.0](https://github.com/blockmineJS/blockmine/compare/v1.24.0...v1.25.0) (2025-12-22)


### 🛠 Рефакторинг

* перемещена функция shouldShowField в lib для совместимости с master by @artemploxoy ([778e625](https://github.com/blockmineJS/blockmine/commit/778e625e31ef1235ae53fdad628f3012f1ef9602))
* улучшена читаемость логики обработки прокси в BotForm by @artemploxoy ([59f8c0d](https://github.com/blockmineJS/blockmine/commit/59f8c0d9e3ecf45a0246a80216659bf3454f0ab5))


### ✨ Новые возможности

* добавлена поддержка типа select для настроек плагинов by @artemploxoy ([39aba61](https://github.com/blockmineJS/blockmine/commit/39aba618cbd095e6559b08633e8a6062aa77438e))
* добавлена система зависимостей для настроек плагинов и исправлена проблема со сбросом прокси @artemploxoy([86f3472](https://github.com/blockmineJS/blockmine/commit/86f3472465cafcb926a1cd69b37f3f987d716aea))
* использовать displayName вместо ID плагина by @mmeerrkkaa ([1feb04c](https://github.com/blockmineJS/blockmine/commit/1feb04cb4c7aa22aa9f322da37612695cbabb0ae)), closes [#53](https://github.com/blockmineJS/blockmine/issues/53)
* кликабельное название плагина для перехода к README @mmeerrkkaa ([4228b08](https://github.com/blockmineJS/blockmine/commit/4228b0827037733fe6e164008fd3aa26937ece4a)), closes [#56](https://github.com/blockmineJS/blockmine/issues/56)
* плагины теперь могут менять имя бота и пароль @@mmeerrkkaa ([dc5f26d](https://github.com/blockmineJS/blockmine/commit/dc5f26d357867b5a30e75c4c0e545c59be0092d8))
* показ всех команд при наведении на +N badge @mmeerrkkaa ([63ebbba](https://github.com/blockmineJS/blockmine/commit/63ebbba6045e3e6e8dd0eb679d3fabd23a9330df)), closes [#54](https://github.com/blockmineJS/blockmine/issues/54)
* условное отображение полей настроек плагинов @artemploxoy ([264c5cf](https://github.com/blockmineJS/blockmine/commit/264c5cffcd573287ebd634b8e0f3a0482c8f5a7d))
* эвейлабл english lagnauge @mmeerrkkaa ([72e1a9a](https://github.com/blockmineJS/blockmine/commit/72e1a9aaba3ee9d4fea6064ac96b09afb72af572))


### 🐛 Исправления

* безусловное удаление proxyPassword при использовании прокси из списка @artemploxoy ([73ab092](https://github.com/blockmineJS/blockmine/commit/73ab0923641681ec8d315eec4ce3108a500b9264))
* в дашборде кнопка предложить улучшение теперь ведёт куда надо @mmeerrkkaa ([575779c](https://github.com/blockmineJS/blockmine/commit/575779c92295a312b416f7b02bfa665d2c6d6b00))
* добавлена валидация портов серверов и автоочистка @artemploxoy ([c59a6c1](https://github.com/blockmineJS/blockmine/commit/c59a6c1dc5a79cecfb29c06231c7532bd332546c))
* добавлена поддержка типа select в PluginSettingsDialog @artemploxoy ([fe6cfb3](https://github.com/blockmineJS/blockmine/commit/fe6cfb3464a4a1bb21ac3d4a9884db2f7165f184))
* зависимости для плагинов теперь точно автоматом загружаются перед запуском плагина @mmeerrkkaa ([284e4c3](https://github.com/blockmineJS/blockmine/commit/284e4c36d8210a3d73582b6320c4fb6720e6a8f2))
* исправлена кнопка и функция рестарта @mmeerrkkaa ([9a7ce42](https://github.com/blockmineJS/blockmine/commit/9a7ce4288e910a058ec3e6be701b4f7974331f9f))
* различать отсутствующие файлы и npm-пакеты в PluginLoader @mmeerrkkaa ([3540be1](https://github.com/blockmineJS/blockmine/commit/3540be10093449a8e28e99acbeba9699b40e14b8))
* улучшена надежность shouldShowField @artemploxoy ([d023413](https://github.com/blockmineJS/blockmine/commit/d02341390ff5ae52e682223a0de7f45ca1996939))

## [1.24.0](https://github.com/blockmineJS/blockmine/compare/v1.23.4...v1.24.0) (2025-12-07)


### 🐛 Исправления

* во вкладке пользователи пофикшено изменение ролей ([925b4c8](https://github.com/blockmineJS/blockmine/commit/925b4c8427b0982d2360ff289d68c4e17723ced6))
* ограничения доступа для массовых действий и настроек плагинов. by @artemploxoy ([a433177](https://github.com/blockmineJS/blockmine/commit/a43317730d1dacb0dc8aceb1711f64384bc9d650))
* попытка фикса рекурсии при setup ([f2c05a8](https://github.com/blockmineJS/blockmine/commit/f2c05a88959d67b02486f446370f3e7ae50ea2af))
* сохранение настроек прокси при перезагрузке плагинов. by @artemploxoy ([22c8f7d](https://github.com/blockmineJS/blockmine/commit/22c8f7d762b0aecda655ebbf6696253e6aa3c313))
* управленя - пользователи теперь корректно делает сортировку ([13676bf](https://github.com/blockmineJS/blockmine/commit/13676bf25c72e908240f9c387c07576be3349520))


### ✨ Новые возможности

* в 3d viewer добавлен хот бар ([76649cd](https://github.com/blockmineJS/blockmine/commit/76649cdd46f68930acd69991b124aa84dc2dbb99))
* новые ноды. ходьба, печка, контейнер. фиксы и выбор координат в 3d ([5c89398](https://github.com/blockmineJS/blockmine/commit/5c89398f1d7459077375887833852506d0e8f591))
* ai assistant update ([5827c26](https://github.com/blockmineJS/blockmine/commit/5827c261ce59d265698a94d17b965e0c233794b5))

### [1.23.4](https://github.com/blockmineJS/blockmine/compare/v1.23.3...v1.23.4) (2025-11-29)


### 🐛 Исправления

* фикс для npx ([596ff69](https://github.com/blockmineJS/blockmine/commit/596ff69a1c989cf2df079189226ed27f8e2e5e35))

### [1.23.3](https://github.com/blockmineJS/blockmine/compare/v1.23.2...v1.23.3) (2025-11-29)


### 🐛 Исправления

* фикс запуска через npx №2 ([ae02238](https://github.com/blockmineJS/blockmine/commit/ae02238f7289dec25d18e9a8ff928b12023cc19b))

### [1.23.2](https://github.com/blockmineJS/blockmine/compare/v1.23.0...v1.23.2) (2025-11-29)


### 🐛 Исправления

* визуальный редактор. фикс удаления связей ([bf9e5f7](https://github.com/blockmineJS/blockmine/commit/bf9e5f7eef56aa4986e15e5421e46d4c3bfff1b2))
* фикс запуска для npx ([f8bc79f](https://github.com/blockmineJS/blockmine/commit/f8bc79f98310ed6a53f65845d652f74c30039129))

### [1.23.1](https://github.com/blockmineJS/blockmine/compare/v1.23.0...v1.23.1) (2025-11-29)


### 🐛 Исправления

* визуальный редактор. фикс удаления связей ([bf9e5f7](https://github.com/blockmineJS/blockmine/commit/bf9e5f7eef56aa4986e15e5421e46d4c3bfff1b2))

## [1.23.0](https://github.com/blockmineJS/blockmine/compare/v1.22.0...v1.23.0) (2025-11-25)


### 🐛 Исправления

* нода установить переменную. селект Хранить в бд ничего не отображал ([adf4a85](https://github.com/blockmineJS/blockmine/commit/adf4a85929b47d3cb0d0771d7ae205ac5650809f))
* теперь для изменения владельца в боте, не надо перезапускать бэкенд ([0c0d675](https://github.com/blockmineJS/blockmine/commit/0c0d675cfa67db6af752726c5fc23d3e26cffcb5))
* cmd. Первая проверка тип чата, а потом аргументы ([2acdff1](https://github.com/blockmineJS/blockmine/commit/2acdff1db27ad1675cb9168748ff0d8a65271fe9))
* exec пины теперь коннектятся только к exec ([a57f643](https://github.com/blockmineJS/blockmine/commit/a57f643e104bd94c23046493444709bb8de6ed13))


### ✨ Новые возможности

* дебаг режим для графов ([ffc910b](https://github.com/blockmineJS/blockmine/commit/ffc910b772bccf9b64ca828eb55debddb11715d7))
* добавлен ai помощник в blockmine ide ([d7c5f7e](https://github.com/blockmineJS/blockmine/commit/d7c5f7e555beacf614b6cdc94706339880aac55c))
* добавлен diff для просмотра изменений кода от ии ([d0159f0](https://github.com/blockmineJS/blockmine/commit/d0159f0884863ec10136f4bf32ea7daf0702d476))
* новая вкладка - прокси ([3094b8b](https://github.com/blockmineJS/blockmine/commit/3094b8b5f1b9a59dd6494ff54c721f1e720b28f6))
* новая ивент нода - При запуске бота ([5189a02](https://github.com/blockmineJS/blockmine/commit/5189a024c5e57fe8cb28f557b946247644367491))
* новые ноды ([610b501](https://github.com/blockmineJS/blockmine/commit/610b501d89cb744ca9ea7a9e35adc7ae1ec3766b))
* новый ide редактор ([2d7b302](https://github.com/blockmineJS/blockmine/commit/2d7b3026882b56a226760ba38c52cba0815a0720))
* подсветки при соединении нод ([dd06cdd](https://github.com/blockmineJS/blockmine/commit/dd06cdd4fca871713688382c9b73d0eaa4d1b8bd))
* теперь за бота можно ходить прямо в браузере! ([42f9257](https://github.com/blockmineJS/blockmine/commit/42f9257ee3ce166fda648e9a2ca6947c630a21e2))
* фиксы и для нод копирование вставка графов ([aa1308d](https://github.com/blockmineJS/blockmine/commit/aa1308d19122ebc762ec1ebd3f523e12c2fb5aa2))

## [1.22.0](https://github.com/blockmineJS/blockmine/compare/v1.21.0...v1.22.0) (2025-11-16)


### ✨ Новые возможности

* апи для дашборд страницы для отображения ресурсов системы ([c903d64](https://github.com/blockmineJS/blockmine/commit/c903d64c2576d22943971226caec1bd610f0f41e))
* для дашборда добавлен функционал для просмотров ресурсов системы ([b7fa209](https://github.com/blockmineJS/blockmine/commit/b7fa2097274882ea13c01068eac78824560cc22b))
* добавлены ноды для получения существ и игроков рядом с ботом ([17fad59](https://github.com/blockmineJS/blockmine/commit/17fad592c64833e25a2bd9e259379d4d649e3cb4))
* много новых нод и обнов для граф системы ([8881aa5](https://github.com/blockmineJS/blockmine/commit/8881aa554b1b8c6cca4d87cb5900bb8cfe535d33))
* новая большая механика. Вебсокеты ([acda500](https://github.com/blockmineJS/blockmine/commit/acda5005d01cfcb8ee7c85474af966c646c63fcd))
* новая нода - задержка ([cde63db](https://github.com/blockmineJS/blockmine/commit/cde63db612062f3eb7782e8c1f6af35a22dc03e2))
* отключение градиента в консоли. Автор - @artemscine ([ba11548](https://github.com/blockmineJS/blockmine/commit/ba1154827c2e5016c668b79f7b80386819cc7ab9))
* разработчики плагинов теперь могут указать secret: true для маскировки чувствительных значений ([f6c67fb](https://github.com/blockmineJS/blockmine/commit/f6c67fbb0a9cc24eea2175e275593a1b0421d199))
* сообщение в чате text\ntext разделяется на два. \n разделитель ([560ae7b](https://github.com/blockmineJS/blockmine/commit/560ae7b6c8ddbe0412d7f27d145c447bb5d750d2))
* теперь при обновлении плагинов настройки тоже мигрируются ([48434e8](https://github.com/blockmineJS/blockmine/commit/48434e853c9f926168873f61ecd49cbb6c10971c))
* Add date and time manipulation nodes ([80c8dbd](https://github.com/blockmineJS/blockmine/commit/80c8dbd9103a38a03b4ae4ea297322ae699d9c21))
* websocket. Большая фича ([a321023](https://github.com/blockmineJS/blockmine/commit/a3210230d6e78d46928924d244a6b24acee45443))


### 🛠 Рефакторинг

* большой рефакторинг бэкенд части x2 ([49a543a](https://github.com/blockmineJS/blockmine/commit/49a543a122aced41b3725564c66a01269608dd2d))
* большой рефакторинг нод системы ([85ac50f](https://github.com/blockmineJS/blockmine/commit/85ac50f1f0ea79832bd398f7345029f52f6910e1))
* обновление компонентов UI и удаление зависимости от MUI ([86a4a5e](https://github.com/blockmineJS/blockmine/commit/86a4a5edfc91f024cd085cbe4282a5c9efb48b84))
* полный рефакторинг бэкенда ([5e68fd8](https://github.com/blockmineJS/blockmine/commit/5e68fd8fa00a162ae68772bb24ef984d433e9ca5))


### 🐛 Исправления

* важный фикс команд ([16f7da2](https://github.com/blockmineJS/blockmine/commit/16f7da23167ece0877cb196c6ba01bbd6fbcc3a3))
* корректная очистка ANSI ([a9ba9c7](https://github.com/blockmineJS/blockmine/commit/a9ba9c74ab31dbce7ce881a098c204f48aa4e82e))
* рестарт после падения socks. Автор - @artemscine ([bf98505](https://github.com/blockmineJS/blockmine/commit/bf985052c40d30add6a717748efe37eeb15d5d74))
* уменьшение отступов в дашборде Автор - @artemscine ([af52a07](https://github.com/blockmineJS/blockmine/commit/af52a07a0615d29c97c6848ea758c83544236cad))
* remove problematic lcov-reporter-action and update to Node.js 22.x ([ac83208](https://github.com/blockmineJS/blockmine/commit/ac83208eefff2e71075d02fb46c603e8e22a6b9b))
* resolve CodeRabbit review issues ([a45ee47](https://github.com/blockmineJS/blockmine/commit/a45ee47a02409c67284e165248ac19e6adbd369f))

## [1.21.0](https://github.com/blockmineJS/blockmine/compare/v1.20.0...v1.21.0) (2025-10-26)


### 🛠 Рефакторинг

* [graph-system] все ноды отрефакторены и перенесены. [@claude](https://github.com/claude) author ([55db1b8](https://github.com/blockmineJS/blockmine/commit/55db1b89dbe470691db129a72c7efe55030acfa6))


### ✨ Новые возможности

* [graph-system]  пкм. по названию переменной можно найти - Получить/Установить переменную ([83b822f](https://github.com/blockmineJS/blockmine/commit/83b822ff1d278dfb9e280909c81ab32fd0e58bc3))
* [graph-system] конвертация нод при подключения не к тем типам ([03deac8](https://github.com/blockmineJS/blockmine/commit/03deac83c9468199a8f6ae2b2480248c52a39e57))
* добавление виртуализации для списков плагинов и ботов ([ea7746f](https://github.com/blockmineJS/blockmine/commit/ea7746f5c7f05ed74e6893bb27774d8541e0c57f))
* новая нода для http запросов ([3565d06](https://github.com/blockmineJS/blockmine/commit/3565d06bff419c2d2665eba719a4c94696db00ae))

## [1.20.0](https://github.com/blockmineJS/blockmine/compare/v1.19.1...v1.20.0) (2025-10-23)


### ✨ Новые возможности

* если бот падает 5 раз с критической ошибкой, то перезапуск отменяется ([2ba022f](https://github.com/blockmineJS/blockmine/commit/2ba022fff038cc83bb1edfa04d3edf97fc76c255))
* action:send_message to support dynamic variables. example. Сообщение: привет, {username} ([457639d](https://github.com/blockmineJS/blockmine/commit/457639d70e7a8933f0508d93196a2be6951f1a0a))

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