import React, { useEffect, useState } from 'react';
import { Rocket, Activity, CheckCircle2, XCircle, Clock, Server, RefreshCw } from 'lucide-react';

interface Deployment {
  id: string;
  application: string;
  version: string;
  environment: string;
  status: string;
  responsible: string;
  commit_hash: string | null;
  commit_message: string | null;
  created_at: string;
}

function App() {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDeployments = async () => {
    setLoading(true);
    try {
      // In a real scenario, the API URL would come from env vars
      const response = await fetch('http://localhost:3000/deployments');
      if (response.ok) {
        const data = await response.json();
        setDeployments(data);
      }
    } catch (error) {
      console.error('Failed to fetch deployments:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeployments();
  }, []);

  const totalDeploys = deployments.length;
  const successRate = totalDeploys === 0 ? 0 : 
    Math.round((deployments.filter(d => d.status === 'success').length / totalDeploys) * 100);
  const activeEnvs = new Set(deployments.map(d => d.environment)).size;

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleString('pt-BR', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="dashboard-container">
      <header>
        <div className="logo">
          <Rocket className="logo-icon" size={28} />
          Deploy Tracker
        </div>
        <button className="btn-primary" onClick={fetchDeployments}>
          <RefreshCw size={18} />
          Refresh
        </button>
      </header>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-title">
            <Activity size={18} /> Total Deployments
          </div>
          <div className="stat-value">{totalDeploys}</div>
        </div>
        <div className="stat-card">
          <div className="stat-title">
            <CheckCircle2 size={18} color="var(--status-success)" /> Success Rate
          </div>
          <div className="stat-value">{successRate}%</div>
        </div>
        <div className="stat-card">
          <div className="stat-title">
            <Server size={18} /> Active Environments
          </div>
          <div className="stat-value">{activeEnvs}</div>
        </div>
      </div>

      <div className="section-header">
        <h2>Recent Activity</h2>
      </div>

      <div className="table-container">
        {loading ? (
          <div className="loading">
            <RefreshCw className="spin" size={32} />
          </div>
        ) : deployments.length === 0 ? (
          <div className="empty-state">
            <Clock size={48} className="empty-icon" />
            <h3>No deployments found</h3>
            <p>Waiting for the first deployment to be registered.</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Status</th>
                <th>Application</th>
                <th>Version</th>
                <th>Environment</th>
                <th>Commit</th>
                <th>Responsible</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {deployments.map((deploy) => (
                <tr key={deploy.id}>
                  <td>
                    <span className={`status-badge ${deploy.status === 'success' ? 'status-success' : 'status-error'}`}>
                      {deploy.status === 'success' ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                      {deploy.status.charAt(0).toUpperCase() + deploy.status.slice(1)}
                    </span>
                  </td>
                  <td><strong>{deploy.application}</strong></td>
                  <td>{deploy.version}</td>
                  <td>
                    <span className="environment-tag">{deploy.environment}</span>
                  </td>
                  <td>
                    {deploy.commit_hash ? (
                      <span className="commit-hash" title={deploy.commit_message || ''}>
                        {deploy.commit_hash.substring(0, 7)}
                      </span>
                    ) : '-'}
                  </td>
                  <td>{deploy.responsible}</td>
                  <td>{formatDate(deploy.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default App;
