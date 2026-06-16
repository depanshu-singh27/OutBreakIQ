


from __future__ import annotations

import hashlib
import time
from pathlib import Path

import numpy as np
import pandas as pd
import requests

BASE = Path(__file__).resolve().parent
RAW = BASE / "raw_data"
RAW.mkdir(parents=True, exist_ok=True)


COUNTRY_ROWS: list[tuple[str, str, float, float]] = [
    
    ("DZA", "Algeria", 28.0, 28.0),
    ("AGO", "Angola", -12.0, 33.0),
    ("BEN", "Benin", 9.0, 12.0),
    ("BWA", "Botswana", -22.0, 2.0),
    ("BFA", "Burkina Faso", 12.0, 21.0),
    ("BDI", "Burundi", -3.0, 12.0),
    ("CPV", "Cabo Verde", 16.0, 1.0),
    ("CMR", "Cameroon", 4.0, 27.0),
    ("CAF", "Central African Republic", 7.0, 5.0),
    ("TCD", "Chad", 15.0, 17.0),
    ("COM", "Comoros", -12.0, 1.0),
    ("COD", "Democratic Republic of the Congo", -4.0, 100.0),
    ("COG", "Congo", -1.0, 6.0),
    ("CIV", "Côte d'Ivoire", 7.0, 27.0),
    ("DJI", "Djibouti", 12.0, 1.0),
    ("EGY", "Egypt", 26.0, 104.0),
    ("GNQ", "Equatorial Guinea", 2.0, 1.0),
    ("ERI", "Eritrea", 15.0, 3.0),
    ("SWZ", "Eswatini", -26.0, 1.0),
    ("ETH", "Ethiopia", 9.0, 120.0),
    ("GAB", "Gabon", -1.0, 2.0),
    ("GMB", "Gambia", 13.0, 2.0),
    ("GHA", "Ghana", 8.0, 32.0),
    ("GIN", "Guinea", 11.0, 13.0),
    ("GNB", "Guinea-Bissau", 12.0, 2.0),
    ("KEN", "Kenya", -1.0, 55.0),
    ("LSO", "Lesotho", -29.0, 2.0),
    ("LBR", "Liberia", 6.0, 5.0),
    ("LBY", "Libya", 27.0, 7.0),
    ("MDG", "Madagascar", -20.0, 28.0),
    ("MWI", "Malawi", -13.0, 20.0),
    ("MLI", "Mali", 17.0, 22.0),
    ("MRT", "Mauritania", 20.0, 4.0),
    ("MUS", "Mauritius", -20.0, 1.0),
    ("MAR", "Morocco", 32.0, 37.0),
    ("MOZ", "Mozambique", -18.0, 33.0),
    ("NAM", "Namibia", -22.0, 3.0),
    ("NER", "Niger", 17.0, 25.0),
    ("NGA", "Nigeria", 10.0, 220.0),
    ("RWA", "Rwanda", -2.0, 13.0),
    ("STP", "Sao Tome and Principe", 0.0, 1.0),
    ("SEN", "Senegal", 14.0, 17.0),
    ("SLE", "Sierra Leone", 8.0, 8.0),
    ("SOM", "Somalia", 6.0, 17.0),
    ("ZAF", "South Africa", -29.0, 60.0),
    ("SSD", "South Sudan", 7.0, 11.0),
    ("SDN", "Sudan", 15.0, 46.0),
    ("TZA", "Tanzania", -6.0, 63.0),
    ("TGO", "Togo", 8.0, 8.0),
    ("TUN", "Tunisia", 34.0, 12.0),
    ("UGA", "Uganda", 1.0, 48.0),
    ("ZMB", "Zambia", -15.0, 19.0),
    ("ZWE", "Zimbabwe", -20.0, 16.0),
    
    ("AFG", "Afghanistan", 33.0, 40.0),
    ("ARM", "Armenia", 40.0, 3.0),
    ("AZE", "Azerbaijan", 40.0, 10.0),
    ("BHR", "Bahrain", 26.0, 2.0),
    ("BGD", "Bangladesh", 24.0, 170.0),
    ("BTN", "Bhutan", 27.0, 1.0),
    ("BRN", "Brunei Darussalam", 5.0, 1.0),
    ("KHM", "Cambodia", 12.0, 17.0),
    ("CHN", "China", 35.0, 1400.0),
    ("CYP", "Cyprus", 35.0, 1.0),
    ("GEO", "Georgia", 42.0, 4.0),
    ("IND", "India", 20.0, 1400.0),
    ("IDN", "Indonesia", -5.0, 275.0),
    ("IRN", "Iran", 32.0, 85.0),
    ("IRQ", "Iraq", 33.0, 42.0),
    ("ISR", "Israel", 31.0, 9.0),
    ("JPN", "Japan", 36.0, 125.0),
    ("JOR", "Jordan", 31.0, 10.0),
    ("KAZ", "Kazakhstan", 48.0, 19.0),
    ("KWT", "Kuwait", 29.0, 4.0),
    ("KGZ", "Kyrgyzstan", 42.0, 7.0),
    ("LAO", "Lao PDR", 18.0, 7.0),
    ("LBN", "Lebanon", 34.0, 5.0),
    ("MYS", "Malaysia", 3.0, 33.0),
    ("MDV", "Maldives", 4.0, 1.0),
    ("MNG", "Mongolia", 47.0, 3.0),
    ("MMR", "Myanmar", 17.0, 54.0),
    ("NPL", "Nepal", 28.0, 29.0),
    ("PRK", "North Korea", 40.0, 26.0),
    ("OMN", "Oman", 22.0, 5.0),
    ("PAK", "Pakistan", 30.0, 230.0),
    ("PSE", "Palestine", 32.0, 5.0),
    ("PHL", "Philippines", 13.0, 115.0),
    ("QAT", "Qatar", 25.0, 3.0),
    ("SAU", "Saudi Arabia", 24.0, 35.0),
    ("SGP", "Singapore", 1.0, 6.0),
    ("KOR", "South Korea", 37.0, 52.0),
    ("LKA", "Sri Lanka", 7.0, 22.0),
    ("SYR", "Syria", 35.0, 21.0),
    ("TUR", "Türkiye", 39.0, 85.0),
    ("TWN", "Taiwan", 24.0, 24.0),
    ("TJK", "Tajikistan", 39.0, 10.0),
    ("THA", "Thailand", 15.0, 70.0),
    ("TLS", "Timor-Leste", -9.0, 1.0),
    ("TKM", "Turkmenistan", 40.0, 6.0),
    ("ARE", "United Arab Emirates", 24.0, 10.0),
    ("UZB", "Uzbekistan", 41.0, 35.0),
    ("VNM", "Viet Nam", 16.0, 98.0),
    ("YEM", "Yemen", 16.0, 33.0),
    
    ("ALB", "Albania", 41.0, 3.0),
    ("AND", "Andorra", 42.0, 1.0),
    ("AUT", "Austria", 47.0, 9.0),
    ("BLR", "Belarus", 53.0, 10.0),
    ("BEL", "Belgium", 50.0, 11.0),
    ("BIH", "Bosnia and Herzegovina", 44.0, 3.0),
    ("BGR", "Bulgaria", 43.0, 7.0),
    ("HRV", "Croatia", 45.0, 4.0),
    ("CZE", "Czechia", 50.0, 11.0),
    ("DNK", "Denmark", 56.0, 6.0),
    ("EST", "Estonia", 59.0, 1.0),
    ("FIN", "Finland", 64.0, 6.0),
    ("FRA", "France", 46.0, 68.0),
    ("DEU", "Germany", 51.0, 84.0),
    ("GRC", "Greece", 39.0, 11.0),
    ("HUN", "Hungary", 47.0, 10.0),
    ("ISL", "Iceland", 65.0, 1.0),
    ("IRL", "Ireland", 53.0, 5.0),
    ("ITA", "Italy", 42.0, 60.0),
    ("LVA", "Latvia", 57.0, 2.0),
    ("LIE", "Liechtenstein", 47.0, 1.0),
    ("LTU", "Lithuania", 56.0, 3.0),
    ("LUX", "Luxembourg", 49.0, 1.0),
    ("MLT", "Malta", 36.0, 1.0),
    ("MDA", "Moldova", 47.0, 3.0),
    ("MCO", "Monaco", 44.0, 1.0),
    ("MNE", "Montenegro", 43.0, 1.0),
    ("NLD", "Netherlands", 52.0, 18.0),
    ("MKD", "North Macedonia", 41.0, 2.0),
    ("NOR", "Norway", 61.0, 5.0),
    ("POL", "Poland", 52.0, 38.0),
    ("PRT", "Portugal", 39.0, 10.0),
    ("ROU", "Romania", 46.0, 19.0),
    ("RUS", "Russia", 60.0, 145.0),
    ("SMR", "San Marino", 44.0, 1.0),
    ("SRB", "Serbia", 44.0, 7.0),
    ("SVK", "Slovakia", 49.0, 5.0),
    ("SVN", "Slovenia", 46.0, 2.0),
    ("ESP", "Spain", 40.0, 47.0),
    ("SWE", "Sweden", 60.0, 10.0),
    ("CHE", "Switzerland", 47.0, 8.0),
    ("UKR", "Ukraine", 49.0, 44.0),
    ("GBR", "United Kingdom", 52.0, 67.0),
    ("VAT", "Holy See", 42.0, 1.0),
    
    ("ATG", "Antigua and Barbuda", 17.0, 1.0),
    ("ARG", "Argentina", -34.0, 45.0),
    ("BHS", "Bahamas", 25.0, 1.0),
    ("BRB", "Barbados", 13.0, 1.0),
    ("BLZ", "Belize", 17.0, 1.0),
    ("BOL", "Bolivia", -17.0, 12.0),
    ("BRA", "Brazil", -15.0, 215.0),
    ("CAN", "Canada", 56.0, 38.0),
    ("CHL", "Chile", -30.0, 19.0),
    ("COL", "Colombia", 4.0, 51.0),
    ("CRI", "Costa Rica", 10.0, 5.0),
    ("CUB", "Cuba", 22.0, 11.0),
    ("DMA", "Dominica", 15.0, 1.0),
    ("DOM", "Dominican Republic", 19.0, 11.0),
    ("ECU", "Ecuador", -2.0, 18.0),
    ("SLV", "El Salvador", 14.0, 6.0),
    ("GRD", "Grenada", 12.0, 1.0),
    ("GTM", "Guatemala", 15.0, 18.0),
    ("GUY", "Guyana", 5.0, 1.0),
    ("HTI", "Haiti", 19.0, 11.0),
    ("HND", "Honduras", 15.0, 10.0),
    ("JAM", "Jamaica", 18.0, 3.0),
    ("MEX", "Mexico", 23.0, 127.0),
    ("NIC", "Nicaragua", 13.0, 7.0),
    ("PAN", "Panama", 9.0, 4.0),
    ("PRY", "Paraguay", -23.0, 7.0),
    ("PER", "Peru", -10.0, 33.0),
    ("KNA", "Saint Kitts and Nevis", 17.0, 1.0),
    ("LCA", "Saint Lucia", 14.0, 1.0),
    ("VCT", "Saint Vincent and the Grenadines", 13.0, 1.0),
    ("SUR", "Suriname", 4.0, 1.0),
    ("TTO", "Trinidad and Tobago", 11.0, 1.0),
    ("USA", "United States", 38.0, 335.0),
    ("URY", "Uruguay", -33.0, 3.0),
    ("VEN", "Venezuela", 8.0, 28.0),
    
    ("AUS", "Australia", -25.0, 26.0),
    ("FJI", "Fiji", -18.0, 1.0),
    ("KIR", "Kiribati", 2.0, 1.0),
    ("MHL", "Marshall Islands", 7.0, 1.0),
    ("FSM", "Micronesia", 7.0, 1.0),
    ("NRU", "Nauru", -1.0, 1.0),
    ("NZL", "New Zealand", -41.0, 5.0),
    ("PLW", "Palau", 7.0, 1.0),
    ("PNG", "Papua New Guinea", -6.0, 10.0),
    ("WSM", "Samoa", -14.0, 1.0),
    ("SLB", "Solomon Islands", -8.0, 1.0),
    ("TON", "Tonga", -20.0, 1.0),
    ("TUV", "Tuvalu", -8.0, 1.0),
    ("VUT", "Vanuatu", -16.0, 1.0),
]

