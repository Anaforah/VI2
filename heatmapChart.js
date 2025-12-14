// Logical Dimensions (Responsive) - Square cells like GitHub
const totalWidthHM = 900;
const totalHeightHM = 400;
const marginHM = { top: 20, right: 20, bottom: 40, left: 160 };
const widthHM = totalWidthHM - marginHM.left - marginHM.right;
const heightHM = totalHeightHM - marginHM.top - marginHM.bottom;

const svg = d3.select("#heatmap-container")
  .append("svg")
    .attr("viewBox", `0 0 ${totalWidthHM} ${totalHeightHM}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .style("width", "100%")
    .style("height", "auto")
  .append("g")
    .attr("transform", `translate(${marginHM.left},${marginHM.top})`);

const tooltip = d3.select("body").append("div")
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

// Helper to split text into 2 lines
function splitLabel(text) {
  const words = text.split(" ");
  if (words.length <= 2) return [text];
  
  const mid = Math.ceil(words.length / 2);
  return [
    words.slice(0, mid).join(" "),
    words.slice(mid).join(" ")
  ];
}

d3.csv("dataset-ukrain.csv").then(function(data) {

  const parameters = [
    "RANKING", "HAPPINESS SCORE", "GDP PER CAPITA (Billions)", "SOCIAL SUPPORT",
    "HEALTHY LIFE EXPECTANCY", "FREEDOM TO MAKE LIFE CHOICES",
    "GENEROSITY", "PERCEPTION OF CORRUPTION"
  ];

  // Calculate square size based on height (8 parameters)
  const squareSize = heightHM / parameters.length;
  
  // Global Scales - X uses calculated width, Y uses full height
  const x = d3.scaleBand().padding(0.02);
  const y = d3.scaleBand().range([0, heightHM]).domain(parameters).padding(0.02);
  
  // Pre-calculate Min/Max for Row-based Normalization
  let paramStats = {};
  parameters.forEach(param => {
    const values = data.map(d => +d[param]);
    paramStats[param] = { min: d3.min(values), max: d3.max(values) };
  });

  const myColor = d3.scaleSequential()
    .interpolator(d3.interpolateBlues)
    .domain([0, 1]);

  // Y Axis with 2-line labels
  const yAxis = svg.append("g");
  yAxis.call(d3.axisLeft(y).tickSize(0).tickFormat(() => ""));
  yAxis.select(".domain").remove();

  // Add custom multi-line labels
  parameters.forEach(param => {
    const yPos = y(param) + y.bandwidth() / 2;
    const lines = splitLabel(toTitleCase(param));
    
    if (lines.length === 1) {
      svg.append("text")
        .attr("x", -10)
        .attr("y", yPos)
        .attr("text-anchor", "end")
        .attr("alignment-baseline", "middle")
        .style("font-size", "11px")
        .text(lines[0]);
    } else {
      svg.append("text")
        .attr("x", -10)
        .attr("y", yPos - 6)
        .attr("text-anchor", "end")
        .style("font-size", "11px")
        .text(lines[0]);
      
      svg.append("text")
        .attr("x", -10)
        .attr("y", yPos + 8)
        .attr("text-anchor", "end")
        .style("font-size", "11px")
        .text(lines[1]);
    }
  });

  function updateHeatmap(minYear, maxYear) {
      
      // 1. Filter Data
      const filteredRaw = data.filter(d => +d.YEAR >= minYear && +d.YEAR <= maxYear);
      
      // 2. Reshape
      let heatmapData = [];
      filteredRaw.forEach(row => {
        parameters.forEach(param => {
          heatmapData.push({
            year: row.YEAR,
            variable: param,
            value: +row[param]
          });
        });
      });

      // 3. Update X Scale & Axis - constrain width to match square size
      const years = filteredRaw.map(d => d.YEAR);
      const xWidth = squareSize * years.length;
      x.domain(years).range([0, xWidth]);
      
      // Center the content by adjusting the group transform
      const xOffset = (widthHM - xWidth) / 2;
      svg.attr("transform", `translate(${marginHM.left + xOffset},${marginHM.top})`);

      svg.select(".x-axis").remove();
      svg.append("g")
         .attr("class", "x-axis")
         .attr("transform", `translate(0, ${heightHM})`)
         .call(d3.axisBottom(x).tickSize(0))
         .select(".domain").remove();

      // 4. Draw SQUARE cells
      const cellSize = Math.min(x.bandwidth(), y.bandwidth());
      
      const rects = svg.selectAll("rect")
        .data(heatmapData, d => d.year + d.variable);

      rects.exit().remove();

      rects.enter().append("rect")
        .merge(rects)
        .transition().duration(500)
        .attr("x", d => x(d.year))
        .attr("y", d => y(d.variable))
        .attr("width", cellSize)
        .attr("height", cellSize)
        .style("fill", function(d) {
          const stats = paramStats[d.variable];
          const normalized = (d.value - stats.min) / (stats.max - stats.min);
          return myColor(isNaN(normalized) ? 0.5 : normalized);
        })
        .attr("rx", 2).attr("ry", 2);
      
      // Re-attach listeners to all rects (new and updated)
      svg.selectAll("rect")
        .on("mouseover", function(event, d) {
          d3.select(this).style("stroke", "black").style("stroke-width", 2).style("opacity", 1);
          tooltip.style("opacity", 1);
        })
        .on("mousemove", function(event, d) {
          tooltip.html(`<strong>${toTitleCase(d.variable)}</strong><br>Year: ${d.year}<br>Value: ${d.value}`)
            .style("left", (event.pageX + 15) + "px")
            .style("top", (event.pageY - 15) + "px");
        })
        .on("mouseleave", function() {
          d3.select(this).style("stroke", "none").style("opacity", 0.8);
          tooltip.style("opacity", 0);
        });
  }

  // Initial
  updateHeatmap(2015, 2024);

  // Listener for slider
  document.addEventListener('yearRangeChanged', function(e) {
      updateHeatmap(e.detail.min, e.detail.max);
  });
});