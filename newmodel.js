import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

// Load CSV data
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

// Load grades
const gradesCsv = await d3.csv("./data/grades_df.csv");
const gradesByTest = {};

// e.g. gradesByTest["S1_Midterm 1"] = 0.78;
gradesCsv.forEach(row => {
  const student = row.Student;
  gradesByTest[`${student}_Midterm 1`] = parseFloat(row["Midterm 1"]);
  gradesByTest[`${student}_Midterm 2`] = parseFloat(row["Midterm 2"]);
  gradesByTest[`${student}_Final`] = parseFloat(row["Final"]);
});

async function trainModel() {
  const hrData = (await loadData('./data/HR_df.csv')).filter(Boolean);
  const edaData = (await loadData('./data/EDA_df.csv')).filter(Boolean);
  const tempData = (await loadTempData('./data/TEMP_df.csv')).filter(Boolean);

  function groupByStudentAndTest(data) {
    const grouped = {};
    data.forEach(({ student, test, value }) => {
      const key = `${student}_${test}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(value);
    });
    return grouped;
  }

  const groupedTemp = groupByStudentAndTest(tempData);
  const groupedHr = groupByStudentAndTest(hrData);
  const groupedEda = groupByStudentAndTest(edaData);

  const mean = arr => arr.reduce((sum, v) => sum + v, 0) / arr.length;
  const std = arr => {
    const m = mean(arr);
    return Math.sqrt(arr.reduce((acc, val) => acc + (val - m) ** 2, 0) / arr.length);
  };

  const bootstrapStudentStats = (studentTestKey, nSamples = 5, sampleRatio = 0.7) => {
    const tempVals = groupedTemp[studentTestKey] || [];
    const hrVals = groupedHr[studentTestKey] || [];
    const edaVals = groupedEda[studentTestKey] || [];
  
    const samples = [];
  
    for (let i = 0; i < nSamples; i++) {
      const tempSample = d3.shuffle(tempVals).slice(0, Math.floor(tempVals.length * sampleRatio));
      const hrSample = d3.shuffle(hrVals).slice(0, Math.floor(hrVals.length * sampleRatio));
      const edaSample = d3.shuffle(edaVals).slice(0, Math.floor(edaVals.length * sampleRatio));
  
      samples.push({
        student: studentTestKey + `_sample${i}`,
        originalStudentTest: studentTestKey,
        tempMean: mean(tempSample),
        tempStd: std(tempSample),
        hrMean: mean(hrSample),
        hrStd: std(hrSample),
        edaMean: mean(edaSample),
        edaStd: std(edaSample),
      });
    }
  
    return samples;
  };

  const sampleKeys = Object.keys(groupedTemp); // keys like "S1_Midterm 1"
  let features = [];

  sampleKeys.forEach(key => {
    const studentSamples = bootstrapStudentStats(key, 10); // 5 bootstraps per test
    features.push(...studentSamples);
  });

  const normalize = (val, min, max) => (val - min) / (max - min);
  const uShape = (x, center = 0.5) => (x - center) ** 2;

  const tempMeanMin = Math.min(...features.map(f => f.tempMean));
  const tempMeanMax = Math.max(...features.map(f => f.tempMean));
  const hrMeanMin = Math.min(...features.map(f => f.hrMean));
  const hrMeanMax = Math.max(...features.map(f => f.hrMean));
  const edaMeanMin = Math.min(...features.map(f => f.edaMean));
  const edaMeanMax = Math.max(...features.map(f => f.edaMean));

  features.forEach(f => {
    const tempNorm = normalize(f.tempMean, tempMeanMin, tempMeanMax);
    const hrNorm = normalize(f.hrMean, hrMeanMin, hrMeanMax);
    const edaNorm = normalize(f.edaMean, edaMeanMin, edaMeanMax);

    f.tempMeanU = uShape(tempNorm);
    f.hrMeanU = uShape(hrNorm);
    f.edaMeanU = uShape(edaNorm);
  });

  const gradeValues = Object.values(gradesByTest);
  const minGrade = Math.min(...gradeValues);
  const maxGrade = Math.max(...gradeValues);

  const yNormalized = features.map(f => {
    const g = gradesByTest[f.originalStudentTest];
    return (g - minGrade) / (maxGrade - minGrade);
  });

  console.log(yNormalized);

  const X = features.map(f => [
    f.tempMean, f.tempStd,
    f.hrMean, f.hrStd,
    f.edaMean, f.edaStd,
    f.tempMeanU, f.hrMeanU, f.edaMeanU,
  ]);

  // console.log(X);
  
  // const yNormalized = features.map(f => {
  //   const g = grades[f.originalStudent]; // Use the original student for grade
  //   return (g - minGrade) / (maxGrade - minGrade);
  // });

  const xTensor = tf.tensor2d(X);
  const yTensor = tf.tensor2d(yNormalized, [yNormalized.length, 1]);

  const model = tf.sequential();
  model.add(tf.layers.dense({ inputShape: [X[0].length], units: 10, activation: 'relu' }));
  model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }));

  model.compile({ optimizer: 'adam', loss: 'meanSquaredError' });

  await model.fit(xTensor, yTensor, {
    epochs: 100,
    callbacks: tf.callbacks.earlyStopping({ monitor: 'loss', patience: 10 }),
  });

  const minMax = {
    tempMeanMin,
    tempMeanMax,
    hrMeanMin,
    hrMeanMax,
    edaMeanMin,
    edaMeanMax,
    gradeMin: minGrade,
    gradeMax: maxGrade,
  };

  console.log("done training with bootstrapped data!");
  return { model, minMax, features };
}

async function predictGrade(model, features, minMax) {
  const inputFeatures = [
    features.tempMean,
    features.tempStd,
    features.hrMean,
    features.hrStd,
    features.edaMean,
    features.edaStd,
    features.tempMeanU,
    features.hrMeanU,
    features.edaMeanU,
  ];

  console.log("Input to model:", inputFeatures);

  const inputTensor = tf.tensor2d([inputFeatures]);
  // const predictionTensor = model.predict(inputTensor);
  const rawPredictions = model.predict(inputTensor);
  const predictionNormalized = (await rawPredictions.data())[0];

  console.log("Normalized prediction", predictionNormalized);

  // Clamp between 0 and 1 (just in case)
  const clampedPrediction = Math.min(Math.max(predictionNormalized, 0), 1);

  const prediction = clampedPrediction * (minMax.gradeMax - minMax.gradeMin) + minMax.gradeMin;

  console.log("Predicted grade:", prediction);
  return prediction;
}

function findMostSimilarStudent(input, features, minMax) {
  const { tempMeanMin, tempMeanMax, hrMeanMin, hrMeanMax, edaMeanMin, edaMeanMax } = minMax;

  const normalize = (val, min, max) => (val - min) / (max - min);

  // Normalize input
  const normInput = {
    tempMean: normalize(input.tempMean, tempMeanMin, tempMeanMax),
    hrMean: normalize(input.hrMean, hrMeanMin, hrMeanMax),
    edaMean: normalize(input.edaMean, edaMeanMin, edaMeanMax),
  };

  // Normalize features
  const normFeatures = features.map(f => ({
    student: f.student,
    originalStudentTest: f.originalStudentTest,
    tempMean: normalize(f.tempMean, tempMeanMin, tempMeanMax),
    hrMean: normalize(f.hrMean, hrMeanMin, hrMeanMax),
    edaMean: normalize(f.edaMean, edaMeanMin, edaMeanMax),
  }));

  let minDist = Infinity;
  let closestFeature = null;

  normFeatures.forEach(f => {
    const dist = Math.sqrt(
      (normInput.tempMean - f.tempMean) ** 2 +
      (normInput.hrMean - f.hrMean) ** 2 +
      (normInput.edaMean - f.edaMean) ** 2
    );
    if (dist < minDist) {
      minDist = dist;
      closestFeature = f;
    }
  });

  return closestFeature;
}

export function getGradeForStudentTest(studentTestKey) {
  return gradesByTest[studentTestKey];
}

export { trainModel, predictGrade, findMostSimilarStudent };
