import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

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

/* ========== FUNÇÃO RADAR ORIGINAL ========== */
export function RadarChart({ data, container, columns, animate=false }) {
    const width = window.innerWidth/3;
    const height = width;
    const radius = width/3;
    const angleSlice = 2*Math.PI/columns.length;
    const rScale = d3.scaleLinear().domain([0,1]).range([0,radius]);

    // Tooltip
    let tooltip = d3.select(container+"Tooltip");
    if (tooltip.empty()) tooltip = d3.select("body")
        .append("div")
        .attr("id", container.replace("#","")+"Tooltip")
        .style("position","absolute")
        .style("background","white")
        .style("padding","6px 12px")
        .style("border","1px solid #aaa")
        .style("border-radius","6px")
        .style("pointer-events","none")
        .style("opacity",0)
        .style("max-width","260px");

    // SVG
    const svgC = d3.select(container);
    if (!animate) svgC.selectAll("*").remove();
    let svgEl = svgC.select("svg");
    if (svgEl.empty()) svgEl = svgC.append("svg").attr("width",width).attr("height",height);
    let svg = svgEl.select("g");
    if (svg.empty()) svg = svgEl.append("g").attr("transform",`translate(${width/2},${height/2})`);

    // GRID
    if (!animate) {
        for(let level=1;level<=5;level++)
            svg.append("circle").attr("r",(radius*level)/5)
                .attr("fill","#CDCDCD").attr("fill-opacity",0.1).attr("stroke","#CDCDCD");

        columns.forEach((c,i)=>{
            svg.append("line")
                .attr("x1",0).attr("y1",0)
                .attr("x2", rScale(1)*Math.cos(i*angleSlice-Math.PI/2))
                .attr("y2", rScale(1)*Math.sin(i*angleSlice-Math.PI/2))
                .attr("stroke","#777");

            svg.append("text")
                .attr("x", rScale(1.2)*Math.cos(i*angleSlice-Math.PI/2))
                .attr("y", rScale(1.2)*Math.sin(i*angleSlice-Math.PI/2))
                .attr("text-anchor","middle")
                .style("font-size","12px").style("fill","#444")
                .text(c.label);
        });
    }

    const radarLine = d3.lineRadial()
        .radius(d=>rScale(d.value))
        .angle((d,i)=>i*angleSlice)
        .curve(d3.curveCardinalClosed);

    // Use keyed data joins para permitir que séries sejam removidas
    const series = data.map((row,idx)=>({
        year: row.YEAR,
        values: columns.map(c=>({value:+row[c.norm], raw:+row[c.raw], label:c.label, year:row.YEAR})),
        gray: 0.4 + idx*0.4/data.length
    }));

    // Paths com keyed join
    const paths = svg.selectAll(".radarPath").data(series, d=>d.year);
    paths.exit().remove();
    paths.join(
        enter=>enter.append("path")
            .attr("class","radarPath")
            .attr("data-year",d=>d.year)
            .attr("stroke",d=>`rgba(50,50,50,${d.gray})`)
            .attr("fill",d=>`rgba(100,100,100,${d.gray*0.4})`)
            .attr("stroke-width",2)
            .attr("d",d=>radarLine(d.values)),
        update=>update
            .attr("stroke",d=>`rgba(50,50,50,${d.gray})`)
            .attr("fill",d=>`rgba(100,100,100,${d.gray*0.4})`)
            .attr("d",d=>radarLine(d.values))
    );

    // Points com keyed join
    const pointGroups = svg.selectAll(".radarPointGroup").data(series, d=>d.year);
    pointGroups.exit().remove();
    const mergedPoints = pointGroups.join(
        enter=>enter.append("g").attr("class","radarPointGroup").attr("data-year",d=>d.year),
        update=>update.attr("data-year",d=>d.year)
    );

    mergedPoints.each(function(seriesData){
        const pts = d3.select(this)
            .selectAll("circle")
            .data(seriesData.values.map(v=>({...v, gray: seriesData.gray})), d=>d.label);

        pts.exit().remove();
        pts.join(
            enter=>enter.append("circle")
                .attr("r",5)
                .attr("cx",(d,i)=>rScale(d.value)*Math.cos(i*angleSlice-Math.PI/2))
                .attr("cy",(d,i)=>rScale(d.value)*Math.sin(i*angleSlice-Math.PI/2))
                .attr("fill",d=>`rgba(50,50,50,${d.gray})`)
                .on("mouseover",(event,d)=>{
                    tooltip.style("opacity",1)
                        .html(`<strong>${d.label}</strong><br>Year: ${d.year}<br>Value: ${d.raw}`);
                })
                .on("mousemove",e=>tooltip.style("left",e.pageX+15+"px").style("top",e.pageY+15+"px"))
                .on("mouseout",()=>tooltip.style("opacity",0)),
            update=>update
                .attr("cx",(d,i)=>rScale(d.value)*Math.cos(i*angleSlice-Math.PI/2))
                .attr("cy",(d,i)=>rScale(d.value)*Math.sin(i*angleSlice-Math.PI/2))
        );
    });
}

