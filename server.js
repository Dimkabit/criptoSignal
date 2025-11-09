// // // 



// // // Прокси-сервер для Binance API
// // const express = require('express');
// // const cors = require('cors');
// // const axios = require('axios');
// // const path = require('path');

// // // 🔧 ОПТИМИЗАЦИЯ ПАМЯТИ ДЛЯ RENDER
// // if (process.env.NODE_ENV === 'production') {
// //     const v8 = require('v8');
// //     v8.setFlagsFromString('--max_old_space_size=512');
// //     console.log('🛠️ Установлен лимит памяти: 512MB');
// // }

// // const app = express();
// // const PORT = process.env.PORT || 3000;

// // // 🔧 ДИНАМИЧЕСКИЙ BASE_URL ДЛЯ ВСЕХ СРЕД
// // const BASE_URL = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
// // console.log(`🌐 Base URL: ${BASE_URL}`);

// // // 🔧 ОГРАНИЧЕНИЕ РАЗМЕРА КЭША
// // const MAX_CACHE_SIZE = 1000;
// // const CACHE_DURATION = 60000;

// // const cache = new Map();

// // // 🔧 ФУНКЦИЯ ДЛЯ ОЧИСТКИ КЭША
// // function cleanCacheIfNeeded() {
// //     if (cache.size > MAX_CACHE_SIZE) {
// //         const entries = Array.from(cache.entries());
// //         entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
// //         const toRemove = entries.slice(0, Math.floor(MAX_CACHE_SIZE * 0.3));
// //         toRemove.forEach(([key]) => cache.delete(key));
// //         console.log(`🧹 Удалено ${toRemove.length} записей из кэша`);
// //     }
// // }

// // // 🔧 ОБСЛУЖИВАНИЕ СТАТИЧЕСКИХ ФАЙЛОВ
// // app.use(express.static(path.join(__dirname, '../')));

// // // CORS
// // app.use(cors({
// //     origin: '*',
// //     methods: ['GET', 'POST'],
// //     allowedHeaders: ['Content-Type']
// // }));

// // app.use(express.json({ limit: '1mb' }));

// // // Логирование
// // app.use((req, res, next) => {
// //     console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
// //     next();
// // });

// // // 🔧 ФУНКЦИЯ КЭШИРОВАНИЯ
// // async function fetchWithCache(url, key) {
// //     const now = Date.now();
    
// //     if (cache.has(key) && (now - cache.get(key).timestamp) < CACHE_DURATION) {
// //         return cache.get(key).data;
// //     }
    
// //     try {
// //         const response = await axios.get(url, { timeout: 10000 });
// //         cache.set(key, { data: response.data, timestamp: now });
// //         cleanCacheIfNeeded();
// //         return response.data;
// //     } catch (error) {
// //         console.error(`❌ Ошибка: ${url}`, error.message);
// //         if (cache.has(key)) {
// //             return cache.get(key).data;
// //         }
// //         throw error;
// //     }
// // }

// // // 🔧 ГЛАВНАЯ СТРАНИЦА
// // app.get('/', (req, res) => {
// //     res.sendFile(path.join(__dirname, '../index.html'));
// // });

// // // 🔧 ЭНДПОИНТ ДЛЯ ПОЛУЧЕНИЯ BASE_URL (для фронтенда)
// // app.get('/api/config', (req, res) => {
// //     res.json({
// //         success: true,
// //         baseUrl: BASE_URL,
// //         environment: process.env.NODE_ENV || 'development'
// //     });
// // });

// // // Эндпоинт для получения тикеров по символу
// // app.get('/api/ticker/:symbol', async (req, res) => {
// //   try {
// //     const { symbol } = req.params;
// //     const url = `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`;
    
// //     const data = await fetchWithCache(url, `ticker_${symbol}`);
    
// //     res.json({
// //       success: true,
// //       data: data,
// //       timestamp: new Date().toISOString()
// //     });
// //   } catch (error) {
// //     console.error(`❌ Ошибка Binance API для ${req.params.symbol}:`, error.message);
    
