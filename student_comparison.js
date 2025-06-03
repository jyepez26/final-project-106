import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import { loadData, loadGrades } from './global.js';

async function createStudentComparison() {
    // Load data
    const edaData = await loadData('data/EDA_df.csv');
    const testScores = await loadGrades('test_scores.csv');
    // Get unique students
    const students = [...new Set(edaData.map(d => d.student))];
    
    // Function to get random student
    // function getRandomStudent() {
    //     let result = 0;
    //     while (result === 7 && result === 0){
    //         result = students[Math.floor(Math.random() * students.length)]
    //     };
    //     return result;
    // }
    function getRandomStudent() {
        return students[Math.floor(Math.random() * students.length)];
    }


    // Get two random students
    let student1 = getRandomStudent();
    let student2 = getRandomStudent();
    while (student2 === student1) {
        student2 = getRandomStudent();
    }
    console.log(student1, student2);

    // Filter data for selected students
    const student1Data = edaData
        .filter(d => d.student === student1 && d.test === 'Final')
        .map((d, idx) => ({ ...d, time: idx }))
        .filter(d => d.time >= 8500 && d.time <= 36000)
        .filter(d => d.values >= 0.03);

    const group1 = d3.groups(student1Data, (d, i) => Math.floor(i / 5));
    const averagedData1 = group1.map(([key, values]) => ({
        category: key,
        time: d3.min(values, d => d.time),
        values: d3.mean(values, d => d.values)
    }));

    const student2Data = edaData
        .filter(d => d.student === student2 && d.test === 'Final')
        .map((d, idx) => ({ ...d, time: idx }))
        .filter(d => d.time >= 8500 && d.time <= 36000)
        .filter(d => d.values >= 0.03);
    const group2 = d3.groups(student2Data, (d, i) => Math.floor(i / 5));
    const averagedData2 = group2.map(([key, values]) => ({
        category: key,
        time: d3.min(values, d => d.time),
        values: d3.mean(values, d => d.values)
    }));

    // Get test scores
    const student1Score = testScores.find(s => s.student === student1)?.score || 0;
    const student2Score = testScores.find(s => s.student === student2)?.score || 0;

    // Set up SVG
    const svg = d3.select('#comparison-chart');
    const margin = { top: 20, right: 30, bottom: 40, left: 60 };
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    // Clear any existing content
    svg.selectAll("*").remove();

    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create scales
    const xScale = d3.scaleLinear()
        .domain([8500, 36000])
        .range([0, width]);

    const yScale = d3.scaleLinear()
        .domain([0, d3.max([...averagedData1, ...averagedData2], d => d.values)])
        .range([height, 0]);

    // Create lines
    const line = d3.line()
        .x(d => xScale(d.time))
        .y(d => yScale(d.values));

    // Draw lines with animation
    const path1 = g.append('path')
        .datum(averagedData1)
        .attr('class', 'line')
        .attr('fill', 'none')
        .attr('stroke', '#1f77b4')
        .attr('stroke-width', 2)
        .attr('d', line);

    const path2 = g.append('path')
        .datum(averagedData2)
        .attr('class', 'line')
        .attr('fill', 'none')
        .attr('stroke', '#ff7f0e')
        .attr('stroke-width', 2)
        .attr('d', line);

    // Animate lines
    const totalLength1 = path1.node().getTotalLength();
    const totalLength2 = path2.node().getTotalLength();

    path1
        .attr('stroke-dasharray', totalLength1 + ' ' + totalLength1)
        .attr('stroke-dashoffset', totalLength1)
        .transition()
        .duration(2000)
        .ease(d3.easeLinear)
        .attr('stroke-dashoffset', 0);

    path2
        .attr('stroke-dasharray', totalLength2 + ' ' + totalLength2)
        .attr('stroke-dashoffset', totalLength2)
        .transition()
        .duration(2000)
        .ease(d3.easeLinear)
        .attr('stroke-dashoffset', 0);

    // Add axes
    g.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(xScale).tickFormat(d => Math.floor(d / 60) + ' min'))
        .append('text')
        .attr('x', width / 2)
        .attr('y', 35)
        .attr('text-anchor', 'middle')
        .text('Time (minutes)');

    g.append('g')
        .call(d3.axisLeft(yScale))
        .append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', -40)
        .attr('x', -height / 2)
        .attr('text-anchor', 'middle')
        .text('EDA');

    // Add legend
    const legend = g.append('g')
        .attr('transform', `translate(${width - 100}, 0)`);

    legend.append('line')
        .attr('x1', 0)
        .attr('y1', 0)
        .attr('x2', 20)
        .attr('y2', 0)
        .attr('stroke', '#1f77b4')
        .attr('stroke-width', 2);

    legend.append('text')
        .attr('x', 30)
        .attr('y', 4)
        .text(`Student ${student1}`);

    legend.append('line')
        .attr('x1', 0)
        .attr('y1', 20)
        .attr('x2', 20)
        .attr('y2', 20)
        .attr('stroke', '#ff7f0e')
        .attr('stroke-width', 2);

    legend.append('text')
        .attr('x', 30)
        .attr('y', 24)
        .text(`Student ${student2}`);

    // Add guess buttons
    const buttonContainer = d3.select('#guess-buttons');
    buttonContainer.selectAll('button').remove();

    const button1 = buttonContainer.append('button')
        .text(`Guess Student ${student1} did better`)
        .on('click', () => showResults(student1Score, student2Score, student1));

    const button2 = buttonContainer.append('button')
        .text(`Guess Student ${student2} did better`)
        .on('click', () => showResults(student1Score, student2Score, student2));

    // Add new comparison button
    buttonContainer.append('button')
        .text('Compare Different Students')
        .on('click', createStudentComparison);

    function showResults(score1, score2, guessedStudent) {
        const result = d3.select('#result');
        result.selectAll('*').remove();

        const winner = score1 > score2 ? student1 : student2;
        const isCorrect = guessedStudent === winner;

        result.append('div')
            .style('font-size', '18px')
            .style('margin', '10px 0')
            .html(`Student ${student1}: ${score1}%<br>
                   Student ${student2}: ${score2}%<br>
                   ${isCorrect ? 'Correct!' : 'Incorrect!'} Student ${winner} did better.`);
    }
}

// Initialize the visualization
createStudentComparison(); 