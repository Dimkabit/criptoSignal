// PortfolioManager - Управление портфелем криптовалют
class PortfolioManager {
    constructor(api) {
        this.api = api;
        this.portfolio = [];
        this.userId = 'user_' + Date.now(); // Простая идентификация пользователя
        this.init();
    }

    async init() {
        await this.loadPortfolio();
        this.setupEventListeners();
        this.startPortfolioUpdates();
    }

    setupEventListeners() {
        // Кнопки управления портфелем
        document.getElementById('addAssetBtn').addEventListener('click', () => {
            this.showAddAssetModal();
        });

        document.getElementById('saveAsset').addEventListener('click', () => {
            this.saveAsset();
        });

        document.getElementById('cancelAddAsset').addEventListener('click', () => {
            this.hideAddAssetModal();
        });

        // Закрытие модального окна по клику вне его
        document.getElementById('addAssetModal').addEventListener('click', (e) => {
            if (e.target.id === 'addAssetModal') {
                this.hideAddAssetModal();
            }
        });

        // Автоматическое вычисление целей при вводе цены покупки
        document.getElementById('assetBuyPrice').addEventListener('input', (e) => {
            this.autoCalculateTargets();
        });
    }

    showAddAssetModal() {
        // Установить текущую дату по умолчанию
        document.getElementById('assetBuyDate').value = new Date().toISOString().split('T')[0];
        document.getElementById('addAssetModal').classList.remove('hidden');
    }

    hideAddAssetModal() {
        document.getElementById('addAssetModal').classList.add('hidden');
        document.getElementById('addAssetForm').reset();
    }

    autoCalculateTargets() {
        const buyPrice = parseFloat(document.getElementById('assetBuyPrice').value);
        if (buyPrice && buyPrice > 0) {
            // Автоматически рассчитать цель +5% и стоп-лосс -2%
            const targetPrice = buyPrice * 1.05;
            const stopLoss = buyPrice * 0.98;
            
            document.getElementById('assetTargetPrice').value = targetPrice.toFixed(4);
            document.getElementById('assetStopLoss').value = stopLoss.toFixed(4);
        }
    }

    async saveAsset() {
        const formData = {
            symbol: document.getElementById('assetSymbol').value,
            amount: parseFloat(document.getElementById('assetAmount').value),
            buy_price: parseFloat(document.getElementById('assetBuyPrice').value),
            target_price: parseFloat(document.getElementById('assetTargetPrice').value) || null,
            stop_loss: parseFloat(document.getElementById('assetStopLoss').value) || null,
            buy_date: document.getElementById('assetBuyDate').value,
            notes: document.getElementById('assetNotes').value
        };

        // Валидация
        if (!formData.symbol || !formData.amount || !formData.buy_price) {
            alert('Пожалуйста, заполните обязательные поля: криптовалюта, количество и цена покупки');
            return;
        }

        try {
            // Получить текущую цену
            const currentData = await this.api.fetchCryptoData(formData.symbol);
            if (!currentData) {
                alert('Не удалось получить текущую цену для этой криптовалюты');
                return;
            }

            // Подготовить данные для сохранения
            const assetData = {
                ...formData,
                id: Date.now().toString(),
                user_id: this.userId,
                name: this.getCryptoName(formData.symbol),
                current_price: currentData.price,
                total_value: currentData.price * formData.amount,
                profit_loss: (currentData.price - formData.buy_price) * formData.amount,
                profit_loss_percent: ((currentData.price - formData.buy_price) / formData.buy_price) * 100,
                created_at: new Date().toISOString()
            };

            // Сохранить в базу данных
            await this.addPortfolioAsset(assetData);
            
            // Обновить отображение
            await this.loadPortfolio();
            
            // Показать уведомление
            this.showNotification(`Актив ${assetData.name} добавлен в портфель`, 'success');
            
            // Закрыть модальное окно
            this.hideAddAssetModal();

        } catch (error) {
            console.error('Ошибка при сохранении актива:', error);
            alert('Ошибка при сохранении актива. Попробуйте еще раз.');
        }
    }

