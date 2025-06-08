import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import { trainModel, predictGrade, findMostSimilarStudent } from './newmodel.js';

// Student name mapping
const studentNames = {
    'S1': 'Alex',
    'S2': 'Jordan',
    'S3': 'Taylor',
    'S4': 'Casey',
    'S5': 'Riley',
    'S6': 'Morgan',
    'S7': 'Jamie',
    'S8': 'Quinn',
    'S9': 'Drew',
    'S10': 'Blake'
};

// Initialize the model
let model, features, minMax;
trainModel().then(result => {
  model = result.model;
  features = result.features;
  minMax = result.minMax;
  console.log("Model loaded successfully!");
});

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

// Update value displays
function updateValueDisplay(inputId, valueId) {
    const input = document.getElementById(inputId);
    const display = document.getElementById(valueId);
    input.addEventListener('input', () => {
        display.textContent = input.value;
    });
}

// Initialize value displays
updateValueDisplay('temp-input', 'temp-value');
updateValueDisplay('hr-input', 'hr-value');
updateValueDisplay('eda-input', 'eda-value');

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
  const bar = document.getElementById('grade-bar');
  const indicator = document.getElementById('bar-indicator');
  const gradeText = document.getElementById('bar-grade-text');

  bar.style.width = percent + '%';
  indicator.style.left = `calc(${percent}% - 2px)`;
  gradeText.textContent = getGradeLetter(score);
}

// Prediction function
async function predict() {
    if (!model || !features || !minMax) {
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

    const inputFeatures = {
        tempMean: temp,
        tempStd: 0.1,  // Default small variation
        hrMean: hr,
        hrStd: 0.1,    // Default small variation
        edaMean: eda,
        edaStd: 0.1,   // Default small variation
        tempMeanU: 0,  // Will be calculated in predictGrade
        hrMeanU: 0,    // Will be calculated in predictGrade
        edaMeanU: 0    // Will be calculated in predictGrade
    };

    try {
        const grade = await predictGrade(model, inputFeatures, minMax);
        const similarStudent = findMostSimilarStudent(inputFeatures, features, minMax);
        const studentName = studentNames[similarStudent] || similarStudent;
        
        // Update UI
        document.getElementById('score-display').textContent = grade.toFixed(2);
        document.getElementById('stress-type').textContent = `Similar to ${studentName}`;
        updateBarDisplay(grade);
    } catch (error) {
        console.error("Prediction error:", error);
        alert("Error making prediction. Please try again.");
    }
}

// Add event listener to predict button
document.getElementById("predict-button").addEventListener("click", predict);

export { updateGaugeDisplay };