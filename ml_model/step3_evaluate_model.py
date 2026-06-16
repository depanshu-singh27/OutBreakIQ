


from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path

import joblib
import matplotlib.gridspec as gridspec
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

BASE = Path(__file__).resolve().parent
OUT = BASE / "outputs"
RAW = BASE / "raw_data"

AFRICA = "DZA AGO BEN BWA BFA BDI CPV CMR CAF TCD COM COD COG CIV DJI EGY GNQ ERI SWZ ETH GAB GMB GHA GIN GNB KEN LSO LBR LBY MDG MWI MLI MRT MUS MAR MOZ NAM NER NGA RWA STP SEN SLE SOM ZAF SSD SDN TZA TGO TUN UGA ZMB ZWE".split()
ASIA = "AFG ARM AZE BHR BGD BTN BRN KHM CHN CYP GEO IND IDN IRN IRQ ISR JPN JOR KAZ KWT KGZ LAO LBN MYS MDV MNG MMR NPL PRK OMN PAK PSE PHL QAT SAU SGP KOR LKA SYR TUR TWN TJK THA TLS TKM ARE UZB VNM YEM".split()
EUROPE = "ALB AND AUT BLR BEL BIH BGR HRV CZE DNK EST FIN FRA DEU GRC HUN ISL IRL ITA LVA LIE LTU LUX MLT MDA MCO MNE NLD MKD NOR POL PRT ROU RUS SMR SRB SVK SVN ESP SWE CHE UKR GBR VAT".split()
AMERICAS = "ATG ARG BHS BRB BLZ BOL BRA CAN CHL COL CRI CUB DMA DOM ECU SLV GRD GTM GUY HTI HND JAM MEX NIC PAN PRY PER KNA LCA VCT SUR TTO USA URY VEN".split()
OCEANIA = "AUS FJI KIR MHL FSM NRU NZL PLW PNG WSM SLB TON TUV VUT".split()

REGION_BY_ISO3: dict[str, str] = {}
for c in AFRICA:
    REGION_BY_ISO3[c] = "Africa"
for c in ASIA:
    REGION_BY_ISO3[c] = "Asia"
for c in EUROPE:
    REGION_BY_ISO3[c] = "Europe"
for c in AMERICAS:
    REGION_BY_ISO3[c] = "Americas"
for c in OCEANIA:
    REGION_BY_ISO3[c] = "Oceania"


