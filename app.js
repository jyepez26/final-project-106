import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import { createStudentComparison } from './student_comparison.js';
import { createYerkesCurve } from './yerkes_curve.js';
import { mapToName } from './title.js';

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
let rawData = await loadData('./data/HR_df.csv');
rawData = rawData.filter(d => d !== undefined).map((d, idx) => ({ ...d, time: idx }));

// Helper function to process data
function roundToDecimals(value, decimals) {
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
}

function rollingAverageOnObjects(data, windowSize, valueKey) {
    return data.map((d, i) => {
        const start = Math.max(0, i - windowSize + 1);
        const window = data.slice(start, i + 1);
        return {
        ...d,  // preserves category and time
        [valueKey]: roundToDecimals(d3.mean(window, item => item[valueKey]), 2)
        };
    });
}


// General function to create the animated plots
function createStudentChart({
  rawData,
  testName,
  svgSelector,
  selectSelector,
  lineColor = "white",
  showLegend = false
}) {
  let testData = rawData
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

  // const line = d3.line()
  //   .x((d, i) => x(i))
  //   .y(d => y(d.value));

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
    let studentData = testData.filter(d => d.student === studentID);
    if (!studentData.length) return;

    const group1 = d3.groups(studentData, (d, i) => Math.floor(i / 5));
    const maxData1 = group1.map(([key, values]) => ({
        category: key,
        time: d3.min(values, d => d.time),
        value: d3.max(values, d => d.value)
    }));
    const processedData = rollingAverageOnObjects(maxData1, 8, 'value');
    studentData = processedData;

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
      .attr("d", line)
      .attr("id", d => mapToName(studentID));

    const totalLength = path.node().getTotalLength();

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
        tooltip
        .style("opacity", 1)
        .html(`Peak: ${maxPoint.value.toFixed(1)} bpm<br>Time: ${Math.round(maxIndex / 60)} min`);
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

    path
      .attr("stroke-dasharray", totalLength + " " + totalLength)
      .attr("stroke-dashoffset", totalLength)
      .transition()
      .duration(4000)
      .ease(d3.easeLinear)
      .attr("stroke-dashoffset", 0)
      .on("end", () => {
        g.select(".max-circle").transition().duration(500).attr("r", 5);
      });

    // Add legend for average line only if showLegend is true
    if (showLegend) {
      g.append("g")
        .attr("class", "legend-group")
        .attr("transform", `translate(${plotWidth - 180}, 10)`)
        .call(g => {
          g.append("line")
            .attr("x1", 0)
            .attr("y1", 0)
            .attr("x2", 40)
            .attr("y2", 0)
            .attr("stroke", "white")
            .attr("stroke-width", 2)
            .attr("stroke-dasharray", "5,5");
          g.append("text")
            .attr("x", 50)
            .attr("y", 5)
            .attr("fill", "white")
            .attr("font-size", "14px")
            .text("Average Heart Rate");
        });
    }
  }

  // Setup select interaction
  d3.select(selectSelector).on("change", function () {
    drawStudentLine(this.value);
  });

  // Initialize with first student
  const firstStudent = testData[0]?.student;
  if (firstStudent) drawStudentLine(firstStudent);
}

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

