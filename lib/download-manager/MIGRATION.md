# Исправление: Expo FileSystem API Migration

## Проблема
При запуске приложения на Expo SDK 54 появлялась ошибка:
```
ERROR Method getInfoAsync imported from "expo-file-system" is deprecated.
```

## Причина
Expo SDK 54 изменил API файловой системы, введя новые классы `File` и `Directory`. Старый API помечен как deprecated.

## Решение
Мигрировали на legacy API для обратной совместимости, заменив все импорты:

**Было:**
```typescript
import * as FileSystem from 'expo-file-system';
```

**Стало:**
```typescript
import * as FileSystem from 'expo-file-system/legacy';
```

## Измененные файлы
1. `lib/download-manager/DownloadManager.ts`
2. `lib/download-manager/constants.ts`
3. `lib/download-manager/utils.ts`
4. `lib/download-manager/StorageManager.ts`

## Результат
✅ Warnings устранены
✅ TypeScript компиляция успешна
✅ Приложение работает корректно

## Примечание
Legacy API будет поддерживаться для обратной совместимости. В будущем можно мигрировать на новый API с классами `File` и `Directory` при необходимости.