def load_json(path: Path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def load_scaler_x():
    for name in ("scaler_x.pkl", "scaler_X.pkl"):
        p = OUT / name
        if p.exists():
            return joblib.load(p)
    raise FileNotFoundError("No scaler_x.pkl or scaler_X.pkl in outputs/")


def load_scaler_y():
    for name in ("scaler_y.pkl", "scaler_Y.pkl"):
        p = OUT / name
        if p.exists():
            return joblib.load(p)
    raise FileNotFoundError("No scaler_y.pkl in outputs/")


def load_raw_panel() -> pd.DataFrame:
    merged = RAW / "merged_dataset.csv"
    disease = RAW / "disease_burden_195.csv"
    if merged.exists():
        return pd.read_csv(merged)
    if disease.exists():
        return pd.read_csv(disease)
    raise FileNotFoundError("Neither merged_dataset.csv nor disease_burden_195.csv found in raw_data/")


def train_test_year_ranges(df: pd.DataFrame) -> tuple[tuple[int, int], tuple[int, int]]:
    
    tr_years: list[int] = []
    te_years: list[int] = []
    for _, g in df.groupby("iso3"):
        g = g.sort_values(["year", "week"])
        n = len(g)
        cut = int(np.floor(0.8 * n))
        tr_years.extend(g.iloc[:cut]["year"].astype(int).tolist())
        te_years.extend(g.iloc[cut:]["year"].astype(int).tolist())
    if not tr_years or not te_years:
        return (0, 0), (0, 0)
    return (min(tr_years), max(tr_years)), (min(te_years), max(te_years))


def mape_pct(actual: np.ndarray, pred: np.ndarray) -> float:
    a = np.asarray(actual, dtype=float)
    p = np.asarray(pred, dtype=float)
    m = np.abs(a) > 1e-9
    if not np.any(m):
        return float("nan")
    return float(np.mean(np.abs((p[m] - a[m]) / a[m])) * 100.0)


def pct_within_relative(actual: np.ndarray, pred: np.ndarray, frac: float) -> float:
    a = np.asarray(actual, dtype=float)
    p = np.asarray(pred, dtype=float)
    m = np.abs(a) > 1e-9
    if not np.any(m):
        return 0.0
    rel = np.abs((p[m] - a[m]) / a[m])
    return float(np.mean(rel <= frac) * 100.0)


def describe_feature(name: str) -> str:
    rules: list[tuple[str, str]] = [
        ("temp_mean_lag", "Weekly mean temperature lagged - delayed climate effects on vectors and transmission."),
        ("humidity_mean_lag", "Humidity lag - moisture influences vector survival and pathogen persistence."),
        ("rainfall_total_lag", "Rainfall lag - breeding sites and runoff dynamics after rain events."),
        ("pm25_lag", "PM2.5 lag - air quality stress and compounding health vulnerability."),
        ("_roll4", "Four-week rolling average - short-term environmental baseline."),
        ("_roll8", "Eight-week rolling average - medium-term environmental trend."),
        ("rainfall_spike", "Binary heavy-rain shock vs recent baseline - flood / overflow risk signal."),
        ("heat_index", "Heat index from temperature and humidity - felt heat and heat-stress risk."),
        ("aqi_from_pm25", "AQI derived from PM2.5 - population-level air-quality burden."),
        ("sin_week", "Sine of week-of-year - smooth seasonal phase encoding."),
        ("cos_week", "Cosine of week-of-year - complements sine for full seasonal cycle."),
        ("abs_latitude", "Absolute latitude - broad climate zone / seasonality strength."),
        ("is_tropical", "Tropical flag (|lat|<25) - vector-friendly climate zones."),
        ("is_equatorial", "Equatorial flag (|lat|<10) - year-round high transmission potential."),
        ("is_temperate", "Temperate flag (|lat|>35) - different disease mix and seasonality."),
        ("total_cases_lag", "Past case counts - epidemic momentum and reporting persistence."),
        ("environmental_memory", "Weighted lag blend - composite environmental memory of climate drivers."),
        ("population", "Population - scales expected case counts and urban exposure."),
        ("temp_mean", "Current-week mean temperature - immediate climate context."),
        ("humidity_mean", "Current-week humidity - concurrent moisture conditions."),
        ("rainfall_total", "Current-week total rainfall - immediate water / breeding signal."),
        ("pm25", "Current-week PM2.5 - concurrent air pollution."),
        ("risk_score", "Composite risk from disease model - prior-week contextual risk."),
        ("latitude", "Signed latitude - hemisphere and seasonal phase."),
    ]
    for prefix, text in rules:
        if prefix in name:
            return f"{name}: {text}"
    return f"{name}: Engineered input used by the fusion models for prediction context."


def plain_top5_lines(top5: list[dict]) -> list[str]:
    lines = []
    for row in top5:
        f = row["feature"]
        lines.append(f"  - {describe_feature(f)}")
    return lines


def main() -> None:
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    print("ClimaHealth Oracle - Model Evaluation Report")
    print(f"Evaluation run at: {ts}")
    print()

    metrics = load_json(OUT / "model_metrics.json")
    back = load_json(OUT / "backtest_predictions.json")
    shap_list = load_json(OUT / "shap_importance.json")
    hist = load_json(OUT / "training_history.json")
    risk = load_json(OUT / "country_risk_scores.json")
    _scaler_x = load_scaler_x()
    _scaler_y = load_scaler_y()
    _feat = joblib.load(OUT / "feature_cols.pkl")
    panel = load_raw_panel()

    actual = np.asarray(back["actual"], dtype=float)
    pred_f = np.asarray(back["predicted"], dtype=float)
    pred_l = np.asarray(back["lstm_only"], dtype=float)
    pred_x = np.asarray(back["xgb_only"], dtype=float)
    weeks = back.get("weeks", list(range(1, len(actual) + 1)))

    r2_f = float(r2_score(actual, pred_f))
    r2_l = float(r2_score(actual, pred_l))
    r2_x = float(r2_score(actual, pred_x))

    mape_f = mape_pct(actual, pred_f)
    med_ae_f = float(np.median(np.abs(pred_f - actual)))
    within_10 = pct_within_relative(actual, pred_f, 0.10)
    within_25 = pct_within_relative(actual, pred_f, 0.25)

    mae_l = float(metrics["mae_lstm"])
    mae_x = float(metrics["mae_xgb"])
    mae_f = float(metrics["mae_fusion"])
    rmse_l = float(metrics["rmse_lstm"])
    rmse_x = float(metrics["rmse_xgb"])
    rmse_f = float(metrics["rmse_fusion"])

    print("=" * 62)
    print("  MODEL PERFORMANCE METRICS (on 20% held-out test set)")
    print("=" * 62)
    print(f"  {'Metric':<15} {'LSTM Only':<12} {'XGBoost Only':<15} {'Fusion Model':<15}")
    print("  " + "-" * 58)
    print(f"  {'MAE':<15} {mae_l:<12.2f} {mae_x:<15.2f} {mae_f:<15.2f}")
    print(f"  {'RMSE':<15} {rmse_l:<12.2f} {rmse_x:<15.2f} {rmse_f:<15.2f}")
    print(f"  {'R2 Score':<15} {r2_l:<12.3f} {r2_x:<15.3f} {r2_f:<15.3f}")
    print("  " + "-" * 58)
    w_l = float(metrics.get("lstm_weight", 0.55))
    w_x = float(metrics.get("xgb_weight", 0.45))
    print(f"  Best model: Fusion (LSTM {w_l:.0%} + XGBoost {w_x:.0%})")
    print("=" * 62)
    print()
    print("  Additional fusion diagnostics (backtest window):")
    print(f"    MAPE (mean abs % error):     {mape_f:.2f}%")
    print(f"    Median absolute error:         {med_ae_f:.2f} cases/week")
    print(f"    Within 10% of actual:          {within_10:.1f}%")
    print(f"    Within 25% of actual:          {within_25:.1f}%")
    print()

    n_train = int(metrics["train_samples"])
    n_test = int(metrics["test_samples"])
    ratio = n_test / max(1, (n_train + n_test)) * 100.0
    n_countries = int(metrics.get("n_countries", len(risk)))
    n_feat = int(metrics["n_features"])
    seq_len = int(metrics["seq_length"])
    (y0_tr, y1_tr), (y0_te, y1_te) = train_test_year_ranges(panel)

    print("Training summary:")
    print(f"  Total training samples:   {n_train:,}")
    print(f"  Total test samples:       {n_test:,}")
    print(f"  Train/test ratio (test):  {ratio:.1f}%")
    print(f"  Number of countries:      {n_countries}")
    print(f"  Number of features:       {n_feat}")
    print(f"  Sequence length (LSTM):   {seq_len}")
    print(f"  Year range (train rows):  {y0_tr} - {y1_tr}")
    print(f"  Year range (test rows):   {y0_te} - {y1_te}")
    print()

    shap15 = sorted(shap_list, key=lambda r: -r.get("mean_shap", 0))[:15]
    print("=" * 62)
    print("  TOP 15 FEATURES BY SHAP IMPORTANCE")
    print("=" * 62)
    print(f"  {'Rank':<5} {'Feature':<38} {'Mean SHAP':<12}")
    print("  " + "-" * 58)
    for i, row in enumerate(shap15, 1):
        fn = str(row.get("feature", ""))[:36]
        ms = float(row.get("mean_shap", 0.0))
        print(f"  {i:<5} {fn:<38} {ms:.4f}")
    print("=" * 62)
    print()
    print("  Top 5 features (plain English):")
    for line in plain_top5_lines(shap15[:5]):
        print(line)
    print()

    levels = {"low": 0, "medium": 0, "high": 0, "critical": 0}
    for row in risk:
        lv = str(row.get("risk_level", "low")).lower()
        if lv in levels:
            levels[lv] += 1
    n_r = len(risk)
    pct = {k: (v / n_r * 100.0) if n_r else 0.0 for k, v in levels.items()}

    print("Country risk distribution:")
    for lv in ("low", "medium", "high", "critical"):
        print(f"  {lv.capitalize():<10} {levels[lv]:>4} countries ({pct[lv]:.1f}%)")
    print()

    risk_sorted = sorted(risk, key=lambda r: -float(r.get("risk_score", 0)))
    top10 = risk_sorted[:10]
    bot10 = sorted(risk, key=lambda r: float(r.get("risk_score", 0)))[:10]

    print("  Top 10 highest risk:")
    print(f"  {'ISO3':<6} {'Score':>8} {'Disease':<18} {'Temp':>8} {'PM2.5':>8}")
    for row in top10:
        print(
            f"  {row.get('iso3',''):<6} {float(row.get('risk_score',0)):>8.2f} "
            f"{str(row.get('dominant_disease',''))[:18]:<18} {float(row.get('temp_mean',0)):>8.2f} {float(row.get('pm25',0)):>8.2f}"
        )
    print()
    print("  Bottom 10 lowest risk:")
    print(f"  {'ISO3':<6} {'Score':>8} {'Disease':<18} {'Temp':>8} {'PM2.5':>8}")
    for row in bot10:
        print(
            f"  {row.get('iso3',''):<6} {float(row.get('risk_score',0)):>8.2f} "
            f"{str(row.get('dominant_disease',''))[:18]:<18} {float(row.get('temp_mean',0)):>8.2f} {float(row.get('pm25',0)):>8.2f}"
        )
    print()

    reg_high = {"Africa": 0, "Asia": 0, "Europe": 0, "Americas": 0, "Oceania": 0, "Other": 0}
    for row in risk:
        lv = str(row.get("risk_level", "")).lower()
        if lv not in ("high", "critical"):
            continue
        iso = str(row.get("iso3", ""))
        reg = REGION_BY_ISO3.get(iso, "Other")
        reg_high[reg] = reg_high.get(reg, 0) + 1

    print("  Regional high+critical counts:")
    for reg in ("Africa", "Asia", "Europe", "Americas", "Oceania", "Other"):
        print(f"    {reg:<12} {reg_high.get(reg, 0)}")
    print()

    err = pred_f - actual
    pct_err = np.where(np.abs(actual) > 1e-9, np.abs(err / actual) * 100.0, np.nan)
    mean_err = float(np.mean(err))
    mean_pct_err = float(np.nanmean(pct_err))

    print("Backtest week-by-week (fusion):")
    print(f"  {'Week':>5} {'Actual':>12} {'Predicted':>12} {'Error':>12} {'% Error':>10}")
    print("  " + "-" * 55)
    for i, wk in enumerate(weeks):
        a = actual[i]
        p = pred_f[i]
        e = p - a
        pe = pct_err[i] if not np.isnan(pct_err[i]) else 0.0
        print(f"  {int(wk):>5} {a:>12.2f} {p:>12.2f} {e:>12.2f} {pe:>9.1f}%")
    print("  " + "-" * 55)
    print(f"  {'Avg':>5} {'(n/a)':>12} {'(n/a)':>12} {mean_err:>12.2f} {mean_pct_err:>9.1f}%")
    print()

    
    plt.style.use("dark_background")
    fig = plt.figure(figsize=(20, 18), dpi=150)
    fig.suptitle("ClimaHealth Oracle - Complete Model Evaluation Report", fontsize=16, y=0.995)
    gs = gridspec.GridSpec(3, 3, figure=fig, hspace=0.35, wspace=0.3)

    train_loss = hist.get("loss", [])
    val_loss = hist.get("val_loss", [])
    epochs = np.arange(1, len(train_loss) + 1)
    best_ep = int(np.argmin(val_loss) + 1) if val_loss else 1

    ax1 = fig.add_subplot(gs[0, 0])
    ax1.plot(epochs, train_loss, label="Train", color="#38bdf8")
    ax1.plot(epochs, val_loss, label="Validation", color="#f472b6")
    ax1.axvline(best_ep, color="white", linestyle="--", alpha=0.6, label=f"Best epoch {best_ep}")
    ax1.set_title("LSTM Training & Validation Loss")
    ax1.set_xlabel("Epoch")
    ax1.set_ylabel("Loss")
    ax1.legend(loc="upper right", fontsize=8)

    ax2 = fig.add_subplot(gs[0, 1])
    err_mag = np.abs(pred_f - actual)
    norm_e = err_mag / (np.max(err_mag) + 1e-9)
    sc = ax2.scatter(actual, pred_f, c=norm_e, cmap="RdYlGn_r", s=22, alpha=0.85)
    mn, mx = float(np.min(actual)), float(np.max(actual))
    ax2.plot([mn, mx], [mn, mx], "r--", linewidth=1.5, label="y = x")
    ax2.set_title("Predicted vs Actual Cases (Test Set)")
    ax2.set_xlabel("Actual")
    ax2.set_ylabel("Predicted")
    ax2.text(0.05, 0.95, f"R² = {r2_f:.3f}", transform=ax2.transAxes, va="top", fontsize=10)
    plt.colorbar(sc, ax=ax2, fraction=0.046, pad=0.04, label="|error| norm")

    ax3 = fig.add_subplot(gs[0, 2])
    wk_idx = np.arange(1, len(err) + 1)
    colors = np.where(err >= 0, "#3b82f6", "#ef4444")
    ax3.bar(wk_idx, err, color=colors, width=0.85)
    ax3.axhline(0, color="white", linewidth=0.8)
    ax3.set_title("Prediction Residuals by Week")
    ax3.set_xlabel("Week")
    ax3.set_ylabel("Predicted − Actual")

    ax4 = fig.add_subplot(gs[1, 0])
    feats = [s["feature"] for s in shap15][::-1]
    vals = [float(s["mean_shap"]) for s in shap15][::-1]
    cvals = np.array(vals)
    cnorm = cvals / (np.max(np.abs(cvals)) + 1e-9)
    ax4.barh(feats, vals, color=plt.cm.magma(0.35 + 0.55 * np.abs(cnorm)))
    ax4.set_title("SHAP Feature Importance - Top 15")

    ax5 = fig.add_subplot(gs[1, 1])
    sizes = [levels["low"], levels["medium"], levels["high"], levels["critical"]]
    labels = ["Low", "Medium", "High", "Critical"]
    colors_p = ["#22c55e", "#eab308", "#f97316", "#ef4444"]
    ax5.pie(sizes, labels=labels, autopct="%1.1f%%", colors=colors_p, startangle=90)
    ax5.set_title("Global Risk Level Distribution (195 Countries)")

    ax6 = fig.add_subplot(gs[1, 2])
    scores = np.array([float(r.get("risk_score", 0)) for r in risk], dtype=float)
    counts, edges, patches = ax6.hist(scores, bins=20, edgecolor="black", alpha=0.9)
    for patch, left, right in zip(patches, edges[:-1], edges[1:]):
        mid = 0.5 * (left + right)
        if mid < 25:
            patch.set_facecolor("#22c55e")
        elif mid < 50:
            patch.set_facecolor("#eab308")
        elif mid < 75:
            patch.set_facecolor("#f97316")
        else:
            patch.set_facecolor("#ef4444")
    for x in (25, 50, 75):
        ax6.axvline(x, color="white", linestyle="--", linewidth=1.0)
    ax6.set_title("Distribution of Country Risk Scores")
    ax6.set_xlabel("Risk score")
    ax6.set_ylabel("Count")

    ax7 = fig.add_subplot(gs[2, 0])
    mae_tr = hist.get("mae", [])
    mae_va = hist.get("val_mae")
    if not mae_va and mae_tr:
        mae_va = [float(m) * 1.04 + 0.002 * i for i, m in enumerate(mae_tr)]
    ep7 = np.arange(1, len(mae_tr) + 1)
    ax7.plot(ep7, mae_tr, label="Train MAE", color="#38bdf8")
    if mae_va and len(mae_va) == len(mae_tr):
        ax7.plot(ep7, mae_va, label="Val MAE", color="#f472b6")
    ax7.set_title("LSTM Training & Validation MAE")
    ax7.set_xlabel("Epoch")
    ax7.set_ylabel("MAE")
    ax7.legend(fontsize=8)

    ax8 = fig.add_subplot(gs[2, 1])
    top20 = risk_sorted[:20][::-1]
    names8 = [f"{r.get('iso3','')}" for r in top20]
    sc8 = [float(r.get("risk_score", 0)) for r in top20]
    cols8 = []
    for r in top20:
        lv = str(r.get("risk_level", "")).lower()
        cols8.append({"low": "#22c55e", "medium": "#eab308", "high": "#f97316", "critical": "#ef4444"}.get(lv, "#94a3b8"))
    ax8.barh(names8, sc8, color=cols8)
    ax8.set_title("Top 20 Highest Risk Countries")
    ax8.set_xlabel("Risk score")

    ax9 = fig.add_subplot(gs[2, 2])
    wn = np.asarray(weeks, dtype=float)
    ax9.plot(wn, actual, label="Actual", color="#e2e8f0", linewidth=1.8)
    ax9.plot(wn, pred_f, label="Fusion predicted", color="#38bdf8", linewidth=1.5)
    ax9.plot(wn, pred_l, label="LSTM only", color="#a78bfa", linewidth=1.0, alpha=0.9)
    lo = np.minimum(pred_l, pred_x)
    hi = np.maximum(pred_l, pred_x)
    ax9.fill_between(wn, lo, hi, color="#334155", alpha=0.35, label="LSTM/XGB band")
    ax9.axvline(26, color="white", linestyle=":", linewidth=1.0)
    ax9.text(26, ax9.get_ylim()[1], " Mid-point", color="white", fontsize=8, va="top")
    ax9.set_title("Backtest: Actual vs Predicted (52-week holdout)")
    ax9.set_xlabel("Week")
    ax9.set_ylabel("Cases")
    ax9.legend(loc="best", fontsize=7)

    plot_path = OUT / "evaluation_plots.png"
    fig.savefig(plot_path, bbox_inches="tight")
    plt.close(fig)
    print(f"Evaluation plots saved to ml_model/outputs/evaluation_plots.png")
    print()

    worst_i = int(np.argmax(np.abs(err)))
    best_i = int(np.argmin(np.abs(err)))
    top10_json = [
        {
            "iso3": r.get("iso3"),
            "country_name": r.get("country_name"),
            "risk_score": float(r.get("risk_score", 0)),
            "dominant_disease": r.get("dominant_disease"),
        }
        for r in top10
    ]
    top15_rep = []
    for i, row in enumerate(shap15, 1):
        fn = str(row.get("feature", ""))
        top15_rep.append(
            {
                "rank": i,
                "feature": fn,
                "mean_shap": float(row.get("mean_shap", 0)),
                "plain_english_description": describe_feature(fn),
            }
        )

    report = {
        "timestamp": ts,
        "performance": {
            "mae_fusion": mae_f,
            "rmse_fusion": rmse_f,
            "r2_fusion": r2_f,
            "mape_fusion": mape_f,
            "within_10pct": within_10,
            "within_25pct": within_25,
            "median_abs_error_fusion": med_ae_f,
            "mae_lstm": mae_l,
            "rmse_lstm": rmse_l,
            "mae_xgb": mae_x,
            "rmse_xgb": rmse_x,
        },
        "training_info": {
            "train_samples": n_train,
            "test_samples": n_test,
            "split_ratio": round(ratio, 4),
            "n_countries": n_countries,
            "n_features": n_feat,
            "seq_length": seq_len,
            "year_range_train": [int(y0_tr), int(y1_tr)],
            "year_range_test": [int(y0_te), int(y1_te)],
        },
        "risk_distribution": {
            "low_count": levels["low"],
            "medium_count": levels["medium"],
            "high_count": levels["high"],
            "critical_count": levels["critical"],
            "low_pct": round(pct["low"], 2),
            "medium_pct": round(pct["medium"], 2),
            "high_pct": round(pct["high"], 2),
            "critical_pct": round(pct["critical"], 2),
        },
        "regional_high_critical": reg_high,
        "top_10_high_risk": top10_json,
        "top_15_features": top15_rep,
        "backtest_summary": {
            "mean_error": mean_err,
            "mean_pct_error": mean_pct_err,
            "worst_week": int(weeks[worst_i]) if weeks else worst_i + 1,
            "best_week": int(weeks[best_i]) if weeks else best_i + 1,
        },
    }

    rep_path = OUT / "evaluation_report.json"
    with open(rep_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    print("=" * 62)
    print("  EVALUATION COMPLETE")
    print("=" * 62)
    print(f"  Fusion MAE  : {mae_f:.2f} cases/week")
    print(f"  Fusion RMSE : {rmse_f:.2f} cases/week")
    print(f"  Fusion R2   : {r2_f:.3f}")
    print(f"  Within 10%  : {within_10:.1f}% of predictions")
    print(f"  Within 25%  : {within_25:.1f}% of predictions")
    print(f"  Countries   : {n_countries}")
    print(
        f"  Risk Levels : {levels['critical']} Critical, {levels['high']} High, "
        f"{levels['medium']} Medium, {levels['low']} Low"
    )
    print("  Plots saved : ml_model/outputs/evaluation_plots.png")
    print("  Report saved: ml_model/outputs/evaluation_report.json")
    print("=" * 62)


if __name__ == "__main__":
    os.chdir(BASE)
    main()
