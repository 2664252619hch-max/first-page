// 应用状态
const state = {
    currentView: 'search', // 'search' 或 'detail'
    searchQuery: '',
    searchResults: [],
    selectedCategory: null,
    currentDetail: null,
    debounceTimer: null,
    showAllCategories: false,
    maxVisibleCategories: 6
};

// DOM元素
const elements = {
    searchPage: document.getElementById('search-page'),
    detailPage: document.getElementById('detail-page'),
    searchInput: document.getElementById('search-input'),
    clearBtn: document.getElementById('clear-btn'),
    suggestions: document.getElementById('search-suggestions'),
    categoryNav: document.getElementById('category-nav'),
    hotItems: document.getElementById('hot-items'),
    resultsSection: document.getElementById('results-section'),
    resultsList: document.getElementById('results-list'),
    resultCount: document.getElementById('result-count'),
    sortSelect: document.getElementById('sort-select'),
    backBtn: document.getElementById('back-btn'),
    detailCategory: document.getElementById('detail-category'),
    detailName: document.getElementById('detail-name'),
    detailCode: document.getElementById('detail-code'),
    detailTaxRate: document.getElementById('detail-tax-rate'),
    detailDescription: document.getElementById('detail-description'),
    detailKeywords: document.getElementById('detail-keywords'),
    relatedList: document.getElementById('related-list'),
    relatedSection: document.getElementById('related-section'),
    copyBtn: document.getElementById('copy-btn'),
    toast: document.getElementById('toast')
};

// 初始化应用
function init() {
    renderCategories();
    renderHotItems();
    bindEvents();
}

// 渲染分类导航
function renderCategories() {
    const sortedCategories = [...categories].sort((a, b) => b.count - a.count); // 按数量降序排列
    const displayCategories = state.showAllCategories 
        ? sortedCategories 
        : sortedCategories.slice(0, state.maxVisibleCategories);
    const hasMoreCategories = sortedCategories.length > state.maxVisibleCategories;
    
    let html = displayCategories.map(cat => `
        <div class="category-item" data-category="${cat.name}">
            <span class="icon">${cat.icon}</span>
            <span class="name">${cat.name}</span>
            <span class="count">${cat.count}</span>
        </div>
    `).join('');
    
    if (hasMoreCategories) {
        html += `
            <div class="category-item show-more-btn" id="show-more-categories">
                <span class="icon">${state.showAllCategories ? '⬆️' : '⬇️'}</span>
                <span class="name">${state.showAllCategories ? '收起' : '更多分类'}</span>
            </div>
        `;
    }
    
    elements.categoryNav.innerHTML = html;
    
    if (hasMoreCategories) {
        const showMoreBtn = document.getElementById('show-more-categories');
        showMoreBtn.addEventListener('click', () => {
            state.showAllCategories = !state.showAllCategories;
            renderCategories();
        });
    }
}

// 渲染热门商品
function renderHotItems() {
    elements.hotItems.innerHTML = hotItems.map(item => {
        const data = taxCodeData.find(d => d.code === item.code);
        if (!data) return '';
        return `
            <div class="hot-item" data-code="${data.code}">
                <div class="name">${data.name}</div>
                <div class="code">${data.code}</div>
            </div>
        `;
    }).join('');
}

// 绑定事件
function bindEvents() {
    // 搜索输入
    elements.searchInput.addEventListener('input', handleSearchInput);
    elements.searchInput.addEventListener('focus', handleSearchFocus);
    elements.searchInput.addEventListener('blur', handleSearchBlur);

    // 清除按钮
    elements.clearBtn.addEventListener('click', handleClearSearch);

    // 分类导航点击
    elements.categoryNav.addEventListener('click', handleCategoryClick);

    // 热门商品点击
    elements.hotItems.addEventListener('click', handleItemClick);

    // 搜索结果点击
    elements.resultsList.addEventListener('click', handleItemClick);

    // 排序选择
    elements.sortSelect.addEventListener('change', handleSortChange);

    // 返回按钮
    elements.backBtn.addEventListener('click', handleBack);

    // 复制按钮
    elements.copyBtn.addEventListener('click', handleCopy);

    // 点击外部关闭建议
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container')) {
            elements.suggestions.classList.remove('show');
        }
    });

    // 键盘导航
    elements.searchInput.addEventListener('keydown', handleKeyNav);
}

