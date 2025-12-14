export function createLineChart() {
    // 1. Define Logical Dimensions (Fixed Aspect Ratio)
    const totalWidth = 1000;
    const totalHeight = 500;
    const margin = { top: 40, right: 50, bottom: 50, left: 60 };
    
    const width = totalWidth - margin.left - margin.right;
    const height = totalHeight - margin.top - margin.bottom;

    // Data Parameters
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

    // 2. SVG Setup
    const container = d3.select("#my_dataviz2");
    container.selectAll("*").remove();

    const svgRoot = container
        .append("svg")
        .attr("viewBox", `0 0 ${totalWidth} ${totalHeight}`)
        .attr("preserveAspectRatio", "xMidYMid meet")
        .style("width", "100%")
        .style("height", "auto");

    const svg = svgRoot
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

    // Scales
    const xOriginal = d3.scalePoint()
        .domain(["Happiness", "GDP", "Social Support", "Healthy Life", "Freedom", "Generosity", "Corruption"])
        .range([0, width])
        .padding(0.5);
    
    const x = xOriginal.copy();
    const y = d3.scaleLinear().domain([0, 1]).range([height, 0]);

    // Dashboard Colors
    const color = d3.scaleOrdinal()
        .domain(parameters)
        .range(["#69b3a2", "#d95f5f", "#FFD700"]); 

    // Clip Path
    svg.append("defs").append("clipPath")
        .attr("id", "line-clip")
        .append("rect")
        .attr("width", width)
        .attr("height", height);

    const chartArea = svg.append("g")
        .attr("class", "chart-area")
        .attr("clip-path", "url(#line-clip)");

    // Axes
    const xAxis = svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x));

    svg.append("g")
        .call(d3.axisLeft(y).tickSize(-width).tickFormat('')) 
        .attr("stroke-opacity", 0.1) 
        .select(".domain").remove();

    // Brush
    const brush = d3.brushX()
        .extent([[0, 0], [width, height]])
        .on("end", updateChart);

    let chartData = [];

    function cssSafe(str) {
        return str.replace(/\s+/g, "_").replace(/[()]/g, "_");
    }

    function redraw(duration = 250) {
        const currentDomain = x.domain();
        
        // Redraw Lines
        parameters.forEach(param => {
            const safe = cssSafe(param);
            const filteredData = chartData.filter(d => currentDomain.includes(d.PARAM));
            
            svg.select(`.line-${safe}`)
                .transition().duration(duration)
                .attr("d", d3.line()
                    .defined(d => currentDomain.includes(d.PARAM))
                    .x(d => x(d.PARAM))
                    .y(d => y(d[param]))(filteredData));
        });

        // Redraw Dots
        parameters.forEach(param => {
            const safe = cssSafe(param);
            const circles = svg.select(`.dots-${safe}`).selectAll("circle").data(chartData, d => d.PARAM);
            
            circles.exit()
                .transition().duration(duration)
                .attr("r", 0)
                .remove();
            
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
        if (!selection) return;

        const [x0, x1] = selection;
        const allParams = xOriginal.domain();
        
        const selectedParams = allParams.filter(param => {
            const pos = xOriginal(param);
            return pos >= x0 && pos <= x1;
        });

        if (selectedParams.length > 0) {
            x.domain(selectedParams);
            redraw(500);
        }
        
        chartArea.select(".brush").call(brush.move, null);
    }

    Promise.all([
        d3.csv("average/average-best.csv"),
        d3.csv("average/average-worst.csv"),
        d3.csv("average/ukraine_average.csv")
    ]).then(([bestData, worstData, ukraineData]) => {
        
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

        const normalize = (value, min, max) => {
            const val = +value || 0;
            const minVal = +min || 0;
            const maxVal = +max || 1;
            return maxVal === minVal ? 0 : (val - minVal) / (maxVal - minVal);
        };

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

        const brushLayer = chartArea.append("g")
            .attr("class", "brush")
            .call(brush);
        brushLayer.select(".selection").style("pointer-events","none");

        // Draw Lines and Dots
        parameters.forEach((param) => {
            const safe = cssSafe(param);

            const dotGroup = chartArea.append("g").attr("class", `dots-${safe}`);
            
            // Draw Dots
            dotGroup.selectAll("circle")
                .data(chartData)
                .enter()
                .append("circle")
                .attr("cx", d => x(d.PARAM))
                .attr("cy", d => y(d[param]))
                .attr("r", 5)
                .attr("fill", color(param))
                .on("mouseover", (event, d) => {
                    tooltip.style("opacity", 1)
                        .html(`<strong>${legendNames[param]}</strong><br>${d.PARAM}: <strong>${(d[param] * 100).toFixed(2)}%</strong>`);
                })
                .on("mousemove", event => tooltip.style("left", (event.pageX + 10) + "px").style("top", (event.pageY + 10) + "px"))
                .on("mouseout", () => tooltip.style("opacity", 0));

            // Draw Line
            chartArea.append("path")
                .datum(chartData)
                .attr("class", `line-${safe}`)
                .attr("fill", "none")
                .attr("stroke", color(param))
                .attr("stroke-width", 2)
                .attr("d", d3.line()
                    .x(d => x(d.PARAM))
                    .y(d => y(d[param]))
                );
        });

        svg.on("dblclick", resetZoom);

        const resetBtn = document.getElementById("resetAreaZoom");
        if (resetBtn) {
            resetBtn.addEventListener("click", () => {
                chartArea.select(".brush").call(brush.move, null);
                resetZoom();
            });
        }
    });
}

createLineChart();