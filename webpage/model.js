import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
  
  const width = 400;
  const height = 250;
  const radius = 150;
  const min = 0.7;
  const max = 2;

  const svg = d3.select("#gauge")
    .attr("width", width)
    .attr("height", height);

  const arc = d3.arc()
    .innerRadius(radius - 20)
    .outerRadius(radius)
    .startAngle(-Math.PI / 2)
    .endAngle(Math.PI / 2);

  svg.append("path")
    .attr("transform", `translate(${width / 2}, ${height})`)
    .attr("d", arc)
    .attr("fill", "#eee");

  // Scale to convert grade to angle
  const scale = d3.scaleLinear()
    .domain([min, max])
    .range([-Math.PI / 2, Math.PI / 2]);

  // Needle setup
  const needle = svg.append("line")
    .attr("x1", width / 2)
    .attr("y1", height)
    .attr("x2", width / 2)
    .attr("y2", height - radius + 30)
    .attr("stroke", "red")
    .attr("stroke-width", 4)
    .attr("class", "needle");

  // Text label
  const gaugeText = svg.append("text")
    .attr("x", width / 2)
    .attr("y", height / 2 + 30)
    .attr("text-anchor", "middle")
    .attr("font-size", "20px")
    .attr("fill", "#fff")
    .text("0");


  function getColorForGrade(grade) {
    if (grade < 0.5) return "red";
    if (grade < 0.6) return "darkorange";
    if (grade < 0.7) return "orange";
    if (grade < 0.8) return "yellow";
    if (grade < 0.9) return "lightgreen";
    return "green";
  }

  // Animate needle
  function updateGauge(value) {
    const angle = scale(value);
    const needleLength = radius - 30;
    const x2 = width / 2 + needleLength * Math.cos(angle);
    const y2 = height + needleLength * Math.sin(angle);
    const needleColor = getColorForGrade(value);

    d3.select(".needle")
    .transition()
    .duration(1000)
    .attr("x2", x2)
    .attr("y2", y2)
    .attr("stroke", needleColor);

    gaugeText.transition()
      .duration(1000)
      .tween("text", function () {
        const that = d3.select(this);
        const i = d3.interpolateNumber(+that.text(), value);
        return function (t) {
          that.text(i(t).toFixed(1));
        };
      });
  }

  async function predict() {
    const temp = parseFloat(document.getElementById('tempInput').value);
    const hr = parseFloat(document.getElementById('hrInput').value);
    const eda = parseFloat(document.getElementById('edaInput').value);

    if (isNaN(temp) || isNaN(hr) || isNaN(eda)) {
      alert("Please enter valid numbers for all fields.");
      return;
    }

    const response = await fetch('http://127.0.0.1:8000/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ temp, hr, eda })
    });

    const result = await response.json();
    const grade = parseFloat(result.grade);

    document.getElementById('gradeResult').textContent = result.grade;
    document.getElementById('clusterResult').textContent = result.cluster;

    updateGauge(grade);
  }

  document.getElementById("predict-button").addEventListener("click", () => {
    predict();
  })