// //     // 🔧 ВОЗВРАЩАЕМ ДЕМО-ДАННЫЕ ПРИ ОШИБКЕ
// //     const demoData = generateDemoTickerData(req.params.symbol);
// //     res.json({
// //       success: true,
// //       data: demoData,
// //       isDemo: true,
// //       timestamp: new Date().toISOString()
// //     });
// //   }
// // });

// // // 🔧 ФУНКЦИЯ ДЛЯ ГЕНЕРАЦИИ ДЕМО-ДАННЫХ БИНАНС
// // function generateDemoTickerData(symbol) {
// //   const basePrices = {
// //     'BTCUSDT': 45000,
// //     'ETHUSDT': 3000,
// //     'ADAUSDT': 0.5,
// //     'DOTUSDT': 10,
// //     'MATICUSDT': 1,
// //     'SOLUSDT': 100,
// //     'AVAXUSDT': 50,
// //     'ATOMUSDT': 15
// //   };
  
// //   const basePrice = basePrices[symbol] || 1;
// //   const change = (Math.random() - 0.5) * 5; // ±5%
// //   const currentPrice = basePrice * (1 + change / 100);
  
// //   return {
// //     symbol: symbol,
// //     lastPrice: currentPrice.toString(),
// //     priceChangePercent: change.toString(),
// //     volume: (Math.random() * 1000000 + 100000).toString(),
// //     highPrice: (currentPrice * 1.03).toString(),
// //     lowPrice: (currentPrice * 0.97).toString(),
// //     quoteVolume: (Math.random() * 50000000 + 10000000).toString()
// //   };
// // }

// // app.get('/api/history/:symbol', async (req, res) => {
// //     try {
// //         const { symbol } = req.params;
// //         let { interval = '1h', limit = '24' } = req.query;
// //         limit = Math.min(parseInt(limit), 100);
        
// //         const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
// //         const data = await fetchWithCache(url, `history_${symbol}_${interval}_${limit}`);
        
// //         const formattedData = data.map(kline => ({
// //             timestamp: kline[0],
// //             open: parseFloat(kline[1]),
// //             high: parseFloat(kline[2]),
// //             low: parseFloat(kline[3]),
// //             close: parseFloat(kline[4]),
// //             volume: parseFloat(kline[5])
// //         }));
        
// //         res.json({
// //             success: true,
// //             data: formattedData,
// //             symbol,
// //             interval,
// //             count: formattedData.length,
// //             timestamp: new Date().toISOString()
// //         });
// //     } catch (error) {
// //         res.status(500).json({
// //             success: false,
// //             error: 'Ошибка исторических данных',
// //             message: error.message
// //         });
// //     }
// // });

// // app.get('/api/status', (req, res) => {
// //     res.json({
// //         success: true,
// //         message: 'CryptoSignal API работает',
// //         version: '1.0.0',
// //         baseUrl: BASE_URL,
// //         timestamp: new Date().toISOString(),
// //         uptime: process.uptime(),
// //         cache_size: cache.size
// //     });
// // });


// // // 🔧 ЭНДПОИНТ ДЛЯ ПОРТФЕЛЯ (заглушки)
// // app.get('/api/portfolio/:userId', (req, res) => {
// //   res.json({
// //     success: true,
// //     data: [],
// //     message: 'Portfolio API - в разработке'
// //   });
// // });

// // // 🔧 ЭНДПОИНТ ДЛЯ ИСТОРИИ СИГНАЛОВ (заглушка)
// // app.get('/tables/signals_history', (req, res) => {
// //   res.json({
// //     success: true,
// //     data: [],
// //     message: 'Signals history - в разработке'
// //   });
// // });

// // app.post('/tables/signals_history', (req, res) => {
// //   res.json({
// //     success: true,
// //     message: 'Signal saved - в разработке'
// //   });
// // });

// // // 🔧 ОЧИСТКА КЭША
// // setInterval(() => {
// //     const now = Date.now();
// //     let cleared = 0;
    
// //     for (const [key, value] of cache.entries()) {
// //         if ((now - value.timestamp) > CACHE_DURATION) {
// //             cache.delete(key);
// //             cleared++;
// //         }
// //     }
    
