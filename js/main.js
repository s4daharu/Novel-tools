/**
 * Main application entry point - Browser compatible version
 */

import {
    toggleMenu as uiToggleMenu,
    launchAppFromCard as uiLaunchAppFromCard,
    showDashboard as uiShowDashboard,
    showToast,
    toggleSpinner as displaySpinnerElement,
    toolSectionsMap as baseToolSectionsMap,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd
} from './ui-helpers.js';

import { triggerDownload } from './browser-helpers.js';
import { initializeEpubSplitter } from './epub-splitter.js';
import { initializeZipToEpub } from './zip-to-epub.js';
import { initializeEpubToZip } from './epub-to-zip.js';
import { initializeCreateBackupFromZip } from './create-backup-from-zip.js';

import { initializeMergeBackup } from './merge-backup.js';
import { initializeAugmentBackupWithZip } from './augment-backup-with-zip.js';
import { initializeFindReplaceBackup } from './find-replace-backup.js';

// Extend toolSectionsMap from ui-helpers
export const toolSectionsMap = {
    'splitter': { elementId: 'splitterApp', title: 'EPUB Chapter Splitter' },
    'zipToEpub': { elementId: 'zipToEpubApp', title: 'ZIP to EPUB Converter' },
    'epubToZip': { elementId: 'epubToZipApp', title: 'EPUB to ZIP (TXT)' },
    'createBackupFromZip': { elementId: 'createBackupFromZipApp', title: 'Create Backup from ZIP' },
    'mergeBackup': { elementId: 'mergeBackupApp', title: 'Merge Backup Files' },
    'augmentBackupWithZip': { elementId: 'augmentBackupWithZipApp', title: 'Augment Backup with ZIP' },
    'findReplaceBackup': { elementId: 'findReplaceBackupApp', title: 'Find & Replace in Backup File' }
};

// Bottom navigation tool mapping for mobile
export const bottomNavTools = {
    'splitter': 'splitter',
    'createBackupFromZip': 'createBackupFromZip',
    'augmentBackupWithZip': 'augmentBackupWithZip'
};

// Attach functions to window object for inline HTML event handlers
window.toggleMenu = () => {
    uiToggleMenu();
};
window.launchAppFromCard = (appId) => {
    uiLaunchAppFromCard(appId, false, toolSectionsMap);
};
window.showDashboard = () => {
    uiShowDashboard(false, toolSectionsMap);
};

function registerServiceWorker() {
    if ('serviceWorker' in navigator && (window.location.protocol === 'http:' || window.location.protocol === 'https:')) {
        const swUrl = new URL('service-worker.js', window.location.href).href;
        navigator.serviceWorker.register(swUrl)
            .then(registration => {
                console.log('Service Worker registered with scope:', registration.scope);

                // Initialize PWA install prompts
                initPWAPrompts(registration);

                // Listen for service worker updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    if (newWorker) {
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                showUpdateNotification();
                            }
                        });
                    }
                });
            })
            .catch(error => {
                console.error('Service Worker registration failed:', error);
            });
    }
}

// Initialize PWA install prompts and features
function initPWAPrompts(registration) {
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
        console.log('App is running in standalone mode (installed)');
        return;
    }

    // Show install prompt after user interaction
    let installPromptShown = false;
    const showInstallPrompt = () => {
        if (installPromptShown) return;
        installPromptShown = true;

        // Check if device supports PWA installation
        if ('BeforeInstallPromptEvent' in window) {
            showInstallBanner();
        }
    };

    // Show install prompt after 3 seconds of usage
    setTimeout(showInstallPrompt, 3000);

    // Show install prompt when user interacts with key features
    document.addEventListener('click', (e) => {
        if (e.target.closest('.tool-card') && !installPromptShown) {
            setTimeout(showInstallPrompt, 1000);
        }
    }, { once: true });
}

