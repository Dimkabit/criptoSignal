// // Прокси-сервер для Binance API
// const express = require('express');
// const cors = require('cors');
// const axios = require('axios');
// const path = require('path');

// const app = express();
// const PORT = process.env.PORT || 3000;

// // Настройка CORS
// app.use(cors({
//     origin: '*',
//     methods: ['GET', 'POST', 'PUT', 'DELETE'],
//     allowedHeaders: ['Content-Type', 'Authorization']
// }));

// app.use(express.json());

// // Логирование запросов
// app.use((req, res, next) => {
//     console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
//     next();
// });

// // Кэш для снижения нагрузки на API
// const cache = new Map();
// const CACHE_DURATION = 30000; // 30 секунд

// // Функция для получения данных с кэшированием
// async function fetchWithCache(url, key) {
//     const now = Date.now();
    
//     // Проверяем кэш
//     if (cache.has(key) && (now - cache.get(key).timestamp) < CACHE_DURATION) {
//         console.log(`Возвращаем кэшированные данные для ${key}`);
//         return cache.get(key).data;
//     }
    
//     try {
//         const response = await axios.get(url);
        
//         // Сохраняем в кэш
//         cache.set(key, {
//             data: response.data,
//             timestamp: now
//         });
        
//         return response.data;
//     } catch (error) {
//         console.error(`Ошибка при запросе к ${url}:`, error.message);
//         throw error;
//     }
// }

// // Эндпоинт для получения тикеров по символу
// app.get('/api/ticker/:symbol', async (req, res) => {
//     try {
//         const { symbol } = req.params;
//         const url = `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`;
        
//         const data = await fetchWithCache(url, `ticker_${symbol}`);
        
//         res.json({
//             success: true,
//             data: data,
//             timestamp: new Date().toISOString()
//         });
//     } catch (error) {
//         res.status(500).json({
//             success: false,
//             error: 'Ошибка при получении данных с Binance API',
//             message: error.message
//         });
//     }
// });

// // Эндпоинт для получения всех доступных тикеров
// app.get('/api/tickers', async (req, res) => {
//     try {
//         const url = 'https://api.binance.com/api/v3/ticker/24hr';
//         const data = await fetchWithCache(url, 'all_tickers');
        
//         // Фильтруем только USDT пары и популярные монеты
//         const usdtPairs = data.filter(ticker => 
//             ticker.symbol.endsWith('USDT') && 
//             parseFloat(ticker.volume) > 1000000 // Минимальный объем для ликвидности
//         );
        
//         res.json({
//             success: true,
//             data: usdtPairs,
//             count: usdtPairs.length,
//             timestamp: new Date().toISOString()
//         });
//     } catch (error) {
//         res.status(500).json({
//             success: false,
//             error: 'Ошибка при получении списка тикеров',
//             message: error.message
//         });
//     }
// });

// // Эндпоинт для получения цен нескольких монет сразу
// app.post('/api/prices', async (req, res) => {
//     try {
//         const { symbols } = req.body;
        
//         if (!symbols || !Array.isArray(symbols)) {
//             return res.status(400).json({
//                 success: false,
//                 error: 'Необходимо передать массив символов'
//             });
//         }
        
//         const results = await Promise.all(
//             symbols.map(async (symbol) => {
//                 try {
//                     const url = `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`;
//                     const data = await fetchWithCache(url, `ticker_${symbol}`);
                    
//                     return {
//                         symbol: symbol,
//                         price: parseFloat(data.lastPrice),
//                         change24h: parseFloat(data.priceChangePercent),
//                         volume: parseFloat(data.volume),
//                         high: parseFloat(data.highPrice),
//                         low: parseFloat(data.lowPrice),
//                         timestamp: Date.now()
//                     };
//                 } catch (error) {
//                     console.error(`Ошибка при получении данных для ${symbol}:`, error.message);
//                     return {
//                         symbol: symbol,
//                         error: 'Не удалось получить данные',
//                         timestamp: Date.now()
//                     };
//                 }
//             })
//         );
        
//         res.json({
//             success: true,
//             data: results,
//             timestamp: new Date().toISOString()
//         });
//     } catch (error) {
//         res.status(500).json({
//             success: false,
//             error: 'Ошибка при получении цен',
//             message: error.message
//         });
//     }
// });

// // Эндпоинт для получения исторических данных (опционально)
// app.get('/api/history/:symbol', async (req, res) => {
//     try {
//         const { symbol } = req.params;
//         const { interval = '1h', limit = '24' } = req.query;
        
//         const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
//         const data = await fetchWithCache(url, `history_${symbol}_${interval}_${limit}`);
        
//         // Преобразуем данные в более удобный формат
//         const formattedData = data.map(kline => ({
//             timestamp: kline[0],
//             open: parseFloat(kline[1]),
//             high: parseFloat(kline[2]),
//             low: parseFloat(kline[3]),
//             close: parseFloat(kline[4]),
//             volume: parseFloat(kline[5])
//         }));
        