// grid
function createStudentChart2({
  rawData,
  testName,
  svgSelector,
  studentID
}) {
    const studentColors = {
    "S1": "#1f77b4",
    "S2": "#ff7f0e",
    "S3": "#2ca02c",
    "S4": "#d62728",
    "S5": "#9467bd",
    "S6": "#8c564b",
    "S7": "#e377c2",
    "S8": "#7f7f7f",
    "S9": "#bcbd22",
    "S10": "#17becf"
  };
  
  let testData = rawData
    .filter(d => d.test === testName)
    .map(d => ({ ...d, value: +d.value }));

  const svg = d3.select(svgSelector);
  const margin = { top: 20, right: 50, bottom: 40, left: 40 };
  const bbox = svg.node().getBoundingClientRect();
  const width = bbox.width - margin.left - margin.right;
  const height = bbox.height - margin.top - margin.bottom;

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  // Add student title inside SVG
  svg.append("text")
  .attr("x", 125)
  .attr("y", 18)
  .attr("text-anchor", "middle")
  .attr("fill", studentColors[studentID] || "white")
  .attr("font-size", "16px")
  .attr("font-weight", "300px")
  .text(`${mapToName(studentID)}`);

  const x = d3.scaleLinear().range([0, width]);
  const y = d3.scaleLinear().range([height, 0]);
  // Automatically draw all final charts for S1–S10

  const color = studentColors[studentID] || "white";

  g.append("g").attr("class", "x-axis").attr("transform", `translate(0,${height})`);
  g.append("g").attr("class", "y-axis");
  g.select(".y-axis").call(d3.axisLeft(y).ticks(4));
  const studentDataRaw = testData.filter(d => d.student === studentID);
  if (!studentDataRaw.length) return;

  const group1 = d3.groups(studentDataRaw, (d, i) => Math.floor(i / 5));
  const maxData1 = group1.map(([key, values]) => ({
    category: key,
    time: d3.min(values, d => d.time),
    value: d3.max(values, d => d.value)
  }));
  const processedData = rollingAverageOnObjects(maxData1, 300, 'value');

  const totalMinutes = testName === 'Final' ? 180 : 90;
  x.domain([0, totalMinutes]);
  y.domain([0, 160]);

  const line = d3.line()
    .x((d, i) => x((i / (processedData.length - 1)) * totalMinutes))
    .y(d => y(d.value));

  g.select(".x-axis").call(d3.axisBottom(x));
  g.select(".y-axis").call(d3.axisLeft(y));

  const path = g.append("path")
    .datum(processedData)
    .attr("fill", "none")
    .attr("stroke", color)
    .attr("stroke-width", 2)
    .attr("d", line);

  const totalLength = path.node().getTotalLength();
  path
    .attr("stroke-dasharray", totalLength + " " + totalLength)
    .attr("stroke-dashoffset", totalLength)
    .transition()
    .duration(4000)
    .ease(d3.easeLinear)
    .attr("stroke-dashoffset", 0);
}

