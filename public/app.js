// Constants
const SCOPE_US = 'usa';
const SCOPE_WORLD = 'world';
const SCOPE_EU = 'europe';

// State Management
let currentScope = SCOPE_US;
let visitedStates = JSON.parse(localStorage.getItem('visited_states')) || [];
// Default countries if none selected yet
let defaultCountries = ["Austria", "Belgium", "Czechia", "Denmark", "France", "Germany", "Greece",
    "Hungary", "Iceland", "Ireland", "Italy", "Netherlands", "Portugal",
    "Slovak Republic", "Slovenia", "Spain", "Switzerland", "United Kingdom",
    "United States", "Canada", "Egypt", "Japan", "New Zealand", "Tunisia", "Turkey"];
let visitedCountries = JSON.parse(localStorage.getItem('visited_countries')) || defaultCountries;

// DOM Elements
const scopeBtns = document.querySelectorAll('.scope-btn');
const placeList = document.getElementById('place-list');
const searchInput = document.getElementById('place-search');
const selectionHeading = document.getElementById('selection-heading');
const visitedCountEl = document.getElementById('visited-count');
const totalCountEl = document.getElementById('total-count');
const percentageEl = document.getElementById('visited-percentage');
const tooltip = document.getElementById('tooltip');
const mapContainer = document.getElementById('map-container');
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const sidebar = document.querySelector('.sidebar');

// Map Data
let geoData = {
    us: null,
    world: null
};

// Map State
let svg = null;
let g = null;
let zoom = null;
let path = null;
let currentFeatures = [];

// Initialize Application
async function initApp() {
    setupEventListeners();
    await loadData();
    renderMap();
    updateSidebar();
}

function setupEventListeners() {
    // Scope Toggle
    scopeBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            scopeBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentScope = e.target.dataset.scope;
            updateScopeUI();
            renderMap();
            updateSidebar();
        });
    });

    // Search
    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        Array.from(placeList.children).forEach(li => {
            const placeName = li.dataset.name.toLowerCase();
            if (placeName.includes(term)) {
                li.style.display = 'flex';
            } else {
                li.style.display = 'none';
            }
        });
    });

    // Window Resize
    window.addEventListener('resize', debounce(() => {
        if (svg) renderMap();

        // Auto-expand sidebar if resizing back to desktop
        if (window.innerWidth > 768) {
            sidebar.classList.remove('collapsed');
        }
    }, 250));

    // Mobile Menu Toggle
    if (mobileMenuBtn) {
        // Start collapsed on mobile
        if (window.innerWidth <= 768) {
            sidebar.classList.add('collapsed');
        }

        mobileMenuBtn.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');

            // Re-render map after transition to fill new space
            setTimeout(() => {
                if (svg) renderMap();
            }, 300);
        });
    }
}

// Load GeoJSON/TopoJSON Data
async function loadData() {
    try {
        // We use convenient free TopoJSON sources for geography
        const [usResponse, worldResponse] = await Promise.all([
            fetch('https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json'),
            fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
        ]);

        const usTopo = await usResponse.json();
        const worldTopo = await worldResponse.json();

        geoData.us = topojson.feature(usTopo, usTopo.objects.states).features;
        geoData.world = topojson.feature(worldTopo, worldTopo.objects.countries).features;

    } catch (error) {
        console.error("Error loading map data:", error);
    }
}

// --- Map Rendering logic ---
function renderMap() {
    // Clear previous map
    mapContainer.innerHTML = '';

    const width = mapContainer.clientWidth;
    const height = mapContainer.clientHeight;

    svg = d3.select('#map-container')
        .append('svg')
        .attr('width', width)
        .attr('height', height);

    g = svg.append('g');

    // Setup zoom behavior
    zoom = d3.zoom()
        .scaleExtent([1, 8])
        .on('zoom', (event) => {
            g.attr('transform', event.transform);
        });

    svg.call(zoom);

    // Determine projection and data based on scope
    let projection;

    if (currentScope === SCOPE_US) {
        currentFeatures = geoData.us;
        projection = d3.geoAlbersUsa().fitSize([width, height], { type: "FeatureCollection", features: currentFeatures });
    } else {
        currentFeatures = geoData.world;
        projection = d3.geoMercator();

        if (currentScope === SCOPE_EU) {
            // Rough bounding box for Europe
            projection.center([15, 50]).scale(width * 0.7).translate([width / 2, height / 2]);
        } else {
            // World
            projection.fitSize([width, height], { type: "FeatureCollection", features: currentFeatures });
        }
    }

    path = d3.geoPath().projection(projection);

    // Draw map
    g.selectAll('.land')
        .data(currentFeatures)
        .enter()
        .append('path')
        .attr('class', 'land')
        .attr('d', path)
        .attr('id', d => `feature-${normalizeId(getFeatureName(d))}`)
        .on('mouseover', showTooltip)
        .on('mousemove', moveTooltip)
        .on('mouseout', hideTooltip)
        .on('click', handleMapClick);

    updateMapColors();
}

