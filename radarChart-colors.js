export let fullRadarData = [];
export const radarColumns = [
    { norm:"HAPPINESS SCORE MIN-MAX NORMALIZATION", raw:"HAPPINESS SCORE", label:"Happiness" },
    { norm:"GDP PER CAPITA (Billions) MIN-MAX NORMALIZATION", raw:"GDP PER CAPITA (Billions)", label:"GDP" },
    { norm:"SOCIAL SUPPORT MIN-MAX NORMALIZATION", raw:"SOCIAL SUPPORT", label:"Social Support" },
    { norm:"HEALTHY LIFE EXPECTANCY MIN-MAX NORMALIZATION", raw:"HEALTHY LIFE EXPECTANCY", label:"Healthy Life" },
    { norm:"FREEDOM TO MAKE LIFE CHOICES MIN-MAX NORMALIZATION", raw:"FREEDOM TO MAKE LIFE CHOICES", label:"Freedom" },
    { norm:"GENEROSITY MIN-MAX NORMALIZATION", raw:"GENEROSITY", label:"Generosity" },
    { norm:"PERCEPTION OF CORRUPTION MIN-MAX NORMALIZATION", raw:"PERCEPTION OF CORRUPTION", label:"Corruption" }
];

export const yearColors = {
    2015: { color: "#3498db", label: "2015" },  // Bright Blue
    2016: { color: "#9b59b6", label: "2016" },  // Purple
    2017: { color: "#00bcd4", label: "2017" },  // Cyan
    2018: { color: "#e91e63", label: "2018" },  // Pink
    2019: { color: "#34495e", label: "2019" },  // Dark Blue-Gray
    2020: { color: "#ff6b6b", label: "2020" },  // Coral
    2021: { color: "#4ecdc4", label: "2021" },  // Teal
    2022: { color: "#a29bfe", label: "2022" },  // Light Purple
    2023: { color: "#fd79a8", label: "2023" },  // Light Pink
    2024: { color: "#0984e3", label: "2024" }   // Deep Blue
};

export function getYearColor2(year) {
    return yearColors[year]?.color || "#bbb";
}

// Fixed Logical Size for ViewBox - with tighter margins
const logicalSize = 600;
const viewBoxPadding = 30; // Reduce this to crop more space
const radius = logicalSize / 3;

