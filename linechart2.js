import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

export function createLineChart(width, height, margin, animation = true) {
    // Override margins to avoid clipping and extra padding
    margin = { top: 0, right: 0, bottom: 0, left: 0 };
    
    // New parameters: Best, Worst, Ukraine medians
    const parameters = [
        "BEST",
        "WORST",
        "UKRAINE"
    ];

    const legendNames = {
        "BEST": "Best Countries (Median)",
        "WORST": "Worst Countries (Median)",
        "UKRAINE": "Ukraine (Median)"
    };

    const paramDescriptions = {
        "BEST": "Median values of best-ranked countries.",
        "WORST": "Median values of worst-ranked countries.",
        "UKRAINE": "Ukraine median metrics."
    };

    const containerNode = document.getElementById("my_dataviz2");
    const getChartWidth = () => {
        const raw = containerNode ? containerNode.clientWidth : (width + margin.left + margin.right);
            return Math.max(360, raw - margin.left - margin.right);
    };
        let chartWidth = getChartWidth();
        // Use the provided height (previous static behavior)
        let chartHeight = height;

    const svgRoot = d3.select("#my_dataviz2")
        .append("svg")
        .attr("width", chartWidth + margin.left + margin.right)
        .attr("height", chartHeight + margin.top + margin.bottom)
        .attr("preserveAspectRatio","xMidYMid meet")
        .attr("viewBox", `0 0 ${chartWidth + margin.left + margin.right} ${chartHeight + margin.top + margin.bottom + 60}`)
        .style("width","100%")
        .style("height","auto");

    let svg = svgRoot
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const tooltip = d3.select("body")
        .append("div")
        .style("position", "absolute")
        .style("background", "white")
        .style("padding", "6px 12px")
        .style("border", "1px solid #aaa")
        .style("border-radius", "6px")
        .style("pointer-events", "none")
        .style("opacity", 0);

    const xOriginal = d3.scalePoint()
        .domain(["Happiness", "GDP", "Social Support", "Healthy Life", "Freedom", "Generosity", "Corruption"])
        .range([0, chartWidth])
        .padding(0.5);
    const x = xOriginal.copy();
        const y = d3.scaleLinear().domain([0, 1]).range([chartHeight, 0]);
    const color = d3.scaleOrdinal().domain(parameters).range(d3.schemeCategory10);

    // Add clipPath to hide anything outside the chart area
    svg.append("defs").append("clipPath")
        .attr("id", "line-clip")
        .append("rect")
        .attr("width", chartWidth)
        .attr("height", chartHeight);

    const chartArea = svg.append("g")
        .attr("class", "chart-area")
        .attr("clip-path", "url(#line-clip)");

    // Eixos
    const xAxis = svg.append("g")
        .attr("transform", `translate(0,${chartHeight})`)
        .call(d3.axisBottom(x));

    svg.append("g")
        .call(d3.axisLeft(y).tickSize(0).tickFormat(''))
        .select(".domain").remove();

    const brush = d3.brushX()
        .extent([[0, 0], [chartWidth, chartHeight]])
        .on("end", updateChart);

    const activeParams = {};
    const lines = [];
    const pointsGroups = [];
    let chartData = [];

    function cssSafe(str) {
        return str.replace(/\s+/g, "_").replace(/[()]/g, "_");
    }

    function toggleParameter(param) {
        activeParams[param] = !activeParams[param];
        const show = activeParams[param];

        d3.selectAll(`.line-${cssSafe(param)}`)
            .transition().duration(250)
            .attr("stroke-opacity", show ? 1 : 0.2);

        d3.selectAll(`.dots-${cssSafe(param)} circle`)
            .transition().duration(250)
            .attr("fill-opacity", show ? 1 : 0.2);

        d3.select(`#legend-${cssSafe(param)} text`).style("opacity", show ? 1 : 0.3);
        d3.select(`#legend-${cssSafe(param)} rect`).style("opacity", show ? 1 : 0.3);
    }

    function yearTicks() {
        return x.domain();
    }

    function redraw(duration = 250) {
        const currentDomain = x.domain();
        
        lines.forEach(({ path, param }) => {
            const filteredData = chartData.filter(d => currentDomain.includes(d.PARAM));
            path.transition().duration(duration)
                .attr("d", d3.line()
                    .defined(d => currentDomain.includes(d.PARAM))
                    .x(d => x(d.PARAM))
                    .y(d => y(d[param]))(filteredData));
        });

        pointsGroups.forEach(({ group, param }) => {
            const circles = group.selectAll("circle").data(chartData, d => d.PARAM);
            
            // Remove circles not in current domain
            circles.exit()
                .transition().duration(duration)
                .attr("r", 0)
                .remove();
            
            // Update existing circles
            circles.transition().duration(duration)
                .attr("cx", d => x(d.PARAM))
                .attr("cy", d => y(d[param]))
                .attr("r", d => currentDomain.includes(d.PARAM) ? 5 : 0);
        });

        xAxis.transition().duration(duration)
            .call(d3.axisBottom(x));
    }

    function resetZoom() {
        x.domain(xOriginal.domain());
        redraw();
    }

    function updateChart(event) {
        const selection = event.selection;
        if (!selection) {
            return;
        }

        // For categorical axis, filter to show only parameters within brush selection
        const [x0, x1] = selection;
        const allParams = xOriginal.domain();
        
        // Find which parameters are within the brush
        const selectedParams = allParams.filter(param => {
            const pos = xOriginal(param);
            return pos >= x0 && pos <= x1;
        });

        if (selectedParams.length > 0) {
            x.domain(selectedParams);
            redraw(0);
        }
        
        chartArea.select(".brush").call(brush.move, null);
    }

    // Load best, worst, and ukraine median data from average files
    Promise.all([
        d3.csv("average/average-best.csv"),
        d3.csv("average/average-worst.csv"),
        d3.csv("average/ukraine_average.csv")
    ]).then(([bestData, worstData, ukraineData]) => {
        // Extract MEDIAN, MIN, and MAX rows for normalization
        const bestMedian = bestData.find(d => d[""] === "MEDIAN");
        const worstMedian = worstData.find(d => d[""] === "MEDIAN");
        const ukraineMedian = ukraineData.find(d => d[""] === "MEDIAN");
        
        const bestMin = bestData.find(d => d[""] === "MIN");
        const bestMax = bestData.find(d => d[""] === "MAX");
        const worstMin = worstData.find(d => d[""] === "MIN");
        const worstMax = worstData.find(d => d[""] === "MAX");
        const ukraineMin = ukraineData.find(d => d[""] === "MIN");
        const ukraineMax = ukraineData.find(d => d[""] === "MAX");

        if (!bestMedian || !worstMedian || !ukraineMedian) {
            console.error("Could not find MEDIAN rows in data");
            return;
        }

        // Normalize function: (value - min) / (max - min)
        const normalize = (value, min, max) => {
            const val = +value || 0;
            const minVal = +min || 0;
            const maxVal = +max || 1;
            return maxVal === minVal ? 0 : (val - minVal) / (maxVal - minVal);
        };

        // Create data structure with parameters on x-axis
        chartData = [
            { 
                PARAM: "Happiness", 
                BEST: normalize(bestMedian["HAPPINESS SCORE"], bestMin["HAPPINESS SCORE"], bestMax["HAPPINESS SCORE"]),
                WORST: normalize(worstMedian["HAPPINESS SCORE"], worstMin["HAPPINESS SCORE"], worstMax["HAPPINESS SCORE"]),
                UKRAINE: normalize(ukraineMedian["HAPPINESS SCORE"], ukraineMin["HAPPINESS SCORE"], ukraineMax["HAPPINESS SCORE"])
            },
            { 
                PARAM: "GDP", 
                BEST: normalize(bestMedian["GDP PER CAPITA (Billions)"], bestMin["GDP PER CAPITA (Billions)"], bestMax["GDP PER CAPITA (Billions)"]),
                WORST: normalize(worstMedian["GDP PER CAPITA (Billions)"], worstMin["GDP PER CAPITA (Billions)"], worstMax["GDP PER CAPITA (Billions)"]),
                UKRAINE: normalize(ukraineMedian["GDP PER CAPITA (Billions)"], ukraineMin["GDP PER CAPITA (Billions)"], ukraineMax["GDP PER CAPITA (Billions)"])
            },
            { 
                PARAM: "Social Support", 
                BEST: normalize(bestMedian["SOCIAL SUPPORT"], bestMin["SOCIAL SUPPORT"], bestMax["SOCIAL SUPPORT"]),
                WORST: normalize(worstMedian["SOCIAL SUPPORT"], worstMin["SOCIAL SUPPORT"], worstMax["SOCIAL SUPPORT"]),
                UKRAINE: normalize(ukraineMedian["SOCIAL SUPPORT"], ukraineMin["SOCIAL SUPPORT"], ukraineMax["SOCIAL SUPPORT"])
            },
            { 
                PARAM: "Healthy Life", 
                BEST: normalize(bestMedian["HEALTHY LIFE EXPECTANCY"], bestMin["HEALTHY LIFE EXPECTANCY"], bestMax["HEALTHY LIFE EXPECTANCY"]),
                WORST: normalize(worstMedian["HEALTHY LIFE EXPECTANCY"], worstMin["HEALTHY LIFE EXPECTANCY"], worstMax["HEALTHY LIFE EXPECTANCY"]),
                UKRAINE: normalize(ukraineMedian["HEALTHY LIFE EXPECTANCY"], ukraineMin["HEALTHY LIFE EXPECTANCY"], ukraineMax["HEALTHY LIFE EXPECTANCY"])
            },
            { 
                PARAM: "Freedom", 
                BEST: normalize(bestMedian["FREEDOM TO MAKE LIFE CHOICES"], bestMin["FREEDOM TO MAKE LIFE CHOICES"], bestMax["FREEDOM TO MAKE LIFE CHOICES"]),
                WORST: normalize(worstMedian["FREEDOM TO MAKE LIFE CHOICES"], worstMin["FREEDOM TO MAKE LIFE CHOICES"], worstMax["FREEDOM TO MAKE LIFE CHOICES"]),
                UKRAINE: normalize(ukraineMedian["FREEDOM TO MAKE LIFE CHOICES"], ukraineMin["FREEDOM TO MAKE LIFE CHOICES"], ukraineMax["FREEDOM TO MAKE LIFE CHOICES"])
            },
            { 
                PARAM: "Generosity", 
                BEST: normalize(bestMedian["GENEROSITY"], bestMin["GENEROSITY"], bestMax["GENEROSITY"]),
                WORST: normalize(worstMedian["GENEROSITY"], worstMin["GENEROSITY"], worstMax["GENEROSITY"]),
                UKRAINE: normalize(ukraineMedian["GENEROSITY"], ukraineMin["GENEROSITY"], ukraineMax["GENEROSITY"])
            },
            { 
                PARAM: "Corruption", 
                BEST: normalize(bestMedian["PERCEPTION OF CORRUPTION"], bestMin["PERCEPTION OF CORRUPTION"], bestMax["PERCEPTION OF CORRUPTION"]),
                WORST: normalize(worstMedian["PERCEPTION OF CORRUPTION"], worstMin["PERCEPTION OF CORRUPTION"], worstMax["PERCEPTION OF CORRUPTION"]),
                UKRAINE: normalize(ukraineMedian["PERCEPTION OF CORRUPTION"], ukraineMin["PERCEPTION OF CORRUPTION"], ukraineMax["PERCEPTION OF CORRUPTION"])
            }
        ];

        console.log("Chart data loaded (normalized):", chartData);

        // Add brush BELOW marks so it doesn't block hover
        const brushLayer = chartArea.append("g")
            .attr("class", "brush")
            .call(brush);
        // Make selection non-blocking for hover; overlay remains for brushing
        brushLayer.select(".selection").style("pointer-events","none");

        parameters.forEach((param, i) => {
            activeParams[param] = true; // start activated
            const safe = cssSafe(param);
            const raw = param.replace(" MIN-MAX NORMALIZATION", "");

            const dotGroup = chartArea.append("g").attr("class", `dots-${safe}`);
            dotGroup.selectAll("circle")
                .data(chartData)
                .enter()
                .append("circle")
                .attr("cx", d => x(d.PARAM))
                .attr("cy", d => y(d[param]))
                .attr("r", 5)
                .attr("fill", color(param))
                .attr("fill-opacity", 1)
                .style("cursor", "pointer")
                .on("click", () => toggleParameter(param))
                .on("mouseover", (event, d) => {
                    tooltip.style("opacity", 1)
                        .html(`<strong>${legendNames[param]}</strong><br>Parameter: <strong>${d.PARAM}</strong><br>Value: <strong>${(d[param] * 100).toFixed(2)}%</strong>`);
                })
                .on("mousemove", event => tooltip.style("left", event.pageX + 10 + "px").style("top", event.pageY + 10 + "px"))
                .on("mouseout", () => tooltip.style("opacity", 0));

            const line = chartArea.append("path")
                .datum(chartData)
                .attr("class", `line-${safe}`)
                .attr("fill", "none")
                .attr("stroke", color(param))
                .attr("stroke-width", 2)
                .attr("stroke-opacity", 1)
                .attr("d", d3.line()
                    .x(d => x(d.PARAM))
                    .y(d => y(d[param]))
                )
                .style("cursor", "pointer")
                .on("click", () => toggleParameter(param));

            lines.push({ path: line, param });
            pointsGroups.push({ group: dotGroup, param });
        });

        // (brush already added before marks)

        svg.on("dblclick", resetZoom);

        const resetBtn = document.getElementById("resetAreaZoom");
        if (resetBtn) {
            resetBtn.addEventListener("click", () => {
                chartArea.select(".brush").call(brush.move, null);
                resetZoom();
            });
        }

        // Play button not used for parameter-based chart

        // Note: responsive resizing removed for stability; chart uses fixed height

        // Render legend in external HTML element
        const legendDiv = document.getElementById("linechart2-legend");
        if (legendDiv) {
            legendDiv.innerHTML = "";
            parameters.forEach((param, i) => {
                const safe = cssSafe(param);

                const legendItem = document.createElement("div");
                legendItem.id = `legend-${safe}`;
                legendItem.style.display = "flex";
                legendItem.style.alignItems = "center";
                legendItem.style.gap = "6px";
                legendItem.style.cursor = "pointer";
                
                const colorBox = document.createElement("span");
                colorBox.style.display = "inline-block";
                colorBox.style.width = "12px";
                colorBox.style.height = "12px";
                colorBox.style.backgroundColor = color(param);
                
                const label = document.createElement("span");
                label.textContent = legendNames[param];
                
                legendItem.appendChild(colorBox);
                legendItem.appendChild(label);
                
                legendItem.addEventListener("click", () => toggleParameter(param));
                legendItem.addEventListener("mouseover", (event) => {
                    tooltip.style("opacity", 1)
                        .html(`<strong>${param}</strong><br><em>${paramDescriptions[param] || "No description"}</em>`);
                });
                legendItem.addEventListener("mousemove", (event) => {
                    tooltip.style("left", event.pageX + 10 + "px").style("top", event.pageY + 10 + "px");
                });
                legendItem.addEventListener("mouseout", () => {
                    tooltip.style("opacity", 0);
                });
                
                legendDiv.appendChild(legendItem);
            });
        }
    });
}

// CHAMADA
createLineChart(
    window.innerWidth - 240, // width
    300 - 10 - 30,           // height
    { top: 10, right: 120, bottom: 30, left: 120 },
    true
);
