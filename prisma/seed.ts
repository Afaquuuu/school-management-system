import { PrismaClient, UserRole, Gender, AttendanceStatus, PaymentMethod, PaymentStatus } from "@prisma/client";

const prisma = new PrismaClient();

const academicYears = [
  { label: "2025/2026", startsAt: new Date("2025-09-01"), endsAt: new Date("2026-06-30"), isActive: true },
];

const classes = [
  { name: "Grade 6A", gradeLevel: "6", section: "A", capacity: 40, roomCode: "R-101" },
  { name: "Grade 7B", gradeLevel: "7", section: "B", capacity: 40, roomCode: "R-102" },
  { name: "Grade 8A", gradeLevel: "8", section: "A", capacity: 40, roomCode: "R-103" },
];

const subjects = [
  { code: "MTH", name: "Mathematics", creditHours: 4 },
  { code: "ENG", name: "English", creditHours: 4 },
  { code: "SCI", name: "Science", creditHours: 4 },
  { code: "HIS", name: "History", creditHours: 3 },
function gradeForMarks(marks: number) {
  const academicYearSeed = {
    label: "2025/2026",
    startsAt: new Date("2025-09-01"),
    endsAt: new Date("2026-06-30"),
    isActive: true,
  };
  if (marks >= 90) return "A";
  if (marks >= 80) return "B+";
  if (marks >= 70) return "B";
  if (marks >= 60) return "C";
  if (marks >= 50) return "D";
  return "F";
}
  await prisma.examCycle.deleteMany();
  const classroomSeed = [
    { code: "R-101", name: "Grade 6A Room", capacity: 40 },
    { code: "R-102", name: "Grade 7B Room", capacity: 40 },
    { code: "R-103", name: "Grade 8A Room", capacity: 40 },
  ];
  await prisma.subjectAttendanceRecord.deleteMany();
  await prisma.subjectAttendanceSession.deleteMany();
  await prisma.teacherLeaveRequest.deleteMany();
  await prisma.teacherCheckIn.deleteMany();
  await prisma.classroom.deleteMany();
  await prisma.timetableSlot.deleteMany();
  await prisma.classSubject.deleteMany();
  await prisma.attendanceRecord.deleteMany();
  await prisma.attendanceSession.deleteMany();
  await prisma.notification.deleteMany();
  const subjectSeed = [
    { code: "MTH", name: "Mathematics", creditHours: 4 },
    { code: "ENG", name: "English", creditHours: 4 },
    { code: "SCI", name: "Science", creditHours: 4 },
    { code: "HIS", name: "History", creditHours: 3 },
    { code: "ICT", name: "Information Technology", creditHours: 3 },
  ];
  await prisma.studentGuardian.deleteMany();
  await prisma.studentProfile.deleteMany();
  await prisma.guardianProfile.deleteMany();
  await prisma.staffProfile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.schoolClass.deleteMany();
  await prisma.academicYear.deleteMany();

  const academicYear = await prisma.academicYear.create({ data: academicYears[0] });

  const classrooms = await prisma.$transaction(
    classes.map((room) =>
      prisma.classroom.create({
        data: {
          code: room.roomCode,
          name: `${room.name} Room`,
          capacity: room.capacity,
          isAvailable: true,
        },
      }),
          const academicYearSeed = {
            label: "2025/2026",
            startsAt: new Date("2025-09-01"),
            endsAt: new Date("2026-06-30"),
            isActive: true,
          };
  const [math, english, science, history, ict] = await prisma.$transaction(
    subjects.map((subject) => prisma.subject.create({ data: { ...subject, academicYearId: academicYear.id } })),
  );

  const adminUser = await prisma.user.create({
    data: {
      clerkId: "user_admin_001",
          const classroomSeed = [
            { code: "R-101", name: "Grade 6A Room", capacity: 40 },
            { code: "R-102", name: "Grade 7B Room", capacity: 40 },
            { code: "R-103", name: "Grade 8A Room", capacity: 40 },
          ];

          const subjectSeed = [
            { code: "MTH", name: "Mathematics", creditHours: 4 },
            { code: "ENG", name: "English", creditHours: 4 },
            { code: "SCI", name: "Science", creditHours: 4 },
            { code: "HIS", name: "History", creditHours: 3 },
            { code: "ICT", name: "Information Technology", creditHours: 3 },
          ];
    data: [
      { clerkId: "user_teacher_001", email: "teacher1@school.local", name: "A. Mensah", role: UserRole.teacher },
      { clerkId: "user_teacher_002", email: "teacher2@school.local", name: "S. Okafor", role: UserRole.teacher },
      { clerkId: "user_teacher_003", email: "teacher3@school.local", name: "L. Chen", role: UserRole.teacher },
    ],
  });

  const studentUsers = await prisma.user.createMany({
    data: Array.from({ length: 12 }).map((_, index) => ({
      clerkId: `user_student_${String(index + 1).padStart(3, "0")}`,
      email: `student${index + 1}@school.local`,
      name: `Student ${index + 1}`,
      role: UserRole.student,
    })),
  });

  const staffProfiles = await prisma.staffProfile.createMany({
    data: [
      { userId: adminUser.id, employeeNo: "EMP-0001", jobTitle: "Principal", department: "Administration" },
      { userId: (await prisma.user.findUniqueOrThrow({ where: { clerkId: "user_teacher_001" } })).id, employeeNo: "EMP-0101", jobTitle: "Mathematics Teacher", department: "Academics" },
      { userId: (await prisma.user.findUniqueOrThrow({ where: { clerkId: "user_teacher_002" } })).id, employeeNo: "EMP-0102", jobTitle: "Science Teacher", department: "Academics" },
      { userId: (await prisma.user.findUniqueOrThrow({ where: { clerkId: "user_teacher_003" } })).id, employeeNo: "EMP-0103", jobTitle: "English Teacher", department: "Academics" },
    ],
  });

  const schoolClasses = await prisma.$transaction(
    classes.map(async (schoolClass, index) =>
      prisma.schoolClass.create({
        data: {
          academicYearId: academicYear.id,
          name: schoolClass.name,
          gradeLevel: schoolClass.gradeLevel,
          section: schoolClass.section,
          capacity: schoolClass.capacity,
          roomCode: schoolClass.roomCode,
          classTeacherId: (await prisma.staffProfile.findFirstOrThrow({ where: { employeeNo: `EMP-010${(index % 3) + 1}` } })).id,
        },
      }),
    ),
  );

            const academicYear = await prisma.academicYear.create({ data: academicYearSeed });
    schoolClasses.flatMap((schoolClass, index) =>
      [math, english, science, history, ict].slice(0, 3 + (index % 3)).map((subject, subjectIndex) =>
        prisma.classSubject.create({
          data: {
            classId: schoolClass.id,
            subjectId: subject.id,
            teacherId: (await prisma.staffProfile.findFirstOrThrow({ where: { employeeNo: `EMP-010${((index + subjectIndex) % 3) + 1}` } })).id,
            weeklyPeriods: 4 + subjectIndex,
          },
        }),
      ),
    ),
  );

  const examCycle = await prisma.examCycle.create({
    data: {
      academicYearId: academicYear.id,
      name: "Second Term 2025/2026",
      startsAt: new Date("2026-02-01"),
      endsAt: new Date("2026-02-21"),
    },
  });

  const examTypes = await prisma.examType.createMany({
    data: [
      { examCycleId: examCycle.id, name: "Class Test", weight: 0.1, sortOrder: 1 },
      { examCycleId: examCycle.id, name: "Monthly Assessment", weight: 0.2, sortOrder: 2 },
      { examCycleId: examCycle.id, name: "Term Examination", weight: 0.4, sortOrder: 3 },
      { examCycleId: examCycle.id, name: "Project / Practical Work", weight: 0.3, sortOrder: 4 },
    ],
  });

  const studentProfiles = await prisma.$transaction(
    Array.from({ length: 12 }).map((_, index) =>
      prisma.studentProfile.create({
        data: {
          userId: (async () => (await prisma.user.findUniqueOrThrow({ where: { clerkId: `user_student_${String(index + 1).padStart(3, "0")}` } })).id) as unknown as string,
          admissionNo: `ADM-${String(index + 1).padStart(4, "0")}`,
          classId: schoolClasses[index % schoolClasses.length].id,
          rollNumber: String(index + 1),
          gender: index % 2 === 0 ? Gender.male : Gender.female,
        },
      }),
    ),
  );

  const subjectAttendanceSession = await prisma.subjectAttendanceSession.create({
    data: {
      classId: schoolClasses[0].id,
      subjectId: math.id,
      sessionDate: new Date("2026-05-05T08:00:00Z"),
      teacherId: (await prisma.staffProfile.findFirstOrThrow({ where: { employeeNo: "EMP-0101" } })).id,
    },
  });

  await prisma.subjectAttendanceRecord.createMany({
    data: studentProfiles.slice(0, 6).map((student, index) => ({
      sessionId: subjectAttendanceSession.id,
      studentId: student.id,
      status: index < 4 ? AttendanceStatus.present : AttendanceStatus.absent,
    })),
  });

  const teacherCheckIn = await prisma.teacherCheckIn.create({
    data: {
      teacherId: (await prisma.staffProfile.findFirstOrThrow({ where: { employeeNo: "EMP-0101" } })).id,
      classroomId: classrooms[0].id,
      checkInAt: new Date(),
      latitude: 5.6037,
      longitude: -0.1870,
      ipAddress: "127.0.0.1",
    },
  });

  await prisma.teacherLeaveRequest.create({
    data: {
      teacherId: (await prisma.staffProfile.findFirstOrThrow({ where: { employeeNo: "EMP-0102" } })).id,
      startsOn: new Date("2026-05-10"),
      endsOn: new Date("2026-05-12"),
      reason: "Medical appointment",
      status: "approved",
    },
  });

  const exam = await prisma.exam.create({
    data: {
      academicYearId: academicYear.id,
      classId: schoolClasses[0].id,
      subjectId: math.id,
      title: "Grade 8 Mathematics Term Examination",
      status: "scheduled",
      examDate: new Date("2026-02-14"),
      maxMarks: 100,
      passingMarks: 50,
    },
  });

  const examRecordsPayload = studentProfiles.slice(0, 8).flatMap((student, index) =>
    examTypes as unknown as Array<{ id: string; weight: number; name: string }>,
  );

  const examTypesList = await prisma.examType.findMany({ where: { examCycleId: examCycle.id }, orderBy: { sortOrder: "asc" } });

  const examRecords = [] as Array<{
    studentId: string;
    subjectId: string;
    examTypeId: string;
    examCycleId: string;
    examId: string;
    recordedById: string;
    marksObtained: number;
    maxMarks: number;
    classAverageSnapshot: number;
    previousScoreSnapshot: number;
    weightedCredits: number;
    teacherComment: string;
    gpaEquivalent: number;
    grade: string;
  }>;

  for (const [studentIndex, student] of studentProfiles.slice(0, 8).entries()) {
    for (const [subjectIndex, subject] of [math, english, science, history, ict].entries()) {
      const marksObtained = 54 + ((studentIndex * 7 + subjectIndex * 9) % 45);
      examRecords.push({
        studentId: student.id,
        subjectId: subject.id,
        examTypeId: examTypesList[(studentIndex + subjectIndex) % examTypesList.length].id,
        examCycleId: examCycle.id,
        examId: exam.id,
        recordedById: (await prisma.staffProfile.findFirstOrThrow({ where: { employeeNo: "EMP-0101" } })).id,
        marksObtained,
        maxMarks: 100,
        classAverageSnapshot: 72 + (subjectIndex % 4),
        previousScoreSnapshot: marksObtained - 6,
        weightedCredits: subject.creditHours,
        teacherComment: marksObtained >= 80 ? "Excellent grasp of the topic." : "Needs more revision before finals.",
        gpaEquivalent: Number((marksObtained / 25).toFixed(2)),
        grade: gradeForMarks(marksObtained),
      });
    }
  }

  await prisma.examRecord.createMany({ data: examRecords });

  await prisma.performanceAlert.createMany({
    data: [
      {
        studentId: studentProfiles[0].id,
        alertType: "attendance_drop",
        severity: "high",
        message: "Attendance dropped by more than 10% this week.",
        generatedAt: new Date(),
      },
      {
        studentId: studentProfiles[2].id,
        alertType: "grade_average_drop",
        severity: "medium",
        message: "Grade average declined by 11% compared with the previous cycle.",
        generatedAt: new Date(),
      },
    ],
  });

  await prisma.notification.createMany({
    data: [
      {
        studentId: studentProfiles[0].id,
        title: "Attendance alert",
        body: "Math class missed. Parent and subject teacher notified.",
        category: "attendance",
      },
      {
        studentId: studentProfiles[2].id,
        title: "Performance summary",
        body: "Grade average dropped below the risk threshold.",
        category: "performance",
      },
    ],
  });

  await prisma.payment.createMany({
    data: [
      {
        invoiceId: (await prisma.invoice.create({
          data: {
            studentId: studentProfiles[0].id,
            classId: schoolClasses[0].id,
            invoiceNo: "INV-0001",
            dueAt: new Date("2026-05-31"),
            totalAmount: 450,
            paidAmount: 150,
            status: "partially_paid",
          },
        })).id,
        amount: 150,
        method: PaymentMethod.stripe,
        status: PaymentStatus.completed,
        reference: "stripe_demo_001",
        paidAt: new Date(),
      },
    ],
  });

  console.log(`Seeded academic year ${academicYear.label}, ${schoolClasses.length} classes, and ${studentProfiles.length} students.`);
  console.log(`Active teacher check-in created: ${teacherCheckIn.id}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });