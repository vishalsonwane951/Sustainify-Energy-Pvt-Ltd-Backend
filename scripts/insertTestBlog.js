import dotenv from "dotenv";
dotenv.config();

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, BatchWriteCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(client);

async function insertBlogs() {
  try {
    const blogs = [
      {
        blogId: "1",
        title: "Latest Trends in Renewable Energy Technology",
        slug: "latest-trends-in-renewable-energy-technology",
        excerpt: "Explore how modern technologies are transforming renewable energy systems and improving efficiency.",
        body: "<p>Renewable energy technologies are evolving rapidly...</p>",
        category: "Technology",
        author: "Amit Sharma",
        image: "https://example.com/images/renewable.jpg",
        readTime: "6 min",
        featured: false,
        status: "published",
        publishDate: new Date("2026-03-10").toISOString()
      },
      {
        blogId: "2",
        title: "Case Study: Solar Plant Optimization in Maharashtra",
        slug: "case-study-solar-plant-optimization-maharashtra",
        excerpt: "A real-world case study showing how solar plant performance improved using smart monitoring.",
        body: "<p>This case study highlights a solar plant...</p>",
        category: "Case Study",
        author: "Neha Patil",
        image: "https://example.com/images/solar-case.jpg",
        readTime: "8 min",
        featured: true,
        status: "published",
        publishDate: new Date("2026-02-28").toISOString()
      },
      {
        blogId: "3",
        title: "Understanding SCADA Systems in Power Plants",
        slug: "understanding-scada-systems-in-power-plants",
        excerpt: "Learn how SCADA systems help monitor and control industrial operations efficiently.",
        body: "<p>SCADA systems are essential...</p>",
        category: "Technical Insights",
        author: "Rahul Verma",
        image: "https://example.com/images/scada.jpg",
        readTime: "5 min",
        featured: false,
        status: "published",
        publishDate: new Date("2026-03-05").toISOString()
      }
    ];

    const command = new BatchWriteCommand({
      RequestItems: {
        "Blogs-Sustainify": blogs.map(blog => ({
          PutRequest: {
            Item: blog
          }
        }))
      }
    });

    await docClient.send(command);

  } catch (error) {
    console.error("❌ Insert error:", error);
  }
}

insertBlogs();