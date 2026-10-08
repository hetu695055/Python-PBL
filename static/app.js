/**
 * app.js - Frontend Logic for Student Submission & Analytics
 * Clean, lightweight vanilla JavaScript implementation.
 */

// Global state
let currentEnrollment = null;
let chartsInstances = {};
let allStudentsData = [];

document.addEventListener("DOMContentLoaded", () => {
    initApp();

    // Listen for live calculation preview on marks edit form
    const midInput = document.getElementById("marks-edit-mid");
    const assignInput = document.getElementById("marks-edit-assign");
    const vivaInput = document.getElementById("marks-edit-viva");

    [midInput, assignInput, vivaInput].forEach(inp => {
        if (inp) inp.addEventListener("input", updateMarksFormPreview);
    });
});

// -----------------------------------------------------------------------------
// App Initialization
// -----------------------------------------------------------------------------
async function initApp() {
    await fetchOverallKpis();
    await fetchStudentsList();
    await initCharts();
    checkUrlHash();
}

function checkUrlHash() {
    const hash = window.location.hash;
    if (hash.startsWith("#student/")) {
        const enr = hash.replace("#student/", "").trim();
        if (enr) {
            loadStudent(enr);
        }
    }
}

// -----------------------------------------------------------------------------
// View Switching & Navigation
// -----------------------------------------------------------------------------
function navigateToStudentsList() {
    currentEnrollment = null;
    document.getElementById("view-students-list").classList.add("active");
    document.getElementById("view-student-details").classList.remove("active");
    window.location.hash = "";
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function switchSubpart(subpartName) {
    // Buttons
    document.querySelectorAll(".subpart-tab-link").forEach(btn => btn.classList.remove("active"));
    const activeBtn = document.getElementById(`tab-link-${subpartName}`);
    if (activeBtn) activeBtn.classList.add("active");

    // Content containers
    document.querySelectorAll(".subpart-content").forEach(el => el.classList.remove("active"));
    const activeContent = document.getElementById(`subpart-${subpartName}`);
    if (activeContent) activeContent.classList.add("active");
}

function toggleCharts() {
    const wrapper = document.getElementById("charts-wrapper");
    const textSpan = document.getElementById("charts-toggle-text");
    if (wrapper.style.display === "none") {
        wrapper.style.display = "grid";
        textSpan.textContent = "Hide Charts ▲";
    } else {
        wrapper.style.display = "none";
        textSpan.textContent = "Show Charts ▼";
    }
}

// -----------------------------------------------------------------------------
// Fetch Class KPIs & Summary Data
// -----------------------------------------------------------------------------
async function fetchOverallKpis() {
    try {
        const res = await fetch("/api/kpis");
        const data = await res.json();

        document.getElementById("kpi-total-students").textContent = data.total_students;
        document.getElementById("kpi-submission-rate").textContent = `${data.submission_rate}%`;
        document.getElementById("kpi-pending-count").textContent = data.pending_submissions;
        document.getElementById("kpi-late-count").textContent = data.late_submissions;
        document.getElementById("kpi-below-75").textContent = data.students_below_75;

        // Header rate badge
        document.getElementById("class-rate-badge").innerHTML = `Class Submission Rate: <strong>${data.submission_rate}%</strong>`;
    } catch (err) {
        console.error("Failed to load KPIs:", err);
    }
}

async function fetchStudentsList() {
    try {
        const res = await fetch("/api/students");
        allStudentsData = await res.json();

        renderStudentsTable(allStudentsData);
        populateStudentSwitcher(allStudentsData);
    } catch (err) {
        console.error("Failed to load students list:", err);
    }
}

function renderStudentsTable(students) {
    const tbody = document.getElementById("students-table-body");
    tbody.innerHTML = "";

    students.forEach(st => {
        const isShortage = st.attendance_pct < 75.0;
        const tr = document.createElement("tr");
        tr.className = `clickable-row ${isShortage ? "row-shortage" : ""}`;

        // Status badge
        const attBadge = isShortage
            ? `<span class="status-pill pill-shortage">⚠ Shortage (${st.attendance_pct}%)</span>`
            : `<span class="status-pill pill-eligible">✓ Eligible (${st.attendance_pct}%)</span>`;

        tr.innerHTML = `
            <td><strong>${st.enrollment}</strong></td>
            <td>${st.name}</td>
            <td><strong>${st.submission_pct}%</strong></td>
            <td>${st.attendance_pct}%</td>
            <td>${attBadge}</td>
            <td><strong>${st.internal_30} / 30</strong></td>
            <td class="text-right">
                <button class="btn-link" onclick="event.stopPropagation(); loadStudent('${st.enrollment}')">
                    View Details & Subparts ➔
                </button>
            </td>
        `;

        tr.addEventListener("click", () => loadStudent(st.enrollment));
        tbody.appendChild(tr);
    });
}

function populateStudentSwitcher(students) {
    const select = document.getElementById("select-student-quick");
    select.innerHTML = "";
    students.forEach(st => {
        const opt = document.createElement("option");
        opt.value = st.enrollment;
        opt.textContent = `${st.enrollment} - ${st.name}`;
        select.appendChild(opt);
    });
}

function filterStudentsTable() {
    const query = document.getElementById("student-search-input").value.trim().toLowerCase();
    const filtered = allStudentsData.filter(st => {
        return st.enrollment.toLowerCase().includes(query) || st.name.toLowerCase().includes(query);
    });
    renderStudentsTable(filtered);
}

// -----------------------------------------------------------------------------
// Load Specific Student & Subparts
// -----------------------------------------------------------------------------
async function loadStudent(enrollment) {
    currentEnrollment = enrollment;

    try {
        const res = await fetch(`/api/student/${encodeURIComponent(enrollment)}`);
        if (!res.ok) throw new Error("Student not found");
        const data = await res.json();

        // Switch active view
        document.getElementById("view-students-list").classList.remove("active");
        document.getElementById("view-student-details").classList.add("active");
        window.location.hash = `#student/${enrollment}`;
        window.scrollTo({ top: 0, behavior: "smooth" });

        // Update breadcrumb & switcher
        document.getElementById("bc-student-name").textContent = `${data.student.enrollment} - ${data.student.name}`;
        document.getElementById("select-student-quick").value = enrollment;

        // Profile Header
        document.getElementById("student-detail-name").textContent = data.student.name;
        document.getElementById("student-detail-enrollment").textContent = `Enrollment: ${data.student.enrollment}`;
        document.getElementById("student-detail-internal").textContent = `${data.kpis.avg_internal_30} / 30`;

        // Avatar Initials
        const initials = data.student.name.split(" ").map(n => n[0]).join("").substring(0, 2);
        document.getElementById("student-avatar-initials").textContent = initials;

        // Attendance Pill
        const isEligible = data.kpis.attendance_pct >= 75.0;
        const pill = document.getElementById("student-att-pill");
        if (isEligible) {
            pill.className = "status-pill pill-eligible";
            pill.textContent = `✓ Attendance Eligible (${data.kpis.attendance_pct}%)`;
        } else {
            pill.className = "status-pill pill-shortage";
            pill.textContent = `⚠ Attendance Shortage (${data.kpis.attendance_pct}%)`;
        }

        // Student KPIs
        document.getElementById("st-kpi-total").textContent = data.kpis.total_assignments;
        document.getElementById("st-kpi-submitted").textContent = data.kpis.submitted;
        document.getElementById("st-kpi-pending").textContent = data.kpis.pending;
        document.getElementById("st-kpi-late").textContent = data.kpis.late;
        document.getElementById("st-kpi-rate").textContent = `${data.kpis.submission_rate}%`;

        // Render Subparts
        renderSubpartSubmissions(data.submissions);
        renderSubpartAttendance(data.attendance, data.kpis.attendance_pct);
        renderSubpartMarks(data.marks);

        // Reset to subpart 1 by default
        switchSubpart("submissions");

    } catch (err) {
        console.error("Error loading student details:", err);
        showToast("Error loading student details");
    }
}

// -----------------------------------------------------------------------------
// Subpart 1: Render Submissions
// -----------------------------------------------------------------------------
function renderSubpartSubmissions(submissions) {
    const tbody = document.getElementById("student-submissions-tbody");
    tbody.innerHTML = "";

    submissions.forEach(sub => {
        const tr = document.createElement("tr");

        let statusPillClass = "pill-pending";
        if (sub.status === "Submitted") statusPillClass = "pill-submitted";
        else if (sub.status === "Late") statusPillClass = "pill-late";

        tr.innerHTML = `
            <td><strong>${sub.subject}</strong></td>
            <td>${sub.assignment}</td>
            <td>${sub.due_date}</td>
            <td>${sub.submission_date || "-"}</td>
            <td>
                <span class="status-pill ${statusPillClass}">${sub.status}</span>
            </td>
            <td>
                <select class="status-select" onchange="quickUpdateStatus('${sub.subject}', '${sub.assignment}', this.value)">
                    <option value="Submitted" ${sub.status === "Submitted" ? "selected" : ""}>Submitted</option>
                    <option value="Pending" ${sub.status === "Pending" ? "selected" : ""}>Pending</option>
                    <option value="Late" ${sub.status === "Late" ? "selected" : ""}>Late</option>
                </select>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function quickUpdateStatus(subject, assignment, newStatus) {
    try {
        const res = await fetch("/api/submission/update", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                enrollment: currentEnrollment,
                subject: subject,
                assignment: assignment,
                status: newStatus
            })
        });
        const result = await res.json();
        if (result.success) {
            showToast(`Status updated to ${newStatus}`);
            // Reload student & class stats
            await loadStudent(currentEnrollment);
            await fetchOverallKpis();
            await fetchStudentsList();
            updateCharts();
        }
    } catch (err) {
        console.error("Failed to update status:", err);
        showToast("Failed to update submission status");
    }
}

// -----------------------------------------------------------------------------
// Subpart 2: Render Attendance & 75% Rule
// -----------------------------------------------------------------------------
function renderSubpartAttendance(attendanceList, overallPct) {
    // 75% Criterion Banner
    const banner = document.getElementById("attendance-criterion-banner");
    const heading = document.getElementById("criterion-heading");
    const desc = document.getElementById("criterion-desc");
    const icon = document.getElementById("criterion-icon");

    if (overallPct >= 75.0) {
        banner.className = "criterion-banner banner-eligible";
        icon.textContent = "✓";
        heading.textContent = `ATTENDANCE ELIGIBLE: ${overallPct}%`;
        desc.textContent = "Student satisfies the mandatory 75% minimum attendance rule and is eligible for exams.";
    } else {
        banner.className = "criterion-banner banner-shortage";
        icon.textContent = "⚠";
        heading.textContent = `ATTENDANCE SHORTAGE: ${overallPct}% (Below 75% Criterion)`;
        desc.textContent = "Critical Warning: Overall attendance is below 75%. Student has an attendance shortage.";
    }

    // Subject-wise Attendance Table
    const tbody = document.getElementById("student-attendance-tbody");
    tbody.innerHTML = "";

    attendanceList.forEach(item => {
        const tr = document.createElement("tr");
        const isSubjectEligible = item.percentage >= 75.0;

        const badge = isSubjectEligible
            ? `<span class="status-pill pill-eligible">✓ Eligible (${item.percentage}%)</span>`
            : `<span class="status-pill pill-shortage">⚠ Shortage (${item.percentage}%)</span>`;

        tr.innerHTML = `
            <td><strong>${item.subject}</strong></td>
            <td>${item.total_lectures}</td>
            <td>${item.attended}</td>
            <td><strong>${item.percentage}%</strong></td>
            <td>${badge}</td>
            <td>
                <button class="btn-secondary btn-sm" onclick="populateAttendanceForm('${item.subject}', ${item.total_lectures}, ${item.attended})">
                    Edit
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function populateAttendanceForm(subject, total, attended) {
    document.getElementById("att-edit-subject").value = subject;
    document.getElementById("att-edit-total").value = total;
    document.getElementById("att-edit-attended").value = attended;
    document.getElementById("att-edit-attended").focus();
}

async function handleAttendanceSubmit(e) {
    e.preventDefault();
    const subject = document.getElementById("att-edit-subject").value;
    const total = parseInt(document.getElementById("att-edit-total").value);
    const attended = parseInt(document.getElementById("att-edit-attended").value);

    if (attended > total || attended < 0) {
        alert("Attended lectures must be between 0 and total lectures.");
        return;
    }

    try {
        const res = await fetch("/api/attendance/update", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                enrollment: currentEnrollment,
                subject: subject,
                total_lectures: total,
                attended: attended
            })
        });
        const result = await res.json();
        if (result.success) {
            showToast(`Attendance updated for ${subject}`);
            await loadStudent(currentEnrollment);
            await fetchOverallKpis();
            await fetchStudentsList();
            updateCharts();
        }
    } catch (err) {
        console.error("Failed to update attendance:", err);
        showToast("Failed to save attendance");
    }
}

// -----------------------------------------------------------------------------
// Subpart 3: Render Internal Marks (/30 Scale)
// -----------------------------------------------------------------------------
function renderSubpartMarks(marksList) {
    const tbody = document.getElementById("student-marks-tbody");
    tbody.innerHTML = "";

    marksList.forEach(m => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><strong>${m.subject}</strong></td>
            <td>${m.mid_sem} / 50</td>
            <td>${m.assignment} / 30</td>
            <td>${m.viva} / 20</td>
            <td><strong>${m.total} / 100</strong></td>
            <td><strong style="color: var(--accent-blue);">${m.converted_30} / 30</strong></td>
            <td>
                <button class="btn-secondary btn-sm" onclick="populateMarksForm('${m.subject}', ${m.mid_sem}, ${m.assignment}, ${m.viva})">
                    Edit
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function populateMarksForm(subject, mid, assign, viva) {
    document.getElementById("marks-edit-subject").value = subject;
    document.getElementById("marks-edit-mid").value = mid;
    document.getElementById("marks-edit-assign").value = assign;
    document.getElementById("marks-edit-viva").value = viva;
    updateMarksFormPreview();
    document.getElementById("marks-edit-mid").focus();
}

function updateMarksFormPreview() {
    const mid = parseFloat(document.getElementById("marks-edit-mid").value) || 0;
    const assign = parseFloat(document.getElementById("marks-edit-assign").value) || 0;
    const viva = parseFloat(document.getElementById("marks-edit-viva").value) || 0;

    const total = Math.min(100, Math.round((mid + assign + viva) * 10) / 10);
    const converted = Math.round((total / 100 * 30) * 10) / 10;

    document.getElementById("marks-live-preview").textContent =
        `Preview: Total: ${total} / 100 ➔ Converted Internal: ${converted.toFixed(1)} / 30`;
}

async function handleMarksSubmit(e) {
    e.preventDefault();
    const subject = document.getElementById("marks-edit-subject").value;
    const mid = parseFloat(document.getElementById("marks-edit-mid").value);
    const assign = parseFloat(document.getElementById("marks-edit-assign").value);
    const viva = parseFloat(document.getElementById("marks-edit-viva").value);

    if (mid > 50 || assign > 30 || viva > 20) {
        alert("Marks exceeded: Mid Sem max is 50, Assignment max is 30, Viva max is 20.");
        return;
    }

    try {
        const res = await fetch("/api/marks/update", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                enrollment: currentEnrollment,
                subject: subject,
                mid_sem: mid,
                assignment: assign,
                viva: viva
            })
        });
        const result = await res.json();
        if (result.success) {
            showToast(`Internal marks saved for ${subject}`);
            await loadStudent(currentEnrollment);
            await fetchOverallKpis();
            await fetchStudentsList();
            updateCharts();
        }
    } catch (err) {
        console.error("Failed to update marks:", err);
        showToast("Failed to save internal marks");
    }
}