    getCryptoName(symbol) {
        const cryptoMap = {
            'BTCUSDT': 'Bitcoin',
            'ETHUSDT': 'Ethereum', 
            'ADAUSDT': 'Cardano',
            'DOTUSDT': 'Polkadot',
            'MATICUSDT': 'Polygon',
            'SOLUSDT': 'Solana',
            'AVAXUSDT': 'Avalanche',
            'ATOMUSDT': 'Cosmos'
        };
        return cryptoMap[symbol] || symbol.replace('USDT', '');
    }

async addPortfolioAsset(assetData) {
    try {
        const key = `cryptosignal_portfolio_${assetData.user_id}`;
        const raw = localStorage.getItem(key);
        const list = raw ? JSON.parse(raw) : [];
        list.push(assetData);
        localStorage.setItem(key, JSON.stringify(list));
        // Возвращаем сохранённый объект
        return assetData;
    } catch (err) {
        console.error('Ошибка при добавлении актива в localStorage', err);
        throw err;
    }
}

async loadPortfolio() {
    try {
        const key = `cryptosignal_portfolio_${this.userId}`;
        const raw = localStorage.getItem(key);
        const dataList = raw ? JSON.parse(raw) : [];
        // Приводим поля (если нужно) и считаем производные поля
        this.portfolio = dataList.map(asset => {
            // если asset.current_price отсутствует — установим demo/current via API
            asset.current_price = asset.current_price || this.getBasePrice(asset.symbol);
            asset.total_value = asset.current_price * asset.amount;
            asset.profit_loss = (asset.current_price - asset.buy_price) * asset.amount;
            asset.profit_loss_percent = ((asset.current_price - asset.buy_price) / asset.buy_price) * 100;
            return asset;
        });
        this.renderPortfolio();
        this.updatePortfolioStats();
    } catch (error) {
        console.error('Ошибка при загрузке портфеля из localStorage:', error);
        this.portfolio = [];
        this.renderPortfolio();
    }
}

    renderPortfolio() {
        const container = document.getElementById('portfolioContainer');
        const emptyMessage = document.getElementById('emptyPortfolio');
        
        if (this.portfolio.length === 0) {
            container.innerHTML = '';
            emptyMessage.style.display = 'block';
            return;
        }
        
        emptyMessage.style.display = 'none';
        
        const portfolioHTML = this.portfolio.map(asset => this.createAssetCard(asset)).join('');
        container.innerHTML = portfolioHTML;
        
        // Добавить обработчики событий для кнопок удаления
        this.portfolio.forEach(asset => {
            const deleteBtn = document.getElementById(`delete-${asset.id}`);
            if (deleteBtn) {
                deleteBtn.addEventListener('click', () => this.deleteAsset(asset.id));
            }
        });
    }

    createAssetCard(asset) {
        const profitColor = asset.profit_loss >= 0 ? 'text-green-400' : 'text-red-400';
        const profitIcon = asset.profit_loss >= 0 ? 'fa-arrow-up' : 'fa-arrow-down';
        const profitBg = asset.profit_loss >= 0 ? 'bg-green-500/20' : 'bg-red-500/20';
        
        const daysHeld = Math.floor((Date.now() - new Date(asset.buy_date).getTime()) / (1000 * 60 * 60 * 24));
        
        return `
            <div class="glass rounded-xl p-6 hover-lift">
                <div class="flex justify-between items-start mb-4">
                    <div class="flex items-center">
                        <div class="w-12 h-12 ${profitBg} rounded-full flex items-center justify-center mr-4">
                            <i class="fas ${profitIcon} ${profitColor} text-xl"></i>
                        </div>
                        <div>
                            <h3 class="text-lg font-bold">${asset.name}</h3>
                            <p class="text-sm text-gray-400">${asset.symbol.replace('USDT', '')}</p>
                        </div>
                    </div>
                    <button id="delete-${asset.id}" class="text-gray-400 hover:text-red-400 transition-colors">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
                
                <div class="grid grid-cols-2 gap-4 mb-4">
                    <div class="text-center">
                        <p class="text-sm text-gray-400">Количество</p>
                        <p class="font-semibold">${asset.amount}</p>
                    </div>
                    <div class="text-center">
                        <p class="text-sm text-gray-400">Текущая цена</p>
                        <p class="font-semibold">$${asset.current_price.toFixed(4)}</p>
                    </div>
                    <div class="text-center">
                        <p class="text-sm text-gray-400">Цена покупки</p>
                        <p class="font-semibold">$${asset.buy_price.toFixed(4)}</p>
                    </div>
                    <div class="text-center">
                        <p class="text-sm text-gray-400">Общая стоимость</p>
                        <p class="font-semibold">$${asset.total_value.toFixed(2)}</p>
                    </div>
                </div>
                
                <div class="bg-gray-800 rounded-lg p-4 mb-4">
                    <div class="flex justify-between items-center mb-2">
                        <span class="text-sm text-gray-400">Прибыль/убыток</span>
                        <span class="font-bold ${profitColor}">$${asset.profit_loss.toFixed(2)} (${asset.profit_loss_percent.toFixed(2)}%)</span>
                    </div>
                    <div class="flex justify-between items-center text-sm text-gray-400">
                        <span>Дней в портфеле: ${daysHeld}</span>
                        <span>Дата: ${new Date(asset.buy_date).toLocaleDateString()}</span>
                    </div>
                </div>
                
                ${asset.notes ? `<div class="bg-gray-800 rounded-lg p-3 mb-4">
                    <p class="text-sm text-gray-400 mb-1">Заметки:</p>
                    <p class="text-sm">${asset.notes}</p>
                </div>` : ''}
                
                <div class="grid grid-cols-2 gap-3">
                    ${asset.target_price ? `<div class="bg-green-500/20 rounded-lg p-3 text-center">
                        <p class="text-xs text-green-400 mb-1">Цель</p>
                        <p class="font-semibold">$${asset.target_price.toFixed(4)}</p>
                    </div>` : ''}
                    ${asset.stop_loss ? `<div class="bg-red-500/20 rounded-lg p-3 text-center">
                        <p class="text-xs text-red-400 mb-1">Стоп-лосс</p>
                        <p class="font-semibold">$${asset.stop_loss.toFixed(4)}</p>
                    </div>` : ''}
                </div>
            </div>
        `;
    }

