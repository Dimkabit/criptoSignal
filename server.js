// // 



// // Прокси-сервер для Binance API
// const express = require('express');
// const cors = require('cors');
// const axios = require('axios');
// const path = require('path');

// // 🔧 ОПТИМИЗАЦИЯ ПАМЯТИ ДЛЯ RENDER
// if (process.env.NODE_ENV === 'production') {
//     const v8 = require('v8');
//     v8.setFlagsFromString('--max_old_space_size=512');
//     console.log('🛠️ Установлен лимит памяти: 512MB');
// }

// const app = express();
// const PORT = process.env.PORT || 3000;

// // 🔧 ДИНАМИЧЕСКИЙ BASE_URL ДЛЯ ВСЕХ СРЕД
// const BASE_URL = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
// console.log(`🌐 Base URL: ${BASE_URL}`);

// // 🔧 ОГРАНИЧЕНИЕ РАЗМЕРА КЭША
// const MAX_CACHE_SIZE = 1000;
// const CACHE_DURATION = 60000;

// const cache = new Map();

// // 🔧 ФУНКЦИЯ ДЛЯ ОЧИСТКИ КЭША
// function cleanCacheIfNeeded() {
//     if (cache.size > MAX_CACHE_SIZE) {
//         const entries = Array.from(cache.entries());
//         entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
//         const toRemove = entries.slice(0, Math.floor(MAX_CACHE_SIZE * 0.3));
//         toRemove.forEach(([key]) => cache.delete(key));
//         console.log(`🧹 Удалено ${toRemove.length} записей из кэша`);
//     }
// }

// // 🔧 ОБСЛУЖИВАНИЕ СТАТИЧЕСКИХ ФАЙЛОВ
// app.use(express.static(path.join(__dirname, '../')));

// // CORS
// app.use(cors({
//     origin: '*',
//     methods: ['GET', 'POST'],
//     allowedHeaders: ['Content-Type']
// }));

// app.use(express.json({ limit: '1mb' }));

// // Логирование
// app.use((req, res, next) => {
//     console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
//     next();
// });

// // 🔧 ФУНКЦИЯ КЭШИРОВАНИЯ
// async function fetchWithCache(url, key) {
//     const now = Date.now();
    
//     if (cache.has(key) && (now - cache.get(key).timestamp) < CACHE_DURATION) {
//         return cache.get(key).data;
//     }
    
//     try {
//         const response = await axios.get(url, { timeout: 10000 });
//         cache.set(key, { data: response.data, timestamp: now });
//         cleanCacheIfNeeded();
//         return response.data;
//     } catch (error) {
//         console.error(`❌ Ошибка: ${url}`, error.message);
//         if (cache.has(key)) {
//             return cache.get(key).data;
//         }
//         throw error;
//     }
// }

// // 🔧 ГЛАВНАЯ СТРАНИЦА
// app.get('/', (req, res) => {
//     res.sendFile(path.join(__dirname, '../index.html'));
// });

// // 🔧 ЭНДПОИНТ ДЛЯ ПОЛУЧЕНИЯ BASE_URL (для фронтенда)
// app.get('/api/config', (req, res) => {
//     res.json({
//         success: true,
//         baseUrl: BASE_URL,
//         environment: process.env.NODE_ENV || 'development'
//     });
// });

// // Эндпоинт для получения тикеров по символу
// app.get('/api/ticker/:symbol', async (req, res) => {
//   try {
//     const { symbol } = req.params;
//     const url = `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`;
    
//     const data = await fetchWithCache(url, `ticker_${symbol}`);
    
//     res.json({
//       success: true,
//       data: data,
//       timestamp: new Date().toISOString()
//     });
//   } catch (error) {
//     console.error(`❌ Ошибка Binance API для ${req.params.symbol}:`, error.message);
    
//     // 🔧 ВОЗВРАЩАЕМ ДЕМО-ДАННЫЕ ПРИ ОШИБКЕ
//     const demoData = generateDemoTickerData(req.params.symbol);
//     res.json({
//       success: true,
//       data: demoData,
//       isDemo: true,
//       timestamp: new Date().toISOString()
//     });
//   }
// });

// // 🔧 ФУНКЦИЯ ДЛЯ ГЕНЕРАЦИИ ДЕМО-ДАННЫХ БИНАНС
// function generateDemoTickerData(symbol) {
//   const basePrices = {
//     'BTCUSDT': 45000,
//     'ETHUSDT': 3000,
//     'ADAUSDT': 0.5,
//     'DOTUSDT': 10,
//     'MATICUSDT': 1,
//     'SOLUSDT': 100,
//     'AVAXUSDT': 50,
//     'ATOMUSDT': 15
//   };
  
