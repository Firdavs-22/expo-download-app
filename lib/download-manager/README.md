# Video Download Manager

Production-ready менеджер загрузок видео для React Native (Expo) с поддержкой pause/resume, queue management и error handling.

## Возможности

✅ **Загрузка видео** по HTTP/HTTPS URL  
✅ **Pause/Resume/Cancel** - полный контроль над загрузками  
✅ **Progress tracking** - отслеживание прогресса в реальном времени  
✅ **Queue management** - очередь с приоритетами и лимитом одновременных загрузок  
✅ **Network monitoring** - автоматическая работа с потерей/восстановлением сети  
✅ **Error handling** - обработка timeout, network errors, storage issues  
✅ **Persistence** - сохранение состояния при перезапуске приложения  
✅ **TypeScript** - полная типизация  
✅ **React Hooks** - простая интеграция с UI  

## Архитектура

```
DownloadManager (Singleton)
├── DownloadQueue - управление очередью
├── StorageManager - работа с файлами
├── NetworkMonitor - мониторинг сети
└── Event System - уведомления UI
```

## Установка зависимостей

```bash
npx expo install expo-file-system expo-network @react-native-async-storage/async-storage
```

## Быстрый старт

### 1. Импорт

```typescript
import { useDownloadManager } from './lib/download-manager';
```

### 2. Использование в компоненте

```typescript
function MyComponent() {
  const {
    getAllDownloads,
    startDownload,
    pauseDownload,
    resumeDownload,
    cancelDownload,
  } = useDownloadManager();

  const downloads = getAllDownloads();

  const handleDownload = async () => {
    const taskId = await startDownload('https://example.com/video.mp4');
    console.log('Started:', taskId);
  };

  return (
    <View>
      <Button title="Download" onPress={handleDownload} />
      {downloads.map(task => (
        <View key={task.id}>
          <Text>{task.fileName}</Text>
          <Text>{task.progress}%</Text>
          <Button title="Pause" onPress={() => pauseDownload(task.id)} />
        </View>
      ))}
    </View>
  );
}
```

## API Reference

### useDownloadManager Hook

Основной hook для работы с несколькими загрузками.

```typescript
const {
  downloads,           // Map<taskId, DownloadTask>
  startDownload,       // (url, options?) => Promise<taskId>
  pauseDownload,       // (taskId) => Promise<void>
  resumeDownload,      // (taskId) => Promise<void>
  cancelDownload,      // (taskId) => Promise<void>
  getDownload,         // (taskId) => DownloadTask | undefined
  getAllDownloads,     // () => DownloadTask[]
  getActiveDownloads,  // () => DownloadTask[]
} = useDownloadManager();
```

### useDownload Hook

Hook для отслеживания одной конкретной загрузки.

```typescript
const {
  task,      // DownloadTask | null
  progress,  // number (0-100)
  status,    // DownloadStatus | null
  error,     // DownloadError | null
  pause,     // () => Promise<void>
  resume,    // () => Promise<void>
  cancel,    // () => Promise<void>
} = useDownload(taskId);
```

### DownloadManager (Low-level API)

Прямой доступ к менеджеру (для advanced use cases).

```typescript
import { DownloadManager } from './lib/download-manager';

const manager = DownloadManager.getInstance();

// Инициализация
await manager.initialize();

// Начать загрузку
const taskId = await manager.download('https://...', {
  fileName: 'custom-name.mp4',
  priority: 10,
});

// Подписка на события
manager.on('progress', (task) => {
  console.log(`${task.fileName}: ${task.progress}%`);
});

manager.on('completed', (task) => {
  console.log('Download completed:', task.filePath);
});

manager.on('error', (task, error) => {
  console.error('Download failed:', error.message);
});
```

## Типы

### DownloadStatus

```typescript
enum DownloadStatus {
  PENDING = 'pending',
  DOWNLOADING = 'downloading',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}
```

### DownloadTask

```typescript
interface DownloadTask {
  id: string;
  url: string;
  fileName: string;
  filePath: string;
  status: DownloadStatus;
  progress: number;              // 0-100
  totalBytes: number;
  downloadedBytes: number;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  error?: DownloadError;
}
```

### DownloadOptions

