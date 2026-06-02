import bcrypt from "bcryptjs";
import pool from "../db.js";
import { defaultCategories } from "../utils/defaultCategories.js";

const DEMO_USER = {
  name: "Alex",
  email: "alex@timetoprogram.com",
  password: "Test@1234",
  currency: "USD",
};

const BUDGETS = {};
