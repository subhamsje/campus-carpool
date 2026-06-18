// src/components/MyGroupsTab.tsx
import React, { useEffect, useState } from "react";
import { useAuthStore } from "../store.ts";
import { motion, AnimatePresence } from "motion/react";
import { TrustScoreRadial } from "./VisualWidgets.tsx";
import { 
  Users, 
  Clock, 
  MapPin, 
  Tag, 
  LogOut, 
  Mail, 
  Send, 
  CheckCircle, 
  MessageSquare, 
  Star, 
  Award, 
  ShieldCheck, 
  X, 
  Flame,
  UserCheck 
} from "lucide-react";

export function MyGroupsTab() {
  const { token, user } = useAuthStore();
  const [groups, setGroups] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ACTIVE" | "COMPLETED">("ACTIVE");

  // Chat panel state
  const [activeChatGroupId, setActiveChatGroupId] = useState<string | null>(null);
  const [activeChatGroupName, setActiveChatGroupName] = useState("");
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [newMessageText, setNewMessageText] = useState("");

  // Peer review target state
  const [ratingTarget, setRatingTarget] = useState<{ groupId: string; partnerId: string; partnerName: string } | null>(null);
  const [selectedRating, setSelectedRating] = useState<number>(5);

  const fetchJoinedGroups = () => {
    setLoading(true);
    fetch("/api/v1/groups", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
      .then((res) => res.json())
      .then((resData) => {
        if (resData.success) {
          setGroups(resData.data);
        }
      })
      .catch((e) => console.error("Error reading joined groups", e))
      .finally(() => setLoading(false));
  };

  const fetchFavorites = () => {
    fetch("/api/v1/users/favorites", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setFavorites(data.data.map((f: any) => f.id));
        }
      })
      .catch((err) => console.error("Failed to load favorites list", err));
  };

  useEffect(() => {
    fetchJoinedGroups();
    fetchFavorites();
  }, []);

  // Poll chat messages while chat drawer is active
  useEffect(() => {
    if (!activeChatGroupId) return;

    const fetchMessages = () => {
      fetch(`/api/v1/groups/${activeChatGroupId}/messages`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setChatMessages(data.data);
          }
        })
        .catch((e) => console.error("Failed to parse squad messages", e));
    };

    fetchMessages();
    const intervalId = setInterval(fetchMessages, 3000);
    return () => clearInterval(intervalId);
  }, [activeChatGroupId]);

  const handleLeaveGroup = async (groupId: string) => {
    if (!confirm("Are you sure you want to leave this carpool group?")) {
      return;
    }
    try {
      const res = await fetch(`/api/v1/groups/${groupId}/leave`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setGroups((prev) => prev.filter((g) => g.id !== groupId));
        if (activeChatGroupId === groupId) {
          setActiveChatGroupId(null);
        }
      } else {
        alert(data.message || "Failed to leave group");
      }
    } catch (e) {
      alert("Network error leaving group");
    }
  };

  const handleCompleteRide = async (groupId: string) => {
    if (!confirm("Mark this commute as COMPLETED? This will save the trip history and award Trust/Completed Ride count points to all classmates.")) {
      return;
    }
    try {
      const res = await fetch(`/api/v1/groups/${groupId}/complete`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        fetchJoinedGroups();
      } else {
        alert(data.message || "Failed to complete ride execution");
      }
    } catch (e) {
      alert("Error finalizing ride schedule");
    }
  };

  const handleToggleFavorite = (partnerId: string) => {
    fetch("/api/v1/users/favorites/toggle", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ partnerId })
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          if (data.added) {
            setFavorites((p) => [...p, partnerId]);
          } else {
            setFavorites((p) => p.filter((id) => id !== partnerId));
          }
        }
      })
      .catch((err) => console.error("Err toggling favorite", err));
  };

  const handleSendMessage = async () => {
    if (!newMessageText.trim() || !activeChatGroupId) return;

    try {
      const res = await fetch(`/api/v1/groups/${activeChatGroupId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ message: newMessageText })
      });
      const data = await res.json();
      if (data.success) {
        setChatMessages((prev) => [...prev, data.data]);
        setNewMessageText("");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmitRatingValue = async () => {
    if (!ratingTarget) return;

    try {
      const res = await fetch("/api/v1/groups/rate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          partnerId: ratingTarget.partnerId,
          rating: selectedRating
        })
      });

      const data = await res.json();
      if (data.success) {
        alert(data.message || "Peer rating successfully cataloged!");
        setRatingTarget(null);
        fetchJoinedGroups(); // Refresh trust metrics on list
      }
    } catch (error) {
      console.error("Failed to rate member", error);
    }
  };

  const formatTime = (timeStr: string) => {
    try {
      const d = new Date(timeStr);
      if (isNaN(d.getTime())) return timeStr;
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return timeStr;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-500">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold">Reading joined carpools...</p>
      </div>
    );
  }

  const filteredGroups = groups.filter((g) => {
    if (filter === "ACTIVE") return g.status !== "COMPLETED";
    return g.status === "COMPLETED";
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-12">
      {/* Primary Section */}
      <div className="lg:col-span-8 space-y-6">
        
        {/* Sub-Header Widget */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-indigo-50 border border-indigo-150 p-4 rounded-2xl gap-3">
          <div>
            <h2 className="text-sm font-black text-indigo-950 uppercase tracking-widest mb-1">Squad Commutes center</h2>
            <p className="text-[11px] text-indigo-800 leading-normal">Coordinate live ride-shares, configure repeating campus lanes, and check peer student trust scores.</p>
          </div>
          
          <div className="flex bg-white/80 p-1 border border-slate-200 rounded-xl self-start sm:self-center">
            <button
              onClick={() => setFilter("ACTIVE")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filter === "ACTIVE" 
                  ? "bg-indigo-600 text-white shadow-sm" 
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Active ({groups.filter(g => g.status !== "COMPLETED").length})
            </button>
            <button
              onClick={() => setFilter("COMPLETED")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filter === "COMPLETED" 
                  ? "bg-indigo-600 text-white shadow-sm" 
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Ride History ({groups.filter(g => g.status === "COMPLETED").length})
            </button>
          </div>
        </div>

        {filteredGroups.length === 0 ? (
          <div className="text-center bg-white border border-dashed border-slate-250 rounded-2xl p-16">
            <Users className="w-14 h-14 text-slate-300 mx-auto mb-4 animate-bounce" />
            <h3 className="text-slate-800 font-extrabold text-base mb-1">
              No {filter === "ACTIVE" ? "Active" : "Completed"} Commutes Found
            </h3>
            <p className="text-slate-500 text-xs max-w-sm mx-auto">
              {filter === "ACTIVE" 
                ? "Your active carpools will appear here once you join other student matches or synthesize compatible pools." 
                : "You don't have any past journeys, once you mark active commutes completed, they are recorded here."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {filteredGroups.map((group, gIdx) => {
              const coTravelers = group.members.filter((m: any) => m.user.id !== user?.id);
              return (
                <motion.div 
                  key={`${group.id}-${gIdx}`} 
                  whileHover={{ y: -4, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)" }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: gIdx * 0.08 }}
                  className={`bg-white border text-left rounded-2xl overflow-hidden shadow-sm transition-all flex flex-col justify-between ${
                    group.status === "COMPLETED" ? "opacity-95 border-emerald-100" : "border-slate-200"
                  }`}
                >
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-[10px] tracking-widest uppercase font-black px-2.5 py-0.5 rounded-full inline-block border ${
                            group.status === "COMPLETED" 
                              ? "bg-emerald-50 text-emerald-700 border-emerald-250" 
                              : "bg-indigo-50 text-indigo-700 border-indigo-150"
                          }`}>
                            {group.status}
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold bg-slate-50 border px-2 py-0.5 rounded">
                            ID: {group.id.slice(0, 8)}
                          </span>
                        </div>
                        <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-1.5">
                          {group.pickupArea} ➔ {group.destinationCampus || "Main Campus"}
                        </h3>
                      </div>
                      <div className="text-right">
                        <span className="block text-xs font-black text-emerald-600">
                          Save ~₹{group.matchScore > 90 ? "180" : "120"}
                        </span>
                        <span className="block text-[10px] text-slate-400 font-bold">
                          Alignment: {Math.round(group.matchScore)}%
                        </span>
                      </div>
                    </div>

                    {/* Routing Details Grid */}
                    <div className="grid grid-cols-2 gap-3 mb-5 bg-slate-50 border border-slate-100 rounded-xl p-3.5 text-xs text-slate-600">
                      <div className="space-y-2">
                        <p className="flex items-center gap-2"><MapPin className="w-4 h-4 text-slate-400 shrink-0" /> <b>Pickup:</b> <span className="truncate">{group.pickupArea}</span></p>
                        <p className="flex items-center gap-2"><Clock className="w-4 h-4 text-slate-400 shrink-0" /> <b>Time:</b> {formatTime(group.departureTime)}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="flex items-center gap-2"><Tag className="w-4 h-4 text-slate-400 shrink-0" /> <b>Type:</b> {group.recurringSchedule || "Recurring"}</p>
                        <p className="flex items-center gap-2"><Flame className="w-4 h-4 text-slate-400 shrink-0" /> <b>Frequency:</b> <span className="truncate uppercase text-[9px] font-extrabold bg-slate-200 px-1 py-0.5 rounded">{group.travelDays || "Mon,Tue,Wed,Thu,Fri"}</span></p>
                      </div>
                    </div>

                    {/* Co travelers cards with trust and verification indicator */}
                    <div className="space-y-3">
                      <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-between">
                        <span>Squad Cohort ({group.members.length} Classmates)</span>
                        <span className="text-[10px] text-indigo-600 lowercase font-bold">Click stars to favorite travelers</span>
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {group.members.map((member: any, mIdx: number) => {
                          const isSelf = member.user.id === user?.id;
                          const isFav = favorites.includes(member.user.id);
                          return (
                            <div 
                              key={`${member.id || (member.user && member.user.id)}-${mIdx}`} 
                              className={`p-3 rounded-xl border flex items-center justify-between gap-2.5 ${
                                isSelf 
                                  ? "bg-slate-50/50 border-slate-200" 
                                  : "bg-indigo-50/20 border-indigo-100/40 hover:bg-indigo-50/35"
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0 flex-1 pr-1">
                                {/* Visual trust score radial */}
                                <TrustScoreRadial score={member.user.trustScore || 95} size={32} />

                                <div className="min-w-0 flex-1 text-left">
                                  <div className="flex items-center gap-1 flex-wrap">
                                    <p className="font-extrabold text-slate-800 text-xs truncate max-w-[100px]">
                                      {member.user.name}
                                    </p>
                                    {isSelf && (
                                      <span className="text-[8px] bg-slate-250 text-slate-700 font-extrabold px-1 rounded">
                                        YOU
                                      </span>
                                    )}
                                    {member.user.isVerified && (
                                      <span className="flex items-center gap-0.5 bg-indigo-100 text-indigo-750 text-[7px] font-black px-1 py-0.5 rounded shrink-0 leading-none">
                                        VERIFIED
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[9px] text-slate-500 font-medium truncate max-w-[140px] mt-0.5">
                                    {member.user.college}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                {!isSelf && (
                                  <>
                                    {/* Favorite trigger icon */}
                                    <button
                                      onClick={() => handleToggleFavorite(member.user.id)}
                                      title={isFav ? "Remove Traveler from favorites list" : "Set Traveler as preferred partner"}
                                      className="p-1.5 bg-white border border-slate-200 rounded-lg hover:border-indigo-400 transition-colors"
                                    >
                                      <Star className={`w-3.5 h-3.5 ${isFav ? "text-amber-500 fill-amber-500" : "text-slate-400"}`} />
                                    </button>

                                    {group.status === "COMPLETED" ? (
                                      <button
                                        onClick={() => setRatingTarget({
                                          groupId: group.id,
                                          partnerId: member.user.id,
                                          partnerName: member.user.name
                                        })}
                                        className="p-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] rounded font-black px-1.5 flex items-center gap-0.5"
                                      >
                                        <Award className="w-3 h-3" /> Rate
                                      </button>
                                    ) : (
                                      <a
                                        href={`mailto:${member.user.email}?subject=CampusPool Coordination: ${group.pickupArea}`}
                                        className="p-1 px-2.5 bg-white text-slate-700 hover:bg-indigo-50 border border-slate-250 rounded-lg font-bold text-[10px]"
                                      >
                                        Mail
                                      </a>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="bg-slate-50 border-t border-slate-100 p-4 px-6 flex flex-wrap justify-between items-center gap-3">
                    <div className="flex items-center gap-2">
                      {group.status !== "COMPLETED" && (
                        <button
                          onClick={() => {
                            setActiveChatGroupId(group.id);
                            setActiveChatGroupName(`${group.pickupArea} Squad`);
                          }}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                        >
                          <MessageSquare className="w-3.5 h-3.5" /> Group Chat
                        </button>
                      )}

                      {group.status === "FORMING" && (
                        <button
                          onClick={() => handleCompleteRide(group.id)}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm active:scale-95 transition-all text-left"
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Complete Ride
                        </button>
                      )}
                    </div>

                    {group.status !== "COMPLETED" && (
                      <button
                        onClick={() => handleLeaveGroup(group.id)}
                        className="text-xs font-bold text-red-600 hover:text-red-800 flex items-center gap-1 transition-colors hover:cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" /> Leave Group
                      </button>
                    )}

                    {group.status === "COMPLETED" && (
                      <span className="text-[10px] font-black text-emerald-800 bg-emerald-50 border border-emerald-150 rounded-full px-3 py-1 uppercase flex items-center gap-1 shrink-0 select-none">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Journey Logged
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Right Column: Dynamic Floating Drawer / Panels depending on states */}
      <div className="lg:col-span-4 space-y-6">
        
        {/* PEER REVIEW POPUP DIALOGUE */}
        {ratingTarget && (
          <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white border border-indigo-850 p-6 rounded-2xl space-y-4 shadow-xl">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[9px] uppercase font-bold text-indigo-300 tracking-widest block mb-0.5">PEER REVIEW INDEX</span>
                <h3 className="font-extrabold text-base">Rate {ratingTarget.partnerName}</h3>
              </div>
              <button 
                onClick={() => setRatingTarget(null)} 
                className="p-1 hover:bg-white/10 rounded-lg text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-indigo-200 leading-relaxed">
              Submit peer ratings to update classmate reliability quotients across the campus. Stars affect trust scores dynamically.
            </p>

            {/* Stars Selector */}
            <div className="flex items-center justify-center gap-3 py-2 bg-indigo-950/40 rounded-xl border border-indigo-800/40">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setSelectedRating(star)}
                  className="hover:scale-115 transition-transform"
                >
                  <Star className={`w-8 h-8 ${selectedRating >= star ? "text-amber-400 fill-amber-400" : "text-slate-600"}`} />
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between text-xs font-medium text-indigo-300">
              <span>1 Star (Poor reliability)</span>
              <span>5 Stars (Outstanding)</span>
            </div>

            <button
              onClick={handleSubmitRatingValue}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-black tracking-wide shadow-md hover:cursor-pointer transition-colors"
            >
              Submit Rating & Update Trust
            </button>
          </div>
        )}

        {/* GROUP CHAT REAL-TIME PANEL ROOM */}
        {activeChatGroupId ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col justify-between h-[480px] shadow-2xl relative">
            
            {/* Room Header */}
            <div className="bg-slate-950 p-4 border-b border-slate-800 flex justify-between items-center text-white">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
                <div className="min-w-0">
                  <h3 className="text-xs font-black truncate uppercase tracking-wider">{activeChatGroupName}</h3>
                  <span className="text-[9px] text-slate-400">Classmates Live sync room</span>
                </div>
              </div>
              <button
                onClick={() => setActiveChatGroupId(null)}
                className="p-1 bg-slate-800 hover:bg-slate-700 rounded-md text-slate-300 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin text-xs">
              {chatMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-1.5">
                  <MessageSquare className="w-8 h-8 text-slate-700" />
                  <p className="font-bold text-[10px] text-slate-400">No messages in room</p>
                  <p className="text-[9px] text-slate-600">Send a note to coordinate vehicle booking!</p>
                </div>
              ) : (
                chatMessages.map((msg) => {
                  const isOwn = msg.userId === user?.id;
                  return (
                    <div 
                      key={msg.id} 
                      className={`flex flex-col max-w-[85%] ${
                        isOwn ? "ml-auto items-end" : "mr-auto items-start"
                      }`}
                    >
                      <span className="text-[8px] text-slate-500 font-bold uppercase mb-0.5">
                        {isOwn ? "You" : msg.userName}
                      </span>
                      <div className={`p-2.5 rounded-xl text-[11px] leading-relaxed break-words ${
                        isOwn 
                          ? "bg-indigo-600 text-white rounded-tr-none" 
                          : "bg-slate-800 text-slate-100 rounded-tl-none border border-slate-700/60"
                      }`}>
                        {msg.message}
                      </div>
                      <span className="text-[8px] text-slate-600 mt-0.5">
                        {new Date(msg.sentAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Form Input Footer */}
            <div className="bg-slate-950 p-3 border-t border-slate-800 flex items-center gap-2">
              <input
                type="text"
                placeholder="Type coordination message..."
                value={newMessageText}
                onChange={(e) => setNewMessageText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={handleSendMessage}
                className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center justify-center transition-transform hover:scale-105"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          /* Demand Discovery Pool */
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm text-slate-800 text-left">
            <div>
              <span className="text-[9px] uppercase font-black text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full inline-block border border-indigo-120 mb-1.5">
                MATCH DEMAND DISCOVERY
              </span>
              <h3 className="font-extrabold text-sm text-slate-800 leading-tight">Live Demand Indicators</h3>
              <p className="text-[10px] text-slate-500 leading-relaxed mt-0.5">Active co-sharing request levels on popular routes this week.</p>
            </div>

            <div className="divide-y divide-slate-100 space-y-3">
              <div className="pt-2.5 flex justify-between items-center text-xs">
                <div>
                  <span className="font-bold text-slate-800 block">Salt Lake ➔ Main Campus</span>
                  <p className="text-[9px] text-slate-400">12 students searching • Peak hours</p>
                </div>
                <span className="text-[9px] bg-red-100 text-red-800 px-2 py-0.5 rounded font-black uppercase">Critical Hub</span>
              </div>
              <div className="pt-2.5 flex justify-between items-center text-xs">
                <div>
                  <span className="font-bold text-slate-800 block">New Town I ➔ Main Campus</span>
                  <p className="text-[9px] text-slate-400">8 students searching • Morning peak</p>
                </div>
                <span className="text-[9px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-black uppercase">High Demand</span>
              </div>
              <div className="pt-2.5 flex justify-between items-center text-xs">
                <div>
                  <span className="font-bold text-slate-800 block">Howrah Bus Stand ➔ Main Campus</span>
                  <p className="text-[9px] text-slate-400">4 students searching • Off-peak</p>
                </div>
                <span className="text-[9px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-black uppercase">Active</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
