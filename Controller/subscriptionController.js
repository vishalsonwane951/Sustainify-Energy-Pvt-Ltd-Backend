import { validationResult } from "express-validator";
import { PutCommand, GetCommand, UpdateCommand, ScanCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";

// Reuse YOUR existing docClient 
import { docClient } from "../Config/dynamoClient.js";
import { sendWelcomeEmail } from "../utils/emailService.js";

const TABLE = process.env.SUBSCRIBERS_TABLE;
const PK = process.env.SUBSCRIBERS_PK || "email";

if (!TABLE) {
  console.warn("⚠️  SUBSCRIBERS_TABLE is not set in .env");
}


// POST /api/subscriptions
export async function subscribe(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ success: false, errors: errors.array() });
  }

  const email = req.body.email.toLowerCase().trim();

  try {
    const scan = await docClient.send(
      new ScanCommand({
        TableName: TABLE,
        FilterExpression: "email = :e",
        ExpressionAttributeValues: { ":e": email },
      })
    );

    const existing = scan.Items?.[0];

    if (existing) {
      if (existing.isActive) {
        return res.status(200).json({
          success: true,
          message: "You're already subscribed! Check your inbox for updates.",
        });
      }

      const pk = existing.email;
      await docClient.send(
        new UpdateCommand({
          TableName: TABLE,
          Key: { [PK]: pk },
          UpdateExpression: "SET isActive = :t, resubscribedAt = :now REMOVE unsubscribedAt",
          ExpressionAttributeValues: {
            ":t": true,
            ":now": new Date().toISOString(),
          },
        })
      );

      sendWelcomeEmail({ email: pk, unsubscribeToken: existing.unsubscribeToken })
        .catch((err) => console.error("Welcome email error:", err.message));

      return res.status(200).json({
        success: true,
        message: "Welcome back! You've been re-subscribed.",
      });
    }

    // New subscriber — save to DynamoDB
    const unsubscribeToken = randomUUID();
    const item = {
      [PK]: email,    
      email,          
      isActive: true,
      unsubscribeToken,
      subscribedAt: new Date().toISOString(),
    };

    await docClient.send(new PutCommand({ TableName: TABLE, Item: item }));

    sendWelcomeEmail(item)
      .catch((err) => console.error("Welcome email error:", err.message));

    return res.status(201).json({
      success: true,
      message: "Subscribed! Check your inbox for a welcome email.",
    });

  } catch (err) {
    console.error("Subscribe error:", err.message);
    return res.status(500).json({
      success: false,
      message: err.message || "Server error",
    });
  }
}

// GET /api/subscriptions/unsubscribe/:token 
export async function unsubscribe(req, res, next) {
  const { token } = req.params;

  try {
    const result = await docClient.send(
      new ScanCommand({
        TableName: TABLE,
        FilterExpression: "unsubscribeToken = :t",
        ExpressionAttributeValues: { ":t": token },
      })
    );

    const subscriber = result.Items?.[0];

    if (!subscriber) {
      return res.status(404).send(unsubscribePage("Invalid or expired link.", false));
    }

    if (!subscriber.isActive) {
      return res.status(200).send(unsubscribePage("You're already unsubscribed.", true));
    }

    await docClient.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: { [PK]: subscriber[PK] || subscriber.email },
        UpdateExpression: "SET isActive = :f, unsubscribedAt = :now",
        ExpressionAttributeValues: {
          ":f": false,
          ":now": new Date().toISOString(),
        },
      })
    );

    return res.status(200).send(unsubscribePage("You've been unsubscribed.", true));

  } catch (err) {
    console.error("Unsubscribe error:", err);
    next(err);
  }
}

// GET /api/subscriptions/all 
export async function getAllSubscribers(req, res, next) {
  try {
    const result = await docClient.send(new ScanCommand({ TableName: TABLE }));
    const items = result.Items || [];
    return res.json({ success: true, subscribers: items, total: items.length });
  } catch (err) {
    console.error("getAllSubscribers error:", err);
    next(err);
  }
}

// PATCH /api/subscriptions/toggle 
// Toggles isActive for a subscriber (admin action)
export async function toggleSubscriber(req, res, next) {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, message: "email required" });

  try {
    const scan = await docClient.send(
      new ScanCommand({
        TableName: TABLE,
        FilterExpression: "email = :e",
        ExpressionAttributeValues: { ":e": email },
      })
    );

    const sub = scan.Items?.[0];
    if (!sub) return res.status(404).json({ success: false, message: "Subscriber not found" });

    const newActive = !(sub.isActive === true || sub.isActive === "true");

    const updateExpression = newActive
      ? "SET isActive = :a, resubscribedAt = :now REMOVE unsubscribedAt"
      : "SET isActive = :a, unsubscribedAt = :now";

    await docClient.send(new UpdateCommand({
      TableName: TABLE,
      Key: { [PK]: sub[PK] },
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: { ":a": newActive, ":now": new Date().toISOString() },
    }));

    return res.json({ success: true, email, isActive: newActive });
  } catch (err) {
    console.error("toggleSubscriber error:", err);
    next(err);
  }
}

//  DELETE /api/subscriptions/:email 
// Permanently deletes a subscriber (admin action)
export async function deleteSubscriber(req, res, next) {
  const email = decodeURIComponent(req.params.email);
  if (!email) return res.status(400).json({ success: false, message: "email required" });

  try {
    const scan = await docClient.send(
      new ScanCommand({
        TableName: TABLE,
        FilterExpression: "email = :e",
        ExpressionAttributeValues: { ":e": email },
      })
    );

    const sub = scan.Items?.[0];
    if (!sub) return res.status(404).json({ success: false, message: "Subscriber not found" });

    await docClient.send(new DeleteCommand({
      TableName: TABLE,
      Key: { [PK]: sub[PK] },
    }));

    return res.json({ success: true, message: "Subscriber deleted." });
  } catch (err) {
    console.error("deleteSubscriber error:", err);
    next(err);
  }
}

