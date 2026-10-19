/**
 * Main Application Router and Global Logic
 */

document.addEventListener('DOMContentLoaded', () => {

    // Load Theme Preference Init
    if (localStorage.getItem('coreInventoryTheme') === 'dark') {
        document.body.classList.add('dark-mode');
    }

    // --- ROUTER ---
    const navLinks = document.querySelectorAll('#top-nav .nav-item[data-route], .dropdown-menu a[data-route]');
    const views = document.querySelectorAll('.view');
    
    // Register views map: route-name -> handler script
    const routes = {
        'dashboard': window.dashboardController,
        'products': window.productsController,
        'receipts': window.receiptsController,
        'deliveries': window.deliveriesController,
        'transfers': window.transfersController,
        'adjustments': window.adjustmentsController,
        'stock': window.stockController,
        'move-history': window.moveHistoryController,
        'settings-warehouses': window.settingsWarehousesController,
        'settings-locations': window.settingsLocationsController,
        'profile': window.profileController
    };

    function loadRoute(routeName) {
        // Hide all views
        views.forEach(v => v.classList.remove('active'));
        
        // Remove active class from nav
        navLinks.forEach(l => l.classList.remove('active'));
        
        // Show target view
        const targetView = document.getElementById(`view-${routeName}`);
        if(targetView) {
            targetView.classList.add('active');
        }

        // Highlight nav item (including parent dropdown if nested)
        const activeLink = document.querySelector(`[data-route="${routeName}"]`);
        if(activeLink) {
            activeLink.classList.add('active');
            let parentDropdown = activeLink.closest('.dropdown');
            if(parentDropdown) {
                let parentLink = parentDropdown.querySelector('.nav-item');
                if(parentLink && !parentLink.dataset.route) {
                    parentLink.classList.add('active');
                }
            }
        }

        // Initialize view controller if it exists
        if(routes[routeName] && typeof routes[routeName].init === 'function') {
            routes[routeName].init(targetView);
        }
    }

    // Attach click listeners to nav links
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const route = link.dataset.route;
            if(route) loadRoute(route);
        });
    });

    // Make router globally available
    window.appRouter = { loadRoute };
    
    // Initial Load - Will be triggered by auth.js once login confirms
});
