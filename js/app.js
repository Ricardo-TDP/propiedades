// Global Variables
let allProperties = [];
let filteredProperties = [];
let currentPage = 1;
const itemsPerPage = 12;
let currentView = 'grid';

// DOM Elements
const propertiesContainer = document.getElementById('properties-container');
const paginationContainer = document.getElementById('pagination');
const searchInput = document.getElementById('search-input');
const filterArea = document.getElementById('filter-area');
const filterAgency = document.getElementById('filter-agency');
const filterType = document.getElementById('filter-type');
const filterStatus = document.getElementById('filter-status');
const priceMin = document.getElementById('price-min');
const priceMax = document.getElementById('price-max');
const activeFiltersContainer = document.getElementById('active-filters');
const modal = document.getElementById('add-property-modal');
const toast = document.getElementById('toast');

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadProperties();
    setupEventListeners();
});

// Load Properties from XML
function loadProperties() {
    fetch('data/properties.xml')
        .then(response => response.text())
        .then(xmlString => {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
            const propertyNodes = xmlDoc.querySelectorAll('property');
            
            allProperties = Array.from(propertyNodes).map(node => ({
                id: node.getAttribute('id'),
                name: node.querySelector('name').textContent,
                area: node.querySelector('area').textContent,
                location: node.querySelector('location').textContent,
                price: parseInt(node.querySelector('price').textContent),
                sqm: parseInt(node.querySelector('sqm').textContent),
                type: node.querySelector('type').textContent,
                status: node.querySelector('status').textContent,
                availability: node.querySelector('availability').textContent,
                agency: node.querySelector('agency').textContent,
                phone: node.querySelector('phone').textContent,
                email: node.querySelector('email').textContent,
                maps: node.querySelector('maps').textContent
            }));
            
            filteredProperties = [...allProperties];
            updateStats();
            populateFilters();
            renderProperties();
        })
        .catch(error => {
            console.error('Error loading properties:', error);
            showToast('Error al cargar las propiedades', 'error');
        });
}

// Update Statistics
function updateStats() {
    document.getElementById('total-properties').textContent = allProperties.length;
    
    const uniqueAgencies = new Set(allProperties.map(p => p.agency)).size;
    document.getElementById('total-agencies').textContent = uniqueAgencies;
    
    const uniqueAreas = new Set(allProperties.map(p => p.area)).size;
    document.getElementById('total-areas').textContent = uniqueAreas;
}

// Populate Filter Dropdowns
function populateFilters() {
    const areas = [...new Set(allProperties.map(p => p.area))].sort();
    const agencies = [...new Set(allProperties.map(p => p.agency))].sort();
    const types = [...new Set(allProperties.map(p => p.type))].sort();
    const statuses = [...new Set(allProperties.map(p => p.status))].sort();
    
    populateSelect(filterArea, areas);
    populateSelect(filterAgency, agencies);
    populateSelect(filterType, types);
    populateSelect(filterStatus, statuses);
}

function populateSelect(select, options) {
    const currentValue = select.value;
    select.innerHTML = '<option value="">Todos</option>';
    options.forEach(option => {
        const optionEl = document.createElement('option');
        optionEl.value = option;
        optionEl.textContent = option;
        select.appendChild(optionEl);
    });
    select.value = currentValue;
}

// Setup Event Listeners
function setupEventListeners() {
    // Search
    searchInput.addEventListener('input', debounce(applyFilters, 300));
    
    // Filters
    filterArea.addEventListener('change', applyFilters);
    filterAgency.addEventListener('change', applyFilters);
    filterType.addEventListener('change', applyFilters);
    filterStatus.addEventListener('change', applyFilters);
    priceMin.addEventListener('input', debounce(applyFilters, 300));
    priceMax.addEventListener('input', debounce(applyFilters, 300));
    
    // Filter buttons
    document.getElementById('btn-filter').addEventListener('click', applyFilters);
    document.getElementById('btn-clear').addEventListener('click', clearFilters);
    
    // View toggle
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentView = this.dataset.view;
            renderProperties();
        });
    });
    
    // Form submission
    document.getElementById('add-property-form').addEventListener('submit', handleAddProperty);
    
    // Close modal on outside click
    modal.addEventListener('click', function(e) {
        if (e.target === modal) closeModal();
    });
}

// Debounce function
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