// for test
function createStudentChart3({
  rawData,
  testName,
  svgSelector,
  studentID,
}) {
    const studentColors = {
    "S1": "#1f77b4",
    "S2": "#ff7f0e",
    "S3": "#2ca02c",
    "S4": "#d62728",
    "S5": "#9467bd",
    "S6": "#8c564b",
    "S7": "#e377c2",
    "S8": "#7f7f7f",
    "S9": "#bcbd22",
    "S10": "#17becf"
  };
  
  let testData = rawData
    .filter(d => d.test === testName)
    .map(d => ({ ...d, value: +d.value }));
  console.log(testData);

  const svg = d3.select(svgSelector);
  const margin = { top: 20, right: 50, bottom: 40, left: 40 };
  const bbox = svg.node().getBoundingClientRect();
  const width = bbox.width - margin.left - margin.right;
  const height = bbox.height - margin.top - margin.bottom;

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  const x = d3.scaleLinear().range([0, width]);
  const y = d3.scaleLinear().range([height, 0]);
  // Automatically draw all final charts for S1–S10
  // Set the domains for your scales
  x.domain(d3.extent(testData, d => d.time)); // Replace with your actual x property
  y.domain(d3.extent(testData, d => d.value));

  const color = studentColors[studentID] || "white";

  // Create axis generators
  const xAxis = d3.axisBottom(x);
  const yAxis = d3.axisLeft(y);

  // Add and call the axes
  g.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(50, ${height})`)
    .call(xAxis);

  g.append("g")
    .attr("class", "y-axis")
    .attr("transform", `translate(50, 0)`)
    .call(yAxis);
  
  svg.append("text")
    .attr("text-anchor", "middle")
    .attr("x", 450)
    .attr("y", height + margin.bottom + 10)
    .text("Minutes")
    .style("fill", "#F3F3F3")
    .style("font-size", "14px");

  svg.append("text")
    .attr("text-anchor", "middle")
    .attr("transform", `rotate(-90)`)
    .attr("x", -height / 2 - margin.bottom + 50)
    .attr("y", 50)
    .text("Heart Beats per Minute")
    .style("fill", "#F3F3F3")
    .style("font-size", "14px");

  g.select(".y-axis").call(d3.axisLeft(y).ticks(4));
  const studentDataRaw = testData.filter(d => d.student === studentID);
  if (!studentDataRaw.length) return;

  const group1 = d3.groups(studentDataRaw, (d, i) => Math.floor(i / 5));
  const maxData1 = group1.map(([key, values]) => ({
    category: key,
    time: d3.min(values, d => d.time),
    value: d3.max(values, d => d.value)
  }));
  const processedData = rollingAverageOnObjects(maxData1, 30, 'value');

  const totalMinutes = testName === 'Final' ? 180 : 90;
  x.domain([0, totalMinutes]);
  y.domain([0, 160]);

  const line = d3.line()
    .x((d, i) => x((i / (processedData.length - 1)) * totalMinutes))
    .y(d => y(d.value));

  g.select(".x-axis").call(d3.axisBottom(x)); 
  g.select(".y-axis").call(d3.axisLeft(y));


  const path = g.append("path")
    .datum(processedData)
    .attr("fill", "none")
    .attr("stroke", color)  
    .attr("stroke-width", 2)
    .attr("d", line);

  const totalLength = path.node().getTotalLength();
  path
    .attr("stroke-dasharray", totalLength + " " + totalLength)
    .attr("stroke-dashoffset", totalLength)
    .attr("transform", `translate(50, 0)`)
    .transition()
    .duration(4000)
    .ease(d3.easeLinear)
    .attr("stroke-dashoffset", 0);
  
  const avg = d3.mean(processedData, (d) => d.value);
  const avg_point1 = {time: 0, value: avg};
  const avg_point2 = {time: 705, value: avg};
  const avg_line = d3.line()
    .x(d => d.time)
    .y(d => d.value)
  // Draw the line using the two points
  g.append("path")
      .datum([avg_point1, avg_point2]) // Bind data to the line
      .attr("class", "line")
      .attr("d", avg_line) // Generate the path data
      .attr("fill", "none") // No fill for the line
      .attr("stroke", "white")
      .attr("transform", `translate(50, 0)`)
      .attr("stroke-width", "2")
      .attr("stroke-dasharray", "5, 5");

  // After drawing the average line, add the legend
  svg.append("g")
    .attr("class", "legend-group")
    .attr("transform", `translate(${width - 180}, 10)`)
    .call(g => {
      g.append("line")
        .attr("x1", 0)
        .attr("y1", 0)
        .attr("x2", 40)
        .attr("y2", 0)
        .attr("stroke", "white")
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "5,5");
      g.append("text")
        .attr("x", 50)
        .attr("y", 5)
        .attr("fill", "white")
        .attr("font-size", "14px")
        .text("Average Heart Rate");
    });
}

function annotation(
  chartId,
  xLoc,
  yLoc,
  message
) {
  const svg = d3.select(chartId);
  svg.append("text")
    .attr("x", xLoc)
    .attr("y", yLoc)
    .text(message)
    .style("fill", "#F3F3F3")
    .style("opacity", "0.7")
    .style("font-weight", "100")
    .style("font-size", "14px");
}

function addRectangle(
  chartId,
  xStart,
  yStart,
  width,
  height,
  color,
  label
) {
  const svg = d3.select(chartId);
  svg.append("rect")
    .attr("x", xStart)
    .attr("y", yStart)
    .attr("width", width)
    .attr("height", height)
    .style("fill", "none")
    .style("cursor", "pointer");
}

// Helper to add rectangles within axis area for 800x400 SVG with margins
function addRectanglesWithinAxis(chartId) {
  const margin = { top: 20, right: 30, bottom: 50, left: 50 };
  const svgWidth = 800;
  const svgHeight = 400;
  const plotWidth = svgWidth - margin.left - margin.right;
  const plotHeight = svgHeight - margin.top - margin.bottom;
  // Use the same x scale as the chart
  const x = d3.scaleLinear().domain([0, 90]).range([0, plotWidth]);
  // Beginning: 0-30
  addRectangle(chartId, 90, -10, 235, 360, 'rgba(255, 241, 87, 0.56)', 'Beginning');
  // Middle: 30-60
  addRectangle(chartId, 325, -10, 235, 360, 'rgba(100, 201, 255, 0.19)', 'Middle');  // End: 60-90
  addRectangle(chartId, 560, -10, 235, 360, 'rgba(255, 120, 120, 0.23)', 'End');}

// Creates grid of charts!
["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "S9", "S10"].forEach(studentID => {
  const svgSelector = `#student-${studentID}`;
  createStudentChart2({
    rawData,
    testName: "Final",
    svgSelector,
    studentID
  });
});

// Create all charts!

