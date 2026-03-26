import { Router } from "express";
import {
  getPublishedBlogs,
  getPublishedBlogBySlug,
  adminGetAllBlogs,
  adminGetBlogById,
  adminCreateBlog,
  adminUpdateBlog,
  adminToggleStatus,
  adminToggleFeatured,
  adminDeleteBlog,
 adminPublishBlog,         
} from "../Controller/blogController.js";
import upload from "../middleware/upload.js";

// PUBLIC ROUTER — mounted at /api/blogs 
const router = Router();

router.get("/", getPublishedBlogs);

router.get("/:slug", getPublishedBlogBySlug);

const adminRouter = Router();

adminRouter.get("/", adminGetAllBlogs);
adminRouter.get("/:id", adminGetBlogById);
adminRouter.post("/", upload.single("image"), adminCreateBlog);
adminRouter.put("/:id", upload.single("image"), adminUpdateBlog);
adminRouter.patch("/:id/publish", adminPublishBlog);
adminRouter.patch("/:id/status", adminToggleStatus);
adminRouter.patch("/:id/featured", adminToggleFeatured);
adminRouter.delete("/:id", adminDeleteBlog);

export { router as blogRoutes, adminRouter as adminBlogRoutes };