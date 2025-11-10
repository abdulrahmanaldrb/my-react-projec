// services/firebaseService.ts
import { doc, setDoc, getDocs, getDoc, deleteDoc, collection, updateDoc, serverTimestamp, collectionGroup, where, query, runTransaction, orderBy, increment, writeBatch, addDoc, onSnapshot, arrayUnion, arrayRemove, limit, QuerySnapshot, DocumentData } from "firebase/firestore";
import { auth, db } from '../firebaseConfig';
// Fix: Added AdminAnalyticsData to the import from types.ts.
import { Project, ShareData, MarketplaceProject, PendingProject, Review, UserProfileData, Feedback, ReportedReview, ProjectInvitation, PasswordResetRequest, AdminDashboardStats, AdminUser, AdminAnalyticsData, Notification, Announcement, AIConfig, ProjectChatMessage } from '../types';
import { createNewProject } from '../constants';

const getUserId = (): string | null => {
    return auth.currentUser ? auth.currentUser.uid : null;
}
const getUserEmail = (): string | null => {
    return auth.currentUser ? auth.currentUser.email : null;
}

// New function to create a user profile document in Firestore
export const createUserProfile = async (userId: string, email: string, extra?: Partial<UserProfileData>): Promise<void> => {
    const userRef = doc(db, 'users', userId);
    const payload: Partial<UserProfileData> = {
        email,
        // Normalized email for lookups
        // This helps invitations and status checks find Google accounts reliably
        // regardless of case differences.
        emailLower: email.toLowerCase(),
        displayName: extra?.displayName || email.split('@')[0],
        photoURL: extra?.photoURL,
        firstName: extra?.firstName,
        lastName: extra?.lastName,
        phone: extra?.phone,
        address: extra?.address,
        createdAt: serverTimestamp() as any,
        status: 'active',
        isVerified: false,
    };
    await setDoc(userRef, payload, { merge: true });
};

export interface AdminLogEntry {
    id?: string;
    action: string;
    payload: any;
    adminId: string;
    adminEmail: string;
    createdAt: any;
}

export const adminGetLogs = async (max: number = 200): Promise<AdminLogEntry[]> => {
    const q = query(collection(db, 'admin_logs'), orderBy('createdAt', 'desc'), limit(max));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...(d.data() as AdminLogEntry) }));
};

// --- Real-time Collaboration Project Functions ---

// Listen for real-time updates to projects the user is a member of.
export const onProjectsSnapshot = (callback: (projects: Project[]) => void): (() => void) => {
    const userId = getUserId();
    if (!userId) {
        console.warn("User not authenticated for loading projects.");
        callback([]);
        return () => {}; // Return an empty unsubscribe function
    }

    const projectsRef = collection(db, 'projects');
    const q = query(projectsRef, where("memberIds", "array-contains", userId));
    
    const unsubscribe = onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
        const projectList = snapshot.docs.map(doc => doc.data() as Project);
        callback(projectList);
    }, (error) => {
        console.error("Error listening to project snapshots:", error);
    });

    return unsubscribe; // Return the unsubscribe function
};

// A project is now a top-level document, not nested under a user.
export const saveProject = async (project: Project): Promise<void> => {
    const projectRef = doc(db, 'projects', project.id);
    await setDoc(projectRef, project);
};

export const deleteProject = async (projectId: string): Promise<void> => {
    const userId = getUserId();
    if (!userId) throw new Error("User not authenticated for deleting project.");

    // First, check for ownership
    const projectRef = doc(db, 'projects', projectId);
    const projectSnap = await getDoc(projectRef);
    if (!projectSnap.exists() || projectSnap.data().ownerId !== userId) {
        throw new Error("You do not have permission to delete this project.");
    }

    // Delete from marketplace if it exists
    const marketplaceRef = doc(db, 'marketplace_projects', projectId);
    const marketplaceDoc = await getDoc(marketplaceRef);
    if (marketplaceDoc.exists()) {
        await deleteDoc(marketplaceRef);
    }
    
    await deleteDoc(projectRef);
};

export const updateProject = async (projectId: string, updates: Partial<Project>): Promise<void> => {
    const userId = getUserId();
    if (!userId) throw new Error("User not authenticated for updating project.");

    const projectRef = doc(db, 'projects', projectId);
    await updateDoc(projectRef, updates);
    // If cover image was updated in shareData, keep marketplace copy in sync
    const newCover = (updates as any)?.shareData?.coverImage as string | undefined;
    if (newCover) {
        const marketplaceRef = doc(db, 'marketplace_projects', projectId);
        try { await updateDoc(marketplaceRef, { coverImage: newCover }); } catch {}
    }
};