```typescript
interface DownloadOptions {
  fileName?: string;                 // Custom filename
  headers?: Record<string, string>;  // Custom HTTP headers
  priority?: number;                 // Queue priority (higher = first)
}
```

## Конфигурация

```typescript
import { DownloadManager } from './lib/download-manager';

const manager = DownloadManager.getInstance({
  maxConcurrentDownloads: 3,      // Max одновременных загрузок
  timeoutMs: 30000,               // Timeout (30 сек)
  maxRetryAttempts: 3,            // Max попыток retry
  progressUpdateThrottleMs: 100,  // Частота обновления прогресса
  autoRetryOnNetworkRestore: true, // Auto-retry при восстановлении сети
});
```

## Ограничения Expo

### Фоновая загрузка

⚠️ **Важно**: В Expo Managed Workflow фоновая загрузка **ограничена**:

- **iOS**: Фоновые задачи работают ~30 секунд после сворачивания
- **Android**: Можно использовать, но требует приложение в памяти
- **Решение**: Для полноценной фоновой загрузки нужен **bare workflow** или **development build** с нативными модулями

### Что работает

✅ Загрузка пока приложение активно  
✅ Загрузка в background (ограниченное время)  
✅ Pause/Resume через session  
✅ Восстановление после restart app  

### Что НЕ работает

❌ Загрузка после полного закрытия приложения (App killed)  
❌ Background downloads на iOS дольше 30 секунд  

## Примеры использования

### Базовый пример

```typescript
import { VideoDownloader } from './components/VideoDownloader';

export default function App() {
  return <VideoDownloader />;
}
```

### Кастомный компонент

```typescript
function CustomDownloader() {
  const { startDownload } = useDownloadManager();
  const [taskId, setTaskId] = useState<string | null>(null);

  const download = useDownload(taskId);

  const handleStart = async () => {
    const id = await startDownload('https://example.com/video.mp4');
    setTaskId(id);
  };

  return (
    <View>
      <Button title="Start" onPress={handleStart} />
      {download.task && (
        <>
          <Text>Progress: {download.progress}%</Text>
          <Text>Status: {download.status}</Text>
          {download.status === 'downloading' && (
            <Button title="Pause" onPress={download.pause} />
          )}
          {download.status === 'paused' && (
            <Button title="Resume" onPress={download.resume} />
          )}
        </>
      )}
    </View>
  );
}
```

## Обработка ошибок

```typescript
const { startDownload } = useDownloadManager();

try {
  await startDownload('invalid-url');
} catch (error) {
  console.error('Failed to start:', error.message);
}

// Подписка на ошибки
manager.on('error', (task, error) => {
  switch (error.code) {
    case 'NETWORK_ERROR':
      // Handle network issue
      break;
    case 'INSUFFICIENT_STORAGE':
      // Handle storage issue
      break;
    // ... other error codes
  }
});
```

## Файловая структура

```
lib/download-manager/
├── index.ts                    # Main exports
├── types.ts                    # TypeScript types
├── constants.ts                # Configuration constants
├── utils.ts                    # Utility functions
├── DownloadManager.ts          # Main manager class
├── DownloadQueue.ts            # Queue management
├── StorageManager.ts           # File storage
├── NetworkMonitor.ts           # Network monitoring
└── hooks/
    ├── index.ts
    ├── useDownloadManager.ts   # Multi-download hook
    └── useDownload.ts          # Single download hook
```

## Тестирование

### Тестовые URLs

```typescript
const testUrls = [
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
];
```

### Проверка файловой системы

```typescript
import * as FileSystem from 'expo-file-system';

// Список загруженных файлов
const files = await FileSystem.readDirectoryAsync(
  FileSystem.documentDirectory + 'downloads/'
);
console.log('Downloaded files:', files);

// Информация о файле
const info = await FileSystem.getInfoAsync(task.filePath);
console.log('File size:', info.size);
```

## Производительность

- **Throttling**: Progress updates ограничены до 100ms
- **Concurrent limit**: По умолчанию 3 одновременные загрузки
- **Memory**: Минимальное использование памяти благодаря streaming
- **Storage**: Automatic cleanup failed/cancelled downloads

## Лицензия

MIT
