// dashboard.js - Main application logic for the dashboard page

class Dashboard {
  constructor() {
    this.db = db;
    this.refreshInterval = null;
    this.activeDepartment = null;
    this.recordingInterval = null;
  }

  // Initialize the dashboard
  initialize() {
    // Set current date
    const today = new Date();
    document.getElementById("current-date").valueAsDate = today;

    // Set facility name from settings
    const settings = this.db.getSettings();
    document.getElementById("facility-name").value = settings.facilityName;
    document.getElementById("refresh-rate").value = settings.refreshRate;

    // Initialize department data
    this.updateAllDepartments();

    // Start recording data at regular intervals for reporting
    this.startDataRecording();

    // Setup tab navigation
    this.setupTabNavigation();

    // Initialize theme toggle
    this.initializeThemeToggle();

    // Initialize clock and periodic updates
    this.updateClock();
    this.startPeriodicUpdates();

    // Set up event listeners
    this.setupEventListeners();
  }

  // Setup all event listeners
  setupEventListeners() {
    // Global controls
    document.getElementById("facility-name").addEventListener("change", () => {
      this.db.updateSettings({
        facilityName: document.getElementById("facility-name").value,
      });
    });

    document.getElementById("refresh-rate").addEventListener("change", () => {
      const rate =
        parseInt(document.getElementById("refresh-rate").value) || 60;
      this.db.updateSettings({ refreshRate: rate });
      this.restartPeriodicUpdates();
    });

    // Department shift controls
    ["receiving", "picking", "shipping"].forEach((dept) => {
      document
        .getElementById(`${dept}-shift-start`)
        .addEventListener("change", () => {
          this.updateDepartment(dept);
        });

      document
        .getElementById(`${dept}-shift-end`)
        .addEventListener("change", () => {
          this.updateDepartment(dept);
        });

      // Department volume update listeners
      document
        .getElementById(`${dept}-vol1-planned`)
        .addEventListener("change", () => {
          this.updateDepartmentVolumes(dept);
        });

      document
        .getElementById(`${dept}-vol1-actual`)
        .addEventListener("change", () => {
          this.updateDepartmentVolumes(dept);
        });

      // Add more volume listeners based on department
      const volCount = this.getVolumeCount(dept);
      for (let i = 2; i <= volCount; i++) {
        document
          .getElementById(`${dept}-vol${i}-planned`)
          .addEventListener("change", () => {
            this.updateDepartmentVolumes(dept);
          });

        document
          .getElementById(`${dept}-vol${i}-actual`)
          .addEventListener("change", () => {
            this.updateDepartmentVolumes(dept);
          });
      }
    });
  }

  // Start periodic data recording for reports
  startDataRecording() {
    // Record segment data every 15 minutes
    const recordData = () => {
      this.db.recordSegmentData();
      console.log("Recorded segment data at", new Date().toISOString());
    };

    // Record immediately
    recordData();

    // Calculate time until next 15-minute mark
    const now = new Date();
    const minutes = now.getMinutes();
    const secondsToNextSlot = (15 - (minutes % 15)) * 60 - now.getSeconds();

    // Schedule first recording at the next 15-minute mark
    setTimeout(() => {
      recordData();

      // Then schedule regular recordings every 15 minutes
      this.recordingInterval = setInterval(recordData, 15 * 60 * 1000);
    }, secondsToNextSlot * 1000);

    console.log(`Next data recording in ${secondsToNextSlot} seconds`);
  }

  // Start periodic dashboard updates
  startPeriodicUpdates() {
    const settings = this.db.getSettings();
    const refreshRate = parseInt(settings.refreshRate) * 1000 || 60000;

    this.refreshInterval = setInterval(() => {
      this.updateClock();
      this.updateAllDepartments();
    }, refreshRate);
  }

