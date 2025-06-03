import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

export async function loadData(csvPath) {
    const data = await d3.csv(csvPath, (row, idx) => ({
      time: idx,
      values: Number(row.data), // or just +row.line
      student: row.student,
      test: row.test,
    }));
    return data;
}

export async function loadGrades(csvPath) {
  const data = await d3.csv(csvPath, (row, idx) => ({
    student: row.student,
    score: +row.score,
  }));
  return data
}
loadData();
