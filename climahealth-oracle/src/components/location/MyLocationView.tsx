import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle, Database, Globe, Loader2, LoaderCircle, MapPin, MapPinOff, Radio, Search, Wifi, } from 'lucide-react';
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAppStore } from '../../store/appStore';
import { getLatestDataForCountry } from '../../data/generateData';
import { alpha2toAlpha3 } from '../../data/alpha2toAlpha3';
import { getClimateDataset, getCountrySeriesByCode } from '../../data/climateDataset';
import { dominantDiseaseName } from '../dashboard/dashboardModel';
import { IntelAlertsSection, IntelDiseasesSection, IntelPrecautionsSection } from '../dashboard/countryIntelBlocks';
import { getLatestHistoricalWeek, riskLevelLabel, whatIfRiskTriple } from './myLocationModel';
import { RiskGauge } from './RiskGauge';
import { buildMergedPredictionChartData, fetchForecast7, fetchRealAirQuality, fetchRealWeather, type OpenMeteoDaily, type RealAirQuality, type RealWeather, } from './openMeteoWeather';
type LocationState = 'idle' | 'requesting' | 'locating' | 'success' | 'denied';
type DenialReason = 'permission_denied' | 'not_supported' | 'position_unavailable' | 'mapping_failed' | 'nominatim_failed' | 'all_failed' | null;
type LocationMethod = 'gps' | 'ip' | 'manual';
type LocationData = {
    city: string;
    country: string;
    alpha3: string;
    lat: number;
    lng: number;
    method: LocationMethod;
};
type CountryOption = {
    alpha2: string;
    alpha3: string;
    country: string;
    city: string;
    lat: number;
    lng: number;
};
const WHO_PM25_ANNUAL_UGM3 = 5;
const DAY_MS = 24 * 60 * 60 * 1000;
const capitals: Record<string, string> = {
    IND: 'New Delhi',
    USA: 'Washington D.C.',
    GBR: 'London',
    CHN: 'Beijing',
    JPN: 'Tokyo',
    DEU: 'Berlin',
    FRA: 'Paris',
    BRA: 'Brasilia',
    AUS: 'Canberra',
    CAN: 'Ottawa',
    RUS: 'Moscow',
    ZAF: 'Pretoria',
    NGA: 'Abuja',
    EGY: 'Cairo',
    SAU: 'Riyadh',
    PAK: 'Islamabad',
    BGD: 'Dhaka',
    IDN: 'Jakarta',
    MEX: 'Mexico City',
    ARG: 'Buenos Aires',
};
function flagEmoji(alpha2: string): string {
    const code = alpha2.toUpperCase();
    if (code.length !== 2)
        return '';
    return String.fromCodePoint(...[...code].map((c) => 127397 + c.charCodeAt(0)));
}
function LiveCurrentConditionsPanel({ synthetic, realWeather, realAirQuality, weatherLoading, liveFetchDone, }: {
    synthetic: {
        temperature: number;
        humidity: number;
        rainfall: number;
        pm25: number;
        aqi: number;
    };
    realWeather: RealWeather | null;
    realAirQuality: RealAirQuality | null;
    weatherLoading: boolean;
    liveFetchDone: boolean;
}) {
    const temp = realWeather?.temperature ?? synthetic.temperature;
    const hum = realWeather?.humidity ?? synthetic.humidity;
    const rain = realWeather?.rainfall ?? synthetic.rainfall;
    const pm = realAirQuality?.pm25 ?? synthetic.pm25;
    const aqi = realAirQuality?.aqi ?? synthetic.aqi;
    const hasLive = realWeather != null && realAirQuality != null;
    const showPulse = weatherLoading;
    const showUpdatingHint = weatherLoading || (!hasLive && !liveFetchDone);
    const card = (label: string, value: ReactNode, extra?: ReactNode) => (<div className="rounded-[var(--radius-md)] border border-border bg-elevated p-4 shadow-[var(--shadow-sm)]">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <div className="mt-2 text-2xl font-semibold tabular-nums text-foreground transition-opacity duration-500" style={{ opacity: showPulse ? 0.45 : 1, animation: showPulse ? 'chaPulse 1.2s ease-in-out infinite' : undefined }}>
        {value}
      </div>
      {showUpdatingHint ? <p className="mt-1 text-[11px] text-muted">(updating…)</p> : null}
      {extra ? <p className="mt-1 text-xs text-muted">{extra}</p> : null}
    </div>);
    return (<section>
      <style>{`@keyframes chaPulse{0%,100%{opacity:0.45}50%{opacity:1}}`}</style>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Current conditions</h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {card('Temperature', <>
            {temp.toFixed(1)}
            {'\u00B0'}C
          </>)}
        {card('Humidity', `${hum.toFixed(0)}%`)}
        {card('Rainfall', `${rain.toFixed(0)} mm`)}
        {card('PM2.5', <>
            {pm.toFixed(1)} {'\u03BC'}g/m{'\u00B3'}
          </>, <>
            {(pm / WHO_PM25_ANNUAL_UGM3).toFixed(1)}x WHO limit ({WHO_PM25_ANNUAL_UGM3}
            {'\u03BC'}g/m{'\u00B3'} annual guideline)
          </>)}
        {card('AQI', `${aqi.toFixed(0)}`)}
      </div>
      <div className="mt-3">
        {hasLive ? (<span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-200">
            <Wifi className="h-3.5 w-3.5" aria-hidden/>
            Live weather data
          </span>) : liveFetchDone ? (<span className="inline-flex items-center gap-1.5 rounded-full border border-slate-500/40 bg-slate-500/10 px-3 py-1 text-xs font-medium text-slate-300">
            <Database className="h-3.5 w-3.5" aria-hidden/>
            Historical model data
          </span>) : null}
      </div>
    </section>);
}
function CountrySearch({ onPick }: {
    onPick: (row: CountryOption) => void;
}) {
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const blurTimer = useRef<number | null>(null);
    const options = useMemo<CountryOption[]>(() => {
        return getClimateDataset().countries
            .map((c) => {
            const alpha2 = c.countryCode.toUpperCase();
            const alpha3 = alpha2toAlpha3[alpha2];
            if (!alpha3)
                return null;
            return {
                alpha2,
                alpha3,
                country: c.name,
                city: capitals[alpha3] || `${c.name} (Capital)`,
                lat: c.latitude,
                lng: c.longitude,
            };
        })
            .filter((x): x is CountryOption => Boolean(x));
    }, []);
    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (q.length < 1)
            return [];
        return options.filter((o) => o.country.toLowerCase().includes(q)).slice(0, 8);
    }, [options, query]);
    return (<div className="relative">
      <input type="search" value={query} onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
        }} onFocus={() => setOpen(true)} onBlur={() => {
            if (blurTimer.current)
                window.clearTimeout(blurTimer.current);
            blurTimer.current = window.setTimeout(() => setOpen(false), 140);
        }} placeholder="Type a country name..." className="w-full rounded-lg border border-[#1e293b] bg-[#0a0e1a] px-4 py-3 text-sm text-[#e2e8f0] placeholder:text-slate-500 focus:border-[#3b82f6] focus:outline-none"/>
      {open && filtered.length > 0 ? (<ul className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-[#1e293b] bg-[#0f1629] py-1">
          {filtered.map((o) => (<li key={o.alpha3}>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => {
                    onPick(o);
                    setQuery('');
                    setOpen(false);
                }} className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-[#e2e8f0] hover:bg-[#1e293b]">
                <span>{flagEmoji(o.alpha2)}</span>
                <span>{o.country}</span>
              </button>
            </li>))}
        </ul>) : null}
    </div>);
}
export function MyLocationView() {
    const setActiveView = useAppStore((s) => s.setActiveView);
    const predictionHorizon = useAppStore((s) => s.predictionHorizon);
    const setPredictionHorizon = useAppStore((s) => s.setPredictionHorizon);
    const [locationState, setLocationState] = useState<LocationState>('idle');
    const [denialReason, setDenialReason] = useState<DenialReason>(null);
    const [locationData, setLocationData] = useState<LocationData | null>(null);
    const [expiredNotice, setExpiredNotice] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [dataRefreshKey, setDataRefreshKey] = useState(0);
    const [realWeather, setRealWeather] = useState<RealWeather | null>(null);
    const [realAirQuality, setRealAirQuality] = useState<RealAirQuality | null>(null);
    const [weatherLoading, setWeatherLoading] = useState(false);
    const [forecastDaily, setForecastDaily] = useState<OpenMeteoDaily | null>(null);
    const [liveFetchDone, setLiveFetchDone] = useState(false);
    const [tempOff, setTempOff] = useState(0);
    const [pmOff, setPmOff] = useState(0);
    const [rainOff, setRainOff] = useState(0);
    useEffect(() => {
        const raw = localStorage.getItem('cha_location');
        if (!raw)
            return;
        try {
            const saved = JSON.parse(raw) as Partial<LocationData> & {
                savedAt?: number;
            };
            if (!saved.savedAt || Date.now() - Number(saved.savedAt) > DAY_MS) {
                localStorage.removeItem('cha_location');
                setExpiredNotice('Your saved location expired. Please re-confirm your location.');
                return;
            }
            const method: LocationMethod = saved.method === 'gps' || saved.method === 'ip' || saved.method === 'manual' ? saved.method : 'manual';
            const normalized: LocationData = {
                city: String(saved.city ?? ''),
                country: String(saved.country ?? ''),
                alpha3: String(saved.alpha3 ?? '')
                    .toUpperCase()
                    .slice(0, 3),
                lat: Number(saved.lat) || 0,
                lng: Number(saved.lng) || 0,
                method,
            };
            setLocationData(normalized);
            setLocationState('success');
            setLastUpdated(new Date());
        }
        catch {
            localStorage.removeItem('cha_location');
        }
    }, []);
    const selectCountryManually = useCallback((opt: CountryOption) => {
        const payload: LocationData = {
            city: opt.city,
            country: opt.country,
            alpha3: opt.alpha3,
            lat: opt.lat,
            lng: opt.lng,
            method: 'manual',
        };
        setLocationData(payload);
        setLocationState('success');
        setDenialReason(null);
        setLastUpdated(new Date());
        localStorage.setItem('cha_location', JSON.stringify({
            city: payload.city,
            country: payload.country,
            alpha3: payload.alpha3,
            lat: payload.lat,
            lng: payload.lng,
            method: payload.method,
            savedAt: Date.now(),
        }));
    }, []);
    const tryIpFallback = useCallback(async () => {
        try {
            const res = await fetch('https://ipapi.co/json/');
            const data = (await res.json()) as {
                country_code?: string;
                country_name?: string;
                city?: string;
                latitude?: number;
                longitude?: number;
            };
            if (!data.country_code) {
                setLocationState('denied');
                setDenialReason('all_failed');
                return;
            }
            const alpha3 = alpha2toAlpha3[data.country_code.toUpperCase()] || null;
            if (!alpha3) {
                setLocationState('denied');
                setDenialReason('mapping_failed');
                return;
            }
            const payload: LocationData = {
                city: data.city || 'Unknown City',
                country: data.country_name || 'Unknown Country',
                alpha3,
                lat: Number(data.latitude || 0),
                lng: Number(data.longitude || 0),
                method: 'ip',
            };
            setLocationData(payload);
            setLocationState('success');
            setDenialReason(null);
            setLastUpdated(new Date());
            localStorage.setItem('cha_location', JSON.stringify({
                city: payload.city,
                country: payload.country,
                alpha3: payload.alpha3,
                lat: payload.lat,
                lng: payload.lng,
                method: payload.method,
                savedAt: Date.now(),
            }));
        }
        catch {
            setLocationState('denied');
            setDenialReason('all_failed');
        }
    }, []);
    const resolveLocationFromCoords = useCallback(async (lat: number, lng: number, method: LocationMethod) => {
        try {
            const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
            console.log('Fetching Nominatim:', url);
            const res = await fetch(url, {
                headers: { 'Accept-Language': 'en', 'User-Agent': 'ClimaHealth/1.0' },
            });
            const data = (await res.json()) as {
                address?: Record<string, string>;
            };
            console.log('Nominatim response:', data);
            const city = data.address?.city || data.address?.town || data.address?.village || data.address?.county || 'Unknown City';
            const country = data.address?.country || 'Unknown Country';
            const alpha2 = (data.address?.country_code || '').toUpperCase();
            const alpha3 = alpha2toAlpha3[alpha2];
            console.log('Resolved alpha2:', alpha2, '? alpha3:', alpha3);
            if (!alpha3) {
                setLocationState('denied');
                setDenialReason('mapping_failed');
                return;
            }
            const payload: LocationData = { city, country, alpha3, lat, lng, method };
            setLocationData(payload);
            setLocationState('success');
            setDenialReason(null);
            setLastUpdated(new Date());
            localStorage.setItem('cha_location', JSON.stringify({
                city: payload.city,
                country: payload.country,
                alpha3: payload.alpha3,
                lat: payload.lat,
                lng: payload.lng,
                method: payload.method,
                savedAt: Date.now(),
            }));
        }
        catch (err) {
            console.error('Nominatim failed:', err);
            setLocationState('denied');
            setDenialReason('nominatim_failed');
        }
    }, []);
    const requestGPSLocation = useCallback(() => {
        console.log('Requesting GPS location...');
        if (!navigator.geolocation) {
            console.log('Geolocation not supported');
            setLocationState('denied');
            setDenialReason('not_supported');
            return;
        }
        setLocationState('requesting');
        console.log('Calling getCurrentPosition...');
        navigator.geolocation.getCurrentPosition(async (position) => {
            console.log('GPS success:', position.coords);
            setLocationState('locating');
            await resolveLocationFromCoords(position.coords.latitude, position.coords.longitude, 'gps');
        }, (error) => {
            console.log('GPS error code:', error.code, 'message:', error.message);
            setLocationState('denied');
            setDenialReason(error.code === 1 ? 'permission_denied' : 'position_unavailable');
        }, { enableHighAccuracy: false, timeout: 15000, maximumAge: 0 });
    }, [resolveLocationFromCoords]);
    const latestData = useMemo(() => {
        if (!locationData?.alpha3)
            return null;
        return getLatestDataForCountry(locationData.alpha3);
    }, [locationData?.alpha3, dataRefreshKey]);
    useEffect(() => {
        if (locationState === 'success' && locationData && latestData) {
            console.log('Location data for', locationData.alpha3, ':', latestData);
        }
    }, [locationState, locationData, latestData]);
    useEffect(() => {
        if (locationState !== 'success' || locationData == null) {
            setRealWeather(null);
            setRealAirQuality(null);
            setForecastDaily(null);
            setLiveFetchDone(false);
            return;
        }
        const { lat, lng } = locationData;
        if (!Number.isFinite(lat) || !Number.isFinite(lng))
            return;
        let cancelled = false;
        setLiveFetchDone(false);
        setWeatherLoading(true);
        void (async () => {
            const [w, aq, fc] = await Promise.all([
                fetchRealWeather(lat, lng),
                fetchRealAirQuality(lat, lng),
                fetchForecast7(lat, lng),
            ]);
            if (cancelled)
                return;
            if (w)
                setRealWeather(w);
            if (aq)
                setRealAirQuality(aq);
            if (fc)
                setForecastDaily(fc);
            setWeatherLoading(false);
            setLiveFetchDone(true);
        })();
        return () => {
            cancelled = true;
        };
    }, [locationState, locationData?.lat, locationData?.lng]);
    const handleRefreshWeather = useCallback(async () => {
        if (!locationData?.lat || !locationData?.lng)
            return;
        setWeatherLoading(true);
        const [w, aq, fc] = await Promise.all([
            fetchRealWeather(locationData.lat, locationData.lng),
            fetchRealAirQuality(locationData.lat, locationData.lng),
            fetchForecast7(locationData.lat, locationData.lng),
        ]);
        if (w)
            setRealWeather(w);
        if (aq)
            setRealAirQuality(aq);
        if (fc)
            setForecastDaily(fc);
        setWeatherLoading(false);
        setDataRefreshKey((k) => k + 1);
        setLastUpdated(new Date());
    }, [locationData?.lat, locationData?.lng]);
    const series = useMemo(() => {
        if (!locationData?.alpha3)
            return undefined;
        return getCountrySeriesByCode(locationData.alpha3);
    }, [locationData?.alpha3]);
    const latestWeek = useMemo(() => (series ? getLatestHistoricalWeek(series) : undefined), [series]);
    const chartData = useMemo(() => {
        if (!latestWeek)
            return [];
        return buildMergedPredictionChartData(latestWeek, forecastDaily, predictionHorizon);
    }, [latestWeek, forecastDaily, predictionHorizon]);
    const whatIf = useMemo(() => {
        if (!latestWeek)
            return { d7: 0, d30: 0, d90: 0 };
        return whatIfRiskTriple(latestWeek, tempOff, pmOff, rainOff);
    }, [latestWeek, tempOff, pmOff, rainOff]);
    if (locationState === 'idle') {
        return (<div className="mx-auto mt-20 max-w-[480px] rounded-2xl border border-[#1e293b] bg-[#0f1629] p-10 text-center">
        <style>{`@keyframes pinPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.15)}}`}</style>
        <span style={{ fontSize: 12, color: '#475569', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => {
                localStorage.removeItem('cha_location');
                setLocationState('idle');
                setLocationData(null);
            }}>
          Reset saved location
        </span>
        <MapPin size={56} color="#3b82f6" className="mx-auto mt-3" style={{ animation: 'pinPulse 2s infinite' }}/>
        <h2 className="mt-5 text-2xl font-semibold text-[#e2e8f0]">Enable Location Access</h2>
        <p className="mb-7 mt-3 text-sm leading-6 text-[#94a3b8]">
          ClimaHealth needs your location to show personalised health risk data, disease alerts, and climate conditions for your area.
        </p>
        {expiredNotice ? <p className="mb-3 text-xs text-amber-300">{expiredNotice}</p> : null}
        <button type="button" onClick={requestGPSLocation} className="w-full rounded-[10px] border-none bg-[#3b82f6] px-4 py-3.5 text-[15px] font-semibold text-white hover:bg-[#2563eb]">
          <span className="inline-flex items-center justify-center"><MapPin size={16} color="#ffffff" style={{ marginRight: 6 }}/>Use My Current Location</span>
        </button>
        <div className="my-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-[#1e293b]"/>
          <span className="text-xs text-[#475569]">or</span>
          <span className="h-px flex-1 bg-[#1e293b]"/>
        </div>
        <p className="mb-2 text-left text-xs font-semibold uppercase tracking-wide text-[#64748b]">Search for your country</p>
        <CountrySearch onPick={selectCountryManually}/>
      </div>);
    }
    if (locationState === 'requesting') {
        return (<div className="mx-auto mt-20 max-w-[480px] rounded-2xl border border-[#1e293b] bg-[#0f1629] p-10 text-center">
        <LoaderCircle size={32} color="#3b82f6" className="mx-auto animate-spin"/>
        <p className="mt-4 text-sm text-[#94a3b8]">Waiting for browser permission...</p>
        <p className="mt-2 text-xs text-[#64748b]">A popup should appear in your browser asking for location access. Please click Allow.</p>
      </div>);
    }
    if (locationState === 'locating') {
        return (<div className="mx-auto mt-20 max-w-[480px] rounded-2xl border border-[#1e293b] bg-[#0f1629] p-10 text-center">
        <LoaderCircle size={32} color="#3b82f6" className="mx-auto animate-spin"/>
        <p className="mt-4 text-sm text-[#94a3b8]">Detecting your location...</p>
        <p className="mt-2 text-xs text-[#64748b]">...</p>
      </div>);
    }
    if (locationState === 'denied') {
        return (<div className="mx-auto mt-20 max-w-[620px] space-y-4 rounded-2xl border border-[#1e293b] bg-[#0f1629] p-8">
        {denialReason === 'permission_denied' ? <MapPinOff size={40} color="#f97316"/> : <AlertCircle size={40} color="#ef4444"/>}
        <h3 className="text-lg font-semibold text-[#e2e8f0]">{denialReason === 'permission_denied' ? 'Location access was blocked' : 'Could not detect location'}</h3>
        {denialReason === 'permission_denied' ? (<>
            <p className="text-sm text-[#94a3b8]">You clicked Block on the browser popup. To fix this:</p>
            <ol className="list-decimal space-y-1 pl-5 text-sm text-[#cbd5e1]">
              <li>Click the lock icon in your browser's address bar</li>
              <li>Find Location in the permissions list</li>
              <li>Change it from Block to Allow</li>
              <li>Refresh this page and try again</li>
            </ol>
          </>) : (<p className="text-sm text-[#94a3b8]">Automatic detection failed. You can use manual country search or IP-based detection.</p>)}
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => { setLocationState('idle'); setDenialReason(null); }} className="rounded-lg border border-[#334155] px-4 py-2 text-sm text-[#e2e8f0] hover:bg-[#1e293b]">
            Try Again
          </button>
          <button type="button" onClick={() => void tryIpFallback()} className="rounded-lg border border-[#334155] px-4 py-2 text-sm text-[#e2e8f0] hover:bg-[#1e293b]">
            Detect via IP instead
          </button>
        </div>
        <CountrySearch onPick={selectCountryManually}/>
      </div>);
    }
    if (!locationData || !latestData || !series || !latestWeek) {
        return <div style={{ color: '#ef4444' }}>No data available for {locationData?.alpha3 || 'UNKNOWN'}</div>;
    }
    const countryData = latestData;
    const predictionValue = predictionHorizon === '7d'
        ? countryData.prediction7d
        : predictionHorizon === '30d'
            ? countryData.prediction30d
            : countryData.prediction90d;
    const predictionLabel = predictionHorizon === '7d'
        ? 'Next 7 Days'
        : predictionHorizon === '30d'
            ? 'Next 30 Days'
            : 'Next 90 Days';
    const syntheticConditions = {
        temperature: countryData.temperatureC,
        humidity: countryData.humidityPct,
        rainfall: countryData.rainfallMm,
        pm25: countryData.pm25,
        aqi: countryData.aqi,
    };
    return (<div className="space-y-6">
      <div className="flex flex-wrap gap-2 rounded-[var(--radius-md)] border border-border bg-elevated p-1.5 shadow-[var(--shadow-sm)]">
        <button type="button" className="flex-1 rounded-[var(--radius-sm)] border-b-2 border-[var(--color-accent)] bg-[var(--color-accent)]/15 px-4 py-3 text-sm font-semibold text-foreground">
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <MapPin size={14}/>
            {`My Location — ${locationData.city}, ${locationData.country}`}
          </span>
        </button>
        <button type="button" onClick={() => setActiveView('globalMap')} className="flex-1 rounded-[var(--radius-sm)] px-4 py-3 text-sm font-medium text-muted hover:bg-[var(--color-bg)]">
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Globe size={14}/>
            Explore Countries
          </span>
        </button>
      </div>

      <section className="rounded-[var(--radius-md)] border border-border bg-gradient-to-br from-[var(--color-elevated)] to-[var(--color-surface)] p-6 shadow-[var(--shadow-sm)]">
        <h2 className="text-3xl font-bold text-foreground"><span className="inline-flex items-center"><MapPin size={18} color="#3b82f6" style={{ marginRight: 8 }}/>{locationData.city}, {locationData.country}</span></h2>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {locationData.method === 'ip' ? <span className="inline-flex items-center rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs text-blue-300"><Radio size={12} color="#3b82f6" style={{ marginRight: 6 }}/>Detected via IP</span> : null}
          {locationData.method === 'gps' ? <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300"><CheckCircle size={12} color="#10b981" style={{ marginRight: 6 }}/>GPS Location</span> : null}
          {locationData.method === 'manual' ? <span className="inline-flex items-center rounded-full border border-slate-500/30 bg-slate-500/10 px-3 py-1 text-xs text-slate-300"><Search size={12} color="#94a3b8" style={{ marginRight: 6 }}/>Manual Selection</span> : null}
        </div>
        <div className="mt-2 flex flex-wrap items-center">
          <button type="button" onClick={() => {
            localStorage.removeItem('cha_location');
            setLocationData(null);
            setLocationState('idle');
        }} className="text-xs text-[#64748b] underline">
            Change location
          </button>
          <button type="button" disabled={weatherLoading} onClick={() => void handleRefreshWeather()} className="ml-3 inline-flex items-center gap-1.5 text-[12px] text-[#3b82f6] underline disabled:opacity-50" style={{ background: 'none', border: 'none', cursor: weatherLoading ? 'wait' : 'pointer' }}>
            {weatherLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden/> : null}
            Refresh data
          </button>
        </div>
        <p className="mt-2 text-sm text-muted">Last updated: {lastUpdated ? lastUpdated.toLocaleString() : '?'}</p>
      </section>

      <LiveCurrentConditionsPanel synthetic={syntheticConditions} realWeather={realWeather} realAirQuality={realAirQuality} weatherLoading={weatherLoading} liveFetchDone={liveFetchDone}/>

      <section className="rounded-[var(--radius-md)] border border-border bg-elevated px-4 py-8 shadow-[var(--shadow-sm)] md:px-8">
        <RiskGauge value={countryData.riskScore} gradientStroke footerPrimary="Overall Health Risk Score" footerSecondary={dominantDiseaseName(countryData.disease)} className="mx-auto max-w-xs"/>
        <p className="mt-2 text-center text-xs text-muted">{riskLevelLabel(countryData.riskLevel)}</p>
        <div className="mt-3 text-center">
          <p className="text-xs uppercase tracking-wide text-muted">Predicted risk ({predictionLabel})</p>
          <p className="text-3xl font-bold tabular-nums text-cyan-400" style={{ transition: 'all 0.3s ease' }}>
            {predictionValue.toFixed(1)}
          </p>
        </div>
      </section>

      <IntelDiseasesSection series={series} latest={latestWeek} variant="embed" title="Top disease threats" description="Ranked by modeled weekly case burden for this location."/>
      <IntelAlertsSection series={series} latest={latestWeek} variant="embed"/>
      <IntelPrecautionsSection latest={latestWeek} variant="embed"/>

      <section className="rounded-[var(--radius-md)] border border-border bg-elevated p-4 shadow-[var(--shadow-sm)] md:p-6">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Prediction chart</h3>
          <div className="flex rounded border border-border p-0.5 text-xs">
            {(['7d', '30d', '90d'] as const).map((h) => (<button key={h} type="button" onClick={() => setPredictionHorizon(h)} className={`rounded px-2.5 py-1 ${predictionHorizon === h ? 'bg-[var(--color-accent)] text-white' : 'text-muted'}`}>
                {h}
              </button>))}
          </div>
        </div>
        <div className="mt-4 h-72 w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="myloc-risk-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.35}/>
                  <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--color-chart-grid)" strokeDasharray="4 4" opacity={0.45}/>
              <XAxis dataKey="day" tick={{ fill: 'var(--color-fg-muted)', fontSize: 11 }} tickLine={false}/>
              <YAxis domain={[0, 100]} tick={{ fill: 'var(--color-fg-muted)', fontSize: 11 }} tickLine={false} width={36}/>
              <Tooltip />
              <Area type="monotone" dataKey="mid" stroke="var(--color-accent)" strokeWidth={2} fill="url(#myloc-risk-fill)"/>
              <Line type="monotone" dataKey="high" stroke="var(--color-fg-muted)" strokeWidth={1} strokeDasharray="4 4" dot={false}/>
              <Line type="monotone" dataKey="low" stroke="var(--color-fg-muted)" strokeWidth={1} strokeDasharray="4 4" dot={false}/>
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-[var(--radius-md)] border border-border bg-elevated p-6 shadow-[var(--shadow-sm)]">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">What-if simulator</h3>
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          <label className="block text-sm">
            <span className="font-medium text-foreground">
              Temperature offset ({tempOff.toFixed(1)}
              {'\u00B0'}C)
            </span>
            <input type="range" min={-5} max={5} step={0.5} value={tempOff} onChange={(e) => setTempOff(Number(e.target.value))} className="mt-2 w-full accent-[var(--color-accent)]"/>
          </label>
          <label className="block text-sm">
            <span className="font-medium text-foreground">
              PM2.5 offset ({pmOff} {'\u03BC'}g/m{'\u00B3'})
            </span>
            <input type="range" min={-100} max={200} step={1} value={pmOff} onChange={(e) => setPmOff(Number(e.target.value))} className="mt-2 w-full accent-[var(--color-accent)]"/>
          </label>
          <label className="block text-sm">
            <span className="font-medium text-foreground">Rainfall offset ({rainOff} mm)</span>
            <input type="range" min={-100} max={300} step={2} value={rainOff} onChange={(e) => setRainOff(Number(e.target.value))} className="mt-2 w-full accent-[var(--color-accent)]"/>
          </label>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {([
            ['7-day horizon', whatIf.d7],
            ['30-day horizon', whatIf.d30],
            ['90-day horizon', whatIf.d90],
        ] as const).map(([label, val]) => (<div key={label} className="rounded-[var(--radius-sm)] border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 px-3 py-3 text-center">
              <p className="text-xs text-muted">{label}</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-[var(--color-accent)]">{val}</p>
            </div>))}
        </div>
      </section>

      <div className="flex justify-end">
        <button type="button" onClick={() => setActiveView('globalMap')} className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] border border-border bg-elevated px-4 py-2 text-sm font-medium text-foreground hover:border-[var(--color-accent)]">
          <Globe size={16} color="#94a3b8"/>
          Explore Countries
        </button>
      </div>

      {locationData.method === 'ip' ? (<div className="rounded-lg border border-[#f59e0b]/30 bg-[#f59e0b]/10 px-4 py-2 text-sm text-amber-200">
          <span className="inline-flex items-center"><AlertTriangle size={16} color="#f59e0b" style={{ marginRight: 6 }}/>IP-based location is approximate. Enable GPS for precision.</span>
        </div>) : null}
    </div>);
}