// Apply Filters
function applyFilters() {
    const searchTerm = searchInput.value.toLowerCase();
    const area = filterArea.value;
    const agency = filterAgency.value;
    const type = filterType.value;
    const status = filterStatus.value;
    const minPrice = priceMin.value ? parseInt(priceMin.value) : 0;
    const maxPrice = priceMax.value ? parseInt(priceMax.value) : Infinity;
    
    filteredProperties = allProperties.filter(prop => {
        const matchesSearch = prop.name.toLowerCase().includes(searchTerm) ||
                             prop.location.toLowerCase().includes(searchTerm) ||
                             prop.area.toLowerCase().includes(searchTerm);
        const matchesArea = !area || prop.area === area;
        const matchesAgency = !agency || prop.agency === agency;
        const matchesType = !type || prop.type === type;
        const matchesStatus = !status || prop.status === status;
        const matchesPrice = prop.price >= minPrice && prop.price <= maxPrice;
        
        return matchesSearch && matchesArea && matchesAgency && matchesType && matchesStatus && matchesPrice;
    });
    
    currentPage = 1;
    updateActiveFilters();
    renderProperties();
}

// Update Active Filters Display
function updateActiveFilters() {
    const filters = [];
    
    if (searchInput.value) filters.push({ key: 'search', label: `Búsqueda: "${searchInput.value}"` });
    if (filterArea.value) filters.push({ key: 'area', label: `Área: ${filterArea.value}` });
    if (filterAgency.value) filters.push({ key: 'agency', label: `Agencia: ${filterAgency.value}` });
    if (filterType.value) filters.push({ key: 'type', label: `Tipo: ${filterType.value}` });
    if (filterStatus.value) filters.push({ key: 'status', label: `Estatus: ${filterStatus.value}` });
    if (priceMin.value) filters.push({ key: 'minPrice', label: `Min: $${formatNumber(priceMin.value)}` });
    if (priceMax.value) filters.push({ key: 'maxPrice', label: `Max: $${formatNumber(priceMax.value)}` });
    
    activeFiltersContainer.innerHTML = filters.map(filter => `
        <span class="filter-tag">
            ${filter.label}
            <button onclick="removeFilter('${filter.key}')">&times;</button>
        </span>
    `).join('');
}

// Remove Individual Filter
function removeFilter(key) {
    switch(key) {
        case 'search': searchInput.value = ''; break;
        case 'area': filterArea.value = ''; break;
        case 'agency': filterAgency.value = ''; break;
        case 'type': filterType.value = ''; break;
        case 'status': filterStatus.value = ''; break;
        case 'minPrice': priceMin.value = ''; break;
        case 'maxPrice': priceMax.value = ''; break;
    }
    applyFilters();
}

// Clear All Filters
function clearFilters() {
    searchInput.value = '';
    filterArea.value = '';
    filterAgency.value = '';
    filterType.value = '';
    filterStatus.value = '';
    priceMin.value = '';
    priceMax.value = '';
    applyFilters();
}

