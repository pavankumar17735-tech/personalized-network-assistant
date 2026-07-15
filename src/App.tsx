import React, { useState, useEffect, useRef } from 'react';
import { jsPDF } from 'jspdf';
import {
  Sparkles,
  MessageSquare,
  Search,
  History,
  BarChart2,
  Mic,
  MicOff,
  Copy,
  Check,
  Trash2,
  Calendar,
  User,
  Tag,
  Plus,
  Star,
  ThumbsUp,
  AlertTriangle,
  RefreshCw,
  Terminal,
  BookOpen,
  Info,
  FileDown,
  Target,
  Linkedin,
  CheckSquare,
  Bell,
  HelpCircle,
  Compass
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile, NetworkingSession, FactCheck, LogEntry, SessionFeedback } from './types.ts';
import { PRESET_PROFILES, SAMPLE_FACT_CHECKS } from './data.ts';
import AudioVolumeVisualizer from './components/AudioVolumeVisualizer.tsx';

export default function App() {
  // --- STATE DECLARATIONS ---
  const [profile, setProfile] = useState<UserProfile>({
    name: '',
    role: '',
    professionalInterests: [],
    personalInterests: [],
    bio: ''
  });

  const [eventDescription, setEventDescription] = useState('');
  const [currentProfessionalInterest, setCurrentProfessionalInterest] = useState('');
  const [currentPersonalInterest, setCurrentPersonalInterest] = useState('');

  // Recording Stream & State (Bio)
  const [profileStream, setProfileStream] = useState<MediaStream | null>(null);
  const [isProfileRecording, setIsProfileRecording] = useState(false);
  const profileRecognitionRef = useRef<any>(null);

  // Recording Stream & State (Event)
  const [eventStream, setEventStream] = useState<MediaStream | null>(null);
  const [isEventRecording, setIsEventRecording] = useState(false);
  const eventRecognitionRef = useRef<any>(null);

  // Core Output State
  const [currentSession, setCurrentSession] = useState<NetworkingSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'playbook' | 'factcheck' | 'history' | 'metrics'>('playbook');
  const [errorMessage, setErrorMessage] = useState('');

  // Fact Checking State
  const [factQuery, setFactQuery] = useState('');
  const [factCheckResults, setFactCheckResults] = useState<FactCheck[]>(SAMPLE_FACT_CHECKS);
  const [isCheckingFact, setIsCheckingFact] = useState(false);

  // Feedback State for current active session
  const [rating, setRating] = useState<number>(5);
  const [feedbackComments, setFeedbackComments] = useState('');
  const [likedStarters, setLikedStarters] = useState<string[]>([]);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  // Telemetry Logs & Metrics
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [historySessions, setHistorySessions] = useState<NetworkingSession[]>([]);
  const [historySearchQuery, setHistorySearchQuery] = useState('');

  // Copy success animation triggers
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filter state for conversation starters
  const [starterFilter, setStarterFilter] = useState<'all' | 'Professional' | 'Casual' | 'Technical'>('all');

  // Completed Prep Tasks checklist state
  const [completedPrepTasks, setCompletedPrepTasks] = useState<Record<string, boolean>>({});

  const handleTogglePrepTask = (taskId: string) => {
    setCompletedPrepTasks((prev) => ({
      ...prev,
      [taskId]: !prev[taskId]
    }));
  };

  // Notification Preferences States
  const [emailReminders, setEmailReminders] = useState<boolean>(() => {
    const stored = localStorage.getItem('pref_email_reminders');
    return stored ? stored === 'true' : false;
  });
  const [pushReminders, setPushReminders] = useState<boolean>(() => {
    const stored = localStorage.getItem('pref_push_reminders');
    return stored ? stored === 'true' : false;
  });
  const [notificationSuccessMsg, setNotificationSuccessMsg] = useState<string | null>(null);

  // PDF download toast notification
  const [pdfToast, setPdfToast] = useState<string | null>(null);

  // Guided Tour state
  const [showTour, setShowTour] = useState<boolean>(false);
  const [tourStep, setTourStep] = useState<number>(0);

  const handleToggleEmailReminders = () => {
    setEmailReminders((prev) => {
      const next = !prev;
      localStorage.setItem('pref_email_reminders', String(next));
      triggerPreferenceFeedback(next ? 'Daily email reminders enabled!' : 'Daily email reminders disabled.');
      return next;
    });
  };

  const handleTogglePushReminders = () => {
    setPushReminders((prev) => {
      const next = !prev;
      localStorage.setItem('pref_push_reminders', String(next));
      triggerPreferenceFeedback(next ? 'Push notification reminders enabled!' : 'Push notification reminders disabled.');
      return next;
    });
  };

  const triggerPreferenceFeedback = (msg: string) => {
    setNotificationSuccessMsg(msg);
    setTimeout(() => {
      setNotificationSuccessMsg((prev) => prev === msg ? null : prev);
    }, 3000);
  };

  const getFilteredStarters = (starters: any[]) => {
    if (starterFilter === 'all') return starters;
    return starters.filter((starter) => {
      const cat = starter.category ? starter.category.toLowerCase() : '';
      if (starterFilter === 'Professional') {
        return cat === 'career' || cat === 'open-ended' || cat === 'professional';
      }
      if (starterFilter === 'Casual') {
        return cat === 'icebreaker' || cat === 'mutual interest' || cat === 'casual';
      }
      if (starterFilter === 'Technical') {
        return cat === 'technology' || cat === 'technical';
      }
      return true;
    });
  };

  // Initialize data on mount
  useEffect(() => {
    fetchHistory();
    fetchLogsAndMetrics();
    // Pre-load Dr. Elena Rostova preset to make the UI look beautiful on startup
    loadPreset(PRESET_PROFILES[0]);

    // Check for first-time landing to launch the guided tour
    const tourCompleted = localStorage.getItem('has_completed_tour_v1');
    if (!tourCompleted) {
      setTimeout(() => {
        setShowTour(true);
        setTourStep(0);
      }, 1200);
    }
  }, []);

  // Fetch Session History
  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/history');
      if (res.ok) {
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await res.json();
          setHistorySessions(data);
        }
      }
    } catch (err) {
      console.error('Failed to fetch historical sessions', err);
    }
  };

  // Fetch Telemetry logs & metrics
  const fetchLogsAndMetrics = async () => {
    try {
      const logsRes = await fetch('/api/logs');
      if (logsRes.ok) {
        const contentType = logsRes.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const logsData = await logsRes.json();
          setLogs(logsData);
        }
      }

      const metricsRes = await fetch('/api/metrics');
      if (metricsRes.ok) {
        const contentType = metricsRes.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const metricsData = await metricsRes.json();
          setMetrics(metricsData);
        }
      }
    } catch (err) {
      console.error('Failed to fetch telemetry metrics', err);
    }
  };

  // Preset Selection Loader
  const loadPreset = (preset: typeof PRESET_PROFILES[0]) => {
    setProfile({ ...preset.profile });
    setEventDescription(preset.eventDescription);
    setErrorMessage('');
    // Switch to playbook and reset any loaded current session to force fresh generation
    setCurrentSession(null);
    setFeedbackSubmitted(false);
    setLikedStarters([]);
    setFeedbackComments('');
    setRating(5);
    setStarterFilter('all');
    setCompletedPrepTasks({});
  };

  const handleMobileTabClick = (tab: 'setup' | 'playbook' | 'factcheck' | 'history' | 'metrics') => {
    if (tab === 'setup') {
      const el = document.getElementById('profile-card');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      setActiveTab(tab);
      setTimeout(() => {
        const el = document.getElementById('networking-strategy-dashboard');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 50);
    }
  };

  // --- GUIDED TOUR FUNCTIONS ---
  const handleTourStepChange = (step: number) => {
    setTourStep(step);
    if (step === 0) {
      const el = document.getElementById('profile-card');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } else if (step === 1) {
      setActiveTab('playbook');
      setTimeout(() => {
        const el = document.getElementById('networking-strategy-dashboard');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    } else if (step === 2) {
      setActiveTab('factcheck');
      setTimeout(() => {
        const el = document.getElementById('networking-strategy-dashboard');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  };

  const handleStartTour = () => {
    setShowTour(true);
    handleTourStepChange(0);
  };

  const handleSkipOrFinishTour = () => {
    setShowTour(false);
    localStorage.setItem('has_completed_tour_v1', 'true');
  };

  const handleClearAllData = async () => {
    if (!confirm('Are you sure you want to clear all data? This will permanently delete your session history, telemetry logs, profile information, and reset your preferences.')) {
      return;
    }

    try {
      const res = await fetch('/api/clear', { method: 'POST' });
      if (res.ok) {
        // Reset all frontend states
        setProfile({
          name: '',
          role: '',
          professionalInterests: [],
          personalInterests: [],
          bio: ''
        });
        setEventDescription('');
        setCurrentProfessionalInterest('');
        setCurrentPersonalInterest('');
        setCurrentSession(null);
        setIsLoading(false);
        setActiveTab('playbook');
        setErrorMessage('');
        setFactQuery('');
        setFactCheckResults([]);
        setRating(5);
        setFeedbackComments('');
        setLikedStarters([]);
        setFeedbackSubmitted(false);
        setLogs([]);
        setMetrics(null);
        setHistorySessions([]);
        setHistorySearchQuery('');
        setCopiedId(null);
        setStarterFilter('all');
        setCompletedPrepTasks({});
        setEmailReminders(false);
        setPushReminders(false);
        localStorage.removeItem('pref_email_reminders');
        localStorage.removeItem('pref_push_reminders');
      } else {
        alert('Failed to clear server data. Please try again.');
      }
    } catch (err) {
      console.error('Failed to clear all data:', err);
      alert('An error occurred while clearing data.');
    }
  };

  // Copy to clipboard helper with animation hook
  const handleCopyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyAllStarters = (startersToCopy: any[]) => {
    if (!startersToCopy || startersToCopy.length === 0) return;
    const formatted = startersToCopy
      .map((s, idx) => `[${s.category}] Starter #${idx + 1}:\n"${s.text}"`)
      .join('\n\n');
    const header = `=== PERSONALIZED CONVERSATION STARTERS ===\nEvent: ${currentSession?.eventDescription || 'Networking Event'}\n\n${formatted}\n\nGenerated via Personalized Networking Assistant`;
    navigator.clipboard.writeText(header);
    setCopiedId('all-starters');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // --- INTEREST TAG UTILITIES ---
  const handleAddProfessionalInterest = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const tag = currentProfessionalInterest.trim();
    if (tag && !profile.professionalInterests.includes(tag)) {
      setProfile((prev) => ({
        ...prev,
        professionalInterests: [...prev.professionalInterests, tag]
      }));
    }
    setCurrentProfessionalInterest('');
  };

  const handleAddPersonalInterest = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const tag = currentPersonalInterest.trim();
    if (tag && !profile.personalInterests.includes(tag)) {
      setProfile((prev) => ({
        ...prev,
        personalInterests: [...prev.personalInterests, tag]
      }));
    }
    setCurrentPersonalInterest('');
  };

  const removeProfessionalInterest = (tag: string) => {
    setProfile((prev) => ({
      ...prev,
      professionalInterests: prev.professionalInterests.filter((t) => t !== tag)
    }));
  };

  const removePersonalInterest = (tag: string) => {
    setProfile((prev) => ({
      ...prev,
      personalInterests: prev.personalInterests.filter((t) => t !== tag)
    }));
  };

  // --- SPEECH RECOGNITION DICTATION ---
  const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  const toggleProfileSpeech = async () => {
    if (isProfileRecording) {
      // Stop speech
      if (profileRecognitionRef.current) {
        profileRecognitionRef.current.stop();
      }
      if (profileStream) {
        profileStream.getTracks().forEach((track) => track.stop());
        setProfileStream(null);
      }
      setIsProfileRecording(false);
    } else {
      if (!SpeechRecognitionClass) {
        alert('Your browser does not support the Web Speech API. Please try Google Chrome or MS Edge.');
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setProfileStream(stream);

        const recognition = new SpeechRecognitionClass();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          const resultText = event.results[event.results.length - 1][0].transcript;
          setProfile((prev) => ({
            ...prev,
            bio: prev.bio ? `${prev.bio} ${resultText.trim()}` : resultText.trim()
          }));
        };

        recognition.onerror = (err: any) => {
          console.error('Speech recognition error:', err);
          setIsProfileRecording(false);
          if (profileStream) {
            profileStream.getTracks().forEach((t) => t.stop());
            setProfileStream(null);
          }
        };

        recognition.onend = () => {
          setIsProfileRecording(false);
        };

        profileRecognitionRef.current = recognition;
        recognition.start();
        setIsProfileRecording(true);
      } catch (err) {
        console.error('Failed to request micro permissions:', err);
        alert('Microphone access is required to use speech dictation.');
      }
    }
  };

  const toggleEventSpeech = async () => {
    if (isEventRecording) {
      // Stop
      if (eventRecognitionRef.current) {
        eventRecognitionRef.current.stop();
      }
      if (eventStream) {
        eventStream.getTracks().forEach((track) => track.stop());
        setEventStream(null);
      }
      setIsEventRecording(false);
    } else {
      if (!SpeechRecognitionClass) {
        alert('Your browser does not support Web Speech API dictation.');
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setEventStream(stream);

        const recognition = new SpeechRecognitionClass();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          const resultText = event.results[event.results.length - 1][0].transcript;
          setEventDescription((prev) => (prev ? `${prev} ${resultText.trim()}` : resultText.trim()));
        };

        recognition.onerror = (err: any) => {
          console.error('Event Speech Recognition Error:', err);
          setIsEventRecording(false);
          if (eventStream) {
            eventStream.getTracks().forEach((t) => t.stop());
            setEventStream(null);
          }
        };

        recognition.onend = () => {
          setIsEventRecording(false);
        };

        eventRecognitionRef.current = recognition;
        recognition.start();
        setIsEventRecording(true);
      } catch (err) {
        console.error('Failed to request mic stream:', err);
        alert('Microphone access was blocked or denied.');
      }
    }
  };

  // --- PIPELINE TRIGGER (Unified LLM execution) ---
  const handleGenerateStrategy = async () => {
    setErrorMessage('');
    setIsLoading(true);

    // Defensive auto-commit of typed but unadded interests
    let finalProfessionalInterests = [...profile.professionalInterests];
    if (currentProfessionalInterest.trim()) {
      const tag = currentProfessionalInterest.trim();
      if (!finalProfessionalInterests.includes(tag)) {
        finalProfessionalInterests.push(tag);
      }
      setCurrentProfessionalInterest('');
    }

    let finalPersonalInterests = [...profile.personalInterests];
    if (currentPersonalInterest.trim()) {
      const tag = currentPersonalInterest.trim();
      if (!finalPersonalInterests.includes(tag)) {
        finalPersonalInterests.push(tag);
      }
      setCurrentPersonalInterest('');
    }

    const updatedProfile = {
      ...profile,
      professionalInterests: finalProfessionalInterests,
      personalInterests: finalPersonalInterests
    };

    // Update state to match committed values
    setProfile(updatedProfile);

    // Input Validation
    if (!updatedProfile.name.trim()) {
      setErrorMessage('Please provide an attendee name.');
      setIsLoading(false);
      return;
    }
    if (!eventDescription.trim()) {
      setErrorMessage('Please provide the event agenda or summary details.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: updatedProfile,
          eventDescription
        })
      });

      let errorMsg = 'Failed to analyze event details.';
      if (!response.ok) {
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errObj = await response.json();
            errorMsg = errObj.error || errorMsg;
          } else {
            errorMsg = `Server error (${response.status}): The backend returned an invalid non-JSON response.`;
          }
        } catch {
          errorMsg = `Server error (${response.status}): The backend returned an invalid response.`;
        }
        throw new Error(errorMsg);
      }

      let sessionData: NetworkingSession;
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          sessionData = await response.json();
        } else {
          throw new Error('Response is not JSON');
        }
      } catch {
        throw new Error('Received an invalid non-JSON response from the server. Please ensure the backend server is fully active and has finished starting.');
      }

      setCurrentSession(sessionData);
      setFeedbackSubmitted(false);
      setLikedStarters([]);
      setFeedbackComments('');
      setRating(5);
      setCompletedPrepTasks({});

      // Refresh telemetry statistics & history
      await fetchHistory();
      await fetchLogsAndMetrics();

      // Switch to playbooks dashboard
      setActiveTab('playbook');
    } catch (err: any) {
      console.error('Generation Error:', err);
      setErrorMessage(err.message || 'An error occurred while calling the Gemini API service.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- EXPORT TO PDF ---
  const handleExportPlaybookToPDF = () => {
    if (!currentSession) return;
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      let y = 52;
      const marginX = 20;
      const pageHeight = 297;
      const pageWidth = 210;
      const usableWidth = pageWidth - (2 * marginX);

      const drawPageFooter = (currentPage: number, totalPages?: number) => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        const footerText = totalPages 
          ? `Personalized Networking Assistant — Page ${currentPage} of ${totalPages}`
          : `Personalized Networking Assistant — Page ${currentPage}`;
        doc.text(footerText, pageWidth / 2, pageHeight - 10, { align: 'center' });
      };

      const checkPageOverflow = (heightNeeded: number) => {
        if (y + heightNeeded > pageHeight - 20) {
          doc.addPage();
          y = 20;
        }
      };

      // Header block on page 1
      doc.setFillColor(18, 18, 18); // Dark charcoal background for header card
      doc.rect(0, 0, pageWidth, 40, 'F');

      // Gold Accent Line
      doc.setFillColor(197, 160, 89); // Gold #c5a059
      doc.rect(0, 40, pageWidth, 2, 'F');

      // Header Text
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(255, 255, 255);
      doc.text('NETWORKING STRATEGY PLAYBOOK', marginX, 16);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(197, 160, 89);
      doc.text('SmartBridge Capstone Personalized Networking Assistant', marginX, 24);

      doc.setFontSize(8);
      doc.setTextColor(160, 160, 160);
      const timestampFormatted = new Date(currentSession.timestamp).toLocaleString();
      doc.text(`Generated on: ${timestampFormatted}`, marginX, 30);

      // Section 1: PROFILE
      checkPageOverflow(35);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(197, 160, 89);
      doc.text('1. Speaker & Presenter Profile', marginX, y);
      y += 5;

      // Thin separator
      doc.setDrawColor(230, 230, 230);
      doc.setLineWidth(0.2);
      doc.line(marginX, y, pageWidth - marginX, y);
      y += 6;

      // Details
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(40, 40, 40);
      doc.text('Presenter:', marginX, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(70, 70, 70);
      doc.text(currentSession.userProfile.name || 'N/A', marginX + 35, y);
      y += 5;

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(40, 40, 40);
      doc.text('Professional Title:', marginX, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(70, 70, 70);
      doc.text(currentSession.userProfile.role || 'N/A', marginX + 35, y);
      y += 5;

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(40, 40, 40);
      doc.text('Interests & Fields:', marginX, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(70, 70, 70);
      const interestsJoined = currentSession.userProfile.professionalInterests.join(', ') || 'N/A';
      const splitInterests = doc.splitTextToSize(interestsJoined, usableWidth - 35);
      doc.text(splitInterests, marginX + 35, y);
      y += (splitInterests.length * 4.5) + 1;

      checkPageOverflow(15);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(40, 40, 40);
      doc.text('Bonding Hobbies:', marginX, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(70, 70, 70);
      const hobbiesJoined = currentSession.userProfile.personalInterests.join(', ') || 'N/A';
      const splitHobbies = doc.splitTextToSize(hobbiesJoined, usableWidth - 35);
      doc.text(splitHobbies, marginX + 35, y);
      y += (splitHobbies.length * 4.5) + 2;

      if (currentSession.userProfile.bio) {
        checkPageOverflow(25);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(40, 40, 40);
        doc.text('Brief Biography:', marginX, y);
        y += 4.5;
        doc.setFont('helvetica', 'oblique');
        doc.setTextColor(90, 90, 90);
        const splitBio = doc.splitTextToSize(currentSession.userProfile.bio, usableWidth);
        doc.text(splitBio, marginX, y);
        y += (splitBio.length * 4.5) + 6;
      } else {
        y += 4;
      }

      // Section 2: EVENT ANALYTICS
      checkPageOverflow(30);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(197, 160, 89);
      doc.text('2. Event Analytics & Target Context', marginX, y);
      y += 5;

      doc.setDrawColor(230, 230, 230);
      doc.setLineWidth(0.2);
      doc.line(marginX, y, pageWidth - marginX, y);
      y += 6;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(40, 40, 40);
      doc.text('Extracted Event Context:', marginX, y);
      y += 4.5;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(70, 70, 70);
      const splitSummary = doc.splitTextToSize(currentSession.analyzedThemes.summary || 'N/A', usableWidth);
      doc.text(splitSummary, marginX, y);
      y += (splitSummary.length * 4.5) + 5;

      checkPageOverflow(20);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(40, 40, 40);
      doc.text('Target Industries:', marginX, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(70, 70, 70);
      doc.text(currentSession.analyzedThemes.industries.join(', ') || 'N/A', marginX + 35, y);
      y += 5;

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(40, 40, 40);
      doc.text('Target Domains/Skills:', marginX, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(70, 70, 70);
      doc.text(currentSession.analyzedThemes.skills.join(', ') || 'N/A', marginX + 35, y);
      y += 5;

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(40, 40, 40);
      doc.text('Primary Topics (Confidence):', marginX, y);
      y += 4.5;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(70, 70, 70);
      const confidenceTopics = currentSession.analyzedThemes.topics.map(t => `${t.name} (${(t.confidence * 100).toFixed(0)}%)`).join(', ');
      const splitTopics = doc.splitTextToSize(confidenceTopics, usableWidth);
      doc.text(splitTopics, marginX, y);
      y += (splitTopics.length * 4.5) + 6;

      // Section 3: 10 CONVERSATION STARTERS
      checkPageOverflow(30);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(197, 160, 89);
      doc.text('3. Ten Customized Strategic Icebreakers', marginX, y);
      y += 5;

      doc.setDrawColor(230, 230, 230);
      doc.setLineWidth(0.2);
      doc.line(marginX, y, pageWidth - marginX, y);
      y += 6;

      currentSession.starters.forEach((starter, index) => {
        const catBadge = starter.category ? `[${starter.category.toUpperCase()}]` : '[CONVERSATION]';
        const titleText = `${index + 1}. ${catBadge} ${starter.title || 'Icebreaker'}`;
        const phraseText = `"${starter.text}"`;
        const adviceText = `Strategy: ${starter.whyItWorks || 'N/A'}`;

        const splitTitle = doc.splitTextToSize(titleText, usableWidth);
        const splitPhrase = doc.splitTextToSize(phraseText, usableWidth - 10);
        const splitAdvice = doc.splitTextToSize(adviceText, usableWidth);

        // Calculate card height dynamically
        const cardHeight = (splitTitle.length * 4.5) + (splitPhrase.length * 4.5) + (splitAdvice.length * 4) + 12;
        checkPageOverflow(cardHeight);

        // Draw light background card
        doc.setFillColor(248, 248, 248);
        doc.setDrawColor(235, 235, 235);
        doc.roundedRect(marginX - 2, y - 1, usableWidth + 4, cardHeight - 3, 1.5, 1.5, 'FD');

        // Draw side gold marker strip
        doc.setFillColor(197, 160, 89);
        doc.rect(marginX - 2, y - 1, 1, cardHeight - 3, 'F');

        // Title text
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(40, 40, 40);
        doc.text(splitTitle, marginX, y + 3.5);
        y += (splitTitle.length * 4.5) + 3.5;

        // Conversation Line Text in serif italics
        doc.setFont('times', 'italic');
        doc.setFontSize(10.5);
        doc.setTextColor(10, 10, 10);
        doc.text(splitPhrase, marginX + 4, y + 2);
        y += (splitPhrase.length * 4.5) + 3.5;

        // Tactical logic why it works
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(110, 110, 110);
        doc.text(splitAdvice, marginX, y + 1.5);
        y += (splitAdvice.length * 4) + 6;
      });

      y += 3;

      // Section 4: ELEVATOR PITCHES
      checkPageOverflow(30);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(197, 160, 89);
      doc.text('4. Context-Specific Elevator Introductions', marginX, y);
      y += 5;

      doc.setDrawColor(230, 230, 230);
      doc.setLineWidth(0.2);
      doc.line(marginX, y, pageWidth - marginX, y);
      y += 6;

      currentSession.elevatorPitches.forEach((pitch, index) => {
        const titleText = `${index + 1}. Scenario: ${pitch.title || 'General'}`;
        const bodyText = `"${pitch.text}"`;
        const whenText = `When to Use: ${pitch.whenToUse || 'N/A'}`;

        const splitTitle = doc.splitTextToSize(titleText, usableWidth);
        const splitBody = doc.splitTextToSize(bodyText, usableWidth - 10);
        const splitWhen = doc.splitTextToSize(whenText, usableWidth);

        const cardHeight = (splitTitle.length * 4.5) + (splitBody.length * 4.5) + (splitWhen.length * 4) + 12;
        checkPageOverflow(cardHeight);

        // Draw light background card
        doc.setFillColor(248, 248, 248);
        doc.setDrawColor(235, 235, 235);
        doc.roundedRect(marginX - 2, y - 1, usableWidth + 4, cardHeight - 3, 1.5, 1.5, 'FD');

        // Draw side gold marker strip
        doc.setFillColor(197, 160, 89);
        doc.rect(marginX - 2, y - 1, 1, cardHeight - 3, 'F');

        // Title
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(40, 40, 40);
        doc.text(splitTitle, marginX, y + 3.5);
        y += (splitTitle.length * 4.5) + 3.5;

        // Body Text
        doc.setFont('times', 'italic');
        doc.setFontSize(10.5);
        doc.setTextColor(10, 10, 10);
        doc.text(splitBody, marginX + 4, y + 2);
        y += (splitBody.length * 4.5) + 3.5;

        // When to use
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(110, 110, 110);
        doc.text(splitWhen, marginX, y + 1.5);
        y += (splitWhen.length * 4) + 6;
      });

      y += 3;

      // Section 5: TIPS
      checkPageOverflow(30);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(197, 160, 89);
      doc.text('5. Tactical Delivery & Presentation Guidelines', marginX, y);
      y += 5;

      doc.setDrawColor(230, 230, 230);
      doc.setLineWidth(0.2);
      doc.line(marginX, y, pageWidth - marginX, y);
      y += 6;

      currentSession.tips.forEach((tip, idx) => {
        const bulletText = `${idx + 1}. ${tip}`;
        const splitBullet = doc.splitTextToSize(bulletText, usableWidth);
        checkPageOverflow(splitBullet.length * 4.5 + 3);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(60, 60, 60);
        doc.text(splitBullet, marginX, y);
        y += (splitBullet.length * 4.5) + 3;
      });

      // Retroactive page footers with total pages
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        drawPageFooter(i, totalPages);
      }

      // Download
      const sanitizeName = (currentSession.userProfile.name || 'Presenter').trim().replace(/\s+/g, '_');
      const filename = `Networking_Strategy_${sanitizeName}.pdf`;
      doc.save(filename);

      // Trigger temporary toast notification
      setPdfToast(`"${filename}" has been successfully generated and downloaded!`);
      setTimeout(() => {
        setPdfToast((prev) => (prev && prev.includes(filename) ? null : prev));
      }, 4500);
    } catch (pdfErr) {
      console.error('PDF Export Error:', pdfErr);
      alert('An error occurred while compiling and generating the PDF document.');
    }
  };

  // --- EXPORT TO ICS (iCALENDAR) ---
  const handleExportPrepToICS = () => {
    if (!currentSession) return;
    try {
      // Get the list of tasks
      const tasks = currentSession.prepChecklist && currentSession.prepChecklist.length > 0
        ? currentSession.prepChecklist
        : [
            { id: 'fallback-1', task: 'Update LinkedIn profile headline and experience details' },
            { id: 'fallback-2', task: 'Review key speakers and event topics: ' + (currentSession.analyzedThemes.topics[0]?.name || 'relevant domains') },
            { id: 'fallback-3', task: 'Rehearse your Academic/Project or Business elevator pitches' },
            { id: 'fallback-4', task: 'Review tactical icebreaker starters to use during coffee breaks' },
          ];

      // Create standard iCalendar format
      let icsLines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//SmartBridge//Personalized Networking Assistant//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH'
      ];

      // Dates: let's start from current date/time and space them out logically
      const now = new Date();
      
      const formatICSDate = (date: Date) => {
        const pad = (n: number) => n.toString().padStart(2, '0');
        return [
          date.getUTCFullYear(),
          pad(date.getUTCMonth() + 1),
          pad(date.getUTCDate()),
          'T',
          pad(date.getUTCHours()),
          pad(date.getUTCMinutes()),
          pad(date.getUTCSeconds()),
          'Z'
        ].join('');
      };

      // Spacing out prep tasks: task 1 tomorrow, task 2 day after, etc.
      tasks.forEach((item, index) => {
        const taskDateStart = new Date(now);
        taskDateStart.setDate(now.getDate() + index + 1);
        taskDateStart.setHours(9, 0, 0, 0); // 9:00 AM local time

        const taskDateEnd = new Date(taskDateStart);
        taskDateEnd.setMinutes(30); // 30 mins

        const eventId = `task-${currentSession.id}-${item.id}`;
        const sanitizedSummary = item.task.length > 65 ? item.task.substring(0, 62) + '...' : item.task;
        
        let description = `Networking Preparation Task:\n- ${item.task}\n\nGenerated via your Personalized Networking Assistant.`;

        icsLines.push('BEGIN:VEVENT');
        icsLines.push(`UID:${eventId}`);
        icsLines.push(`DTSTAMP:${formatICSDate(now)}`);
        icsLines.push(`DTSTART:${formatICSDate(taskDateStart)}`);
        icsLines.push(`DTEND:${formatICSDate(taskDateEnd)}`);
        icsLines.push(`SUMMARY:Prep: ${sanitizedSummary.replace(/[,;]/g, '\\$&')}`);
        icsLines.push(`DESCRIPTION:${description.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n')}`);
        icsLines.push('STATUS:CONFIRMED');
        icsLines.push('SEQUENCE:0');
        icsLines.push('END:VEVENT');
      });

      // Also add the MAIN Networking Event itself!
      const mainEventStart = new Date(now);
      mainEventStart.setDate(now.getDate() + tasks.length + 1);
      mainEventStart.setHours(14, 0, 0, 0); // 2:00 PM local time
      
      const mainEventEnd = new Date(mainEventStart);
      mainEventEnd.setHours(17, 0, 0, 0); // 5:00 PM local time (3 hours duration)

      const mainEventId = `event-${currentSession.id}`;
      const eventTitle = currentSession.eventDescription.split('\n')[0] || 'Networking Event';
      const mainSummary = eventTitle.length > 60 ? eventTitle.substring(0, 57) + '...' : eventTitle;
      const mainDescription = `Your Personalized Strategic Networking Event:\n\n${currentSession.eventDescription}\n\nPowered by your Capstone Networking Assistant.`;

      icsLines.push('BEGIN:VEVENT');
      icsLines.push(`UID:${mainEventId}`);
      icsLines.push(`DTSTAMP:${formatICSDate(now)}`);
      icsLines.push(`DTSTART:${formatICSDate(mainEventStart)}`);
      icsLines.push(`DTEND:${formatICSDate(mainEventEnd)}`);
      icsLines.push(`SUMMARY:Networking Event: ${mainSummary.replace(/[,;]/g, '\\$&')}`);
      icsLines.push(`DESCRIPTION:${mainDescription.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n')}`);
      icsLines.push('STATUS:CONFIRMED');
      icsLines.push('SEQUENCE:0');
      icsLines.push('END:VEVENT');

      icsLines.push('END:VCALENDAR');

      const icsString = icsLines.join('\r\n');
      const blob = new Blob([icsString], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      
      const sanitizeName = (currentSession.userProfile.name || 'Presenter').trim().replace(/\s+/g, '_');
      const filename = `Networking_Schedule_${sanitizeName}.ics`;
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Trigger temporary toast notification
      setPdfToast(`"${filename}" has been successfully generated and downloaded!`);
      setTimeout(() => {
        setPdfToast((prev) => (prev && prev.includes(filename) ? null : prev));
      }, 4500);
    } catch (icsErr) {
      console.error('ICS Export Error:', icsErr);
      alert('An error occurred while compiling and generating the .ics schedule file.');
    }
  };

  // --- GOOGLE CALENDAR WEB LINK GENERATOR ---
  const getGoogleCalendarUrl = () => {
    if (!currentSession) return '';
    try {
      const eventTitle = currentSession.eventDescription.split('\n')[0] || 'Networking Event';
      const mainSummary = `Networking Event: ${eventTitle}`;
      const mainDescription = `Your Personalized Strategic Networking Event:\n\n${currentSession.eventDescription}\n\nPowered by your Capstone Networking Assistant.`;

      const now = new Date();
      const tasksCount = currentSession.prepChecklist?.length || 4;
      
      const startEvent = new Date(now);
      startEvent.setDate(now.getDate() + tasksCount + 1);
      startEvent.setHours(14, 0, 0, 0);

      const endEvent = new Date(startEvent);
      endEvent.setHours(17, 0, 0, 0);

      const formatDateGoogle = (date: Date) => {
        const pad = (n: number) => n.toString().padStart(2, '0');
        return [
          date.getUTCFullYear(),
          pad(date.getUTCMonth() + 1),
          pad(date.getUTCDate()),
          'T',
          pad(date.getUTCHours()),
          pad(date.getUTCMinutes()),
          pad(date.getUTCSeconds()),
          'Z'
        ].join('');
      };

      return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(mainSummary)}&dates=${formatDateGoogle(startEvent)}/${formatDateGoogle(endEvent)}&details=${encodeURIComponent(mainDescription)}`;
    } catch (e) {
      console.error('Failed to generate Google Calendar URL', e);
      return '';
    }
  };

  // --- FACT VERIFICATION ENGINE ---
  const handleVerifyClaim = async (e?: React.FormEvent, claimText?: string) => {
    if (e) e.preventDefault();
    const targetQuery = (claimText || factQuery).trim();
    if (!targetQuery) return;

    setIsCheckingFact(true);
    try {
      const response = await fetch('/api/factcheck', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: targetQuery })
      });

      if (!response.ok) {
        throw new Error(`Wikipedia Factcheck endpoint error (Status: ${response.status})`);
      }

      let verifiedFact: FactCheck;
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          verifiedFact = await response.json();
        } else {
          throw new Error('Response is not JSON');
        }
      } catch {
        throw new Error('Received an invalid non-JSON response from the Wikipedia fact-checking endpoint.');
      }

      // Unshift to the local list so the newest verification is at the top
      setFactCheckResults((prev) => [verifiedFact, ...prev]);
      if (!claimText) setFactQuery('');

      await fetchLogsAndMetrics();
    } catch (err: any) {
      console.error('Fact verification error', err);
      alert(err.message || 'Failed to connect to the Wikipedia Fact-checking API.');
    } finally {
      setIsCheckingFact(false);
    }
  };

  // --- FEEDBACK MANAGEMENT ---
  const handleToggleLikeStarter = (text: string) => {
    setLikedStarters((prev) =>
      prev.includes(text) ? prev.filter((t) => t !== text) : [...prev, text]
    );
  };

  const handleSubmitFeedback = async () => {
    if (!currentSession) return;
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: currentSession.id,
          rating,
          comments: feedbackComments,
          likedStarters
        })
      });

      if (response.ok) {
        setFeedbackSubmitted(true);
        await fetchHistory();
        await fetchLogsAndMetrics();
      }
    } catch (err) {
      console.error('Failed to submit session feedback', err);
    }
  };

  // --- HISTORICAL SESSIONS WORKFLOWS ---
  const handleDeleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid loading the session
    if (!confirm('Are you sure you want to delete this historical networking session?')) return;

    try {
      const response = await fetch(`/api/history/${id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        if (currentSession && currentSession.id === id) {
          setCurrentSession(null);
        }
        await fetchHistory();
        await fetchLogsAndMetrics();
      }
    } catch (err) {
      console.error('Failed to delete history item', err);
    }
  };

  const handleSelectHistorySession = (session: NetworkingSession) => {
    setCurrentSession(session);
    setProfile({ ...session.userProfile });
    setEventDescription(session.eventDescription);
    setFeedbackSubmitted(!!session.feedback);
    if (session.feedback) {
      setRating(session.feedback.rating);
      setFeedbackComments(session.feedback.comments);
      setLikedStarters(session.feedback.likedStarters);
    } else {
      setLikedStarters([]);
      setFeedbackComments('');
      setRating(5);
    }
    setCompletedPrepTasks({});
    setActiveTab('playbook');
  };

  // Filter history items by search query
  const filteredHistory = historySessions.filter((s) => {
    const term = historySearchQuery.toLowerCase();
    return (
      s.userProfile.name.toLowerCase().includes(term) ||
      s.userProfile.role.toLowerCase().includes(term) ||
      s.eventDescription.toLowerCase().includes(term) ||
      s.analyzedThemes.summary.toLowerCase().includes(term)
    );
  });

  // Helper colors for fact verification status
  const getStatusBadgeStyles = (status: string) => {
    switch (status) {
      case 'Verified':
        return 'bg-gold/15 text-gold border border-gold/30';
      case 'Partially Verified':
        return 'bg-amber-500/15 text-amber-400 border border-amber-500/30';
      case 'Disputed':
        return 'bg-rose-500/15 text-rose-400 border border-rose-500/30';
      default:
        return 'bg-slate-500/15 text-slate-400 border border-slate-500/30';
    }
  };

  return (
    <div className="min-h-screen bg-[#080808] font-sans text-slate-300 pb-20 md:pb-0" id="networking-assistant-app">
      {/* HEADER SECTION */}
      <header className="border-b border-white/5 bg-[#121212]/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-[#c5a059] p-2.5 rounded-xl shadow-lg shadow-gold/10">
              <Sparkles className="h-6 w-6 text-black" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-display font-medium text-white tracking-tight flex items-center gap-2">
                Personalized <span className="text-[#c5a059]">Networking</span> Assistant
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-gold/10 text-gold border border-gold/30">
                  v2.5 Capstone
                </span>
              </h1>
              <p className="text-xs text-slate-400">AI-Powered Event Analytics, Starters & Fact-Verification</p>
            </div>
          </div>

          {/* Quick Demo Presets */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-mono flex items-center gap-1">
              <Info className="h-3.5 w-3.5" /> 1-Click Presenter Presets:
            </span>
            {PRESET_PROFILES.map((preset, index) => (
              <button
                key={index}
                onClick={() => loadPreset(preset)}
                className="text-xs px-3 py-1.5 rounded-lg border border-white/5 bg-[#1a1a1a] text-slate-300 hover:bg-[#222] hover:border-gold/40 hover:text-gold transition-all font-medium flex items-center gap-1 cursor-pointer"
              >
                <User className="h-3 w-3 text-gold" />
                {preset.profile.name}
              </button>
            ))}

            <div className="h-4 w-[1px] bg-white/10 mx-1 hidden sm:block" />

            <button
              onClick={handleStartTour}
              className="text-xs px-3 py-1.5 rounded-lg border border-gold/25 bg-gold/5 text-gold hover:bg-gold/10 hover:border-gold/40 transition-all font-medium flex items-center gap-1.5 cursor-pointer shadow-sm shadow-gold-950/20"
              title="Take a quick tour of the Personalized Networking Assistant layout and features"
            >
              <Compass className="h-3.5 w-3.5 text-[#c5a059]" />
              <span>Restart Tour</span>
            </button>

            <button
              onClick={handleClearAllData}
              className="text-xs px-3 py-1.5 rounded-lg border border-rose-500/25 bg-rose-500/5 text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/40 transition-all font-medium flex items-center gap-1.5 cursor-pointer shadow-sm shadow-rose-950/20"
              title="Permanently clear session history, logs, current profile, and reset preferences"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear All Data</span>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: ATTENDEE PROFILE & EVENT SETUP (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* PROFILE FORM CARD */}
          <div 
            id="profile-card" 
            className={`bg-[#121212] rounded-2xl p-5 shadow-2xl shadow-black/80 relative transition-all duration-300 ${
              showTour && tourStep === 0 
                ? 'ring-2 ring-[#c5a059] shadow-[0_0_25px_rgba(197,160,89,0.45)] scale-[1.01] z-50 bg-[#171717]' 
                : 'border border-white/5'
            }`}
          >
            <div className="flex items-center justify-between border-b border-white/5 pb-3.5 mb-4">
              <h2 className="text-lg font-display font-medium text-white tracking-wide flex items-center gap-2">
                <User className="h-4 w-4 text-[#c5a059]" /> Professional Presenter Profile
              </h2>
              <div className="h-2 w-2 rounded-full bg-[#c5a059] shadow-sm shadow-gold/50" />
            </div>

            <div className="space-y-4">
              {/* Name & Title */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-medium font-mono mb-1">Speaker Name *</label>
                  <input
                    type="text"
                    value={profile.name}
                    onChange={(e) => setProfile((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-[#0a0a0a] border border-white/10 focus-gold focus:border-gold/50 rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-700 focus:outline-none transition-all"
                    placeholder="Varun Kumar"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-medium font-mono mb-1">Current Role / Title</label>
                  <input
                    type="text"
                    value={profile.role}
                    onChange={(e) => setProfile((prev) => ({ ...prev, role: e.target.value }))}
                    className="w-full bg-[#0a0a0a] border border-white/10 focus-gold focus:border-gold/50 rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-700 focus:outline-none transition-all"
                    placeholder="SaaS Product Manager"
                  />
                </div>
              </div>

              {/* Professional Interests Tags */}
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-medium font-mono mb-1">
                  Professional Interests & Fields
                </label>
                <form onSubmit={handleAddProfessionalInterest} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={currentProfessionalInterest}
                    onChange={(e) => setCurrentProfessionalInterest(e.target.value)}
                    className="flex-1 bg-[#0a0a0a] border border-white/10 focus-gold focus:border-gold/50 rounded-xl px-3 py-1.5 text-xs text-slate-200 placeholder-slate-700 focus:outline-none"
                    placeholder="Add field (e.g. Deep Learning)"
                  />
                  <button
                    type="submit"
                    className="bg-gold/15 hover:bg-gold/25 border border-gold/30 text-gold hover:text-gold-light rounded-xl px-3 py-1.5 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <Plus className="h-3 w-3" /> Add
                  </button>
                </form>

                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                  {profile.professionalInterests.length === 0 ? (
                    <span className="text-xs text-slate-600 italic">No professional interests added.</span>
                  ) : (
                    profile.professionalInterests.map((tag, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-md bg-gold/5 text-gold border border-gold/20"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeProfessionalInterest(tag)}
                          className="hover:text-rose-400 focus:outline-none cursor-pointer"
                        >
                          &times;
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </div>

              {/* Personal Interests & Hobbies */}
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-medium font-mono mb-1">
                  Personal Hobbies / Bonding Topics
                </label>
                <form onSubmit={handleAddPersonalInterest} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={currentPersonalInterest}
                    onChange={(e) => setCurrentPersonalInterest(e.target.value)}
                    className="flex-1 bg-[#0a0a0a] border border-white/10 focus-gold focus:border-gold/50 rounded-xl px-3 py-1.5 text-xs text-slate-200 placeholder-slate-700 focus:outline-none"
                    placeholder="Add hobby (e.g. Espresso Brewing)"
                  />
                  <button
                    type="submit"
                    className="bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white rounded-xl px-3 py-1.5 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <Plus className="h-3 w-3" /> Add
                  </button>
                </form>

                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                  {profile.personalInterests.length === 0 ? (
                    <span className="text-xs text-slate-600 italic">No personal interests added.</span>
                  ) : (
                    profile.personalInterests.map((tag, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-md bg-white/5 text-slate-300 border border-white/10"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removePersonalInterest(tag)}
                          className="hover:text-rose-400 focus:outline-none cursor-pointer"
                        >
                          &times;
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </div>

              {/* Biography Block */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-medium font-mono">Professional Biography</label>
                  <button
                    onClick={toggleProfileSpeech}
                    type="button"
                    className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg transition-all border cursor-pointer ${
                      isProfileRecording
                        ? 'bg-[#c5a059]/20 text-gold-light border-gold/50 animate-pulse-ring'
                        : 'bg-[#1a1a1a] hover:bg-[#222] text-slate-300 border-white/5'
                    }`}
                  >
                    {isProfileRecording ? (
                      <>
                        <MicOff className="h-3.5 w-3.5 text-rose-400" />
                        <span>Stop Dictating</span>
                        <AudioVolumeVisualizer stream={profileStream} isActive={isProfileRecording} />
                      </>
                    ) : (
                      <>
                        <Mic className="h-3.5 w-3.5 text-[#c5a059]" />
                        <span>Dictate Bio</span>
                      </>
                    )}
                  </button>
                </div>
                <textarea
                  value={profile.bio}
                  onChange={(e) => setProfile((prev) => ({ ...prev, bio: e.target.value }))}
                  className="w-full bg-[#0a0a0a] border border-white/10 focus-gold focus:border-gold/50 rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-700 focus:outline-none transition-all h-24 resize-none"
                  placeholder="Tell us about yourself, your background, projects, or goals..."
                />
              </div>
            </div>
          </div>

          {/* EVENT DETAILS DETAILS CARD */}
          <div className="bg-[#121212] border border-white/5 rounded-2xl p-5 shadow-2xl shadow-black/80 relative">
            <div className="flex items-center justify-between border-b border-white/5 pb-3.5 mb-4">
              <h2 className="text-lg font-display font-medium text-white tracking-wide flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[#c5a059]" /> Event Agenda & Description
              </h2>
              <div className="h-2 w-2 rounded-full bg-gold shadow-sm shadow-gold/50" />
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-medium font-mono">Event Agendas / Key Sessions *</label>
                  <button
                    onClick={toggleEventSpeech}
                    type="button"
                    className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg transition-all border cursor-pointer ${
                      isEventRecording
                        ? 'bg-[#c5a059]/20 text-gold-light border-gold/50 animate-pulse-ring'
                        : 'bg-[#1a1a1a] hover:bg-[#222] text-slate-300 border-white/5'
                    }`}
                  >
                    {isEventRecording ? (
                      <>
                        <MicOff className="h-3.5 w-3.5 text-rose-400" />
                        <span>Stop Dictating</span>
                        <AudioVolumeVisualizer stream={eventStream} isActive={isEventRecording} />
                      </>
                    ) : (
                      <>
                        <Mic className="h-3.5 w-3.5 text-gold" />
                        <span>Dictate Details</span>
                      </>
                    )}
                  </button>
                </div>
                <textarea
                  value={eventDescription}
                  onChange={(e) => setEventDescription(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-white/10 focus-gold focus:border-gold/50 rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-700 focus:outline-none transition-all h-28 resize-none"
                  placeholder="Paste the conference website description, session timeline, panels, or agenda topics here..."
                />
              </div>

              {errorMessage && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* GENERATE SUBMISSION BUTTON */}
              <button
                onClick={handleGenerateStrategy}
                disabled={isLoading}
                className="w-full bg-[#c5a059] hover:bg-[#b08c46] disabled:bg-gold-dark text-black font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-gold/5 hover:shadow-gold/15 transition-all text-xs font-mono uppercase tracking-widest flex items-center justify-center gap-2 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin text-black" />
                    <span>Processing High-Speed Capstone Pipeline...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 text-black animate-pulse" />
                    <span>Analyze & Generate Strategy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* QUICK INSIGHTS CARD */}
          <div className="bg-[#121212] border border-white/5 rounded-2xl p-5 shadow-2xl shadow-black/80 relative">
            <div className="flex items-center justify-between border-b border-white/5 pb-3.5 mb-4">
              <h2 className="text-sm font-display font-medium text-white tracking-wide flex items-center gap-2">
                <Target className="h-4 w-4 text-[#c5a059]" /> Quick Insights Cheat Sheet
              </h2>
              <div className="h-2 w-2 rounded-full bg-gold/50" />
            </div>
            
            {!currentSession ? (
              <div className="text-center py-6 px-4 border border-dashed border-white/10 rounded-xl bg-[#0a0a0a]">
                <Sparkles className="h-5 w-5 text-slate-600 mx-auto mb-2 animate-pulse" />
                <h4 className="text-[11px] font-semibold text-slate-400 font-mono uppercase tracking-wider mb-1">Awaiting Playbook</h4>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Generate a strategic playbook to view your personalized top 3 networking goals and tactical action plans.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-gold/5 border border-gold/15 rounded-xl p-3 mb-1">
                  <p className="text-[10px] uppercase font-mono tracking-wider text-[#c5a059] font-semibold">Gemini Live Coach</p>
                  <p className="text-[11px] text-slate-300 leading-relaxed mt-1">
                    Based on your profile and event context, here is your high-level networking cheat sheet:
                  </p>
                </div>
                
                {currentSession.quickInsights && currentSession.quickInsights.length > 0 ? (
                  <div className="space-y-3.5">
                    {currentSession.quickInsights.map((insight, idx) => (
                      <div key={idx} className="relative pl-4 border-l border-gold/40 hover:border-gold transition-colors py-0.5">
                        <div className="absolute left-[-4.5px] top-1.5 h-2 w-2 rounded-full bg-[#c5a059]" />
                        <h4 className="text-xs font-semibold text-white tracking-wide font-mono uppercase mb-0.5">
                          Goal {idx + 1}: {insight.goal}
                        </h4>
                        <p className="text-[11px] text-slate-300 leading-relaxed mb-1">
                          <span className="text-[#c5a059] font-medium font-mono text-[10px] uppercase mr-1">Tactic:</span>
                          {insight.tactic}
                        </p>
                        <p className="text-[10px] text-slate-400 italic leading-relaxed">
                          <span className="font-mono text-[9px] uppercase mr-1 text-slate-500">Relevance:</span>
                          {insight.relevance}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {[
                      {
                        goal: "Connect with event organizers/speakers on topics in " + (currentSession.analyzedThemes.topics[0]?.name || "this domain"),
                        tactic: "Approach after the main session to ask how their findings impact standard workflows.",
                        relevance: "Leverages the core focus of the event and positions you as an active learner."
                      },
                      {
                        goal: "Exchange contact information with at least 2 peers in " + (currentSession.analyzedThemes.industries[0] || "the sector"),
                        tactic: "Use your customized 'Mutual Interest' icebreakers relating to " + (currentSession.userProfile.personalInterests[0] || "your hobbies"),
                        relevance: "Deepens your network with colleagues sharing overlapping professional interests."
                      },
                      {
                        goal: "Validate key concepts around " + (currentSession.analyzedThemes.skills[0] || "related technologies"),
                        tactic: "Use the Local Fact Verification module to audit details and ask high-context technical questions.",
                        relevance: "Establishes technical credibility and helps you stand out in panel discussions."
                      }
                    ].map((insight, idx) => (
                      <div key={idx} className="relative pl-4 border-l border-gold/30 hover:border-gold transition-colors py-0.5">
                        <div className="absolute left-[-4.5px] top-1.5 h-2 w-2 rounded-full bg-[#c5a059]" />
                        <h4 className="text-xs font-semibold text-white tracking-wide font-mono uppercase mb-0.5">
                          Goal {idx + 1}: {insight.goal}
                        </h4>
                        <p className="text-[11px] text-slate-300 leading-relaxed mb-1">
                          <span className="text-[#c5a059] font-medium font-mono text-[10px] uppercase mr-1">Tactic:</span>
                          {insight.tactic}
                        </p>
                        <p className="text-[10px] text-slate-400 italic leading-relaxed">
                          <span className="font-mono text-[9px] uppercase mr-1 text-slate-500">Relevance:</span>
                          {insight.relevance}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* NETWORKING PREP CHECKLIST */}
                <div className="border-t border-white/5 pt-4 mt-4">
                  <div className="flex items-center justify-between mb-2.5">
                    <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#c5a059] flex items-center gap-2">
                      <CheckSquare className="h-4 w-4 text-[#c5a059]" /> Networking Prep Checklist
                    </h3>
                    {currentSession && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={handleExportPrepToICS}
                          className="text-[10px] font-mono font-semibold uppercase tracking-wider text-[#c5a059] hover:text-white transition-all flex items-center gap-1.5 cursor-pointer bg-white/5 hover:bg-white/10 px-2 py-1 rounded border border-white/5"
                          title="Download .ics file to import these schedule items into Google Calendar or Outlook"
                        >
                          <Calendar className="h-3 w-3" />
                          <span>Export ICS</span>
                        </button>
                        <a
                          href={getGoogleCalendarUrl()}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] font-mono font-semibold uppercase tracking-wider text-blue-400 hover:text-blue-300 transition-all flex items-center gap-1.5 cursor-pointer bg-blue-500/5 hover:bg-blue-500/10 px-2 py-1 rounded border border-blue-500/10"
                          title="Add this event to your Google Calendar (Web Link)"
                        >
                          <span className="font-bold text-blue-500 text-[9px]">G</span>
                          <span>Google Cal</span>
                        </a>
                      </div>
                    )}
                  </div>
                  
                  {currentSession.prepChecklist && currentSession.prepChecklist.length > 0 ? (
                    <div className="space-y-2">
                      {currentSession.prepChecklist.map((task) => {
                        const isDone = !!completedPrepTasks[task.id];
                        return (
                          <div 
                            key={task.id} 
                            onClick={() => handleTogglePrepTask(task.id)}
                            className={`flex items-start gap-2.5 p-2 rounded-xl border transition-all cursor-pointer select-none ${
                              isDone 
                                ? 'bg-gold/5 border-gold/20 text-slate-400' 
                                : 'bg-[#0a0a0a] border-white/5 hover:border-white/10 text-slate-200'
                            }`}
                          >
                            <div className="mt-0.5 shrink-0">
                              <div className={`h-4 w-4 rounded border flex items-center justify-center transition-all ${
                                isDone 
                                  ? 'bg-[#c5a059] border-[#c5a059] text-black' 
                                  : 'border-white/20 bg-transparent'
                              }`}>
                                {isDone && <Check className="h-3 w-3 stroke-[3]" />}
                              </div>
                            </div>
                            <span className={`text-[11px] leading-relaxed transition-all ${
                              isDone ? 'line-through text-slate-500' : ''
                            }`}>
                              {task.task}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {[
                        { id: 'fallback-1', task: 'Update LinkedIn profile headline and experience details' },
                        { id: 'fallback-2', task: 'Review key speakers and event topics: ' + (currentSession.analyzedThemes.topics[0]?.name || 'relevant domains') },
                        { id: 'fallback-3', task: 'Rehearse your Academic/Project or Business elevator pitches' },
                        { id: 'fallback-4', task: 'Review tactical icebreaker starters to use during coffee breaks' },
                      ].map((task) => {
                        const isDone = !!completedPrepTasks[task.id];
                        return (
                          <div 
                            key={task.id} 
                            onClick={() => handleTogglePrepTask(task.id)}
                            className={`flex items-start gap-2.5 p-2 rounded-xl border transition-all cursor-pointer select-none ${
                              isDone 
                                ? 'bg-gold/5 border-gold/20 text-slate-400' 
                                : 'bg-[#0a0a0a] border-white/5 hover:border-white/10 text-slate-200'
                            }`}
                          >
                            <div className="mt-0.5 shrink-0">
                              <div className={`h-4 w-4 rounded border flex items-center justify-center transition-all ${
                                isDone 
                                  ? 'bg-[#c5a059] border-[#c5a059] text-black' 
                                  : 'border-white/20 bg-transparent'
                              }`}>
                                {isDone && <Check className="h-3 w-3 stroke-[3]" />}
                              </div>
                            </div>
                            <span className={`text-[11px] leading-relaxed transition-all ${
                              isDone ? 'line-through text-slate-500' : ''
                            }`}>
                              {task.task}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* NOTIFICATION PREFERENCES */}
                <div className="border-t border-white/5 pt-4 mt-4">
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#c5a059] flex items-center justify-between mb-2.5">
                    <span className="flex items-center gap-2">
                      <Bell className="h-4 w-4 text-[#c5a059]" /> Notification Preferences
                    </span>
                  </h3>

                  <div className="space-y-3 bg-[#0a0a0a]/50 p-3 rounded-xl border border-white/5">
                    <p className="text-[10px] text-slate-400 font-sans leading-relaxed">
                      Toggle reminders to review your active playbook before scheduled networking events.
                    </p>

                    <div className="space-y-2 pt-1">
                      {/* Email Reminders Toggle */}
                      <label className="flex items-center justify-between cursor-pointer group select-none">
                        <span className="text-[11px] text-slate-300 group-hover:text-white transition-all">
                          Daily Email Reminders
                        </span>
                        <div className="relative">
                          <input 
                            type="checkbox" 
                            checked={emailReminders} 
                            onChange={handleToggleEmailReminders}
                            className="sr-only"
                          />
                          <div className={`w-8 h-4 rounded-full transition-all ${emailReminders ? 'bg-[#c5a059]' : 'bg-white/10'}`}></div>
                          <div className={`absolute top-0.5 left-0.5 bg-black w-3 h-3 rounded-full transition-all ${emailReminders ? 'transform translate-x-4 bg-black' : 'bg-slate-400'}`}></div>
                        </div>
                      </label>

                      {/* Push Notification Toggle */}
                      <label className="flex items-center justify-between cursor-pointer group select-none">
                        <span className="text-[11px] text-slate-300 group-hover:text-white transition-all">
                          Push Notification Reminders
                        </span>
                        <div className="relative">
                          <input 
                            type="checkbox" 
                            checked={pushReminders} 
                            onChange={handleTogglePushReminders}
                            className="sr-only"
                          />
                          <div className={`w-8 h-4 rounded-full transition-all ${pushReminders ? 'bg-[#c5a059]' : 'bg-white/10'}`}></div>
                          <div className={`absolute top-0.5 left-0.5 bg-black w-3 h-3 rounded-full transition-all ${pushReminders ? 'transform translate-x-4 bg-black' : 'bg-slate-400'}`}></div>
                        </div>
                      </label>
                    </div>

                    {/* Notification Toast Message */}
                    {notificationSuccessMsg && (
                      <div className="mt-2 text-[10px] font-mono text-center text-[#c5a059] bg-[#c5a059]/5 border border-[#c5a059]/10 rounded py-1 px-2 animate-pulse">
                        {notificationSuccessMsg}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: ANALYTICS & STRATEGIC OUTPUT (7 cols) */}
        <div className="lg:col-span-7 flex flex-col space-y-6">
          
          {/* NAVIGATION TABS RAIL */}
          <div 
            id="networking-strategy-dashboard" 
            className={`bg-[#121212] rounded-xl p-1.5 flex gap-1 shadow-md transition-all duration-300 ${
              showTour && (tourStep === 1 || tourStep === 2) 
                ? 'ring-2 ring-[#c5a059] shadow-[0_0_25px_rgba(197,160,89,0.45)] scale-[1.01] z-50 bg-[#171717]' 
                : 'border border-white/5'
            }`}
          >
            <button
              onClick={() => setActiveTab('playbook')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'playbook'
                  ? 'bg-[#c5a059] text-black font-bold shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Strategy Playbook</span>
            </button>
            <button
              onClick={() => setActiveTab('factcheck')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'factcheck'
                  ? 'bg-[#c5a059] text-black font-bold shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Search className="h-3.5 w-3.5" />
              <span>Fact Verification</span>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-[#c5a059] text-black font-bold shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <History className="h-3.5 w-3.5" />
              <span>Saved Sessions</span>
            </button>
            <button
              onClick={() => setActiveTab('metrics')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'metrics'
                  ? 'bg-[#c5a059] text-black font-bold shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <BarChart2 className="h-3.5 w-3.5" />
              <span>Metrics & Logs</span>
            </button>
          </div>

          {/* TAB 1: STRATEGY PLAYBOOK DISPLAY */}
          <div className="flex-1 bg-[#121212] border border-white/5 rounded-2xl p-5 md:p-6 shadow-2xl relative min-h-[500px] flex flex-col">
            
            {/* If loading fallback */}
            {isLoading && (
              <div className="absolute inset-0 bg-[#080808]/90 rounded-2xl backdrop-blur-sm z-45 flex flex-col items-center justify-center p-6 text-center">
                <div className="relative mb-6">
                  <div className="h-16 w-16 rounded-full border-4 border-white/10 border-t-[#c5a059] animate-spin" />
                  <Sparkles className="h-6 w-6 text-[#c5a059] absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                </div>
                <h3 className="text-lg font-display font-medium text-white mb-2">Executing Consolidated AI Pipeline</h3>
                <p className="text-xs text-slate-400 max-w-sm">
                  Gemini-3.5-Flash is processing event descriptions and mapping user background to generate 10 customized icebreakers, scenarios, elevator pitches, and safety parameters in half the time!
                </p>
                <div className="w-48 bg-white/5 h-1 rounded-full mt-4 overflow-hidden">
                  <div className="bg-[#c5a059] h-full animate-[loading_2s_ease-in-out_infinite]" style={{ width: '60%' }} />
                </div>
              </div>
            )}

            {!currentSession && !isLoading && (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border border-dashed border-white/10 rounded-xl my-auto bg-black/20">
                <Sparkles className="h-12 w-12 text-[#c5a059]/20 mb-4 animate-pulse" />
                <h3 className="text-base font-display font-medium text-white mb-1">No Active Playbook Strategy</h3>
                <p className="text-xs text-slate-500 max-w-sm mb-4">
                  Please select one of the high-profile speaker presets above or input your specific attendee details on the left, then click "Analyze & Generate Strategy".
                </p>
                <div className="text-[11px] font-mono p-3 bg-black/40 border border-white/5 text-slate-400 rounded-lg max-w-md text-left flex gap-2">
                  <Terminal className="h-4 w-4 text-[#c5a059] shrink-0" />
                  <span>
                    Pipeline optimization is online: event extraction and starter creation are fused in a single transaction. Let's start!
                  </span>
                </div>
              </div>
            )}

            {currentSession && !isLoading && activeTab === 'playbook' && (
              <div className="space-y-6 overflow-y-auto max-h-[800px] pr-1">
                
                {/* OFFLINE EXPORT ACTION ROW */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-gold/5 border border-gold/15 rounded-xl p-3.5 mb-2">
                  <div className="flex items-center gap-3">
                    <div className="bg-gold/15 p-2 rounded-xl text-gold">
                      <FileDown className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-white">Offline Access & Calendar Sync</h4>
                      <p className="text-[10px] text-slate-400">Save your PDF strategy playbook or sync your preparation schedule directly to your calendar.</p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                    <button
                      onClick={handleExportPlaybookToPDF}
                      className="w-full sm:w-auto bg-[#c5a059] hover:bg-[#b08c46] text-black font-bold text-xs font-mono uppercase tracking-wider px-4 py-2.5 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shrink-0"
                    >
                      <FileDown className="h-3.5 w-3.5 text-black font-bold" />
                      <span>Export PDF</span>
                    </button>
                    <button
                      onClick={handleExportPrepToICS}
                      className="w-full sm:w-auto bg-[#1a1a1a] hover:bg-[#252525] border border-[#c5a059]/20 hover:border-[#c5a059]/50 text-[#c5a059] hover:text-white font-bold text-xs font-mono uppercase tracking-wider px-4 py-2.5 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shrink-0"
                      title="Download iCalendar file to import schedule into Google Calendar or Outlook"
                    >
                      <Calendar className="h-3.5 w-3.5" />
                      <span>Export ICS</span>
                    </button>
                    <a
                      href={getGoogleCalendarUrl()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full sm:w-auto bg-[#1a1a1a] hover:bg-blue-600/10 border border-blue-500/25 hover:border-blue-500/50 text-blue-400 hover:text-blue-300 font-bold text-xs font-mono uppercase tracking-wider px-4 py-2.5 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shrink-0 text-center"
                      title="Add this networking event directly to your Google Calendar (Web Link)"
                    >
                      <span className="font-semibold text-blue-500 mr-0.5">G</span>
                      <span>Google Cal</span>
                    </a>
                  </div>
                </div>

                {/* SECTION A: EVENT INTEL & THEMATIC TRACKS */}
                <div className="bg-[#0a0a0a] border border-white/5 rounded-xl p-4">
                  <div className="flex items-center gap-2 border-b border-white/5 pb-2 mb-3">
                    <BookOpen className="h-4 w-4 text-[#c5a059]" />
                    <h3 className="text-xs font-semibold text-white uppercase tracking-wider font-mono">
                      Event Analyzer Extracted Themes
                    </h3>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed mb-3 italic font-serif">
                    "{currentSession.analyzedThemes.summary}"
                  </p>

                  <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                    <div>
                      <span className="text-slate-500 block mb-1">Analyzed Topics (Confidence)</span>
                      <div className="flex flex-wrap gap-1">
                        {currentSession.analyzedThemes.topics.map((t, idx) => (
                          <span
                            key={idx}
                            className="bg-gold/5 border border-gold/15 rounded px-1.5 py-0.5 text-[11px] text-gold-light flex items-center gap-1"
                          >
                            {t.name}
                            <span className="text-slate-500 font-mono text-[9px]">
                              {(t.confidence * 100).toFixed(0)}%
                            </span>
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-1">Keywords & Domains</span>
                      <div className="flex flex-wrap gap-1">
                        {currentSession.analyzedThemes.keywords.slice(0, 5).map((kw, idx) => (
                          <span
                            key={idx}
                            className="bg-[#1a1a1a] border border-white/5 text-slate-300 px-1.5 py-0.5 rounded text-[11px]"
                          >
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-white/5 text-xs font-mono">
                    <div>
                      <span className="text-slate-500 block mb-1">Primary Target Industries</span>
                      <div className="flex flex-wrap gap-1">
                        {currentSession.analyzedThemes.industries.map((ind, idx) => (
                          <span key={idx} className="bg-gold/10 text-gold-light border border-gold/20 rounded px-1.5 py-0.5 text-[11px]">
                            {ind}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-1">Required Expertise / Skills</span>
                      <div className="flex flex-wrap gap-1">
                        {currentSession.analyzedThemes.skills.map((s, idx) => (
                          <span key={idx} className="bg-white/5 text-slate-300 border border-white/10 rounded px-1.5 py-0.5 text-[11px]">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* SECTION B: 10 CONVERSATION STARTERS (BENTO-GRID PANEL) */}
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3.5">
                    <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                      <MessageSquare className="h-4.5 w-4.5 text-[#c5a059] animate-pulse" />
                      10 Strategic Conversation Starters
                    </h3>
                    
                    {/* Category Filtering Tabs & Copy All Button */}
                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                      <div className="flex gap-1 p-0.5 bg-[#0a0a0a] border border-white/5 rounded-lg shrink-0 overflow-x-auto">
                        {(['all', 'Professional', 'Casual', 'Technical'] as const).map((filter) => {
                          const isActive = starterFilter === filter;
                          return (
                            <button
                              key={filter}
                              onClick={() => setStarterFilter(filter)}
                              className={`px-2.5 py-1 rounded-md text-[10px] font-semibold font-mono uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                                isActive
                                  ? 'bg-[#c5a059] text-black font-bold shadow-md'
                                  : 'text-slate-400 hover:text-white hover:bg-white/5'
                              }`}
                            >
                              {filter === 'all' ? 'All' : filter}
                            </button>
                          );
                        })}
                      </div>

                      <button
                        onClick={() => handleCopyAllStarters(getFilteredStarters(currentSession.starters))}
                        className="px-2.5 py-1.5 rounded-lg border border-white/5 bg-[#0a0a0a] hover:bg-white/5 hover:border-[#c5a059]/30 text-slate-300 hover:text-white transition-all cursor-pointer flex items-center justify-center gap-1.5 text-[10px] font-semibold font-mono uppercase tracking-wider whitespace-nowrap shadow-sm"
                        title="Copy all currently filtered conversation starters"
                      >
                        {copiedId === 'all-starters' ? (
                          <>
                            <Check className="h-3 w-3 text-[#c5a059]" />
                            <span className="text-[#c5a059] font-bold">Copied All!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span>Copy All</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {getFilteredStarters(currentSession.starters).map((starter) => {
                      const isLiked = likedStarters.includes(starter.text);
                      const isCopied = copiedId === starter.id;

                      return (
                        <div
                          key={starter.id}
                          className="bg-[#0a0a0a] border border-white/5 hover:border-gold/20 rounded-xl p-4 transition-all relative overflow-hidden group"
                        >
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-gold/10 text-gold border border-gold/20 font-bold">
                                {starter.category}
                              </span>
                              <h4 className="text-xs font-semibold text-white tracking-tight">
                                {starter.title}
                              </h4>
                            </div>
                            
                            {/* Action Buttons */}
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleToggleLikeStarter(starter.text)}
                                className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                  isLiked
                                    ? 'bg-gold/25 border-gold/45 text-gold'
                                    : 'bg-[#121212] border-white/5 text-slate-500 hover:text-gold'
                                }`}
                                title={isLiked ? 'Liked starter' : 'Mark as liked'}
                              >
                                <ThumbsUp className="h-3.5 w-3.5" />
                              </button>
                              
                              <button
                                onClick={() => handleCopyToClipboard(starter.text, starter.id)}
                                className="p-1.5 rounded-lg border bg-[#121212] border-white/5 text-slate-500 hover:text-gold hover:border-gold/20 transition-all cursor-pointer"
                                title="Copy starters text"
                              >
                                {isCopied ? (
                                  <Check className="h-3.5 w-3.5 text-gold" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5" />
                                )}
                              </button>

                              <a
                                href={`https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(
                                  `"${starter.text}"\n\n(Generated via Personalized Networking Assistant)`
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-lg border bg-[#121212] border-white/5 text-slate-500 hover:text-[#0a66c2] hover:border-[#0a66c2]/30 transition-all cursor-pointer flex items-center justify-center"
                                title="Share to LinkedIn"
                              >
                                <Linkedin className="h-3.5 w-3.5" />
                              </a>

                              <button
                                onClick={(e) => handleVerifyClaim(e, starter.text)}
                                className="text-[10px] font-mono bg-[#121212] border border-white/5 hover:border-gold/25 text-slate-400 hover:text-gold px-2 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1"
                                title="Run Wikipedia validation"
                              >
                                <Search className="h-2.5 w-2.5" /> Factcheck
                              </button>
                            </div>
                          </div>

                          <p className="text-xs text-slate-200 leading-relaxed bg-[#030303]/40 p-2.5 rounded-lg border border-white/5 font-medium font-serif italic mb-2.5">
                            "{starter.text}"
                          </p>

                          <div className="flex items-start gap-1.5 text-[11px] text-slate-400 leading-relaxed">
                            <span className="font-semibold text-[#c5a059] font-mono shrink-0">Strategy:</span>
                            <span>{starter.whyItWorks}</span>
                          </div>
                        </div>
                      );
                    })}

                    {getFilteredStarters(currentSession.starters).length === 0 && (
                      <div className="text-center py-8 px-4 border border-dashed border-white/10 rounded-xl bg-[#0a0a0a] flex flex-col items-center justify-center">
                        <MessageSquare className="h-6 w-6 text-slate-600 mb-2 animate-pulse" />
                        <h4 className="text-[11px] font-semibold text-slate-400 font-mono uppercase tracking-wider mb-1">No Matching Starters</h4>
                        <p className="text-[11px] text-slate-500 leading-relaxed text-center max-w-sm">
                          There are currently no conversation starters matching the "{starterFilter}" filter in this playbook. Try selecting "All" or another category.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* SECTION C: 3 ELEVATOR PITCHES */}
                <div>
                  <h3 className="text-sm font-bold text-white tracking-tight mb-3 flex items-center gap-2">
                    <Sparkles className="h-4.5 w-4.5 text-[#c5a059]" />
                    Scenario-Based Elevator Introductions
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {currentSession.elevatorPitches.map((pitch, idx) => {
                      const isCopied = copiedId === pitch.id;
                      return (
                        <div
                          key={pitch.id}
                          className="bg-[#0a0a0a] border border-white/5 rounded-xl p-3.5 flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex justify-between items-center gap-1 mb-2">
                              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-gold/10 text-gold border border-gold/20">
                                {pitch.title}
                              </span>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() => handleCopyToClipboard(pitch.text, pitch.id)}
                                  className="p-1 rounded bg-[#121212] border border-white/5 text-slate-500 hover:text-gold transition-all cursor-pointer flex items-center justify-center"
                                  title="Copy pitch text"
                                >
                                  {isCopied ? (
                                    <Check className="h-3 w-3 text-gold" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </button>
                                <a
                                  href={`https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(
                                    `"${pitch.text}"\n\n(Generated via Personalized Networking Assistant)`
                                  )}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1 rounded bg-[#121212] border border-white/5 text-slate-500 hover:text-[#0a66c2] hover:border-[#0a66c2]/30 transition-all cursor-pointer flex items-center justify-center"
                                  title="Share to LinkedIn"
                                >
                                  <Linkedin className="h-3 w-3" />
                                </a>
                              </div>
                            </div>
                            <p className="text-[11px] text-slate-300 leading-relaxed italic bg-[#030303]/40 p-2 rounded mb-2 font-serif">
                              "{pitch.text}"
                            </p>
                          </div>
                          <div className="text-[10px] text-slate-500 mt-1">
                            <span className="font-semibold text-gold font-mono block">Context:</span>
                            {pitch.whenToUse}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* SECTION D: TACTICAL ADVICE */}
                <div className="bg-[#0a0a0a] border border-white/5 rounded-xl p-4">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono border-b border-white/5 pb-2 mb-3 flex items-center gap-1.5">
                    <Info className="h-4 w-4 text-[#c5a059]" /> Professional Presentation Guidelines
                  </h3>
                  <ul className="space-y-2 text-xs text-slate-300">
                    {currentSession.tips.map((tip, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-[#c5a059] font-mono font-semibold shrink-0">#{idx + 1}</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* SECTION E: SESSION FEEDBACK SURVEY */}
                <div className="border-t border-white/5 pt-6 mt-6">
                  <div className="bg-[#0a0a0a] border border-[#c5a059]/25 rounded-xl p-4">
                    <h3 className="text-sm font-bold text-white tracking-tight mb-2 flex items-center gap-1.5">
                      <Star className="h-4.5 w-4.5 text-[#c5a059] fill-[#c5a059]" />
                      Playbook Performance Feedback
                    </h3>
                    
                    {feedbackSubmitted ? (
                      <div className="text-center py-4 text-xs text-gold font-semibold flex flex-col items-center gap-2">
                        <ThumbsUp className="h-8 w-8 text-gold fill-gold/10 animate-bounce" />
                        <span>Thank you! Feedback received and logs archived.</span>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <p className="text-xs text-slate-400">
                          Please rate the relevance and flow quality of these conversation starters to help audit Capstone logs.
                        </p>
 
                        {/* Star Rating buttons */}
                        <div className="flex gap-1.5 items-center">
                          <span className="text-xs text-slate-500 font-medium">Relevance Rating:</span>
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                onClick={() => setRating(star)}
                                className="p-1 hover:scale-110 transition-all cursor-pointer"
                              >
                                <Star
                                  className={`h-5 w-5 ${
                                    star <= rating ? 'text-[#c5a059] fill-[#c5a059]' : 'text-slate-850'
                                  }`}
                                />
                              </button>
                            ))}
                          </div>
                        </div>
 
                        {/* Text Comments */}
                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">
                            Refinements or Speaker Comments
                          </label>
                          <textarea
                            value={feedbackComments}
                            onChange={(e) => setFeedbackComments(e.target.value)}
                            className="w-full bg-[#121212] border border-white/5 rounded-lg p-2 text-xs focus:outline-none focus:border-[#c5a059]/50 focus:ring-1 focus:ring-[#c5a059]/20 transition-all h-16 resize-none text-slate-200"
                            placeholder="Optional: How did your interactions go? Any suggestions..."
                          />
                        </div>
 
                        <button
                          onClick={handleSubmitFeedback}
                          className="bg-[#c5a059] text-black font-bold px-4 py-2 rounded-lg text-xs hover:bg-[#b08c46] transition-all cursor-pointer"
                        >
                          Submit Feedback
                        </button>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            )}

            {/* TAB 2: FACT VERIFICATION ENGINE */}
            {activeTab === 'factcheck' && (
              <div className="space-y-6 flex-1 flex flex-col">
                
                {/* Header info */}
                <div>
                  <h3 className="text-base font-display font-medium text-white tracking-wide mb-1 flex items-center gap-2">
                    <Search className="h-5 w-5 text-[#c5a059]" />
                    Wikipedia Real-Time Fact Verifier
                  </h3>
                  <p className="text-xs text-slate-400">
                    Verify technical assertions, research names, or claims during panel discussions. It queries Wikipedia's API, retrieves search excerpts, and uses Gemini to categorize the truth level.
                  </p>
                </div>

                {/* Input panel */}
                <form onSubmit={handleVerifyClaim} className="flex gap-2">
                  <input
                    type="text"
                    value={factQuery}
                    onChange={(e) => setFactQuery(e.target.value)}
                    className="flex-1 bg-[#0a0a0a] border border-white/10 focus-gold focus:border-gold/50 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-700 focus:outline-none transition-all"
                    placeholder="Enter claim (e.g. 'Svelte is developed by Meta', 'Python invented in 1991'...)"
                  />
                  <button
                    type="submit"
                    disabled={isCheckingFact || !factQuery.trim()}
                    className="bg-[#c5a059] disabled:bg-gold-dark disabled:text-black/40 text-black font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-[#b08c46] transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    {isCheckingFact ? (
                      <RefreshCw className="h-4 w-4 animate-spin text-black" />
                    ) : (
                      <Search className="h-4 w-4 text-black" />
                    )}
                    Verify
                  </button>
                </form>

                {/* Preset Fast Checks */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Quick Prompts:</span>
                  <button
                    onClick={(e) => handleVerifyClaim(e, 'Guido van Rossum invented Python')}
                    className="text-[11px] font-mono px-2.5 py-1 rounded bg-[#0a0a0a] hover:bg-[#1a1a1a] border border-white/5 text-slate-400 hover:text-gold hover:border-gold/25 transition-all cursor-pointer"
                  >
                    Guido & Python
                  </button>
                  <button
                    onClick={(e) => handleVerifyClaim(e, 'Kubernetes was originally designed by Google')}
                    className="text-[11px] font-mono px-2.5 py-1 rounded bg-[#0a0a0a] hover:bg-[#1a1a1a] border border-white/5 text-slate-400 hover:text-gold hover:border-gold/25 transition-all cursor-pointer"
                  >
                    Kubernetes Google
                  </button>
                  <button
                    onClick={(e) => handleVerifyClaim(e, 'Graph neural networks can predict molecular properties')}
                    className="text-[11px] font-mono px-2.5 py-1 rounded bg-[#0a0a0a] hover:bg-[#1a1a1a] border border-white/5 text-slate-400 hover:text-gold hover:border-gold/25 transition-all cursor-pointer"
                  >
                    GNNs Molecules
                  </button>
                </div>

                {/* Results ledger */}
                <div className="flex-1 overflow-y-auto max-h-[480px] space-y-4 pr-1">
                  {factCheckResults.length === 0 ? (
                    <div className="text-center py-12 text-slate-600 text-xs italic">
                      No factual claim reviews completed yet. Type your query above.
                    </div>
                  ) : (
                    factCheckResults.map((fc) => (
                      <div
                        key={fc.id}
                        className="bg-[#0a0a0a] border border-white/5 rounded-xl p-4 space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-2.5">
                          <span className="text-xs font-semibold text-white font-mono break-all leading-tight">
                            Claim: "{fc.query}"
                          </span>
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full shrink-0 ${getStatusBadgeStyles(fc.status)}`}>
                            {fc.status}
                          </span>
                        </div>

                        <div className="text-xs space-y-2">
                          <p className="text-slate-300 leading-relaxed">
                            <span className="font-semibold text-gold font-mono block mb-0.5">True Facts:</span>
                            {fc.summary}
                          </p>
                          <p className="text-slate-400 leading-relaxed bg-[#030303]/40 p-2.5 border border-white/5 rounded-lg">
                            <span className="font-semibold text-[#c5a059] font-mono block mb-0.5">AI Analysis:</span>
                            {fc.explanation}
                          </p>
                        </div>

                        <div className="flex items-center justify-between gap-4 text-[10px] font-mono pt-1 text-slate-500">
                          <span>Verification Confidence: {(fc.confidence * 100).toFixed(0)}%</span>
                          <a
                            href={fc.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gold hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            Read Wiki Source &rarr;
                          </a>
                        </div>
                      </div>
                    ))
                  )}
                </div>

              </div>
            )}

            {/* TAB 3: SAVED SESSIONS HISTORY */}
            {activeTab === 'history' && (
              <div className="space-y-6 flex-1 flex flex-col">
                <div>
                  <h3 className="text-base font-display font-medium text-white tracking-wide mb-1 flex items-center gap-2">
                    <History className="h-5 w-5 text-[#c5a059]" />
                    Saved Networking Sessions
                  </h3>
                  <p className="text-xs text-slate-400">
                    Search, retrieve, or purge previous customized speaker event playbooks. Selecting a session loads it immediately into your active dashboard.
                  </p>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    value={historySearchQuery}
                    onChange={(e) => setHistorySearchQuery(e.target.value)}
                    className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 placeholder-slate-700 focus:outline-none focus:border-gold/50 transition-all"
                    placeholder="Search past playbooks by name, role, keywords, or event agenda..."
                  />
                </div>

                {/* List container */}
                <div className="flex-1 overflow-y-auto max-h-[480px] space-y-3 pr-1">
                  {filteredHistory.length === 0 ? (
                    <div className="text-center py-12 text-slate-600 text-xs italic">
                      No historical playbooks found. Create a new strategy to save.
                    </div>
                  ) : (
                    filteredHistory.map((session) => (
                      <div
                        key={session.id}
                        onClick={() => handleSelectHistorySession(session)}
                        className="bg-[#0a0a0a] hover:bg-[#121212] border border-white/5 hover:border-gold/20 rounded-xl p-4 cursor-pointer transition-all flex flex-col sm:flex-row justify-between items-start gap-4"
                      >
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">
                              {session.userProfile.name}
                            </span>
                            <span className="text-[10px] font-mono text-slate-500">
                              ({session.userProfile.role})
                            </span>
                          </div>
                          
                          <p className="text-xs text-slate-300 leading-relaxed italic truncate max-w-lg">
                            "{session.analyzedThemes.summary}"
                          </p>

                          <div className="flex flex-wrap gap-1 pt-1.5">
                            {session.analyzedThemes.topics.slice(0, 3).map((t, idx) => (
                              <span
                                key={idx}
                                className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-gold/10 text-gold border border-gold/25"
                              >
                                {t.name}
                              </span>
                            ))}
                            {session.feedback && (
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-gold/20 text-gold border border-gold/45 flex items-center gap-0.5">
                                <Star className="h-2.5 w-2.5 fill-gold" /> Rated {session.feedback.rating}★
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex sm:flex-col items-end justify-between gap-2 shrink-0 w-full sm:w-auto border-t sm:border-t-0 border-white/5 pt-2 sm:pt-0">
                          <span className="text-[10px] font-mono text-slate-500">
                            {new Date(session.timestamp).toLocaleDateString()} {new Date(session.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <button
                            onClick={(e) => handleDeleteSession(session.id, e)}
                            className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all cursor-pointer"
                            title="Delete this session record"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

              </div>
            )}

            {/* TAB 4: METRICS & LOGS (Telemetry Dashboard) */}
            {activeTab === 'metrics' && (
              <div className="space-y-6 flex-1 flex flex-col">
                <div>
                  <h3 className="text-base font-display font-medium text-white tracking-wide mb-1 flex items-center gap-2">
                    <BarChart2 className="h-5 w-5 text-[#c5a059]" />
                    App Analytics & System Telemetry
                  </h3>
                  <p className="text-xs text-slate-400">
                    Active auditing dashboard visualizing request latency distribution, rated metrics from feedback records, and live server transaction streams.
                  </p>
                </div>

                {/* Scorecards */}
                <div className="grid grid-cols-3 gap-3.5 text-center font-mono">
                  <div className="bg-[#0a0a0a] border border-white/5 rounded-xl p-3">
                    <span className="text-[10px] text-slate-500 uppercase block mb-0.5">Sessions Playbooks</span>
                    <span className="text-lg font-bold text-gold">
                      {metrics ? metrics.totalSessions : historySessions.length}
                    </span>
                  </div>
                  <div className="bg-[#0a0a0a] border border-white/5 rounded-xl p-3">
                    <span className="text-[10px] text-slate-500 uppercase block mb-0.5">Feedback Received</span>
                    <span className="text-lg font-bold text-slate-300">
                      {metrics ? metrics.totalFeedback : 0}
                    </span>
                  </div>
                  <div className="bg-[#0a0a0a] border border-white/5 rounded-xl p-3">
                    <span className="text-[10px] text-slate-500 uppercase block mb-0.5">Internal System Logs</span>
                    <span className="text-lg font-bold text-slate-400">
                      {metrics ? metrics.totalLogs : logs.length}
                    </span>
                  </div>
                </div>

                {/* Recharts Area (Interactive) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Rating distribution bar chart */}
                  <div className="bg-[#0a0a0a] border border-white/5 rounded-xl p-3.5">
                    <h4 className="text-xs font-semibold text-slate-400 font-mono mb-2">Relevance Rating Distribution</h4>
                    <div className="h-36">
                      {metrics && metrics.ratingDistribution && metrics.ratingDistribution.some((r: any) => r.count > 0) ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={metrics.ratingDistribution}>
                            <XAxis dataKey="stars" tick={{ fill: '#64748b', fontSize: 10 }} />
                            <YAxis tick={{ fill: '#64748b', fontSize: 10 }} allowDecimals={false} />
                            <Tooltip contentStyle={{ backgroundColor: '#121212', border: '1px solid rgba(255, 255, 255, 0.05)' }} />
                            <Bar dataKey="count" fill="#c5a059" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-[10px] italic text-slate-600 font-mono">
                          Submit session feedback surveys to populate rating metrics.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Latency distribution area chart */}
                  <div className="bg-[#0a0a0a] border border-white/5 rounded-xl p-3.5">
                    <h4 className="text-xs font-semibold text-slate-400 font-mono mb-2">Request Latency Streams (ms)</h4>
                    <div className="h-36">
                      {metrics && metrics.latencyDistribution && metrics.latencyDistribution.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={metrics.latencyDistribution}>
                            <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 9 }} />
                            <YAxis tick={{ fill: '#64748b', fontSize: 9 }} />
                            <Tooltip contentStyle={{ backgroundColor: '#121212', border: '1px solid rgba(255, 255, 255, 0.05)' }} />
                            <Area type="monotone" dataKey="latency" stroke="#c5a059" fill="rgba(197, 160, 89, 0.15)" strokeWidth={2} />
                          </AreaChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-[10px] italic text-slate-600 font-mono">
                          Running AI queries creates latency telemetry.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Live System Logs Terminal */}
                <div className="bg-[#0a0a0a] border border-white/5 rounded-xl p-4 flex-1 flex flex-col">
                  <h4 className="text-xs font-semibold text-slate-400 font-mono mb-2 flex items-center gap-1.5 border-b border-white/5 pb-1.5">
                    <Terminal className="h-4 w-4 text-gold" />
                    Live Server Transaction Logs
                  </h4>
                  <div className="flex-1 bg-[#050505] border border-white/5 rounded-lg p-3 font-mono text-[10px] text-slate-300 overflow-y-auto max-h-[220px] space-y-1.5 scrollbar-thin">
                    {logs.length === 0 ? (
                      <span className="text-slate-600 italic">No logs recorded. Initialize a pipeline session to trigger telemetry records.</span>
                    ) : (
                      logs.map((log) => (
                        <div key={log.id} className="flex flex-col sm:flex-row sm:items-center gap-x-2 leading-relaxed">
                          <span className="text-slate-500">
                            [{new Date(log.timestamp).toLocaleTimeString()}]
                          </span>
                          <span className="text-gold font-semibold uppercase tracking-wider text-[9px] shrink-0">
                            {log.actionType}
                          </span>
                          <span className="text-slate-200">
                            {log.message}
                          </span>
                          {log.durationMs !== undefined && (
                            <span className="text-gold-light font-bold shrink-0 ml-auto text-[9px]">
                              +{log.durationMs}ms
                            </span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            )}

          </div>

        </div>

      </main>

      {/* FOOTER COLO-BOX CREDITS */}
      <footer className="border-t border-white/5 bg-[#121212]/80 py-6 px-6 mt-12 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <p>
            SmartBridge Capstone Project Showcase &mdash; Personalized Networking Assistant
          </p>
          <div className="flex gap-4 font-mono text-[11px]">
            <span className="text-slate-600">Model: Gemini-3.5-Flash</span>
            <span className="text-gold">API Proxy Router: Secure</span>
            <span className="text-slate-600">Engine: TypeScript Node v22</span>
          </div>
        </div>
      </footer>

      {/* TOAST NOTIFICATION FOR PDF DOWNLOAD */}
      <AnimatePresence>
        {pdfToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-md w-[calc(100%-2rem)] px-4"
          >
            <div className="bg-[#121212] border border-[#c5a059]/30 rounded-xl p-4 shadow-2xl shadow-black/80 flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-[#c5a059]/10 border border-[#c5a059]/25 flex items-center justify-center shrink-0">
                <Check className="h-4 w-4 text-[#c5a059]" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[#c5a059]">
                  Strategy Playbook Exported
                </h4>
                <p className="text-[11px] text-slate-300 font-sans mt-0.5 truncate" title={pdfToast}>
                  {pdfToast}
                </p>
              </div>
              <button
                onClick={() => setPdfToast(null)}
                className="text-slate-500 hover:text-white transition-colors p-1 cursor-pointer"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MOBILE STICKY BOTTOM TAB BAR */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#0c0c0c]/95 border-t border-white/5 backdrop-blur-md md:hidden shadow-2xl flex items-center justify-around py-2.5 px-1">
        <button
          onClick={() => handleMobileTabClick('setup')}
          className="flex flex-col items-center justify-center flex-1 py-1 text-slate-400 hover:text-white active:text-[#c5a059] transition-colors focus:outline-none cursor-pointer"
        >
          <User className="h-4 w-4 mb-1 text-slate-400" />
          <span className="text-[9px] font-mono font-medium tracking-wider uppercase">Setup</span>
        </button>
        <button
          onClick={() => handleMobileTabClick('playbook')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors focus:outline-none cursor-pointer ${
            activeTab === 'playbook' ? 'text-[#c5a059]' : 'text-slate-400 hover:text-white'
          }`}
        >
          <MessageSquare className="h-4 w-4 mb-1" />
          <span className="text-[9px] font-mono font-medium tracking-wider uppercase">Playbook</span>
        </button>
        <button
          onClick={() => handleMobileTabClick('factcheck')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors focus:outline-none cursor-pointer ${
            activeTab === 'factcheck' ? 'text-[#c5a059]' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Search className="h-4 w-4 mb-1" />
          <span className="text-[9px] font-mono font-medium tracking-wider uppercase">FactCheck</span>
        </button>
        <button
          onClick={() => handleMobileTabClick('history')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors focus:outline-none cursor-pointer ${
            activeTab === 'history' ? 'text-[#c5a059]' : 'text-slate-400 hover:text-white'
          }`}
        >
          <History className="h-4 w-4 mb-1" />
          <span className="text-[9px] font-mono font-medium tracking-wider uppercase">Saved</span>
        </button>
        <button
          onClick={() => handleMobileTabClick('metrics')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors focus:outline-none cursor-pointer ${
            activeTab === 'metrics' ? 'text-[#c5a059]' : 'text-slate-400 hover:text-white'
          }`}
        >
          <BarChart2 className="h-4 w-4 mb-1" />
          <span className="text-[9px] font-mono font-medium tracking-wider uppercase">Metrics</span>
        </button>
      </div>

      {/* GUIDED TOUR OVERLAY */}
      <AnimatePresence>
        {showTour && (
          <>
            {/* Dark Backdrop to dim the screen */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-[#000] z-45 pointer-events-auto"
              onClick={handleSkipOrFinishTour}
            />

            {/* Floating Step UI Panel */}
            <motion.div
              initial={{ opacity: 0, y: 100, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 max-w-lg w-[calc(100%-2rem)] px-4"
            >
              <div className="bg-[#121212] border-2 border-[#c5a059] rounded-2xl p-5 shadow-[0_15px_50px_rgba(0,0,0,0.9)] relative overflow-hidden">
                {/* Accent glow background */}
                <div className="absolute top-0 right-0 h-32 w-32 bg-[#c5a059]/5 rounded-full blur-2xl pointer-events-none" />

                {/* Progress bar */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-white/5">
                  <div 
                    className="bg-[#c5a059] h-full transition-all duration-300"
                    style={{ width: `${((tourStep + 1) / 3) * 100}%` }}
                  />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between mb-4 mt-2">
                  <div className="flex items-center gap-2">
                    <Compass className="h-4 w-4 text-[#c5a059] animate-pulse" />
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                      Guided Onboarding Tour
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-[#c5a059]/10 text-gold border border-gold/20">
                    Step {tourStep + 1} of 3
                  </span>
                </div>

                {/* Step Content */}
                <div className="mb-6">
                  {tourStep === 0 && (
                    <div>
                      <h3 className="text-sm font-display font-semibold text-white mb-1.5 flex items-center gap-2">
                        <User className="h-4.5 w-4.5 text-[#c5a059]" /> 1. Professional Presenter Profile
                      </h3>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        This is where you design your networking brand. Input your background biography, target fields, and bonding topics. 
                        You can also dictate your professional bio in real-time using our <strong>high-fidelity speech-to-text integration</strong>.
                      </p>
                    </div>
                  )}

                  {tourStep === 1 && (
                    <div>
                      <h3 className="text-sm font-display font-semibold text-white mb-1.5 flex items-center gap-2">
                        <MessageSquare className="h-4.5 w-4.5 text-[#c5a059]" /> 2. Personalized Strategy Playbook
                      </h3>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        Explore your customized strategy playbook! It maps your professional and personal overlap into custom conversational 
                        tracks, details tactical icebreakers, designs custom speaker pitches, and lists actionable checklists.
                      </p>
                    </div>
                  )}

                  {tourStep === 2 && (
                    <div>
                      <h3 className="text-sm font-display font-semibold text-white mb-1.5 flex items-center gap-2">
                        <Search className="h-4.5 w-4.5 text-[#c5a059]" /> 3. Real-Time FactCheck Assistant
                      </h3>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        Got a doubtful claim or speaker statement? Paste it here! Our verification engine will perform semantic checks 
                        to verify facts, compile references, and cross-reference speaker statements in real-time.
                      </p>
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex items-center justify-between border-t border-white/5 pt-4">
                  <button
                    onClick={handleSkipOrFinishTour}
                    className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                  >
                    Skip Tour
                  </button>

                  <div className="flex gap-2">
                    {tourStep > 0 && (
                      <button
                        onClick={() => handleTourStepChange(tourStep - 1)}
                        className="bg-white/5 hover:bg-white/10 text-slate-300 text-[10px] font-mono font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg border border-white/5 transition-all cursor-pointer"
                      >
                        Back
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (tourStep < 2) {
                          handleTourStepChange(tourStep + 1);
                        } else {
                          handleSkipOrFinishTour();
                        }
                      }}
                      className="bg-[#c5a059] hover:bg-[#b08c46] text-black text-[10px] font-mono font-bold uppercase tracking-wider px-4 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer shadow-md shadow-gold/5"
                    >
                      <span>{tourStep === 2 ? 'Finish Tour' : 'Next'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
