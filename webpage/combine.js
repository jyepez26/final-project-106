import { updateGauge } from './gauge.js';
import { trainModel, predictGrade, findMostSimilarStudent } from './newmodel.js';

const { model, minMax, features } = await trainModel();

async function run() {
  const temp = parseFloat(document.getElementById('tempInput').value);
  const hr = parseFloat(document.getElementById('hrInput').value);
  const eda = parseFloat(document.getElementById('edaInput').value);

  const newStudent = {
    tempMean: temp,
    tempStd: 0.2,
    hrMean: hr,
    hrStd: 3,
    edaMean: eda,
    edaStd: 0.1,
  };

  // Find the most similar student
  const similarStudent = findMostSimilarStudent(newStudent, features, minMax);
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
