import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

export function createYerkesCurve() {
    const width = 800;
    const height = 400;
    const margin = { top: 40, right: 40, bottom: 60, left: 100 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Create SVG
    const svg = d3.select('#yerkes-chart')
        .attr('width', width)
        .attr('height', height)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create scales
    const xScale = d3.scaleLinear()
        .domain([0, 10])
        .range([0, innerWidth]);

    const yScale = d3.scaleLinear()
        .domain([0, 10])
        .range([innerHeight, 0]);

    // Create axes with Low, Medium, High ticks
    const xAxis = d3.axisBottom(xScale)
        .ticks(3)
        .tickFormat(d => d === 0 ? 'Low' : d === 5 ? 'Medium' : 'High');
    
    const yAxis = d3.axisLeft(yScale)
        .ticks(3)
        .tickFormat(d => d === 0 ? 'Low' : d === 5 ? 'Medium' : 'High');

    // Style the axes
    svg.append('g')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(xAxis)
        .append('text')
        .attr('x', innerWidth / 2)
        .attr('y', 40)
        .attr('text-anchor', 'middle')
        .attr('fill', '#D3D3D3')
        .attr('font-size', '16px')
        .text('Stress Level')
        .attr('font-family', 'Roboto')
        .attr('margin-top', '1em');

    svg.append('g')
        .call(yAxis)
        .append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -innerHeight / 2)
        .attr('y', -80)
        .attr('text-anchor', 'middle')
        .attr('fill', '#D3D3D3')
        .attr('font-size', '18px')
        .attr('font-family', 'Roboto')
        .text('Performance');

    // Style the axes
    svg.selectAll('.domain, .tick line')
        .attr('stroke', '#D3D3D3');
    
    svg.selectAll('.tick text')
        .attr('fill', '#D3D3D3')
        .attr('font-size', '12px')
        .attr('font-family', 'Roboto');

    // Create the curve
    const curve = d3.line()
        .x(d => xScale(d.x))
        .y(d => yScale(d.y))
        .curve(d3.curveBasis);

    // Normal distribution function
    function normalDistribution(x, mean, stdDev) {
        return Math.exp(-Math.pow(x - mean, 2) / (2 * Math.pow(stdDev, 2)));
    }

    // Generate points for the normal distribution curve
    const points = [];
    const mean = 5;  // Center of the curve
    const stdDev = 1.5;  // Controls the spread of the curve
    const scale = 10;  // Scale the height of the curve

    for (let i = 0; i <= 10; i += 0.1) {
        points.push({
            x: i,
            y: scale * normalDistribution(i, mean, stdDev)
        });
    }

    // Animate the curve
    const path = svg.append('path')
        .datum(points)
        .attr('fill', '#998ec3')
        .attr('stroke', '#f7f7f7')
        .attr('stroke-width', 3)
        .attr('d', curve);

    const totalLength = path.node().getTotalLength();

    path.attr('stroke-dasharray', totalLength)
        .attr('stroke-dashoffset', totalLength)
        .transition()
        .duration(2000)
        .ease(d3.easeLinear)
        .attr('stroke-dashoffset', 0);

    // Add a static circle in the high performance area
    svg.append('circle')
        .attr('cx', xScale(5)) // Center horizontally around x=5 (middle of curve)
        .attr('cy', yScale(10)) // Position in the "High" performance area
        .attr('r', 10)
        .attr('stroke', '#f7f7f7')
        .attr('stroke-width', 1);

    // Add a moving dot
    const dot = svg.append('circle')
        .attr('r', 8)
        .attr('fill', '#f1a340');

    function animateDot() {
        const numPoints = points.length;
        let currentIndex = 0;
        let direction = 1; // 1 for forward, -1 for backward
        let interval;
        let isPaused = false;

        function updateDot() {
            const point = points[currentIndex];
            dot.attr('transform', `translate(${xScale(point.x)},${yScale(point.y)})`);
            
            currentIndex += direction;
            
            // Change direction when reaching the ends
            if (currentIndex >= numPoints - 1) {
                direction = -1;
            } else if (currentIndex <= 0) {
                direction = 1;
            }
        }

        function startAnimation() {
            if (!isPaused) {
                interval = d3.interval(() => {
                    updateDot();
                }, 50);
            }
        }

        function stopAnimation() {
            if (interval) {
                interval.stop();
            }
        }

        // Initial position
        updateDot();
        startAnimation();

        // Event listener for pause button
        document.getElementById('pause-btn').addEventListener('click', function() {
            if (isPaused) {
                isPaused = false;
                this.textContent = 'Pause';
                startAnimation();
            } else {
                isPaused = true;
                this.textContent = 'Play';
                stopAnimation();
            }
        });
    }

    // Start animation after curve is drawn
    setTimeout(animateDot, 2000);
}
// pause button styling
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
let pauseButton = d3.select('#pause-btn')
    .style('padding', buttonStyle.padding)
    .style('border', buttonStyle.border)
    .style('border-radius', buttonStyle['border-radius'])
    .style('background-color', buttonStyle['background-color'])
    .style('color', buttonStyle.color)
    .style('cursor', buttonStyle.cursor)
    .style('transition', buttonStyle.transition);

pauseButton
    .on('mouseover', function() {
        d3.select(this).style('background-color', '#4ca958');
    })
    .on('mouseout', function() {
        d3.select(this).style('background-color', '#238636');
    });