export const sendProjectChatMessage = async (projectId: string, content: string): Promise<void> => {
    const userId = getUserId();
    const userEmail = getUserEmail();
    if (!userId || !userEmail) throw new Error("User not authenticated.");

    const projectRef = doc(db, 'projects', projectId);

    const newMessage: ProjectChatMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        userEmail,
        content,
        timestamp: serverTimestamp(),
    };

    await updateDoc(projectRef, {
        projectChat: arrayUnion(newMessage)
    });
};

// Find a user by their email to get their UID.
export const findUserByEmail = async (email: string): Promise<{ uid: string; email: string } | null> => {
    const usersRef = collection(db, 'users');
    const emailLc = (email || '').toLowerCase();
    // Try normalized field first
    let q1 = query(usersRef, where("emailLower", "==", emailLc), limit(1));
    let snap = await getDocs(q1);
    if (snap.empty) {
        // Fallback to legacy field
        const q2 = query(usersRef, where("email", "==", email), limit(1));
        snap = await getDocs(q2);
    }
    if (snap.empty) return null;
    const userDoc = snap.docs[0];
    return { uid: userDoc.id, email: userDoc.data().email };
};

export const inviteUserToProject = async (project: Project, toUserEmail: string): Promise<string> => {
    const fromUserId = getUserId();
    const fromUserEmail = getUserEmail();
    if (!fromUserId || !fromUserEmail) throw new Error("Current user not authenticated.");
    if (fromUserEmail === toUserEmail) throw new Error("You cannot invite yourself.");

    const invitedUser = await findUserByEmail(toUserEmail);
    if (!invitedUser) throw new Error(`User with email ${toUserEmail} not found.`);

    if (project.memberIds.includes(invitedUser.uid)) throw new Error("This user is already a collaborator.");
    
    const invitation: Omit<ProjectInvitation, 'id'> = {
        projectId: project.id,
        projectName: project.name,
        fromUserId,
        fromUserEmail,
        toUserEmail,
        toUserId: invitedUser.uid,
        status: 'pending',
        createdAt: serverTimestamp(),
    };

    const invitationsRef = collection(db, 'invitations');
    const docRef = await addDoc(invitationsRef, invitation);
    return docRef.id;
};

export const removeCollaborator = async (project: Project, userIdToRemove: string): Promise<void> => {
    const currentUserId = getUserId();
    if (project.ownerId !== currentUserId) throw new Error("Only the project owner can remove collaborators.");
    if (project.ownerId === userIdToRemove) throw new Error("Cannot remove the project owner.");

    const projectRef = doc(db, 'projects', project.id);
    const userToRemoveData = project.collaborators[userIdToRemove];

    // Create a copy of collaborators and delete the key
    const updatedCollaborators = { ...project.collaborators };
    delete updatedCollaborators[userIdToRemove];

    await updateDoc(projectRef, {
        collaborators: updatedCollaborators,
        memberIds: arrayRemove(userIdToRemove)
    });
};

export const onInvitationsSnapshot = (callback: (invitations: ProjectInvitation[]) => void): (() => void) => {
    const userId = getUserId();
    if (!userId) return () => {};

    const invitationsRef = collection(db, 'invitations');
    const q = query(invitationsRef, where("toUserId", "==", userId), where("status", "==", "pending"));
    
    return onSnapshot(q, (snapshot) => {
        const invitationList = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as ProjectInvitation);
        callback(invitationList);
    });
};

export const respondToInvitation = async (invitationId: string, accept: boolean): Promise<void> => {
    const userId = getUserId();
    const userEmail = getUserEmail();
    if (!userId || !userEmail) throw new Error("User not authenticated.");

    const invitationRef = doc(db, 'invitations', invitationId);

    if (accept) {
        await runTransaction(db, async (transaction) => {
            const invitationDoc = await transaction.get(invitationRef);
            if (!invitationDoc.exists()) throw new Error("Invitation not found.");

            const invitationData = invitationDoc.data() as ProjectInvitation;
            const projectRef = doc(db, 'projects', invitationData.projectId);

            // Update project with new collaborator
            transaction.update(projectRef, {
                [`collaborators.${userId}`]: { email: userEmail, role: 'editor' },
                memberIds: arrayUnion(userId)
            });

            // Update invitation status
            transaction.update(invitationRef, { status: 'accepted' });
        });
    } else {
        // Just delete the invitation if declined
        await deleteDoc(invitationRef);
    }
};


// --- Marketplace Functions ---

interface Submission {
    projectId: string;
    projectName: string;
    userId: string;
    userEmail: string;
    category: string;
    description: string;
    submittedAt: any;
}

export const submitProjectForReview = async (project: Project, shareData: Omit<ShareData, 'status' | 'submittedAt'>): Promise<void> => {
    const userId = getUserId();
    if (!userId) throw new Error("User not authenticated.");

    const projectRef = doc(db, 'projects', project.id);
    await updateDoc(projectRef, {
        shareData: { ...project.shareData, ...shareData, status: 'pending', submittedAt: serverTimestamp() }
    });

    const submissionRef = doc(db, 'project_submissions', project.id);
    await setDoc(submissionRef, {
        projectId: project.id,
        projectName: project.name,
        userId: userId,
        userEmail: project.collaborators[userId].email,
        category: shareData.category,
        description: shareData.description,
        submittedAt: serverTimestamp(),
    });
};

