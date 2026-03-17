// Importar componentes do arquivo map-components.js
import { BrazilMap, COLOR_MAP } from './map-components.js';
// Importar a função de orquestração do type.js
import { typeSlideContent } from './type.js';

/**
 * Filtra pequenas ilhas/polígonos dos dados GeoJSON
 * @param {Object} geoJSON - Dados GeoJSON a serem filtrados
 * @param {Number} thresholdArea - Limite de área abaixo do qual os polígonos serão removidos
 * @returns {Object} GeoJSON filtrado
 */
function filterSmallPolygons(geoJSON, thresholdArea = 0.01) {
    if (!geoJSON || !geoJSON.features || !Array.isArray(geoJSON.features)) {
        console.warn("GeoJSON inválido fornecido para filtragem");
        return geoJSON;
    }

    console.log(`Filtrando polígonos pequenos com limite ${thresholdArea}...`);

    // Função para calcular área aproximada de um polígono
    function calculatePolygonArea(coordinates) {
        // Algoritmo simples para estimar área de um polígono
        if (!coordinates || !coordinates[0] || coordinates[0].length < 3) return 0;

        // Usando a fórmula da área de Gauss (Shoelace)
        let area = 0;
        const coords = coordinates[0]; // Primeiro anel (exterior) do polígono

        for (let i = 0; i < coords.length - 1; i++) {
            area += coords[i][0] * coords[i+1][1] - coords[i+1][0] * coords[i][1];
        }

        return Math.abs(area / 2);
    }

    const originalCount = geoJSON.features.length;

    // Filtrar features baseado na área do polígono
    const filteredFeatures = geoJSON.features.filter(feature => {
        if (!feature.geometry) return true;

        if (feature.geometry.type === "Polygon") {
            const area = calculatePolygonArea(feature.geometry.coordinates);
            return area > thresholdArea;
        }

        if (feature.geometry.type === "MultiPolygon") {
            // Manter apenas polígonos com área suficiente
            const filteredPolygons = feature.geometry.coordinates.filter(polygon => {
                return calculatePolygonArea(polygon) > thresholdArea;
            });

            // Atualizar as coordenadas com apenas os polígonos mantidos
            feature.geometry.coordinates = filteredPolygons;

            // Manter a feature se ainda tiver pelo menos um polígono
            return filteredPolygons.length > 0;
        }

        return true; // Manter outros tipos de geometria
    });

    console.log(`Removido ${originalCount - filteredFeatures.length} polígonos pequenos`);

    return {
        ...geoJSON,
        features: filteredFeatures
    };
}

/**
 * Parses CSV text into an array of objects.
 * Handles potential BOM, different line endings, and trims headers/values.
 * @param {string} csv The CSV text content.
 * @returns {Array<object>} An array of objects representing CSV rows.
 */
function parseCSV(csv) {
    // Remove potential BOM character from the start of the file
    if (csv.charCodeAt(0) === 0xFEFF) {
        csv = csv.substring(1);
    }
    // Split lines robustly (handles \n and \r\n)
    const lines = csv.split(/\r?\n/);

    // Ensure headers line exists and is not empty
    if (!lines[0]) {
        console.error("CSV file appears to be empty or missing headers.");
        return [];
    }
    // Trim headers carefully
    const headers = lines[0].split(',').map(header => header.trim());

    return lines.slice(1) // Start from the first data line
        .filter(line => line.trim()) // Filter out empty/whitespace-only lines
        .map(line => {
            const values = line.split(',');
            const obj = {};
            headers.forEach((header, index) => {
                // Trim value, handle cases where value might be missing for a column
                obj[header] = values[index]?.trim() ?? '';
            });
            return obj;
        });
}

// Função para obter o número do slide atual a partir da URL
function getCurrentSlideNumber() {
    const path = window.location.pathname;
    const match = path.match(/slide(\d+)\.html/);
    return match ? parseInt(match[1], 10) : null;
}

// Função para obter parâmetros da URL
function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        uf: params.get('uf') // e.g., "AM"
    };
}

