import mongoose from "mongoose";
import dotenv from "dotenv";
import CertificateRequest from "../src/models/CertificateRequest.js";
import Counter from "../src/models/Counter.js";
import User from "../src/models/User.js";

dotenv.config();

async function testParallelRequestNumbers() {
  await mongoose.connect(process.env.MONGO_URI);

  // Create a test intern user
  const testUser = await User.create({
    fullName: "Test Parallel Intern",
    email: `parallel-test-${Date.now()}@example.com`,
    firstName: "Test",
    lastName: "Parallel",
    internCode: `PARTEST${Date.now()}`,
    domain: "Engineering",
    startDate: new Date("2026-01-01"),
    endDate: new Date("2026-12-31"),
    role: "intern",
    internshipDetails: {
      status: "ongoing",
      createdAt: new Date(),
    },
  });

  const requestNumbers = [];
  const mockRes = () => {
    const res = {
      statusCode: 200,
      body: null,
      status(code) { this.statusCode = code; return this; },
      json(data) { this.body = data; return this; },
    };
    return res;
  };

  console.log("=== Starting 10 parallel request submissions ===");

  // Fire 10 parallel requests
  const promises = [];
  for (let i = 0; i < 10; i++) {
    promises.push((async () => {
      try {
        const { generateRequestNumber } = await import("../src/controllers/intern.controller.js");
        const requestNumber = await generateRequestNumber();
        const res = mockRes();

        // Create a CertificateRequest directly
        const request = await CertificateRequest.create({
          requestNumber,
          userId: testUser._id,
          internCode: testUser.internCode,
          certificateType: "bonafide",
          reason: `Parallel test request ${i + 1}`,
          status: "pending",
          requestedAt: new Date(),
        });

        requestNumbers.push(request.requestNumber);
        return { index: i, requestNumber: request.requestNumber };
      } catch (err) {
        return { index: i, error: err.message };
      }
    })());
  }

  const results = await Promise.all(promises);

  console.log("\n=== Results ===");
  results.forEach((r) => {
    if (r.error) {
      console.log(`Request ${r.index + 1}: ERROR - ${r.error}`);
    } else {
      console.log(`Request ${r.index + 1}: ${r.requestNumber}`);
    }
  });

  // Check uniqueness
  const uniqueNumbers = [...new Set(requestNumbers)];
  console.log("\n=== Uniqueness Check ===");
  console.log(`Total requests: ${requestNumbers.length}`);
  console.log(`Unique request numbers: ${uniqueNumbers.length}`);
  console.log(`All unique? ${uniqueNumbers.length === requestNumbers.length}`);

  if (uniqueNumbers.length !== requestNumbers.length) {
    const duplicates = requestNumbers.filter((n, i) => requestNumbers.indexOf(n) !== i);
    console.log(`Duplicates found: ${duplicates}`);
  }

  // Cleanup
  await CertificateRequest.deleteMany({ internCode: testUser.internCode });
  await User.findByIdAndDelete(testUser._id);
  // Clean up counter entries created during test
  await Counter.deleteMany({ _id: { $regex: "^certRequest:" } });

  console.log("\n=== Cleanup complete ===");
  await mongoose.disconnect();
}

testParallelRequestNumbers().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
