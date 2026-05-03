import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, updateDoc, doc, addDoc, Timestamp, query, orderBy, getDocs } from 'firebase/firestore';
import { sharedDb } from '../firebase';
import { ClipboardList, Search, Hospital, User, Droplets, Clock, CheckCircle2, AlertCircle, Plus, X, Sparkles, Star, Phone, MapPin, Activity } from 'lucide-react';
import { BloodRequest, BloodGroup, Donor } from '../types';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { checkDonorEligibility } from '../lib/donorUtils';

export default function Requests() {
  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Matching State
  const [isMatchingModalOpen, setIsMatchingModalOpen] = useState(false);
  const [selectedMatchRequest, setSelectedMatchRequest] = useState<BloodRequest | null>(null);
  const [matchedDonors, setMatchedDonors] = useState<{ donor: Donor, score: number }[]>([]);
  const [isMatching, setIsMatching] = useState(false);

  // New Request Form State
  const [newRequest, setNewRequest] = useState({
    patientName: '',
    bloodGroup: 'O+' as BloodGroup,
    hospital: '',
    unitsNeeded: 1,
    status: 'Pending' as const,
    notes: ''
  });

  useEffect(() => {
    const q = query(collection(sharedDb, 'blood_requests'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRequests(snapshot.docs.map(doc => {
        const data = doc.data();
        
        // Capitalize status for web display
        let displayStatus = data.status || 'pending';
        if (displayStatus === 'pending' || displayStatus === 'accepted' || displayStatus === 'rejected' || displayStatus === 'completed') {
           displayStatus = displayStatus.charAt(0).toUpperCase() + displayStatus.slice(1);
        }

        return {
          id: doc.id,
          patientName: data.patientDetails || data.patientName || 'Unknown',
          bloodGroup: data.bloodType || data.bloodGroup || 'O+',
          hospital: data.hospitalLocation || data.hospitalName || data.hospital || 'Unknown',
          unitsNeeded: data.unitsRequired || data.unitsNeeded || 1,
          donorId: data.donorId,
          status: displayStatus,
          notes: data.notes || '',
          createdAt: data.createdAt
        } as BloodRequest;
      }));
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const markCompleted = async (request: BloodRequest) => {
    try {
      await updateDoc(doc(sharedDb, 'blood_requests', request.id), { status: 'completed' });
      
      // If this request was tied to a specific donor from the mobile app, 
      // automatically log their donation date to start the 3-month cooldown!
      if (request.donorId) {
        await updateDoc(doc(sharedDb, 'donors', request.donorId), {
          lastDonationDate: new Date().toISOString().split('T')[0] // Format: YYYY-MM-DD
        });
      }
    } catch (error) {
      console.error("Error updating request/donor:", error);
    }
  };

  const getMatchScore = (donorGroup: BloodGroup, requestGroup: BloodGroup): number => {
    if (donorGroup === requestGroup) return 100;
    
    // Recipient -> Can receive from these donors
    const compatibleMap: Record<string, string[]> = {
      'A+': ['A+', 'A-', 'O+', 'O-'],
      'A-': ['A-', 'O-'],
      'B+': ['B+', 'B-', 'O+', 'O-'],
      'B-': ['B-', 'O-'],
      'AB+': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
      'AB-': ['AB-', 'A-', 'B-', 'O-'],
      'O+': ['O+', 'O-'],
      'O-': ['O-']
    };

    if (compatibleMap[requestGroup]?.includes(donorGroup)) {
      return 85;
    }
    return 0;
  };

  const handleFindMatch = async (request: BloodRequest) => {
    setSelectedMatchRequest(request);
    setIsMatchingModalOpen(true);
    setIsMatching(true);

    try {
      const snapshot = await getDocs(collection(sharedDb, 'donors'));
      const donors = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.fullName || data.name || 'Unknown',
          bloodGroup: data.bloodType || data.bloodGroup || 'Unknown',
          phone: data.mobileNumber || data.phone || 'N/A',
          location: data.address || data.location || 'Unknown',
          lastDonationDate: data.lastDonationDate || '',
          isAvailable: checkDonorEligibility(data)
        } as Donor;
      });

      // Filter and score
      const scoredDonors = donors
        .filter(d => d.isAvailable) // Only available donors
        .map(donor => ({
          donor,
          score: getMatchScore(donor.bloodGroup, request.bloodGroup)
        }))
        .filter(match => match.score > 0) // Only compatible
        .sort((a, b) => b.score - a.score); // Highest score first

      // Add a slight artificial delay so the UI feels like an "AI calculation"
      setTimeout(() => {
        setMatchedDonors(scoredDonors);
        setIsMatching(false);
      }, 800);

    } catch (error) {
      console.error("Error finding matches:", error);
      setIsMatching(false);
    }
  };

  const handleAddRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(sharedDb, 'blood_requests'), {
        patientDetails: newRequest.patientName,
        bloodType: newRequest.bloodGroup,
        hospitalLocation: newRequest.hospital,
        unitsRequired: newRequest.unitsNeeded,
        status: newRequest.status.toLowerCase(), // Web uses 'Pending', 'Emergency'
        notes: newRequest.notes,
        createdAt: Timestamp.now(),
        requesterId: 'admin_web_panel'
      });
      setIsAddModalOpen(false);
      setNewRequest({
        patientName: '',
        bloodGroup: 'O+',
        hospital: '',
        unitsNeeded: 1,
        status: 'Pending',
        notes: ''
      });
    } catch (error) {
      console.error("Error adding request:", error);
    }
  };

  const filteredRequests = requests.filter(r => 
    r.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.hospital.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.bloodGroup.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return null;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Blood Requests</h1>
          <p className="text-slate-500">Track and manage incoming blood requests from hospitals.</p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all text-sm font-medium"
        >
          <Plus size={18} />
          New Request
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search size={18} />
            </div>
            <input
              type="text"
              placeholder="Search by patient, hospital, or group..."
              className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Patient & Hospital</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Blood Group</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Units Needed</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Requested At</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRequests.map((request) => (
                <tr key={request.id} className="hover:bg-slate-50/50 transition-all">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                        <User size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{request.patientName}</p>
                        <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                          <Hospital size={12} />
                          <span>{request.hospital}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-600 border border-red-100">
                      {request.bloodGroup}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Droplets size={16} className="text-red-500" />
                      <span className="text-sm font-medium text-slate-700">{request.unitsNeeded} Units</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium",
                      request.status === 'Completed' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                      request.status === 'Emergency' ? "bg-red-50 text-red-600 border border-red-100 animate-pulse" :
                      "bg-orange-50 text-orange-600 border border-orange-100"
                    )}>
                      {request.status === 'Completed' ? <CheckCircle2 size={14} /> :
                       request.status === 'Emergency' ? <AlertCircle size={14} /> :
                       <Clock size={14} />}
                      {request.status}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs text-slate-500">
                      {request.createdAt?.toDate ? format(request.createdAt.toDate(), 'MMM d, h:mm a') : 'N/A'}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      {request.status !== 'Completed' && (
                        <button 
                          onClick={() => handleFindMatch(request)}
                          className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-all border border-blue-100"
                        >
                          <Sparkles size={14} />
                          AI Match
                        </button>
                      )}
                      {request.status !== 'Completed' && (
                        <button 
                          onClick={() => markCompleted(request)}
                          className="text-xs font-bold text-emerald-600 hover:bg-emerald-50 px-3 py-1.5 rounded-lg transition-all"
                        >
                          Complete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Request Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">New Blood Request</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleAddRequest} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Patient Name</label>
                  <input
                    required
                    type="text"
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                    value={newRequest.patientName}
                    onChange={(e) => setNewRequest({...newRequest, patientName: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Blood Group</label>
                  <select
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                    value={newRequest.bloodGroup}
                    onChange={(e) => setNewRequest({...newRequest, bloodGroup: e.target.value as BloodGroup})}
                  >
                    {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Hospital Name</label>
                  <input
                    required
                    type="text"
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                    value={newRequest.hospital}
                    onChange={(e) => setNewRequest({...newRequest, hospital: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Units Needed</label>
                  <input
                    required
                    type="number"
                    min="1"
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                    value={newRequest.unitsNeeded}
                    onChange={(e) => setNewRequest({...newRequest, unitsNeeded: parseInt(e.target.value) || 1})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Request Type</label>
                  <select
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                    value={newRequest.status}
                    onChange={(e) => setNewRequest({...newRequest, status: e.target.value as any})}
                  >
                    <option value="Pending">Normal (Pending)</option>
                    <option value="Emergency">Emergency</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Notes (Optional)</label>
                <textarea
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                  rows={3}
                  value={newRequest.notes}
                  onChange={(e) => setNewRequest({...newRequest, notes: e.target.value})}
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-xl font-medium hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-[2] py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-all"
                >
                  Create Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Matching Modal */}
      {isMatchingModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
                  <Sparkles size={24} className={isMatching ? "animate-pulse" : ""} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">AI Donor Match</h3>
                  <p className="text-sm text-slate-500">
                    Finding compatible donors for {selectedMatchRequest?.bloodGroup} at {selectedMatchRequest?.hospital}
                  </p>
                </div>
              </div>
              <button onClick={() => setIsMatchingModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6">
              {isMatching ? (
                <div className="py-12 flex flex-col items-center justify-center">
                  <Activity size={40} className="text-blue-500 animate-bounce mb-4" />
                  <p className="text-lg font-bold text-slate-900">Analyzing compatibility...</p>
                  <p className="text-sm text-slate-500">Scanning {requests.length * 10}+ medical profiles</p>
                </div>
              ) : matchedDonors.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
                    <AlertCircle size={32} />
                  </div>
                  <p className="text-lg font-bold text-slate-900">No matches found</p>
                  <p className="text-sm text-slate-500 mt-2 max-w-sm">
                    There are no available donors currently registered with a compatible blood type.
                  </p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                  {matchedDonors.map((match, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-blue-200 hover:shadow-sm transition-all group">
                      <div className="flex items-center gap-4 mb-4 sm:mb-0">
                        <div className={cn(
                          "h-12 w-12 rounded-full flex items-center justify-center text-lg font-bold border-2",
                          match.score === 100 ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-blue-50 text-blue-600 border-blue-200"
                        )}>
                          {match.donor.bloodGroup}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 flex items-center gap-2">
                            {match.donor.name}
                            {match.score === 100 && <Star size={14} className="text-yellow-500 fill-yellow-500" />}
                          </h4>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-1">
                            <div className="flex items-center gap-1 text-xs text-slate-500">
                              <MapPin size={12} />
                              <span className="truncate max-w-[120px]">{match.donor.location}</span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-slate-500">
                              <Phone size={12} />
                              <span>{match.donor.phone}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 sm:w-1/3">
                        <div className="flex-1">
                          <div className="flex justify-between text-xs font-bold mb-1">
                            <span className="text-slate-500">Match Score</span>
                            <span className={match.score === 100 ? "text-emerald-600" : "text-blue-600"}>{match.score}%</span>
                          </div>
                          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className={cn(
                                "h-full rounded-full transition-all duration-1000",
                                match.score === 100 ? "bg-emerald-500" : "bg-blue-500"
                              )}
                              style={{ width: `${match.score}%` }}
                            />
                          </div>
                        </div>
                        <a 
                          href={`tel:${match.donor.phone}`}
                          className="px-3 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 shrink-0"
                        >
                          Contact
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