//   const basePrice = basePrices[symbol] || 1;
//   const change = (Math.random() - 0.5) * 5; // ±5%
//   const currentPrice = basePrice * (1 + change / 100);
  
//   return {
//     symbol: symbol,
//     lastPrice: currentPrice.toString(),
//     priceChangePercent: change.toString(),
//     volume: (Math.random() * 1000000 + 100000).toString(),
//     highPrice: (currentPrice * 1.03).toString(),
//     lowPrice: (currentPrice * 0.97).toString(),
//     quoteVolume: (Math.random() * 50000000 + 10000000).toString()
//   };
// }

// app.get('/api/history/:symbol', async (req, res) => {
//     try {
//         const { symbol } = req.params;
//         let { interval = '1h', limit = '24' } = req.query;
//         limit = Math.min(parseInt(limit), 100);
        
//         const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
//         const data = await fetchWithCache(url, `history_${symbol}_${interval}_${limit}`);
        
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
//             symbol,
//             interval,
//             count: formattedData.length,
//             timestamp: new Date().toISOString()
//         });
//     } catch (error) {
//         res.status(500).json({
//             success: false,
//             error: 'Ошибка исторических данных',
//             message: error.message
//         });
//     }
// });

// app.get('/api/status', (req, res) => {
//     res.json({
//         success: true,
//         message: 'CryptoSignal API работает',
//         version: '1.0.0',
//         baseUrl: BASE_URL,
//         timestamp: new Date().toISOString(),
//         uptime: process.uptime(),
//         cache_size: cache.size
//     });
// });


// // 🔧 ЭНДПОИНТ ДЛЯ ПОРТФЕЛЯ (заглушки)
// app.get('/api/portfolio/:userId', (req, res) => {
//   res.json({
//     success: true,
//     data: [],
//     message: 'Portfolio API - в разработке'
//   });
// });

// // 🔧 ЭНДПОИНТ ДЛЯ ИСТОРИИ СИГНАЛОВ (заглушка)
// app.get('/tables/signals_history', (req, res) => {
//   res.json({
//     success: true,
//     data: [],
//     message: 'Signals history - в разработке'
//   });
// });

// app.post('/tables/signals_history', (req, res) => {
//   res.json({
//     success: true,
//     message: 'Signal saved - в разработке'
//   });
// });

// // 🔧 ОЧИСТКА КЭША
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
//         console.log(`🧹 Очищено ${cleared} записей кэша`);
//     }
//     cleanCacheIfNeeded();
// }, 300000);

// // 🔧 KEEP-ALIVE PING (только на Render)
// if (process.env.RENDER_EXTERNAL_URL) {
//     setInterval(() => {
//         axios.get(`${BASE_URL}/api/status`, { timeout: 5000 })
//             .then(() => console.log(`✅ Ping OK — ${new Date().toISOString()}`))
//             .catch(err => console.warn(`⚠️ Ping failed: ${err.message}`));
//     }, 10 * 60 * 1000);
// }

// // Запуск сервера
// app.listen(PORT, () => {
//     console.log(`🚀 CryptoSignal API запущен на ${BASE_URL}`);
//     console.log(`📡 Порт: ${PORT}`);
//     console.log(`🌐 Режим: ${process.env.NODE_ENV || 'development'}`);
// });



// CryptoSignal Server для Render.com
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 🔧 ОБСЛУЖИВАНИЕ ВСЕХ СТАТИЧЕСКИХ ФАЙЛОВ
app.use(express.static('.'));

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

// 🔧 ПРОСТОЙ КЭШ
const cache = new Map();
const CACHE_DURATION = 60000; // 60 секунд

async function fetchWithCache(url, key) {
    const now = Date.now();
    
    if (cache.has(key) && (now - cache.get(key).timestamp) < CACHE_DURATION) {
        return cache.get(key).data;
    }
    
    try {
        const response = await axios.get(url, { timeout: 10000 });
        cache.set(key, { data: response.data, timestamp: now });
        return response.data;
    } catch (error) {
        console.error(`❌ Ошибка API: ${error.message}`);
        // Возвращаем демо-данные при ошибке
        return null;
    }
}

// 🔧 ГЛАВНАЯ СТРАНИЦА
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html')); // ← Просто 'index.html'
});

app.use(express.static(__dirname));