// Função para carregar conteúdo específico da UF a partir do JSON (para texto)
async function loadUFContent() {
    const { uf } = getUrlParams();
    if (!uf) {
        console.error('Parâmetro UF não encontrado na URL');
        document.getElementById('slide-title').textContent = 'Erro';
        document.getElementById('slide-subtitle').textContent = 'UF não especificada';
        document.getElementById('slide-text').innerHTML = '<p>Adicione ?uf=XX à URL.</p>';
        return;
    }
    const upperCaseUf = uf.toUpperCase();

    try {
        const response = await fetch('./slides.json');
        if (!response.ok) {
            throw new Error(`Falha ao carregar slides.json: ${response.statusText}`);
        }
        const allSlideData = await response.json();
        console.log("slides.json loaded and parsed successfully.");

        const currentSlide = getCurrentSlideNumber();
        if (!currentSlide) {
            throw new Error('Não foi possível determinar o número do slide atual.');
        }
        console.log(`Current slide number: ${currentSlide}`);

        const slideData = allSlideData[upperCaseUf]?.[currentSlide];

        if (!slideData) {
            console.error(`Conteúdo para UF "${upperCaseUf}", Slide ${currentSlide} não encontrado em slides.json.`);
            document.getElementById('slide-title').textContent = 'Erro';
            document.getElementById('slide-subtitle').textContent = `Conteúdo não encontrado para ${upperCaseUf} - Slide ${currentSlide}`;
            document.getElementById('slide-text').innerHTML = '<p>Verifique o arquivo slides.json e a URL.</p>';
            return;
        }

        console.log(`Conteúdo encontrado para Slide ${currentSlide}:`, slideData);

        const titleEl = document.getElementById('slide-title');
        const subtitleEl = document.getElementById('slide-subtitle');
        const textEl = document.getElementById('slide-text');

        setupNavigationButtons(currentSlide);

        await typeSlideContent(
            titleEl,
            subtitleEl,
            textEl,
            slideData,
            { /* Optional speeds/delays */ }
        );

    } catch (error) {
        console.error('Erro ao carregar conteúdo de texto da UF:', error);
        const titleEl = document.getElementById('slide-title');
        const subtitleEl = document.getElementById('slide-subtitle');
        const textEl = document.getElementById('slide-text');
        if(titleEl) titleEl.textContent = 'Erro ao Carregar Texto';
        if(subtitleEl) subtitleEl.textContent = error.message;
        if(textEl) textEl.innerHTML = '<p>Ocorreu um problema ao buscar ou processar os dados de texto.</p>';
    }
}

// Função para configurar os botões de navegação
function setupNavigationButtons(currentSlide) {
    const prevButton = document.getElementById('prev-button');
    const nextButton = document.getElementById('next-button');
    const { uf } = getUrlParams();

    if (prevButton) {
        prevButton.onclick = null;
        prevButton.disabled = false;
        prevButton.style.opacity = '1';
        prevButton.style.cursor = 'pointer';

        if (currentSlide === 1) {
            // Para o primeiro slide, o botão anterior leva à página inicial
            // Substituindo o ícone de casa pela imagem do mapa do Brasil
            prevButton.innerHTML = '<img src="media/brasil.png" alt="Voltar ao Mapa" style="width: 40px; height: auto;">';
            prevButton.setAttribute('title', 'Voltar ao Mapa');
            prevButton.onclick = () => { window.location.href = 'index.html'; };
        } else {
            // Para outros slides, o botão anterior navega para o slide anterior
            prevButton.innerHTML = '<i class="fas fa-chevron-left"></i>';
            prevButton.setAttribute('title', 'Slide Anterior');
            prevButton.onclick = () => navigateToPreviousSlide(currentSlide, uf);
        }
    } else {
        console.warn("Previous button not found");
    }

    if (nextButton) {
        nextButton.onclick = null;
        if (currentSlide === 4) { // Check if it's the last slide (Slide 4)
            // Para o último slide, o botão próximo mostra um ícone de verificação e é desabilitado
            nextButton.innerHTML = '<i class="fas fa-check"></i>';
            nextButton.setAttribute('title', 'Fim');
            nextButton.disabled = true;
            nextButton.style.opacity = '0.6';
            nextButton.style.cursor = 'not-allowed';
        } else {
            // Para outros slides, o botão próximo navega para o próximo slide
            nextButton.innerHTML = '<i class="fas fa-chevron-right"></i>';
            nextButton.setAttribute('title', 'Próximo Slide');
            nextButton.disabled = false;
            nextButton.style.opacity = '1';
            nextButton.style.cursor = 'pointer';
            nextButton.onclick = () => navigateToNextSlide(currentSlide, uf);
        }
    } else {
         console.warn("Next button not found");
    }
}

