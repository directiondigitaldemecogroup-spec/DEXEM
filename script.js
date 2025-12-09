// Dashboard Call Tracking - Script Principal
let dashboardData = null;
let charts = {};

// Couleurs du thème
const colors = {
    primary: '#65b32e',
    primaryDark: '#529626',
    primaryLight: '#7ac945',
    secondary: '#9ca3af',
    success: '#65b32e',
    warning: '#f59e0b',
    danger: '#ef4444',
    purple: '#8b5cf6',
    pink: '#ec4899',
    teal: '#14b8a6',
    grey: '#6b7280'
};

// Charger les données
async function loadData() {
    try {
        const response = await fetch('dashboard_data.json');
        dashboardData = await response.json();
        initializeDashboard();
    } catch (error) {
        console.error('Erreur de chargement des données:', error);
        alert('Erreur lors du chargement des données.');
    }
}

// Initialiser le dashboard
function initializeDashboard() {
    populateFilters();
    createSpamGlobalChart();
    createSpamCanalChart();
    createDecrocheChart();
    createDecrocheJourChart();
    createDecrocheHeureChart();
    populatePerfAccordion();
    populateVolumeAccordion();
    updateGlobalStats();
    setupEventListeners();
}

// Remplir les filtres
function populateFilters() {
    const agenceSelect = document.getElementById('agenceFilter');
    const canalSelect = document.getElementById('canalFilter');
    
    dashboardData.liste_agences.forEach(agence => {
        const option = document.createElement('option');
        option.value = agence;
        option.textContent = agence;
        agenceSelect.appendChild(option);
    });
    
    dashboardData.liste_canaux.forEach(canal => {
        const option = document.createElement('option');
        option.value = canal;
        option.textContent = canal;
        canalSelect.appendChild(option);
    });
}

// Graphique: Spam Global
function createSpamGlobalChart() {
    const ctx = document.getElementById('spamGlobalChart').getContext('2d');
    const data = dashboardData.spam_global_mois;
    
    charts.spamGlobal = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(d => d.mois),
            datasets: [{
                label: 'Taux de Spam (%)',
                data: data.map(d => d.taux_spam),
                borderColor: colors.danger,
                backgroundColor: colors.danger + '20',
                tension: 0.4,
                fill: true,
                pointRadius: 6,
                pointHoverRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: true, position: 'top' },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const index = context.dataIndex;
                            const spam = data[index].spam;
                            const total = data[index].total;
                            return [
                                `Taux: ${context.parsed.y.toFixed(2)}%`,
                                `Spam: ${spam}/${total}`
                            ];
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { callback: value => value + '%' }
                }
            }
        }
    });
}

// Graphique: Spam par Canal
function createSpamCanalChart() {
    const ctx = document.getElementById('spamCanalChart').getContext('2d');
    const data = dashboardData.spam_par_canal_mois;
    
    const canaux = [...new Set(data.map(d => d.canal))];
    const mois = [...new Set(data.map(d => d.mois))];
    
    const datasets = canaux.map((canal, index) => {
        const canalData = data.filter(d => d.canal === canal);
        const dataByMois = mois.map(m => {
            const item = canalData.find(d => d.mois === m);
            return item ? item.taux_spam : 0;
        });
        
        const colorPalette = [colors.primary, colors.secondary, colors.warning, colors.grey];
        
        return {
            label: canal,
            data: dataByMois,
            borderColor: colorPalette[index % colorPalette.length],
            backgroundColor: colorPalette[index % colorPalette.length] + '20',
            tension: 0.4,
            fill: false,
            pointRadius: 5,
            pointHoverRadius: 7
        };
    });
    
    charts.spamCanal = new Chart(ctx, {
        type: 'line',
        data: { labels: mois, datasets: datasets },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { display: true, position: 'top' } },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { callback: value => value + '%' }
                }
            }
        }
    });
}