// //     if (cleared > 0) {
// //         console.log(`🧹 Очищено ${cleared} записей кэша`);
// //     }
// //     cleanCacheIfNeeded();
// // }, 300000);

// // // 🔧 KEEP-ALIVE PING (только на Render)
// // if (process.env.RENDER_EXTERNAL_URL) {
// //     setInterval(() => {
// //         axios.get(`${BASE_URL}/api/status`, { timeout: 5000 })
// //             .then(() => console.log(`✅ Ping OK — ${new Date().toISOString()}`))
// //             .catch(err => console.warn(`⚠️ Ping failed: ${err.message}`));
// //     }, 10 * 60 * 1000);
// // }

// // // Запуск сервера
// // app.listen(PORT, () => {
// //     console.log(`🚀 CryptoSignal API запущен на ${BASE_URL}`);
// //     console.log(`📡 Порт: ${PORT}`);
// //     console.log(`🌐 Режим: ${process.env.NODE_ENV || 'development'}`);
// // });



// // CryptoSignal Server для Render.com
// const express = require('express');
// const cors = require('cors');
// const axios = require('axios');
// const path = require('path');

// const app = express();
// const PORT = process.env.PORT || 3000;

// // 🔧 ОБСЛУЖИВАНИЕ ВСЕХ СТАТИЧЕСКИХ ФАЙЛОВ
// app.use(express.static('.'));

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

// // 🔧 ПРОСТОЙ КЭШ
// const cache = new Map();
// const CACHE_DURATION = 60000; // 60 секунд

// async function fetchWithCache(url, key) {
//     const now = Date.now();
    
//     if (cache.has(key) && (now - cache.get(key).timestamp) < CACHE_DURATION) {
//         return cache.get(key).data;
//     }
    
//     try {
//         const response = await axios.get(url, { timeout: 10000 });
//         cache.set(key, { data: response.data, timestamp: now });
//         return response.data;
//     } catch (error) {
//         console.error(`❌ Ошибка API: ${error.message}`);
//         // Возвращаем демо-данные при ошибке
//         return null;
//     }
// }

// // 🔧 ГЛАВНАЯ СТРАНИЦА
// app.get('/', (req, res) => {
//   res.sendFile(path.join(__dirname, 'index.html')); // ← Просто 'index.html'
// });

// app.use(express.static(__dirname));

// // 🔧 API ЭНДПОИНТЫ С РЕЗЕРВНЫМИ ДАННЫМИ
// app.get('/api/ticker/:symbol', async (req, res) => {
//     try {
//         const { symbol } = req.params;
//         const url = `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`;
        
//         const data = await fetchWithCache(url, `ticker_${symbol}`);
        
//         if (data) {
//             res.json({ success: true, data, timestamp: new Date().toISOString() });
//         } else {
//             // 🔧 ДЕМО-ДАННЫЕ ПРИ ОШИБКЕ
//             const demoData = generateDemoTickerData(symbol);
//             res.json({ success: true, data: demoData, isDemo: true, timestamp: new Date().toISOString() });
//         }
//     } catch (error) {
//         console.error('Ошибка ticker:', error.message);
//         const demoData = generateDemoTickerData(req.params.symbol);
//         res.json({ success: true, data: demoData, isDemo: true, timestamp: new Date().toISOString() });
//     }
// });

// app.get('/api/history/:symbol', async (req, res) => {
//     try {
//         const { symbol } = req.params;
//         let { interval = '1h', limit = '24' } = req.query;
//         limit = Math.min(parseInt(limit), 100);
        
//         const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
//         const data = await fetchWithCache(url, `history_${symbol}_${interval}_${limit}`);
        
//         if (data) {
//             const formattedData = data.map(kline => ({
//                 timestamp: kline[0],
//                 open: parseFloat(kline[1]),
//                 high: parseFloat(kline[2]),
//                 low: parseFloat(kline[3]),
//                 close: parseFloat(kline[4]),
//                 volume: parseFloat(kline[5])
//             }));
//             res.json({ success: true, data: formattedData, symbol, interval, timestamp: new Date().toISOString() });
//         } else {
//             // 🔧 ДЕМО-ИСТОРИЯ ПРИ ОШИБКЕ
//             const demoHistory = generateDemoHistory(symbol, limit);
//             res.json({ success: true, data: demoHistory, isDemo: true, timestamp: new Date().toISOString() });
//         }
//     } catch (error) {
//         console.error('Ошибка history:', error.message);
//         const demoHistory = generateDemoHistory(req.params.symbol, 24);
//         res.json({ success: true, data: demoHistory, isDemo: true, timestamp: new Date().toISOString() });
//     }
// });