// Show install banner
function showInstallBanner() {
    // Check if banner already exists
    if (document.querySelector('.install-banner')) return;

    const banner = document.createElement('div');
    banner.className = 'install-banner';
    banner.innerHTML = `
        <div class="install-banner-content">
            <div class="install-banner-icon">📱</div>
            <div class="install-banner-text">
                <h3>Install Novelist Tools</h3>
                <p>Get the full app experience with offline support and quick access!</p>
            </div>
            <div class="install-banner-actions">
                <button class="install-btn" onclick="installPWA()">Install</button>
                <button class="dismiss-btn" onclick="dismissInstallBanner()">Later</button>
            </div>
        </div>
    `;

    banner.style.cssText = `
        position: fixed;
        top: 80px;
        left: 20px;
        right: 20px;
        background: linear-gradient(135deg, var(--accent-color), var(--accent-color-darker));
        color: white;
        padding: 16px;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        z-index: 1000;
        animation: slideInFromTop 0.4s ease-out;
        display: flex;
        align-items: center;
        gap: 16px;
    `;

    const content = banner.querySelector('.install-banner-content');
    content.style.cssText = `
        display: flex;
        align-items: center;
        gap: 16px;
        flex: 1;
    `;

    const icon = banner.querySelector('.install-banner-icon');
    icon.style.cssText = `
        font-size: 24px;
        flex-shrink: 0;
    `;

    const text = banner.querySelector('.install-banner-text');
    text.style.cssText = `
        flex: 1;
    `;

    const textH3 = text.querySelector('h3');
    textH3.style.cssText = `
        margin: 0 0 4px 0;
        font-size: 16px;
        font-weight: 600;
    `;

    const textP = text.querySelector('p');
    textP.style.cssText = `
        margin: 0;
        font-size: 14px;
        opacity: 0.9;
    `;

    const actions = banner.querySelector('.install-banner-actions');
    actions.style.cssText = `
        display: flex;
        gap: 8px;
        flex-shrink: 0;
    `;

    const installBtn = banner.querySelector('.install-btn');
    installBtn.style.cssText = `
        background: rgba(255, 255, 255, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.3);
        color: white;
        padding: 8px 16px;
        border-radius: 6px;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s ease;
    `;

    const dismissBtn = banner.querySelector('.dismiss-btn');
    dismissBtn.style.cssText = `
        background: transparent;
        border: 1px solid rgba(255, 255, 255, 0.3);
        color: white;
        padding: 8px 16px;
        border-radius: 6px;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s ease;
    `;

    // Add hover effects
    installBtn.addEventListener('mouseenter', () => {
        installBtn.style.background = 'rgba(255, 255, 255, 0.3)';
    });

    installBtn.addEventListener('mouseleave', () => {
        installBtn.style.background = 'rgba(255, 255, 255, 0.2)';
    });

    dismissBtn.addEventListener('mouseenter', () => {
        dismissBtn.style.background = 'rgba(255, 255, 255, 0.1)';
    });

    dismissBtn.addEventListener('mouseleave', () => {
        dismissBtn.style.background = 'transparent';
    });

    document.body.appendChild(banner);

    // Auto-dismiss after 10 seconds
    setTimeout(() => {
        if (banner.parentNode) {
            dismissInstallBanner();
        }
    }, 10000);
}

// Install PWA
async function installPWA() {
    try {
        const deferredPrompt = window.deferredInstallPrompt;
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;

            if (outcome === 'accepted') {
                console.log('User accepted PWA installation');
                showToast('Installing Novelist Tools...', false);
            } else {
                console.log('User declined PWA installation');
            }

            window.deferredInstallPrompt = null;
        } else {
            // Fallback: try to install via service worker
            if ('serviceWorker' in navigator) {
                const registration = await navigator.serviceWorker.ready;
                console.log('Service worker ready for installation');
                showToast('Opening installation dialog...', false);
            }
        }
    } catch (error) {
        console.error('PWA installation failed:', error);
        showToast('Installation not available on this device', true);
    }

    dismissInstallBanner();
}

// Dismiss install banner
function dismissInstallBanner() {
    const banner = document.querySelector('.install-banner');
    if (banner) {
        banner.style.animation = 'slideOutToTop 0.3s ease-in';
        setTimeout(() => {
            if (banner.parentNode) {
                banner.parentNode.removeChild(banner);
            }
        }, 300);
    }
}

