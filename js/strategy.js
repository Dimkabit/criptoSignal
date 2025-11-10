// //strategy.js


const axios = require('axios');

// === Расширенные настройки ===
const BASE_URL = process.env.API_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:3000';
const START_BALANCE = 1000;
const TRANSACTION_FEE = 0.001; // 0.1% комиссия

// === Конфигурация стратегий ===
const STRATEGIES_CONFIG = {
    RSI_EMA: {
        name: "RSI + EMA Тренд",
        symbols: ['BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'DOTUSDT', 'SOLUSDT'],
        intervals: ['1h', '4h'],
        parameters: {
            rsiOversold: 30,
            rsiOverbought: 70,
            emaPeriod: 50,
            rsiPeriod: 14
        }
    },
    SCALPING: {
        name: "Скальпинг 5M",
        symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'],
        intervals: ['5m', '15m'],
        parameters: {
            targetProfit: 1.5,
            maxLoss: 0.8,
            rsiPeriod: 9,
            volumeSpike: 2.0
        }
    },
    BREAKOUT: {
        name: "Прорыв Уровней",
        symbols: ['BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'MATICUSDT'],
        intervals: ['1h', '4h'],
        parameters: {
            lookbackPeriod: 20,
            volumeThreshold: 1.5,
            minBreakoutPercent: 1.0
        }
    },
    MEAN_REVERSION: {
        name: "Возврат к Среднему",
        symbols: ['BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'DOTUSDT'],
        intervals: ['4h', '1d'],
        parameters: {
            bollingerPeriod: 20,
            stdDev: 2,
            rsiThreshold: 35
        }
    }
};

// === Расширенные технические индикаторы ===
class TechnicalIndicators {
    static calculateEMA(prices, period) {
        const k = 2 / (period + 1);
        let ema = [prices[0]];
        for (let i = 1; i < prices.length; i++) {
            ema.push(prices[i] * k + ema[i - 1] * (1 - k));
        }
        return ema;
    }

    static calculateSMA(prices, period) {
        const sma = [];
        for (let i = period - 1; i < prices.length; i++) {
            const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
            sma.push(sum / period);
        }
        return sma;
    }

    static calculateRSI(prices, period = 14) {
        if (prices.length < period + 1) return Array(prices.length).fill(50);
        
        let gains = 0, losses = 0;
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

    static calculateMACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
        const emaFast = this.calculateEMA(prices, fastPeriod);
        const emaSlow = this.calculateEMA(prices, slowPeriod);
        
        const macdLine = emaFast.map((fast, i) => fast - emaSlow[i]);
        const signalLine = this.calculateEMA(macdLine.slice(slowPeriod - 1), signalPeriod);
        const histogram = macdLine.slice(slowPeriod + signalPeriod - 2).map((macd, i) => 
            macd - signalLine[i]
        );
        
        return { macdLine, signalLine, histogram };
    }

    static calculateBollingerBands(prices, period = 20, stdDev = 2) {
        const sma = this.calculateSMA(prices, period);
        const bands = [];
        
        for (let i = period - 1; i < prices.length; i++) {
            const periodPrices = prices.slice(i - period + 1, i + 1);
            const mean = sma[i - period + 1];
            const variance = periodPrices.reduce((sum, price) => 
                sum + Math.pow(price - mean, 2), 0) / period;
            const standardDeviation = Math.sqrt(variance);
            
            bands.push({
                upper: mean + (standardDeviation * stdDev),
                middle: mean,
                lower: mean - (standardDeviation * stdDev)
            });
        }
        return bands;
    }

    static calculateStochastic(highs, lows, closes, period = 14) {
        const stochastic = [];
        for (let i = period - 1; i < closes.length; i++) {
            const periodHigh = Math.max(...highs.slice(i - period + 1, i + 1));
            const periodLow = Math.min(...lows.slice(i - period + 1, i + 1));
            const currentClose = closes[i];
            
            const k = ((currentClose - periodLow) / (periodHigh - periodLow)) * 100;
            stochastic.push(k);
        }
        return stochastic;
    }
}

// === Торговые стратегии ===
class TradingStrategies {
    static rsiEmaStrategy(data, params) {
        const closes = data.map(d => d.close);
        const ema = TechnicalIndicators.calculateEMA(closes, params.emaPeriod);
        const rsi = TechnicalIndicators.calculateRSI(closes, params.rsiPeriod);
        
        const signals = [];
        const minDataPoints = Math.max(params.emaPeriod, params.rsiPeriod);
        
        for (let i = minDataPoints; i < closes.length; i++) {
            const currentPrice = closes[i];
            const currentEma = ema[i];
            const currentRsi = rsi[i];
            
            // BUY сигнал: RSI перепродан и цена выше EMA
            if (currentRsi < params.rsiOversold && currentPrice > currentEma) {
                signals.push({
                    index: i,
                    type: 'BUY',
                    price: currentPrice,
                    confidence: Math.max(70, 100 - currentRsi),
                    reason: `RSI перепродан (${currentRsi.toFixed(1)}) + цена выше EMA`,
                    stopLoss: currentPrice * 0.98,
                    takeProfit: currentPrice * 1.05
                });
            }
            
            // SELL сигнал: RSI перекуплен и цена ниже EMA
            if (currentRsi > params.rsiOverbought && currentPrice < currentEma) {
                signals.push({
                    index: i,
                    type: 'SELL',
                    price: currentPrice,
                    confidence: Math.max(65, currentRsi - 30),
                    reason: `RSI перекуплен (${currentRsi.toFixed(1)}) + цена ниже EMA`,
                    stopLoss: currentPrice * 1.02,
                    takeProfit: currentPrice * 0.95
                });
            }
        }
        
        return signals;
    }

    static scalpingStrategy(data, params) {
        const closes = data.map(d => d.close);
        const volumes = data.map(d => d.volume);
        const rsi = TechnicalIndicators.calculateRSI(closes, params.rsiPeriod);
        
        const signals = [];
        const volumeAvg = volumes.slice(-20).reduce((a, b) => a + b) / 20;
        
        for (let i = 20; i < closes.length; i++) {
            const currentVolume = volumes[i];
            const currentRsi = rsi[i];
            const volumeSpike = currentVolume > volumeAvg * params.volumeSpike;
            
            if (volumeSpike) {
                if (currentRsi < 25) {
                    signals.push({
                        index: i,
                        type: 'BUY',
                        price: closes[i],
                        confidence: 75,
                        reason: `Сильный объем + RSI глубоко перепродан (${currentRsi.toFixed(1)})`,
                        stopLoss: closes[i] * (1 - params.maxLoss / 100),
                        takeProfit: closes[i] * (1 + params.targetProfit / 100),
                        timeframe: '5-15min'
                    });
                } else if (currentRsi > 75) {
                    signals.push({
                        index: i,
                        type: 'SELL',
                        price: closes[i],
                        confidence: 70,
                        reason: `Сильный объем + RSI глубоко перекуплен (${currentRsi.toFixed(1)})`,
                        stopLoss: closes[i] * (1 + params.maxLoss / 100),
                        takeProfit: closes[i] * (1 - params.targetProfit / 100),
                        timeframe: '5-15min'
                    });
                }
            }
        }
        
        return signals;
    }

    static breakoutStrategy(data, params) {
        const highs = data.map(d => d.high);
        const lows = data.map(d => d.low);
        const closes = data.map(d => d.close);
        const volumes = data.map(d => d.volume);
        
        const signals = [];
        
        for (let i = params.lookbackPeriod; i < closes.length; i++) {
            const periodHighs = highs.slice(i - params.lookbackPeriod, i);
            const periodLows = lows.slice(i - params.lookbackPeriod, i);
            const periodVolumes = volumes.slice(i - params.lookbackPeriod, i);
            
            const resistance = Math.max(...periodHighs);
            const support = Math.min(...periodLows);
            const avgVolume = periodVolumes.reduce((a, b) => a + b) / params.lookbackPeriod;
            const currentVolume = volumes[i];
            
            const currentClose = closes[i];
            const resistanceBreak = currentClose > resistance * (1 + params.minBreakoutPercent / 100);
            const supportBreak = currentClose < support * (1 - params.minBreakoutPercent / 100);
            const volumeSpike = currentVolume > avgVolume * params.volumeThreshold;
            
            if (resistanceBreak && volumeSpike) {
                signals.push({
                    index: i,
                    type: 'BUY',
                    price: currentClose,
                    confidence: 80,
                    reason: `Прорыв сопротивления $${resistance.toFixed(2)} с объемом`,
                    stopLoss: resistance * 0.99,
                    takeProfit: currentClose * 1.08,
                    resistance: resistance,
                    volumeRatio: (currentVolume / avgVolume).toFixed(1)
                });
            }
            
            if (supportBreak && volumeSpike) {
                signals.push({
                    index: i,
                    type: 'SELL',
                    price: currentClose,
                    confidence: 75,
                    reason: `Прорыв поддержки $${support.toFixed(2)} с объемом`,
                    stopLoss: support * 1.01,
                    takeProfit: currentClose * 0.92,
                    support: support,
                    volumeRatio: (currentVolume / avgVolume).toFixed(1)
                });
            }
        }
        
        return signals;
    }

    static meanReversionStrategy(data, params) {
        const closes = data.map(d => d.close);
        const bollingerBands = TechnicalIndicators.calculateBollingerBands(closes, params.bollingerPeriod, params.stdDev);
        const rsi = TechnicalIndicators.calculateRSI(closes, 14);
        
        const signals = [];
        const minDataPoints = params.bollingerPeriod + 14;
        
        for (let i = minDataPoints; i < closes.length; i++) {
            const currentPrice = closes[i];
            const bandIndex = i - params.bollingerPeriod;
            if (bandIndex < 0) continue;
            
            const bands = bollingerBands[bandIndex];
            const currentRsi = rsi[i];
            
            // BUY: цена ниже нижней полосы Боллинджера и RSI не перепродан
            if (currentPrice < bands.lower && currentRsi > params.rsiThreshold) {
                signals.push({
                    index: i,
                    type: 'BUY',
                    price: currentPrice,
                    confidence: 70,
                    reason: `Цена ниже Bollinger Lower Band + RSI ${currentRsi.toFixed(1)}`,
                    stopLoss: bands.lower * 0.98,
                    takeProfit: bands.middle,
                    deviation: ((currentPrice - bands.lower) / bands.lower * 100).toFixed(2)
                });
            }
            
            // SELL: цена выше верхней полосы Боллинджера
            if (currentPrice > bands.upper) {
                signals.push({
                    index: i,
                    type: 'SELL',
                    price: currentPrice,
                    confidence: 65,
                    reason: `Цена выше Bollinger Upper Band`,
                    stopLoss: bands.upper * 1.02,
                    takeProfit: bands.middle,
                    deviation: ((currentPrice - bands.upper) / bands.upper * 100).toFixed(2)
                });
            }
        }
        
        return signals;
    }
}

// === Система бэктестинга ===
class BacktestEngine {
    constructor(initialBalance = START_BALANCE) {
        this.initialBalance = initialBalance;
        this.results = {};
    }

    runBacktest(strategyName, symbol, data, signals) {
        let balance = this.initialBalance;
        let position = 0;
        let entryPrice = 0;
        let trades = [];
        let maxDrawdown = 0;
        let peakBalance = this.initialBalance;

        for (const signal of signals) {
            const price = data[signal.index].close;

            if (signal.type === 'BUY' && position === 0 && balance > 0) {
                // Покупаем 90% баланса для диверсификации
                const investment = balance * 0.9;
                position = investment / price;
                entryPrice = price;
                balance -= investment;
                
                trades.push({
                    type: 'BUY',
                    price,
                    timestamp: data[signal.index].timestamp,
                    amount: position,
                    investment
                });
            }

            if (signal.type === 'SELL' && position > 0) {
                const revenue = position * price * (1 - TRANSACTION_FEE);
                const profit = revenue - (position * entryPrice);
                const profitPercent = (profit / (position * entryPrice)) * 100;
                
                balance += revenue;
                position = 0;
                
                trades.push({
                    type: 'SELL',
                    price,
                    timestamp: data[signal.index].timestamp,
                    profit,
                    profitPercent,
                    revenue
                });

                // Обновляем максимальную просадку
                if (balance > peakBalance) {
                    peakBalance = balance;
                }
                const drawdown = ((peakBalance - balance) / peakBalance) * 100;
                maxDrawdown = Math.max(maxDrawdown, drawdown);
            }
        }

        // Финализация позиции
        if (position > 0) {
            const finalPrice = data[data.length - 1].close;
            balance += position * finalPrice * (1 - TRANSACTION_FEE);
        }

        const totalReturn = ((balance - this.initialBalance) / this.initialBalance) * 100;
        const winRate = this.calculateWinRate(trades);
        const sharpeRatio = this.calculateSharpeRatio(trades);

        return {
            strategy: strategyName,
            symbol,
            initialBalance: this.initialBalance,
            finalBalance: balance,
            totalReturn: totalReturn.toFixed(2),
            totalTrades: trades.filter(t => t.type === 'SELL').length,
            winRate: winRate.toFixed(1),
            maxDrawdown: maxDrawdown.toFixed(2),
            sharpeRatio: sharpeRatio.toFixed(2),
            trades: trades
        };
    }

    calculateWinRate(trades) {
        const sellTrades = trades.filter(t => t.type === 'SELL');
        if (sellTrades.length === 0) return 0;
        const winningTrades = sellTrades.filter(t => t.profit > 0).length;
        return (winningTrades / sellTrades.length) * 100;
    }

    calculateSharpeRatio(trades) {
        const returns = trades
            .filter(t => t.type === 'SELL')
            .map(t => t.profitPercent);
        
        if (returns.length === 0) return 0;
        
        const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
        const variance = returns.reduce((a, b) => a + Math.pow(b - avgReturn, 2), 0) / returns.length;
        const stdDev = Math.sqrt(variance);
        
        return stdDev === 0 ? 0 : avgReturn / stdDev;
    }
}

// Молниеносные скальпинг стратегии
const SCALPING_STRATEGIES = {
    QUICK_SCALP: {
        name: "Быстрый скальпинг",
        symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'AVAXUSDT'],
        intervals: ['1m', '5m'],
        parameters: {
            targetProfit: 0.8,
            maxLoss: 0.3,
            timeInTrade: 2, // минуты
            volumeThreshold: 1.8
        }
    },
    
    VOLATILITY_BREAKOUT: {
        name: "Волатильность пробой",
        symbols: ['BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'MATICUSDT'],
        intervals: ['5m', '15m'],
        parameters: {
            volatilityThreshold: 3.0,
            minVolume: 2.0,
            quickExit: 1.5
        }
    },
    
    LIQUIDITY_GRAB: {
        name: "Забор ликвидности",
        symbols: ['BTCUSDT', 'ETHUSDT'],
        intervals: ['1m', '3m'],
        parameters: {
            liquidityZones: true,
            reactionSpeed: 0.5, // секунды
            microProfit: 0.5
        }
    }
};

// Долгосрочные стратегии
const SWING_STRATEGIES = {
    TREND_FOLLOWING: {
        name: "Следование тренду",
        symbols: ['BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'DOTUSDT'],
        intervals: ['4h', '1d'],
        parameters: {
            trendConfirmation: 3, // свечи
            pullbackEntry: true,
            riskReward: 2.5
        }
    },
    
    SEASONAL_PATTERNS: {
        name: "Сезонные паттерны",
        symbols: ['BTCUSDT', 'ETHUSDT'],
        intervals: ['1d', '1w'],
        parameters: {
            weekendEffect: true,
            monthEnd: true,
            quarterPatterns: true
        }
    }
};

// Арбитражные стратегии
const ARBITRAGE_STRATEGIES = {
    TRIANGULAR_ARB: {
        name: "Треугольный арбитраж",
        symbols: ['BTC/USDT', 'ETH/BTC', 'ETH/USDT'],
        parameters: {
            minSpread: 0.8,
            executionSpeed: 1.0
        }
    },
    
    FUNDING_RATE_ARB: {
        name: "Арбитраж funding rate",
        symbols: ['BTCUSDT', 'BTCUSD_PERP'],
        parameters: {
            minRate: 0.03,
            hedgeRatio: 1.0
        }
    }
};

// === Основная функция бэктестинга ===
async function runComprehensiveBacktest() {
    console.log('\n🎯 ЗАПУСК КОМПЛЕКСНОГО БЭКТЕСТА СТРАТЕГИЙ\n');
    
    const backtestEngine = new BacktestEngine();
    const allResults = [];

    // Тестируем все стратегии на всех символах
    for (const [strategyKey, strategyConfig] of Object.entries(STRATEGIES_CONFIG)) {
        console.log(`\n📊 Тестируем стратегию: ${strategyConfig.name}`);
        console.log('='.repeat(50));
        
        for (const symbol of strategyConfig.symbols) {
            try {
                console.log(`\n🔍 Анализируем ${symbol}...`);
                
                // Получаем данные для самого длинного интервала
                const interval = strategyConfig.intervals[0];
                const limit = 200; // Больше данных для точности
                
                const resp = await axios.get(
                    `${BASE_URL}/api/history/${symbol}?interval=${interval}&limit=${limit}`
                );
                
                if (!resp.data.success || !Array.isArray(resp.data.data)) {
                    console.log(`❌ Нет данных для ${symbol}`);
                    continue;
                }

                const data = resp.data.data;
                
                // Генерируем сигналы в зависимости от стратегии
                let signals = [];
                switch(strategyKey) {
                    case 'RSI_EMA':
                        signals = TradingStrategies.rsiEmaStrategy(data, strategyConfig.parameters);
                        break;
                    case 'SCALPING':
                        signals = TradingStrategies.scalpingStrategy(data, strategyConfig.parameters);
                        break;
                    case 'BREAKOUT':
                        signals = TradingStrategies.breakoutStrategy(data, strategyConfig.parameters);
                        break;
                    case 'MEAN_REVERSION':
                        signals = TradingStrategies.meanReversionStrategy(data, strategyConfig.parameters);
                        break;
                }

                if (signals.length === 0) {
                    console.log(`⚠️ Нет сигналов для ${symbol}`);
                    continue;
                }

                // Запускаем бэктест
                const result = backtestEngine.runBacktest(
                    strategyConfig.name,
                    symbol,
                    data,
                    signals
                );

                allResults.push(result);

                // Выводим результаты
                console.log(`✅ ${symbol}: ${result.totalReturn}% за ${result.totalTrades} сделок`);
                console.log(`   Win Rate: ${result.winRate}% | Max Drawdown: ${result.maxDrawdown}%`);

            } catch (error) {
                console.error(`❌ Ошибка для ${symbol}:`, error.message);
            }
        }
    }

    // Анализ и сравнение результатов
    await analyzeAndCompareResults(allResults);
    
    return allResults;
}

// === Анализ и сравнение результатов ===
async function analyzeAndCompareResults(results) {
    console.log('\n🏆 СРАВНЕНИЕ РЕЗУЛЬТАТОВ СТРАТЕГИЙ');
    console.log('='.repeat(60));

    // Группируем по стратегиям
    const byStrategy = {};
    results.forEach(result => {
        if (!byStrategy[result.strategy]) {
            byStrategy[result.strategy] = [];
        }
        byStrategy[result.strategy].push(result);
    });

    // Анализируем каждую стратегию
    for (const [strategy, strategyResults] of Object.entries(byStrategy)) {
        const avgReturn = strategyResults.reduce((sum, r) => sum + parseFloat(r.totalReturn), 0) / strategyResults.length;
        const avgWinRate = strategyResults.reduce((sum, r) => sum + parseFloat(r.winRate), 0) / strategyResults.length;
        const totalTrades = strategyResults.reduce((sum, r) => sum + r.totalTrades, 0);
        
        console.log(`\n📈 ${strategy}:`);
        console.log(`   Средняя доходность: ${avgReturn.toFixed(2)}%`);
        console.log(`   Средний Win Rate: ${avgWinRate.toFixed(1)}%`);
        console.log(`   Всего сделок: ${totalTrades}`);
        console.log(`   Протестировано пар: ${strategyResults.length}`);
        
        // Лучшая пара для стратегии
        const bestPair = strategyResults.reduce((best, current) => 
            parseFloat(current.totalReturn) > parseFloat(best.totalReturn) ? current : best
        );
        console.log(`   Лучшая пара: ${bestPair.symbol} (${bestPair.totalReturn}%)`);
    }

    // Рекомендации
    console.log('\n💡 РЕКОМЕНДАЦИИ:');
    const bestStrategy = Object.entries(byStrategy).reduce((best, [strategy, results]) => {
        const avgReturn = results.reduce((sum, r) => sum + parseFloat(r.totalReturn), 0) / results.length;
        return avgReturn > best.return ? { strategy, return: avgReturn } : best;
    }, { strategy: '', return: -100 });

    console.log(`   Лучшая стратегия: ${bestStrategy.strategy} (${bestStrategy.return.toFixed(2)}%)`);
    
    // Находим наиболее стабильную стратегию
    const stableStrategy = Object.entries(byStrategy).reduce((best, [strategy, results]) => {
        const winRates = results.map(r => parseFloat(r.winRate));
        const avgWinRate = winRates.reduce((a, b) => a + b) / winRates.length;
        const consistency = winRates.filter(wr => wr > 50).length / winRates.length;
        
        const score = avgWinRate * consistency;
        return score > best.score ? { strategy, score } : best;
    }, { strategy: '', score: 0 });

    console.log(`   Самая стабильная: ${stableStrategy.strategy}`);
}

// === Функция оптимизации параметров ===
async function optimizeStrategyParameters(strategyName, symbol, interval = '1h') {
    console.log(`\n⚙️ Оптимизация параметров для ${strategyName} (${symbol})`);
    
    try {
        const resp = await axios.get(
            `${BASE_URL}/api/history/${symbol}?interval=${interval}&limit=300`
        );
        
        if (!resp.data.success) {
            throw new Error('Нет данных для оптимизации');
        }

        const data = resp.data.data;
        const bestParams = { return: -100, params: {} };
        
        // Оптимизация параметров RSI_EMA
        if (strategyName === 'RSI_EMA') {
            for (let rsiOversold = 25; rsiOversold <= 35; rsiOversold += 5) {
                for (let rsiOverbought = 65; rsiOverbought <= 75; rsiOverbought += 5) {
                    for (let emaPeriod = 20; emaPeriod <= 50; emaPeriod += 10) {
                        const params = { rsiOversold, rsiOverbought, emaPeriod, rsiPeriod: 14 };
                        const signals = TradingStrategies.rsiEmaStrategy(data, params);
                        const engine = new BacktestEngine(1000);
                        const result = engine.runBacktest('Optimization', symbol, data, signals);
                        
                        if (parseFloat(result.totalReturn) > bestParams.return) {
                            bestParams.return = parseFloat(result.totalReturn);
                            bestParams.params = params;
                        }
                    }
                }
            }
        }
        
        console.log(`🎯 Лучшие параметры:`, bestParams.params);
        console.log(`📈 Ожидаемая доходность: ${bestParams.return.toFixed(2)}%`);
        
        return bestParams;
        
    } catch (error) {
        console.error('❌ Ошибка оптимизации:', error.message);
        return null;
    }
}

// === Экспорт результатов в файл ===
function exportResultsToFile(results, filename = 'backtest_results.json') {
    const fs = require('fs');
    const exportData = {
        timestamp: new Date().toISOString(),
        initialBalance: START_BALANCE,
        results: results
    };
    
    fs.writeFileSync(filename, JSON.stringify(exportData, null, 2));
    console.log(`\n💾 Результаты сохранены в ${filename}`);
}

// === Основной запуск ===
async function main() {
    const args = process.argv.slice(2);
    const command = args[0];

    switch(command) {
        case 'full-test':
            await runComprehensiveBacktest();
            break;
            
        case 'optimize':
            const symbol = args[1] || 'BTCUSDT';
            await optimizeStrategyParameters('RSI_EMA', symbol);
            break;
            
        case 'single':
            const singleSymbol = args[1] || 'BTCUSDT';
            const singleStrategy = args[2] || 'RSI_EMA';
            await testSingleStrategy(singleStrategy, singleSymbol);
            break;
            
        default:
            console.log(`
Доступные команды:
  npm run strategy full-test    - Полный бэктест всех стратегий
  npm run strategy optimize SYM - Оптимизация параметров для символа
  npm run strategy single SYM STRAT - Тест одной стратегии
            `);
    }
}

// Запуск только если файл вызван напрямую
if (require.main === module) {
    main().catch(console.error);
}

module.exports = {
    runComprehensiveBacktest,
    optimizeStrategyParameters,
    TradingStrategies,
    TechnicalIndicators,
    BacktestEngine,
    STRATEGIES_CONFIG
};