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
let rawData = await loadData('./data/EDA_df.csv');
rawData = rawData.filter(d => d !== undefined).map((d, idx) => ({ ...d, time: idx }));


const studentGroups = {
    "Low Stress": ["S1"],
    "Medium Stress": ["S7"],
    "High Stress": ["S9"]
  };

const groupAnnotations = {
  "Low Stress": {
    message: "Stable EDA response at a low level.",
    pointIndex: 5  // index in filteredData to place annotation
  },
  "Medium Stress": {
    message: "Not very high EDA response levels, but fluctuates more than low stress group.",
    pointIndex: 10
  },
  "High Stress": {
    message: "Migh higher EDA response level, with sharp spikes that reach high levels.",
    pointIndex: 15
  }
};

const groupColorScale = d3.scaleOrdinal()
  .domain(Object.keys(studentGroups))
  .range(d3.schemeCategory10);

  function createGroupChart({ groupName, groupStudents, rawData, testName, svgSelector }) {
    const groupData = rawData.filter(
      d => d.test === testName && groupStudents.includes(d.student)
    );
  
    if (!groupData.length) return;
  
    // Group data by student
    const studentsData = d3.group(groupData, d => d.student);
  
    // Find the shortest time series length among all students in the group
    const minLength = d3.min(Array.from(studentsData.values(), data => data.length));
  
    // Compute average at each time index (up to minLength)
    const averagedData = Array.from({ length: minLength }, (_, timeIndex) => {
      const valuesAtTime = Array.from(studentsData.values(), studentSeries => studentSeries[timeIndex]?.value);
      return {
        value: d3.mean(valuesAtTime)
      };
    });
  
    // Rolling average smoothing function
    function rollingAverage(data, windowSize, valueKey = 'value') {
      return data.map((d, i) => {
        const start = Math.max(0, i - windowSize + 1);
        const window = data.slice(start, i + 1);
        return {
          ...d,
          [valueKey]: d3.mean(window, item => item[valueKey])
        };
      });
    }
  
    const windowSize = 5; // Change this to control smoothing
    const smoothedData = rollingAverage(averagedData, windowSize);
  
    // Setup SVG dimensions and margins
    const svg = d3.select(svgSelector);
    const margin = { top: 20, right: 30, bottom: 50, left: 50 };
    const width = +svg.attr("width") - margin.left - margin.right;
    const height = +svg.attr("height") - margin.top - margin.bottom;
  
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  
    // Fixed x-axis domain 0 to 90 (minutes)
    const x = d3.scaleLinear().range([0, width]).domain([0, 90]);
    const y = d3.scaleLinear().range([height, 0]).domain([0, 4.5]);
  
    // Define the segment to show (data from 20 to 60) mapped onto full x-axis (0 to 90)
    const startX = 20;
    const endX = 60;
    const originalMaxX = 90;
  
    // Compute slice indices for smoothedData
    const startIndex = Math.floor((startX / originalMaxX) * (smoothedData.length - 1));
    const endIndex = Math.floor((endX / originalMaxX) * (smoothedData.length - 1));
    const filteredData = smoothedData.slice(startIndex, endIndex + 1);
  
    // Add horizontal gridlines
    g.append("g")
      .attr("class", "grid")
      .call(
        d3.axisLeft(y)
          .tickSize(-width)
          .tickFormat("")
      )
      .attr("stroke-opacity", 0.1);
  
    // Add x and y axes
    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x));
  
    g.append("g")
      .call(d3.axisLeft(y));
  
    // Define line generator with remapped x values
    const line = d3.line()
      .x((d, i) => {
        // Original x value between startX and endX
        const originalX = startX + (i / (filteredData.length - 1)) * (endX - startX);
        // Remap [20,60] to [0,90]
        const remappedX = ((originalX - startX) / (endX - startX)) * 90;
        return x(remappedX);
      })
      .y(d => y(d.value));
  
    // Draw the smoothed line
    const path = g.append("path")
      .datum(filteredData)
      .attr("fill", "none")
      .attr("stroke", groupColorScale(groupName))
      .attr("stroke-width", 2)
      .attr("d", line);
  
    const totalLength = path.node().getTotalLength();
  
    // Animate path drawing
    path
    .attr("stroke-dasharray", `${totalLength} ${totalLength}`)
    .attr("stroke-dashoffset", totalLength)
    .transition()
    .duration(5000)
    .ease(d3.easeLinear)
    .attr("stroke-dashoffset", 0);

    // === Annotation setup: centered with line break ===
    const { message } = groupAnnotations[groupName] || {};
    const maxY = d3.max(filteredData, d => d.value);

    // Centered X and slightly above max Y
    const centerX = ((startX + endX) / 2 - startX) / (endX - startX) * 90;
    const cx = x(centerX);
    const cy = y(maxY) - 30;  // Adjust vertical position as needed

    // Split message into lines (manually or using simple logic)
    const lines = message.length > 50
      ? [message.slice(0, message.lastIndexOf(" ", 50)), message.slice(message.lastIndexOf(" ", 50) + 1)]
      : [message];

    // Annotation group
    const annotationGroup = g.append("g").attr("opacity", 0);

    // Add multi-line text
    const text = annotationGroup.append("text")
      .attr("x", cx)
      .attr("y", cy)
      .attr("fill", "white")
      .attr("font-size", "16px")
      .attr("text-anchor", "middle");

    lines.forEach((line, i) => {
      text.append("tspan")
        .text(line)
        .attr("x", cx)
        .attr("dy", i === 0 ? 0 : "1.2em");  // first line stays, next lines shift down
    });

    // Wait for BBox after text renders
    requestAnimationFrame(() => {
      const bbox = text.node().getBBox();
      annotationGroup.insert("rect", "text")
        .attr("x", bbox.x - 6)
        .attr("y", bbox.y - 4)
        .attr("width", bbox.width + 12)
        .attr("height", bbox.height + 8)
        .attr("fill", "black")
        .attr("opacity", 0.6)
        .attr("rx", 4)
        .attr("ry", 4);

      // Fade in annotation
      annotationGroup
        .transition()
        .duration(1000)
        .delay(100)
        .attr("opacity", 1);
    });
  
    // X-axis label
    g.append("text")
      .attr("class", "x-label")
      .attr("x", width / 2)
      .attr("y", height + margin.bottom - 5)
      .attr("text-anchor", "middle")
      .attr("fill", "white")
      .attr("font-size", "14px")
      .text("Time (minutes)");
  
    // Y-axis label
    g.append("text")
      .attr("class", "y-label")
      .attr("x", -height / 2)
      .attr("y", -margin.left + 15)
      .attr("transform", "rotate(-90)")
      .attr("text-anchor", "middle")
      .attr("fill", "white")
      .attr("font-size", "14px")
      .text("EDA (µS)");
  }

