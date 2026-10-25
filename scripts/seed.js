// Inserts sample data: 3 rooms, 20 slots, 4 students and a few bookings.
// Usage: npm run seed   (WARNING: clears the rooms, slots, students and bookings collections)
const config = require('../config');
const { connectDB, disconnectDB } = require('../config/db');
const Room = require('../models/Room');
const Slot = require('../models/Slot');
const Student = require('../models/Student');
const Booking = require('../models/Booking');
const { START_HOURS } = require('../utils/validators');

// Local date as YYYY-MM-DD, `offset` days from today.
function dayFromToday(offset) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const rooms = [
  { roomCode: 'ROOM-01', name: 'Silent Reading Lounge', building: 'Main Library', seats: 6 },
  { roomCode: 'ROOM-02', name: 'Collaboration Studio', building: 'Computer Science Block', seats: 8 },
  { roomCode: 'ROOM-03', name: 'Focus Pod', building: 'Main Library', seats: 2 },
];

const students = [
  { regNo: 'FA23-BAI-010', name: 'Ayesha Mehmood', email: 'fa23-bai-010@example.edu.pk' },
  { regNo: 'FA23-BCS-045', name: 'Sara Ahmed', email: 'fa23-bcs-045@example.edu.pk' },
  { regNo: 'FA23-BCS-012', name: 'Hamza Ali', email: 'fa23-bcs-012@example.edu.pk' },
  { regNo: 'FA23-BSE-077', name: 'Fatima Noor', email: 'fa23-bse-077@example.edu.pk' },
];

async function seed() {
  await connectDB(config.mongoUrl);

  await Promise.all([Room.deleteMany({}), Slot.deleteMany({}), Student.deleteMany({}), Booking.deleteMany({})]);
  await Promise.all([Room.syncIndexes(), Slot.syncIndexes(), Student.syncIndexes(), Booking.syncIndexes()]);

  const roomDocs = await Room.insertMany(rooms);
  const studentDocs = await Student.insertMany(students);

  // Tomorrow: every start hour in every room (15 slots). Day after: ROOM-01 only (5 slots).
  const tomorrow = dayFromToday(1);
  const dayAfter = dayFromToday(2);
  const slotData = [];
  for (const room of roomDocs) {
    for (const startHour of START_HOURS) {
      slotData.push({ roomCode: room.roomCode, date: tomorrow, startHour, seats: room.seats, booked: 0 });
    }
  }
  for (const startHour of START_HOURS) {
    slotData.push({ roomCode: 'ROOM-01', date: dayAfter, startHour, seats: rooms[0].seats, booked: 0 });
  }
  const slotDocs = await Slot.insertMany(slotData);

  const findSlot = (roomCode, date, startHour) =>
    slotDocs.find((s) => s.roomCode === roomCode && s.date === date && s.startHour === startHour);
  const [ayesha, sara, hamza, fatima] = studentDocs;

  // ROOM-03 08:00 tomorrow is made completely full (2/2) to demonstrate SLOT_FULL.
  const bookings = [
    { student: sara, slot: findSlot('ROOM-03', tomorrow, 8) },
    { student: hamza, slot: findSlot('ROOM-03', tomorrow, 8) },
    { student: ayesha, slot: findSlot('ROOM-01', tomorrow, 10) },
    { student: fatima, slot: findSlot('ROOM-02', tomorrow, 14) },
  ];
  await Booking.insertMany(bookings.map((b) => ({ student: b.student._id, slot: b.slot._id })));
  for (const b of bookings) {
    await Slot.updateOne({ _id: b.slot._id }, { $inc: { booked: 1 } });
  }

  console.log(`Inserted ${roomDocs.length} rooms, ${slotDocs.length} slots, ${studentDocs.length} students, ${bookings.length} bookings.`);
  console.log(`Slot dates: ${tomorrow} and ${dayAfter}`);
  console.log(`Full slot (ROOM-03 ${tomorrow} 08:00): ${findSlot('ROOM-03', tomorrow, 8)._id}`);
  console.log(`Free slot (ROOM-01 ${tomorrow} 08:00): ${findSlot('ROOM-01', tomorrow, 8)._id}`);

  await disconnectDB();
}

seed().catch(async (err) => {
  console.error('Seeding failed:', err);
  await disconnectDB();
  process.exit(1);
});
