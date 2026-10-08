"""
analytics.py - Calculations & In-Memory Operations

Contains all analytical calculations for:
1. Assignment Submissions (Rate, Counts, Subject Breakdown)
2. Attendance Monitoring & 75% Criterion
3. Internal Marks Conversion (/50 + /30 + /20 = /100 -> /30 scale)
4. In-Memory record update operations
"""

import pandas as pd
from data import students, submissions, attendance, marks, subjects, assignments_list


# -----------------------------------------------------------------------------
# 1. Student Lookup & Basic Helpers
# -----------------------------------------------------------------------------

def get_student_by_enrollment(enrollment):
    """Find student dictionary by enrollment ID."""
    enr_clean = enrollment.strip().upper()
    return next((s for s in students if s["enrollment"].upper() == enr_clean), None)


# -----------------------------------------------------------------------------
# 2. Submission Analytics
# -----------------------------------------------------------------------------

def get_submission_counts(enrollment=None):
    """Calculate total, submitted, pending, and late submissions."""
    records = submissions
    if enrollment:
        enr_clean = enrollment.strip().upper()
        records = [s for s in submissions if s["enrollment"].upper() == enr_clean]

    total = len(records)
    submitted = sum(1 for s in records if s["status"] == "Submitted")
    pending = sum(1 for s in records if s["status"] == "Pending")
    late = sum(1 for s in records if s["status"] == "Late")

    return {"total": total, "submitted": submitted, "pending": pending, "late": late}


def calculate_submission_rate():
    """Overall submission completion rate (%) across the entire class."""
    counts = get_submission_counts()
    if counts["total"] == 0:
        return 0.0
    return round(((counts["submitted"] + counts["late"]) / counts["total"]) * 100.0, 1)


def calculate_student_submission_rate(enrollment):
    """Individual student's submission completion rate (%)."""
    counts = get_submission_counts(enrollment)
    if counts["total"] == 0:
        return 0.0
    return round(((counts["submitted"] + counts["late"]) / counts["total"]) * 100.0, 1)


def get_subject_wise_submission_rate():
    """Calculate submission rate (%) per subject."""
    df = pd.DataFrame(submissions)
    rates = {}
    for sub in subjects:
        sub_df = df[df["subject"] == sub]
        if not sub_df.empty:
            done = len(sub_df[sub_df["status"].isin(["Submitted", "Late"])])
            rates[sub] = round((done / len(sub_df)) * 100.0, 1)
        else:
            rates[sub] = 0.0
    return rates


# -----------------------------------------------------------------------------
# 3. Attendance Analytics & 75% Criterion
# -----------------------------------------------------------------------------

def calculate_attendance_percentage(enrollment, subject=None):
    """
    Calculate attendance percentage: (Attended / Total) * 100.
    If subject is omitted, calculates overall average attendance percentage.
    """
    enr_clean = enrollment.strip().upper()
    records = [a for a in attendance if a["enrollment"].upper() == enr_clean]
    if subject:
        records = [a for a in records if a["subject"] == subject]

    if not records:
        return 0.0

    total_lec = sum(a["total_lectures"] for a in records)
    attended_lec = sum(a["attended"] for a in records)
    return round((attended_lec / total_lec) * 100.0, 1) if total_lec > 0 else 0.0


def get_student_attendance_records(enrollment):
    """Return subject-wise attendance breakdown and 75% eligibility status."""
    enr_clean = enrollment.strip().upper()
    results = []
    for a in attendance:
        if a["enrollment"].upper() == enr_clean:
            pct = round((a["attended"] / a["total_lectures"]) * 100.0, 1) if a["total_lectures"] > 0 else 0.0
            results.append({
                "subject": a["subject"],
                "total_lectures": a["total_lectures"],
                "attended": a["attended"],
                "percentage": pct,
                "status": "Eligible" if pct >= 75.0 else "Attendance Shortage"
            })
    return results


def get_students_below_75():
    """Identify all students with overall attendance strictly below 75%."""
    shortage = []
    for s in students:
        pct = calculate_attendance_percentage(s["enrollment"])
        if pct < 75.0:
            shortage.append({"enrollment": s["enrollment"], "name": s["name"], "attendance_pct": pct})
    return shortage


# -----------------------------------------------------------------------------
# 4. Internal Marks Analytics (/100 to /30 scale)
# -----------------------------------------------------------------------------

