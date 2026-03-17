// =============================================
// Definições de cores e descrições dos níveis
// =============================================
export const COLOR_MAP = {
    "Nível 1": "#f42828", // Vermelho
    "Nível 2": "#f45e29", // Laranja escuro
    "Nível 3": "#f4842a", // Laranja
    "Nível 4": "#ff9247", // Amarelo-laranja
    "Nível 5": "#f4a82b", // Amarelo
    "Nível 6": "#FFC106", // Verde-amarelo
    "Nível 7": "#d7e282", // Verde claro
    "Nível 8": "#b6d7a8", // Verde
    "Nível 9": "#78c299", // Verde brilhante
    "Nível 10": "#4E9076" // Verde escuro
};

export const NIVEL_DESCRICOES = {
    "Nível 1": "< 539.10",
    "Nível 2": "539.10 - 552.31",
    "Nível 3": "552.31 - 560.46",
    "Nível 4": "560.46 - 563.64",
    "Nível 5": "563.64 - 571.94",
    "Nível 6": "571.94 - 577.35",
    "Nível 7": "577.35 - 585.50",
    "Nível 8": "585.50 - 592.02",
    "Nível 9": "592.02 - 600.86",
    "Nível 10": "≥ 600.86"
};

// =================================================================
// CLASSE DO MAPA
// =================================================================
export class BrazilMap {
    // Add municipalData parameter (defaults to null)
    constructor(element, geoJSON, ufData, colorMap, intermediateData = null, immediateData = null, municipalData = null) { // Added municipalData
        this.element = element;
        this.geoJSON = geoJSON;
        this.ufData = ufData; // UF data (usually for index or slides 1)
        this.intermediateData = intermediateData; // Intermediate region data (for slide 2)
        this.immediateData = immediateData; // Immediate region data (for slide 3)
        this.municipalData = municipalData; // Municipal data (for slide 4) // Added this line
        this.colorMap = colorMap;
        this.layers = {}; // Can store layers by UF code or Region ID
        this.ufDataByCode = {};
        this.intermediateDataById = {}; // Store intermediate data indexed by ID
        this.immediateDataById = {}; // Store immediate data indexed by ID
        this.municipalDataById = {}; // Store municipal data indexed by ID // Added this line
        this.currentLevel = null;
        this.animationFrame = null;
        this._hoveredFeatureId = null; // Use a generic ID for hover tracking
        this.defaultStyle = {
            weight: 1.5, // Default weight (can be overridden)
            opacity: 1,
            color: '#555555', // Default border color
            fillOpacity: 0.7, // Default fill opacity
            fillColor: '#CCCCCC' // Default fill color
        };
        // Configurações para controle fino de zoom (pode não ser usado nos slides)
        this.zoomConfig = {
            initialZoom: 4.4,
            minZoom: 2.5,
            maxZoom: 6.8,
            zoomStep: 0.1
        };
        // Propriedade para armazenar o callback de clique (usado no index.html)
        this.clickCallback = null;

        // Index UF data by code (SG_UF_ESC)
        if (this.ufData && Array.isArray(this.ufData)) {
            this.ufData.forEach(uf => {
                if (uf && uf.SG_UF_ESC) {
                    this.ufDataByCode[uf.SG_UF_ESC.toUpperCase()] = uf;
                }
            });
            // Log if multiple UFs are indexed (useful for debugging slide 1)
            if (this.ufData.length > 1) {
                console.log(`Indexed ${this.ufData.length} UFs for the map:`, Object.keys(this.ufDataByCode));
            }
        }

        // Index Intermediate data by ID (CD_RGINT)
        if (this.intermediateData && Array.isArray(this.intermediateData)) {
            this.intermediateData.forEach(region => {
                // Assuming 'CD_RGINT' based on intermediaria.csv header
                if (region && region.CD_RGINT) {
                    this.intermediateDataById[String(region.CD_RGINT)] = region; // Ensure ID is string
                } else {
                     console.warn("Intermediate region data missing ID (expected CD_RGINT):", region);
                }
            });
        }

        // Index Immediate data by ID (CD_RGI)
        if (this.immediateData && Array.isArray(this.immediateData)) {
            this.immediateData.forEach(region => {
                // Assuming 'CD_RGI' based on imediata.csv header
                if (region && region.CD_RGI) {
                    this.immediateDataById[String(region.CD_RGI)] = region; // Ensure ID is string
                } else {
                    console.warn("Immediate region data missing ID (expected CD_RGI):", region);
                }
            });
        }

        // Index Municipal data by ID (CD_MUN) // Added this block
        if (this.municipalData && Array.isArray(this.municipalData)) {
            this.municipalData.forEach(municipio => {
                // Assuming 'CD_MUN' based on mun.csv header
                if (municipio && municipio.CD_MUN) {
                    this.municipalDataById[String(municipio.CD_MUN)] = municipio; // Ensure ID is string
                } else {
                    console.warn("Municipal data missing ID (expected CD_MUN):", municipio);
                }
            });
            console.log("Municipal data indexed by CD_MUN:", this.municipalDataById); // Log indexed data
        }

        // Configuração do mapa sem controles nativos de zoom
        this.map = L.map(element, {
            zoomControl: false, // Desabilitar controles nativos
            attributionControl: false,
            dragging: false,
            touchZoom: false,
            scrollWheelZoom: false,
            doubleClickZoom: false,
            boxZoom: false,
            keyboard: false
        });
        // Adicionar controles personalizados (conditionally? Maybe not needed in slides)
        // this.addCustomZoomControls();
        // Adicionar controle de zoom via mouse wheel (conditionally?)
        // this.setupMouseWheelZoom();
    }