// Render Properties
function renderProperties() {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const propertiesToShow = filteredProperties.slice(start, end);
    
    if (propertiesToShow.length === 0) {
        propertiesContainer.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1;">
                <i class="fas fa-search"></i>
                <h3>No se encontraron propiedades</h3>
                <p>Intenta ajustar los filtros o realizar una nueva búsqueda</p>
            </div>
        `;
        paginationContainer.innerHTML = '';
        return;
    }
    
    propertiesContainer.className = `properties-grid ${currentView === 'list' ? 'list-view' : ''}`;
    
    propertiesContainer.innerHTML = propertiesToShow.map(prop => `
        <div class="property-card">
            <div class="property-header">
                <span class="property-type">${prop.type}</span>
                <h3 class="property-name">${prop.name}</h3>
                <p class="property-location">
                    <i class="fas fa-map-marker-alt"></i>
                    ${prop.location}
                </p>
            </div>
            <div class="property-body">
                <div class="property-price">$${formatNumber(prop.price)} USD</div>
                
                <div class="property-details">
                    <div class="detail-item">
                        <i class="fas fa-ruler-combined"></i>
                        <span>${prop.sqm} m²</span>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-map-marked-alt"></i>
                        <span>${prop.area}</span>
                    </div>
                </div>
                
                <span class="property-status ${getStatusClass(prop.status)}">
                    <i class="fas ${getStatusIcon(prop.status)}"></i>
                    ${prop.status}
                </span>
                
                <div class="property-agency">
                    <div class="agency-name">
                        <i class="fas fa-building"></i>
                        ${prop.agency}
                    </div>
                    <div class="agency-contact">
                        <a href="tel:${prop.phone}">
                            <i class="fas fa-phone"></i>
                            ${prop.phone}
                        </a>
                        <a href="mailto:${prop.email}">
                            <i class="fas fa-envelope"></i>
                            ${prop.email}
                        </a>
                    </div>
                </div>
                
                <div class="property-actions">
                    <a href="${prop.maps}" target="_blank" class="btn btn-primary">
                        <i class="fas fa-map-marker-alt"></i> Ver Mapa
                    </a>
                    <a href="tel:${prop.phone}" class="btn btn-success">
                        <i class="fas fa-phone"></i> Llamar
                    </a>
                </div>
            </div>
        </div>
    `).join('');
    
    renderPagination();
}

// Get Status CSS Class
function getStatusClass(status) {
    const classes = {
        'Entrega Inmediata': 'status-available',
        'En Construcción': 'status-construction',
        'Preventa': 'status-presale'
    };
    return classes[status] || 'status-available';
}

// Get Status Icon
function getStatusIcon(status) {
    const icons = {
        'Entrega Inmediata': 'fa-check-circle',
        'En Construcción': 'fa-hard-hat',
        'Preventa': 'fa-calendar-alt'
    };
    return icons[status] || 'fa-check-circle';
}

// Render Pagination
function renderPagination() {
    const totalPages = Math.ceil(filteredProperties.length / itemsPerPage);
    
    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }
    
    let html = '';
    
    // Previous button
    html += `<button class="page-btn" onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>
        <i class="fas fa-chevron-left"></i>
    </button>`;
    
    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
            html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
        } else if (i === currentPage - 2 || i === currentPage + 2) {
            html += `<span class="page-btn" disabled>...</span>`;
        }
    }
    
    // Next button
    html += `<button class="page-btn" onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>
        <i class="fas fa-chevron-right"></i>
    </button>`;
    
    paginationContainer.innerHTML = html;
}

// Change Page
function changePage(page) {
    const totalPages = Math.ceil(filteredProperties.length / itemsPerPage);
    if (page < 1 || page > totalPages) return;
    
    currentPage = page;
    renderProperties();
    propertiesContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Format Number
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Modal Functions
function openModal() {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    modal.classList.remove('active');
    document.body.style.overflow = '';
    document.getElementById('add-property-form').reset();
}

// Handle Add Property
function handleAddProperty(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const newProperty = {
        id: Date.now().toString(),
        name: formData.get('name'),
        area: formData.get('area'),
        location: formData.get('location'),
        price: parseInt(formData.get('price')),
        sqm: parseInt(formData.get('sqm')),
        type: formData.get('type'),
        status: formData.get('status'),
        availability: 'Disponible',
        agency: formData.get('agency'),
        phone: formData.get('phone'),
        email: formData.get('email'),
        maps: formData.get('maps') || '#'
    };
    
    allProperties.push(newProperty);
    filteredProperties = [...allProperties];
    
    updateStats();
    populateFilters();
    renderProperties();
    closeModal();
    showToast('Propiedad agregada exitosamente');
}

// Show Toast Notification
function showToast(message, type = 'success') {
    toast.textContent = message;
    toast.className = 'toast show';
    
    if (type === 'error') {
        toast.style.background = '#e53e3e';
    } else {
        toast.style.background = '#2d3748';
    }
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Export to XML (for saving new properties)
function exportToXML() {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<properties>\n';
    
    allProperties.forEach(prop => {
        xml += `  <property id="${prop.id}">\n`;
        xml += `    <name>${escapeXml(prop.name)}</name>\n`;
        xml += `    <area>${escapeXml(prop.area)}</area>\n`;
        xml += `    <location>${escapeXml(prop.location)}</location>\n`;
        xml += `    <price>${prop.price}</price>\n`;
        xml += `    <sqm>${prop.sqm}</sqm>\n`;
        xml += `    <type>${prop.type}</type>\n`;
        xml += `    <status>${prop.status}</status>\n`;
        xml += `    <availability>${prop.availability}</availability>\n`;
        xml += `    <agency>${escapeXml(prop.agency)}</agency>\n`;
        xml += `    <phone>${prop.phone}</phone>\n`;
        xml += `    <email>${prop.email}</email>\n`;
        xml += `    <maps>${prop.maps}</maps>\n`;
        xml += `  </property>\n`;
    });
    
    xml += '</properties>';
    return xml;
}

// Escape XML special characters
function escapeXml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // ESC to close modal
    if (e.key === 'Escape' && modal.classList.contains('active')) {
        closeModal();
    }
    
    // Ctrl/Cmd + F to focus search
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        searchInput.focus();
    }
});
