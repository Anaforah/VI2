import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

function createDotPlot(containerId, columnName, yDescending = true, bestData, worstData, ukrainData) {
  const margin = { top: 30, right: 30, bottom: 70, left: 60 },
        width = 500 - margin.left - margin.right,
        height = 400 - margin.top - margin.bottom;

  d3.select(containerId).selectAll("*").remove();

  const svg = d3.select(containerId)
    .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
    .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleBand().range([0, width]).padding(0.4);
  const xAxis = svg.append("g").attr("transform", `translate(0,${height})`);
  const y = d3.scaleLinear().range([height, 0]);
  const yAxis = svg.append("g").attr("class", "myYaxis");

  const tooltip = d3.select("body")
    .append("div")
      .attr("class", "tooltip")
      .style("position", "absolute")
      .style("padding", "6px 10px")
      .style("background", "rgba(0,0,0,0.7)")
      .style("color", "white")
      .style("border-radius", "4px")
      .style("pointer-events", "none")
      .style("opacity", 0);

  const colors = ["#ff7f0e", "#1f77b4", "#2ca02c"];

  function update(columnName, yearRange = [2015, 2024]) {

    let bestFiltered = bestData.filter(d => +d.YEAR >= yearRange[0] && +d.YEAR <= yearRange[1]);
    let worstFiltered = worstData.filter(d => +d.YEAR >= yearRange[0] && +d.YEAR <= yearRange[1]);
    let ukrainFiltered = ukrainData.filter(d => +d.YEAR >= yearRange[0] && +d.YEAR <= yearRange[1]);

    const worstByYear = new Map(worstFiltered.map(d => [d.YEAR, d]));
    const ukrainByYear = new Map(ukrainFiltered.map(d => [d.YEAR, d]));

    const merged = bestFiltered.map(d => {
      const w = worstByYear.get(d.YEAR) || {};
      const u = ukrainByYear.get(d.YEAR) || {};

      return {
        group: d.YEAR,
        vals: [
          { value: +d[columnName], country: d.Country },
          { value: +(w[columnName] ?? NaN), country: w.Country ?? "N/A" },
          { value: +(u[columnName] ?? NaN), country: u.Country ?? "N/A" }
        ]
      };
    });

    x.domain(merged.map(d => d.group));
    xAxis.transition().duration(800).call(d3.axisBottom(x));

    const allVals = merged.flatMap(d => d.vals.map(v => v.value).filter(v => !isNaN(v)));
    const yDomain = yDescending ?
      [d3.max(allVals), d3.min(allVals)] :
      [d3.min(allVals), d3.max(allVals)];

    y.domain(yDomain);
    yAxis.transition().duration(800).call(d3.axisLeft(y));

    const groups = svg.selectAll(".rowGroup").data(merged, d => d.group);
    groups.exit().remove();

    const groupsEnter = groups.enter().append("g").attr("class", "rowGroup");
    const groupsMerged = groupsEnter.merge(groups)
      .attr("transform", d => `translate(${x(d.group)},0)`);

    groupsMerged.each(function(d) {
      const group = d3.select(this);
      const circles = group.selectAll("circle").data(d.vals);
      circles.exit().remove();

      circles.enter()
        .append("circle")
        .merge(circles)
        .attr("r", 6)
        .attr("fill", (v,i) => colors[i])
        .attr("cx", x.bandwidth()/2)
        .transition().duration(800)
        .attr("cy", v => y(v.value))
        .attr("opacity", v => isNaN(v.value) ? 0 : 1);

      group.selectAll("circle")
        .on("mouseover", (event, v) => {
          tooltip.style("opacity", 1)
            .html(`<strong>País:</strong> ${v.country}<br><strong>${columnName}:</strong> ${v.value}`)
            .style("left", event.pageX + 10 + "px")
            .style("top", event.pageY - 20 + "px");
        })
        .on("mouseout", () => tooltip.style("opacity", 0));

      const validPoints = d.vals
        .filter(v => !isNaN(v.value))
        .map(v => ({x: x.bandwidth()/2, y: y(v.value)}))
        .sort((a,b)=>a.y-b.y);

      const path = group.selectAll("path.line").data(validPoints.length >= 2 ? [validPoints] : []);
      path.exit().remove();

      path.enter().append("path")
        .attr("class", "line")
        .merge(path)
        .transition().duration(800)
        .attr("d", d3.line().x(p => p.x).y(p => p.y))
        .attr("stroke", "#666")
        .attr("stroke-width", 1)
        .attr("fill", "none");
    });
  }

  update(columnName);
  return { update };
}


// -----------------------------------------------------------------------------
//  USO — DOIS SELECTS FUNCIONANDO AO MESMO TEMPO
// -----------------------------------------------------------------------------

Promise.all([
  d3.csv("bestranking.csv"),
  d3.csv("worstranking.csv"),
  d3.csv("dataset-ukrain.csv")
]).then(([best, worst, ukrain]) => {

  let currentVar = "HAPPINESS SCORE";
  let currentRange = [2015, 2024];

  const chart1 = createDotPlot("#dotplot_chart1", currentVar, true, best, worst, ukrain);
  const chart2 = createDotPlot("#dotplot_chart2", currentVar, false, best, worst, ukrain);

  // SELECT DE VARIÁVEL
  d3.select("#varSelect").on("change", function() {
    currentVar = this.value;
    chart2.update(currentVar, currentRange);
  });

  // SELECT DE ANOS
  d3.select("#yearSelect").on("change", function() {
    currentRange = this.value.split("-").map(Number);
    chart1.update(currentVar, currentRange);
    chart2.update(currentVar, currentRange);
  });

});
