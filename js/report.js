// report.js - Handles end-of-shift report generation

class EOSReportGenerator {
  constructor(database) {
    this.db = database;
  }

  // Initialize the report page
  initialize() {
    // Set current date
    const today = new Date();
    document.getElementById("report-date").valueAsDate = today;
    document.getElementById("summary-date").textContent =
      today.toLocaleDateString();

    // Update time display
    this.updateClock();
    setInterval(() => this.updateClock(), 1000);

    // Initialize charts
    this.initializeCharts();

    // Setup tab navigation
    this.setupTabNavigation();

    // Initialize theme toggle
    this.initializeThemeToggle();

    // Setup event listeners
    document
      .getElementById("generate-report-btn")
      .addEventListener("click", () => this.generateReport());
    document
      .getElementById("export-csv-btn")
      .addEventListener("click", () => this.exportToCSV());
    document
      .getElementById("department")
      .addEventListener("change", () => this.updateDepartmentDisplay());
  }

  // Update the clock display
  updateClock() {
    const now = new Date();
    const timeString = now.toLocaleTimeString();
    document.getElementById("current-time").textContent = timeString;
  }

  // Initialize theme toggle functionality
  initializeThemeToggle() {
    const savedTheme = localStorage.getItem("theme");
    const themeSwitch = document.getElementById("theme-switch");

    // Apply saved theme or default to dark
    if (savedTheme === "light") {
      document.body.classList.add("light-theme");
      if (themeSwitch) themeSwitch.checked = true;
      // Update charts for light theme
      setTimeout(() => this.updateChartsTheme(false), 100);
    }

    // Set up theme toggle event listener
    if (themeSwitch) {
      themeSwitch.addEventListener("change", (e) => {
        if (e.target.checked) {
          document.body.classList.add("light-theme");
          localStorage.setItem("theme", "light");
          this.updateChartsTheme(false);
        } else {
          document.body.classList.remove("light-theme");
          localStorage.setItem("theme", "dark");
          this.updateChartsTheme(true);
        }
      });
    }
  }

