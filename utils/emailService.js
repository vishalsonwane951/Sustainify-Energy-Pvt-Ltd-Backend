import nodemailer from "nodemailer";
import { ScanCommand } from "@aws-sdk/lib-dynamodb";

import { docClient } from "../Config/dynamoClient.js";

const SUBSCRIBERS_TABLE = process.env.SUBSCRIBERS_TABLE;
const PK = process.env.SUBSCRIBERS_PK || "email";

if (!SUBSCRIBERS_TABLE) {
  console.warn("⚠️  SUBSCRIBERS_TABLE env variable is not set in .env");
}
// Nodemailer transporter (lazy singleton)

let _transporter = null;

function getTransporter() {
  if (_transporter) return _transporter;
  _transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT) || 587,
    secure: process.env.MAIL_SECURE === "true",
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });
  return _transporter;
}

export async function verifyMailer() {
  try {
    await getTransporter().verify();
    // console.log("✅ Mailer ready");
  } catch (err) {
    console.error("❌ Mailer failed:", err.message);
  }
}

// Unsubscribe URL helper
function unsubUrl(token) {
  const base = process.env.API_URL || "http://localhost:5000";
  return `${base}/api/subscriptions/unsubscribe/${token}`;
}

// function getEmail(subscriber) {
//   return subscriber.email || subscriber[PK] || "";
// }

//  Send welcome email to a new subscriber
export async function sendWelcomeEmail(subscriber) {
  const { subject, html, text } = welcomeTemplate({
    email: subscriber.email,
    unsubscribeUrl: unsubUrl(subscriber.unsubscribeToken),
  });

  await getTransporter().sendMail({
    from: process.env.MAIL_FROM,
    to: subscriber.email,
    subject,
    html,
    text,
  });

//   console.log(`📧 Welcome email → ${subscriber.email}`);
}

// Notify all active subscribers about a new blog
export async function notifySubscribers(blog) {
  if (!SUBSCRIBERS_TABLE) {
    console.error("❌ notifySubscribers: SUBSCRIBERS_TABLE is not defined in .env");
    return { sent: 0, failed: 0, total: 0 };
  }
  const result = await docClient.send(
    new ScanCommand({ TableName: SUBSCRIBERS_TABLE })
  );

  const allItems = result.Items || [];
  const subscribers = allItems.filter(
    (s) => s.isActive === true || s.isActive === "true"
  );

  console.log(`🔍 Subscribers table="${SUBSCRIBERS_TABLE}" pk="${PK}": ${allItems.length} total, ${subscribers.length} active`);
  if (allItems.length > 0) {
    console.log("🔍 Sample item:", JSON.stringify(allItems[0]));
  }

  if (!subscribers.length) {
    console.log("ℹ️  No active subscribers to notify.");
    return { sent: 0, failed: 0, total: 0 };
  }

  console.log(`📨 Notifying ${subscribers.length} subscribers about: "${blog.title}"`);

  let sent = 0;
  let failed = 0;

  // Send in batches of 50
  const BATCH = 50;
  for (let i = 0; i < subscribers.length; i += BATCH) {
    const batch = subscribers.slice(i, i + BATCH);

    const results = await Promise.allSettled(
      batch.map((sub) => sendOneBlogEmail(blog, sub))
    );

    results.forEach((r, idx) => {
      if (r.status === "fulfilled") {
        sent++;
      } else {
        failed++;
        console.error(`  ✗ ${batch[idx].email}: ${r.reason?.message}`);
      }
    });

    if (i + BATCH < subscribers.length) {
      await new Promise((r) => setTimeout(r, 800));
    }
  }

  console.log(`✅ Done — sent: ${sent}, failed: ${failed}`);
  return { sent, failed, total: subscribers.length };
}

async function sendOneBlogEmail(blog, subscriber) {
  const { subject, html, text } = newBlogTemplate({
    blog,
    unsubscribeUrl: unsubUrl(subscriber.unsubscribeToken),
  });

  await getTransporter().sendMail({
    from: process.env.MAIL_FROM,
    to: subscriber.email,
    subject,
    html,
    text,
  });
}

// Email templates 

