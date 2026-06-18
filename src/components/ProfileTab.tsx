// src/components/ProfileTab.tsx
import React, { useState, useEffect } from "react";
import { useAuthStore } from "../store.ts";
import { 
  User as UserIcon, 
  Shield, 
  GraduationCap, 
  MapPin, 
  Mail, 
  Save, 
  RefreshCw, 
  BadgeCheck, 
  AlertCircle, 
  Bookmark, 
  Trash2, 
  Send 
} from "lucide-react";

export function ProfileTab() {
  const { user, token, setAuth } = useAuthStore();
  const [name, setName] = useState(user?.name || "");
  const [college, setCollege] = useState(user?.college || "");
  const [homeLocation, setHomeLocation] = useState(user?.homeLocation || "");
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Verification state
  const [eduEmail, setEduEmail] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Saved Routes state
  const [savedRoutes, setSavedRoutes] = useState<any[]>([]);
  const [routesLoading, setRoutesLoading] = useState(false);

  // New saved route form
  const [newPickup, setNewPickup] = useState("");
  const [newDest, setNewDest] = useState("Main Campus");
  const [newTime, setNewTime] = useState("08:30");
  const [newDays, setNewDays] = useState("Mon,Tue,Wed,Thu,Fri");

  const fetchSavedRoutes = () => {
    setRoutesLoading(true);
    fetch("/api/v1/users/routes", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setSavedRoutes(data.data);
        }
      })
      .catch((e) => console.error("Error fetching saved commutes", e))
      .finally(() => setRoutesLoading(false));
  };

  useEffect(() => {
    fetchSavedRoutes();
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileMsg(null);

    try {
      const res = await fetch("/api/v1/users/me", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name, college, homeLocation })
      });
      const data = await res.json();
      if (data.success) {
        setAuth(data.user, token);
        setProfileMsg({ type: "success", text: "Profile updated successfully!" });
      } else {
        setProfileMsg({ type: "error", text: data.message || "Failed to update profile" });
      }
    } catch (err: any) {
      setProfileMsg({ type: "error", text: "Network error occurred." });
    } finally {
      setProfileLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eduEmail.trim()) return;

    setVerifyLoading(true);
    setVerifyMsg(null);

    try {
      const res = await fetch("/api/v1/users/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ collegeEmail: eduEmail })
      });
      const data = await res.json();
      if (data.success) {
        setAuth(data.user, token);
        setVerifyMsg({ type: "success", text: data.message });
        setEduEmail("");
      } else {
        setVerifyMsg({ type: "error", text: data.message || "Verification failed." });
      }
    } catch (err) {
      setVerifyMsg({ type: "error", text: "Error submitting academic verification request" });
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleAddRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPickup.trim()) return;

    try {
      const res = await fetch("/api/v1/users/routes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          pickupArea: newPickup,
          destinationCampus: newDest,
          departureTime: newTime,
          travelDays: newDays,
          flexibility: 30,
          vehicleType: "Any",
          groupSize: 3,
          recurringSchedule: "Recurring"
        })
      });

      const data = await res.json();
      if (data.success) {
        setSavedRoutes((p) => [data.data, ...p]);
        setNewPickup("");
      } else {
        alert(data.message || "Failed to save commute route");
      }
    } catch (err) {
      alert("Error saving favorite commute route");
    }
  };

  const handleDeleteRoute = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/users/routes/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setSavedRoutes((p) => p.filter((r) => r.id !== id));
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-12 text-left">
      {/* Profile & Verification forms */}
      <div className="lg:col-span-7 space-y-8">
        
        {/* Core profile info */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-6">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <UserIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 uppercase tracking-wide">Student Base Profile</h2>
              <p className="text-xs text-slate-500 font-medium">Manage your day-scholar home location and registered campus metrics</p>
            </div>
          </div>

          <form onSubmit={handleUpdate} className="space-y-4">
            {profileMsg && (
              <div className={`p-3 rounded-xl text-xs font-bold leading-normal border ${
                profileMsg.type === "success" 
                  ? "bg-emerald-50 text-emerald-800 border-emerald-100" 
                  : "bg-red-50 text-red-800 border-red-100"
              }`}>
                {profileMsg.text}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-250 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                  Campus / College
                </label>
                <input
                  type="text"
                  required
                  value={college}
                  onChange={(e) => setCollege(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-250 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                Primary Account Email
              </label>
              <input
                type="email"
                disabled
                value={user?.email || ""}
                className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-400 cursor-not-allowed font-medium"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                Default Home Location
              </label>
              <input
                type="text"
                required
                value={homeLocation}
                onChange={(e) => setHomeLocation(e.target.value)}
                placeholder="E.g. Salt Lake, Sector V"
                className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-250 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={profileLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3 rounded-xl text-xs uppercase tracking-wider transition-all shadow-md active:scale-[0.98] mt-4 flex items-center justify-center gap-2 hover:cursor-pointer"
            >
              {profileLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Saving Changes...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Save Profile details
                </>
              )}
            </button>
          </form>
        </div>

        {/* Student Verification flow */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-6">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 uppercase tracking-wide">Campus Security Verification</h2>
              <p className="text-xs text-slate-500 font-medium">Verify your official campus address to unlock reputation priority multipliers</p>
            </div>
          </div>

          {user?.isVerified ? (
            <div className="p-4 bg-emerald-50 border border-emerald-150 rounded-2xl flex items-start gap-3">
              <BadgeCheck className="w-8 h-8 text-emerald-600 shrink-0" />
              <div>
                <p className="text-xs font-black text-emerald-900">VERIFIED CAMPUS DAY-SCHOLAR</p>
                <p className="text-[11px] text-emerald-700 mt-1">
                  Your academic address (<span className="font-bold underline">{user.collegeEmail}</span>) was verified. You are categorized as an authenticated student co-traveler with maximum Trust reputation <b>({user.trustScore}%)</b>.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div className="text-xs text-indigo-800 leading-normal">
                  Classmates matching your search see your verification state. Verifying using an official academic domain (e.g. <b>.edu, .ac.in, collegeemail</b>) sets your reputation quotient to maximum instantly!
                </div>
              </div>

              <form onSubmit={handleVerify} className="space-y-4">
                {verifyMsg && (
                  <div className={`p-3 rounded-xl text-xs font-bold leading-normal border ${
                    verifyMsg.type === "success" 
                      ? "bg-emerald-50 text-emerald-800 border-emerald-100" 
                      : "bg-red-50 text-red-800 border-red-100"
                  }`}>
                    {verifyMsg.text}
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                    Official Institutional Email
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      placeholder="e.g. name@scholar.univ.edu"
                      value={eduEmail}
                      onChange={(e) => setEduEmail(e.target.value)}
                      className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-250 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="submit"
                      disabled={verifyLoading}
                      className="px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1 shrink-0"
                    >
                      {verifyLoading ? "Tuning..." : "Verify"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* RECURRING COMMUTES & PINNING */}
      <div className="lg:col-span-5 space-y-6">
        
        {/* Saved repeat routes */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-4">
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg">
              <Bookmark className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">PINNED COMMUTE LANES</h2>
              <p className="text-[10px] text-slate-500 font-semibold">Saved repetitive schedule presets for 1-click matching</p>
            </div>
          </div>

          {/* Quick preset list */}
          {routesLoading ? (
            <p className="text-center text-xs text-slate-400 py-6">Syncing repeat commutes...</p>
          ) : savedRoutes.length === 0 ? (
            <p className="text-left text-xs bg-slate-50 text-slate-500 p-4 border border-slate-100 rounded-xl italic">
              No saved recurring schedules configured yet. Complete the custom preset form below to pin your favorite routes.
            </p>
          ) : (
            <div className="space-y-3">
              {savedRoutes.map((route) => (
                <div key={route.id} className="p-3 bg-slate-50 border border-slate-205 rounded-xl flex items-center justify-between text-xs hover:border-slate-350 transition-colors">
                  <div className="min-w-0 flex-1 pr-2">
                    <span className="block font-black text-slate-800 truncate">
                      {route.pickupArea} ➔ {route.destinationCampus}
                    </span>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold mt-1">
                      <span className="bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded text-[8px] uppercase">
                        {route.departureTime}
                      </span>
                      <span className="truncate">
                        Days: {route.travelDays.slice(0, 15)}...
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteRoute(route.id)}
                    className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-colors border border-transparent hover:border-red-100 bg-white"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add Repeat Commute Form */}
          <form onSubmit={handleAddRoute} className="pt-4 border-t border-slate-150 mt-4 space-y-3">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Pin Repeating Campus Lane</h3>
            
            <div>
              <label className="block text-[9px] font-extrabold text-slate-400 uppercase mb-1">
                Pickup Area Location
              </label>
              <input
                type="text"
                required
                placeholder="E.g. Lake Town"
                value={newPickup}
                onChange={(e) => setNewPickup(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-250 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[9px] font-extrabold text-slate-400 uppercase mb-1">
                  Target Campus
                </label>
                <select
                  value={newDest}
                  onChange={(e) => setNewDest(e.target.value)}
                  className="w-full px-1.5 py-2.5 bg-slate-50 border border-slate-250 rounded-xl text-xs font-bold focus:outline-none"
                >
                  <option value="Main Campus">Main Campus</option>
                  <option value="Salt Lake Campus">Salt Lake Campus</option>
                  <option value="New Town Campus">New Town Campus</option>
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-extrabold text-slate-400 uppercase mb-1">
                  Time Slot
                </label>
                <input
                  type="text"
                  required
                  placeholder="08:30"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-250 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[9px] font-extrabold text-slate-400 uppercase mb-1">
                Travel Days
              </label>
              <input
                type="text"
                required
                placeholder="Mon,Tue,Wed,Thu,Fri"
                value={newDays}
                onChange={(e) => setNewDays(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-250 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 hover:pointer-events-auto"
            >
              Pin Commute Routine
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
