
// app.js

// 🔐 Auth Manager
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.token = localStorage.getItem('authToken');
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkAuthStatus();
    }

    setupEventListeners() {
        // Tab switching
        document.getElementById('loginTab').addEventListener('click', () => this.switchTab('login'));
        document.getElementById('registerTab').addEventListener('click', () => this.switchTab('register'));
        
        // Forms
        document.getElementById('loginForm').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('registerForm').addEventListener('submit', (e) => this.handleRegister(e));
        
        // Demo mode
        document.getElementById('demoMode').addEventListener('click', () => this.enterDemoMode());
        
        // User menu
        document.getElementById('userInfo').addEventListener('click', () => this.toggleUserMenu());
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());
        
        // Close user menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#userInfo') && !e.target.closest('#userMenu')) {
                document.getElementById('userMenu').classList.add('hidden');
            }
        });
    }

    switchTab(tab) {
        const loginTab = document.getElementById('loginTab');
        const registerTab = document.getElementById('registerTab');
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');

        if (tab === 'login') {
            loginTab.classList.add('text-blue-400', 'border-b-2', 'border-blue-400');
            loginTab.classList.remove('text-gray-400');
            registerTab.classList.add('text-gray-400');
            registerTab.classList.remove('text-blue-400', 'border-b-2', 'border-blue-400');
            loginForm.classList.remove('hidden');
            registerForm.classList.add('hidden');
        } else {
            registerTab.classList.add('text-blue-400', 'border-b-2', 'border-blue-400');
            registerTab.classList.remove('text-gray-400');
            loginTab.classList.add('text-gray-400');
            loginTab.classList.remove('text-blue-400', 'border-b-2', 'border-blue-400');
            registerForm.classList.remove('hidden');
            loginForm.classList.add('hidden');
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const result = await response.json();

            if (result.success) {
                this.setUser(result.user, result.token);
                this.hideAuthModal();
                this.showNotification('Успешный вход!', 'success');
            } else {
                this.showNotification(result.error || 'Ошибка входа', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showNotification('Ошибка соединения', 'error');
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        const name = document.getElementById('registerName').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password })
            });

            const result = await response.json();

            if (result.success) {
                this.setUser(result.user, result.token);
                this.hideAuthModal();
                this.showNotification('Регистрация успешна!', 'success');
            } else {
                this.showNotification(result.error || 'Ошибка регистрации', 'error');
            }
        } catch (error) {
            console.error('Register error:', error);
            this.showNotification('Ошибка соединения', 'error');
        }
    }

    enterDemoMode() {
        const demoUser = {
            id: 'demo_' + Date.now(),
            name: 'Демо Пользователь',
            email: 'demo@cryptosignal.com',
            demo: true
        };
        
        this.setUser(demoUser, null);
        this.hideAuthModal();
        this.showNotification('Демо-режим активирован!', 'info');
    }

  setUser(user, token) {
    this.currentUser = user;
    
    if (token) {
        this.token = token;
        localStorage.setItem('authToken', token);
        localStorage.setItem('userData', JSON.stringify(user));
    } else {
        this.token = null;
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
    }

    this.updateUI();
    
    // Безопасная проверка на существование метода
    if (window.cryptoSignal && typeof window.cryptoSignal.onAuthChange === 'function') {
        window.cryptoSignal.onAuthChange(user);
    }
}

