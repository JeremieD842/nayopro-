import { useCallback, useEffect, useState } from 'react';
import { CompaniesView } from './components/CompaniesView.tsx';
import { ContactView } from './components/ContactView.tsx';
import { ExpertDetailModal } from './components/ExpertDetailModal.tsx';
import { ExpertsView } from './components/ExpertsView.tsx';
import { HomeView } from './components/HomeView.tsx';
import { JobsView } from './components/JobsView.tsx';
import { MarketView } from './components/MarketView.tsx';
import { BottomNav, Footer, TopBar, type MainTab } from './components/NavigationShell.tsx';
import { OrdersView } from './components/OrdersView.tsx';
import { ProfileAuthView } from './components/ProfileAuthView.tsx';
import { SubscriptionPage } from './components/SubscriptionPage.tsx';
import { INITIAL_SUBSCRIPTION_CONFIG } from './data/kinshasaData.ts';
import { api, setAuthToken } from './lib/api.ts';
import { CurrencyProvider, DEFAULT_EXCHANGE_RATES } from './lib/currency.tsx';
import type {
  BillboardAd,
  DepartmentItem,
  ExchangeRates,
  ExpertProfile,
  JobOffer,
  MaterialItem,
  Review,
  SubscriptionConfig,
  UserAccount,
} from './types.ts';