    updatePortfolioStats() {
        const totalValue = this.portfolio.reduce((sum, asset) => sum + asset.total_value, 0);
        const totalProfit = this.portfolio.reduce((sum, asset) => sum + asset.profit_loss, 0);
        const totalROI = totalValue > 0 ? (totalProfit / (totalValue - totalProfit)) * 100 : 0;

        document.getElementById('portfolioValue').textContent = `$${totalValue.toFixed(2)}`;
        document.getElementById('portfolioProfit').textContent = `$${totalProfit.toFixed(2)}`;
        document.getElementById('portfolioROI').textContent = `${totalROI.toFixed(2)}%`;

        // Изменить цвет прибыли/убытка
        const profitElement = document.getElementById('portfolioProfit');
        const roiElement = document.getElementById('portfolioROI');
        
        if (totalProfit >= 0) {
            profitElement.className = 'text-3xl font-bold text-green-400';
            roiElement.className = 'text-3xl font-bold text-green-400';
        } else {
            profitElement.className = 'text-3xl font-bold text-red-400';
            roiElement.className = 'text-3xl font-bold text-red-400';
        }
    }

async deleteAsset(assetId) {
    if (!confirm('Вы уверены, что хотите удалить этот актив из портфеля?')) return;

    try {
        const key = `cryptosignal_portfolio_${this.userId}`;
        const raw = localStorage.getItem(key);
        const list = raw ? JSON.parse(raw) : [];
        const updated = list.filter(a => a.id !== assetId);
        localStorage.setItem(key, JSON.stringify(updated));

        this.portfolio = this.portfolio.filter(asset => asset.id !== assetId);
        this.renderPortfolio();
        this.updatePortfolioStats();
        this.showNotification('Актив удален из портфеля', 'success');
    } catch (error) {
        console.error('Ошибка при удалении актива:', error);
        alert('Ошибка при удалении актива');
    }
}


    startPortfolioUpdates() {
        // Обновлять портфель каждые 30 секунд
        setInterval(async () => {
            if (this.portfolio.length > 0) {
                await this.updatePortfolioPrices();
            }
        }, 30000);
    }

    async updatePortfolioPrices() {
        try {
            let hasChanges = false;

            for (let asset of this.portfolio) {
                const currentData = await this.api.fetchCryptoData(asset.symbol);
                if (currentData && currentData.price !== asset.current_price) {
                    asset.current_price = currentData.price;
                    asset.total_value = currentData.price * asset.amount;
                    asset.profit_loss = (currentData.price - asset.buy_price) * asset.amount;
                    asset.profit_loss_percent = ((currentData.price - asset.buy_price) / asset.buy_price) * 100;
                    hasChanges = true;

                    // Проверить сигналы на основе портфеля
                    this.checkPortfolioSignals(asset);
                }
            }

            if (hasChanges) {
                this.renderPortfolio();
                this.updatePortfolioStats();
            }

        } catch (error) {
            console.error('Ошибка при обновлении цен портфеля:', error);
        }
    }

    checkPortfolioSignals(asset) {
        // Проверить достижение цели продажи
        if (asset.target_price && asset.current_price >= asset.target_price) {
            this.showNotification(`🎯 Цель достигнута! ${asset.name} достиг цели продажи $${asset.target_price.toFixed(4)}`, 'success');
            this.sendPushNotification('Цель достигнута', `${asset.name} достиг заявленной цели продажи. Рассмотрите фиксацию прибыли!`);
        }

        // Проверить стоп-лосс
        if (asset.stop_loss && asset.current_price <= asset.stop_loss) {
            this.showNotification(`⚠️ Стоп-лосс сработал! ${asset.name} упал до $${asset.stop_loss.toFixed(4)}`, 'warning');
            this.sendPushNotification('Стоп-лосс сработал', `${asset.name} достиг уровня стоп-лосса. Рассмотрите продажу!`);
        }

        // Проверить критические изменения (более ±10% за сессию)
        const dailyChange = Math.abs(asset.profit_loss_percent);
        if (dailyChange > 10) {
            const direction = asset.profit_loss_percent > 0 ? 'выросла' : 'упала';
            this.showNotification(`📈 ${asset.name} ${direction} на ${dailyChange.toFixed(1)}% за сессию!`, 
                                asset.profit_loss_percent > 0 ? 'success' : 'warning');
        }
    }

