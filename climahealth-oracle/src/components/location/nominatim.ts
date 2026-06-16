const USER_AGENT = 'ClimaHealth/1.0 (education; +https://example.invalid/contact)';
function nominatimBase(): string {
    return import.meta.env.DEV ? '/nominatim' : 'https://nominatim.openstreetmap.org';
}
export type NominatimReverseResult = {
    city: string;
    country: string;
    countryCode: string;
};
function pickCity(address: Record<string, string> | undefined): string {
    if (!address)
        return 'Unknown city';
    const v = address.city ||
        address.town ||
        address.village ||
        address.hamlet ||
        address.suburb ||
        address.municipality ||
        address.county ||
        address.state ||
        address.region;
    return v || 'Unknown city';
}
async function reverseGeocodeZoom(lat: number, lng: number, zoom: string): Promise<NominatimReverseResult> {
    const params = new URLSearchParams({
        lat: String(lat),
        lon: String(lng),
        format: 'json',
        zoom,
        'accept-language': 'en',
    });
    const url = `${nominatimBase()}/reverse?${params.toString()}`;
    const res = await fetch(url, {
        headers: {
            Accept: 'application/json',
            'User-Agent': USER_AGENT,
        },
    });
    if (!res.ok) {
        throw new Error(`Reverse geocoding failed (${res.status})`);
    }
    const data = (await res.json()) as {
        address?: Record<string, string>;
        error?: string;
    };
    if (data.error) {
        throw new Error(data.error);
    }
    const address = data.address;
    const country = address?.country ?? 'Unknown country';
    const countryCode = (address?.country_code ?? '').toUpperCase();
    if (!countryCode) {
        throw new Error('No ISO country code in response');
    }
    return {
        city: pickCity(address),
        country,
        countryCode,
    };
}
export async function reverseGeocode(lat: number, lng: number): Promise<NominatimReverseResult> {
    try {
        return await reverseGeocodeZoom(lat, lng, '18');
    }
    catch {
        return await reverseGeocodeZoom(lat, lng, '3');
    }
}
export type NominatimSearchHit = {
    lat: number;
    lng: number;
    displayName: string;
    city: string;
    country: string;
    countryCode: string;
};
export async function searchPlaces(query: string): Promise<NominatimSearchHit[]> {
    const q = query.trim();
    if (q.length < 2)
        return [];
    const params = new URLSearchParams({
        q,
        format: 'json',
        limit: '6',
        addressdetails: '1',
        'accept-language': 'en',
    });
    const url = `${nominatimBase()}/search?${params.toString()}`;
    const res = await fetch(url, {
        headers: {
            Accept: 'application/json',
            'User-Agent': USER_AGENT,
        },
    });
    if (!res.ok) {
        throw new Error(`Search failed (${res.status})`);
    }
    const rows = (await res.json()) as Array<{
        lat: string;
        lon: string;
        display_name: string;
        address?: Record<string, string>;
    }>;
    return rows.map((row) => {
        const address = row.address;
        const countryCode = (address?.country_code ?? '').toUpperCase() || 'XX';
        const country = address?.country ?? '';
        return {
            lat: Number(row.lat),
            lng: Number(row.lon),
            displayName: row.display_name,
            city: pickCity(address),
            country,
            countryCode,
        };
    });
}
