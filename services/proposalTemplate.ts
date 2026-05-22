
// ── Proposal Data Types ──────────────────────────────────────────────────────

export interface ProposalData {
    clientName: string;
    clientCompany: string;
    projectTitle: string;       // e.g. "AI-Powered Customer Support System"
    projectSubtitle: string;    // e.g. "SALESFORCE CRM & ZENDESK INTEGRATION" (ALL CAPS)
    date: string;               // e.g. "May 2026"
    executiveSummary: string;   // 2-3 sentences
    keyOutcomes: string[];      // 4-6 bullet points
    engagementType: string;     // e.g. "Fixed-Price Development"
    timeline: string;           // e.g. "6 Weeks"
    investment: string;         // e.g. "8,500 AUD – 10,000 AUD"
    problemContext: string;     // 2 sentences about current situation
    challenges: Array<{ title: string; description: string }>;
    objectives: string[];
    solutionOverview: string;
    solutionWorkflow: string[];
    solutionComponents: Array<{ component: string; technology: string; responsibility: string }>;
    phases: Array<{ number: string; title: string; description: string; week: string }>;
    costItems: Array<{ item: string; hours: string; rate: string; cost: string }>;
    totalHours: string;
    totalCost: string;
    futureItems: string[];
    contactName: string;
    contactEmail: string;
    contactPhone: string;
    contactWebsite: string;
}

// ── HTML Builder ─────────────────────────────────────────────────────────────

