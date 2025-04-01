import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.174/build/three.module.js";
import {
  Chart,
  LineController,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Legend,
  Filler,
} from "https://cdn.jsdelivr.net/npm/chart.js@4.4.1/+esm";

// Register Chart.js components
Chart.register(
  LineController,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Legend,
  Filler
);

// Add this near the top of the file with other global variables
let countriesData;
let selectedBox = null;

// Add this fetch for the countries data
async function loadCountries() {
  const response = await fetch("./data/json/countries.json");
  return await response.json();
}

async function loadShader(url) {
  const response = await fetch(url);
  return await response.text();
}

// Replace the direct imports
let vertexShader;
let fragmentShader;
let atmosphereVertexShader;
let atmosphereFragmentShader;

let sphere;
let atmosphere;
let box;

let group = new THREE.Group();

let starGeometry = new THREE.BufferGeometry();
let starMaterial = new THREE.PointsMaterial({
  color: 0xffffff,
  size: 0.1,
  sizeAttenuation: true,
});

// Create stars in a sphere around the globe
let starVertices = [];
const starCount = 1000;
const starRadius = 50;

for (let i = 0; i < starCount; i++) {
  const phi = Math.acos(-1 + (2 * i) / starCount);
  const theta = Math.sqrt(starCount * Math.PI) * phi;

  const x = Math.random() * starRadius * Math.sin(phi) * Math.cos(theta);
  const y = starRadius * Math.sin(phi) * Math.sin(theta);
  const z = starRadius * Math.cos(phi);

  if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
    starVertices.push(x, y, z);
  }
}

if (starVertices.length > 0) {
  starGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(starVertices, 3)
  );
}

let mouse = {
  x: undefined,
  y: undefined,
  down: false,
  xPrev: undefined,
  yPrev: undefined,
};

group.rotation.offset = {
  x: 0,
  y: 0,
};

const scene = new THREE.Scene();

let canvasContainer = document.querySelector("#canvas-container");

let camera = new THREE.PerspectiveCamera(
  75,
  canvasContainer.offsetWidth / canvasContainer.offsetHeight,
  0.1,
  1000
);

scene.add(camera);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  canvas: document.querySelector("#canvas"),
});

renderer.setPixelRatio(Math.min(window.devicePixelRatio));

// console.log(scene);
// console.log(camera);
// console.log(renderer);

// renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setSize(canvasContainer.offsetWidth, canvasContainer.offsetHeight);
// document.body.appendChild(renderer.domElement);

//  create a sphere
const geometry = new THREE.SphereGeometry(5, 50, 50);
// const material = new THREE.MeshBasicMaterial({
//   map: new THREE.TextureLoader().load("./globe.jpg"),
// });

