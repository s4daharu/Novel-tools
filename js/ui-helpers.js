/**
 * Browser-compatible UI helper functions
 */

const toastEl = document.getElementById('toast');
const sidebarEl = document.getElementById('sidebar');



// Base map, can be extended by main.js if new tools are added there
export const toolSectionsMap = {
    'splitter': { elementId: 'splitterApp', title: 'EPUB Chapter Splitter' },
    'mergeBackup': { elementId: 'mergeBackupApp', title: 'Merge Backup Files' },
    'augmentBackupWithZip': { elementId: 'augmentBackupWithZipApp', title: 'Augment Backup with ZIP' },
    'findReplaceBackup': { elementId: 'findReplaceBackupApp', title: 'Find & Replace in Backup' },
    'createBackupFromZip': { elementId: 'createBackupFromZipApp', title: 'Create Backup from ZIP' },
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
let isPotentiallySwipingTools = false;
let currentToolIndex = 0;
let toolHistory = ['dashboard']; // Track navigation history for swipe back

const SWIPE_THRESHOLD = 80; // Increased threshold for better swipe detection
const SWIPE_EDGE_THRESHOLD = 60;
const SIDEBAR_SWIPE_CLOSE_THRESHOLD = 80;
const MAX_VERTICAL_SWIPE = 100; // Allow more vertical movement
const BOTTOM_NAV_TOOLS = ['dashboard', 'splitter', 'createBackupFromZip', 'augmentBackupWithZip'];

export function toggleMenu() {
    sidebarEl?.classList.toggle('open');
}

export function handleTouchStart(event) {
    const touch = event.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    isSwipeInitiatedFromEdge = false;
    isPotentiallySwipingSidebar = false;
    isPotentiallySwipingTools = false;

    if (!sidebarEl) return;

    // Check for sidebar swipe (edge gestures)
    if (!sidebarEl.classList.contains('open') && touchStartX > window.innerWidth - SWIPE_EDGE_THRESHOLD) {
        isSwipeInitiatedFromEdge = true;
        isPotentiallySwipingSidebar = true;
    } else if (sidebarEl.classList.contains('open') && touchStartX < sidebarEl.offsetWidth + SIDEBAR_SWIPE_CLOSE_THRESHOLD) {
        isSwipeInitiatedFromEdge = true;
        isPotentiallySwipingSidebar = true;
    }

    // Check for tool navigation swipe (center area)
    if (touchStartX > 50 && touchStartX < window.innerWidth - 50) {
        isPotentiallySwipingTools = true;
    }
}

export function handleTouchMove(event) {
    if ((!isPotentiallySwipingSidebar && !isPotentiallySwipingTools) || event.touches.length === 0) return;

    const touch = event.touches[0];
    touchEndX = touch.clientX;
    touchEndY = touch.clientY;

    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;

    // Handle sidebar swipe
    if (isPotentiallySwipingSidebar && isSwipeInitiatedFromEdge) {
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
            event.preventDefault();
        }
    }

    // Handle tool navigation swipe
    if (isPotentiallySwipingTools && Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 20) {
        event.preventDefault();
    }
}

export function handleTouchEnd() {
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;

    // Handle sidebar swipe
    if (isSwipeInitiatedFromEdge && isPotentiallySwipingSidebar && sidebarEl) {
        if (Math.abs(deltaY) < MAX_VERTICAL_SWIPE) {
            if (!sidebarEl.classList.contains('open') && deltaX < -SWIPE_THRESHOLD && touchStartX > window.innerWidth - SWIPE_EDGE_THRESHOLD) {
                toggleMenu();
            } else if (sidebarEl.classList.contains('open') && deltaX > SWIPE_THRESHOLD && touchStartX < sidebarEl.offsetWidth + SIDEBAR_SWIPE_CLOSE_THRESHOLD) {
                toggleMenu();
            }
        }
    }

    // Handle tool navigation swipe
    if (isPotentiallySwipingTools && Math.abs(deltaY) < MAX_VERTICAL_SWIPE && Math.abs(deltaX) > SWIPE_THRESHOLD) {
        handleToolSwipe(deltaX);
    }

    // Reset all swipe states
    isSwipeInitiatedFromEdge = false;
    isPotentiallySwipingSidebar = false;
    isPotentiallySwipingTools = false;
    touchStartX = 0; touchStartY = 0; touchEndX = 0; touchEndY = 0;
}

// Handle swipe navigation between tools
function handleToolSwipe(deltaX) {
    const currentView = getCurrentView();
    const currentIndex = BOTTOM_NAV_TOOLS.indexOf(currentView);

    if (currentIndex === -1) return;

    let newIndex;
    if (deltaX > SWIPE_THRESHOLD) {
        // Swipe right - go to previous tool
        newIndex = currentIndex > 0 ? currentIndex - 1 : BOTTOM_NAV_TOOLS.length - 1;
    } else if (deltaX < -SWIPE_THRESHOLD) {
        // Swipe left - go to next tool
        newIndex = currentIndex < BOTTOM_NAV_TOOLS.length - 1 ? currentIndex + 1 : 0;
    } else {
        return; // Swipe not significant enough
    }

    const newTool = BOTTOM_NAV_TOOLS[newIndex];
    navigateToTool(newTool);
}