// GET /api/subscriptions/stats 
export async function getStats(req, res, next) {
  try {
    const all = await docClient.send(new ScanCommand({ TableName: TABLE }));
    const items = all.Items || [];
    const active = items.filter((i) => i.isActive).length;

    return res.json({
      success: true,
      data: { total: items.length, active, unsubscribed: items.length - active },
    });
  } catch (err) {
    console.error("Stats error:", err);
    next(err);
  }
}

// Unsubscribe HTML page
function unsubscribePage(message, success) {
  const frontendUrl = process.env.CLIENT_ORIGINS?.split(",")[0] || "http://localhost:5173";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>PV Protect – ${success ? "Unsubscribed" : "Error"}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{background:#f0f4f8;font-family:'Segoe UI',Arial,sans-serif;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px}
    .wrapper{width:100%;max-width:520px}

    /* Header */
    .header{background:#0f172a;border-radius:16px 16px 0 0;padding:28px 36px;display:flex;align-items:center;gap:14px}
    .logo-mark{width:40px;height:40px;background:linear-gradient(135deg,#facc15,#f97316);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0}
    .logo-text{display:flex;flex-direction:column}
    .logo-name{color:#f1f5f9;font-size:16px;font-weight:800;letter-spacing:-0.01em}
    .logo-tagline{color:#475569;font-size:11px;margin-top:1px}
    .bar{height:3px;background:linear-gradient(90deg,#facc15,#4ade80,#60a5fa)}

    /* Card body */
    .card{background:#ffffff;border-radius:0 0 16px 16px;padding:48px 40px 40px;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,0.08)}
    .status-icon{width:72px;height:72px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:32px;margin:0 auto 24px;background:${success ? "#f0fdf4" : "#fef2f2"};border:2px solid ${success ? "#bbf7d0" : "#fecaca"}}
    h1{font-size:22px;font-weight:800;color:#0f172a;margin-bottom:10px;letter-spacing:-0.02em}
    .subtitle{font-size:14px;color:#64748b;line-height:1.7;margin-bottom:32px;max-width:340px;margin-left:auto;margin-right:auto}

    /* Divider */
    .divider{height:1px;background:#f1f5f9;margin:0 0 28px}

    /* Info box */
    .info-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px 20px;margin-bottom:28px;text-align:left}
    .info-row{display:flex;align-items:flex-start;gap:10px;font-size:13px;color:#475569;line-height:1.6}
    .info-row+.info-row{margin-top:10px}
    .info-dot{width:6px;height:6px;border-radius:50%;background:#94a3b8;flex-shrink:0;margin-top:5px}

    /* CTA */
    .btn{display:inline-block;padding:13px 32px;background:linear-gradient(135deg,#0ea5e9,#0284c7);color:#fff;text-decoration:none;border-radius:10px;font-size:14px;font-weight:700;letter-spacing:0.01em;transition:opacity 0.2s}
    .btn:hover{opacity:0.9}
    .btn-outline{display:inline-block;padding:11px 24px;border:1.5px solid #e2e8f0;color:#475569;text-decoration:none;border-radius:10px;font-size:13px;font-weight:600;margin-left:10px}

    /* Footer */
    .footer{text-align:center;margin-top:20px;font-size:11px;color:#94a3b8;line-height:1.7}
    .footer a{color:#64748b;text-decoration:none}
    .footer a:hover{text-decoration:underline}
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="logo-mark">⚡</div>
      <div class="logo-text">
        <span class="logo-name">PV Protect</span>
        <span class="logo-tagline">Solar O&amp;M Intelligence Platform</span>
      </div>
    </div>
    <div class="bar"></div>
    <div class="card">
      <div class="status-icon">${success ? "✅" : "❌"}</div>

      <h1>${message}</h1>
      <p class="subtitle">
        ${success
          ? "You will no longer receive blog update notifications from PV Protect. Your preference has been saved."
          : "We were unable to process your unsubscribe request. The link may have expired or already been used."
        }
      </p>

      <div class="divider"></div>

      ${success ? `
      <div class="info-box">
        <div class="info-row"><span class="info-dot"></span><span>You can re-subscribe at any time from our blog page.</span></div>
        <div class="info-row"><span class="info-dot"></span><span>Existing articles remain accessible — no account required.</span></div>
        <div class="info-row"><span class="info-dot"></span><span>For support, contact us at <a href="mailto:support@pvprotect.in" style="color:#0ea5e9;text-decoration:none">support@pvprotect.in</a></span></div>
      </div>` : `
      <div class="info-box">
        <div class="info-row"><span class="info-dot"></span><span>Try clicking the unsubscribe link from your original email again.</span></div>
        <div class="info-row"><span class="info-dot"></span><span>If the issue persists, contact us and we will remove you manually.</span></div>
      </div>`}

      <div>
        <a href="${frontendUrl}/blogs" class="btn">← Back to Blog</a>
        <a href="mailto:support@pvprotect.in" class="btn-outline">Contact Support</a>
      </div>
    </div>

    <div class="footer">
      <p>© ${new Date().getFullYear()} PV Protect · Solar O&amp;M Intelligence</p>
      <p style="margin-top:4px">
        <a href="${frontendUrl}">Home</a> &nbsp;·&nbsp;
        <a href="${frontendUrl}/blogs">Blog</a> &nbsp;·&nbsp;
        <a href="mailto:support@pvprotect.in">Support</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}