function layout(bodyHtml, unsubscribeUrl, previewText = "") {
  const frontendUrl = process.env.CLIENT_ORIGINS?.split(",")[0] || "http://localhost:5173";
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <meta name="x-apple-disable-message-reformatting"/>
  <title>PV Protect</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
  <style>
    body,html{margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',Arial,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}
    table{border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0}
    img{border:0;height:auto;line-height:100%;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic}
    .wrapper{width:100%;max-width:600px;margin:0 auto;padding:32px 16px}

    /* Header */
    .header{background:#0f172a;border-radius:14px 14px 0 0;padding:22px 32px;display:flex;align-items:center;gap:14px}
    .logo-mark{width:38px;height:38px;background:linear-gradient(135deg,#facc15,#f97316);border-radius:9px;display:inline-flex;align-items:center;justify-content:center;font-size:18px;vertical-align:middle}
    .logo-info{display:inline-block;vertical-align:middle;margin-left:12px}
    .logo-name{color:#f1f5f9;font-size:15px;font-weight:800;letter-spacing:-0.01em;display:block}
    .logo-tag{color:#475569;font-size:10px;letter-spacing:0.04em;text-transform:uppercase;display:block;margin-top:1px}
    .accent-bar{height:3px;background:linear-gradient(90deg,#facc15 0%,#4ade80 50%,#60a5fa 100%)}

    /* Body */
    .body{background:#ffffff;padding:40px 36px}
    .badge{display:inline-block;background:#f0fdf4;border:1px solid #bbf7d0;color:#15803d;font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;padding:4px 12px;border-radius:100px;margin-bottom:20px}
    h1{margin:0 0 12px;font-size:22px;font-weight:800;color:#0f172a;line-height:1.3;letter-spacing:-0.02em}
    .lead{font-size:15px;color:#475569;line-height:1.75;margin:0 0 24px}
    p{font-size:14px;color:#64748b;line-height:1.75;margin:0 0 16px}
    strong{color:#0f172a}

    /* Divider */
    .divider{height:1px;background:#f1f5f9;margin:28px 0}

    /* Info list */
    .check-list{margin:0 0 28px;padding:0;list-style:none}
    .check-list li{font-size:13px;color:#475569;padding:6px 0;padding-left:22px;position:relative;line-height:1.6}
    .check-list li::before{content:"✓";position:absolute;left:0;color:#22c55e;font-weight:700}

    /* CTA button */
    .btn{display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#0ea5e9,#0284c7);color:#ffffff !important;text-decoration:none;border-radius:10px;font-size:14px;font-weight:700;letter-spacing:0.01em;margin-top:4px}
    .btn-green{background:linear-gradient(135deg,#22c55e,#16a34a)}

    /* Cover image */
    .cover{width:100%;border-radius:10px;display:block;margin-bottom:24px;max-height:260px;object-fit:cover}

    /* Category pill */
    .cat-pill{display:inline-block;font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;padding:3px 12px;border-radius:100px;margin-bottom:14px}

    /* Meta info */
    .meta{font-size:12px;color:#94a3b8;margin:0 0 20px}
    .meta span{margin-right:12px}

    /* Footer */
    .footer{background:#f8fafc;border-radius:0 0 14px 14px;padding:22px 32px;text-align:center;border-top:1px solid #e2e8f0}
    .footer p{font-size:11px;color:#94a3b8;margin:0 0 6px;line-height:1.7}
    .footer a{color:#64748b;text-decoration:none}
    .footer a:hover{text-decoration:underline}
    .footer-links{margin-top:10px}
    .footer-links a{font-size:11px;color:#94a3b8;text-decoration:none;margin:0 8px}

    @media(max-width:600px){
      .wrapper{padding:16px 8px}
      .body{padding:28px 20px}
      h1{font-size:19px}
    }
  </style>
</head>
<body>
  ${previewText ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all">${previewText}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>` : ""}
  <div class="wrapper">
    <!-- Header -->
    <div class="header">
      <span class="logo-mark">⚡</span>
      <span class="logo-info">
        <span class="logo-name">PV Protect</span>
        <span class="logo-tag">Solar O&amp;M Intelligence</span>
      </span>
    </div>
    <div class="accent-bar"></div>

    <!-- Body -->
    <div class="body">
      ${bodyHtml}
    </div>

    <!-- Footer -->
    <div class="footer">
      <p>You're receiving this because you subscribed to <strong style="color:#0f172a">PV Protect</strong> blog updates.</p>
      <p><a href="${unsubscribeUrl}">Unsubscribe</a> &nbsp;·&nbsp; <a href="${frontendUrl}/blogs">Visit Blog</a> &nbsp;·&nbsp; <a href="mailto:support@pvprotect.in">Support</a></p>
      <div class="footer-links">
        <a href="${frontendUrl}">Home</a>
        <a href="${frontendUrl}/blogs">Articles</a>
        <a href="mailto:support@pvprotect.in">Contact</a>
      </div>
      <p style="margin-top:12px">© ${year} PV Protect · Solar O&amp;M Intelligence Platform · India</p>
    </div>
  </div>
</body>
</html>`;
}

//  Welcome email 
function welcomeTemplate({ email, unsubscribeUrl }) {
  const bodyHtml = `
    <div class="badge">✦ Subscription Confirmed</div>
    <h1>Welcome to PV Protect Insights 🌞</h1>
    <p class="lead">
      You're now part of a growing community of solar O&amp;M professionals across India.
      We deliver expert knowledge directly to your inbox — no fluff, no spam.
    </p>

    <p><strong>What to expect from us:</strong></p>
    <ul class="check-list">
      <li>In-depth O&amp;M strategy articles from field engineers</li>
      <li>Technical insights on inverters, trackers &amp; monitoring systems</li>
      <li>Real-world case studies from solar plants across India</li>
      <li>Updates on emerging solar technologies &amp; best practices</li>
    </ul>

    <div class="divider"></div>

    <p style="margin:0 0 20px;font-size:13px;color:#94a3b8">
      Subscribed with: <strong style="color:#475569">${email}</strong>
    </p>

    <a href="${process.env.CLIENT_ORIGINS?.split(",")[0] || "http://localhost:5173"}/blogs" class="btn btn-green">
      Explore Latest Articles →
    </a>
  `;

  return {
    subject: "Welcome to PV Protect — You're subscribed ✅",
    html: layout(bodyHtml, unsubscribeUrl, "You're now subscribed to PV Protect solar O&M insights."),
    text: `Welcome to PV Protect!

You're now subscribed to expert solar O&M insights.

Visit our blog: ${process.env.CLIENT_ORIGINS?.split(",")[0] || "http://localhost:5173"}/blogs

Unsubscribe: ${unsubscribeUrl}`,
  };
}

// New blog notification 
function newBlogTemplate({ blog, unsubscribeUrl }) {
  const frontendUrl = process.env.CLIENT_ORIGINS?.split(",")[0] || "http://localhost:5173";
  const blogUrl = `${frontendUrl}/blogs/${blog.slug}`;

  const ACCENTS = {
    "O&M Strategy":       { color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0" },
    "Technology":         { color: "#1d4ed8", bg: "#eff6ff", border: "#bfdbfe" },
    "Technical Insights": { color: "#c2410c", bg: "#fff7ed", border: "#fed7aa" },
    "Case Study":         { color: "#a16207", bg: "#fefce8", border: "#fde68a" },
  };
  const cat = ACCENTS[blog.category] || { color: "#475569", bg: "#f8fafc", border: "#e2e8f0" };

  const bodyHtml = `
    ${blog.imageUrl ? `<img class="cover" src="${blog.imageUrl}" alt="${blog.title}"/>` : ""}

    <span class="cat-pill" style="background:${cat.bg};color:${cat.color};border:1px solid ${cat.border}">
      ${blog.category || "Article"}
    </span>

    <p class="meta">
      ${blog.author ? `<span>By <strong style="color:#0f172a">${blog.author}</strong></span>` : ""}
      ${blog.readTime ? `<span>${blog.readTime}</span>` : ""}
    </p>

    <h1>${blog.title}</h1>

    ${blog.excerpt ? `<p class="lead">${blog.excerpt}</p>` : ""}

    <div class="divider"></div>

    <p style="font-size:13px;color:#94a3b8;margin:0 0 24px">
      This article was just published on the PV Protect blog. Click below to read the full piece.
    </p>

    <a href="${blogUrl}" class="btn">Read Full Article →</a>
  `;

  return {
    subject: `New Article: ${blog.title} | PV Protect`,
    html: layout(bodyHtml, unsubscribeUrl, `New article published: ${blog.title}`),
    text: `New article on PV Protect:

${blog.title}

${blog.excerpt || ""}

Read it here: ${blogUrl}

Unsubscribe: ${unsubscribeUrl}`,
  };
}