// app.get('/api/status', (req, res) => {
//     res.json({
//         success: true,
//         message: 'CryptoSignal API работает ✅',
//         version: '1.0.0',
//         timestamp: new Date().toISOString(),
//         uptime: process.uptime()
//     });
// });

// // 🔧 ЗАГЛУШКИ ДЛЯ ФРОНТЕНДА
// app.get('/tables/signals_history', (req, res) => {
//     res.json({ success: true, data: [] });
// });

// app.post('/tables/signals_history', (req, res) => {
//     res.json({ success: true, message: 'Signal saved' });
// });

// // 🔧 ФУНКЦИИ ДЕМО-ДАННЫХ
// function generateDemoTickerData(symbol) {
//     const basePrices = {
//         'BTCUSDT': 45000, 'ETHUSDT': 3000, 'ADAUSDT': 0.5, 'DOTUSDT': 10,
//         'MATICUSDT': 1, 'SOLUSDT': 100, 'AVAXUSDT': 50, 'ATOMUSDT': 15
//     };
    
//     const basePrice = basePrices[symbol] || 1;
//     const change = (Math.random() - 0.5) * 5;
//     const currentPrice = basePrice * (1 + change / 100);
    
//     return {
//         symbol: symbol,
//         lastPrice: currentPrice.toFixed(4),
//         priceChangePercent: change.toFixed(2),
//         volume: (Math.random() * 1000000 + 100000).toFixed(2),
//         highPrice: (currentPrice * 1.03).toFixed(4),
//         lowPrice: (currentPrice * 0.97).toFixed(4)
//     };
// }

// function generateDemoHistory(symbol, limit) {
//     const basePrices = {
//         'BTCUSDT': 45000, 'ETHUSDT': 3000, 'ADAUSDT': 0.5, 'DOTUSDT': 10,
//         'MATICUSDT': 1, 'SOLUSDT': 100, 'AVAXUSDT': 50, 'ATOMUSDT': 15
//     };
    
//     const basePrice = basePrices[symbol] || 1;
//     const history = [];
//     const now = Date.now();
    
//     for (let i = 0; i < limit; i++) {
//         const timestamp = now - (i * 3600000);
//         const price = basePrice * (1 + (Math.random() - 0.5) * 0.1);
        
//         history.push({
//             timestamp: timestamp,
//             open: price * 0.99,
//             high: price * 1.02,
//             low: price * 0.98,
//             close: price,
//             volume: Math.random() * 1000000 + 100000
//         });
//     }
    
//     return history.reverse();
// }

// // 🔧 ЗАПУСК СЕРВЕРА
// app.listen(PORT, '0.0.0.0', () => {
//     console.log(`🚀 CryptoSignal Server запущен!`);
//     console.log(`📡 Порт: ${PORT}`);
//     console.log(`🌐 Режим: ${process.env.NODE_ENV || 'development'}`);
//     console.log(`🕒 Время: ${new Date().toISOString()}`);
// });


const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const WebSocket = require('ws');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'crypto-signal-secret-key-2024';

// 🔧 ОПТИМИЗАЦИЯ ПАМЯТИ ДЛЯ RENDER
if (process.env.NODE_ENV === 'production') {
    const v8 = require('v8');
    v8.setFlagsFromString('--max_old_space_size=512');
    console.log('🛠️ Установлен лимит памяти: 512MB');
}

