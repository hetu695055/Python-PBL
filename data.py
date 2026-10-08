"""
data.py - In-Memory Academic Dataset Storage

Stores student details, assignment submissions, attendance records,
and internal marks in native Python lists and dictionaries.
No database or external files are used.
"""

# -------------------------------------------------------------------------
# 1. 20 Realistic Students
# -------------------------------------------------------------------------
students = [
    {"enrollment": "23AI001", "name": "Aarav Sharma"},
    {"enrollment": "23AI002", "name": "Diya Patel"},
    {"enrollment": "23AI003", "name": "Rohan Mehta"},
    {"enrollment": "23AI004", "name": "Ananya Iyer"},
    {"enrollment": "23AI005", "name": "Aditya Verma"},
    {"enrollment": "23AI006", "name": "Kavya Nair"},
    {"enrollment": "23AI007", "name": "Ishaan Joshi"},
    {"enrollment": "23AI008", "name": "Sneha Rao"},
    {"enrollment": "23AI009", "name": "Vikram Malhotra"},
    {"enrollment": "23AI010", "name": "Pooja Gupta"},
    {"enrollment": "23AI011", "name": "Arjun Reddy"},
    {"enrollment": "23AI012", "name": "Priya Singh"},
    {"enrollment": "23AI013", "name": "Siddharth Das"},
    {"enrollment": "23AI014", "name": "Neha Kulkarni"},
    {"enrollment": "23AI015", "name": "Rahul Sen"},
    {"enrollment": "23AI016", "name": "Tanvi Bhatia"},
    {"enrollment": "23AI017", "name": "Karan Kapoor"},
    {"enrollment": "23AI018", "name": "Meera Pillai"},
    {"enrollment": "23AI019", "name": "Aman Khan"},
    {"enrollment": "23AI020", "name": "Riya Mukherjee"}
]

# -------------------------------------------------------------------------
# 2. 4 Core Subjects & Assignment Schedule
# -------------------------------------------------------------------------
subjects = [
    "Python Programming",
    "Data Structures",
    "Database Systems",
    "Computer Networks"
]

assignments_list = [
    {"subject": "Python Programming", "assignment": "Assignment 1", "due_date": "2026-09-10"},
    {"subject": "Python Programming", "assignment": "Assignment 2", "due_date": "2026-09-25"},
    {"subject": "Data Structures", "assignment": "Assignment 1", "due_date": "2026-09-12"},
    {"subject": "Data Structures", "assignment": "Assignment 2", "due_date": "2026-09-28"},
    {"subject": "Database Systems", "assignment": "Assignment 1", "due_date": "2026-09-15"},
    {"subject": "Database Systems", "assignment": "Assignment 2", "due_date": "2026-09-30"},
    {"subject": "Computer Networks", "assignment": "Assignment 1", "due_date": "2026-09-18"},
    {"subject": "Computer Networks", "assignment": "Assignment 2", "due_date": "2026-10-05"},
]

# -------------------------------------------------------------------------
# 3. In-Memory Lists (Generated with Realistic Distribution)
# -------------------------------------------------------------------------
submissions = []
attendance = []
marks = []

# Students specifically designated with lower attendance for testing 75% criterion
shortage_enrollments = {"23AI003": 27, "23AI007": 26, "23AI015": 24, "23AI020": 29}

for st in students:
    enr = st["enrollment"]

    # 1. Submissions (8 per student = 160 total)
    for a in assignments_list:
        sub_name = a["subject"]
        assign_name = a["assignment"]

        # Realistic Pending/Late cases for demonstration
        if enr in ["23AI003", "23AI007", "23AI015"] and assign_name == "Assignment 2":
            status = "Pending"
            sub_date = "-"
        elif enr in ["23AI002", "23AI005", "23AI017"] and assign_name == "Assignment 1" and sub_name == "Python Programming":
            status = "Late"
            sub_date = "2026-09-12"
        elif enr in ["23AI010", "23AI012", "23AI019"] and assign_name == "Assignment 2" and sub_name == "Database Systems":
            status = "Pending"
            sub_date = "-"
        elif enr in ["23AI008", "23AI016", "23AI020"] and assign_name == "Assignment 1" and sub_name == "Data Structures":
            status = "Late"
            sub_date = "2026-09-15"
        else:
            status = "Submitted"
            sub_date = "2026-09-08"

        submissions.append({
            "enrollment": enr,
            "subject": sub_name,
            "assignment": assign_name,
            "due_date": a["due_date"],
            "submission_date": sub_date,
            "status": status
        })

    # 2. Attendance (4 records per student = 80 total, Total 40 lectures)
    for sub in subjects:
        if enr in shortage_enrollments:
            attended = shortage_enrollments[enr]  # ~60% - 72.5% (Below 75%)
        else:
            # High attendance (80% - 95%)
            idx = int(enr[-2:])
            attended = 32 + (idx % 8)
        attendance.append({
            "enrollment": enr,
            "subject": sub,
            "total_lectures": 40,
            "attended": attended
        })

    # 3. Internal Marks (4 records per student = 80 total)
    # Scheme: Mid Sem /50, Assignment /30, Viva /20
    idx = int(enr[-2:])
    for sub in subjects:
        if enr in shortage_enrollments:
            mid = 26 + (idx % 6)
            assign = 16 + (idx % 4)
            viva = 11 + (idx % 3)
        else:
            mid = 36 + (idx % 12)
            assign = 22 + (idx % 8)
            viva = 14 + (idx % 6)
        marks.append({
            "enrollment": enr,
            "subject": sub,
            "mid_sem": float(mid),
            "assignment": float(assign),
            "viva": float(viva)
        })
