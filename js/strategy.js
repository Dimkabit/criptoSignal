

const axios = require('axios');

// === Настройки ===
const BASE_URL = process.env.API_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:3000';
const SYMBOL = 'BTCUSDT';
const INTERVAL = '1h';
const LIMIT = 100; // УМЕНЬШЕНО ДЛЯ ЭКОНОМИИ ПАМЯТИ
const START_BALANCE = 1000;

// === Вспомогательные функции ===
function calculateEMA(prices, period) {
    const k = 2 / (period + 1);
    let ema = [prices[0]];
    for (let i = 1; i < prices.length; i++) {
        ema.push(prices[i] * k + ema[i - 1] * (1 - k));
    }
    return ema;
}

function calculateRSI(prices, period = 14) {
    let gains = 0, losses = 0;
    
    // Рассчитываем первые изменения
    for (let i = 1; i <= period; i++) {
        const diff = prices[i] - prices[i - 1];
        if (diff >= 0) gains += diff;
        else losses -= diff;
    }
    
    let avgGain = gains / period;
    let avgLoss = losses / period;
    const rsi = Array(period).fill(null);

    for (let i = period; i < prices.length; i++) {
        const diff = prices[i] - prices[i - 1];
        const gain = diff >= 0 ? diff : 0;
        const loss = diff < 0 ? -diff : 0;
        
        avgGain = (avgGain * (period - 1) + gain) / period;
        avgLoss = (avgLoss * (period - 1) + loss) / period;
        
        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        rsi.push(100 - 100 / (1 + rs));
    }
    return rsi;
}

// === Основная функция ===
async function runBacktest() {
    console.log(`\n📊 Тестируем стратегию RSI + EMA для ${SYMBOL} (${INTERVAL})`);

    try {
        const resp = await axios.get(`${BASE_URL}/api/history/${SYMBOL}?interval=${INTERVAL}&limit=${LIMIT}`);
        const data = resp.data.data;
        
        if (!Array.isArray(data) || data.length === 0) {
            throw new Error('Нет данных для анализа.');
        }

        const closes = data.map(d => d.close);
        const ema50 = calculateEMA(closes, 50);
        const rsi14 = calculateRSI(closes, 14);

        let balance = START_BALANCE;
        let position = 0;
        let entryPrice = 0;
        let trades = [];

        for (let i = 50; i < closes.length; i++) {
            const price = closes[i];
            const ema = ema50[i];
            const rsi = rsi14[i];

            // BUY сигнал
            if (rsi < 30 && price > ema && position === 0) {
                position = balance / price;
                entryPrice = price;
                balance = 0;
                trades.push({ type: 'BUY', price, index: i });
            }

            // SELL сигнал
            if (rsi > 70 && price < ema && position > 0) {
                balance = position * price;
                trades.push({
                    type: 'SELL',
                    price,
                    index: i,
                    profit: (price - entryPrice) / entryPrice * 100
                });
                position = 0;
            }
        }

        // Финализация позиции
        if (position > 0) {
            balance = position * closes[closes.length - 1];
        }

        const totalReturn = ((balance - START_BALANCE) / START_BALANCE * 100).toFixed(2);

        console.log(`\n💰 Результат: ${totalReturn}%`);
        console.log(`📈 Итоговый баланс: $${balance.toFixed(2)}`);
        console.log(`🔁 Совершено сделок: ${trades.length}`);
        
        if (trades.length > 0) {
            console.log(`\n📋 Сигналы:`);
            trades.forEach(t => {
                console.log(`${t.type} @ ${t.price.toFixed(2)} ${t.profit ? `(прибыль ${t.profit.toFixed(2)}%)` : ''}`);
            });
        }

    } catch (error) {
        console.error(`❌ Ошибка при выполнении бэктеста: ${error.message}`);
    }
}

// Запуск только если файл вызван напрямую
if (require.main === module) {
    runBacktest().catch(console.error);
}

module.exports = { runBacktest, calculateEMA, calculateRSI };