  // Restart periodic updates (when refresh rate changes)
  restartPeriodicUpdates() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    this.startPeriodicUpdates();
  }

  // Update the clock and calculate hours worked
  updateClock() {
    const now = new Date();
    const timeString = now.toLocaleTimeString();

    document.getElementById("current-time").textContent = timeString;
    document.getElementById("current-time-display").textContent = timeString;

    // Calculate hours worked for each department
    ["receiving", "picking", "shipping"].forEach((dept) => {
      const hoursWorked = this.db.calculateHoursWorked(dept, now);
      document.getElementById(`${dept}-hrs-worked`).value =
        hoursWorked.toFixed(2);
    });

    // Update all departments to reflect current time
    this.updateAllDepartments();
  }

  // Initialize theme toggle functionality
  initializeThemeToggle() {
    const savedTheme = localStorage.getItem("theme");
    const themeSwitch = document.getElementById("theme-switch");

    // Apply saved theme or default to dark
    if (savedTheme === "light") {
      document.body.classList.add("light-theme");
      if (themeSwitch) themeSwitch.checked = true;
    }

    // Set up theme toggle event listener
    if (themeSwitch) {
      themeSwitch.addEventListener("change", function (e) {
        if (e.target.checked) {
          document.body.classList.add("light-theme");
          localStorage.setItem("theme", "light");
        } else {
          document.body.classList.remove("light-theme");
          localStorage.setItem("theme", "dark");
        }
      });
    }
  }

  // Setup tab navigation
  setupTabNavigation() {
    document.querySelectorAll(".tab-button").forEach((button) => {
      button.addEventListener("click", function () {
        const tabContainer = this.closest(".tab-container");
        const buttons = tabContainer.querySelectorAll(".tab-button");
        const tabContents = tabContainer.querySelectorAll(".tab-content");

        // Remove active class from all buttons and contents
        buttons.forEach((btn) => btn.classList.remove("active"));
        tabContents.forEach((content) => content.classList.remove("active"));

        // Add active class to clicked button
        this.classList.add("active");

        // Get the tab name from the onclick attribute
        const onclickAttr = this.getAttribute("onclick");
        const tabName = onclickAttr.split("'")[3]; // Extract tab name from openTab('dept', 'tabName')

        // Activate the correct tab content
        const dept = tabContainer
          .closest(".department-card")
          .querySelector(".department-title")
          .textContent.toLowerCase()
          .split(" ")[0];
        document.getElementById(`${dept}-${tabName}`).classList.add("active");
      });
    });
  }

  /// Update the openTab function to work with both programmatic and onclick calls
  openTab(dept, tabName) {
    // Hide all tab contents for the department
    document
      .querySelectorAll(
        `#${dept}-summary, #${dept}-volumes, #${dept}-roles, #${dept}-projections`
      )
      .forEach((tab) => {
        tab.classList.remove("active");
      });

    // Show the selected tab content
    const selectedTab = document.getElementById(`${dept}-${tabName}`);
    if (selectedTab) {
      selectedTab.classList.add("active");
    }

    // Find the tab buttons container
    const tabContainer = document.querySelector(
      `.department-card:has(#${dept}-summary) .tab-container`
    );
    if (!tabContainer) return;

    // Remove active class from all tab buttons
    const buttons = tabContainer.querySelectorAll(".tab-button");
    buttons.forEach((button) => {
      button.classList.remove("active");
    });

    // Find and activate the matching button
    const buttonIndex = ["summary", "volumes", "roles", "projections"].indexOf(
      tabName
    );
    if (buttonIndex >= 0 && buttons[buttonIndex]) {
      buttons[buttonIndex].classList.add("active");
    }

    // Refresh role adjustments if opening projections tab
    if (tabName === "projections") {
      this.initializeRoleAdjustments(dept);

      // Update projection information
      const deptData = this.db.getDepartment(dept);
      const planned = deptData.volumes.totalPlanned;
      const actual = deptData.volumes.totalActual;
      const remaining = planned - actual;
      const currentRate = deptData.currentRate;
      const currentEOS = deptData.projectedEndTime;

      document.getElementById(`${dept}-projection-current-rate`).textContent =
        Math.round(currentRate);
      document.getElementById(`${dept}-projection-remaining`).textContent =
        remaining;
      document.getElementById(`${dept}-projection-current-eos`).textContent =
        currentEOS;
    }
  }

  // Setup tab navigation with direct click handling
  setupTabNavigation() {
    // Get all tab buttons
    const tabButtons = document.querySelectorAll(".tab-button");

    // Remove existing onclick attributes and add event listeners
    tabButtons.forEach((button) => {
      // Get department and tab information from the button
      const onclickAttr = button.getAttribute("onclick") || "";
      const match = onclickAttr.match(
        /openTab\(['"]([^'"]+)['"],\s*['"]([^'"]+)['"]\)/
      );

      if (match) {
        const dept = match[1];
        const tabName = match[2];

        // Remove the onclick attribute
        button.removeAttribute("onclick");

        // Add event listener
        button.addEventListener("click", () => {
          this.openTab(dept, tabName);
        });
      }
    });
  }

  // Update all departments
  updateAllDepartments() {
    ["receiving", "picking", "shipping"].forEach((dept) => {
      this.updateDepartment(dept);
    });

    // Calculate and display overall completion
    this.calculateOverallCompletion();
  }

  // Update a specific department
  updateDepartment(dept) {
    // Get current UI values
    const shiftStart = document.getElementById(`${dept}-shift-start`).value;
    const shiftEnd = document.getElementById(`${dept}-shift-end`).value;

    // Update department data
    this.db.updateDepartment(dept, {
      shiftStart,
      shiftEnd,
    });

    // Load department data
    const deptData = this.db.getDepartment(dept);

    // Update UI with department data
    this.updateDepartmentUI(dept, deptData);

    // Calculate volume data
    this.updateDepartmentVolumes(dept);

    // Calculate totals based on roles
    this.calculateDepartmentTotals(dept);
  }

  // Update department volumes
  updateDepartmentVolumes(dept) {
    // Get department data
    const deptData = this.db.getDepartment(dept);

    // Get volume count for this department
    const volCount = this.getVolumeCount(dept);
    const categories = [];

    // Update category volumes
    for (let i = 1; i <= volCount; i++) {
      const planned =
        parseInt(document.getElementById(`${dept}-vol${i}-planned`).value) || 0;
      const actual =
        parseInt(document.getElementById(`${dept}-vol${i}-actual`).value) || 0;

      categories.push({
        name: deptData.volumes.categories[i - 1]
          ? deptData.volumes.categories[i - 1].name
          : `Category ${i}`,
        planned,
        actual,
      });
    }

    // Update volumes in database
    this.db.updateVolumes(dept, { categories });

    // Reload department data
    const updatedDeptData = this.db.getDepartment(dept);

    // Update progress bars and metrics
    for (let i = 1; i <= volCount; i++) {
      const category = updatedDeptData.volumes.categories[i - 1];
      const planned = category.planned;
      const actual = category.actual;

      // Calculate progress percentage
      const progressPercent = planned > 0 ? (actual / planned) * 100 : 0;
      const formattedProgress = progressPercent.toFixed(1);

      // Update UI elements
      document.getElementById(
        `${dept}-vol${i}-progress`
      ).textContent = `${formattedProgress}%`;
      document.getElementById(
        `${dept}-vol${i}-bar`
      ).style.width = `${formattedProgress}%`;

      // Update progress bar color
      const progressBar = document.getElementById(`${dept}-vol${i}-bar`);
      if (progressPercent < 25) {
        progressBar.className = "progress-fill danger";
      } else if (progressPercent < 50) {
        progressBar.className = "progress-fill caution";
      } else {
        progressBar.className = "progress-fill";
      }
    }

    // Update totals display
    document.getElementById(`${dept}-total-planned`).textContent =
      updatedDeptData.volumes.totalPlanned;
    document.getElementById(`${dept}-total-actual`).textContent =
      updatedDeptData.volumes.totalActual;

    // Update department summary
    this.updateDepartmentUI(dept, updatedDeptData);

    // Calculate overall completion
    this.calculateOverallCompletion();
  }

  // Update department UI with current data
  updateDepartmentUI(dept, deptData) {
    // Update progress display
    const progressPercent = deptData.progressPercent.toFixed(1);
    document.getElementById(
      `${dept}-progress-percent`
    ).textContent = `${progressPercent}%`;
    document.getElementById(
      `${dept}-progress-bar`
    ).style.width = `${progressPercent}%`;

    // Update volume display
    document.getElementById(
      `${dept}-volume-display`
    ).textContent = `${this.formatNumber(
      deptData.volumes.totalActual
    )} / ${this.formatNumber(deptData.volumes.totalPlanned)} units`;

    // Update metrics
    document.getElementById(`${dept}-current-rate`).textContent = Math.round(
      deptData.currentRate
    );
    document.getElementById(`${dept}-target-rate`).textContent = Math.round(
      deptData.targetRate
    );
    document.getElementById(`${dept}-all-in-rate`).textContent =
      deptData.allInRate.toFixed(1);
    document.getElementById(`${dept}-end-time`).textContent =
      deptData.projectedEndTime;

    // Color progress bar based on percentage
    const progressBar = document.getElementById(`${dept}-progress-bar`);
    if (deptData.progressPercent < 25) {
      progressBar.className = "progress-fill danger";
    } else if (deptData.progressPercent < 50) {
      progressBar.className = "progress-fill caution";
    } else {
      progressBar.className = "progress-fill";
    }

    // Set color based on projected end time vs target end time
    if (deptData.projectedEndTime !== "--:--") {
      const targetEndTime = document.getElementById(`${dept}-shift-end`).value;
      const targetEndMinutes = this.convertTimeToMinutes(targetEndTime);
      const projectedEndMinutes = this.convertTimeToMinutes(
        deptData.projectedEndTime
      );
      const endTimeElement = document.getElementById(`${dept}-end-time`);

      if (projectedEndMinutes <= targetEndMinutes) {
        endTimeElement.className = "metric-value success";
      } else if (projectedEndMinutes <= targetEndMinutes + 60) {
        endTimeElement.className = "metric-value caution";
      } else {
        endTimeElement.className = "metric-value danger";
      }

      // Generate recommendation
      const recommendation = this.generateRecommendation(
        dept,
        deptData.progressPercent,
        deptData.projectedEndTime,
        targetEndTime
      );
      document.getElementById(`${dept}-recommendation`).innerHTML =
        recommendation;
    }
  }

  // Calculate department totals based on roles
  // In dashboard.js
  calculateDepartmentTotals(dept) {
    // Add a guard flag to prevent recursion
    if (this._calculating) return;

    try {
      this._calculating = true;

      // Read current roles from UI
      const table = document
        .getElementById(`${dept}-role-table`)
        .getElementsByTagName("tbody")[0];
      const rows = table.getElementsByTagName("tr");
      const roles = [];

      // Update roles based on current UI values
      for (let i = 0; i < rows.length; i++) {
        const inputs = rows[i].getElementsByTagName("input");
        const roleId = parseInt(rows[i].getAttribute("data-role-id"));
        const volumeType = parseInt(rows[i].getAttribute("data-vol-type"));
        const roleName = inputs[0].value;
        const staffCount = parseInt(inputs[1].value) || 0;
        const rate = parseInt(inputs[2].value) || 0;

        roles.push({
          id: roleId,
          name: roleName,
          staff: staffCount,
          rate: rate,
          volumeType: volumeType,
        });
      }

      // Update roles in database
      this.db.updateDepartment(dept, { roles });

      // Recalculate and update UI
      // Don't call this.updateDepartment(dept) directly as it creates a loop
      this.updateDepartmentUI(dept, this.db.getDepartment(dept));
    } finally {
      this._calculating = false;
    }
  }

  // Initialize role-based adjustment sliders
  initializeRoleAdjustments(dept) {
    const deptData = this.db.getDepartment(dept);
    const roles = deptData.roles;
    const container = document.getElementById(`${dept}-role-adjustments`);

    // Clear previous sliders
    container.innerHTML = "";

    // Create adjustment sliders for each role
    roles.forEach((role) => {
      // Get volume type name
      const volumeType = role.volumeType;
      const volumeTypeText = this.getVolumeTypeName(dept, volumeType);

      const sliderContainer = document.createElement("div");
      sliderContainer.className = "slider-container";
      sliderContainer.innerHTML = `
        <label>${role.name} (${volumeTypeText}):</label>
        <input type="range" class="slider" min="0" max="${
          role.staff * 2
        }" value="${role.staff}" 
               data-original="${role.staff}" data-role-id="${
        role.id
      }" data-vol-type="${volumeType}">
        <span class="slider-value">${role.staff}</span>
      `;

      container.appendChild(sliderContainer);

      // Add listener to update the displayed value
      const slider = sliderContainer.querySelector(".slider");
      const valueDisplay = sliderContainer.querySelector(".slider-value");
      slider.addEventListener("input", function () {
        valueDisplay.textContent = this.value;
      });
    });
  }

  // Update projections based on role-specific headcount adjustments
  updateRoleBasedProjection(dept) {
    const deptData = this.db.getDepartment(dept);
    const container = document.getElementById(`${dept}-role-adjustments`);
    const sliders = container.querySelectorAll(".slider");

    // Get volume count for this department
    const volCount = this.getVolumeCount(dept);

    // Array to hold rate calculations by volume type
    const volumeRates = {};
    for (let i = 1; i <= volCount; i++) {
      volumeRates[i] = {
        staff: 0,
        rate: 0,
        planned: deptData.volumes.categories[i - 1].planned,
        actual: deptData.volumes.categories[i - 1].actual,
      };
    }

    // Calculate new rates based on adjusted headcounts
    sliders.forEach((slider) => {
      const roleId = slider.getAttribute("data-role-id");
      const volType = parseInt(slider.getAttribute("data-vol-type"));
      const newCount = parseInt(slider.value);

      // Find matching role in department data
      const role = deptData.roles.find((r) => r.id === parseInt(roleId));
      if (role) {
        const rate = role.rate;
        volumeRates[volType].staff += newCount;
        volumeRates[volType].rate += rate * newCount;
      }
    });

    // Calculate new total staff and weighted average rate
    let totalNewStaff = 0;
    let totalWeightedRate = 0;

    Object.values(volumeRates).forEach((volRate) => {
      totalNewStaff += volRate.staff;
    });

    // Display modified staff count
    document.getElementById(`${dept}-modified-staff`).textContent =
      totalNewStaff;

    // Calculate new projected end times for each volume type
    const projectedTimes = [];

    // Process each volume type
    for (let i = 1; i <= volCount; i++) {
      const volRate = volumeRates[i];
      const planned = volRate.planned;
      const actual = volRate.actual;
      const remaining = planned - actual;

      if (remaining <= 0 || volRate.staff <= 0) continue;

      // Average rate per person for this volume type
      const avgRate = volRate.rate / volRate.staff;

      // Total hourly rate for this volume type
      const newTypeRate = avgRate * volRate.staff;

      // Calculate new end time for this volume type
      if (newTypeRate > 0) {
        const newEndTime = this.calculateEndTimeFromRemaining(
          remaining,
          newTypeRate
        );
        projectedTimes.push({
          time: newEndTime,
          minutes: this.convertTimeToMinutes(newEndTime),
        });
      }
    }

    // Find the latest projected end time
    let latestEndTime = "--:--";
    let latestMinutes = 0;

    projectedTimes.forEach((proj) => {
      if (proj.minutes > latestMinutes) {
        latestMinutes = proj.minutes;
        latestEndTime = proj.time;
      }
    });

    // Calculate new weighted average rate across all volume types
    let newRate = 0;
    if (totalNewStaff > 0) {
      Object.values(volumeRates).forEach((volRate) => {
        newRate += volRate.rate; // Sum up rates from all volume types
      });
    }

    // Calculate time impact
    const currentEOS = document.getElementById(
      `${dept}-projection-current-eos`
    ).textContent;
    const currentMinutes = this.convertTimeToMinutes(currentEOS);
    const timeDiff = latestMinutes - currentMinutes;

    let timeDiffText = "";
    let className = "";

    if (currentEOS === "--:--" || latestEndTime === "--:--") {
      timeDiffText = "N/A";
      className = "";
    } else if (timeDiff < 0) {
      timeDiffText = `${Math.abs(timeDiff)} min earlier`;
      className = "success";
    } else if (timeDiff > 0) {
      timeDiffText = `${timeDiff} min later`;
      className = "danger";
    } else {
      timeDiffText = "0 min";
      className = "";
    }

    // Update the UI
    document.getElementById(`${dept}-modified-rate`).textContent =
      Math.round(newRate);
    document.getElementById(`${dept}-modified-end-time`).textContent =
      latestEndTime;

    const timeImpactElement = document.getElementById(`${dept}-time-impact`);
    timeImpactElement.textContent = timeDiffText;
    timeImpactElement.className = `metric-value ${className}`;
  }

  // Calculate and display overall completion percentage
  calculateOverallCompletion() {
    const departments = this.db.getAllDepartments();
    let totalPlanned = 0;
    let totalActual = 0;
    let latestEOS = "";
    let latestEOSMinutes = 0;

    // Process each department
    Object.keys(departments).forEach((dept) => {
      const deptData = departments[dept];

      // Add to totals
      totalPlanned += deptData.volumes.totalPlanned;
      totalActual += deptData.volumes.totalActual;

      // Check for latest EOS
      const eos = deptData.projectedEndTime;
      if (eos !== "--:--") {
        const eosMinutes = this.convertTimeToMinutes(eos);
        if (eosMinutes > latestEOSMinutes) {
          latestEOSMinutes = eosMinutes;
          latestEOS = eos;
        }
      }
    });

    // Calculate overall percentage
    const overallPercentage =
      totalPlanned > 0 ? (totalActual / totalPlanned) * 100 : 0;
    document.getElementById(
      "total-completion"
    ).textContent = `${overallPercentage.toFixed(1)}%`;
    document.getElementById("overall-eos").textContent = latestEOS || "--:--";
  }

  // Add a new role row to a department
  addRole(dept) {
    const deptData = this.db.getDepartment(dept);
    const roles = deptData.roles;

    // Generate new role ID
    const newRoleId =
      roles.length > 0 ? Math.max(...roles.map((role) => role.id)) + 1 : 1;

    // Get selected volume type
    const volTypeSelect = document.getElementById(`${dept}-vol-type`);
    const volType = parseInt(volTypeSelect.value);
    const volTypeName =
      volTypeSelect.options[volTypeSelect.selectedIndex].text.split(": ")[1];

    // Add new role to the table
    const table = document
      .getElementById(`${dept}-role-table`)
      .getElementsByTagName("tbody")[0];
    const newRow = table.insertRow();
    newRow.setAttribute("data-role-id", newRoleId);
    newRow.setAttribute("data-vol-type", volType);
    newRow.innerHTML = `
      <td>
        <input type="text" value="New Role" placeholder="Role name" onchange="dashboard.calculateDepartmentTotals('${dept}')" />
      </td>
      <td>
        <input type="number" value="1" min="1" onchange="dashboard.calculateDepartmentTotals('${dept}')" />
      </td>
      <td>
        <input type="number" value="10" min="1" onchange="dashboard.calculateDepartmentTotals('${dept}')" />
      </td>
      <td>${volTypeName}</td>
      <td>
        <button class="remove-btn" onclick="dashboard.removeRole('${dept}', ${newRoleId})">Remove</button>
      </td>
    `;

    // Add new role to data
    const newRole = {
      id: newRoleId,
      name: "New Role",
      staff: 1,
      rate: 10,
      volumeType: volType,
    };

    roles.push(newRole);
    this.db.updateDepartment(dept, { roles });

    // Recalculate totals
    this.calculateDepartmentTotals(dept);
  }

  // Update volume type for new roles
  updateRoleVolumeType(dept) {
    // Nothing needs to be saved, this just updates the selection for new roles
  }

  // Remove a role row from a department
  removeRole(dept, roleId) {
    const deptData = this.db.getDepartment(dept);
    const roles = deptData.roles.filter((role) => role.id !== parseInt(roleId));

    // Update roles in database
    this.db.updateDepartment(dept, { roles });

    // Remove from the table
    const table = document
      .getElementById(`${dept}-role-table`)
      .getElementsByTagName("tbody")[0];
    const rows = table.getElementsByTagName("tr");

    for (let i = 0; i < rows.length; i++) {
      if (parseInt(rows[i].getAttribute("data-role-id")) === parseInt(roleId)) {
        table.deleteRow(i);
        break;
      }
    }

    // Recalculate totals
    this.calculateDepartmentTotals(dept);
  }

  // Generate staffing recommendations
  generateRecommendation(dept, progress, projectedEndTime, targetEndTime) {
    const targetEndMinutes = this.convertTimeToMinutes(targetEndTime);
    const projectedEndMinutes = this.convertTimeToMinutes(projectedEndTime);
    const timeDiff = projectedEndMinutes - targetEndMinutes;

    // Get neighboring departments for staff movement
    const neighborDepts = this.getNeighborDepartments(dept);

    // Get current hour of day to factor into recommendations
    const now = new Date();
    const currentHour = now.getHours();

    if (timeDiff < -120) {
      // More than 2 hours early
      return `<div class="info-title success">Significantly ahead of schedule</div>
              <p>Current productivity is excellent. Consider offering Voluntary Time Off (VTO) to ${Math.floor(
                Math.abs(timeDiff) / 40
              )} staff members.</p>`;
    } else if (timeDiff < -60) {
      // 1-2 hours early
      return `<div class="info-title success">Ahead of schedule</div>
              <p>On track to finish ${Math.abs(
                Math.round(timeDiff / 60)
              )} hours early. Consider reassigning ${Math.floor(
        Math.abs(timeDiff) / 60
      )} staff to ${neighborDepts[0]} department.</p>`;
    } else if (timeDiff < 0) {
      // Up to 1 hour early
      return `<div class="info-title success">On track</div>
              <p>Expected to finish ${Math.abs(
                timeDiff
              )} minutes early. Continue current pace and staffing.</p>`;
    } else if (timeDiff < 30) {
      // On time (within 30 minutes)
      return `<div class="info-title">On schedule</div>
              <p>Projecting completion right on time. No adjustments needed.</p>`;
    } else if (timeDiff < 90) {
      // Up to 1.5 hours late
      return `<div class="info-title caution">Slight delay</div>
              <p>Currently ${timeDiff} minutes behind schedule. Increase productivity or request ${Math.ceil(
        timeDiff / 30
      )} additional staff from ${neighborDepts[0]}.</p>`;
    } else if (timeDiff < 180) {
      // 1.5-3 hours late
      const staffNeeded = Math.ceil(timeDiff / 45);
      return `<div class="info-title danger">Behind schedule</div>
              <p>Projecting completion ${Math.round(
                timeDiff / 60
              )} hours late. Need ${staffNeeded} additional staff from ${
        neighborDepts[0]
      } or ${neighborDepts[1]} department immediately.</p>`;
    } else {
      // More than 3 hours late
      const staffNeeded = Math.ceil(timeDiff / 60);
      return `<div class="info-title danger">Significantly behind schedule</div>
              <p>Critical delay detected. Need immediate action: 
                <ul>
                  <li>Request ${staffNeeded} staff from other departments</li>
                  <li>Consider authorizing overtime</li>
                  <li>Prioritize high-value/urgent workload</li>
                </ul>
              </p>`;
    }
  }

  // Helper utility functions
  // ----------------------

  // Get neighboring departments for recommendations
  getNeighborDepartments(dept) {
    const allDepts = ["receiving", "picking", "shipping"];
    return allDepts.filter((d) => d !== dept);
  }

  // Get volume count for a department
  getVolumeCount(dept) {
    switch (dept) {
      case "receiving":
        return 3;
      case "picking":
        return 4;
      case "shipping":
        return 2;
      default:
        return 0;
    }
  }

  // Get volume type name based on department
  getVolumeTypeName(dept, volType) {
    const deptData = this.db.getDepartment(dept);
    if (deptData && deptData.volumes && deptData.volumes.categories) {
      const category = deptData.volumes.categories[volType - 1];
      if (category) return category.name;
    }

    // Fallback if no category found
    return `Type ${volType}`;
  }

  // Calculate the projected end time from current time and remaining volume
  calculateEndTimeFromRemaining(remaining, hourlyRate) {
    if (hourlyRate <= 0 || remaining <= 0) return "--:--";

    const hoursRemaining = remaining / hourlyRate;
    const now = new Date();

    // Calculate end time by adding remaining hours to current time
    const endTime = new Date(now.getTime() + hoursRemaining * 60 * 60 * 1000);
    const endHours = endTime.getHours();
    const endMinutes = endTime.getMinutes();

    return `${endHours.toString().padStart(2, "0")}:${endMinutes
      .toString()
      .padStart(2, "0")}`;
  }

  // Convert time string (HH:MM) to minutes since midnight
  convertTimeToMinutes(timeStr) {
    if (timeStr === "--:--" || timeStr === "N/A") return Infinity;
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours * 60 + minutes;
  }

  // Format numbers with commas
  formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
}