    // Método para configurar zoom via scroll do mouse (não usado nos slides)
    setupMouseWheelZoom() {
        this.element.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY || e.detail || 0;
            if (delta > 0) {
                this.zoomBy(-this.zoomConfig.zoomStep);
            } else {
                this.zoomBy(this.zoomConfig.zoomStep);
            }
        }, { passive: false });
    }

    // Método para adicionar os controles personalizados de zoom (não usado nos slides)
    addCustomZoomControls() {
        const zoomControlDiv = document.createElement('div');
        zoomControlDiv.className = 'custom-zoom-controls';
        const zoomInButton = document.createElement('button');
        zoomInButton.innerHTML = '+';
        zoomInButton.title = 'Aumentar zoom';
        zoomInButton.className = 'custom-zoom-button';
        zoomInButton.addEventListener('click', () => this.zoomBy(this.zoomConfig.zoomStep));
        const zoomOutButton = document.createElement('button');
        zoomOutButton.innerHTML = '−';
        zoomOutButton.title = 'Diminuir zoom';
        zoomOutButton.className = 'custom-zoom-button';
        zoomOutButton.addEventListener('click', () => this.zoomBy(-this.zoomConfig.zoomStep));
        zoomControlDiv.appendChild(zoomInButton);
        zoomControlDiv.appendChild(zoomOutButton);
        const slideElement = document.querySelector('.slide');
        const targetElement = slideElement || document.body;
        targetElement.appendChild(zoomControlDiv);
    }

    // Método de zoom com controle fino (não usado nos slides)
    zoomBy(stepValue) {
        const currentZoom = this.map.getZoom();
        let newZoom = Math.round((currentZoom + stepValue) * 100) / 100;
        newZoom = Math.max(this.zoomConfig.minZoom, Math.min(this.zoomConfig.maxZoom, newZoom));
        this.map.flyTo(this.map.getCenter(), newZoom, { duration: 0.5, easeLinearity: 0.25 });
    }

    getCurrentLevel() {
        return this.currentLevel;
    }

    render() {
        // Adicionar camada GeoJSON
        const geoLayer = L.geoJSON(this.geoJSON, {
            style: (feature) => this.styleFeature(feature),
            onEachFeature: (feature, layer) => this.onEachFeature(feature, layer),
            interactive: true
        }).addTo(this.map);

        // Fit bounds after adding layer if geoJSON is not empty
        if (this.geoJSON && this.geoJSON.features && this.geoJSON.features.length > 0) {
            const bounds = geoLayer.getBounds();
            if (bounds.isValid()) {
                // The timeout zoom in slides.js will refine this
                this.map.fitBounds(bounds, { padding: [10, 10] }); // Initial small padding
                console.log("Map initially fitted to GeoJSON bounds.");
            } else {
                console.warn("Initial bounds invalid, falling back to default view.");
                this.map.setView([-15.7801, -47.9292], this.zoomConfig.initialZoom);
            }
        } else {
             console.warn("No GeoJSON features to fit bounds, using default view.");
             this.map.setView([-15.7801, -47.9292], this.zoomConfig.initialZoom);
        }

        // Desabilitar interações padrão (important for slides)
        this.map.dragging.disable();
        this.map.touchZoom.disable();
        this.map.doubleClickZoom.disable();
        this.map.scrollWheelZoom.disable();
        this.map.boxZoom.disable();
        this.map.keyboard.disable();

        // Implementar suporte a eventos de toque para dispositivos móveis
        this.setupMobileInteractions();
    }

    // Método para lidar com interações em dispositivos móveis
    setupMobileInteractions() {
        const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        if (isTouchDevice) {
            console.log('Configurando interações para dispositivo móvel');
            Object.entries(this.layers).forEach(([featureId, layer]) => {
                const layerElement = layer._path;
                if (layerElement) {
                    const handleTouchStart = (e) => {
                        e.preventDefault();
                        const featureProperties = layer.feature.properties;

                        // Check if it's a UF layer
                        if (featureProperties && featureProperties.SIGLA_UF && this.ufData) {
                            const currentUfCode = featureProperties.SIGLA_UF.toUpperCase();
                            this._hoveredFeatureId = currentUfCode;
                            this.highlightByFeatureId(currentUfCode);
                            const ufData = this.ufDataByCode[currentUfCode];
                            if (ufData) {
                                this.currentLevel = ufData.Nível;
                                layer.openTooltip();
                                setTimeout(() => layer.closeTooltip(), 3000);
                            }
                            if (this.clickCallback) {
                                this.clickCallback(currentUfCode, ufData);
                            }
                        }
                        // Check if it's an intermediate region layer
                        else if (featureProperties && featureProperties.CD_RGINT && this.intermediateData) {
                            const currentRegionId = String(featureProperties.CD_RGINT);
                            this._hoveredFeatureId = currentRegionId;
                            this.highlightByFeatureId(currentRegionId);
                            const regionData = this.intermediateDataById[currentRegionId];
                            if (regionData) this.currentLevel = regionData.Nível;
                            layer.openTooltip();
                            setTimeout(() => layer.closeTooltip(), 2000);
                        }
                        // Check if it's an immediate region layer
                        else if (featureProperties && featureProperties.CD_RGI && this.immediateData) {
                            const currentRegionId = String(featureProperties.CD_RGI);
                            this._hoveredFeatureId = currentRegionId;
                            this.highlightByFeatureId(currentRegionId);
                            const regionData = this.immediateDataById[currentRegionId];
                            if (regionData) this.currentLevel = regionData.Nível;
                            layer.openTooltip();
                            setTimeout(() => layer.closeTooltip(), 2000);
                        }
                        // Check if it's a municipal layer // Added this block
                        else if (featureProperties && featureProperties.CD_MUN && this.municipalData) {
                            const currentRegionId = String(featureProperties.CD_MUN);
                            this._hoveredFeatureId = currentRegionId;
                            this.highlightByFeatureId(currentRegionId);
                            const regionData = this.municipalDataById[currentRegionId];
                            if (regionData) this.currentLevel = regionData.Nível;
                            layer.openTooltip();
                            setTimeout(() => layer.closeTooltip(), 2000);
                        }
                         else {
                            console.log("Touch on unknown feature type:", featureProperties);
                        }
                    };
                    // Use 'click' which Leaflet translates from touch events
                    layer.off('click').on('click', handleTouchStart);
                }
            });
        }
    }

    // --- MODIFIED styleFeature ---
    styleFeature(feature) {
        const properties = feature.properties;
        let style = { ...this.defaultStyle }; // Start with default

        // Check if it's a UF feature (has SIGLA_UF)
        if (properties && properties.SIGLA_UF && this.ufData) {
            const ufCode = properties.SIGLA_UF.toUpperCase();
            const ufData = this.ufDataByCode[ufCode]; // Get data for THIS specific UF
            style.weight = 4.5; // Thicker border for UF
            style.color = '#111111'; // Darker border for UF
            style.fillOpacity = 0.8;
            if (ufData && this.colorMap[ufData.Nível]) {
                style.fillColor = this.colorMap[ufData.Nível]; // Color based on THIS UF's level
            } else {
                style.fillColor = '#CCCCCC'; // Default gray if no data/level for this UF
                if (!ufData) console.warn(`No CSV data found for UF: ${ufCode} during styling.`);
            }
        }
        // Check if it's an intermediate region feature (using CD_RGINT and intermediateData)
        else if (properties && properties.CD_RGINT && this.intermediateData) {
             const regionId = String(properties.CD_RGINT);
             const regionData = this.intermediateDataById[regionId];
             style.weight = 2.5; // Intermediate border weight
             style.color = '#555555'; // Intermediate border color
             style.fillOpacity = 0.7;
             if (regionData && this.colorMap[regionData.Nível]) {
                 style.fillColor = this.colorMap[regionData.Nível];
             } else {
                 // console.warn(`No data or Nível found for intermediate region ID: ${regionId}`); // Reduced logging noise
                 style.fillColor = '#A9A9A9'; // Fallback gray for intermediate
             }
        }
        // Check if it's an immediate region feature (using CD_RGI and immediateData)
        else if (properties && properties.CD_RGI && this.immediateData) {
             const regionId = String(properties.CD_RGI);
             const regionData = this.immediateDataById[regionId];
             style.weight = 1.5; // Immediate border weight (slightly thinner)
             style.color = '#555555'; // Immediate border color
             style.fillOpacity = 0.7;
             if (regionData && this.colorMap[regionData.Nível]) {
                 style.fillColor = this.colorMap[regionData.Nível];
             } else {
                 // console.warn(`No data or Nível found for immediate region ID: ${regionId}`); // Reduced logging noise
                 style.fillColor = '#BDBDBD'; // Fallback gray for immediate
             }
        }
        // Check if it's a municipal feature (using CD_MUN and municipalData) // Added this block
        else if (properties && properties.CD_MUN && this.municipalData) {
             const regionId = String(properties.CD_MUN);
             const regionData = this.municipalDataById[regionId];
             style.weight = 0.8; // Thinner borders for municipalities
             style.color = '#666666'; // Slightly lighter border for municipalities
             style.fillOpacity = 0.7;
             if (regionData && this.colorMap[regionData.Nível]) {
                 style.fillColor = this.colorMap[regionData.Nível];
             } else {
                 // console.warn(`No data or Nível found for municipality ID: ${regionId}`); // Reduced logging noise
                 style.fillColor = '#D3D3D3'; // Lighter fallback gray for municipalities
             }
        }
        // Default style if none of the above match
        else {
            console.warn("Unknown feature type for styling:", properties);
            style.fillColor = '#E0E0E0'; // Different default for unknown
            style.weight = 1;
            style.color = '#888888';
        }
        return style;
    }

    // --- MODIFIED highlightByFeatureId ---
    // Highlight based on specific Feature ID (UF code, Region ID, or Municipality ID)
    highlightByFeatureId(featureId) {
        if (this.animationFrame !== null) cancelAnimationFrame(this.animationFrame);

        Object.entries(this.layers).forEach(([id, layer]) => {
            const layerElement = layer._path;
            if (!layerElement) return;

            layerElement.classList.remove('state-active', 'state-inactive');

            // Apply the correct class based on whether this layer is the hovered one
            if (String(id) === String(featureId)) {
                layerElement.classList.add('state-active');
            } else {
                layerElement.classList.add('state-inactive');
            }
            // CSS handles hover appearance. No need to reapply base style here.
        });
    }

    // --- MODIFIED onEachFeature ---
    onEachFeature(feature, layer) {
        const properties = feature.properties;
        let featureId = null;
        let regionData = null; // This variable will hold data for the specific feature (UF, RGINT, RGI, MUN)
        let regionName = "N/A";
        let tooltipContent = `<div class="tooltip-content">`;
        let tooltipClass = 'custom-tooltip';
        let isClickable = false; // Default to not clickable

        // Handle UF features
        if (properties && properties.SIGLA_UF && this.ufData) {
            featureId = properties.SIGLA_UF.toUpperCase();
            regionData = this.ufDataByCode[featureId]; // Get data for THIS specific UF
            regionName = regionData?.NM_UF || featureId;
            isClickable = !!this.clickCallback; // Clickable only if callback exists (index.html)
            tooltipContent += `<strong>${regionName}</strong>`;
            if (regionData) {
                tooltipContent += `
                    <br>Média: ${parseFloat(regionData.media_nota_redacao).toFixed(1)}
                    <br>Ranking: ${regionData.Ranking || 'N/A'}`;
            } else {
                 tooltipContent += `<br>Dados não disponíveis`;
                 console.warn(`No data found for UF: ${featureId} during interaction setup.`);
            }
        }
        // Handle Intermediate Region features
        else if (properties && properties.CD_RGINT && this.intermediateData) {
            featureId = String(properties.CD_RGINT);
            regionData = this.intermediateDataById[featureId];
            regionName = properties.NM_RGINT || `Região ${featureId}`;
            tooltipClass = regionName.length > 25 ? 'custom-tooltip tooltip-region-name' : 'custom-tooltip';
            let formattedName = regionName.length > 20 && regionName.includes('-') ? regionName.split('-').map(part => part.trim()).join('<br>- ') : regionName;
            tooltipContent += `<strong>${formattedName}</strong>`;
            if (regionData) {
                tooltipContent += `
                    <br>Média: ${parseFloat(regionData.media_nota_redacao).toFixed(1)}
                    <br>Nível: ${regionData.Nível || 'N/A'}
                    <br>Ranking: ${regionData.Ranking || 'N/A'}`;
            } else {
                 tooltipContent += `<br>(Dados CSV não encontrados para ID: ${featureId})`;
            }
        }
        // Handle Immediate Region features
        else if (properties && properties.CD_RGI && this.immediateData) {
            featureId = String(properties.CD_RGI);
            regionData = this.immediateDataById[featureId];
            regionName = properties.NM_RGI || `Região ${featureId}`;
            tooltipClass = regionName.length > 30 ? 'custom-tooltip tooltip-region-name' : 'custom-tooltip';
            let formattedName = regionName.length > 20 && regionName.includes('-') ? regionName.split('-').map(part => part.trim()).join('<br>- ') : regionName;
            tooltipContent += `<strong>${formattedName}</strong>`;
            if (regionData) {
                tooltipContent += `
                    <br>Média: ${parseFloat(regionData.media_nota_redacao).toFixed(1)}
                    <br>Nível: ${regionData.Nível || 'N/A'}
                    <br>Ranking: ${regionData.Ranking || 'N/A'}`;
            } else {
                 tooltipContent += `<br>(Dados CSV não encontrados para ID: ${featureId})`;
            }
        }
        // Handle Municipal features // Added this block
        else if (properties && properties.CD_MUN && this.municipalData) {
            featureId = String(properties.CD_MUN);
            regionData = this.municipalDataById[featureId];
            regionName = properties.NM_MUN || `Município ${featureId}`;
            tooltipClass = regionName.length > 30 ? 'custom-tooltip tooltip-region-name' : 'custom-tooltip';
            let formattedName = regionName.length > 20 && regionName.includes('-') ? regionName.split('-').map(part => part.trim()).join('<br>- ') : regionName;
            tooltipContent += `<strong>${formattedName}</strong>`;
            if (regionData) {
                tooltipContent += `
                    <br>Média: ${parseFloat(regionData.media_nota_redacao).toFixed(1)}
                    <br>Nível: ${regionData.Nível || 'N/A'}
                    <br>Ranking: ${regionData.Ranking || 'N/A'}`;
            } else {
                tooltipContent += `<br>(Dados CSV não encontrados para ID: ${featureId})`;
            }
        }
        // Handle unknown features
        else {
             console.warn("Feature with unknown properties in onEachFeature:", properties);
             layer.off('mouseover mouseout click');
             layer.bindTooltip("Tipo de região desconhecida");
             return; // Exit if feature type is unknown
         }

        // Finalize tooltip and bind
        tooltipContent += `</div>`;
        layer.bindTooltip(tooltipContent, { sticky: true, permanent: false, direction: 'top', className: tooltipClass, opacity: 0.95 });
        this.layers[featureId] = layer; // Store layer by its ID

        // Add common event listeners
        layer.on('mouseover', (e) => {
            e.target.getElement().style.cursor = isClickable ? 'pointer' : 'default';
            this._hoveredFeatureId = featureId;
            this.highlightByFeatureId(featureId);
            this.currentLevel = regionData?.Nível || null; // Use the specific feature's data
        });
        layer.on('mouseout', (e) => {
            if (this._hoveredFeatureId === featureId) {
                this._hoveredFeatureId = null;
                this.highlightLevel(null); // Reset all highlights
                this.currentLevel = null;
            }
        });

        // Add click listener only if applicable (UF on index page)
        layer.off('click'); // Remove previous handlers first
        if (isClickable) {
            layer.on('click', () => {
                this.clickCallback(featureId, regionData); // Pass the specific feature's data
            });
        }
    }

    // --- MODIFIED highlightLevel ---
    highlightLevel(level) {
        if (this.animationFrame !== null) cancelAnimationFrame(this.animationFrame);
        this.currentLevel = level;

        Object.values(this.layers).forEach(layer => {
            const layerElement = layer._path;
            if (!layerElement) return;

            const properties = layer.feature.properties;
            layerElement.classList.remove('state-active', 'state-inactive');

            let featureData = null;
            let featureLevel = null;
            let fallbackColor = this.defaultStyle.fillColor; // Default fallback

            // Determine data source and level based on feature type
            if (properties && properties.SIGLA_UF && this.ufData) {
                featureData = this.ufDataByCode[properties.SIGLA_UF.toUpperCase()];
                fallbackColor = '#CCCCCC';
            } else if (properties && properties.CD_RGINT && this.intermediateData) {
                featureData = this.intermediateDataById[String(properties.CD_RGINT)];
                fallbackColor = '#A9A9A9';
            } else if (properties && properties.CD_RGI && this.immediateData) {
                featureData = this.immediateDataById[String(properties.CD_RGI)];
                fallbackColor = '#BDBDBD';
            } else if (properties && properties.CD_MUN && this.municipalData) { // Added municipal check
                featureData = this.municipalDataById[String(properties.CD_MUN)];
                fallbackColor = '#D3D3D3';
            }

            if (featureData) {
                featureLevel = featureData.Nível;
                // Apply active/inactive class if a level is selected
                if (level !== null) {
                    layerElement.classList.add(featureLevel === level ? 'state-active' : 'state-inactive');
                }
                // Set fill color based on the feature's actual level
                layer.setStyle({ fillColor: this.colorMap[featureLevel] || fallbackColor });
            } else {
                // If no data, ensure it's inactive and has fallback color
                if (level !== null) {
                    layerElement.classList.add('state-inactive');
                }
                layer.setStyle({ fillColor: fallbackColor });
            }
        });
    }

    // Método para adicionar manipulador de clique global (primarily for index.html)
    addClickHandler(callback) {
        this.clickCallback = callback;
        // Re-apply click handler only to existing UF layers
        Object.entries(this.layers).forEach(([featureId, layer]) => {
            const featureProperties = layer.feature.properties;
            layer.off('click'); // Remove previous handlers
            // Only add UF callback to UF layers
            if (featureProperties && featureProperties.SIGLA_UF) {
                const ufData = this.ufDataByCode[featureId];
                layer.on('click', () => {
                    if (this.clickCallback) {
                        this.clickCallback(featureId, ufData);
                    }
                });
            }
            // Ensure non-UF layers don't accidentally trigger the UF callback
            // (They shouldn't have a click handler from onEachFeature anyway)
        });
    }

    // Update title color (specific to index.html structure - likely not needed in slides)
    updateTitleColor(level) {
        const ufElement = document.querySelector('.destaque-uf-animado');
        if (!ufElement) return; // Exit if the element doesn't exist (e.g., in slides)
        const styleId = 'dynamic-uf-style';
        const existingStyle = document.getElementById(styleId);
        if (level && this.colorMap[level]) {
            const color = this.colorMap[level];
            ufElement.style.color = color;
            let style = existingStyle;
            if (!style) {
                style = document.createElement('style');
                style.id = styleId;
                document.head.appendChild(style);
            }
            style.textContent = `.destaque-uf-animado::after { background-color: ${color}; }`;
        } else {
            ufElement.style.color = '';
            if (existingStyle) existingStyle.remove();
        }
    }
}

