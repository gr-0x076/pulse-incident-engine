import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, HRFlowable
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_number(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_page_number(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#737985"))
        # Header (pages > 1)
        if self._pageNumber > 1:
            self.drawString(54, 755, "PULSE — Incident Operations Control Plane · Demo Video Script")
            self.setStrokeColor(colors.HexColor("#E2E8F0"))
            self.setLineWidth(0.5)
            self.line(54, 748, 558, 748)
        # Footer
        self.setStrokeColor(colors.HexColor("#E2E8F0"))
        self.setLineWidth(0.5)
        self.line(54, 45, 558, 45)
        self.drawString(54, 32, "MERN 2029 Batch End-Term Software Project Submission")
        page_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(558, 32, page_text)
        self.restoreState()

def build_pdf():
    pdf_path = "/home/mohith/Projects/endterm_mern/Pulse_Demo_Video_Script.pdf"
    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()
    
    # Custom styles
    primary_color = colors.HexColor("#0F172A")
    accent_gold = colors.HexColor("#B48A45")
    dark_gray = colors.HexColor("#334155")
    card_bg = colors.HexColor("#F8FAFC")
    border_color = colors.HexColor("#CBD5E1")
    
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=primary_color,
        spaceAfter=4
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11,
        leading=15,
        textColor=accent_gold,
        spaceAfter=14
    )
    
    section_heading = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=16,
        textColor=primary_color,
        spaceBefore=12,
        spaceAfter=6
    )

    scene_title = ParagraphStyle(
        'SceneTitle',
        parent=styles['Heading3'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=14,
        textColor=colors.HexColor("#1E293B"),
        spaceBefore=8,
        spaceAfter=4
    )

    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=dark_gray,
        spaceAfter=5
    )

    dialogue_style = ParagraphStyle(
        'DialogueText',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#1E3A8A"),
        spaceAfter=3
    )

    table_header = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.white
    )

    table_cell = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=dark_gray
    )

    story = []

    # Title & Metadata
    story.append(Paragraph("PULSE — Full-Stack Incident Control Plane", title_style))
    story.append(Paragraph("End-Term MERN Capstone Project · Comprehensive Video Demonstration Script & Voiceover Guide", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=accent_gold, spaceBefore=0, spaceAfter=12))

    # Executive Summary Card
    summary_data = [
        [
            Paragraph("<b>Target Video Duration:</b> 5 – 7 Minutes", table_cell),
            Paragraph("<b>Stack:</b> React 18, Node.js, Express, MongoDB, Socket.io, Docker", table_cell),
        ],
        [
            Paragraph("<b>Primary Personas Shown:</b> Sarah Chen (Admin) & Alex Rivera (Commander)", table_cell),
            Paragraph("<b>Dual Execution:</b> Verified in Docker & Standalone Preview Sandbox", table_cell),
        ]
    ]
    t = Table(summary_data, colWidths=[250, 254])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), card_bg),
        ('BOX', (0,0), (-1,-1), 0.5, border_color),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('PADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t)
    story.append(Spacer(1, 10))

    story.append(Paragraph("Script Outline & Scene-by-Scene Breakdown", section_heading))

    scenes = [
        {
            "num": "1",
            "timing": "0:00 – 0:45 (45s)",
            "title": "Introduction, Problem Statement & Architecture",
            "visual": "Show Slide/Title Card: Pulse Incident Control Plane. Cut to live login page with Obsidian/Champagne design.",
            "narration": "Hello evaluators, welcome to Pulse — a mission-critical incident operations control plane engineered to replace chaotic, unstructured Slack threads with deterministic state-machine governance, live SLA tracking, and automated interactive SOP runbooks. During critical production outages, seconds matter. Pulse provides an authoritative source of truth for on-call engineers, incident commanders, and executives.",
            "actions": "Hover over product insignia, display the 3 core pillars (24/7 SLA Sentinel, Real-time Event Bus, and OCC Guarded States)."
        },
        {
            "num": "2",
            "timing": "0:45 – 1:30 (45s)",
            "title": "Authentication, RBAC Personas & Grading Convenience",
            "visual": "Login gate with email and password inputs, highlighting the 1-click Demo Credentials helper.",
            "narration": "Security and RBAC are fundamental. Pulse enforces 4 distinct roles: Administrator, Incident Commander, Responder, and Viewer. Notice that there are zero hardcoded auto-logins; every user must explicitly authenticate. For evaluation convenience, we provide 1-click credential autofill pills. Let's select Administrator Sarah Chen and sign in to Mission Control.",
            "actions": "Click 'Admin (admin@acme.dev)' autofill pill. Click 'Sign In to Console'. Observe smooth transition into the Mission Control Dashboard."
        },
        {
            "num": "3",
            "timing": "1:30 – 2:30 (60s)",
            "title": "Mission Control Dashboard & Real-Time Telemetry",
            "visual": "Dashboard showing MTTA/MTTR KPI cards, production service topology, live SLA countdowns, and incident queue.",
            "narration": "Here in Mission Control, responders immediately see system posture. At the top, executive metrics track Mean Time to Acknowledge (14s), Mean Time to Restore, and SLA compliance. The topology map monitors API Gateway, Auth Cluster, Payment Engine, Postgres Primary, and Kubernetes Workers. Below is our prioritized incident queue, dynamically color-coded by severity (P1 to P4) with live pulsing SLA timers.",
            "actions": "Hover over KPI cards with sparklines. Filter the feed by 'P1 Critical', then search for 'Gateway'. Demonstrate instantaneous filtering."
        },
        {
            "num": "4",
            "timing": "2:30 – 3:30 (60s)",
            "title": "Declaring an Outage & Automated SOP Runbook Matching",
            "visual": "Click 'Declare incident'. Modal opens with title, severity, and intelligent runbook preview.",
            "narration": "Let's simulate a live outage. An engineer declares a P1 incident: 'API Gateway returning 503 — Elevated 5xx Rate'. Watch closely: as I type, Pulse's automated keyword matching heuristic immediately analyzes the title and pre-selects the 'API Gateway 5xx Spike Playbook' with 6 prescriptive SOP steps. Let's declare this incident.",
            "actions": "Type title: 'API Gateway returning 503 — 5xx rate at 12%', select P1. Notice the playbook preview indicator. Click 'Declare Incident'. Toast notification confirms INC-00009 declaration."
        },
        {
            "num": "5",
            "timing": "3:30 – 4:45 (75s)",
            "title": "Incident War Room & Interactive Terminal SOP Execution",
            "visual": "Incident Detail Page for INC-00001: horizontal pipeline bar, live SLA countdown timer (~14m remaining), interactive runbook console, and audit timeline.",
            "narration": "We enter the incident War Room for INC-00001. At the top is our guarded finite state machine: FIRED, ACKNOWLEDGED, INVESTIGATING, MITIGATED, RESOLVED, and CLOSED. Notice the live SLA countdown timer tracking our 15-minute acknowledgment window. Below is the automated SOP playbook attached via keyword heuristic. Rather than reading stale static wikis, responders run verified CLI commands. Let's click 'Run & Verify' on Step 1: Check Grafana Dashboard.",
            "actions": "Click 'Run & Verify' on Step 1. Watch terminal output simulate live diagnostic probe with HTTP 200 OK. Step automatically marks COMPLETED with verification output recorded in the timeline."
        },
        {
            "num": "6",
            "timing": "4:45 – 5:45 (60s)",
            "title": "Optimistic Concurrency Control (OCC) & Guarded State Transitions",
            "visual": "State Lifecycle Controls card showing transition buttons (Transition → ACKNOWLEDGED, Transition → MITIGATED, Transition → RESOLVED), then modal inputs.",
            "narration": "Now let's advance the incident through its guarded lifecycle. Under State Lifecycle Controls, we click 'Transition → ACKNOWLEDGED'. Instantly, notice that the live SLA countdown timer halts with a green checkmark! Next, Pulse allows moving to INVESTIGATING or directly to MITIGATED. Let's click 'Transition → MITIGATED'. The Transition Gate modal opens, enforcing our OCC version guard and requiring a containment summary. We enter our tactical action: 'Rerouted edge ingress traffic to auxiliary cluster'. Submitting commits the state to MITIGATED. Finally, clicking 'Transition → RESOLVED' prompts for root cause taxonomy (INFRA) and explanation. The incident resolves, and notice the prompt appears: 'Author Postmortem to Unlock Closure', proving that incidents cannot be CLOSED without an attached published postmortem.",
            "actions": "1. Click 'Transition → ACKNOWLEDGED'. Note SLA timer stops. 2. Click 'Transition → MITIGATED'. In modal, enter mitigation summary and click Confirm. Status updates to MITIGATED. 3. Click 'Transition → RESOLVED', select Category 'INFRA', enter description, and submit. Status updates to RESOLVED. Highlight 'Author Postmortem to Unlock Closure →' badge."
        },
        {
            "num": "7",
            "timing": "5:45 – 6:30 (45s)",
            "title": "Blameless Postmortems & Action Item Tracking",
            "visual": "Navigate to Postmortems tab. Show published postmortem for Incident #8.",
            "narration": "When outages resolve, learning begins. Pulse features integrated blameless postmortems. Here is our published postmortem for Incident 8 with 5-Whys root cause analysis, impacted services, and assigned engineering action items with due dates. Commanders can export postmortems or track open remediation tasks.",
            "actions": "Expand postmortem details. Toggle an action item checkbox to show real-time progress update."
        },
        {
            "num": "8",
            "timing": "6:30 – 7:15 (45s)",
            "title": "Analytics Overview, Reticle Verification & Closing",
            "visual": "Navigate to Analytics tab showing MTTA/MTTR distributions, severity breakdown charts, and responder workload.",
            "narration": "Finally, the Analytics cockpit provides executive visibility into 14-day outage volume, MTTR trends, and responder workload balance. Pulse has been thoroughly tested both under full-stack Docker Compose and in standalone hosted preview mode with complete client-side sandbox fallback. Our login workflows have been verified with Reticle in-app verification. Thank you for evaluating Pulse!",
            "actions": "Show charts and responder distribution table. Show GitHub repo and Docker compose cleanliness."
        }
    ]

    for s in scenes:
        header_text = f"<b>Scene {s['num']} [{s['timing']}]: {s['title']}</b>"
        story.append(Paragraph(header_text, scene_title))
        
        scene_content = [
            [Paragraph("<b>Visual / On-Screen:</b>", table_cell), Paragraph(s['visual'], table_cell)],
            [Paragraph("<b>Voiceover Narration:</b>", table_cell), Paragraph(f'"{s["narration"]}"', dialogue_style)],
            [Paragraph("<b>Key Actions to Perform:</b>", table_cell), Paragraph(s['actions'], table_cell)],
        ]
        sc_table = Table(scene_content, colWidths=[120, 384])
        sc_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (0,-1), card_bg),
            ('BOX', (0,0), (-1,-1), 0.5, border_color),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('PADDING', (0,0), (-1,-1), 5),
        ]))
        story.append(sc_table)
        story.append(Spacer(1, 8))

    doc.build(story, canvasmaker=NumberedCanvas)
    print("PDF build complete:", pdf_path)

if __name__ == '__main__':
    build_pdf()
