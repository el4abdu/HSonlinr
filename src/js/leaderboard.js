/**
 * Shadow Heist Online - Leaderboard
 * Manages the game leaderboard and player rankings
 */

// Leaderboard Module
const Leaderboard = (function() {
    // Leaderboard data
    let leaderboardData = [];
    let isInitialized = false;
    let currentFilter = 'win_rate';
    let currentPage = 1;
    let itemsPerPage = 20;
    let totalPlayers = 0;
    let currentUserRank = null;
    
    // DOM cache
    let leaderboardTable = null;
    let topPlayersContainer = null;
    let paginationContainer = null;
    let filtersContainer = null;
    
    /**
     * Initialize leaderboard
     * @param {Object} options - Configuration options
     */
    function init(options = {}) {
        console.log("Initializing leaderboard");
        
        // Set options
        if (options.itemsPerPage) {
            itemsPerPage = options.itemsPerPage;
        }
        
        // Check if Firebase is available
        if (!window.firebase || !window.FirebaseService) {
            console.error("Firebase not available. Leaderboard cannot initialize.");
            return;
        }
        
        // Cache DOM elements
        cacheDOM();
        
        // Load initial data
        loadLeaderboardData();
        
        // Set up event listeners
        setupEventListeners();
        
        isInitialized = true;
    }
    
    /**
     * Cache DOM elements
     */
    function cacheDOM() {
        leaderboardTable = document.getElementById('leaderboard-table');
        topPlayersContainer = document.getElementById('top-players');
        paginationContainer = document.getElementById('leaderboard-pagination');
        filtersContainer = document.getElementById('leaderboard-filters');
    }
    
    /**
     * Set up event listeners
     */
    function setupEventListeners() {
        if (filtersContainer) {
            filtersContainer.addEventListener('click', handleFilterClick);
        }
        
        if (paginationContainer) {
            paginationContainer.addEventListener('click', handlePaginationClick);
        }
        
        // Listen for profile updates to refresh user rank
        document.addEventListener('profile-loaded', () => {
            findCurrentUserRank();
        });
    }
    
    /**
     * Handle filter click
     * @param {Event} event - Click event
     */
    function handleFilterClick(event) {
        const filterBtn = event.target.closest('.filter-btn');
        if (!filterBtn) return;
        
        // Get filter value
        const filter = filterBtn.dataset.filter;
        if (!filter) return;
        
        // Update active filter
        setFilter(filter);
    }
    
    /**
     * Handle pagination click
     * @param {Event} event - Click event
     */
    function handlePaginationClick(event) {
        const pageBtn = event.target.closest('.page-btn');
        if (!pageBtn) return;
        
        // Get page number
        const page = parseInt(pageBtn.dataset.page);
        if (isNaN(page)) return;
        
        // Update current page
        setPage(page);
    }
    
    /**
     * Load leaderboard data
     */
    function loadLeaderboardData() {
        console.log("Loading leaderboard data");
        
        FirebaseService.getData('/leaderboard')
            .then(data => {
                if (!data) {
                    leaderboardData = [];
                    totalPlayers = 0;
                    renderLeaderboard();
                    return;
                }
                
                // Convert to array and add IDs
                const dataArray = Object.keys(data).map(key => ({
                    userId: key,
                    ...data[key]
                }));
                
                // Store data
                leaderboardData = dataArray;
                totalPlayers = dataArray.length;
                
                // Sort data by current filter
                sortLeaderboardData();
                
                // Find current user rank
                findCurrentUserRank();
                
                // Render the leaderboard
                renderLeaderboard();
                
                console.log(`Loaded ${dataArray.length} leaderboard entries`);
            })
            .catch(error => {
                console.error("Error loading leaderboard data:", error);
            });
    }
    
    /**
     * Sort leaderboard data based on current filter
     */
    function sortLeaderboardData() {
        // Sort based on filter
        switch (currentFilter) {
            case 'win_rate':
                leaderboardData.sort((a, b) => (b.stats?.winRate || 0) - (a.stats?.winRate || 0));
                break;
                
            case 'level':
                leaderboardData.sort((a, b) => (b.level || 1) - (a.level || 1));
                break;
                
            case 'xp':
                leaderboardData.sort((a, b) => (b.xp || 0) - (a.xp || 0));
                break;
                
            case 'kills':
                leaderboardData.sort((a, b) => (b.stats?.killCount || 0) - (a.stats?.killCount || 0));
                break;
                
            case 'kd_ratio':
                leaderboardData.sort((a, b) => (b.stats?.kd || 0) - (a.stats?.kd || 0));
                break;
                
            case 'games_played':
                leaderboardData.sort((a, b) => (b.stats?.gamesPlayed || 0) - (a.stats?.gamesPlayed || 0));
                break;
                
            case 'games_won':
                leaderboardData.sort((a, b) => (b.stats?.gamesWon || 0) - (a.stats?.gamesWon || 0));
                break;
                
            default:
                leaderboardData.sort((a, b) => (b.stats?.winRate || 0) - (a.stats?.winRate || 0));
        }
        
        // Add rank to each player
        leaderboardData.forEach((player, index) => {
            player.rank = index + 1;
        });
    }
    
    /**
     * Find current user's rank
     */
    function findCurrentUserRank() {
        const userId = FirebaseService.getCurrentUserId();
        if (!userId) return;
        
        // Find user in leaderboard
        const userEntry = leaderboardData.find(entry => entry.userId === userId);
        
        if (userEntry) {
            currentUserRank = userEntry.rank;
            
            // Dispatch event with user rank
            document.dispatchEvent(new CustomEvent('user-rank-updated', {
                detail: { rank: currentUserRank }
            }));
            
            console.log(`Current user rank: ${currentUserRank}`);
        } else {
            currentUserRank = null;
        }
    }
    
    /**
     * Render the leaderboard
     */
    function renderLeaderboard() {
        // Render top players
        renderTopPlayers();
        
        // Render table
        renderTable();
        
        // Render pagination
        renderPagination();
        
        // Update active filter
        updateActiveFilter();
    }
    
    /**
     * Render top players section
     */
    function renderTopPlayers() {
        if (!topPlayersContainer) return;
        
        // Get top 3 players
        const topPlayers = leaderboardData.slice(0, 3);
        
        let html = '';
        
        // Generate HTML for each top player
        topPlayers.forEach((player, index) => {
            const rank = index + 1;
            const rankClass = `rank-${rank}`;
            
            html += `
                <div class="top-player ${rankClass}">
                    <div class="player-rank">#${rank}</div>
                    <div class="player-avatar">
                        <img src="assets/avatars/avatar${player.avatarId || 1}.png" alt="Avatar">
                    </div>
                    <div class="player-info">
                        <div class="player-name">${player.username || 'Unknown'}</div>
                        <div class="player-level">Level ${player.level || 1}</div>
                        <div class="player-stat">${getFilterStat(player, currentFilter)}</div>
                    </div>
                </div>
            `;
        });
        
        // Fill empty slots if needed
        for (let i = topPlayers.length; i < 3; i++) {
            const rank = i + 1;
            const rankClass = `rank-${rank}`;
            
            html += `
                <div class="top-player ${rankClass} empty">
                    <div class="player-rank">#${rank}</div>
                    <div class="player-avatar">
                        <img src="assets/avatars/avatar1.png" alt="Avatar">
                    </div>
                    <div class="player-info">
                        <div class="player-name">-</div>
                        <div class="player-level">-</div>
                        <div class="player-stat">-</div>
                    </div>
                </div>
            `;
        }
        
        topPlayersContainer.innerHTML = html;
    }
    
    /**
     * Render leaderboard table
     */
    function renderTable() {
        if (!leaderboardTable) return;
        
        // Calculate pagination
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = Math.min(startIndex + itemsPerPage, leaderboardData.length);
        
        // Get current page data
        const pageData = leaderboardData.slice(startIndex, endIndex);
        
        // Get current user ID
        const userId = FirebaseService.getCurrentUserId();
        
        let tableHtml = `
            <thead>
                <tr>
                    <th>Rank</th>
                    <th>Player</th>
                    <th>Level</th>
                    <th class="stat-col">${getFilterLabel(currentFilter)}</th>
                    <th>Games</th>
                </tr>
            </thead>
            <tbody>
        `;
        
        // Generate rows
        if (pageData.length === 0) {
            tableHtml += `
                <tr class="empty-row">
                    <td colspan="5">No players found</td>
                </tr>
            `;
        } else {
            pageData.forEach(player => {
                const isCurrentUser = player.userId === userId;
                const userClass = isCurrentUser ? 'current-user' : '';
                
                tableHtml += `
                    <tr class="${userClass}">
                        <td class="rank-cell">#${player.rank}</td>
                        <td class="player-cell">
                            <div class="player-avatar">
                                <img src="assets/avatars/avatar${player.avatarId || 1}.png" alt="Avatar">
                            </div>
                            <span>${player.username || 'Unknown'}</span>
                        </td>
                        <td class="level-cell">${player.level || 1}</td>
                        <td class="stat-cell">${getFilterStat(player, currentFilter)}</td>
                        <td class="games-cell">${player.stats?.gamesPlayed || 0}</td>
                    </tr>
                `;
            });
        }
        
        tableHtml += '</tbody>';
        
        leaderboardTable.innerHTML = tableHtml;
    }
    
    /**
     * Render pagination controls
     */
    function renderPagination() {
        if (!paginationContainer) return;
        
        // Calculate total pages
        const totalPages = Math.ceil(totalPlayers / itemsPerPage);
        
        // Don't show pagination if only one page
        if (totalPages <= 1) {
            paginationContainer.innerHTML = '';
            return;
        }
        
        let paginationHtml = '';
        
        // Previous button
        paginationHtml += `
            <button class="page-btn prev ${currentPage === 1 ? 'disabled' : ''}" 
                    data-page="${Math.max(1, currentPage - 1)}">
                <i class="fas fa-chevron-left"></i>
            </button>
        `;
        
        // Page buttons
        const maxVisiblePages = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
        
        // Adjust if we're near the end
        if (endPage - startPage + 1 < maxVisiblePages && startPage > 1) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }
        
        // First page button
        if (startPage > 1) {
            paginationHtml += `
                <button class="page-btn" data-page="1">1</button>
            `;
            
            if (startPage > 2) {
                paginationHtml += `<span class="page-ellipsis">...</span>`;
            }
        }
        
        // Numbered pages
        for (let i = startPage; i <= endPage; i++) {
            const activeClass = i === currentPage ? 'active' : '';
            paginationHtml += `
                <button class="page-btn ${activeClass}" data-page="${i}">${i}</button>
            `;
        }
        
        // Last page button
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                paginationHtml += `<span class="page-ellipsis">...</span>`;
            }
            
            paginationHtml += `
                <button class="page-btn" data-page="${totalPages}">${totalPages}</button>
            `;
        }
        
        // Next button
        paginationHtml += `
            <button class="page-btn next ${currentPage === totalPages ? 'disabled' : ''}" 
                    data-page="${Math.min(totalPages, currentPage + 1)}">
                <i class="fas fa-chevron-right"></i>
            </button>
        `;
        
        paginationContainer.innerHTML = paginationHtml;
    }
    
    /**
     * Update active filter highlights
     */
    function updateActiveFilter() {
        if (!filtersContainer) return;
        
        // Remove active class from all filters
        const filters = filtersContainer.querySelectorAll('.filter-btn');
        filters.forEach(filter => {
            filter.classList.remove('active');
        });
        
        // Add active class to current filter
        const activeFilter = filtersContainer.querySelector(`.filter-btn[data-filter="${currentFilter}"]`);
        if (activeFilter) {
            activeFilter.classList.add('active');
        }
    }
    
    /**
     * Set current filter and refresh leaderboard
     * @param {string} filter - Filter to set
     */
    function setFilter(filter) {
        if (filter === currentFilter) return;
        
        console.log(`Setting leaderboard filter: ${filter}`);
        
        currentFilter = filter;
        currentPage = 1;
        
        // Resort data
        sortLeaderboardData();
        
        // Find current user rank
        findCurrentUserRank();
        
        // Render leaderboard
        renderLeaderboard();
    }
    
    /**
     * Set current page and refresh leaderboard
     * @param {number} page - Page number to set
     */
    function setPage(page) {
        if (page === currentPage) return;
        
        console.log(`Setting leaderboard page: ${page}`);
        
        currentPage = page;
        
        // Render leaderboard table and pagination
        renderTable();
        renderPagination();
    }
    
    /**
     * Get the display value for a filter
     * @param {Object} player - Player data
     * @param {string} filter - Filter type
     * @return {string} - Formatted stat value
     */
    function getFilterStat(player, filter) {
        switch (filter) {
            case 'win_rate':
                return `${(player.stats?.winRate || 0).toFixed(1)}%`;
                
            case 'level':
                return `Level ${player.level || 1}`;
                
            case 'xp':
                return `${player.xp || 0} XP`;
                
            case 'kills':
                return `${player.stats?.killCount || 0} kills`;
                
            case 'kd_ratio':
                return `${(player.stats?.kd || 0).toFixed(2)} K/D`;
                
            case 'games_played':
                return `${player.stats?.gamesPlayed || 0} games`;
                
            case 'games_won':
                return `${player.stats?.gamesWon || 0} wins`;
                
            default:
                return `${(player.stats?.winRate || 0).toFixed(1)}%`;
        }
    }
    
    /**
     * Get the display label for a filter
     * @param {string} filter - Filter type
     * @return {string} - Filter label
     */
    function getFilterLabel(filter) {
        switch (filter) {
            case 'win_rate':
                return 'Win Rate';
                
            case 'level':
                return 'Level';
                
            case 'xp':
                return 'XP';
                
            case 'kills':
                return 'Kills';
                
            case 'kd_ratio':
                return 'K/D Ratio';
                
            case 'games_played':
                return 'Games';
                
            case 'games_won':
                return 'Wins';
                
            default:
                return 'Win Rate';
        }
    }
    
    /**
     * Refresh leaderboard data and update UI
     */
    function refresh() {
        loadLeaderboardData();
    }
    
    /**
     * Get current user's rank
     * @return {number|null} - User's rank or null if not ranked
     */
    function getCurrentUserRank() {
        return currentUserRank;
    }
    
    /**
     * Get top players
     * @param {number} count - Number of top players to get
     * @return {Array} - Array of top players
     */
    function getTopPlayers(count = 10) {
        return leaderboardData.slice(0, count);
    }
    
    // Public API
    return {
        init,
        refresh,
        setFilter,
        setPage,
        getCurrentUserRank,
        getTopPlayers
    };
})();

// Initialize leaderboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Initialize after Firebase is ready
    if (window.FirebaseService) {
        // Don't auto-initialize, wait for explicit init call with options
    } else {
        // Wait for Firebase to initialize
        document.addEventListener('firebase-ready', () => {
            // Don't auto-initialize, wait for explicit init call with options
        });
    }
    
    // Make available globally
    window.Leaderboard = Leaderboard;
}); 