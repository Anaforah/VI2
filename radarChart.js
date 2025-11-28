import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

const radarTooltip = d3.select("body")
    .append("div")
    .style("position","absolute")
    .style("background","white")
    .style("padding","6px 12px")
    .style("border","1px solid #aaa")
    .style("border-radius","6px")
    .style("pointer-events","none")
    .style("opacity",0)
    .style("max-width","260px")
    .style("font-size","12px");

const paramDescriptions = {
    "HAPPINESS SCORE": "Overall happiness score based on survey responses.",
    "GDP PER CAPITA (Billions)": `GDP per capita in PPP-adjusted 2021 dollars (WDI 2024). 2024 values use OECD/World Bank forecasts. Natural log used in the model.`,
    "SOCIAL SUPPORT": `Share of people answering “yes” to having someone to rely on in times of need (Gallup World Poll).`,
    "HEALTHY LIFE EXPECTANCY": "Estimated healthy life expectancy at birth (WHO).",
    "FREEDOM TO MAKE LIFE CHOICES": "Perceived freedom to choose what to do with one's life.",
    "GENEROSITY": "Measure of prosocial and donation behavior.",
    "PERCEPTION OF CORRUPTION": "Perceived corruption in government and business."
};

export function updateRadarForYears(dataArray, animate=false) {

    const width = window.innerWidth/3, height = window.innerWidth/3;
    const radius = width/3;

    const svgContainer = d3.select(".radarChart");
    if (!animate) svgContainer.selectAll("*").remove();

    let svgEl = svgContainer.select("svg");
    if (svgEl.empty()) svgEl = svgContainer.append("svg")
        .attr("width", width)
        .attr("height", height);

    let svg = svgEl.select("g");
    if (svg.empty()) svg = svgEl.append("g")
        .attr("transform", `translate(${width/2},${height/2})`);

    const parameters = [
        "HAPPINESS SCORE MIN-MAX NORMALIZATION",
        "GDP PER CAPITA (Billions) MIN-MAX NORMALIZATION",
        "SOCIAL SUPPORT MIN-MAX NORMALIZATION",
        "HEALTHY LIFE EXPECTANCY MIN-MAX NORMALIZATION",
        "FREEDOM TO MAKE LIFE CHOICES MIN-MAX NORMALIZATION",
        "GENEROSITY MIN-MAX NORMALIZATION",
        "PERCEPTION OF CORRUPTION MIN-MAX NORMALIZATION"
    ];

    const axisLabelsMap = {
        "HAPPINESS SCORE MIN-MAX NORMALIZATION": "Happiness",
        "GDP PER CAPITA (Billions) MIN-MAX NORMALIZATION": "GDP",
        "SOCIAL SUPPORT MIN-MAX NORMALIZATION": "Social Support",
        "HEALTHY LIFE EXPECTANCY MIN-MAX NORMALIZATION": "Healthy Life",
        "FREEDOM TO MAKE LIFE CHOICES MIN-MAX NORMALIZATION": "Freedom",
        "GENEROSITY MIN-MAX NORMALIZATION": "Generosity",
        "PERCEPTION OF CORRUPTION MIN-MAX NORMALIZATION": "Corruption"
    };

    const angleSlice = (2 * Math.PI) / parameters.length;
    const rScale = d3.scaleLinear().domain([0,1]).range([0,radius]);

    // Escala de cinza para cada radar
    const grayScale = d3.scaleLinear()
        .domain([0, dataArray.length - 1])
        .range([0.4, 0.8]); // tons de cinza (mais claro a mais escuro)

    // -------------------------
    // Glow filter
    // -------------------------
    const defs = svg.select("defs").empty() ? svg.append("defs") : svg.select("defs");
    const filter = defs.select("#glow").empty() ? defs.append("filter").attr("id","glow") : defs.select("#glow");
    filter.selectAll("*").remove();
    filter.append("feGaussianBlur").attr("stdDeviation","2.5").attr("result","coloredBlur");
    const feMerge = filter.append("feMerge");
    feMerge.append("feMergeNode").attr("in","coloredBlur");
    feMerge.append("feMergeNode").attr("in","SourceGraphic");

    // -------------------------
    // GRID + AXIS (only once)
    // -------------------------
    if (!animate) {
        // Grey circular grid with glow
        for (let level = 1; level <= 5; level++) {
            svg.append("circle")
                .attr("r", radius * level / 5)
                .attr("fill", "#CDCDCD")
                .attr("fill-opacity", 0.1)
                .attr("stroke", "#CDCDCD")
                .style("filter", "url(#glow)");
        }

        // Axis lines and labels
        parameters.forEach((p,i)=>{
            svg.append("line")
                .attr("x1",0).attr("y1",0)
                .attr("x2", rScale(1) * Math.cos(i*angleSlice - Math.PI/2))
                .attr("y2", rScale(1) * Math.sin(i*angleSlice - Math.PI/2))
                .attr("stroke","white").attr("stroke-width",2);

            svg.append("text")
                .attr("x", rScale(1.15) * Math.cos(i*angleSlice - Math.PI/2))
                .attr("y", rScale(1.15) * Math.sin(i*angleSlice - Math.PI/2))
                .attr("text-anchor","middle")
                .attr("dy","0.35em")
                .style("font-size","12px")
                .style("fill","#444")
                .text(axisLabelsMap[p] || p);
        });
    }

    // -------------------------
    // RADAR LINE with slight curvature
    // -------------------------
    const radarLine = d3.lineRadial()
        .radius(d => rScale(d.value))
        .angle((d,i) => i*angleSlice)
        .curve(d3.curveCardinalClosed); // linhas levemente curvas

    // -------------------------
    // DRAW RADARS + POINTS
    // -------------------------
    dataArray.forEach((d,i) => {

        const radarData = parameters.map(p => ({ axis: p, value: d[p] }));
        const gray = grayScale(i);

        // Path
        let path = svg.selectAll(`.radarPath_${d.YEAR}`).data([radarData]);
        path = path.enter()
            .append("path")
            .attr("class", `radarPath_${d.YEAR}`)
            .merge(path);

        if (animate) {
            path.transition()
                .duration(800)
                .attrTween("d", function(dNew) {
                    const previous = this._current || radarLine(dNew);
                    const current = radarLine(dNew);
                    const interpolator = d3.interpolateString(previous, current);
                    this._current = current;
                    return t => interpolator(t);
                })
                .attr("stroke", `rgba(50,50,50,${gray})`)
                .attr("fill", `rgba(100,100,100,${gray*0.4})`)
                .attr("stroke-width",2)
                .style("filter","url(#glow)");
        } else {
            path
                .attr("d", radarLine(radarData))
                .attr("stroke", `rgba(50,50,50,${gray})`)
                .attr("fill", `rgba(100,100,100,${gray*0.4})`)
                .attr("stroke-width",2)
                .style("filter","url(#glow)");
        }

        // Points + Tooltip
        svg.selectAll(`.radarPoint_${d.YEAR}`).remove();
        svg.selectAll(`.radarPoint_${d.YEAR}`)
            .data(radarData)
            .enter()
            .append("circle")
            .attr("class", `radarPoint_${d.YEAR}`)
            .attr("r", 5)
            .attr("cx", (p,j) => rScale(p.value) * Math.cos(j*angleSlice - Math.PI/2))
            .attr("cy", (p,j) => rScale(p.value) * Math.sin(j*angleSlice - Math.PI/2))
            .attr("fill", `rgba(50,50,50,${gray})`)
            .attr("fill-opacity", 0.8)
            .style("cursor","pointer")
            .on("mouseover", function(event, p) {
                const rawParam = p.axis.replace(" MIN-MAX NORMALIZATION", "");
                const rawValue = d[rawParam];
                const description = paramDescriptions[rawParam] || "No description available.";

                radarTooltip
                    .style("opacity", 1)
                    .html(`
                        <strong>${rawParam}</strong><br>
                        <strong>Original value:</strong> ${rawValue ?? "N/A"}<br>
                        <strong>Normalized:</strong> ${p.value.toFixed(3)}<br><br>
                        <em>${description.replace(/\n/g,"<br>")}</em>
                    `);
            })
            .on("mousemove", function(event) {
                radarTooltip
                    .style("left", event.pageX + 10 + "px")
                    .style("top", event.pageY + 10 + "px");
            })
            .on("mouseout", function() {
                radarTooltip.style("opacity", 0);
            });
    });
}
