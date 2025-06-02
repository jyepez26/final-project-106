import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import { loadData } from './global.js';

async function createLinePlot(csvUrl, studentNum) {
    // For data with form data,student,test
    let data = await loadData(csvUrl);
    // Filter out undefined values
    data = data.filter(d => d.student === `S${studentNum}` && d.test === 'Midterm 2');

    data = data.filter(d => d !== undefined);
    data = data.map((d, idx) => ({ ...d, time: idx }));
    console.log(data);


    const svg = d3.select(`#chart`);
    const margin = { top: 20, right: 30, bottom: 30, left: 40 };
    const width = +svg.attr('width') - margin.left - margin.right;
    const height = +svg.attr('height') - margin.top - margin.bottom;

    const xScale = d3.scaleLinear()
        .domain(d3.extent(data, d => d.time))
        .range([0, width]);
        
    const yScale = d3.scaleLinear()
        .domain(d3.extent(data, d => d.values))
        .range([height, 0]);
    
    const line = d3.line()
        .x(d => xScale(d.time))
        .y(d => yScale(d.values));
    
    const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    g.append("path")
        .datum(data)
        .attr("class", "line")
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-width", 2)
        .attr("d", line);

    g.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xScale));

    g.append("g")
        .call(d3.axisLeft(yScale));
}

async function clearPlot(){
    const svg = d3.select(`#chart`);
    svg.selectAll("*").remove();
}


const studentSelect = d3.select('#switch');
studentSelect.on("change", function () {
    clearPlot();
    createLinePlot('HR_df.csv', +this.value);
})
/* Main */
createLinePlot('HR_df.csv', 1);


// async function convertCsvToJson(csvUrl) {
//   const response = await fetch(csvUrl);
//   const csvText = await response.text();

//   // Parse CSV to array of objects
//   const jsonData = d3.csvParse(csvText);

//   // Convert to JSON string (optional: 2-space indentation for readability)
//   const jsonString = JSON.stringify(jsonData, null, 2);

//   // Download as a .json file
//   const blob = new Blob([jsonString], { type: 'application/json' });
//   const url = URL.createObjectURL(blob);
//   const a = document.createElement('a');
//   a.href = url;
//   a.download = 'data.json';
//   a.click();
// }

// convertCsvToJson('HR_df.csv');