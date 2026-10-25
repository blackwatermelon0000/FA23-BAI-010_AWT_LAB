# CampusSpace — Submission Guide

**Student:** Ayesha Mehmood  
**Registration number:** FA23-BAI-010  
**Course:** CSC337 Advanced Web Technologies

## Project
CampusSpace is a study room booking application with Express, MongoDB, Mongoose, REST endpoints, GraphQL, Socket.IO and a live room board. This student submission changes branding, sample student data, room names, the board room selector, availability display and a booking rule that rejects started slots.

## Setup on Windows
1. Install Node.js (18+) and start MongoDB locally or use a valid MongoDB Atlas URL.
2. Open CMD in the extracted project folder.
3. Run `npm install`.
4. Run `copy .env.example .env`, then check `MONGODB_URL` and choose a secure `ADMIN_KEY` in `.env`.
5. Run `npm run seed`. **Warning:** seeding deletes existing rooms, slots, students and bookings in that database.
6. Run `npm start`.
7. Visit `http://localhost:3000/` and `http://localhost:3000/board.html?room=ROOM-01`.
8. Import `postman/srb-api.postman_collection.json` into Postman and run the requests in the documented order.

## Customization checklist
- Repository / ZIP folder: `FA23-BAI-010_AWT_LAB`
- Brand: CampusSpace
- Submission information: Ayesha Mehmood, FA23-BAI-010
- Updated npm metadata and matching lockfile
- Updated homepage, live board and admin theme
- Sample registration, building labels and room names customized; room codes preserved to maintain API compatibility
- Updated GraphQL, Postman and diagram labels
- Room selector, available seat filter and availability totals on live board
- Prevent booking already started slots with `409 SLOT_STARTED`

## Important: Assignment 2 compatibility
The supplied Advance Web Technologies **Assignment 2** brief describes a *service request management system* and requires `Users`, `ServiceRequests` and `Categories` collections, full service request CRUD, an unresolved requests per category aggregation, and Express controllers, Mongoose and middleware. **This customized booking application is not that system.** It already demonstrates Express and MongoDB patterns but the three specified collections, service request workflow and aggregation report are not implemented. Do not claim it fulfills the PDF Assignment 2 rubric without adding and testing those features or confirming that your instructor accepts the booking domain instead.

## Verification before submission
- `node --check server.js` and other JS files to catch syntax errors
- App starts with a valid MongoDB connection
- `npm run seed` completes against a disposable database
- GET health, rooms, slots and student dashboard work
- Book an available future slot and cancel it
- Two bookings cannot take the same last seat
- A booking attempt for an already started slot returns `409 SLOT_STARTED`
- Check room selector and availability filter, including Socket.IO updates
- Run Postman collection; compare results to baseline

## ZIP and GitHub
Create a new empty GitHub repository named `FA23-BAI-010_AWT_LAB` in `blackwatermelon0000`, then publish the contents of this project folder with Git from CMD. Do not commit `.env`, personal credentials or `node_modules`.
