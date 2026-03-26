function layout(body, unsubscribeUrl) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>PV Protect</title>
  <style>
    body{margin:0;padding:0;background:#0d1117;font-family:'Segoe UI',Arial,sans-serif;color:#f1f5f9}
    .wrap{max-width:600px;margin:32px auto;background:#0f172a;border-radius:16px;overflow:hidden;border:1px solid rgba(51,65,85,0.8)}
    .bar{height:3px;background:linear-gradient(90deg,#facc15,#4ade80,#60a5fa)}
    .hdr{padding:36px 36px 28px;text-align:center;background:linear-gradient(160deg,#0d1e30,#080f1a)}
    .hdr-logo{font-size:22px;font-weight:800;background:linear-gradient(to right,#facc15,#4ade80);-webkit-background-clip:text;-webkit-text-fill-color:transparent;letter-spacing:-0.01em}
    .hdr-sub{color:#60a5fa;font-size:12px;margin-top:4px;letter-spacing:0.05em}
    .body{padding:32px 36px}
    .badge{display:inline-flex;align-items:center;gap:6px;background:rgba(74,222,128,0.08);border:1px solid rgba(74,222,128,0.25);border-radius:100px;padding:4px 12px;margin-bottom:16px}
    .badge-dot{width:6px;height:6px;border-radius:50%;background:#4ade80;display:inline-block}
    .badge-txt{color:#4ade80;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase}
    h1{margin:0 0 12px;font-size:22px;font-weight:800;line-height:1.3;color:#f8fafc}
    p{margin:0 0 14px;font-size:14px;line-height:1.75;color:rgba(241,245,249,0.65)}
    .btn{display:inline-block;padding:13px 28px;background:linear-gradient(to right,#22c55e,#10b981);color:#fff;text-decoration:none;border-radius:10px;font-weight:700;font-size:14px;margin-top:8px}
    .divider{height:1px;background:rgba(51,65,85,0.5);margin:24px 0}
    .cover{width:100%;border-radius:10px;display:block;max-height:260px;object-fit:cover;margin-bottom:20px}
    .cat-pill{display:inline-block;padding:3px 12px;border-radius:100px;font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;background:rgba(74,222,128,0.1);color:#4ade80;border:1px solid rgba(74,222,128,0.28);margin-bottom:14px}
    .ftr{padding:20px 36px;background:rgba(8,15,26,0.6);border-top:1px solid rgba(51,65,85,0.5);text-align:center;font-size:11px;color:#475569}
    .ftr a{color:#4ade80;text-decoration:none}
    @media(max-width:620px){.wrap{margin:0;border-radius:0}.body,.hdr,.ftr{padding-left:20px;padding-right:20px}}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="bar"></div>
    <div class="hdr">
      <div class="hdr-logo">⚡ PV Protect</div>
      <div class="hdr-sub">Solar O&amp;M Knowledge Hub</div>
    </div>
    <div class="body">${body}</div>
    <div class="ftr">
      <p style="margin:0 0 6px">You're receiving this because you subscribed to PV Protect updates.</p>
      <p style="margin:0"><a href="${unsubscribeUrl}">Unsubscribe</a> · <a href="${process.env.FRONTEND_URL}/blogs">Visit Blog</a></p>
    </div>
  </div>
</body>
</html>`;
}

//  Welcome email (sent right after subscribing) 
function welcomeTemplate({ email, unsubscribeUrl }) {
  const body = `
    <div class="badge"><span class="badge-dot"></span><span class="badge-txt">Welcome</span></div>
    <h1>You're now subscribed! 🌞</h1>
    <p>
      Thanks for joining the <strong style="color:#f1f5f9">PV Protect Blog</strong> — your go-to source for
      solar O&amp;M strategy, technical insights, and real-world case studies.
    </p>
    <p>
      Whenever we publish a new article, you'll be the first to know.
      We promise to keep it relevant and spam-free.
    </p>
    <div class="divider"></div>
    <p style="margin:0;font-size:13px;color:#64748b">
      Subscribed with: <strong style="color:#94a3b8">${email}</strong>
    </p>
  `;

  return {
    subject: "You're subscribed to PV Protect Blog ✅",
    html: layout(body, unsubscribeUrl),
    text: `Welcome to PV Protect Blog!\n\nYou'll be notified whenever we publish a new article.\n\nUnsubscribe: ${unsubscribeUrl}`,
  };
}

//  New blog notification (sent to all active subscribers) 
function newBlogTemplate({ blog, unsubscribeUrl }) {
  const blogUrl = '/blogs';

  // Pick category accent colour to match the frontend CATEGORY_META
  const ACCENTS = {
    "O&M Strategy":       "#4ade80",
    "Technology":         "#60a5fa",
    "Technical Insights": "#fb923c",
    "Case Study":         "#facc15",
  };
  const accent = ACCENTS[blog.category] || "#94a3b8";

  const body = `
    ${blog.imageUrl ? `<img class="cover" src="${blog.imageUrl}" alt="${blog.title}"/>` : ""}
    <span class="cat-pill" style="background:${accent}18;color:${accent};border-color:${accent}45">${blog.category}</span>
    <h1>${blog.title}</h1>
    ${blog.excerpt ? `<p>${blog.excerpt}</p>` : ""}
    <a class="btn" href="${blogUrl}" style="background:linear-gradient(to right,${accent},${accent}cc)">
      Read Full Article →
    </a>
    <div class="divider"></div>
    <p style="margin:0;font-size:12px;color:#64748b">
      ${blog.author ? `By <strong style="color:#94a3b8">${blog.author}</strong>` : ""}
      ${blog.readTime ? ` &middot; ${blog.readTime}` : ""}
    </p>
  `;

  return {
    subject: `New Post: ${blog.title} | PV Protect`,
    html: layout(body, unsubscribeUrl),
    text: `New article on PV Protect:\n\n${blog.title}\n\n${blog.excerpt || ""}\n\nRead it: ${blogUrl}\n\nUnsubscribe: ${unsubscribeUrl}`,
  };
}

module.exports = { welcomeTemplate, newBlogTemplate };