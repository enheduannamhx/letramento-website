// Modificação do index.js para redirecionar para os slides quando uma UF for clicada

// Importar componentes do arquivo map-components.js
import { BrazilMap, Legend, COLOR_MAP, NIVEL_DESCRICOES } from './map-components.js';

// Função para converter CSV em objeto
function parseCSV(csv) {
    const lines = csv.split('\n');
    // Trata cabeçalhos com espaços ou caracteres especiais, removendo aspas se houver
    const headers = lines[0].split(',').map(header => header.trim().replace(/^"|"$/g, ''));
    return lines.slice(1).filter(line => line.trim()).map(line => {
        // Trata valores que podem conter vírgulas dentro de aspas
        const values = [];
        let currentVal = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"' && (i === 0 || line[i-1] !== '\\')) { // Lida com aspas escapadas se necessário
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(currentVal.trim().replace(/^"|"$/g, ''));
                currentVal = '';
            } else {
                currentVal += char;
            }
        }
        values.push(currentVal.trim().replace(/^"|"$/g, '')); // Adiciona o último valor

        const obj = {};
        headers.forEach((header, index) => {
            // Garante que o nome da chave seja consistente (ex: remove espaços extras)
            const cleanHeader = header.trim();
            if (cleanHeader) { // Evita criar chaves vazias
                 obj[cleanHeader] = values[index] !== undefined ? values[index] : '';
            }
        });
        return obj;
    });
}


// Função para redirecionar para o primeiro slide com a UF selecionada
function redirectToSlide(ufCode, ufData) {
    if (ufCode && ufData) {
        // Usa SIGLA_UF ou SG_UF_ESC se disponível, caso contrário usa o ufCode passado
        const ufIdentifier = ufData.SIGLA_UF || ufData.SG_UF_ESC || ufCode;
        console.log(`Redirecionando para slide1.html com UF: ${ufIdentifier}`);
        // Certifique-se que slide1.html espera o parâmetro 'uf'
        window.location.href = `slide1.html?uf=${ufIdentifier}`;
    } else {
        console.warn(`Tentativa de redirecionamento sem ufCode ou ufData válidos. UF Code: ${ufCode}`);
    }
}

// Espera que o DOM seja completamente carregado
document.addEventListener('DOMContentLoaded', async () => {
    // Adiciona a classe 'loaded' ao body após o DOM ser carregado
    document.body.classList.add('loaded');

    // Seleciona todos os elementos com a classe fade-in
    const fadeElements = document.querySelectorAll('.fade-in');

    // Adiciona a classe active a cada elemento após um pequeno delay
    // Isso garante que a transição de opacidade inicial funcione corretamente
    setTimeout(() => {
        fadeElements.forEach(element => {
            element.classList.add('active');
        });
    }, 100); // pequeno delay para garantir que as transições iniciem corretamente

    try {
        // Carregar dados GeoJSON e CSV
        // Usando Promise.all para carregar em paralelo
        const [ufGeoJSONResponse, ufCSVResponse] = await Promise.all([
            fetch('./uf.geojson'),
            fetch('./uf.csv')
        ]);

        // Verifica se as respostas da rede foram bem-sucedidas
        if (!ufGeoJSONResponse.ok) throw new Error(`Falha ao carregar uf.geojson: ${ufGeoJSONResponse.statusText}`);
        if (!ufCSVResponse.ok) throw new Error(`Falha ao carregar uf.csv: ${ufCSVResponse.statusText}`);

        const ufGeoJSON = await ufGeoJSONResponse.json();
        const ufCSVText = await ufCSVResponse.text();
        const ufData = parseCSV(ufCSVText);

        // Verifica se os dados foram carregados e parseados corretamente
        if (!ufGeoJSON || !ufGeoJSON.features) throw new Error("GeoJSON inválido ou vazio.");
        if (!ufData || ufData.length === 0) throw new Error("Dados CSV inválidos ou vazios.");

        console.log("GeoJSON carregado:", ufGeoJSON);
        console.log("Dados UF carregados:", ufData);


        // Inicializar o mapa
        const mapElement = document.getElementById('map');
        if (!mapElement) {
            throw new Error("Elemento 'map' não encontrado no DOM.");
        }

        // Cria a instância do mapa passando a opção para NÃO mostrar detalhes no tooltip
        const map = new BrazilMap(mapElement, ufGeoJSON, ufData, COLOR_MAP, null, null, { showTooltipDetails: false });

        // Adicionar manipulador de clique para redirecionar para os slides
        map.addClickHandler(redirectToSlide);

        // Inicializar a legenda
        const legendContainer = document.getElementById('legend-container');
        if (!legendContainer) {
            throw new Error("Elemento 'legend-container' não encontrado.");
        }

        // Adicionar classe específica para a legenda na página index
        legendContainer.classList.add('index-legend-container');

        const legend = new Legend(legendContainer, COLOR_MAP, map);

        // Renderizar elementos
        map.render();
        legend.render();

    } catch (error) {
        console.error('Erro ao inicializar a página:', error);
        // Opcional: Mostrar mensagem de erro para o usuário
        const errorDisplay = document.createElement('div');
        errorDisplay.textContent = `Ocorreu um erro ao carregar os dados do mapa: ${error.message}. Por favor, tente recarregar a página.`;
        errorDisplay.style.color = 'red';
        errorDisplay.style.padding = '20px';
        errorDisplay.style.textAlign = 'center';
        document.body.insertBefore(errorDisplay, document.body.firstChild); // Mostra no topo
    }
});