export const getMarketplaceProjects = async (): Promise<MarketplaceProject[]> => {
    const marketplaceCol = collection(db, 'marketplace_projects');
    const q = query(marketplaceCol, where("isListed", "==", true));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as MarketplaceProject);
};

// Fix: Updated `cloneMarketplaceProject` to accept and pass the translation function `t` to `createNewProject`.
export const cloneMarketplaceProject = async (projectToClone: MarketplaceProject, options: { includeChat: boolean }, t: (key: string) => string): Promise<void> => {
    const userId = getUserId();
    const userEmail = getUserEmail();
    if (!userId || !userEmail) throw new Error("User not authenticated.");

    // Increment clone counter on original project
    const originalProjectRef = doc(db, 'marketplace_projects', projectToClone.id);
    await updateDoc(originalProjectRef, { cloneCount: increment(1) });

    const newProject = createNewProject(`Copy of ${projectToClone.name}`, userId, userEmail, t);
    newProject.files = projectToClone.files;
    
    if (options.includeChat) {
        newProject.chatHistory = projectToClone.chatHistory;
    }
    
    await saveProject(newProject);
};

export const incrementProjectDownloads = async (projectId: string): Promise<void> => {
    const marketplaceRef = doc(db, 'marketplace_projects', projectId);
    await updateDoc(marketplaceRef, {
        downloads: increment(1)
    });
};

// --- Notification Functions ---
export const createNotification = async (userId: string, type: Notification['type'], message: string, link?: string): Promise<void> => {
    const currentUserId = getUserId();
    // Prevent notifications for user's own actions where it doesn't make sense (e.g., reviewing own project)
    if (userId === currentUserId && (type === 'new_review')) {
        return;
    }

    const notificationsRef = collection(db, 'users', userId, 'notifications');
    await addDoc(notificationsRef, {
        userId,
        type,
        message,
        link: link || '',
        isRead: false,
        createdAt: serverTimestamp(),
    });
};

export const onNotificationsSnapshot = (callback: (notifications: Notification[]) => void): (() => void) => {
    const userId = getUserId();
    if (!userId) {
        callback([]);
        return () => {};
    }
    const notificationsRef = collection(db, 'users', userId, 'notifications');
    const q = query(notificationsRef, orderBy('createdAt', 'desc'), limit(50));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const notificationList = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as Notification);
        callback(notificationList);
    }, (error) => {
        console.error("Error listening to notifications:", error);
    });

    return unsubscribe;
};

export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
    const userId = getUserId();
    if (!userId) return;
    const notificationRef = doc(db, 'users', userId, 'notifications', notificationId);
    await updateDoc(notificationRef, { isRead: true });
};

export const markAllNotificationsAsRead = async (): Promise<void> => {
    const userId = getUserId();
    if (!userId) return;
    const notificationsRef = collection(db, 'users', userId, 'notifications');
    const q = query(notificationsRef, where("isRead", "==", false));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return;
    const batch = writeBatch(db);
    snapshot.docs.forEach(doc => {
        batch.update(doc.ref, { isRead: true });
    });
    await batch.commit();
};


// --- Marketplace Review Functions ---
export const addReview = async (projectId: string, rating: number, comment: string): Promise<void> => {
    const userId = getUserId();
    const userEmail = getUserEmail();
    if (!userId || !userEmail) throw new Error("User not authenticated to add a review.");

    const marketplaceProjectRef = doc(db, 'marketplace_projects', projectId);
    const reviewCollectionRef = collection(marketplaceProjectRef, 'reviews');

    const existingReviewQuery = query(reviewCollectionRef, where("userId", "==", userId));
    const existingReviewSnapshot = await getDocs(existingReviewQuery);
    if (!existingReviewSnapshot.empty) {
        throw new Error("You have already submitted a review for this project.");
    }
    
    let projectData: MarketplaceProject | null = null;
    const newReviewRef = doc(reviewCollectionRef);

    await runTransaction(db, async (transaction) => {
        const projectDoc = await transaction.get(marketplaceProjectRef);
        if (!projectDoc.exists()) throw "Project does not exist!";
        
        projectData = projectDoc.data() as MarketplaceProject;
        const currentReviewCount = projectData.reviewCount || 0;
        const currentTotalRating = (projectData.averageRating || 0) * currentReviewCount;
        const newReviewCount = currentReviewCount + 1;
        const newTotalRating = currentTotalRating + rating;
        const newAverageRating = newTotalRating / newReviewCount;

        const newReview: Review = { id: newReviewRef.id, userId, userEmail, rating, comment, createdAt: serverTimestamp() };
        transaction.set(newReviewRef, newReview);
        transaction.update(marketplaceProjectRef, {
            reviewCount: newReviewCount,
            averageRating: parseFloat(newAverageRating.toFixed(2)),
        });
    });

    if (projectData) {
        // Fix: Explicitly pass undefined for optional 'link' parameter to satisfy strict type checking.
        await createNotification(
            projectData.creatorId,
            'new_review',
            `${userEmail} left a ${rating}-star review on your project "${projectData.name}".`,
            undefined
        );
    }
};

