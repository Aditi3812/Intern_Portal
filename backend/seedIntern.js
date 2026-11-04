import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./src/models/User.js";

dotenv.config();

async function seedIntern() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB...");

    const internData = {
      fullName: "Demo Intern",
      email: "demo.intern@example.com",
      mobileNo: "9876543210",
      domain: "Full Stack Web Development",
      startDate: new Date("2026-09-01"),
      endDate: new Date("2026-12-31"),
      role: "intern",
      password: "Intern@123",
      internshipDetails: {
        teamLeader: new mongoose.Types.ObjectId("6ab292c490c3dc7eccae98d7"),
        teamleaderEmail: "teamleader@example.com",
        status: "ongoing",
        createdBy: new mongoose.Types.ObjectId("6ab292c490c3dc7eccae98d7"),
      },
    };

    const isUserExists = await User.findOne({ email: internData.email });
    if (isUserExists) {
      console.log(`Intern already exists with email: ${internData.email}`);
      await mongoose.disconnect();
      process.exit(0);
    }

    const intern = await User.create(internData);
    console.log("Intern created successfully!");
    console.log(`Name: ${intern.fullName}`);
    console.log(`Email: ${intern.email}`);
    console.log(`Password: ${internData.password}`);
    console.log(`Role: ${intern.role}`);
    console.log(`Intern Code: ${intern.internCode}`);
  } catch (error) {
    console.error("Error creating intern:", error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seedIntern();