export const buildProposalHTML = (data: ProposalData, baseUrl = ''): string => {
    const logo_white = `${baseUrl}/logo-white.png`;
    const logo_black = `${baseUrl}/logo-black.png`;
    const mascot     = `${baseUrl}/mascot.png`;

    const toc = [
        { title: 'Executive Summary',        page: '03' },
        { title: 'Problem Statement',         page: '04' },
        { title: 'Proposed Solution',         page: '05' },
        { title: 'System Architecture',       page: '06' },
        { title: 'Project Plan',              page: '07' },
        { title: 'Payment Terms',             page: '09' },
        { title: 'Future Scope',              page: '11' },
        { title: 'Contact',                   page: '12' },
    ];

    const li  = (t: string) => `<li>${t}</li>`;
    const lis = (arr: string[]) => arr.map(li).join('');

    const sectionHead = (label: string, num: string) =>
        `<div class="sh"><span>${label}</span><span class="shn">${num}</span></div>`;

    const tableHead = (...cols: string[]) =>
        `<thead><tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr></thead>`;

    const css = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body{font-family:'DM Sans',sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact;background:#888}
@page{size:A4 portrait;margin:0}

.page{
  width:210mm;min-height:297mm;page-break-after:always;overflow:hidden;
  position:relative;margin:0 auto;
}
@media screen{.page{margin:0 auto 24px;box-shadow:0 4px 32px rgba(0,0,0,.25)}}

/* ── Cover ────────── */
.cover{
  background:#010801;display:flex;flex-direction:column;
  padding:36px 44px 44px;color:#fff;
}
.cover-stars{
  position:absolute;inset:0;
  background:radial-gradient(ellipse 70% 60% at 50% 52%,
    rgba(22,80,22,.95) 0%,rgba(8,30,8,.7) 28%,rgba(1,8,1,0) 65%);
  pointer-events:none;
}
.cover-topline{
  position:absolute;top:28px;left:0;right:140px;height:1.5px;background:#15621B;
}
.cover-header{
  position:relative;display:flex;justify-content:flex-end;margin-bottom:auto;z-index:2;
}
.cover-logo{height:36px;object-fit:contain}
.cover-mascot-wrap{
  position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
  pointer-events:none;
}
.cover-mascot{
  width:240px;object-fit:contain;
  filter:drop-shadow(0 0 60px rgba(0,198,15,.45)) drop-shadow(0 0 120px rgba(0,100,10,.35));
  position:relative;z-index:1;
}
.cover-body{position:relative;z-index:2;margin-top:auto;padding-top:200px}
.cover-subtitle-line{
  font-size:10px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;
  color:rgba(255,255,255,.55);margin-bottom:18px;
}
.cover-title{
  font-size:72px;font-weight:800;line-height:1.0;letter-spacing:-2px;color:#fff;
  margin-bottom:36px;
}
.cover-footer{
  display:flex;justify-content:space-between;align-items:flex-end;
}
.cover-tag{
  font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;
  color:rgba(255,255,255,.5);
}
.cover-nav{display:flex;flex-direction:column;align-items:flex-end;gap:4px}
.arrow-box{
  width:44px;height:44px;background:#15621B;display:flex;align-items:center;
  justify-content:center;font-size:20px;color:#fff;
}
.page-num{
  font-size:11px;font-weight:700;color:#fff;text-decoration:underline;
  text-align:right;
}
.page-num.dark{color:#010801}

/* ── Content page shared ────────── */
.light{
  background:#F5F0E7;padding:0 44px 44px;display:flex;flex-direction:column;
}
.light-topbar{
  height:20px;display:flex;align-items:center;justify-content:space-between;
  padding:0;margin-bottom:0;position:relative;
}
.topbar-line{
  position:absolute;top:50%;left:0;width:calc(100% - 110px);
  height:1.5px;background:#15621B;transform:translateY(-50%);
}
.topbar-logo{
  margin-left:auto;display:flex;align-items:center;gap:6px;padding-top:6px;
  position:relative;z-index:2;
}
.topbar-mascot{width:55px;object-fit:contain;opacity:.9}
.topbar-wordmark{height:20px;object-fit:contain}

.light-heading{
  font-size:58px;font-weight:800;color:#010801;line-height:1.04;
  letter-spacing:-1.5px;margin:56px 0 28px;
}
.light-content{flex:1;overflow:hidden}

/* Section header */
.sh{
  display:flex;justify-content:space-between;align-items:baseline;
  font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;
  color:#010801;padding-bottom:7px;border-bottom:2px solid #15621B;margin-bottom:14px;
}
.shn{font-size:18px;font-weight:400;color:#010801;text-transform:none;letter-spacing:0}

/* Body */
p.b{
  font-size:10.5px;line-height:1.7;color:#1a1a1a;text-align:justify;
  margin-bottom:14px;
}
ul.bl{
  margin:6px 0 14px 18px;font-size:10.5px;line-height:1.75;color:#1a1a1a;
}
ul.bl li{margin-bottom:3px}
strong{font-weight:700}

/* Tables */
table.t{
  width:100%;border-collapse:collapse;margin:12px 0;font-size:10px;
}
table.t thead tr{background:#15621B;color:#fff}
table.t thead th{padding:10px 12px;font-weight:600;text-align:left;font-size:10px}
table.t tbody tr{background:#fff}
table.t tbody tr:nth-child(even){background:#fafafa}
table.t tbody td{
  padding:9px 12px;font-size:10px;color:#1a1a1a;
  vertical-align:top;border-bottom:1px solid #e8e8e8;
}
table.t.bordered tbody td{border:1px solid #d8d8d8}
table.t.bordered tbody td.hl{color:#15621B;font-weight:700}

/* Summary row at bottom of exec summary */
.summary-strip{
  display:grid;grid-template-columns:1fr 1fr 1fr;border:1px solid #ccc;
  margin-top:16px;font-size:10px;
}
.summary-strip .col{
  padding:10px 14px;border-right:1px solid #ccc;
}
.summary-strip .col:last-child{border-right:none}
.summary-strip .col-head{
  background:#15621B;color:#fff;text-align:center;font-weight:600;padding:10px;
  border-right:1px solid rgba(255,255,255,.2);
}
.summary-strip .col-head:last-child{border-right:none}
.summary-strip .col-val{
  text-align:center;padding:10px;font-weight:400;color:#1a1a1a;
}
.summary-strip .col-val.green{color:#15621B;font-weight:700}
.summary-strip .col-val-wrap{border:1px solid #d0d0d0;display:grid;grid-template-columns:1fr 1fr 1fr}

/* Phase boxes */
.phases{display:flex;flex-direction:column;gap:10px;margin-top:4px}
.phase-box{
  border:1.5px solid #15621B;border-radius:8px;padding:11px 14px;
  background:#fff;width:82%;position:relative;
}
.phase-box:nth-child(even){margin-left:auto}
.phase-num{
  position:absolute;top:10px;right:12px;font-size:11px;font-weight:700;color:#010801;
}
.phase-title{font-size:10px;font-weight:700;letter-spacing:.5px;color:#010801;margin-bottom:4px}
.phase-desc{font-size:9px;color:#555;line-height:1.45;margin-bottom:10px}
.phase-week-row{display:flex;align-items:center;gap:8px}
.phase-dot{
  width:8px;height:8px;border-radius:50%;background:#15621B;flex-shrink:0;
}
.phase-week{font-size:9px;color:#15621B;font-weight:600}
.phase-bar{flex:1;height:3px;background:#d0e8d0;border-radius:2px;overflow:hidden}
.phase-bar-fill{height:100%;background:#15621B;width:65%}

/* TOC */
.toc-row{
  display:flex;justify-content:space-between;align-items:center;
  padding:14px 0;border-bottom:1.5px solid #15621B;
  font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#010801;
}
.toc-pn{font-size:18px;font-weight:400;text-transform:none;letter-spacing:0;color:#010801}

/* Footer */
.pfooter{
  position:absolute;bottom:24px;right:20px;
  display:flex;flex-direction:column;align-items:center;gap:5px;
}
.arrow-box-sm{
  width:44px;height:44px;background:#15621B;display:flex;align-items:center;
  justify-content:center;font-size:20px;color:#fff;
}

/* Total row */
.total-strip{
  display:grid;grid-template-columns:1fr 1fr;margin-top:16px;border:1px solid #ccc;
}
.total-strip .th{
  background:#f5f0e7;padding:10px 16px;font-size:10px;font-weight:700;
  text-align:center;border-right:1px solid #ccc;
}
.total-strip .th:last-child{border-right:none}
.total-strip .tv{
  background:#15621B;color:#fff;padding:10px 16px;font-size:11px;font-weight:700;
  text-align:center;border-right:1px solid rgba(255,255,255,.2);
}
.total-strip .tv:last-child{border-right:none}

/* Contact */
.contact-block{
  margin-top:20px;
  background:#fff;border-radius:12px;padding:24px 28px;
  border:1px solid #e0e0e0;
}
.contact-name{font-size:22px;font-weight:800;color:#010801;margin-bottom:6px}
.contact-item{
  font-size:11px;color:#555;line-height:2;
}
.contact-item span{font-weight:600;color:#010801}

/* Print overrides */
@media print{
  html,body{background:white}
  .page{box-shadow:none}
}
`;

    // ── Page helpers ───────────────────────────────────────────────────────────
    const logoArea = () => `
      <div class="topbar-logo">
        <img src="${mascot}" class="topbar-mascot" alt="" />
        <img src="${logo_black}" class="topbar-wordmark" alt="Bokle AI" />
      </div>`;

    const footer = (num: string, dark = true) => `
      <div class="pfooter">
        <div class="arrow-box-sm">→</div>
        <span class="page-num ${dark ? 'dark' : ''}">${num}</span>
      </div>`;

    const lightPage = (heading: string, content: string, pageNum: string) => `
      <div class="page light">
        <div class="light-topbar">
          <div class="topbar-line"></div>
          ${logoArea()}
        </div>
        <h1 class="light-heading">${heading}</h1>
        <div class="light-content">${content}</div>
        ${footer(pageNum)}
      </div>`;

    // ── Page 1: Cover ──────────────────────────────────────────────────────────
    const coverPage = `
      <div class="page cover">
        <div class="cover-stars"></div>
        <div class="cover-topline"></div>
        <div class="cover-header">
          <img src="${logo_white}" class="cover-logo" alt="Bokle AI" />
        </div>
        <div class="cover-mascot-wrap">
          <img src="${mascot}" class="cover-mascot" alt="" />
        </div>
        <div class="cover-body">
          <p class="cover-subtitle-line">${data.date}</p>
          <h1 class="cover-title">${data.projectTitle}</h1>
          <div class="cover-footer">
            <p class="cover-tag">${data.projectSubtitle}</p>
            <div class="cover-nav">
              <div class="arrow-box">→</div>
              <span class="page-num">01</span>
            </div>
          </div>
        </div>
      </div>`;

    // ── Page 2: TOC ────────────────────────────────────────────────────────────
    const tocPage = lightPage(
        'Table of<br>Content',
        `<div>${toc.map(r => `<div class="toc-row"><span>${r.title}</span><span class="toc-pn">${r.page}</span></div>`).join('')}</div>`,
        '02'
    );

    // ── Page 3: Executive Summary ─────────────────────────────────────────────
    const execPage = lightPage(
        'Executive<br>Summary',
        `
        <p class="b">${data.executiveSummary}</p>
        <p class="b">By implementing this solution, every key outcome is delivered with precision:</p>
        <ul class="bl">${lis(data.keyOutcomes)}</ul>
        <div style="margin-top:20px">
          <div class="summary-strip">
            <div class="col-head">Engagement Type</div>
            <div class="col-head">Estimated Timeline</div>
            <div class="col-head">Estimated Investment</div>
          </div>
          <div class="summary-strip" style="border-top:none">
            <div class="col-val">${data.engagementType}</div>
            <div class="col-val">${data.timeline}</div>
            <div class="col-val green">${data.investment}</div>
          </div>
        </div>
        `,
        '03'
    );

    // ── Page 4: Problem Statement ─────────────────────────────────────────────
    const problemPage = lightPage(
        'Problem<br>Statement &amp;<br>Objectives',
        `
        ${sectionHead('Current Challenges', '01')}
        <p class="b">${data.problemContext}</p>
        <ul class="bl">${data.challenges.map(c => `<li><strong>${c.title}:</strong> ${c.description}</li>`).join('')}</ul>
        ${sectionHead('Project Objectives', '02')}
        <p class="b">The primary goal of this project is to introduce a standardised, automated, and scalable solution tailored to ${data.clientCompany}. Key objectives include:</p>
        <ul class="bl">${lis(data.objectives)}</ul>
        `,
        '04'
    );

    // ── Page 5: Proposed Solution ─────────────────────────────────────────────
    const solutionPage1 = lightPage(
        'Proposed<br>Solution',
        `
        <p class="b">${data.solutionOverview}</p>
        ${sectionHead('Workflow Overview', '')}
        <ul class="bl">${lis(data.solutionWorkflow)}</ul>
        ${sectionHead('System Components', '')}
        <table class="t">
          ${tableHead('Component', 'Technology', 'Responsibility')}
          <tbody>${data.solutionComponents.map(c =>
              `<tr><td><strong>${c.component}</strong></td><td>${c.technology}</td><td>${c.responsibility}</td></tr>`
          ).join('')}</tbody>
        </table>
        `,
        '05'
    );

    // ── Page 6: Architecture / Workflow table ─────────────────────────────────
    const solutionPage2 = lightPage(
        'Proposed<br>Solution',
        `
        ${sectionHead('End-to-End Workflow', '')}
        <p class="b">The system follows a multi-phase workflow from initial request through to final delivery and audit:</p>
        <table class="t">
          ${tableHead('#', 'Phase', 'Description')}
          <tbody>${data.phases.slice(0, 6).map((p, i) =>
              `<tr><td>${i + 1}</td><td><strong>${p.title}</strong></td><td>${p.description}</td></tr>`
          ).join('')}</tbody>
        </table>
        `,
        '06'
    );

    // ── Page 7: Project Plan ──────────────────────────────────────────────────
    const projectPlanPage = lightPage(
        'Project Plan &amp;<br>Deliverables',
        `
        <div class="phases">
          ${data.phases.map(p => `
            <div class="phase-box">
              <div class="phase-num">${p.number}</div>
              <div class="phase-title">${p.title}</div>
              <div class="phase-desc">${p.description}</div>
              <div class="phase-week-row">
                <div class="phase-dot"></div>
                <span class="phase-week">${p.week}</span>
                <div class="phase-bar"><div class="phase-bar-fill"></div></div>
              </div>
            </div>`).join('')}
        </div>
        `,
        '07'
    );

    // ── Page 8: Payment Terms – Cost Breakdown ────────────────────────────────
    const paymentPage1 = lightPage(
        'Payment<br>Terms',
        `
        ${sectionHead('Development Cost Breakdown', '')}
        <table class="t">
          ${tableHead('Work Item', 'Est. Hours', 'Rate / hr', 'Cost')}
          <tbody>${data.costItems.map(c =>
              `<tr><td>${c.item}</td><td style="text-align:right">${c.hours}</td><td>${c.rate}</td><td>${c.cost}</td></tr>`
          ).join('')}</tbody>
        </table>
        <div class="total-strip">
          <div class="th">Total Hours</div>
          <div class="th">Total Cost</div>
        </div>
        <div class="total-strip" style="border-top:none">
          <div class="tv">${data.totalHours}</div>
          <div class="tv">${data.totalCost}</div>
        </div>
        `,
        '09'
    );

    // ── Page 9: Payment Terms – Investment Options ────────────────────────────
    const paymentPage2 = lightPage(
        'Payment<br>Terms',
        `
        ${sectionHead('Total Investment Options', '')}
        <table class="t bordered">
          ${tableHead('Option', 'Cost')}
          <tbody>
            <tr><td><strong>Development Only (Client Managed Infra)</strong></td><td class="hl">${data.totalCost}</td></tr>
            <tr><td><strong>Development + Infra Managed by Bokle AI</strong></td><td class="hl">~${data.totalCost.replace(/[\d,]+/, n => Math.round((parseInt(n.replace(/,/g,'')) * 1.12)).toLocaleString())} (Year 1 Estimate)</td></tr>
            <tr><td>Contingency Buffer</td><td>Included</td></tr>
            <tr><td>Initial Setup</td><td>Included</td></tr>
          </tbody>
        </table>
        ${sectionHead('Payment Milestones', '')}
        <table class="t bordered">
          ${tableHead('Milestone', 'Percentage', 'Amount')}
          <tbody>
            <tr><td>Project Kickoff</td><td>50%</td><td class="hl">50% of ${data.totalCost} upon signing</td></tr>
            <tr><td>Mid-Point Delivery</td><td>30%</td><td class="hl">30% upon completion of core features</td></tr>
            <tr><td>Final Sign-off</td><td>20%</td><td class="hl">20% upon final handover</td></tr>
          </tbody>
        </table>
        <p class="b" style="margin-top:12px;text-align:center;font-size:9.5px;color:#666">
          * Infrastructure setup, hosting, and billing can be managed either by the client or by Bokle AI based on preference.
        </p>
        `,
        '10'
    );

    // ── Page 10: Future Scope ─────────────────────────────────────────────────
    const futurePage = lightPage(
        'Future<br>Scope',
        `
        <p class="b">The following enhancements are outside the current project scope but have been identified as high-value additions for ${data.clientCompany}'s long-term roadmap:</p>
        <ul class="bl" style="margin-top:10px">${lis(data.futureItems)}</ul>
        <p class="b" style="margin-top:20px">Bokle AI will provide dedicated support throughout the delivery phase and remains available for ongoing consultation, iterations, and future scope engagements.</p>
        `,
        '11'
    );

    // ── Page 11: Contact ──────────────────────────────────────────────────────
    const contactPage = lightPage(
        'Contact',
        `
        <p class="b">Ready to move forward? Get in touch with us to finalise the agreement and schedule the project kickoff.</p>
        <div class="contact-block">
          <div class="contact-name">${data.contactName}</div>
          <div class="contact-item"><span>Email:</span> ${data.contactEmail}</div>
          <div class="contact-item"><span>Phone:</span> ${data.contactPhone}</div>
          <div class="contact-item"><span>Website:</span> ${data.contactWebsite}</div>
        </div>
        <p class="b" style="margin-top:28px;font-size:10px;color:#666">
          This proposal is valid for 30 days from the date of issue. All pricing is in AUD. Bokle AI reserves the right to revise the scope and pricing if project requirements change materially from those described herein.
        </p>
        `,
        '12'
    );

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${data.projectTitle} — Bokle AI Proposal</title>
<style>${css}</style>
</head>
<body>
${coverPage}
${tocPage}
${execPage}
${problemPage}
${solutionPage1}
${solutionPage2}
${projectPlanPage}
${paymentPage1}
${paymentPage2}
${futurePage}
${contactPage}
</body>
</html>`;
};
