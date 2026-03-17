# Microdados ENEM - Análise de Redação (Escolas Estaduais)

## Visão Geral

Este projeto visualiza e analisa os dados de desempenho na redação do ENEM 2024, com foco nas escolas da rede estadual do Brasil. Ele apresenta os dados de forma interativa através de mapas e textos explicativos, divididos em diferentes níveis geográficos.

## Funcionalidades

*   **Mapa Interativo Inicial:** Exibe o mapa do Brasil com os estados (UFs) coloridos de acordo com o desempenho médio na redação. Tooltips mostram a pontuação ao passar o mouse.
*   **Navegação por Estado:** Clicar em um estado no mapa inicial leva a uma apresentação detalhada de 4 slides sobre aquele estado.
*   **Análise Multi-nível:**
    *   **Slide 1:** Comparativo do desempenho do estado (UF) com a média nacional, regional e escolas particulares.
    *   **Slide 2:** Mapa e análise das Regiões Geográficas Intermediárias dentro do estado selecionado.
    *   **Slide 3:** Mapa e análise das Regiões Geográficas Imediatas dentro do estado selecionado.
    *   **Slide 4:** Mapa e análise dos Municípios dentro do estado selecionado, destacando os melhores e piores desempenhos.
*   **Conteúdo Dinâmico:** Títulos, subtítulos e textos de análise para cada slide e estado são carregados dinamicamente do arquivo `slides.json`.
*   **Efeito Typewriter:** O texto de análise é exibido com um efeito de digitação.
*   **Navegação entre Slides:** Botões permitem avançar e retroceder entre os slides da análise estadual e retornar ao mapa inicial.

## Tecnologias Utilizadas

*   HTML5
*   CSS3
*   JavaScript (ES6+)
*   Leaflet.js (para mapas interativos)
*   GeoJSON (para dados geográficos)
*   JSON (para conteúdo textual)
*   CSV (para dados de desempenho)

## Estrutura do Projeto

```
.
├── .gitignore             # Arquivos ignorados pelo Git
├── media/                 # Imagens (logos, ícones)
│   ├── brasil.png
│   ├── LOGO LETRUS 2024_BRANCA.png
│   └── LOGO LETRUS 2024.png
├── Prompt/                # (Provável) Scripts e arquivos de geração/análise de dados
├── theater/               # (Não utilizado/Indefinido)
├── .vscode/               # Configurações do VS Code
│   └── settings.json
├── imediata.csv           # Dados tabulares das Regiões Imediatas
├── imediata.geojson       # Dados geográficos das Regiões Imediatas
├── index.css              # Estilos principais (página inicial, mapa base)
├── index.html             # Página inicial com mapa do Brasil (UFs)
├── index.js               # Lógica da página inicial (mapa, interações)
├── intermediaria.csv      # Dados tabulares das Regiões Intermediárias
├── intermediaria.geojson  # Dados geográficos das Regiões Intermediárias
├── leiame.md              # Este arquivo
├── map-components.js      # Módulo com classes reutilizáveis para o mapa (BrazilMap, Legend)
├── mun.csv                # Dados tabulares dos Municípios
├── mun.geojson            # Dados geográficos dos Municípios
├── package.json           # Metadados do projeto Node.js
├── slide1.html            # Template HTML para o Slide 1 (UF)
├── slide2.html            # Template HTML para o Slide 2 (Intermediária)
├── slide3.html            # Template HTML para o Slide 3 (Imediata)
├── slide4.html            # Template HTML para o Slide 4 (Município)
├── slides.css             # Estilos específicos para as páginas de slide
├── slides.js              # Lógica principal das páginas de slide (carregamento de dados, mapa, navegação)
├── slides.json            # Arquivo central com todo o conteúdo textual (títulos, subtítulos, textos) para cada slide/estado
├── slides.md              # (Provável) Arquivo fonte/rascunho para o conteúdo de slides.json
├── type.js                # Módulo com a função para o efeito typewriter
├── uf.csv                 # Dados tabulares das Unidades Federativas (Estados)
└── uf.geojson             # Dados geográficos das Unidades Federativas (Estados)
```

## Dados

*   **Geográficos:** Arquivos `.geojson` definem os limites para UFs, Regiões Intermediárias, Regiões Imediatas e Municípios.
*   **Desempenho:** Arquivos `.csv` contêm as pontuações médias, rankings e níveis de desempenho correspondentes a cada nível geográfico.
*   **Textual:** O arquivo `slides.json` armazena todo o conteúdo de texto (títulos, subtítulos, parágrafos de análise) que é exibido nos slides, organizado por sigla do estado (UF) e número do slide (1 a 4).

## Como Executar

1.  Clone o repositório.
2.  Abra o arquivo `index.html` em um navegador web.
    *   *Nota:* Dependendo das configurações de segurança do navegador, pode ser necessário servir os arquivos através de um servidor local simples (ex: `python -m http.server` ou a extensão Live Server do VS Code) para evitar problemas de CORS ao carregar os arquivos `.geojson`, `.csv` e `.json`.