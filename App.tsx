
import React, { useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import SalesAssistant from './components/SalesAssistant';
import SalesOutreach from './components/SalesOutreach';
import ServiceExplainer from './components/ServiceExplainer';
import HandoverHelper from './components/HandoverHelper';
import Integrations from './components/Integrations';
import StorageManager from './components/StorageManager';
import CRM from './components/CRM';
import Brain from './components/Brain';
import Meetings from './components/Meetings';
import DeliveryTimelineModule from './components/DeliveryTimeline';
import ProposalBuilder from './components/ProposalBuilder';
import { IntegrationState } from './types';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Store integration state at App level
  const [integrations, setIntegrations] = useState<IntegrationState>({
      gmail: false,
      linkedin: false,
      instagram: false
  });

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard setActiveTab={setActiveTab} />;
      case 'brain':
        return <Brain />;
      case 'crm':
        return <CRM />;
      case 'sales':
        return <SalesAssistant integrations={integrations} />;
      case 'outreach':
        return <SalesOutreach integrations={integrations} />;
      case 'explainer':
        return <ServiceExplainer />;
      case 'handover':
        return <HandoverHelper />;
      case 'storage':
        return <StorageManager />;
      case 'delivery':
        return <DeliveryTimelineModule />;
      case 'documents':
        return <ProposalBuilder />;
      case 'meetings':
        return <Meetings />;
      case 'integrations':
        return <Integrations integrations={integrations} setIntegrations={setIntegrations} />;
      default:
        return <Dashboard setActiveTab={setActiveTab} />;
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderContent()}
    </Layout>
  );
}

export default App;