// Load shaders and create material
async function init() {
  // Load all required data
  const [
    loadedCountriesData, // renamed to avoid shadowing
    potatoData,
    areaYieldData,
    vertexShaderText,
    fragmentShaderText,
    atmosphereVertexShaderText,
    atmosphereFragmentShaderText,
  ] = await Promise.all([
    loadCountries(),
    loadPotatoData(),
    loadAreaAndYieldData(),
    loadShader("./shaders/vertex.glsl"),
    loadShader("./shaders/fragment.glsl"),
    loadShader("./shaders/atmosphereVertex.glsl"),
    loadShader("./shaders/atmosphereFragment.glsl"),
  ]);

  // Assign to global variable
  countriesData = loadedCountriesData;

  // console.log(countriesData);
  // console.log(potatoData);

  // Assign shader text to variables
  vertexShader = vertexShaderText;
  fragmentShader = fragmentShaderText;
  atmosphereVertexShader = atmosphereVertexShaderText;
  atmosphereFragmentShader = atmosphereFragmentShaderText;

  //   console.log(vertexShader);
  //   console.log(fragmentShader);
  const material = new THREE.ShaderMaterial({
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    uniforms: {
      globeTexture: {
        value: new THREE.TextureLoader().load(
          "./assets/imgs/globe-8K-pink.jpg"
        ),
      },
    },
  });
  sphere = new THREE.Mesh(geometry, material);
  sphere.rotation.y = -Math.PI / 2;
  scene.add(sphere);

  //  add bump map/normal map
  // const normalMap = new THREE.TextureLoader().load(
  //   "./imgs/globe-8K-normal.jpg"
  // );
  // material.normalMap = normalMap;
  // const bumpMap = new THREE.TextureLoader().load(
  //   "./imgs/globe-8K-specular.jpg"
  // );
  // material.bumpMap = bumpMap;
  // material.bumpScale = 1;
  //   console.log(sphere);

  const atmosphereGeometry = geometry.clone();

  const atmosphereMaterial = new THREE.ShaderMaterial({
    vertexShader: atmosphereVertexShader,
    fragmentShader: atmosphereFragmentShader,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
  });

  atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
  //   console.log(sphere);
  atmosphere.scale.set(1.1, 1.1, 1.1);
  scene.add(atmosphere);

  // Create stars (add this after scene.add(atmosphere))
  if (starVertices.length > 0) {
    let stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);
  }

  group.add(sphere);
  //   group.add(atmosphere);
  scene.add(group);

  camera.position.z = 10;

  function createBoxes(countries) {
    // Debug first few countries' coordinates
    // countries.slice(0, 5).forEach((country) => {
    //   console.log(`${country.name.common}:`, {
    //     latlng: country.latlng,
    //     faoName: getFAOCountryName(country.name.common),
    //     hasData:
    //       potatoData[getFAOCountryName(country.name.common)] !== undefined,
    //   });
    // });

    countries.forEach((country) => {
      if (!country.latlng || country.latlng.length !== 2) {
        return;
      }

      const countryFAOName = getFAOCountryName(country.name.common);
      const hasData = potatoData[countryFAOName] !== undefined;

      // Get latest production value for box height
      let productionValue = 0;
      if (hasData) {
        const years = Object.keys(potatoData[countryFAOName]);
        const latestYear = Math.max(...years);
        productionValue = potatoData[countryFAOName][latestYear];
      }

      // New scaling formula based on potato production
      // Using 100 million (100000000) as the reference point for maximum height
      const scale = hasData
        ? productionValue / 100000000 // This will make China's box ~0.93 units tall
        : 0.2;

      // Apply some constraints to make small values visible but large values not too dominant
      const zScale = hasData
        ? Math.min(Math.max(scale, 0.3), 2.0) // Minimum 0.3, maximum 2.0
        : 0.4;

      // Revert to original coordinate calculation
      const latitude = (country.latlng[0] * Math.PI) / 180;
      const longitude = (country.latlng[1] * Math.PI) / 180;

      if (isNaN(latitude) || isNaN(longitude)) {
        return; // Skip invalid coordinates
      }

      const radius = 5;
      const x = radius * Math.cos(latitude) * Math.sin(longitude);
      const y = radius * Math.sin(latitude);
      const z = radius * Math.cos(latitude) * Math.cos(longitude);

      // Validate position values
      if (isNaN(x) || isNaN(y) || isNaN(z)) {
        return; // Skip invalid positions
      }

      const boxGeometry = new THREE.BoxGeometry(
        0.1, // Keep x dimension thin and constant
        0.1, // Keep y dimension thin and constant
        Math.max(zScale, 0.4) // Only vary the height (z dimension)
      );

      const box = new THREE.Mesh(
        boxGeometry,
        new THREE.MeshBasicMaterial({
          color: hasData ? "#FF69B4" : "#808080",
          opacity: 0.4,
          transparent: true,
        })
      );

      box.position.set(x, y, z);
      box.lookAt(0, 0, 0);
      box.geometry.applyMatrix4(
        new THREE.Matrix4().makeTranslation(0, 0, -zScale / 2)
      );

      // Add data to box object
      box.country = country.name.common;
      box.faoName = countryFAOName;
      box.hasData = hasData;
      box.productionData = hasData ? potatoData[countryFAOName] : null;

      if (hasData) {
        box.areaData = areaYieldData.areaByCountry[countryFAOName];
        box.yieldData = areaYieldData.yieldByCountry[countryFAOName];
      }

      group.add(box);

      if (hasData) {
        gsap.to(box.scale, {
          z: 1.2, // Reduced animation scale to keep proportions more visible
          duration: 2,
          yoyo: true,
          repeat: -1,
          ease: "power2.inOut",
          delay: Math.random(),
        });
      }
    });
  }

  createBoxes(countriesData);

  // Start animate loop only after initialization is complete
  animate();
}

let raycaster = new THREE.Raycaster();
let popUpEl = document.querySelector("#popUpEl");
let populationEl = document.querySelector("#populationEl");
let populationValueEl = document.querySelector("#populationValueEl");
// console.log(popUpEl);
// console.log(raycaster);

// Add chart creation function
let productionChart = null;

