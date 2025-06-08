import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import { loadData, loadGrades } from './global.js';
import { mapToName } from './title.js';

export async function createStudentComparison() {
    // Load data
    const edaData = await loadData('./data/EDA_df.csv');
    const testScores = await loadGrades('./data/test_scores.csv');
    
    // Get unique students
    const students = [...new Set(edaData.map(d => d.student))];    
    // Function to get random student
    function getRandomStudent() {
        let randomStudent;
        do {
            randomStudent = students[Math.floor(Math.random() * students.length)];    
        } while (randomStudent === "S7" || randomStudent === "S2" || randomStudent === "S1");
        return randomStudent;
    }


    // Select two random students
    const student1 = getRandomStudent();
    let student2 = getRandomStudent();
    do {
        student2 = getRandomStudent();
        } while (student1 === student2)
    
    // // Only log if both students are defined
    // if (student1 && student2) {
    //     console.log(`Selected students: ${student1} ${student2}`);
    // }

    // Filter data for selected students
    const student1Data = edaData
        .filter(d => d.student === student1 && d.test === 'Final')
        .map((d, idx) => ({ ...d, time: idx }))
        .filter(d => d.time >= 8500 && d.time <= 36000)
        .filter(d => d.values >= 0.1);

    const group1 = d3.groups(student1Data, (d, i) => Math.floor(i / 5));
    const maxData1 = group1.map(([key, values]) => ({
        category: key,
        time: d3.min(values, d => d.time),
        values: d3.max(values, d => d.values)
    }));

    const student2Data = edaData
        .filter(d => d.student === student2 && d.test === 'Final')
        .map((d, idx) => ({ ...d, time: idx }))
        .filter(d => d.time >= 8500 && d.time <= 36000)
        .filter(d => d.values >= 0.1);

    const group2 = d3.groups(student2Data, (d, i) => Math.floor(i / 5));
    const maxData2 = group2.map(([key, values]) => ({
        category: key,
        time: d3.min(values, d => d.time),
        values: d3.max(values, d => d.values)
    }));

    // Apply it to your maxData1

    function rollingAverageOnObjects(data, windowSize, valueKey) {
        return data.map((d, i) => {
            const start = Math.max(0, i - windowSize + 1);
            const window = data.slice(start, i + 1);
            return {
            ...d,  // preserves category and time
            [valueKey]: d3.mean(window, item => item[valueKey])
            };
        });
    }

    const smoothedMaxData1 = rollingAverageOnObjects(maxData1, 20, 'values');
    const smoothedMaxData2 = rollingAverageOnObjects(maxData2, 20, 'values')

    // Get test scores
    const student1Score = testScores.find(s => s.student === student1)?.score || 0;
    const student2Score = testScores.find(s => s.student === student2)?.score || 0;

    // Set up SVG
    const svg = d3.select('#comparison-chart');
    const margin = { top: 20, right: 30, bottom: 40, left: 60 };
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    // Create scales
    const xScale = d3.scaleLinear()
        .domain([8500, 36000])
        .range([0, width]);

    const yScale = d3.scaleLinear()
        .domain([0, d3.max([...smoothedMaxData1, ...smoothedMaxData2], d => d.values)])
        .range([height, 0]);

    // Create lines
    const line = d3.line()
        .x(d => xScale(d.time))
        .y(d => yScale(d.values));

    // Clear any existing content
    svg.selectAll("*").remove();

    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // Draw lines with animation
    const path1 = g.append('path')
        .datum(smoothedMaxData1)
        .attr('class', 'line student1-line')
        .attr('fill', 'none')
        .style('stroke', '#998ec3')  // Purple
        .style('stroke-width', '2.5px')
        .attr('d', line);
    
    const path2 = g.append('path')
        .datum(smoothedMaxData2)
        .attr('class', 'line student2-line')
        .attr('fill', 'none')
        .style('stroke', '#f1a340')  // Orange
        .style('stroke-width', '2.5px')
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
    const tickLabels = [
        '12 min', '24 min', '36 min', '48 min', 
        '1 h', '72 min', '84 min', '96 min', 
        '108 min', '120 min', '2 h', '132 min', 
        '144 min', '156 min', '3 h'
    ];

    g.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(xScale)
        .ticks(12)
        .tickFormat((d, i) => tickLabels[i])) // changed axis to make sense
        .attr('color', '#D3D3D3')
        .append('text')
        .attr('x', width / 2)
        .attr('y', 35)
        .attr('text-anchor', 'middle')
        .attr('fill', '#D3D3D3')
        .text('Time');

    g.append('g')
        .call(d3.axisLeft(yScale))
        .attr('color', '#D3D3D3')
        .append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', -40)
        .attr('x', -height / 2)
        .attr('text-anchor', 'middle')
        .attr('fill', '#D3D3D3')
        .text('Brain Activity (EDA)');

    // Add legend
    const legend = g.append('g')
        .attr('transform', `translate(${width - 80}, 10)`);

    legend.append('line')
        .attr('x1', 0)
        .attr('y1', 0)
        .attr('x2', 15)
        .attr('y2', 0)
        .style('stroke', '#998ec3')  // Purple
        .style('stroke-width', '2.5px');

    legend.append('text')
        .attr('x', 20)
        .attr('y', 4)
        .attr('fill', '#D3D3D3')
        .attr('font-size', '12px')
        .text(`${mapToName(student1)}`);

    legend.append('line')
        .attr('x1', 0)
        .attr('y1', 15)
        .attr('x2', 15)
        .attr('y2', 15)
        .style('stroke', '#f1a340')  // Orange
        .style('stroke-width', '2.5px');

    legend.append('text')
        .attr('x', 20)
        .attr('y', 19)
        .attr('fill', '#D3D3D3')
        .attr('font-size', '12px')
        .text(`${mapToName(student2)}`);

    // Add guess buttons
    const buttonContainer = d3.select('#guess-buttons');
    buttonContainer.selectAll('button').remove();

    const buttonStyle = {
        'padding': '8px 16px',
        'margin': '5px',
        'border': 'none',
        'border-radius': '4px',
        'background-color': '#238636', // green
        'color': '#D3D3D3', // white text
        'cursor': 'pointer',
        'transition': 'background-color 0.3s'
    };

    const button1 = buttonContainer.append('button')
        .text(`Guess ${mapToName(student1)} did better`)
        .style('padding', buttonStyle.padding)
        .style('margin', buttonStyle.margin)
        .style('border', buttonStyle.border)
        .style('border-radius', buttonStyle['border-radius'])
        .style('background-color', buttonStyle['background-color'])
        .style('color', buttonStyle.color)
        .style('cursor', buttonStyle.cursor)
        .style('transition', buttonStyle.transition)
        .on('mouseover', function() {
            d3.select(this).style('background-color', '#4ca958');
        })
        .on('mouseout', function() {
            d3.select(this).style('background-color', '#238636');
        })
        .on('click', () => showResults(student1Score, student2Score, student1));

    const button2 = buttonContainer.append('button')
        .text(`Guess ${mapToName(student2)} did better`)
        .style('padding', buttonStyle.padding)
        .style('margin', buttonStyle.margin)
        .style('border', buttonStyle.border)
        .style('border-radius', buttonStyle['border-radius'])
        .style('background-color', buttonStyle['background-color'])
        .style('color', buttonStyle.color)
        .style('cursor', buttonStyle.cursor)
        .style('transition', buttonStyle.transition)
        .on('mouseover', function() {
            d3.select(this).style('background-color', '#4ca958');
        })
        .on('mouseout', function() {
            d3.select(this).style('background-color', '#238636');
        })
        .on('click', () => showResults(student1Score, student2Score, student2));

    // Add new comparison button
    buttonContainer.append('button')
        .text('Compare Different Students')
        .style('padding', buttonStyle.padding)
        .style('margin', buttonStyle.margin)
        .style('border', buttonStyle.border)
        .style('border-radius', buttonStyle['border-radius'])
        .style('background-color', '#51748f')
        .style('color', buttonStyle.color)
        .style('cursor', buttonStyle.cursor)
        .style('transition', buttonStyle.transition)
        .on('mouseover', function() {
            d3.select(this).style('background-color', '#237fca');
        })
        .on('mouseout', function() {
            d3.select(this).style('background-color', '#51748f');
        })
        .on('click', createStudentComparison);

    function showResults(score1, score2, guessedStudent) {
        const result = d3.select('#result');
        result.selectAll('*').remove();

        const winner = score1 > score2 ? student1 : student2;
        const isCorrect = guessedStudent === winner;

        result.append('div')
            .style('font-size', '18px')
            .style('margin', '10px 0')
            .style('color', '#D3D3D3')
            .style('padding', '15px')
            .style('border-radius', '4px')
            .style('background-color', isCorrect ? 'rgba(76, 175, 80, 0.2)' : 'rgba(244, 67, 54, 0.2)')
            .html(`${mapToName(student1)}: ${score1}%<br>
                   ${mapToName(student2)}: ${score2}%<br>
                   ${isCorrect ? 'Correct!' : 'Incorrect!'} ${mapToName(winner)} did better.`);
    }
}

// Initialize the visualization
createStudentComparison(); 