  // Update charts based on theme
  updateChartsTheme(isDarkTheme) {
    const charts = [
      Chart.getChart("uph-chart-canvas"),
      Chart.getChart("allin-chart-canvas"),
    ];

    charts.forEach((chart) => {
      if (!chart) return;

      // Update grid colors
      const gridColor = isDarkTheme
        ? "rgba(255, 255, 255, 0.1)"
        : "rgba(0, 0, 0, 0.1)";
      const textColor = isDarkTheme ? "#bbb" : "#666";

      chart.options.scales.x.grid.color = gridColor;
      chart.options.scales.y.grid.color = gridColor;
      chart.options.scales.x.ticks.color = textColor;
      chart.options.scales.y.ticks.color = textColor;
      chart.options.plugins.legend.labels.color = textColor;

      chart.update();
    });
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
        const tabName = onclickAttr.split("'")[3]; // Extract tab name from openTab('performance', 'tabName')

        // Activate the correct tab content
        document
          .getElementById(`performance-${tabName}`)
          .classList.add("active");
      });
    });
  }

  // Initialize performance charts with empty data
  initializeCharts() {
    // Chart configuration shared between both charts
    const chartConfig = {
      responsive: true,
      maintainAspectRatio: false,
      elements: {
        line: {
          tension: 0.2, // Smooth curve
        },
        point: {
          radius: 3,
          hitRadius: 10,
          hoverRadius: 5,
        },
      },
      scales: {
        x: {
          grid: {
            color: "rgba(200, 200, 200, 0.1)",
            drawBorder: false,
          },
          ticks: {
            color: "#999",
            maxRotation: 45,
            minRotation: 45,
            font: {
              size: 10,
            },
            autoSkip: true,
            maxTicksLimit: 12,
          },
        },
        y: {
          beginAtZero: true,
          grid: {
            color: "rgba(200, 200, 200, 0.1)",
            drawBorder: false,
          },
          ticks: {
            color: "#999",
            font: {
              size: 10,
            },
          },
        },
      },
      plugins: {
        legend: {
          display: true,
          position: "top",
          align: "end",
          labels: {
            boxWidth: 12,
            usePointStyle: true,
            pointStyle: "circle",
            color: "#666",
            font: {
              size: 11,
            },
          },
        },
        tooltip: {
          backgroundColor: "rgba(0, 0, 0, 0.7)",
          titleFont: {
            size: 12,
          },
          bodyFont: {
            size: 11,
          },
          padding: 8,
          cornerRadius: 4,
          displayColors: false,
        },
      },
    };

    // Create UPH Chart with empty data
    const uphCtx = document.getElementById("uph-chart-canvas").getContext("2d");
    const uphChart = new Chart(uphCtx, {
      type: "line",
      data: {
        labels: [],
        datasets: [
          {
            label: "Units Per Hour",
            data: [],
            borderColor: "#3498db",
            backgroundColor: "rgba(52, 152, 219, 0.1)",
            borderWidth: 2,
            fill: true,
            pointBackgroundColor: "#3498db",
          },
        ],
      },
      options: chartConfig,
    });

    // Create All-in Rate Chart with empty data
    const allinCtx = document
      .getElementById("allin-chart-canvas")
      .getContext("2d");
    const allinChart = new Chart(allinCtx, {
      type: "line",
      data: {
        labels: [],
        datasets: [
          {
            label: "All-in Rate (Units/Hour/Person)",
            data: [],
            borderColor: "#2ecc71",
            backgroundColor: "rgba(46, 204, 113, 0.1)",
            borderWidth: 2,
            fill: true,
            pointBackgroundColor: "#2ecc71",
          },
        ],
      },
      options: chartConfig,
    });
  }

  // Update department display when department selection changes
  updateDepartmentDisplay() {
    const departmentSelect = document.getElementById("department");
    const selectedOption =
      departmentSelect.options[departmentSelect.selectedIndex].text;
    document.getElementById("summary-department").textContent = selectedOption;
  }

  // Generate report based on selected date, department, and shift
  generateReport() {
    const department = document.getElementById("department").value;
    const departmentName =
      document.getElementById("department").options[
        document.getElementById("department").selectedIndex
      ].text;
    const shift = document.getElementById("shift").value;
    const reportDateInput = document.getElementById("report-date").value;
    const reportDate = new Date(reportDateInput);

    // Update summary information
    document.getElementById("summary-department").textContent = departmentName;
    document.getElementById("summary-date").textContent =
      reportDate.toLocaleDateString();

    // Set shift times
    let shiftTimes = "";
    let shiftStartHour = 0;
    switch (shift) {
      case "day":
        shiftTimes = "Day Shift (06:00 - 14:30)";
        shiftStartHour = 6;
        break;
      case "evening":
        shiftTimes = "Evening Shift (15:00 - 23:30)";
        shiftStartHour = 15;
        break;
      case "night":
        shiftTimes = "Night Shift (22:00 - 06:30)";
        shiftStartHour = 22;
        break;
    }
    document.getElementById("summary-shift").textContent = shiftTimes;

    // Get segment data for the selected date
    const segments = this.db.getSegmentData(reportDate, department);

    // Calculate report summary metrics
    const summary = this.calculateReportSummary(segments, department);

    // Update summary metrics
    document.getElementById("summary-staff").textContent = summary.totalStaff;
    document.getElementById(
      "summary-completion"
    ).textContent = `${summary.completion.toFixed(1)}%`;
    document.getElementById("summary-uph").textContent = Math.round(
      summary.avgUPH
    );
    document.getElementById("summary-all-in-rate").textContent =
      summary.avgAllInRate.toFixed(1);
    document.getElementById("summary-volume").textContent = this.formatNumber(
      summary.totalVolume
    );

    // Update charts with segment data
    this.updateChartsWithSegmentData(segments, department, shiftStartHour);

    // Populate the 15-minute segments table
    this.generateSegmentTable(segments, department);

    // Update department breakdown
    this.updateDepartmentBreakdown(reportDate);

    // Show confirmation
    alert(
      `Report generated successfully for ${departmentName} on ${reportDate.toLocaleDateString()}`
    );
  }

  // Calculate report summary metrics from segment data
  calculateReportSummary(segments, department) {
    let totalVolume = 0;
    let totalStaff = 0;
    let totalUPH = 0;
    let totalAllInRate = 0;
    let segmentCount = 0;
    let totalPlanned = 0;

    // For department-specific view
    if (department !== "all") {
      segments.forEach((segment) => {
        totalVolume += segment.data.volume || 0;
        totalPlanned += segment.data.planned || 0;
        totalStaff = Math.max(totalStaff, segment.data.staff || 0);
        totalUPH += segment.data.uph || 0;
        totalAllInRate += segment.data.allInRate || 0;
        segmentCount++;
      });
    }
    // For all departments view, we need to aggregate
    else {
      segments.forEach((segment) => {
        let segmentVolume = 0;
        let segmentPlanned = 0;
        let segmentStaff = 0;
        let segmentUPH = 0;
        let segmentAllInRate = 0;

        // Sum data across all departments in this segment
        Object.values(segment.departments).forEach((deptData) => {
          segmentVolume += deptData.volume || 0;
          segmentPlanned += deptData.planned || 0;
          segmentStaff += deptData.staff || 0;
          segmentUPH += deptData.uph || 0;
          segmentAllInRate += deptData.allInRate || 0;
        });

        totalVolume += segmentVolume;
        totalPlanned += segmentPlanned;
        totalStaff = Math.max(totalStaff, segmentStaff);
        totalUPH += segmentUPH;
        totalAllInRate += segmentAllInRate;
        segmentCount++;
      });
    }

    // Calculate averages
    const avgUPH = segmentCount > 0 ? totalUPH / segmentCount : 0;
    const avgAllInRate = segmentCount > 0 ? totalAllInRate / segmentCount : 0;
    const completion =
      totalPlanned > 0 ? (totalVolume / totalPlanned) * 100 : 0;

    return {
      totalVolume,
      totalPlanned,
      totalStaff,
      avgUPH,
      avgAllInRate,
      completion,
      segmentCount,
    };
  }

  // Update charts with segment data
  updateChartsWithSegmentData(segments, department, shiftStartHour) {
    const timeLabels = [];
    const uphData = [];
    const allInRateData = [];

    if (department !== "all") {
      // Department-specific data
      segments.forEach((segment) => {
        const time = new Date(segment.timestamp);
        const timeLabel = `${time.getHours().toString().padStart(2, "0")}:${time
          .getMinutes()
          .toString()
          .padStart(2, "0")}`;

        timeLabels.push(timeLabel);
        uphData.push(segment.data.uph || 0);
        allInRateData.push(segment.data.allInRate || 0);
      });
    } else {
      // All departments aggregated data
      segments.forEach((segment) => {
        const time = new Date(segment.timestamp);
        const timeLabel = `${time.getHours().toString().padStart(2, "0")}:${time
          .getMinutes()
          .toString()
          .padStart(2, "0")}`;

        let segmentUPH = 0;
        let segmentAllInRate = 0;
        let deptCount = 0;

        // Average data across all departments in this segment
        Object.values(segment.departments).forEach((deptData) => {
          segmentUPH += deptData.uph || 0;
          segmentAllInRate += deptData.allInRate || 0;
          deptCount++;
        });

        timeLabels.push(timeLabel);
        uphData.push(deptCount > 0 ? segmentUPH / deptCount : 0);
        allInRateData.push(deptCount > 0 ? segmentAllInRate / deptCount : 0);
      });
    }

    // Update UPH chart data
    const uphChart = Chart.getChart("uph-chart-canvas");
    uphChart.data.labels = timeLabels;
    uphChart.data.datasets[0].data = uphData;
    uphChart.update();

    // Update All-in Rate chart data
    const allinChart = Chart.getChart("allin-chart-canvas");
    allinChart.data.labels = timeLabels;
    allinChart.data.datasets[0].data = allInRateData;
    allinChart.update();
  }

  // Generate the 15-minute segment table
  generateSegmentTable(segments, department) {
    const segmentTable = document
      .getElementById("segment-table")
      .getElementsByTagName("tbody")[0];

    // Clear existing rows
    segmentTable.innerHTML = "";

    // Calculate the cumulative volumes for percentage calculation
    let cumulativeVolume = 0;
    let totalPlanned = 0;

    if (department !== "all") {
      // Get total planned volume from the last segment (or default to 0)
      if (segments.length > 0) {
        totalPlanned = segments[segments.length - 1].data.planned || 0;
      }

      // Create rows for each segment
      segments.forEach((segment) => {
        const time = new Date(segment.timestamp);
        const startTimeStr = `${time
          .getHours()
          .toString()
          .padStart(2, "0")}:${time.getMinutes().toString().padStart(2, "0")}`;

        // Calculate end time (15 minutes later)
        const endTime = new Date(time);
        endTime.setMinutes(endTime.getMinutes() + 15);
        const endTimeStr = `${endTime
          .getHours()
          .toString()
          .padStart(2, "0")}:${endTime
          .getMinutes()
          .toString()
          .padStart(2, "0")}`;

        // Update cumulative volume
        const segmentVolume = segment.data.volume || 0;
        cumulativeVolume += segmentVolume;

        // Calculate cumulative percentage
        const cumulativePercent =
          totalPlanned > 0 ? (cumulativeVolume / totalPlanned) * 100 : 0;

        // Create and append table row
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${startTimeStr} - ${endTimeStr}</td>
            <td>${segmentVolume}</td>
            <td>${segment.data.staff || 0}</td>
            <td>${Math.round(segment.data.uph || 0)}</td>
            <td>${(segment.data.allInRate || 0).toFixed(1)}</td>
            <td>${cumulativePercent.toFixed(1)}%</td>
          `;
        segmentTable.appendChild(row);
      });
    } else {
      // All departments - aggregate data
      segments.forEach((segment) => {
        const time = new Date(segment.timestamp);
        const startTimeStr = `${time
          .getHours()
          .toString()
          .padStart(2, "0")}:${time.getMinutes().toString().padStart(2, "0")}`;

        // Calculate end time (15 minutes later)
        const endTime = new Date(time);
        endTime.setMinutes(endTime.getMinutes() + 15);
        const endTimeStr = `${endTime
          .getHours()
          .toString()
          .padStart(2, "0")}:${endTime
          .getMinutes()
          .toString()
          .padStart(2, "0")}`;

        // Aggregate data across departments
        let segmentVolume = 0;
        let segmentStaff = 0;
        let segmentUPH = 0;
        let segmentAllInRate = 0;
        let deptCount = 0;

        Object.values(segment.departments).forEach((deptData) => {
          segmentVolume += deptData.volume || 0;
          segmentStaff += deptData.staff || 0;
          segmentUPH += deptData.uph || 0;
          segmentAllInRate += deptData.allInRate || 0;

          // Update total planned for the first segment only
          if (totalPlanned === 0) {
            totalPlanned += deptData.planned || 0;
          }

          deptCount++;
        });

        // Update cumulative volume
        cumulativeVolume += segmentVolume;

        // Calculate cumulative percentage
        const cumulativePercent =
          totalPlanned > 0 ? (cumulativeVolume / totalPlanned) * 100 : 0;

        // Calculate averages
        const avgUPH = deptCount > 0 ? segmentUPH / deptCount : 0;
        const avgAllInRate = deptCount > 0 ? segmentAllInRate / deptCount : 0;

        // Create and append table row
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${startTimeStr} - ${endTimeStr}</td>
            <td>${segmentVolume}</td>
            <td>${segmentStaff}</td>
            <td>${Math.round(avgUPH)}</td>
            <td>${avgAllInRate.toFixed(1)}</td>
            <td>${cumulativePercent.toFixed(1)}%</td>
          `;
        segmentTable.appendChild(row);
      });
    }
  }

  // Update department breakdown section
  updateDepartmentBreakdown(date) {
    // Get data for all departments
    const receivingSegments = this.db.getSegmentData(date, "receiving");
    const pickingSegments = this.db.getSegmentData(date, "picking");
    const shippingSegments = this.db.getSegmentData(date, "shipping");

    // Calculate summaries for each department
    const receivingSummary = this.calculateReportSummary(
      receivingSegments,
      "receiving"
    );
    const pickingSummary = this.calculateReportSummary(
      pickingSegments,
      "picking"
    );
    const shippingSummary = this.calculateReportSummary(
      shippingSegments,
      "shipping"
    );

    // Update receiving department metrics
    const receivingSection = document.querySelector(
      ".metrics-container .metric-card:nth-child(1)"
    );
    if (receivingSection) {
      receivingSection.querySelector(
        ".metric-value"
      ).textContent = `${receivingSummary.completion.toFixed(1)}%`;
      const infoBlock = receivingSection.querySelector(".info-block");
      infoBlock.innerHTML = `
          <div>Volume: <strong>${this.formatNumber(
            receivingSummary.totalVolume
          )}</strong> units</div>
          <div>Staff: <strong>${
            receivingSummary.totalStaff
          }</strong> people</div>
          <div>UPH: <strong>${Math.round(
            receivingSummary.avgUPH
          )}</strong></div>
          <div>All-in Rate: <strong>${receivingSummary.avgAllInRate.toFixed(
            1
          )}</strong></div>
        `;
    }

    // Update picking department metrics
    const pickingSection = document.querySelector(
      ".metrics-container .metric-card:nth-child(2)"
    );
    if (pickingSection) {
      pickingSection.querySelector(
        ".metric-value"
      ).textContent = `${pickingSummary.completion.toFixed(1)}%`;
      const infoBlock = pickingSection.querySelector(".info-block");
      infoBlock.innerHTML = `
          <div>Volume: <strong>${this.formatNumber(
            pickingSummary.totalVolume
          )}</strong> units</div>
          <div>Staff: <strong>${pickingSummary.totalStaff}</strong> people</div>
          <div>UPH: <strong>${Math.round(pickingSummary.avgUPH)}</strong></div>
          <div>All-in Rate: <strong>${pickingSummary.avgAllInRate.toFixed(
            1
          )}</strong></div>
        `;
    }

    // Update shipping department metrics
    const shippingSection = document.querySelector(
      ".metrics-container .metric-card:nth-child(3)"
    );
    if (shippingSection) {
      shippingSection.querySelector(
        ".metric-value"
      ).textContent = `${shippingSummary.completion.toFixed(1)}%`;
      const infoBlock = shippingSection.querySelector(".info-block");
      infoBlock.innerHTML = `
          <div>Volume: <strong>${this.formatNumber(
            shippingSummary.totalVolume
          )}</strong> units</div>
          <div>Staff: <strong>${
            shippingSummary.totalStaff
          }</strong> people</div>
          <div>UPH: <strong>${Math.round(shippingSummary.avgUPH)}</strong></div>
          <div>All-in Rate: <strong>${shippingSummary.avgAllInRate.toFixed(
            1
          )}</strong></div>
        `;
    }
  }

  // Export report data to CSV
  exportToCSV() {
    // Get report metadata
    const departmentName =
      document.getElementById("summary-department").textContent;
    const reportDate = document.getElementById("summary-date").textContent;
    const shiftInfo = document.getElementById("summary-shift").textContent;
    const supervisor =
      document.getElementById("supervisor").value || "Not specified";

    // Get comments
    const challenges = document.getElementById("challenges").value;
    const successes = document.getElementById("successes").value;
    const actionItems = document.getElementById("action-items").value;

    // Get summary metrics
    const completion =
      document.getElementById("summary-completion").textContent;
    const avgUPH = document.getElementById("summary-uph").textContent;
    const avgAllInRate = document.getElementById(
      "summary-all-in-rate"
    ).textContent;
    const totalVolume = document.getElementById("summary-volume").textContent;
    const totalStaff = document.getElementById("summary-staff").textContent;

    // Get segment data
    const segmentTable = document.getElementById("segment-table");
    const segmentRows = segmentTable
      .getElementsByTagName("tbody")[0]
      .getElementsByTagName("tr");

    // Build CSV content
    let csvContent = "data:text/csv;charset=utf-8,";

    // Add report header
    csvContent += "Supply Chain Fulfillment Center - End of Shift Report\n\n";
    csvContent += `Report Date,${reportDate}\n`;
    csvContent += `Department,${departmentName}\n`;
    csvContent += `Shift,${shiftInfo}\n`;
    csvContent += `Supervisor,${supervisor}\n\n`;

    // Add summary metrics
    csvContent += "SUMMARY METRICS\n";
    csvContent += `Total Staff,${totalStaff}\n`;
    csvContent += `Plan Completion,${completion}\n`;
    csvContent += `Average UPH,${avgUPH}\n`;
    csvContent += `Average All-in Rate,${avgAllInRate}\n`;
    csvContent += `Total Volume Processed,${totalVolume}\n\n`;

    // Add comments
    csvContent += "COMMENTS & OBSERVATIONS\n";
    csvContent += `Challenges & Issues,${this.escapeCsvField(challenges)}\n`;
    csvContent += `Successes & Improvements,${this.escapeCsvField(
      successes
    )}\n`;
    csvContent += `Action Items & Follow-up,${this.escapeCsvField(
      actionItems
    )}\n\n`;

    // Add segment data header
    csvContent += "15-MINUTE SEGMENT DATA\n";
    csvContent += "Time,Volume,Staff,UPH,All-in Rate,Cumulative %\n";

    // Add segment data rows
    for (let i = 0; i < segmentRows.length; i++) {
      const cells = segmentRows[i].getElementsByTagName("td");
      const rowData = [];

      for (let j = 0; j < cells.length; j++) {
        rowData.push(this.escapeCsvField(cells[j].textContent));
      }

      csvContent += rowData.join(",") + "\n";
    }

    // Create download link
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `ShiftReport_${departmentName}_${reportDate.replace(/\//g, "-")}.csv`
    );
    document.body.appendChild(link);

    // Trigger download
    link.click();

    // Clean up
    document.body.removeChild(link);

    alert("CSV report has been generated and downloaded.");
  }

  // Helper function to escape CSV field content
  escapeCsvField(field) {
    if (field === null || field === undefined) return "";
    let str = field.toString();
    // If the field contains commas, quotes, or newlines, wrap it in quotes
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      // Replace any quotes with double quotes for proper CSV escaping
      str = str.replace(/"/g, '""');
      return `"${str}"`;
    }
    return str;
  }

  // Format numbers with commas
  formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
}
