/* ============================================================
   Classroom System with Firebase Sync
   Extends classroom.js to support cross-device synchronization
   Falls back to localStorage if Firebase is unavailable
============================================================ */

/* Override readList and writeList to support Firebase */

async function readListSync(key) {
  if (SYNC_MODE === 'firebase') {
    return await firebaseRead(key);
  }
  // Fallback to localStorage
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch (e) {
    return [];
  }
}

async function writeListSync(key, list) {
  if (SYNC_MODE === 'firebase') {
    return await firebaseWrite(key, list);
  }
  // Fallback to localStorage
  localStorage.setItem(key, JSON.stringify(list));
  return true;
}

/* ============================================================
   SYNC-AWARE CLASS FUNCTIONS
============================================================ */

async function createClassSync(teacherUserId, className) {
  const classes = await readListSync(CLASSES_KEY);
  const newClass = {
    classId: uid('class'),
    classCode: generateClassCode(),
    className,
    teacherUserId,
    studentIds: [],
    createdAt: new Date().toISOString()
  };
  classes.push(newClass);
  await writeListSync(CLASSES_KEY, classes);
  return newClass;
}

async function getClassesByTeacherSync(teacherUserId) {
  const classes = await readListSync(CLASSES_KEY);
  return classes.filter(c => c.teacherUserId === teacherUserId);
}

async function getClassesForStudentSync(studentUserId) {
  const classes = await readListSync(CLASSES_KEY);
  return classes.filter(c => c.studentIds.includes(studentUserId));
}

async function getClassByCodeSync(code) {
  const classes = await readListSync(CLASSES_KEY);
  return classes.find(c => c.classCode === code.toUpperCase()) || null;
}

async function getClassByIdSync(classId) {
  const classes = await readListSync(CLASSES_KEY);
  return classes.find(c => c.classId === classId) || null;
}

async function joinClassByCodeSync(code, studentUserId) {
  const classes = await readListSync(CLASSES_KEY);
  const cls = classes.find(c => c.classCode === code.toUpperCase());
  
  if (!cls) return { ok: false, error: 'No class found with that code.' };
  if (cls.studentIds.includes(studentUserId)) return { ok: false, error: "You're already in this class." };
  if (cls.studentIds.length >= MAX_STUDENTS_PER_CLASS) return { ok: false, error: 'This class is full.' };
  
  cls.studentIds.push(studentUserId);
  await writeListSync(CLASSES_KEY, classes);
  return { ok: true, class: cls };
}

async function kickStudentSync(classId, studentUserId) {
  const classes = await readListSync(CLASSES_KEY);
  const cls = classes.find(c => c.classId === classId);
  if (!cls) return;
  cls.studentIds = cls.studentIds.filter(id => id !== studentUserId);
  await writeListSync(CLASSES_KEY, classes);
}

/* ============================================================
   SYNC-AWARE COURSE FUNCTIONS
============================================================ */

async function createCourseSync(teacherUserId, { title, subject, description }) {
  const courses = await readListSync(COURSES_KEY);
  const course = {
    courseId: uid('course'),
    teacherUserId,
    title,
    subject,
    description,
    createdAt: new Date().toISOString()
  };
  courses.push(course);
  await writeListSync(COURSES_KEY, courses);
  return course;
}

async function getCoursesByTeacherSync(teacherUserId) {
  const courses = await readListSync(COURSES_KEY);
  return courses.filter(c => c.teacherUserId === teacherUserId);
}

async function getAllCoursesSync() {
  return await readListSync(COURSES_KEY);
}

/* ============================================================
   SYNC-AWARE ASSIGNMENT FUNCTIONS
============================================================ */

async function createAssignmentSync(creatorUserId, { classId = null, directStudentId = null, courseId, title, type, dueDate }) {
  const assignments = await readListSync(ASSIGNMENTS_KEY);
  const assignment = {
    assignmentId: uid('asg'),
    teacherUserId: creatorUserId,
    classId,
    directStudentId,
    courseId: courseId || null,
    title,
    type,
    dueDate,
    createdAt: new Date().toISOString()
  };
  assignments.push(assignment);
  await writeListSync(ASSIGNMENTS_KEY, assignments);
  return assignment;
}

async function getAssignmentsByClassSync(classId) {
  const assignments = await readListSync(ASSIGNMENTS_KEY);
  return assignments.filter(a => a.classId === classId);
}

