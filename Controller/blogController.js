import { PutCommand, ScanCommand, GetCommand, UpdateCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "../Config/dynamoClient.js";
import slugify from "slugify";
import { v4 as uuidv4 } from "uuid";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3 } from "../Config/s3.js";
import { uploadToS3 } from "../utils/uploadToS3.js";
import { notifySubscribers } from '../utils/emailService.js'



const TABLE_NAME = "Blogs-Sustainify";

function estimateReadTime(text = "") {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 200));
  return `${minutes} min read`;
}


// PUBLIC BLOG APIs 

export const getPublishedBlogs = async (req, res) => {
  try {

    const command = new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: "#status = :status",
      ExpressionAttributeNames: {
        "#status": "status"
      },
      ExpressionAttributeValues: {
        ":status": "published"
      }
    });

    const result = await docClient.send(command);

    res.json({
      success: true,
      blogs: result.Items || []
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to fetch blogs" });
  }
};


export const getPublishedBlogBySlug = async (req, res) => {
  try {

    const command = new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: "slug = :slug",
      ExpressionAttributeValues: {
        ":slug": req.params.slug
      }
    });

    const result = await docClient.send(command);

    if (!result.Items.length) {
      return res.status(404).json({ success: false, message: "Blog not found" });
    }

    res.json({
      success: true,
      blog: result.Items[0]
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false });
  }
};

export const adminCreateBlog = async (req, res) => {
  try {
    const {
      title,
      excerpt,
      content,
      author,
      date,
      category,
      tags = [],
      status = "draft",
      featured = false,
    } = req.body;

    //  Validation
    if (!title || typeof title !== "string") {
      return res.status(400).json({
        success: false,
        message: "Title is required",
      });
    }

    if (!content) {
      return res.status(400).json({
        success: false,
        message: "Content is required",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Image is required",
      });
    }

    //  Use your existing S3 utility
    const { fileUrl, fileKey } = await uploadToS3(req.file);

    //  Generate metadata
    const blogId = uuidv4();
    const slug = slugify(title, { lower: true, strict: true });
    const readTime = estimateReadTime(content);

  
    //  Blog object
    const newBlog = {
      blogId,
      title,
      slug,
      excerpt,       
      content,
      imageUrl: fileUrl,
      imageKey: fileKey,
      readTime,
      category: category ?? "O&M Stratergy", 
      publishDate: date ?? new Date().toISOString(),
      author,         // ✅
      tags,
      status,
      featured: featured ?? false, 
      createdAt: new Date().toISOString(),
    };

    //  Save to DynamoDB
    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: newBlog,
      })
    );

    res.status(201).json({
      success: true,
      message: "Blog created successfully",
      blog: newBlog,
    });

  } catch (err) {
    console.error("Create blog error:", err);

    res.status(500).json({
      success: false,
      message: err.message || "Server error",
    });
  }
};



