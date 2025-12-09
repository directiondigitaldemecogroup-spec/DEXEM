// Dashboard Call Tracking - Script Principal
let dashboardData = null;
let charts = {};
let filteredData = null;

// Couleurs du thème
const colors = {
    primary: '#2563eb',
    secondary: '#3b82f6',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    purple: '#8b5cf6',
    pink: '#ec4899',
    teal: '#14b8a6'
};

// Charger les données
async function loadData() {
    try {
        const response = await fetch('dashboard_data.json');
        dashboardData = await response.json();
        initializeDashboard();
    } catch (error) {
        console.error('Erreur de chargement des données:', error);
        alert('Erreur lors du chargement des données. Veuillez vérifier que le fichier dashboard_data.json est présent.');
    }
}

// Initialiser le dashboard
function initializeDashboard() {
    // Remplir les filtres
    populateFilters();
    
    // Créer les graphiques
    createSpamGlobalChart();
    createSpamCanalChart();
    createDecrocheChart();
    createHeatmapChart();
    
    // Remplir les tableaux
    populatePerfTable();
    populateVolumeTable();
    populateCanauxTable();
    
    // Calculer les stats globales
    updateGlobalStats();
    
    // Événements
    setupEventListeners();
}

// Remplir les filtres
function populateFilters() {
    const agenceSelect = document.getElementById('agenceFilter');
    const canalSelect = document.getElementById('canalFilter');
    
    // Agences
    dashboardData.liste_agences.forEach(agence => {
        const option = document.createElement('option');
        option.value = agence;
        option.textContent = agence;
        agenceSelect.appendChild(option);
    });
    
    // Canaux
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
                legend: {
                    display: true,
                    position: 'top'
                },
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
                    ticks: {
                        callback: value => value + '%'
                    }
                }
            }
        }
    });
}

// Graphique: Spam par Canal
function createSpamCanalChart() {
    const ctx = document.getElementById('spamCanalChart').getContext('2d');
    const data = dashboardData.spam_par_canal_mois;
    
    // Grouper par canal
    const canaux = [...new Set(data.map(d => d.canal))];
    const mois = [...new Set(data.map(d => d.mois))];
    
    const datasets = canaux.map((canal, index) => {
        const canalData = data.filter(d => d.canal === canal);
        const dataByMois = mois.map(m => {
            const item = canalData.find(d => d.mois === m);
            return item ? item.taux_spam : 0;
        });
        
        const colorPalette = [colors.primary, colors.success, colors.warning, colors.purple];
        
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
        data: {
            labels: mois,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: value => value + '%'
                    }
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
    
    // Détruire le graphique existant
    if (charts.decroche) {
        charts.decroche.destroy();
    }
    
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
                legend: {
                    display: true,
                    position: 'top'
                },
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
                    ticks: {
                        callback: value => value + '%'
                    }
                }
            }
        }
    });
    
    // Mettre à jour les stats
    updateDecrocheStats(data);
}

// Filtrer les données de décroché
function filterDecrocheData(agence, canal) {
    let filtered = dashboardData.decroche_par_agence_canal_mois;
    
    if (agence !== 'all') {
        filtered = filtered.filter(d => d.agence === agence);
    }
    if (canal !== 'all') {
        filtered = filtered.filter(d => d.canal === canal);
    }
    
    // Regrouper par mois
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

// Graphique: Heatmap Jour/Heure
function createHeatmapChart() {
    const ctx = document.getElementById('heatmapChart').getContext('2d');
    const data = dashboardData.decroche_jour_heure;
    
    const jours = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
    const heures = Array.from({length: 24}, (_, i) => i);
    
    // Créer une matrice jour/heure
    const matrix = jours.map(jour => {
        return heures.map(heure => {
            const item = data.find(d => d.jour_fr === jour && d.heure === heure);
            return item ? item.taux_decroche : null;
        });
    });
    
    // Créer des datasets pour chaque jour
    const datasets = jours.map((jour, index) => {
        return {
            label: jour,
            data: heures.map(heure => {
                const item = data.find(d => d.jour_fr === jour && d.heure === heure);
                return item ? {x: heure, y: item.taux_decroche} : null;
            }).filter(d => d !== null),
            backgroundColor: getColorForDay(index),
            borderColor: getColorForDay(index),
            pointRadius: 5,
            pointHoverRadius: 8
        };
    });
    
    charts.heatmap = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'right'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return [
                                context.dataset.label,
                                `Heure: ${context.parsed.x}h`,
                                `Taux: ${context.parsed.y.toFixed(2)}%`
                            ];
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    min: 0,
                    max: 23,
                    ticks: {
                        stepSize: 1,
                        callback: value => value + 'h'
                    },
                    title: {
                        display: true,
                        text: 'Heure de la journée'
                    }
                },
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        callback: value => value + '%'
                    },
                    title: {
                        display: true,
                        text: 'Taux de Décroché'
                    }
                }
            }
        }
    });
}

