import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

export async function loadData() {
    const data = await d3.csv('HR_df.csv', (row, idx) => ({
      time: idx,
      values: Number(row.data), // or just +row.line
      student: row.student,
      test: row.test,
    }));
    return data;
}
loadData();
