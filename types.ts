
export enum ClientStage {
    FIRST_CALL = "First Discovery Call",
    FOLLOW_UP = "Follow Up / Demo",
    PROPOSAL = "Proposal / Pricing",
    CLOSING = "Closing / Negotiation"
}
  
export enum ServiceCategory {
    SALES_MARKETING = "Sales & Marketing AI",
    RETAIL_ECOMMERCE = "Retail & E-Commerce AI",
    CUSTOM_DEV = "Custom Agent Development"
}
  
export interface ChatMessage {
    role: 'user' | 'model';
    content: string;
}

export interface AssistantState {
    isLoading: boolean;
    error: string | null;
    result: string | null;
}

export type DealStatus = 'Lead' | 'Discovery' | 'Proposal' | 'Negotiation' | 'Closed Won';
export type ProjectStatus = 'Backlog' | 'In Progress' | 'Review' | 'Deployed';
export type MarketingStatus = 'Idea' | 'Scripting' | 'Design' | 'Review' | 'Scheduled' | 'Published';

export interface Deal {
    id: string;
    clientName: string;
    value: string;
    service: string;
    status: DealStatus;
    lastContact: string;
    // Context fields for Automation
    industry?: string;
    problemStatement?: string;
    notes?: string;
}

export interface Project {
    id: string;
    clientName: string;
    featureSummary: string;
    deadline: string;
    status: ProjectStatus;
}

export interface MarketingTask {
    id: string;
    title: string;
    contentType: 'Post' | 'Reel' | 'Carousel';
    platform: 'Instagram' | 'LinkedIn';
    status: MarketingStatus;
    dueDate: string;
}

export interface DealArtifact {
    id: string;
    dealId: string;
    stage: string; // e.g. 'Lead', 'Discovery'
    title: string; // e.g. 'Sales Script', 'BRD'
    content: string; // Markdown content
    lastUpdated: string;
}

export interface OutreachLead {
    id: string;
    name: string;
    company: string;
    role: string;
    email?: string;
    phone?: string;
    website?: string;
    status: 'New' | 'Generated' | 'Contacted';
    painPoint?: string; // Inferred or Manual
    generatedSequence?: string;
    createdAt: string;
    lastContact?: string;
    source?: 'form' | 'manual' | 'csv'; // Track origin
}

export interface IntegrationState {
    gmail: boolean;
    linkedin: boolean;
    instagram: boolean;
}

export interface CalendlyConfig {
    token: string;
    userUri: string;
    userName: string;
    schedulingUrl: string;
}

// ── Module D: Client Delivery Timeline ──────────────────────────────────────

export type MilestoneStatus = 'upcoming' | 'completed' | 'overdue';
export type TimelineTemplate = '6-week' | '12-week' | 'custom';

export interface ChecklistItem {
    item: string;
    done: boolean;
}

export interface Milestone {
    id: string;
    timelineId: string;
    title: string;
    weekNumber: number;
    dueDate: string;
    status: MilestoneStatus;
    owner?: string;
    notes?: string;
    checklist?: ChecklistItem[];
}

export interface DeliveryTimeline {
    id: string;
    dealId?: string;
    clientName: string;
    templateType: TimelineTemplate;
    totalWeeks: number;
    startDate: string;
    status: 'active' | 'completed' | 'paused';
    standupLink?: string;
    createdAt: string;
}

// ── Module E: Proposal Templates ────────────────────────────────────────────

export interface ProposalTemplate {
    id: string;
    name: string;
    category: string;
    htmlContent: string;
    createdAt: string;
}
