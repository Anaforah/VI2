// Internal logical dimensions
const totalWidthUkr = 400;
const totalHeightUkr = 400;
const marginUkraine = {top: 0, right: 0, bottom: 40, left: 40};

const widthUkraine = totalWidthUkr - marginUkraine.left - marginUkraine.right;
const heightUkraine = totalHeightUkr - marginUkraine.top - marginUkraine.bottom;

// Append SVG with viewBox
const svgUkraine = d3.select("#ukraine-chart")
  .append("svg")
    .attr("viewBox", `0 0 ${totalWidthUkr} ${totalHeightUkr}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .style("width", "100%")
    .style("height", "auto")
  .append("g")
    .attr("transform", `translate(${marginUkraine.left},${marginUkraine.top})`);

const tooltipUkraine = d3.select("body").append("div").attr("class", "tooltip");

d3.csv("dataset-ukrain.csv").then(function(data) {

  function updateUkraineBar(minYear, maxYear) {
    // Filter data based on year range
    const filtered = data.filter(d => +d.YEAR >= minYear && +d.YEAR <= maxYear);

    const x = d3.scaleBand()
      .range([0, widthUkraine])
      .domain(filtered.map(d => d.YEAR))
      .padding(0.2);
    
    // Remove old axes
    svgUkraine.selectAll(".x-axis").remove();
    svgUkraine.selectAll(".y-axis").remove();
    svgUkraine.selectAll(".y-label").remove();
    
    // Add X axis
    svgUkraine.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0, ${heightUkraine})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
        .attr("transform", "translate(-10,0)rotate(-45)")
        .style("text-anchor", "end");

    const y = d3.scaleLinear()
      .domain([0, 8.5])
      .range([heightUkraine, 0]);
    
    svgUkraine.append("g")
      .attr("class", "y-axis")
      .call(d3.axisLeft(y));

    svgUkraine.append("text")
        .attr("class", "y-label")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - marginUkraine.left + 15)
        .attr("x", 0 - (heightUkraine / 2))
        .style("text-anchor", "middle")
        .style("font-size", "12px")
        .text("Happiness Score");

    // Data join for bars
    const bars = svgUkraine.selectAll("rect").data(filtered, d => d.YEAR);
    
    // Remove old bars
    bars.exit().remove();
    
    // Add new bars
    bars.enter()
      .append("rect")
      .attr("fill", "#FFD700")
      .attr("y", heightUkraine)
      .attr("height", 0)
      .merge(bars)
      .on("mouseover", function(event, d) {
          d3.select(this).style("fill", "#e6c200");
          tooltipUkraine.style("opacity", 1)
                        .html(`<strong>${d.Country}</strong><br>Year: ${d.YEAR}<br>Score: ${d["HAPPINESS SCORE"]}`);
      })
      .on("mousemove", function(event) {
          tooltipUkraine.style("left", (event.pageX + 10) + "px")
                        .style("top", (event.pageY - 20) + "px");
      })
      .on("mouseleave", function() {
          d3.select(this).style("fill", "#FFD700");
          tooltipUkraine.style("opacity", 0);
      })
      .transition()
      .duration(800)
      .attr("x", d => x(d.YEAR))
      .attr("width", x.bandwidth())
      .attr("y", d => y(d["HAPPINESS SCORE"]))
      .attr("height", d => heightUkraine - y(d["HAPPINESS SCORE"]));

    // Data join for labels
    const labels = svgUkraine.selectAll(".label").data(filtered, d => d.YEAR);
    
    // Remove old labels
    labels.exit().remove();
    
    // Add new labels
    labels.enter()
      .append("text")
      .attr("class", "label")
      .attr("text-anchor", "end")
      .style("fill", "#555")
      .style("font-size", "11px")
      .style("font-weight", "bold")
      .style("pointer-events", "none")
      .attr("y", heightUkraine)
      .style("opacity", 0)
      .merge(labels)
      .text(d => d.Country)
      .transition()
      .duration(800)
      .attr("x", d => x(d.YEAR) + x.bandwidth() / 2)
      .attr("y", d => y(d["HAPPINESS SCORE"]) + 10)
      .attr("transform", d => `rotate(-90, ${x(d.YEAR) + x.bandwidth() / 2}, ${y(d["HAPPINESS SCORE"]) + 10})`)
      .style("opacity", 1);
  }

  // Initial render with default range
  updateUkraineBar(2015, 2024);

  // Listen for year range changes from the slider
  document.addEventListener('yearRangeChanged', function(e) {
    updateUkraineBar(e.detail.min, e.detail.max);
  });
});