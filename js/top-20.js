Chart.register(ChartDataLabels);

function convertCountryName(faoName) {
  const nameMap = {
    "China, mainland": "China",
    "Netherlands (Kingdom of the)": "Netherlands",
    Türkiye: "Turkey",
    "United Kingdom of Great Britain and Northern Ireland": "United Kingdom",
    "United States of America": "United States",
    "Russian Federation": "Russia",
  };
  return nameMap[faoName] || faoName;
}

async function loadData() {
  const response = await fetch("../data/json/potato-production-top-20.json");
  const json = await response.json();
  return json.data;
}

function processData(data) {
  const [headers, ...rows] = data;

  // Create an index map for the headers
  const headerIndex = {};
  headers.forEach((header, index) => {
    headerIndex[header] = index;
  });

  // Process the data into the format we need
  return rows.map((row) => ({
    country: convertCountryName(row[headerIndex["Country"]]),
    prod2021: row[headerIndex["ProdR2021"]],
    prod1961: row[headerIndex["Prod1961"]],
    changePct: row[headerIndex["ChangePct"]],
    popRank: row[headerIndex["PoPRank"]],
    gdpRank: row[headerIndex["GDPRank"]],
    wasUSSR: row[headerIndex["Prod1961"]] === "NA",
  }));
}

function createBubbleChart(data) {
  const ctx = document.getElementById("bubbleChart").getContext("2d");

  // Create datasets for 1961 and 2021
  const dataset2021 = {
    label: "2021 Production",
    data: data.map((country) => ({
      x: country.popRank,
      y: country.gdpRank,
      r: Math.sqrt(country.prod2021) / 150, // Scale the radius
      country: country.country,
      production: country.prod2021,
      year: 2021,
      wasUSSR: country.wasUSSR,
    })),
    backgroundColor: "rgba(255, 105, 180, 0.6)", // hotpink with transparency
    borderColor: (context) => {
      // Check if the country was part of USSR
      const point = context.raw;
      return point.wasUSSR ? "#CC0000" : "rgba(255, 105, 180, 1)";
    },
    borderWidth: (context) => {
      // Make USSR country borders slightly thicker
      const point = context.raw;
      return point.wasUSSR ? 2 : 1;
    },
  };

  const dataset1961 = {
    label: "1961 Production",
    data: data
      .filter((country) => !country.wasUSSR)
      .map((country) => ({
        x: country.popRank,
        y: country.gdpRank,
        r: Math.sqrt(country.prod1961) / 150, // Scale the radius
        country: country.country,
        production: country.prod1961,
        year: 1961,
      })),
    backgroundColor: "rgba(255, 255, 255, 0.6)",
    borderColor: "rgba(255, 255, 255, 1)",
    borderWidth: 1,
  };

  const chart = new Chart(ctx, {
    type: "bubble",
    data: {
      datasets: [dataset1961, dataset2021],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          title: {
            display: true,
            text: "Population Rank (1 = smallest)",
            color: "white",
          },
          grid: {
            color: "rgba(255, 255, 255, 0.1)",
          },
          ticks: {
            color: "white",
          },
        },
        y: {
          title: {
            display: true,
            text: "GDP Rank (1 = smallest)",
            color: "white",
          },
          grid: {
            color: "rgba(255, 255, 255, 0.1)",
          },
          ticks: {
            color: "white",
          },
        },
      },
      plugins: {
        tooltip: {
          enabled: false,
          external: function (context) {
            let tooltipEl = document.getElementById("chartjs-tooltip");
            if (!tooltipEl) {
              tooltipEl = document.createElement("div");
              tooltipEl.id = "chartjs-tooltip";
              tooltipEl.style.background = "rgba(0, 0, 0, 0.75)";
              tooltipEl.style.borderRadius = "8px";
              tooltipEl.style.color = "white";
              tooltipEl.style.padding = "10px";
              tooltipEl.style.pointerEvents = "none";
              tooltipEl.style.position = "absolute";
              tooltipEl.style.transition = "all .1s ease";
              document.body.appendChild(tooltipEl);
            }

            if (context.tooltip.opacity === 0) {
              tooltipEl.style.opacity = 0;
              return;
            }

            const dataPoint = context.tooltip.dataPoints[0].raw;
            const countryData = data.find(
              (d) => d.country === dataPoint.country
            );

            // Calculate rank here
            const sortedData = [...data].sort(
              (a, b) => b.prod2021 - a.prod2021
            );
            const rank =
              sortedData.findIndex((d) => d.country === dataPoint.country) + 1;

            // Format both years' production data
            const prod2021 = countryData.prod2021.toLocaleString();
            const prod1961 =
              countryData.prod1961 === "NA"
                ? "NA"
                : countryData.prod1961.toLocaleString();

            let innerHtml = `
              <div style="font-family: Fira Code;">
                <div style="display: flex; align-items: center; gap: 5px;">
                  <span>${dataPoint.country}</span>
                  ${
                    countryData.wasUSSR
                      ? '<img src="../assets/logos/hammer-and-sickle/hammer-and-sickle-red.png" style="width: 16px; height: 16px;">'
                      : ""
                  }
                </div>
                <div style="margin-top: 4px;">Rank: #${rank}</div>
                <div style="margin-top: 4px;">2021: ${prod2021} tonnes</div>
                <div style="margin-top: 2px;">1961: ${prod1961} tonnes</div>
            `;

            if (countryData.changePct !== "NA") {
              innerHtml += `<div style="margin-top: 4px;">Change: ${countryData.changePct}%</div>`;
            }

            innerHtml += "</div>";
            tooltipEl.innerHTML = innerHtml;

            // Get the chart's position on the page
            const position = context.chart.canvas.getBoundingClientRect();

            // Calculate position relative to the chart
            const tooltipWidth = tooltipEl.offsetWidth;
            const tooltipHeight = tooltipEl.offsetHeight;

            tooltipEl.style.opacity = 1;
            tooltipEl.style.position = "absolute";
            tooltipEl.style.left =
              position.left +
              window.pageXOffset +
              context.tooltip.caretX -
              tooltipWidth / 2 +
              "px";
            tooltipEl.style.top =
              position.top +
              window.pageYOffset +
              context.tooltip.caretY -
              tooltipHeight -
              8 +
              "px";
          },
        },
        legend: {
          labels: {
            color: "white",
            font: {
              family: "Fira Code",
            },
          },
        },
        datalabels: {
          display: false,
        },
      },
    },
  });
}

