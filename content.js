// --- SETTINGS ---
const DOC_ID = "9050728085032276"; // Static for AdLibraryAdDetailsV2Query

// --- Storage ---
const adsData = [];

function overlayImpressions() {
    // Find all ad containers with only 'xh8yej3' class
    const ads = Array.from(document.querySelectorAll('div.xh8yej3')).filter(div => div.classList.length === 1);

    console.log('Ads found:', ads.length);

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
                // console.log(`✅ Ad ${index + 1} Library ID added:`, libraryId);
            } else {
                // console.log(`⚠️ Ad ${index + 1} already exists:`, libraryId);
            }
        } else {
            // console.log(`❌ Ad ${index + 1}: No Library ID found`);
        }
    });
}

// First scan
overlayImpressions();

// Watch page for new ads
const observer = new MutationObserver(() => overlayImpressions());
observer.observe(document.body, {
    childList: true,
    subtree: true
});

// --- Fetch function for Ad details ---
async function fetchAdDetails(libraryId, adElement) {
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
            console.error('❌ Request failed:', response.status, response.statusText);
            return;
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
            adElement.style.position = 'relative'; // Ensure the ad element is positioned
            adElement.appendChild(badge);
        } else {
            console.warn(`⚠️ Library ID ${libraryId} | EU Total Reach not available`);
            console.log('Full response:', data);
        }

    } catch (error) {
        console.error('❌ Fetch error for Library ID', libraryId, ':', error);
    }
}

// --- Randomized Loop ---
async function fetchAllAdsData() {
    for (const ad of adsData) {
        await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 1000)); // random delay 1-3s
        await fetchAdDetails(ad.libraryId, ad.path);
    }
}

// --- Button to Start Fetching ---
const btn = document.createElement('button');
btn.innerText = "🚀 Fetch All Ad Details";
btn.style.position = 'fixed';
btn.style.top = '20px';
btn.style.right = '20px';
btn.style.zIndex = 9999;
btn.style.padding = '10px 20px';
btn.style.background = '#00c853';
btn.style.color = '#fff';
btn.style.border = 'none';
btn.style.borderRadius = '5px';
btn.style.cursor = 'pointer';
btn.onclick = fetchAllAdsData;

document.body.appendChild(btn);