onAuthChange(user) {
    this.currentUser = user;
    if (user && !user.demo) {
        this.loadSignalsHistory();
        if (this.portfolioManager) {
            this.portfolioManager.userId = user.id;
            this.portfolioManager.loadPortfolio();
        }
    }
}

    updateUI() {
        const userDisplay = document.getElementById('userDisplay');
        const userInfo = document.getElementById('userInfo');
        const authModal = document.getElementById('authModal');

        if (this.currentUser) {
            userDisplay.textContent = this.currentUser.name || this.currentUser.email;
            userInfo.classList.remove('glass');
            userInfo.classList.add('user-avatar');
            
            if (this.currentUser.demo) {
                userInfo.innerHTML = `
                    <div class="w-8 h-8 demo-badge rounded-full flex items-center justify-center">
                        <i class="fas fa-play text-white text-sm"></i>
                    </div>
                    <span class="text-sm">Демо</span>
                `;
            }
            
            authModal.classList.add('hidden');
        } else {
            userDisplay.textContent = 'Войти';
            userInfo.classList.add('glass');
            userInfo.classList.remove('user-avatar');
            authModal.classList.remove('hidden');
        }
    }

    checkAuthStatus() {
        if (this.token) {
            // Verify token and get user data
            this.verifyToken();
        } else {
            this.updateUI();
        }
    }

    async verifyToken() {
    if (!this.token) return;
    
    try {
        const response = await fetch('/api/auth/verify', {
            headers: { 'Authorization': `Bearer ${this.token}` }
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                this.setUser(result.user, this.token);
                return;
            }
        }
    } catch (error) {
        console.error('Token verification failed:', error);
    }
    
    // Пробуем загрузить из localStorage
    const savedUser = localStorage.getItem('userData');
    if (savedUser) {
        const user = JSON.parse(savedUser);
        this.setUser(user, this.token);
    }
}

    logout() {
        this.currentUser = null;
        this.token = null;
        localStorage.removeItem('authToken');
        this.updateUI();
        this.showNotification('Вы вышли из системы', 'info');
        document.getElementById('userMenu').classList.add('hidden');
    }

    toggleUserMenu() {
        if (this.currentUser) {
            const menu = document.getElementById('userMenu');
            menu.classList.toggle('hidden');
            
            // Update user info in menu
            if (this.currentUser) {
                document.getElementById('userName').textContent = this.currentUser.name || 'Пользователь';
                document.getElementById('userEmail').textContent = this.currentUser.email;
            }
        } else {
            document.getElementById('authModal').classList.remove('hidden');
        }
    }

    hideAuthModal() {
        document.getElementById('authModal').classList.add('hidden');
    }

    showNotification(message, type = 'info') {
        // Use existing notification system or create a simple one
        if (window.cryptoSignal && window.cryptoSignal.showNotification) {
            window.cryptoSignal.showNotification(message, type);
        } else {
            alert(message);
        }
    }

    getAuthToken() {
        return this.token;
    }

    getCurrentUser() {
        return this.currentUser;
    }
}

// Initialize Auth Manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.authManager = new AuthManager();
    
    // Initialize CryptoSignal after auth
    window.cryptoSignal = new CryptoSignal();
});



class PortfolioManager {
    constructor(api) {
        this.api = api;
        this.portfolio = [];
        this.userId = 'user_' + Date.now();
        this.init();
    }

    async init() {
        await this.loadPortfolio();
        this.setupEventListeners();
        this.startPortfolioUpdates();
    }

    setupEventListeners() {
        document.getElementById('addAssetBtn').addEventListener('click', () => {
            this.showAddAssetModal();
        });

        document.getElementById('saveAsset').addEventListener('click', () => {
            this.saveAsset();
        });

        document.getElementById('cancelAddAsset').addEventListener('click', () => {
            this.hideAddAssetModal();
        });

        document.getElementById('addAssetModal').addEventListener('click', (e) => {
            if (e.target.id === 'addAssetModal') {
                this.hideAddAssetModal();
            }
        });

        document.getElementById('assetBuyPrice').addEventListener('input', (e) => {
            this.autoCalculateTargets();
        });
    }

    showAddAssetModal() {
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

        if (!formData.symbol || !formData.amount || !formData.buy_price) {
            alert('Пожалуйста, заполните обязательные поля: криптовалюта, количество и цена покупки');
            return;
        }

        try {
            const currentData = await this.api.fetchCryptoData(formData.symbol);
            if (!currentData) {
                alert('Не удалось получить текущую цену для этой криптовалюты');
                return;
            }

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

            await this.addPortfolioAsset(assetData);
            await this.loadPortfolio();
            this.showNotification(`Актив ${assetData.name} добавлен в портфель`, 'success');
            this.hideAddAssetModal();

        } catch (error) {
            console.error('Ошибка при сохранении актива:', error);
            alert('Ошибка при сохранении актива. Попробуйте еще раз.');
        }
    }

