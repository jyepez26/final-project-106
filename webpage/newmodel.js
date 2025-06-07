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

async function trainModel() {
  const hrData = (await loadData('../data/HR_df.csv')).filter(Boolean);
  const edaData = (await loadData('../data/EDA_df.csv')).filter(Boolean);
  const tempData = (await loadTempData('../data/TEMP_df.csv')).filter(Boolean);

  function groupByStudent(data) {
    const grouped = {};
    data.forEach(({ student, value }) => {
      if (!grouped[student]) grouped[student] = [];
      grouped[student].push(value);
    });
    return grouped;
  }

  const groupedTemp = groupByStudent(tempData);
  const groupedHr = groupByStudent(hrData);
  const groupedEda = groupByStudent(edaData);

  const mean = arr => arr.reduce((sum, v) => sum + v, 0) / arr.length;
  const std = arr => {
    const m = mean(arr);
    return Math.sqrt(arr.reduce((acc, val) => acc + (val - m) ** 2, 0) / arr.length);
  };

  const students = Object.keys(groupedTemp);
  const features = students.map(student => {
    const tempVals = groupedTemp[student] || [];
    const hrVals = groupedHr[student] || [];
    const edaVals = groupedEda[student] || [];

    return {
      student,
      tempMean: mean(tempVals),
      tempStd: std(tempVals),
      hrMean: mean(hrVals),
      hrStd: std(hrVals),
      edaMean: mean(edaVals),
      edaStd: std(edaVals),
    };
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

  const grades = {
    'S1': 0.84, 'S2': 0.86, 'S3': 0.87, 'S4': 0.75, 'S5': 0.74,
    'S6': 0.74, 'S7': 0.51, 'S8': 0.91, 'S9': 0.61, 'S10': 0.70,
  };

  const X = features.map(f => [
    f.tempMean, f.tempStd,
    f.hrMean, f.hrStd,
    f.edaMean, f.edaStd,
    f.tempMeanU, f.hrMeanU, f.edaMeanU,
  ]);

  const gradeValues = Object.values(grades);
  const minGrade = Math.min(...gradeValues);
  const maxGrade = Math.max(...gradeValues);

  const yNormalized = features.map(f => {
    const g = grades[f.student];
    return (g - minGrade) / (maxGrade - minGrade);
  });

  const xTensor = tf.tensor2d(X);
  const yTensor = tf.tensor2d(yNormalized, [yNormalized.length, 1]);

  const model = tf.sequential();
  model.add(tf.layers.dense({ inputShape: [X[0].length], units: 10, activation: 'relu' }));
  model.add(tf.layers.dense({ units: 1 }));

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

  console.log("done training!");
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
  const rawPredictions = model.predict(inputTensor); // Tensor
  const normalizedPredictions = rawPredictions.sigmoid(); // Apply sigmoid manually

  const predictionNormalized = (await normalizedPredictions.data())[0];
  const prediction = predictionNormalized * (minMax.gradeMax - minMax.gradeMin) + minMax.gradeMin;

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
    tempMean: normalize(f.tempMean, tempMeanMin, tempMeanMax),
    hrMean: normalize(f.hrMean, hrMeanMin, hrMeanMax),
    edaMean: normalize(f.edaMean, edaMeanMin, edaMeanMax),
  }));

  let minDist = Infinity;
  let closestStudent = null;

  normFeatures.forEach(f => {
    const dist = Math.sqrt(
      (normInput.tempMean - f.tempMean) ** 2 +
      (normInput.hrMean - f.hrMean) ** 2 +
      (normInput.edaMean - f.edaMean) ** 2
    );
    if (dist < minDist) {
      minDist = dist;
      closestStudent = f.student;
    }
  });

  return closestStudent;
}

export { trainModel, predictGrade, findMostSimilarStudent };