function getColorForDay(index) {
    const colorPalette = [
        colors.primary,
        colors.success,
        colors.warning,
        colors.danger,
        colors.purple,
        colors.pink,
        colors.teal
    ];
    return colorPalette[index % colorPalette.length];
}

// Remplir le tableau de performance
function populatePerfTable() {
    const tbody = document.getElementById('perfTableBody');
    tbody.innerHTML = '';
    
    dashboardData.agences_perf.forEach((item, index) => {
        const row = document.createElement('tr');
        
        const rankClass = index < 3 ? `rank-${index + 1}` : 'rank-other';
        const rateClass = getRateClass(item.taux_decroche);
        
        row.innerHTML = `
            <td><span class="rank-badge ${rankClass}">${index + 1}</span></td>
            <td class="company-group">${item.societe}</td>
            <td>${item.agence}</td>
            <td>${item.decroche.toLocaleString()}</td>
            <td>${item.total.toLocaleString()}</td>
            <td><span class="rate-badge ${rateClass}">${item.taux_decroche.toFixed(2)}%</span></td>
        `;
        
        tbody.appendChild(row);
    });
}

// Remplir le tableau de volume
function populateVolumeTable() {
    const tbody = document.getElementById('volumeTableBody');
    tbody.innerHTML = '';
    
    dashboardData.agences_volume.forEach((item, index) => {
        const row = document.createElement('tr');
        
        const rankClass = index < 3 ? `rank-${index + 1}` : 'rank-other';
        
        row.innerHTML = `
            <td><span class="rank-badge ${rankClass}">${index + 1}</span></td>
            <td class="company-group">${item.societe}</td>
            <td>${item.agence}</td>
            <td><strong>${item.total.toLocaleString()}</strong></td>
        `;
        
        tbody.appendChild(row);
    });
}

// Remplir le tableau des canaux
function populateCanauxTable() {
    const tbody = document.getElementById('canauxTableBody');
    tbody.innerHTML = '';
    
    dashboardData.agences_volume.forEach(item => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td class="company-group">${item.societe}</td>
            <td>${item.agence}</td>
            <td>${(item.GMB || 0).toLocaleString()}</td>
            <td>${(item['Pages Jaunes'] || 0).toLocaleString()}</td>
            <td>${(item['Store Locator'] || 0).toLocaleString()}</td>
            <td>${(item.Autres || 0).toLocaleString()}</td>
            <td><strong>${item.total.toLocaleString()}</strong></td>
        `;
        
        tbody.appendChild(row);
    });
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
    // Taux spam global
    const totalSpam = dashboardData.spam_global_mois.reduce((sum, d) => sum + d.spam, 0);
    const totalCalls = dashboardData.spam_global_mois.reduce((sum, d) => sum + d.total, 0);
    const spamRate = (totalSpam / totalCalls * 100).toFixed(2);
    
    document.getElementById('spamGlobalRate').textContent = spamRate + '%';
    document.getElementById('totalCalls').textContent = totalCalls.toLocaleString();
    
    // Taux décroché
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
    // Filtres
    document.getElementById('agenceFilter').addEventListener('change', applyFilters);
    document.getElementById('canalFilter').addEventListener('change', applyFilters);
    document.getElementById('resetFilters').addEventListener('click', resetFilters);
    
    // Recherche dans les tableaux
    document.getElementById('searchPerf').addEventListener('input', (e) => {
        filterTable('perfTableBody', e.target.value);
    });
    
    document.getElementById('searchVolume').addEventListener('input', (e) => {
        filterTable('volumeTableBody', e.target.value);
    });
    
    document.getElementById('searchCanaux').addEventListener('input', (e) => {
        filterTable('canauxTableBody', e.target.value);
    });
    
    // Tabs
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.getAttribute('data-tab');
            switchTab(tabName);
        });
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

// Filtrer les lignes de tableau
function filterTable(tbodyId, searchTerm) {
    const tbody = document.getElementById(tbodyId);
    const rows = tbody.getElementsByTagName('tr');
    const term = searchTerm.toLowerCase();
    
    Array.from(rows).forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(term) ? '' : 'none';
    });
}

// Changer d'onglet
function switchTab(tabName) {
    // Désactiver tous les boutons et contenus
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Activer le bouton et contenu sélectionné
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`${tabName}Tab`).classList.add('active');
}

// Initialiser au chargement de la page
document.addEventListener('DOMContentLoaded', loadData);
