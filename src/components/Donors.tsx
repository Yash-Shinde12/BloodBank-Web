import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, updateDoc, doc, addDoc } from 'firebase/firestore';
import { sharedDb } from '../firebase';
import { Users, Search, Phone, MapPin, Calendar, CheckCircle2, XCircle, Plus, X } from 'lucide-react';
import { Donor, BloodGroup } from '../types';
import { cn } from '../lib/utils';
import { checkDonorEligibility } from '../lib/donorUtils';

export default function Donors() {
  const [donors, setDonors] = useState<Donor[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // New Donor Form State
  const [newDonor, setNewDonor] = useState({
    name: '',
    bloodGroup: 'O+' as BloodGroup,
    phone: '',
    location: '',
    lastDonationDate: '',
    isAvailable: true
  });

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(sharedDb, 'donors'), (snapshot) => {
      setDonors(snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.fullName || data.name || 'Unknown',
          bloodGroup: data.bloodType || data.bloodGroup || 'O+',
          phone: data.mobileNumber || data.phone || 'N/A',
          location: data.address || data.location || 'Unknown',
          lastDonationDate: data.lastDonationDate || '',
          isAvailable: checkDonorEligibility(data)
        } as Donor;
      }));
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const toggleAvailability = async (id: string, current: boolean) => {
    try {
      await updateDoc(doc(sharedDb, 'donors', id), { isEligible: !current });
    } catch (error) {
      console.error("Error updating donor:", error);
    }
  };

  const handleAddDonor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(sharedDb, 'donors'), {
        fullName: newDonor.name,
        bloodType: newDonor.bloodGroup,
        mobileNumber: newDonor.phone,
        address: newDonor.location,
        isEligible: newDonor.isAvailable,
        lastDonationDate: newDonor.lastDonationDate,
        totalDonations: 0,
      });
      setIsAddModalOpen(false);
      setNewDonor({
        name: '',
        bloodGroup: 'O+',
        phone: '',
        location: '',
        lastDonationDate: '',
        isAvailable: true
      });
    } catch (error) {
      console.error("Error adding donor:", error);
    }
  };

  const filteredDonors = donors.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.bloodGroup.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return null;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Donor Management</h1>
          <p className="text-slate-500">Manage registered blood donors and their availability.</p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all text-sm font-medium"
        >
          <Plus size={18} />
          Add New Donor
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
              placeholder="Search by name, group, or location..."
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
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Donor Details</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Blood Group</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Contact & Location</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Availability</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDonors.map((donor) => (
                <tr key={donor.id} className="hover:bg-slate-50/50 transition-all">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold">
                        {donor.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{donor.name}</p>
                        <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                          <Calendar size={12} />
                          <span>Last: {donor.lastDonationDate || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-600 border border-red-100">
                      {donor.bloodGroup}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-sm text-slate-600">
                        <Phone size={14} className="text-slate-400" />
                        <span>{donor.phone}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <MapPin size={14} className="text-slate-400" />
                        <span>{donor.location}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium",
                      donor.isAvailable 
                        ? "bg-emerald-50 text-emerald-600 border border-emerald-100" 
                        : "bg-slate-50 text-slate-500 border border-slate-200"
                    )}>
                      {donor.isAvailable ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                      {donor.isAvailable ? 'Available' : 'Unavailable'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => toggleAvailability(donor.id, donor.isAvailable)}
                      className={cn(
                        "text-xs font-bold px-3 py-1.5 rounded-lg transition-all",
                        donor.isAvailable 
                          ? "text-slate-600 hover:bg-slate-100" 
                          : "text-red-600 hover:bg-red-50"
                      )}
                    >
                      {donor.isAvailable ? 'Disable' : 'Enable'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Donor Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">Add New Donor</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleAddDonor} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Full Name</label>
                  <input
                    required
                    type="text"
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                    value={newDonor.name}
                    onChange={(e) => setNewDonor({...newDonor, name: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Blood Group</label>
                  <select
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                    value={newDonor.bloodGroup}
                    onChange={(e) => setNewDonor({...newDonor, bloodGroup: e.target.value as BloodGroup})}
                  >
                    {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Phone Number</label>
                  <input
                    required
                    type="tel"
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                    value={newDonor.phone}
                    onChange={(e) => setNewDonor({...newDonor, phone: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Location</label>
                  <input
                    required
                    type="text"
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                    value={newDonor.location}
                    onChange={(e) => setNewDonor({...newDonor, location: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Last Donation Date</label>
                  <input
                    type="date"
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                    value={newDonor.lastDonationDate}
                    onChange={(e) => setNewDonor({...newDonor, lastDonationDate: e.target.value})}
                  />
                </div>
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
                  Register Donor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
