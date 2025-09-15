'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Calendar, Bell, BarChart2, Settings, Users, Smartphone,
  Plus, X, CheckCircle2, AlarmClock, ChevronLeft, ChevronRight,
  Search, Upload, Download,
} from 'lucide-react';

type Member = { id: string; name: string; phone?: string };
type Bill = {
  id: string; title: string; amount: number; dueISO: string; category: string;
  notes?: string; paid: boolean; createdBy: string; paidBy?: string;
  reminderDays?: number; recipients?: string[];
};

const defaultMembers: Member[] = [
  { id: 'u1', name: 'You', phone: '+15551234567' },
  { id: 'u2', name: 'Partner', phone: '+15557654321' },
];

const DEFAULT_CATEGORIES = [
  'Home','Car','Utilities','Internet','Phone','Insurance',
  'Credit Card','Loan','Investment','Medical','Subscription','Groceries','Misc'
];

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const toISO = (d: Date) => d.toISOString().slice(0,10);
const fmtMonth = (d: Date) => d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
const fmtShort = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const sameDay = (aISO: string, bISO: string) => {
  const a = new Date(aISO), b = new Date(bISO);
  return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
};

function buildMonthGrid(anchor: Date) {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - ((first.getDay() + 7) % 7)); // start on Sunday
  const days: { date: string; monthIndex: number }[] = [];
  for (let i=0;i<42;i++) { const d = new Date(start); d.setDate(start.getDate()+i);
    days.push({ date: d.toISOString().slice(0,10), monthIndex: d.getMonth() }); }
  return days;
}

function Weekdays() {
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  return (
    <div className="grid grid-cols-7 gap-2 text-center text-sm font-medium text-gray-500 mb-2">
      {days.map(d => <div key={d}>{d}</div>)}
    </div>
  );
}

function Label({ label, children, full=false }: { label:string; children:React.ReactNode; full?:boolean }) {
  return (
    <label className={`text-sm ${full? 'col-span-full' : ''}`}>
      <div className="text-gray-600 mb-1">{label}</div>
      {children}
    </label>
  );
}

