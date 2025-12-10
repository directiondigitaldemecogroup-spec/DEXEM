// Dashboard Call Tracking - Script Principal
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
    grey: '#6b7280',
    blue: '#3b82f6',
    purple: '#8b5cf6',
    teal: '#14b8a6'
};

// Charger les données
async function loadData() {
    try {
        const response = await fetch('dashboard_data.json');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        window.dashboardData = await response.json();
        console.log('✅ Données chargées');
        initializeDashboard();
    } catch (error) {
        console.error('❌ Erreur:', error);
        alert('Erreur lors du chargement des données. Vérifiez que dashboard_data.json est présent.');
    }
}

// Initialiser le dashboard
function initializeDashboard() {
    populateFilters();
    createSpamGlobalChart();
    createSpamCanalChart();
    populateSpamPJAnalysis(); // NOUVEAU
    createDecrocheChart();
    createDecrocheHeureMultiChart();
    populateMainAccordion();
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
            plugins: {
                legend: { display: true },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const index = context.dataIndex;
                            return [
                                `Taux: ${context.parsed.y.toFixed(2)}%`,
                                `Spam: ${data[index].spam}/${data[index].total}`
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
            pointRadius: 5
        };
    });
    
    charts.spamCanal = new Chart(ctx, {
        type: 'line',
        data: { labels: mois, datasets: datasets },
        options: {
            responsive: true,
            plugins: { legend: { display: true } },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { callback: value => value + '%' }
                }
            }
        }
    });
}