    // Методы для работы с сигналами на основе портфеля
    getPortfolioBasedSignals() {
        const signals = [];
        
        this.portfolio.forEach(asset => {
            // Сигнал на продажу если достигли цели
            if (asset.target_price && asset.current_price >= asset.target_price * 0.95) {
                signals.push({
                    id: Date.now() + Math.random() + 1000, // Уникальный ID для портфельных сигналов
                    type: 'SELL',
                    action: 'SELL',
                    asset: asset,
                    name: asset.name,
                    reason: 'Достигнута цель продажи',
                    urgency: 'high',
                    timestamp: Date.now()
                });
            }

            // Сигнал на продажу если стоп-лосс близок
            if (asset.stop_loss && asset.current_price <= asset.stop_loss * 1.05) {
                signals.push({
                    id: Date.now() + Math.random() + 2000,
                    type: 'SELL', 
                    action: 'SELL',
                    asset: asset,
                    name: asset.name,
                    reason: 'Близок стоп-лосс',
                    urgency: 'high',
                    timestamp: Date.now()
                });
            }

            // Сигнал на покупку если цена упала на 5% от покупки (усреднение)
            if (asset.current_price <= asset.buy_price * 0.95 && asset.profit_loss_percent < -5) {
                signals.push({
                    id: Date.now() + Math.random() + 3000,
                    type: 'BUY',
                    action: 'BUY',
                    asset: asset,
                    name: asset.name,
                    reason: 'Цена упала на 5% - возможность усреднения',
                    urgency: 'medium',
                    timestamp: Date.now()
                });
            }
        });

        return signals;
    }

    showNotification(message, type = 'info') {
        if (window.cryptoSignal) {
            window.cryptoSignal.showNotification(message, type);
        } else {
            // Простой alert если cryptoSignal еще не инициализирован
            alert(message);
        }
    }

    sendPushNotification(title, body) {
        if (window.cryptoSignal) {
            window.cryptoSignal.sendPushNotification(title, body);
        }
    }
}

// CryptoSignal - Торговые сигналы для криптовалют с минимальным риском
class CryptoSignal {
    constructor() {
        this.signals = [];
        this.activeSignals = [];
        this.chart = null;
        this.isAutoMode = false;
        this.refreshInterval = null;
        this.marketData = new Map();
        this.signalsHistory = [];
        this.accuracyRate = 78;
        this.avgProfit = 12;
        
        // Настройки риска
        this.settings = {
            maxRisk: 2, // $2 максимальный риск
            minProfit: 5, // 5% минимальный профит
            cryptoType: 'all', // тип криптовалют
            updateInterval: 30000 // 30 секунд
        };

        // Популярные криптовалюты с минимальными ставками
        this.cryptoPairs = [
            { symbol: 'BTCUSDT', name: 'Bitcoin', minAmount: 1, volatility: 'medium' },
            { symbol: 'ETHUSDT', name: 'Ethereum', minAmount: 0.1, volatility: 'medium' },
            { symbol: 'ADAUSDT', name: 'Cardano', minAmount: 10, volatility: 'low' },
            { symbol: 'DOTUSDT', name: 'Polkadot', minAmount: 0.5, volatility: 'medium' },
            { symbol: 'MATICUSDT', name: 'Polygon', minAmount: 5, volatility: 'low' },
            { symbol: 'SOLUSDT', name: 'Solana', minAmount: 0.1, volatility: 'high' },
            { symbol: 'AVAXUSDT', name: 'Avalanche', minAmount: 0.1, volatility: 'high' },
            { symbol: 'ATOMUSDT', name: 'Cosmos', minAmount: 0.5, volatility: 'medium' }
        ];

        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.loadSettings();
        this.initChart();
        this.requestNotificationPermission();
        
        // Инициализировать менеджер портфеля
        this.portfolioManager = new PortfolioManager(this);
        
        // Загрузить историю сигналов
        this.loadSignalsHistory();
        
        // Первоначальная загрузка данных
        
        // Первоначальная загрузка данных
        await this.updateMarketData();
        this.generateSignals();
        
        // Обновление каждые 30 секунд
        this.refreshInterval = setInterval(() => {
            this.updateMarketData();
            if (this.isAutoMode) {
                this.generateSignals();
            }
        }, this.settings.updateInterval);

        console.log('CryptoSignal инициализирован');
    }