export function RadarChart2({ data, container, columns, animate=false }) {
    
    // Tooltip
    let tooltip = d3.select(container+"Tooltip");
    if (tooltip.empty()) tooltip = d3.select("body").append("div").attr("id", container.replace("#","")+"Tooltip")
        .style("position","absolute").style("background","white").style("padding","6px 12px")
        .style("border","1px solid #aaa").style("opacity",0).style("pointer-events","none");

    const svgC = d3.select(container);
    if (!animate) svgC.selectAll("*").remove();

    let svgEl = svgC.select("svg");
    if (svgEl.empty()) {
        svgEl = svgC.append("svg")
            .attr("viewBox", `${viewBoxPadding} ${viewBoxPadding} ${logicalSize - viewBoxPadding * 2} ${logicalSize - viewBoxPadding * 2}`)
            .attr("preserveAspectRatio", "xMidYMid meet")
            .style("width", "100%")
            .style("height", "auto")
            .style("max-width", `${logicalSize}px`)
            .style("margin", "0 auto")
            .style("display", "block");
    }
    
    let svg = svgEl.select("g");
    if (svg.empty()) svg = svgEl.append("g").attr("transform",`translate(${logicalSize/2},${logicalSize/2})`);
    
    if (animate) {
        svg.selectAll(".radarPath").remove();
        svg.selectAll(".radarPointGroup").remove();
    } else {
        // Draw Grid
        const rScale = d3.scaleLinear().domain([0,1]).range([0,radius]);
        for(let level=1;level<=5;level++)
            svg.append("circle")
               .attr("r",(radius*level)/5)
               .attr("fill","#CDCDCD")
               .attr("fill-opacity",0.1)
               .attr("stroke","#CDCDCD");
        
        const angleSlice = 2*Math.PI/columns.length;
        columns.forEach((c,i)=>{
            svg.append("line")
                .attr("x1",0).attr("y1",0)
                .attr("x2", rScale(1)*Math.cos(i*angleSlice-Math.PI/2))
                .attr("y2", rScale(1)*Math.sin(i*angleSlice-Math.PI/2))
                .attr("stroke","#777");
            svg.append("text")
                .attr("x", rScale(1.2)*Math.cos(i*angleSlice-Math.PI/2))
                .attr("y", rScale(1.2)*Math.sin(i*angleSlice-Math.PI/2))
                .attr("text-anchor","middle").style("font-size","10px").text(c.label);
        });
    }

    const rScale = d3.scaleLinear().domain([0,1]).range([0,radius]);
    const angleSlice = 2*Math.PI/columns.length;
    const radarLine = d3.lineRadial()
        .radius(d=>rScale(d.value))
        .angle((d,i)=>i*angleSlice)
        .curve(d3.curveCardinalClosed);

    const series = data.map((row,idx)=>({
        year: row.YEAR,
        values: columns.map(c=>({value:+row[c.norm], raw:+row[c.raw], label:c.label, year:row.YEAR}))
    }));

    // Draw Paths
    svg.selectAll(".radarPath").data(series, d=>d.year)
        .join("path")
        .attr("class","radarPath")
        .attr("stroke",d=>getYearColor2(d.year))
        .attr("fill",d=>d3.color(getYearColor2(d.year)).copy({opacity:0.2}))
        .attr("stroke-width",2)
        .attr("d",d=>radarLine(d.values));

    // Draw Points
    const groups = svg.selectAll(".radarPointGroup").data(series, d=>d.year)
        .join("g").attr("class","radarPointGroup");

    groups.each(function(sData){
        d3.select(this).selectAll("circle").data(sData.values)
            .join("circle")
            .attr("r",4)
            .attr("cx",(d,i)=>rScale(d.value)*Math.cos(i*angleSlice-Math.PI/2))
            .attr("cy",(d,i)=>rScale(d.value)*Math.sin(i*angleSlice-Math.PI/2))
            .attr("fill",d=>getYearColor2(d.year))
            .on("mouseover",(e,d)=>{
                tooltip.style("opacity",1).html(`<strong>${d.label}</strong><br>${d.year}: ${d.raw}`);
            })
            .on("mousemove",e=>tooltip.style("left",e.pageX+10+"px").style("top",e.pageY+10+"px"))
            .on("mouseout",()=>tooltip.style("opacity",0));
    });
}

