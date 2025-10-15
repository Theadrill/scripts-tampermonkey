// ==UserScript==
// @name         YouTube Cleaner (Performance Pura)
// @namespace    http://tampermonkey.net/
// @version      9.4
// @description  Cria um painel minimalista no YouTube, removendo vídeos, laterais, comentários e footer (Versão Otimizada).
// @author       Rodrigo Vernaschi
// @match        https://www.youtube.com/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // -------------------------------------------------------------------------------------------------
    // PARTE 1: Configuração da Lista de Elementos a Serem Removidos
    // -------------------------------------------------------------------------------------------------

    // O que esta parte faz:
    // Lista de seletores CSS para os elementos que você quer remover em QUALQUER página do YouTube.
    const ELEMENTOS_PARA_REMOVER = [
        // --- LIMPEZA DE PÁGINAS GERAIS ---
        // NOVO FIX: O que esta parte faz: Remove o rodapé/footer usando o ID global.
        '#footer',

        // O que esta parte faz: Remove todas as seções da barra lateral (menu 'Guide'), exceto a primeira (que contém Início/Histórico).
        'ytd-guide-section-renderer:nth-child(n+2)',

        // O que esta parte faz: Remove o link "Shorts" e "Inscrições" do menu lateral (ambos os formatos).
        'ytd-guide-entry-renderer a[title="Shorts"]',
        'ytd-guide-entry-renderer a[title="Inscrições"]',
        'ytd-mini-guide-entry-renderer a[title="Shorts"]',
        'ytd-mini-guide-entry-renderer a[title="Inscrições"]',

        // --- PÁGINA INICIAL (/home) ---
        // O que esta parte faz: Remove o grid de todos os vídeos e a barra de filtros da Home.
        'ytd-rich-grid-renderer',
        'ytd-feed-filter-chip-bar-renderer',

        // --- PÁGINA DE PESQUISA (/results) ---
        // O que esta parte faz: Remove o bloco de vídeos Shorts em vários formatos.
        'ytd-reel-shelf-renderer',
        'ytd-shelf-renderer',
        'grid-shelf-view-model',
        '.ytGridShelfViewModelGridShelfRow',

        // O que esta parte faz: Remove a barra lateral de resultados de pesquisa (Knowledge Panel/Painel de Conhecimento).
        'ytd-secondary-search-container-renderer',

        // --- PÁGINA DE ASSISTIR (/watch) ---
        // O que esta parte faz: Remove Comentários, barra lateral de relacionados e descrição do vídeo.
        '#comments',
        'ytd-watch-next-secondary-results-renderer',
        '#related',
        '#description-inline-container',
        'ytd-expander',
    ];


    // -------------------------------------------------------------------------------------------------
    // PARTE 2: Lógica de Remoção e Mutation Observer
    // -------------------------------------------------------------------------------------------------

    // O que esta parte faz:
    // Função principal que itera sobre a lista de seletores e remove os elementos encontrados.
    function removerElementos() {
        ELEMENTOS_PARA_REMOVER.forEach(seletor => {
            // O que esta parte faz:
            // Usa querySelectorAll para encontrar todas as ocorrências do seletor.
            const elementos = document.querySelectorAll(seletor);

            if (elementos.length > 0) {
                // O que esta parte faz:
                // Itera sobre os elementos encontrados e os remove do DOM.
                elementos.forEach(elemento => {
                    // O que esta parte faz:
                    // Verifica se o elemento existe e o remove do DOM.
                    if (elemento) {
                        elemento.remove();
                    }
                });
            }
        });
    }


    // O que esta parte faz:
    // Cria o observador para detectar a adição de novos elementos na página.
    const observer = new MutationObserver((mutationsList, observer) => {
        // O que esta parte faz:
        // Chama a função de remoção a cada mudança detectada para lidar com conteúdo carregado dinamicamente.
        removerElementos();
    });

    // O que esta parte faz:
    // Configuração para escutar a adição de novos elementos e alterações na subárvore.
    const config = { childList: true, subtree: true };

    // O que esta parte faz:
    // Inicia a observação no body do documento após o carregamento da página.
    window.addEventListener('load', () => {
        // O que esta parte faz:
        // Roda uma vez no carregamento inicial.
        removerElementos();

        if (document.body) {
            // O que esta parte faz:
            // Inicia o observador no elemento <body> para capturar carregamento dinâmico.
            observer.observe(document.body, config);
        }
    });

})();
