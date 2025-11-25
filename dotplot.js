function createDotPlot(containerId, selectedVar, yDescending = true) {
  const margin = {top: 30, right: 30, bottom: 70, left: 60},
        width = 500 - margin.left - margin.right,
        height = 400 - margin.top - margin.bottom;

  const svg = d3.select(containerId)
    .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
    .append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

  const x = d3.scaleBand().range([0, width]).padding(0.4);
  const xAxis = svg.append("g").attr("transform", `translate(0, ${height})`);
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

  function update(varName) {
    console.log("Updating chart for variable:", varName);

    Promise.all([
      d3.csv("bestranking.csv"),
      d3.csv("worstranking.csv"),
      d3.csv("dataset-ukrain.csv")
    ]).then(([best, worst, ukrain]) => {

      const worstByYear = new Map(worst.map(d => [d.YEAR, d]));
      const ukrainByYear = new Map(ukrain.map(d => [d.YEAR, d]));

      const merged = best.map(d => {
        const w = worstByYear.get(d.YEAR) || {};
        const u = ukrainByYear.get(d.YEAR) || {};
        return {
          group: d.YEAR,
          vals: [
            { value: +d[varName], country: d.Country },
            { value: +(w[varName] ?? NaN), country: w.Country ?? "N/A" },
            { value: +(u[varName] ?? NaN), country: u.Country ?? "N/A" }
          ]
        };
      });

      // eixo X
      x.domain(merged.map(d => d.group));
      xAxis.transition().duration(800).call(d3.axisBottom(x));

      // eixo Y
      const allVals = merged.flatMap(d => d.vals.map(v => v.value).filter(v => !isNaN(v)));
      const yDomain = yDescending ? [d3.max(allVals), d3.min(allVals)] : [d3.min(allVals), d3.max(allVals)];
      y.domain(yDomain);
      yAxis.transition().duration(800).call(d3.axisLeft(y));

      // GRUPOS
      const groups = svg.selectAll(".rowGroup").data(merged, d => d.group);
      groups.exit().remove();
      const groupsEnter = groups.enter().append("g").attr("class", "rowGroup");
      const groupsMerged = groupsEnter.merge(groups)
        .transition().duration(800)
        .attr("transform", d => `translate(${x(d.group)},0)`);

      // CÍRCULOS
      groupsMerged.each(function(d) {
        const group = d3.select(this);
        
        // bind vals diretamente
        const circles = group.selectAll("circle").data(d.vals);

        circles.enter()
          .append("circle")
          .merge(circles)
          .attr("r", 6)
          .attr("fill", (v, i) => colors[i])
          .attr("cx", x.bandwidth()/2)
          .transition().duration(800)
          .attr("cy", v => y(v.value))
          .attr("opacity", v => isNaN(v.value) ? 0 : 1);

        // Tooltip
        group.selectAll("circle")
          .on("mouseover", (event, d) => {
            tooltip.transition().duration(200).style("opacity", 1);
            tooltip.html(`<strong>País:</strong> ${d.country}<br/><strong>${varName}:</strong> ${d.value}`)
              .style("left", (event.pageX + 10) + "px")
              .style("top", (event.pageY - 25) + "px");
          })
          .on("mousemove", event => {
            tooltip.style("left", (event.pageX + 10) + "px")
                   .style("top", (event.pageY - 25) + "px");
          })
          .on("mouseout", () => tooltip.transition().duration(200).style("opacity", 0));
        
        // Linha vertical
        const validPoints = d.vals.filter(v => !isNaN(v.value))
                                   .map(v => ({x: x.bandwidth()/2, y: y(v.value)}))
                                   .sort((a,b)=>a.y-b.y);

        const lineGen = d3.line().x(p => p.x).y(p => p.y);

        if (validPoints.length >= 2) {
          const path = group.selectAll("path.line").data([validPoints]);
          path.enter()
            .append("path")
            .attr("class", "line")
            .merge(path)
            .transition().duration(800)
            .attr("d", lineGen)
            .attr("fill", "none")
            .attr("stroke", "#666")
            .attr("stroke-width", 1)
            .attr("opacity", 1);
        } else {
          group.selectAll("path.line").transition().duration(800).attr("opacity", 0);
        }
      });

    }).catch(error => console.error("Erro ao carregar dados:", error));
  }

  update(selectedVar);
  return { update };
}

// -------------------- Uso --------------------

// Gráfico 1 fixo (RANKING descendente)
createDotPlot("#dotplot_chart1", "RANKING", true);

// Gráfico 2 com select (Y crescente)
const initialVar = d3.select("#varSelect").property("value");
const chart2 = createDotPlot("#dotplot_chart2", initialVar, false);

// Atualizar gráfico 2 quando muda a variável
d3.select("#varSelect").on("change", function() {
  const varName = this.value;
  console.log("Selecionou variável:", varName);
  chart2.update(varName);
});