// Graphique: Taux de Décroché
function createDecrocheChart(agence = 'all', canal = 'all') {
    const ctx = document.getElementById('decrocheChart').getContext('2d');
    
    let data;
    if (agence === 'all' && canal === 'all') {
        data = dashboardData.decroche_global_mois;
    } else {
        data = filterDecrocheData(agence, canal);
    }
    
    if (charts.decroche) charts.decroche.destroy();
    
    charts.decroche = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(d => d.mois),
            datasets: [{
                label: 'Taux de Décroché (%)',
                data: data.map(d => d.taux_decroche),
                backgroundColor: colors.success + 'CC',
                borderColor: colors.success,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: true, position: 'top' },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const index = context.dataIndex;
                            const decroche = data[index].decroche;
                            const total = data[index].total;
                            return [
                                `Taux: ${context.parsed.y.toFixed(2)}%`,
                                `Décrochés: ${decroche}/${total}`
                            ];
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: { callback: value => value + '%' }
                }
            }
        }
    });
    
    updateDecrocheStats(data);
}

// Filtrer les données de décroché
function filterDecrocheData(agence, canal) {
    let filtered = dashboardData.decroche_par_agence_canal_mois;
    
    if (agence !== 'all') filtered = filtered.filter(d => d.agence === agence);
    if (canal !== 'all') filtered = filtered.filter(d => d.canal === canal);
    
    const mois = [...new Set(filtered.map(d => d.mois))].sort();
    const result = mois.map(m => {
        const monthData = filtered.filter(d => d.mois === m);
        const totalDecroche = monthData.reduce((sum, d) => sum + d.decroche, 0);
        const totalCalls = monthData.reduce((sum, d) => sum + d.total, 0);
        return {
            mois: m,
            decroche: totalDecroche,
            total: totalCalls,
            taux_decroche: totalCalls > 0 ? (totalDecroche / totalCalls * 100) : 0
        };
    });
    
    return result;
}

// NOUVEAU: Graphique par jour de la semaine
function createDecrocheJourChart() {
    const ctx = document.getElementById('decrocheJourChart').getContext('2d');
    const data = dashboardData.decroche_par_jour;
    
    charts.decrocheJour = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(d => d.jour_fr),
            datasets: [{
                label: 'Taux de Décroché (%)',
                data: data.map(d => d.taux_decroche),
                backgroundColor: colors.primary + 'CC',
                borderColor: colors.primary,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const index = context.dataIndex;
                            return [
                                `Taux: ${context.parsed.y.toFixed(2)}%`,
                                `Décrochés: ${data[index].decroche}/${data[index].total}`
                            ];
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: { callback: value => value + '%' }
                }
            }
        }
    });
}

// NOUVEAU: Graphique par heure
function createDecrocheHeureChart() {
    const ctx = document.getElementById('decrocheHeureChart').getContext('2d');
    const data = dashboardData.decroche_par_heure;
    
    charts.decrocheHeure = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(d => d.heure + 'h'),
            datasets: [{
                label: 'Taux de Décroché (%)',
                data: data.map(d => d.taux_decroche),
                borderColor: colors.primaryDark,
                backgroundColor: colors.primary + '20',
                tension: 0.4,
                fill: true,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const index = context.dataIndex;
                            return [
                                `Taux: ${context.parsed.y.toFixed(2)}%`,
                                `Décrochés: ${data[index].decroche}/${data[index].total}`
                            ];
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: { callback: value => value + '%' }
                }
            }
        }
    });
}

// NOUVEAU: Accordéon Performance
function populatePerfAccordion() {
    const container = document.getElementById('perfAccordion');
    container.innerHTML = '';
    
    const hierarchy = dashboardData.hierarchy_perf;
    let rank = 0;
    
    Object.entries(hierarchy).forEach(([societe, socData]) => {
        rank++;
        const accordionItem = createAccordionItem(societe, socData, rank, 'perf');
        container.appendChild(accordionItem);
    });
}

// NOUVEAU: Accordéon Volume
function populateVolumeAccordion() {
    const container = document.getElementById('volumeAccordion');
    container.innerHTML = '';
    
    const hierarchy = dashboardData.hierarchy_volume;
    let rank = 0;
    
    Object.entries(hierarchy).forEach(([societe, socData]) => {
        rank++;
        const accordionItem = createAccordionItem(societe, socData, rank, 'volume');
        container.appendChild(accordionItem);
    });
}