async function getAssignmentsByTeacherSync(teacherUserId) {
  const assignments = await readListSync(ASSIGNMENTS_KEY);
  return assignments.filter(a => a.teacherUserId === teacherUserId);
}

async function getAssignmentsForStudentSync(studentUserId) {
  const classIds = (await getClassesForStudentSync(studentUserId)).map(c => c.classId);
  const assignments = await readListSync(ASSIGNMENTS_KEY);
  return assignments.filter(a => classIds.includes(a.classId) || a.directStudentId === studentUserId);
}

/* ============================================================
   SYNC-AWARE GRADE FUNCTIONS
============================================================ */

async function setGradeSync(assignmentId, studentUserId, score) {
  const grades = await readListSync(GRADES_KEY);
  const existing = grades.find(g => g.assignmentId === assignmentId && g.studentUserId === studentUserId);
  
  if (existing) {
    existing.score = score;
    existing.gradedAt = new Date().toISOString();
  } else {
    grades.push({
      gradeId: uid('grade'),
      assignmentId,
      studentUserId,
      score,
      gradedAt: new Date().toISOString()
    });
  }
  await writeListSync(GRADES_KEY, grades);
}

async function getGradeSync(assignmentId, studentUserId) {
  const grades = await readListSync(GRADES_KEY);
  const g = grades.find(g => g.assignmentId === assignmentId && g.studentUserId === studentUserId);
  return g ? g.score : null;
}

async function getGradesForStudentSync(studentUserId) {
  const grades = await readListSync(GRADES_KEY);
  return grades.filter(g => g.studentUserId === studentUserId);
}

/* ============================================================
   SYNC-AWARE MESSAGE FUNCTIONS
============================================================ */

async function sendMessageSync({ fromUserId, toUserId = null, classId = null, subject, body, type = 'normal', linkId = null }) {
  const messages = await readListSync(MESSAGES_KEY);
  messages.push({
    messageId: uid('msg'),
    fromUserId,
    toUserId,
    classId,
    subject,
    body,
    type,
    linkId,
    createdAt: new Date().toISOString(),
    read: false
  });
  await writeListSync(MESSAGES_KEY, messages);
}

async function getInboxSync(userId) {
  const myClassIds = (await getClassesForStudentSync(userId)).map(c => c.classId)
    .concat((await getClassesByTeacherSync(userId)).map(c => c.classId));

  const messages = await readListSync(MESSAGES_KEY);
  return messages
    .filter(m => m.toUserId === userId || (m.classId && myClassIds.includes(m.classId) && m.fromUserId !== userId))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

async function markMessageReadSync(messageId) {
  const messages = await readListSync(MESSAGES_KEY);
  const m = messages.find(m => m.messageId === messageId);
  if (m) {
    m.read = true;
    await writeListSync(MESSAGES_KEY, messages);
  }
}

/* ============================================================
   SYNC-AWARE USER ID RENAME
============================================================ */

async function renameUserIdEverywhereSync(oldId, newId) {
  if (oldId === newId) return;

  const classes = await readListSync(CLASSES_KEY);
  classes.forEach(c => {
    if (c.teacherUserId === oldId) c.teacherUserId = newId;
    c.studentIds = c.studentIds.map(id => id === oldId ? newId : id);
  });
  await writeListSync(CLASSES_KEY, classes);

  const courses = await readListSync(COURSES_KEY);
  courses.forEach(c => { if (c.teacherUserId === oldId) c.teacherUserId = newId; });
  await writeListSync(COURSES_KEY, courses);

  const assignments = await readListSync(ASSIGNMENTS_KEY);
  assignments.forEach(a => { if (a.teacherUserId === oldId) a.teacherUserId = newId; });
  await writeListSync(ASSIGNMENTS_KEY, assignments);

  const grades = await readListSync(GRADES_KEY);
  grades.forEach(g => { if (g.studentUserId === oldId) g.studentUserId = newId; });
  await writeListSync(GRADES_KEY, grades);

  const messages = await readListSync(MESSAGES_KEY);
  messages.forEach(m => {
    if (m.fromUserId === oldId) m.fromUserId = newId;
    if (m.toUserId === oldId) m.toUserId = newId;
  });
  await writeListSync(MESSAGES_KEY, messages);
}