//         res.json({
//             success: true,
//             data: formattedData,
//             symbol: symbol,
//             interval: interval,
//             count: formattedData.length,
//             timestamp: new Date().toISOString()
//         });
//     } catch (error) {
//         res.status(500).json({
//             success: false,
//             error: 'Ошибка при получении исторических данных',
//             message: error.message
//         });
//     }
// });

// // Эндпоинт для проверки статуса сервера
// app.get('/api/status', (req, res) => {
//     res.json({
//         success: true,
//         message: 'Прокси-сервер Binance API работает',
//         version: '1.0.0',
//         timestamp: new Date().toISOString(),
//         uptime: process.uptime(),
//         cache_size: cache.size
//     });
// });

// // Очистка кэша каждые 5 минут
// setInterval(() => {
//     const now = Date.now();
//     let cleared = 0;
    
//     for (const [key, value] of cache.entries()) {
//         if ((now - value.timestamp) > CACHE_DURATION) {
//             cache.delete(key);
//             cleared++;
//         }
//     }
    
//     if (cleared > 0) {
//         console.log(`Очищено ${cleared} устаревших записей из кэша`);
//     }
// }, 300000); // 5 минут

// // Обработка 404 ошибок
// app.use((req, res) => {
//     res.status(404).json({
//         success: false,
//         error: 'Маршрут не найден',
//         message: 'Проверьте правильность URL'
//     });
// });

// // Обработка других ошибок
// app.use((error, req, res, next) => {
//     console.error('Необработанная ошибка:', error);
//     res.status(500).json({
//         success: false,
//         error: 'Внутренняя ошибка сервера',
//         message: process.env.NODE_ENV === 'development' ? error.message : 'Произошла ошибка'
//     });
// });

// // Keep-alive ping для Render
// const KEEP_ALIVE_URL = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;

// setInterval(() => {
//     axios.get(`${KEEP_ALIVE_URL}/api/status`)
//         .then(() => console.log(`[PING] Сервер активен — ${new Date().toISOString()}`))
//         .catch(err => console.warn(`[PING] Не удалось отправить ping: ${err.message}`));
// }, 14 * 60 * 1000); // каждые 14 минут

// // Запуск сервера
// app.listen(PORT, () => {
//     console.log(`🚀 Прокси-сервер Binance API запущен`);
//     console.log(`📡 Порт: ${PORT}`);
//     console.log(`🌐 CORS: включен для всех источников`);
//     console.log(`💾 Кэширование: ${CACHE_DURATION / 1000} секунд`);
//     console.log('');
//     console.log('📋 Доступные эндпоинты:');
//     console.log(`  GET  /api/status        - Статус сервера`);
//     console.log(`  GET  /api/ticker/:symbol - Данные по символу (например, BTCUSDT)`);
//     console.log(`  GET  /api/tickers       - Все доступные USDT пары`);
//     console.log(`  POST /api/prices        - Цены для нескольких символов`);
//     console.log(`  GET  /api/history/:symbol?interval=1h&limit=24 - Исторические данные`);
// });



// Прокси-сервер для Binance API
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

// 🔧 ОПТИМИЗАЦИЯ ПАМЯТИ ДЛЯ RENDER
if (process.env.NODE_ENV === 'production') {
    const v8 = require('v8');
    v8.setFlagsFromString('--max_old_space_size=512');
    console.log('🛠️ Установлен лимит памяти: 512MB');
}

const app = express();
const PORT = process.env.PORT || 3000;

// 🔧 ДИНАМИЧЕСКИЙ BASE_URL ДЛЯ ВСЕХ СРЕД
const BASE_URL = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
console.log(`🌐 Base URL: ${BASE_URL}`);

// 🔧 ОГРАНИЧЕНИЕ РАЗМЕРА КЭША
const MAX_CACHE_SIZE = 1000;
const CACHE_DURATION = 60000;

const cache = new Map();

// 🔧 ФУНКЦИЯ ДЛЯ ОЧИСТКИ КЭША
function cleanCacheIfNeeded() {
    if (cache.size > MAX_CACHE_SIZE) {
        const entries = Array.from(cache.entries());
        entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
        const toRemove = entries.slice(0, Math.floor(MAX_CACHE_SIZE * 0.3));
        toRemove.forEach(([key]) => cache.delete(key));
        console.log(`🧹 Удалено ${toRemove.length} записей из кэша`);
    }
}

// 🔧 ОБСЛУЖИВАНИЕ СТАТИЧЕСКИХ ФАЙЛОВ
app.use(express.static(path.join(__dirname, '../')));

// CORS
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));

app.use(express.json({ limit: '1mb' }));