// Créer un item d'accordéon
function createAccordionItem(societe, data, rank, type) {
    const item = document.createElement('div');
    item.className = 'accordion-item';
    
    const rankBadge = rank <= 3 ? `<span class="rank-badge rank-${rank}">${rank}</span>` : `<span class="rank-badge rank-other">${rank}</span>`;
    
    let statsHtml = '';
    if (type === 'perf') {
        const rateClass = getRateClass(data.taux_global);
        statsHtml = `
            <div class="accordion-stats">
                <div class="accordion-stat-item">
                    <span class="accordion-stat-label">Taux</span>
                    <span class="accordion-stat-value rate-badge ${rateClass}">${data.taux_global.toFixed(2)}%</span>
                </div>
                <div class="accordion-stat-item">
                    <span class="accordion-stat-label">Décrochés</span>
                    <span class="accordion-stat-value">${data.total_decroche.toLocaleString()}</span>
                </div>
                <div class="accordion-stat-item">
                    <span class="accordion-stat-label">Total</span>
                    <span class="accordion-stat-value">${data.total_appels.toLocaleString()}</span>
                </div>
            </div>
        `;
    } else {
        statsHtml = `
            <div class="accordion-stats">
                <div class="accordion-stat-item">
                    <span class="accordion-stat-label">Total Appels</span>
                    <span class="accordion-stat-value">${data.total.toLocaleString()}</span>
                </div>
            </div>
        `;
    }
    
    // Header
    const header = document.createElement('div');
    header.className = 'accordion-header';
    header.innerHTML = `
        <div class="accordion-title">
            ${rankBadge}
            <span class="company-badge">${societe}</span>
        </div>
        ${statsHtml}
        <span class="accordion-icon">▼</span>
    `;
    
    // Content
    const content = document.createElement('div');
    content.className = 'accordion-content';
    
    const body = document.createElement('div');
    body.className = 'accordion-body';
    
    // Stats par canal de la société
    body.innerHTML = createCanalStatsHtml(data.canaux, type);
    
    // Liste des agences
    const agencesList = document.createElement('div');
    agencesList.className = 'agences-list';
    
    data.agences.forEach(agence => {
        const agenceRow = createAgenceRow(agence, type);
        agencesList.appendChild(agenceRow);
    });
    
    body.appendChild(agencesList);
    content.appendChild(body);
    
    item.appendChild(header);
    item.appendChild(content);
    
    // Event
    header.addEventListener('click', () => toggleAccordion(header, content));
    
    return item;
}

// Créer les stats par canal
function createCanalStatsHtml(canaux, type) {
    let html = '<div class="canal-stats-grid">';
    
    const canauxOrder = ['GMB', 'Pages Jaunes', 'Store Locator', 'Autres'];
    
    canauxOrder.forEach(canal => {
        if (canaux[canal]) {
            const data = canaux[canal];
            if (type === 'perf') {
                html += `
                    <div class="canal-stat-card">
                        <div class="canal-stat-header">${canal}</div>
                        <div class="canal-stat-value">${data.taux.toFixed(1)}%</div>
                        <div class="canal-stat-detail">${data.decroche}/${data.total} décrochés</div>
                    </div>
                `;
            } else {
                html += `
                    <div class="canal-stat-card">
                        <div class="canal-stat-header">${canal}</div>
                        <div class="canal-stat-value">${data.toLocaleString()}</div>
                        <div class="canal-stat-detail">appels</div>
                    </div>
                `;
            }
        }
    });
    
    html += '</div>';
    return html;
}

// Créer une ligne d'agence
function createAgenceRow(agence, type) {
    const row = document.createElement('div');
    row.className = 'agence-row';
    
    const canauxOrder = ['GMB', 'Pages Jaunes', 'Store Locator', 'Autres'];
    
    let html = `<div class="agence-name">${agence.nom}</div>`;
    
    canauxOrder.forEach(canal => {
        if (agence.canaux[canal]) {
            const data = agence.canaux[canal];
            if (type === 'perf') {
                html += `
                    <div class="agence-canal-value">
                        <span class="agence-canal-label">${canal}</span>
                        <span class="agence-canal-number">${data.decroche}/${data.total}</span>
                        <span class="agence-canal-taux">${data.taux.toFixed(1)}%</span>
                    </div>
                `;
            } else {
                html += `
                    <div class="agence-canal-value">
                        <span class="agence-canal-label">${canal}</span>
                        <span class="agence-canal-number">${data.toLocaleString()}</span>
                    </div>
                `;
            }
        } else {
            html += `<div class="agence-canal-value">-</div>`;
        }
    });
    
    if (type === 'perf') {
        const rateClass = getRateClass(agence.taux_global);
        html += `
            <div class="agence-canal-value">
                <span class="agence-canal-label">Total</span>
                <span class="rate-badge ${rateClass}">${agence.taux_global.toFixed(1)}%</span>
            </div>
        `;
    } else {
        html += `
            <div class="agence-canal-value">
                <span class="agence-canal-label">Total</span>
                <span class="agence-canal-number">${agence.total.toLocaleString()}</span>
            </div>
        `;
    }
    
    row.innerHTML = html;
    return row;
}