MONSOON_ISO3 = {
    "BGD",
    "BTN",
    "IND",
    "LKA",
    "MDV",
    "NPL",
    "PAK",
    "MMR",
    "THA",
    "VNM",
    "LAO",
    "KHM",
    "MYS",
    "IDN",
    "PHL",
    "BRN",
    "TLS",
}

ALPHA2_TO_ISO3 = {
    "IN": "IND",
    "NG": "NGA",
    "TH": "THA",
    "EG": "EGY",
    "BD": "BGD",
    "ID": "IDN",
    "PK": "PAK",
    "KE": "KEN",
    "PH": "PHL",
    "CD": "COD",
    "BR": "BRA",
    "CN": "CHN",
    "US": "USA",
    "GB": "GBR",
    "DE": "DEU",
    "MX": "MEX",
    "ZA": "ZAF",
    "GH": "GHA",
    "UG": "UGA",
    "LK": "LKA",
    "FR": "FRA",
    "JP": "JPN",
    "AU": "AUS",
    "RU": "RUS",
    "TR": "TUR",
    "SA": "SAU",
    "IR": "IRN",
    "VN": "VNM",
    "MM": "MMR",
    "KH": "KHM",
    "LA": "LAO",
    "MY": "MYS",
    "NP": "NPL",
    "ET": "ETH",
    "TZ": "TZA",
    "MZ": "MOZ",
    "ZM": "ZMB",
    "ZW": "ZWE",
    "ML": "MLI",
    "BF": "BFA",
    "NE": "NER",
    "TD": "TCD",
    "CM": "CMR",
    "AO": "AGO",
    "SS": "SSD",
    "HT": "HTI",
    "BO": "BOL",
    "PE": "PER",
    "CO": "COL",
    "VE": "VEN",
    "AR": "ARG",
}