        setupQuickTrading() {
        this.quickTrades = {
            enabled: false,
            amount: 10, // USDT
            maxQuickTrades: 3,
            cooldown: 30000 // 30 секунд
        };
        
        this.setupQuickTradeButtons();
    }

    setupQuickTradeButtons() {
        // Быстрые кнопки для скальпинга
        const quickTradeHTML = `
            <div class="quick-trade-panel glass rounded-xl p-4 mb-6">
                <h4 class="text-lg font-bold mb-3 flex items-center">
                    <i class="fas fa-bolt text-yellow-400 mr-2"></i>
                    Быстрые сделки
                </h4>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <button class="quick-buy-btn bg-green-600 hover:bg-green-700 py-2 px-3 rounded-lg text-sm transition-colors">
                        🟢 Быстрая покупка
                    </button>
                    <button class="quick-sell-btn bg-red-600 hover:bg-red-700 py-2 px-3 rounded-lg text-sm transition-colors">
                        🔴 Быстрая продажа
                    </button>
                    <button class="scalp-buy-btn bg-blue-600 hover:bg-blue-700 py-2 px-3 rounded-lg text-sm transition-colors">
                        ⚡ Скальпинг лонг
                    </button>
                    <button class="scalp-sell-btn bg-purple-600 hover:bg-purple-700 py-2 px-3 rounded-lg text-sm transition-colors">
                        ⚡ Скальпинг шорт
                    </button>
                </div>
                <div class="mt-3 flex space-x-3">
                    <select id="quickAmount" class="flex-1 px-2 py-1 bg-gray-700 rounded text-sm">
                        <option value="5">$5</option>
                        <option value="10" selected>$10</option>
                        <option value="25">$25</option>
                        <option value="50">$50</option>
                    </select>
                    <select id="quickSymbol" class="flex-1 px-2 py-1 bg-gray-700 rounded text-sm">
                        <option value="BTCUSDT">BTC</option>
                        <option value="ETHUSDT">ETH</option>
                        <option value="SOLUSDT">SOL</option>
                        <option value="AVAXUSDT">AVAX</option>
                    </select>
                </div>
            </div>
        `;
        
        const signalsSection = document.querySelector('#signalsContainer').parentElement;
        signalsSection.insertAdjacentHTML('afterbegin', quickTradeHTML);
        
        this.setupQuickTradeHandlers();
    }

    setupQuickTradeHandlers() {
        // Обработчики для быстрых сделок
        document.querySelector('.quick-buy-btn').addEventListener('click', () => {
            this.executeQuickTrade('BUY');
        });
        
        document.querySelector('.quick-sell-btn').addEventListener('click', () => {
            this.executeQuickTrade('SELL');
        });
        
        document.querySelector('.scalp-buy-btn').addEventListener('click', () => {
            this.executeScalpTrade('BUY');
        });
        
        document.querySelector('.scalp-sell-btn').addEventListener('click', () => {
            this.executeScalpTrade('SELL');
        });
    }

    async executeQuickTrade(action) {
        const symbol = document.getElementById('quickSymbol').value;
        const amount = parseFloat(document.getElementById('quickAmount').value);
        
        const marketData = this.marketData.get(symbol);
        if (!marketData) {
            this.showNotification('Нет данных по выбранной паре', 'error');
            return;
        }
        
        const signal = {
            id: 'quick_' + Date.now(),
            symbol: symbol,
            name: this.getCryptoName(symbol),
            action: action,
            price: marketData.price,
            amount: amount / marketData.price,
            timestamp: Date.now(),
            type: 'QUICK_TRADE'
        };
        
        this.showNotification(`${action} ${symbol} на $${amount}`, 'success');
        await this.saveSignalToHistory(signal);
        
        // Имитация быстрой сделки
        setTimeout(() => {
            const profit = (Math.random() - 0.3) * amount * 0.1; // -30% to +70%
            this.showNotification(
                `Сделка закрыта: ${profit >= 0 ? '+' : ''}$${profit.toFixed(2)}`, 
                profit >= 0 ? 'success' : 'warning'
            );
        }, 2000);
    }

