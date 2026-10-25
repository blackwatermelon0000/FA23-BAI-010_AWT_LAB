# CampusSpace — Study Room Booking System

**Course:** CSC337 Advanced Web Technologies  
**Submitted by:** Ayesha Mehmood  
**Registration number:** FA23-BAI-010  
**Module:** Study Room Booking System

> **Assignment 2 scope note:** This project is a study room booking application. The separate Assignment 2 brief supplied for the course asks for Users, ServiceRequests and Categories collections, service request CRUD and an aggregation report. This module alone does not implement that separate service management specification. See `docs/SUBMISSION_GUIDE.md` before submitting against that brief.

The backend for a small study room booking system. Each room has two-hour time slots and a student can book a seat in a slot. One Node.js process serves:

- a **REST API** under `/api/v1` (Express + MongoDB/Mongoose)
- a **GraphQL API** at `POST /graphql` (Apollo Server)
- **live seat boards** over Socket.IO (`/board.html`), plus an `/admin` namespace for announcements

## Quick start

Requirements: Node.js 18 or newer and a running MongoDB (local or Atlas).

```bash
npm install
cp .env.example .env     # then edit MONGODB_URL / ADMIN_KEY if needed
npm run seed             # 3 rooms, 20 slots, 4 students, 4 bookings
npm start                # or: npm run dev (restarts when files change)
```

| What | URL |
|---|---|
| Health check | http://localhost:3000/health |
| REST API | http://localhost:3000/api/v1 |
| GraphQL (Apollo Sandbox) | http://localhost:3000/graphql |
| Board for one room | http://localhost:3000/board.html?room=ROOM-01 |
| Admin announcements | http://localhost:3000/admin.html |

### Environment variables (`.env`)

| Variable | Meaning |
|---|---|
| `PORT` | HTTP port (default 3000) |
| `MONGODB_URL` | MongoDB connection string, e.g. `mongodb://127.0.0.1:27017/srb` |
| `ADMIN_KEY` | Secret key needed to connect to the Socket.IO `/admin` namespace |

`.env` is listed in `.gitignore` and is not committed. `.env.example` shows the format.

## Project structure

```
campusspace-booking-api/
├── app.js                  # builds the Express app (middleware, routes, /graphql, 404, error handler)
├── server.js               # connects to MongoDB, creates the HTTP server, attaches Socket.IO, listens
├── config/                 # reads .env, connects to MongoDB
├── routes/                 # URL -> controller mapping (health, rooms, slots, students + bookings)
├── controllers/            # read the request, call a service, send status + JSON
├── services/               # business rules; shared by REST, GraphQL and Socket.IO
├── models/                 # Mongoose schemas: Room, Slot, Student, Booking
├── middleware/             # requestLogger, notFound (404), errorHandler
├── graphql/                # Apollo typeDefs, resolvers, server setup
├── socket/                 # Socket.IO: board namespace + /admin namespace
├── utils/                  # AppError, validators, in-process event bus
├── public/                 # board.html, admin.html, index.html
├── scripts/seed.js         # sample data
├── postman/                # Postman collection (45 requests)
├── docs/srb-architecture.drawio   # deployment, ER and sequence diagrams
└── dashboard.graphql       # student dashboard query
```

The layers only call downwards: **route → controller → service → model**. Controllers never touch Mongoose directly, and services never touch `req`/`res`, so GraphQL resolvers and the Socket.IO handlers reuse the same services.

## Question 1: Express setup

- **Folders:** routes, controllers, services, models and middleware, with `app.js` (builds the app) separate from `server.js` (starts it).
- **Config:** `PORT`, `MONGODB_URL` and `ADMIN_KEY` come from `.env` via `dotenv` ([config/index.js](config/index.js)).
- **Health:** `GET /health` returns `{ "status": "ok" }`.
- **Logger:** [middleware/requestLogger.js](middleware/requestLogger.js) prints one line per request when the response finishes:
  ```
  POST /api/v1/students/FA23-BAI-010/bookings 201 14.2 ms
  ```
- **Errors:** unknown routes go to [middleware/notFound.js](middleware/notFound.js), and every error goes through the single [middleware/errorHandler.js](middleware/errorHandler.js), so all errors have the same shape:
  ```json
  { "error": { "status": 404, "code": "ROUTE_NOT_FOUND", "message": "Route not found" } }
  ```
  Validation errors also include `details` (field → message).

## Question 2: Diagrams

[docs/srb-architecture.drawio](docs/srb-architecture.drawio) has three pages. Open it at https://app.diagrams.net or in the draw.io desktop app.