OPENAQ_ALPHA2 = sorted(set(ALPHA2_TO_ISO3.keys()))

NASA_CITIES = [
    ("Mumbai", 19.07, 72.87, "IND"),
    ("Lagos", 6.52, 3.37, "NGA"),
    ("Bangkok", 13.75, 100.52, "THA"),
    ("Cairo", 30.04, 31.23, "EGY"),
    ("Dhaka", 23.72, 90.40, "BGD"),
    ("Jakarta", -6.21, 106.84, "IDN"),
    ("Karachi", 24.86, 67.01, "PAK"),
    ("Nairobi", -1.28, 36.81, "KEN"),
    ("Manila", 14.59, 120.98, "PHL"),
    ("Kinshasa", -4.32, 15.32, "COD"),
    ("Delhi", 28.61, 77.20, "IND"),
    ("Colombo", 6.93, 79.85, "LKA"),
    ("Accra", 5.56, -0.20, "GHA"),
    ("Kampala", 0.32, 32.58, "UGA"),
    ("Lima", -12.05, -77.04, "PER"),
    ("Beijing", 39.90, 116.40, "CHN"),
    ("Moscow", 55.75, 37.62, "RUS"),
    ("Sydney", -33.87, 151.21, "AUS"),
    ("Chicago", 41.88, -87.63, "USA"),
    ("Berlin", 52.52, 13.40, "DEU"),
]