    setupEventListeners() {
        // Кнопки управления
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.generateSignals();
            this.showNotification('Сигналы обновлены', 'success');
        });

        document.getElementById('autoMode').addEventListener('click', () => {
            this.toggleAutoMode();
        });

        // Настройки
        document.getElementById('maxRisk').addEventListener('change', (e) => {
            this.settings.maxRisk = parseInt(e.target.value);
            this.saveSettings();
            this.generateSignals();
        });

        document.getElementById('minProfit').addEventListener('change', (e) => {
            this.settings.minProfit = parseInt(e.target.value);
            this.saveSettings();
            this.generateSignals();
        });

        document.getElementById('cryptoType').addEventListener('change', (e) => {
            this.settings.cryptoType = e.target.value;
            this.saveSettings();
            this.generateSignals();
        });

        // Уведомления
        document.getElementById('notificationBtn').addEventListener('click', () => {
            this.toggleNotifications();
        });

        document.getElementById('allowNotifications').addEventListener('click', () => {
            this.enableNotifications();
        });

        document.getElementById('denyNotifications').addEventListener('click', () => {
            this.disableNotifications();
        });
    }

    async updateMarketData() {
        try {
            // Используем Binance API для получения актуальных данных
            for (const pair of this.cryptoPairs) {
                const data = await this.fetchCryptoData(pair.symbol);
                if (data) {
                    this.marketData.set(pair.symbol, data);
                }
            }
            
            this.updateChart();
            console.log('Рыночные данные обновлены');
        } catch (error) {
            console.error('Ошибка обновления данных:', error);
            this.showNotification('Ошибка получения данных рынка', 'error');
        }
    }