function createChangeChart(data) {
  const ctx = document.getElementById("changeChart").getContext("2d");

  // Filter out USSR countries and sort by change percentage
  const sortedData = data
    .filter((country) => country.changePct !== "NA")
    .sort((a, b) => b.changePct - a.changePct);

  const chart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: sortedData.map((country) => country.country),
      datasets: [
        {
          label: "Change in Production (%)",
          data: sortedData.map((country) => country.changePct),
          backgroundColor: sortedData.map((country) => {
            // Use hotpink for positive changes, white for negative
            return country.changePct >= 0
              ? "rgba(255, 105, 180, 0.6)"
              : "rgba(255, 255, 255, 0.6)";
          }),
          borderColor: sortedData.map((country) => {
            return country.changePct >= 0
              ? "rgba(255, 105, 180, 1)"
              : "rgba(255, 255, 255, 1)";
          }),
          hoverBackgroundColor: sortedData.map((country) => {
            return country.changePct >= 0
              ? "rgba(255, 105, 180, 1)"
              : "rgba(255, 255, 255, 1)";
          }),
          borderWidth: 1,
          borderRadius: 7,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: "y", // Make it a horizontal bar chart for better label readability
      scales: {
        x: {
          grid: {
            color: "rgba(255, 255, 255, 0.1)",
          },
          ticks: {
            color: "white",
            callback: function (value) {
              return value + "%";
            },
          },
        },
        y: {
          grid: {
            display: false,
          },
          ticks: {
            color: "white",
            font: {
              family: "Fira Code",
            },
          },
        },
      },
      plugins: {
        tooltip: {
          enabled: false,
          external: function (context) {
            let tooltipEl = document.getElementById("chartjs-tooltip-bar");
            if (!tooltipEl) {
              tooltipEl = document.createElement("div");
              tooltipEl.id = "chartjs-tooltip-bar";
              tooltipEl.style.background = "rgba(0, 0, 0, 0.75)";
              tooltipEl.style.borderRadius = "8px";
              tooltipEl.style.color = "white";
              tooltipEl.style.padding = "10px";
              tooltipEl.style.pointerEvents = "none";
              tooltipEl.style.position = "absolute";
              tooltipEl.style.transition = "all .1s ease";
              document.body.appendChild(tooltipEl);
            }

            if (context.tooltip.opacity === 0) {
              tooltipEl.style.opacity = 0;
              return;
            }

            const dataPoint = context.tooltip.dataPoints[0];

            let innerHtml = `
              <div style="font-family: Fira Code;">
                <div style="display: flex; align-items: center; gap: 5px;">
                  <span>${dataPoint.label}</span>
                </div>
                <div style="margin-top: 4px;">Change: ${dataPoint.raw}%</div>
              </div>
            `;

            tooltipEl.innerHTML = innerHtml;

            // Get the chart's position on the page
            const position = context.chart.canvas.getBoundingClientRect();

            // Calculate position relative to the chart
            const tooltipWidth = tooltipEl.offsetWidth;
            const tooltipHeight = tooltipEl.offsetHeight;

            tooltipEl.style.opacity = 1;
            tooltipEl.style.position = "absolute";
            tooltipEl.style.left =
              position.left +
              window.pageXOffset +
              context.tooltip.caretX -
              tooltipWidth / 2 +
              "px";
            tooltipEl.style.top =
              position.top +
              window.pageYOffset +
              context.tooltip.caretY -
              tooltipHeight -
              8 +
              "px";
          },
        },
        legend: {
          display: false,
        },
        datalabels: {
          display: false,
        },
      },
    },
  });
}