def synthetic_nasa_daily_fallback() -> pd.DataFrame:
    
    rng = np.random.default_rng(99)
    dr = pd.date_range("2015-01-01", "2023-12-31", freq="D")
    rows = []
    for city, lat, lon, iso3 in NASA_CITIES:
        for i, dt in enumerate(dr):
            ds = dt.strftime("%Y%m%d")
            doy = (i % 365) / 365.0 * 2 * np.pi
            base_t = 22 + 8 * np.sin(doy - np.pi / 2) + 0.12 * lat + rng.normal(0, 1.5)
            rows.append(
                {
                    "date": ds,
                    "city": city,
                    "country_iso3": iso3,
                    "lat": lat,
                    "lon": lon,
                    "temperature_c": round(float(base_t), 2),
                    "humidity_pct": round(float(np.clip(50 + 20 * np.sin(doy) + rng.normal(0, 8), 10, 99)), 2),
                    "rainfall_mm": round(
                        float(max(0.0, rng.exponential(2.0) * (1 + 0.5 * max(0, np.sin(doy))))),
                        2,
                    ),
                    "windspeed_ms": round(float(rng.uniform(1, 6)), 2),
                    "dewpoint_c": round(float(base_t - 4 + rng.normal(0, 1.2)), 2),
                }
            )
    return pd.DataFrame(rows)


def nasa_power_url(lat: float, lon: float) -> str:
    return (
        "https://power.larc.nasa.gov/api/temporal/daily/point"
        "?parameters=T2M,RH2M,PRECTOTCORR,WS2M,T2MDEW"
        "&community=RE"
        f"&longitude={lon}&latitude={lat}"
        "&start=20150101&end=20231231&format=JSON"
    )


def download_nasa_power() -> pd.DataFrame:
    rows: list[dict] = []
    for city, lat, lon, iso3 in NASA_CITIES:
        url = nasa_power_url(lat, lon)
        try:
            r = requests.get(url, timeout=45)
            r.raise_for_status()
            data = r.json()
            props = data.get("properties", {}).get("parameter", {})
            t2m = props.get("T2M", {}) or {}
            rh = props.get("RH2M", {}) or {}
            pr = props.get("PRECTOTCORR", {}) or {}
            ws = props.get("WS2M", {}) or {}
            dew = props.get("T2MDEW", {}) or {}
            dates = sorted(set(t2m.keys()) & set(rh.keys()) & set(pr.keys()))
            for d in dates:
                rows.append(
                    {
                        "date": d,
                        "city": city,
                        "country_iso3": iso3,
                        "lat": lat,
                        "lon": lon,
                        "temperature_c": float(t2m.get(d, np.nan)),
                        "humidity_pct": float(rh.get(d, np.nan)),
                        "rainfall_mm": float(pr.get(d, np.nan)),
                        "windspeed_ms": float(ws.get(d, np.nan)) if d in ws else np.nan,
                        "dewpoint_c": float(dew.get(d, np.nan)) if d in dew else np.nan,
                    }
                )
            print(f"  NASA OK: {city} ({iso3}) {len(dates)} days", flush=True)
        except Exception as e:
            print(f"  NASA FAIL: {city} — {e}", flush=True)
        time.sleep(1.5)
    df = pd.DataFrame(rows)
    return df