// 处理搜索输入
function handleSearchInput(e) {
    const query = e.target.value.trim();
    state.searchQuery = query;

    // 防抖处理
    clearTimeout(state.debounceTimer);
    state.debounceTimer = setTimeout(() => {
        if (query.length > 0) {
            performSearch(query);
            showSuggestions(query);
        } else {
            hideResults();
            elements.suggestions.classList.remove('show');
        }
    }, 300);
}

// 处理搜索框获得焦点
function handleSearchFocus() {
    if (state.searchQuery.length > 0) {
        showSuggestions(state.searchQuery);
    }
}

// 处理搜索框失去焦点
function handleSearchBlur() {
    // 延迟隐藏，以便点击建议项
    setTimeout(() => {
        elements.suggestions.classList.remove('show');
    }, 200);
}

// 执行搜索
function performSearch(query) {
    const lowerQuery = query.toLowerCase();

    // 搜索匹配
    const results = taxCodeData.filter(item => {
        return item.name.toLowerCase().includes(lowerQuery) ||
               item.code.includes(query) ||
               item.keywords.some(kw => kw.toLowerCase().includes(lowerQuery)) ||
               item.category.toLowerCase().includes(lowerQuery);
    });

    // 计算相关度分数
    const scoredResults = results.map(item => {
        let score = 0;
        const nameLower = item.name.toLowerCase();

        // 完全匹配名称
        if (nameLower === lowerQuery) score += 100;
        // 名称开头匹配
        else if (nameLower.startsWith(lowerQuery)) score += 80;
        // 名称包含
        else if (nameLower.includes(lowerQuery)) score += 60;
        // 编码匹配
        if (item.code.includes(query)) score += 50;
        // 关键词匹配
        item.keywords.forEach(kw => {
            if (kw.toLowerCase() === lowerQuery) score += 70;
            else if (kw.toLowerCase().includes(lowerQuery)) score += 40;
        });
        // 分类匹配
        if (item.category.toLowerCase().includes(lowerQuery)) score += 30;

        return { ...item, score };
    });

    // 按相关度排序
    state.searchResults = scoredResults.sort((a, b) => b.score - a.score);
    renderResults();
}

// 显示搜索建议
function showSuggestions(query) {
    const lowerQuery = query.toLowerCase();
    const suggestions = taxCodeData.filter(item => {
        return item.name.toLowerCase().includes(lowerQuery) ||
               item.keywords.some(kw => kw.toLowerCase().includes(lowerQuery));
    }).slice(0, 8);

    if (suggestions.length === 0) {
        elements.suggestions.classList.remove('show');
        return;
    }

    elements.suggestions.innerHTML = suggestions.map(item => `
        <div class="suggestion-item" data-code="${item.code}">
            <span class="name">${item.name}</span>
            <span class="code">${item.code.substring(0, 10)}...</span>
            <span class="category">${item.category}</span>
        </div>
    `).join('');

    elements.suggestions.classList.add('show');

    // 绑定建议项点击
    elements.suggestions.querySelectorAll('.suggestion-item').forEach(item => {
        item.addEventListener('mousedown', (e) => {
            e.preventDefault();
            const code = item.dataset.code;
            showDetail(code);
        });
    });
}

// 渲染搜索结果
function renderResults() {
    if (state.searchResults.length === 0) {
        elements.resultsSection.style.display = 'block';
        elements.resultsList.innerHTML = `
            <div class="no-results">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8"/>
                    <path d="M21 21l-4.35-4.35"/>
                </svg>
                <p>未找到相关税收编码</p>
            </div>
        `;
        elements.resultCount.textContent = '';
        return;
    }

    elements.resultsSection.style.display = 'block';
    elements.resultCount.textContent = `(共 ${state.searchResults.length} 条)`;

    elements.resultsList.innerHTML = state.searchResults.map(item => `
        <div class="result-card" data-code="${item.code}">
            <div class="result-info">
                <div class="name">${item.name}</div>
                <div class="code">${item.code}</div>
                <span class="category-tag">${item.category}</span>
            </div>
            <div class="result-meta">
                <div class="tax-rate">${item.taxRate}</div>
            </div>
        </div>
    `).join('');
}

