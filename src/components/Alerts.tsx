import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, Timestamp, query, orderBy, limit } from 'firebase/firestore';
import { auth, sharedDb } from '../firebase';
import { AlertTriangle, Send, MapPin, Droplets, Clock, Bell, CheckCircle2 } from 'lucide-react';
import { EmergencyAlert, BloodGroup } from '../types';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

export default function Alerts() {
  const [alerts, setAlerts] = useState<EmergencyAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // New Alert Form State
  const [newAlert, setNewAlert] = useState({
    bloodGroup: 'O+' as BloodGroup,
    location: '',
    message: ''
  });

  useEffect(() => {
    const q = query(collection(sharedDb, 'alerts'), orderBy('sentAt', 'desc'), limit(10));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setAlerts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EmergencyAlert)));
        setLoading(false);
      },
      (error) => {
        console.error('[Alerts] Firestore listener error:', error.message);
        setLoading(false); // Never leave the page blank
      }
    );

    return () => unsubscribe();
  }, []);

  const handleSendAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    try {
      await addDoc(collection(sharedDb, 'alerts'), {
        ...newAlert,
        sentAt: Timestamp.now(),
        sentBy: auth.currentUser?.email || 'Admin'
      });
      
      setNewAlert({
        bloodGroup: 'O+',
        location: '',
        message: ''
      });
      
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error("Error sending alert:", error);
    } finally {
      setIsSending(false);
    }
  };

  if (loading) return null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Emergency Alerts</h1>
        <p className="text-slate-500">Broadcast urgent blood requirements to all connected services.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Alert Form */}
        <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
              <Bell size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Broadcast New Alert</h3>
          </div>

          <form onSubmit={handleSendAlert} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Blood Group Needed</label>
                <select
                  required
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                  value={newAlert.bloodGroup}
                  onChange={(e) => setNewAlert({...newAlert, bloodGroup: e.target.value as BloodGroup})}
                >
                  {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Location / Hospital</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. City General Hospital"
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                  value={newAlert.location}
                  onChange={(e) => setNewAlert({...newAlert, location: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Custom Message</label>
              <textarea
                required
                placeholder="Urgent requirement for O+ blood at City General Hospital. Please contact immediately."
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                rows={4}
                value={newAlert.message}
                onChange={(e) => setNewAlert({...newAlert, message: e.target.value})}
              />
            </div>

            <button
              type="submit"
              disabled={isSending}
              className={cn(
                "w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-white transition-all",
                showSuccess ? "bg-emerald-500" : "bg-red-600 hover:bg-red-700",
                isSending && "opacity-70"
              )}
            >
              {isSending ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              ) : showSuccess ? (
                <>
                  <CheckCircle2 size={20} />
                  Alert Broadcasted Successfully
                </>
              ) : (
                <>
                  <Send size={20} />
                  Send Emergency Alert
                </>
              )}
            </button>
            
            <p className="text-xs text-slate-400 text-center">
              This will trigger notifications to all registered donors and mobile app users.
            </p>
          </form>
        </div>

        {/* Recent Alerts List */}
        <div className="space-y-6">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Clock size={20} className="text-slate-400" />
            Recent Alerts History
          </h3>
          
          <div className="space-y-4">
            {alerts.length > 0 ? (
              alerts.map((alert) => (
                <div key={alert.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1 h-full bg-red-500" />
                  
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-red-50 text-red-600 border border-red-100">
                        {alert.bloodGroup}
                      </span>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock size={12} />
                        {alert.sentAt?.toDate ? format(alert.sentAt.toDate(), 'MMM d, h:mm a') : 'N/A'}
                      </span>
                    </div>
                    <AlertTriangle size={16} className="text-red-500 animate-pulse" />
                  </div>
                  
                  <p className="text-sm text-slate-700 mb-3 leading-relaxed">
                    {alert.message}
                  </p>
                  
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <div className="flex items-center gap-1">
                      <MapPin size={12} />
                      {alert.location}
                    </div>
                    <div className="flex items-center gap-1">
                      <Droplets size={12} />
                      {alert.bloodGroup} Needed
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-2xl border border-dashed border-slate-200">
                <Bell size={40} className="text-slate-200 mb-4" />
                <p className="text-sm font-medium text-slate-500">No recent alerts</p>
                <p className="text-xs text-slate-400 mt-1">Emergency broadcasts will appear here.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
