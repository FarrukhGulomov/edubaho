# Git — ветки и коммиты

> Читай при создании веток/коммитов или когда нужно предложить имя ветки/сообщение коммита.

## 1. Названия веток

Оптимальное название ветки:

- в нижнем регистре (кроме кода задачи из таск-трекера);
- только буквы и цифры (`a-z`, `0-9`), без спецсимволов;
- слова разделены дефисом `-`, не `camelCase`/`PascalCase`/`snake_case`;
- не заканчивается дефисом, без двойных дефисов `--`;
- тип ветки — префикс через `/`.

Префиксы:

| Префикс | Назначение |
|---|---|
| `feature/` | новая функциональность |
| `bugfix/` | исправление бага (не в проде) |
| `hotfix/` | срочное исправление критического бага в проде |
| `release/` | подготовка релиза |
| `docs/` | документация |

Опционально: `arch/`, `refactor/`, `research/`, `support/`.

**Типовой формат с номером задачи:**

```
feature/{TICKET-NUMBER}-{краткое-описание}
bugfix/{TICKET-NUMBER}-{краткое-описание}
hotfix/{TICKET-NUMBER}-{краткое-описание}
```

Примеры:

```
feature/TRAN-881-transaction-table
bugfix/TRAN-882-apply-current-user-id
hotfix/TRAN-142-security-patch
```

Неправильно: `fixSidebar`, `feature-new-sidebar-`, `FeatureNewSidebar`, `feat_add_sidebar`.

**Базовые ветки проекта:**

- `master`/`main` — прод.
- `release/${version}` — релизная, после проверки идёт в `master`.
- `staging/test` — препрод (опционально).
- `develop` — дев-ветка релиза (опционально, не для всех проектов).
- `feature/...` — от `develop` (или от релизной ветки, если `develop` нет).
- `bugfix/...` — от `develop`/`staging`.
- `hotfix/...` — от `release/${version}` или `master`.

Прямые коммиты в `master`/shared-ветки — запрещены.

## 2. Названия коммитов

За основу — [Conventional Commits](https://www.conventionalcommits.org/ru/v1.0.0/), при необходимости с номером задачи трекера в начале сообщения.

Формат:

```
[TICKET-NUMBER] тип: что сделано
```

Пример:

```
[ST-1057] feat: add banner
```

Разрешённые типы (нижний регистр):

| Тип | Когда использовать |
|---|---|
| `init` | старт проекта/задачи |
| `feat` | новая функциональность из ТЗ |
| `fix` | исправление ранее реализованной функциональности |
| `refactor` | без изменения поведения: перемещение файлов, форматирование, улучшение алгоритма |
| `test` | добавление/правка тестов |
| `docs` | работа с документацией |
| `chore` | рутинные задачи, обслуживание проекта |
| `build` | система сборки, внешние зависимости |
| `ci` | конфигурация CI |

Правила:

- present tense: `add feature`, не `added feature`;
- imperative mood: `move cursor to...`, не `moves cursor to...`;
- один коммит — один тип изменений; не смешивать feature/refactor/formatting/unrelated cleanup в одном коммите;
- коммит делается только после того, как прошли lint + typecheck + tests + build.

Примеры:

```
[ST-1057] feat: implement search box
[ST-1057] fix: relayout header for firefox
[ST-1057] refactor: apply eslint
[ST-1057] test: add unit tests for user registration process
[ST-1057] docs: update readme with additional information
[ST-1057] chore: update dependencies to the latest versions
[ST-1057] build: bump version of axios to 1.5.1
[ST-1057] ci: set up GitHub Actions for deployment
```
