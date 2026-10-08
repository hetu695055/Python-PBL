"""
main.py - Web Server & Application Entry Point
Student Submission & Performance Analytics Dashboard

Features:
- Minimal, clean Light Theme Web UI (HTML, CSS, JS)
- Unified Student Directory with direct navigation into detailed subparts:
    1. Subpart 1: Assignment Submissions
    2. Subpart 2: Attendance & 75% Rule
    3. Subpart 3: Internal Marks (/30 Scale)
- In-memory data store (data.py) - no database or external data files
- Runs directly with:
    python main.py
"""

import os
import threading
import webbrowser
from flask import Flask, render_template, jsonify, request
import analytics
from data import students

# Initialize Flask App
app = Flask(
    __name__,
    template_folder=os.path.join(os.path.dirname(__file__), "templates"),
    static_folder=os.path.join(os.path.dirname(__file__), "static")
)


# -----------------------------------------------------------------------------
# Frontend Page Route
# -----------------------------------------------------------------------------
@app.route("/")
def index():
    """Serves the main application single-page interface."""
    return render_template("index.html")


# -----------------------------------------------------------------------------
# REST API Endpoints
# -----------------------------------------------------------------------------

@app.route("/api/kpis", methods=["GET"])
def get_kpis():
    """Returns top KPI metrics for class overview."""
    kpi_data = analytics.get_overall_kpis()
    return jsonify(kpi_data)


@app.route("/api/students", methods=["GET"])
def get_students():
    """Returns summarized list of all students for the main directory table."""
    summary_list = analytics.get_student_summary_table()
    return jsonify(summary_list)


@app.route("/api/student/<enrollment>", methods=["GET"])
def get_student_profile(enrollment):
    """
    Returns full profile and subpart records for a specific student:
    - Subpart 1: Submissions records & counts
    - Subpart 2: Attendance records & 75% rule status
    - Subpart 3: Internal marks records (/100 and /30)
    """
    profile = analytics.get_student_full_profile(enrollment)
    if not profile:
        return jsonify({"error": "Student not found"}), 404
    return jsonify(profile)


@app.route("/api/chart-data", methods=["GET"])
def get_chart_data():
    """Returns formatted data for client-side Chart.js visualizations."""
    counts = analytics.get_submission_counts()
    subject_rates = analytics.get_subject_wise_submission_rate()

    enrollments = []
    attendance_bars = []
    internal_marks_bars = []

    for s in students:
        enr = s["enrollment"]
        enrollments.append(enr)
        attendance_bars.append(float(analytics.calculate_attendance_percentage(enr)))
        internal_marks_bars.append(float(analytics.calculate_internal_marks(enr)))

    return jsonify({
        "submission_counts": counts,
        "subject_rates": subject_rates,
        "enrollments": enrollments,
        "attendance_bars": attendance_bars,
        "internal_marks_bars": internal_marks_bars
    })


@app.route("/api/submission/update", methods=["POST"])
def update_submission():
    """Updates assignment status in memory."""
    payload = request.get_json() or {}
    enrollment = payload.get("enrollment")
    subject = payload.get("subject")
    assignment = payload.get("assignment")
    status = payload.get("status", "Submitted")

    if not (enrollment and subject and assignment):
        return jsonify({"error": "Missing parameters"}), 400

    analytics.update_submission_status(enrollment, subject, assignment, status)
    return jsonify({"success": True, "message": "Submission status updated successfully"})


@app.route("/api/attendance/update", methods=["POST"])
def update_attendance():
    """Updates attendance lectures for student and subject in memory."""
    payload = request.get_json() or {}
    enrollment = payload.get("enrollment")
    subject = payload.get("subject")
    total_lectures = payload.get("total_lectures")
    attended = payload.get("attended")

    if not (enrollment and subject and total_lectures is not None and attended is not None):
        return jsonify({"error": "Missing parameters"}), 400

    analytics.update_attendance(enrollment, subject, int(total_lectures), int(attended))
    return jsonify({"success": True, "message": "Attendance record updated successfully"})


@app.route("/api/marks/update", methods=["POST"])
def update_marks():
    """Updates internal marks for student and subject in memory."""
    payload = request.get_json() or {}
    enrollment = payload.get("enrollment")
    subject = payload.get("subject")
    mid_sem = payload.get("mid_sem")
    assignment = payload.get("assignment")
    viva = payload.get("viva")

    if not (enrollment and subject and mid_sem is not None and assignment is not None and viva is not None):
        return jsonify({"error": "Missing parameters"}), 400

    analytics.update_marks(enrollment, subject, float(mid_sem), float(assignment), float(viva))
    return jsonify({"success": True, "message": "Internal marks updated successfully"})


# -----------------------------------------------------------------------------
# Main Runner
# -----------------------------------------------------------------------------
def open_browser():
    """Open default browser to local web application."""
    webbrowser.open_new("http://127.0.0.1:5000")


def main():
    port = 5000
    print(f"\n=======================================================")
    print(f" Student Submission & Performance Analytics Dashboard")
    print(f" Web UI running at: http://127.0.0.1:{port}")
    print(f" Press Ctrl+C in terminal to stop the server.")
    print(f"=======================================================\n")

    # Automatically launch browser after 1 second
    threading.Timer(1.0, open_browser).start()

    # Start Flask server
    app.run(host="127.0.0.1", port=port, debug=False)


if __name__ == "__main__":
    main()
