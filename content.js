// --- SETTINGS ---
const DOC_ID = "9050728085032276"; // Static for AdLibraryAdDetailsV2Query
const MAX_RETRIES = 3; // Maximum number of retry attempts

// --- Storage ---
const adsData = [];
let isProcessing = false; // Flag to prevent duplicate processing

function overlayImpressions() {
    // Find all ad containers with only 'xh8yej3' class
    const ads = Array.from(document.querySelectorAll('div.xh8yej3')).filter(div => div.classList.length === 1);

    console.log('Ads found:', ads.length);

    let newAdsFound = false;

    ads.forEach((ad, index) => {
        const libraryIdSpan = Array.from(ad.querySelectorAll('span')).find(span => 
            span.textContent.includes('Library ID:')
        );

        if (libraryIdSpan) {
            const libraryIdText = libraryIdSpan.textContent.trim();
            const libraryId = libraryIdText.split(':')[1].trim();

            // Only push if not already added
            if (!adsData.some(adData => adData.libraryId === libraryId)) {
                adsData.push({ path: ad, libraryId });
                newAdsFound = true;
                // console.log(`✅ Ad ${index + 1} Library ID added:`, libraryId);
            } else {
                // console.log(`⚠️ Ad ${index + 1} already exists:`, libraryId);
            }
        } else {
            // console.log(`❌ Ad ${index + 1}: No Library ID found`);
        }
    });

    // If new ads found and not already processing, start fetching data
    if (newAdsFound && !isProcessing && adsData.length > 0) {
        console.log("New ads detected, starting fetch process...");
        setTimeout(fetchAllAdsData, 1500); // Small delay to ensure DOM is stable
    }
}

// First scan
overlayImpressions();

// Watch page for new ads
const observer = new MutationObserver(() => {
    overlayImpressions();
});
observer.observe(document.body, {
    childList: true,
    subtree: true
});

