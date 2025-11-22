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

    if (svgEl.empty()) svgEl = svgContainer.append("svg");

    svgEl.attr("width", width).attr("height", height);

    let svg = svgEl.select("g");
    if (svg.empty()) svg = svgEl.append("g");

    svg.attr("transform", `translate(${width/2},${height/2})`);


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



    // -------------------------
    // GRID + AXIS (apenas 1x)
    // -------------------------
    if (!animate) {
        
        for (let level = 1; level <= 5; level++) {
            svg.append("circle")
                .attr("r", radius * level / 5)
                .attr("fill", "none")
                .attr("stroke", "#CDCDCD");
        }

        const axis = svg.selectAll(".axis")
            .data(parameters)
            .enter()
            .append("g")
            .attr("class", "axis");

        axis.append("line")
            .attr("x1", 0)
            .attr("y1", 0)
            .attr("x2", (d,i) => rScale(1) * Math.cos(i * angleSlice - Math.PI/2))
            .attr("y2", (d,i) => rScale(1) * Math.sin(i * angleSlice - Math.PI/2))
            .attr("stroke", "#CDCDCD");

        svg.selectAll(".axisLabel")
            .data(parameters)
            .enter()
            .append("text")
            .attr("class", "axisLabel")
            .attr("x", (d, i) => rScale(1.15) * Math.cos(i * angleSlice - Math.PI/2))
            .attr("y", (d, i) => rScale(1.15) * Math.sin(i * angleSlice - Math.PI/2))
            .attr("text-anchor", "middle")
            .attr("dy", "0.35em")
            .style("font-size", "12px")
            .text(d => axisLabelsMap[d] || d);
    }

    const radarLine = d3.lineRadial()
        .radius(d => rScale(d.value))
        .angle((d,i) => i*angleSlice)
        .curve(d3.curveLinearClosed);

    const color = d3.scaleOrdinal()
        .domain(dataArray.map(d => d.YEAR))
        .range(d3.schemeCategory10);


    // -------------------------
    // DESENHAR RADARES + PONTOS
    // -------------------------
    dataArray.forEach((d,i) => {

        const radarData = parameters.map(p => ({ axis: p, value: d[p] }));

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
                .attr("stroke", color(d.YEAR))
                .attr("fill", color(d.YEAR))
                .attr("fill-opacity",0.25)
                .attr("stroke-width",2);
        }
        else {
            path
                .attr("d", radarLine(radarData))
                .attr("stroke", color(d.YEAR))
                .attr("fill", color(d.YEAR))
                .attr("fill-opacity",0.25)
                .attr("stroke-width",2);
        }



        // -------------------------
        // PONTOS + TOOLTIP
        // -------------------------
        svg.selectAll(`.radarPoint_${d.YEAR}`).remove();

        svg.selectAll(`.radarPoint_${d.YEAR}`)
            .data(radarData)
            .enter()
            .append("circle")
            .attr("class", `radarPoint_${d.YEAR}`)
            .attr("r", 5)
            .attr("cx", (p,j) => rScale(p.value) * Math.cos(j * angleSlice - Math.PI/2))
            .attr("cy", (p,j) => rScale(p.value) * Math.sin(j * angleSlice - Math.PI/2))
            .attr("fill", color(d.YEAR))
            .attr("fill-opacity", 0.9)
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