// 🔧 API ЭНДПОИНТЫ С РЕЗЕРВНЫМИ ДАННЫМИ
app.get('/api/ticker/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        const url = `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`;
        
        const data = await fetchWithCache(url, `ticker_${symbol}`);
        
        if (data) {
            res.json({ success: true, data, timestamp: new Date().toISOString() });
        } else {
            // 🔧 ДЕМО-ДАННЫЕ ПРИ ОШИБКЕ
            const demoData = generateDemoTickerData(symbol);
            res.json({ success: true, data: demoData, isDemo: true, timestamp: new Date().toISOString() });
        }
    } catch (error) {
        console.error('Ошибка ticker:', error.message);
        const demoData = generateDemoTickerData(req.params.symbol);
        res.json({ success: true, data: demoData, isDemo: true, timestamp: new Date().toISOString() });
    }
});

app.get('/api/history/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        let { interval = '1h', limit = '24' } = req.query;
        limit = Math.min(parseInt(limit), 100);
        
        const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
        const data = await fetchWithCache(url, `history_${symbol}_${interval}_${limit}`);
        
        if (data) {
            const formattedData = data.map(kline => ({
                timestamp: kline[0],
                open: parseFloat(kline[1]),
                high: parseFloat(kline[2]),
                low: parseFloat(kline[3]),
                close: parseFloat(kline[4]),
                volume: parseFloat(kline[5])
            }));
            res.json({ success: true, data: formattedData, symbol, interval, timestamp: new Date().toISOString() });
        } else {
            // 🔧 ДЕМО-ИСТОРИЯ ПРИ ОШИБКЕ
            const demoHistory = generateDemoHistory(symbol, limit);
            res.json({ success: true, data: demoHistory, isDemo: true, timestamp: new Date().toISOString() });
        }
    } catch (error) {
        console.error('Ошибка history:', error.message);
        const demoHistory = generateDemoHistory(req.params.symbol, 24);
        res.json({ success: true, data: demoHistory, isDemo: true, timestamp: new Date().toISOString() });
    }
});

app.get('/api/status', (req, res) => {
    res.json({
        success: true,
        message: 'CryptoSignal API работает ✅',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// 🔧 ЗАГЛУШКИ ДЛЯ ФРОНТЕНДА
app.get('/tables/signals_history', (req, res) => {
    res.json({ success: true, data: [] });
});

app.post('/tables/signals_history', (req, res) => {
    res.json({ success: true, message: 'Signal saved' });
});

// 🔧 ФУНКЦИИ ДЕМО-ДАННЫХ
function generateDemoTickerData(symbol) {
    const basePrices = {
        'BTCUSDT': 45000, 'ETHUSDT': 3000, 'ADAUSDT': 0.5, 'DOTUSDT': 10,
        'MATICUSDT': 1, 'SOLUSDT': 100, 'AVAXUSDT': 50, 'ATOMUSDT': 15
    };
    
    const basePrice = basePrices[symbol] || 1;
    const change = (Math.random() - 0.5) * 5;
    const currentPrice = basePrice * (1 + change / 100);
    
    return {
        symbol: symbol,
        lastPrice: currentPrice.toFixed(4),
        priceChangePercent: change.toFixed(2),
        volume: (Math.random() * 1000000 + 100000).toFixed(2),
        highPrice: (currentPrice * 1.03).toFixed(4),
        lowPrice: (currentPrice * 0.97).toFixed(4)
    };
}

function generateDemoHistory(symbol, limit) {
    const basePrices = {
        'BTCUSDT': 45000, 'ETHUSDT': 3000, 'ADAUSDT': 0.5, 'DOTUSDT': 10,
        'MATICUSDT': 1, 'SOLUSDT': 100, 'AVAXUSDT': 50, 'ATOMUSDT': 15
    };
    
    const basePrice = basePrices[symbol] || 1;
    const history = [];
    const now = Date.now();
    
    for (let i = 0; i < limit; i++) {
        const timestamp = now - (i * 3600000);
        const price = basePrice * (1 + (Math.random() - 0.5) * 0.1);
        
        history.push({
            timestamp: timestamp,
            open: price * 0.99,
            high: price * 1.02,
            low: price * 0.98,
            close: price,
            volume: Math.random() * 1000000 + 100000
        });
    }
    
    return history.reverse();
}

// 🔧 ЗАПУСК СЕРВЕРА
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 CryptoSignal Server запущен!`);
    console.log(`📡 Порт: ${PORT}`);
    console.log(`🌐 Режим: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🕒 Время: ${new Date().toISOString()}`);
});