// --- Fetch function for Ad details ---
async function fetchAdDetails(libraryId, adElement, retryCount = 0) {
    function getLSDToken() {
        const html = document.documentElement.innerHTML;
        const match = html.match(/"LSD",\[\],{"token":"([^"]+)"/);
        return match ? match[1] : null;
    }

    const lsdToken = getLSDToken();
    if (!lsdToken) {
        console.error('No LSD token found. Cannot proceed.');
        return;
    }

    const variables = {
        adArchiveID: libraryId,
        pageID: null, // still optional
        country: "ALL",
        sessionID: crypto.randomUUID(),
        source: null,
        isAdNonPolitical: true,
        isAdNotAAAEligible: false,
        __relay_internal__pv__AdLibraryFinservGraphQLGKrelayprovider: true
    };

    const formBody = new URLSearchParams({
        av: "0",
        __user: "0",
        __a: "1",
        __comet_req: "1",
        fb_api_caller_class: "RelayModern",
        fb_api_req_friendly_name: "AdLibraryAdDetailsV2Query",
        lsd: lsdToken,
        doc_id: DOC_ID,
        variables: JSON.stringify(variables)
    });

    try {
        const response = await fetch('https://www.facebook.com/api/graphql/', {
            method: 'POST',
            headers: {
                'accept': '*/*',
                'content-type': 'application/x-www-form-urlencoded',
                'x-fb-friendly-name': 'AdLibraryAdDetailsV2Query',
                'x-fb-lsd': lsdToken,
                'Referer': location.href,
            },
            body: formBody.toString(),
            credentials: 'include',
        });

        if (!response.ok) {
            console.error(`❌ Request failed (Attempt ${retryCount + 1}/${MAX_RETRIES}):`, response.status, response.statusText);
            
            if (retryCount < MAX_RETRIES - 1) {
                console.log(`Retrying in 2 seconds... (${retryCount + 1}/${MAX_RETRIES})`);
                await new Promise(resolve => setTimeout(resolve, 2000));
                return fetchAdDetails(libraryId, adElement, retryCount + 1);
            } else {
                createNonEUBadge(libraryId, adElement);
                return;
            }
        }

        const data = await response.json();

        // --- 🔥 Important: Only log EU Reach ---
        const reach = data?.data?.ad_library_main?.ad_details?.aaa_info?.eu_total_reach;
        if (reach !== undefined) {
            console.log(`📈 Library ID ${libraryId} | EU Total Reach:`, reach);

            // Attach badge to ad element
            const badge = document.createElement('div');
            badge.innerText = `EU Reach: ${reach}`;
            badge.style.position = 'absolute';
            badge.style.top = '10px';
            badge.style.right = '10px';
            badge.style.background = '#ff5722';
            badge.style.color = '#fff';
            badge.style.padding = '5px 10px';
            badge.style.borderRadius = '5px';
            badge.style.zIndex = 1000;
            badge.style.fontSize = '12px';
            badge.style.fontWeight = 'bold';
            badge.setAttribute('data-eu-reach-badge', 'true'); // Mark badge for identification
            adElement.style.position = 'relative'; // Ensure the ad element is positioned
            adElement.appendChild(badge);
        } else {
            console.warn(`⚠️ Library ID ${libraryId} | EU Total Reach not available (Attempt ${retryCount + 1}/${MAX_RETRIES})`);
            
            if (retryCount < MAX_RETRIES - 1) {
                console.log(`Retrying in 2 seconds... (${retryCount + 1}/${MAX_RETRIES})`);
                await new Promise(resolve => setTimeout(resolve, 2000));
                return fetchAdDetails(libraryId, adElement, retryCount + 1);
            } else {
                createNonEUBadge(libraryId, adElement);
            }
        }

    } catch (error) {
        console.error(`❌ Fetch error for Library ID ${libraryId} (Attempt ${retryCount + 1}/${MAX_RETRIES}):`, error);
        
        if (retryCount < MAX_RETRIES - 1) {
            console.log(`Retrying in 2 seconds... (${retryCount + 1}/${MAX_RETRIES})`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            return fetchAdDetails(libraryId, adElement, retryCount + 1);
        } else {
            createNonEUBadge(libraryId, adElement);
        }
    }
}

// Helper function to create a badge for non-EU ads
function createNonEUBadge(libraryId, adElement) {
    console.log(`⛔ Library ID ${libraryId} | Marking as non-EU ad after ${MAX_RETRIES} failed attempts`);
    
    const badge = document.createElement('div');
    badge.innerText = `Non-EU Ad`;
    badge.style.position = 'absolute';
    badge.style.top = '10px';
    badge.style.right = '10px';
    badge.style.background = '#9e9e9e'; // Gray color for non-EU ads
    badge.style.color = '#fff';
    badge.style.padding = '5px 10px';
    badge.style.borderRadius = '5px';
    badge.style.zIndex = 1000;
    badge.style.fontSize = '12px';
    badge.style.fontWeight = 'bold';
    badge.setAttribute('data-eu-reach-badge', 'true'); // Mark badge for identification
    adElement.style.position = 'relative'; // Ensure the ad element is positioned
    adElement.appendChild(badge);
}

// --- Randomized Loop ---
async function fetchAllAdsData() {
    if (isProcessing) return;
    isProcessing = true;
    
    console.log("Starting to fetch data for all ads...");
    for (const ad of adsData) {
        // Skip ads that already have badges
        if (ad.path.querySelector('[data-eu-reach-badge]')) {
            continue;
        }
        
        await new Promise(resolve => setTimeout(resolve, Math.random() * 1500 + 500)); // random delay 0.25-1.25s
        await fetchAdDetails(ad.libraryId, ad.path);
    }
    
    isProcessing = false;
    
    // Check for any new ads that might have been added during processing
    if (adsData.some(ad => !ad.path.querySelector('[data-eu-reach-badge]'))) {
        console.log("Found ads without badges, restarting fetch process...");
        setTimeout(fetchAllAdsData, 1000);
    }
}

