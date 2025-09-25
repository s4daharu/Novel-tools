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
    'zipEpub': { elementId: 'zipEpubApp', title: 'ZIP ↔ EPUB' },
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

// Make PWA functions globally accessible
window.installPWA = installPWA;
window.dismissInstallBanner = dismissInstallBanner;

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
        if ('BeforeInstallPromptEvent' in window && deferredInstallPrompt) {
            showInstallBanner();
        } else {
            // Fallback: show install banner after a delay
            setTimeout(() => {
                if (!installPromptShown) {
                    showInstallBanner();
                }
            }, 5000);
        }
    };

    // Show install prompt after 5 seconds of usage
    setTimeout(showInstallPrompt, 5000);

    // Show install prompt when user interacts with key features
    document.addEventListener('click', (e) => {
        if (e.target.closest('.tool-card') && !installPromptShown) {
            setTimeout(showInstallPrompt, 2000);
        }
    }, { once: true });

    // Show install prompt when user scrolls or interacts more
    let scrollCount = 0;
    document.addEventListener('scroll', () => {
        scrollCount++;
        if (scrollCount > 3 && !installPromptShown) {
            setTimeout(showInstallPrompt, 1000);
        }
    }, { passive: true });
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
                <h3>Install NovelTools</h3>
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
                showToast('Installing NovelTools...', false);
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

    /* Performance optimizations */
    .tool-section {
        will-change: transform, opacity;
    }

    .tool-card {
        will-change: transform;
    }

    .bottom-nav .nav-item {
        will-change: transform;
    }

    /* Reduce motion for users who prefer it */
    @media (prefers-reduced-motion: reduce) {
        * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
        }
    }