// -----------------------------------------------------------------------------
// Visual Performance Charts (Chart.js)
// -----------------------------------------------------------------------------
async function initCharts() {
    try {
        const res = await fetch("/api/chart-data");
        const data = await res.json();

        // 1. Submission Status Donut Chart
        const ctxStatus = document.getElementById("chart-submission-status").getContext("2d");
        chartsInstances.status = new Chart(ctxStatus, {
            type: "doughnut",
            data: {
                labels: ["Submitted", "Pending", "Late"],
                datasets: [{
                    data: [data.submission_counts.submitted, data.submission_counts.pending, data.submission_counts.late],
                    backgroundColor: ["#16a34a", "#dc2626", "#ea580c"],
                    borderWidth: 2,
                    borderColor: "#ffffff"
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: "bottom", labels: { boxWidth: 12, font: { size: 11 } } }
                }
            }
        });

        // 2. Subject-wise Submission Rate Bar Chart
        const ctxSubject = document.getElementById("chart-subject-rate").getContext("2d");
        chartsInstances.subject = new Chart(ctxSubject, {
            type: "bar",
            data: {
                labels: Object.keys(data.subject_rates),
                datasets: [{
                    label: "Submission Rate (%)",
                    data: Object.values(data.subject_rates),
                    backgroundColor: "#2563eb",
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, max: 100, ticks: { callback: v => `${v}%`, font: { size: 10 } } },
                    x: { ticks: { font: { size: 10 } } }
                },
                plugins: { legend: { display: false } }
            }
        });

        // 3. Student Attendance with 75% Benchmark
        const ctxAtt = document.getElementById("chart-attendance").getContext("2d");
        const attColors = data.attendance_bars.map(val => val >= 75.0 ? "#16a34a" : "#dc2626");

        chartsInstances.attendance = new Chart(ctxAtt, {
            type: "bar",
            data: {
                labels: data.enrollments,
                datasets: [{
                    label: "Attendance (%)",
                    data: data.attendance_bars,
                    backgroundColor: attColors,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: { callback: v => `${v}%`, font: { size: 10 } }
                    },
                    x: { ticks: { font: { size: 9 }, maxRotation: 45 } }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: ctx => `Attendance: ${ctx.raw}% (${ctx.raw >= 75 ? "Eligible" : "Shortage"})`
                        }
                    }
                }
            }
        });

        // 4. Internal Marks Distribution
        const ctxMarks = document.getElementById("chart-internal-marks").getContext("2d");
        chartsInstances.marks = new Chart(ctxMarks, {
            type: "bar",
            data: {
                labels: data.enrollments,
                datasets: [{
                    label: "Avg Internal (/30)",
                    data: data.internal_marks_bars,
                    backgroundColor: "#7c3aed",
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, max: 30, ticks: { callback: v => `${v}/30`, font: { size: 10 } } },
                    x: { ticks: { font: { size: 9 }, maxRotation: 45 } }
                },
                plugins: { legend: { display: false } }
            }
        });

    } catch (err) {
        console.error("Failed to initialize charts:", err);
    }
}