// 🔧 ПОДКЛЮЧЕНИЕ К POSTGRESQL НА RENDER
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// 🔧 ИНИЦИАЛИЗАЦИЯ БАЗЫ ДАННЫХ
async function initializeDatabase() {
    try {
        console.log('🔄 Инициализация базы данных PostgreSQL...');

        // Пользователи
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                name VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Портфель пользователя
        await pool.query(`
            CREATE TABLE IF NOT EXISTS portfolio (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                symbol VARCHAR(20) NOT NULL,
                name VARCHAR(100) NOT NULL,
                amount DECIMAL(20,8) NOT NULL,
                buy_price DECIMAL(20,8) NOT NULL,
                target_price DECIMAL(20,8),
                stop_loss DECIMAL(20,8),
                buy_date DATE,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // История сигналов
        await pool.query(`
            CREATE TABLE IF NOT EXISTS signals_history (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                symbol VARCHAR(20) NOT NULL,
                name VARCHAR(100) NOT NULL,
                action VARCHAR(10) NOT NULL,
                entry_price DECIMAL(20,8) NOT NULL,
                target_price DECIMAL(20,8),
                stop_loss DECIMAL(20,8),
                confidence INTEGER,
                result VARCHAR(20) DEFAULT 'pending',
                actual_profit DECIMAL(20,8) DEFAULT 0,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Торговые сессии
        await pool.query(`
            CREATE TABLE IF NOT EXISTS trading_sessions (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                symbol VARCHAR(20) NOT NULL,
                action VARCHAR(10) NOT NULL,
                entry_price DECIMAL(20,8) NOT NULL,
                exit_price DECIMAL(20,8),
                amount DECIMAL(20,8) NOT NULL,
                profit_loss DECIMAL(20,8),
                status VARCHAR(20) DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                closed_at TIMESTAMP
            )
        `);

        console.log('✅ PostgreSQL таблицы созданы/проверены');
    } catch (error) {
        console.error('❌ Ошибка инициализации БД:', error);
    }
}

// 🔧 MIDDLEWARE
app.use(express.static(__dirname));
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));

// Логирование запросов
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// 🔧 АУТЕНТИФИКАЦИЯ
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, error: 'Токен доступа отсутствует' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ success: false, error: 'Неверный токен' });
        }
        req.user = user;
        next();
    });
};

// 🔧 КЭШИРОВАНИЕ ДЛЯ BINANCE API
const cache = new Map();
const CACHE_DURATION = 30000; // 30 секунд

async function fetchWithCache(url, key) {
    const now = Date.now();
    
    if (cache.has(key) && (now - cache.get(key).timestamp) < CACHE_DURATION) {
        return cache.get(key).data;
    }
    
    try {
        const response = await axios.get(url, { 
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        cache.set(key, { data: response.data, timestamp: now });
        return response.data;
    } catch (error) {
        console.error(`❌ Ошибка API: ${error.message}`);
        return null;
    }
}

// 🔧 WebSocket ДЛЯ REAL-TIME ДАННЫХ
const wss = new WebSocket.Server({ noServer: true });
const clients = new Map();

wss.on('connection', (ws, req) => {
    const clientId = Date.now().toString();
    clients.set(clientId, ws);
    console.log(`🔗 WebSocket подключен: ${clientId}`);

    ws.send(JSON.stringify({
        type: 'connection',
        message: 'Connected to CryptoSignal Real-time',
        clientId
    }));

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            if (data.type === 'subscribe') {
                ws.subscriptions = data.symbols || [];
                console.log(`📡 Клиент ${clientId} подписан на:`, ws.subscriptions);
            }
        } catch (error) {
            console.error('WebSocket message error:', error);
        }
    });

    ws.on('close', () => {
        clients.delete(clientId);
        console.log(`🔗 WebSocket отключен: ${clientId}`);
    });

    ws.on('error', (error) => {
        console.error(`WebSocket error ${clientId}:`, error);
        clients.delete(clientId);
    });
});

