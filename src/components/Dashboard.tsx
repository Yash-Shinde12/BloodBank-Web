import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, getDocs, setDoc, doc, Timestamp } from 'firebase/firestore';
import { sharedDb } from '../firebase';
import { 
  Users, 
  ClipboardList, 
  Droplets, 
  AlertCircle,
  TrendingUp,
  Plus,
  Sparkles
} from 'lucide-react';
import { cn } from '../lib/utils';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { Donor, BloodRequest, InventoryItem, BloodGroup } from '../types';
import { checkDonorEligibility } from '../lib/donorUtils';

export default function Dashboard() {
  const [donors, setDonors] = useState<Donor[]>([]);
  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiInsight, setAiInsight] = useState<{ message: string, type: 'warning' | 'info' | 'success' } | null>(null);

  useEffect(() => {
    if (inventory.length === 0 || requests.length === 0) return;

    // Calculate demand velocity (total units requested per blood group recently)
    const demand: Record<string, number> = {};
    requests.forEach(r => {
      // Only count pending or emergency requests as active demand
      if (r.status.toLowerCase() !== 'completed') {
        demand[r.bloodGroup] = (demand[r.bloodGroup] || 0) + r.unitsNeeded;
      }
    });

    let highestDemandGroup = '';
    let maxDemand = 0;
    Object.keys(demand).forEach(group => {
      if (demand[group] > maxDemand) {
        maxDemand = demand[group];
        highestDemandGroup = group;
      }
    });

    if (!highestDemandGroup) {
      setAiInsight({
        message: "Inventory levels are stable. No abnormal demand spikes detected at this time.",
        type: 'success'
      });
      return;
    }

    // Check inventory for the highest demand group
    const groupInventory = inventory.find(i => i.group === highestDemandGroup);
    const availableUnits = groupInventory ? groupInventory.units : 0;

    if (availableUnits <= maxDemand) {
      setAiInsight({
        message: `High probability of ${highestDemandGroup} shortage within 48 hours. Current active demand (${maxDemand} units) exceeds or equals available stock (${availableUnits} units). Recommended action: Organize a targeted donor drive immediately.`,
        type: 'warning'
      });
    } else if (availableUnits <= maxDemand * 2) {
      setAiInsight({
        message: `Demand for ${highestDemandGroup} is unusually high (${maxDemand} units needed). Stock levels are dropping. Consider alerting nearby ${highestDemandGroup} donors.`,
        type: 'info'
      });
    } else {
      setAiInsight({
        message: `Inventory is handling the current demand for ${highestDemandGroup} well. Stable outlook for the next 7 days.`,
        type: 'success'
      });
    }
  }, [inventory, requests]);

  useEffect(() => {
    const unsubDonors = onSnapshot(collection(sharedDb, 'donors'), (snapshot) => {
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
    });

    const unsubRequests = onSnapshot(collection(sharedDb, 'blood_requests'), (snapshot) => {
      setRequests(snapshot.docs.map(doc => {
        const data = doc.data();
        let displayStatus = data.status || 'pending';
        if (['pending', 'accepted', 'rejected', 'completed'].includes(displayStatus)) {
           displayStatus = displayStatus.charAt(0).toUpperCase() + displayStatus.slice(1);
        }
        return {
          id: doc.id,
          patientName: data.patientDetails || data.patientName || 'Unknown',
          bloodGroup: data.bloodType || data.bloodGroup || 'O+',
          hospital: data.hospitalLocation || data.hospitalName || data.hospital || 'Unknown',
          unitsNeeded: data.unitsRequired || data.unitsNeeded || 1,
          status: displayStatus,
          notes: data.notes || '',
          createdAt: data.createdAt
        } as BloodRequest;
      }));
    });

    const unsubInventory = onSnapshot(collection(sharedDb, 'inventory'), (snapshot) => {
      setInventory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem)));
      setLoading(false);
    });

    return () => {
      unsubDonors();
      unsubRequests();
      unsubInventory();
    };
  }, []);

  const seedData = async () => {
    const bloodGroups: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
    
    // Seed Inventory
    for (const group of bloodGroups) {
      await setDoc(doc(sharedDb, 'inventory', group), {
        group,
        units: Math.floor(Math.random() * 20) + 5,
        lastUpdated: Timestamp.now()
      });
    }

    // Seed some donors using mobile schema
    const demoDonors = [
      { fullName: 'John Doe', bloodType: 'O+', mobileNumber: '555-0101', address: 'City Hospital', isEligible: true, lastDonationDate: '2024-01-15', totalDonations: 0 },
      { fullName: 'Jane Smith', bloodType: 'A-', mobileNumber: '555-0102', address: 'Red Cross Center', isEligible: true, lastDonationDate: '2023-11-20', totalDonations: 2 },
      { fullName: 'Mike Ross', bloodType: 'B+', mobileNumber: '555-0103', address: 'Downtown Clinic', isEligible: false, lastDonationDate: '2024-02-10', totalDonations: 5 },
    ];

    for (const d of demoDonors) {
      await setDoc(doc(collection(sharedDb, 'donors')), d);
    }

    // Seed some requests using mobile schema
    const demoRequests = [
      { patientDetails: 'Alice Brown', bloodType: 'O+', hospitalLocation: 'General Hospital', unitsRequired: 2, status: 'pending', createdAt: Timestamp.now(), requesterId: 'demo123' },
      { patientDetails: 'Bob Wilson', bloodType: 'AB-', hospitalLocation: 'St. Marys', unitsRequired: 1, status: 'emergency', createdAt: Timestamp.now(), requesterId: 'demo123' },
    ];

    for (const r of demoRequests) {
      await setDoc(doc(collection(sharedDb, 'blood_requests')), r);
    }
  };

  const stats = [
    { label: 'Total Donors', value: donors.length, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Blood Requests', value: requests.length, icon: ClipboardList, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Total Units', value: inventory.reduce((acc, item) => acc + item.units, 0), icon: Droplets, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Emergency Requests', value: requests.filter(r => r.status === 'Emergency').length, icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-50' },
  ];

  const chartData = inventory.map(item => ({
    name: item.group,
    units: item.units
  })).sort((a, b) => a.name.localeCompare(b.name));

  if (loading) return null;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard Overview</h1>
          <p className="text-slate-500">Real-time statistics and blood inventory status.</p>
        </div>
        {inventory.length === 0 && (
          <button 
            onClick={seedData}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all text-sm font-medium"
          >
            <Plus size={18} />
            Initialize Demo Data
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className={stat.bg + " p-3 rounded-xl " + stat.color}>
                <stat.icon size={24} />
              </div>
              <TrendingUp size={16} className="text-emerald-500" />
            </div>
            <p className="text-sm font-medium text-slate-500">{stat.label}</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</h3>
          </div>
        ))}
      </div>

      {aiInsight && (
        <div className={cn(
          "p-5 rounded-2xl border flex items-start sm:items-center gap-4 transition-all shadow-sm",
          aiInsight.type === 'warning' ? "bg-gradient-to-r from-rose-50 to-red-50 border-rose-200" : 
          aiInsight.type === 'info' ? "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200" :
          "bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200"
        )}>
          <div className={cn(
            "p-3 rounded-xl shrink-0",
            aiInsight.type === 'warning' ? "bg-rose-100 text-rose-600" : 
            aiInsight.type === 'info' ? "bg-blue-100 text-blue-600" :
            "bg-emerald-100 text-emerald-600"
          )}>
            <Sparkles size={24} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className={cn(
                "font-bold text-sm",
                aiInsight.type === 'warning' ? "text-rose-900" : 
                aiInsight.type === 'info' ? "text-blue-900" :
                "text-emerald-900"
              )}>
                AI Predictive Forecast
              </h3>
              <span className={cn(
                "text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full",
                aiInsight.type === 'warning' ? "bg-rose-200 text-rose-700" : 
                aiInsight.type === 'info' ? "bg-blue-200 text-blue-700" :
                "bg-emerald-200 text-emerald-700"
              )}>
                {aiInsight.type === 'warning' ? 'Critical' : aiInsight.type === 'info' ? 'Notice' : 'Stable'}
              </span>
            </div>
            <p className={cn(
              "text-sm font-medium",
              aiInsight.type === 'warning' ? "text-rose-800" : 
              aiInsight.type === 'info' ? "text-blue-800" :
              "text-emerald-800"
            )}>
              {aiInsight.message}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Blood Group Distribution</h3>
          <div className="h-[300px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                />
                <Bar dataKey="units" radius={[4, 4, 0, 0]} barSize={40}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.units < 5 ? '#ef4444' : '#ef4444'} fillOpacity={entry.units < 5 ? 1 : 0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Low Stock Alerts</h3>
          <div className="space-y-4">
            {inventory.filter(item => item.units < 5).length > 0 ? (
              inventory.filter(item => item.units < 5).map((item, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-red-50 border border-red-100">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold">
                      {item.group}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">Critical Stock</p>
                      <p className="text-xs text-red-600">{item.units} units remaining</p>
                    </div>
                  </div>
                  <AlertCircle size={20} className="text-red-600" />
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="h-12 w-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                  <Droplets size={24} />
                </div>
                <p className="text-sm font-medium text-slate-900">All stocks healthy</p>
                <p className="text-xs text-slate-500 mt-1">No low inventory alerts at this time.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