export const deleteReview = async (projectId: string, reviewId: string): Promise<void> => {
    const userId = getUserId();
    if (!userId) throw new Error("User not authenticated.");

    const marketplaceProjectRef = doc(db, 'marketplace_projects', projectId);
    const reviewToDeleteRef = doc(db, 'marketplace_projects', projectId, 'reviews', reviewId);

    await runTransaction(db, async (transaction) => {
        const projectDoc = await transaction.get(marketplaceProjectRef);
        const reviewDoc = await transaction.get(reviewToDeleteRef);

        if (!projectDoc.exists() || !reviewDoc.exists()) throw "Project or review not found.";
        
        const projectData = projectDoc.data();
        const reviewData = reviewDoc.data() as Review;
        
        if (reviewData.userId !== userId) throw "You don't have permission to delete this review.";
        
        const currentReviewCount = projectData.reviewCount || 0;
        const currentTotalRating = (projectData.averageRating || 0) * currentReviewCount;
        const newReviewCount = currentReviewCount - 1;
        const newTotalRating = currentTotalRating - reviewData.rating;
        const newAverageRating = newReviewCount > 0 ? newTotalRating / newReviewCount : 0;
        
        transaction.delete(reviewToDeleteRef);
        transaction.update(marketplaceProjectRef, {
            reviewCount: newReviewCount,
            averageRating: parseFloat(newAverageRating.toFixed(2)),
        });
    });
};

export const getReviewsForProject = async (projectId: string): Promise<Review[]> => {
    const reviewCollectionRef = collection(db, 'marketplace_projects', projectId, 'reviews');
    const q = query(reviewCollectionRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as Review);
};

export const addReviewReply = async (projectId: string, reviewId: string, replyText: string): Promise<void> => {
    const reviewRef = doc(db, 'marketplace_projects', projectId, 'reviews', reviewId);
    const reviewSnap = await getDoc(reviewRef);

    if (reviewSnap.exists()) {
        const reviewData = reviewSnap.data() as Review;
        const projectSnap = await getDoc(doc(db, 'marketplace_projects', projectId));
        const projectName = projectSnap.exists() ? projectSnap.data().name : 'your project';

        await updateDoc(reviewRef, { reply: { text: replyText, createdAt: serverTimestamp() } });
        
        // Fix: Explicitly pass undefined for optional 'link' parameter to satisfy strict type checking.
        await createNotification(
            reviewData.userId,
            'review_reply',
            `The creator of "${projectName}" replied to your review.`,
            undefined
        );
    }
};

export const reportReview = async (project: MarketplaceProject, review: Review): Promise<void> => {
    const reporterId = getUserId();
    const reporterEmail = getUserEmail();
    if (!reporterId || !reporterEmail) throw new Error("User not authenticated.");

    const reviewRef = doc(db, 'marketplace_projects', project.id, 'reviews', review.id);
    const reportCollectionRef = collection(db, 'reported_reviews');
    
    const q = query(reportCollectionRef, where("reviewId", "==", review.id), where("reporterId", "==", reporterId));
    if (!(await getDocs(q)).empty) throw new Error("You have already reported this review.");
    
    const batch = writeBatch(db);
    batch.update(reviewRef, { isReported: true });
    
    const reportDocRef = doc(reportCollectionRef);
    const newReport: ReportedReview = {
        id: reportDocRef.id,
        projectId: project.id,
        projectName: project.name,
        reviewId: review.id,
        reviewContent: review.comment,
        reporterId: reporterId,
        reporterEmail: reporterEmail,
        reportedAt: serverTimestamp(),
    };
    batch.set(reportDocRef, newReport);
    await batch.commit();
};

// --- User Profile Functions ---
export const getUserProfile = async (userId: string): Promise<UserProfileData | null> => {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    return userSnap.exists() ? userSnap.data() as UserProfileData : null;
};

export const getProjectsByCreatorId = async (creatorId: string): Promise<MarketplaceProject[]> => {
    const q = query(collection(db, 'marketplace_projects'), where("creatorId", "==", creatorId), where("isListed", "==", true));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data() as MarketplaceProject);
};