def fetch_openaq_country_ids() -> dict[str, int]:
    
    out: dict[str, int] = {}
    try:
        r = requests.get("https://api.openaq.org/v2/countries?limit=500", timeout=60)
        r.raise_for_status()
        js = r.json()
        for it in js.get("results", []):
            code = (it.get("code") or "").upper()
            cid = it.get("id")
            if code and cid is not None:
                out[code] = int(cid)
    except Exception as e:
        print(f"  OpenAQ countries list failed: {e}")
    return out


def synthetic_openaq_pm25(iso3: str) -> list[dict]:
    
    meta = {r[0]: (r[2], r[3]) for r in COUNTRY_ROWS}
    lat, pop_m = meta.get(iso3, (20.0, 30.0))
    rng = np.random.default_rng(int.from_bytes(hashlib.md5(iso3.encode(), usedforsecurity=False).digest()[:4], "little"))
    base = 12.0 + 0.08 * abs(lat) + 0.25 * (pop_m**0.35)
    rows = []
    for year in range(2018, 2024):
        for month in range(1, 13):
            pm = max(3.0, base + 5 * np.sin((month / 12.0) * 2 * np.pi) + rng.normal(0, 2.5))
            rows.append(
                {
                    "iso3": iso3,
                    "country_code_a2": None,
                    "year": year,
                    "month": month,
                    "pm25": round(float(pm), 3),
                }
            )
    return rows


def download_openaq(code_to_id: dict[str, int]) -> pd.DataFrame:
    rows: list[dict] = []
    probe = requests.get("https://api.openaq.org/v2/countries?limit=1", timeout=20)
    txt = (probe.text or "").lower()
    if probe.status_code >= 400 or "retired" in txt or "gone" in txt:
        print("  OpenAQ v2 unavailable; using synthetic PM2.5 monthly series per country.")
        seen_iso3: set[str] = set()
        for a2 in OPENAQ_ALPHA2:
            iso3 = ALPHA2_TO_ISO3.get(a2)
            if not iso3 or iso3 in seen_iso3:
                continue
            seen_iso3.add(iso3)
            rows.extend(synthetic_openaq_pm25(iso3))
        return pd.DataFrame(rows)

    for a2 in OPENAQ_ALPHA2:
        iso3 = ALPHA2_TO_ISO3.get(a2)
        cid = code_to_id.get(a2)
        if cid is None:
            print(f"  OpenAQ SKIP (no id): {a2}")
            if iso3:
                rows.extend(synthetic_openaq_pm25(iso3))
            time.sleep(0.4)
            continue
        url = (
            "https://api.openaq.org/v2/averages"
            "?spatial=country&temporal=month"
            f"&country_id={cid}&parameters_id=2"
            "&date_from=2018-01-01&date_to=2023-12-31&limit=500"
        )
        try:
            r = requests.get(url, timeout=60)
            r.raise_for_status()
            js = r.json()
            for it in js.get("results", []):
                period = it.get("period") or {}
                dt = period.get("datetimeFrom", {}) or {}
                raw = dt.get("raw") or ""
                year = None
                month = None
                if raw and len(raw) >= 7:
                    parts = raw[:10].split("-")
                    if len(parts) >= 2:
                        year, month = int(parts[0]), int(parts[1])
                val = it.get("average")
                if val is None:
                    val = it.get("value")
                rows.append(
                    {
                        "iso3": iso3,
                        "country_code_a2": a2,
                        "year": year,
                        "month": month,
                        "pm25": float(val) if val is not None else np.nan,
                    }
                )
            print(f"  OpenAQ OK: {a2} -> {iso3} ({len(js.get('results', []))} rows)")
        except Exception as e:
            print(f"  OpenAQ FAIL: {a2} — {e}; synthetic fallback")
            if iso3:
                rows.extend(synthetic_openaq_pm25(iso3))
        time.sleep(0.4)
    return pd.DataFrame(rows)


