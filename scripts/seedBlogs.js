// scripts/seedBlogs.js
// Run once to migrate the hardcoded BLOGS array into MongoDB:
//   node scripts/seedBlogs.js

import "dotenv/config";
import mongoose from "mongoose";
import Blog from "../Models/Blog.js";
import connectDB from "../Config/db.js";

const SEED_DATA = [
  {
    title: "Maximizing Solar Plant Efficiency Through Predictive Maintenance",
    slug: "maximizing-solar-plant-efficiency",
    excerpt:
      "Predictive maintenance powered by IoT sensors and AI analytics is transforming how solar plants operate — cutting unplanned downtime by up to 40% and boosting energy yield significantly.",
    category: "O&M Strategy",
    author: "Rajesh Kumar",
    image: "https://i.pinimg.com/1200x/a1/b8/88/a1b888760902a65b7f48c96776d0dc3b.jpg",
    readTime: "6 min read",
    featured: true,
    status: "published",
    publishDate: new Date("2025-03-10"),
  },
  {
    title: "Robotic Panel Cleaning: The Future of Solar O&M",
    slug: "robotic-cleaning-solutions",
    excerpt:
      "Dust accumulation on solar panels can reduce output by 20–40% in arid regions. We explore how autonomous robotic cleaning systems are revolutionizing maintenance cycles.",
    category: "Technology",
    author: "Priya Nair",
    image: "https://i.pinimg.com/736x/99/bc/32/99bc32b111665743d387bd427706dda8.jpg",
    readTime: "5 min read",
    featured: false,
    status: "published",
    publishDate: new Date("2025-02-28"),
  },
  {
    title: "Inverter Monitoring Best Practices for Large-Scale Solar Farms",
    slug: "inverter-monitoring-best-practices",
    excerpt:
      "Inverter failures account for over 60% of solar plant downtime. Learn the monitoring strategies that keep your plant running at peak capacity year-round.",
    category: "Technical Insights",
    author: "Ankit Sharma",
    image: "https://i.pinimg.com/736x/f5/e8/72/f5e87230f73c9811d9f9a69feb392b5a.jpg",
    readTime: "8 min read",
    featured: false,
    status: "published",
    publishDate: new Date("2025-02-14"),
  },
  {
    title: "Understanding Solar Plant Performance Benchmarks in India",
    slug: "solar-plant-performance-benchmarks",
    excerpt:
      "What does 'good performance' look like for a 10 MW solar plant in Rajasthan vs. one in Tamil Nadu? We break down the key KPIs and regional benchmarks every operator should track.",
    category: "Case Study",
    author: "Divya Menon",
    image: "https://i.pinimg.com/736x/5d/1c/4f/5d1c4ff98316287261df002767934b7d.jpg",
    readTime: "7 min read",
    featured: false,
    status: "published",
    publishDate: new Date("2025-01-30"),
  },
  {
    title: "How Thermal Imaging Is Catching Faults Before They Become Failures",
    slug: "thermal-imaging-inspections",
    excerpt:
      "Drone-based thermal imaging inspections are uncovering hidden cell degradation, hot spots, and bypass diode failures that traditional visual inspection misses entirely.",
    category: "Technology",
    author: "Rajesh Kumar",
    image: "https://i.pinimg.com/1200x/ea/42/7a/ea427a16cd68490ef9687dc8fd5487ce.jpg",
    readTime: "5 min read",
    featured: false,
    status: "draft",
    publishDate: new Date("2025-01-18"),
  },
  {
    title: "Solar O&M Contracts: What Every Developer Should Look For",
    slug: "om-contract-what-to-look-for",
    excerpt:
      "Not all O&M contracts are created equal. We outline the key clauses, SLA benchmarks, and performance guarantees that protect your plant's long-term ROI.",
    category: "O&M Strategy",
    author: "Ankit Sharma",
    image: "https://i.pinimg.com/1200x/26/41/87/26418733d5724ea2e4d0860174507329.jpg",
    readTime: "9 min read",
    featured: false,
    status: "published",
    publishDate: new Date("2025-01-05"),
  },
];

(async () => {
  await connectDB();

  const existing = await Blog.countDocuments();
  
  if (existing > 0) {
    // console.log(`ℹ️   Database already has ${existing} blog(s). Skipping seed.`);
    // console.log("    Delete all blogs first if you want to re-seed:");
    // console.log("    db.blogs.deleteMany({})");
    await mongoose.disconnect();
    return;
  }

  const inserted = await Blog.insertMany(SEED_DATA);
  console.log(`✅  Seeded ${inserted.length} blog posts successfully.`);
  await mongoose.disconnect();
})();   