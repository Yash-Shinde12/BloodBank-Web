import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { sharedDb } from '../firebase';
import { Database, Save, AlertTriangle, Minus, Plus } from 'lucide-react';
import { InventoryItem } from '../types';
import { cn } from '../lib/utils';

export default function Inventory() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(sharedDb, 'inventory'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem));
      setInventory(data.sort((a, b) => a.group.localeCompare(b.group)));
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleUpdate = async (id: string) => {
    try {
      await updateDoc(doc(sharedDb, 'inventory', id), {
        units: editValue,
        lastUpdated: Timestamp.now()
      });
      setEditingId(null);
    } catch (error) {
      console.error("Error updating inventory:", error);
    }
  };

  if (loading) return null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Blood Inventory</h1>
        <p className="text-slate-500">Manage and update blood units available in the bank.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {inventory.map((item) => (
          <div 
            key={item.id} 
            className={cn(
              "bg-white p-6 rounded-2xl border transition-all relative overflow-hidden",
              item.units < 5 ? "border-red-200 bg-red-50/30" : "border-slate-100 shadow-sm"
            )}
          >
            {item.units < 5 && (
              <div className="absolute top-0 right-0 p-2">
                <AlertTriangle size={16} className="text-red-500" />
              </div>
            )}
            
            <div className="flex items-center gap-4 mb-6">
              <div className={cn(
                "h-12 w-12 rounded-xl flex items-center justify-center font-bold text-lg",
                item.units < 5 ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-700"
              )}>
                {item.group}
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Blood Group</p>
                <p className="text-sm font-bold text-slate-900">{item.group}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500 font-medium">Available Units</span>
                <span className={cn(
                  "text-xl font-bold",
                  item.units < 5 ? "text-red-600" : "text-slate-900"
                )}>
                  {item.units}
                </span>
              </div>

              {editingId === item.id ? (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setEditValue(Math.max(0, editValue - 1))}
                      className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600"
                    >
                      <Minus size={16} />
                    </button>
                    <input 
                      type="number" 
                      value={editValue}
                      onChange={(e) => setEditValue(parseInt(e.target.value) || 0)}
                      className="w-full text-center py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                    <button 
                      onClick={() => setEditValue(editValue + 1)}
                      className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleUpdate(item.id)}
                      className="flex-1 flex items-center justify-center gap-2 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
                    >
                      <Save size={16} /> Save
                    </button>
                    <button 
                      onClick={() => setEditingId(null)}
                      className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={() => {
                    setEditingId(item.id);
                    setEditValue(item.units);
                  }}
                  className="w-full py-2 bg-slate-50 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-100 border border-slate-100 transition-all"
                >
                  Edit Units
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
