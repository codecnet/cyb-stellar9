export function generateSopHtmlReport(sop) {
  const now = new Date();
  const generationDate = now.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true
  });

  const createdDate = sop.createdAt ? new Date(sop.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : 'N/A';

  const createdByName = sop.created_by?.full_name || sop.created_by?.username || 'Unknown';
  const statusClass = sop.status === 'published' ? 'status-published' : sop.status === 'draft' ? 'status-draft' : 'status-archived';

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(sop.title)} - SOP Report</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            color: #e4e7eb;
            padding: 0;
            line-height: 1.8;
            min-height: 100vh;
        }
        .container { max-width: 210mm; margin: 0 auto; padding: 40px; }
        .header {
            text-align: center;
            border-bottom: 3px solid #3b82f6;
            padding-bottom: 30px;
            margin-bottom: 40px;
            background: linear-gradient(180deg, rgba(59, 130, 246, 0.1) 0%, transparent 100%);
            border-radius: 12px 12px 0 0;
            padding: 40px 20px;
        }
        .logo { font-size: 36px; font-weight: bold; color: #3b82f6; letter-spacing: 2px; margin-bottom: 10px; }
        .logo span { color: #60a5fa; }
        .subtitle { font-size: 14px; color: #94a3b8; text-transform: uppercase; letter-spacing: 3px; margin-bottom: 20px; }
        .sop-title { font-size: 28px; color: #f1f5f9; margin-top: 25px; font-weight: 600; line-height: 1.3; }
        .sop-name { font-size: 16px; color: #94a3b8; margin-top: 12px; font-weight: 500; }
        .status-badge {
            display: inline-block;
            padding: 6px 16px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-top: 15px;
        }
        .status-published { background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; }
        .status-draft { background: linear-gradient(135deg, #d97706 0%, #f59e0b 100%); color: white; }
        .status-archived { background: linear-gradient(135deg, #6b7280 0%, #9ca3af 100%); color: white; }
        .meta-info {
            background: rgba(30, 41, 59, 0.6);
            padding: 25px 30px;
            border-radius: 12px;
            margin-bottom: 35px;
            border: 1px solid rgba(59, 130, 246, 0.2);
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
        }
        .meta-item { color: #cbd5e1; font-size: 14px; }
        .meta-item strong { color: #60a5fa; font-weight: 600; }
        .content-section {
            background: rgba(30, 41, 59, 0.4);
            padding: 35px;
            border-radius: 12px;
            border: 1px solid rgba(51, 65, 85, 0.5);
            margin-bottom: 30px;
        }
        .section-title {
            font-size: 18px;
            color: #3b82f6;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 1px solid rgba(59, 130, 246, 0.3);
            font-weight: 600;
        }
        .content { color: #e2e8f0; font-size: 14px; line-height: 1.9; }
        .content h1 { font-size: 24px; color: #60a5fa; margin: 25px 0 15px 0; }
        .content h2 { font-size: 20px; color: #818cf8; margin: 22px 0 12px 0; }
        .content h3 { font-size: 17px; color: #a5b4fc; margin: 18px 0 10px 0; }
        .content p { margin-bottom: 15px; text-align: justify; }
        .content ul, .content ol { margin: 15px 0 15px 25px; }
        .content li { margin-bottom: 8px; }
        .content strong { color: #f1f5f9; }
        .content blockquote {
            border-left: 4px solid #3b82f6;
            padding: 15px 20px;
            margin: 20px 0;
            background: rgba(59, 130, 246, 0.1);
            border-radius: 0 8px 8px 0;
            font-style: italic;
            color: #94a3b8;
        }
        .footer {
            margin-top: 50px;
            text-align: center;
            color: #64748b;
            font-size: 12px;
            border-top: 1px solid rgba(51, 65, 85, 0.5);
            padding-top: 25px;
        }
        .footer-logo { font-size: 18px; font-weight: bold; color: #475569; margin-bottom: 8px; }
        .confidential {
            display: inline-block;
            background: rgba(239, 68, 68, 0.2);
            color: #f87171;
            padding: 4px 12px;
            border-radius: 4px;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-top: 15px;
            font-weight: 600;
        }
        @page { size: A4; margin: 15mm; }
        @media print {
            body { background: #0f172a !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">STELLAR<span>9</span></div>
            <div class="subtitle">Playbooks & Standard Operating Procedures</div>
            <h1 class="sop-title">${escapeHtml(sop.title)}</h1>
            <p class="sop-name">${escapeHtml(sop.sop_name)}</p>
            <span class="status-badge ${statusClass}">${sop.status}</span>
        </div>
        <div class="meta-info">
            <div class="meta-item"><strong>Created By:</strong> ${escapeHtml(createdByName)}</div>
            <div class="meta-item"><strong>Status:</strong> ${sop.status.charAt(0).toUpperCase() + sop.status.slice(1)}</div>
            <div class="meta-item"><strong>Created On:</strong> ${createdDate}</div>
            <div class="meta-item"><strong>Report Generated:</strong> ${generationDate}</div>
        </div>
        <div class="content-section">
            <h2 class="section-title">Procedure Details</h2>
            <div class="content">${sop.description}</div>
        </div>
        <div class="footer">
            <div class="footer-logo">STELLAR9</div>
            <div>AI-Powered Security Operations Center</div>
            <div>Document ID: ${sop._id}</div>
            <div class="confidential">Confidential Document</div>
        </div>
    </div>
</body>
</html>`;
}

function escapeHtml(text) {
  if (!text) return '';
  const str = String(text);
  const htmlEntities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return str.replace(/[&<>"']/g, char => htmlEntities[char]);
}
