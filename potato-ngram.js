async function fetchNgramData() {
  try {
    const response = await fetch("./data/json/potato-ngram.json");
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error("Error loading ngram data:", error);
    return null;
  }
}

function createNgramChart(data) {
  const years = data.slice(1).map((entry) => entry[0]);
  const frequencies = data.slice(1).map((entry) => entry[2]);

  const ctx = document.getElementById("ngramChart").getContext("2d");

  const maxY = 0.000011143181966742;

  // Create vertical line datasets
  const createVerticalLine = (year) => ({
    label: `Line ${year}`,
    data: [
      { x: year, y: 0 },
      { x: year, y: maxY },
    ],
    borderColor: "rgba(255, 255, 255, 0.5)",
    borderWidth: 1,
    borderDash: [5, 5],
    pointStyle: false,
  });

  // Create special points dataset
  const specialPoints = {
    label: "Events",
    data: [
      { x: 1845, y: maxY, event: "The Great Irish Famine, 1845-1852" },
      { x: 1852, y: maxY, event: "The Great Irish Famine, 1845-1852" },
      { x: 1914, y: maxY, event: "WWI, 1914-1918" },
      { x: 1918, y: maxY, event: "WWI, 1914-1918" },
      { x: 1939, y: maxY, event: "WWII, 1939-1945" },
      { x: 1945, y: maxY, event: "WWII, 1939-1945" },
    ],
    backgroundColor: "white",
    borderColor: "#FF69B4",
    borderWidth: 2,
    pointRadius: 5,
    pointHoverRadius: 8,
    showLine: false,
  };

  const chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: years,
      datasets: [
        {
          label: "Frequency",
          data: frequencies,
          borderColor: "#FF69B4",
          backgroundColor: "rgba(255, 105, 180, 0.1)",
          borderWidth: 2,
          pointStyle: false,
          fill: true,
          tension: 0.3,
        },
        createVerticalLine(1845),
        createVerticalLine(1852),
        createVerticalLine(1914),
        createVerticalLine(1918),
        createVerticalLine(1939),
        createVerticalLine(1945),
        specialPoints,
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: {
          top: 50,
        },
      },
      plugins: {
        title: {
          display: true,
          text: 'Frequency of the word "potato" in English speaking corpus from 1597 to 2021',
          color: "white",
          font: {
            family: "Fira Code",
            size: 16,
            weight: "normal",
          },
          padding: {
            bottom: 30,
          },
        },
        legend: {
          display: false,
        },
        tooltip: {
          displayColors: false,
          callbacks: {
            label: function (context) {
              if (context.dataset.label === "Events") {
                return context.raw.event;
              }
              return `Frequency: ${context.raw.toExponential(10)}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: {
            color: "rgba(255, 255, 255, 0.1)",
          },
          ticks: {
            color: "rgba(255, 255, 255, 0.7)",
            maxRotation: 45,
            minRotation: 45,
            maxTicksLimit: 20,
          },
        },
        y: {
          grid: {
            color: "rgba(255, 255, 255, 0.1)",
          },
          ticks: {
            color: "rgba(255, 255, 255, 0.7)",
            callback: function (value) {
              return value.toExponential(2);
            },
          },
        },
      },
    },
  });
}

async function initializeChart() {
  const data = await fetchNgramData();
  if (data) {
    createNgramChart(data);
  }
}

// Initialize the chart when the page loads
document.addEventListener("DOMContentLoaded", initializeChart);
