// database.js - Handles all data storage and retrieval
// This file should be loaded before other scripts

class Database {
  constructor() {
    // Initialize storage for persistent data
    this.departments = {};
    this.segmentData = {};
    this.settings = {
      facilityName: "Distribution Center",
      refreshRate: 60,
    };

    // Try to load data from localStorage
    this.loadFromStorage();
  }

  // Load data from localStorage if available
  loadFromStorage() {
    try {
      const savedData = localStorage.getItem("scfcDashboardData");
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        this.departments = parsedData.departments || this.departments;
        this.segmentData = parsedData.segmentData || this.segmentData;
        this.settings = parsedData.settings || this.settings;
      }
    } catch (e) {
      console.error("Error loading data from storage:", e);
    }
  }

  // Save current state to localStorage
  saveToStorage() {
    try {
      const dataToSave = {
        departments: this.departments,
        segmentData: this.segmentData,
        settings: this.settings,
      };
      localStorage.setItem("scfcDashboardData", JSON.stringify(dataToSave));
    } catch (e) {
      console.error("Error saving data to storage:", e);
    }
  }

  // Initialize a department if it doesn't exist
  initializeDepartment(dept) {
    if (!this.departments[dept]) {
      this.departments[dept] = {
        shiftStart: this.getDefaultShiftStart(dept),
        shiftEnd: this.getDefaultShiftEnd(dept),
        volumes: this.getDefaultVolumes(dept),
        roles: this.getDefaultRoles(dept),
        totalStaff: 0,
        currentRate: 0,
        targetRate: 0,
        allInRate: 0,
        progressPercent: 0,
        projectedEndTime: "--:--",
        lastUpdated: new Date().toISOString(),
      };

      this.recalculateTotals(dept);
    }

    return this.departments[dept];
  }

  // Get default shift start time based on department
  getDefaultShiftStart(dept) {
    switch (dept) {
      case "receiving":
        return "06:00";
      case "picking":
        return "08:00";
      case "shipping":
        return "10:00";
      default:
        return "07:00";
    }
  }

  // Get default shift end time based on department
  getDefaultShiftEnd(dept) {
    switch (dept) {
      case "receiving":
        return "14:30";
      case "picking":
        return "16:30";
      case "shipping":
        return "18:30";
      default:
        return "15:30";
    }
  }

  // Get default volumes based on department
  getDefaultVolumes(dept) {
    if (dept === "receiving") {
      return {
        categories: [
          { name: "Pallets", planned: 200, actual: 0 },
          { name: "Cartons", planned: 1000, actual: 0 },
          { name: "Conveyable", planned: 500, actual: 0 },
        ],
        totalPlanned: 1700,
        totalActual: 0,
      };
    } else if (dept === "picking") {
      return {
        categories: [
          { name: "Orders", planned: 2000, actual: 0 },
          { name: "Lines", planned: 5000, actual: 0 },
          { name: "Units", planned: 8000, actual: 0 },
          { name: "Totes", planned: 1200, actual: 0 },
        ],
        totalPlanned: 16200,
        totalActual: 0,
      };
    } else if (dept === "shipping") {
      return {
        categories: [
          { name: "Packages", planned: 3000, actual: 0 },
          { name: "Pallets", planned: 150, actual: 0 },
        ],
        totalPlanned: 3150,
        totalActual: 0,
      };
    }

    return {
      categories: [{ name: "Units", planned: 1000, actual: 0 }],
      totalPlanned: 1000,
      totalActual: 0,
    };
  }

  // Get default roles based on department
  getDefaultRoles(dept) {
    if (dept === "receiving") {
      return [
        { id: 1, name: "Unloader", staff: 5, rate: 8, volumeType: 1 },
        { id: 2, name: "Scanner", staff: 8, rate: 15, volumeType: 2 },
        { id: 3, name: "Sorter", staff: 6, rate: 25, volumeType: 3 },
      ];
    } else if (dept === "picking") {
      return [
        { id: 1, name: "Order Picker", staff: 6, rate: 40, volumeType: 1 },
        { id: 2, name: "Line Picker", staff: 10, rate: 60, volumeType: 2 },
        { id: 3, name: "Unit Picker", staff: 12, rate: 80, volumeType: 3 },
        { id: 4, name: "Tote Runner", staff: 5, rate: 30, volumeType: 4 },
      ];
    } else if (dept === "shipping") {
      return [
        { id: 1, name: "Packer", staff: 12, rate: 25, volumeType: 1 },
        { id: 2, name: "Scanner", staff: 8, rate: 30, volumeType: 1 },
        { id: 3, name: "Loader", staff: 5, rate: 6, volumeType: 2 },
      ];
    }

    return [{ id: 1, name: "Associate", staff: 5, rate: 20, volumeType: 1 }];
  }

  // Update department information
  updateDepartment(dept, data) {
    // Initialize if not exists
    this.initializeDepartment(dept);

    // Update with new data
    Object.assign(this.departments[dept], data, {
      lastUpdated: new Date().toISOString(),
    });

    // Save changes
    this.saveToStorage();
    return this.departments[dept];
  }

  // Get department data
  getDepartment(dept) {
    return this.initializeDepartment(dept);
  }

  // Get all departments
  getAllDepartments() {
    // Ensure all core departments are initialized
    this.initializeDepartment("receiving");
    this.initializeDepartment("picking");
    this.initializeDepartment("shipping");

    return this.departments;
  }

  // Update volumes for a department
  updateVolumes(dept, volumeData) {
    const department = this.initializeDepartment(dept);

    // Update category volumes
    if (volumeData.categories) {
      department.volumes.categories = volumeData.categories;
    }

    // Recalculate totals
    this.recalculateTotals(dept);

    // Save changes
    this.saveToStorage();
    return department;
  }

  // Recalculate department totals
  recalculateTotals(dept) {
    const department = this.departments[dept];
    if (!department) return;

    // Calculate total planned and actual volumes
    let totalPlanned = 0;
    let totalActual = 0;

    department.volumes.categories.forEach((category) => {
      totalPlanned += parseInt(category.planned) || 0;
      totalActual += parseInt(category.actual) || 0;
    });

    department.volumes.totalPlanned = totalPlanned;
    department.volumes.totalActual = totalActual;

    // Calculate progress percentage
    department.progressPercent =
      totalPlanned > 0 ? (totalActual / totalPlanned) * 100 : 0;

    // Calculate total staff
    let totalStaff = 0;
    department.roles.forEach((role) => {
      totalStaff += parseInt(role.staff) || 0;
    });
    department.totalStaff = totalStaff;

    // Calculate rates by volume type
    const volumeRates = {};
    department.volumes.categories.forEach((category, index) => {
      volumeRates[index + 1] = {
        staff: 0,
        rate: 0,
        planned: category.planned,
        actual: category.actual,
      };
    });

    // Calculate staff and rates by volume type
    department.roles.forEach((role) => {
      const volumeType = parseInt(role.volumeType);
      const staffCount = parseInt(role.staff) || 0;
      const rate = parseInt(role.rate) || 0;

      if (volumeRates[volumeType]) {
        volumeRates[volumeType].staff += staffCount;
        volumeRates[volumeType].rate += rate * staffCount;
      }
    });

    // Update department rates
    let totalRate = 0;
    for (const volumeType in volumeRates) {
      totalRate += volumeRates[volumeType].rate;
    }

    department.currentRate = totalRate;

    // Calculate target rate
    const shiftLength = this.calculateShiftLength(
      department.shiftStart,
      department.shiftEnd
    );
    department.targetRate =
      totalPlanned > 0 && shiftLength > 0 ? totalPlanned / shiftLength : 0;

    // Calculate all-in rate
    const hoursWorked = this.calculateHoursWorked(dept, new Date());
    department.allInRate =
      totalStaff > 0 && hoursWorked > 0
        ? totalActual / (totalStaff * hoursWorked)
        : 0;

    // Calculate projected end time
    department.projectedEndTime = this.calculateProjectedEndTime(
      dept,
      volumeRates
    );

    // Save changes
    this.saveToStorage();
  }

  // Calculate hours worked for a department
  calculateHoursWorked(dept, currentTime) {
    const department = this.getDepartment(dept);
    if (!department || !department.shiftStart) return 0;

    const [sosHours, sosMinutes] = department.shiftStart.split(":").map(Number);
    const sosDate = new Date(currentTime);
    sosDate.setHours(sosHours, sosMinutes, 0, 0);

    // If shift hasn't started yet, return 0
    if (sosDate > currentTime) return 0;

    // Calculate hours worked
    const hoursWorked = (currentTime - sosDate) / (1000 * 60 * 60);
    return Math.max(0, hoursWorked);
  }

  // Calculate shift length in hours
  calculateShiftLength(startTime, endTime) {
    if (!startTime || !endTime) return 8; // default to 8 hours

    const [startHours, startMinutes] = startTime.split(":").map(Number);
    const [endHours, endMinutes] = endTime.split(":").map(Number);

    let hours = endHours - startHours;
    let minutes = endMinutes - startMinutes;

    if (minutes < 0) {
      hours--;
      minutes += 60;
    }

    // If end time is earlier than start time, assume next day
    if (hours < 0) {
      hours += 24;
    }

    return hours + minutes / 60;
  }

  // Calculate projected end time based on current data
  calculateProjectedEndTime(dept, volumeRates) {
    const department = this.getDepartment(dept);
    let latestEndTime = "";
    let latestMinutes = 0;

    // Check each volume category
    department.volumes.categories.forEach((category, index) => {
      const volumeType = index + 1;
      const planned = parseInt(category.planned) || 0;
      const actual = parseInt(category.actual) || 0;
      const remaining = planned - actual;

      // Skip if no remaining volume or no staff/rate for this type
      if (
        remaining <= 0 ||
        !volumeRates[volumeType] ||
        volumeRates[volumeType].staff <= 0 ||
        volumeRates[volumeType].rate <= 0
      ) {
        return;
      }

      // Calculate projected end time for this volume type
      const hourlyRate = volumeRates[volumeType].rate;
      const hoursRemaining = remaining / hourlyRate;

      // Add remaining hours to current time
      const now = new Date();
      const endTime = new Date(now.getTime() + hoursRemaining * 60 * 60 * 1000);
      const endHours = endTime.getHours();
      const endMinutes = endTime.getMinutes();

      const projEndTime = `${endHours.toString().padStart(2, "0")}:${endMinutes
        .toString()
        .padStart(2, "0")}`;
      const projEndMinutes = endHours * 60 + endMinutes;

      // Keep track of the latest end time
      if (projEndMinutes > latestMinutes) {
        latestMinutes = projEndMinutes;
        latestEndTime = projEndTime;
      }
    });

    return latestEndTime || "--:--";
  }

  // Record performance data for 15-minute segment
  recordSegmentData() {
    const now = new Date();
    const segmentStart = new Date(now);
    segmentStart.setMinutes(
      Math.floor(segmentStart.getMinutes() / 15) * 15,
      0,
      0
    );

    const segmentKey = segmentStart.toISOString();
    const departments = this.getAllDepartments();

    if (!this.segmentData[segmentKey]) {
      this.segmentData[segmentKey] = {
        timestamp: segmentKey,
        departments: {},
      };
    }

    // Record current data for each department
    for (const dept in departments) {
      const deptData = departments[dept];

      this.segmentData[segmentKey].departments[dept] = {
        staff: deptData.totalStaff,
        volume: deptData.volumes.totalActual,
        planned: deptData.volumes.totalPlanned,
        uph: deptData.currentRate,
        allInRate: deptData.allInRate,
        progressPercent: deptData.progressPercent,
        volumeCategories: deptData.volumes.categories.map((cat) => ({
          name: cat.name,
          planned: cat.planned,
          actual: cat.actual,
        })),
      };
    }

    // Save changes
    this.saveToStorage();

    return this.segmentData[segmentKey];
  }

  // Get segment data for a specific date and department
  getSegmentData(date, dept = null) {
    const segments = [];
    const datePrefix = date.toISOString().split("T")[0];

    for (const segmentKey in this.segmentData) {
      // Filter by date
      if (!segmentKey.startsWith(datePrefix)) continue;

      const segmentData = this.segmentData[segmentKey];

      if (dept && dept !== "all") {
        // Return department-specific data
        if (segmentData.departments[dept]) {
          segments.push({
            timestamp: segmentData.timestamp,
            data: segmentData.departments[dept],
          });
        }
      } else {
        // Return all departments data
        segments.push(segmentData);
      }
    }

    // Sort segments by timestamp
    segments.sort((a, b) => {
      return new Date(a.timestamp) - new Date(b.timestamp);
    });

    return segments;
  }

  // Update settings
  updateSettings(settings) {
    Object.assign(this.settings, settings);
    this.saveToStorage();
    return this.settings;
  }

  // Get settings
  getSettings() {
    return this.settings;
  }

  // Clear all data (for testing or reset)
  clearAllData() {
    this.departments = {};
    this.segmentData = {};
    localStorage.removeItem("scfcDashboardData");
  }
}

// Initialize the database
const db = new Database();