    async executeScalpTrade(action) {
        const symbol = document.getElementById('quickSymbol').value;
        const amount = parseFloat(document.getElementById('quickAmount').value);
        
        this.showNotification(`⚡ Скальпинг ${symbol}...`, 'info');
        
        // Имитация скальпинговой сделки
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                const profit = (Math.random() * 0.5) * amount * 0.05; // 0-2.5%
                this.showNotification(
                    `Скальп #${i + 1}: +$${profit.toFixed(2)}`, 
                    'success'
                );
            }, (i + 1) * 1000);
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
            this.portfolio = dataList.map(asset => {
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
        if (asset.target_price && asset.current_price >= asset.target_price) {
            this.showNotification(`🎯 Цель достигнута! ${asset.name} достиг цели продажи $${asset.target_price.toFixed(4)}`, 'success');
            this.sendPushNotification('Цель достигнута', `${asset.name} достиг заявленной цели продажи. Рассмотрите фиксацию прибыли!`);
        }

        if (asset.stop_loss && asset.current_price <= asset.stop_loss) {
            this.showNotification(`⚠️ Стоп-лосс сработал! ${asset.name} упал до $${asset.stop_loss.toFixed(4)}`, 'warning');
            this.sendPushNotification('Стоп-лосс сработал', `${asset.name} достиг уровня стоп-лосса. Рассмотрите продажу!`);
        }

        const dailyChange = Math.abs(asset.profit_loss_percent);
        if (dailyChange > 10) {
            const direction = asset.profit_loss_percent > 0 ? 'выросла' : 'упала';
            this.showNotification(`📈 ${asset.name} ${direction} на ${dailyChange.toFixed(1)}% за сессию!`, 
                                asset.profit_loss_percent > 0 ? 'success' : 'warning');
        }
    }

    getPortfolioBasedSignals() {
        const signals = [];
        
        this.portfolio.forEach(asset => {
            if (asset.target_price && asset.current_price >= asset.target_price * 0.95) {
                signals.push({
                    id: Date.now() + Math.random() + 1000,
                    type: 'SELL',
                    action: 'SELL',
                    asset: asset,
                    name: asset.name,
                    reason: 'Достигнута цель продажи',
                    urgency: 'high',
                    timestamp: Date.now()
                });
            }

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
            alert(message);
        }
    }

    sendPushNotification(title, body) {
        if (window.cryptoSignal) {
            window.cryptoSignal.sendPushNotification(title, body);
        }
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
        
        this.settings = {
            maxRisk: 2,
            minProfit: 5,
            cryptoType: 'all',
            updateInterval: 30000
        };

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
        this.setupQuickTrading();
        this.loadSettings();
        this.initChart();
        this.requestNotificationPermission();
        
        this.portfolioManager = new PortfolioManager(this);
        this.loadSignalsHistory();
        
        await this.updateMarketData();
        this.generateSignals();
        
        this.refreshInterval = setInterval(() => {
            this.updateMarketData();
            if (this.isAutoMode) {
                this.generateSignals();
            }
        }, this.settings.updateInterval);

        console.log('CryptoSignal инициализирован');
    }

    setupEventListeners() {
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.generateSignals();
            this.showNotification('Сигналы обновлены', 'success');
        });

        document.getElementById('autoMode').addEventListener('click', () => {
            this.toggleAutoMode();
        });

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

        // 🔧 ИСПРАВЛЕННЫЙ ОБРАБОТЧИК - убрана ссылка на toggleNotifications
        document.getElementById('notificationBtn').addEventListener('click', () => {
            if ('Notification' in window) {
                if (Notification.permission === 'granted') {
                    this.showNotification('Уведомления уже включены', 'info');
                } else {
                    document.getElementById('notificationModal').classList.remove('hidden');
                }
            } else {
                this.showNotification('Браузер не поддерживает уведомления', 'error');
            }
        });

        document.getElementById('allowNotifications').addEventListener('click', () => {
            this.enableNotifications();
        });

        document.getElementById('denyNotifications').addEventListener('click', () => {
            this.disableNotifications();
        });
    }

    // 🔧 ДОБАВЛЕН ОТСУТСТВУЮЩИЙ МЕТОД
    toggleNotifications() {
        if ('Notification' in window) {
            if (Notification.permission === 'granted') {
                this.disableNotifications();
            } else {
                document.getElementById('notificationModal').classList.remove('hidden');
            }
        } else {
            this.showNotification('Браузер не поддерживает уведомления', 'error');
        }
    }