export const adminDeleteBlog = async (req, res) => {
  try {

    const command = new DeleteCommand({
      TableName: TABLE_NAME,
      Key: {
        blogId: req.params.id
      }
    });

    await docClient.send(command);

    res.json({
      success: true,
      message: "Blog deleted"
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
};

// dynamo indexing 
// how to use query in dynamo 
// why not to use scancommand in dynamodb


export const adminGetAllBlogs = async (req, res) => {
  try {
    const command = new ScanCommand({
      TableName: TABLE_NAME
    });

    const result = await docClient.send(command);

    res.json({
      success: true,
      blogs: result.Items || []
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false });
  }
};

export const adminGetBlogById = async (req, res) => {
  try {

    const command = new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        blogId: req.params.id
      }
    });

    const result = await docClient.send(command);

    if (!result.Item) {
      return res.status(404).json({ success: false, message: "Blog not found" });
    }

    res.json({
      success: true,
      blog: result.Item
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
};

export const adminUpdateBlog = async (req, res) => {
  try {

    // Parse tags from JSON string (FormData sends it as string)
    let { title, excerpt, content, category, author, date, readTime, tags, status, featured } = req.body;
    if (typeof tags === "string") {
      try { tags = JSON.parse(tags); } catch { tags = tags.split(",").map(t => t.trim()).filter(Boolean); }
    }

    const fields = { title, excerpt, content, category, author, date, readTime, tags, status, featured };

    // If new image uploaded, push to S3 and add to fields
    if (req.file) {
      const { fileUrl, fileKey } = await uploadToS3(req.file);
      fields.imageUrl = fileUrl;
      fields.imageKey = fileKey;
    }

    const expParts = [];
    const ExpressionAttributeValues = {};
    const ExpressionAttributeNames = {};

    for (const [key, val] of Object.entries(fields)) {
      if (val === undefined || val === null || val === "") continue;

      if (key === "status") {
        expParts.push("#status = :status");
        ExpressionAttributeNames["#status"] = "status";
        ExpressionAttributeValues[":status"] = val;
      } else if (key === "imageUrl") {
        expParts.push("imageUrl = :imageUrl");
        ExpressionAttributeValues[":imageUrl"] = val;
      } else if (key === "imageKey") {
        expParts.push("imageKey = :imageKey");
        ExpressionAttributeValues[":imageKey"] = val;
      } else if (key === "date") {
        expParts.push("publishDate = :publishDate");
        ExpressionAttributeValues[":publishDate"] = val;
      } else if (key === "content") {
        expParts.push("content = :content");
        ExpressionAttributeValues[":content"] = val;
      } else {
        expParts.push(`${key} = :${key}`);
        ExpressionAttributeValues[`:${key}`] = val;
      }
    }

    const command = new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { blogId: req.params.id },
      UpdateExpression: "set " + expParts.join(", "),
      ExpressionAttributeNames: Object.keys(ExpressionAttributeNames).length ? ExpressionAttributeNames : undefined,
      ExpressionAttributeValues,
      ReturnValues: "ALL_NEW",
    });

    const result = await docClient.send(command);

    res.json({
      success: true,
      blog: result.Attributes
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const adminToggleStatus = async (req, res) => {
  try {

    const blog = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { blogId: req.params.id }
      })
    );

    const newStatus =
      blog.Item.status === "published" ? "draft" : "published";

    const command = new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { blogId: req.params.id },
      UpdateExpression: "set #status=:s",
      ExpressionAttributeNames: {
        "#status": "status"
      },
      ExpressionAttributeValues: {
        ":s": newStatus
      },
      ReturnValues: "ALL_NEW"
    });

    const result = await docClient.send(command);

    res.json({
      success: true,
      status: newStatus,
      blog: result.Attributes
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
};


export const adminToggleFeatured = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Blog ID is required"
      });
    }

    // Get blog
    const response = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { blogId: id }
      })
    );

    const blog = response.Item;

    // Check if blog exists
    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found"
      });
    }

    // Toggle featured
    const newFeatured = !blog.featured;

    const result = await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { blogId: id },
        UpdateExpression: "SET featured = :f",
        ExpressionAttributeValues: {
          ":f": newFeatured
        },
        ReturnValues: "ALL_NEW"
      })
    );

    res.json({
      success: true,
      featured: newFeatured,
      blog: result.Attributes
    });

  } catch (err) {
    console.error("Toggle Featured Error:", err);
    res.status(500).json({
      success: false,
      message: "Server Error"
    });
  }
};


export const adminPublishBlog = async (req, res) => {
  try {
    const { id } = req.params;
 
    // Fetch the blog
    const response = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { blogId: id },
      })
    );
 
    const blog = response.Item;
 
    if (!blog) {
      return res.status(404).json({ success: false, message: "Blog not found" });
    }
 
    // Already published — return early so subscribers aren't emailed twice
    if (blog.status === "published") {
      return res.status(200).json({
        success: true,
        message: "Blog is already published.",
        blog,
      });
    }
 
    // Set status = "published" + publishedAt timestamp
    const result = await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { blogId: id },
        UpdateExpression: "set #status = :s, publishedAt = :ts",
        ExpressionAttributeNames: {
          "#status": "status",
        },
        ExpressionAttributeValues: {
          ":s":  "published",
          ":ts": new Date().toISOString(),
        },
        ReturnValues: "ALL_NEW",
      })
    );
 
    const publishedBlog = result.Attributes;
 
    // Notify all active subscribers in background (non-blocking)
    notifySubscribers(publishedBlog)
      .then(({ sent, failed, total }) =>
        console.log(`📧 "${publishedBlog.title}" → ${sent}/${total} sent, ${failed} failed`)
      )
      .catch((err) => console.error("notifySubscribers error:", err.message));
 
    // Respond immediately — emails send in background
    return res.status(200).json({
      success: true,
      message: "Blog published! Subscriber emails are being sent.",
      blog: publishedBlog,
    });
 
  } catch (err) {
    console.error("adminPublishBlog error:", err);
    res.status(500).json({ success: false, message: err.message || "Server error" });
  }
};