export default function App() {
  const [activeTab, setActiveTab] = useState<MainTab>('home');
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [providers, setProviders] = useState<ExpertProfile[]>([]);
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [jobs, setJobs] = useState<JobOffer[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [billboardAds, setBillboardAds] = useState<BillboardAd[]>([]);
  const [subscriptionConfig, setSubscriptionConfig] = useState<SubscriptionConfig>(INITIAL_SUBSCRIPTION_CONFIG);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>(DEFAULT_EXCHANGE_RATES);
  const [loadingBootstrap, setLoadingBootstrap] = useState(true);

  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [currentProvider, setCurrentProvider] = useState<ExpertProfile | null>(null);
  const [authInitialMode, setAuthInitialMode] = useState<'login' | 'client' | 'expert' | 'seller' | 'company' | 'admin'>('client');

  const [marketQuery, setMarketQuery] = useState('');
  const [expertQuery, setExpertQuery] = useState('');
  const [expertDeptId, setExpertDeptId] = useState('all');
  const [selectedExpert, setSelectedExpert] = useState<ExpertProfile | null>(null);
  const [selectedJob, setSelectedJob] = useState<JobOffer | null>(null);

  const fetchBootstrap = useCallback(async () => {
    try {
      const data = await api.getBootstrap();
      setDepartments(data.departments);
      setProviders(data.providers);
      setMaterials(data.materials);
      setJobs(data.jobs);
      setReviews(data.reviews);
      setBillboardAds(data.billboardAds || []);
      setSubscriptionConfig(data.subscriptionConfig);
      if (data.exchangeRates) setExchangeRates(data.exchangeRates);
    } catch (err) {
      console.error('Erreur chargement NAYOpro:', err);
    } finally {
      setLoadingBootstrap(false);
    }
  }, []);

  useEffect(() => {
    void fetchBootstrap();
  }, [fetchBootstrap]);

  const navigateTo = (tab: MainTab) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectExpert = (expert: ExpertProfile) => {
    setSelectedExpert(expert);
    api
      .trackProviderView(expert.id)
      .then((res) => {
        setProviders((prev) => prev.map((p) => (p.id === expert.id ? { ...p, viewsCount: res.viewsCount } : p)));
      })
      .catch(() => {});
  };

  const handleOrderMaterial = (material: MaterialItem) => {
    api
      .createMaterialOrder({
        materialId: material.id,
        quantity: 1,
        commune: currentUser?.commune || material.commune,
      })
      .catch(() => {});
  };

  const handleAuthenticated = (
    token: string,
    user: UserAccount,
    provider: ExpertProfile | null,
    goSubscription = false
  ) => {
    setAuthToken(token);
    setCurrentUser(user);
    setCurrentProvider(provider);
    if (goSubscription && (user.role === 'PRESTATAIRE' || user.role === 'ENTREPRISE')) {
      navigateTo('subscription');
    } else {
      navigateTo('profile');
    }
    void fetchBootstrap();
  };

  const handleLogout = () => {
    setAuthToken(null);
    setCurrentUser(null);
    setCurrentProvider(null);
    navigateTo('home');
  };

  // Séparation stricte des blocs : Experts vs Entreprises
  const activeExperts = providers.filter((p) => p.accountCategory === 'EXPERT');
  const activeCompanies = providers.filter((p) => p.accountCategory === 'ENTREPRISE');

  return (
    <CurrencyProvider rates={exchangeRates}>
      <div className="min-h-screen flex flex-col bg-[#F5F7FB] text-slate-900">
        <TopBar activeTab={activeTab} onNavigate={navigateTo} currentUser={currentUser} />

      <main className="flex-1">
        {loadingBootstrap && providers.length === 0 ? (
          <div className="max-w-7xl mx-auto px-4 py-12 text-sm text-slate-500">
            Chargement de NAYOpro Kinshasa...
          </div>
        ) : (
          <>
            {activeTab === 'home' && (
              <HomeView
                departments={departments}
                experts={activeExperts}
                companies={activeCompanies}
                materials={materials}
                jobs={jobs}
                billboardAds={billboardAds}
                onSearchSubmit={(q, target, deptId) => {
                  if (target === 'market') {
                    setMarketQuery(q);
                    navigateTo('market');
                  } else if (target === 'jobs') {
                    setSelectedJob(null);
                    navigateTo('jobs');
                  } else {
                    setExpertQuery(q);
                    setExpertDeptId(deptId || 'all');
                    navigateTo('experts');
                  }
                }}
                onNavigateBlock={(block) => {
                  if (block === 'market') setMarketQuery('');
                  if (block === 'experts') {
                    setExpertQuery('');
                    setExpertDeptId('all');
                  }
                  if (block === 'jobs') setSelectedJob(null);
                  navigateTo(block);
                }}
                onStartExpertMode={() => {
                  setAuthInitialMode('expert');
                  navigateTo('profile');
                }}
                onSelectExpert={handleSelectExpert}
                onOrderMaterial={handleOrderMaterial}
                onOpenJob={(job) => {
                  setSelectedJob(job);
                  navigateTo('jobs');
                }}
              />
            )}

            {activeTab === 'market' && (
              <MarketView
                materials={materials}
                initialQuery={marketQuery}
                onOrderMaterial={handleOrderMaterial}
                onBecomeSeller={() => {
                  setAuthInitialMode('seller');
                  navigateTo('profile');
                }}
              />
            )}

            {activeTab === 'experts' && (
              <ExpertsView
                departments={departments}
                experts={activeExperts}
                initialQuery={expertQuery}
                initialDepartmentId={expertDeptId}
                onSelectExpert={handleSelectExpert}
                onBecomeExpert={() => {
                  setAuthInitialMode('expert');
                  navigateTo('profile');
                }}
              />
            )}

            {activeTab === 'companies' && (
              <CompaniesView
                companies={activeCompanies}
                onSelectCompany={handleSelectExpert}
                onOpenMarket={() => navigateTo('market')}
                onOpenJobs={() => {
                  setSelectedJob(null);
                  navigateTo('jobs');
                }}
                onBecomeCompany={() => {
                  setAuthInitialMode('company');
                  navigateTo('profile');
                }}
              />
            )}

            {activeTab === 'jobs' && (
              <JobsView
                jobs={jobs}
                initialSelectedJob={selectedJob}
                currentUser={currentUser}
                currentProvider={currentProvider}
                onGoToSubscription={() => navigateTo('subscription')}
                onGoToProfile={() => {
                  setAuthInitialMode('company');
                  navigateTo('profile');
                }}
                onJobSubmitted={() => void fetchBootstrap()}
              />
            )}

            {activeTab === 'orders' && (
              <OrdersView
                currentUser={currentUser}
                onRequireAuth={() => {
                  setAuthInitialMode('client');
                  navigateTo('profile');
                }}
                onOpenSearch={() => navigateTo('experts')}
              />
            )}

            {activeTab === 'profile' && (
              <ProfileAuthView
                departments={departments}
                currentUser={currentUser}
                initialAuthMode={authInitialMode}
                onAuthenticated={handleAuthenticated}
                onLogout={handleLogout}
                onOpenSubscription={() => navigateTo('subscription')}
                onViewPublicProfile={handleSelectExpert}
                onOpenJobsPublish={() => navigateTo('jobs')}
                onOpenOrders={() => navigateTo('orders')}
                onAdminDataChanged={() => void fetchBootstrap()}
              />
            )}

            {activeTab === 'subscription' && (
              <SubscriptionPage
                currentUser={currentUser}
                currentProvider={currentProvider}
                subscriptionConfig={subscriptionConfig}
                onProofSubmitted={(updated) => {
                  setCurrentProvider(updated);
                  void fetchBootstrap();
                }}
                onGoToProfile={() => navigateTo('profile')}
              />
            )}

            {activeTab === 'contact' && <ContactView />}
          </>
        )}
      </main>

      <Footer onNavigate={navigateTo} />
      <BottomNav activeTab={activeTab} onNavigate={navigateTo} />

      {selectedExpert && (
        <ExpertDetailModal
          expert={selectedExpert}
          reviews={reviews}
          currentUser={currentUser}
          onClose={() => setSelectedExpert(null)}
          onRequireAuth={() => {
            setSelectedExpert(null);
            setAuthInitialMode('client');
            navigateTo('profile');
          }}
          onQuoteCreated={() => void fetchBootstrap()}
          onReviewCreated={(newReview, updatedProvider) => {
            setReviews((prev) => [newReview, ...prev]);
            setProviders((prev) => prev.map((p) => (p.id === updatedProvider.id ? updatedProvider : p)));
            setSelectedExpert(updatedProvider);
          }}
        />
      )}
      </div>
    </CurrencyProvider>
  );
}
