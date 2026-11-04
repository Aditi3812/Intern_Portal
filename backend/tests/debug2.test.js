import mongoose from 'mongoose';
const { ObjectId } = mongoose.Types;

const internIds = Array.from({ length: 10 }, () => new ObjectId());
const tl1Id = new ObjectId();
const tl2Id = new ObjectId();
const tl3Id = new ObjectId();

const mockInterns = [
  { _id: internIds[0], fullName: 'Intern A', email: 'a@test.com', role: 'intern', domain: 'Web Development', isArchived: false, internshipDetails: { status: 'ongoing', teamLeader: tl1Id, startDate: new Date('2025-01-15'), endDate: new Date('2025-06-15'), teamleaderEmail: 'tl1@portal.com' } },
  { _id: internIds[1], fullName: 'Intern B', email: 'b@test.com', role: 'intern', domain: 'Web Development', isArchived: false, internshipDetails: { status: 'ongoing', teamLeader: tl1Id, startDate: new Date('2025-02-01'), endDate: new Date('2025-07-01'), teamleaderEmail: 'tl1@portal.com' } },
  { _id: internIds[2], fullName: 'Intern C', email: 'c@test.com', role: 'intern', domain: 'Data Science', isArchived: false, internshipDetails: { status: 'ongoing', teamLeader: tl1Id, startDate: new Date('2025-01-20'), endDate: new Date('2025-06-20'), teamleaderEmail: 'tl1@portal.com' } },
  { _id: internIds[3], fullName: 'Intern D', email: 'd@test.com', role: 'intern', domain: 'Data Science', isArchived: false, internshipDetails: { status: 'upcoming', teamLeader: tl2Id, startDate: new Date('2026-03-01'), endDate: new Date('2026-07-31'), teamleaderEmail: 'tl2@portal.com' } },
  { _id: internIds[4], fullName: 'Intern E', email: 'e@test.com', role: 'intern', domain: 'AI & ML', isArchived: false, internshipDetails: { status: 'upcoming', teamLeader: tl2Id, startDate: new Date('2026-04-01'), endDate: new Date('2026-07-31'), teamleaderEmail: 'tl2@portal.com' } },
  { _id: internIds[5], fullName: 'Intern F', email: 'f@test.com', role: 'intern', domain: 'AI & ML', isArchived: false, internshipDetails: { status: 'completed', teamLeader: tl3Id, startDate: new Date('2025-01-01'), endDate: new Date('2025-06-30'), teamleaderEmail: 'tl3@portal.com' } },
  { _id: internIds[6], fullName: 'Intern G', email: 'g@test.com', role: 'intern', domain: 'Web Development', isArchived: false, internshipDetails: { status: 'cancelled', teamLeader: tl3Id, startDate: new Date('2025-02-01'), endDate: new Date('2025-07-01'), teamleaderEmail: 'tl3@portal.com' } },
  { _id: internIds[7], fullName: 'Intern H', email: 'h@test.com', role: 'intern', domain: 'Cloud Computing', isArchived: false, internshipDetails: { status: 'cancelled', teamLeader: tl3Id, startDate: new Date('2025-03-01'), endDate: new Date('2025-07-01'), teamleaderEmail: 'tl3@portal.com' } },
  { _id: internIds[8], fullName: 'Intern I', email: 'i@test.com', role: 'intern', domain: 'Data Science', isArchived: true, internshipDetails: { status: 'ongoing', teamLeader: tl2Id, startDate: new Date('2025-01-01'), endDate: new Date('2025-06-30'), teamleaderEmail: 'tl2@portal.com' } },
  { _id: internIds[9], fullName: 'Intern J', email: 'j@test.com', role: 'intern', domain: 'AI & ML', isArchived: true, internshipDetails: { status: 'ongoing', teamLeader: tl3Id, startDate: new Date('2025-01-01'), endDate: new Date('2025-06-30'), teamleaderEmail: 'tl3@portal.com' } },
];

const certificateTypes = ['completion_certificate', 'bonafide', 'offer_letter'];
const dayMs = 24 * 60 * 60 * 1000;
const daysAgo = (n) => new Date(Date.now() - n * dayMs);

const mockRequests = [];
for (let idx = 0; idx < 20; idx++) {
  mockRequests.push({
    _id: new ObjectId(),
    requestNumber: `CR-${2026}-${idx + 1}`,
    userId: internIds[idx % 10],
    certificateType: certificateTypes[idx % 3],
    status: idx < 4 ? 'pending' : idx < 7 ? 'processing' : idx < 11 ? 'approved' : idx < 15 ? 'completed' : idx < 19 ? 'rejected' : 'cancelled',
    requestedAt: idx === 0 ? daysAgo(10) : idx === 1 ? daysAgo(5) : idx === 2 ? daysAgo(15) : idx === 3 ? daysAgo(20) : idx === 4 ? daysAgo(30) : idx === 5 ? daysAgo(25) : idx === 6 ? daysAgo(18) : idx === 7 ? daysAgo(12) : idx === 8 ? daysAgo(14) : idx === 9 ? daysAgo(8) : idx === 10 ? daysAgo(6) : idx === 11 ? daysAgo(60) : idx === 12 ? daysAgo(55) : idx === 13 ? daysAgo(50) : idx === 14 ? daysAgo(45) : idx === 15 ? daysAgo(40) : idx === 16 ? daysAgo(38) : idx === 17 ? daysAgo(35) : idx === 18 ? daysAgo(33) : daysAgo(30),
    updatedAt: daysAgo(0),
  });
}

// Simulate the filter
const internIdsFromFind = mockInterns.filter(u => u.role === 'intern').map(u => u._id);
console.log('internIdsFromFind length:', internIdsFromFind.length);

const matchQuery = {
  userId: { $in: internIdsFromFind },
};

const matched = mockRequests.filter((r) => {
  return matchQuery.userId.$in.some((id) => id.toString() === r.userId.toString());
});

console.log('matched requests:', matched.length);

const counts = {};
matched.forEach((r) => { counts[r.certificateType] = (counts[r.certificateType] || 0) + 1; });
console.log('counts:', JSON.stringify(counts));
console.log('total:', Object.values(counts).reduce((a, b) => a + b, 0));

// Now check what getScopedInternIds would return
const result = mockInterns
  .filter(u => u.role === 'intern')
  .filter(u => !(undefined === false && u.isArchived))
  .map(u => { const { password, ...safe } = u; return safe; });
const scopedIds = result.map(u => u._id);
console.log('scopedIds length:', scopedIds.length);

const matched2 = mockRequests.filter((r) => {
  return scopedIds.some((id) => id.toString() === r.userId.toString());
});
console.log('matched2 requests:', matched2.length);
