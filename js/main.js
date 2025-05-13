// main.js - Main initialization code for both dashboard and report pages

document.addEventListener("DOMContentLoaded", function () {
  // Detect which page we're on
  const isDashboardPage =
    document.querySelector(".department-container") !== null;
  const isReportPage = document.querySelector(".report-container") !== null;

  // Initialize the database connection
  window.openTab = function (dept, tabName) {
    if (window.dashboard) {
      dashboard.openTab(dept, tabName);
    } else {
      console.error("Dashboard not initialized");
    }
  };

  // Initialize the appropriate page
  if (isDashboardPage) {
    // Dashboard page
    window.dashboard = new Dashboard();
    dashboard.initialize();

    // Expose methods for button onclick handlers
    window.openTab = (dept, tabName) => dashboard.openTab(dept, tabName);
    window.updateAllDepartments = () => dashboard.updateAllDepartments();
    window.updateDepartment = (dept) => dashboard.updateDepartment(dept);
    window.updateDepartmentVolumes = (dept) =>
      dashboard.updateDepartmentVolumes(dept);
    window.addRole = (dept) => dashboard.addRole(dept);
    window.removeRole = (dept, roleId) => dashboard.removeRole(dept, roleId);
    window.updateRoleVolumeType = (dept) =>
      dashboard.updateRoleVolumeType(dept);
    window.calculateDepartmentTotals = (dept) =>
      dashboard.calculateDepartmentTotals(dept);
    window.updateRoleBasedProjection = (dept) =>
      dashboard.updateRoleBasedProjection(dept);
  } else if (isReportPage) {
    // Report page
    window.reportGenerator = new EOSReportGenerator(db);
    reportGenerator.initialize();

    // Expose method for button onclick handler
    window.openTab = (container, tabName) => {
      // Hide all tab contents for the container
      document
        .querySelectorAll(
          `#${container}-graphs, #${container}-segments, #${container}-departments`
        )
        .forEach((tab) => {
          tab.classList.remove("active");
        });

      // Remove active class from all tab buttons in this container
      document
        .querySelectorAll(
          `.tab-container:has(#${container}-graphs) .tab-button`
        )
        .forEach((button) => {
          button.classList.remove("active");
        });

      // Show the selected tab content
      document
        .getElementById(`${container}-${tabName}`)
        .classList.add("active");

      // Add active class to the clicked button
      const buttonIndex = ["graphs", "segments", "departments"].indexOf(
        tabName
      );
      const buttons = document.querySelectorAll(
        `.tab-container:has(#${container}-graphs) .tab-button`
      );
      if (buttonIndex >= 0 && buttons[buttonIndex]) {
        buttons[buttonIndex].classList.add("active");
      }
    };
  }
});