def calculate_internal_marks(enrollment, subject=None):
    """
    Calculate converted internal marks out of 30:
    Formula: (Mid Sem /50 + Assignment /30 + Viva /20) / 100 * 30
    """
    enr_clean = enrollment.strip().upper()
    records = [m for m in marks if m["enrollment"].upper() == enr_clean]
    if subject:
        records = [m for m in records if m["subject"] == subject]
        if not records:
            return 0.0
        m = records[0]
        tot = m["mid_sem"] + m["assignment"] + m["viva"]
        return round((tot / 100.0) * 30.0, 1)

    if not records:
        return 0.0
    totals = [(m["mid_sem"] + m["assignment"] + m["viva"]) for m in records]
    avg_total = sum(totals) / len(totals)
    return round((avg_total / 100.0) * 30.0, 1)


def get_student_marks_records(enrollment):
    """Return subject-wise internal evaluation breakdown for a student."""
    enr_clean = enrollment.strip().upper()
    results = []
    for m in marks:
        if m["enrollment"].upper() == enr_clean:
            tot = round(m["mid_sem"] + m["assignment"] + m["viva"], 1)
            results.append({
                "subject": m["subject"],
                "mid_sem": m["mid_sem"],
                "assignment": m["assignment"],
                "viva": m["viva"],
                "total": tot,
                "converted_30": round((tot / 100.0) * 30.0, 1)
            })
    return results


# -----------------------------------------------------------------------------
# 5. Summaries & Complete Profile Data for Web UI
# -----------------------------------------------------------------------------

def get_overall_kpis():
    """Summary metrics displayed on the top cards of the dashboard."""
    counts = get_submission_counts()
    return {
        "total_students": len(students),
        "submission_rate": calculate_submission_rate(),
        "pending_submissions": counts["pending"],
        "late_submissions": counts["late"],
        "students_below_75": len(get_students_below_75())
    }


def get_student_summary_table():
    """All students summary for the main directory table."""
    summary = []
    for s in students:
        enr = s["enrollment"]
        att_pct = calculate_attendance_percentage(enr)
        summary.append({
            "enrollment": enr,
            "name": s["name"],
            "submission_pct": calculate_student_submission_rate(enr),
            "attendance_pct": att_pct,
            "attendance_status": "Eligible" if att_pct >= 75.0 else "Shortage",
            "internal_30": calculate_internal_marks(enr)
        })
    return summary


def get_student_full_profile(enrollment):
    """Complete profile including all 3 subparts for a specific student."""
    st = get_student_by_enrollment(enrollment)
    if not st:
        return None

    counts = get_submission_counts(enrollment)
    att_pct = calculate_attendance_percentage(enrollment)

    student_subs = [s for s in submissions if s["enrollment"].upper() == enrollment.strip().upper()]

    return {
        "student": st,
        "kpis": {
            "total_assignments": counts["total"],
            "submitted": counts["submitted"],
            "pending": counts["pending"],
            "late": counts["late"],
            "submission_rate": calculate_student_submission_rate(enrollment),
            "attendance_pct": att_pct,
            "attendance_status": "Eligible" if att_pct >= 75.0 else "Attendance Shortage",
            "avg_internal_30": calculate_internal_marks(enrollment)
        },
        "submissions": student_subs,
        "attendance": get_student_attendance_records(enrollment),
        "marks": get_student_marks_records(enrollment)
    }


# -----------------------------------------------------------------------------
# 6. In-Memory Update Functions
# -----------------------------------------------------------------------------

def update_submission_status(enrollment, subject, assignment, status):
    """Update status of a student's submission in memory."""
    enr_clean = enrollment.strip().upper()
    for sub in submissions:
        if sub["enrollment"].upper() == enr_clean and sub["subject"] == subject and sub["assignment"] == assignment:
            sub["status"] = status
            sub["submission_date"] = "-" if status == "Pending" else "2026-10-08"
            return True
    return False


def update_attendance(enrollment, subject, total_lectures, attended):
    """Update lectures for a student's subject in memory."""
    enr_clean = enrollment.strip().upper()
    for att in attendance:
        if att["enrollment"].upper() == enr_clean and att["subject"] == subject:
            att["total_lectures"] = int(total_lectures)
            att["attended"] = int(attended)
            return True
    return False


def update_marks(enrollment, subject, mid_sem, assignment, viva):
    """Update internal marks for a student's subject in memory."""
    enr_clean = enrollment.strip().upper()
    for m in marks:
        if m["enrollment"].upper() == enr_clean and m["subject"] == subject:
            m["mid_sem"] = float(mid_sem)
            m["assignment"] = float(assignment)
            m["viva"] = float(viva)
            return True
    return False