async updateMarketData() {
    try {
        console.log('🔄 Обновление рыночных данных...');
        
        // 🔧 ИСПОЛЬЗУЕМ НОВЫЙ MULTI-TICKER ЭНДПОИНТ
        const symbols = this.cryptoPairs.map(pair => pair.symbol).join(',');
        const response = await fetch(`/api/multi-ticker?symbols=${symbols}`);
        
        if (response.ok) {
            const result = await response.json();
            if (result.success && Array.isArray(result.data)) {
                result.data.forEach(data => {
                    this.marketData.set(data.symbol, data);
                });
                console.log('✅ Рыночные данные обновлены (multi-ticker)');
            } else {
                throw new Error('Invalid response format');
            }
        } else {
            throw new Error(`HTTP error: ${response.status}`);
        }
        
        this.updateChart();
        
    } catch (error) {
        console.error('❌ Ошибка обновления данных:', error);
        
        // 🔧 РЕЗЕРВНЫЙ ВАРИАНТ - индивидуальные запросы
        try {
            for (const pair of this.cryptoPairs) {
                const data = await this.fetchCryptoData(pair.symbol);
                if (data) {
                    this.marketData.set(pair.symbol, data);
                }
            }
            console.log('✅ Рыночные данные обновлены (fallback)');
        } catch (fallbackError) {
            console.error('❌ Критическая ошибка обновления данных:', fallbackError);
            this.showNotification('Используются демо-данные', 'warning');
        }
    }
}

async fetchCryptoData(symbol) {
    try {
        const baseUrl = window.location.origin;
        
        // 🔧 ИСПРАВЛЕННЫЙ ЭНДПОИНТ
        const response = await fetch(`${baseUrl}/api/realtime/${symbol}`, { 
            timeout: 5000 
        });
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const result = await response.json();
        if (!result.success) throw new Error('API returned error');
        
        const data = result.data;
        return {
            symbol: symbol,
            price: parseFloat(data.price),
            change24h: parseFloat(data.change24h),
            volume: parseFloat(data.volume),
            high: parseFloat(data.high),
            low: parseFloat(data.low),
            timestamp: Date.now(),
            isDemo: data.isDemo || false
        };
        
    } catch (err) {
        console.warn(`⚠️ Ошибка получения данных для ${symbol}:`, err.message);
        return this.generateDemoData(symbol);
    }
}

    generateDemoData(symbol) {
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
            high: currentPrice * (1 + Math.random() * 0.05),
            low: currentPrice * (1 - Math.random() * 0.05),
            timestamp: Date.now(),
            isDemo: true
        };
    }

    // Остальные методы остаются без изменений...