1. **Deployment:** the browser (board/admin pages) and Postman, the Node.js process (Express, Apollo, Socket.IO, services, models) and MongoDB, with protocols and ports.
2. **ER diagram:** Room 1—0..* Slot, Slot 1—0..* Booking, Student 1—0..* Booking (Student↔Slot is many-to-many through Booking), including keys and unique indexes.
3. **Sequence:** a student books a slot through REST, with an `alt` frame for the success path (booking stored, `slot:updated` pushed to that room's boards) and the **slot is full** path (`409 SLOT_FULL`).

## Question 3: REST API

All routes are under `/api/v1`.

### Rooms (`roomCode` in the URL)

| Method | Path | Success | Errors |
|---|---|---|---|
| GET | `/rooms` | 200 | |
| GET | `/rooms/:roomCode` | 200 | 404 |
| POST | `/rooms` | 201 | 409 duplicate, 422 invalid, 400 bad JSON |
| PUT | `/rooms/:roomCode` | 200 (replaces name, building, seats) | 404, 422 missing field, **422 if roomCode changes** |
| PATCH | `/rooms/:roomCode` | 200 (changes only the fields sent) | 404, 400 nothing to update, **422 if roomCode changes** |
| DELETE | `/rooms/:roomCode` | 204 (also deletes its empty slots) | 404, 409 if any of its slots has bookings |

### Slots

| Method | Path | Notes |
|---|---|---|
| POST | `/slots` | `{ roomCode, date: "YYYY-MM-DD", startHour: 8\|10\|12\|14\|16 }`. `seats` is copied from the room and `booked` starts at 0. 201 / 404 room / 409 duplicate / 422 |
| GET | `/slots/:id` | 200 / 400 invalid id / 404 |
| GET | `/slots?roomCode=&date=&hasSeats=true&page=1&limit=10` | Paged: `{ data, page, limit, total, totalPages }`. `hasSeats=true` uses `$expr: { $lt: ['$booked', '$seats'] }` (`hasSeats=false` returns full slots). Bad values give 400 |

### Students and bookings

| Method | Path | Notes |
|---|---|---|
| POST | `/students` | `{ regNo, name, email }`. 201 / 409 / 422 |
| GET | `/students/:regNo` | 200 / 404 |
| POST | `/students/:regNo/bookings` | `{ "slotId": "..." }`. 201 / 400 / 404 / 409 |
| GET | `/students/:regNo/bookings` | The student's bookings with `roomName`, `date`, `startHour` |
| DELETE | `/students/:regNo/bookings/:slotId` | 204 / 404 |

### Status codes

| Code | When |
|---|---|
| 200 | Successful read or update |
| 201 | Created (room, slot, student, booking) |
| 204 | Deleted or cancelled, no body |
| 400 | Bad input: malformed JSON, invalid ObjectId, missing `slotId`, bad query values (`page=abc`, `hasSeats=maybe`, bad date) |
| 404 | Room, slot, student, booking or route not found |
| 409 | Conflict: duplicate room/slot/student, `ALREADY_BOOKED`, `SLOT_FULL`, deleting a room that has bookings |
| 422 | Well-formed but invalid data (schema validation such as `seats: 0` or `startHour: 9`), or trying to change `roomCode` |

### Booking rules ([services/booking.service.js](services/booking.service.js))

1. If the student or the slot does not exist → **404**. A booking is also rejected with **409 `SLOT_STARTED`** when the selected slot has already started.
2. If the student already booked that slot → **409 `ALREADY_BOOKED`**. A unique index on `(student, slot)` also enforces this in the database.
3. Take a seat with **one atomic `findOneAndUpdate`**:
   ```js
   Slot.findOneAndUpdate(
     { _id: slotId, $expr: { $lt: ['$booked', '$seats'] } },
     { $inc: { booked: 1 } },
     { new: true }
   );
   ```
   MongoDB checks and increments in one step, so when two students race for the last seat only one update matches. The other gets `null` → **409 `SLOT_FULL`**. (Tested: 6 parallel requests on a slot with 2 free seats gave exactly two 201s and four `SLOT_FULL`s, and `booked` ended at 2/2.)
4. The booking document is created. If that fails, the seat is given back.
5. `slot:updated` is published for Socket.IO.

### Sample data and Postman

- `npm run seed` clears the collections and inserts **3 rooms, 20 slots** (tomorrow: every hour in every room; the day after: ROOM-01), **4 students** and **4 bookings**. The ROOM-03 08:00 slot is made full (2/2) so you can try `SLOT_FULL`.
- [postman/srb-api.postman_collection.json](postman/srb-api.postman_collection.json) has **45 requests** in 7 folders, covering successful and failing cases. Each request has a test for its expected status code and error shape. Run `npm run seed` first, then run the collection in order: requests save `freeSlotId`, `fullSlotId` and a random `newRegNo` into collection variables for the requests that follow. The supplied collection contains 45 requests; rerun it against this customized version before claiming all assertions pass.

## Question 4: GraphQL

`POST /graphql` (Apollo Server 5, mounted on the same Express app). Schema in [graphql/typeDefs.js](graphql/typeDefs.js):

```graphql
type Query {
  rooms: [Room!]!
  slots(roomCode: String, date: String): [Slot!]!
  student(regNo: String!): Student          # Student.bookings -> [Booking] with roomName, date, startHour
}
type Mutation {
  bookSlot(regNo: String!, slotId: ID!): Booking!
  cancelBooking(regNo: String!, slotId: ID!): Boolean!
}
```

The resolvers in [graphql/resolvers.js](graphql/resolvers.js) are one-liners that call the **same service functions** as the REST controllers (`bookingService.bookSlot`, `bookingService.cancelBooking`, `slotService.findSlots`, …), so booking rules are not repeated. Service errors keep their meaning in GraphQL, for example:

```json
{ "errors": [{ "message": "Slot is full", "extensions": { "code": "SLOT_FULL", "status": 409 } }] }
```

### dashboard.graphql: why one GraphQL query beats REST here

[dashboard.graphql](dashboard.graphql) gets a student's details and all of their bookings (room name, date, start hour) in **one request**:

```graphql
query StudentDashboard($regNo: String!) {
  student(regNo: $regNo) {
    regNo name email
    bookings { slotId roomCode roomName date startHour endHour bookedAt }
  }
}
```

With REST the same screen needs at least two round trips (`GET /students/:regNo` and `GET /students/:regNo/bookings`). A plain resource-per-endpoint design would need even more, such as one `GET /slots/:id` and one `GET /rooms/:code` per booking (the N+1 request problem). Each REST endpoint also returns a fixed shape, so the client downloads fields it does not use (over-fetching). With GraphQL:

- the client asks for **exactly the fields the page needs**, nested as the page shows them
- it gets everything in **one HTTP round trip**, which matters most on slow mobile networks
- adding a field to the dashboard needs **no new endpoint and no backend change**, only a different query
- the schema is typed and self-documenting, so tools such as Apollo Sandbox can autocomplete and check the query

## Question 5: Real-time with Socket.IO

Booking still happens through REST (or GraphQL). Socket.IO only pushes the changes to open pages.

- **board.html** ([public/board.html](public/board.html)) shows the slots of one room, grouped by day, with seats left and a fill bar. Open `/board.html?room=ROOM-01`, or type another room code.
- **join:room:** when the socket connects, the page emits `join:room` with the roomCode. The server puts the socket in a Socket.IO room named after that roomCode (leaving any earlier one) and returns the current slots in the **acknowledgement**.
- **slot:updated:** after a booking or cancellation, the booking service publishes an event on an in-process event bus ([utils/events.js](utils/events.js)). The socket layer then calls `io.to(roomCode).emit('slot:updated', { slotId, seatsLeft })`, so **only boards for that room** receive it. The service does not depend on Socket.IO.
- **/admin namespace:** a middleware checks `socket.handshake.auth.adminKey` against `ADMIN_KEY` from `.env` (timing-safe compare). A missing or wrong key is refused with a clear `connect_error` message such as *"Invalid admin key: connection refused"*. A connected admin can emit `announce` with a message (validated: not empty, at most 300 characters), and every connected board shows it. Use [public/admin.html](public/admin.html) to try it.
- **Connection status:** the board shows *Connected*, *Disconnected* or *Reconnecting (attempt n)*. Because the page re-emits `join:room` on every `connect` event, it re-joins its room after the server restarts and **redraws with the current seats from the database**, without a page refresh.
- **XSS safety:** every piece of text from the server or users (room names, announcements, errors) is written with `textContent`. The pages never use `innerHTML`.

### How to test

1. `npm run seed` and `npm start`.
2. Open two tabs at `/board.html?room=ROOM-01` and one at `/board.html?room=ROOM-02`.
3. In Postman, run *List free slots of ROOM-01*, then *Book a free slot*.
4. Both ROOM-01 boards update within a second and the ROOM-02 board does not change. *Cancel booking* restores the seat on both.
5. Open `/admin.html`, enter the `ADMIN_KEY`, and send an announcement: all three boards show it. A wrong key shows the refusal message.
6. Stop the server (Ctrl+C) and the boards show *Disconnected*. Start it again and they reconnect and show the correct seats.