export const updateUserProfile = async (userId: string, profileData: Partial<UserProfileData>): Promise<void> => {
    // Sanitize to remove undefined/null fields to avoid Firestore errors
    const clean: any = {};
    Object.entries(profileData || {}).forEach(([k, v]) => {
        if (v !== undefined && v !== null) clean[k] = v;
    });
    if (clean.email) clean.emailLower = String(clean.email).toLowerCase();
    // Use setDoc with merge so it creates the doc if missing and updates otherwise
    await setDoc(doc(db, 'users', userId), clean, { merge: true });
};

// --- Feedback Function ---
export const submitFeedback = async (type: Feedback['type'], message: string): Promise<void> => {
    const userId = getUserId();
    const userEmail = getUserEmail();
    if (!userId || !userEmail) throw new Error("User not authenticated.");
    await addDoc(collection(db, 'feedback'), { 
        userId, 
        userEmail, 
        type, 
        message, 
        createdAt: serverTimestamp(),
        status: 'new' 
    });
};

// --- AI Config Functions ---
export const getAIConfig = async (): Promise<AIConfig | null> => {
    const configRef = doc(db, 'config', 'gemini');
    const docSnap = await getDoc(configRef);
    return docSnap.exists() ? docSnap.data() as AIConfig : null;
};

// --- Announcement Functions ---
export const getActiveAnnouncements = async (): Promise<Announcement[]> => {
    const q = query(collection(db, 'announcements'), where("isActive", "==", true), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Announcement);
};


// --- Password Reset Chat Functions (for logged-out users) ---
export const requestPasswordResetChat = async (email: string, initialMessage: string): Promise<string> => {
    const userExists = await findUserByEmail(email);
    if (!userExists) {
        throw new Error("No account found with that email address. Please check for typos.");
    }

    const request: Omit<PasswordResetRequest, 'id'> = {
        userEmail: email,
        initialMessage: initialMessage,
        status: 'open',
        createdAt: serverTimestamp(),
        messages: [{
            id: `msg_${Date.now()}`,
            sender: 'user',
            content: initialMessage,
            timestamp: serverTimestamp()
        }]
    };
    const docRef = await addDoc(collection(db, 'password_reset_requests'), request);
    return docRef.id;
};

export const getPasswordResetRequest = async (requestId: string): Promise<PasswordResetRequest | null> => {
    const docRef = doc(db, 'password_reset_requests', requestId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as PasswordResetRequest;
    }
    return null;
};

export const onPasswordResetRequestSnapshot = (
    requestId: string, 
    callback: (data: PasswordResetRequest | null, error?: string) => void
): (() => void) => {
    const docRef = doc(db, 'password_reset_requests', requestId);
    const unsubscribe = onSnapshot(docRef, 
      (docSnap) => {
        if (docSnap.exists()) {
            callback({ id: docSnap.id, ...docSnap.data() } as PasswordResetRequest);
        } else {
            callback(null);
        }
      },
      (error) => {
        console.error("Password reset listener error:", error);
        callback(null, "Connection to the server was lost or access was denied. Please check your network and try again.");
      }
    );
    return unsubscribe;
};


// --- Admin Functions ---
export const adminGetAIConfig = async (): Promise<AIConfig | null> => {
    return getAIConfig(); // Same function, just called from admin context
};

export const adminUpdateAIConfig = async (config: Partial<AIConfig>): Promise<void> => {
    const configRef = doc(db, 'config', 'gemini');
    await setDoc(configRef, config, { merge: true });
};

export const adminGetAnnouncements = async (): Promise<Announcement[]> => {
    const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Announcement);
};

export const adminCreateAnnouncement = async (message: string): Promise<void> => {
    await addDoc(collection(db, 'announcements'), {
        message,
        isActive: true,
        createdAt: serverTimestamp(),
    });
};

export const adminUpdateAnnouncement = async (id: string, updates: Partial<Announcement>): Promise<void> => {
    await updateDoc(doc(db, 'announcements', id), updates);
};

export const adminDeleteAnnouncement = async (id: string): Promise<void> => {
    await deleteDoc(doc(db, 'announcements', id));
};