generateSignals() {
    const marketSignals = this.generateMarketSignals();
    const portfolioSignals = this.portfolioManager ? this.portfolioManager.getPortfolioBasedSignals() : [];
    
    // 🔧 ФИЛЬТРУЕМ НЕВАЛИДНЫЕ СИГНАЛЫ
    const validMarketSignals = marketSignals.filter(signal => 
        signal && signal.price && signal.targetPrice && signal.stopLoss
    );
    
    const enhancedPortfolioSignals = portfolioSignals.map(signal => ({
        ...signal,
        id: signal.id || Date.now() + Math.random(),
        urgency: signal.urgency || 'medium',
        expiry: Date.now() + (60 * 60 * 1000)
    }));
    
    // 🔧 ФИЛЬТРУЕМ УСИЛЕННЫЕ СИГНАЛЫ
    const validPortfolioSignals = enhancedPortfolioSignals.filter(signal => 
        signal && signal.price && signal.targetPrice && signal.stopLoss
    );
    
    this.signals = [...validMarketSignals, ...validPortfolioSignals].sort((a, b) => {
        const urgencyOrder = { high: 3, medium: 2, low: 1 };
        return (urgencyOrder[b.urgency] || 0) - (urgencyOrder[a.urgency] || 0);
    });

    this.renderSignals();
    this.updateStats();
    
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
    
    // Добавляем стратегии
    const strategies = [
        new ScalpingStrategy(),
        new TrendFollowingStrategy(), 
        new BreakoutStrategy()
    ];
    
    filteredPairs.forEach(pair => {
        const marketData = this.marketData.get(pair.symbol);
        if (!marketData) return;

        // Базовая стратегия
        const baseSignal = this.analyzeMarket(pair, marketData);
        if (baseSignal) signals.push(baseSignal);
        
        // Дополнительные стратегии
        strategies.forEach(strategy => {
            const strategySignal = strategy.analyze(pair.symbol, this.getHistoricalData(pair.symbol));
            if (strategySignal) {
                signals.push({
                    ...strategySignal,
                    id: Date.now() + Math.random(),
                    pair: pair.symbol,
                    name: pair.name,
                    price: marketData.price,
                    timestamp: Date.now(),
                    expiry: Date.now() + (30 * 60 * 1000),
                    strategy: strategy.name
                });
            }
        });
    });

    return signals;
}

    filterPairsByType() {
        switch (this.settings.cryptoType) {
            case 'stable': return this.cryptoPairs.filter(pair => pair.volatility === 'low');
            case 'volatile': return this.cryptoPairs.filter(pair => pair.volatility === 'high');
            default: return this.cryptoPairs;
        }
    }

    analyzeMarket(pair, marketData) {
        const { change24h, volume, price } = marketData;
        const { minAmount } = pair;
        
        const volatility = Math.abs(change24h);
        const volumeScore = Math.log(volume + 1);
        
        const minVolatility = 2, maxVolatility = 15, minVolumeScore = 15;
        
        if (volatility >= minVolatility && volatility <= maxVolatility && volumeScore > minVolumeScore) {
            let action, confidence, targetPrice, stopLoss;
            
            if (change24h > 0) {
                action = 'BUY';
                targetPrice = price * (1 + this.settings.minProfit / 100);
                stopLoss = price * (1 - this.settings.maxRisk / 100);
            } else {
                action = 'SELL';
                targetPrice = price * (1 - this.settings.minProfit / 100);
                stopLoss = price * (1 + this.settings.maxRisk / 100);
            }
            
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
                expiry: Date.now() + (30 * 60 * 1000),
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
        
        this.signals.forEach(signal => {
            const card = document.getElementById(`signal-${signal.id}`);
            if (card) {
                const buyBtn = card.querySelector('.btn-buy');
                const sellBtn = card.querySelector('.btn-sell');
                
                if (buyBtn) buyBtn.addEventListener('click', () => this.executeSignal(signal, 'buy'));
                if (sellBtn) sellBtn.addEventListener('click', () => this.executeSignal(signal, 'sell'));
            }
        });
    }

createSignalCard(signal) {
    // 🔧 ПРОВЕРКА НА NULL/UNDEFINED
    if (!signal || !signal.price || !signal.targetPrice || !signal.stopLoss) {
        console.error('Invalid signal data:', signal);
        return '<div class="glass rounded-xl p-6 text-red-400">Ошибка: некорректные данные сигнала</div>';
    }

    const timeLeft = Math.max(0, signal.expiry - Date.now());
    const minutesLeft = Math.floor(timeLeft / (1000 * 60));
    const secondsLeft = Math.floor((timeLeft % (1000 * 60)) / 1000);
    
    const actionClass = signal.action === 'BUY' ? 'signal-buy' : 'signal-sell';
    const actionIcon = signal.action === 'BUY' ? 'fa-arrow-up' : 'fa-arrow-down';
    const actionColor = signal.action === 'BUY' ? 'text-green-400' : 'text-red-400';
    
    // 🔧 БЕЗОПАСНОЕ ФОРМАТИРОВАНИЕ ЧИСЕЛ
    const price = Number(signal.price || 0).toFixed(4);
    const targetPrice = Number(signal.targetPrice || 0).toFixed(4);
    const stopLoss = Number(signal.stopLoss || 0).toFixed(4);
    const confidence = Number(signal.confidence || 0);
    const amount = signal.amount || 0;
    const symbol = signal.pair || signal.symbol || 'UNKNOWN';
    
    return `
        <div class="signal-card ${actionClass} glass rounded-xl p-6 animate-slide-in" id="signal-${signal.id}">
            <div class="signal-header flex justify-between items-center mb-4">
                <div class="flex items-center">
                    <i class="fas ${actionIcon} ${actionColor} text-xl mr-3"></i>
                    <h3 class="text-lg font-bold">${signal.name || 'Unknown'}</h3>
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
                    <span class="font-semibold ${actionColor}">${signal.action || 'UNKNOWN'}</span>
                </div>
                <div class="signal-info-item">
                    <span class="text-gray-400">Цена:</span>
                    <span class="font-semibold">$${price}</span>
                </div>
                <div class="signal-info-item">
                    <span class="text-gray-400">Цель:</span>
                    <span class="font-semibold text-green-400">$${targetPrice}</span>
                </div>
                <div class="signal-info-item">
                    <span class="text-gray-400">Стоп-лосс:</span>
                    <span class="font-semibold text-red-400">$${stopLoss}</span>
                </div>
                <div class="signal-info-item">
                    <span class="text-gray-400">Уверенность:</span>
                    <span class="font-semibold">${confidence}%</span>
                </div>
                <div class="signal-info-item">
                    <span class="text-gray-400">Мин. сумма:</span>
                    <span class="font-semibold">${amount} ${symbol.replace('USDT', '')}</span>
                </div>
            </div>
            
            <div class="progress-bar mb-4">
                <div class="progress-fill" style="width: ${confidence}%"></div>
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
            this.saveSignalToHistory(executedSignal);
            this.showNotification(`Сигнал ${signal.name} принят`, 'success');
            this.sendPushNotification('Сигнал принят', `Вы приняли сигнал на ${signal.action} ${signal.name}`);
            
            this.signals = this.signals.filter(s => s.id !== signal.id);
            this.renderSignals();
        }
    }

async saveSignalToHistory(signal) {
    try {
        const signalData = {
            symbol: signal.pair || signal.symbol,
            name: signal.name,
            action: signal.action,
            entry_price: signal.price,
            target_price: signal.targetPrice || signal.target_price,
            stop_loss: signal.stopLoss || signal.stop_loss,
            confidence: signal.confidence,
            result: 'pending',
            actual_profit: 0,
            reason: signal.reason || 'Рыночный сигнал'
        };

        // 🔧 ИСПРАВЛЕННЫЙ ЭНДПОИНТ
        const response = await fetch('/api/signals/history', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.getAuthToken()}`
            },
            body: JSON.stringify(signalData)
        });

        if (response.ok) {
            console.log('Сигнал сохранен в историю:', signalData);
        } else {
            console.warn('Не удалось сохранить сигнал в историю');
        }
    } catch (error) {
        console.error('Ошибка при сохранении сигнала в историю:', error);
    }
}