// 🔧 REAL-TIME ОБНОВЛЕНИЯ ЦЕН
async function broadcastPriceUpdates() {
    if (clients.size === 0) return;

    const symbols = ['BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'DOTUSDT', 'MATICUSDT', 'SOLUSDT', 'AVAXUSDT', 'ATOMUSDT'];
    
    try {
        const updates = [];
        for (const symbol of symbols) {
            const data = await fetchRealTimeData(symbol);
            if (data) {
                updates.push(data);
            }
        }

        // Отправляем все обновления одним сообщением
        const message = JSON.stringify({
            type: 'price_updates',
            data: updates,
            timestamp: Date.now()
        });

        clients.forEach((ws, clientId) => {
            if (ws.readyState === WebSocket.OPEN) {
                try {
                    ws.send(message);
                } catch (error) {
                    console.error(`Ошибка отправки клиенту ${clientId}:`, error);
                    clients.delete(clientId);
                }
            }
        });

    } catch (error) {
        console.error('Ошибка broadcast:', error);
    }
}

// Запускаем обновления каждые 5 секунд
setInterval(broadcastPriceUpdates, 5000);

// 🔧 РОУТЫ АУТЕНТИФИКАЦИИ

// Регистрация
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password, name } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ success: false, error: 'Email и пароль обязательны' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        const result = await pool.query(
            'INSERT INTO users (email, password, name) VALUES ($1, $2, $3) RETURNING id, email, name, created_at',
            [email, hashedPassword, name]
        );

        const user = result.rows[0];
        const token = jwt.sign({ userId: user.id, email }, JWT_SECRET, { expiresIn: '24h' });
        
        res.json({
            success: true,
            message: 'Пользователь успешно зарегистрирован',
            token,
            user: { 
                id: user.id, 
                email: user.email, 
                name: user.name,
                created_at: user.created_at
            }
        });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({ success: false, error: 'Пользователь с таким email уже существует' });
        }
        console.error('Ошибка регистрации:', error);
        res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
    }
});

// Логин
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ success: false, error: 'Email и пароль обязательны' });
        }

        const result = await pool.query(
            'SELECT * FROM users WHERE email = $1', 
            [email]
        );
        const user = result.rows[0];
        
        if (!user) {
            return res.status(401).json({ success: false, error: 'Пользователь не найден' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ success: false, error: 'Неверный пароль' });
        }

        const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
        
        res.json({
            success: true,
            message: 'Успешный вход в систему',
            token,
            user: { 
                id: user.id, 
                email: user.email, 
                name: user.name,
                created_at: user.created_at
            }
        });
    } catch (error) {
        console.error('Ошибка логина:', error);
        res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
    }
});

// 🔧 РОУТЫ ПОРТФЕЛЯ

