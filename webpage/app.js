import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

// load in data
export async function loadData(csv) {
    const data = await d3.csv(csv, (row, idx) => ({
      date: idx,
      value: Number(row.data), // or just +row.line
      student: row.student,
      test: row.test,
    }));
    return data;
}
// Load and preprocess data
let rawData = await loadData('../data/HR_df.csv');
rawData = rawData.filter(d => d !== undefined).map((d, idx) => ({ ...d, time: idx }));

// General function to create the animated plots
function createStudentChart({
  rawData,
  testName,
  svgSelector,
  selectSelector,
  lineColor = "white"
}) {
  const testData = rawData
    .filter(d => d.test === testName)
    .map(d => ({ ...d, value: +d.value }));

  const svg = d3.select(svgSelector);
  const margin = { top: 20, right: 30, bottom: 50, left: 50 };
  const width = +svg.attr("width") - margin.left - margin.right;
  const height = +svg.attr("height") - margin.top - margin.bottom;

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  const plotWidth = width;
  const plotHeight = height;

  const x = d3.scaleLinear().range([0, plotWidth]);
  const y = d3.scaleLinear().range([plotHeight, 0]);


  const color = d3.scaleOrdinal(d3.schemeCategory10);

  // Axes
  g.append("g").attr("class", "x-axis").attr("transform", `translate(0,${plotHeight})`);
  g.append("g").attr("class", "y-axis");

  // X-Axis Label
    g.append("text")
    .attr("class", "x-label")
    .attr("x", plotWidth / 2)
    .attr("y", plotHeight + margin.bottom - 5)
    .attr("text-anchor", "middle")
    .attr("fill", "white")
    .attr("font-size", "14px")
    .text("Time (minutes)");

    // Y-Axis Label
    g.append("text")
    .attr("class", "y-label")
    .attr("x", -plotHeight / 2)
    .attr("y", -margin.left + 15)
    .attr("transform", "rotate(-90)")
    .attr("text-anchor", "middle")
    .attr("fill", "white")
    .attr("font-size", "14px")
    .text("Heart Rate (bpm)");

  // Draw line for selected student
  function drawStudentLine(studentID) {
    const studentData = testData.filter(d => d.student === studentID);
    if (!studentData.length) return;

    const totalMinutes = testName === 'Final' ? 180 : 90;
    x.domain([0, totalMinutes]);
    y.domain([0, d3.max(studentData, d => d.value)]);

    // Define the line generator using the correct duration
    const line = d3.line()
      .x((d, i) => x((i / (studentData.length - 1)) * totalMinutes))
      .y(d => y(d.value));
    

    g.select(".x-axis").call(d3.axisBottom(x));
    g.select(".y-axis").call(d3.axisLeft(y));

    g.selectAll(".student-line").remove();
    g.selectAll(".max-circle").remove();
    g.selectAll(".max-label").remove();

    const path = g.append("path")
      .datum(studentData)
      .attr("class", "student-line")
      .attr("fill", "none")
      .attr("stroke", color(studentID))
      .attr("stroke-width", 2)
      .attr("d", line);

    // const totalLength = path.node().getTotalLength();

    const maxPoint = studentData.reduce((max, d) => d.value > max.value ? d : max, studentData[0]);
    const maxIndex = studentData.indexOf(maxPoint);
    const maxX = x((maxIndex / (studentData.length - 1)) * totalMinutes);
    const maxY = y(maxPoint.value);

    // Tooltip reference
    const tooltip = d3.select("#tooltip");

    const maxCircle = g.append("circle")
    .attr("class", "max-circle")
    .attr("cx", maxX)
    .attr("cy", maxY)
    .attr("r", 0)
    .attr("fill", lineColor)
    .style("cursor", "pointer")
    .on("mouseover", function (event) {
        console.log(event);
        tooltip
        .style("opacity", 1)
        .html(`Peak: ${maxPoint.value.toFixed(1)} bpm<br>Time: ${(maxIndex / (studentData.length - 1) * 90).toFixed(1)} min<br>
        Grade: ${100}%`);
        maxCircle.attr('r', 10);
    })
    .on("mousemove", function (event) {
        tooltip
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 30) + "px");
    })
    .on("mouseout", function () {
        tooltip.style("opacity", 0);
        maxCircle.attr('r', 5);
    });

    // Get total path length
    const totalLength = path.node().getTotalLength();

    // Get the exact distance along the path to the max point
    const maxIndexRatio = maxIndex / (studentData.length - 1);
    const lengthToMax = totalLength * maxIndexRatio;

    // Define durations
    const duration1 = 2000;
    const pauseDuration = 2000;
    const duration2 = 2000;

    // Set initial dash style to hide the entire line
    path
      .attr("stroke-dasharray", totalLength)
      .attr("stroke-dashoffset", totalLength);

    // Phase 1: Animate to max point
    path.transition()
      .duration(duration1)
      .ease(d3.easeLinear)
      .attr("stroke-dashoffset", totalLength - lengthToMax)
      .on("end", () => {
        // Show max circle
        maxCircle.transition().duration(2000).attr("r", 5);

        // Show tooltip
        tooltip
          .style("opacity", 1)
          .style("left", `${maxX + margin.left}px`)
          .style("top", `${maxY + margin.top - 30}px`)
          .html(`Peak: ${maxPoint.value.toFixed(1)} bpm<br>Time: ${(maxIndexRatio * totalMinutes).toFixed(1)} min<br>Grade: 100%`);

        // Pause before second phase
        setTimeout(() => {
          // Phase 2: Continue animation from max to end
          path.transition()
            .duration(duration2)
            .ease(d3.easeLinear)
            .attr("stroke-dashoffset", 0)
            .on("end", () => {
              // Optionally fade tooltip after delay
              setTimeout(() => {
                tooltip.style("opacity", 0);
              }, 2000);
            });
        }, pauseDuration);
    });
  }

  // Setup select interaction
  d3.select(selectSelector).on("change", function () {
    drawStudentLine(this.value);
  });

  // Initialize with first student
  const firstStudent = testData[0]?.student;
  if (firstStudent) drawStudentLine(firstStudent);
}

