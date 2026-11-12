import React, { useState, useMemo } from 'react';
import {
  Heart,
  Activity,
  AlertTriangle,
  Bell,
  Clock,
  ShieldCheck,
  Building2,
  Users,
  MapPin,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Send,
  Droplet,
  Check,
  ArrowRight,
  Mail,
  Zap,
  Award,
  Phone,
  Hospital,
  Flame,
  Info,
  Layers,
  Sparkles,
  QrCode,
  Compass,
  Radio,
  Siren,
  RotateCw,
  CalendarCheck2
} from 'lucide-react';
import { GeographicalClusterMap } from './components/GeographicalClusterMap.tsx';

// ==========================================
// 1. RBC BLOOD COMPATIBILITY & GEOLOCATION MATRIX
// ==========================================
const COMPATIBILITY_RULES: Record<string, string[]> = {
  'O-': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'], // Universal Donor
  'O+': ['O+', 'A+', 'B+', 'AB+'],
  'A-': ['A-', 'A+', 'AB-', 'AB+'],
  'A+': ['A+', 'AB+'],
  'B-': ['B-', 'B+', 'AB-', 'AB+'],
  'B+': ['B+', 'AB+'],
  'AB-': ['AB-', 'AB+'],
  'AB+': ['AB+'] // Universal Recipient
};

const BLOOD_GROUPS = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];

interface HospitalCenter {
  id: string;
  name: string;
  area: string;
  distance: number;
  lat: number;
  lng: number;
  phone: string;
  beds: number;
  hasBloodBank: boolean;
}

const KARACHI_HOSPITALS: HospitalCenter[] = [
  {
    id: 'c1',
    name: 'Aga Khan University Hospital (AKUH)',
    area: 'Stadium Road',
    distance: 2.8,
    lat: 24.8933,
    lng: 67.0734,
    phone: '+92 21 111-911-911',
    beds: 700,
    hasBloodBank: true
  },
  {
    id: 'c2',
    name: 'Indus Hospital & Health Network',
    area: 'Korangi Sector 39',
    distance: 5.4,
    lat: 24.8322,
    lng: 67.1292,
    phone: '+92 21 35112709',
    beds: 450,
    hasBloodBank: true
  },
  {
    id: 'c3',
    name: 'Liaquat National Hospital Blood Bank',
    area: 'National Stadium Rd',
    distance: 3.1,
    lat: 24.8901,
    lng: 67.0682,
    phone: '+92 21 111-456-456',
    beds: 550,
    hasBloodBank: true
  },
  {
    id: 'c4',
    name: 'Ziauddin University Hospital',
    area: 'Clifton Block 6',
    distance: 6.9,
    lat: 24.8211,
    lng: 67.0275,
    phone: '+92 21 35862937',
    beds: 350,
    hasBloodBank: true
  },
  {
    id: 'c5',
    name: 'SIUT Blood Transfusion Service',
    area: 'Civil Hospital Rd',
    distance: 8.2,
    lat: 24.8584,
    lng: 67.0091,
    phone: '+92 21 99215752',
    beds: 600,
    hasBloodBank: true
  }
];

const getDaysSince = (dateString: string | null): number => {
  if (!dateString) return 999;
  const past = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - past.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};

// ==========================================
// 2. DATA MODELS & INITIAL STATE
// ==========================================
interface DonationHistoryItem {
  id: string;
  date: string;
  hospital: string;
  units: number;
  recipientMR: string;
}

interface Donor {
  id: string;
  name: string;
  phone: string;
  bloodGroup: string;
  age: number;
  weight: number;
  cityArea: string;
  lat: number;
  lng: number;
  lastDonationDate: string | null;
  isSnoozed: boolean;
  snoozeUntil: string | null;
  eligibilityPassed: boolean;
  readinessScore: number;
  totalDonations: number;
  donorCode: string;
  history: DonationHistoryItem[];
  nearestCenters: string[];
}

interface OrgCommitment {
  orgId: string;
  orgName: string;
  units: number;
}

interface BloodRequest {
  id: string;
  patientName: string;
  mrNumber: string;
  hospitalName: string;
  cityArea: string;
  bloodGroup: string;
  quantity: number;
  urgency: string;
  isRecurring: boolean;
  recurrenceSchedule: string | null;
  isBulk: boolean;
  status: string;
  createdAt: string;
  pledgedDonors: string[];
  committedByOrgs: OrgCommitment[];
  verifiedByAdmin: boolean;
}

interface BloodDriveEvent {
  id: string;
  title: string;
  venue: string;
  date: string;
  targetUnits: number;
  partnerBloodBank: string;
  orgName: string;
  rsvps: number;
  status: string;
  userRsvp?: boolean;
}

interface RecurringPatient {
  id: string;
  patientName: string;
  mrNumber: string;
  hospitalName: string;
  bloodGroup: string;
  quantity: number;
  schedule: string;
  careCircleSubscribers: string[];
  lastTransfusion: string;
  nextTransfusionDate: string;
  contactPerson: string;
}

interface NotificationItem {
  id: string;
  time: string;
  title: string;
  body: string;
  type: 'emergency' | 'bulk' | 'success' | 'info' | 'warning';
  channel: string;
  read: boolean;
}