//   Object.entries(studentGroups).forEach(([groupName, studentIDs], index) => {
//     const svgSelector = `#group${index + 1}-chart`; // e.g., #group1-chart
//     createGroupChart({
//       groupName,
//       groupStudents: studentIDs,
//       rawData,
//       testName: "Final", // or whichever test you want
//       svgSelector
//     });
//   });

function drawEmptyChart(groupName, groupStudents, rawData, testName, svgSelector) {
    const groupData = rawData.filter(
        d => d.test === testName && groupStudents.includes(d.student)
      );
    
      if (!groupData.length) return;
    
      // Group data by student
      const studentsData = d3.group(groupData, d => d.student);
    
      // Find the shortest time series length among all students in the group
      const minLength = d3.min(Array.from(studentsData.values(), data => data.length));
    
      // Compute average at each time index (up to minLength)
      const averagedData = Array.from({ length: minLength }, (_, timeIndex) => {
        const valuesAtTime = Array.from(studentsData.values(), studentSeries => studentSeries[timeIndex]?.value);
        return {
          value: d3.mean(valuesAtTime)
        };
      });
    
      const svg = d3.select(svgSelector);
      const margin = { top: 20, right: 30, bottom: 50, left: 50 };
      const width = +svg.attr("width") - margin.left - margin.right;
      const height = +svg.attr("height") - margin.top - margin.bottom;
    
      const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
      const x = d3.scaleLinear().range([0, width]).domain([0, 90]);
      const y = d3.scaleLinear().range([height, 0]).domain([0, 4.5]);

      // Add horizontal gridlines
      g.append("g")
      .attr("class", "grid")
      .call(
        d3.axisLeft(y)
          .tickSize(-width)  // Full width of chart
          .tickFormat("")    // Hide tick labels
      )
      .attr("stroke-opacity", 0.1);  // Make gridlines faint
    
      g.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x));
    
      g.append("g")
        .call(d3.axisLeft(y));
    
      // Labels
      g.append("text")
        .attr("class", "x-label")
        .attr("x", width / 2)
        .attr("y", height + margin.bottom - 5)
        .attr("text-anchor", "middle")
        .attr("fill", "white")
        .attr("font-size", "14px")
        .text("Time (seconds)");
    
      g.append("text")
        .attr("class", "y-label")
        .attr("x", -height / 2)
        .attr("y", -margin.left + 15)
        .attr("transform", "rotate(-90)")
        .attr("text-anchor", "middle")
        .attr("fill", "white")
        .attr("font-size", "14px")
        .text("EDA (µS)");
  }

  Object.entries(studentGroups).forEach(([groupName, groupStudents], index) => {
    const svgSelector = `#group${index + 1}-chart`; // Assumes <svg id="group1-chart"> etc.
    const svg = d3.select(svgSelector);
    svg.selectAll("*").remove(); // Clear any existing chart
  
    drawEmptyChart(groupName, groupStudents, rawData, "Midterm 2", svgSelector);
  });

document.getElementById('animate-groups-btn').addEventListener('click', () => {
    Object.entries(studentGroups).forEach(([groupName, studentIDs], index) => {
      const svgSelector = `#group${index + 1}-chart`; // e.g., #group1-chart
      const svg = d3.select(svgSelector);
      svg.selectAll("*").remove(); // Clear chart before re-animating
  
      createGroupChart({
        groupName,
        groupStudents: studentIDs,
        rawData,
        testName: "Midterm 2",
        svgSelector
      });
    });
  });

  document.getElementById('reset-groups-btn').addEventListener('click', () => {
    Object.entries(studentGroups).forEach(([groupName, groupStudents], index) => {
        const svgSelector = `#group${index + 1}-chart`; // Assumes <svg id="group1-chart"> etc.
        const svg = d3.select(svgSelector);
        svg.selectAll("*").remove(); // Clear any existing chart
      
        drawEmptyChart(groupName, groupStudents, rawData, "Midterm 2", svgSelector);
      });
  });