async function updateCharts() {
    try {
        const res = await fetch("/api/chart-data");
        const data = await res.json();

        if (chartsInstances.status) {
            chartsInstances.status.data.datasets[0].data = [
                data.submission_counts.submitted,
                data.submission_counts.pending,
                data.submission_counts.late
            ];
            chartsInstances.status.update();
        }

        if (chartsInstances.subject) {
            chartsInstances.subject.data.labels = Object.keys(data.subject_rates);
            chartsInstances.subject.data.datasets[0].data = Object.values(data.subject_rates);
            chartsInstances.subject.update();
        }

        if (chartsInstances.attendance) {
            chartsInstances.attendance.data.labels = data.enrollments;
            chartsInstances.attendance.data.datasets[0].data = data.attendance_bars;
            chartsInstances.attendance.data.datasets[0].backgroundColor =
                data.attendance_bars.map(val => val >= 75.0 ? "#16a34a" : "#dc2626");
            chartsInstances.attendance.update();
        }

        if (chartsInstances.marks) {
            chartsInstances.marks.data.labels = data.enrollments;
            chartsInstances.marks.data.datasets[0].data = data.internal_marks_bars;
            chartsInstances.marks.update();
        }
    } catch (err) {
        console.error("Failed to update charts:", err);
    }
}

// -----------------------------------------------------------------------------
// Toast Notification
// -----------------------------------------------------------------------------
function showToast(msg) {
    const toast = document.getElementById("toast");
    toast.textContent = msg;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 3000);
}
