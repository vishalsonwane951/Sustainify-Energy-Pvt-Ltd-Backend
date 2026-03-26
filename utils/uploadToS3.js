import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3 } from "../Config/s3.js";

export const uploadToS3 = async (file) => {
  try {
    const fileKey = `blogs/${Date.now()}-${file.originalname.replace(/\s+/g, "-")}`;

    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: fileKey,
        Body: file.buffer,
        ContentType: file.mimetype,
        // ✅ no ACL — bucket policy already allows public GetObject
      })


    );

    const fileUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`;

    return {
      fileUrl,
      fileKey,
    };

  } catch (error) {
    throw new Error("S3 upload failed: " + error.message);
  }
};