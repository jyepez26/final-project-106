import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import { trainModel, predictGrade, findMostSimilarStudent } from './newmodel.js';

// Initialize the model
let model, features, minMax;
trainModel().then(result => {
  model = result.model;
  features = result.features;
  minMax = result.minMax;
  console.log("Model loaded successfully!");
});

// Calculate the circumference of the circle
const radius = 90;
const circumference = 2 * Math.PI * radius;

// Set up the progress circle
const progressCircle = d3.select(".score-progress")
  .attr("stroke-dasharray", circumference)
  .attr("stroke-dashoffset", circumference);

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

// Update score visualization
function updateScoreDisplay(score) {
  // Calculate the progress offset
  const progress = circumference - (score * circumference);
  
  // Update the progress circle
  progressCircle
    .transition()
    .duration(1000)
    .attr("stroke-dashoffset", progress)
    .attr("stroke", getColorForScore(score));
  
  // Update the score text
  d3.select(".score-text")
    .transition()
    .duration(1000)
    .tween("text", function() {
      const that = d3.select(this);
      const i = d3.interpolateNumber(+that.text() || 0, score);
      return function(t) {
        that.text(i(t).toFixed(2));
      };
    });
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
    
    // Update UI
    document.getElementById('score-display').textContent = grade.toFixed(2);
    document.getElementById('stress-type').textContent = `Similar to ${similarStudent}`;
    updateScoreDisplay(grade);
  } catch (error) {
    console.error("Prediction error:", error);
    alert("Error making prediction. Please try again.");
  }
}

// Add event listener to predict button
document.getElementById("predict-button").addEventListener("click", predict);

export { updateScoreDisplay };