function createOrUpdateChart(productionData) {
  try {
    const years = Object.keys(productionData).sort();
    const values = years.map((year) => productionData[year]);

    if (productionChart) {
      productionChart.destroy();
    }

    const ctx = document.getElementById("productionChart");
    if (!ctx) {
      console.error("Chart canvas not found");
      return;
    }

    productionChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: years,
        datasets: [
          {
            label: "Potato Production (tonnes)",
            data: values,
            borderColor: "#FF69B4",
            backgroundColor: "rgba(255, 105, 180, 0.1)",
            pointStyle: false,
            tension: 0.1,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 0, // Disable animation for better performance
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              color: "white",
              callback: function (value) {
                return value.toLocaleString() + "t";
              },
            },
            grid: {
              color: "rgba(255, 255, 255, 0.1)",
            },
          },
          x: {
            ticks: {
              color: "white",
              maxRotation: 45,
              minRotation: 45,
            },
            grid: {
              color: "rgba(255, 255, 255, 0.1)",
            },
          },
        },
        plugins: {
          legend: {
            labels: {
              color: "white",
              boxWidth: 10,
              boxHeight: 1,
            },
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                return context.parsed.y.toLocaleString() + " tonnes";
              },
            },
          },
        },
      },
    });
  } catch (error) {
    console.error("Error creating chart:", error);
  }
}

// Add these variables for the new charts
let areaChart = null;
let yieldChart = null;

// Add this function to load area and yield data
async function loadAreaAndYieldData() {
  const response = await fetch("./data/json/potato-production-data.json");
  const data = await response.json();

  const areaByCountry = {};
  const yieldByCountry = {};

  data.data.forEach((row) => {
    const country = row[1];
    const year = row[7];
    const value = row[9];

    if (row[3] === "Area harvested") {
      if (!areaByCountry[country]) {
        areaByCountry[country] = {};
      }
      areaByCountry[country][year] = value;
    } else if (row[3] === "Yield") {
      if (!yieldByCountry[country]) {
        yieldByCountry[country] = {};
      }
      yieldByCountry[country][year] = value;
    }
  });

  return { areaByCountry, yieldByCountry };
}

// Add this function to create/update the area and yield charts
function createOrUpdateSidebarCharts(countryData) {
  const { areaData, yieldData } = countryData;

  // Create or update area chart
  const areaCtx = document.getElementById("areaChart");
  if (areaChart) {
    areaChart.destroy();
  }

  areaChart = new Chart(areaCtx, {
    type: "line",
    data: {
      labels: Object.keys(areaData).sort(),
      datasets: [
        {
          label: "Hectares",
          data: Object.values(areaData),
          borderColor: "#FF69B4",
          backgroundColor: "rgba(255, 105, 180, 0.1)",
          pointStyle: false,
          tension: 0.1,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 0 },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            color: "white",
            callback: function (value) {
              return value.toLocaleString() + " ha";
            },
          },
          grid: {
            color: "rgba(255, 255, 255, 0.1)",
          },
        },
        x: {
          ticks: {
            color: "white",
            maxRotation: 45,
            minRotation: 45,
          },
          grid: {
            color: "rgba(255, 255, 255, 0.1)",
          },
        },
      },
      plugins: {
        legend: {
          labels: {
            color: "white",
            boxWidth: 10,
            boxHeight: 1,
          },
        },
      },
    },
  });

  // Create or update yield chart
  const yieldCtx = document.getElementById("yieldChart");
  if (yieldChart) {
    yieldChart.destroy();
  }

  yieldChart = new Chart(yieldCtx, {
    type: "line",
    data: {
      labels: Object.keys(yieldData).sort(),
      datasets: [
        {
          label: "kg/ha",
          data: Object.values(yieldData),
          borderColor: "#FF69B4",
          backgroundColor: "rgba(255, 105, 180, 0.1)",
          pointStyle: false,
          tension: 0.1,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 0 },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            color: "white",
            callback: function (value) {
              return value.toLocaleString() + " kg/ha";
            },
          },
          grid: {
            color: "rgba(255, 255, 255, 0.1)",
          },
        },
        x: {
          ticks: {
            color: "white",
            maxRotation: 45,
            minRotation: 45,
          },
          grid: {
            color: "rgba(255, 255, 255, 0.1)",
          },
        },
      },
      plugins: {
        legend: {
          labels: {
            color: "white",
            boxWidth: 10,
            boxHeight: 1,
          },
        },
      },
    },
  });
}