// 🔧 ДОБАВЬТЕ ЭТОТ МЕТОД ДЛЯ ПОЛУЧЕНИЯ ТОКЕНА
getAuthToken() {
    // Если у вас есть система аутентификации, верните токен
    // Или верните null для демо-режима
    return localStorage.getItem('authToken') || null;
}

// В классе CryptoSignal обновите loadSignalsHistory:
async loadSignalsHistory() {
    try {
        // Для демо-режима показываем пустую историю
        if (this.currentUser && this.currentUser.demo) {
            this.renderSignalsHistory([]);
            return;
        }

        const token = this.getAuthToken();
        const headers = { 'Content-Type': 'application/json' };
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        const response = await fetch('/api/signals/history?limit=10', { headers });
        
        if (!response.ok) {
            if (response.status === 401) {
                // Не авторизован - показываем демо-данные
                this.renderSignalsHistory(this.generateDemoHistory());
                return;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            this.renderSignalsHistory(result.data || []);
        } else {
            this.renderSignalsHistory(this.generateDemoHistory());
        }
    } catch (error) {
        console.error('Ошибка при загрузке истории сигналов:', error);
        this.renderSignalsHistory(this.generateDemoHistory());
    }
}

generateDemoHistory() {
    // Генерация демо-истории для неавторизованных пользователей
    return [
        {
            id: 1,
            symbol: 'BTCUSDT',
            name: 'Bitcoin',
            action: 'BUY',
            entry_price: 45000,
            target_price: 47250,
            stop_loss: 44100,
            confidence: 78,
            result: 'win',
            actual_profit: 2250,
            timestamp: Date.now() - 86400000
        },
        {
            id: 2,
            symbol: 'ETHUSDT',
            name: 'Ethereum',
            action: 'SELL',
            entry_price: 3000,
            target_price: 2850,
            stop_loss: 3090,
            confidence: 65,
            result: 'pending',
            actual_profit: 0,
            timestamp: Date.now() - 43200000
        }
    ];
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
        this.loadSignalsHistory();
    }

 // В классе CryptoSignal замените initChart:
initChart(symbol = 'BTCUSDT') {
    // Уничтожаем предыдущий график если существует
    if (this.chart) {
        this.chart.destroy();
        this.chart = null;
    }
    
    const ctx = document.getElementById('marketChart').getContext('2d');
    this.chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: `${symbol}`,
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
                legend: { labels: { color: '#ffffff' } }
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
    
    // Добавляем обработчик изменения символа
    document.getElementById('chartSymbol').addEventListener('change', (e) => {
        this.updateChartWithSymbol(e.target.value);
    });
}

async updateChartWithSymbol(symbol) {
    this.initChart(symbol);
    await this.loadChartData(symbol);
}

async loadChartData(symbol) {
    try {
        const response = await fetch(`/api/history/${symbol}?interval=1h&limit=50`);
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                this.updateChartWithData(symbol, result.data);
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки данных графика:', error);
    }
}

updateChartWithData(symbol, data) {
    if (!this.chart) return;
    
    const labels = data.map(item => new Date(item.timestamp).toLocaleTimeString());
    const prices = data.map(item => item.close);
    
    this.chart.data.labels = labels;
    this.chart.data.datasets[0].data = prices;
    this.chart.data.datasets[0].label = symbol;
    this.chart.update();
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
                icon: 'favicon.ico',
                badge: 'favicon.ico'
            });
        }
    }

    loadSettings() {
        const saved = localStorage.getItem('cryptoSignalSettings');
        if (saved) {
            this.settings = { ...this.settings, ...JSON.parse(saved) };
            document.getElementById('maxRisk').value = this.settings.maxRisk;
            document.getElementById('minProfit').value = this.settings.minProfit;
            document.getElementById('cryptoType').value = this.settings.cryptoType;
        }
    }

    saveSettings() {
        localStorage.setItem('cryptoSignalSettings', JSON.stringify(this.settings));
    }

    destroy() {
        if (this.refreshInterval) clearInterval(this.refreshInterval);
        if (this.chart) this.chart.destroy();
    }
}



// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    window.cryptoSignal = new CryptoSignal();
});

window.addEventListener('beforeunload', () => {
    if (window.cryptoSignal) window.cryptoSignal.destroy();
});