// Show update notification
function showUpdateNotification() {
    showToast('App update available! Refresh to get the latest version.', false);

    // Add a subtle update indicator
    const updateIndicator = document.createElement('div');
    updateIndicator.className = 'update-indicator';
    updateIndicator.innerHTML = '🔄 Update Available';
    updateIndicator.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: var(--success-color);
        color: white;
        padding: 8px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 500;
        z-index: 1000;
        cursor: pointer;
        animation: pulse 2s infinite;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    `;

    updateIndicator.addEventListener('click', () => {
        window.location.reload();
    });

    document.body.appendChild(updateIndicator);

    // Auto-hide after 5 seconds
    setTimeout(() => {
        if (updateIndicator.parentNode) {
            updateIndicator.parentNode.removeChild(updateIndicator);
        }
    }, 5000);
}

// Listen for beforeinstallprompt event
let deferredInstallPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    console.log('PWA installation prompt available');
});

// Add CSS animations for install banner
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInFromTop {
        from {
            transform: translateY(-100%);
            opacity: 0;
        }
        to {
            transform: translateY(0);
            opacity: 1;
        }
    }

    @keyframes slideOutToTop {
        from {
            transform: translateY(0);
            opacity: 1;
        }
        to {
            transform: translateY(-100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

export function initializeApp() {
    registerServiceWorker();

    const spinnerSplEl = document.getElementById('spinnerSplitter');
    const spinnerZipToEpubEl = document.getElementById('spinnerZipToEpub');
    const spinnerEpubToZipEl = document.getElementById('spinnerEpubToZip');
    const spinnerCreateBackupFromZipEl = document.getElementById('spinnerCreateBackupFromZip');
    const spinnerMergeBackupEl = document.getElementById('spinnerMergeBackup');
    const spinnerAugmentBackupEl = document.getElementById('spinnerAugmentBackup');
    const spinnerFindReplaceBackupEl = document.getElementById('spinnerFindReplaceBackup');

    initializeEpubSplitter(showToast, (show) => displaySpinnerElement(spinnerSplEl, show));
    initializeZipToEpub(showToast, (show) => displaySpinnerElement(spinnerZipToEpubEl, show));
    initializeEpubToZip(showToast, (show) => displaySpinnerElement(spinnerEpubToZipEl, show));
    initializeCreateBackupFromZip(showToast, (show) => displaySpinnerElement(spinnerCreateBackupFromZipEl, show));
    initializeMergeBackup(showToast, (show) => displaySpinnerElement(spinnerMergeBackupEl, show));
    initializeAugmentBackupWithZip(showToast, (show) => displaySpinnerElement(spinnerAugmentBackupEl, show));
    initializeFindReplaceBackup(showToast, (show) => displaySpinnerElement(spinnerFindReplaceBackupEl, show));

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);

    function routeApp(fromPopStateUpdate) {
        const hash = window.location.hash;
        console.log(`Routing based on hash: '${hash}', fromPopStateUpdate: ${fromPopStateUpdate}`);
        if (hash.startsWith('#tool-')) {
            const toolId = hash.substring('#tool-'.length);
            if (toolSectionsMap[toolId]) {
                uiLaunchAppFromCard(toolId, fromPopStateUpdate, toolSectionsMap);
            } else {
                console.warn(`Invalid tool ID in hash: ${toolId}. Defaulting to dashboard.`);
                uiShowDashboard(fromPopStateUpdate, toolSectionsMap);
                if (!fromPopStateUpdate) {
                    const targetDashboardHash = '#dashboard';
                    const historyUrl = window.location.protocol === 'blob:' ? null : targetDashboardHash;
                     if (window.location.hash !== targetDashboardHash && historyUrl !== null) {
                        history.replaceState({ view: 'dashboard' }, 'Novelist Tools Dashboard', historyUrl);
                     }
                }
            }
        } else if (hash === '#dashboard' || hash === '') {
            uiShowDashboard(fromPopStateUpdate, toolSectionsMap);
            if (hash === '' && !fromPopStateUpdate) {
                const targetDashboardHash = '#dashboard';
                const historyUrl = window.location.protocol === 'blob:' ? null : targetDashboardHash;
                if (historyUrl !== null) {
                    history.pushState({ view: 'dashboard' }, 'Novelist Tools Dashboard', historyUrl);
                }
            }
        } else {
            console.warn(`Unknown hash: ${hash}. Defaulting to dashboard.`);
            uiShowDashboard(fromPopStateUpdate, toolSectionsMap);
            if (!fromPopStateUpdate) {
                const targetDashboardHash = '#dashboard';
                const historyUrl = window.location.protocol === 'blob:' ? null : targetDashboardHash;
                if (window.location.hash !== targetDashboardHash && historyUrl !== null) {
                   history.replaceState({ view: 'dashboard' }, 'Novelist Tools Dashboard', historyUrl);
                }
            }
        }
    }

    window.addEventListener('popstate', (event) => {
        console.log("MAIN: Popstate event. State:", event.state, "Current Hash:", window.location.hash);
        routeApp(true);
    });

    // Initial routing logic
    if (window.location.protocol === 'blob:') {
        console.log("MAIN: Initial load from blob URL. Showing dashboard directly.");
        uiShowDashboard(true, toolSectionsMap);
    } else if (window.location.hash) {
        console.log("MAIN: Initial load with hash:", window.location.hash);
        routeApp(true);
    } else {
        const persistedToolId = sessionStorage.getItem('activeToolId');
        if (persistedToolId && toolSectionsMap[persistedToolId]) {
            console.log(`MAIN: Initial load, no hash, persisted tool: ${persistedToolId}`);
            uiLaunchAppFromCard(persistedToolId, false, toolSectionsMap);
        } else {
            console.log("MAIN: Initial load, no hash, no persisted tool. Showing dashboard.");
            uiShowDashboard(false, toolSectionsMap);
        }
    }
}
