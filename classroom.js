/* ============================================================
   Pebblio classroom system
   Classes, courses, assignments, grades, and messages — all
   stored in the same shared localStorage used by auth.js.

   Works for real when different accounts are tested on the same
   browser/device (e.g. you switching between a teacher and a
   student account to test the loop). It does NOT sync between
   different physical devices — that still needs a real backend.
   ============================================================ */

const CLASSES_KEY     = 'pebblio_classes';
const COURSES_KEY     = 'pebblio_courses';
const ASSIGNMENTS_KEY = 'pebblio_assignments';
const GRADES_KEY      = 'pebblio_grades';
const MESSAGES_KEY    = 'pebblio_messages';

const MAX_STUDENTS_PER_CLASS = 10; // unlimited is a paid feature, per spec

function readList(key){
  try{ return JSON.parse(localStorage.getItem(key)) || []; }
  catch(e){ return []; }
}
function writeList(key, list){
  localStorage.setItem(key, JSON.stringify(list));
}
function uid(prefix){
  return prefix + '_' + Math.random().toString(36).slice(2, 10);
}

/* ---------- CLASSES ---------- */

function generateClassCode(){
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O or 1/I, less confusing
  let code;
  const existing = readList(CLASSES_KEY).map(c => c.classCode);
  do{
    code = Array.from({length: 6}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  } while(existing.includes(code));
  return code;
}

function createClass(teacherUserId, className){
  const classes = readList(CLASSES_KEY);
  const newClass = {
    classId: uid('class'),
    classCode: generateClassCode(),
    className,
    teacherUserId,
    studentIds: [],
    createdAt: new Date().toISOString()
  };
  classes.push(newClass);
  writeList(CLASSES_KEY, classes);
  return newClass;
}

function getClassesByTeacher(teacherUserId){
  return readList(CLASSES_KEY).filter(c => c.teacherUserId === teacherUserId);
}

function getClassesForStudent(studentUserId){
  return readList(CLASSES_KEY).filter(c => c.studentIds.includes(studentUserId));
}

function getClassByCode(code){
  return readList(CLASSES_KEY).find(c => c.classCode === code.toUpperCase()) || null;
}

function getClassById(classId){
  return readList(CLASSES_KEY).find(c => c.classId === classId) || null;
}

function joinClassByCode(code, studentUserId){
  const classes = readList(CLASSES_KEY);
  const cls = classes.find(c => c.classCode === code.toUpperCase());
  if(!cls) return { ok:false, error:'No class found with that code.' };
  if(cls.studentIds.includes(studentUserId)) return { ok:false, error:"You're already in this class." };
  if(cls.studentIds.length >= MAX_STUDENTS_PER_CLASS) return { ok:false, error:'This class is full.' };
  cls.studentIds.push(studentUserId);
  writeList(CLASSES_KEY, classes);
  return { ok:true, class: cls };
}

function kickStudent(classId, studentUserId){
  const classes = readList(CLASSES_KEY);
  const cls = classes.find(c => c.classId === classId);
  if(!cls) return;
  cls.studentIds = cls.studentIds.filter(id => id !== studentUserId);
  writeList(CLASSES_KEY, classes);
}

/* ---------- COURSES ---------- */

function createCourse(teacherUserId, { title, subject, description }){
  const courses = readList(COURSES_KEY);
  const course = {
    courseId: uid('course'),
    teacherUserId, title, subject, description,
    createdAt: new Date().toISOString()
  };
  courses.push(course);
  writeList(COURSES_KEY, courses);
  return course;
}

function getCoursesByTeacher(teacherUserId){
  return readList(COURSES_KEY).filter(c => c.teacherUserId === teacherUserId);
}

/* ---------- ASSIGNMENTS ---------- */

function createAssignment(creatorUserId, { classId = null, directStudentId = null, courseId, title, type, dueDate }){
  const assignments = readList(ASSIGNMENTS_KEY);
  const assignment = {
    assignmentId: uid('asg'),
    teacherUserId: creatorUserId, classId, directStudentId, courseId: courseId || null,
    title, type, dueDate,
    createdAt: new Date().toISOString()
  };
  assignments.push(assignment);
  writeList(ASSIGNMENTS_KEY, assignments);
  return assignment;
}

function getAssignmentsByClass(classId){
  return readList(ASSIGNMENTS_KEY).filter(a => a.classId === classId);
}

function getAssignmentsByTeacher(teacherUserId){
  return readList(ASSIGNMENTS_KEY).filter(a => a.teacherUserId === teacherUserId);
}

function getAssignmentsForStudent(studentUserId){
  const classIds = getClassesForStudent(studentUserId).map(c => c.classId);
  return readList(ASSIGNMENTS_KEY).filter(a =>
    classIds.includes(a.classId) || a.directStudentId === studentUserId
  );
}

/* ---------- GRADES ---------- */

function setGrade(assignmentId, studentUserId, score){
  const grades = readList(GRADES_KEY);
  const existing = grades.find(g => g.assignmentId === assignmentId && g.studentUserId === studentUserId);
  if(existing){
    existing.score = score;
    existing.gradedAt = new Date().toISOString();
  } else {
    grades.push({
      gradeId: uid('grade'),
      assignmentId, studentUserId, score,
      gradedAt: new Date().toISOString()
    });
  }
  writeList(GRADES_KEY, grades);
}

function getGrade(assignmentId, studentUserId){
  const g = readList(GRADES_KEY).find(g => g.assignmentId === assignmentId && g.studentUserId === studentUserId);
  return g ? g.score : null;
}

function getGradesForStudent(studentUserId){
  return readList(GRADES_KEY).filter(g => g.studentUserId === studentUserId);
}

/* ---------- MESSAGES / ANNOUNCEMENTS ---------- */

function sendMessage({ fromUserId, toUserId = null, classId = null, subject, body, type = 'normal', linkId = null }){
  const messages = readList(MESSAGES_KEY);
  messages.push({
    messageId: uid('msg'),
    fromUserId, toUserId, classId,
    subject, body, type, linkId,
    createdAt: new Date().toISOString(),
    read: false
  });
  writeList(MESSAGES_KEY, messages);
}

/* Inbox = direct messages to me, plus announcements sent to any class I'm in */
function getInbox(userId){
  const myClassIds = getClassesForStudent(userId).map(c => c.classId)
    .concat(getClassesByTeacher(userId).map(c => c.classId));

  return readList(MESSAGES_KEY)
    .filter(m => m.toUserId === userId || (m.classId && myClassIds.includes(m.classId) && m.fromUserId !== userId))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function markMessageRead(messageId){
  const messages = readList(MESSAGES_KEY);
  const m = messages.find(m => m.messageId === messageId);
  if(m){ m.read = true; writeList(MESSAGES_KEY, messages); }
}

/* ---------- keeping a User ID rename consistent everywhere ----------
   A User ID isn't just on the account — it's also stored as a plain
   string inside classes (teacher + roster), courses, assignments,
   grades, and messages. If someone renames their ID and we only
   update the account, they'd silently vanish from every class they're
   in. This rewrites every reference at once. */
function renameUserIdEverywhere(oldId, newId){
  if(oldId === newId) return;

  const classes = readList(CLASSES_KEY);
  classes.forEach(c => {
    if(c.teacherUserId === oldId) c.teacherUserId = newId;
    c.studentIds = c.studentIds.map(id => id === oldId ? newId : id);
  });
  writeList(CLASSES_KEY, classes);

  const courses = readList(COURSES_KEY);
  courses.forEach(c => { if(c.teacherUserId === oldId) c.teacherUserId = newId; });
  writeList(COURSES_KEY, courses);

  const assignments = readList(ASSIGNMENTS_KEY);
  assignments.forEach(a => { if(a.teacherUserId === oldId) a.teacherUserId = newId; });
  writeList(ASSIGNMENTS_KEY, assignments);

  const grades = readList(GRADES_KEY);
  grades.forEach(g => { if(g.studentUserId === oldId) g.studentUserId = newId; });
  writeList(GRADES_KEY, grades);

  const messages = readList(MESSAGES_KEY);
  messages.forEach(m => {
    if(m.fromUserId === oldId) m.fromUserId = newId;
    if(m.toUserId === oldId) m.toUserId = newId;
  });
  writeList(MESSAGES_KEY, messages);
}