// Função para navegar para o próximo slide
function navigateToNextSlide(currentSlide, uf) {
    if (currentSlide && currentSlide < 4 && uf) { // Ensure currentSlide < max slide number
        window.location.href = `slide${currentSlide + 1}.html?uf=${uf}`;
    }
}

// Função para navegar para o slide anterior
function navigateToPreviousSlide(currentSlide, uf) {
    if (currentSlide && currentSlide > 1 && uf) {
        window.location.href = `slide${currentSlide - 1}.html?uf=${uf}`;
    }
}

// Espera que o DOM seja completamente carregado
document.addEventListener('DOMContentLoaded', async () => {
    document.body.classList.add('loaded');
    const fadeElements = document.querySelectorAll('.fade-in');
    setTimeout(() => {
        fadeElements.forEach(element => {
            element.classList.add('active');
        });
    }, 100);

    try {
        // --- Get slide number and UF abbreviation from URL ---
        const currentSlide = getCurrentSlideNumber();
        const { uf: ufAbbreviation } = getUrlParams(); // e.g., "AM"
        if (!ufAbbreviation) throw new Error("UF parameter missing from URL.");
        const upperCaseUfAbbreviation = ufAbbreviation.toUpperCase();

        // --- Declare variables for map data ---
        let geoJSONToUse;
        let geoJSONPath;
        let ufDataForMap = null;
        let intermediateDataForMap = null;
        let immediateDataForMap = null;
        let municipalDataForMap = null; // Variable for municipal data
        let isIntermediaria = false;
        let isImediata = false;
        let isMunicipal = false; // Flag for municipal regions
        let targetRegionId = null; // Variable to store the region ID

        // --- Load common UF CSV data (contains mapping and potentially region) ---
        const ufCSVResponse = await fetch('./uf.csv');
        if (!ufCSVResponse.ok) throw new Error(`Failed to load uf.csv: ${ufCSVResponse.statusText}`);
        const ufCSVText = await ufCSVResponse.text();
        const allUfData = parseCSV(ufCSVText);

        // Find data for the specific UF (using abbreviation) to get its CD_UF and Region
        const ufDataForContent = allUfData.find(data => data.SG_UF_ESC?.toUpperCase() === upperCaseUfAbbreviation);
        if (!ufDataForContent) {
            throw new Error(`Data for UF "${upperCaseUfAbbreviation}" not found in uf.csv.`);
        }
        const targetCdUf = ufDataForContent.CD_UF; // e.g., "13" (as string from CSV)
        if (!targetCdUf) {
             throw new Error(`CD_UF not found for UF "${upperCaseUfAbbreviation}" in uf.csv.`);
        }
        // *** Assume uf.csv has a 'CD_REGIAO' column ***
        targetRegionId = ufDataForContent.CD_REGIAO; // <<< GET REGION ID
        if (!targetRegionId) {
            console.warn(`Region ID (CD_REGIAO) not found for UF "${upperCaseUfAbbreviation}" in uf.csv. Cannot filter by region for Slide 1.`);
            // Consider adding fallback logic here if needed
        }
        console.log(`Target UF: ${upperCaseUfAbbreviation}, Target CD_UF: ${targetCdUf}, Target Region ID: ${targetRegionId}`);


        // --- Conditionally load GeoJSON and specific CSV data for the map ---
        if (currentSlide === 2) {
            // --- Logic for Slide 2 (Intermediate Regions) ---
            isIntermediaria = true;
            geoJSONPath = './intermediaria.geojson';
            console.log(`Slide 2 detected. Loading GeoJSON from: ${geoJSONPath}`);
            const intermediateCSVResponse = await fetch('./intermediaria.csv');
            if (!intermediateCSVResponse.ok) throw new Error(`Failed to load intermediaria.csv: ${intermediateCSVResponse.statusText}`);
            const intermediateCSVText = await intermediateCSVResponse.text();
            const allIntermediateData = parseCSV(intermediateCSVText);
            intermediateDataForMap = allIntermediateData.filter(d => d.CD_UF === targetCdUf);
            console.log(`Filtered Intermediate CSV data for CD_UF ${targetCdUf}:`, intermediateDataForMap);
            if (!intermediateDataForMap || intermediateDataForMap.length === 0) {
                console.warn(`No intermediate CSV data found for CD_UF: ${targetCdUf}`);
            }
            const response = await fetch(geoJSONPath);
            if (!response.ok) throw new Error(`Failed to load ${geoJSONPath}: ${response.statusText}`);
            const fullIntermediateGeoJSON = await response.json();
            const geoJsonUfProperty = 'CD_UF';
            geoJSONToUse = {
                type: "FeatureCollection",
                features: fullIntermediateGeoJSON.features.filter(f => String(f.properties?.[geoJsonUfProperty]) === targetCdUf)
            };
            if (upperCaseUfAbbreviation === "ES" || upperCaseUfAbbreviation === "PE") {
                console.log(`Applying special filter for ${upperCaseUfAbbreviation} to remove small islands...`);
                geoJSONToUse = filterSmallPolygons(geoJSONToUse, 0.01);
            }
            console.log(`Filtered Intermediate GeoJSON for CD_UF ${targetCdUf}:`, geoJSONToUse);
            if (geoJSONToUse.features.length === 0) {
                 console.warn(`No intermediate GeoJSON features found for CD_UF "${targetCdUf}" in ${geoJSONPath}. Check property name '${geoJsonUfProperty}'.`);
            }

        } else if (currentSlide === 3) {
            // --- Logic for Slide 3 (Immediate Regions) ---
            isImediata = true;
            geoJSONPath = './imediata.geojson';
            console.log(`Slide 3 detected. Loading GeoJSON from: ${geoJSONPath}`);
            const immediateCSVResponse = await fetch('./imediata.csv');
            if (!immediateCSVResponse.ok) throw new Error(`Failed to load imediata.csv: ${immediateCSVResponse.statusText}`);
            const immediateCSVText = await immediateCSVResponse.text();
            const allImmediateData = parseCSV(immediateCSVText);
            immediateDataForMap = allImmediateData.filter(d => d.CD_UF === targetCdUf);
            console.log(`Filtered Immediate CSV data for CD_UF ${targetCdUf}:`, immediateDataForMap);
            if (!immediateDataForMap || immediateDataForMap.length === 0) {
                console.warn(`No immediate CSV data found for CD_UF: ${targetCdUf}`);
            }
            const response = await fetch(geoJSONPath);
            if (!response.ok) throw new Error(`Failed to load ${geoJSONPath}: ${response.statusText}`);
            const fullImmediateGeoJSON = await response.json();
            const geoJsonUfProperty = 'CD_UF';
            geoJSONToUse = {
                type: "FeatureCollection",
                features: fullImmediateGeoJSON.features.filter(f => String(f.properties?.[geoJsonUfProperty]) === targetCdUf)
            };
            if (upperCaseUfAbbreviation === "ES" || upperCaseUfAbbreviation === "PE") {
                console.log(`Applying special filter for ${upperCaseUfAbbreviation} to remove small islands...`);
                geoJSONToUse = filterSmallPolygons(geoJSONToUse, 0.01);
            }
            console.log(`Filtered Immediate GeoJSON for CD_UF ${targetCdUf}:`, geoJSONToUse);
            if (geoJSONToUse.features.length === 0) {
                 console.warn(`No immediate GeoJSON features found for CD_UF "${targetCdUf}" in ${geoJSONPath}. Check property name '${geoJsonUfProperty}'.`);
            }

        } else if (currentSlide === 4) {
            // --- Logic for Slide 4 (Municipalities) ---
             isMunicipal = true;
            geoJSONPath = './mun.geojson';
            console.log(`Slide 4 detected. Loading GeoJSON from: ${geoJSONPath}`);
            const municipalCSVResponse = await fetch('./mun.csv');
            if (!municipalCSVResponse.ok) throw new Error(`Failed to load mun.csv: ${municipalCSVResponse.statusText}`);
            const municipalCSVText = await municipalCSVResponse.text();
            const allMunicipalData = parseCSV(municipalCSVText);
            municipalDataForMap = allMunicipalData.filter(d => d.CD_UF === targetCdUf);
            console.log(`Filtered Municipal CSV data for CD_UF ${targetCdUf}:`, municipalDataForMap);
            if (!municipalDataForMap || municipalDataForMap.length === 0) {
                console.warn(`No municipal CSV data found for CD_UF: ${targetCdUf}`);
            }
            const response = await fetch(geoJSONPath);
            if (!response.ok) throw new Error(`Failed to load ${geoJSONPath}: ${response.statusText}`);
            const fullMunicipalGeoJSON = await response.json();
            const geoJsonUfProperty = 'CD_UF';
            geoJSONToUse = {
                type: "FeatureCollection",
                features: fullMunicipalGeoJSON.features.filter(f => String(f.properties?.[geoJsonUfProperty]) === targetCdUf)
            };
            if (upperCaseUfAbbreviation === "ES" || upperCaseUfAbbreviation === "PE") {
                console.log(`Applying special filter for ${upperCaseUfAbbreviation} to remove small islands...`);
                geoJSONToUse = filterSmallPolygons(geoJSONToUse, 0.002);
            }
            console.log(`Filtered Municipal GeoJSON for CD_UF ${targetCdUf}:`, geoJSONToUse);
            if (geoJSONToUse.features.length === 0) {
                 console.warn(`No municipal GeoJSON features found for CD_UF "${targetCdUf}" in ${geoJSONPath}. Check property name '${geoJsonUfProperty}'.`);
            }

        } else {
            // --- Logic for Slide 1 (or other slides not 2, 3, 4) ---
            // Show all UFs within the region of the selected UF
            isIntermediaria = false;
            isImediata = false;
            isMunicipal = false;
            geoJSONPath = './uf.geojson'; // Load the full UF GeoJSON
            console.log(`Slide ${currentSlide} detected. Loading GeoJSON from: ${geoJSONPath} for region ${targetRegionId}`);

            // Fallback logic if region ID is missing
            if (!targetRegionId) {
                console.error(`Cannot determine region for ${upperCaseUfAbbreviation}. Falling back to showing only the selected UF.`);
                 const response = await fetch(geoJSONPath);
                 if (!response.ok) throw new Error(`Failed to load ${geoJSONPath}: ${response.statusText}`);
                 const fullGeoJSON = await response.json();
                 // Filter only for the specific UF
                 geoJSONToUse = {
                     type: "FeatureCollection",
                     features: fullGeoJSON.features.filter(feature => feature.properties.SIGLA_UF?.toUpperCase() === upperCaseUfAbbreviation)
                 };
                 // Use only the single UF's data
                 ufDataForMap = [ufDataForContent];
                 if (geoJSONToUse.features.length === 0) throw new Error(`GeoJSON feature for UF "${upperCaseUfAbbreviation}" not found in ${geoJSONPath}.`);

            } else {
                // Region ID is available, proceed to filter by region
                const response = await fetch(geoJSONPath);
                if (!response.ok) throw new Error(`Failed to load ${geoJSONPath}: ${response.statusText}`);
                const fullGeoJSON = await response.json();

                // *** Filter GeoJSON features by Region ID ***
                // *** Assumes uf.geojson features have properties.CD_REGIAO ***
                const geoJsonRegionProperty = 'CD_REGIAO'; // <<< ADJUST IF PROPERTY NAME IS DIFFERENT
                geoJSONToUse = {
                    type: "FeatureCollection",
                    features: fullGeoJSON.features.filter(feature =>
                        String(feature.properties?.[geoJsonRegionProperty]) === String(targetRegionId) // <<< FILTER GEOJSON BY REGION
                    )
                };

                // Optional: Apply small polygon filter (consider if needed for region view)
                // if (upperCaseUfAbbreviation === "ES" || upperCaseUfAbbreviation === "PE") {
                //     geoJSONToUse = filterSmallPolygons(geoJSONToUse, 0.01);
                // }

                if (geoJSONToUse.features.length === 0) {
                    console.warn(`No GeoJSON features found for Region ID "${targetRegionId}" in ${geoJSONPath}. Check property name '${geoJsonRegionProperty}'. Falling back to single UF.`);
                    // Fallback: show only the selected UF if region filtering yields nothing
                    geoJSONToUse = {
                         type: "FeatureCollection",
                         features: fullGeoJSON.features.filter(feature => feature.properties.SIGLA_UF?.toUpperCase() === upperCaseUfAbbreviation)
                     };
                     ufDataForMap = [ufDataForContent];
                     if (geoJSONToUse.features.length === 0) throw new Error(`GeoJSON feature for UF "${upperCaseUfAbbreviation}" not found in ${geoJSONPath}.`);
                } else {
                    // *** Filter UF CSV data for the map by Region ID ***
                    // *** Assumes uf.csv rows have 'CD_REGIAO' ***
                    ufDataForMap = allUfData.filter(data => String(data.CD_REGIAO) === String(targetRegionId)); // <<< FILTER CSV DATA BY REGION
                    console.log(`Filtered UF CSV data for Region ID ${targetRegionId}:`, ufDataForMap);
                    if (!ufDataForMap || ufDataForMap.length === 0) {
                        console.warn(`No UF CSV data found for Region ID: ${targetRegionId}. Coloring might be affected.`);
                        // Provide empty array if no data found, map might render without colors/popups
                        ufDataForMap = [];
                    }
                }
            }
        }

        // --- Initialize map ---
        const mapElement = document.getElementById('map');
        if (!mapElement) throw new Error("Map container element 'map' not found.");

        console.log("Initializing BrazilMap with:", {
            geoJSON: geoJSONToUse,
            ufData: ufDataForMap, // This will be the region's UFs for slide 1
            intermediateData: intermediateDataForMap,
            immediateData: immediateDataForMap,
            municipalData: municipalDataForMap
        });
        const map = new BrazilMap(
            mapElement,
            geoJSONToUse,
            ufDataForMap, // Pass the potentially region-filtered UF data
            COLOR_MAP, // COLOR_MAP might need adjustment in map-components.js depending on how you want UFs colored
            intermediateDataForMap,
            immediateDataForMap,
            municipalDataForMap
        );
        map.render(); // BrazilMap needs to handle coloring based on the ufDataForMap provided

        // --- Zoom map ---
        setTimeout(() => {
            try {
                if (map?.map && window.L && geoJSONToUse?.features?.length > 0) {
                    const bounds = L.geoJSON(geoJSONToUse).getBounds();
                    if (bounds.isValid()) {
                        // Adjust padding based on map type
                        const padding = (isIntermediaria || isImediata || isMunicipal) ? [20, 20] : [30, 30]; // Slightly less padding for region view
                        map.map.fitBounds(bounds, { padding: padding });
                        console.log(`Map zoomed to bounds of filtered ${geoJSONPath}`);
                    } else {
                        console.warn(`Bounds are not valid for the filtered GeoJSON (${geoJSONPath}). Centering map.`);
                        map.map.setView([-15.7801, -47.9292], 4);
                    }
                } else if (geoJSONToUse?.features?.length === 0) {
                     console.error(`Cannot zoom map: No features found in filtered GeoJSON. Displaying default view.`);
                     if (map?.map) map.map.setView([-15.7801, -47.9292], 4);
                } else {
                    console.error("Map, Leaflet instance (L), or GeoJSON data not available for zooming.");
                    if (map?.map) map.map.setView([-15.7801, -47.9292], 4);
                }
            } catch (zoomError) {
                console.error("Error during map zoom:", zoomError);
                if (map?.map) map.map.setView([-15.7801, -47.9292], 4);
            }
        }, 150);

        // --- Load slide text content ---
        // This still loads content based on the specific UF from the URL
        await loadUFContent(); // Uses ufDataForContent

    } catch (error) {
        console.error('Erro ao inicializar o slide:', error);
        const errorContainer = document.getElementById('error-container');
        if (errorContainer) {
            errorContainer.style.display = 'block';
            errorContainer.textContent = `Erro ao inicializar o slide: ${error.message}`;
        }
        const titleEl = document.getElementById('slide-title');
        const subtitleEl = document.getElementById('slide-subtitle');
        const textEl = document.getElementById('slide-text');
        if(titleEl) titleEl.textContent = 'Erro ao Inicializar';
        if(subtitleEl) subtitleEl.textContent = error.message;
        if(textEl) textEl.innerHTML = '<p>Ocorreu um problema ao carregar os dados ou o mapa.</p>';
        const nextButton = document.getElementById('next-button');
        if (nextButton) nextButton.disabled = true;
        const prevButton = document.getElementById('prev-button');
        if (prevButton) prevButton.disabled = true;
    }
});