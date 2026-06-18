// src/App.tsx
import React, { useEffect, useState } from "react";
import { useSupabaseRealtime } from "./lib/useRealtime.ts";
import { useAuthStore, useMatchingStore } from "./store.ts";
import { AuthScreen } from "./components/AuthScreen.tsx";
import { MyGroupsTab } from "./components/MyGroupsTab.tsx";
import { AnalyticsTab } from "./components/AnalyticsTab.tsx";
import { ProfileTab } from "./components/ProfileTab.tsx";
import { motion, AnimatePresence } from "motion/react";
import { TrustScoreRadial, AnimatedScore } from "./components/VisualWidgets.tsx";
import {
  Search,
  MapPin,
  Clock,
  Navigation,
  CheckCircle,
  Users,
  LogOut,
  Sliders,
  BadgeAlert,
  Car,
  TrendingUp,
  User as UserIcon,
  HelpCircle,
  Menu,
  Bell,
  Sparkles,
} from "lucide-react";

export default function App() {
  useSupabaseRealtime();

  const { user, token, logout } = useAuthStore();
  const { intent, setIntent, matches, setMatches, searchLoading, setSearchLoading } = useMatchingStore();

  const [activeTab, setActiveTab] = useState<"dashboard" | "my-groups" | "analytics" | "profile">("dashboard");
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mobMenuOpen, setMobMenuOpen] = useState(false);
  const [joinSuccessDetails, setJoinSuccessDetails] = useState<{ name: string; isExisting: boolean } | null>(null);
  const [expandedMatches, setExpandedMatches] = useState<number[]>([]);

  // Real-time Route Waitlist & Synthesis Alerts matching
  const [notifications, setNotifications] = useState<any[]>([]);

  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/v1/matching/notifications", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        setNotifications(data.data);
      }
    } catch (e) {
      console.error("Failed to fetch waitlist notifications", e);
    }
  };

  const handleDismissNotification = async (notificationId: string) => {
    try {
      const res = await fetch("/api/v1/matching/notifications/dismiss", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ notificationId }),
      });
      const data = await res.json();
      if (data.success) {
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      }
    } catch (e) {
      console.error("Failed to dismiss notification", e);
    }
  };

  const handleExploreNotification = async (notify: any) => {
    await handleDismissNotification(notify.id);
    setActiveTab("dashboard");
    setIntent({
      pickupArea: notify.source,
      destinationCampus: notify.target,
    });
    setSuccessMsg(`Showing compatible squads for waitlisted route: ${notify.source} ➔ ${notify.target}`);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  useEffect(() => {
    if (token) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 5000);
      return () => clearInterval(interval);
    }
  }, [token]);

  // Dynamic calculators
  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const currentDaysList = (intent.travelDays || "Mon,Tue,Wed,Thu,Fri").split(",").filter(Boolean);
  
  const toggleDay = (day: string) => {
    let list = [...currentDaysList];
    if (list.includes(day)) {
      list = list.filter(d => d !== day);
    } else {
      list.push(day);
    }
    const seq = weekdays.filter(d => list.includes(d));
    setIntent({ travelDays: seq.join(",") });
  };

  const vehicleBaseSoloFare = intent.vehicleType === "Cab" ? 360 : (intent.vehicleType === "Auto" ? 120 : 240);
  const selectedSize = intent.groupSize || 3;
  const computedSharedFare = Math.round(vehicleBaseSoloFare / selectedSize);
  const computedSavingsPerRide = vehicleBaseSoloFare - computedSharedFare;
  const travelDaysCount = currentDaysList.length || 5;
  const computedWeeklySavings = computedSavingsPerRide * 2 * travelDaysCount;
  const computedMonthlySavings = computedWeeklySavings * 4;

  // Auto trigger search with 300ms debounce whenever any field changes
  useEffect(() => {
    if (user && token && activeTab === "dashboard") {
      const delayDebounceFn = setTimeout(() => {
        handleSearch();
      }, 300);
      return () => clearTimeout(delayDebounceFn);
    }
  }, [
    intent.pickupArea,
    intent.destinationCampus,
    intent.departureTime,
    intent.flexibility,
    intent.vehicleType,
    intent.groupSize,
    intent.travelDays,
    intent.recurringSchedule,
    activeTab
  ]);

  if (!user || !token) {
    return <AuthScreen />;
  }

  const handleSearch = async () => {
    setSearchLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/v1/matching/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(intent),
      });
      const data = await res.json();
      if (data.success) {
        setMatches(data.data);
      } else {
        setErrorMsg(data.message || "Failed to search matches");
      }
    } catch (e) {
      setErrorMsg("Error searching matches. Try restarting backend service.");
    } finally {
      setSearchLoading(false);
    }
  };

  const handleJoinOrCreate = async (match: any) => {
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      if (match.isExistingGroup) {
        // Call Join API
        const res = await fetch("/api/v1/groups/join", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ groupId: match.id }),
        });
        const data = await res.json();
        if (data.success) {
          setJoinSuccessDetails({ name: match.name, isExisting: true });
          setTimeout(() => {
            setActiveTab("my-groups");
            setJoinSuccessDetails(null);
          }, 3000);
        } else {
          setErrorMsg(data.message || "Failed to join group");
        }
      } else {
        // Call Create synthesized group API
        const res = await fetch("/api/v1/groups/create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            pickupArea: match.pickupArea,
            destinationCampus: match.destinationCampus || "Main Campus",
            departureTime: match.departureTime,
            matchScore: match.matchScore,
            travelDays: match.travelDays || "Mon,Tue,Wed,Thu,Fri",
            recurringSchedule: match.recurringSchedule || "Recurring",
            candidateRequestIds: match.candidateRequestIds,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setJoinSuccessDetails({ name: match.name, isExisting: false });
          setTimeout(() => {
            setActiveTab("my-groups");
            setJoinSuccessDetails(null);
          }, 3000);
        } else {
          setErrorMsg(data.message || "Failed to synthesize group");
        }
      }
    } catch (e) {
      setErrorMsg("Network error trying to join carpool");
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="flex flex-col h-screen w-full bg-slate-50 text-slate-900 font-sans">
      {/* Top Navigation Bar */}
      <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 shrink-0 z-20">
        <div className="flex items-center gap-4 sm:gap-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">C</div>
            <span className="font-extrabold text-base sm:text-lg tracking-tight text-indigo-900">CampusPool</span>
          </div>

          {/* Desktop Nav menu */}
          <nav className="hidden md:flex gap-6 h-full items-center">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`relative text-sm py-4 px-1 font-semibold hover:cursor-pointer transition-colors ${
                activeTab === "dashboard" ? "text-indigo-600" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Dashboard
              {activeTab === "dashboard" && (
                <motion.div 
                  layoutId="active-tab-underline"
                  className="absolute bottom-0 left-0 right-0 h-[2px] bg-indigo-600"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </button>
            <button
              onClick={() => setActiveTab("my-groups")}
              className={`relative text-sm py-4 px-1 font-semibold hover:cursor-pointer transition-colors ${
                activeTab === "my-groups" ? "text-indigo-600" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              My Groups
              {activeTab === "my-groups" && (
                <motion.div 
                  layoutId="active-tab-underline"
                  className="absolute bottom-0 left-0 right-0 h-[2px] bg-indigo-600"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </button>
            <button
              onClick={() => setActiveTab("analytics")}
              className={`relative text-sm py-4 px-1 font-semibold hover:cursor-pointer transition-colors ${
                activeTab === "analytics" ? "text-indigo-600" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Analytics
              {activeTab === "analytics" && (
                <motion.div 
                  layoutId="active-tab-underline"
                  className="absolute bottom-0 left-0 right-0 h-[2px] bg-indigo-600"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </button>
            <button
              onClick={() => setActiveTab("profile")}
              className={`relative text-sm py-4 px-1 font-semibold hover:cursor-pointer transition-colors ${
                activeTab === "profile" ? "text-indigo-600" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Profile
              {activeTab === "profile" && (
                <motion.div 
                  layoutId="active-tab-underline"
                  className="absolute bottom-0 left-0 right-0 h-[2px] bg-indigo-600"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-slate-900">{user?.name}</p>
            <p className="text-[10px] text-slate-500">{user?.college}</p>
          </div>
          <div className="w-9 h-9 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center">
            <span className="text-xs font-bold text-indigo-700">{getInitials(user?.name || "User")}</span>
          </div>
          
          <button
            onClick={logout}
            className="p-1 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-red-700 hover:cursor-pointer rounded border border-slate-200 text-xs font-bold flex items-center gap-1 transition-colors"
            title="Log Out Session"
          >
            <LogOut className="w-3.5 h-3.5" /> <span className="hidden leading-4 sm:inline">Logout</span>
          </button>

          {/* Mobile menu trigger */}
          <button
            onClick={() => setMobMenuOpen(!mobMenuOpen)}
            className="p-1.5 md:hidden bg-slate-100 text-slate-700 rounded border border-slate-200"
          >
            <Menu className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Mobile Nav Drawer */}
      {mobMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 p-3 space-y-2 z-10 shrink-0">
          <button
            onClick={() => { setActiveTab("dashboard"); setMobMenuOpen(false); }}
            className={`w-full text-left px-3 py-2 text-xs font-bold rounded ${activeTab === "dashboard" ? "bg-indigo-50 text-indigo-700 font-extrabold" : "text-slate-600"}`}
          >
            Dashboard
          </button>
          <button
            onClick={() => { setActiveTab("my-groups"); setMobMenuOpen(false); }}
            className={`w-full text-left px-3 py-2 text-xs font-bold rounded ${activeTab === "my-groups" ? "bg-indigo-50 text-indigo-700 font-extrabold" : "text-slate-600"}`}
          >
            My Groups
          </button>
          <button
            onClick={() => { setActiveTab("analytics"); setMobMenuOpen(false); }}
            className={`w-full text-left px-3 py-2 text-xs font-bold rounded ${activeTab === "analytics" ? "bg-indigo-50 text-indigo-700 font-extrabold" : "text-slate-600"}`}
          >
            Analytics
          </button>
          <button
            onClick={() => { setActiveTab("profile"); setMobMenuOpen(false); }}
            className={`w-full text-left px-3 py-2 text-xs font-bold rounded ${activeTab === "profile" ? "bg-indigo-50 text-indigo-700 font-extrabold" : "text-slate-600"}`}
          >
            Profile
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex flex-1 overflow-hidden">
        {activeTab === "dashboard" ? (
          <>
            {/* Sidebar: Travel Intent Form */}
            <aside className="w-80 bg-white border-r border-slate-200 p-5 flex flex-col gap-6 overflow-y-auto hidden md:flex shrink-0">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5" /> Travel Intent Form
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-600 uppercase mb-1.5">Pickup Area</label>
                    <input
                      type="text"
                      aria-label="Pickup Area location"
                      value={intent.pickupArea}
                      onChange={(e) => setIntent({ pickupArea: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-semibold"
                      placeholder="e.g. Salt Lake"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-600 uppercase mb-1.5">Destination Campus</label>
                    <select
                      aria-label="Destination Campus"
                      value={intent.destinationCampus}
                      onChange={(e) => setIntent({ destinationCampus: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-semibold"
                    >
                      <option value="Main Campus">Main Campus</option>
                      <option value="Technology Campus">Technology Campus</option>
                      <option value="Salt Lake Campus">Salt Lake Campus</option>
                      <option value="New Town Campus">New Town Campus</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-black text-slate-600 uppercase mb-1.5">Departure</label>
                      <input
                        type="time"
                        aria-label="Departure Time"
                        value={intent.departureTime}
                        onChange={(e) => setIntent({ departureTime: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-600 uppercase mb-1.5">Flexibility</label>
                      <select
                        aria-label="Departure flexibility threshold"
                        value={intent.flexibility}
                        onChange={(e) => setIntent({ flexibility: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value={15}>± 15 mins</option>
                        <option value={30}>± 30 mins</option>
                        <option value={45}>± 45 mins</option>
                        <option value={60}>± 60 mins</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-600 uppercase mb-1.5">Preferred Vehicle</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {["Any", "Auto", "Cab"].map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setIntent({ vehicleType: v as any })}
                          aria-label={`Select vehicle type ${v}`}
                          className={`py-1.5 text-[11px] font-bold rounded border transition-all hover:cursor-pointer ${
                            intent.vehicleType === v 
                              ? "border-indigo-600 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600" 
                              : "border-slate-200 text-slate-500 bg-white hover:bg-slate-50"
                          }`}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-600 uppercase mb-1.5">Preferred Group Size</label>
                    <select
                      aria-label="Preferred group size limit"
                      value={intent.groupSize}
                      onChange={(e) => setIntent({ groupSize: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-semibold"
                    >
                      <option value={2}>2 classmates max</option>
                      <option value={3}>3 classmates max</option>
                      <option value={4}>4 classmates max</option>
                      <option value={5}>5 classmates max</option>
                      <option value={6}>6 classmates max</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-600 uppercase mb-1 flex justify-between items-center">
                      <span>Travel Weekdays</span>
                      <span className="text-[9px] font-semibold text-slate-400 font-mono">({currentDaysList.length} d)</span>
                    </label>
                    <div className="flex gap-1">
                      {weekdays.map((day) => {
                        const active = currentDaysList.includes(day);
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => toggleDay(day)}
                            title={`Toggle ${day}`}
                            aria-label={`Toggle travel day ${day}`}
                            className={`flex-1 h-7 text-[10px] font-bold rounded border transition-all hover:cursor-pointer ${
                              active
                                ? "bg-indigo-600 text-white border-indigo-600 font-black shadow-xs animate-none"
                                : "bg-white text-slate-400 border-slate-100 hover:bg-slate-50"
                            }`}
                          >
                            {day[0]}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-600 uppercase mb-1.5">Schedule Type</label>
                    <select
                      aria-label="Schedule type specification"
                      value={intent.recurringSchedule}
                      onChange={(e) => setIntent({ recurringSchedule: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-semibold"
                    >
                      <option value="Recurring">Recurring daily/weekly</option>
                      <option value="One-off">One-off single commute</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Dynamic Saving Calculator display */}
              <div className="mt-auto p-4 bg-emerald-50 border border-emerald-100 rounded-xl shrink-0 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider">Dynamic Savings Plan</span>
                  <span className="text-[9px] font-bold text-emerald-600 uppercase bg-white border border-emerald-100 px-1.5 py-0.5 rounded-full">REAL CALCULATOR</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-emerald-950">
                  <div className="bg-white/65 p-2 rounded border border-emerald-100/50 text-center">
                    <span className="block text-[8px] font-bold text-slate-400 uppercase">Single Ride</span>
                    <span className="text-sm font-black text-emerald-600">₹{computedSavingsPerRide}</span>
                  </div>
                  <div className="bg-white/65 p-2 rounded border border-emerald-100/50 text-center">
                    <span className="block text-[8px] font-bold text-slate-400 uppercase">Daily Round</span>
                    <span className="text-sm font-black text-emerald-600">₹{computedSavingsPerRide * 2}</span>
                  </div>
                  <div className="bg-white/65 p-2 rounded border border-emerald-100/50 text-center">
                    <span className="block text-[8px] font-bold text-slate-400 uppercase">Weekly</span>
                    <span className="text-sm font-black text-emerald-600 font-semibold">₹{computedWeeklySavings}</span>
                  </div>
                  <div className="bg-white/65 p-2 rounded border border-emerald-100/50 text-center">
                    <span className="block text-[8px] font-bold text-slate-400 uppercase">Monthly</span>
                    <span className="text-sm font-black text-emerald-700 font-bold">₹{computedMonthlySavings}</span>
                  </div>
                </div>
                
                <div className="text-[9px] text-emerald-800 leading-relaxed font-medium bg-emerald-100/30 p-1.5 rounded text-center border-l-2 border-emerald-400">
                  Math: Standard route fare ₹{vehicleBaseSoloFare} shared by {selectedSize} poolers. Active over {travelDaysCount} days.
                </div>
              </div>
            </aside>

            {/* Central Panel: Recommended Groups */}
            <section className="flex-1 p-4 sm:p-6 flex flex-col gap-4 bg-slate-50 overflow-hidden w-full max-w-full">
              {/* Form trigger on mobile view */}
              <div className="md:hidden bg-white p-3 border border-slate-200 rounded-xl space-y-3 shrink-0">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={intent.pickupArea}
                    onChange={(e) => setIntent({ pickupArea: e.target.value })}
                    placeholder="Pickup Area"
                    aria-label="Mobile Pickup Area"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs focus:outline-none"
                  />
                  <select
                    value={intent.destinationCampus}
                    onChange={(e) => setIntent({ destinationCampus: e.target.value })}
                    aria-label="Mobile Destination Campus"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs focus:outline-none"
                  >
                    <option value="Main Campus">Main Campus</option>
                    <option value="Technology Campus">Tech Campus</option>
                    <option value="Salt Lake Campus">Salt Lake Campus</option>
                    <option value="New Town Campus">New Town Campus</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="time"
                    value={intent.departureTime}
                    onChange={(e) => setIntent({ departureTime: e.target.value })}
                    aria-label="Mobile Departure Time"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs focus:outline-none"
                  />
                  <select
                    value={intent.flexibility}
                    onChange={(e) => setIntent({ flexibility: Number(e.target.value) })}
                    aria-label="Mobile Flexibility"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs focus:outline-none"
                  >
                    <option value={15}>±15 min</option>
                    <option value={30}>±30 min</option>
                    <option value={45}>±45 min</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between shrink-0">
                <div>
                  <h1 className="text-lg sm:text-xl font-bold text-slate-800 flex items-center gap-1.5">
                    Recommended Matches
                  </h1>
                  <p className="text-xs text-slate-500">
                    Showing matched carpools matching route <b>{intent.pickupArea}</b>
                  </p>
                </div>
                <div className="text-right text-[10px] text-indigo-600 font-bold hidden sm:block">
                  Flexibility: ±{intent.flexibility} Mins
                </div>
              </div>

              {successMsg && (
                <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-lg text-xs font-semibold shrink-0">
                  {successMsg}
                </div>
              )}

              {errorMsg && (
                <div className="p-3 bg-red-50 text-red-800 border border-red-100 rounded-lg text-xs font-semibold shrink-0">
                  {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 overflow-y-auto pb-6 pr-1 h-full">
                {searchLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((s) => (
                      <div key={s} className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 animate-pulse shrink-0">
                        <div className="flex justify-between items-center sm:items-start flex-wrap gap-4">
                          <div className="flex items-center gap-3 w-2/3">
                            <div className="w-14 h-14 bg-slate-200 rounded-lg shrink-0" />
                            <div className="space-y-2 w-full">
                              <div className="h-4 bg-slate-200 rounded w-1/3" />
                              <div className="h-3 bg-slate-200 rounded w-2/3" />
                            </div>
                          </div>
                          <div className="w-24 h-6 bg-slate-100 rounded shrink-0" />
                        </div>
                        <div className="space-y-2 pt-1 border-t border-slate-100">
                          <div className="h-2 bg-slate-200 rounded w-full" />
                          <div className="h-2 bg-slate-200 rounded w-4/5" />
                        </div>
                        <div className="h-10 bg-slate-100 border border-slate-100 rounded-lg w-full" />
                        <div className="flex justify-between items-center pt-2 gap-3 border-t border-slate-100">
                          <div className="h-4 bg-slate-150 rounded w-1/4" />
                          <div className="h-8 bg-slate-250 rounded w-1/3" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : matches.length === 0 ? (
                  <div className="max-w-md mx-auto w-full my-6 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm shrink-0 space-y-5">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Bell className="w-6 h-6 text-indigo-600 animate-pulse" />
                      </div>
                      <h3 className="text-slate-800 font-extrabold text-base mb-1">No Active Carpools Found</h3>
                      <p className="text-slate-500 text-xs max-w-sm mx-auto leading-relaxed">
                        Join the <span className="font-bold text-indigo-600">Route Waitlist</span>. We'll monitor searches on this lane and send you a real-time Toast recommendation when a new, compatible ride group is synthesized!
                      </p>
                    </div>

                    {/* Market Insights Box (Demand Discovery) */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                        <span className="flex items-center gap-1.5"><TrendingUp className="w-4 h-4 text-emerald-500" /> Route Market Indicators</span>
                        <span className="text-[9px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded uppercase font-extrabold tracking-wider">Live</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white p-2.5 rounded border border-slate-150">
                          <span className="block text-[8px] font-black uppercase text-slate-400 tracking-wider">Weekly Saving</span>
                          <span className="text-xs font-extrabold text-emerald-600">~₹{computedWeeklySavings || "1,200"}</span>
                        </div>
                        <div className="bg-white p-2.5 rounded border border-slate-150">
                          <span className="block text-[8px] font-black uppercase text-slate-400 tracking-wider">Lanes Config</span>
                          <span className="text-xs font-extrabold text-slate-800">Flex {intent.flexibility}m • {intent.vehicleType}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={async () => {
                        try {
                          const res = await fetch("/api/v1/rides", {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                              Authorization: `Bearer ${token}`,
                            },
                            body: JSON.stringify(intent),
                          });
                          const jsonResult = await res.json();
                          if (jsonResult.success) {
                            setSuccessMsg("Success! Travel concern registered. You are now subscribed to the Route Waitlist. We will notify you of compatible co-travelers via real-time alerts.");
                            handleSearch();
                          } else {
                            setErrorMsg(jsonResult.message || "Failed to join route waitlist");
                          }
                        } catch (e) {
                          setErrorMsg("Error registering carpool intent");
                        }
                      }}
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-md flex items-center justify-center gap-2 hover:cursor-pointer transition-all active:scale-[0.98]"
                    >
                      <Bell className="w-3.5 h-3.5" /> Join Route Waitlist & Notify Me
                    </button>
                  </div>
                ) : (
                  matches.map((match, idx) => {
                    const isAlt = match.matchScore < 80;
                    const joinedCount = match.members.length;
                    const maxCapacity = match.maxSize || 4;
                    const fillPercentage = Math.min(100, Math.max(12, Math.round((joinedCount / maxCapacity) * 100)));
                    const isExpanded = expandedMatches.includes(idx);
                    
                    return (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.45, delay: idx * 0.08 }}
                        whileHover={{ y: -5, boxShadow: "0 15px 30px -10px rgba(99, 102, 241, 0.15), 0 10px 15px -3px rgba(0, 0, 0, 0.05)" }}
                        className={`bg-white border rounded-xl p-5 shadow-xs transition-shadow duration-300 flex flex-col gap-4 relative hover:border-indigo-200 ${
                          isAlt ? "border-slate-200 opacity-90" : "border-slate-200 border-l-4 border-l-indigo-600"
                        }`}
                      >
                        {/* Heading & Badging row */}
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-3 w-full">
                          <div className="flex items-start gap-3">
                            {/* Score badge with Location & Time transparent details */}
                            <div 
                              title={`Location Score: ${match.locationScore}% (60% weight), Time Score: ${match.timeScore}% (40% weight)`}
                              className={`w-14 h-14 rounded-lg flex flex-col items-center justify-center shrink-0 cursor-help transition-all ${
                                isAlt ? "bg-slate-50 border border-slate-100 text-slate-700" : "bg-indigo-50 border border-indigo-100 text-indigo-700 font-extrabold shadow-xs hover:bg-indigo-100"
                              }`}
                            >
                              <span className="text-[8px] uppercase tracking-wider font-bold">Match</span>
                              <span className="text-base font-black"><AnimatedScore value={match.matchScore} /></span>
                            </div>
                            
                            <div className="text-left">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h3 className="font-extrabold text-slate-800 text-sm sm:text-base leading-tight">{match.name}</h3>
                                {!isAlt && (
                                  <span className="text-[9px] px-2 py-0.5 bg-indigo-600 text-white font-bold rounded-full uppercase tracking-wider">
                                    Best Match
                                  </span>
                                )}
                                <span className="text-[9px] px-1.5 py-0.5 bg-slate-100 text-slate-500 font-semibold rounded border border-slate-200">
                                  {match.recurringSchedule || "Recurring"}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-wider flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-slate-400 font-bold" /> From {match.pickupArea} To {match.destinationCampus}
                              </p>
                            </div>
                          </div>
                          
                          <div className="text-right shrink-0 sm:self-start w-full sm:w-auto">
                            <span className="inline-block text-xs font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-100">
                              Estimated Savings ₹{match.estimatedSavings}
                            </span>
                            <span className="block text-[8px] font-bold text-slate-400 mt-1">Split: ₹{match.sharedFare} instead of ₹{match.soloFare}</span>
                          </div>
                        </div>

                        {/* Middle section: Match Parameters Breakdown & Custom Occupancy Progress bar */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 pt-3">
                          {/* Left: Occupancy bar */}
                          <div className="space-y-1.5">
                            <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
                              <span className="flex items-center gap-1">
                                <Users className="w-3.5 h-3.5 text-slate-400" /> Group Occupancy
                              </span>
                              <span>{joinedCount} of {maxCapacity} Joined</span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div 
                                className={`h-full transition-all duration-500 ${
                                  joinedCount >= maxCapacity ? "bg-red-500" : (joinedCount >= maxCapacity - 1 ? "bg-yellow-500" : "bg-indigo-600")
                                }`}
                                style={{ width: `${fillPercentage}%` }}
                              />
                            </div>
                          </div>

                          {/* Right: Key properties summary ( Departure offsets, travel days, skew ) */}
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-600 justify-start md:justify-end">
                            <span className="flex items-center gap-1 font-semibold bg-slate-50 border border-slate-100 rounded px-2 py-0.5">
                              <Clock className="w-3 h-3 text-indigo-500" /> {match.departureTime}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400">
                              Weekdays: <span className="text-slate-700 bg-indigo-50 rounded px-1.5 py-0.5">{match.travelDays || "Mon-Fri"}</span>
                            </span>
                          </div>
                        </div>

                        {/* Why This Match Box */}
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
                          <button
                            type="button"
                            onClick={() => {
                              setExpandedMatches(prev => 
                                prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
                              );
                            }}
                            className="w-full flex items-center justify-between text-[11px] font-black text-indigo-900 uppercase tracking-wide hover:text-indigo-700 transition-colors focus:outline-none hover:cursor-pointer"
                          >
                            <span>Why is this compatible?</span>
                            <span className="text-xs text-indigo-600 lowercase font-bold">
                              {isExpanded ? "Collapse Details ▲" : "View Match Analysis ▼"}
                            </span>
                          </button>
                          
                          <motion.div
                            initial={false}
                            animate={{ height: isExpanded ? "auto" : 40, opacity: 1 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden"
                          >
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-[10px] text-slate-600 font-medium pt-1">
                              {match.explanation && match.explanation.map((exp: string, expIdx: number) => {
                                if (!isExpanded && expIdx >= 2) return null;
                                return (
                                  <div key={expIdx} className="flex items-center gap-1.5 leading-relaxed text-left">
                                    <span className="text-emerald-500 font-extrabold text-xs shrink-0">✓</span>
                                    <span className="truncate">{exp}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </motion.div>
                        </div>

                        {/* Joined members list avatar row */}
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 border-t border-slate-100 pt-3">
                          <div className="flex items-center gap-1.5 self-start">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mr-1 font-mono">Classmates:</span>
                            <div className="flex -space-x-1.5 overflow-hidden">
                              {match.members && match.members.map((member: any, i: number) => (
                                <div 
                                  key={`${member.id || i}-${i}`}
                                  title={`${member.name} (${member.college}) — Reliability Verified`}
                                  className="w-7 h-7 rounded-full bg-slate-100 border-2 border-white text-[9px] font-bold text-indigo-700 flex items-center justify-center shrink-0 uppercase shadow-xs cursor-help hover:z-10 hover:border-indigo-400 transition-colors"
                                >
                                  {getInitials(member.name)}
                                </div>
                              ))}
                            </div>
                            <span className="text-[10px] font-semibold text-slate-500 font-mono italic">
                              ({joinedCount} joined)
                            </span>
                          </div>

                          <button
                            onClick={() => handleJoinOrCreate(match)}
                            aria-label={`${match.isExistingGroup ? "Join" : "Form"} carpool squad "${match.name}"`}
                            className="w-full sm:w-auto bg-slate-900 border border-slate-900 text-white hover:bg-indigo-600 hover:border-indigo-600 px-5 py-2.5 rounded-xl font-black text-xs transition-all tracking-wide whitespace-nowrap hover:cursor-pointer shadow-sm focus:ring-2 focus:ring-indigo-500 active:scale-95"
                          >
                            {match.isExistingGroup ? "Join Existing Group" : "Create Group with Co-travelers"}
                          </button>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </section>

            {/* Right Panel: Platform Analytics insights */}
            <aside className="w-72 bg-slate-100 border-l border-slate-200 p-5 flex flex-col gap-6 overflow-y-auto hidden lg:flex shrink-0">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" /> Platform Insights
                </h2>
                
                {/* Metric Grid */}
                <div className="grid grid-cols-1 gap-3">
                  <div className="bg-white p-3 rounded border border-slate-200 shadow-sm">
                    <p className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">Active Campus Requests</p>
                    <p className="text-xl font-black text-slate-800">1,284 <span className="text-[10px] font-normal text-slate-400">poolers</span></p>
                    <p className="text-[9px] text-emerald-600 font-bold mt-1">↑ 12% from yesterday</p>
                  </div>
                  <div className="bg-white p-3 rounded border border-slate-200 shadow-sm">
                    <p className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">Avg. Group Capacity</p>
                    <p className="text-xl font-black text-slate-800">3.4 <span className="text-xs font-normal text-slate-400">Students</span></p>
                  </div>
                </div>

                {/* Peak Times */}
                <div className="mt-6">
                  <h3 className="text-[10px] font-bold text-slate-600 uppercase mb-3">Campus Peak Hours</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] w-12 text-slate-500 font-bold">08:00 AM</span>
                      <div className="flex-1 h-3 bg-slate-200 rounded-sm overflow-hidden">
                        <div className="h-full bg-indigo-500 w-full" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] w-12 text-slate-500 font-bold">09:30 AM</span>
                      <div className="flex-1 h-3 bg-slate-200 rounded-sm overflow-hidden">
                        <div className="h-full bg-indigo-400 w-3/4" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] w-12 text-slate-500 font-bold">11:00 AM</span>
                      <div className="flex-1 h-3 bg-slate-200 rounded-sm overflow-hidden">
                        <div className="h-full bg-indigo-300 w-1/4" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Popular Locations */}
                <div className="mt-6">
                  <h3 className="text-[10px] font-bold text-slate-600 uppercase mb-3">Popular Hubs</h3>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[9px] font-bold text-slate-700 uppercase">Sector V</span>
                    <span className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[9px] font-bold text-slate-700 uppercase">Park Street</span>
                    <span className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[9px] font-bold text-slate-700 uppercase">Gariahat</span>
                    <span className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[9px] font-bold text-slate-700 uppercase">New Town</span>
                  </div>
                </div>
              </div>

              <div className="mt-auto border-t border-slate-200 pt-4 text-center">
                <p className="text-[9px] text-slate-400 leading-relaxed font-bold">
                  CAMPUSPOOL v2.0.4-LATEST
                  <br />Match Engine Latency: 42ms
                </p>
              </div>
            </aside>
          </>
        ) : (
          <section className="flex-1 p-4 sm:p-6 overflow-hidden">
            {activeTab === "my-groups" && <MyGroupsTab />}
            {activeTab === "analytics" && <AnalyticsTab />}
            {activeTab === "profile" && <ProfileTab />}
          </section>
        )}
      </main>

      {/* Floating Waitlist Toast Notifications Overlay */}
      {notifications.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full px-4 sm:px-0">
          {notifications.map((notify) => (
            <div
              key={notify.id}
              className="bg-slate-900 text-white rounded-xl p-4 shadow-2xl border border-slate-800 flex flex-col gap-3 animate-fade-in"
            >
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                  <Bell className="w-4 h-4 text-indigo-400 animate-pulse" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black uppercase tracking-wider text-indigo-400">
                    SQUAD SYNTHESIZED!
                  </p>
                  <p className="text-[11px] text-slate-200 mt-1 leading-relaxed">
                    {notify.message}
                  </p>
                  <div className="flex items-center gap-1.5 mt-2.5 text-[10px] bg-slate-800 text-indigo-200 px-2 py-1 rounded w-fit border border-slate-700/50">
                    <MapPin className="w-3 h-3 text-indigo-400" />
                    <span className="font-extrabold uppercase truncate max-w-[200px]">
                      {notify.source} ➔ {notify.target}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 border-t border-slate-800/80 pt-2 text-[11px]">
                <button
                  onClick={() => handleDismissNotification(notify.id)}
                  className="px-2.5 py-1 text-slate-400 hover:text-white font-bold transition-colors cursor-pointer"
                >
                  Dismiss
                </button>
                <button
                  onClick={() => handleExploreNotification(notify)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1 rounded font-black transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Search className="w-3.5 h-3.5" /> Explore Match
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dynamic Celebration Success Popup when joining/creating a group */}
      <AnimatePresence>
        {joinSuccessDetails && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/75 backdrop-blur-md z-[100] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="bg-white max-w-sm sm:max-w-md w-full rounded-3xl p-6 shadow-2xl border border-slate-200 text-center relative overflow-hidden"
            >
              <div className="absolute top-0 inset-x-0 h-1 bg-indigo-600 animate-pulse" />
              <div className="absolute -top-12 -right-12 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl" />
              
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.15, stiffness: 200 }}
                className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <CheckCircle className="w-9 h-9 stroke-[2.5]" />
              </motion.div>

              <h3 className="text-xl font-black text-slate-850 tracking-tight">
                {joinSuccessDetails.isExisting ? "Squad Joined!" : "SQUAD SYNTHESIS ACTIVE!"}
              </h3>
              
              <p className="text-[10px] text-indigo-600 font-black uppercase mt-1 tracking-wider flex items-center justify-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> CampusPool Squad Activated <Sparkles className="w-3.5 h-3.5" />
              </p>

              <div className="my-5 p-4 bg-slate-50 border border-slate-100 rounded-2xl text-left">
                <p className="text-[9px] uppercase font-bold text-slate-400">Commute Squad Target</p>
                <p className="text-sm font-extrabold text-slate-800 mt-0.5">{joinSuccessDetails.name}</p>
                
                <p className="text-[9px] uppercase font-bold text-slate-400 mt-3">Action Status</p>
                <p className="text-xs text-slate-600 mt-0.5">
                  {joinSuccessDetails.isExisting 
                    ? "Successfully joined group, synced schedule parameters. You are added to this commuter squad!" 
                    : "Synthesized a new student commuter cohort matching your current route preference."}
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2 text-xs font-extrabold text-indigo-700 animate-pulse">
                  <div className="w-2 h-2 bg-indigo-600 rounded-full" />
                  Routing to "My Groups" workspace...
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 2.8 }}
                    className="bg-indigo-600 h-full"
                  />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
