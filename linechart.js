import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import { updateRadarForYears } from "./radarChart.js";

export function createLineChart(width, height, margin, animation = true) {

    let selectedParams = new Set();
    let radarLayers = [];

    let parameters = [
        "HAPPINESS SCORE MIN-MAX NORMALIZATION",
        "GDP PER CAPITA (Billions) MIN-MAX NORMALIZATION",
        "SOCIAL SUPPORT MIN-MAX NORMALIZATION",
        "HEALTHY LIFE EXPECTANCY MIN-MAX NORMALIZATION",
        "FREEDOM TO MAKE LIFE CHOICES MIN-MAX NORMALIZATION",
        "GENEROSITY MIN-MAX NORMALIZATION",
        "PERCEPTION OF CORRUPTION MIN-MAX NORMALIZATION"
    ];

    const legendNames = {
        "HAPPINESS SCORE MIN-MAX NORMALIZATION": "Happiness",
        "GDP PER CAPITA (Billions) MIN-MAX NORMALIZATION": "GDP",
        "SOCIAL SUPPORT MIN-MAX NORMALIZATION": "Social Support",
        "HEALTHY LIFE EXPECTANCY MIN-MAX NORMALIZATION": "Healthy Life",
        "FREEDOM TO MAKE LIFE CHOICES MIN-MAX NORMALIZATION": "Freedom",
        "GENEROSITY MIN-MAX NORMALIZATION": "Generosity",
        "PERCEPTION OF CORRUPTION MIN-MAX NORMALIZATION": "Corruption"
    };

    let svg = d3.select("#my_dataviz")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
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

    const paramDescriptions = {
    "HAPPINESS SCORE": "Overall happiness score based on survey responses and statistical modeling.",
    "GDP PER CAPITA (Billions)": `GDP per capita is measured in PPP-adjusted constant 2021 international dollars, based on World Bank WDI data. The model uses the natural log of GDP per capita, which fits the data better.`,
    "SOCIAL SUPPORT": `Social support is the national average of the binary responses (0=no, 1=yes) 
to the Gallup World Poll (GWP) question: 
“If you were in trouble, do you have relatives or friends you can count on to help you whenever you need them, or not?”`,
    "HEALTHY LIFE EXPECTANCY": "Healthy life expectancy at birth, based on WHO estimates.",
    "FREEDOM TO MAKE LIFE CHOICES": `is the national average of binary responses
     to the GWP question “Are you satisfied or dissatisfied with your freedom to choose what you do with your life?”`,
    "GENEROSITY": `is the residual from regressing the national average of GWP responses to the donation question “Have you donated money to a charity in the past month?” on log GDP per capita.`,
    "PERCEPTION OF CORRUPTION": `is the average of binary answers to two GWP questions: “Is corruption widespread throughout the government or not?” and “Is corruption widespread within businesses or not?”`
};

    let x = d3.scaleLinear().domain([2015, 2024]).range([0, width]);
    let y = d3.scaleLinear().domain([0, 1]).range([height, 0]);
    let color = d3.scaleOrdinal().domain(parameters).range(d3.schemeCategory10);

    const xAxis = svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .attr("class", "x-axis")
        .call(d3.axisBottom(x).ticks(10).tickFormat(d3.format("d")));

    const yAxis = svg.append("g")
        .call(d3.axisLeft(y).tickSize(0).tickFormat(''));
    yAxis.select(".domain").remove();

    function handleMouseOver(event, d, param) {
        const rawParam = param.replace(" MIN-MAX NORMALIZATION", "");
        const rawValue = d[rawParam];
        const description = paramDescriptions[rawParam] || "Sem descrição disponível.";
        tooltip
            .style("opacity", 1)
            .html(`<strong>${rawParam}</strong><br><strong>Valor original:</strong> ${rawValue ?? "N/A"}<br><br><em>${description.replace(/\n/g, "<br>")}</em>`);
    }

    function handleMouseMove(event) {
        tooltip
            .style("left", event.pageX + 10 + "px")
            .style("top", event.pageY + 10 + "px");
    }

    function handleMouseOut() {
        tooltip.style("opacity", 0);
    }

    // LOAD CSV
    d3.csv("dataset-ukrain.csv").then(function (data) {

        data.forEach(d => {
            d.YEAR = +d.YEAR;
            parameters.forEach(p => d[p] = d[p] === "" || d[p] === undefined ? 0 : +d[p]);
        });

        let lines = [];
        let pointsGroups = [];
        let activeLines = {};
        parameters.forEach(p => activeLines[p] = false);

        // DRAW LINES + POINTS
        parameters.forEach((param, i) => {
            let pointsGroupG = svg.append("g").attr("class", "pointsGroup_" + i);

            let line = svg.append("path")
                .datum(data)
                .attr("class", "line_" + i)
                .attr("fill", "none")
                .attr("stroke", color(param))
                .attr("stroke-width", 2)
                .attr("stroke-opacity", 0.2)
                .attr("d", d3.line()
                    .x(d => x(d.YEAR))
                    .y(d => y(d[param]))
                );

            pointsGroupG.selectAll("circle")
                .data(data, d => d.YEAR)
                .enter()
                .append("circle")
                .attr("cx", d => x(d.YEAR))
                .attr("cy", d => y(d[param]))
                .attr("r", 5)
                .attr("fill", color(param))
                .attr("fill-opacity", 0.2)
                .style("cursor", "pointer")
                .on("mouseover", (event, d) => handleMouseOver(event, d, param))
                .on("mousemove", handleMouseMove)
                .on("mouseout", handleMouseOut);

            lines.push({ path: line, param });
            pointsGroups.push({ group: pointsGroupG, param });
        });

        // LEGEND
        const legend = svg.append("g")
            .attr("class", "legend")
            .attr("transform", `translate(${width - 100}, 20)`);

        parameters.forEach((param, i) => {
            const g = legend.append("g")
                .attr("transform", `translate(0, ${i * 20})`)
                .style("cursor", "pointer")
                .on("click", function () {

                    activeLines[param] = !activeLines[param];

                    d3.select(this).select("text")
                        .style("opacity", activeLines[param] ? 1 : 0.3);

                    d3.select(this).select("rect")
                        .style("opacity", activeLines[param] ? 1 : 0.3);

                    const lineObj = lines[i];
                    const pointsGroup = pointsGroups[i];

                    lineObj.path.transition().duration(animation ? 300 : 0)
                        .attr("stroke-opacity", activeLines[param] ? 1 : 0.2);

                    pointsGroup.group.selectAll("circle")
                        .transition()
                        .duration(animation ? 300 : 0)
                        .attr("fill-opacity", activeLines[param] ? 1 : 0.2);
                });

            g.append("rect")
                .attr("width", 12)
                .attr("height", 12)
                .attr("fill", color(param))
                .style("opacity", 0.3);

            g.append("text")
                .attr("x", 18)
                .attr("y", 10)
                .style("font-size", "12px")
                .style("opacity", 0.3)
                .text(legendNames[param] || param);
        });

        updateRadarForYears(data);

        const yearSelect = document.getElementById("yearSelect");
        yearSelect.addEventListener("change", function () {
            const selectedValue = this.value;
            const [startYear, endYear] = selectedValue.split("-").map(d => +d);

            const filteredData = data.filter(d => d.YEAR >= startYear && d.YEAR <= endYear);

            x.domain([startYear, endYear]);

            xAxis.transition()
                .duration(animation ? 500 : 0)
                .call(d3.axisBottom(x).ticks(endYear - startYear + 1).tickFormat(d3.format("d")));

            parameters.forEach((param, i) => {
                const lineObj = lines[i];
                const pointsGroup = pointsGroups[i];

                lineObj.path.datum(filteredData)
                    .transition()
                    .duration(animation ? 500 : 0)
                    .attr("d", d3.line()
                        .x(d => x(d.YEAR))
                        .y(d => y(d[param]))
                    );

                pointsGroup.group.selectAll("circle")
                    .data(filteredData, d => d.YEAR)
                    .join(
                        enter => enter.append("circle")
                            .attr("cx", d => x(d.YEAR))
                            .attr("cy", d => y(d[param]))
                            .attr("r", 5)
                            .attr("fill", color(param))
                            .attr("fill-opacity", activeLines[param] ? 1 : 0.2)
                            .style("cursor", "pointer")
                            .on("mouseover", (event, d) => handleMouseOver(event, d, param))
                            .on("mousemove", handleMouseMove)
                            .on("mouseout", handleMouseOut),
                        update => update.transition().duration(animation ? 500 : 0)
                            .attr("cx", d => x(d.YEAR))
                            .attr("cy", d => y(d[param])),
                        exit => exit.remove()
                    );

                lineObj.path.attr("stroke-opacity", activeLines[param] ? 1 : 0);
            });

            updateRadarForYears(filteredData);
        });

        // =============================================================
        //                    TIMELINE PLAY ANIMATION
        // =============================================================

        const playBtn = document.getElementById("playBtn");
        let playing = false;
        let playInterval = null;

        const years = [...new Set(data.map(d => d.YEAR))].sort((a, b) => a - b);
        let currentYearIndex = 0;

        // mostrar dados acumulados até year com transição suave
        function updateLineChartToYear(targetYear) {
            const partialData = data.filter(d => d.YEAR <= targetYear);

            parameters.forEach((param, i) => {
                const lineObj = lines[i];
                const pointsGroup = pointsGroups[i];

                // Anima o path com transição suave
                lineObj.path.datum(partialData)
                    .transition()
                    .duration(animation ? 600 : 0)
                    .ease(d3.easeQuadInOut)
                    .attr("d", d3.line()
                        .x(d => x(d.YEAR))
                        .y(d => y(d[param]))
                    );

                // Atualiza pontos com transição suave
                pointsGroup.group.selectAll("circle")
                    .data(partialData, d => d.YEAR)
                    .join(
                        enter => enter.append("circle")
                            .attr("cx", d => x(d.YEAR))
                            .attr("cy", d => y(d[param]))
                            .attr("r", 5)
                            .attr("fill", color(param))
                            .attr("fill-opacity", 0)
                            .transition()
                            .duration(animation ? 400 : 0)
                            .attr("fill-opacity", 1),
                        update => update.transition()
                            .duration(animation ? 600 : 0)
                            .attr("cx", d => x(d.YEAR))
                            .attr("cy", d => y(d[param])),
                        exit => exit.transition()
                            .duration(animation ? 300 : 0)
                            .attr("fill-opacity", 0)
                            .remove()
                    );
            });
        }


        function startTimelineAnimation() {
            playing = true;
            playBtn.textContent = "⏸ Pause";

            // começa no primeiro ano (2015)
            currentYearIndex = 0;

            // mostra dados acumulados começando do primeiro ano
            updateLineChartToYear(years[0]);

            // incrementa o índice e mostra próximo ano a cada intervalo
            playInterval = setInterval(() => {
                currentYearIndex++;

                if (currentYearIndex >= years.length) {
                    // chegou ao fim (2024), reinicia do início
                    currentYearIndex = 0;
                }

                updateLineChartToYear(years[currentYearIndex]);
            }, 800);  // cada ano leva 800ms para aparecer
        }

        function stopTimelineAnimation() {
            playing = false;
            playBtn.textContent = "▶ Play";
            clearInterval(playInterval);
        }

        playBtn.addEventListener("click", () => {
            if (!playing) startTimelineAnimation();
            else stopTimelineAnimation();
        });

    });
}

// ---- CALL THE FUNCTION ----
createLineChart(
    window.innerWidth - 120 - 120,  // width
    300 - 10 - 30,                  // height
    { top: 10, right: 120, bottom: 30, left: 120 },  // margin
    true                            // animation ON
);
