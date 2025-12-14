// Internal logical dimensions (aspect ratio)
const totalWidthBest = 400;
const totalHeightBest = 400;
const marginBest = {top: 0, right: 0, bottom: 40, left: 40};

const widthBest = totalWidthBest - marginBest.left - marginBest.right;
const heightBest = totalHeightBest - marginBest.top - marginBest.bottom;

// Append SVG with viewBox for responsiveness
const svgBest = d3.select("#best-chart")
  .append("svg")
    .attr("viewBox", `0 0 ${totalWidthBest} ${totalHeightBest}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .style("width", "100%")
    .style("height", "auto")
  .append("g")
    .attr("transform", `translate(${marginBest.left},${marginBest.top})`);

const tooltipBest = d3.select("body").append("div").attr("class", "tooltip");

d3.csv("bestranking.csv").then(function(data) {

  function updateBestBar(minYear, maxYear) {
    // Filter data based on year range
    const filtered = data.filter(d => +d.YEAR >= minYear && +d.YEAR <= maxYear);

    const x = d3.scaleBand()
      .range([0, widthBest])
      .domain(filtered.map(d => d.YEAR))
      .padding(0.2);
    
    // Remove old axes
    svgBest.selectAll(".x-axis").remove();
    svgBest.selectAll(".y-axis").remove();
    svgBest.selectAll(".y-label").remove();
    
    // Add X axis
    svgBest.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0, ${heightBest})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
        .attr("transform", "translate(-10,0)rotate(-45)")
        .style("text-anchor", "end");

    const y = d3.scaleLinear()
      .domain([0, 8.5])
      .range([heightBest, 0]);
    
    svgBest.append("g")
      .attr("class", "y-axis")
      .call(d3.axisLeft(y));

    // Y Axis Label
    svgBest.append("text")
        .attr("class", "y-label")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - marginBest.left + 15)
        .attr("x", 0 - (heightBest / 2))
        .style("text-anchor", "middle")
        .style("font-size", "12px")
        .text("Happiness Score");

    // Data join for bars
    const bars = svgBest.selectAll("rect").data(filtered, d => d.YEAR);
    
    // Remove old bars
    bars.exit().remove();
    
    // Add new bars
    bars.enter()
      .append("rect")
      .attr("fill", "#69b3a2")
      .attr("y", heightBest)
      .attr("height", 0)
      .merge(bars)
      .on("mouseover", function(event, d) {
          d3.select(this).style("fill", "#4e8a7c");
          tooltipBest.style("opacity", 1)
                     .html(`<strong>${d.Country}</strong><br>Year: ${d.YEAR}<br>Score: ${d["HAPPINESS SCORE"]}`);
      })
      .on("mousemove", function(event) {
          tooltipBest.style("left", (event.pageX + 10) + "px")
                     .style("top", (event.pageY - 20) + "px");
      })
      .on("mouseleave", function() {
          d3.select(this).style("fill", "#69b3a2");
          tooltipBest.style("opacity", 0);
      })
      .transition()
      .duration(800)
      .attr("x", d => x(d.YEAR))
      .attr("width", x.bandwidth())
      .attr("y", d => y(d["HAPPINESS SCORE"]))
      .attr("height", d => heightBest - y(d["HAPPINESS SCORE"]));

    // Data join for labels
    const labels = svgBest.selectAll(".label").data(filtered, d => d.YEAR);
    
    // Remove old labels
    labels.exit().remove();
    
    // Add new labels
    labels.enter()
      .append("text")
      .attr("class", "label")
      .attr("text-anchor", "end")
      .style("fill", "white")
      .style("font-size", "11px")
      .style("font-weight", "bold")
      .style("pointer-events", "none")
      .attr("y", heightBest)
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
  updateBestBar(2015, 2024);

  // Listen for year range changes from the slider
  document.addEventListener('yearRangeChanged', function(e) {
    updateBestBar(e.detail.min, e.detail.max);
  });
});