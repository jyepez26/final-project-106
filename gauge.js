import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import { trainModel, predictGrade, findMostSimilarStudent , getGradeForStudentTest } from './newmodel.js';
import { mapToName } from './title.js';

// Initialize the model
let model, features, minMax;
let modelInitialized = false;

// Initialize model and wait for it to be ready
async function initializeModel() {
    try {
        const result = await trainModel();
        model = result.model;
        features = result.features;
        minMax = result.minMax;
        modelInitialized = true;
        console.log("Model loaded successfully!");
        
        // // Run initial prediction with default values
        // const temp = parseFloat(document.getElementById('temp-input').value);
        // const hr = parseFloat(document.getElementById('hr-input').value);
        // const eda = parseFloat(document.getElementById('eda-input').value);
        
        // const inputFeatures = {
        //     tempMean: temp,
        //     tempStd: 0.1,
        //     hrMean: hr,
        //     hrStd: 0.1,
        //     edaMean: eda,
        //     edaStd: 0.1,
        //     tempMeanU: 0,
        //     hrMeanU: 0,
        //     edaMeanU: 0
        // };
        
        // const grade = await predictGrade(model, inputFeatures, minMax);
        // const similarStudent = findMostSimilarStudent(inputFeatures, features, minMax);
        // const studentName = studentNames[similarStudent] || similarStudent;
        
        // updateVisualizations(grade, studentName);
    } catch (error) {
        console.error("Error initializing model:", error);
    }
}

// Call initializeModel
initializeModel();

// Function to update all visualizations
function updateVisualizations(grade, studentId) {
    requestAnimationFrame(() => {
        document.getElementById('score-display').textContent = grade.toFixed(2);
        document.getElementById('stress-type').textContent = `Similar to ${mapToName(studentId)}`;
        updateBarDisplay(grade);
        updateGaugeDisplay(grade);
    });
}

// Gauge configuration
const gaugeConfig = {
    min: 0.5,
    max: 1.0,
    tickCount: 6,
    radius: 150,
    centerX: 200,
    centerY: 250,
    startAngle: -180,  // Start from left side
    endAngle: 0       // End at right side
};

// Create tick marks
function createTickMarks() {
    const ticks = d3.select('.gauge-ticks');
    const angleScale = d3.scaleLinear()
        .domain([gaugeConfig.min, gaugeConfig.max])
        .range([gaugeConfig.startAngle, gaugeConfig.endAngle]);

    // Create tick marks and labels
    for (let i = 0; i <= gaugeConfig.tickCount; i++) {
        const value = gaugeConfig.min + (i / gaugeConfig.tickCount) * (gaugeConfig.max - gaugeConfig.min);
        const angle = angleScale(value);
        const radians = (angle - 90) * (Math.PI / 180);
        
        // Calculate tick position
        const x1 = gaugeConfig.centerX + (gaugeConfig.radius - 20) * Math.cos(radians);
        const y1 = gaugeConfig.centerY + (gaugeConfig.radius - 20) * Math.sin(radians);
        const x2 = gaugeConfig.centerX + (gaugeConfig.radius - 10) * Math.cos(radians);
        const y2 = gaugeConfig.centerY + (gaugeConfig.radius - 10) * Math.sin(radians);
        
        // Add tick line
        ticks.append('line')
            .attr('class', 'gauge-tick')
            .attr('x1', x1)
            .attr('y1', y1)
            .attr('x2', x2)
            .attr('y2', y2);
        
        // Add tick label
        const labelX = gaugeConfig.centerX + (gaugeConfig.radius - 35) * Math.cos(radians);
        const labelY = gaugeConfig.centerY + (gaugeConfig.radius - 35) * Math.sin(radians);
        
        ticks.append('text')
            .attr('class', 'gauge-tick-label')
            .attr('x', labelX)
            .attr('y', labelY)
            .text(value.toFixed(1));
    }
}

// Initialize tick marks
createTickMarks();

// Update value displays with immediate feedback
function updateValueDisplay(inputId, valueId) {
    const input = document.getElementById(inputId);
    const display = document.getElementById(valueId);
    
    // Update display immediately for responsiveness with consistent decimal places
    input.addEventListener('input', () => {
        const value = parseFloat(input.value);
        display.textContent = value.toFixed(1);  // Always show one decimal place
    });
}

// Initialize value displays
updateValueDisplay('temp-input', 'temp-value');
updateValueDisplay('hr-input', 'hr-value');
updateValueDisplay('eda-input', 'eda-value');

