'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Calendar, Bell, BarChart2, Settings, Users,
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

function Label({ label, children, full=false }: { label:string; children:React.ReactNode;