function animate() {
  requestAnimationFrame(animate);

  // update the picking ray with the camera and mouse position
  raycaster.setFromCamera(mouse, camera);

  // calculate objects intersecting the picking ray
  const intersects = raycaster.intersectObjects(
    group.children.filter((mesh) => {
      return mesh.geometry.type === "BoxGeometry";
    })
  );
  // .sort((a, b) => a.distance - b.distance); // Sort by distance from camera;

  // Reset all boxes to default opacity
  group.children.forEach((mesh) => {
    if (mesh.geometry.type === "BoxGeometry") {
      mesh.material.opacity = 0.4;
    }
  });

  // Hide popup by default
  gsap.set(popUpEl, {
    display: "none",
  });

  // Handle intersections
  if (intersects.length > 0) {
    const intersectedBox = intersects[0].object;

    // Always highlight the hovered box
    intersectedBox.material.opacity = 1;

    // Update popup for the hovered box
    const popUpEl = document.querySelector("#popUpEl");
    const countryNameEl = document.querySelector("#countryNameEl");
    const productionValueEl = document.querySelector("#productionValueEl");
    const chartContainer = document.querySelector("#chartContainer");
    const noDataEl = document.querySelector("#noDataEl");

    // Calculate popup position using stored client coordinates
    const x = mouse.clientX;
    const y = mouse.clientY;

    // Ensure popup stays within viewport
    const popupRect = popUpEl.getBoundingClientRect();
    const maxX = window.innerWidth - popupRect.width - 20; // 20px margin
    const maxY = window.innerHeight - popupRect.height - 20;

    gsap.set(popUpEl, {
      display: "block",
      x: Math.min(Math.max(20, x), maxX), // Keep 20px from edges
      y: Math.min(Math.max(20, y), maxY),
    });

    countryNameEl.innerHTML = intersectedBox.country;

    if (intersectedBox.hasData) {
      const years = Object.keys(intersectedBox.productionData);
      const latestYear = Math.max(...years);
      const latestProduction = intersectedBox.productionData[latestYear];

      productionValueEl.innerHTML = `${latestYear} Production: ${latestProduction.toLocaleString()} tonnes`;
      productionValueEl.style.display = "block";
      chartContainer.style.display = "block";
      noDataEl.style.display = "none";
      createOrUpdateChart(intersectedBox.productionData);
    } else {
      productionValueEl.style.display = "none";
      chartContainer.style.display = "none";
      noDataEl.style.display = "block";
    }

    // Only update sidebar if no country is selected
    if (!selectedBox) {
      updateSidebarContent(intersectedBox);
    }
  }

  // Render scene ONCE at the end
  renderer.render(scene, camera);
}

// Call init but remove the separate animate() call
init();

// Update the mouse movement and rotation handling
canvasContainer.addEventListener("mousedown", (event) => {
  mouse.down = true;
  mouse.xPrev = event.clientX;
  mouse.yPrev = event.clientY;
});

addEventListener("mousemove", (event) => {
  // Get canvas container bounds
  const rect = canvasContainer.getBoundingClientRect();

  // Update mouse coordinates for raycaster
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  // Store actual mouse coordinates for popup positioning
  mouse.clientX = event.clientX;
  mouse.clientY = event.clientY;

  // Handle rotation
  if (mouse.down) {
    const deltaX = event.clientX - mouse.xPrev;
    const deltaY = event.clientY - mouse.yPrev;

    group.rotation.offset.x += deltaY * 0.005;
    group.rotation.offset.y += deltaX * 0.005;

    gsap.to(group.rotation, {
      y: group.rotation.offset.y,
      x: group.rotation.offset.x,
      duration: 0.5,
    });

    mouse.xPrev = event.clientX;
    mouse.yPrev = event.clientY;
  }
});

addEventListener("mouseup", (e) => {
  mouse.down = false;
});

//  resize
addEventListener("resize", () => {
  renderer.setSize(canvasContainer.offsetWidth, canvasContainer.offsetHeight);
  camera.aspect = canvasContainer.offsetWidth / canvasContainer.offsetHeight;
  camera.updateProjectionMatrix();
});

// mobile event listener
// addEventListener(
//   "touchmove",
//   (e) => {
//     e.clientX = e.touches[0].clientX;
//     e.clientY = e.touches[0].clientY;

//     const doesIntersect = raycaster.intersectObjects(sphere);
//     if (doesIntersect.length > 0) mouse.down = true;

//     if (mouse.down) {
//       // e.preventDefault();
//       const rect = document
//         .querySelector("#canvas-container")
//         .getBoundingClientRect();
//       mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
//       mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

//       gsap.set(popUpEl, {
//         x: e.clientX,
//         y: e.clientY,
//       });

//       console.log(mouse.y);