// Toggle accordéon
function toggleAccordion(header, content) {
    const isActive = header.classList.contains('active');
    
    header.classList.toggle('active');
    content.classList.toggle('active');
    
    const icon = header.querySelector('.accordion-icon');
    icon.classList.toggle('active');
}

// Classe de taux
function getRateClass(rate) {
    if (rate >= 90) return 'rate-excellent';
    if (rate >= 75) return 'rate-good';
    if (rate >= 60) return 'rate-average';
    return 'rate-poor';
}

// Mettre à jour les stats globales
function updateGlobalStats() {
    const totalSpam = dashboardData.spam_global_mois.reduce((sum, d) => sum + d.spam, 0);
    const totalCalls = dashboardData.spam_global_mois.reduce((sum, d) => sum + d.total, 0);
    const spamRate = (totalSpam / totalCalls * 100).toFixed(2);
    
    document.getElementById('spamGlobalRate').textContent = spamRate + '%';
    document.getElementById('totalCalls').textContent = totalCalls.toLocaleString();
    
    const totalDecroche = dashboardData.decroche_global_mois.reduce((sum, d) => sum + d.decroche, 0);
    const totalNonSpam = dashboardData.decroche_global_mois.reduce((sum, d) => sum + d.total, 0);
    const decrocheRate = (totalDecroche / totalNonSpam * 100).toFixed(2);
    
    document.getElementById('decrocheRate').textContent = decrocheRate + '%';
    document.getElementById('nonSpamCalls').textContent = totalNonSpam.toLocaleString();
}

// Mettre à jour les stats de décroché
function updateDecrocheStats(data) {
    const totalDecroche = data.reduce((sum, d) => sum + d.decroche, 0);
    const totalCalls = data.reduce((sum, d) => sum + d.total, 0);
    const rate = totalCalls > 0 ? (totalDecroche / totalCalls * 100).toFixed(2) : 0;
    
    document.getElementById('decrocheRate').textContent = rate + '%';
    document.getElementById('nonSpamCalls').textContent = totalCalls.toLocaleString();
}

// Configuration des événements
function setupEventListeners() {
    document.getElementById('agenceFilter').addEventListener('change', applyFilters);
    document.getElementById('canalFilter').addEventListener('change', applyFilters);
    document.getElementById('resetFilters').addEventListener('click', resetFilters);
    
    document.getElementById('searchPerf').addEventListener('input', (e) => {
        searchAccordion('perfAccordion', e.target.value);
    });
    
    document.getElementById('searchVolume').addEventListener('input', (e) => {
        searchAccordion('volumeAccordion', e.target.value);
    });
}

// Recherche dans les accordéons
function searchAccordion(containerId, searchTerm) {
    const container = document.getElementById(containerId);
    const items = container.querySelectorAll('.accordion-item');
    const term = searchTerm.toLowerCase();
    
    items.forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(term) ? '' : 'none';
    });
}

// Appliquer les filtres
function applyFilters() {
    const agence = document.getElementById('agenceFilter').value;
    const canal = document.getElementById('canalFilter').value;
    createDecrocheChart(agence, canal);
}

// Réinitialiser les filtres
function resetFilters() {
    document.getElementById('agenceFilter').value = 'all';
    document.getElementById('canalFilter').value = 'all';
    createDecrocheChart();
}

// Initialiser au chargement
document.addEventListener('DOMContentLoaded', loadData);
