
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

export interface IntegrationState {
    gmail: boolean;
    linkedin: boolean;
    instagram: boolean;
}