def download_dengai() -> pd.DataFrame:
    pairs = [
        (
            "https://raw.githubusercontent.com/shenyk/DengAI/master/dengue_features_train.csv",
            "https://raw.githubusercontent.com/shenyk/DengAI/master/dengue_labels_train.csv",
        ),
        (
            "https://raw.githubusercontent.com/drivendata/benchmarks/master/dengue-prediction/data/dengue_features_train.csv",
            "https://raw.githubusercontent.com/drivendata/benchmarks/master/dengue-prediction/data/dengue_labels_train.csv",
        ),
    ]
    last_err = None
    for feat_url, lab_url in pairs:
        try:
            df_f = pd.read_csv(feat_url, timeout=60)
            df_l = pd.read_csv(lab_url, timeout=60)
            key = ["city", "year", "weekofyear"]
            df = df_f.merge(df_l, on=key, how="inner")
            print(f"  DengAI downloaded: {len(df)} rows from mirror")
            return df
        except Exception as e:
            last_err = e
            continue
    print(f"  DengAI download failed ({last_err}), generating synthetic Poisson data.")
    rng = np.random.default_rng(42)
    cities = ["sj", "iq"]
    years = range(2000, 2014)
    weeks = range(1, 53)
    rows = []
    for city in cities:
        for year in years:
            for weekofyear in weeks:
                temp = 26.0 + rng.normal(0, 4)
                hum = 7.5 + rng.normal(0, 1.2)
                precip = max(0.0, rng.normal(35, 25))
                dew_k = 273.15 + temp - 2 + rng.normal(0, 1)
                row = {
                    "city": city,
                    "year": year,
                    "weekofyear": weekofyear,
                    "station_avg_temp_c": round(float(temp), 2),
                    "reanalysis_specific_humidity_g_per_kg": round(float(hum), 2),
                    "station_precip_mm": round(float(precip), 2),
                    "reanalysis_dew_point_temp_k": round(float(dew_k), 2),
                    "ndvi_ne": round(float(rng.uniform(0.1, 0.85)), 3),
                    "ndvi_nw": round(float(rng.uniform(0.1, 0.85)), 3),
                    "ndvi_se": round(float(rng.uniform(0.1, 0.85)), 3),
                    "ndvi_sw": round(float(rng.uniform(0.1, 0.85)), 3),
                }
                lam = max(1.0, 8 + 0.4 * temp + 0.15 * hum + 0.02 * precip)
                if city == "iq":
                    lam *= 0.85
                row["total_cases"] = int(rng.poisson(lam))
                rows.append(row)
    return pd.DataFrame(rows)


def incidence_bands(abs_lat: float) -> tuple[tuple[float, float], ...]:
    if abs_lat < 10:
        return ((80, 120), (200, 350), (10, 25), (400, 600))
    if abs_lat < 25:
        return ((30, 90), (50, 280), (3, 15), (500, 900))
    if abs_lat < 35:
        return ((5, 25), (5, 80), (1, 5), (600, 1000))
    if abs_lat <= 50:
        return ((0, 0), (0, 0), (0, 0), (150, 350))
    return ((0, 0), (0, 0), (0, 0), (100, 250))


def generate_disease_burden() -> pd.DataFrame:
    records = []
    years = range(2015, 2024)
    weeks = range(1, 53)
    for iso3, name, lat, pop_m in COUNTRY_ROWS:
        seed_u = int.from_bytes(hashlib.md5(iso3.encode("utf-8"), usedforsecurity=False).digest()[:4], "little")
        rng = np.random.default_rng(seed_u)
        abs_lat = abs(lat)
        (d_lo, d_hi), (m_lo, m_hi), (c_lo, c_hi), (r_lo, r_hi) = incidence_bands(abs_lat)
        pop = pop_m * 1e6
        for year in years:
            for week in weeks:
                t = (week - 1) / 52.0 * 2 * np.pi
                seasonal_vec = 0.85 + 0.15 * np.sin(t - np.pi / 2)
                heat_season = 0.7 + 0.3 * max(0, np.sin(t))
                monsoon = 1.0
                if iso3 in MONSOON_ISO3:
                    monsoon = 0.75 + 0.35 * max(0, np.sin(t - 0.8))
                d_rate = rng.uniform(d_lo, d_hi) * seasonal_vec * monsoon if d_hi > 0 else 0.0
                m_rate = rng.uniform(m_lo, m_hi) * seasonal_vec * monsoon if m_hi > 0 else 0.0
                c_rate = rng.uniform(c_lo, c_hi) * monsoon if c_hi > 0 else 0.0
                r_rate = rng.uniform(r_lo, r_hi) * (0.9 + 0.1 * seasonal_vec)
                hs_base = max(0.0, (abs_lat / 50.0) * 3.0) + heat_season * (2.0 if abs_lat < 35 else 4.0)
                hs_rate = hs_base * rng.uniform(0.8, 1.2)

                dengue_c = int(rng.poisson(max(0.1, d_rate * pop / 100_000)))
                malaria_c = int(rng.poisson(max(0.1, m_rate * pop / 100_000)))
                cholera_c = int(rng.poisson(max(0.1, c_rate * pop / 100_000)))
                resp_c = int(rng.poisson(max(1.0, r_rate * pop / 100_000)))
                heat_c = int(rng.poisson(max(0.1, hs_rate * pop / 100_000)))

                total_c = dengue_c + malaria_c + cholera_c + resp_c + heat_c
                d_per = dengue_c / pop * 100_000 if pop else 0.0
                m_per = malaria_c / pop * 100_000 if pop else 0.0
                risk = np.clip(
                    0.25 * min(d_per, 150) / 1.5
                    + 0.25 * min(m_per, 300) / 3.0
                    + 0.2 * min(r_rate / 10.0, 10)
                    + 0.15 * min(c_rate, 30)
                    + 0.15 * min(hs_rate, 20),
                    0,
                    100,
                )
                records.append(
                    {
                        "country": name,
                        "iso3": iso3,
                        "year": year,
                        "week": week,
                        "population": pop,
                        "latitude": lat,
                        "dengue_cases": dengue_c,
                        "malaria_cases": malaria_c,
                        "cholera_cases": cholera_c,
                        "respiratory_cases": resp_c,
                        "heat_stroke_cases": heat_c,
                        "total_cases": total_c,
                        "dengue_per_100k": round(d_per, 4),
                        "malaria_per_100k": round(m_per, 4),
                        "risk_score": round(float(risk), 2),
                    }
                )
    return pd.DataFrame(records)


