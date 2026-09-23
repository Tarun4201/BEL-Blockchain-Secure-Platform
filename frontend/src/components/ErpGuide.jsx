import { useEffect, useMemo, useRef, useState } from 'react';
import { erpApi } from '../api/client';

const TOUR_VERSION = '1.0';

const ROLE_TOURS = {
  PROCUREMENT_OFFICER: [
    ['dashboard-overview', 'dashboard', 'Your dashboard', 'Start here to see your authorized work and recent activity.'],
    ['sidebar-procurement', 'procurement', 'Procurement', 'Open Procurement to view purchase requests, quotations, and purchase orders assigned to your workspace.'],
    ['sidebar-vendors', 'vendors', 'Vendor management', 'Use this area to review the vendors involved in your authorized work.'],
    ['sidebar-access-control', 'access-control', 'My access', 'Request temporary access here when a task needs another department’s information.'],
    ['profile-details', 'profile', 'Your profile', 'Your role, unit, department, and SBU define the features you can use.'],
  ],
  FINANCE_OFFICER: [
    ['dashboard-overview', 'dashboard', 'Your dashboard', 'Start here to see your authorized work and recent activity.'],
    ['sidebar-finance', 'finance', 'Finance', 'This is where you view finance records assigned to your approved workspace.'],
    ['sidebar-reports', 'reports', 'Reports', 'Use reports to review authorized summaries for your work.'],
    ['sidebar-access-control', 'access-control', 'My access', 'Request temporary access here when a task needs another department’s information.'],
    ['profile-details', 'profile', 'Your profile', 'Your role, unit, department, and SBU define the features you can use.'],
  ],
  PRODUCTION_MANAGER: [
    ['dashboard-overview', 'dashboard', 'Your dashboard', 'Start here to see your authorized production work and recent activity.'],
    ['sidebar-production', 'production', 'Production', 'View production orders that belong to your current workspace.'],
    ['sidebar-inventory', 'inventory', 'Material availability', 'Use Inventory and Materials to review authorized material records.'],
    ['sidebar-quality', 'quality', 'Quality', 'Open Quality to review inspections connected to your role.'],
    ['profile-details', 'profile', 'Your profile', 'Your role, unit, department, and SBU define the features you can use.'],
  ],
  ENGINEERING_OFFICER: [
    ['dashboard-overview', 'dashboard', 'Your dashboard', 'Start here to see your authorized engineering work and recent activity.'],
    ['sidebar-engineering', 'engineering', 'R&D and engineering', 'This module contains the engineering records assigned to your workspace.'],
    ['sidebar-projects', 'projects', 'Project management', 'Use this area to view project information available to your role.'],
    ['profile-details', 'profile', 'Your profile', 'Your role, unit, department, and SBU define the features you can use.'],
  ],
};

const GENERIC_TOUR = [
  ['dashboard-overview', 'dashboard', 'Your dashboard', 'This is your workspace overview. It shows work and activity available to you.'],
  ['sidebar-first-module', null, 'Your modules', 'The navigation only lists modules that your current role is allowed to use.'],
  ['profile-details', 'profile', 'Your profile', 'Your role, unit, department, and SBU determine your access.'],
];

function tourFor(user, modules) {
  const configured = ROLE_TOURS[user.roleKey] || GENERIC_TOUR;
  const allowed = new Set(modules.map((module) => module.id));
  return configured
    .filter(([, module]) => !module || allowed.has(module))
    .map(([target, module, title, description]) => {
      const resolvedModule = module || modules.find((item) => item.id !== 'dashboard')?.id || 'dashboard';
      const resolvedTarget = target === 'sidebar-first-module' ? `sidebar-${resolvedModule}` : target;
      return {
      id: resolvedTarget,
      target: `[data-tour="${resolvedTarget}"]`,
      module: resolvedModule,
      title,
      description,
    };
    });
}

function BeliaAvatar({ mood = 'explaining' }) {
  return <div className={`belia-avatar belia-${mood}`} aria-hidden="true">
    <div className="belia-halo" /><div className="belia-head"><i /><i /><b /></div><span>BELIA</span>
  </div>;
}

function GuideLauncher({ onOpen, incomplete }) {
  return <button className="erp-guide-launcher" data-tour="erp-guide" onClick={onOpen} aria-label="Open BEL ERP Guide">
    <span>✦</span><div><strong>ERP Guide</strong><small>{incomplete ? 'Continue onboarding' : 'BELIA is ready to help'}</small></div>
  </button>;
}

