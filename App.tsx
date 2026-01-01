
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { ResourceNode, SimulationPrincipal, SimulationStatus, IamPolicyBinding, AuditLogEntry, RemediationProposal } from './types';
import { INITIAL_RESOURCES, INITIAL_PRINCIPAL, COMMON_PERMISSIONS } from './constants';
import { analyzePolicyWithGemini, suggestRemediation } from './services/geminiService';

// Reusable Components
const ResourceIcon = ({ type }: { type: ResourceNode['type'] }) => {
  switch (type) {
    case 'organization': return <i className="fa-solid fa-sitemap text-blue-600"></i>;
    case 'folder': return <i className="fa-solid fa-folder text-yellow-500"></i>;
    case 'project': return <i className="fa-solid fa-cube text-indigo-600"></i>;
    case 'bucket': return <i className="fa-solid fa-bitbucket text-teal-600"></i>;
    case 'instance': return <i className="fa-solid fa-server text-slate-600"></i>;
    default: return <i className="fa-solid fa-file text-slate-400"></i>;
  }
};

const StatusBadge = ({ status }: { status: ResourceNode['status'] }) => {
  const styles = {
    neutral: 'bg-slate-100 text-slate-600 border-slate-200',
    pending: 'bg-blue-50 text-blue-600 border-blue-200 animate-pulse',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    fail: 'bg-rose-50 text-rose-700 border-rose-200',
    partial: 'bg-orange-50 text-orange-700 border-orange-200',
    inferred: 'bg-purple-50 text-purple-700 border-purple-200'
  };
  return (
    <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded border ${styles[status]}`}>
      {status}
    </span>
  );
};

export default function App() {
  const [resources, setResources] = useState<ResourceNode[]>(INITIAL_RESOURCES);
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);
  const [principal, setPrincipal] = useState<SimulationPrincipal>(INITIAL_PRINCIPAL);
  const [simulationStatus, setSimulationStatus] = useState<SimulationStatus>('idle');
  const [aiAnalysis, setAiAnalysis] = useState<{ score: number; recommendations: string[] } | null>(null);
  const [activeRemediation, setActiveRemediation] = useState<RemediationProposal | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const selectedResource = useMemo(() => 
    resources.find(r => r.id === selectedResourceId), 
  [resources, selectedResourceId]);

  const runSimulation = useCallback(async () => {
    setSimulationStatus('running');
    setResources(prev => prev.map(r => ({ ...r, status: 'pending', results: undefined })));

    // Simulate network delay and permission evaluation
    setTimeout(() => {
      setResources(prev => prev.map(r => {
        // Mock logic: grant storage get if they have any policy with storage.objectViewer or Admin
        const hasAccess = r.policyBindings?.some(b => 
          b.members.includes(principal.id) || b.members.includes('group:all-staff@pantheon.ai')
        );
        
        return {
          ...r,
          status: hasAccess ? 'success' : 'fail',
          results: COMMON_PERMISSIONS.slice(0, 3).map(p => ({
            permission: p,
            granted: !!hasAccess && p.includes('get')
          }))
        };
      }));
      setSimulationStatus('completed');
    }, 1500);
  }, [principal]);

  const handleAiAnalysis = useCallback(async () => {
    if (!selectedResource) return;
    setSimulationStatus('analyzing');
    const result = await analyzePolicyWithGemini(selectedResource, selectedResource.policyBindings || []);
    setAiAnalysis(result);
    setSimulationStatus('idle');
  }, [selectedResource]);

  const handleRemediate = useCallback(async () => {
    if (!selectedResource) return;
    setSimulationStatus('remediating');
    // Mocking audit logs for Gemini context
    const mockLogs: AuditLogEntry[] = [
      { timestamp: new Date().toISOString(), principalId: principal.id, resourceId: selectedResource.id, methodName: 'storage.objects.get', granted: true, reason: 'Manual test', metadata: {} }
    ];
    try {
      const proposal = await suggestRemediation(mockLogs, selectedResource.policyBindings || [], selectedResource.id);
      setActiveRemediation(proposal);
    } catch (e) {
      alert("AI Remediation failed. Check console.");
    } finally {
      setSimulationStatus('idle');
    }
  }, [selectedResource, principal]);

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-800">
      {/* Sidebar: Navigation & Resource Discovery */}
      <aside className="w-80 border-r bg-white flex flex-col shadow-sm">
        <div className="p-4 border-b flex items-center gap-3 bg-slate-900 text-white">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
            <i className="fa-solid fa-shield-halved"></i>
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-tight">PANTHEON IAM</h1>
            <p className="text-[10px] text-slate-400 font-medium">SENTINEL V4.0.2</p>
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-b">
          <div className="relative">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
            <input 
              type="text" 
              placeholder="Search resources..." 
              className="w-full pl-9 pr-4 py-2 bg-white border rounded-md text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {resources.filter(r => r.name.toLowerCase().includes(searchTerm.toLowerCase())).map((res) => (
            <button
              key={res.id}
              onClick={() => setSelectedResourceId(res.id)}
              className={`w-full text-left px-3 py-2 rounded-md flex items-center justify-between group transition-colors ${
                selectedResourceId === res.id ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <ResourceIcon type={res.type} />
                <span className="text-xs font-medium truncate">{res.name}</span>
              </div>
              <StatusBadge status={res.status} />
            </button>
          ))}
        </div>
      </aside>

      {/* Main Viewport */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header: Simulation Controls */}
        <header className="h-16 border-b bg-white flex items-center justify-between px-6 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg border">
              <i className="fa-solid fa-user-circle text-slate-400"></i>
              <span className="text-xs font-mono font-medium">{principal.id}</span>
              <button className="text-[10px] text-indigo-600 font-bold hover:underline">CHANGE</button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={runSimulation}
              disabled={simulationStatus !== 'idle' && simulationStatus !== 'completed'}
              className="px-4 py-2 bg-slate-900 text-white rounded-md text-xs font-bold hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center gap-2 shadow-sm"
            >
              {simulationStatus === 'running' ? (
                <i className="fa-solid fa-spinner animate-spin"></i>
              ) : (
                <i className="fa-solid fa-play"></i>
              )}
              RUN SIMULATION
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden flex">
          {/* Workspace Area */}
          <div className="flex-1 overflow-y-auto p-8 bg-slate-50">
            {selectedResource ? (
              <div className="max-w-4xl mx-auto space-y-6">
                <div className="bg-white p-6 rounded-xl border shadow-sm">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="text-xl font-bold flex items-center gap-2">
                        <ResourceIcon type={selectedResource.type} />
                        {selectedResource.name}
                      </h2>
                      <p className="text-xs text-slate-500 font-mono mt-1">{selectedResource.id}</p>
                    </div>
                    <div className="flex gap-2">
                      {selectedResource.tags?.map(t => (
                        <span key={t} className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-[10px] font-bold">#{t}</span>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-8">
                    <div>
                      <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">IAM Policy Bindings</h3>
                      <div className="space-y-3">
                        {selectedResource.policyBindings && selectedResource.policyBindings.length > 0 ? (
                          selectedResource.policyBindings.map((b, i) => (
                            <div key={i} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                              <p className="text-xs font-mono font-bold text-indigo-700 mb-2 truncate">{b.role}</p>
                              <div className="space-y-1">
                                {b.members.map(m => (
                                  <div key={m} className="text-[10px] flex items-center gap-2 text-slate-600">
                                    <i className="fa-solid fa-circle-user text-[8px] text-slate-300"></i>
                                    {m}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="p-4 border border-dashed rounded-lg text-center text-slate-400 text-xs">
                            No direct policy bindings found.
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Simulation Results</h3>
                      <div className="space-y-2">
                        {selectedResource.results ? (
                          selectedResource.results.map((res, i) => (
                            <div key={i} className="flex items-center justify-between p-3 bg-white border rounded-lg shadow-sm">
                              <span className="text-xs font-mono truncate mr-2">{res.permission}</span>
                              {res.granted ? (
                                <i className="fa-solid fa-check-circle text-emerald-500"></i>
                              ) : (
                                <i className="fa-solid fa-circle-xmark text-rose-500"></i>
                              )}
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-slate-400 italic">Run simulation to see results.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI Insight Section */}
                <div className="bg-indigo-900 rounded-xl p-1 shadow-lg overflow-hidden border border-indigo-700">
                   <div className="bg-white rounded-lg p-6">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2 text-indigo-900 font-bold">
                          <i className="fa-solid fa-wand-magic-sparkles"></i>
                          <span>GEMINI AI GUARDIAN</span>
                        </div>
                        <div className="flex gap-2">
                           <button 
                             onClick={handleAiAnalysis}
                             className="text-xs font-bold px-4 py-2 rounded-md bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
                           >
                             ANALYZE POSTURE
                           </button>
                           <button 
                             onClick={handleRemediate}
                             className="text-xs font-bold px-4 py-2 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                           >
                             REMEDIATE
                           </button>
                        </div>
                      </div>

                      {aiAnalysis ? (
                        <div className="space-y-6">
                          <div className="flex items-center gap-6">
                            <div className="w-20 h-20 rounded-full border-4 border-indigo-100 flex items-center justify-center relative">
                              <span className="text-xl font-black text-indigo-600">{aiAnalysis.score}</span>
                              <div className="absolute -bottom-1 -right-1 bg-emerald-500 w-6 h-6 rounded-full border-4 border-white flex items-center justify-center">
                                <i className="fa-solid fa-shield text-[8px] text-white"></i>
                              </div>
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-bold text-slate-700 mb-1">Security Health Score</p>
                              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${aiAnalysis.score}%` }}></div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="space-y-3">
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Key Recommendations</h4>
                            {aiAnalysis.recommendations.map((rec, idx) => (
                              <div key={idx} className="flex gap-3 text-xs leading-relaxed text-slate-600">
                                <i className="fa-solid fa-circle-check text-emerald-500 mt-0.5"></i>
                                <span>{rec}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="py-12 text-center text-slate-400 space-y-4">
                           <i className="fa-solid fa-brain text-4xl opacity-20"></i>
                           <p className="text-xs italic">Awaiting AI security analysis input...</p>
                        </div>
                      )}
                   </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
                <i className="fa-solid fa-diagram-project text-6xl opacity-10"></i>
                <div className="text-center">
                  <h3 className="font-bold text-slate-500">No Resource Selected</h3>
                  <p className="text-xs">Select a resource from the sentinel tree to begin analysis.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Right Sidebar: Remediation & Intelligence */}
      {activeRemediation && (
        <aside className="w-96 border-l bg-white flex flex-col animate-in slide-in-from-right duration-300">
           <div className="p-4 border-b flex items-center justify-between bg-slate-50">
             <h3 className="font-bold text-xs uppercase tracking-wider text-slate-600">Remediation Proposal</h3>
             <button onClick={() => setActiveRemediation(null)} className="text-slate-400 hover:text-slate-600">
               <i className="fa-solid fa-xmark"></i>
             </button>
           </div>
           
           <div className="p-6 flex-1 overflow-y-auto space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                   <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-700 uppercase">{activeRemediation.severity}</span>
                   <span className="text-[10px] font-bold text-slate-400 uppercase">Confidence: {activeRemediation.confidence}%</span>
                </div>
                <h4 className="text-sm font-bold text-slate-800">{activeRemediation.description}</h4>
                <p className="text-xs text-slate-600 leading-relaxed italic border-l-2 pl-4 py-1">"{activeRemediation.reasoning}"</p>
              </div>

              <div className="space-y-4">
                <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Proposed Changes</h5>
                {activeRemediation.changes.map((change, idx) => (
                  <div key={idx} className="p-3 rounded-lg border text-xs space-y-2">
                    <div className="flex items-center gap-2">
                       <span className={`w-2 h-2 rounded-full ${change.action === 'add' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                       <span className="font-bold uppercase text-[9px]">{change.action} BINDING</span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded font-mono text-[10px] break-all border border-slate-100">
                      <p className="text-indigo-600 font-bold mb-1">{change.binding.role}</p>
                      <div className="text-slate-500 space-y-1">
                        {change.binding.members.map(m => <div key={m}>- {m}</div>)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
           </div>

           <div className="p-4 border-t bg-slate-50">
             <button className="w-full py-3 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 shadow-md transition-all">
               APPLY CHANGES TO PRODUCTION
             </button>
           </div>
        </aside>
      )}
    </div>
  );
}