/* ========== RADAR2 POR VARIÁVEL ========= */
function RadarVariable({ data, container, variableRaw, animate=false }) {
    const width = window.innerWidth/3;
    const height = width;
    const radius = width/3;
    const angleSlice = 2*Math.PI/data.length;
    const rScale = d3.scaleLinear().domain([0,1]).range([0,radius]);

    // Tooltip
    let tooltip = d3.select(container+"Tooltip");
    if (tooltip.empty()) tooltip = d3.select("body")
        .append("div")
        .attr("id",container.replace("#","")+"Tooltip")
        .style("position","absolute")
        .style("background","white")
        .style("padding","6px 12px")
        .style("border","1px solid #aaa")
        .style("border-radius","6px")
        .style("pointer-events","none")
        .style("opacity",0)
        .style("max-width","260px")
        .style("font-size","12px");

    const svgC = d3.select(container);
    svgC.selectAll("*").remove(); // Always clear to rebuild grid with correct data length
    let svgEl = svgC.select("svg");
    if (svgEl.empty()) svgEl = svgC.append("svg").attr("width",width).attr("height",height);
    let svg = svgEl.select("g");
    if (svg.empty()) svg = svgEl.append("g").attr("transform",`translate(${width/2},${height/2})`);

    // GRID - always rebuild based on current data
    for(let level=1;level<=5;level++)
        svg.append("circle")
            .attr("r",(radius*level)/5)
            .attr("fill","#CDCDCD")
            .attr("fill-opacity",0.1)
            .attr("stroke","#CDCDCD");

    data.forEach((d,i)=>{
        svg.append("line")
            .attr("x1",0).attr("y1",0)
            .attr("x2",rScale(1)*Math.cos(i*angleSlice-Math.PI/2))
            .attr("y2",rScale(1)*Math.sin(i*angleSlice-Math.PI/2))
            .attr("stroke","#777");

        svg.append("text")
            .attr("x", rScale(1.2)*Math.cos(i*angleSlice-Math.PI/2))
            .attr("y", rScale(1.2)*Math.sin(i*angleSlice-Math.PI/2))
            .attr("text-anchor","middle")
            .style("font-size","12px")
            .style("fill","#444")
            .text(d.YEAR);
    });

    const col = radarColumns.find(c=>c.raw===variableRaw);
    const radarData = data.map(d=>({
        value: +d[col.norm],
        raw: +d[col.raw],
        year: d.YEAR,
        label: col.label,
        desc: col.desc
    }));

    const radarLine = d3.lineRadial()
        .radius(d=>rScale(d.value))
        .angle((d,i)=>i*angleSlice)
        .curve(d3.curveCardinalClosed);

    // Linha
    svg.selectAll(".radarVarPath").data([radarData])
        .join("path")
        .attr("class","radarVarPath")
        .attr("d",radarLine)
        .attr("stroke","steelblue")
        .attr("stroke-width",2)
        .attr("fill","rgba(70,130,180,0.2)");

    // Pontos
    const points = svg.selectAll(".radarVarPoint").data(radarData,d=>d.year)
        .join("circle")
        .attr("class","radarVarPoint")
        .attr("r",5)
        .attr("cx",(d,i)=>rScale(d.value)*Math.cos(i*angleSlice-Math.PI/2))
        .attr("cy",(d,i)=>rScale(d.value)*Math.sin(i*angleSlice-Math.PI/2))
        .attr("fill","steelblue");
    
    points.on("mouseover",(event,d)=>{
            tooltip.style("opacity",1)
                .html(`
                    <strong>${d.label}</strong><br>
                    <strong>Year:</strong> ${d.year}<br>
                    <strong>Original:</strong> ${d.raw}<br>
                    <strong>Normalized:</strong> ${d.value.toFixed(3)}<br>
                    <em>${d.desc||''}</em>
                `);
        })
        .on("mousemove",e=>{
            tooltip.style("left",e.pageX+15+"px")
                   .style("top",e.pageY+15+"px");
        })
        .on("mouseout",()=>tooltip.style("opacity",0));
}


/* ========== CARREGAR CSV ========== */
d3.csv("dataset-ukrain.csv").then(data=>{
    fullRadarData = data.map(d=>{
        radarColumns.forEach(c=>d[c.norm]=+d[c.norm]);
        radarColumns.forEach(c=>d[c.raw]=+d[c.raw]);
        d.YEAR=+d.YEAR;
        return d;
    });

    // Inicializar radar original (todos os parâmetros)
    RadarChart({ data:fullRadarData, container:"#radar", columns:radarColumns, animate:false });

    // Create container and radar charts for each parameter
    const container = document.getElementById("radar-container");
    if (container) {
        container.style.display = "grid";
        container.style.gridTemplateColumns = "repeat(auto-fit, minmax(400px, 1fr))";
        container.style.gap = "20px";
        container.style.padding = "20px";

        radarColumns.forEach(col => {
            const chartDiv = document.createElement("div");
            chartDiv.id = `radar-${col.label.toLowerCase().replace(/\s+/g, "-")}`;
            chartDiv.className = "radarChart";
            chartDiv.style.padding = "10px";
            
            const title = document.createElement("h2");
            title.textContent = col.label;
            title.style.textAlign = "center";
            title.style.margin = "10px 0";
            
            const svgContainer = document.createElement("div");
            svgContainer.id = `${chartDiv.id}-svg`;
            
            chartDiv.appendChild(title);
            chartDiv.appendChild(svgContainer);
            container.appendChild(chartDiv);

            // Render radar for this parameter
            RadarVariable({
                data: fullRadarData,
                container: `#${svgContainer.id}`,
                variableRaw: col.raw,
                animate: false
            });
        });
    }
});

// Atualiza todos os radares conforme o filtro de ano
function updateRadarsByYear(yearValue) {
    if (!fullRadarData.length) return;
    let filtered = fullRadarData;
    if (yearValue && yearValue !== "2015-2024") {
        const yr = +yearValue;
        filtered = fullRadarData.filter(d => d.YEAR === yr);
    }

    const animate = true;
    // Update original radar with all parameters (este usa o filtro)
    RadarChart({ data: filtered, container: "#radar", columns: radarColumns, animate });
}

// Listener para select de anos no index.html
const yearSelectEl = document.getElementById("yearSelect");
if (yearSelectEl) {
    yearSelectEl.addEventListener("change", (e) => {
        updateRadarsByYear(e.target.value);
    });
}
