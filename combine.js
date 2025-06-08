import { updateGauge } from './gauge.js';
import { trainModel, predictGrade, findMostSimilarStudent } from './newmodel.js';
import { mapToName } from './title.js';

const { model, minMax, features } = await trainModel();

async function run() {
  const temp = parseFloat(document.getElementById('tempInput').value);
  const hr = parseFloat(document.getElementById('hrInput').value);
  const eda = parseFloat(document.getElementById('edaInput').value);

  const normalize = (val, min, max) => (val - min) / (max - min);
  const uShape = x => (x - 0.5) ** 2;

  const normTemp = normalize(temp, minMax.tempMeanMin, minMax.tempMeanMax);
  const normHr = normalize(hr, minMax.hrMeanMin, minMax.hrMeanMax);
  const normEda = normalize(eda, minMax.edaMeanMin, minMax.edaMeanMax);

  function randomUniform(min, max) {
    return Math.random() * (max - min) + min;
  }

  console.log(`Random predictoin ${randomUniform(0.1, 0.7)}`);

  const newStudent = {
    tempMean: temp,
    tempStd: randomUniform(0.1, 0.7),
    hrMean: hr,
    hrStd: randomUniform(15, 35),
    edaMean: eda,
    edaStd: randomUniform(0.07, 1),
    tempMeanU: uShape(normTemp),
    hrMeanU: uShape(normHr),
    edaMeanU: uShape(normEda),
  };

  // Find the most similar student
  const similarStudent = mapToName(findMostSimilarStudent(newStudent, features, minMax));
  console.log("Most similar student:", similarStudent);

  // Predict grade for new student
  const grade = await predictGrade(model, newStudent, minMax);
  console.log(`Predicted grade: ${grade.toFixed(2)}`);

  document.getElementById('gradeResult').textContent = grade.toFixed(2);
  document.getElementById('similarStudent').textContent = similarStudent;

  updateGauge(grade);
}

document.getElementById("predict-button").addEventListener("click", () => {
  run();
});