function getFeatureName(d) {
    if (currentScope === SCOPE_US) {
        return d.properties.name;
    } else {
        // The 110m map sometimes uses different names, we try to standardize
        let name = d.properties.name;
        if (name === "United States of America") name = "United States";
        if (name === "Russian Federation") name = "Russia";
        // fallback to ID if no name found
        return name || d.id;
    }
}

function normalizeId(name) {
    if (!name) return 'unknown';
    return name.toString().toLowerCase().replace(/[^a-z0-9]/g, '-');
}

function updateMapColors() {
    if (!g) return;

    g.selectAll('.land').attr('class', 'land'); // Reset

    if (currentScope === SCOPE_US) {
        g.selectAll('.land').classed('visited-usa', d => visitedStates.includes(getFeatureName(d)));
    } else {
        const colorClass = currentScope === SCOPE_EU ? 'visited-eu' : 'visited-world';
        g.selectAll('.land').classed(colorClass, d => visitedCountries.includes(getFeatureName(d)));
    }
}

// --- Interaction Logic ---
function showTooltip(event, d) {
    const name = getFeatureName(d);
    let isVisited = false;

    if (currentScope === SCOPE_US) {
        isVisited = visitedStates.includes(name);
    } else {
        isVisited = visitedCountries.includes(name);
    }

    tooltip.style.opacity = '1';
    tooltip.innerHTML = `
        <div style="font-weight: bold;">${name}</div>
        <div style="color: ${isVisited ? '#10b981' : '#94a3b8'}; font-size: 0.75rem;">
            ${isVisited ? 'Visited ✓' : 'Not Visited'}
        </div>
    `;
}

function moveTooltip(event) {
    tooltip.style.left = (event.pageX + 15) + 'px';
    tooltip.style.top = (event.pageY - 15) + 'px';
}

function hideTooltip() {
    tooltip.style.opacity = '0';
}

function handleMapClick(event, d) {
    const name = getFeatureName(d);
    if (!name) return;
    togglePlace(name);
}

function togglePlace(name) {
    if (currentScope === SCOPE_US) {
        const index = visitedStates.indexOf(name);
        if (index > -1) {
            visitedStates.splice(index, 1);
        } else {
            visitedStates.push(name);
        }
        localStorage.setItem('visited_states', JSON.stringify(visitedStates));
    } else {
        const index = visitedCountries.indexOf(name);
        if (index > -1) {
            visitedCountries.splice(index, 1);
        } else {
            visitedCountries.push(name);
        }
        localStorage.setItem('visited_countries', JSON.stringify(visitedCountries));
    }

    updateMapColors();
    updateSidebar();
}

// --- Sidebar Logic ---
function updateScopeUI() {
    searchInput.value = '';
    if (currentScope === SCOPE_US) {
        selectionHeading.textContent = "🇺🇸 Select States & Territories Visited";
    } else if (currentScope === SCOPE_WORLD) {
        selectionHeading.textContent = "🌍 Select Countries Visited";
    } else {
        selectionHeading.textContent = "🇪🇺 Select Countries Visited";
    }
}

function updateSidebar() {
    placeList.innerHTML = '';

    let items = [];
    let visitedList = [];

    if (currentScope === SCOPE_US) {
        // Extract names from topology
        items = geoData.us.map(getFeatureName).filter(Boolean).sort();
        visitedList = visitedStates;
    } else {
        // World / Europe
        items = geoData.world.map(getFeatureName).filter(Boolean).sort();
        // Optional: Filter for Europe if we implement a strict list, 
        // for now we just show all countries in the sidebar even if zoomed to Europe.
        visitedList = visitedCountries;
    }

    // Update Stats
    const total = items.length;
    const visited = items.filter(i => visitedList.includes(i)).length;
    const pct = total === 0 ? 0 : ((visited / total) * 100).toFixed(1);

    // Update labels depending on scope
    const unitLabel = currentScope === SCOPE_US ? 'states and territories' : 'countries';

    document.getElementById('stats-text').innerHTML = `You have visited <strong id="visited-count">${visited}</strong> out of <span id="total-count">${total}</span> ${unitLabel} (<span id="visited-percentage">${pct}%</span>).`;

    // Render List
    items.forEach(placeName => {
        const isVisited = visitedList.includes(placeName);
        const li = document.createElement('li');
        li.className = `place-item ${isVisited ? 'selected' : ''}`;
        li.dataset.name = placeName;

        li.innerHTML = `
            <span>${placeName}</span>
            <div class="check-indicator">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </div>
        `;

        li.addEventListener('click', () => togglePlace(placeName));
        placeList.appendChild(li);
    });

    // re-apply search filter if any
    const term = searchInput.value.toLowerCase();
    if (term) {
        Array.from(placeList.children).forEach(li => {
            const placeName = li.dataset.name.toLowerCase();
            li.style.display = placeName.includes(term) ? 'flex' : 'none';
        });
    }
}

// Utils
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Start
document.addEventListener('DOMContentLoaded', initApp);
