import {
  formatStudentClassLabel,
  normalizeClassLabel,
  studentMatchesClassSection,
} from "@/lib/class-labels";
import {
  getScopedItem,
  getSchoolClasses,
  setScopedItem,
  type SchoolClass,
} from "@/lib/school-context";
import { loadClassAssignments } from "@/lib/timetable";
import { loadSystemUsers, type SystemUser } from "@/lib/teacher-check-in";
import type { UserSession } from "@/lib/teacher-check-in";

export type SchoolMessage = {
  id: string;
  senderId: string;
  senderName: string;
  senderEmail: string;
  recipientId: string;
  recipientName: string;
  recipientEmail: string;
  subject: string;
  body: string;
  preview: string;
  createdAt: string;
  timestamp: string;
  isRead: boolean;
  hasAttachment: boolean;
  replyToId?: string;
};

export type ComposeRecipientOption = {
  value: string;
  label: string;
};

type MessageParticipant = Pick<SystemUser, "id" | "name" | "email" | "role">;

type StudentClassContext = {
  classId: string;
  classLabel: string;
};

const STORAGE_KEY = "school_messages";

function parseJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function formatMessageTimestamp(isoDate: string): string {
  const date = new Date(isoDate);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes !== 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
  return date.toLocaleDateString();
}

export function loadSchoolMessages(schoolId: string): SchoolMessage[] {
  return parseJson<SchoolMessage[]>(getScopedItem(schoolId, STORAGE_KEY), []);
}

export function saveSchoolMessages(schoolId: string, messages: SchoolMessage[]): void {
  setScopedItem(schoolId, STORAGE_KEY, JSON.stringify(messages));
}

function resolveUserByLabel(schoolId: string, label: string): SystemUser | null {
  const users = loadSystemUsers(schoolId);
  const normalized = label.trim().toLowerCase();

  return (
    users.find((user) => user.email.toLowerCase() === normalized) ??
    users.find((user) => normalized.includes(user.name.toLowerCase())) ??
    users.find((user) => user.name.toLowerCase() === normalized.split("(")[0]?.trim()) ??
    null
  );
}

function buildDisplayName(user: Pick<SystemUser, "name" | "role">, suffix?: string): string {
  const roleLabel =
    user.role.toLowerCase() === "teacher"
      ? "Teacher"
      : user.role.toLowerCase() === "admin"
        ? "Admin"
        : user.role;
  if (suffix) return `${user.name} (${suffix})`;
  if (user.role.toLowerCase() === "teacher") return `${user.name} (${roleLabel})`;
  return user.name;
}

function seedMessages(schoolId: string): SchoolMessage[] {
  const users = loadSystemUsers(schoolId);
  const teacher = users.find((user) => user.email === "a.mensah@school.edu");
  const admin = users.find((user) => user.role.toLowerCase() === "admin") ?? users[0];

  if (!teacher || !admin) return [];

  const createdAt = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  const body =
    "Please remind students to submit their calculus assignments by Friday. Several students in Grade 7 B still have pending submissions.";

  return [
    {
      id: "msg_seed_001",
      senderId: teacher.id,
      senderName: buildDisplayName(teacher, "Math Teacher"),
      senderEmail: teacher.email,
      recipientId: admin.id,
      recipientName: admin.name,
      recipientEmail: admin.email,
      subject: "Assignment Submission Reminder",
      body,
      preview: `${body.slice(0, 100)}...`,
      createdAt,
      timestamp: formatMessageTimestamp(createdAt),
      isRead: false,
      hasAttachment: true,
    },
  ];
}

export function ensureSchoolMessages(schoolId: string): SchoolMessage[] {
  const existing = loadSchoolMessages(schoolId);
  if (existing.length > 0) return existing;

  const seeded = seedMessages(schoolId);
  if (seeded.length > 0) {
    saveSchoolMessages(schoolId, seeded);
  }
  return seeded;
}