def daily_to_weekly_nasa(df_daily: pd.DataFrame) -> dict[str, pd.DataFrame]:
    
    if df_daily.empty:
        return {}
    d = df_daily.copy()
    d["date"] = pd.to_datetime(d["date"], format="%Y%m%d", errors="coerce")
    d = d.dropna(subset=["date"])
    d["iso_year"] = d["date"].dt.isocalendar().year.astype(int)
    d["iso_week"] = d["date"].dt.isocalendar().week.astype(int)
    out: dict[str, pd.DataFrame] = {}
    for iso3, g in d.groupby("country_iso3"):
        w = (
            g.groupby(["iso_year", "iso_week"], as_index=False)
            .agg(
                temp_mean=("temperature_c", "mean"),
                humidity_mean=("humidity_pct", "mean"),
                rainfall_total=("rainfall_mm", "sum"),
                windspeed_mean=("windspeed_ms", "mean"),
            )
            .rename(columns={"iso_year": "year", "iso_week": "week"})
        )
        w = w[(w["week"] >= 1) & (w["week"] <= 52)]
        out[iso3] = w
    return out


def build_climate_all_195(nasa_daily: pd.DataFrame) -> pd.DataFrame:
    
    weekly_by_iso = daily_to_weekly_nasa(nasa_daily)
    nasa_iso3 = sorted(weekly_by_iso.keys())
    anchor_lat = np.array(
        [float(nasa_daily.loc[nasa_daily["country_iso3"] == iso, "lat"].iloc[0]) for iso in nasa_iso3],
        dtype=float,
    )
    lat_order = np.argsort(anchor_lat)
    lat_sorted = anchor_lat[lat_order]

    years = list(range(2015, 2024))
    weeks = list(range(1, 53))
    keys = [(y, w) for y in years for w in weeks]
    T = len(keys)
    key_to_i = {k: i for i, k in enumerate(keys)}
    n_anc = len(nasa_iso3)

    def anchor_matrix(col: str) -> np.ndarray:
        M = np.full((T, n_anc), np.nan, dtype=float)
        for j, iso in enumerate(nasa_iso3):
            sub = weekly_by_iso[iso]
            for _, row in sub.iterrows():
                y, w = int(row["year"]), int(row["week"])
                if (y, w) in key_to_i:
                    M[key_to_i[(y, w)], j] = float(row[col])
        return M

    M_temp = anchor_matrix("temp_mean")
    M_hum = anchor_matrix("humidity_mean")
    M_rain = anchor_matrix("rainfall_total")

    iso_list = [r[0] for r in COUNTRY_ROWS]
    country_lat = np.array([r[2] for r in COUNTRY_ROWS], dtype=float)
    pop_arr = np.array([r[3] * 1e6 for r in COUNTRY_ROWS], dtype=float)
    n_cty = len(COUNTRY_ROWS)

    def interp_block(M: np.ndarray) -> np.ndarray:
        out = np.zeros((n_cty, T), dtype=float)
        for i in range(T):
            row = M[i, :][lat_order]
            med = float(np.nanmedian(row))
            row_f = np.nan_to_num(row, nan=med)
            out[:, i] = np.interp(country_lat, lat_sorted, row_f)
        return out

    it = interp_block(M_temp)
    ih = interp_block(M_hum)
    ir = interp_block(M_rain)

    direct_t = np.full((n_cty, T), np.nan)
    direct_h = np.full((n_cty, T), np.nan)
    direct_r = np.full((n_cty, T), np.nan)
    for ci, iso3 in enumerate(iso_list):
        if iso3 not in weekly_by_iso:
            continue
        sub = weekly_by_iso[iso3].set_index(["year", "week"])
        for (y, w), ti in key_to_i.items():
            if (y, w) in sub.index:
                direct_t[ci, ti] = float(sub.loc[(y, w), "temp_mean"])
                direct_h[ci, ti] = float(sub.loc[(y, w), "humidity_mean"])
                direct_r[ci, ti] = float(sub.loc[(y, w), "rainfall_total"])

    rng = np.random.default_rng(2024)
    nt = rng.normal(0, 0.2, size=(n_cty, T))
    nh = rng.normal(0, 0.45, size=(n_cty, T))
    nr = rng.normal(0, 0.55, size=(n_cty, T))
    tm = np.where(np.isnan(direct_t), it + nt, direct_t + rng.normal(0, 0.15, size=(n_cty, T)))
    hm = np.where(np.isnan(direct_h), ih + nh, direct_h + rng.normal(0, 0.4, size=(n_cty, T)))
    rt = np.where(np.isnan(direct_r), np.maximum(0.0, ir + nr), np.maximum(0.0, direct_r + rng.normal(0, 0.5, size=(n_cty, T))))

    tmax = tm + rng.uniform(2, 6, size=(n_cty, T))
    tmin = tm - rng.uniform(2, 5, size=(n_cty, T))
    pm25_est = np.clip(
        8.0 + 0.12 * (pop_arr[:, None] / 1e6) ** 0.35 + 0.15 * np.abs(country_lat[:, None]) + rng.normal(0, 3, size=(n_cty, T)),
        5.0,
        500.0,
    )
    aqi_est = np.clip(pm25_est * 2.1 + rng.normal(0, 5, size=(n_cty, T)), 0, 500)

    rows = []
    for ci, iso3 in enumerate(iso_list):
        for ti, (year, week) in enumerate(keys):
            rows.append(
                {
                    "iso3": iso3,
                    "year": year,
                    "week": week,
                    "temp_mean": round(float(tm[ci, ti]), 3),
                    "temp_max": round(float(tmax[ci, ti]), 3),
                    "temp_min": round(float(tmin[ci, ti]), 3),
                    "humidity_mean": round(float(np.clip(hm[ci, ti], 5, 100)), 3),
                    "rainfall_total": round(float(rt[ci, ti]), 3),
                    "pm25": round(float(pm25_est[ci, ti]), 3),
                    "aqi_estimate": round(float(aqi_est[ci, ti]), 3),
                }
            )
    return pd.DataFrame(rows)