// Create all charts!

const chartInitializers = {
    "midterm1-chart": () => createStudentChart({
      rawData,
      testName: "Midterm 1",
      svgSelector: "#midterm1-chart",
      selectSelector: "#student-select1",
      lineColor: "white"
    }),
    "midterm2-chart": () => createStudentChart({
      rawData,
      testName: "Midterm 2",
      svgSelector: "#midterm2-chart",
      selectSelector: "#student-select2",
      lineColor: "white"
    }),
    "final-chart": () => createStudentChart({
      rawData,
      testName: "Final",
      svgSelector: "#final-chart",
      selectSelector: "#student-select3",
      lineColor: "white"
    }),
  };

const chartsDrawn = new Set();

const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        console.log(entry);
        if (entry.isIntersecting) {
            entry.target.classList.add('show');
            const chartId = entry.target.querySelector("svg")?.id;
            if (chartId && !chartsDrawn.has(chartId)) {
                chartsDrawn.add(chartId);
                if (chartInitializers[chartId]) {
                chartInitializers[chartId]();
                }
            }
        } else {
            entry.target.classList.remove('show');
        }
    });
});

const hiddenElements = document.querySelectorAll('.hidden');
hiddenElements.forEach((el) => observer.observe(el));

const auStatic = document.getElementById('au-static');
const auGif = document.getElementById('au-gif');

auStatic.addEventListener('click', () => {
    auStatic.style.display = 'none';
    auGif.style.display = 'inline';
});

auGif.addEventListener('click', () => {
    auGif.style.display = 'none';
    auStatic.style.display = 'inline';
});