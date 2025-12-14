// Dimensions - Logical size for ViewBox
const totalWidthBubble = 1200;
const totalHeightBubble = 500;
const marginBubble = {top: 40, right: 0, bottom: 50, left: 20};
const widthBubble = totalWidthBubble - marginBubble.left - marginBubble.right;
const heightBubble = totalHeightBubble - marginBubble.top - marginBubble.bottom;

// Append SVG with ViewBox
const svgBubble = d3.select("#bubble-chart-container")
  .append("svg")
    .attr("viewBox", `0 0 ${totalWidthBubble} ${totalHeightBubble}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .style("width", "100%")
    .style("height", "auto")
  .append("g")
    .attr("transform", `translate(${marginBubble.left},${marginBubble.top})`);

// Initialize Tooltip
const tooltipBubble = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("background-color", "white")
    .style("padding", "5px")
    .style("border", "1px solid #ccc")
    .style("pointer-events", "none")
    .style("opacity", 0);

// Helper function to convert to title case
function toTitleCase(str) {
  return str.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
}

// Load all 3 datasets
Promise.all([
    d3.csv("dataset-ukrain.csv"),
    d3.csv("bestranking.csv"),
    d3.csv("worstranking.csv")
]).then(function(files) {
    
    // Merge Data
    let allData = [];
    
    // Default Range
    let currentRange = [2015, 2024];

    function format(d, type) {
        return {
            country: d.Country,
            year: +d.YEAR, // Ensure numeric
            type: type,
            "HAPPINESS SCORE": +d["HAPPINESS SCORE"],
            "GDP PER CAPITA (Billions)": +d["GDP PER CAPITA (Billions)"],
            "SOCIAL SUPPORT": +d["SOCIAL SUPPORT"],
            "HEALTHY LIFE EXPECTANCY": +d["HEALTHY LIFE EXPECTANCY"],
            "FREEDOM TO MAKE LIFE CHOICES": +d["FREEDOM TO MAKE LIFE CHOICES"],
            "GENEROSITY": +d["GENEROSITY"],
            "PERCEPTION OF CORRUPTION": +d["PERCEPTION OF CORRUPTION"]
        };
    }

    files[1].forEach(d => allData.push(format(d, "Best")));
    files[0].forEach(d => allData.push(format(d, "Ukraine")));
    files[2].forEach(d => allData.push(format(d, "Worst")));

    // Populate Dropdowns
    const allMetrics = [
        "HAPPINESS SCORE",
        "GDP PER CAPITA (Billions)",
        "SOCIAL SUPPORT",
        "HEALTHY LIFE EXPECTANCY",
        "FREEDOM TO MAKE LIFE CHOICES",
        "GENEROSITY",
        "PERCEPTION OF CORRUPTION"
    ];

    const dropdowns = ["selectX", "selectY", "selectSize"];
    dropdowns.forEach(id => {
        d3.select("#" + id)
          .selectAll('option')
          .data(allMetrics)
          .enter()
          .append('option')
          //.text(d => d)
          .text(d => toTitleCase(d))
          .attr("value", d => d);
    });

    // Default Selections
    d3.select("#selectX").property("value", "GDP PER CAPITA (Billions)");
    d3.select("#selectY").property("value", "HAPPINESS SCORE");
    d3.select("#selectSize").property("value", "HEALTHY LIFE EXPECTANCY");

    // Function to update dropdown options availability
    function updateDropdownAvailability() {
        const currentSelections = {
            "selectX": d3.select("#selectX").property("value"),
            "selectY": d3.select("#selectY").property("value"),
            "selectSize": d3.select("#selectSize").property("value")
        };

        dropdowns.forEach(id => {
            const disabledValues = dropdowns
                .filter(otherId => otherId !== id)
                .map(otherId => currentSelections[otherId]);

            d3.select("#" + id).selectAll('option')
                .property("disabled", d => disabledValues.includes(d))
                .attr("disabled", d => disabledValues.includes(d) ? "disabled" : null)
                .style("color", d => disabledValues.includes(d) ? "#ccc" : null);
        });
    }

    // Scales
    const x = d3.scaleLinear().range([0, widthBubble]);
    
    // Grid Groups
    const xGrid = svgBubble.append("g")
        .attr("class", "grid")
        .attr("transform", `translate(0, ${heightBubble})`);
    const yGrid = svgBubble.append("g")
        .attr("class", "grid");

    const xAxis = svgBubble.append("g").attr("transform", `translate(0, ${heightBubble})`);
    const y = d3.scaleLinear().range([heightBubble, 0]);
    const yAxis = svgBubble.append("g");
    const z = d3.scaleLinear().range([4, 40]); // Adjusted range for better viewBox scaling
    const myColor = d3.scaleOrdinal()
        .domain(["Best", "Ukraine", "Worst"])
        .range(["#69b3a2", "#FFD700", "#d95f5f"]);

    // Labels
    const xLabel = svgBubble.append("text")
        .attr("text-anchor", "end")
        .attr("x", widthBubble)
        .attr("y", heightBubble + 40)
        .style("fill", "#555");

    const yLabel = svgBubble.append("text")
        .attr("text-anchor", "start")
        .attr("x", 0)
        .attr("y", -20)
        .style("fill", "#555");

    // Update Function
    function updateChart() {
        const xVar = d3.select("#selectX").property("value");
        const yVar = d3.select("#selectY").property("value");
        const zVar = d3.select("#selectSize").property("value");

        // FILTER DATA BY YEAR
        const filteredData = allData.filter(d => 
            d.year >= currentRange[0] && d.year <= currentRange[1]
        );

        // Update Domains
        x.domain([0, d3.max(filteredData, d => d[xVar]) * 1.1]);
        y.domain([0, d3.max(filteredData, d => d[yVar]) * 1.1]);
        z.domain([d3.min(filteredData, d => d[zVar]), d3.max(filteredData, d => d[zVar])]);

        // Update Grids
        xGrid.transition().duration(1000)
            .call(d3.axisBottom(x).tickSize(-heightBubble).tickFormat(""))
            .select(".domain").remove();
        xGrid.selectAll("line").style("stroke", "#e5e5e5");

        yGrid.transition().duration(1000)
            .call(d3.axisLeft(y).tickSize(-widthBubble).tickFormat(""))
            .select(".domain").remove();
        yGrid.selectAll("line").style("stroke", "#e5e5e5");
        yGrid.selectAll(".tick").filter(d => Math.abs(y(d)) < 1).select("line").style("opacity", 0);

        xAxis.transition().duration(1000).call(d3.axisBottom(x));
        yAxis.transition().duration(1000).call(d3.axisLeft(y));

        xLabel.text(toTitleCase(xVar));
        yLabel.text(toTitleCase(yVar));

        // DATA JOIN (Key is important for smooth updates)
        const circles = svgBubble.selectAll("circle")
            .data(filteredData, d => d.country + "-" + d.year);

        circles.exit()
            .transition().duration(500)
            .attr("r", 0)
            .style("opacity", 0)
            .remove();

        const enterCircles = circles.enter()
            .append("circle")
            .style("opacity", 0)
            .style("stroke", "white")
            .style("stroke-width", "1px")
            .attr("cx", d => x(d[xVar]))
            .attr("cy", d => y(d[yVar]))
            .attr("r", 0);

        enterCircles.merge(circles)
            .transition()
            .duration(1000)
            .attr("cx", d => x(d[xVar]))
            .attr("cy", d => y(d[yVar]))
            .attr("r", d => z(d[zVar]))
            .style("fill", d => myColor(d.type))
            .style("opacity", 0.7);

        // Interaction
        svgBubble.selectAll("circle")
            .on("mouseover", function(event, d) {
                d3.select(this).style("stroke", "black").style("opacity", 1);
                tooltipBubble.style("opacity", 1)
                    .html(`
                        <strong>${d.country}</strong> (${d.year})<br>
                        Type: ${d.type}<br><hr style="margin:4px 0; border-color:#ddd">
                        ${toTitleCase("HAPPINESS SCORE")}: ${d["HAPPINESS SCORE"]}<br>
                        ${toTitleCase("GDP PER CAPITA (Billions)")}: ${d["GDP PER CAPITA (Billions)"]}<br>
                        ${toTitleCase("HEALTHY LIFE EXPECTANCY")}: ${d["HEALTHY LIFE EXPECTANCY"]}<br>
                        ${toTitleCase("SOCIAL SUPPORT")}: ${d["SOCIAL SUPPORT"]}<br>
                        ${toTitleCase("FREEDOM TO MAKE LIFE CHOICES")}: ${d["FREEDOM TO MAKE LIFE CHOICES"]}<br>
                        ${toTitleCase("GENEROSITY")}: ${d["GENEROSITY"]}<br>
                        ${toTitleCase("PERCEPTION OF CORRUPTION")}: ${d["PERCEPTION OF CORRUPTION"]}
                    `);
            })
            .on("mousemove", function(event) {
                tooltipBubble
                    .style("left", (event.pageX + 15) + "px")
                    .style("top", (event.pageY - 15) + "px");
            })
            .on("mouseleave", function() {
                d3.select(this).style("stroke", "white").style("opacity", 0.7);
                tooltipBubble.style("opacity", 0);
            });
    }

    // LISTENER for slider
    document.addEventListener('yearRangeChanged', function(e) {
        currentRange = [e.detail.min, e.detail.max];
        updateChart();
    });

    function onSelectionChange() {
        updateDropdownAvailability();
        updateChart();
    }

    d3.select("#selectX").on("change", onSelectionChange);
    d3.select("#selectY").on("change", onSelectionChange);
    d3.select("#selectSize").on("change", onSelectionChange);

    // Initial setup
    updateDropdownAvailability();

    // Initial Draw
    updateChart();
});