export default function BillsAppUS() {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [members, setMembers] = useState<Member[]>(defaultMembers);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [defaultReminderDays, setDefaultReminderDays] = useState<number>(1);
  const [defaultRecipients, setDefaultRecipients] = useState<string[]>(['u1']);
  const [query, setQuery] = useState('');

  const [bills, setBills] = useState<Bill[]>([
    { id: 'b1', title: 'Internet', amount: 60, dueISO: toISO(new Date(today.getFullYear(), today.getMonth(), 16)), category: 'Internet', paid: false, createdBy: 'u1', recipients:['u1'] },
    { id: 'b2', title: 'Rent', amount: 1200, dueISO: toISO(new Date(today.getFullYear(), today.getMonth(), 5)), category: 'Home', paid: true, createdBy: 'u1', paidBy: 'u1' },
  ]);

  const [showBillModal, setShowBillModal] = useState(false);
  const [editing, setEditing] = useState<Bill | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(()=>{ try{
    const raw = localStorage.getItem('finance-app-state-v1');
    if(raw){ const s = JSON.parse(raw);
      if(s.members) setMembers(s.members);
      if(s.categories) setCategories(s.categories);
      if(s.defaultReminderDays!==undefined) setDefaultReminderDays(s.defaultReminderDays);
      if(s.defaultRecipients) setDefaultRecipients(s.defaultRecipients);
      if(s.bills) setBills(s.bills);
    }
  }catch(e){ console.warn('load state', e); } }, []);

  useEffect(()=>{ try{
    const state = { members, categories, defaultReminderDays, defaultRecipients, bills };
    localStorage.setItem('finance-app-state-v1', JSON.stringify(state));
  }catch(e){ console.warn('save state', e); } }, [members, categories, defaultReminderDays, defaultRecipients, bills]);

  const days = useMemo(()=> buildMonthGrid(currentMonth), [currentMonth]);

  const filteredBills = useMemo(()=>{
    const q = query.trim().toLowerCase();
    if(!q) return bills;
    return bills.filter(b => `${b.title} ${b.category} ${b.notes ?? ''}`.toLowerCase().includes(q));
  }, [bills, query]);

  const overdue = filteredBills.filter(b => !b.paid && new Date(b.dueISO) < startOfDay(today));
  const upcoming = filteredBills.filter(b => !b.paid && new Date(b.dueISO) >= startOfDay(today));

  function openNew(date?: Date) {
    const d = date ? toISO(date) : toISO(today);
    const base: Bill = { id: `b${Date.now()}`, title: '', amount: 0, dueISO: d, category: categories[0] || 'Misc', notes: '', paid: false, createdBy: members[0].id, reminderDays: defaultReminderDays, recipients: defaultRecipients };
    setEditing(base); setShowBillModal(true);
  }

  function saveBill(b: Bill) {
    if (!b.title.trim()) return alert('Please enter a title.');
    if (Number.isNaN(b.amount)) return alert('Invalid amount.');
    setBills(prev => prev.some(x => x.id === b.id) ? prev.map(x => x.id === b.id ? b : x) : [...prev, b]);
    setShowBillModal(false);
  }

  function togglePaid(b: Bill) {
    setBills(prev => prev.map(x => x.id === b.id ? { ...x, paid: !x.paid, paidBy: !x.paid ? members[0].id : undefined } : x));
  }

  function removeBill(b: Bill) {
    if (!confirm('Delete this bill?')) return;
    setBills(prev => prev.filter(x => x.id !== b.id)); setShowBillModal(false);
  }

  const totals = useMemo(()=>{
    const mKey = toISO(currentMonth).slice(0,7);
    const monthBills = bills.filter(b => b.dueISO.startsWith(mKey));
    const total = monthBills.reduce((s,b)=> s + b.amount, 0);
    const paid = monthBills.filter(b=>b.paid).reduce((s,b)=> s+b.amount, 0);
    return { total, paid, unpaid: Math.max(total - paid, 0) };
  }, [bills, currentMonth]);

  function exportJSON() {
    const blob = new Blob([JSON.stringify({ members, categories, defaultReminderDays, defaultRecipients, bills }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `bills-${new Date().toISOString().slice(0,10)}.json`; a.click();
    URL.revokeObjectURL(url);
  }
  function importJSON(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (data.members) setMembers(data.members);
        if (data.categories) setCategories(data.categories);
        if (data.defaultReminderDays !== undefined) setDefaultReminderDays(data.defaultReminderDays);
        if (data.defaultRecipients) setDefaultRecipients(data.defaultRecipients);
        if (data.bills) setBills(data.bills);
        alert('Data imported successfully!');
      } catch(err) { alert('Invalid file.'); }
      e.target.value = '';
    };
    reader.readAsText(file);
  }

  // 👇 ATENÇÃO: aqui é **return (** com parênteses, não chaves
  return (
    <div className="min-h-screen grid grid-cols-[240px_1fr] bg-gray-50 text-gray-800">
      {/* Sidebar */}
      <aside className="bg-white border-r p-4 flex flex-col justify-between">
        <div className="space-y-4">
          <h1 className="text-xl font-bold text-blue-600">Bills</h1>
          <nav className="space-y-2 text-sm">
            <div className="flex items-center gap-2 cursor-pointer font-medium text-gray-900"><Calendar className="w-5 h-5" /> Calendar</div>
            <div className="flex items-center gap-2 cursor-pointer"><BarChart2 className="w-5 h-5" /> Reports</div>
            <div className="flex items-center gap-2 cursor-pointer"><Users className="w-5 h-5" /> Household</div>
            <div className="flex items-center gap-2 cursor-pointer" onClick={()=> setShowSettings(true)}><Settings className="w-5 h-5" /> Settings</div>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <label className="btn flex items-center gap-2 cursor-pointer">
            <Upload className="w-4 h-4" /> Import
            <input type="file" accept="application/json" className="hidden" onChange={importJSON} />
          </label>
          <button className="btn flex items-center gap-2" onClick={exportJSON}>
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="p-6 space-y-6">
        <header className="flex flex-wrap gap-3 justify-between items-center">
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-lg border" onClick={()=> setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth()-1, 1))}><ChevronLeft className="w-4 h-4"/></button>
            <h2 className="text-2xl font-semibold min-w-[190px] text-center">{fmtMonth(currentMonth)}</h2>
            <button className="p-2 rounded-lg border" onClick={()=> setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth()+1, 1))}><ChevronRight className="w-4 h-4"/></button>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
              <input className="pl-9 pr-3 py-2 rounded-lg border bg-white" placeholder="Search bills…" value={query} onChange={e=> setQuery(e.target.value)} />
            </div>
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2" onClick={()=> openNew()}>
              <Plus className="w-4 h-4"/> Add Bill
            </button>
          </div>
        </header>

        <div className="grid grid-cols-3 gap-6">
          {/* Calendar */}
          <section className="col-span-2 bg-white rounded-2xl shadow p-4">
            <Weekdays />
            <div className="grid grid-cols-7 gap-2">
              {days.map((day, i)=> {
                const dayBills = filteredBills.filter(b => sameDay(b.dueISO, day.date));
                const isToday = sameDay(toISO(today), day.date);
                const outside = day.monthIndex !== currentMonth.getMonth();
                return (
                  <div key={i} className={`min-h-[120px] border rounded-xl p-2 flex flex-col ${outside? 'opacity-50' : ''} ${isToday? 'ring-2 ring-blue-500' : ''}`}>
                    <div className="text-sm font-medium">{new Date(day.date).getDate()}</div>
                    <div className="mt-1 space-y-1 overflow-auto">
                      {dayBills.length === 0 && <div className="text-xs text-gray-300">—</div>}
                      {dayBills.map((b)=> (
                        <div key={b.id} className={`text-xs px-2 py-1 rounded-lg border flex items-center justify-between ${b.paid? 'bg-emerald-50' : 'bg-amber-50'}`}>
                          <span className="truncate" title={b.title}>{b.title}</span>
                          {!b.paid && <span className="ml-2 font-medium">{currency.format(b.amount)}</span>}
                          <button className="ml-2" title="Edit" onClick={()=> { setEditing(b); setShowBillModal(true); }}><AlarmClock className="w-3.5 h-3.5"/></button>
                          <button className="ml-1" title="Mark paid" onClick={()=> togglePaid(b)}><CheckCircle2 className="w-3.5 h-3.5"/></button>
                        </div>
                      ))}
                    </div>
                    <button className="mt-auto text-xs text-blue-600 hover:underline text-left" onClick={()=> openNew(new Date(day.date))}>+ Add bill</button>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Right panel */}
          <aside className="space-y-4">
            <div className="bg-white p-4 rounded-2xl shadow">
              <h3 className="font-semibold flex items-center gap-2"><Bell className="w-4 h-4"/> Upcoming</h3>
              <ul className="mt-2 space-y-1 text-sm">
                {upcoming.sort((a,b)=> +new Date(a.dueISO) - +new Date(b.dueISO)).slice(0,6).map(b => (
                  <li key={b.id} className="flex justify-between"><span className="truncate" title={b.title}>{b.title}</span><span className="ml-2 text-gray-600">{fmtShort(b.dueISO)} – {currency.format(b.amount)}</span></li>
                ))}
                {upcoming.length === 0 && <li className="text-gray-400">Nothing soon</li>}
              </ul>
            </div>

            <div className="bg-white p-4 rounded-2xl shadow">
              <h3 className="font-semibold flex items-center gap-2"><BarChart2 className="w-4 h-4"/> Monthly Report</h3>
              <p className="text-sm text-gray-600 mt-2">Total: {currency.format(totals.total)}</p>
              <p className="text-sm text-gray-600">Paid: {currency.format(totals.paid)}</p>
              <p className="text-sm text-gray-600">Unpaid: {currency.format(totals.unpaid)}</p>
            </div>

            {overdue.length > 0 && (
              <div className="bg-white p-4 rounded-2xl shadow border border-amber-200">
                <h3 className="font-semibold text-amber-700">Heads up: {overdue.length} overdue bill(s)</h3>
              </div>
            )}
          </aside>
        </div>
      </main>

      {/* Bill Modal */}
      {showBillModal && editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4" role="dialog" aria-modal>
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-lg p-5">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">{bills.some(x=>x.id===editing.id)? 'Edit bill' : 'New bill'}</h3>
              <button onClick={()=> setShowBillModal(false)}><X className="w-5 h-5"/></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <Label label="Title"><input className="input" value={editing.title} onChange={e=> setEditing({...editing, title: e.target.value})} /></Label>
              <Label label="Amount (USD)"><input type="number" className="input" value={editing.amount} onChange={e=> setEditing({...editing, amount: Number(e.target.value)})} /></Label>
              <Label label="Due date"><input type="date" className="input" value={editing.dueISO} onChange={e=> setEditing({...editing, dueISO: e.target.value})} /></Label>
              <Label label="Category">
                <select className="input" value={editing.category} onChange={e=> setEditing({...editing, category: e.target.value})}>
                  {categories.map(c=> <option key={c} value={c}>{c}</option>)}
                </select>
              </Label>
              <Label label="Reminder (days before)"><input type="number" min={0} className="input" value={editing.reminderDays ?? defaultReminderDays} onChange={e=> setEditing({...editing, reminderDays: Number(e.target.value)})} /></Label>
              <Label label="Recipients">
                <div className="flex flex-wrap gap-2">
                  {members.map(m => (
                    <label key={m.id} className="flex items-center gap-2 text-sm border rounded-lg px-2 py-1">
                      <input type="checkbox" checked={(editing.recipients ?? defaultRecipients).includes(m.id)} onChange={(e)=> {
                        const base = new Set(editing.recipients ?? defaultRecipients);
                        e.target.checked ? base.add(m.id) : base.delete(m.id);
                        setEditing({...editing, recipients: Array.from(base)});
                      }} /> {m.name}
                    </label>
                  ))}
                </div>
              </Label>
              <Label label="Notes" full><textarea className="input h-24" value={editing.notes} onChange={e=> setEditing({...editing, notes: e.target.value})}/></Label>
              <div className="flex items-center gap-2"><input type="checkbox" checked={editing.paid} onChange={e=> setEditing({...editing, paid: e.target.checked})}/><span>Mark as paid</span></div>
            </div>

            <div className="flex justify-between mt-5">
              {bills.some(x=>x.id===editing.id) && (
                <button className="btn-danger" onClick={()=> removeBill(editing)}>Delete</button>
              )}
              <div className="ml-auto flex gap-2">
                <button className="btn" onClick={()=> setShowBillModal(false)}>Cancel</button>
                <button className="btn-primary" onClick={()=> saveBill(editing)}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .input { @apply w-full border rounded-lg px-3 py-2 bg-white; }
        .btn { @apply border rounded-lg px-3 py-2; }
        .btn-primary { @apply bg-blue-600 text-white rounded-lg px-4 py-2; }
        .btn-danger { @apply bg-red-600 text-white rounded-lg px-3 py-2; }
      `}</style>
    </div>
  );
}
