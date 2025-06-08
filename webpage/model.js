import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
// import * as tf from '@tensorflow/tfjs';

// 1. Data Loading Functions
export async function loadData(csv) {
  return await d3.csv(csv, (row, idx) => ({
    date: idx,
    value: Number(row.data),
    student: row.student,
    test: row.test,
  }));
}

export async function loadTempData(csv) {
  return await d3.csv(csv, (row, idx) => ({
    date: idx,
    value: Number(36 + (((row.temp) - 12.51) / (36.07 - 12.51)) * 2),
    student: row.student,
    test: row.test,
  }));
}

// 2. Helper: Group by student and test
function groupByStudentTest(data) {
  const grouped = {};
  data.forEach(d => {
    const key = `${d.student}_${d.test}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(d.value);
  });
  return grouped;
}

// 3. Helper: Compute average
function average(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

// Load and group data
const hrData = await loadData('../data/HR_df.csv');
const edaData = await loadData('../data/EDA_df.csv');
const tempData = await loadTempData('../data/TEMP_df.csv');

const groupedHR = groupByStudentTest(hrData);
const groupedEDA = groupByStudentTest(edaData);
const groupedTEMP = groupByStudentTest(tempData);

const allKeys = Object.keys(groupedHR);

// 4. Create input features (mean HR, EDA, Temp)
const X = [];
const studentTestKeys = [];

for (const key of allKeys) {
  const hr = average(groupedHR[key]);
  const eda = average(groupedEDA[key]);
  const temp = average(groupedTEMP[key]);

  const combined = [hr, eda, temp]; // just 3 features now
  X.push(combined);
  studentTestKeys.push(key);
}

// 5. Load grades and build labels
const gradeDataRaw = await d3.csv('../data/grades_df.csv');

const gradeMap = {};
gradeDataRaw.forEach(row => {
  const student = row.Student;
  gradeMap[`${student}_Midterm 1`] = Number(row['Midterm 1']);
  gradeMap[`${student}_Midterm 2`] = Number(row['Midterm 2']);
  gradeMap[`${student}_Final`] = Number(row['Final']);
});

const y = studentTestKeys.map(key => {
  if (!(key in gradeMap)) throw new Error(`Missing grade for ${key}`);
  return gradeMap[key];
});

// 6. Normalize features
function normalizeFeatures(X) {
  const numFeatures = X[0].length;
  const means = Array(numFeatures).fill(0);
  const stds = Array(numFeatures).fill(0);

  for (let i = 0; i < numFeatures; i++) {
    const vals = X.map(row => row[i]);
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const std = Math.sqrt(vals.map(x => (x - mean) ** 2).reduce((a, b) => a + b, 0) / vals.length);
    means[i] = mean;
    stds[i] = std || 1;
  }

  const X_norm = X.map(row =>
    row.map((val, i) => (val - means[i]) / stds[i])
  );

  return { X_norm, means, stds };
}

const { X_norm, means, stds } = normalizeFeatures(X);

// Normalize grades
const minGrade = Math.min(...y);
const maxGrade = Math.max(...y);
const y_norm = y.map(grade => (grade - minGrade) / (maxGrade - minGrade));

// 7. Train model
const xs = tf.tensor2d(X_norm);
const ys = tf.tensor1d(y_norm);

const model = tf.sequential();
model.add(tf.layers.dense({
  inputShape: [3],
  units: 1,
  useBias: true,
}));

model.compile({
  loss: 'meanSquaredError',
  optimizer: tf.train.adam(),
});

await model.fit(xs, ys, {
  epochs: 200,
  validationSplit: 0.2,
  shuffle: true,
  callbacks: tf.callbacks.earlyStopping({
    monitor: 'val_loss',
    patience: 10,
  })
});

// 8. Prediction Function for New Input
export async function predictGrade(hr, eda, temp) {
  const input = [
    (hr - means[0]) / stds[0],
    (eda - means[1]) / stds[1],
    (temp - means[2]) / stds[2],
  ];

  const inputTensor = tf.tensor2d([input]);
  const prediction = model.predict(inputTensor);
  const [val] = await prediction.array();

  const scaled = val[0] * (maxGrade - minGrade) + minGrade;
  return Math.min(Math.max(scaled, minGrade), maxGrade);
}

// Example usage:
const grade = await predictGrade(100, 5, 37);
console.log("Predicted grade:", grade);