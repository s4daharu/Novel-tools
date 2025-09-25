/**
 * Browser-compatible UI helper functions
 */

const toastEl = document.getElementById('toast');
const sidebarEl = document.getElementById('sidebar');



// Base map, can be extended by main.js if new tools are added there
export const toolSectionsMap = {
    'splitter': { elementId: 'splitterApp', title: 'EPUB Chapter Splitter' },
    'backup': { elementId: 'backupApp', title: 'Novel Backup File Utility' },
    'zipToEpub': { elementId: 'zipToEpubApp', title: 'ZIP to EPUB Converter' },
    'epubToZip': { elementId: 'epubToZipApp', title: 'EPUB to ZIP (TXT)' }
};

// --- Touch Gesture State (simplified for browser) ---
let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;
let isSwipeInitiatedFromEdge = false;
let isPotentiallySwipingSidebar = false;

const SWIPE_THRESHOLD = 60;
const SWIPE_EDGE_THRESHOLD = 60;
const SIDEBAR_SWIPE_CLOSE_THRESHOLD = 80;
const MAX_VERTICAL_SWIPE = 80;

export function toggleMenu() {
    sidebarEl?.classList.toggle('open');
}

export function handleTouchStart(event) {
    const touch = event.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    isSwipeInitiatedFromEdge = false;
    isPotentiallySwipingSidebar = false;

    if (!sidebarEl) return;

    if (!sidebarEl.classList.contains('open') && touchStartX > window.innerWidth - SWIPE_EDGE_THRESHOLD) {
        isSwipeInitiatedFromEdge = true;
        isPotentiallySwipingSidebar = true;
    } else if (sidebarEl.classList.contains('open') && touchStartX < sidebarEl.offsetWidth + SIDEBAR_SWIPE_CLOSE_THRESHOLD) {
        isSwipeInitiatedFromEdge = true;
        isPotentiallySwipingSidebar = true;
    }
}

export function handleTouchMove(event) {
    if (!isPotentiallySwipingSidebar || event.touches.length === 0) return;

    const touch = event.touches[0];
    touchEndX = touch.clientX;
    touchEndY = touch.clientY;

    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;

    // If swipe is more horizontal than vertical, and started in a valid zone, prevent default scroll
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10 && isSwipeInitiatedFromEdge) {
        event.preventDefault();
    }
}

export function handleTouchEnd() {
    if (!isSwipeInitiatedFromEdge || !isPotentiallySwipingSidebar || !sidebarEl) {
        isSwipeInitiatedFromEdge = false;
        isPotentiallySwipingSidebar = false;
        return;
    }

    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;
    let menuToggled = false;

    if (Math.abs(deltaY) < MAX_VERTICAL_SWIPE) {
        if (!sidebarEl.classList.contains('open') && deltaX < -SWIPE_THRESHOLD && touchStartX > window.innerWidth - SWIPE_EDGE_THRESHOLD) {
            toggleMenu();
            menuToggled = true;
        } else if (sidebarEl.classList.contains('open') && deltaX > SWIPE_THRESHOLD && touchStartX < sidebarEl.offsetWidth + SIDEBAR_SWIPE_CLOSE_THRESHOLD) {
            toggleMenu();
            menuToggled = true;
        }
    }

    // No haptic feedback in browser
    isSwipeInitiatedFromEdge = false;
    isPotentiallySwipingSidebar = false;
    touchStartX = 0; touchStartY = 0; touchEndX = 0; touchEndY = 0;
}

export function showToast(msg, isError = false) {
    if (!toastEl) {
        console.error("Toast element not found");
        return;
    }
    toastEl.textContent = msg;
    toastEl.className = 'status-toast ' + (isError ? 'toast-error' : 'toast-success');
    toastEl.style.opacity = '1';
    setTimeout(() => { toastEl.style.opacity = '0'; }, 3000);
}

export function toggleSpinner(spinnerElement, show) {
    if (!spinnerElement) {
        return;
    }
    spinnerElement.style.display = show ? 'block' : 'none';
}

function displayTool(appId, currentToolSectionsMap) {
    const dashboardAppEl = document.getElementById('dashboardApp');
    const appTitleEl = document.getElementById('appTitle');

    if (dashboardAppEl) dashboardAppEl.style.display = 'none';

    let currentTitle = 'Novelist Tools';
    let toolDisplayed = false;

    for (const id in currentToolSectionsMap) {
        const toolInfo = currentToolSectionsMap[id];
        const appElement = document.getElementById(toolInfo.elementId);
        if (appElement) {
            if (id === appId) {
                appElement.style.display = 'block';
                currentTitle = toolInfo.title;
                toolDisplayed = true;
            } else {
                appElement.style.display = 'none';
            }
        }
    }
    if (appTitleEl) appTitleEl.textContent = currentTitle;

    if (sidebarEl && sidebarEl.classList.contains('open')) {
        toggleMenu();
    }
    return toolDisplayed;
}

export function showDashboard(fromPopStateUpdate = false, currentToolSectionsMap) {
    const dashboardAppEl = document.getElementById('dashboardApp');
    const appTitleEl = document.getElementById('appTitle');

    if (dashboardAppEl) dashboardAppEl.style.display = 'block';

    for (const id in currentToolSectionsMap) {
        const toolInfo = currentToolSectionsMap[id];
        const appElement = document.getElementById(toolInfo.elementId);
        if (appElement) appElement.style.display = 'none';
    }

    if (appTitleEl) appTitleEl.textContent = 'Novelist Tools';

    if (sidebarEl && sidebarEl.classList.contains('open')) {
        toggleMenu();
    }

    const targetHash = '#dashboard';
    if (!fromPopStateUpdate && window.location.hash !== targetHash) {
        const historyUrl = window.location.protocol === 'blob:' ? null : targetHash;
        history.pushState({ view: 'dashboard' }, 'Novelist Tools Dashboard', historyUrl);
        console.log("UI: Pushed history state for Dashboard. URL used:", historyUrl === null ? "null (blob)" : historyUrl);
    } else if (fromPopStateUpdate) {
         console.log("UI: Show Dashboard from popstate, hash is:", window.location.hash);
    }
    sessionStorage.removeItem('activeToolId');
}

export function launchAppFromCard(appId, fromPopStateUpdate = false, currentToolSectionsMap) {
    const toolDisplayed = displayTool(appId, currentToolSectionsMap);

    if (!toolDisplayed) {
        console.warn(`Tool with ID '${appId}' not found or failed to launch. Showing dashboard.`);
        showDashboard(fromPopStateUpdate, currentToolSectionsMap);
        if (!fromPopStateUpdate) {
             const targetDashboardHash = '#dashboard';
             const historyUrl = window.location.protocol === 'blob:' ? null : targetDashboardHash;
             if (window.location.hash !== targetDashboardHash && historyUrl !== null) {
                history.replaceState({ view: 'dashboard' }, 'Novelist Tools Dashboard', historyUrl);
             }
        }
        return;
    }

    const toolInfo = currentToolSectionsMap[appId];
    const targetToolHash = `#tool-${appId}`;

    if (!fromPopStateUpdate && window.location.hash !== targetToolHash) {
        if (toolInfo) {
            const historyUrl = window.location.protocol === 'blob:' ? null : targetToolHash;
            history.pushState({ view: 'tool', toolId: appId }, toolInfo.title, historyUrl);
            console.log(`UI: Pushed history state for tool '${appId}'. URL used:`, historyUrl === null ? "null (blob)" : historyUrl);
        } else {
            console.error(`Tool info not found for ${appId} during pushState, though displayTool succeeded.`);
        }
    } else if (fromPopStateUpdate) {
        console.log(`UI: Launch app '${appId}' from popstate, hash is:`, window.location.hash);
    }
    sessionStorage.setItem('activeToolId', appId);
}