function createProductionTable(data) {
  // Sort data by 2021 production (descending)
  const sortedData = [...data].sort((a, b) => b.prod2021 - a.prod2021);

  const tableBody = document.getElementById("productionTable");

  sortedData.forEach((country, index) => {
    const row = document.createElement("tr");

    // Add USSR symbol for former USSR countries
    const countryName = country.wasUSSR
      ? `${country.country} <img src="../assets/logos/hammer-and-sickle/hammer-and-sickle-red.png" 
         alt="USSR" style="display: inline; width: 16px; height: 16px; vertical-align: middle;">`
      : country.country;

    row.innerHTML = `
      <td class="py-3 px-4">${index + 1}</td>
      <td class="py-3 px-4">${countryName}</td>
      <td class="py-3 px-4 text-right">${country.prod2021.toLocaleString()}</td>
    `;

    tableBody.appendChild(row);
  });
}

function setupTableToggle() {
  const toggleBtn = document.getElementById("toggleTable");
  const tableContainer = document.getElementById("tableContainer");
  let isOpen = false;

  toggleBtn.addEventListener("click", () => {
    isOpen = !isOpen;
    toggleBtn.textContent = isOpen
      ? "Hide Top 20 Production Table"
      : "Show Top 20 Production Table";

    // Set max-height with a larger value to ensure full expansion
    if (isOpen) {
      // First make sure the container is visible
      tableContainer.style.display = "block";
      // Use requestAnimationFrame to ensure display change has taken effect
      requestAnimationFrame(() => {
        tableContainer.style.maxHeight =
          tableContainer.scrollHeight + 200 + "px";
      });
    } else {
      tableContainer.style.maxHeight = "0";
      // Hide the container after transition ends to prevent scrolling issues
      tableContainer.addEventListener("transitionend", function handler() {
        if (!isOpen) tableContainer.style.display = "none";
        tableContainer.removeEventListener("transitionend", handler);
      });
    }
  });
}

async function init() {
  const rawData = await loadData();
  const processedData = processData(rawData);
  createProductionTable(processedData);
  setupTableToggle();
  createBubbleChart(processedData);
  createChangeChart(processedData);
}

init();
