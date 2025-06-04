import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

// load in data
export async function loadData(csv) {
    const data = await d3.csv(csv, (row, idx) => ({
      date: idx,
      value: Number(row.temp), // or just +row.line
      student: row.student,
      test: row.test,
    }));
    return data;
}
// Load and preprocess data
let rawData = await loadData('../data/TEMP_df.csv');
rawData = rawData.filter(d => d !== undefined).map((d, idx) => ({ ...d, time: idx }));


const studentGroups = {
    "Low Stress": ["S7", "S10"],
    "Medium Stress": ["S1", "S2", "S3"],
    "High Stress": ["S4", "S5", "S6", "S8", "S9"]
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
  
    const svg = d3.select(svgSelector);
    const margin = { top: 20, right: 30, bottom: 50, left: 50 };
    const width = +svg.attr("width") - margin.left - margin.right;
    const height = +svg.attr("height") - margin.top - margin.bottom;
  
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
    const x = d3.scaleLinear().range([0, width]).domain([0, 90]);
    const y = d3.scaleLinear().range([height, 0]).domain([12, 38]);

    // Add horizontal gridlines
    g.append("g")
    .attr("class", "grid")
    .call(
      d3.axisLeft(y)
        .tickSize(-width)  // Full width of chart
        .tickFormat("")    // Hide tick labels
    )
    .attr("stroke-opacity", 0.1);  // Make gridlines faint
  
    const line = d3.line()
      .x((d, i) => x((i / (averagedData.length - 1)) * 90))
      .y(d => y(d.value));
  
    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x));
  
    g.append("g")
      .call(d3.axisLeft(y));
  
    const path = g.append("path")
      .datum(averagedData)
      .attr("fill", "none")
      .attr("stroke", groupColorScale(groupName))
      .attr("stroke-width", 2)
      .attr("d", line);
    
    const totalLength = path.node().getTotalLength();
    
    path
      .attr("stroke-dasharray", `${totalLength} ${totalLength}`)
      .attr("stroke-dashoffset", totalLength)
      .transition()
      .duration(5000)
      .ease(d3.easeLinear)
      .attr("stroke-dashoffset", 0);
  
    // Labels
    g.append("text")
      .attr("class", "x-label")
      .attr("x", width / 2)
      .attr("y", height + margin.bottom - 5)
      .attr("text-anchor", "middle")
      .attr("fill", "white")
      .attr("font-size", "14px")
      .text("Time (minutes)");
  
    g.append("text")
      .attr("class", "y-label")
      .attr("x", -height / 2)
      .attr("y", -margin.left + 15)
      .attr("transform", "rotate(-90)")
      .attr("text-anchor", "middle")
      .attr("fill", "white")
      .attr("font-size", "14px")
      .text("Body Temperature (°C)");
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
      const y = d3.scaleLinear().range([height, 0]).domain([12, 38]);

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
        .text("Body Temperature (°C)");
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