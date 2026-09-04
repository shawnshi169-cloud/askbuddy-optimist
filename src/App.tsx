import React, { Suspense, lazy, useEffect, useState } from "react";
import { HashRouter as Router, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./contexts/AuthContext";
import SwipeBackWrapper from "./components/SwipeBackWrapper";
import BrandSplashScreen from "./components/layout/BrandSplashScreen";
import { isNativeApp } from "./utils/platform";

const queryClient = new QueryClient();
const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ChatDetail = lazy(() => import("./pages/ChatDetail"));
const Discover = lazy(() => import("./pages/Discover"));
const DiscoverInteractions = lazy(() => import("./pages/DiscoverInteractions"));
const CareerDevelopment = lazy(() => import("./pages/CareerDevelopment"));
const EducationLearning = lazy(() => import("./pages/EducationLearning"));
const EducationSearchResults = lazy(() => import("./pages/EducationSearchResults"));
const SearchResults = lazy(() => import("./pages/SearchResults"));
const LifestyleServices = lazy(() => import("./pages/LifestyleServices"));
const HobbiesSkills = lazy(() => import("./pages/HobbiesSkills"));
const CitySelector = lazy(() => import("./pages/CitySelector"));
const QuestionDetail = lazy(() => import("./pages/QuestionDetail"));
const ExpertDetail = lazy(() => import("./pages/ExpertDetail"));
const ExpertProfile = lazy(() => import("./pages/ExpertProfile"));
const PublicPerson = lazy(() => import("./pages/PublicPerson"));
const NewQuestion = lazy(() => import("./pages/NewQuestion"));
const Messages = lazy(() => import("./pages/Messages"));
const Profile = lazy(() => import("./pages/Profile"));
const EditProfile = lazy(() => import("./pages/EditProfile"));
const SkillPublish = lazy(() => import("./pages/SkillPublish"));
const Auth = lazy(() => import("./pages/Auth"));
const TopicDetail = lazy(() => import("./pages/TopicDetail"));
const Notifications = lazy(() => import("./pages/Notifications"));
import { Toaster } from "@/components/ui/toaster";
import "./App.css";

const MyOrders = lazy(() => import("./pages/profile/MyOrders"));
const MyAnswers = lazy(() => import("./pages/profile/MyAnswers"));
const MyFavorites = lazy(() => import("./pages/profile/MyFavorites"));
const MyFollowing = lazy(() => import("./pages/profile/MyFollowing"));
const MyEarnings = lazy(() => import("./pages/profile/MyEarnings"));
const MyCommunity = lazy(() => import("./pages/profile/MyCommunity"));
const CommunityGroupDetail = lazy(() => import("./pages/profile/CommunityGroupDetail"));
const CommunityChat = lazy(() => import("./pages/profile/CommunityChat"));
const MyDrafts = lazy(() => import("./pages/profile/MyDrafts"));
const TalentCertification = lazy(() => import("./pages/profile/TalentCertification"));
const PointsRecharge = lazy(() => import("./pages/profile/PointsRecharge"));
const MyExperiences = lazy(() => import("./pages/profile/MyExperiences"));
const ExperienceEditor = lazy(() => import("./pages/ExperienceEditor"));

const AccountSecurity = lazy(() => import("./pages/settings/AccountSecurity"));
const GeneralSettings = lazy(() => import("./pages/settings/GeneralSettings"));
const NotificationSettings = lazy(() => import("./pages/settings/NotificationSettings"));
const PrivacySettings = lazy(() => import("./pages/settings/PrivacySettings"));
const StorageSpace = lazy(() => import("./pages/settings/StorageSpace"));
const ContentPreferences = lazy(() => import("./pages/settings/ContentPreferences"));
const HelpCenter = lazy(() => import("./pages/settings/HelpCenter"));
const CommunityGuidelines = lazy(() => import("./pages/settings/CommunityGuidelines"));
const ProductFeedback = lazy(() => import("./pages/settings/ProductFeedback"));
const AboutUs = lazy(() => import("./pages/settings/AboutUs"));
const UserResearch = lazy(() => import("./pages/settings/UserResearch"));
const ChangePassword = lazy(() => import("./pages/settings/ChangePassword"));
const PhoneSettings = lazy(() => import("./pages/settings/PhoneSettings"));
const AccountRecovery = lazy(() => import("./pages/settings/AccountRecovery"));
const LoginActivity = lazy(() => import("./pages/settings/LoginActivity"));
const BlacklistSettings = lazy(() => import("./pages/settings/BlacklistSettings"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));

const RouteLoadingFallback = () => (
  <div className="animate-app-fade flex min-h-[100dvh] items-center justify-center bg-slate-50 px-4">
    <div className="surface-card w-full max-w-sm rounded-3xl px-6 py-8 text-center shadow-sm">
      <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-[rgb(205,239,231)] border-t-[rgb(121,213,199)]" />
      <div className="text-base font-semibold text-slate-900">正在加载页面…</div>
      <div className="mt-2 text-sm text-slate-500">首次打开新页面时会稍慢一点。</div>
    </div>
  </div>
);

function App() {
  const [showSplash, setShowSplash] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const key = 'brandSplashShown';
    if (sessionStorage.getItem(key)) return;

    setShowSplash(true);
    const timer = window.setTimeout(() => {
      sessionStorage.setItem(key, '1');
      setShowSplash(false);
    }, 220);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.dataset.nativeApp = isNativeApp() ? 'true' : 'false';
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AuthProvider>
          <SwipeBackWrapper>
          {showSplash ? <BrandSplashScreen /> : null}
          <div className="app-wrapper w-full min-h-[100dvh] bg-muted">
            <div className="app-container" data-swipe-scope="main">
              <Suspense fallback={<RouteLoadingFallback />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/discover" element={<Discover />} />
                <Route path="/discover/interactions" element={<DiscoverInteractions />} />
                <Route path="/career" element={<CareerDevelopment />} />
                <Route path="/education" element={<EducationLearning />} />
                <Route path="/education/search" element={<EducationSearchResults />} />
                <Route path="/search" element={<SearchResults />} />
                <Route path="/lifestyle" element={<LifestyleServices />} />
                <Route path="/hobbies" element={<HobbiesSkills />} />
                <Route path="/city-selector" element={<CitySelector />} />
                <Route path="/question/:id" element={<QuestionDetail />} />
                <Route path="/expert/:id" element={<ExpertDetail />} />
                <Route path="/expert-profile/:id" element={<ExpertProfile />} />
                <Route path="/person/:userId" element={<PublicPerson />} />
                <Route path="/new" element={<NewQuestion />} />
                <Route path="/messages" element={<Messages />} />
                <Route path="/chat/:chatId" element={<ChatDetail />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/edit-profile" element={<EditProfile />} />
                <Route path="/skill-publish" element={<SkillPublish />} />
                <Route path="/experience/new" element={<ExperienceEditor />} />
                <Route path="/experience/:experienceId/edit" element={<ExperienceEditor />} />
                <Route path="/topic/:topicId" element={<TopicDetail />} />
                <Route path="/notifications" element={<Notifications />} />
                
                {/* Profile sub-pages */}
                <Route path="/profile/orders" element={<MyOrders />} />
                <Route path="/profile/answers" element={<MyAnswers />} />
                <Route path="/profile/favorites" element={<MyFavorites />} />
                <Route path="/profile/following" element={<MyFollowing />} />
                <Route path="/profile/earnings" element={<MyEarnings />} />
                <Route path="/profile/community" element={<MyCommunity />} />
                <Route path="/profile/community/:groupId" element={<CommunityChat />} />
                <Route path="/profile/community/:groupId/info" element={<CommunityGroupDetail />} />
                <Route path="/profile/drafts" element={<MyDrafts />} />
                <Route path="/profile/talent-certification" element={<TalentCertification />} />
                <Route path="/profile/recharge" element={<PointsRecharge />} />
                <Route path="/profile/experiences" element={<MyExperiences />} />
                
                {/* Settings sub-pages */}
                <Route path="/settings/account" element={<AccountSecurity />} />
                <Route path="/settings/general" element={<GeneralSettings />} />
                <Route path="/settings/notifications" element={<NotificationSettings />} />
                <Route path="/settings/privacy" element={<PrivacySettings />} />
                <Route path="/settings/storage" element={<StorageSpace />} />
                <Route path="/settings/content-preferences" element={<ContentPreferences />} />
                <Route path="/settings/help" element={<HelpCenter />} />
                <Route path="/settings/guidelines" element={<CommunityGuidelines />} />
                <Route path="/settings/feedback" element={<ProductFeedback />} />
                <Route path="/settings/about" element={<AboutUs />} />
                <Route path="/settings/user-research" element={<UserResearch />} />
                <Route path="/settings/change-password" element={<ChangePassword />} />
                <Route path="/settings/phone" element={<PhoneSettings />} />
                <Route path="/settings/account-recovery" element={<AccountRecovery />} />
                <Route path="/settings/login-activity" element={<LoginActivity />} />
                <Route path="/settings/blacklist" element={<BlacklistSettings />} />
                <Route path="/admin" element={<AdminDashboard />} />
                
                <Route path="*" element={<NotFound />} />
              </Routes>
              </Suspense>
            </div>
          </div>
          <Toaster />
          </SwipeBackWrapper>
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