const chartInitializers = {
    "midterm1-chart": () => createStudentChart3({
      rawData,
      testName: "Midterm 2",
      svgSelector: "#midterm1-chart",
      studentID: "S3"
    }),
    "midterm2-chart": () => createStudentChart3({
      rawData,
      testName: "Midterm 2",
      svgSelector: "#midterm2-chart",
      studentID: "S10"
    }),
    "comparison-chart": () => createStudentComparison(),
    'yerkes-chart': createYerkesCurve,
};

// Example dimensions
const chartWidth = 300;
const chartHeight = 180;
const cols = 5;
const rows = 2; // update based on your number of charts
const gap = 20;
const axisPadding = 30;

// Compute total width and height of the grid
const gridWidth = cols * chartWidth + (cols - 1) * gap;
const gridHeight = rows * chartHeight + (rows - 1) * gap;

const svg = d3.select("#common-axes")
  .attr("width", gridWidth + axisPadding + 50)
  .attr("height", gridHeight + axisPadding + 50);

// // X axis
// const xScale = d3.scaleLinear()
//   .domain([0, 90])
//   .range([axisPadding, gridWidth + axisPadding]);

// const xAxis = d3.axisBottom(xScale);

// svg.append("g")
//   .attr("transform", `translate(0, ${gridHeight + axisPadding})`)
//   .call(xAxis);

// // Y axis
// const yScale = d3.scaleLinear()
//   .domain([0, 160])
//   .range([gridHeight + axisPadding, axisPadding]);

// const yAxis = d3.axisLeft(yScale);

// svg.append("g")
//   .attr("transform", `translate(${axisPadding}, 0)`)
//   .call(yAxis);

// X axis label
svg.append("text")
  .attr("text-anchor", "middle")
  .attr("x", axisPadding + gridWidth / 2)
  .attr("y", gridHeight + axisPadding + 20) // move further down
  .attr("fill", "white")
  .attr("opacity", 0.8)
  .text("Time (Minutes)");

// Y axis label
svg.append("text")
  .attr("text-anchor", "middle")
  .attr("transform", `rotate(-90)`)
  .attr("x", -(axisPadding + gridHeight / 2))
  .attr("y", 25)  // move right so it's not offscreen
  .attr("fill", "white")
  .attr("opacity", 0.8)
  .text("Heart Rate (bpm)");

  
// annotation(
//   "#midterm1-chart", 150, 220, "Beginning");
addRectangle(
  "#midterm1-chart", 90, 20, 235, 340, "#c6bbf2", "Beginning"
);
addRectangle(
  "#midterm1-chart", 325, 20, 235, 340, "#bababa", "Middle"
);
addRectangle(
  "#midterm1-chart", 560, 20, 235, 340, "#f1c08a", "End"
);
addRectangle(
  "#midterm2-chart", 90, 20, 235, 340, "#c6bbf2", "Beginning"
);
addRectangle(
  "#midterm2-chart", 325, 20, 235, 340, "#bababa", "Middle"
);
addRectangle(
  "#midterm2-chart", 560, 20, 235, 340, "#f1c08a", "End"
);
// annotation(middle);
// annotation(end);

// Remove old rectangle calls and use the new helper for the first two charts
addRectanglesWithinAxis('#midterm1-chart');
addRectanglesWithinAxis('#midterm2-chart');

const chartsDrawn = new Set();

const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        // console.log(entry);
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

function fadeInAnnotation(svgSelector, text) {
  const svg = d3.select(svgSelector);
  // Position: upper middle of plot area
  const x = 400; // SVG width / 2
  const y = 50;  // 50px from top
  const annotation = svg.append("text")
    .attr("x", x)
    .attr("y", y)
    .attr("text-anchor", "middle")
    .attr("fill", "#bababa")
    .attr("font-size", "20px")
    .attr("font-weight", "bold")
    .attr("opacity", 0)
    .text(text);
  annotation.transition().duration(1200).attr("opacity", 0.92);
}

// Patch createStudentChart3 to fade in annotation after line animation
const originalCreateStudentChart3 = createStudentChart3;
createStudentChart3 = function(opts) {
  originalCreateStudentChart3({
    ...opts,
    onLineDrawn: function() {
      fadeInAnnotation(
        opts.svgSelector,
        "Heart rate is highest at the start and end of the exam, with a calmer period in the middle. This pattern suggests students experience anticipatory stress before starting, settle in as they work, and then feel pressure again as time runs out."
      );
    }
  });
};