// Получить портфель пользователя
app.get('/api/portfolio', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT p.*, 
                    (SELECT price FROM crypto_prices WHERE symbol = p.symbol ORDER BY timestamp DESC LIMIT 1) as current_price
             FROM portfolio p 
             WHERE user_id = $1 
             ORDER BY created_at DESC`,
            [req.user.userId]
        );

        const portfolioWithPrices = await Promise.all(
            result.rows.map(async (item) => {
                const currentData = await fetchRealTimeData(item.symbol);
                const current_price = currentData ? currentData.price : item.buy_price;
                
                return {
                    ...item,
                    current_price: parseFloat(current_price),
                    total_value: parseFloat(current_price) * parseFloat(item.amount),
                    profit_loss: (parseFloat(current_price) - parseFloat(item.buy_price)) * parseFloat(item.amount),
                    profit_loss_percent: ((parseFloat(current_price) - parseFloat(item.buy_price)) / parseFloat(item.buy_price)) * 100
                };
            })
        );

        res.json({ success: true, data: portfolioWithPrices });
    } catch (error) {
        console.error('Ошибка получения портфеля:', error);
        res.status(500).json({ success: false, error: 'Ошибка получения портфеля' });
    }
});

// Добавить актив в портфель
app.post('/api/portfolio', authenticateToken, async (req, res) => {
    try {
        const { symbol, name, amount, buy_price, target_price, stop_loss, buy_date, notes } = req.body;
        
        if (!symbol || !name || !amount || !buy_price) {
            return res.status(400).json({ success: false, error: 'Обязательные поля: symbol, name, amount, buy_price' });
        }

        const currentData = await fetchRealTimeData(symbol);
        const current_price = currentData ? currentData.price : buy_price;

        const result = await pool.query(
            `INSERT INTO portfolio (user_id, symbol, name, amount, buy_price, target_price, stop_loss, buy_date, notes) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
             RETURNING *`,
            [req.user.userId, symbol, name, amount, buy_price, target_price, stop_loss, buy_date, notes]
        );

        const portfolioItem = {
            ...result.rows[0],
            current_price: parseFloat(current_price),
            total_value: parseFloat(current_price) * parseFloat(amount),
            profit_loss: (parseFloat(current_price) - parseFloat(buy_price)) * parseFloat(amount),
            profit_loss_percent: ((parseFloat(current_price) - parseFloat(buy_price)) / parseFloat(buy_price)) * 100
        };

        res.json({
            success: true,
            message: 'Актив успешно добавлен в портфель',
            data: portfolioItem
        });
    } catch (error) {
        console.error('Ошибка добавления в портфель:', error);
        res.status(500).json({ success: false, error: 'Ошибка добавления актива' });
    }
});

// Обновить актив в портфеле
app.put('/api/portfolio/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { target_price, stop_loss, notes } = req.body;

        const result = await pool.query(
            `UPDATE portfolio 
             SET target_price = $1, stop_loss = $2, notes = $3 
             WHERE id = $4 AND user_id = $5 
             RETURNING *`,
            [target_price, stop_loss, notes, id, req.user.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Актив не найден' });
        }

        res.json({
            success: true,
            message: 'Актив успешно обновлен',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Ошибка обновления портфеля:', error);
        res.status(500).json({ success: false, error: 'Ошибка обновления актива' });
    }
});

// Удалить актив из портфеля
app.delete('/api/portfolio/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            'DELETE FROM portfolio WHERE id = $1 AND user_id = $2 RETURNING id',
            [id, req.user.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Актив не найден' });
        }

        res.json({ 
            success: true, 
            message: 'Актив успешно удален из портфеля' 
        });
    } catch (error) {
        console.error('Ошибка удаления из портфеля:', error);
        res.status(500).json({ success: false, error: 'Ошибка удаления актива' });
    }
});

// 🔧 РОУТЫ СИГНАЛОВ И ИСТОРИИ

// Получить историю сигналов
app.get('/api/signals/history', authenticateToken, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;

        const result = await pool.query(
            `SELECT * FROM signals_history 
             WHERE user_id = $1 
             ORDER BY timestamp DESC 
             LIMIT $2 OFFSET $3`,
            [req.user.userId, limit, offset]
        );

        const countResult = await pool.query(
            'SELECT COUNT(*) FROM signals_history WHERE user_id = $1',
            [req.user.userId]
        );

        res.json({ 
            success: true, 
            data: result.rows,
            pagination: {
                total: parseInt(countResult.rows[0].count),
                limit,
                offset
            }
        });
    } catch (error) {
        console.error('Ошибка получения истории сигналов:', error);
        res.status(500).json({ success: false, error: 'Ошибка получения истории' });
    }
});

// Сохранить сигнал в историю
app.post('/api/signals/history', authenticateToken, async (req, res) => {
    try {
        const { symbol, name, action, entry_price, target_price, stop_loss, confidence, result, actual_profit } = req.body;
        
        const queryResult = await pool.query(
            `INSERT INTO signals_history 
             (user_id, symbol, name, action, entry_price, target_price, stop_loss, confidence, result, actual_profit) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
             RETURNING *`,
            [req.user.userId, symbol, name, action, entry_price, target_price, stop_loss, confidence, result, actual_profit]
        );

        res.json({
            success: true,
            message: 'Сигнал успешно сохранен в историю',
            data: queryResult.rows[0]
        });
    } catch (error) {
        console.error('Ошибка сохранения сигнала:', error);
        res.status(500).json({ success: false, error: 'Ошибка сохранения сигнала' });
    }
});

// 🔧 РЕАЛЬНЫЕ ДАННЫЕ BINANCE API

async function fetchRealTimeData(symbol) {
    try {
        const url = `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`;
        const data = await fetchWithCache(url, `realtime_${symbol}`);
        
        if (data) {
            return {
                symbol: data.symbol,
                price: parseFloat(data.lastPrice),
                change24h: parseFloat(data.priceChangePercent),
                volume: parseFloat(data.volume),
                high: parseFloat(data.highPrice),
                low: parseFloat(data.lowPrice),
                timestamp: Date.now(),
                isReal: true
            };
        }
    } catch (error) {
        console.error(`Ошибка реальных данных для ${symbol}:`, error.message);
    }
    
    // 🔧 РЕЗЕРВНЫЕ ДЕМО-ДАННЫЕ
    return generateDemoTickerData(symbol);
}

// 🔧 ОСНОВНЫЕ API ЭНДПОИНТЫ

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/api/status', async (req, res) => {
    try {
        const dbResult = await pool.query('SELECT NOW() as time');
        const dbTime = dbResult.rows[0].time;

        res.json({
            success: true,
            message: 'CryptoSignal API работает с реальными данными ✅',
            version: '2.0.0',
            features: ['real-time', 'authentication', 'postgresql', 'websocket'],
            timestamp: new Date().toISOString(),
            database: {
                connected: true,
                time: dbTime
            },
            uptime: process.uptime(),
            clients: clients.size,
            cache_size: cache.size
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Ошибка подключения к базе данных',
            message: error.message
        });
    }
});

// Получить реальные данные по символу
app.get('/api/realtime/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        const data = await fetchRealTimeData(symbol);
        
        res.json({
            success: true,
            data: data,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Ошибка real-time данных:', error);
        const demoData = generateDemoTickerData(req.params.symbol);
        res.json({ success: true, data: demoData, isDemo: true });
    }
});

// Получить исторические данные
app.get('/api/history/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        let { interval = '1h', limit = '100' } = req.query;
        limit = Math.min(parseInt(limit), 500);
        
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
            
            res.json({
                success: true,
                data: formattedData,
                symbol,
                interval,
                count: formattedData.length,
                timestamp: new Date().toISOString()
            });
        } else {
            const demoHistory = generateDemoHistory(symbol, limit);
            res.json({ success: true, data: demoHistory, isDemo: true });
        }
    } catch (error) {
        console.error('Ошибка исторических данных:', error);
        const demoHistory = generateDemoHistory(req.params.symbol, 100);
        res.json({ success: true, data: demoHistory, isDemo: true });
    }
});

// Получить данные для нескольких символов сразу
app.get('/api/multi-ticker', async (req, res) => {
    try {
        const symbols = req.query.symbols ? req.query.symbols.split(',') : ['BTCUSDT', 'ETHUSDT'];
        const data = [];

        for (const symbol of symbols) {
            const tickerData = await fetchRealTimeData(symbol);
            if (tickerData) {
                data.push(tickerData);
            }
        }

        res.json({
            success: true,
            data: data,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Ошибка multi-ticker:', error);
        res.status(500).json({ success: false, error: 'Ошибка получения данных' });
    }
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
        price: currentPrice,
        change24h: change,
        volume: Math.random() * 1000000 + 100000,
        high: currentPrice * 1.03,
        low: currentPrice * 0.97,
        timestamp: Date.now(),
        isDemo: true
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

// 🔧 WebSocket UPGRADE
const server = app.listen(PORT, '0.0.0.0', async () => {
    try {
        await initializeDatabase();
        console.log(`🚀 CryptoSignal Server запущен!`);
        console.log(`📡 Порт: ${PORT}`);
        console.log(`🌐 Режим: ${process.env.NODE_ENV || 'production'}`);
        console.log(`🗄️ База: PostgreSQL (Render)`);
        console.log(`🔗 WebSocket: ws://localhost:${PORT}`);
        console.log(`🕒 Время: ${new Date().toISOString()}`);
    } catch (error) {
        console.error('❌ Ошибка запуска сервера:', error);
        process.exit(1);
    }
});

server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
    });
});

// 🔧 ОЧИСТКА КЭША И УПРАВЛЕНИЕ ПАМЯТЬЮ
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
}, 60000);

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('🛑 Получен SIGTERM, завершаем работу...');
    server.close(() => {
        console.log('✅ HTTP сервер остановлен');
    });
    
    wss.close(() => {
        console.log('✅ WebSocket сервер остановлен');
    });
    
    await pool.end();
    console.log('✅ PostgreSQL пул соединений закрыт');
    process.exit(0);
});