// Prediction function
async function predict() {
    if (!modelInitialized) {
        console.log("Model not loaded yet!");
        return;
    }

    const temp = parseFloat(document.getElementById('temp-input').value);
    const hr = parseFloat(document.getElementById('hr-input').value);
    const eda = parseFloat(document.getElementById('eda-input').value);

    if (isNaN(temp) || isNaN(hr) || isNaN(eda)) {
        alert("Please enter valid numbers for all fields.");
        return;
    }

    const normalize = (val, min, max) => (val - min) / (max - min);
    const uShape = x => (x - 0.5) ** 2;

    const normTemp = normalize(temp, minMax.tempMeanMin, minMax.tempMeanMax);
    const normHr = normalize(hr, minMax.hrMeanMin, minMax.hrMeanMax);
    const normEda = normalize(eda, minMax.edaMeanMin, minMax.edaMeanMax);

    function randomUniform(min, max) {
        return Math.random() * (max - min) + min;
    }

    const inputFeatures = {
        tempMean: normTemp,
        tempStd: randomUniform(0.1, 0.7),
        hrMean: normHr,
        hrStd: randomUniform(15, 35),
        edaMean: normEda,
        edaStd: randomUniform(0.07, 1),
        tempMeanU: uShape(normTemp),
        hrMeanU: uShape(normHr),
        edaMeanU: uShape(normEda),
    };

    try {
        const grade = await predictGrade(model, inputFeatures, minMax);
        const similarStudentFeature = findMostSimilarStudent(inputFeatures, features, minMax);
        const similarStudent = similarStudentFeature.student;
        const closestStudentGrade = getGradeForStudentTest(similarStudentFeature.originalStudentTest);

        const closestStudentName = mapToName(similarStudent);

        console.log("Predicted grade:", grade);
        console.log("Closest student's actual grade:", closestStudentGrade);

        updateVisualizations(grade, similarStudent);
    } catch (error) {
        console.error("Prediction error:", error);
        alert("Error making prediction. Please try again.");
    }
}

// Add event listener to predict button
document.getElementById("predict-button").addEventListener("click", predict);

function getColorForScore(score) {
    if (score < 0.6) return "#ff4d4d";  // Red
    if (score < 0.7) return "#ffa64d";  // Orange
    if (score < 0.8) return "#ffff4d";  // Yellow
    if (score < 0.9) return "#4dff4d";  // Light Green
    return "#00cc00";  // Green
}

// Update gauge visualization
function updateGaugeDisplay(score) {
    // Calculate angle for the score
    const angle = gaugeConfig.startAngle + (score - gaugeConfig.min) / (gaugeConfig.max - gaugeConfig.min) * 
                 (gaugeConfig.endAngle - gaugeConfig.startAngle);
    
    // Update progress arc
    d3.select('.gauge-progress')
        .transition()
        .duration(1000)
        .attr('transform', `rotate(${angle}, ${gaugeConfig.centerX}, ${gaugeConfig.centerY})`)
        .attr('stroke', getColorForScore(score));
    
    // Update needle
    d3.select('.gauge-needle')
        .transition()
        .duration(1000)
        .attr('transform', `rotate(${angle}, ${gaugeConfig.centerX}, ${gaugeConfig.centerY})`);
    
    // Update score text
    d3.select('.gauge-text')
        .transition()
        .duration(1000)
        .tween('text', function() {
            const that = d3.select(this);
            const i = d3.interpolateNumber(+that.text() || 0, score);
            return function(t) {
                that.text(i(t).toFixed(2));
            };
        });
}

function getGradeLetter(score) {
  const rounded = Math.round(score * 100) / 100; // round to 2 decimals
  if (rounded >= 0.9) return 'A';
  if (rounded >= 0.8) return 'B';
  if (rounded >= 0.7) return 'C';
  if (rounded >= 0.6) return 'D';
  return 'F';
}

function updateBarDisplay(score) {
    // Map score (0.5-1.0) to percent (0-100)
    const percent = Math.max(0, Math.min(1, (score - 0.5) / 0.5)) * 100;
    
    // Select the elements using D3
    const bar = d3.select('#grade-bar');
    const indicator = d3.select('#bar-indicator');
    const gradeText = d3.select('#bar-grade-text');

    if (bar.empty() || indicator.empty() || gradeText.empty()) {
        console.error('Required elements not found');
        return;
    }

    // Reset and animate using D3
    bar
        .style('width', '0%')
        .transition()
        .duration(1000)
        .ease(d3.easeCubicInOut)
        .style('width', `${percent}%`);

    indicator
        .style('left', '0px')
        .transition()
        .duration(1000)
        .ease(d3.easeCubicInOut)
        .style('left', `calc(${percent}% - 2px)`);

    gradeText.text(getGradeLetter(score));
}

// Initialize the bar display
function initializeBarDisplay() {
    const bar = d3.select('#grade-bar');
    const indicator = d3.select('#bar-indicator');
    const gradeText = d3.select('#bar-grade-text');
    
    if (!bar.empty() && !indicator.empty() && !gradeText.empty()) {
        // Set initial state
        bar.style('width', '0%');
        indicator.style('left', '0px');
        gradeText.text('--');
    }
}

// Call initialization when the page loads
document.addEventListener('DOMContentLoaded', () => {
    initializeBarDisplay();
    // Add a small delay to ensure DOM is fully ready
    setTimeout(initializeBarDisplay, 100);
});

export { updateGaugeDisplay };