// createAdmin.js
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import User from "./src/models/User.js"; // Make sure this path points to your User model

dotenv.config();

async function createNewAdmin() {
  try {
    // 1. Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB...");

    // 2. Define details for your new admin
    const adminData = {
      fullName: "Super Admin",
      email: "newadmin@example.com",     // Set your new admin email
      password: "AdminPassword123!",    // Set your desired plain-text password
      mobileNo: "9876543210",
      role: "admin"
    };

    // 3. Hash the plain-text password using bcryptjs
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(adminData.password, saltRounds);

    // 4. Create and save the new admin user
    const newAdmin = new User({
      fullName: adminData.fullName,
      email: adminData.email,
      password: hashedPassword,
      mobileNo: adminData.mobileNo,
      role: adminData.role
    });

    await newAdmin.save();

    console.log("----------------------------------------");
    console.log(" New Admin successfully created!");
    console.log(` Email: ${adminData.email}`);
    console.log(` Password: ${adminData.password}`);
    console.log("----------------------------------------");

  } catch (error) {
    if (error.code === 11000) {
      console.error("Error: An account with this email already exists.");
    } else {
      console.error("Error creating admin:", error.message);
    }
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

createNewAdmin();