// Замените существующую fetchCryptoData на этот код
async fetchCryptoData(symbol) {
  try {
    // Используем ваш прокси-сервер вместо прямого запроса к CoinGecko
    const baseUrl = window.location.origin;
    const response = await fetch(`${baseUrl}/api/ticker/${symbol}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error('API returned error');
    }
    
    const data = result.data;
    
    // Преобразуем данные Binance в нужный формат
    return {
      symbol: symbol,
      price: parseFloat(data.lastPrice),
      change24h: parseFloat(data.priceChangePercent),
      volume: parseFloat(data.volume),
      high: parseFloat(data.highPrice),
      low: parseFloat(data.lowPrice),
      timestamp: Date.now()
    };
    
  } catch (err) {
    console.error('Ошибка получения данных для', symbol, err);
    
    // 🔧 РЕЗЕРВНЫЕ ДЕМО-ДАННЫЕ ПРИ ОШИБКЕ
    return this.generateDemoData(symbol);
  }
}


    getCoinGeckoId(symbol) {
        const mapping = {
            'BTCUSDT': 'bitcoin',
            'ETHUSDT': 'ethereum',
            'ADAUSDT': 'cardano',
            'DOTUSDT': 'polkadot',
            'MATICUSDT': 'polygon',
            'SOLUSDT': 'solana',
            'AVAXUSDT': 'avalanche-2',
            'ATOMUSDT': 'cosmos'
        };
        return mapping[symbol];
    }

    generateDemoData(symbol) {
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
  const volatility = 0.02;
  const change = (Math.random() - 0.5) * volatility * 100;
  const currentPrice = basePrice * (1 + change / 100);
  
  return {
    symbol: symbol,
    price: currentPrice,
    change24h: change,
    volume: Math.random() * 1000000 + 100000,
    high: currentPrice * (1 + Math.random() * 0.05),
    low: currentPrice * (1 - Math.random() * 0.05),
    timestamp: Date.now(),
    isDemo: true // 🔧 ФЛАГ ДЛЯ ДЕМО-ДАННЫХ
  };
}

    getBasePrice(symbol) {
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
        return basePrices[symbol] || 1;
    }

    generateSignals() {
        const marketSignals = this.generateMarketSignals();
        const portfolioSignals = this.portfolioManager ? this.portfolioManager.getPortfolioBasedSignals() : [];
        
        // Добавить специальные поля для портфельных сигналов
        const enhancedPortfolioSignals = portfolioSignals.map(signal => ({
            ...signal,
            id: signal.id || Date.now() + Math.random(),
            urgency: signal.urgency || 'medium',
            expiry: Date.now() + (60 * 60 * 1000) // 1 час для портфельных сигналов
        }));
        
        // Объединить сигналы и отсортировать по важности
        this.signals = [...marketSignals, ...enhancedPortfolioSignals].sort((a, b) => {
            const urgencyOrder = { high: 3, medium: 2, low: 1 };
            return (urgencyOrder[b.urgency] || 0) - (urgencyOrder[a.urgency] || 0);
        });

        this.renderSignals();
        this.updateStats();
        
        // Показать уведомление о новых сигналах
        const totalSignals = this.signals.length;
        const portfolioSignalsCount = portfolioSignals.length;
        
        if (totalSignals > 0) {
            let message = `Найдено ${totalSignals} новых сигналов`;
            if (portfolioSignalsCount > 0) {
                message += ` (${portfolioSignalsCount} по вашему портфелю)`;
            }
            this.showNotification(message, 'success');
            this.sendPushNotification('Новые торговые сигналы', `Доступно ${totalSignals} сигналов для торговли`);
        }
    }

    generateMarketSignals() {
        const signals = [];
        const filteredPairs = this.filterPairsByType();
        
        filteredPairs.forEach(pair => {
            const marketData = this.marketData.get(pair.symbol);
            if (!marketData) return;

            const signal = this.analyzeMarket(pair, marketData);
            if (signal) {
                signals.push(signal);
            }
        });

        return signals;
    }

    filterPairsByType() {
        switch (this.settings.cryptoType) {
            case 'stable':
                return this.cryptoPairs.filter(pair => pair.volatility === 'low');
            case 'volatile':
                return this.cryptoPairs.filter(pair => pair.volatility === 'high');
            default:
                return this.cryptoPairs;
        }
    }

    analyzeMarket(pair, marketData) {
        const { change24h, volume, price } = marketData;
        const { minAmount } = pair;
        
        // Простая стратегия анализа на основе волатильности и объема
        const volatility = Math.abs(change24h);
        const volumeScore = Math.log(volume + 1);
        
        // Условия для генерации сигнала
        const minVolatility = 2; // минимальная волатильность 2%
        const maxVolatility = 15; // максимальная волатильность 15%
        const minVolumeScore = 15; // минимальный объем
        
        if (volatility >= minVolatility && volatility <= maxVolatility && volumeScore > minVolumeScore) {
            // Определяем направление сигнала
            let action, confidence, targetPrice, stopLoss;
            
            if (change24h > 0) {
                // Восходящий тренд - покупка
                action = 'BUY';
                targetPrice = price * (1 + this.settings.minProfit / 100);
                stopLoss = price * (1 - this.settings.maxRisk / 100);
            } else {
                // Нисходящий тренд - продажа (короткая позиция)
                action = 'SELL';
                targetPrice = price * (1 - this.settings.minProfit / 100);
                stopLoss = price * (1 + this.settings.maxRisk / 100);
            }
            
            // Рассчитываем confidence на основе волатильности и объема
            confidence = Math.min(90, Math.max(60, 
                (volatility / maxVolatility) * 30 + 
                (volumeScore / 50) * 40 + 
                30
            ));
            
            return {
                id: Date.now() + Math.random(),
                pair: pair.symbol,
                name: pair.name,
                action: action,
                price: price,
                targetPrice: targetPrice,
                stopLoss: stopLoss,
                confidence: Math.round(confidence),
                potentialProfit: this.settings.minProfit,
                risk: this.settings.maxRisk,
                timestamp: Date.now(),
                expiry: Date.now() + (30 * 60 * 1000), // 30 минут
                status: 'active',
                amount: minAmount
            };
        }
        
        return null;
    }

    renderSignals() {
        const container = document.getElementById('signalsContainer');
        const noSignals = document.getElementById('noSignals');
        
        if (this.signals.length === 0) {
            container.innerHTML = '';
            noSignals.style.display = 'block';
            return;
        }
        
        noSignals.style.display = 'none';
        
        const signalsHTML = this.signals.map(signal => this.createSignalCard(signal)).join('');
        container.innerHTML = signalsHTML;
        
        // Добавляем обработчики событий для кнопок
        this.signals.forEach(signal => {
            const card = document.getElementById(`signal-${signal.id}`);
            if (card) {
                const buyBtn = card.querySelector('.btn-buy');
                const sellBtn = card.querySelector('.btn-sell');
                
                if (buyBtn) {
                    buyBtn.addEventListener('click', () => this.executeSignal(signal, 'buy'));
                }
                
                if (sellBtn) {
                    sellBtn.addEventListener('click', () => this.executeSignal(signal, 'sell'));
                }
            }
        });
    }

    createSignalCard(signal) {
        const timeLeft = Math.max(0, signal.expiry - Date.now());
        const minutesLeft = Math.floor(timeLeft / (1000 * 60));
        const secondsLeft = Math.floor((timeLeft % (1000 * 60)) / 1000);
        
        const actionClass = signal.action === 'BUY' ? 'signal-buy' : 'signal-sell';
        const actionIcon = signal.action === 'BUY' ? 'fa-arrow-up' : 'fa-arrow-down';
        const actionColor = signal.action === 'BUY' ? 'text-green-400' : 'text-red-400';
        
        return `
            <div class="signal-card ${actionClass} glass rounded-xl p-6 animate-slide-in" id="signal-${signal.id}">
                <div class="signal-header flex justify-between items-center mb-4">
                    <div class="flex items-center">
                        <i class="fas ${actionIcon} ${actionColor} text-xl mr-3"></i>
                        <h3 class="text-lg font-bold">${signal.name}</h3>
                        <span class="status-indicator status-active ml-3"></span>
                    </div>
                    <div class="text-right">
                        <p class="text-sm text-gray-400">До окончания</p>
                        <p class="countdown ${minutesLeft < 5 ? 'urgent' : ''}">${minutesLeft}:${secondsLeft.toString().padStart(2, '0')}</p>
                    </div>
                </div>
                
                <div class="signal-info grid grid-cols-2 gap-4 mb-4">
                    <div class="signal-info-item">
                        <span class="text-gray-400">Действие:</span>
                        <span class="font-semibold ${actionColor}">${signal.action}</span>
                    </div>
                    <div class="signal-info-item">
                        <span class="text-gray-400">Цена:</span>
                        <span class="font-semibold">$${signal.price.toFixed(4)}</span>
                    </div>
                    <div class="signal-info-item">
                        <span class="text-gray-400">Цель:</span>
                        <span class="font-semibold text-green-400">$${signal.targetPrice.toFixed(4)}</span>
                    </div>
                    <div class="signal-info-item">
                        <span class="text-gray-400">Стоп-лосс:</span>
                        <span class="font-semibold text-red-400">$${signal.stopLoss.toFixed(4)}</span>
                    </div>
                    <div class="signal-info-item">
                        <span class="text-gray-400">Уверенность:</span>
                        <span class="font-semibold">${signal.confidence}%</span>
                    </div>
                    <div class="signal-info-item">
                        <span class="text-gray-400">Мин. сумма:</span>
                        <span class="font-semibold">${signal.amount} ${signal.pair.replace('USDT', '')}</span>
                    </div>
                </div>
                
                <div class="progress-bar mb-4">
                    <div class="progress-fill" style="width: ${signal.confidence}%"></div>
                </div>
                
                <div class="signal-actions">
                    <button class="btn-action btn-buy flex-1">
                        <i class="fas fa-check mr-2"></i>Принять сигнал
                    </button>
                    <button class="btn-action flex-1 bg-gray-600 hover:bg-gray-700">
                        <i class="fas fa-times mr-2"></i>Игнорировать
                    </button>
                </div>
            </div>
        `;
    }

    executeSignal(signal, action) {
        if (action === 'buy') {
            const executedSignal = {
                ...signal,
                executedAt: Date.now(),
                status: 'executed',
                user_id: this.portfolioManager ? this.portfolioManager.userId : 'anonymous'
            };
            
            this.activeSignals.push(executedSignal);
            
            // Сохранить сигнал в историю
            this.saveSignalToHistory(executedSignal);
            
            this.showNotification(`Сигнал ${signal.name} принят`, 'success');
            this.sendPushNotification('Сигнал принят', `Вы приняли сигнал на ${signal.action} ${signal.name}`);
            
            // Удаляем сигнал из списка
            this.signals = this.signals.filter(s => s.id !== signal.id);
            this.renderSignals();
        }
    }

    async saveSignalToHistory(signal) {
        try {
            const signalData = {
                id: signal.id.toString(),
                user_id: signal.user_id,
                symbol: signal.pair || signal.symbol,
                name: signal.name,
                action: signal.action,
                entry_price: signal.price,
                target_price: signal.targetPrice || signal.target_price,
                stop_loss: signal.stopLoss || signal.stop_loss,
                confidence: signal.confidence,
                result: 'pending',
                actual_profit: 0,
                timestamp: signal.executedAt || Date.now(),
                status: signal.status,
                reason: signal.reason || 'Рыночный сигнал',
                urgency: signal.urgency || 'medium'
            };

            const response = await fetch('tables/signals_history', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(signalData)
            });

            if (response.ok) {
                console.log('Сигнал сохранен в историю:', signalData);
            }
        } catch (error) {
            console.error('Ошибка при сохранении сигнала в историю:', error);
        }
    }

    async loadSignalsHistory() {
        try {
            const userId = this.portfolioManager ? this.portfolioManager.userId : 'anonymous';
            const response = await fetch(`tables/signals_history?user_id=${userId}&limit=10&sort=timestamp&order=desc`);
            const data = await response.json();
            
            this.renderSignalsHistory(data.data || []);
        } catch (error) {
            console.error('Ошибка при загрузке истории сигналов:', error);
        }
    }

    renderSignalsHistory(signals) {
        const container = document.getElementById('signalsHistory');
        
        if (!signals || signals.length === 0) {
            container.innerHTML = `
                <div class="text-center text-gray-400">
                    <i class="fas fa-history text-4xl mb-4"></i>
                    <p>История сигналов будет отображаться здесь</p>
                </div>
            `;
            return;
        }

        const historyHTML = signals.map(signal => this.createHistoryCard(signal)).join('');
        container.innerHTML = historyHTML;
    }

    createHistoryCard(signal) {
        const actionColor = signal.action === 'BUY' ? 'text-green-400' : 'text-red-400';
        const actionIcon = signal.action === 'BUY' ? 'fa-arrow-up' : 'fa-arrow-down';
        const date = new Date(parseInt(signal.timestamp)).toLocaleDateString();
        const resultColor = signal.result === 'win' ? 'text-green-400' : signal.result === 'loss' ? 'text-red-400' : 'text-yellow-400';
        
        return `
            <div class="glass rounded-lg p-4 mb-3">
                <div class="flex justify-between items-center mb-2">
                    <div class="flex items-center">
                        <i class="fas ${actionIcon} ${actionColor} mr-2"></i>
                        <span class="font-semibold">${signal.name}</span>
                        <span class="ml-2 text-sm text-gray-400">${date}</span>
                    </div>
                    <span class="text-sm ${resultColor}">${signal.result?.toUpperCase() || 'PENDING'}</span>
                </div>
                <div class="grid grid-cols-3 gap-4 text-sm">
                    <div>
                        <span class="text-gray-400">Действие:</span>
                        <span class="ml-2 font-semibold">${signal.action}</span>
                    </div>
                    <div>
                        <span class="text-gray-400">Цена входа:</span>
                        <span class="ml-2 font-semibold">$${Number(signal.entry_price).toFixed(4)}</span>
                    </div>
                    <div>
                        <span class="text-gray-400">Уверенность:</span>
                        <span class="ml-2 font-semibold">${signal.confidence}%</span>
                    </div>
                </div>
                ${signal.actual_profit ? `
                    <div class="mt-2 text-sm">
                        <span class="text-gray-400">Результат:</span>
                        <span class="ml-2 ${signal.actual_profit >= 0 ? 'text-green-400' : 'text-red-400'}">
                            ${signal.actual_profit >= 0 ? '+' : ''}${Number(signal.actual_profit).toFixed(2)}
                        </span>
                    </div>
                ` : ''}
            </div>
        `;
    }
    updateStats() {
        document.getElementById('activeSignals').textContent = this.signals.length;
        document.getElementById('accuracyRate').textContent = `${this.accuracyRate}%`;
        document.getElementById('avgProfit').textContent = `+${this.avgProfit}%`;
        
        // Обновить историю сигналов при каждом обновлении статистики
        this.loadSignalsHistory();
    }

    initChart() {
        const ctx = document.getElementById('marketChart').getContext('2d');
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'BTC/USDT',
                    data: [],
                    borderColor: '#f59e0b',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: '#ffffff'
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: { color: '#ffffff' },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    },
                    y: {
                        ticks: { color: '#ffffff' },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    }
                }
            }
        });
    }

    updateChart() {
        if (!this.chart || this.marketData.size === 0) return;
        
        const btcData = this.marketData.get('BTCUSDT');
        if (!btcData) return;
        
        const now = new Date().toLocaleTimeString();
        const labels = [...this.chart.data.labels, now].slice(-20);
        const prices = [...this.chart.data.datasets[0].data, btcData.price].slice(-20);
        
        this.chart.data.labels = labels;
        this.chart.data.datasets[0].data = prices;
        this.chart.update();
    }

    toggleAutoMode() {
        this.isAutoMode = !this.isAutoMode;
        const button = document.getElementById('autoMode');
        
        if (this.isAutoMode) {
            button.innerHTML = '<i class="fas fa-robot mr-2"></i>Авто режим';
            button.classList.add('bg-green-600');
            button.classList.remove('bg-gray-600');
            this.showNotification('Автоматический режим включен', 'success');
        } else {
            button.innerHTML = '<i class="fas fa-robot mr-2"></i>Ручной режим';
            button.classList.add('bg-gray-600');
            button.classList.remove('bg-green-600');
            this.showNotification('Автоматический режим выключен', 'warning');
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => notification.classList.add('show'), 100);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            setTimeout(() => {
                document.getElementById('notificationModal').classList.remove('hidden');
            }, 2000);
        }
    }

    enableNotifications() {
        if ('Notification' in window) {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    this.showNotification('Уведомления включены', 'success');
                }
            });
        }
        document.getElementById('notificationModal').classList.add('hidden');
    }

    disableNotifications() {
        this.showNotification('Уведомления отключены', 'warning');
        document.getElementById('notificationModal').classList.add('hidden');
    }

    sendPushNotification(title, body) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, {
                body: body,
                icon: '/favicon.ico',
                badge: '/favicon.ico'
            });
        }
    }

    loadSettings() {
        const saved = localStorage.getItem('cryptoSignalSettings');
        if (saved) {
            this.settings = { ...this.settings, ...JSON.parse(saved) };
            
            // Обновляем элементы управления
            document.getElementById('maxRisk').value = this.settings.maxRisk;
            document.getElementById('minProfit').value = this.settings.minProfit;
            document.getElementById('cryptoType').value = this.settings.cryptoType;
        }
    }

    saveSettings() {
        localStorage.setItem('cryptoSignalSettings', JSON.stringify(this.settings));
    }

    // Очистка при закрытии
    destroy() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        
        if (this.chart) {
            this.chart.destroy();
        }
    }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    window.cryptoSignal = new CryptoSignal();
});

// Очистка при закрытии страницы
window.addEventListener('beforeunload', () => {
    if (window.cryptoSignal) {
        window.cryptoSignal.destroy();
    }
});