// Логирование
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// 🔧 ФУНКЦИЯ КЭШИРОВАНИЯ
async function fetchWithCache(url, key) {
    const now = Date.now();
    
    if (cache.has(key) && (now - cache.get(key).timestamp) < CACHE_DURATION) {
        return cache.get(key).data;
    }
    
    try {
        const response = await axios.get(url, { timeout: 10000 });
        cache.set(key, { data: response.data, timestamp: now });
        cleanCacheIfNeeded();
        return response.data;
    } catch (error) {
        console.error(`❌ Ошибка: ${url}`, error.message);
        if (cache.has(key)) {
            return cache.get(key).data;
        }
        throw error;
    }
}

// 🔧 ГЛАВНАЯ СТРАНИЦА
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});

// 🔧 ЭНДПОИНТ ДЛЯ ПОЛУЧЕНИЯ BASE_URL (для фронтенда)
app.get('/api/config', (req, res) => {
    res.json({
        success: true,
        baseUrl: BASE_URL,
        environment: process.env.NODE_ENV || 'development'
    });
});

// Эндпоинт для получения тикеров по символу
app.get('/api/ticker/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const url = `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`;
    
    const data = await fetchWithCache(url, `ticker_${symbol}`);
    
    res.json({
      success: true,
      data: data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`❌ Ошибка Binance API для ${req.params.symbol}:`, error.message);
    
    // 🔧 ВОЗВРАЩАЕМ ДЕМО-ДАННЫЕ ПРИ ОШИБКЕ
    const demoData = generateDemoTickerData(req.params.symbol);
    res.json({
      success: true,
      data: demoData,
      isDemo: true,
      timestamp: new Date().toISOString()
    });
  }
});

// 🔧 ФУНКЦИЯ ДЛЯ ГЕНЕРАЦИИ ДЕМО-ДАННЫХ БИНАНС
function generateDemoTickerData(symbol) {
  const basePrices = {
    'BTCUSDT': 45000,
    'ETHUSDT': 3000,
    'ADAUSDT': 0.5,
    'DOTUSDT': 10,
    'MATICUSDT': 1,
    'SOLUSDT': 100,
    'AVAXUSDT': 50,
    'ATOMUSDT': 15
  };
  
  const basePrice = basePrices[symbol] || 1;
  const change = (Math.random() - 0.5) * 5; // ±5%
  const currentPrice = basePrice * (1 + change / 100);
  
  return {
    symbol: symbol,
    lastPrice: currentPrice.toString(),
    priceChangePercent: change.toString(),
    volume: (Math.random() * 1000000 + 100000).toString(),
    highPrice: (currentPrice * 1.03).toString(),
    lowPrice: (currentPrice * 0.97).toString(),
    quoteVolume: (Math.random() * 50000000 + 10000000).toString()
  };
}

app.get('/api/history/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        let { interval = '1h', limit = '24' } = req.query;
        limit = Math.min(parseInt(limit), 100);
        
        const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
        const data = await fetchWithCache(url, `history_${symbol}_${interval}_${limit}`);
        
        const formattedData = data.map(kline => ({
            timestamp: kline[0],
            open: parseFloat(kline[1]),
            high: parseFloat(kline[2]),
            low: parseFloat(kline[3]),
            close: parseFloat(kline[4]),
            volume: parseFloat(kline[5])
        }));
        
        res.json({
            success: true,
            data: formattedData,
            symbol,
            interval,
            count: formattedData.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Ошибка исторических данных',
            message: error.message
        });
    }
});

app.get('/api/status', (req, res) => {
    res.json({
        success: true,
        message: 'CryptoSignal API работает',
        version: '1.0.0',
        baseUrl: BASE_URL,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        cache_size: cache.size
    });
});

// 🔧 ОЧИСТКА КЭША
setInterval(() => {
    const now = Date.now();
    let cleared = 0;
    
    for (const [key, value] of cache.entries()) {
        if ((now - value.timestamp) > CACHE_DURATION) {
            cache.delete(key);
            cleared++;
        }
    }
    
    if (cleared > 0) {
        console.log(`🧹 Очищено ${cleared} записей кэша`);
    }
    cleanCacheIfNeeded();
}, 300000);

// 🔧 KEEP-ALIVE PING (только на Render)
if (process.env.RENDER_EXTERNAL_URL) {
    setInterval(() => {
        axios.get(`${BASE_URL}/api/status`, { timeout: 5000 })
            .then(() => console.log(`✅ Ping OK — ${new Date().toISOString()}`))
            .catch(err => console.warn(`⚠️ Ping failed: ${err.message}`));
    }, 10 * 60 * 1000);
}

// Запуск сервера
app.listen(PORT, () => {
    console.log(`🚀 CryptoSignal API запущен на ${BASE_URL}`);
    console.log(`📡 Порт: ${PORT}`);
    console.log(`🌐 Режим: ${process.env.NODE_ENV || 'development'}`);
});