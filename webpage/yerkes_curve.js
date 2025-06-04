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
        .attr('fill', 'white')
        .attr('font-size', '16px')
        .text('Stress Level');

    svg.append('g')
        .call(yAxis)
        .append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -innerHeight / 2)
        .attr('y', -80)
        .attr('text-anchor', 'middle')
        .attr('fill', 'white')
        .attr('font-size', '16px')
        .text('Performance');

    // Style the axes
    svg.selectAll('.domain, .tick line')
        .attr('stroke', 'white');
    
    svg.selectAll('.tick text')
        .attr('fill', 'white')
        .attr('font-size', '14px');

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
        .attr('fill', 'none')
        .attr('stroke', '#1f77b4')
        .attr('stroke-width', 3)
        .attr('d', curve);

    const totalLength = path.node().getTotalLength();

    path.attr('stroke-dasharray', totalLength)
        .attr('stroke-dashoffset', totalLength)
        .transition()
        .duration(2000)
        .ease(d3.easeLinear)
        .attr('stroke-dashoffset', 0);

    // Add a moving dot
    const dot = svg.append('circle')
        .attr('r', 5)
        .attr('fill', '#ff7f0e');

    // Animate the dot along the curve
    function animateDot() {
        const numPoints = points.length;
        let currentIndex = 0;

        function updateDot() {
            if (currentIndex >= numPoints) {
                currentIndex = 0;
            }
            
            const point = points[currentIndex];
            dot.attr('transform', `translate(${xScale(point.x)},${yScale(point.y)})`);
            currentIndex++;
        }

        // Initial position
        updateDot();

        // Animate
        d3.interval(() => {
            updateDot();
        }, 50);  // Update every 50ms
    }

    // Start animation after curve is drawn
    setTimeout(animateDot, 2000);
} 