export function getInboxMessages(
  schoolId: string,
  userEmail: string,
): SchoolMessage[] {
  const email = userEmail.trim().toLowerCase();
  return ensureSchoolMessages(schoolId)
    .filter((message) => message.recipientEmail.toLowerCase() === email)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function markSchoolMessageRead(
  schoolId: string,
  messageId: string,
): SchoolMessage[] {
  const messages = loadSchoolMessages(schoolId).map((message) =>
    message.id === messageId ? { ...message, isRead: true } : message,
  );
  saveSchoolMessages(schoolId, messages);
  return messages;
}

export function deleteSchoolMessage(
  schoolId: string,
  messageId: string,
): SchoolMessage[] {
  const messages = loadSchoolMessages(schoolId).filter((message) => message.id !== messageId);
  saveSchoolMessages(schoolId, messages);
  return messages;
}

export function sendSchoolReply(input: {
  schoolId: string;
  originalMessage: SchoolMessage;
  sender: Pick<SystemUser, "id" | "name" | "email" | "role">;
  body: string;
}): SchoolMessage {
  const trimmedBody = input.body.trim();
  const createdAt = new Date().toISOString();
  const replySubject = input.originalMessage.subject.startsWith("Re:")
    ? input.originalMessage.subject
    : `Re: ${input.originalMessage.subject}`;

  const reply: SchoolMessage = {
    id: `msg_${Date.now()}`,
    senderId: input.sender.id,
    senderName: buildDisplayName(input.sender),
    senderEmail: input.sender.email,
    recipientId: input.originalMessage.senderId,
    recipientName: input.originalMessage.senderName,
    recipientEmail: input.originalMessage.senderEmail,
    subject: replySubject,
    body: trimmedBody,
    preview: trimmedBody.length > 100 ? `${trimmedBody.slice(0, 100)}...` : trimmedBody,
    createdAt,
    timestamp: formatMessageTimestamp(createdAt),
    isRead: false,
    hasAttachment: false,
    replyToId: input.originalMessage.id,
  };

  const messages = [...loadSchoolMessages(input.schoolId), reply];
  saveSchoolMessages(input.schoolId, messages);
  return reply;
}

export function resolveMessageParticipant(
  schoolId: string,
  label: string,
): Pick<SystemUser, "id" | "name" | "email" | "role"> | null {
  return resolveUserByLabel(schoolId, label);
}

function buildClassKey(className: string, section: string): string {
  return `${className.trim()}-${section.trim()}`.toLowerCase().replace(/\s+/g, "-");
}

function parseSchoolClassFilters(schoolClass?: SchoolClass | null): {
  className: string;
  section: string;
  classLabel: string;
} {
  if (!schoolClass) {
    return { className: "", section: "", classLabel: "" };
  }

  const classLabel = normalizeClassLabel(schoolClass.name);
  const match = classLabel.match(/^(Grade \d+)\s*([A-Z])$/i);
  return {
    className: match?.[1] ?? classLabel,
    section: match?.[2] ?? normalizeClassLabel(schoolClass.section),
    classLabel,
  };
}

function classLabelsMatch(left: string, right: string): boolean {
  const a = normalizeClassLabel(left).toLowerCase();
  const b = normalizeClassLabel(right).toLowerCase();
  return a === b || a.replace(/\s+/g, "") === b.replace(/\s+/g, "");
}

function studentBelongsToClass(
  student: { class: string; section: string },
  classId: string,
  classLabel: string,
  schoolClass?: SchoolClass | null,
): boolean {
  const studentKey = buildClassKey(student.class, student.section);
  const studentLabel = formatStudentClassLabel(student.class, student.section);

  if (studentKey === classId || studentLabel === classLabel) {
    return true;
  }

  const { className, section } = parseSchoolClassFilters(schoolClass);
  if (className) {
    return studentMatchesClassSection(student, className, section);
  }

  return classLabelsMatch(studentLabel, classLabel);
}

function systemUserBelongsToClass(user: SystemUser, schoolClass?: SchoolClass | null): boolean {
  if (user.role.toLowerCase() !== "student") return false;
  if (!user.classDepartment?.trim()) return false;

  const { classLabel } = parseSchoolClassFilters(schoolClass);
  if (classLabel && classLabelsMatch(user.classDepartment, classLabel)) {
    return true;
  }

  const deptMatch = user.classDepartment.match(/^(Grade \d+)\s*([A-Z])$/i);
  const { className, section } = parseSchoolClassFilters(schoolClass);
  if (deptMatch && className) {
    return (
      normalizeClassLabel(deptMatch[1]) === normalizeClassLabel(className) &&
      deptMatch[2].toUpperCase() === section.toUpperCase()
    );
  }

  return false;
}

function resolveStudentDeliveryEmail(
  schoolId: string,
  student: { id: string; firstName: string; lastName: string; email?: string },
): string {
  const directEmail = student.email?.trim();
  if (directEmail) return directEmail;

  const fullName = `${student.firstName} ${student.lastName}`.trim().toLowerCase();
  const matchedUser =
    loadSystemUsers(schoolId).find(
      (user) =>
        user.role.toLowerCase() === "student" &&
        (user.id === student.id || user.name.toLowerCase() === fullName),
    ) ?? null;

  return matchedUser?.email ?? "";
}

function resolveTeacherByName(schoolId: string, teacherName: string): MessageParticipant | null {
  const normalized = teacherName.trim().toLowerCase();
  const systemUser =
    loadSystemUsers(schoolId).find(
      (user) =>
        user.role.toLowerCase() === "teacher" &&
        (user.name.toLowerCase() === normalized ||
          normalized.includes(user.name.toLowerCase()) ||
          user.name.toLowerCase().includes(normalized)),
    ) ?? null;

  if (systemUser) return systemUser;

  const storedStaff = getScopedItem(schoolId, "school_staff");
  if (!storedStaff) return null;

  try {
    const staff = JSON.parse(storedStaff) as Array<{
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      role: string;
    }>;
    const matched = staff.find((member) => {
      const fullName = `${member.firstName} ${member.lastName}`.trim().toLowerCase();
      return fullName === normalized || normalized.includes(fullName) || fullName.includes(normalized);
    });
    if (!matched) return null;
    return {
      id: matched.id,
      name: `${matched.firstName} ${matched.lastName}`.trim(),
      email: matched.email,
      role: matched.role,
    };
  } catch {
    return null;
  }
}

export function getStudentClassContext(
  schoolId: string,
  session: Pick<UserSession, "id" | "email" | "name" | "classDepartment">,
): StudentClassContext | null {
  const storedStudents = getScopedItem(schoolId, "school_students");
  const schoolClasses = getSchoolClasses(schoolId);

  if (storedStudents) {
    try {
      const students = JSON.parse(storedStudents) as Array<{
        id: string;
        email?: string;
        firstName: string;
        lastName: string;
        class: string;
        section: string;
      }>;

      const matchedStudent =
        students.find(
          (student) =>
            student.email?.toLowerCase() === session.email.toLowerCase() ||
            student.id === session.id ||
            `${student.firstName} ${student.lastName}`.toLowerCase() === session.name.toLowerCase(),
        ) ?? null;

      if (matchedStudent) {
        const classKey = buildClassKey(matchedStudent.class, matchedStudent.section);
        const matchedClass =
          schoolClasses.find((cls) => cls.id === classKey) ??
          schoolClasses.find(
            (cls) =>
              cls.name.startsWith(matchedStudent.class) &&
              cls.section.toUpperCase() === matchedStudent.section.toUpperCase(),
          );

        return {
          classId: matchedClass?.id ?? classKey,
          classLabel: formatStudentClassLabel(matchedStudent.class, matchedStudent.section),
        };
      }
    } catch {
      // fall through
    }
  }

  if (session.classDepartment) {
    const classMatch = session.classDepartment.match(/^(Grade \d+)\s*([A-Z])$/i);
    if (classMatch) {
      const classKey = buildClassKey(classMatch[1], classMatch[2]);
      const matchedClass =
        schoolClasses.find((cls) => cls.id === classKey) ??
        schoolClasses.find(
          (cls) =>
            cls.name.startsWith(classMatch[1]) &&
            cls.section.toUpperCase() === classMatch[2].toUpperCase(),
        );

      return {
        classId: matchedClass?.id ?? classKey,
        classLabel: formatStudentClassLabel(classMatch[1], classMatch[2]),
      };
    }
  }

  return null;
}

function getClassTeachers(schoolId: string, classId: string): MessageParticipant[] {
  const assignments = loadClassAssignments(schoolId)[classId] ?? [];
  const teachers = new Map<string, MessageParticipant>();

  for (const assignment of assignments) {
    const teacher = resolveTeacherByName(schoolId, assignment.teacher);
    if (teacher) {
      teachers.set(teacher.email.toLowerCase(), teacher);
    }
  }

  return [...teachers.values()];
}

function getClassStudents(
  schoolId: string,
  classId: string,
  classLabel: string,
  excludeEmail?: string,
): MessageParticipant[] {
  const schoolClass = getSchoolClasses(schoolId).find((cls) => cls.id === classId) ?? null;
  const storedStudents = getScopedItem(schoolId, "school_students");
  const participants = new Map<string, MessageParticipant>();

  if (storedStudents) {
    try {
      const students = JSON.parse(storedStudents) as Array<{
        id: string;
        email?: string;
        firstName: string;
        lastName: string;
        class: string;
        section: string;
        status?: string;
      }>;

      for (const student of students) {
        if (student.status && student.status !== "active") continue;
        if (!studentBelongsToClass(student, classId, classLabel, schoolClass)) continue;

        const email = resolveStudentDeliveryEmail(schoolId, student);
        if (!email || email.toLowerCase() === excludeEmail?.toLowerCase()) continue;

        participants.set(email.toLowerCase(), {
          id: student.id,
          name: `${student.firstName} ${student.lastName}`.trim(),
          email,
          role: "student",
        });
      }
    } catch {
      // fall through to system users
    }
  }

  for (const user of loadSystemUsers(schoolId)) {
    if (user.status !== "Active") continue;
    if (!systemUserBelongsToClass(user, schoolClass)) continue;
    if (user.email.toLowerCase() === excludeEmail?.toLowerCase()) continue;

    participants.set(user.email.toLowerCase(), {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  }

  return [...participants.values()];
}

export function getComposeRecipientOptions(
  schoolId: string,
  session: UserSession,
): ComposeRecipientOption[] {
  const role = session.role.toLowerCase();

  if (role === "student") {
    const classContext = getStudentClassContext(schoolId, session);
    if (!classContext) {
      return [{ value: "", label: "Select recipient..." }];
    }

    const options: ComposeRecipientOption[] = [{ value: "", label: "Select recipient..." }];
    const admin =
      loadSystemUsers(schoolId).find((user) => user.role.toLowerCase() === "admin") ?? null;

    if (admin) {
      options.push({
        value: admin.email,
        label: "Principal",
      });
    }

    const classTeachers = getClassTeachers(schoolId, classContext.classId);
    for (const teacher of classTeachers) {
      options.push({
        value: teacher.email,
        label: `${teacher.name} (${classContext.classLabel} Teacher)`,
      });
    }

    if (classTeachers.length > 0) {
      options.push({
        value: `group:teachers:${classContext.classId}`,
        label: `All ${classContext.classLabel} Teachers`,
      });
    }

    options.push({
      value: `group:students:${classContext.classId}`,
      label: `All Class ${classContext.classLabel}`,
    });

    return options;
  }

  const options: ComposeRecipientOption[] = [{ value: "", label: "Select recipient..." }];
  const admin = loadSystemUsers(schoolId).find((user) => user.role.toLowerCase() === "admin");

  options.push({ value: "all_teachers", label: "All Teachers" });
  options.push({ value: "all_parents", label: "All Parents" });
  options.push({ value: "all_students", label: "All Students" });

  if (admin) {
    options.push({ value: admin.email, label: "Principal" });
  }

  for (const schoolClass of getSchoolClasses(schoolId)) {
    options.push({
      value: `group:students:${schoolClass.id}`,
      label: schoolClass.name,
    });
  }

  return options;
}

function resolveComposeRecipients(
  schoolId: string,
  recipientValue: string,
  sender: MessageParticipant,
  classContext: StudentClassContext | null,
): Array<{ participant: MessageParticipant; label: string }> {
  if (!recipientValue) return [];

  if (recipientValue === "all_teachers") {
    return loadSystemUsers(schoolId)
      .filter((user) => user.role.toLowerCase() === "teacher")
      .map((teacher) => ({ participant: teacher, label: teacher.name }));
  }

  if (recipientValue === "all_students") {
    const participants = new Map<string, MessageParticipant>();
    const storedStudents = getScopedItem(schoolId, "school_students");

    if (storedStudents) {
      try {
        const students = JSON.parse(storedStudents) as Array<{
          id: string;
          email?: string;
          firstName: string;
          lastName: string;
          status?: string;
        }>;

        for (const student of students) {
          if (student.status && student.status !== "active") continue;
          const email = resolveStudentDeliveryEmail(schoolId, student);
          if (!email || email.toLowerCase() === sender.email.toLowerCase()) continue;
          participants.set(email.toLowerCase(), {
            id: student.id,
            name: `${student.firstName} ${student.lastName}`.trim(),
            email,
            role: "student",
          });
        }
      } catch {
        // fall through
      }
    }

    for (const user of loadSystemUsers(schoolId)) {
      if (user.role.toLowerCase() !== "student" || user.status !== "Active") continue;
      if (user.email.toLowerCase() === sender.email.toLowerCase()) continue;
      participants.set(user.email.toLowerCase(), {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      });
    }

    return [...participants.values()].map((participant) => ({
      participant,
      label: participant.name,
    }));
  }

  if (!recipientValue.startsWith("group:")) {
    const user = resolveUserByLabel(schoolId, recipientValue);
    if (user) {
      return [{ participant: user, label: user.name }];
    }
    if (recipientValue.includes("@")) {
      return [
        {
          participant: {
            id: recipientValue,
            name: recipientValue,
            email: recipientValue,
            role: "user",
          },
          label: recipientValue,
        },
      ];
    }
    return [];
  }

  const [, groupType, classId] = recipientValue.split(":");
  const resolvedClassId = classId ?? classContext?.classId ?? "";

  if (groupType === "teachers") {
    return getClassTeachers(schoolId, resolvedClassId).map((teacher) => ({
      participant: teacher,
      label: teacher.name,
    }));
  }

  if (groupType === "students") {
    const classLabel =
      getSchoolClasses(schoolId).find((cls) => cls.id === resolvedClassId)?.name ??
      classContext?.classLabel ??
      "Class";
    return getClassStudents(schoolId, resolvedClassId, classLabel, sender.email).map((student) => ({
      participant: student,
      label: student.name,
    }));
  }

  return [];
}

function createOutboundMessage(
  sender: MessageParticipant,
  recipient: MessageParticipant,
  subject: string,
  body: string,
  index = 0,
): SchoolMessage {
  const createdAt = new Date().toISOString();
  const preview = body.length > 100 ? `${body.slice(0, 100)}...` : body;

  return {
    id: `msg_${Date.now()}_${index}_${recipient.email}`,
    senderId: sender.id,
    senderName: buildDisplayName(sender),
    senderEmail: sender.email,
    recipientId: recipient.id,
    recipientName: recipient.name,
    recipientEmail: recipient.email,
    subject,
    body,
    preview,
    createdAt,
    timestamp: formatMessageTimestamp(createdAt),
    isRead: false,
    hasAttachment: false,
  };
}

export function sendSchoolMessage(input: {
  schoolId: string;
  sender: MessageParticipant;
  recipientValue: string;
  subject: string;
  body: string;
}): { sentCount: number; recipientLabel: string; errorReason?: string } {
  const trimmedBody = input.body.trim();
  const classContext =
    input.sender.role.toLowerCase() === "student"
      ? getStudentClassContext(input.schoolId, input.sender)
      : null;

  const recipients = resolveComposeRecipients(
    input.schoolId,
    input.recipientValue,
    input.sender,
    classContext,
  );

  if (recipients.length === 0) {
    let errorReason = "Please choose a valid recipient.";

    if (input.recipientValue.startsWith("group:students:")) {
      const classId = input.recipientValue.split(":")[2] ?? "";
      const classLabel =
        getSchoolClasses(input.schoolId).find((cls) => cls.id === classId)?.name ?? "this class";
      errorReason = `No students with login emails were found in ${classLabel}. Add student emails on the Students page or issue student credentials in User Management.`;
    } else if (input.recipientValue === "all_students") {
      errorReason =
        "No students with login emails were found. Add student emails or issue student credentials first.";
    } else if (input.recipientValue === "all_teachers") {
      errorReason = "No teacher login accounts were found.";
    } else if (input.recipientValue === "all_parents") {
      errorReason = "Parent messaging is not set up yet. Choose a class or individual recipient.";
    }

    return { sentCount: 0, recipientLabel: "", errorReason };
  }

  const outbound = recipients.map(({ participant }, index) =>
    createOutboundMessage(
      input.sender,
      participant,
      input.subject.trim(),
      trimmedBody,
      index,
    ),
  );

  saveSchoolMessages(input.schoolId, [...loadSchoolMessages(input.schoolId), ...outbound]);

  const recipientLabel =
    recipients.length === 1
      ? recipients[0].label
      : `${recipients.length} recipients`;

  return { sentCount: outbound.length, recipientLabel };
}