// Get current view based on visible elements
function getCurrentView() {
    const dashboardApp = document.getElementById('dashboardApp');
    if (dashboardApp && !dashboardApp.classList.contains('hidden')) {
        return 'dashboard';
    }

    // Check which tool is currently visible
    for (const toolId of BOTTOM_NAV_TOOLS) {
        if (toolId === 'dashboard') continue;

        const toolElement = document.getElementById(toolSectionsMap[toolId]?.elementId);
        if (toolElement && !toolElement.classList.contains('hidden')) {
            return toolId;
        }
    }

    return 'dashboard'; // Default fallback
}

// Navigate to a specific tool with animation
function navigateToTool(toolId) {
    if (toolId === 'dashboard') {
        showDashboard();
    } else if (toolSectionsMap[toolId]) {
        launchAppFromCard(toolId);
    }

    // Add visual feedback for swipe
    showSwipeFeedback(toolId);
}

// Show visual feedback for swipe navigation
function showSwipeFeedback(toolId) {
    const feedback = document.createElement('div');
    feedback.className = 'swipe-feedback';
    feedback.textContent = `→ ${toolSectionsMap[toolId]?.title || 'Dashboard'}`;
    feedback.style.cssText = `
        position: fixed;
        top: 50%;
        right: 20px;
        transform: translateY(-50%);
        background: var(--accent-color);
        color: white;
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 14px;
        font-weight: 500;
        z-index: 1000;
        opacity: 0;
        transition: all 0.3s ease;
        pointer-events: none;
    `;

    document.body.appendChild(feedback);

    // Animate in
    setTimeout(() => {
        feedback.style.opacity = '1';
        feedback.style.transform = 'translateY(-50%) translateX(-10px)';
    }, 10);

    // Animate out and remove
    setTimeout(() => {
        feedback.style.opacity = '0';
        feedback.style.transform = 'translateY(-50%) translateX(-20px)';
        setTimeout(() => {
            if (feedback.parentNode) {
                feedback.parentNode.removeChild(feedback);
            }
        }, 300);
    }, 1500);
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
    console.log('🔧 displayTool called with appId:', appId);
    console.log('🔧 currentToolSectionsMap:', currentToolSectionsMap);

    const dashboardAppEl = document.getElementById('dashboardApp');
    const appTitleEl = document.getElementById('appTitle');

    console.log('🔧 dashboardAppEl found:', !!dashboardAppEl);

    // Hide dashboard using Tailwind hidden class
    if (dashboardAppEl) {
        console.log('🔧 Hiding dashboard');
        dashboardAppEl.classList.add('hidden');
    }

    let currentTitle = 'Novelist Tools';
    let toolDisplayed = false;

    for (const id in currentToolSectionsMap) {
        const toolInfo = currentToolSectionsMap[id];
        const appElement = document.getElementById(toolInfo.elementId);
        console.log(`🔧 Checking tool ${id}: elementId=${toolInfo.elementId}, element found:`, !!appElement);

        if (appElement) {
            if (id === appId) {
                console.log(`🔧 Showing tool ${id} by removing hidden class`);
                // Show tool by removing hidden class
                appElement.classList.remove('hidden');
                currentTitle = toolInfo.title;
                toolDisplayed = true;
                console.log(`🔧 Tool ${id} should now be visible`);
            } else {
                console.log(`🔧 Hiding tool ${id} by adding hidden class`);
                // Hide tool by adding hidden class
                appElement.classList.add('hidden');
            }
        } else {
            console.warn(`🔧 Tool element not found for ${id}: ${toolInfo.elementId}`);
        }
    }

    if (appTitleEl) {
        console.log('🔧 Setting title to:', currentTitle);
        appTitleEl.textContent = currentTitle;
    }

    if (sidebarEl && sidebarEl.classList.contains('open')) {
        toggleMenu();
    }

    console.log('🔧 displayTool completed, toolDisplayed:', toolDisplayed);
    return toolDisplayed;
}

export function showDashboard(fromPopStateUpdate = false, currentToolSectionsMap) {
    const dashboardAppEl = document.getElementById('dashboardApp');
    const appTitleEl = document.getElementById('appTitle');

    // Show dashboard by removing hidden class
    if (dashboardAppEl) {
        dashboardAppEl.classList.remove('hidden');
    }

    // Hide all tools using Tailwind hidden class
    for (const id in currentToolSectionsMap) {
        const toolInfo = currentToolSectionsMap[id];
        const appElement = document.getElementById(toolInfo.elementId);
        if (appElement) {
            appElement.classList.add('hidden');
        }
    }

    if (appTitleEl) appTitleEl.textContent = 'Novelist Tools';

    if (sidebarEl && sidebarEl.classList.contains('open')) {
        toggleMenu();
    }

    // Update bottom navigation active state
    updateBottomNavActiveState('dashboard');

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

    // Update bottom navigation active state
    updateBottomNavActiveState(appId);

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

// Update bottom navigation active state
export function updateBottomNavActiveState(activeView) {
    const bottomNav = document.getElementById('bottomNav');
    if (!bottomNav) return;

    // Remove active class from all nav items
    const navItems = bottomNav.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.classList.remove('active');
    });

    // Add active class to the appropriate nav item
    const activeNavItem = bottomNav.querySelector(`[onclick*="${activeView}"]`);
    if (activeNavItem) {
        activeNavItem.classList.add('active');
    } else {
        // If no specific match found, try to find by data attribute or other means
        navItems.forEach(item => {
            const onclickAttr = item.getAttribute('onclick');
            if (onclickAttr && onclickAttr.includes(activeView)) {
                item.classList.add('active');
            }
        });
    }
}
