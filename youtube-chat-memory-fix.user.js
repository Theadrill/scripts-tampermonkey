// ==UserScript==
// @name         YouTube Live Chat Memory Fix (Automação e Manual) + Layout Fix
// @namespace    http://tampermonkey.net/
// @version      1.9
// @description  Recarrega o Live Chat a cada minuto (para memória), adiciona botão manual com feedback, reposiciona a playlist, e garante que os controles do chat fiquem no topo.
// @author       Rodrigo Vernaschi
// @match        https://www.youtube.com/watch?v=*
// @grant        GM_addStyle
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    // -------------------------------------------------------------------------------------------------
    // PARTE 1: Configuração e Variáveis Globais
    // -------------------------------------------------------------------------------------------------

    // O que esta parte faz: Define o seletor exato do contêiner principal do Live Chat.
    const CHAT_CONTAINER_SELECTOR = 'ytd-live-chat-frame';
    
    // O que esta parte faz: Define o contêiner de injeção para o botão de chat.
    const CHAT_INJECTION_POINT_SELECTOR = '#chat-container';

    // O que esta parte faz: Define o seletor do elemento que queremos mover (Painel da Playlist).
    const PLAYLIST_PANEL_SELECTOR = 'ytd-playlist-panel-renderer';
    
    // O que esta parte faz: Define o seletor do elemento que deve vir depois da playlist (Metadados do Vídeo).
    const METADATA_SELECTOR = 'ytd-watch-metadata';

    // O que esta parte faz: Define o ID do botão de recarga.
    const RELOAD_BUTTON_ID = 'yt-chat-reload-button-manual';

    // O que esta parte faz: Define o ID do elemento de status.
    const STATUS_ELEMENT_ID = 'yt-chat-reload-status';
    
    // O que esta parte faz: Define o ID do contêiner mestre dos controles.
    const CONTROLS_DIV_ID = 'yt-chat-fix-controls';
    
    // O que esta parte faz: Define o intervalo de recarga automática (60000 ms = 1 minuto).
    const INTERVALO_RECARGA_MS = 60000; 

    // O que esta parte faz: Variável para armazenar o timestamp da última recarga.
    let ultimaRecargaTimestamp = 0; 
    
    // O que esta parte faz: Variável para armazenar o ID do setInterval de automação.
    let refreshIntervalId = null; 
    
    // O que esta parte faz: Injeta estilos CSS (estilização mantida da V1.6/V1.7).
    GM_addStyle(`
        /* ----------------------- ESTILOS DE CONTROLE ----------------------- */
        #${CONTROLS_DIV_ID} {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 10px; 
            background-color: var(--yt-live-chat-background-color, #282828); 
            border-bottom: 1px solid var(--yt-spec-border-divider);
            z-index: 1000; 
            font-family: var(--yt-spec-font-family); 
        }

        /* ----------------------- ESTILOS DO BOTÃO ----------------------- */
        #${RELOAD_BUTTON_ID} {
            background-color: var(--yt-spec-button-chip-background); 
            border: 1px solid var(--yt-spec-10-percent-layer); 
            color: var(--yt-spec-text-primary);
            padding: 8px 16px;
            border-radius: 18px; 
            cursor: pointer;
            font-size: 14px;
            font-weight: 500; 
            transition: background-color 0.2s;
            text-transform: uppercase;
        }

        /* O que esta parte faz: ESTILO HOVER: Fundo cinza mais claro. */
        #${RELOAD_BUTTON_ID}:hover {
            background-color: var(--yt-spec-icon-color-white-a10, rgba(255, 255, 255, 0.1)); 
        }
        
        /* ----------------------- ESTILOS DO TEXTO DE STATUS ----------------------- */
        #${STATUS_ELEMENT_ID} {
            font-size: 13px;
            font-weight: 500; 
            padding: 4px 8px;
            border-radius: 8px; 
            background-color: var(--yt-spec-wordmark-heading-color, rgba(255, 255, 255, 0.08)); 
            color: var(--yt-spec-text-primary) !important; 
        }
        
        /* O que esta parte faz: Define a cor verde para status de sucesso. */
        .status-success {
            color: var(--yt-spec-successful-color) !important;
        }

        /* O que esta parte faz: Define a cor vermelha para status de falha/erro (e tempo limite). */
        .status-error {
            color: var(--yt-spec-error-color) !important;
        }
    `);

    // -------------------------------------------------------------------------------------------------
    // PARTE 2: Lógica de Recarga e Feedback (Mantida)
    // -------------------------------------------------------------------------------------------------
    
    // [FUNÇÃO updateStatusText]
    // O que esta parte faz: Atualiza o texto de status do recarregamento e inicia o contador.
    function updateStatusText(success) {
        const statusEl = document.getElementById(STATUS_ELEMENT_ID);
        if (!statusEl) return; 

        statusEl.classList.remove('status-success', 'status-error');
        if (statusEl.interval) clearInterval(statusEl.interval);

        if (success) {
            ultimaRecargaTimestamp = Date.now();
        } else if (ultimaRecargaTimestamp === 0) {
            statusEl.textContent = 'Ainda não recarregado';
            return;
        } else {
            statusEl.classList.add('status-error');
            statusEl.textContent = 'ERRO: Chat não pôde ser recarregado!';
            return;
        }

        const updateTimeDisplay = () => {
            if (ultimaRecargaTimestamp === 0) {
                statusEl.textContent = 'Ainda não recarregado';
                return;
            }
            
            const elapsed = Math.floor((Date.now() - ultimaRecargaTimestamp) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            
            let timeStr;
            if (minutes > 0) {
                timeStr = `${minutes} min e ${seconds} seg`;
            } else {
                timeStr = `${seconds} seg`;
            }

            if (minutes >= 3) { 
                statusEl.classList.add('status-error');
                statusEl.classList.remove('status-success');
            } else {
                statusEl.classList.add('status-success');
                statusEl.classList.remove('status-error');
            }
            
            statusEl.textContent = `Chat recarregado há: ${timeStr}`;
        };

        updateTimeDisplay();
        statusEl.interval = setInterval(updateTimeDisplay, 1000);
    }
    
    // [FUNÇÃO recarregarChat]
    // O que esta parte faz: Remove e reinsere o elemento do chat na DOM.
    function recarregarChat(manual = false) {
        const chatElement = document.querySelector(CHAT_CONTAINER_SELECTOR);
        const button = document.getElementById(RELOAD_BUTTON_ID);

        if (chatElement && chatElement.isConnected) {
            
            if (manual && button) {
                button.textContent = 'Recarregando...';
                button.disabled = true;
            }

            const parent = chatElement.parentElement;
            
            if (parent) {
                const placeholder = document.createComment('CHAT RELOAD PLACEHOLDER');
                parent.replaceChild(placeholder, chatElement);
                chatElement.remove(); 
                
                setTimeout(() => {
                    parent.replaceChild(chatElement, placeholder);
                    updateStatusText(true); 
                    
                    if (manual && button) {
                        button.textContent = 'RECARREGAR CHAT (LIMPAR MEMÓRIA)';
                        button.disabled = false;
                    }
                    console.log(`[YouTube Live Chat Fix] Chat recarregado (Manual: ${manual ? 'Sim' : 'Não'}).`);
                }, 500); 
                return true;
            }
        }
        
        if (manual) {
            updateStatusText(false); 
            if (button) {
                button.textContent = 'CHAT NÃO ENCONTRADO.';
                button.disabled = true;
                setTimeout(() => {
                    button.textContent = 'RECARREGAR CHAT (LIMPAR MEMÓRIA)';
                    button.disabled = false;
                }, 5000);
            }
        }
        return false;
    }

    // -------------------------------------------------------------------------------------------------
    // PARTE 3: Lógica de Reposicionamento da Playlist
    // -------------------------------------------------------------------------------------------------

    // O que esta parte faz:
    // Move o elemento da playlist para a posição desejada (após o chat, antes dos metadados).
    function reposicionarPlaylist() {
        const playlistPanel = document.querySelector(PLAYLIST_PANEL_SELECTOR);
        const metadata = document.querySelector(METADATA_SELECTOR);
        const primaryInner = metadata ? metadata.parentElement : null; 
        
        if (!playlistPanel || !metadata || !primaryInner) {
            return false;
        }

        // O que esta parte faz: Verifica se a playlist está fora do lugar (não está imediatamente antes dos metadados).
        if (playlistPanel.nextElementSibling !== metadata) {

             // O que esta parte faz: Move a playlist para a posição correta (antes de ytd-watch-metadata).
             primaryInner.insertBefore(playlistPanel, metadata);
             console.log('[YouTube Layout Fix] Painel da Playlist reposicionado com sucesso.');
             return true;
        }
        
        return false;
    }

    // O que esta parte faz:
    // GARANTE QUE O BOTÃO DE CONTROLE ESTEJA SEMPRE ACIMA DO CHAT.
    function fixarPosicaoControles() {
        // O que esta parte faz: Encontra o contêiner de injeção (o elemento antes do qual os controles devem estar).
        const injectionPoint = document.querySelector(CHAT_INJECTION_POINT_SELECTOR);
        // O que esta parte faz: Encontra o nosso contêiner de controles.
        const controlsDiv = document.getElementById(CONTROLS_DIV_ID);

        // O que esta parte faz: Verifica se o ponto de injeção e nossos controles existem.
        if (injectionPoint && controlsDiv) {
            // O que esta parte faz: Se o nosso elemento de controle NÃO é o elemento que antecede diretamente o #chat-container,
            // ou se o pai do nosso elemento não é o mesmo pai do #chat-container.
            if (injectionPoint.previousElementSibling !== controlsDiv) {
                
                const injectionParent = injectionPoint.parentElement;
                
                // O que esta parte faz: Remove de onde estiver e insere no local correto (imediatamente antes do injectionPoint).
                if (injectionParent) {
                    injectionParent.insertBefore(controlsDiv, injectionPoint);
                    console.log('[YouTube Chat Fix] Controles de chat reposicionados para o topo.');
                    return true;
                }
            }
        }
        return false;
    }
    
    // -------------------------------------------------------------------------------------------------
    // PARTE 4: Injeção do Botão e Inicialização
    // -------------------------------------------------------------------------------------------------

    // [FUNÇÃO iniciarRecargaAutomatica]
    // O que esta parte faz: Inicia o loop de recarga automática.
    function iniciarRecargaAutomatica() {
        if (refreshIntervalId) clearInterval(refreshIntervalId); 
        
        refreshIntervalId = setInterval(() => recarregarChat(false), INTERVALO_RECARGA_MS);
        
        updateStatusText(false); 
        
        console.log('[YouTube Live Chat Fix] Recarga automática iniciada.');
    }

    // [FUNÇÃO injetarControles]
    // O que esta parte faz: Tenta injetar os controles de chat no ponto exato ou corrigir sua posição.
    function injetarControles() {
        const injectionPoint = document.querySelector(CHAT_INJECTION_POINT_SELECTOR);
        const controlsDiv = document.getElementById(CONTROLS_DIV_ID);
        
        if (injectionPoint && !controlsDiv) {
            // Lógica de injeção inicial (se o botão não existe, cria).
            const liveChatFrame = document.querySelector(CHAT_CONTAINER_SELECTOR);

            if (liveChatFrame) {
                
                const newControlsDiv = document.createElement('div');
                newControlsDiv.id = CONTROLS_DIV_ID;

                const statusEl = document.createElement('span');
                statusEl.id = STATUS_ELEMENT_ID;
                
                const reloadButton = document.createElement('button');
                reloadButton.id = RELOAD_BUTTON_ID;
                reloadButton.textContent = 'RECARREGAR CHAT (LIMPAR MEMÓRIA)';
                
                reloadButton.addEventListener('click', () => recarregarChat(true));

                newControlsDiv.appendChild(statusEl);
                newControlsDiv.appendChild(reloadButton);

                // O que esta parte faz: Insere o novo contêiner *antes* do #chat-container.
                injectionPoint.parentElement.insertBefore(newControlsDiv, injectionPoint); 

                iniciarRecargaAutomatica();
                recarregarChat(false); 
                
                return true;
            }
        } else if (controlsDiv) {
            // O que esta parte faz: Lógica de correção (se o botão existe, fixa a posição).
            fixarPosicaoControles();
        }
        return false;
    }

    // O que esta parte faz:
    // Observador principal: Garante a injeção, o reposicionamento da playlist e a posição dos controles.
    const observer = new MutationObserver((mutationsList, observer) => {
        // O que esta parte faz: Tenta injetar os controles e/ou corrigir sua posição.
        injetarControles();
        
        // O que esta parte faz: Tenta reposicionar a playlist.
        reposicionarPlaylist();
    });

    // O que esta parte faz:
    // Adiciona listener para redimensionamento da janela.
    window.addEventListener('resize', () => {
        // O que esta parte faz: Ao redimensionar, tenta reposicionar a playlist e corrigir os controles.
        clearTimeout(window._resizeTimer);
        window._resizeTimer = setTimeout(() => {
            reposicionarPlaylist();
            fixarPosicaoControles();
        }, 250);
    });

    // O que esta parte faz:
    // Inicia a observação no body do documento após o carregamento da página.
    window.addEventListener('load', () => {
         // O que esta parte faz: Observa o corpo do documento para mudanças na estrutura.
         observer.observe(document.body, { childList: true, subtree: true });
    });

})();