// 隐藏结果
function hideResults() {
    elements.resultsSection.style.display = 'none';
    elements.resultsList.innerHTML = '';
    state.searchResults = [];
}

// 处理清除搜索
function handleClearSearch() {
    elements.searchInput.value = '';
    state.searchQuery = '';
    hideResults();
    elements.suggestions.classList.remove('show');
    elements.searchInput.focus();
}

// 处理分类点击
function handleCategoryClick(e) {
    const categoryItem = e.target.closest('.category-item');
    if (!categoryItem) return;

    const categoryName = categoryItem.dataset.category;
    state.selectedCategory = categoryName;

    // 筛选该分类下的商品
    const results = taxCodeData.filter(item => item.category === categoryName);
    state.searchResults = results;

    // 更新搜索框
    elements.searchInput.value = categoryName;
    state.searchQuery = categoryName;

    renderResults();

    // 滚动到结果区域
    elements.resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// 处理项目点击
function handleItemClick(e) {
    const item = e.target.closest('[data-code]');
    if (!item) return;

    const code = item.dataset.code;
    showDetail(code);
}

// 处理排序变化
function handleSortChange(e) {
    const sortBy = e.target.value;

    switch (sortBy) {
        case 'code':
            state.searchResults.sort((a, b) => a.code.localeCompare(b.code));
            break;
        case 'name':
            state.searchResults.sort((a, b) => a.name.localeCompare(b.name));
            break;
        case 'taxRate':
            state.searchResults.sort((a, b) => b.taxRate - a.taxRate);
            break;
        case 'relevance':
        default:
            state.searchResults.sort((a, b) => (b.score || 0) - (a.score || 0));
            break;
    }

    renderResults();
}

// 显示详情页
function showDetail(code) {
    const item = taxCodeData.find(d => d.code === code);
    if (!item) return;

    state.currentDetail = item;
    state.currentView = 'detail';

    // 更新详情页内容
    elements.detailCategory.textContent = item.category;
    elements.detailName.textContent = item.name;
    elements.detailCode.textContent = item.code;
    elements.detailTaxRate.textContent = item.taxRate;
    elements.detailDescription.textContent = item.description;

    // 渲染关键词
    elements.detailKeywords.innerHTML = item.keywords.map(kw => `
        <span class="keyword-tag">${kw}</span>
    `).join('');

    // 渲染相关推荐
    if (item.relatedCodes && item.relatedCodes.length > 0) {
        const relatedItems = item.relatedCodes
            .map(code => taxCodeData.find(d => d.code === code))
            .filter(Boolean);

        if (relatedItems.length > 0) {
            elements.relatedSection.style.display = 'block';
            elements.relatedList.innerHTML = relatedItems.map(related => `
                <div class="related-item" data-code="${related.code}">
                    <div class="name">${related.name}</div>
                    <div class="code">${related.code}</div>
                </div>
            `).join('');
        } else {
            elements.relatedSection.style.display = 'none';
        }
    } else {
        elements.relatedSection.style.display = 'none';
    }

    // 切换页面
    elements.searchPage.classList.remove('active');
    elements.detailPage.classList.add('active');

    // 滚动到顶部
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 处理返回
function handleBack() {
    state.currentView = 'search';
    state.currentDetail = null;

    elements.detailPage.classList.remove('active');
    elements.searchPage.classList.add('active');
}

// 处理复制
function handleCopy() {
    const code = state.currentDetail?.code;
    if (!code) return;

    navigator.clipboard.writeText(code).then(() => {
        showToast('编码已复制到剪贴板');
    }).catch(() => {
        // 降级方案
        const textArea = document.createElement('textarea');
        textArea.value = code;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showToast('编码已复制到剪贴板');
    });
}

// 显示Toast提示
function showToast(message) {
    elements.toast.textContent = message;
    elements.toast.classList.add('show');

    setTimeout(() => {
        elements.toast.classList.remove('show');
    }, 2000);
}

// 键盘导航
function handleKeyNav(e) {
    if (e.key === 'Enter' && state.searchQuery.length > 0) {
        performSearch(state.searchQuery);
        elements.suggestions.classList.remove('show');
    }

    if (e.key === 'Escape') {
        elements.suggestions.classList.remove('show');
    }
}

// 启动应用
document.addEventListener('DOMContentLoaded', init);
