import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import { updateRadarForYears } from "./radarChart.js";

let selectedParams = new Set();
let radarLayers = [];

let margin = { top: 10, right: 120, bottom: 30, left: 120 },
    width = window.innerWidth - margin.left - margin.right,
    height = 300 - margin.top - margin.bottom;

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

let icons = {
    "HAPINESS SCORE": "assets/flor.png",
    "GDP PER CAPITA": "assets/passaro.png",
    "SOCIAL SUPPORT": "assets/passaro.png",
    "HEALTHY LIFE EXPECTANCY": "assets/passaro.png",
    "FREEDOM TO MAKE LIFE CHOICES": "assets/passaro.png",
    "GENEROSITY": "assets/passaro.png",
    "PERCEPTION OF CORRUPTION": "assets/passaro.png",
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


d3.csv("dataset-ukrain.csv").then(function(data) {

    data.forEach(d => {
        d.YEAR = +d.YEAR;
        parameters.forEach(p => d[p] = d[p] === "" || d[p] === undefined ? 0 : +d[p]);
    });

    let x = d3.scaleLinear().domain([2015, 2024]).range([0, width]);
    let y = d3.scaleLinear().domain([0, 1]).range([height, 0]);
    let color = d3.scaleOrdinal().domain(parameters).range(d3.schemeCategory10);

    // ----------------------------
    // LINES + CIRCLES INICIAIS
    // ----------------------------
    let lines = [];
    let pointsGroups = [];

    parameters.forEach((param, i) => {

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
            ).on('click',function(abc){
                console.log("Olá", abc);
            });//adicionar on na função de click

let points = svg.selectAll(`circle_${i}`)
.data(data)
.enter()
.append("circle")
.attr("class", "circle_" + i)
.attr("cx", d => x(d.YEAR))
.attr("cy", d => y(d[param]))
.attr("r", 5)
.attr("fill", color(param))
.attr("fill-opacity", 0.2)
.style("cursor", "pointer")

.on("mouseover", function (event, d) {

    const rawParam = param.replace(" MIN-MAX NORMALIZATION", "");
    const rawValue = d[rawParam];
    const description = paramDescriptions[rawParam] || "Sem descrição disponível.";

    tooltip
        .style("opacity", 1)
        .html(`
            <strong>${rawParam}</strong><br>
            <strong>Valor original:</strong> ${rawValue ?? "N/A"}<br><br>
            <em>${description.replace(/\n/g, "<br>")}</em>
        `);
})
.on("mousemove", function (event) {
    tooltip
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY + 10 + "px");
})
.on("mouseout", function () {
    tooltip.style("opacity", 0);
})
.on("click", function (event, d) {
    const layerId = param + "_" + d.YEAR;

    if (selectedParams.has(layerId)) {
        selectedParams.delete(layerId);
        radarLayers = radarLayers.filter(l => l.id !== layerId);
    } else {
        selectedParams.add(layerId);
        radarLayers.push({ id: layerId, param, year: d.YEAR, data: d });
    }

    // Atualiza opacidades
    parameters.forEach((p, j) => {
        const anySelected = selectedParams.size > 0;
        const isSelected = [...selectedParams].some(id => id.startsWith(p));

        d3.select(".line_" + j)
            .attr("stroke-opacity", anySelected ? (isSelected ? 1 : 0.1) : 0.2);

        d3.selectAll(".circle_" + j)
            .attr("fill-opacity", anySelected ? (isSelected ? 1 : 0.1) : 0.2);
    });

    updateRadarForYears(radarLayers.map(l => l.data));
});


        lines.push({ path: line, param });
        pointsGroups.push({ circles: points, param });
    });

    // ----------------------------
    // RADAR CHART
    // ----------------------------
    updateRadarForYears(data);

    // ----------------------------
    // EIXOS
    // ----------------------------
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).ticks(10).tickFormat(d3.format("d")));

        const yAxis = svg.append("g")
        .call(
            d3.axisLeft(y)
                .tickSize(0)
                .tickFormat('')   // hide numbers
        );
    
    // REMOVE the vertical axis line
    yAxis.select(".domain").remove();

    // ----------------------------
    // LEGENDA
    // ----------------------------
    const legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${width - 100}, 20)`);

    parameters.forEach((param, i) => {
        const g = legend.append("g")
            .attr("transform", `translate(0, ${i * 20})`);

        g.append("rect")
            .attr("width", 12)
            .attr("height", 12)
            .attr("fill", color(param));

        g.append("text")
            .attr("x", 18)
            .attr("y", 10)
            .style("font-size", "12px")
            .text(legendNames[param] || param);
    });

    // ----------------------------
    // PLAY BUTTON
    // ----------------------------
    document.getElementById("playBtn").onclick = () => {
        let playIndex = 0;
        radarLayers = [];
        selectedParams.clear();

        const years = [...new Set(data.map(d => d.YEAR))].sort((a, b) => a - b);

        function animateNextYear() {
            if (playIndex >= years.length) {
                selectedParams.clear();
                radarLayers = [];
                const fakeLegendData = [{ YEAR: "—", ...Object.fromEntries(parameters.map(p => [p, 0])) }];
                updateRadarForYears(fakeLegendData);
            
                parameters.forEach((p, j) => {
                    d3.select(".line_" + j).attr("stroke-opacity", 0.2);
                    d3.selectAll(".circle_" + j).attr("fill-opacity", 0.2);
                });
                return;
            }
            

            const year = years[playIndex];
            const yearData = data.filter(d => d.YEAR === year);

            parameters.forEach((param, i) => {
                const lineObj = lines[i];
                const pts = pointsGroups[i];

                const segmentData = data.slice(0, playIndex + 1).map(d => ({
                    x: x(d.YEAR), y: y(d[param])
                }));

                const tempLine = d3.line()
                    .x(d => d.x)
                    .y(d => d.y);

                lineObj.path.transition()
                    .duration(900)
                    .attr("d", tempLine(segmentData))
                    .attr("stroke-opacity", 1);

                pts.circles.filter((d, idx) => idx === playIndex)
                    .transition()
                    .duration(250)
                    .attr("fill-opacity", 1);

                const layerId = param + "_" + year;
                if (!selectedParams.has(layerId)) {
                    selectedParams.add(layerId);
                    radarLayers.push({
                        id: layerId,
                        param,
                        year,
                        data: yearData.find(d => d[param] !== undefined)
                    });
                }
            });

            updateRadarForYears(radarLayers.map(l => l.data));

            playIndex++;
            setTimeout(animateNextYear, 1000);
        }

        animateNextYear();
    };
});