function Welcome({ progress, onStart, onRestart, onExit }) {
  const incomplete = progress?.status === 'IN_PROGRESS';
  return <div className="belia-welcome-backdrop" role="dialog" aria-modal="true" aria-labelledby="belia-welcome-title">
    <section className="belia-welcome-card">
      <BeliaAvatar mood="welcome" />
      <p className="belia-eyebrow">BEL INTELLIGENT ASSISTANT</p>
      <h1 id="belia-welcome-title">{incomplete ? 'Your ERP introduction is incomplete.' : 'Welcome to BEL ERP'}</h1>
      <p>{incomplete ? "BELIA saved your progress. Continue where you stopped, or restart the introduction for your current role." : "I’ll guide you through the tools and features available to you based on your role."}</p>
      <div className="belia-welcome-actions">
        <button className="erp-primary" onClick={onStart}>{incomplete ? 'Continue Tour' : 'Start Guided Tour'}</button>
        {incomplete && <button className="erp-secondary" onClick={onRestart}>Restart Tour</button>}
      </div>
      <button className="belia-exit-link" onClick={onExit}>Exit for now</button>
    </section>
  </div>;
}

function GuideHub({ user, progress, modules, onStart, onRestart, onClose, adminStats }) {
  const completed = progress?.status === 'COMPLETED';
  return <div className="belia-hub-backdrop" role="dialog" aria-modal="true" aria-labelledby="belia-hub-title">
    <section className="belia-hub">
      <button className="belia-close" onClick={onClose} aria-label="Close ERP Guide">×</button>
      <div className="belia-hub-heading"><BeliaAvatar mood={completed ? 'success' : 'explaining'} /><div><p className="belia-eyebrow">BEL ERP GUIDE v{TOUR_VERSION}</p><h2 id="belia-hub-title">Hello, {user.fullName.split(' ')[0]}</h2><p>{completed ? 'ERP Orientation: Completed' : 'Your role-specific introduction is ready.'}</p></div></div>
      <div className="belia-hub-grid">
        <article><h3>Guided tour</h3><p>Let BELIA highlight the actual controls available to you.</p><button className="erp-primary" onClick={onStart}>{completed ? 'Restart Guided Tour' : 'Continue Learning'}</button>{!completed && <button className="belia-text-button" onClick={onRestart}>Start from step 1</button>}</article>
        <article><h3>My permissions</h3><p>Your current access is based on your registered department, role, SBU, and approved permissions.</p><ul><li>{user.role}</li><li>{user.department}</li><li>{user.sbu}</li></ul></article>
        <article><h3>Available modules</h3><p>BELIA will only guide you to modules that you are authorized to use.</p><div className="belia-module-tags">{modules.filter((item) => item.id !== 'dashboard' && item.id !== 'profile').map((item) => <span key={item.id}>{item.label}</span>)}</div></article>
        <article><h3>Practice mode</h3><p>Training mode is planned for a future demo release. It will never create real ERP transactions.</p><span className="belia-soon">TRAINING / DEMO</span></article>
      </div>
      {user.roleKey === 'ERP_ADMIN' && adminStats && <section className="belia-admin-stats"><h3>Guide Management</h3><p>{adminStats.completed} completed · {adminStats.inProgress} in progress · {adminStats.notStarted} not started</p></section>}
    </section>
  </div>;
}