// Single Color Radar (Small Multiples)
function RadarVariableSingleColor({ data, container, variableRaw, color = "#2ca02c" }) {
    const svgC = d3.select(container);
    svgC.selectAll("*").remove();

    const svgEl = svgC.append("svg")
        .attr("viewBox", `${viewBoxPadding} ${viewBoxPadding} ${logicalSize - viewBoxPadding * 2} ${logicalSize - viewBoxPadding * 2}`)
        .attr("preserveAspectRatio", "xMidYMid meet")
        .style("width", "100%").style("height", "auto")
        .style("max-width", `${logicalSize}px`)
        .style("margin", "0 auto")
        .style("display", "block");
    
    const svg = svgEl.append("g").attr("transform",`translate(${logicalSize/2},${logicalSize/2})`);
    const rScale = d3.scaleLinear().domain([0,1]).range([0,radius]);
    const angleSlice = 2*Math.PI/data.length;

    // Grid with visible circles
    for(let level=1;level<=5;level++) {
        svg.append("circle")
            .attr("class", "grid-circle")
            .attr("r",(radius*level)/5)
            .attr("fill","none")
            .attr("stroke","#CDCDCD")
            .attr("stroke-width", 1);
    }

    // Draw radial lines (spokes)
    data.forEach((d,i)=>{
        svg.append("line")
            .attr("x1",0).attr("y1",0)
            .attr("x2",rScale(1)*Math.cos(i*angleSlice-Math.PI/2))
            .attr("y2",rScale(1)*Math.sin(i*angleSlice-Math.PI/2))
            .attr("stroke","#CDCDCD")
            .attr("stroke-width", 1);
    });

    // Labels
    data.forEach((d,i)=>{
        svg.append("text")
            .attr("x", rScale(1.2)*Math.cos(i*angleSlice-Math.PI/2))
            .attr("y", rScale(1.2)*Math.sin(i*angleSlice-Math.PI/2))
            .attr("text-anchor","middle").style("font-size","10px").text(d.YEAR);
    });

    const col = radarColumns.find(c=>c.raw===variableRaw);
    const radarData = data.map(d=>({ value: +d[col.norm], raw: +d[col.raw], year: d.YEAR }));

    const radarLine = d3.lineRadial()
        .radius(d=>rScale(d.value))
        .angle((d,i)=>i*angleSlice)
        .curve(d3.curveCardinalClosed);

    svg.append("path")
        .datum(radarData)
        .attr("d",radarLine)
        .attr("stroke",color).attr("fill",d3.color(color).copy({opacity:0.2})).attr("stroke-width",2);

    // Use a class selector to avoid selecting grid circles
    svg.selectAll("circle.data-point").data(radarData).join("circle")
        .attr("class", "data-point")
        .attr("r",5)
        .attr("cx",(d,i)=>rScale(d.value)*Math.cos(i*angleSlice-Math.PI/2))
        .attr("cy",(d,i)=>rScale(d.value)*Math.sin(i*angleSlice-Math.PI/2))
        .attr("fill",color);
}

// Load Data
d3.csv("dataset-ukrain.csv").then(data=>{
    fullRadarData = data.map(d=>{
        radarColumns.forEach(c=>d[c.norm]=+d[c.norm]);
        radarColumns.forEach(c=>d[c.raw]=+d[c.raw]);
        d.YEAR=+d.YEAR;
        return d;
    });

    // Initial Render
    RadarChart2({ data:fullRadarData, container:"#radarcolors", columns:radarColumns });

    // Render Small Multiples (Initial)
    const paramTargets = [
        { id: "#radar-happiness", raw: "HAPPINESS SCORE", color: "#3a88f3" },
        { id: "#radar-gdp", raw: "GDP PER CAPITA (Billions)", color: "#3a88f3" },
        { id: "#radar-social-support", raw: "SOCIAL SUPPORT", color: "#3a88f3" },
        { id: "#radar-healthy-life", raw: "HEALTHY LIFE EXPECTANCY", color: "#3a88f3" },
        { id: "#radar-freedom", raw: "FREEDOM TO MAKE LIFE CHOICES", color: "#3a88f3" },
        { id: "#radar-generosity", raw: "GENEROSITY", color: "#3a88f3" },
        { id: "#radar-corruption", raw: "PERCEPTION OF CORRUPTION", color: "#3a88f3" }
    ];

    paramTargets.forEach(t => {
        RadarVariableSingleColor({ data: fullRadarData, container: t.id, variableRaw: t.raw, color: t.color });
    });

    // Event Listener for slider
    document.addEventListener('yearRangeChanged', function(e) {
        const min = e.detail.min;
        const max = e.detail.max;
        
        // Filter Main Radar
        const filtered = fullRadarData.filter(d => d.YEAR >= min && d.YEAR <= max);
        RadarChart2({ data: filtered, container: "#radarcolors", columns: radarColumns, animate: true });

        // Filter Small Multiples
        paramTargets.forEach(t => {
            RadarVariableSingleColor({ data: filtered, container: t.id, variableRaw: t.raw, color: t.color });
        });
    });
});