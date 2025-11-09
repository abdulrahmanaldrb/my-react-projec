// types.ts

export interface ProjectFile {
  name: string;
  language: string;
  content: string;
}

export interface ResponseMessage {
  plan?: string;
  summary?: string;
  answer?: string;
  suggestions: string[];
  footer?: string;
  rawMarkdown?: string;
}

export interface GeminiResponse {
  files: ProjectFile[];
  responseMessage: ResponseMessage;
  rawMarkdown: string;
}

export interface ChatMessage {
  role: 'user' | 'model' | 'system';
  content: string;
  suggestions?: string[];
  attachedFiles?: ProjectFile[]; // For live streaming UI
}

export interface SharePermissions {
  allowDownload: boolean;
  clonePermission: 'none' | 'files_only' | 'files_and_chat';
}

export interface ShareData {
  status: 'none' | 'pending' | 'approved' | 'rejected';
  permissions: SharePermissions;
  category: string;
  description: string;
  submittedAt?: any; // For Firestore serverTimestamp
  reviewedAt?: any; // For Firestore serverTimestamp
}

export interface ProjectChatMessage {
  id: string;
  userId: string;
  userEmail: string;
  content: string;
  timestamp: any; // Firestore serverTimestamp
}

export interface Project {
  id: string;
  name: string;
  files: ProjectFile[];
  chatHistory: ChatMessage[];
  previewHistory: {
    stack: string[];
    position: number;
  };
  shareData?: ShareData;
  // Collaboration fields
  ownerId: string;
  collaborators: { [userId: string]: { email: string, role: 'owner' | 'editor' } };
  memberIds: string[];
  projectChat?: ProjectChatMessage[];
}

// Fix: Add and export UserCredentials interface to resolve missing type errors.
export interface UserCredentials {
  email: string;
  uid: string; // Add UID to the user object
}

// Add a new Review type for the marketplace.
export interface Review {
  id: string;
  userId: string;
  userEmail: string;
  rating: number; // 1-5
  comment: string;
  createdAt: any; // Firestore serverTimestamp
  reply?: {
    text: string;
    createdAt: any; // Firestore serverTimestamp
  };
  isReported?: boolean;
}

// Add a new type for the user profile page.
export interface UserProfileData {
  email: string;
  createdAt: any; // Firestore serverTimestamp
  displayName?: string;
  bio?: string;
  skills?: string[];
  website?: string;
  github?: string;
  // Add status and verification fields for admin management.
  status: 'active' | 'suspended' | 'banned';
  isVerified?: boolean;
}

// Marketplace project type (denormalized for performance)
export interface MarketplaceProject extends Project {
  creatorId: string;
  creatorEmail: string;
  approvedAt: any;
  // Add rating fields for marketplace display.
  averageRating?: number;
  reviewCount?: number;
  // Add a downloads counter
  downloads?: number;
  // Add admin management and analytics fields.
  isFeatured?: boolean;
  isListed?: boolean;
  creatorIsVerified?: boolean;
  cloneCount?: number;
}

// Fix: Add and export PendingProject interface to resolve missing type error.
export interface PendingProject extends Project {
  user: {
    uid: string;
    email: string;
  };
}

// Add types for feedback and reporting
export interface Feedback {
    id: string;
    userId: string;
    userEmail: string;
    type: 'Bug Report' | 'Feature Request' | 'General Feedback';
    message: string;
    createdAt: any;
    status: 'new' | 'in_progress' | 'resolved';
}

export interface ReportedReview {
    id: string; // ID of the report document itself
    projectId: string;
    projectName: string;
    reviewId: string;
    reviewContent: string;
    reporterId: string;
    reporterEmail: string;
    reportedAt: any;
}

// Type for project invitations
export interface ProjectInvitation {
  id: string; // Document ID
  projectId: string;
  projectName: string;
  fromUserId: string;
  fromUserEmail: string;
  toUserEmail: string; // The invited user's email
  toUserId?: string; // The invited user's ID, if they exist
  status: 'pending' | 'accepted' | 'declined';
  createdAt: any; // Firestore serverTimestamp
}

// A comprehensive notification type
export interface Notification {
  id: string;
  userId: string; // The user who receives the notification
  type: 'new_review' | 'project_approved' | 'project_rejected' | 'review_reply' | 'account_verified';
  message: string;
  link?: string; // e.g., /marketplace/project/{id}
  isRead: boolean;
  createdAt: any; // Firestore serverTimestamp
}

// Add type for Announcements
export interface Announcement {
  id: string;
  message: string;
  isActive: boolean;
  createdAt: any;
}

// Add type for AI configuration
export interface AIConfig {
  systemPrompt: string;
}

// Add types for the new password reset chat feature
export interface PasswordResetMessage {
  id: string;
  sender: 'user' | 'admin';
  content: string;
  timestamp: any; // Firestore serverTimestamp
}

export interface PasswordResetRequest {
  id: string;
  userEmail: string;
  status: 'open' | 'closed';
  createdAt: any; // Firestore serverTimestamp
  initialMessage: string;
  messages?: PasswordResetMessage[]; // Keeping it simple: storing messages in an array within the doc
}

// Renamed UserStats to AdminUser to reflect added details
export interface AdminUser {
  uid: string;
  email: string;
  projectCount: number;
  createdAt: Date | null;
  status: 'active' | 'suspended' | 'banned';
  isVerified: boolean;
}

export interface AdminDashboardStats {
  totalUsers: number;
  totalProjects: number;
  users: AdminUser[];
}

// Add types for the new Admin Analytics Dashboard
export interface ChartDataPoint {
  label: string;
  value: number;
}

export interface TopProjectInfo {
  id: string;
  name: string;
  value: number;
  creatorEmail: string;
}

export interface AdminAnalyticsData {
  userGrowth: ChartDataPoint[];
  projectGrowth: ChartDataPoint[];
  categoryDistribution: ChartDataPoint[];
  topRatedProjects: TopProjectInfo[];
  topDownloadedProjects: TopProjectInfo[];
  topClonedProjects: TopProjectInfo[];
}