// =================================================================
// CLASSE DA LEGENDA (Primarily for index.html)
// =================================================================
export class Legend {
    constructor(container, colorMap, map) {
        this.container = container;
        this.colorMap = colorMap;
        this.map = map; // Reference to the BrazilMap instance
        this.nivelDescricoes = NIVEL_DESCRICOES;
        this.legendItems = {}; // To store references to legend item elements
        this.tooltip = null; // Referência para o tooltip
        this.createTooltip(); // Criar o tooltip
    }

    createTooltip() {
        this.tooltip = document.createElement('div');
        this.tooltip.className = 'legend-tooltip';
        document.body.appendChild(this.tooltip);
    }

    showTooltip(text, event) {
        this.tooltip.textContent = text;
        this.tooltip.classList.add('visible');
        const x = event.clientX + 10;
        const y = event.clientY - 30;
        this.tooltip.style.left = `${x}px`;
        this.tooltip.style.top = `${y}px`;
    }

    hideTooltip() {
        this.tooltip.classList.remove('visible');
    }

    render() {
        if (!this.container) {
            console.error("Legend container not provided.");
            return;
        }
        this.container.innerHTML = '';
        this.legendItems = {};

        const sortedLevels = Object.keys(this.colorMap).sort((a, b) => {
            const numA = parseInt(a.match(/\d+/)[0]);
            const numB = parseInt(b.match(/\d+/)[0]);
            return numA - numB;
        });

        sortedLevels.forEach(level => {
            const color = this.colorMap[level];
            const description = this.nivelDescricoes[level] || '';
            const item = document.createElement('div');
            item.className = this.container.classList.contains('index-legend-container')
                           ? 'legend-item index-legend-item'
                           : 'legend-item';
            item.dataset.level = level;
            item.dataset.description = description;

            const colorBox = document.createElement('div');
            colorBox.className = 'color-box';
            colorBox.style.backgroundColor = color;

            const labelContainer = document.createElement('div');
            labelContainer.className = 'label-container';
            const label = document.createElement('span');
            label.className = 'legend-label';
            label.textContent = level;
            const descSpan = document.createElement('span');
            descSpan.className = 'legend-description';
            descSpan.textContent = description;
            labelContainer.appendChild(label);
            labelContainer.appendChild(descSpan);

            item.appendChild(colorBox);
            item.appendChild(labelContainer);

            item.addEventListener('mouseover', (e) => {
                this.handleMouseOver(level, item);
                const desc = item.dataset.description;
                if (desc) this.showTooltip(`${level}: ${desc}`, e);
            });
            item.addEventListener('mousemove', (e) => {
                if (this.tooltip.classList.contains('visible')) {
                    const x = e.clientX + 10;
                    const y = e.clientY - 30;
                    this.tooltip.style.left = `${x}px`;
                    this.tooltip.style.top = `${y}px`;
                }
            });
            item.addEventListener('mouseout', (e) => {
                this.handleMouseOut(item);
                this.hideTooltip();
            });

            this.container.appendChild(item);
            this.legendItems[level] = item;
        });
    }

    handleMouseOver(level, item) {
        item.classList.add('active');
        Object.values(this.legendItems).forEach(otherItem => {
            if (otherItem !== item) {
                otherItem.classList.remove('active');
                otherItem.classList.add('inactive');
            }
        });
        if (this.map) this.map.highlightLevel(level);
    }

    handleMouseOut(item) {
        Object.values(this.legendItems).forEach(otherItem => {
            otherItem.classList.remove('active', 'inactive');
        });
        if (this.map) this.map.highlightLevel(null);
    }
}