`;
document.head.appendChild(style);

// Preload critical tools for mobile-first experience
function preloadCriticalTools() {
    // Preload the most commonly used tools
    const criticalTools = ['splitter', 'createBackupFromZip', 'augmentBackupWithZip'];

    criticalTools.forEach(toolId => {
        if (toolModules[toolId]) {
            toolModules[toolId]().then(module => {
                console.log(`Preloaded tool: ${toolId}`);
            }).catch(error => {
                console.warn(`Failed to preload tool: ${toolId}`, error);
            });
        }
    });
}

// Initialize a specific tool with lazy loading
async function initializeTool(toolId) {
    if (initializedTools.has(toolId)) {
        console.log(`Tool ${toolId} already initialized`);
        return;
    }

    if (!toolModules[toolId]) {
        console.warn(`No module found for tool: ${toolId}`);
        return;
    }

    try {
        console.log(`Initializing tool: ${toolId}`);
        const module = await toolModules[toolId]();
        const toolInfo = toolSectionsMap[toolId];

        if (!toolInfo) {
            console.warn(`No tool info found for: ${toolId}`);
            return;
        }

        // Initialize the tool with its specific function
        const initFunction = getToolInitializer(toolId);
        if (initFunction && module[initFunction]) {
            const spinnerElement = document.getElementById(`spinner${toolId.charAt(0).toUpperCase() + toolId.slice(1)}`) ||
                                 document.getElementById('spinner' + toolId.replace(/([A-Z])/g, '$1').charAt(0).toUpperCase() + toolId.slice(1));

            module[initFunction](showToast, (show) => displaySpinnerElement(spinnerElement, show));
            // Re-apply Tailwind classes in case the tool created new inputs/buttons
            applyTailwindClassesToTools();
            initializedTools.set(toolId, true);
            console.log(`Successfully initialized tool: ${toolId}`);
        } else {
            console.warn(`No initializer found for tool: ${toolId}`);
        }
    } catch (error) {
        console.error(`Failed to initialize tool: ${toolId}`, error);
        showToast(`Failed to load ${toolSectionsMap[toolId]?.title || toolId}`, true);
    }
}

// Get the appropriate initializer function name for each tool
function getToolInitializer(toolId) {
    const initializers = {
        'splitter': 'initializeEpubSplitter',
        'novelSplitter': 'initializeNovelSplitter',
        'zipToEpub': 'initializeZipToEpub',
        'epubToZip': 'initializeEpubToZip',
        'zipEpub': 'initializeZipEpubCombined',
        'createBackupFromZip': 'initializeCreateBackupFromZip',
        'mergeBackup': 'initializeMergeBackup',
        'augmentBackupWithZip': 'initializeAugmentBackupWithZip',
        'findReplaceBackup': 'initializeFindReplaceBackup'
    };

    return initializers[toolId];
}

// Setup intersection observer for lazy loading
function setupLazyLoading() {
    // Lazy load tools when they come into view
    const toolSections = document.querySelectorAll('.tool-section:not(#dashboardApp)');

    if ('IntersectionObserver' in window) {
        const toolObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const toolElement = entry.target;
                    const toolId = Object.keys(toolSectionsMap).find(id =>
                        toolSectionsMap[id].elementId === toolElement.id
                    );

                    if (toolId && !initializedTools.has(toolId)) {
                        initializeTool(toolId);
                        toolObserver.unobserve(toolElement);
                    }
                }
            });
        }, {
            rootMargin: '50px',
            threshold: 0.1
        });

        toolSections.forEach(section => {
            toolObserver.observe(section);
        });
    } else {
        // Fallback for browsers without IntersectionObserver
        console.log('IntersectionObserver not supported, initializing all tools');
        Object.keys(toolSectionsMap).forEach(toolId => {
            if (!initializedTools.has(toolId)) {
                initializeTool(toolId);
            }
        });
    }
}

// Performance monitoring
function initializePerformanceMonitoring() {
    // Monitor Core Web Vitals
    if ('PerformanceObserver' in window) {
        // Largest Contentful Paint
        const lcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            console.log('LCP:', lastEntry.startTime);
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

        // First Input Delay
        const fidObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            entries.forEach(entry => {
                console.log('FID:', entry.processingStart - entry.startTime);
            });
        });
        fidObserver.observe({ entryTypes: ['first-input'] });

        // Cumulative Layout Shift
        const clsObserver = new PerformanceObserver((list) => {
            let clsValue = 0;
            const entries = list.getEntries();
            entries.forEach(entry => {
                if (!entry.hadRecentInput) {
                    clsValue += entry.value;
                }
            });
            console.log('CLS:', clsValue);
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
    }
}

// Initialize performance monitoring
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePerformanceMonitoring);
} else {
    initializePerformanceMonitoring();
}

// Lazy loading for better performance
const toolModules = {
    'splitter': () => import('./epub-splitter.js'),
    'zipToEpub': () => import('./zip-to-epub.js'),
    'epubToZip': () => import('./epub-to-zip.js'),
    'zipEpub': () => Promise.resolve({
        initializeZipEpubCombined: initializeZipEpubCombined
    }),
    'createBackupFromZip': () => import('./create-backup-from-zip.js'),
    'mergeBackup': () => import('./merge-backup.js'),
    'augmentBackupWithZip': () => import('./augment-backup-with-zip.js'),
    'findReplaceBackup': () => import('./find-replace-backup.js')
};

const initializedTools = new Map();

// Initialize the combined ZIP ↔ EPUB tool
async function initializeZipEpubCombined() {
    console.log('Initializing combined ZIP ↔ EPUB tool');

    // Get the combined tool container and host
    const zipEpubApp = document.getElementById('zipEpubApp');
    const zipEpubHost = document.getElementById('zipEpubHost');

    if (!zipEpubApp || !zipEpubHost) {
        console.error('Combined ZIP ↔ EPUB tool containers not found');
        return;
    }

    // Get the existing tool sections
    const zipToEpubApp = document.getElementById('zipToEpubApp');
    const epubToZipApp = document.getElementById('epubToZipApp');

    if (!zipToEpubApp || !epubToZipApp) {
        console.error('Individual tool sections not found');
        return;
    }

    // Move the existing sections into the host container
    zipEpubHost.appendChild(zipToEpubApp);
    zipEpubHost.appendChild(epubToZipApp);

    // Get mode switch buttons
    const zipToEpubModeBtn = document.getElementById('zipToEpubMode');
    const epubToZipModeBtn = document.getElementById('epubToZipMode');

    if (!zipToEpubModeBtn || !epubToZipModeBtn) {
        console.error('Mode switch buttons not found');
        return;
    }

    // Get mode preference from sessionStorage or default to ZIP → EPUB
    const savedMode = sessionStorage.getItem('zipEpubMode') || 'zipToEpub';
    let currentMode = savedMode;
    let zipToEpubInitialized = false;
    let epubToZipInitialized = false;

    // Function to switch modes
    async function switchMode(mode) {
        if (mode === 'zipToEpub') {
            // Show ZIP to EPUB, hide EPUB to ZIP
            zipToEpubApp.style.display = 'block';
            epubToZipApp.style.display = 'none';

            // Update button states
            zipToEpubModeBtn.classList.remove('bg-slate-700', 'text-slate-300', 'hover:bg-slate-600');
            zipToEpubModeBtn.classList.add('bg-primary-600', 'text-white');
            epubToZipModeBtn.classList.remove('bg-primary-600', 'text-white');
            epubToZipModeBtn.classList.add('bg-slate-700', 'text-slate-300', 'hover:bg-slate-600');

            currentMode = 'zipToEpub';

            // Initialize ZIP to EPUB if not already done
            if (!zipToEpubInitialized) {
                try {
                    const mod = await import('./zip-to-epub.js');
                    mod.initializeZipToEpub(showToast, (show) => displaySpinnerElement(document.getElementById('spinnerZipToEpub'), show));
                    zipToEpubInitialized = true;
                    console.log('ZIP to EPUB tool initialized');
                } catch (error) {
                    console.error('Failed to initialize ZIP to EPUB tool:', error);
                }
            }
        } else {
            // Show EPUB to ZIP, hide ZIP to EPUB
            zipToEpubApp.style.display = 'none';
            epubToZipApp.style.display = 'block';

            // Update button states
            epubToZipModeBtn.classList.remove('bg-slate-700', 'text-slate-300', 'hover:bg-slate-600');
            epubToZipModeBtn.classList.add('bg-primary-600', 'text-white');
            zipToEpubModeBtn.classList.remove('bg-primary-600', 'text-white');
            zipToEpubModeBtn.classList.add('bg-slate-700', 'text-slate-300', 'hover:bg-slate-600');

            currentMode = 'epubToZip';

            // Initialize EPUB to ZIP if not already done
            if (!epubToZipInitialized) {
                try {
                    const mod = await import('./epub-to-zip.js');
                    mod.initializeEpubToZip(showToast, (show) => displaySpinnerElement(document.getElementById('spinnerEpubToZip'), show));
                    epubToZipInitialized = true;
                    console.log('EPUB to ZIP tool initialized');
                } catch (error) {
                    console.error('Failed to initialize EPUB to ZIP tool:', error);
                }
            }
        }

        // Save mode preference
        sessionStorage.setItem('zipEpubMode', currentMode);

        // Re-apply Tailwind classes to ensure styling is correct
        applyTailwindClassesToTools();
    }

    // Set initial mode
    switchMode(currentMode);

    // Add event listeners for mode switching
    zipToEpubModeBtn.addEventListener('click', () => switchMode('zipToEpub'));
    epubToZipModeBtn.addEventListener('click', () => switchMode('epubToZip'));

    // Re-apply Tailwind classes to ensure all elements are styled
    applyTailwindClassesToTools();

    console.log('Combined ZIP ↔ EPUB tool initialized successfully');
}

// Initialize the Novel Splitter (Advanced) tool
async function initializeNovelSplitter() {
    console.log('Initializing Novel Splitter (Advanced) tool');

    // Get the iframe element
    const iframe = document.getElementById('novelSplitterFrame');
    if (!iframe) {
        console.error('Novel Splitter iframe not found');
        return;
    }

    // Set the iframe source to load the Novel-Splitter app
    iframe.src = 'To be added/Novel-Splitter/index.html';

    // Add load event listener to handle iframe loading
    iframe.addEventListener('load', () => {
        console.log('Novel Splitter iframe loaded successfully');

        // Optional: Add postMessage listener for communication with iframe if needed
        window.addEventListener('message', (event) => {
            // Handle messages from the iframe if needed
            if (event.origin !== window.location.origin) return;

            console.log('Message from Novel Splitter iframe:', event.data);
        });

        // Re-apply Tailwind classes to ensure styling is correct
        applyTailwindClassesToTools();
    });

    // Handle iframe errors
    iframe.addEventListener('error', (error) => {
        console.error('Failed to load Novel Splitter iframe:', error);
        showToast('Failed to load Novel Splitter', true);
    });

    console.log('Novel Splitter (Advanced) tool initialized successfully');
}

function applyTailwindClassesToTools() {
    const add = (selector, classes) => {
        document.querySelectorAll(selector).forEach(el => {
            classes.forEach(c => el.classList.add(c));
        });
    };

    // Buttons
    add('.btn.btn-primary', [
        'inline-flex','items-center','justify-center','px-4','py-2','rounded-lg','font-medium',
        'bg-primary-600','hover:bg-primary-700','text-white','shadow-lg','hover:shadow-xl',
        'transition-all','duration-200','focus:outline-none','focus:ring-2','focus:ring-primary-500',
        'focus:ring-offset-2','focus:ring-offset-slate-800','disabled:opacity-60','disabled:cursor-not-allowed'
    ]);
    add('.btn.split-btn', [
        'inline-flex','items-center','justify-center','px-4','py-2','rounded-lg','font-medium',
        'bg-primary-600','hover:bg-primary-700','text-white','shadow-lg','hover:shadow-xl',
        'transition-all','duration-200','focus:outline-none','focus:ring-2','focus:ring-primary-500',
        'focus:ring-offset-2','focus:ring-offset-slate-800','disabled:opacity-60','disabled:cursor-not-allowed'
    ]);
    add('.btn.download-btn', [
        'inline-flex','items-center','justify-center','px-4','py-2','rounded-lg','font-medium',
        'bg-orange-600','hover:bg-orange-700','text-white','shadow-lg','hover:shadow-xl',
        'transition-all','duration-200','focus:outline-none','focus:ring-2','focus:ring-orange-500',
        'focus:ring-offset-2','focus:ring-offset-slate-800'
    ]);
    add('.btn.upload-btn', [
        'inline-flex','items-center','justify-center','px-4','py-2','rounded-lg','font-medium',
        'bg-violet-600','hover:bg-violet-700','text-white','shadow-lg','hover:shadow-xl',
        'transition-all','duration-200','focus:outline-none','focus:ring-2','focus:ring-violet-500',
        'focus:ring-offset-2','focus:ring-offset-slate-800'
    ]);
    add('.btn.btn-accent', [
        'bg-teal-600','hover:bg-teal-700','text-white','shadow-lg','hover:shadow-xl'
    ]);
    add('.btn.btn-small', ['px-3','py-1','text-sm']);

    // Tool sections
    add('.card.tool-section', [
        'max-w-3xl','md:max-w-4xl','mx-auto','p-4','md:p-6','bg-slate-800/50','backdrop-blur-sm','border','border-slate-700','rounded-xl','shadow-sm','space-y-5','animate-fade-in'
    ]);
    document.querySelectorAll('.tool-section h1').forEach(h => h.classList.add('text-2xl','md:text-3xl','font-bold','text-white','mb-5','text-center'));

    // Form elements
    add('.option-group, .options-section, .mode-section', ['max-w-md','mx-auto']);
    document.querySelectorAll('.option-group input, .option-group select, .option-group textarea').forEach(el => {
        el.classList.add(
            'bg-slate-700','border','border-slate-600','rounded-lg','px-3','py-2','text-white',
            'focus:border-primary-500','focus:ring-2','focus:ring-primary-500','focus:ring-opacity-50',
            'transition-all','duration-200','w-full'
        );
    });
    document.querySelectorAll('.option-group label:not(.checkbox-label-wrapper)').forEach(el => {
        el.classList.add('block','text-sm','font-medium','text-slate-300','mb-2');
    });

    // File display area
    add('.filename-display-area', ['bg-slate-700','border','border-slate-600','rounded-lg','p-3','text-sm','text-slate-400','mt-2']);
    add('.clear-file-btn', ['text-slate-400','hover:text-white','transition-colors']);

    // Spinners
    add('.spinner, .spinner-backup', [
        'w-8','h-8','rounded-full','border-4','border-slate-600','border-t-primary-500','animate-spin','my-4','mx-auto'
    ]);

    // Status messages
    add('#statusMessage, .status', [
        'rounded-md','p-3','text-sm','text-center','mt-4'
    ]);
    add('#statusMessage.success, .status.success', ['bg-green-600','text-white']);
    add('#statusMessage.error, .status.error', ['bg-red-600','text-white']);

    // Tool info text
    add('.tool-info-text', ['text-slate-400','text-sm','text-center','mt-2']);

    // Lists and accordions
    add('.chapter-selection-list, .chapter-list-draggable, .advanced-options-accordion', ['max-w-xl','mx-auto']);

    // Upload/download/status areas
    add('.upload-section, .download-section', ['text-center','mx-auto']);

    // Find & Replace button grid
    add('.fr-action-buttons-grid', ['gap-3','md:gap-4','justify-items-stretch']);

    // Checkbox styling
    add('.checkbox-label-wrapper', ['flex','items-center','gap-2','justify-start','text-slate-200','select-none','cursor-pointer']);
    add('.checkbox-label-wrapper input[type="checkbox"]', ['w-4','h-4','align-middle','rounded','border-slate-500','focus:ring-2','focus:ring-primary-500','focus:ring-offset-2','focus:ring-offset-slate-800']);

    // Toast
    const toast = document.getElementById('toast');
    if (toast) {
        toast.classList.add(
            'fixed','bottom-20','left-1/2','-translate-x-1/2','px-4','py-2','rounded-lg','text-white','font-medium','z-50','transition-all','duration-300'
        );
    }
}

export function initializeApp() {
    registerServiceWorker();

    // Preload critical tools for mobile-first experience
    preloadCriticalTools();

    // Initialize only the tools that are immediately visible
    const hash = window.location.hash;
    if (hash.startsWith('#tool-')) {
        const toolId = hash.substring('#tool-'.length);
        if (toolSectionsMap[toolId]) {
            initializeTool(toolId);
        }
    }

    // Add intersection observer for lazy loading
    setupLazyLoading();


    // Apply Tailwind utility classes to tools UI (no build, dynamic)
    applyTailwindClassesToTools();

    function routeApp(fromPopStateUpdate) {
        const hash = window.location.hash;
        console.log(`Routing based on hash: '${hash}', fromPopStateUpdate: ${fromPopStateUpdate}`);

        // Handle legacy hash redirects
        if (hash === '#tool-zipToEpub' || hash === '#tool-epubToZip') {
            const newHash = '#tool-zipEpub';
            if (!fromPopStateUpdate) {
                const historyUrl = window.location.protocol === 'blob:' ? null : newHash;
                if (historyUrl !== null) {
                    history.replaceState({ view: 'tool', toolId: 'zipEpub' }, 'ZIP ↔ EPUB', historyUrl);
                }
            }
            uiLaunchAppFromCard('zipEpub', fromPopStateUpdate, toolSectionsMap);
            return;
        }

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
                        history.replaceState({ view: 'dashboard' }, 'NovelTools Dashboard', historyUrl);
                     }
                }
            }
        } else if (hash === '#dashboard' || hash === '') {
            uiShowDashboard(fromPopStateUpdate, toolSectionsMap);
            if (hash === '' && !fromPopStateUpdate) {
                const targetDashboardHash = '#dashboard';
                const historyUrl = window.location.protocol === 'blob:' ? null : targetDashboardHash;
                if (historyUrl !== null) {
                    history.pushState({ view: 'dashboard' }, 'NovelTools Dashboard', historyUrl);
                }
            }
        } else {
            console.warn(`Unknown hash: ${hash}. Defaulting to dashboard.`);
            uiShowDashboard(fromPopStateUpdate, toolSectionsMap);
            if (!fromPopStateUpdate) {
                const targetDashboardHash = '#dashboard';
                const historyUrl = window.location.protocol === 'blob:' ? null : targetDashboardHash;
                if (window.location.hash !== targetDashboardHash && historyUrl !== null) {
                   history.replaceState({ view: 'dashboard' }, 'NovelTools Dashboard', historyUrl);
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