const INITIAL_DONORS: Donor[] = [
  {
    id: 'd1',
    name: 'Bilal Ahmed',
    phone: '+92 300 8291044',
    bloodGroup: 'O-',
    age: 29,
    weight: 76,
    cityArea: 'Gulshan-e-Iqbal, Block 4',
    lat: 24.9180,
    lng: 67.0971,
    lastDonationDate: '2024-03-10', // > 90 days ago -> Available
    isSnoozed: false,
    snoozeUntil: null,
    eligibilityPassed: true,
    readinessScore: 94,
    totalDonations: 7,
    donorCode: 'RB-KHI-0941',
    history: [
      { id: 'h1', date: '2024-03-10', hospital: 'Aga Khan University Hospital', units: 1, recipientMR: 'MR-90821' },
      { id: 'h2', date: '2023-11-14', hospital: 'Liaquat National Hospital', units: 1, recipientMR: 'MR-44102' }
    ],
    nearestCenters: ['Aga Khan University Hospital (AKUH)', 'Liaquat National Hospital Blood Bank', 'Indus Hospital & Health Network']
  },
  {
    id: 'd2',
    name: 'Dr. Sana Javed',
    phone: '+92 321 4455667',
    bloodGroup: 'A+',
    age: 33,
    weight: 62,
    cityArea: 'PECHS Block 2',
    lat: 24.8716,
    lng: 67.0599,
    lastDonationDate: new Date(Date.now() - 22 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 22 days ago -> Cooldown
    isSnoozed: false,
    snoozeUntil: null,
    eligibilityPassed: true,
    readinessScore: 89,
    totalDonations: 5,
    donorCode: 'RB-KHI-1182',
    history: [{ id: 'h3', date: '2024-07-20', hospital: 'Indus Hospital & Health Network', units: 1, recipientMR: 'MR-77810' }],
    nearestCenters: ['Liaquat National Hospital Blood Bank', 'Aga Khan University Hospital (AKUH)', 'Ziauddin University Hospital']
  },
  {
    id: 'd3',
    name: 'Hamza Tariq',
    phone: '+92 333 1122334',
    bloodGroup: 'B+',
    age: 26,
    weight: 80,
    cityArea: 'DHA Phase 5',
    lat: 24.8012,
    lng: 67.0543,
    lastDonationDate: new Date(Date.now() - 68 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 68 days ago -> Cooldown
    isSnoozed: false,
    snoozeUntil: null,
    eligibilityPassed: true,
    readinessScore: 88,
    totalDonations: 4,
    donorCode: 'RB-KHI-2290',
    history: [{ id: 'h4', date: '2024-06-04', hospital: 'South City Hospital', units: 1, recipientMR: 'MR-11209' }],
    nearestCenters: ['Ziauddin University Hospital', 'Indus Hospital & Health Network', 'SIUT Blood Transfusion Service']
  },
  {
    id: 'd4',
    name: 'Zainab Malik',
    phone: '+92 345 8899001',
    bloodGroup: 'O+',
    age: 24,
    weight: 58,
    cityArea: 'Clifton Block 8',
    lat: 24.8155,
    lng: 67.0322,
    lastDonationDate: '2024-01-15', // Available biological date, but Snoozed
    isSnoozed: true,
    snoozeUntil: '24 Hours',
    eligibilityPassed: true,
    readinessScore: 91,
    totalDonations: 3,
    donorCode: 'RB-KHI-4009',
    history: [{ id: 'h5', date: '2024-01-15', hospital: 'Ziauddin University Hospital', units: 1, recipientMR: 'MR-66501' }],
    nearestCenters: ['Ziauddin University Hospital', 'Aga Khan University Hospital (AKUH)', 'Indus Hospital & Health Network']
  },
  {
    id: 'd5',
    name: 'Farhan Ali',
    phone: '+92 301 9988776',
    bloodGroup: 'AB-',
    age: 31,
    weight: 74,
    cityArea: 'North Nazimabad',
    lat: 24.9380,
    lng: 67.0420,
    lastDonationDate: '2023-12-01',
    isSnoozed: false,
    snoozeUntil: null,
    eligibilityPassed: true,
    readinessScore: 96,
    totalDonations: 6,
    donorCode: 'RB-KHI-5541',
    history: [{ id: 'h6', date: '2023-12-01', hospital: 'Aga Khan University Hospital', units: 1, recipientMR: 'MR-33219' }],
    nearestCenters: ['Ziauddin University Hospital', 'Liaquat National Hospital Blood Bank', 'Aga Khan University Hospital (AKUH)']
  },
  {
    id: 'd6',
    name: 'Fatima Noor',
    phone: '+92 312 3344556',
    bloodGroup: 'A-',
    age: 27,
    weight: 60,
    cityArea: 'Bahadurabad',
    lat: 24.8820,
    lng: 67.0680,
    lastDonationDate: '2024-02-18',
    isSnoozed: false,
    snoozeUntil: null,
    eligibilityPassed: true,
    readinessScore: 92,
    totalDonations: 4,
    donorCode: 'RB-KHI-6701',
    history: [{ id: 'h7', date: '2024-02-18', hospital: 'Liaquat National Hospital', units: 1, recipientMR: 'MR-55421' }],
    nearestCenters: ['Liaquat National Hospital Blood Bank', 'Aga Khan University Hospital (AKUH)', 'Indus Hospital & Health Network']
  },
  {
    id: 'd7',
    name: 'Usman Ghani',
    phone: '+92 322 7788990',
    bloodGroup: 'B-',
    age: 35,
    weight: 84,
    cityArea: 'Malir Cantt',
    lat: 24.9120,
    lng: 67.1850,
    lastDonationDate: '2023-10-05',
    isSnoozed: false,
    snoozeUntil: null,
    eligibilityPassed: true,
    readinessScore: 90,
    totalDonations: 8,
    donorCode: 'RB-KHI-7819',
    history: [{ id: 'h8', date: '2023-10-05', hospital: 'CMH Malir', units: 1, recipientMR: 'MR-99012' }],
    nearestCenters: ['Indus Hospital & Health Network', 'Aga Khan University Hospital (AKUH)', 'Liaquat National Hospital Blood Bank']
  },
  {
    id: 'd8',
    name: 'Mustafa Kamal',
    phone: '+92 334 5566778',
    bloodGroup: 'AB+',
    age: 22,
    weight: 68,
    cityArea: 'Gulshan-e-Jamal',
    lat: 24.8890,
    lng: 67.1140,
    lastDonationDate: '2024-04-01',
    isSnoozed: false,
    snoozeUntil: null,
    eligibilityPassed: true,
    readinessScore: 86,
    totalDonations: 2,
    donorCode: 'RB-KHI-9932',
    history: [{ id: 'h9', date: '2024-04-01', hospital: 'Aga Khan University Hospital', units: 1, recipientMR: 'MR-12003' }],
    nearestCenters: ['Aga Khan University Hospital (AKUH)', 'Liaquat National Hospital Blood Bank', 'Indus Hospital & Health Network']
  }
];

const INITIAL_REQUESTS: BloodRequest[] = [
  {
    id: 'REQ-101',
    patientName: 'Arham Sheikh (Trauma ICU)',
    mrNumber: 'AKUH-89241',
    hospitalName: 'Aga Khan University Hospital (AKUH)',
    cityArea: 'Stadium Road, Karachi',
    bloodGroup: 'A+',
    quantity: 2,
    urgency: 'Critical - Within 2 Hrs',
    isRecurring: false,
    recurrenceSchedule: null,
    isBulk: false,
    status: 'In Progress',
    createdAt: '15 mins ago',
    pledgedDonors: ['d2'],
    committedByOrgs: [],
    verifiedByAdmin: true
  },
  {
    id: 'REQ-102',
    patientName: 'Civil Ward C-5 (Mass Emergency)',
    mrNumber: 'SIUT-77190',
    hospitalName: 'SIUT Blood Transfusion Service',
    cityArea: 'Civil Hospital Rd, Karachi',
    bloodGroup: 'O+',
    quantity: 14, // > 10 Bottles: Bulk Escalation!
    urgency: 'Critical - Within 2 Hrs',
    isRecurring: false,
    recurrenceSchedule: null,
    isBulk: true,
    status: 'Bulk Dispatch Active',
    createdAt: '35 mins ago',
    pledgedDonors: [],
    committedByOrgs: [
      { orgId: 'org1', orgName: 'Indus Youth Blood Society', units: 8 }
    ],
    verifiedByAdmin: true
  }
];

const INITIAL_RECURRING_PATIENT: RecurringPatient = {
  id: 'rec-1',
  patientName: 'Zubair Ali (Thalassemia Major, 9 yrs)',
  mrNumber: 'INDUS-THAL-4491',
  hospitalName: 'Indus Hospital & Health Network',
  bloodGroup: 'B+',
  quantity: 2,
  schedule: 'Every 3 Weeks',
  careCircleSubscribers: ['d1', 'd3', 'd7'],
  lastTransfusion: '12 days ago',
  nextTransfusionDate: 'Nov 24, 2026',
  contactPerson: 'Mrs. Ali (Mother): +92 300 2345678'
};

const INITIAL_EVENTS: BloodDriveEvent[] = [
  {
    id: 'ev-1',
    title: 'NED University Mega Blood Drive',
    venue: 'NED Main Auditorium, University Rd',
    date: 'Tomorrow, 9:00 AM - 5:00 PM',
    targetUnits: 120,
    partnerBloodBank: 'Indus Hospital Blood Transfusion Service',
    orgName: 'Indus Youth Blood Society',
    rsvps: 48,
    status: 'Scheduled'
  },
  {
    id: 'ev-2',
    title: 'FAST-NUCES Annual Lifesaver Camp',
    venue: 'FAST Karachi Campus Sports Complex',
    date: 'Nov 18, 10:00 AM - 4:00 PM',
    targetUnits: 80,
    partnerBloodBank: 'Liaquat National Hospital',
    orgName: 'Red Crescent Youth Wing',
    rsvps: 29,
    status: 'Scheduled'
  }
];

// ==========================================
// 3. MAIN APP COMPONENT
// ==========================================
export default function App() {
  const [activeRole, setActiveRole] = useState<'landing' | 'donor' | 'recipient' | 'org' | 'admin'>('landing');
  const [donors, setDonors] = useState<Donor[]>(INITIAL_DONORS);
  const [requests, setRequests] = useState<BloodRequest[]>(INITIAL_REQUESTS);
  const [events, setEvents] = useState<BloodDriveEvent[]>(INITIAL_EVENTS);
  const [recurringProfile, setRecurringProfile] = useState<RecurringPatient>(INITIAL_RECURRING_PATIENT);

  // Active Donor Session (Bilal Ahmed, O-)
  const currentDonorId = 'd1';
  const currentDonor = donors.find((d) => d.id === currentDonorId) || donors[0];

  // Modals
  const [digitalCardOpen, setDigitalCardOpen] = useState(false);
  const [radarModalOpen, setRadarModalOpen] = useState(false);
  const [radarTargetRequest, setRadarTargetRequest] = useState<BloodRequest | null>(null);

  // System Notifications Log & Floating Toasts
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 'nt-1',
      time: 'Just now',
      title: 'Bulk Emergency Alert Dispatched',
      body: 'SIUT Ward C-5 requested 14 units O+. Escalated to Indus Youth Blood Society & Red Crescent.',
      type: 'bulk',
      channel: 'App + SMS + Email',
      read: false
    },
    {
      id: 'nt-2',
      time: '12 mins ago',
      title: 'Urgent Compatible Request',
      body: 'Trauma ICU at AKUH needs 2 units of A+. 4 compatible donors alerted.',
      type: 'emergency',
      channel: 'Push + Email',
      read: false
    }
  ]);
  const [toastBanner, setToastBanner] = useState<NotificationItem | null>(null);
  const [isToastCenterOpen, setIsToastCenterOpen] = useState(false);

  const triggerNotification = (
    title: string,
    body: string,
    type: 'emergency' | 'bulk' | 'success' | 'info' | 'warning' = 'info',
    channel = 'Push & Email'
  ) => {
    const newNotif: NotificationItem = {
      id: `nt-${Date.now()}`,
      time: 'A moment ago',
      title,
      body,
      type,
      channel,
      read: false
    };
    setNotifications((prev) => [newNotif, ...prev]);
    setToastBanner(newNotif);
    setTimeout(() => {
      setToastBanner((curr) => (curr?.id === newNotif.id ? null : curr));
    }, 6500);
  };

  // Live Computed Donor Availability
  const getDonorStatus = (donor: Donor) => {
    if (!donor.eligibilityPassed) {
      return { status: 'Deferred', label: 'Medically Deferred', color: 'red', daysLeft: 0, progress: 0 };
    }
    if (donor.isSnoozed) {
      return { status: 'Snoozed', label: `Snoozed (${donor.snoozeUntil || 'Active'})`, color: 'amber', daysLeft: 0, progress: 0 };
    }
    const daysSince = getDaysSince(donor.lastDonationDate);
    if (daysSince < 90) {
      const daysLeft = 90 - daysSince;
      const progress = Math.min(100, Math.round((daysSince / 90) * 100));
      return { status: 'Cooldown', label: `${daysLeft} Days Cooldown Remaining`, color: 'amber', daysLeft, progress };
    }
    return { status: 'Available', label: 'Eligible & Available Now', color: 'emerald', daysLeft: 0, progress: 100 };
  };

  const isDonorCompatible = (donorBlood: string, recipientBlood: string): boolean => {
    const compatibleRecipients = COMPATIBILITY_RULES[donorBlood] || [];
    return compatibleRecipients.includes(recipientBlood);
  };

  // Actions: Donor
  const handleSimulateDonation = () => {
    const today = new Date().toISOString().split('T')[0];
    setDonors((prev) =>
      prev.map((d) => {
        if (d.id === currentDonorId) {
          const newScore = Math.min(100, d.readinessScore + 5);
          const newHistory = [
            { id: `h-${Date.now()}`, date: today, hospital: 'Aga Khan University Hospital (AKUH)', units: 1, recipientMR: 'SIM-TODAY' },
            ...d.history
          ];
          return {
            ...d,
            lastDonationDate: today,
            isSnoozed: false,
            readinessScore: newScore,
            totalDonations: d.totalDonations + 1,
            history: newHistory
          };
        }
        return d;
      })
    );
    triggerNotification(
      'Donation Logged & 90-Day Biological Cooldown Started',
      `Thank you ${currentDonor.name}! Cooldown reset to 90 days. Donor score boosted to ${Math.min(100, currentDonor.readinessScore + 5)}/100. Emergency dispatch locked until eligible.`,
      'success',
      'App Push + Email'
    );
  };

  const handleToggleSnooze = (duration = '24 Hours') => {
    const nextState = !currentDonor.isSnoozed;
    setDonors((prev) =>
      prev.map((d) => (d.id === currentDonorId ? { ...d, isSnoozed: nextState, snoozeUntil: nextState ? duration : null } : d))
    );
    triggerNotification(
      nextState ? 'Emergency Alerts Snoozed' : 'Emergency Alerts Resumed',
      nextState
        ? `You will not receive emergency pings for ${duration}. Your Donor Readiness Score remains protected.`
        : 'You are now live and eligible for emergency dispatch.',
      'info',
      'System Alert'
    );
  };

  const handlePledgeDonation = (requestId: string) => {
    setRequests((prev) =>
      prev.map((r) => {
        if (r.id === requestId) {
          const alreadyPledged = r.pledgedDonors?.includes(currentDonorId);
          const updatedDonors = alreadyPledged ? r.pledgedDonors : [...(r.pledgedDonors || []), currentDonorId];
          return { ...r, pledgedDonors: updatedDonors };
        }
        return r;
      })
    );
    const targetReq = requests.find((r) => r.id === requestId);
    triggerNotification(
      'Donation Pledge Sent to Hospital',
      `Hospital & seeker informed that Bilal Ahmed (O-) is en route for MR# ${targetReq?.mrNumber || 'Trauma'}.`,
      'success',
      'App Push + Priority SMS'
    );
  };

  const handleRSVPEvent = (eventId: string) => {
    setEvents((prev) =>
      prev.map((ev) => (ev.id === eventId ? { ...ev, rsvps: ev.rsvps + 1, userRsvp: true } : ev))
    );
    triggerNotification('Blood Drive RSVP Confirmed', 'Digital pass and calendar notification generated.', 'info', 'Email');
  };

  const handleToggleCareCircleSubscription = () => {
    const isSubscribed = recurringProfile.careCircleSubscribers.includes(currentDonorId);
    let updated: string[];
    if (isSubscribed) {
      updated = recurringProfile.careCircleSubscribers.filter((id) => id !== currentDonorId);
    } else {
      updated = [...recurringProfile.careCircleSubscribers, currentDonorId];
    }
    setRecurringProfile((prev) => ({ ...prev, careCircleSubscribers: updated }));
    triggerNotification(
      isSubscribed ? 'Care Circle Unsubscribed' : 'Care Circle Joined for Zubair Ali',
      isSubscribed
        ? 'You have stepped down from the 3-week rotation schedule.'
        : 'Thank you! You are now scheduled in the 3-week rotation calendar for Zubair Ali (Thalassemia Major).',
      'success',
      'Push + Email'
    );
  };

  // Actions: Recipient
  const handleCreateRequest = (newReqData: {
    patientName: string;
    mrNumber: string;
    hospitalName: string;
    cityArea?: string;
    bloodGroup: string;
    quantity: string | number;
    urgency: string;
    isRecurring?: boolean;
    recurrenceSchedule?: string | null;
  }) => {
    const isBulk = Number(newReqData.quantity) > 10;
    const createdReq: BloodRequest = {
      id: `REQ-${Math.floor(100 + Math.random() * 900)}`,
      patientName: newReqData.patientName,
      mrNumber: newReqData.mrNumber,
      hospitalName: newReqData.hospitalName,
      cityArea: newReqData.cityArea || 'Karachi Central',
      bloodGroup: newReqData.bloodGroup,
      quantity: Number(newReqData.quantity),
      urgency: newReqData.urgency,
      isRecurring: newReqData.isRecurring || false,
      recurrenceSchedule: newReqData.recurrenceSchedule || null,
      isBulk,
      status: isBulk ? 'Bulk Dispatch Active' : 'Dispatching',
      createdAt: 'Just now',
      pledgedDonors: [],
      committedByOrgs: [],
      verifiedByAdmin: true
    };

    setRequests((prev) => [createdReq, ...prev]);

    const compatibleAvailableCount = donors.filter((d) => {
      const { status } = getDonorStatus(d);
      return status === 'Available' && isDonorCompatible(d.bloodGroup, newReqData.bloodGroup);
    }).length;

    if (isBulk) {
      triggerNotification(
        '🚨 MASS BULK REQUIREMENT ESCALATED (>10 Units)',
        `Request for ${newReqData.quantity} units of ${newReqData.bloodGroup} at ${newReqData.hospitalName} automatically broadcasted to all Verified Blood Societies & NGOs!`,
        'bulk',
        'App + Urgent SMS + Org Hotline'
      );
    } else {
      triggerNotification(
        `Emergency Request Dispatched (${newReqData.bloodGroup})`,
        `Alert sent to ${compatibleAvailableCount} compatible donors nearby at ${newReqData.hospitalName}.`,
        'emergency',
        'App Push + Priority SMS'
      );
    }
  };

  // Actions: Org
  const handleCommitBulkFulfillment = (requestId: string, committedUnits: number) => {
    setRequests((prev) =>
      prev.map((r) => {
        if (r.id === requestId) {
          const currentCommitments = r.committedByOrgs || [];
          const updatedCommitments = [
            ...currentCommitments,
            { orgId: 'org1', orgName: 'Indus Youth Blood Society', units: Number(committedUnits) }
          ];
          return {
            ...r,
            committedByOrgs: updatedCommitments,
            status: 'Partially Fulfilled / Under Delivery'
          };
        }
        return r;
      })
    );
    triggerNotification(
      'Bulk Commitment Confirmed',
      `Indus Youth Blood Society committed ${committedUnits} units. Seeker & Hospital blood desk updated live!`,
      'success',
      'Portal Sync + Recipient Email'
    );
  };

  const handleCreateEvent = (eventData: {
    title: string;
    venue: string;
    date: string;
    targetUnits: number | string;
    partnerBloodBank: string;
  }) => {
    const newEvent: BloodDriveEvent = {
      id: `ev-${Date.now()}`,
      title: eventData.title,
      venue: eventData.venue,
      date: eventData.date,
      targetUnits: Number(eventData.targetUnits),
      partnerBloodBank: eventData.partnerBloodBank,
      orgName: 'Indus Youth Blood Society',
      rsvps: 1,
      status: 'Scheduled'
    };
    setEvents((prev) => [newEvent, ...prev]);

    const availableDonorsCount = donors.filter((d) => getDonorStatus(d).status === 'Available').length;
    triggerNotification(
      'Blood Drive Published & Broadcasted',
      `Drive "${eventData.title}" announced. Automated invitation emails blast sent to ${availableDonorsCount} available donors.`,
      'info',
      'Broadcast Blast (Email & Push)'
    );
  };

  // Actions: System Admin
  const handleAdminVerifyMR = (reqId: string) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === reqId ? { ...r, verifiedByAdmin: true, status: 'Verified Hospital MR' } : r))
    );
    triggerNotification('MR Verified by Medical Desk', `Hospital record confirmed for request ${reqId}.`, 'info', 'Admin Audit');
  };

  const handleAdminCloseRequest = (reqId: string) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === reqId ? { ...r, status: 'Closed / Fulfilled' } : r))
    );
    triggerNotification('Request Closed', `Emergency query ${reqId} closed and archived.`, 'info', 'System Audit');
  };

  const handleAdminResetCooldown = (donorId: string) => {
    setDonors((prev) =>
      prev.map((d) => (d.id === donorId ? { ...d, lastDonationDate: '2023-01-01' } : d))
    );
    triggerNotification('Admin Cooldown Override', `Donor ${donorId} cooldown reset. Marked available.`, 'warning', 'Admin Audit Log');
  };

  const handleTriggerCodeRedBroadcast = () => {
    triggerNotification(
      '🚨 CITY-WIDE CODE RED AMBER ALERT BROADCASTED',
      'Mass Casualty Protocol active. High-priority push notifications dispatched to all registered donors across Karachi nodes.',
      'emergency',
      'Siren Push + Flash SMS + Radio Node'
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col antialiased selection:bg-rose-500 selection:text-white">
      {/* ==========================================
          STICKY TOP DEMO ROLE SWITCHER BAR
          ========================================== */}
      <header className="sticky top-0 z-50 bg-slate-950 text-white shadow-xl border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3">
          {/* Logo & Platform Tag */}
          <div className="flex items-center space-x-2.5 cursor-pointer" onClick={() => setActiveRole('landing')}>
            <div className="w-8 h-8 rounded-lg bg-rose-600 flex items-center justify-center shadow-md shadow-rose-900/50">
              <Droplet className="w-5 h-5 text-white fill-white" />
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
                RedBridge <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">Live Dispatch</span>
              </span>
              <p className="text-[10px] text-slate-400 -mt-0.5">Emergency Blood Coordination Node</p>
            </div>
          </div>

          {/* Role Switching Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800 overflow-x-auto text-xs">
            <span className="px-2 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-rose-400" /> Switch Role:
            </span>

            <button
              onClick={() => setActiveRole('landing')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                activeRole === 'landing'
                  ? 'bg-rose-600 text-white shadow-sm font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              Public Entry
            </button>

            <button
              onClick={() => setActiveRole('donor')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                activeRole === 'donor'
                  ? 'bg-rose-600 text-white shadow-sm font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Heart className="w-3.5 h-3.5" />
              Donor <span className="opacity-75 font-mono text-[10px] bg-slate-950/60 px-1 rounded">Bilal (O-)</span>
            </button>

            <button
              onClick={() => setActiveRole('recipient')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                activeRole === 'recipient'
                  ? 'bg-rose-600 text-white shadow-sm font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              Recipient <span className="opacity-75 font-mono text-[10px] bg-slate-950/60 px-1 rounded">Sara Khan</span>
            </button>

            <button
              onClick={() => setActiveRole('org')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                activeRole === 'org'
                  ? 'bg-rose-600 text-white shadow-sm font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              Org Rep <span className="opacity-75 font-mono text-[10px] bg-slate-950/60 px-1 rounded">Indus Youth</span>
            </button>

            <button
              onClick={() => setActiveRole('admin')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                activeRole === 'admin'
                  ? 'bg-rose-600 text-white shadow-sm font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Admin
            </button>
          </div>

          {/* Quick Tools & Notification Center */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setRadarTargetRequest(requests[0]);
                setRadarModalOpen(true);
              }}
              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 flex items-center gap-1.5 text-xs transition-colors"
              title="Open Live GPS Dispatch Radar"
            >
              <Compass className="w-4 h-4 text-rose-400" />
              <span className="hidden sm:inline font-medium">GPS Radar</span>
            </button>

            <div className="relative">
              <button
                onClick={() => setIsToastCenterOpen(!isToastCenterOpen)}
                className="relative p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 flex items-center gap-1.5 text-xs transition-colors"
              >
                <Bell className="w-4 h-4 text-rose-400" />
                <span className="hidden sm:inline font-medium">Alerts</span>
                {notifications.length > 0 && (
                  <span className="w-4 h-4 rounded-full bg-rose-600 text-white font-mono text-[10px] flex items-center justify-center font-bold">
                    {notifications.length}
                  </span>
                )}
              </button>

              {/* Notification Drawer Popover */}
              {isToastCenterOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 text-slate-900 overflow-hidden">
                  <div className="px-4 py-3 bg-slate-950 text-white flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-rose-400" />
                      <span className="font-semibold text-xs uppercase tracking-wider">Simulated Dispatch Log</span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">{notifications.length} logged</span>
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 p-1">
                    {notifications.map((n) => (
                      <div key={n.id} className="p-3 hover:bg-slate-50 transition-colors rounded-xl text-left">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            {n.type === 'bulk' ? (
                              <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                            ) : n.type === 'emergency' ? (
                              <Zap className="w-3.5 h-3.5 text-rose-600 fill-rose-600" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            )}
                            {n.title}
                          </span>
                          <span className="text-[10px] text-slate-400">{n.time}</span>
                        </div>
                        <p className="text-xs text-slate-600 leading-snug">{n.body}</p>
                        <div className="mt-2 flex items-center gap-2 text-[10px] font-mono text-slate-500">
                          <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200 flex items-center gap-1">
                            <Send className="w-2.5 h-2.5" /> {n.channel}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center">
                    <button
                      onClick={() => setNotifications([])}
                      className="text-[11px] text-slate-500 hover:text-slate-800 font-medium"
                    >
                      Clear Notification History
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Real-time Floating Toast Alert */}
      {toastBanner && (
        <div className="fixed top-16 right-4 z-50 max-w-sm w-full bg-slate-900 text-white rounded-2xl shadow-2xl p-4 border border-rose-500/40 flex items-start gap-3">
          <div className="p-2 rounded-xl bg-rose-600/30 text-rose-400 border border-rose-500/30 shrink-0">
            <Zap className="w-5 h-5 fill-rose-500" />
          </div>
          <div className="flex-1 text-left">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">{toastBanner.title}</h4>
              <span className="text-[10px] font-mono text-rose-300 bg-rose-950/80 px-1.5 py-0.5 rounded border border-rose-800">
                {toastBanner.channel}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 leading-snug">{toastBanner.body}</p>
          </div>
          <button
            onClick={() => setToastBanner(null)}
            className="text-slate-400 hover:text-white text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* ==========================================
          DYNAMIC ROLE DASHBOARD BODY
          ========================================== */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeRole === 'landing' && (
          <LandingView
            onSelectRole={setActiveRole}
            donors={donors}
            requests={requests}
            onRegisterDonor={(newDonor) => {
              setDonors((prev) => [newDonor, ...prev]);
              triggerNotification(
                'Donor Registration Approved & Live!',
                `Welcome ${newDonor.name}! Readiness Score: ${newDonor.readinessScore}/100. Matched with 3 nearest hospitals.`,
                'success',
                'Email + App Account'
              );
              setActiveRole('donor');
            }}
          />
        )}

        {activeRole === 'donor' && (
          <DonorDashboard
            donor={currentDonor}
            statusInfo={getDonorStatus(currentDonor)}
            requests={requests}
            events={events}
            recurringProfile={recurringProfile}
            onSimulateDonation={handleSimulateDonation}
            onToggleSnooze={handleToggleSnooze}
            onPledge={handlePledgeDonation}
            onRSVP={handleRSVPEvent}
            onOpenDigitalCard={() => setDigitalCardOpen(true)}
            onOpenRadar={(req) => {
              setRadarTargetRequest(req);
              setRadarModalOpen(true);
            }}
            onToggleCareCircle={handleToggleCareCircleSubscription}
            isDonorCompatible={isDonorCompatible}
          />
        )}

        {activeRole === 'recipient' && (
          <RecipientDashboard
            donors={donors}
            requests={requests}
            recurringProfile={recurringProfile}
            onCreateRequest={handleCreateRequest}
            onOpenRadar={(req) => {
              setRadarTargetRequest(req);
              setRadarModalOpen(true);
            }}
            getDonorStatus={getDonorStatus}
            isDonorCompatible={isDonorCompatible}
          />
        )}

        {activeRole === 'org' && (
          <OrgDashboard
            requests={requests}
            events={events}
            donors={donors}
            onCreateEvent={handleCreateEvent}
            onCommitBulk={handleCommitBulkFulfillment}
            getDonorStatus={getDonorStatus}
          />
        )}

        {activeRole === 'admin' && (
          <AdminDashboard
            donors={donors}
            requests={requests}
            events={events}
            getDonorStatus={getDonorStatus}
            onVerifyMR={handleAdminVerifyMR}
            onCloseRequest={handleAdminCloseRequest}
            onResetCooldown={handleAdminResetCooldown}
            onTriggerCodeRed={handleTriggerCodeRedBroadcast}
          />
        )}
      </main>

      {/* Clinical Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-slate-500 text-xs">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Karachi Blood Dispatch Node #1 (Sindh Healthcare Commission Compliant)</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>RBC Compatibility ISO-15189</span>
            <span aria-hidden="true">·</span>
            <span>90-Day Biological Gap Safeguard</span>
            <span aria-hidden="true">·</span>
            <span>Encrypted Hospital MR Validation</span>
          </div>
        </div>
      </footer>

      {/* ==========================================
          MODAL 1: DIGITAL DONOR CARD & CLINICAL PASS
          ========================================== */}
      {digitalCardOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-left shadow-2xl border border-slate-200 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500" />
            <div className="flex items-start justify-between mt-2">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                  Sindh Clinical Blood Pass
                </span>
                <h3 className="text-xl font-bold text-slate-900 mt-1">{currentDonor.name}</h3>
                <p className="text-xs text-slate-500 font-mono">{currentDonor.donorCode}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex flex-col items-center justify-center font-mono font-bold text-lg shadow-md">
                {currentDonor.bloodGroup}
              </div>
            </div>

            {/* Simulated Clinical QR Code */}
            <div className="my-5 p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center">
              <div className="w-32 h-32 bg-white p-2 rounded-xl border border-slate-200 shadow-sm flex items-center justify-center">
                <QrCode className="w-28 h-28 text-slate-800" />
              </div>
              <span className="text-[10px] font-mono text-slate-400 mt-2">
                SCAN AT AKUH / INDUS BLOOD DESK
              </span>
            </div>

            <div className="space-y-1.5 text-xs text-slate-600">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Current Status:</span>
                <span className="font-semibold text-emerald-600">
                  {getDonorStatus(currentDonor).label}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Donor Readiness Score:</span>
                <span className="font-mono font-bold text-slate-800">{currentDonor.readinessScore}/100</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Lifetime Units Donated:</span>
                <span className="font-mono font-bold text-slate-800">{currentDonor.totalDonations} Units</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Emergency Contact:</span>
                <span className="font-mono text-slate-700">{currentDonor.phone}</span>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-2">
              <button
                onClick={() => setDigitalCardOpen(false)}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL 2: LIVE GPS EMERGENCY DISPATCH RADAR
          ========================================== */}
      {radarModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 text-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-slate-800 text-left relative overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-rose-600 text-white">
                  <Compass className="w-5 h-5 animate-spin" style={{ animationDuration: '6s' }} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Live Karachi Dispatch Radar</h3>
                  <p className="text-xs text-slate-400">
                    Real-time geofenced routing · Hospital & Donor Coordinates
                  </p>
                </div>
              </div>
              <button
                onClick={() => setRadarModalOpen(false)}
                className="p-2 text-slate-400 hover:text-white rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Radar Simulation Canvas */}
            <div className="relative my-4 h-64 sm:h-72 rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center">
              {/* Concentric distance rings */}
              <div className="absolute w-24 h-24 rounded-full border border-rose-500/30" />
              <div className="absolute w-44 h-44 rounded-full border border-slate-800" />
              <div className="absolute w-64 h-64 rounded-full border border-slate-800" />

              {/* Grid Crosshairs */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-full h-[1px] bg-slate-800/60" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="h-full w-[1px] bg-slate-800/60" />
              </div>

              {/* Animated Radar Sweep Cone */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-64 h-64 rounded-full border border-transparent animate-radar-sweep pointer-events-none bg-gradient-to-tr from-rose-500/10 via-transparent to-transparent" />
              </div>

              {/* Center Hospital Beacon */}
              <div className="z-10 flex flex-col items-center">
                <div className="w-10 h-10 rounded-2xl bg-rose-600 flex items-center justify-center shadow-lg shadow-rose-600/50">
                  <Hospital className="w-5 h-5 text-white" />
                </div>
                <span className="text-[10px] font-bold text-white mt-1 bg-slate-900/90 px-2 py-0.5 rounded border border-slate-700">
                  {radarTargetRequest?.hospitalName || 'AKUH Trauma Center'}
                </span>
              </div>

              {/* Surrounding Matched Donors */}
              <div className="absolute top-8 left-16 flex items-center gap-1.5 bg-slate-900/90 p-1.5 rounded-xl border border-emerald-500/40">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-[10px] font-mono text-emerald-300">Bilal (O-) · 2.8 km (12 min ETA)</span>
              </div>

              <div className="absolute bottom-10 right-14 flex items-center gap-1.5 bg-slate-900/90 p-1.5 rounded-xl border border-emerald-500/40">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-[10px] font-mono text-emerald-300">Dr. Sana (A+) · 3.1 km</span>
              </div>

              <div className="absolute bottom-12 left-20 flex items-center gap-1.5 bg-slate-900/90 p-1.5 rounded-xl border border-amber-500/40">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="text-[10px] font-mono text-amber-300">Hamza (Cooldown: 22d)</span>
              </div>
            </div>

            <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/80 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-emerald-400" />
                <span className="text-slate-300">
                  Hospital Despatch Gate: <strong>Aga Khan University Hospital Gate 1</strong>
                </span>
              </div>
              <span className="text-emerald-400 font-mono font-bold">12 Min Avg Dispatch ETA</span>
            </div>

            <div className="mt-4 flex items-center justify-end">
              <button
                onClick={() => setRadarModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-md"
              >
                Close Radar View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 4. VIEW: LANDING & ONBOARDING
// ==========================================
interface LandingViewProps {
  onSelectRole: (role: 'landing' | 'donor' | 'recipient' | 'org' | 'admin') => void;
  donors: Donor[];
  requests: BloodRequest[];
  onRegisterDonor: (newDonor: Donor) => void;
}

function LandingView({ onSelectRole, donors, requests, onRegisterDonor }: LandingViewProps) {
  const [showWizard, setShowWizard] = useState(false);

  return (
    <div className="space-y-12 py-4">
      {/* Hero Header */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-100 text-rose-800 text-xs font-semibold tracking-wide border border-rose-200">
          <Sparkles className="w-3.5 h-3.5 text-rose-600" />
          Zero-Latency Emergency Blood Dispatch Infrastructure
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-950 tracking-tight leading-tight" style={{ textWrap: 'balance' }}>
          Every Second Counts When <span className="text-rose-600">Blood is Needed.</span>
        </h1>
        <p className="text-slate-600 text-base sm:text-lg leading-relaxed">
          Intelligent blood-type routing, automated 90-day biological cooldown enforcement,
          and instant mass-casualty escalation connecting hospitals, donors, and blood societies.
        </p>
      </div>

      {/* Dual Core Action Cards */}
      <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {/* Card 1: Register as Donor */}
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl shadow-slate-200/50 hover:border-rose-300 transition-all group flex flex-col justify-between text-left">
          <div className="space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 group-hover:scale-105 transition-transform">
              <Heart className="w-7 h-7 fill-rose-600/20" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-slate-900">Register as a Donor</h3>
              <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                Take the 2-step Medical Safety & Eligibility assessment. Receive hospital alerts only when you are biologically eligible.
              </p>
            </div>
            <ul className="space-y-2 text-xs text-slate-600 pt-2 font-medium">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" /> Auto-sync with 3 nearest hospitals in Karachi
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" /> Automatic 90-day cooldown & snooze protection
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" /> Digital clinical donor ID card with QR
              </li>
            </ul>
          </div>
          <div className="pt-8">
            <button
              onClick={() => setShowWizard(true)}
              className="w-full py-3.5 px-6 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              Start Eligibility Wizard <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Card 2: Request Blood */}
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl shadow-slate-200/50 hover:border-slate-400 transition-all group flex flex-col justify-between text-left">
          <div className="space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 group-hover:scale-105 transition-transform">
              <Activity className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-slate-900">Request Blood Urgently</h3>
              <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                Hospital MR-verified matching engine. Dispatches alerts instantly to compatible donors and blood societies.
              </p>
            </div>
            <ul className="space-y-2 text-xs text-slate-600 pt-2 font-medium">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-rose-600" /> Exact & compatible RBC cross-match algorithm
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-rose-600" /> Auto-escalation for mass requirements &gt; 10 bottles
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-rose-600" /> 1-Click Thalassemia recurring transfusion schedule
              </li>
            </ul>
          </div>
          <div className="pt-8">
            <button
              onClick={() => onSelectRole('recipient')}
              className="w-full py-3.5 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm shadow-lg shadow-slate-900/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              Open Blood Seeker Portal <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Institutional Fast Logins */}
      <div className="bg-slate-100/80 rounded-2xl p-4 max-w-4xl mx-auto border border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs">
        <span className="font-semibold text-slate-600 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-slate-500" /> Institutional & Administrative Access:
        </span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onSelectRole('org')}
            className="px-3.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-slate-300 font-medium text-slate-700 shadow-sm cursor-pointer"
          >
            Organization Portal (Indus Youth)
          </button>
          <button
            onClick={() => onSelectRole('admin')}
            className="px-3.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-slate-300 font-medium text-slate-700 shadow-sm cursor-pointer"
          >
            System Admin Console
          </button>
        </div>
      </div>

      {/* Live System Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto pt-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center">
          <p className="text-2xl font-black text-rose-600 font-mono">{donors.length}</p>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Registered Donors</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center">
          <p className="text-2xl font-black text-emerald-600 font-mono">
            {donors.filter((d) => getDaysSince(d.lastDonationDate) >= 90 && !d.isSnoozed && d.eligibilityPassed).length}
          </p>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Available for Dispatch</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center">
          <p className="text-2xl font-black text-amber-600 font-mono">
            {donors.filter((d) => getDaysSince(d.lastDonationDate) < 90).length}
          </p>
          <p className="text-xs text-slate-500 font-medium mt-0.5">In 90-Day Cooldown</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center">
          <p className="text-2xl font-black text-slate-800 font-mono">{requests.length}</p>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Active Requests</p>
        </div>
      </div>

      {/* Registration Wizard Modal */}
      {showWizard && (
        <DonorEligibilityWizard
          onClose={() => setShowWizard(false)}
          onComplete={(newDonor) => {
            setShowWizard(false);
            onRegisterDonor(newDonor);
          }}
        />
      )}
    </div>
  );
}

// ==========================================
// 5. DONOR ELIGIBILITY WIZARD MODAL (2-STEP)
// ==========================================
interface WizardProps {
  onClose: () => void;
  onComplete: (donor: Donor) => void;
}

function DonorEligibilityWizard({ onClose, onComplete }: WizardProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    bloodGroup: 'O+',
    age: '25',
    weight: '68',
    maritalStatus: 'Single',
    cityArea: 'Gulshan-e-Iqbal',
    selectedHospitals: [
      'Aga Khan University Hospital (AKUH)',
      'Liaquat National Hospital Blood Bank',
      'Indus Hospital & Health Network'
    ]
  });

  // Step 2 checklist
  const [checks, setChecks] = useState({
    ageWeight: true,
    tattoosPiercings: true,
    surgeryTransfusion: true,
    chronicIllness: true,
    pregnancyMedication: true
  });

  const allPassed = Object.values(checks).every(Boolean);

  const calculateReadinessScore = () => {
    let score = 70;
    if (Number(formData.weight) >= 65) score += 10;
    if (Number(formData.age) >= 21 && Number(formData.age) <= 50) score += 10;
    if (formData.selectedHospitals.length >= 3) score += 10;
    return Math.min(100, score);
  };

  const handleFinish = () => {
    if (!allPassed) return;
    const newDonor: Donor = {
      id: `d-${Date.now()}`,
      name: formData.name || 'New Registered Donor',
      phone: formData.phone || '+92 300 0000000',
      bloodGroup: formData.bloodGroup,
      age: Number(formData.age),
      weight: Number(formData.weight),
      cityArea: formData.cityArea,
      lat: 24.89 + (Math.random() - 0.5) * 0.08,
      lng: 67.08 + (Math.random() - 0.5) * 0.08,
      lastDonationDate: '2023-01-01', // fresh eligible
      isSnoozed: false,
      snoozeUntil: null,
      eligibilityPassed: true,
      readinessScore: calculateReadinessScore(),
      totalDonations: 0,
      donorCode: `RB-KHI-${Math.floor(1000 + Math.random() * 9000)}`,
      history: [],
      nearestCenters: formData.selectedHospitals
    };
    onComplete(newDonor);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 text-left max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">
              Step {step} of 2 · Medical Qualification
            </span>
            <h2 className="text-xl font-bold text-slate-900">
              {step === 1 ? 'Donor Profile & Nearest Centers' : 'Clinical Safety Checklist'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer">
            ✕
          </button>
        </div>

        {step === 1 && (
          <div className="space-y-4 pt-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700">Full Legal Name</label>
                <input
                  type="text"
                  placeholder="e.g. Bilal Ahmed"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 w-full p-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700">Phone Number (SMS Alert Node)</label>
                <input
                  type="text"
                  placeholder="+92 300 1234567"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="mt-1 w-full p-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700">Blood Group</label>
                <select
                  value={formData.bloodGroup}
                  onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                  className="mt-1 w-full p-2.5 rounded-xl border border-slate-300 text-sm font-bold text-rose-600 bg-white outline-none cursor-pointer"
                >
                  {BLOOD_GROUPS.map((bg) => (
                    <option key={bg} value={bg}>
                      {bg}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700">Age (Yrs)</label>
                <input
                  type="number"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                  className="mt-1 w-full p-2.5 rounded-xl border border-slate-300 text-sm outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700">Weight (kg)</label>
                <input
                  type="number"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                  className="mt-1 w-full p-2.5 rounded-xl border border-slate-300 text-sm outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700">Residential City / Sector</label>
              <input
                type="text"
                placeholder="e.g. PECHS Block 6, Karachi"
                value={formData.cityArea}
                onChange={(e) => setFormData({ ...formData, cityArea: e.target.value })}
                className="mt-1 w-full p-2.5 rounded-xl border border-slate-300 text-sm outline-none"
              />
            </div>

            {/* Auto Finder: 3 Nearest Hospitals */}
            <div className="pt-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                <span>3 Nearest Verified Donation Centers</span>
                <span className="text-[10px] text-emerald-600 font-mono">Auto-Geolocated</span>
              </div>
              <div className="mt-2 space-y-2">
                {KARACHI_HOSPITALS.slice(0, 3).map((center) => (
                  <div
                    key={center.id}
                    className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <Hospital className="w-4 h-4 text-rose-600" />
                      <div>
                        <p className="font-semibold text-slate-800">{center.name}</p>
                        <p className="text-[11px] text-slate-500">{center.area}</p>
                      </div>
                    </div>
                    <span className="font-mono text-slate-600 font-bold bg-white px-2 py-0.5 rounded border border-slate-200">
                      {center.distance} km
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => {
                if (!formData.name) {
                  alert('Please enter your full legal name');
                  return;
                }
                setStep(2);
              }}
              className="w-full mt-4 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              Continue to Medical Safety Check <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 pt-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Under World Health Organization & Sindh Blood Transfusion Authority mandates, all 5 points must be cleared to activate donation readiness.
              </span>
            </div>

            <div className="space-y-3 pt-2">
              {[
                {
                  key: 'ageWeight' as const,
                  title: 'Age & Physical Mass Baseline',
                  desc: 'I confirm I am between 18 and 65 years old and weigh at least 50 kg.'
                },
                {
                  key: 'tattoosPiercings' as const,
                  title: 'No Skin Invasions (6-Month Rule)',
                  desc: 'No tattoos, microblading, body piercings, or acupuncture procedures in the last 6 months.'
                },
                {
                  key: 'surgeryTransfusion' as const,
                  title: 'No Recent Surgeries or Transfusions',
                  desc: 'Have not undergone major surgical procedures or received blood components within the past 6 months.'
                },
                {
                  key: 'chronicIllness' as const,
                  title: 'Pathogen & Chronic Organ Clearance',
                  desc: 'Negative for Hepatitis B/C, HIV/AIDS, malaria (in last 3 months), and no active heart or renal diseases.'
                },
                {
                  key: 'pregnancyMedication' as const,
                  title: 'Pregnancy & Drug Clearance',
                  desc: 'Not currently pregnant, nursing, or undergoing systemic immunosuppressive medications.'
                }
              ].map((item) => (
                <label
                  key={item.key}
                  className={`flex items-start gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                    checks[item.key]
                      ? 'bg-emerald-50/50 border-emerald-300'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checks[item.key]}
                    onChange={(e) => setChecks({ ...checks, [item.key]: e.target.checked })}
                    className="mt-0.5 w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                  />
                  <div>
                    <span className="font-semibold text-slate-900 block">{item.title}</span>
                    <span className="text-slate-500 text-[11px] leading-snug">{item.desc}</span>
                  </div>
                </label>
              ))}
            </div>

            {!allPassed ? (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>
                  <strong>Medical Deferral Notice:</strong> One or more safety criteria are unchecked. You cannot be activated as an on-call emergency donor at this time.
                </span>
              </div>
            ) : (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    <strong>Eligibility Approved!</strong> Computed Readiness Score:
                  </span>
                </div>
                <span className="font-mono font-bold text-sm text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-300">
                  {calculateReadinessScore()} / 100
                </span>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setStep(1)}
                className="w-1/3 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer"
              >
                Back
              </button>
              <button
                disabled={!allPassed}
                onClick={handleFinish}
                className={`w-2/3 py-3 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer ${
                  allPassed
                    ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/30'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                Complete Registration & Activate
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// 6. VIEW 1: DONOR DASHBOARD
// ==========================================
interface DonorDashboardProps {
  donor: Donor;
  statusInfo: { status: string; label: string; color: string; daysLeft: number; progress: number };
  requests: BloodRequest[];
  events: BloodDriveEvent[];
  recurringProfile: RecurringPatient;
  onSimulateDonation: () => void;
  onToggleSnooze: (duration?: string) => void;
  onPledge: (reqId: string) => void;
  onRSVP: (eventId: string) => void;
  onOpenDigitalCard: () => void;
  onOpenRadar: (req: BloodRequest) => void;
  onToggleCareCircle: () => void;
  isDonorCompatible: (donorBlood: string, recipientBlood: string) => boolean;
}

function DonorDashboard({
  donor,
  statusInfo,
  requests,
  events,
  recurringProfile,
  onSimulateDonation,
  onToggleSnooze,
  onPledge,
  onRSVP,
  onOpenDigitalCard,
  onOpenRadar,
  onToggleCareCircle,
  isDonorCompatible
}: DonorDashboardProps) {
  const [snoozeModal, setSnoozeModal] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState('24 Hours');

  // Filter urgent compatible requests
  const compatibleEmergencyRequests = useMemo(() => {
    return requests.filter((r) => {
      const match = isDonorCompatible(donor.bloodGroup, r.bloodGroup);
      return match && r.status !== 'Closed / Fulfilled';
    });
  }, [requests, donor.bloodGroup, isDonorCompatible]);

  const isSubscribedToCareCircle = recurringProfile.careCircleSubscribers.includes(donor.id);

  return (
    <div className="space-y-6 text-left">
      {/* Status Header Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl shadow-slate-100 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          {/* Identity & Blood Pill */}
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-rose-600 text-white flex flex-col items-center justify-center shadow-lg shadow-rose-600/30 shrink-0">
              <span className="text-xl font-black font-mono leading-none">{donor.bloodGroup}</span>
              <span className="text-[9px] uppercase tracking-wider font-semibold opacity-80 mt-0.5">Universal</span>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-2xl font-bold text-slate-900">{donor.name}</h2>
                <span className="text-xs text-slate-500 font-mono">
                  {donor.phone}
                </span>
                <span aria-hidden="true" className="text-slate-300">·</span>
                <span className="text-xs text-slate-500">
                  {donor.cityArea}
                </span>
              </div>

              {/* Status Badge & Cooldown Counter */}
              <div className="flex items-center gap-3 mt-3 flex-wrap">
                {statusInfo.status === 'Available' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold border border-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Available for Emergency Dispatch
                  </span>
                )}
                {statusInfo.status === 'Cooldown' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-semibold border border-amber-300">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    Resting: {statusInfo.daysLeft} Days Remaining (Biological Gap)
                  </span>
                )}
                {statusInfo.status === 'Snoozed' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-200 text-slate-800 text-xs font-semibold border border-slate-300">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    {statusInfo.label}
                  </span>
                )}

                {/* Score Pill */}
                <div
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-800 text-xs font-bold border border-rose-200"
                  title="Computed based on verified health check, 0 deferred flags, and center proximity."
                >
                  <Award className="w-3.5 h-3.5 text-rose-600" />
                  Readiness Score: {donor.readinessScore}/100
                </div>

                {/* Digital Card Button */}
                <button
                  onClick={onOpenDigitalCard}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 cursor-pointer"
                >
                  <QrCode className="w-3.5 h-3.5 text-slate-600" />
                  View Clinical QR Pass
                </button>
              </div>
            </div>
          </div>

          {/* Action Control Buttons */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {/* Snooze Button */}
            <button
              onClick={() => {
                if (donor.isSnoozed) {
                  onToggleSnooze();
                } else {
                  setSnoozeModal(true);
                }
              }}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                donor.isSnoozed
                  ? 'bg-amber-500 text-white border-amber-600 hover:bg-amber-600'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              {donor.isSnoozed ? 'Resume Emergency Alerts' : 'Snooze (Temporarily Busy)'}
            </button>

            {/* Simulate Donation Completed Button */}
            <button
              onClick={onSimulateDonation}
              className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-md shadow-rose-600/20 flex items-center gap-2 transition-all cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5" />
              Simulate Donation Completed Today
            </button>
          </div>
        </div>

        {/* Live Cooldown Progress Bar if in cooldown */}
        {statusInfo.status === 'Cooldown' && (
          <div className="mt-6 pt-6 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-semibold text-slate-700 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-500" /> 90-Day Biological Recovery Bar
              </span>
              <span className="font-mono text-slate-500 font-bold">
                {statusInfo.progress}% Elapsed ({statusInfo.daysLeft} days until eligible)
              </span>
            </div>
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-rose-500 rounded-full transition-all duration-500"
                style={{ width: `${statusInfo.progress}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Next eligible donation date:{' '}
              <strong className="text-slate-800">
                {new Date(Date.now() + statusInfo.daysLeft * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </strong>
              . You are currently shielded from emergency notifications.
            </p>
          </div>
        )}
      </div>

      {/* Grid: Nearest Donation Centers & Emergency Feeds */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column: Nearest Donation Centers & History */}
        <div className="space-y-6">
          {/* Thalassemia Care Circle Rotation Module */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm text-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <CalendarCheck2 className="w-4 h-4 text-rose-600" />
                Thalassemia Care Circle
              </span>
              <span className="text-[10px] font-mono font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                Active Cycle
              </span>
            </div>
            <p className="text-slate-600 leading-snug">
              Subscribed to provide recurring transfusions for <strong>{recurringProfile.patientName}</strong> at Indus Hospital.
            </p>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1 font-mono text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-500">Next Scheduled Date:</span>
                <span className="font-bold text-slate-800">{recurringProfile.nextTransfusionDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Circle Rotation:</span>
                <span className="font-bold text-emerald-600">{recurringProfile.careCircleSubscribers.length} Donors Rotating</span>
              </div>
            </div>
            <button
              onClick={onToggleCareCircle}
              className={`w-full py-2.5 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all ${
                isSubscribedToCareCircle
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  : 'bg-rose-600 hover:bg-rose-700 text-white'
              }`}
            >
              {isSubscribedToCareCircle ? '✓ Subscribed to Rotation (Click to step down)' : 'Join This Patient Care Circle'}
            </button>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900">Your Nearest Hospital Centers</h3>
              <MapPin className="w-4 h-4 text-rose-600" />
            </div>
            <p className="text-xs text-slate-500 mt-0.5 mb-4">Linked for fast dispatch routing</p>

            <div className="space-y-3">
              {KARACHI_HOSPITALS.slice(0, 3).map((center) => (
                <div
                  key={center.id}
                  className="p-3 rounded-2xl bg-slate-50 border border-slate-100 hover:border-slate-300 transition-all text-xs"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-bold text-slate-900">{center.name}</p>
                      <p className="text-slate-500 text-[11px] mt-0.5">{center.area}</p>
                    </div>
                    <span className="font-mono font-bold text-rose-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {center.distance} km
                    </span>
                  </div>
                  <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-600">
                    <span className="flex items-center gap-1 font-mono">
                      <Phone className="w-3 h-3 text-slate-400" /> {center.phone}
                    </span>
                    <span className="text-rose-600 font-semibold">Directions</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Donation History Log */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900">Your Donation History</h3>
              <Award className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-xs text-slate-500 mt-0.5 mb-3">{donor.totalDonations} Lifetime Life-Saving Units</p>

            <div className="space-y-2.5">
              {donor.history.map((log) => (
                <div key={log.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                  <div className="flex items-center justify-between font-semibold text-slate-800">
                    <span>{log.hospital}</span>
                    <span className="font-mono text-emerald-600">+{log.units} Unit</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                    <span>{log.date}</span>
                    <span className="font-mono">{log.recipientMR}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center/Right Column: Live Compatible Emergency Requests & Drives */}
        <div className="lg:col-span-2 space-y-6">
          {/* Compatible Emergency Requests Feed */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-rose-600 fill-rose-600" />
                  Live Emergency Requests Near You
                </h3>
                <p className="text-xs text-slate-500">
                  Filtered by your blood group <span className="font-bold text-rose-600">{donor.bloodGroup}</span> compatibility
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-mono font-bold">
                {compatibleEmergencyRequests.length} Active
              </span>
            </div>

            {statusInfo.status !== 'Available' ? (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">You are currently in {statusInfo.status} status.</p>
                  <p className="mt-0.5 text-amber-800">
                    Emergency notifications and pledge actions are temporarily disabled to ensure medical safety.
                  </p>
                </div>
              </div>
            ) : null}

            <div className="space-y-3.5 mt-4">
              {compatibleEmergencyRequests.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">No emergency requests in your area right now.</p>
              ) : (
                compatibleEmergencyRequests.map((req) => {
                  const isPledged = req.pledgedDonors?.includes(donor.id);
                  return (
                    <div
                      key={req.id}
                      className={`p-4 sm:p-5 rounded-2xl border transition-all text-xs ${
                        req.isBulk
                          ? 'bg-amber-50/40 border-amber-200'
                          : 'bg-white border-slate-200 hover:border-rose-300'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-rose-600 text-white font-mono font-bold text-xs">
                            {req.bloodGroup}
                          </span>
                          <h4 className="font-bold text-slate-900 text-sm">{req.patientName}</h4>
                          {req.isBulk && (
                            <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px] uppercase">
                              Bulk Requirement
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-mono text-rose-600 font-semibold bg-rose-50 px-2 py-0.5 rounded">
                          {req.urgency}
                        </span>
                      </div>

                      <div className="grid sm:grid-cols-3 gap-2 py-3 text-slate-600">
                        <div>
                          <p className="text-[10px] text-slate-400">Hospital & Center</p>
                          <p className="font-semibold text-slate-800">{req.hospitalName}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400">MR Record Number</p>
                          <p className="font-mono text-slate-700">{req.mrNumber}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400">Units Needed</p>
                          <p className="font-bold text-slate-900">{req.quantity} Bottles</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <button
                          onClick={() => onOpenRadar(req)}
                          className="text-[11px] text-rose-600 font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                        >
                          <Compass className="w-3.5 h-3.5" /> View on Live GPS Radar
                        </button>
                        {isPledged ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 font-semibold text-xs">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Pledge Confirmed
                          </span>
                        ) : (
                          <button
                            disabled={statusInfo.status !== 'Available'}
                            onClick={() => onPledge(req.id)}
                            className={`px-4 py-2 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                              statusInfo.status === 'Available'
                                ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20'
                                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            }`}
                          >
                            <Heart className="w-3.5 h-3.5" /> Accept & Pledge Donation
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Upcoming Blood Drives / Community Events */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-1">
              <Calendar className="w-5 h-5 text-indigo-600" />
              Community Blood Drives in Karachi
            </h3>
            <p className="text-xs text-slate-500 mb-4">Organized by verified university societies & NGOs</p>

            <div className="grid sm:grid-cols-2 gap-4">
              {events.map((ev) => (
                <div key={ev.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs flex flex-col justify-between">
                  <div className="space-y-2">
                    <span className="text-[10px] uppercase font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                      {ev.orgName}
                    </span>
                    <h4 className="font-bold text-slate-900 text-sm leading-snug">{ev.title}</h4>
                    <p className="text-slate-600 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {ev.venue}
                    </p>
                    <p className="text-slate-600 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {ev.date}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between">
                    <span className="font-mono text-slate-500">{ev.rsvps} Donors Registered</span>
                    <button
                      onClick={() => onRSVP(ev.id)}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs cursor-pointer"
                    >
                      {ev.userRsvp ? '✓ RSVP Done' : 'RSVP & Remind'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Snooze Options Modal */}
      {snoozeModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-left shadow-2xl">
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" /> Temporarily Snooze Emergency Alerts
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Select duration. Your Donor Readiness score will remain safe and intact.
            </p>
            <div className="space-y-2 mt-4 text-xs">
              {['24 Hours', '3 Days', '7 Days', 'Until Weekend'].map((dur) => (
                <button
                  key={dur}
                  onClick={() => setSelectedDuration(dur)}
                  className={`w-full p-2.5 rounded-xl border text-left font-semibold flex items-center justify-between cursor-pointer ${
                    selectedDuration === dur
                      ? 'border-rose-500 bg-rose-50 text-rose-800'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>{dur}</span>
                  {selectedDuration === dur && <Check className="w-4 h-4 text-rose-600" />}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={() => setSnoozeModal(false)}
                className="w-1/2 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setSnoozeModal(false);
                  onToggleSnooze(selectedDuration);
                }}
                className="w-1/2 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold cursor-pointer"
              >
                Confirm Snooze
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 7. VIEW 2: RECIPIENT DASHBOARD
// ==========================================
interface RecipientDashboardProps {
  donors: Donor[];
  requests: BloodRequest[];
  recurringProfile: RecurringPatient;
  onCreateRequest: (data: {
    patientName: string;
    mrNumber: string;
    hospitalName: string;
    cityArea?: string;
    bloodGroup: string;
    quantity: string | number;
    urgency: string;
    isRecurring?: boolean;
    recurrenceSchedule?: string | null;
  }) => void;
  onOpenRadar: (req: BloodRequest) => void;
  getDonorStatus: (donor: Donor) => { status: string; label: string; color: string; daysLeft: number; progress: number };
  isDonorCompatible: (donorBlood: string, recipientBlood: string) => boolean;
}

function RecipientDashboard({
  donors,
  requests,
  recurringProfile,
  onCreateRequest,
  onOpenRadar,
  getDonorStatus,
  isDonorCompatible
}: RecipientDashboardProps) {
  const [formData, setFormData] = useState({
    patientName: '',
    hospitalName: 'Aga Khan University Hospital (AKUH)',
    mrNumber: '',
    bloodGroup: 'B+',
    quantity: '2',
    urgency: 'Critical - Within 2 Hrs',
    isRecurring: false,
    recurrenceSchedule: 'Every 3 Weeks'
  });

  // Directory filter states
  const [filterGroup, setFilterGroup] = useState('ALL');
  const [compatMode, setCompatMode] = useState<'exact' | 'compatible'>('compatible');
  const [filterAvailability, setFilterAvailability] = useState('ALL');

  const isBulkAlert = Number(formData.quantity) > 10;

  // Apply Quick Recurring Profile
  const handleApplyRecurringProfile = () => {
    setFormData({
      patientName: recurringProfile.patientName,
      hospitalName: recurringProfile.hospitalName,
      mrNumber: recurringProfile.mrNumber,
      bloodGroup: recurringProfile.bloodGroup,
      quantity: String(recurringProfile.quantity),
      urgency: 'Urgent - 24 Hrs',
      isRecurring: true,
      recurrenceSchedule: recurringProfile.schedule
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.patientName || !formData.mrNumber) {
      alert('Patient Name and Hospital MR Number are strictly required for clinical verification.');
      return;
    }
    onCreateRequest(formData);
    // Reset form
    setFormData({
      patientName: '',
      hospitalName: 'Aga Khan University Hospital (AKUH)',
      mrNumber: '',
      bloodGroup: 'B+',
      quantity: '2',
      urgency: 'Critical - Within 2 Hrs',
      isRecurring: false,
      recurrenceSchedule: 'Every 3 Weeks'
    });
  };

  // Filtered Donors in Directory
  const filteredDonors = useMemo(() => {
    return donors.filter((d) => {
      const statusInfo = getDonorStatus(d);

      // Filter by blood compatibility
      if (filterGroup !== 'ALL') {
        if (compatMode === 'exact') {
          if (d.bloodGroup !== filterGroup) return false;
        } else {
          if (!isDonorCompatible(d.bloodGroup, filterGroup)) return false;
        }
      }

      // Filter by availability
      if (filterAvailability === 'AVAILABLE' && statusInfo.status !== 'Available') return false;
      if (filterAvailability === 'COOLDOWN' && statusInfo.status !== 'Cooldown') return false;
      if (filterAvailability === 'SNOOZED' && statusInfo.status !== 'Snoozed') return false;

      return true;
    });
  }, [donors, filterGroup, compatMode, filterAvailability, getDonorStatus, isDonorCompatible]);

  return (
    <div className="space-y-8 text-left">
      {/* Top Banner: Recurring Profile Quick-Fill */}
      <div className="bg-gradient-to-r from-rose-900 to-slate-950 text-white rounded-3xl p-6 sm:p-7 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-rose-500/30 text-rose-300 font-mono text-[10px] uppercase font-bold border border-rose-400/30">
              Recurring Care Circle Available
            </span>
            <span className="text-xs text-slate-300">Thalassemia Regular Transfusion Protocol</span>
          </div>
          <h3 className="text-xl font-bold">{recurringProfile.patientName}</h3>
          <p className="text-xs text-slate-300">
            MR# <span className="font-mono">{recurringProfile.mrNumber}</span> · {recurringProfile.hospitalName} · Needs {recurringProfile.quantity} units {recurringProfile.bloodGroup} ({recurringProfile.schedule})
          </p>
        </div>
        <button
          onClick={handleApplyRecurringProfile}
          className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-600/30 flex items-center gap-2 transition-all shrink-0 cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" /> 1-Click Fill Recurring Request
        </button>
      </div>

      {/* Main Grid: Request Creation Form & Active Requests Tracker */}
      <div className="grid lg:grid-cols-12 gap-8">
        {/* Left Col: Request Blood Form */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xl shadow-slate-100 space-y-5">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Droplet className="w-5 h-5 text-rose-600 fill-rose-600" />
              New Emergency Blood Request
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Clinical dispatch with real-time donor matching</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="font-semibold text-slate-700">Patient Full Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Sara Khan (ICU Ward 3)"
                value={formData.patientName}
                onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                className="mt-1 w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-rose-500 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700">Hospital MR Record #</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AKUH-90821"
                  value={formData.mrNumber}
                  onChange={(e) => setFormData({ ...formData, mrNumber: e.target.value })}
                  className="mt-1 w-full p-2.5 rounded-xl border border-slate-300 font-mono text-xs focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700">Required Blood Group</label>
                <select
                  value={formData.bloodGroup}
                  onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                  className="mt-1 w-full p-2.5 rounded-xl border border-slate-300 font-bold text-rose-600 bg-white text-xs outline-none cursor-pointer"
                >
                  {BLOOD_GROUPS.map((bg) => (
                    <option key={bg} value={bg}>
                      {bg}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700">Hospital / Medical Center</label>
              <select
                value={formData.hospitalName}
                onChange={(e) => setFormData({ ...formData, hospitalName: e.target.value })}
                className="mt-1 w-full p-2.5 rounded-xl border border-slate-300 bg-white text-xs outline-none cursor-pointer"
              >
                {KARACHI_HOSPITALS.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name} ({c.area})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700">Units Needed (Bottles)</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  required
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  className="mt-1 w-full p-2.5 rounded-xl border border-slate-300 font-mono font-bold text-xs outline-none"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700">Urgency Level</label>
                <select
                  value={formData.urgency}
                  onChange={(e) => setFormData({ ...formData, urgency: e.target.value })}
                  className="mt-1 w-full p-2.5 rounded-xl border border-slate-300 text-xs bg-white outline-none font-semibold text-slate-800 cursor-pointer"
                >
                  <option value="Critical - Within 2 Hrs">Critical - Within 2 Hrs</option>
                  <option value="Urgent - 24 Hrs">Urgent - 24 Hrs</option>
                  <option value="Scheduled Elective">Scheduled Elective</option>
                </select>
              </div>
            </div>

            {/* BULK WARNING BANNER (>10 UNITS) */}
            {isBulkAlert && (
              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <Flame className="w-4 h-4 text-amber-600 fill-amber-600" />
                  <span>Mass Bulk Requirement Escalation Active (&gt; 10 Units)</span>
                </div>
                <p className="text-[11px] leading-relaxed text-amber-800">
                  Because this request exceeds 10 units, it will automatically alert all verified Organization Reps (universities, blood societies, NGOs) to dispatch batch supplies from their reserves.
                </p>
              </div>
            )}

            {/* RECURRING PATIENT TOGGLE */}
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <span className="font-bold text-slate-800 block">Recurring Transfusion Mode</span>
                  <span className="text-[11px] text-slate-500">For Thalassemia or regular transfusion care</span>
                </div>
                <input
                  type="checkbox"
                  checked={formData.isRecurring}
                  onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                  className="w-4 h-4 text-rose-600 rounded cursor-pointer"
                />
              </label>

              {formData.isRecurring && (
                <div className="pt-2 border-t border-slate-200">
                  <label className="font-semibold text-slate-700 block mb-1">Recurrence Schedule</label>
                  <select
                    value={formData.recurrenceSchedule}
                    onChange={(e) => setFormData({ ...formData, recurrenceSchedule: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-300 bg-white text-xs cursor-pointer"
                  >
                    <option value="Every 2 Weeks">Every 2 Weeks</option>
                    <option value="Every 3 Weeks">Every 3 Weeks (Standard Thalassemia)</option>
                    <option value="Monthly">Monthly</option>
                  </select>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" /> Dispatch Emergency Request
            </button>
          </form>
        </div>

        {/* Right Col: Active Emergency Tracker & Commitments */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-rose-600" />
                  Active Hospital Request Tracker
                </h3>
                <p className="text-xs text-slate-500">Live fulfillment status & donor responses</p>
              </div>
              <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                {requests.length} Dispatched
              </span>
            </div>

            <div className="space-y-4">
              {requests.map((r) => (
                <div
                  key={r.id}
                  className={`p-4 sm:p-5 rounded-2xl border text-xs space-y-3 ${
                    r.isBulk ? 'bg-amber-50/20 border-amber-200' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-rose-600 text-white font-mono font-bold flex items-center justify-center text-xs">
                        {r.bloodGroup}
                      </span>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{r.patientName}</h4>
                        <p className="text-[11px] text-slate-500 font-mono">
                          MR# {r.mrNumber} · {r.hospitalName}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onOpenRadar(r)}
                        className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:text-rose-600 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Compass className="w-3 h-3 text-rose-500" /> GPS Radar
                      </button>
                      <span
                        className={`px-2.5 py-1 rounded-full font-bold text-[10px] uppercase font-mono ${
                          r.status === 'Closed / Fulfilled'
                            ? 'bg-emerald-100 text-emerald-800'
                            : r.isBulk
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {r.status}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-2 bg-white p-3 rounded-xl border border-slate-200/80">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Required</span>
                      <span className="font-bold text-slate-900">{r.quantity} Units</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Pledged Donors</span>
                      <span className="font-bold text-emerald-600">
                        {r.pledgedDonors?.length || 0} Donors On Route
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Org Bulk Units</span>
                      <span className="font-bold text-indigo-600">
                        {r.committedByOrgs?.reduce((acc, c) => acc + c.units, 0) || 0} Units
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Hospital MR</span>
                      <span className="font-bold text-slate-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Verified
                      </span>
                    </div>
                  </div>

                  {/* Bulk commitments display */}
                  {r.committedByOrgs?.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-950 text-[11px] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-indigo-600" />
                        <span>
                          <strong>{r.committedByOrgs[0].orgName}</strong> committed {r.committedByOrgs[0].units} units from emergency reserve.
                        </span>
                      </div>
                      <span className="font-mono font-bold text-indigo-600">Dispatched</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Live Donor Directory & Compatibility Matcher */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-rose-600" />
              Live Donor Directory & RBC Compatibility Matcher
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Real-time availability status showing active donors and those shielded by 90-day cooldown
            </p>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Target Blood Group */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <span className="text-[11px] font-semibold text-slate-500 px-2">Patient Blood:</span>
              <select
                value={filterGroup}
                onChange={(e) => setFilterGroup(e.target.value)}
                className="bg-white font-bold text-rose-600 rounded-lg px-2 py-1 border border-slate-200 outline-none cursor-pointer"
              >
                <option value="ALL">All Groups</option>
                {BLOOD_GROUPS.map((bg) => (
                  <option key={bg} value={bg}>
                    {bg}
                  </option>
                ))}
              </select>
            </div>

            {/* Compatibility Mode */}
            {filterGroup !== 'ALL' && (
              <div className="flex items-center bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setCompatMode('compatible')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                    compatMode === 'compatible' ? 'bg-rose-600 text-white' : 'text-slate-600'
                  }`}
                >
                  All Compatible Donors
                </button>
                <button
                  onClick={() => setCompatMode('exact')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                    compatMode === 'exact' ? 'bg-rose-600 text-white' : 'text-slate-600'
                  }`}
                >
                  Exact Match Only
                </button>
              </div>
            )}

            {/* Availability Filter */}
            <select
              value={filterAvailability}
              onChange={(e) => setFilterAvailability(e.target.value)}
              className="bg-slate-100 font-medium text-slate-700 rounded-xl px-3 py-1.5 border border-slate-200 outline-none cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="AVAILABLE">Available Now (Green)</option>
              <option value="COOLDOWN">In 90-Day Cooldown (Amber)</option>
              <option value="SNOOZED">Snoozed</option>
            </select>
          </div>
        </div>

        {/* Donors Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredDonors.map((d) => {
            const st = getDonorStatus(d);
            return (
              <div
                key={d.id}
                className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 transition-all text-xs flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 font-mono font-bold flex items-center justify-center border border-rose-200">
                        {d.bloodGroup}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm leading-tight">{d.name}</h4>
                        <p className="text-[11px] text-slate-400">{d.cityArea}</p>
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="mt-3">
                    {st.status === 'Available' && (
                      <span className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-[11px] font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Available Now
                      </span>
                    )}
                    {st.status === 'Cooldown' && (
                      <span className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 text-[11px] font-semibold">
                        <Clock className="w-3.5 h-3.5 text-amber-600" /> Cooldown ({st.daysLeft}d left)
                      </span>
                    )}
                    {st.status === 'Snoozed' && (
                      <span className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-200 text-slate-700 text-[11px] font-semibold">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Snoozed
                      </span>
                    )}
                  </div>

                  <div className="mt-3 space-y-1 text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <span>Readiness Score:</span>
                      <span className="font-mono font-bold text-slate-800">{d.readinessScore}/100</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Total Donations:</span>
                      <span className="font-mono font-bold text-slate-800">{d.totalDonations}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Last Donated:</span>
                      <span className="font-mono text-slate-600">{d.lastDonationDate || 'First Time'}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <span className="text-[10px] text-slate-400 block truncate">
                    Near: {d.nearestCenters[0]}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 8. VIEW 3: ORGANIZATION REP DASHBOARD
// ==========================================
interface OrgDashboardProps {
  requests: BloodRequest[];
  events: BloodDriveEvent[];
  donors: Donor[];
  onCreateEvent: (data: {
    title: string;
    venue: string;
    date: string;
    targetUnits: number | string;
    partnerBloodBank: string;
  }) => void;
  onCommitBulk: (requestId: string, units: number) => void;
  getDonorStatus: (donor: Donor) => { status: string; label: string; color: string; daysLeft: number; progress: number };
}

function OrgDashboard({
  requests,
  events,
  donors,
  onCreateEvent,
  onCommitBulk,
  getDonorStatus
}: OrgDashboardProps) {
  const [showEventForm, setShowEventForm] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    venue: '',
    date: 'Next Saturday, 10:00 AM',
    targetUnits: '100',
    partnerBloodBank: 'Indus Hospital Blood Transfusion Service'
  });

  const [bulkModal, setBulkModal] = useState<BloodRequest | null>(null);
  const [commitCount, setCommitCount] = useState('6');

  // Filter urgent bulk requests (>10 units)
  const bulkRequests = requests.filter((r) => r.isBulk && r.status !== 'Closed / Fulfilled');

  const handleEventSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.title || !newEvent.venue) {
      alert('Event title and venue are required.');
      return;
    }
    onCreateEvent(newEvent);
    setShowEventForm(false);
    setNewEvent({
      title: '',
      venue: '',
      date: 'Next Saturday, 10:00 AM',
      targetUnits: '100',
      partnerBloodBank: 'Indus Hospital Blood Transfusion Service'
    });
  };

  return (
    <div className="space-y-8 text-left">
      {/* Org Header Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30 shrink-0">
            <Building2 className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-slate-900">Indus Youth Blood Society</h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase">
                Verified NGO Partner
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Affiliated with Indus Hospital & Health Network · Regional Emergency Dispatcher
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowEventForm(true)}
          className="px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all shrink-0 cursor-pointer"
        >
          <Calendar className="w-4 h-4" /> Schedule New Blood Drive
        </button>
      </div>

      {/* DEDICATED INBOX: URGENT BULK REQUESTS (>10 UNITS) */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Flame className="w-5 h-5 text-amber-500 fill-amber-500" />
              Urgent Bulk Escalations Queue (&gt;10 Units Required)
            </h3>
            <p className="text-xs text-slate-500">
              High-volume surgical and mass trauma requests routed to institutional societies
            </p>
          </div>
          <span className="font-mono text-xs font-bold text-amber-900 bg-amber-100 px-3 py-1 rounded-full border border-amber-300">
            {bulkRequests.length} Active Escalations
          </span>
        </div>

        {bulkRequests.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">No high-volume bulk requests pending.</p>
        ) : (
          <div className="space-y-3.5">
            {bulkRequests.map((req) => (
              <div
                key={req.id}
                className="p-5 rounded-2xl bg-amber-50/50 border border-amber-300 text-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-mono font-bold text-xs">
                      {req.bloodGroup}
                    </span>
                    <h4 className="font-bold text-slate-900 text-sm">{req.patientName}</h4>
                    <span className="font-mono text-slate-500">MR# {req.mrNumber}</span>
                  </div>
                  <p className="text-slate-600">
                    Hospital: <strong className="text-slate-800">{req.hospitalName}</strong> · Needed:{' '}
                    <strong className="text-rose-600 text-sm">{req.quantity} Bottles</strong> · Urgency: {req.urgency}
                  </p>
                  {req.committedByOrgs?.length > 0 && (
                    <div className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1.5 pt-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Current commitments:{' '}
                      {req.committedByOrgs.map((c) => `${c.orgName} (${c.units} units)`).join(', ')}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => {
                    setBulkModal(req);
                    setCommitCount('6');
                  }}
                  className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-md shadow-amber-600/30 flex items-center gap-2 shrink-0 transition-all cursor-pointer"
                >
                  <Building2 className="w-4 h-4" /> Commit Units to Fulfill
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Blood Drive Management Grid */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-600" />
              Scheduled Blood Drives & Donor RSVPs
            </h3>
            <p className="text-xs text-slate-500">Auto-broadcasted to all eligible available donors upon publishing</p>
          </div>
          <span className="text-xs font-mono text-slate-500">{events.length} Drives Active</span>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {events.map((ev) => (
            <div key={ev.id} className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-slate-900">{ev.title}</span>
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  {ev.status}
                </span>
              </div>
              <p className="text-slate-600 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" /> {ev.venue}
              </p>
              <p className="text-slate-600 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" /> {ev.date}
              </p>
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-slate-600">
                <span>Partner: {ev.partnerBloodBank}</span>
                <span className="font-bold text-indigo-600">{ev.rsvps} Registered Donors</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal: Commit Bulk Fulfillment */}
      {bulkModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 text-left shadow-2xl border border-slate-200">
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-600" /> Institutional Bulk Commitment
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Fulfill request for {bulkModal.patientName} at {bulkModal.hospitalName}.
            </p>

            <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Required:</span>
                <span className="font-bold font-mono text-slate-800">{bulkModal.quantity} Units ({bulkModal.bloodGroup})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Hospital MR#:</span>
                <span className="font-mono text-slate-800">{bulkModal.mrNumber}</span>
              </div>
            </div>

            <div className="mt-4">
              <label className="text-xs font-semibold text-slate-700">Units your society will supply:</label>
              <input
                type="number"
                min="1"
                max={bulkModal.quantity}
                value={commitCount}
                onChange={(e) => setCommitCount(e.target.value)}
                className="mt-1 w-full p-2.5 rounded-xl border border-slate-300 font-mono font-bold text-base focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={() => setBulkModal(null)}
                className="w-1/2 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onCommitBulk(bulkModal.id, Number(commitCount));
                  setBulkModal(null);
                }}
                className="w-1/2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 cursor-pointer"
              >
                Confirm Dispatch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create Event */}
      {showEventForm && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 text-left shadow-2xl border border-slate-200">
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-600" /> Publish Community Blood Drive
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Publishing will trigger an automated email blast to all available donors in the platform.
            </p>

            <form onSubmit={handleEventSubmit} className="space-y-3 mt-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700">Drive / Event Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. IBA Karachi Lifesaver Camp"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  className="mt-1 w-full p-2.5 rounded-xl border border-slate-300 outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700">Venue & Location</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Main Campus Sports Hall, University Rd"
                  value={newEvent.venue}
                  onChange={(e) => setNewEvent({ ...newEvent, venue: e.target.value })}
                  className="mt-1 w-full p-2.5 rounded-xl border border-slate-300 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700">Date & Time</label>
                  <input
                    type="text"
                    required
                    value={newEvent.date}
                    onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                    className="mt-1 w-full p-2.5 rounded-xl border border-slate-300 outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Target Units</label>
                  <input
                    type="number"
                    required
                    value={newEvent.targetUnits}
                    onChange={(e) => setNewEvent({ ...newEvent, targetUnits: e.target.value })}
                    className="mt-1 w-full p-2.5 rounded-xl border border-slate-300 outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700">Partner Blood Bank</label>
                <input
                  type="text"
                  required
                  value={newEvent.partnerBloodBank}
                  onChange={(e) => setNewEvent({ ...newEvent, partnerBloodBank: e.target.value })}
                  className="mt-1 w-full p-2.5 rounded-xl border border-slate-300 outline-none"
                />
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowEventForm(false)}
                  className="w-1/2 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-md shadow-indigo-600/30 cursor-pointer"
                >
                  Publish & Notify Donors
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 9. VIEW 4: SYSTEM ADMIN DASHBOARD
// ==========================================
interface AdminDashboardProps {
  donors: Donor[];
  requests: BloodRequest[];
  events: BloodDriveEvent[];
  getDonorStatus: (donor: Donor) => { status: string; label: string; color: string; daysLeft: number; progress: number };
  onVerifyMR: (reqId: string) => void;
  onCloseRequest: (reqId: string) => void;
  onResetCooldown: (donorId: string) => void;
  onTriggerCodeRed: () => void;
}

function AdminDashboard({
  donors,
  requests,
  events,
  getDonorStatus,
  onVerifyMR,
  onCloseRequest,
  onResetCooldown,
  onTriggerCodeRed
}: AdminDashboardProps) {
  const [adminTab, setAdminTab] = useState<'map' | 'requests' | 'donors' | 'orgs'>('map');

  // KPI Calculations
  const totalDonors = donors.length;
  const availableDonors = donors.filter((d) => getDonorStatus(d).status === 'Available').length;
  const restingDonors = donors.filter((d) => getDonorStatus(d).status === 'Cooldown').length;
  const activeRequestsCount = requests.filter((r) => r.status !== 'Closed / Fulfilled').length;

  return (
    <div className="space-y-6 text-left">
      {/* Code Red Emergency Broadcast Bar */}
      <div className="bg-rose-950 border border-rose-800 text-white p-4 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-rose-600 text-white">
            <Siren className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white">Karachi Emergency Disaster & Code Red Control</h3>
            <p className="text-xs text-rose-300">
              Dispatches instant high-priority emergency sirens and SMS override to all registered donors.
            </p>
          </div>
        </div>
        <button
          onClick={onTriggerCodeRed}
          className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-rose-900/50 flex items-center gap-2 shrink-0 cursor-pointer"
        >
          <Radio className="w-4 h-4" /> Trigger Code Red Broadcast
        </button>
      </div>

      {/* Top Strip KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-semibold uppercase text-slate-400">Total Donors</span>
          <p className="text-2xl font-black text-slate-900 font-mono mt-1">{totalDonors}</p>
          <span className="text-[11px] text-emerald-600 font-medium">100% Verified</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-semibold uppercase text-slate-400">Available Donors</span>
          <p className="text-2xl font-black text-emerald-600 font-mono mt-1">{availableDonors}</p>
          <span className="text-[11px] text-slate-500 font-medium">Ready for dispatch</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-semibold uppercase text-slate-400">In 90-Day Cooldown</span>
          <p className="text-2xl font-black text-amber-600 font-mono mt-1">{restingDonors}</p>
          <span className="text-[11px] text-slate-500 font-medium">Safety rest enforced</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-semibold uppercase text-slate-400">Active Requests</span>
          <p className="text-2xl font-black text-rose-600 font-mono mt-1">{activeRequestsCount}</p>
          <span className="text-[11px] text-rose-600 font-medium">Live in hospital desks</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm col-span-2 lg:col-span-1">
          <span className="text-[10px] font-semibold uppercase text-slate-400">Verified Orgs</span>
          <p className="text-2xl font-black text-indigo-600 font-mono mt-1">4</p>
          <span className="text-[11px] text-indigo-600 font-medium">Indus, Red Crescent +2</span>
        </div>
      </div>

      {/* Master Oversight Tabs */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 p-2 bg-slate-50 border-b border-slate-200 text-xs overflow-x-auto">
          <button
            onClick={() => setAdminTab('map')}
            className={`px-4 py-2 rounded-xl font-semibold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              adminTab === 'map' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Compass className="w-3.5 h-3.5 text-rose-600" />
            Geographical Cluster Map
          </button>
          <button
            onClick={() => setAdminTab('requests')}
            className={`px-4 py-2 rounded-xl font-semibold transition-all cursor-pointer shrink-0 ${
              adminTab === 'requests' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Requests Monitor ({requests.length})
          </button>
          <button
            onClick={() => setAdminTab('donors')}
            className={`px-4 py-2 rounded-xl font-semibold transition-all cursor-pointer shrink-0 ${
              adminTab === 'donors' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Donor Registry & Eligibility Audit ({donors.length})
          </button>
          <button
            onClick={() => setAdminTab('orgs')}
            className={`px-4 py-2 rounded-xl font-semibold transition-all cursor-pointer shrink-0 ${
              adminTab === 'orgs' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Organization Verification & Drives ({events.length})
          </button>
        </div>

        <div className="p-6">
          {adminTab === 'map' && (
            <div className="space-y-4">
              <GeographicalClusterMap
                donors={donors}
                hospitals={KARACHI_HOSPITALS}
                requests={requests}
                getDonorStatus={getDonorStatus}
              />
            </div>
          )}

          {adminTab === 'requests' && (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Req ID & Group</th>
                      <th className="p-3">Patient & Hospital</th>
                      <th className="p-3">MR Number</th>
                      <th className="p-3">Quantity</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Admin Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {requests.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="p-3 font-medium">
                          <span className="font-mono text-slate-500 block">{r.id}</span>
                          <span className="font-bold text-rose-600 font-mono text-sm">{r.bloodGroup}</span>
                        </td>
                        <td className="p-3">
                          <p className="font-bold text-slate-900">{r.patientName}</p>
                          <p className="text-slate-400 text-[11px]">{r.hospitalName}</p>
                        </td>
                        <td className="p-3 font-mono font-semibold text-slate-700">{r.mrNumber}</td>
                        <td className="p-3 font-mono font-bold">
                          {r.quantity} Bottles {r.isBulk && <span className="text-amber-600 font-bold">(BULK)</span>}
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                            {r.status}
                          </span>
                        </td>
                        <td className="p-3 text-right space-x-2">
                          <button
                            onClick={() => onVerifyMR(r.id)}
                            className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] cursor-pointer"
                          >
                            Verify MR
                          </button>
                          {r.status !== 'Closed / Fulfilled' && (
                            <button
                              onClick={() => onCloseRequest(r.id)}
                              className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white font-semibold text-[11px] cursor-pointer"
                            >
                              Close / Arch
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {adminTab === 'donors' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Donor Name</th>
                    <th className="p-3">Group</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Readiness Score</th>
                    <th className="p-3">Last Donation</th>
                    <th className="p-3 text-right">Override Control</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {donors.map((d) => {
                    const st = getDonorStatus(d);
                    return (
                      <tr key={d.id} className="hover:bg-slate-50">
                        <td className="p-3">
                          <p className="font-bold text-slate-900">{d.name}</p>
                          <p className="text-[11px] text-slate-400 font-mono">{d.phone}</p>
                        </td>
                        <td className="p-3 font-mono font-bold text-sm text-rose-600">{d.bloodGroup}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                              st.status === 'Available'
                                ? 'bg-emerald-100 text-emerald-800'
                                : st.status === 'Cooldown'
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-slate-200 text-slate-800'
                            }`}
                          >
                            {st.status} ({st.daysLeft > 0 ? `${st.daysLeft}d left` : 'Ready'})
                          </span>
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-800">{d.readinessScore}/100</td>
                        <td className="p-3 font-mono text-slate-600">{d.lastDonationDate || 'None'}</td>
                        <td className="p-3 text-right">
                          {st.status === 'Cooldown' && (
                            <button
                              onClick={() => onResetCooldown(d.id)}
                              className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-600 text-white font-semibold text-[11px] cursor-pointer"
                            >
                              Reset Cooldown
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {adminTab === 'orgs' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-950 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm">Indus Youth Blood Society (Affiliated with Indus Hospital)</h4>
                  <p className="text-indigo-800 text-[11px]">Primary responder for bulk ward escalations & mass casualties</p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-600 text-white font-bold text-[10px]">
                  Verified & Active
                </span>
              </div>
              <div className="pt-2">
                <h4 className="font-bold text-xs text-slate-800 mb-2">Audited Blood Drives in Karachi:</h4>
                <div className="space-y-2">
                  {events.map((ev) => (
                    <div key={ev.id} className="p-3 rounded-xl border border-slate-200 bg-white flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-slate-900">{ev.title}</span>
                        <p className="text-slate-500 text-[11px]">{ev.venue} · {ev.date}</p>
                      </div>
                      <span className="font-mono font-bold text-indigo-600">{ev.rsvps} RSVPs</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