// Graphique: Taux de Décroché (LIGNE au lieu de barres)
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
        type: 'line',
        data: {
            labels: data.map(d => d.mois),
            datasets: [{
                label: 'Taux de Décroché (%)',
                data: data.map(d => d.taux_decroche),
                borderColor: colors.success,
                backgroundColor: colors.success + '20',
                tension: 0.4,
                fill: true,
                pointRadius: 6,
                pointHoverRadius: 8
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: true },
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
    
    updateDecrocheStats(data);
}

function filterDecrocheData(agence, canal) {
    let filtered = dashboardData.decroche_par_agence_canal_mois;
    
    if (agence !== 'all') filtered = filtered.filter(d => d.agence === agence);
    if (canal !== 'all') filtered = filtered.filter(d => d.canal === canal);
    
    const mois = [...new Set(filtered.map(d => d.mois))].sort();
    return mois.map(m => {
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
}

// NOUVEAU: Remplir l'analyse spam Pages Jaunes
function populateSpamPJAnalysis() {
    const data = dashboardData.spam_pj_analysis;
    
    if (!data) {
        console.warn('Pas de données spam PJ');
        return;
    }
    
    // 1. Nature du spam
    const natureTable = document.getElementById('spamNatureTable');
    natureTable.className = 'analysis-table';
    data.nature_spam.forEach(item => {
        const row = document.createElement('div');
        row.className = 'analysis-row';
        row.innerHTML = `
            <span class="analysis-label">${item.nature}</span>
            <span>
                <span class="analysis-value">${item.count.toLocaleString()}</span>
                <span class="analysis-percentage">(${item.percentage}%)</span>
            </span>
        `;
        natureTable.appendChild(row);
    });
    
    // 2. Type de numéro
    const typeTable = document.getElementById('spamTypeTable');
    typeTable.className = 'analysis-table';
    data.type_numero.forEach(item => {
        const row = document.createElement('div');
        row.className = 'analysis-row';
        row.innerHTML = `
            <span class="analysis-label">${item.type}</span>
            <span>
                <span class="analysis-value">${item.count.toLocaleString()}</span>
                <span class="analysis-percentage">(${item.percentage}%)</span>
            </span>
        `;
        typeTable.appendChild(row);
    });
    
    // 3. Durées moyennes
    const dureesDiv = document.getElementById('spamDurees');
    dureesDiv.innerHTML = `
        <div class="duree-stat">
            <span class="duree-label">Conversation</span>
            <span class="duree-value">${data.durees.conversation_moy.toFixed(2)}s</span>
        </div>
        <div class="duree-stat">
            <span class="duree-label">Sonnerie</span>
            <span class="duree-value">${data.durees.sonnerie_moy.toFixed(2)}s</span>
        </div>
        <div class="duree-stat">
            <span class="duree-label">Totale</span>
            <span class="duree-value">${data.durees.totale_moy.toFixed(2)}s</span>
        </div>
    `;
    
    // 4. Heures de pic
    const heuresPicDiv = document.getElementById('spamHeuresPic');
    heuresPicDiv.className = 'analysis-table';
    data.heures_pic.forEach(item => {
        const row = document.createElement('div');
        row.className = 'analysis-row';
        row.innerHTML = `
            <span class="analysis-label">${item.heure}h - ${item.heure + 1}h</span>
            <span class="analysis-value">${item.count.toLocaleString()} appels</span>
        `;
        heuresPicDiv.appendChild(row);
    });
    
    // 5. Top numéros
    const topNumerosDiv = document.getElementById('spamTopNumeros');
    topNumerosDiv.className = 'analysis-table';
    data.top_numeros.forEach((item, index) => {
        const row = document.createElement('div');
        row.className = 'analysis-row';
        row.innerHTML = `
            <span class="analysis-label">
                <span style="color: var(--text-secondary); font-weight: 400;">#${index + 1}</span>
                <span class="numero-spam">${item.numero}</span>
            </span>
            <span>
                <span class="analysis-value">${item.count.toLocaleString()}</span>
                <span class="analysis-percentage">(${item.percentage}%)</span>
            </span>
        `;
        topNumerosDiv.appendChild(row);
    });
}

// NOUVEAU: Graphique multi-courbes par heure (5 courbes pour Lun-Ven, 8h-20h)
function createDecrocheHeureMultiChart() {
    const ctx = document.getElementById('decrocheHeureChart').getContext('2d');
    const data = dashboardData.decroche_jour_heure;
    
    const jours = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
    const heures = Array.from({length: 13}, (_, i) => i + 8); // 8 à 20
    
    const colorMap = {
        'Lundi': colors.primary,
        'Mardi': colors.blue,
        'Mercredi': colors.purple,
        'Jeudi': colors.warning,
        'Vendredi': colors.teal
    };
    
    const datasets = jours.map(jour => {
        const jourData = data.filter(d => d.jour_fr === jour);
        const dataByHeure = heures.map(h => {
            const item = jourData.find(d => d.heure === h);
            return item ? item.taux_decroche : null;
        });
        
        return {
            label: jour,
            data: dataByHeure,
            borderColor: colorMap[jour],
            backgroundColor: colorMap[jour] + '20',
            tension: 0.4,
            fill: false,
            pointRadius: 4,
            pointHoverRadius: 6,
            borderWidth: 2
        };
    });
    
    charts.decrocheHeure = new Chart(ctx, {
        type: 'line',
        data: {
            labels: heures.map(h => h + 'h'),
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${context.parsed.y.toFixed(2)}%`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: { callback: value => value + '%' },
                    title: {
                        display: true,
                        text: 'Taux de Décroché (%)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Heure de la journée'
                    }
                }
            }
        }
    });
}

// NOUVEAU: Accordéon unique avec Volume + Performance
function populateMainAccordion() {
    const container = document.getElementById('mainAccordion');
    container.innerHTML = '';
    
    const hierarchy = dashboardData.hierarchy_combined;
    let rank = 0;
    
    Object.entries(hierarchy).forEach(([societe, socData]) => {
        rank++;
        const accordionItem = createCombinedAccordionItem(societe, socData, rank);
        container.appendChild(accordionItem);
    });
}

// Créer un item d'accordéon combiné
function createCombinedAccordionItem(societe, data, rank) {
    const item = document.createElement('div');
    item.className = 'accordion-item';
    
    const rankBadge = rank <= 3 ? 
        `<span class="rank-badge rank-${rank}">${rank}</span>` : 
        `<span class="rank-badge rank-other">${rank}</span>`;
    
    const rateClass = getRateClass(data.taux_global);
    
    // Header avec Volume ET Taux
    const header = document.createElement('div');
    header.className = 'accordion-header';
    header.innerHTML = `
        <div class="accordion-title">
            ${rankBadge}
            <span class="company-badge">${societe}</span>
        </div>
        <div class="accordion-stats">
            <div class="accordion-stat-item">
                <span class="accordion-stat-label">Volume</span>
                <span class="accordion-stat-value">${data.total_volume.toLocaleString()}</span>
            </div>
            <div class="accordion-stat-item">
                <span class="accordion-stat-label">Taux Décroché</span>
                <span class="accordion-stat-value rate-badge ${rateClass}">${data.taux_global.toFixed(1)}%</span>
            </div>
        </div>
        <span class="accordion-icon">▼</span>
    `;
    
    // Content
    const content = document.createElement('div');
    content.className = 'accordion-content';
    
    const body = document.createElement('div');
    body.className = 'accordion-body';
    
    // Stats par canal de la société (Volume + Performance)
    body.innerHTML = createCombinedCanalStatsHtml(data.volume_canaux, data.perf_canaux);
    
    // Liste des agences
    const agencesList = document.createElement('div');
    agencesList.className = 'agences-list';
    
    data.agences.forEach(agence => {
        const agenceRow = createCombinedAgenceRow(agence);
        agencesList.appendChild(agenceRow);
    });
    
    body.appendChild(agencesList);
    content.appendChild(body);
    
    item.appendChild(header);
    item.appendChild(content);
    
    header.addEventListener('click', () => toggleAccordion(header, content));
    
    return item;
}

// Stats par canal combinées (Volume + Perf)
function createCombinedCanalStatsHtml(volume, perf) {
    let html = '<div class="canal-stats-grid">';
    
    const canauxOrder = ['GMB', 'Pages Jaunes', 'Store Locator', 'Autres'];
    
    canauxOrder.forEach(canal => {
        const vol = volume[canal] || 0;
        const perfData = perf[canal];
        
        if (vol > 0) {
            html += `
                <div class="canal-stat-card">
                    <div class="canal-stat-header">${canal}</div>
                    <div class="canal-stat-value">${vol.toLocaleString()}</div>
                    <div class="canal-stat-detail">appels</div>
                    ${perfData ? `<div class="canal-stat-taux">${perfData.taux.toFixed(1)}% décroché</div>` : ''}
                </div>
            `;
        }
    });
    
    html += '</div>';
    return html;
}

// Ligne d'agence combinée
function createCombinedAgenceRow(agence) {
    const row = document.createElement('div');
    row.className = 'agence-row';
    
    const canauxOrder = ['GMB', 'Pages Jaunes', 'Store Locator', 'Autres'];
    const rateClass = getRateClass(agence.taux_global);
    
    let html = `<div class="agence-name">${agence.nom}</div>`;
    
    canauxOrder.forEach(canal => {
        const vol = agence.volume_canaux[canal] || 0;
        const perf = agence.perf_canaux[canal];
        
        if (vol > 0) {
            html += `
                <div class="agence-canal-value">
                    <span class="agence-canal-label">${canal}</span>
                    <span class="agence-canal-number">${vol.toLocaleString()}</span>
                    ${perf ? `<span class="agence-canal-taux">${perf.taux.toFixed(1)}%</span>` : ''}
                </div>
            `;
        } else {
            html += `<div class="agence-canal-value">-</div>`;
        }
    });
    
    html += `
        <div class="agence-canal-value">
            <span class="agence-canal-label">Total</span>
            <span class="agence-canal-number">${agence.total_volume.toLocaleString()}</span>
            <span class="rate-badge ${rateClass}">${agence.taux_global.toFixed(1)}%</span>
        </div>
    `;
    
    row.innerHTML = html;
    return row;
}

function toggleAccordion(header, content) {
    header.classList.toggle('active');
    content.classList.toggle('active');
    header.querySelector('.accordion-icon').classList.toggle('active');
}

function getRateClass(rate) {
    if (rate >= 90) return 'rate-excellent';
    if (rate >= 75) return 'rate-good';
    if (rate >= 60) return 'rate-average';
    return 'rate-poor';
}

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

function updateDecrocheStats(data) {
    const totalDecroche = data.reduce((sum, d) => sum + d.decroche, 0);
    const totalCalls = data.reduce((sum, d) => sum + d.total, 0);
    const rate = totalCalls > 0 ? (totalDecroche / totalCalls * 100).toFixed(2) : 0;
    
    document.getElementById('decrocheRate').textContent = rate + '%';
    document.getElementById('nonSpamCalls').textContent = totalCalls.toLocaleString();
}

function setupEventListeners() {
    document.getElementById('agenceFilter').addEventListener('change', applyFilters);
    document.getElementById('canalFilter').addEventListener('change', applyFilters);
    document.getElementById('resetFilters').addEventListener('click', resetFilters);
    
    document.getElementById('searchTable').addEventListener('input', (e) => {
        searchAccordion('mainAccordion', e.target.value);
    });
}

function searchAccordion(containerId, searchTerm) {
    const container = document.getElementById(containerId);
    const items = container.querySelectorAll('.accordion-item');
    const term = searchTerm.toLowerCase();
    
    items.forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(term) ? '' : 'none';
    });
}

function applyFilters() {
    const agence = document.getElementById('agenceFilter').value;
    const canal = document.getElementById('canalFilter').value;
    createDecrocheChart(agence, canal);
}

function resetFilters() {
    document.getElementById('agenceFilter').value = 'all';
    document.getElementById('canalFilter').value = 'all';
    createDecrocheChart();
}

document.addEventListener('DOMContentLoaded', loadData);