def main() -> None:
    print("PART A — NASA POWER (20 cities)", flush=True)
    nasa_df = download_nasa_power()
    if nasa_df.empty or len(nasa_df) < 100:
        print("  NASA data sparse/empty; filling with synthetic anchor daily series.", flush=True)
        nasa_df = synthetic_nasa_daily_fallback()
    path_nasa = RAW / "nasa_power_climate.csv"
    nasa_df.to_csv(path_nasa, index=False)
    print(f"  Saved {path_nasa} rows={len(nasa_df)}")

    print("PART B — OpenAQ PM2.5")
    cmap = fetch_openaq_country_ids()
    oq = download_openaq(cmap)
    path_oq = RAW / "openaq_air_quality.csv"
    oq.to_csv(path_oq, index=False)
    print(f"  Saved {path_oq} rows={len(oq)}")

    print("PART C — DengAI")
    deng = download_dengai()
    path_deng = RAW / "dengai_combined.csv"
    deng.to_csv(path_deng, index=False)
    print(f"  Saved {path_deng} rows={len(deng)}")

    print("PART D — Disease burden 195 countries")
    dis = generate_disease_burden()
    path_dis = RAW / "disease_burden_195.csv"
    dis.to_csv(path_dis, index=False)
    print(f"  Saved {path_dis} rows={len(dis)}")

    print("PART D (climate) — climate_all_195.csv")
    cli = build_climate_all_195(nasa_df)
    path_cli = RAW / "climate_all_195.csv"
    cli.to_csv(path_cli, index=False)
    print(f"  Saved {path_cli} rows={len(cli)}")

    n_countries = len(COUNTRY_ROWS)
    total_rows = len(nasa_df) + len(oq) + len(deng) + len(dis) + len(cli)
    files = [path_nasa, path_oq, path_deng, path_dis, path_cli]
    print("\n=== Summary ===")
    print(f"total countries (UN list): {n_countries}")
    print(f"total rows (all files): {total_rows}")
    print(f"files saved: {len(files)}")
    for p in files:
        sz = p.stat().st_size if p.exists() else 0
        nlines = len(pd.read_csv(p)) if p.exists() and sz else 0
        print(f"  {p.name}: rows={nlines}, bytes={sz}")


if __name__ == "__main__":
    main()