//       e.preventDefault();
//       const deltaX = e.clientX - mouse.xPrev;
//       const deltaY = e.clientY - mouse.yPrev;
//       // 1. smooth rotation
//       group.rotation.offset.x += deltaY * 0.002;
//       group.rotation.offset.y += deltaX * 0.002;
//       gsap.to(group.rotation, {
//         y: group.rotation.offset.y,
//         x: group.rotation.offset.x,
//         duration: 2,
//       });

//       // 2. instant rotation
//       // group.rotation.y += deltaX * 0.002;
//       // group.rotation.x += deltaY * 0.002;
//       mouse.xPrev = e.clientX;
//       mouse.yPrev = e.clientY;
//     }
//   },
//   { passive: false }
// );

// addEventListener("touchend", (e) => {
//   mouse.down = false;
// });

// Add these utility functions after the existing imports
const countryNameMapping = {
  "Bolivia (Plurinational State of)": "Bolivia",
  "China, mainland": "China",
  "China, Taiwan Province of": "Taiwan",
  "Côte d'Ivoire": "Ivory Coast",
  "Democratic People's Republic of Korea": "North Korea",
  "Democratic Republic of the Congo": "DR Congo",
  "Iran (Islamic Republic of)": "Iran",
  "Lao People's Democratic Republic": "Laos",
  "Netherlands (Kingdom of the)": "Netherlands",
  "Republic of Korea": "South Korea",
  "Republic of Moldova": "Moldova",
  "Russian Federation": "Russia",
  "Syrian Arab Republic": "Syria",
  Türkiye: "Turkey",
  "United Kingdom of Great Britain and Northern Ireland": "United Kingdom",
  "United Republic of Tanzania": "Tanzania",
  "United States of America": "United States",
  "Venezuela (Bolivarian Republic of)": "Venezuela",
  "Viet Nam": "Vietnam",
};

function getFAOCountryName(restCountriesName) {
  const reverseMapping = Object.fromEntries(
    Object.entries(countryNameMapping).map(([k, v]) => [v, k])
  );
  return reverseMapping[restCountriesName] || restCountriesName;
}

// Add this function to load potato production data
async function loadPotatoData() {
  const response = await fetch("./data/json/potato-production-data.json");
  const data = await response.json();

  // Transform data into a more usable format
  const productionByCountry = {};

  data.data.forEach((row) => {
    if (row[3] === "Production") {
      const country = row[1];
      const year = row[7];
      const value = row[9];

      if (!productionByCountry[country]) {
        productionByCountry[country] = {};
      }
      productionByCountry[country][year] = value;
    }
  });

  return productionByCountry;
}

// Add after the other event listeners
canvasContainer.addEventListener("click", (event) => {
  // Get canvas container bounds
  const rect = canvasContainer.getBoundingClientRect();

  // Update mouse coordinates for raycaster
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  // Update the picking ray with the camera and mouse position
  raycaster.setFromCamera(mouse, camera);

  // Calculate objects intersecting the picking ray
  const intersects = raycaster.intersectObjects(
    group.children.filter((mesh) => mesh.geometry.type === "BoxGeometry")
  );

  if (intersects.length > 0) {
    const clickedBox = intersects[0].object;

    // If clicking the same box, deselect it
    if (selectedBox === clickedBox) {
      selectedBox = null;
    } else {
      selectedBox = clickedBox;
    }

    // Update the sidebar immediately with the selected box's data
    updateSidebarContent(selectedBox);
  }
});

function updateSidebarContent(box) {
  const sidebarCountry = document.getElementById("sidebarCountry");
  const sidebarPopulation = document.getElementById("sidebarPopulation");
  const chartsContainer = document.getElementById("chartsContainer");

  if (!box) {
    sidebarCountry.textContent = "Select a country";
    sidebarPopulation.textContent = "";
    chartsContainer.classList.add("hidden");
    if (areaChart) areaChart.destroy();
    if (yieldChart) yieldChart.destroy();
    return;
  }

  sidebarCountry.textContent = box.country;

  const countryData = countriesData.find((c) => c.name.common === box.country);
  const population = countryData
    ? countryData.population.toLocaleString()
    : "N/A";
  sidebarPopulation.textContent = `Population (2025): ${population}`;

  if (box.hasData) {
    chartsContainer.classList.remove("hidden");
    createOrUpdateSidebarCharts({
      areaData: box.areaData,
      yieldData: box.yieldData,
    });
  } else {
    chartsContainer.classList.add("hidden");
    if (areaChart) areaChart.destroy();
    if (yieldChart) yieldChart.destroy();
  }
}
