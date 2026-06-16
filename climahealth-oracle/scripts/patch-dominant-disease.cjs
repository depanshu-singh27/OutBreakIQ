const fs = require('fs');
const path = require('path');
const jsonPath = path.join(__dirname, '..', 'src', 'data', 'modelOutputs', 'country_risk_scores.json');
const rows = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const cholera = new Set(`HTI,ZWE,SSD,YEM,SOM`.split(',').map((s) => s.trim().toUpperCase()));
const dengue = new Set(`AFG,BGD,IND,LKA,NPL,THA,VNM,IDN,PHL,MMR,KHM,LAO,MYS,SGP,BRN,TLS,DOM,CUB,BRA,COL,VEN,PER,BOL,GTM,HND,NIC,SLV,CRI,PAN,PRY,ECU,PNG,FJI,SLB,VUT`.split(',').map((s) => s.trim().toUpperCase()));
const malaria = new Set(`NGA,ETH,COD,TZA,KEN,UGA,GHA,CMR,AGO,MOZ,ZMB,ZWE,MLI,NER,BFA,TCD,SSD,RWA,BDI,GIN,SLE,LBR,GMB,SEN,BEN,TGO,CIV,GNB,GNQ,GAB,COG,CAF,ERI,DJI,SOM,MDG,MWI`.split(',').map((s) => s.trim().toUpperCase()));
const heatStroke = new Set(`SAU,ARE,KWT,QAT,BHR,OMN,IRQ,IRN,PAK,EGY,LBY,DZA,SDN,MRT`.split(',').map((s) => s.trim().toUpperCase()));
const respiratory = new Set(`CHN,USA,GBR,DEU,FRA,JPN,KOR,RUS,UKR,POL,CZE,HUN,ROU`.split(',').map((s) => s.trim().toUpperCase()));
for (const r of rows) {
    const c = String(r.iso3).toUpperCase();
    let d = 'respiratory';
    if (cholera.has(c))
        d = 'cholera';
    else if (dengue.has(c))
        d = 'dengue';
    else if (malaria.has(c))
        d = 'malaria';
    else if (heatStroke.has(c))
        d = 'heatStroke';
    else if (respiratory.has(c))
        d = 'respiratory';
    r.dominant_disease = d;
}
fs.writeFileSync(jsonPath, JSON.stringify(rows, null, 2));
console.log('Patched dominant_disease for', rows.length, 'countries →', jsonPath);
