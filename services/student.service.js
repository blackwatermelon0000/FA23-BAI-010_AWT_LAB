const Student = require('../models/Student');
const AppError = require('../utils/AppError');
const { normalizeCode } = require('../utils/validators');

async function createStudent(body) {
  const { regNo, name, email } = body;
  if (regNo && (await Student.exists({ regNo: normalizeCode(regNo) }))) {
    throw AppError.conflict(`Student ${normalizeCode(regNo)} already exists`, 'STUDENT_EXISTS');
  }
  return Student.create({ regNo, name, email });
}

async function findStudent(regNo) {
  return Student.findOne({ regNo: normalizeCode(regNo) });
}

async function getStudent(regNo) {
  const student = await findStudent(regNo);
  if (!student) throw AppError.notFound(`Student ${normalizeCode(regNo)} not found`);
  return student;
}

module.exports = { createStudent, findStudent, getStudent };