export function ErpGuide({ sessionToken, user, modules, activeModule, onNavigate }) {
  const [progress, setProgress] = useState(null);
  const [mode, setMode] = useState('');
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [missing, setMissing] = useState(false);
  const [adminStats, setAdminStats] = useState(null);
  const activeElement = useRef(null);
  const steps = useMemo(() => tourFor(user, modules), [user, modules]);
  const current = steps[stepIndex] || steps[0];

  const refreshProgress = async () => {
    const next = await erpApi.guideProgress(sessionToken);
    setProgress(next);
    return next;
  };

  useEffect(() => {
    let mounted = true;
    erpApi.guideProgress(sessionToken).then((next) => {
      if (!mounted) return;
      setProgress(next);
      if (next.status !== 'COMPLETED') setMode('welcome');
    }).catch(() => {});
    if (user.roleKey === 'ERP_ADMIN') erpApi.guideStats(sessionToken).then(setAdminStats).catch(() => {});
    return () => { mounted = false; };
  }, [sessionToken, user.roleKey]);

  useEffect(() => {
    if (progress?.status === 'IN_PROGRESS') setStepIndex(Math.min(progress.lastViewedStep || 0, Math.max(steps.length - 1, 0)));
  }, [progress, steps.length]);

  const clearTarget = () => {
    if (activeElement.current) activeElement.current.classList.remove('belia-target-active');
    activeElement.current = null;
  };

  useEffect(() => {
    if (mode !== 'tour' || !current) return undefined;
    clearTarget(); setMissing(false); setTargetRect(null);
    if (activeModule !== current.module) { onNavigate(current.module); return undefined; }
    let attempts = 0; let timer;
    const locate = () => {
      const element = document.querySelector(current.target);
      if (!element) {
        attempts += 1;
        if (attempts < 12) { timer = window.setTimeout(locate, 180); return; }
        setMissing(true); return;
      }
      element.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center', inline: 'nearest' });
      activeElement.current = element;
      element.classList.add('belia-target-active');
      const place = () => setTargetRect(element.getBoundingClientRect());
      place();
      window.addEventListener('resize', place); window.addEventListener('scroll', place, true);
      activeElement.current._beliaCleanup = () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true); };
    };
    timer = window.setTimeout(locate, 80);
    return () => { window.clearTimeout(timer); activeElement.current?._beliaCleanup?.(); clearTarget(); };
  }, [mode, current, activeModule, onNavigate]);

  useEffect(() => {
    const onKey = (event) => {
      if (mode !== 'tour' || ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
      if (event.key === 'ArrowRight') { event.preventDefault(); advance(); }
      if (event.key === 'ArrowLeft') { event.preventDefault(); previous(); }
      if (event.key === 'Escape') exitTour();
    };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  });

  const save = async (payload) => {
    const next = await erpApi.saveGuideProgress(sessionToken, payload);
    setProgress(next); return next;
  };
  const start = async (restart = false) => {
    const index = restart ? 0 : Math.min(progress?.lastViewedStep || 0, Math.max(steps.length - 1, 0));
    setStepIndex(index); await save({ status: 'IN_PROGRESS', lastViewedStep: index, currentStep: index }); setMode('tour');
  };
  const exitTour = async () => { await save({ status: 'IN_PROGRESS', lastViewedStep: stepIndex, currentStep: stepIndex }); setMode(''); };
  const previous = async () => { if (stepIndex === 0) return; const index = stepIndex - 1; setStepIndex(index); await save({ status: 'IN_PROGRESS', lastViewedStep: index, currentStep: index }); };
  const advance = async () => {
    if (stepIndex >= steps.length - 1) { await save({ status: 'COMPLETED', lastViewedStep: steps.length, currentStep: steps.length }); setMode('complete'); return; }
    const index = stepIndex + 1; setStepIndex(index); await save({ status: 'IN_PROGRESS', lastViewedStep: index, currentStep: index });
  };

  if (!progress) return null;
  if (mode === 'welcome') return <Welcome progress={progress} onStart={() => start(false)} onRestart={() => start(true)} onExit={() => setMode('')} />;
  if (mode === 'hub') return <GuideHub user={user} progress={progress} modules={modules} onStart={() => start(false)} onRestart={() => start(true)} onClose={() => setMode('')} adminStats={adminStats} />;
  if (mode === 'complete') return <div className="belia-welcome-backdrop" role="dialog" aria-modal="true"><section className="belia-welcome-card belia-complete"><BeliaAvatar mood="completion" /><p className="belia-eyebrow">ORIENTATION COMPLETE</p><h1>You’re all set!</h1><p>You have completed the introduction to the BEL ERP tools available for your role.</p><button className="erp-primary" onClick={() => setMode('')}>Return to Dashboard</button><button className="belia-exit-link" onClick={() => setMode('hub')}>Explore ERP Guide</button></section></div>;

  const panelStyle = targetRect ? {
    left: targetRect.left > window.innerWidth * 0.58 ? Math.max(16, targetRect.left - 384) : Math.min(window.innerWidth - 368, targetRect.right + 18),
    top: Math.min(Math.max(16, targetRect.top), window.innerHeight - 280),
  } : { left: '50%', top: '50%' };
  return <><GuideLauncher incomplete={progress.status !== 'COMPLETED'} onOpen={() => setMode('hub')} />{mode === 'tour' && <div className="belia-tour" aria-live="polite">
    <div className="belia-overlay" />
    {targetRect && <div className="belia-spotlight" style={{ left: targetRect.left - 7, top: targetRect.top - 7, width: targetRect.width + 14, height: targetRect.height + 14 }} />}
    <section className="belia-tour-card" style={panelStyle} role="dialog" aria-modal="true"><div className="belia-tour-top"><BeliaAvatar mood={missing ? 'attention' : stepIndex === steps.length - 1 ? 'success' : 'explaining'} /><div><p className="belia-eyebrow">{user.role} · STEP {stepIndex + 1} OF {steps.length}</p><h2>{missing ? "BELIA couldn't locate this feature" : current.title}</h2></div><button className="belia-close" onClick={exitTour} aria-label="Exit tour">×</button></div><p>{missing ? 'The page may still be loading. You can try again or safely skip this step.' : current.description}</p>{missing && <div className="belia-actions"><button className="erp-secondary" onClick={() => { setMissing(false); onNavigate(current.module); }}>Try Again</button><button className="erp-primary" onClick={advance}>Skip Step</button></div>} {!missing && <><div className="belia-progress"><span style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }} /></div><div className="belia-actions"><button className="erp-secondary" onClick={previous} disabled={stepIndex === 0}>Previous</button><button className="erp-primary" onClick={advance}>{stepIndex === steps.length - 1 ? 'Finish Tour' : 'Next'}</button></div></>}</section>
  </div>}</>;
}