export const adminGetFeedback = async (): Promise<Feedback[]> => {
    const q = query(collection(db, 'feedback'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Feedback);
};

export const adminUpdateFeedbackStatus = async (feedbackId: string, status: Feedback['status']): Promise<void> => {
    await updateDoc(doc(db, 'feedback', feedbackId), { status });
};


export const checkUserStatusByEmail = async (email: string): Promise<{ status: string } | null> => {
    const usersRef = collection(db, 'users');
    const emailLc = (email || '').toLowerCase();
    let q1 = query(usersRef, where("emailLower", "==", emailLc), limit(1));
    let snap = await getDocs(q1);
    if (snap.empty) {
        const q2 = query(usersRef, where("email", "==", email), limit(1));
        snap = await getDocs(q2);
    }
    if (snap.empty) return null;
    const userDoc = snap.docs[0];
    const userData = userDoc.data() as UserProfileData;
    return { status: userData.status };
};

export const adminGetPasswordResetRequests = async (): Promise<PasswordResetRequest[]> => {
    const q = query(collection(db, 'password_reset_requests'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as PasswordResetRequest);
};

export const adminSendMessageInResetRequest = async (requestId: string, content: string): Promise<void> => {
    const requestRef = doc(db, 'password_reset_requests', requestId);
    const newMessage = {
        id: `msg_${Date.now()}`,
        sender: 'admin',
        content,
        timestamp: serverTimestamp()
    };
    await updateDoc(requestRef, {
        messages: arrayUnion(newMessage)
    });
};

export const adminUpdateResetRequestStatus = async (requestId: string, status: 'open' | 'closed'): Promise<void> => {
    await updateDoc(doc(db, 'password_reset_requests', requestId), { status });
};

export const adminUpdateUserProfile = async (userId: string, updates: Partial<UserProfileData>): Promise<void> => {
    const userRef = doc(db, 'users', userId);
    if (updates.isVerified === true) {
        const userSnap = await getDoc(userRef);
        if (userSnap.exists() && userSnap.data().isVerified !== true) {
             // Fix: Explicitly pass undefined for optional 'link' parameter to satisfy strict type checking.
             await createNotification(
                userId,
                'account_verified',
                'Congratulations! Your account has been verified by an administrator.',
                undefined
            );
        }
    }
    await updateDoc(userRef, updates);
};

// Fix: Add and export adminUpdateUserProject to allow admins to modify user projects.
export const adminUpdateUserProject = async (projectId: string, updates: Partial<Project>): Promise<void> => {
    const projectRef = doc(db, 'projects', projectId);
    await updateDoc(projectRef, updates);
};

export const adminLoadUserProjects = async (userId: string): Promise<Project[]> => {
    if (!userId) return [];
    const projectsRef = collection(db, 'projects');
    const q = query(projectsRef, where("memberIds", "array-contains", userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as Project).sort((a, b) => a.name.localeCompare(b.name));
};

export const getPendingSubmissions = async (): Promise<PendingProject[]> => {
    const submissionsCol = collection(db, 'project_submissions');
    const q = query(submissionsCol);
    const querySnapshot = await getDocs(q);

    const pendingProjectsPromises = querySnapshot.docs.map(async (submissionDoc) => {
        const submissionData = submissionDoc.data() as Submission;
        const projectRef = doc(db, 'projects', submissionData.projectId);
        const projectSnap = await getDoc(projectRef);
        if (projectSnap.exists()) {
            return { ...projectSnap.data() as Project, user: { uid: submissionData.userId, email: submissionData.userEmail } };
        }
        return null;
    });
    return (await Promise.all(pendingProjectsPromises)).filter((p): p is PendingProject => p !== null);
};

export const approveSubmission = async (project: Project): Promise<void> => {
    if (!project.shareData) throw new Error("Project has no share data.");

    const marketplaceRef = doc(db, 'marketplace_projects', project.id);
    const userSnap = await getDoc(doc(db, 'users', project.ownerId));
    const userProfile = userSnap.data() as UserProfileData;
    
    const marketplaceProject: MarketplaceProject = {
        ...project,
        creatorId: project.ownerId,
        creatorEmail: userProfile?.email || 'Unknown',
        approvedAt: serverTimestamp(),
        coverImage: project.shareData?.coverImage,
        reviewCount: 0, 
        averageRating: 0, 
        downloads: 0,
        isFeatured: false,
        isListed: true,
        creatorIsVerified: userProfile?.isVerified || false,
        cloneCount: 0,
    };
    await setDoc(marketplaceRef, marketplaceProject);

    await updateDoc(doc(db, 'projects', project.id), { 'shareData.status': 'approved', 'shareData.reviewedAt': serverTimestamp() });
    await deleteDoc(doc(db, 'project_submissions', project.id));

    // Fix: Explicitly pass undefined for optional 'link' parameter to satisfy strict type checking.
    await createNotification(
        project.ownerId,
        'project_approved',
        `Congratulations! Your project "${project.name}" is now live in the marketplace.`,
        undefined
    );
};

export const rejectSubmission = async (projectId: string): Promise<void> => {
    const projectRef = doc(db, 'projects', projectId);
    const projectSnap = await getDoc(projectRef);
    if (projectSnap.exists()) {
        const projectData = projectSnap.data() as Project;
        await updateDoc(projectRef, { 'shareData.status': 'rejected', 'shareData.reviewedAt': serverTimestamp() });
        await deleteDoc(doc(db, 'project_submissions', projectId));

        // Fix: Explicitly pass undefined for optional 'link' parameter to satisfy strict type checking.
        await createNotification(
            projectData.ownerId,
            'project_rejected',
            `Your project "${projectData.name}" was not approved for the marketplace.`,
            undefined
        );
    }
};

export const getReportedReviews = async (): Promise<ReportedReview[]> => {
    const q = query(collection(db, 'reported_reviews'), orderBy('reportedAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as ReportedReview);
};

export const adminDeleteReview = async (projectId: string, reviewId: string, reportId: string): Promise<void> => {
    const batch = writeBatch(db);
    batch.delete(doc(db, 'marketplace_projects', projectId, 'reviews', reviewId));
    batch.delete(doc(db, 'reported_reviews', reportId));
    await batch.commit();
};

export const adminDismissReport = async (reportId: string, projectId: string, reviewId: string): Promise<void> => {
    const batch = writeBatch(db);
    batch.delete(doc(db, 'reported_reviews', reportId));
    batch.update(doc(db, 'marketplace_projects', projectId, 'reviews', reviewId), { isReported: false });
    await batch.commit();
};

export const getAdminDashboardStats = async (): Promise<AdminDashboardStats> => {
    const usersCol = collection(db, 'users');
    const userSnapshot = await getDocs(usersCol);

    let totalProjects = 0;
    const userListPromises = userSnapshot.docs.map(async (userDoc) => {
        const projectsRef = collection(db, 'projects');
        const q = query(projectsRef, where("ownerId", "==", userDoc.id));
        const projectSnapshot = await getDocs(q);
        const projectCount = projectSnapshot.size;
        totalProjects += projectCount;
        
        const data = userDoc.data() as UserProfileData;
        return {
            uid: userDoc.id,
            email: data.email || 'N/A',
            projectCount: projectCount,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : null,
            status: data.status || 'active',
            isVerified: data.isVerified || false,
        };
    });
    
    const users = await Promise.all(userListPromises);
    return {
        totalUsers: userSnapshot.size,
        totalProjects,
        users: users.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)),
    };
};

export const deleteAllUserData = async (userId: string): Promise<void> => {
    if (!userId) throw new Error("User ID is required.");
    
    const batch = writeBatch(db);

    const projectsRef = collection(db, 'projects');
    const q = query(projectsRef, where("ownerId", "==", userId));
    const projectsSnapshot = await getDocs(q);
    
    projectsSnapshot.docs.forEach((pDoc) => {
        batch.delete(pDoc.ref);
        batch.delete(doc(db, 'marketplace_projects', pDoc.id));
    });
    
    batch.delete(doc(db, 'users', userId));
    await batch.commit();
};

// --- New Admin Analytics and Management Functions ---

export const getAdminAnalyticsData = async (): Promise<AdminAnalyticsData> => {
    const [usersSnapshot, marketplaceSnapshot, reportsSnapshot, resetsSnapshot, sessionsSnapshot] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'marketplace_projects')),
        getDocs(collection(db, 'reported_reviews')),
        getDocs(collection(db, 'password_reset_requests')),
        getDocs(collection(db, 'sessions')),
    ]);

    const users = usersSnapshot.docs.map(doc => doc.data() as UserProfileData);
    const projects = marketplaceSnapshot.docs.map(doc => doc.data() as MarketplaceProject);

    // Process User Growth
    const userGrowthMap = new Map<string, number>();
    users.forEach(user => {
        if (user.createdAt?.toDate) {
            const date = user.createdAt.toDate();
            const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            userGrowthMap.set(month, (userGrowthMap.get(month) || 0) + 1);
        }
    });
    // Ensure last 6 month buckets appear even if zero
    const ensureLastMonths = (map: Map<string, number>, monthsBack: number = 6) => {
        const now = new Date();
        for (let i = monthsBack - 1; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            if (!map.has(key)) map.set(key, 0);
        }
        return map;
    };
    ensureLastMonths(userGrowthMap);
    const userGrowth = Array.from(userGrowthMap.entries()).sort().map(([label, value]) => ({ label, value }));

    // Process Project Growth
    const projectGrowthMap = new Map<string, number>();
    projects.forEach(project => {
        if (project.approvedAt?.toDate) {
            const date = project.approvedAt.toDate();
            const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            projectGrowthMap.set(month, (projectGrowthMap.get(month) || 0) + 1);
        }
    });
    ensureLastMonths(projectGrowthMap);
    const projectGrowth = Array.from(projectGrowthMap.entries()).sort().map(([label, value]) => ({ label, value }));

    // Process Category Distribution
    const categoryMap = new Map<string, number>();
    projects.forEach(project => {
        const category = project.shareData?.category || 'Other';
        categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
    });
    const categoryDistribution = Array.from(categoryMap.entries()).map(([label, value]) => ({ label, value }));

    // Process reported reviews monthly
    const reportsMap = new Map<string, number>();
    reportsSnapshot.docs.forEach(docSnap => {
        const d: any = docSnap.data();
        const ts = d.reportedAt?.toDate && d.reportedAt.toDate();
        if (ts) {
            const key = `${ts.getFullYear()}-${String(ts.getMonth() + 1).padStart(2, '0')}`;
            reportsMap.set(key, (reportsMap.get(key) || 0) + 1);
        }
    });
    ensureLastMonths(reportsMap);
    const reportedReviewsMonthly = Array.from(reportsMap.entries()).sort().map(([label, value]) => ({ label, value }));

    // Process password reset requests monthly
    const resetsMap = new Map<string, number>();
    resetsSnapshot.docs.forEach(docSnap => {
        const d: any = docSnap.data();
        const ts = d.createdAt?.toDate && d.createdAt.toDate();
        if (ts) {
            const key = `${ts.getFullYear()}-${String(ts.getMonth() + 1).padStart(2, '0')}`;
            resetsMap.set(key, (resetsMap.get(key) || 0) + 1);
        }
    });
    ensureLastMonths(resetsMap);
    const resetRequestsMonthly = Array.from(resetsMap.entries()).sort().map(([label, value]) => ({ label, value }));

    // Process Top Projects
    const topRatedProjects = [...projects].sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0)).slice(0, 5).map(p => ({ id: p.id, name: p.name, creatorEmail: p.creatorEmail, value: p.averageRating || 0 }));
    const topDownloadedProjects = [...projects].sort((a, b) => (b.downloads || 0) - (a.downloads || 0)).slice(0, 5).map(p => ({ id: p.id, name: p.name, creatorEmail: p.creatorEmail, value: p.downloads || 0 }));
    const topClonedProjects = [...projects].sort((a, b) => (b.cloneCount || 0) - (a.cloneCount || 0)).slice(0, 5).map(p => ({ id: p.id, name: p.name, creatorEmail: p.creatorEmail, value: p.cloneCount || 0 }));

    // Visitor daily (unique sessions per day)
    const visitorMap = new Map<string, Set<string>>();
    sessionsSnapshot.docs.forEach(d => {
        const data: any = d.data();
        const ts = data.startAt?.toDate && data.startAt.toDate();
        const anon = data.anonId || d.id;
        if (ts) {
            const key = `${ts.getFullYear()}-${String(ts.getMonth() + 1).padStart(2, '0')}-${String(ts.getDate()).padStart(2, '0')}`;
            const set = visitorMap.get(key) || new Set<string>();
            set.add(anon);
            visitorMap.set(key, set);
        }
    });
    // Ensure last 14 days
    const ensureLastDays = (days: number = 14) => {
        const map = new Map<string, number>();
        for (let i = days - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            map.set(key, visitorMap.get(key)?.size || 0);
        }
        return map;
    };
    const visitorDaily = Array.from(ensureLastDays().entries()).map(([label, value]) => ({ label, value }));

    // KPIs summary
    const totalUsers = users.length;
    const totalMarketplace = projects.length;
    const totalDownloads = projects.reduce((sum, p) => sum + (p.downloads || 0), 0);
    const avgRating = projects.length ? (projects.reduce((sum, p) => sum + (p.averageRating || 0), 0) / projects.length) : 0;
    const openResetRequests = resetsSnapshot.docs.filter(d => (d.data() as any).status === 'open').length;
    const reportedCount = reportsSnapshot.size;
    const kpis = [
        { label: 'Total Users', value: totalUsers },
        { label: 'Marketplace Projects', value: totalMarketplace },
        { label: 'Total Downloads', value: totalDownloads },
        { label: 'Avg Rating', value: parseFloat(avgRating.toFixed(2)) },
        { label: 'Open Reset Requests', value: openResetRequests },
        { label: 'Reported Reviews', value: reportedCount },
    ];

    return { kpis, userGrowth, projectGrowth, reportedReviewsMonthly, resetRequestsMonthly, visitorDaily, categoryDistribution, topRatedProjects, topDownloadedProjects, topClonedProjects };
};

export const adminGetMarketplaceProjects = async (): Promise<MarketplaceProject[]> => {
    const snapshot = await getDocs(collection(db, 'marketplace_projects'));
    return snapshot.docs.map(doc => doc.data() as MarketplaceProject);
};

export const adminUpdateMarketplaceProject = async (projectId: string, updates: Partial<MarketplaceProject>): Promise<void> => {
    await updateDoc(doc(db, 'marketplace_projects', projectId), updates);
};

export const adminDeleteMarketplaceProject = async (projectId: string): Promise<void> => {
    await deleteDoc(doc(db, 'marketplace_projects', projectId));
    // Also mark the original project as no longer approved
    await updateDoc(doc(db, 'projects', projectId), { 'shareData.status': 'none' });
};

// --- Admin Audit Logging ---
export const adminLog = async (action: string, payload: any): Promise<void> => {
    try {
        await addDoc(collection(db, 'admin_logs'), {
            action,
            payload,
            adminId: auth.currentUser?.uid || 'unknown',
            adminEmail: auth.currentUser?.email || '',
            createdAt: serverTimestamp(),
        });
    } catch (e) {
        // Non-fatal: do not throw to avoid breaking UX
        console.warn('Failed to write admin log', e);
    }
};