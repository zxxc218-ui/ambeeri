"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { printReceiptBluetooth } from '@/lib/bluetoothPrinter';
import { 
  LogOut, Server, Zap, Search, ChevronUp, ChevronDown, Users, Gauge, Receipt, Coins, 
  AlertCircle, AlertTriangle, Plus, Info, Phone, Pencil, Printer, Wallet, User, Save, 
  Network, Shield, Home, CheckCircle2, FileText, Trash2, Settings
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const WhatsAppIcon = ({ size = 20, className = "" }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" className={className} style={{ display: 'inline-block', verticalAlign: 'middle' }}>
    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.625 1.451 5.436 0 9.851-4.388 9.854-9.779.001-2.611-1.015-5.07-2.861-6.92C16.365 2.054 13.91 1.036 11.993 1.036c-5.452 0-9.887 4.39-9.89 9.782-.001 2.014.533 3.987 1.547 5.734l-1.019 3.729 3.846-1.006zm9.367-5.61c-.263-.13-1.55-.762-1.788-.85-.238-.087-.412-.13-.587.13-.175.26-.677.85-.828 1.02-.15.172-.301.192-.564.062-.263-.13-1.11-.407-2.113-1.3-.78-.694-1.306-1.55-1.459-1.812-.153-.262-.016-.403.115-.533.118-.118.263-.309.394-.463.131-.154.175-.262.263-.437.087-.175.044-.328-.022-.459-.065-.13-.587-1.412-.804-1.933-.211-.508-.425-.438-.587-.446-.15-.007-.322-.007-.493-.007-.17 0-.449.064-.683.316-.234.252-.894.873-.894 2.129 0 1.256.914 2.47 1.039 2.64 1.256 1.706 2.76 2.5 4.5 3.1 1.74.6 1.74.4 2.44.3.7-.1 1.55-.63 1.77-1.24.22-.61.22-1.13.15-1.24-.07-.1-.26-.17-.53-.3z"/>
  </svg>
);

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Tabs navigation
  const [activeTab, setActiveTab] = useState<'stats' | 'settings' | 'subscribers' | 'bills' | 'expenses'>('stats');

  // Super Admin state
  const [generators, setGenerators] = useState<any[]>([]);
  const [showGenModal, setShowGenModal] = useState(false);
  const [selectedGen, setSelectedGen] = useState<any>(null);
  const [genForm, setGenForm] = useState({
    name: '', ownerName: '', phone: '', area: '',
    subscriptionType: 'شهري', subscriptionStart: '', subscriptionEnd: '',
    paymentDueDay: '10', username: '', password: '', status: 'ACTIVE'
  });

  // Owner / Employee state
  const [stats, setStats] = useState<any>({
    subscribersCount: 0, totalAmps: 0, boardsCount: 0,
    expectedRevenue: 0, totalOldDebt: 0, collectedAmount: 0,
    remainingAmount: 0, totalExpenses: 0, netProfit: 0
  });
  const [boards, setBoards] = useState<any[]>([]);
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);

  // Search & Filter state
  const [subQuery, setSubQuery] = useState('');
  const [billQuery, setBillQuery] = useState('');
  const [subBoardFilter, setSubBoardFilter] = useState('all');
  const [reportMonthFilter, setReportMonthFilter] = useState(new Date().toISOString().substring(5, 7));
  const [reportYearFilter, setReportYearFilter] = useState(new Date().getFullYear().toString());
  const [billStatusFilter, setBillStatusFilter] = useState('all');

  // Quick action modals
  const [showBoardModal, setShowBoardModal] = useState(false);
  const [selectedBoard, setSelectedBoard] = useState<any>(null);
  const [boardForm, setBoardForm] = useState({ name: '', area: '', address: '', defaultAmpPrice: '12000', notes: '', status: 'ACTIVE' });

  const [showSubModal, setShowSubModal] = useState(false);
  const [selectedSub, setSelectedSub] = useState<any>(null);
  const [subForm, setSubForm] = useState({ name: '', phone: '', address: '', amps: '5', ampPrice: '12000', oldDebt: '0', boardId: '', status: 'ACTIVE' });

  const [showEmpModal, setShowEmpModal] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<any>(null);
  const [empForm, setEmpForm] = useState({
    name: '', username: '', password: '', boardId: 'all', status: 'ACTIVE',
    permissions: {
      add_subscriber: true,
      edit_subscriber: true,
      delete_subscriber: false,
      generate_bills: false,
      collect_payment: true,
      manage_expenses: false,
      cancel_bill: false,
      print_receipt: true,
      reprint_receipt: false
    }
  });

  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<any>(null);
  const [expenseForm, setExpenseForm] = useState({
    name: '',
    type: 'وقود ديزل',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    boardId: 'general'
  });

  // Expenses filtering & search
  const [expenseFilterType, setExpenseFilterType] = useState('all');
  const [expenseFilterMonth, setExpenseFilterMonth] = useState('all');
  const [expenseFilterYear, setExpenseFilterYear] = useState('all');
  const [expenseSearchQuery, setExpenseSearchQuery] = useState('');
  const [showExpenseFilters, setShowExpenseFilters] = useState(false);
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  const [showBillModal, setShowBillModal] = useState(false);
  const [billForm, setBillForm] = useState({
    month: new Date().toISOString().substring(5, 7),
    year: new Date().getFullYear().toString(),
    ampPrice: ''
  });

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [paymentAmpPrice, setPaymentAmpPrice] = useState('');
  const [paymentAmps, setPaymentAmps] = useState('');

  // Bills filtering
  const [billMonthFilter, setBillMonthFilter] = useState('all');
  const [billYearFilter, setBillYearFilter] = useState('all');
  const [showBillsFilters, setShowBillsFilters] = useState(false);

  // Edit Bill Modal states
  const [showEditBillModal, setShowEditBillModal] = useState(false);
  const [editingBill, setEditingBill] = useState<any>(null);
  const [editBillAmps, setEditBillAmps] = useState('');
  const [editBillAmpPrice, setEditBillAmpPrice] = useState('');
  const [editBillOldDebt, setEditBillOldDebt] = useState('');
  const [editBillPaidAmount, setEditBillPaidAmount] = useState('');
  const [editBillStatus, setEditBillStatus] = useState('UNPAID');

  const [errorMsg, setErrorMsg] = useState('');
  const [whatsappWarning, setWhatsappWarning] = useState<{message: string, url: string} | null>(null);
  const [exportingBills, setExportingBills] = useState(false);

  const [bulkBoardPrice, setBulkBoardPrice] = useState('');
  const [paymentSuccessData, setPaymentSuccessData] = useState<any>(null);
  const [printingBluetooth, setPrintingBluetooth] = useState(false);
  // Profile editing state
  const [profileForm, setProfileForm] = useState({ name: '', username: '', password: '', confirmPassword: '' });
  const [profileMsg, setProfileMsg] = useState('');
  const [profileError, setProfileError] = useState('');

  // Generator settings state
  const [generatorInfo, setGeneratorInfo] = useState<any>(null);
  const [generatorForm, setGeneratorForm] = useState({ name: '', ownerName: '', phone: '', area: '' });
  const [generatorMsg, setGeneratorMsg] = useState('');
  const [generatorError, setGeneratorError] = useState('');

  // PDF receipt state for printing old invoices
  const [pdfReceiptData, setPdfReceiptData] = useState<any>(null);

  // Board amp price inline editing
  const [editingBoardPrice, setEditingBoardPrice] = useState<string | null>(null);
  const [editingBoardPriceValue, setEditingBoardPriceValue] = useState('');

  useEffect(() => {
    fetchSession();
  }, []);

  useEffect(() => {
    if (user) {
      setProfileForm(prev => ({
        ...prev,
        name: prev.name || user.name || '',
        username: prev.username || user.username || ''
      }));
    }
  }, [user]);

  // Dynamically update payment amount when Amp price or Amps is modified in the modal
  useEffect(() => {
    if (selectedBill && paymentAmpPrice && paymentAmps) {
      const parsedAmpPrice = parseInt(paymentAmpPrice) || 0;
      const parsedAmps = parseInt(paymentAmps) || 0;
      const newMonthAmount = parsedAmps * parsedAmpPrice;
      const newTotalCost = newMonthAmount + selectedBill.oldDebt;
      const newRemaining = newTotalCost - selectedBill.paidAmount;
      setPaymentAmount(Math.max(0, newRemaining).toString());
    }
  }, [paymentAmpPrice, paymentAmps, selectedBill]);

  const fetchSession = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (!res.ok) {
        router.push('/login');
        return;
      }
      const data = await res.json();
      setUser(data.user);

      if (data.user.role === 'SUPER_ADMIN') {
        fetchGenerators();
      } else {
        fetchOwnerData();
      }
    } catch (err) {
      console.error(err);
      router.push('/login');
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  // ==========================================
  // SUPER ADMIN ACTIONS
  // ==========================================
  const fetchGenerators = async () => {
    const res = await fetch('/api/admin/generators');
    if (res.ok) {
      const data = await res.json();
      setGenerators(data.generators);
    }
  };

  const handleSaveGenerator = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const method = selectedGen ? 'PUT' : 'POST';
    const body = selectedGen ? { id: selectedGen.id, ...genForm } : genForm;

    const res = await fetch('/api/admin/generators', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await res.json();
    if (!res.ok) {
      setErrorMsg(data.error || 'حدث خطأ ما');
    } else {
      setShowGenModal(false);
      setSelectedGen(null);
      resetGenForm();
      fetchGenerators();
    }
  };

  const handleDeleteGenerator = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه المولدة نهائياً بجميع بياناتها؟')) return;
    const res = await fetch(`/api/admin/generators?id=${id}`, { method: 'DELETE' });
    if (res.ok) {
      fetchGenerators();
    } else {
      const data = await res.json();
      alert(data.error || 'فشل حذف المولدة');
    }
  };

  const resetGenForm = () => {
    setGenForm({
      name: '', ownerName: '', phone: '', area: '',
      subscriptionType: 'شهري', subscriptionStart: '', subscriptionEnd: '',
      paymentDueDay: '10', username: '', password: '', status: 'ACTIVE'
    });
  };

  // ==========================================
  // OWNER / EMPLOYEE DATA FETCH
  // ==========================================
  const fetchOwnerData = async () => {
    setLoading(true);
    await Promise.all([
      fetchStats(),
      fetchBoards(),
      fetchSubscribers(),
      fetchBills(),
      fetchExpenses(),
      fetchEmployeesList(),
      fetchGeneratorInfo()
    ]);
    setLoading(false);
  };

  const fetchStats = async () => {
    const url = `/api/owner/reports?month=${reportMonthFilter}&year=${reportYearFilter}&boardId=${subBoardFilter}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      setStats(data.stats);
    }
  };

  const fetchBoards = async () => {
    const res = await fetch('/api/owner/boards');
    if (res.ok) {
      const data = await res.json();
      setBoards(data.boards);
      // Set default board in subform if none selected
      if (data.boards.length > 0 && !subForm.boardId) {
        setSubForm(prev => ({ ...prev, boardId: data.boards[0].id }));
      }
    }
  };

  const fetchSubscribers = async () => {
    const url = `/api/owner/subscribers?boardId=${subBoardFilter}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      setSubscribers(data.subscribers);
    }
  };

  const fetchBills = async () => {
    const url = `/api/owner/bills?boardId=${subBoardFilter}&status=${billStatusFilter}&month=${billMonthFilter}&year=${billYearFilter}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      setBills(data.bills);
    }
  };

  const fetchExpenses = async () => {
    const res = await fetch('/api/owner/expenses');
    if (res.ok) {
      const data = await res.json();
      setExpenses(data.expenses);
    }
  };

  const fetchEmployeesList = async () => {
    const res = await fetch('/api/owner/employees');
    if (res.ok) {
      const data = await res.json();
      setEmployees(data.employees);
    }
  };

  // ==========================================
  // OWNER ACTION SUBMISSIONS
  // ==========================================
  const handleSaveBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const method = selectedBoard ? 'PUT' : 'POST';
    const body = selectedBoard ? { id: selectedBoard.id, ...boardForm } : boardForm;

    const res = await fetch('/api/owner/boards', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await res.json();
    if (!res.ok) {
      setErrorMsg(data.error || 'حدث خطأ ما');
    } else {
      setShowBoardModal(false);
      setSelectedBoard(null);
      fetchBoards();
    }
  };

  const handleDeleteBoard = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف البورد؟')) return;
    const res = await fetch(`/api/owner/boards?id=${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error);
    } else {
      fetchBoards();
    }
  };

  const handleSaveSubscriber = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const method = selectedSub ? 'PUT' : 'POST';
    const body = selectedSub ? { id: selectedSub.id, ...subForm } : subForm;

    const res = await fetch('/api/owner/subscribers', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await res.json();
    if (!res.ok) {
      setErrorMsg(data.error || 'حدث خطأ ما');
    } else {
      setShowSubModal(false);
      setSelectedSub(null);
      fetchSubscribers();
      fetchStats();
    }
  };

  const handleDeleteSubscriber = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف المشترك؟')) return;
    const res = await fetch(`/api/owner/subscribers?id=${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error);
    } else {
      fetchSubscribers();
      fetchStats();
    }
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!expenseForm.name.trim()) {
      setErrorMsg('اسم المصروف مطلوب');
      return;
    }
    if (!expenseForm.type) {
      setErrorMsg('نوع المصروف مطلوب');
      return;
    }
    const amt = parseInt(expenseForm.amount);
    if (isNaN(amt) || amt <= 0) {
      setErrorMsg('المبلغ مطلوب ويجب أن يكون رقم أكبر من صفر');
      return;
    }
    if (!expenseForm.date) {
      setErrorMsg('التاريخ مطلوب');
      return;
    }

    const board = boards.find(b => b.id === expenseForm.boardId);
    const notePayload = JSON.stringify({
      name: expenseForm.name.trim(),
      boardId: expenseForm.boardId === 'general' ? '' : expenseForm.boardId,
      boardName: expenseForm.boardId === 'general' ? '' : (board ? board.name : ''),
      notes: expenseForm.notes.trim()
    });

    const url = '/api/owner/expenses';
    const method = selectedExpense ? 'PUT' : 'POST';
    const body = {
      id: selectedExpense ? selectedExpense.id : undefined,
      type: expenseForm.type,
      amount: amt,
      date: new Date(expenseForm.date),
      note: notePayload
    };

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'حدث خطأ أثناء حفظ المصروف');
      } else {
        alert(selectedExpense ? 'تم تعديل المصروف بنجاح' : 'تم إضافة المصروف بنجاح');
        setShowExpenseModal(false);
        setExpenseForm({
          name: '',
          type: 'وقود ديزل',
          amount: '',
          date: new Date().toISOString().split('T')[0],
          notes: '',
          boardId: 'general'
        });
        setSelectedExpense(null);
        fetchExpenses();
        fetchStats();
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('حدث خطأ أثناء الاتصال بالسيرفر');
    }
  };

  const handleEditExpense = (expense: any) => {
    setSelectedExpense(expense);
    let name = '';
    let boardId = 'general';
    let notes = '';
    
    try {
      if (expense.note && expense.note.startsWith('{') && expense.note.endsWith('}')) {
        const parsed = JSON.parse(expense.note);
        name = parsed.name || '';
        boardId = parsed.boardId || 'general';
        notes = parsed.notes || '';
      } else {
        name = expense.type || 'مصروف';
        notes = expense.note || '';
      }
    } catch (e) {
      name = expense.type || 'مصروف';
      notes = expense.note || '';
    }

    setExpenseForm({
      name,
      type: expense.type,
      amount: expense.amount.toString(),
      date: new Date(expense.date).toISOString().split('T')[0],
      notes,
      boardId: boardId || 'general'
    });
    setErrorMsg('');
    setShowExpenseModal(true);
  };

  const handleDeleteExpense = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المصروف؟')) {
      return;
    }
    try {
      const res = await fetch(`/api/owner/expenses?id=${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'حدث خطأ أثناء حذف المصروف');
      } else {
        alert('تم حذف المصروف بنجاح');
        fetchExpenses();
        fetchStats();
      }
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء حذف المصروف');
    }
  };

  const handleDownloadPDF = async (paymentData: any) => {
    if (!paymentData) return;
    setDownloadingPDF(true);
    try {
      const element = document.getElementById('receipt-pdf-template');
      if (!element) {
        alert('حدث خطأ أثناء العثور على قالب الوصل');
        setDownloadingPDF(false);
        return;
      }
      
      const canvas = await html2canvas(element, {
        scale: 3,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width / 3, canvas.height / 3]
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 3, canvas.height / 3);
      const filename = `receipt-${paymentData.invoiceNumber || paymentData.receiptNumber || 'print'}.pdf`;
      pdf.save(filename);
      
      // Log print action
      await fetch('/api/owner/print-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          billId: paymentData.billId,
          paymentId: paymentData.paymentId,
          printerType: 'PDF_DOWNLOAD',
          status: 'SUCCESS'
        })
      });
    } catch (error) {
      console.error('PDF generation error:', error);
      alert('حدث خطأ أثناء تحميل ملف الـ PDF. يرجى المحاولة مرة أخرى.');
    } finally {
      setDownloadingPDF(false);
    }
  };

  const handleExportBills = async () => {
    setExportingBills(true);
    try {
      const params = new URLSearchParams();
      if (subBoardFilter !== 'all') params.set('boardId', subBoardFilter);
      if (billStatusFilter !== 'all') params.set('status', billStatusFilter);
      if (reportMonthFilter) params.set('month', reportMonthFilter);
      if (reportYearFilter) params.set('year', reportYearFilter);

      const res = await fetch(`/api/owner/export/bills?${params.toString()}`);
      if (!res.ok) {
        alert('فشل تصدير الفواتير');
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cd = res.headers.get('Content-Disposition') || '';
      const match = cd.match(/filename="(.+)"/);
      a.download = match ? match[1] : 'bills.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('حدث خطأ في تصدير الفواتير');
    } finally {
      setExportingBills(false);
    }
  };

  const handleGenerateBills = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const res = await fetch('/api/owner/bills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(billForm)
    });
    const data = await res.json();
    if (!res.ok) {
      setErrorMsg(data.error || 'حدث خطأ ما');
    } else {
      alert(data.message);
      setShowBillModal(false);
      setBillForm(prev => ({ ...prev, ampPrice: '' }));
      fetchBills();
      fetchStats();
    }
  };

  const handleCollectPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const res = await fetch('/api/owner/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          billId: selectedBill.id,
          amount: paymentAmount,
          note: paymentNote,
          ampPrice: paymentAmpPrice,
          amps: paymentAmps
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'حدث خطأ ما');
      } else {
        setShowPaymentModal(false);
        
        // Save success data for printer modal
        setPaymentSuccessData({
          paymentId: data.payment.id,
          billId: selectedBill.id,
          receiptNumber: data.payment.receiptNumber,
          invoiceNumber: selectedBill.invoiceNumber,
          date: data.payment.date,
          amount: data.payment.amount,
          remainingAmount: selectedBill.remainingAmount - data.payment.amount <= 0 ? 0 : selectedBill.remainingAmount - data.payment.amount,
          subscriberName: selectedBill.subscriber?.name || '',
          phone: selectedBill.subscriber?.phone || '',
          boardName: selectedBill.board?.name || '',
          month: selectedBill.month,
          year: selectedBill.year,
          employeeName: user.name,
          generatorName: user.genName || generatorInfo?.name || '',
          generatorOwner: generatorInfo?.ownerName || '',
          generatorPhone: generatorInfo?.phone || '',
          generatorArea: generatorInfo?.area || '',
          note: data.payment.note,
          amps: paymentAmps || selectedBill.amps?.toString() || '0',
          ampPrice: paymentAmpPrice || selectedBill.ampPrice || 0,
          oldDebt: selectedBill.oldDebt || 0,
          whatsappMessage: data.whatsappMessage,
          whatsappPhone: data.whatsappPhone,
          warning: data.warning
        });

        setSelectedBill(null);
        setPaymentAmount('');
        setPaymentNote('');
        setPaymentAmpPrice('');
        setPaymentAmps('');
        fetchBills();
        fetchStats();
        fetchSubscribers();
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('فشل الاتصال بالسيرفر');
    }
  };

  const handleSendReminder = async (billId: string) => {
    try {
      const res = await fetch('/api/owner/bills/remind', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billId })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'فشل إرسال التذكير');
      } else {
        if (data.warning && data.whatsappMessage && data.whatsappPhone) {
          const cleanPhone = data.whatsappPhone.replace(/\D/g, '');
          let normalizedPhone = cleanPhone;
          if (cleanPhone.startsWith('0')) {
            normalizedPhone = '964' + cleanPhone.substring(1);
          } else if (!cleanPhone.startsWith('964') && cleanPhone.length === 10) {
            normalizedPhone = '964' + cleanPhone;
          }
          const waUrl = `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(data.whatsappMessage)}`;
          setWhatsappWarning({
            message: data.warning,
            url: waUrl
          });
        } else {
          alert('تم إرسال تذكير الواتساب بنجاح');
        }
        fetchBills();
      }
    } catch (err) {
      console.error(err);
      alert('حدث خطأ في الاتصال بالشبكة');
    }
  };

  const handleCancelBill = async (billId: string) => {
    if (!confirm('هل أنت متأكد من رغبتك في إلغاء هذه الفاتورة؟ لا يمكن التراجع عن هذا الإجراء.')) {
      return;
    }
    try {
      const res = await fetch('/api/owner/bills/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billId })
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'تم إلغاء الفاتورة بنجاح');
        fetchBills();
      } else {
        alert(data.error || 'حدث خطأ أثناء إلغاء الفاتورة');
      }
    } catch (err) {
      console.error(err);
      alert('حدث خطأ في الاتصال بالخادم');
    }
  };

  const handleUpdateBill = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const res = await fetch('/api/owner/bills', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          billId: editingBill.id,
          amps: editBillAmps,
          ampPrice: editBillAmpPrice,
          oldDebt: editBillOldDebt,
          paidAmount: editBillPaidAmount,
          paymentStatus: editBillStatus
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'حدث خطأ ما');
      } else {
        setShowEditBillModal(false);
        setEditingBill(null);
        fetchBills();
        fetchStats();
        fetchSubscribers();
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('فشل الاتصال بالسيرفر');
    }
  };

  const openReceipt = async (paymentId: string) => {
    try {
      const res = await fetch(`/api/owner/receipts?paymentId=${paymentId}&format=json`);
      if (!res.ok) {
        const errData = await res.json();
        alert(errData.error || 'حدث خطأ أثناء تحميل بيانات الوصل');
        return;
      }
      const data = await res.json();
      const p = data.payment;
      if (!p) {
        alert('بيانات الوصل غير متوفرة');
        return;
      }

      // Convert to receiptData format
      const receiptData = {
        paymentId: p.id,
        billId: p.billId,
        receiptNumber: p.receiptNumber || p.id,
        invoiceNumber: p.bill?.invoiceNumber || '',
        date: p.date,
        amount: p.amount,
        remainingAmount: p.bill?.remainingAmount || 0,
        subscriberName: p.subscriber?.name || '',
        phone: p.subscriber?.phone || '',
        boardName: p.board?.name || '',
        month: p.bill?.month || '',
        year: p.bill?.year || '',
        employeeName: user?.name || '',
        generatorName: p.generator?.name || generatorInfo?.name || '',
        generatorOwner: p.generator?.ownerName || generatorInfo?.ownerName || '',
        generatorPhone: p.generator?.phone || generatorInfo?.phone || '',
        generatorArea: p.generator?.area || generatorInfo?.area || '',
        note: p.note || '',
        amps: p.subscriber?.amps?.toString() || p.bill?.amps?.toString() || '0',
        ampPrice: p.bill?.ampPrice || 0,
        oldDebt: p.bill?.oldDebt || 0
      };

      setPdfReceiptData(receiptData);

      // Wait 300ms for React to render the template in the DOM, then download
      setTimeout(async () => {
        await handleDownloadPDF(receiptData);
        setPdfReceiptData(null);
      }, 300);
    } catch (err) {
      console.error(err);
      alert('فشل الاتصال بالسيرفر لتنزيل الوصل');
    }
  };

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const method = selectedEmp ? 'PUT' : 'POST';
    const body = selectedEmp ? { id: selectedEmp.id, ...empForm } : empForm;

    const res = await fetch('/api/owner/employees', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await res.json();
    if (!res.ok) {
      setErrorMsg(data.error || 'حدث خطأ ما');
    } else {
      setShowEmpModal(false);
      setSelectedEmp(null);
      fetchEmployeesList();
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الموظف؟')) return;
    const res = await fetch(`/api/owner/employees?id=${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error);
    } else {
      fetchEmployeesList();
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg('');
    setProfileError('');
    if (profileForm.password && profileForm.password !== profileForm.confirmPassword) {
      setProfileError('تأكيد كلمة المرور غير متطابق');
      return;
    }
    if (profileForm.password && profileForm.password.length < 6) {
      setProfileError('كلمة المرور يجب أن لا تقل عن 6 أحرف');
      return;
    }
    try {
      const res = await fetch('/api/owner/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profileForm.name || undefined,
          username: profileForm.username || undefined,
          password: profileForm.password || undefined
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setProfileError(data.error || 'حدث خطأ أثناء تحديث البيانات');
      } else {
        setProfileMsg('تم تعديل بيانات الحساب بنجاح');
        setProfileForm({ name: '', username: '', password: '', confirmPassword: '' });
        fetchSession();
      }
    } catch (err) {
      console.error(err);
      setProfileError('عفواً حدث خطأ في الاتصال بالخادم');
    }
  };

  const fetchGeneratorInfo = async () => {
    try {
      const res = await fetch('/api/owner/generator');
      if (res.ok) {
        const data = await res.json();
        setGeneratorInfo(data.generator);
        if (data.generator) {
          setGeneratorForm({
            name: data.generator.name || '',
            ownerName: data.generator.ownerName || '',
            phone: data.generator.phone || '',
            area: data.generator.area || ''
          });
        }
      }
    } catch (err) {
      console.error('Error fetching generator info:', err);
    }
  };

  const handleUpdateGenerator = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneratorMsg('');
    setGeneratorError('');
    try {
      const res = await fetch('/api/owner/generator', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(generatorForm)
      });
      const data = await res.json();
      if (!res.ok) {
        setGeneratorError(data.error || 'حدث خطأ أثناء تحديث بيانات المولدة');
      } else {
        setGeneratorMsg('تم تحديث بيانات المولدة بنجاح');
        setGeneratorInfo(data.generator);
      }
    } catch (err) {
      console.error(err);
      setGeneratorError('حدث خطأ في الاتصال بالخادم');
    }
  };

  const handleBulkUpdateBoardPrice = async () => {
    if (!bulkBoardPrice || isNaN(parseInt(bulkBoardPrice)) || parseInt(bulkBoardPrice) <= 0) {
      alert('الرجاء إدخال سعر أمبير صالح');
      return;
    }
    if (!confirm('هل أنت متأكد من رغبتك في تحديث سعر الأمبير لجميع البوردات؟')) {
      return;
    }
    try {
      const res = await fetch('/api/owner/boards/bulk-price', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ defaultAmpPrice: bulkBoardPrice })
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'تم التحديث بنجاح');
        setBulkBoardPrice('');
        fetchOwnerData();
      } else {
        alert(data.error || 'حدث خطأ أثناء التحديث');
      }
    } catch (err) {
      console.error(err);
      alert('حدث خطأ في الاتصال بالخادم');
    }
  };

  const handleUpdateBoardAmpPrice = async (boardId: string) => {
    const newPrice = parseInt(editingBoardPriceValue);
    if (!newPrice || newPrice <= 0) {
      alert('سعر الأمبير يجب أن يكون رقماً أكبر من صفر');
      return;
    }
    try {
      const res = await fetch('/api/owner/boards', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: boardId, defaultAmpPrice: newPrice })
      });
      if (res.ok) {
        setEditingBoardPrice(null);
        setEditingBoardPriceValue('');
        fetchBoards();
      } else {
        const data = await res.json();
        alert(data.error || 'فشل تحديث السعر');
      }
    } catch {
      alert('حدث خطأ في الاتصال بالشبكة');
    }
  };

  // Watch filters to refresh reports
  useEffect(() => {
    if (user && user.role !== 'SUPER_ADMIN') {
      fetchStats();
      fetchSubscribers();
      fetchBills();
    }
  }, [reportMonthFilter, reportYearFilter, subBoardFilter, billStatusFilter, billMonthFilter, billYearFilter]);

  // Filter subscribers matching search bar query
  const filteredSubscribers = subscribers.filter(s =>
    s.name.includes(subQuery) || s.phone.includes(subQuery) || s.address.includes(subQuery)
  );

  // Filter bills matching search bar query
  const filteredBills = bills.filter(b => {
    const matchesQuery = b.subscriber?.name?.toLowerCase().includes(billQuery.toLowerCase()) || b.subscriber?.phone?.includes(billQuery);
    const matchesBoard = subBoardFilter === 'all' || b.boardId === subBoardFilter || b.subscriber?.boardId === subBoardFilter;
    return matchesQuery && matchesBoard;
  });

  if (!user) {
    return <div className="loading-state" style={{ color: '#fff', textAlign: 'center', marginTop: '100px' }}>جاري تحميل الجلسة...</div>;
  }

  // =========================================================
  // RENDER SUPER ADMIN VIEW
  // =========================================================
  if (user.role === 'SUPER_ADMIN') {
    return (
      <div className="admin-container" style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', width: '100%', color: '#fff' }}>
        <div className="header-top-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h2>لوحة تحكم مدير النظام العام 🛡️</h2>
          <button className="btn btn-danger" onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <LogOut size={16} /> تسجيل الخروج
          </button>
        </div>

        <div className="section-header" style={{ marginBottom: '15px' }}>
          <h3>قائمة المولدات والملاك</h3>
          <button className="btn btn-primary btn-sm" onClick={() => {
            setSelectedGen(null);
            resetGenForm();
            setShowGenModal(true);
          }}>إضافة مولدة جديدة +</button>
        </div>

        <div className="generator-cards-list">
          {generators.length === 0 ? (
            <div className="empty-state">
              <Server size={48} style={{ color: '#9ca3af', marginBottom: '12px' }} />
              <h3>لا يوجد مولدات مضافة</h3>
              <p>قم بإضافة أول مولدة واسندها إلى مالك لبدء العمل.</p>
            </div>
          ) : (
            generators.map(g => (
              <div key={g.id} className="gen-card" style={{ background: '#273549', border: '1px solid #3d4f68', borderRadius: '12px', padding: '16px', marginBottom: '12px' }}>
                <div className="gen-card-header" style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #3d4f68', paddingBottom: '8px' }}>
                  <div className="gen-card-title">
                    <h3 style={{ color: '#10b981' }}>{g.name}</h3>
                    <p style={{ fontSize: '.75rem', color: '#9ca3af' }}>المنطقة: {g.area}</p>
                  </div>
                  <span className={`badge-status ${g.status === 'ACTIVE' ? 'badge-active' : 'badge-stopped'}`}>
                    {g.status === 'ACTIVE' ? 'نشطة' : 'متوقفة'}
                  </span>
                </div>

                <div className="gen-card-metrics" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', margin: '10px 0' }}>
                  <div className="gen-metric" style={{ background: '#1e293b', padding: '6px 10px', borderRadius: '6px' }}>
                    <span style={{ fontSize: '.7rem', color: '#9ca3af' }}>المالك:</span>
                    <div style={{ fontSize: '.85rem', fontWeight: 'bold' }}>{g.ownerName} ({g.phone})</div>
                  </div>
                  <div className="gen-metric" style={{ background: '#1e293b', padding: '6px 10px', borderRadius: '6px' }}>
                    <span style={{ fontSize: '.7rem', color: '#9ca3af' }}>الاشتراك:</span>
                    <div style={{ fontSize: '.85rem', fontWeight: 'bold' }}>{g.subscriptionType} ({new Date(g.subscriptionStart).toLocaleDateString('ar-IQ')} إلى {new Date(g.subscriptionEnd).toLocaleDateString('ar-IQ')})</div>
                  </div>
                </div>

                <div className="gen-card-actions" style={{ display: 'flex', gap: '6px' }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => {
                    setSelectedGen(g);
                    const owner = g.users?.[0] || {};
                    setGenForm({
                      name: g.name,
                      ownerName: g.ownerName,
                      phone: g.phone,
                      area: g.area,
                      subscriptionType: g.subscriptionType,
                      subscriptionStart: g.subscriptionStart.substring(0, 10),
                      subscriptionEnd: g.subscriptionEnd.substring(0, 10),
                      paymentDueDay: g.paymentDueDay.toString(),
                      username: owner.username || '',
                      password: '',
                      status: g.status
                    });
                    setShowGenModal(true);
                  }}>تعديل</button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDeleteGenerator(g.id)}>حذف</button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Generator modal */}
        {showGenModal && (
          <div className="modal show" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="modal-content" style={{ maxWidth: '500px', borderRadius: '12px', transform: 'none', background: '#1e293b', border: '1px solid #3d4f68', color: '#fff' }}>
              <div className="modal-header">
                <h3>{selectedGen ? 'تعديل المولدة' : 'إضافة مولدة جديدة'}</h3>
                <button className="modal-close" onClick={() => setShowGenModal(false)}>×</button>
              </div>
              <form onSubmit={handleSaveGenerator}>
                <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div className="form-group">
                    <label>اسم المولدة</label>
                    <input type="text" value={genForm.name} onChange={(e) => setGenForm({ ...genForm, name: e.target.value })} required />
                  </div>
                  <div className="form-grid-2">
                    <div className="form-group">
                      <label>اسم المالك</label>
                      <input type="text" value={genForm.ownerName} onChange={(e) => setGenForm({ ...genForm, ownerName: e.target.value })} required />
                    </div>
                    <div className="form-group">
                      <label>رقم هاتف المالك</label>
                      <input type="text" value={genForm.phone} onChange={(e) => setGenForm({ ...genForm, phone: e.target.value })} required />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>المنطقة / العنوان</label>
                    <input type="text" value={genForm.area} onChange={(e) => setGenForm({ ...genForm, area: e.target.value })} required />
                  </div>
                  <div className="form-grid-3">
                    <div className="form-group">
                      <label>نوع الاشتراك</label>
                      <select value={genForm.subscriptionType} onChange={(e) => setGenForm({ ...genForm, subscriptionType: e.target.value })}>
                        <option value="شهري">شهري</option>
                        <option value="سنوي">سنوي</option>
                        <option value="تجريبي">تجريبي</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>يوم الاستحقاق</label>
                      <input type="number" min="1" max="28" value={genForm.paymentDueDay} onChange={(e) => setGenForm({ ...genForm, paymentDueDay: e.target.value })} required />
                    </div>
                    <div className="form-group">
                      <label>الحالة</label>
                      <select value={genForm.status} onChange={(e) => setGenForm({ ...genForm, status: e.target.value })}>
                        <option value="ACTIVE">نشطة</option>
                        <option value="DISABLED">متوقفة</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-grid-2">
                    <div className="form-group">
                      <label>تاريخ بدء الاشتراك</label>
                      <input type="date" value={genForm.subscriptionStart} onChange={(e) => setGenForm({ ...genForm, subscriptionStart: e.target.value })} required />
                    </div>
                    <div className="form-group">
                      <label>تاريخ انتهاء الاشتراك</label>
                      <input type="date" value={genForm.subscriptionEnd} onChange={(e) => setGenForm({ ...genForm, subscriptionEnd: e.target.value })} required />
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid #3d4f68', padding: '10px 0', marginTop: '10px' }}>
                    <h4 style={{ color: '#10b981', marginBottom: '8px' }}>بيانات حساب المالك (تسجيل الدخول)</h4>
                    <div className="form-group">
                      <label>اسم المستخدم</label>
                      <input type="text" value={genForm.username} onChange={(e) => setGenForm({ ...genForm, username: e.target.value })} disabled={!!selectedGen} required />
                    </div>
                    <div className="form-group">
                      <label>{selectedGen ? 'كلمة المرور الجديدة (اتركها فارغة لعدم التغيير)' : 'كلمة المرور'}</label>
                      <input type="password" value={genForm.password} onChange={(e) => setGenForm({ ...genForm, password: e.target.value })} required={!selectedGen} />
                    </div>
                  </div>

                  {errorMsg && <div className="login-error show">{errorMsg}</div>}
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowGenModal(false)}>إلغاء</button>
                  <button type="submit" className="btn btn-primary">حفظ</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================
  // RENDER OWNER & EMPLOYEE (MOBILE INTERFACE)
  // =========================================================
  return (
    <div className="phone-simulator">
      {/* App Header Bar */}
      {activeTab !== 'bills' ? (
        <header className="app-header">
          <div className="header-top-row">
            <div className="app-brand" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <img 
                src="/ambeeri-logo.png" 
                alt="Ambeeri Logo" 
                style={{ width: '28px', height: '28px', borderRadius: '6px', objectFit: 'contain' }} 
              />
              <span className="brand-name-ar">أمبيري</span>
            </div>
            <div className="header-actions">
              <button className="header-btn danger" title="تسجيل الخروج" onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <LogOut size={18} />
              </button>
            </div>
          </div>

          <div className="owner-ribbon">
            <div className="owner-ribbon-avatar">
              {user.name.charAt(0)}
            </div>
            <div className="owner-ribbon-details">
              <h4>{user.name}</h4>
              <p>{user.genName || 'مولدة غير مسمى'} • {user.role === 'OWNER' ? 'المالك' : 'موظف'}</p>
            </div>
          </div>
        </header>
      ) : (
        <header className="app-header" style={{ padding: '12px 16px', background: '#1e293b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#fff', fontWeight: 'bold' }}>الفواتير والشهريات 🧾</h3>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <button
                className="btn btn-sm"
                style={{ background: '#16a34a', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', borderRadius: '6px', fontSize: '.75rem' }}
                onClick={handleExportBills}
                disabled={exportingBills}
                title="تصدير الفواتير إلى إكسل"
              >
                {exportingBills ? '⏳' : '📊'} إكسل
              </button>
              {(user.role === 'OWNER' || (user.permissions && user.permissions['generate_bills'])) && (
                <button className="btn btn-warning btn-sm" onClick={() => {
                  setErrorMsg('');
                  setShowBillModal(true);
                }} style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '.75rem', color: '#1e293b', fontWeight: 'bold' }}>
                  شهر جديد 📅
                </button>
              )}
              <button className="header-btn danger" title="تسجيل الخروج" onClick={handleLogout} style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '1rem', cursor: 'pointer', padding: '4px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <LogOut size={18} />
              </button>
            </div>
          </div>

          {/* Search and Filters inside Header for Bills */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
            {/* Search Input Box */}
            <div className="search-input-box" style={{ width: '100%', position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="ابحث عن زبون بالاسم أو الهاتف..."
                value={billQuery}
                onChange={(e) => setBillQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 36px 10px 12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  background: '#0f172a',
                  color: '#fff',
                  fontSize: '0.9rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Toggle Filters Button with arrow/chevron indicator */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>تصفية مخصصة للفواتير:</span>
              <button 
                type="button"
                onClick={() => setShowBillsFilters(!showBillsFilters)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#38bdf8',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  padding: '4px 8px',
                  borderRadius: '4px'
                }}
              >
                {showBillsFilters ? 'إخفاء خيارات التصفية' : 'عرض خيارات التصفية'}
                {showBillsFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            </div>

            {/* Collapsible Filters layout stacked vertically */}
            {showBillsFilters && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <select 
                    className="filter-select" 
                    value={billMonthFilter} 
                    onChange={(e) => setBillMonthFilter(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '8px', background: '#0f172a', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff', fontSize: '0.85rem' }}
                  >
                    <option value="all">كل الأشهر</option>
                    {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].map(m => (
                      <option key={m} value={m}>الشهر: {m}</option>
                    ))}
                  </select>
                  <select 
                    className="filter-select" 
                    value={billYearFilter} 
                    onChange={(e) => setBillYearFilter(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '8px', background: '#0f172a', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff', fontSize: '0.85rem' }}
                  >
                    <option value="all">كل السنوات</option>
                    {['2025', '2026', '2027', '2028'].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>

                <select 
                  className="filter-select" 
                  value={subBoardFilter} 
                  onChange={(e) => setSubBoardFilter(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '8px', background: '#0f172a', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff', fontSize: '0.85rem' }}
                >
                  <option value="all">كل البوردات</option>
                  {boards.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>

                <select 
                  className="filter-select" 
                  value={billStatusFilter} 
                  onChange={(e) => setBillStatusFilter(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '8px', background: '#0f172a', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff', fontSize: '0.85rem' }}
                >
                  <option value="all">كل الحالات (الكل)</option>
                  <option value="PAID">دافع / مدفوع بالكامل</option>
                  <option value="UNPAID">ما دافع / غير دافع</option>
                  <option value="PARTIAL">تسديد جزئي</option>
                  <option value="LATE">متأخر عن التسديد</option>
                </select>
              </div>
            )}
          </div>
        </header>
      )}

      {/* Main Content Area */}
      <main className="app-content-area">
        {/* ====================================================
            TAB 1: REPORTS & STATS
            ==================================================== */}
        {activeTab === 'stats' && (
          <div className="dashboard-section active">
            <div className="section-header">
              <h2>المؤشرات العامة للعمل 📊</h2>
            </div>

            {/* Filter bar for stats */}
            <div className="search-controls">
              <select className="filter-select" value={subBoardFilter} onChange={(e) => setSubBoardFilter(e.target.value)}>
                <option value="all">كل البوردات</option>
                {boards.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
              <select className="filter-select" value={reportMonthFilter} onChange={(e) => setReportMonthFilter(e.target.value)}>
                {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].map(m => (
                  <option key={m} value={m}>الشهر: {m}</option>
                ))}
              </select>
              <select className="filter-select" value={reportYearFilter} onChange={(e) => setReportYearFilter(e.target.value)}>
                {['2025', '2026', '2027', '2028'].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {/* Horizontal Stats Scroll */}
            <div className="horizontal-stats">
              <div className="stat-item stat-subscribers">
                <div className="stat-item-top">
                  <div className="stat-item-icon"><Users size={18} /></div>
                  <span className="stat-item-label">المشتركين</span>
                </div>
                <div className="stat-item-value">{stats.subscribersCount} مشترك</div>
              </div>

              <div className="stat-item stat-amperes">
                <div className="stat-item-top">
                  <div className="stat-item-icon"><Gauge size={18} /></div>
                  <span className="stat-item-label">مجموع الأمبيرات</span>
                </div>
                <div className="stat-item-value">{stats.totalAmps} أمبير</div>
              </div>

              <div className="stat-item stat-invoices">
                <div className="stat-item-top">
                  <div className="stat-item-icon"><Receipt size={18} /></div>
                  <span className="stat-item-label">مبلغ الشهر الحالي</span>
                </div>
                <div className="stat-item-value">{(stats.expectedRevenue).toLocaleString('ar-IQ')} د.ع</div>
              </div>

              <div className="stat-item stat-paid">
                <div className="stat-item-top">
                  <div className="stat-item-icon"><Coins size={18} /></div>
                  <span className="stat-item-label">المبالغ المستلمة</span>
                </div>
                <div className="stat-item-value">{(stats.collectedAmount).toLocaleString('ar-IQ')} د.ع</div>
              </div>

              <div className="stat-item stat-debts">
                <div className="stat-item-top">
                  <div className="stat-item-icon"><AlertCircle size={18} /></div>
                  <span className="stat-item-label">الديون المتبقية</span>
                </div>
                <div className="stat-item-value">{(stats.remainingAmount).toLocaleString('ar-IQ')} د.ع</div>
              </div>

              <div className="stat-item stat-profit">
                <div className="stat-item-top">
                  <div className="stat-item-icon"><Wallet size={18} /></div>
                  <span className="stat-item-label">المصاريف الكلية</span>
                </div>
                <div className="stat-item-value">{(stats.totalExpenses).toLocaleString('ar-IQ')} د.ع</div>
              </div>
            </div>

            {/* Profits details card */}
            <div className="report-card">
              <h3>ملخص الحسابات للشهر المختار</h3>
              <div className="report-item">
                <span>مجموع الجباية الفعلية:</span>
                <span className="font-bold text-primary">+ {(stats.collectedAmount).toLocaleString('ar-IQ')} د.ع</span>
              </div>
              <div className="report-item">
                <span>المصاريف والوقود:</span>
                <span className="font-bold text-danger">- {(stats.totalExpenses).toLocaleString('ar-IQ')} د.ع</span>
              </div>
              <div className={`report-item ${stats.netProfit < 0 ? 'negative' : ''}`}>
                <span>صافي الأرباح المقبوضة:</span>
                <span className="font-bold">{(stats.netProfit).toLocaleString('ar-IQ')} د.ع</span>
              </div>
            </div>

            {/* Overall cumulative accounts card */}
            <div className="report-card" style={{ marginTop: '16px', background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
              <h3 style={{ color: '#fff' }}>إجمالي الحسابات التراكمية (كل الأوقات) 📊</h3>
              <div className="report-item" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ color: '#94a3b8' }}>إجمالي المبالغ المستلمة (الاستحصالات):</span>
                <span className="font-bold text-success" style={{ color: '#10b981' }}>+ {(stats.overall?.collected || 0).toLocaleString('ar-IQ')} د.ع</span>
              </div>
              <div className="report-item" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ color: '#94a3b8' }}>إجمالي المديونية المتبقية (الديون):</span>
                <span className="font-bold text-danger" style={{ color: '#ef4444' }}>{(stats.overall?.debt || 0).toLocaleString('ar-IQ')} د.ع</span>
              </div>
              <div className="report-item" style={{ borderBottom: 'none' }}>
                <span style={{ color: '#94a3b8' }}>إجمالي المصاريف والوقود:</span>
                <span className="font-bold text-warning" style={{ color: '#f59e0b' }}>- {(stats.overall?.expenses || 0).toLocaleString('ar-IQ')} د.ع</span>
              </div>
            </div>
          </div>
        )}

        {/* ====================================================
            ==================================================== */}
        {activeTab === 'subscribers' && (
          <div className="dashboard-section active">
            <div className="section-header">
              <h2>إدارة المشتركين 👥</h2>
              {(user.role === 'OWNER' || (user.permissions && user.permissions['add_subscriber'])) && (
                <button className="btn btn-primary btn-sm" onClick={() => {
                  setSelectedSub(null);
                  setSubForm({
                    name: '', phone: '', address: '', amps: '5',
                    ampPrice: boards[0]?.defaultAmpPrice?.toString() || '12000',
                    oldDebt: '0', boardId: boards[0]?.id || '', status: 'ACTIVE'
                  });
                  setShowSubModal(true);
                }} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Plus size={16} /> مشترك جديد
                </button>
              )}
            </div>

            <div className="search-controls">
              <div className="search-input-box" style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', right: '11px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
                <input
                  type="text"
                  placeholder="ابحث عن مشترك بالاسم أو الهاتف..."
                  value={subQuery}
                  onChange={(e) => setSubQuery(e.target.value)}
                />
              </div>
              <select className="filter-select" value={subBoardFilter} onChange={(e) => setSubBoardFilter(e.target.value)}>
                <option value="all">كل البوردات</option>
                {boards.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            <div className="subscriber-cards-list">
              {filteredSubscribers.length === 0 ? (
                <div className="empty-state">
                  <Users size={48} style={{ color: 'var(--text-light)', marginBottom: '8px' }} />
                  <h3>لا يوجد مشتركين</h3>
                  <p>تأكد من كتابة الاسم بشكل صحيح أو قم بإضافة مشتركين جدد.</p>
                </div>
              ) : (
                filteredSubscribers.map(s => {
                  // Calculate active debt sum
                  const activeDebt = s.monthlyBills
                    ? s.monthlyBills
                        .filter((b: any) => b.paymentStatus !== 'PAID')
                        .reduce((sum: number, b: any) => sum + b.remainingAmount, 0) + s.oldDebt
                    : s.oldDebt;

                  return (
                    <div key={s.id} className="sub-card">
                      <div className="sub-card-header">
                        <div className="sub-card-title">
                          <h3 onClick={() => router.push(`/dashboard/subscribers/${s.id}`)} style={{ cursor: 'pointer', textDecoration: 'underline', color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <Info size={16} /> {s.name}
                          </h3>
                          <p>{s.board?.name || 'بدون بورد'} • {s.address}</p>
                        </div>
                        <div className="sub-card-badges">
                          <span className={`badge-status ${s.status === 'ACTIVE' ? 'badge-active' : 'badge-stopped'}`}>
                            {s.status === 'ACTIVE' ? 'نشط' : 'موقف'}
                          </span>
                          {activeDebt > 0 && (
                            <span className="badge-status badge-debt">ديون: {(activeDebt).toLocaleString('ar-IQ')} د.ع</span>
                          )}
                        </div>
                      </div>

                      <div className="sub-card-metrics">
                        <div className="metric-box">
                          <span className="metric-label">الأمبيرات</span>
                          <span className="metric-value">{s.amps} أمبير</span>
                        </div>
                        <div className="metric-box">
                          <span className="metric-label">سعر الأمبير</span>
                          <span className="metric-value">{(s.ampPrice).toLocaleString('ar-IQ')} د.ع</span>
                        </div>
                        <div className="metric-box">
                          <span className="metric-label">المبلغ الافتراضي</span>
                          <span className="metric-value">{(s.amps * s.ampPrice).toLocaleString('ar-IQ')} د.ع</span>
                        </div>
                      </div>

                      <div className="sub-card-actions">
                        <span className="sub-card-phone" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Phone size={14} /> {s.phone}</span>
                        <div className="sub-card-buttons">
                          <a href={`https://wa.me/${s.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="action-btn btn-whatsapp" title="واتساب" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                            <WhatsAppIcon size={20} className="text-success" />
                          </a>
                          {(user.role === 'OWNER' || (user.permissions && user.permissions['edit_subscriber'])) && (
                            <button className="action-btn btn-edit" title="تعديل" onClick={() => {
                              setSelectedSub(s);
                              setSubForm({
                                name: s.name,
                                phone: s.phone,
                                address: s.address,
                                amps: s.amps.toString(),
                                ampPrice: s.ampPrice.toString(),
                                oldDebt: s.oldDebt.toString(),
                                boardId: s.boardId,
                                status: s.status
                              });
                              setShowSubModal(true);
                            }} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Pencil size={18} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ====================================================
            TAB 4: BILLS & INVOICES
            ==================================================== */}
        {activeTab === 'bills' && (
          <div className="dashboard-section active" style={{ paddingTop: '8px' }}>
            <div className="month-payment-list">
              {bills.length === 0 ? (
                <div className="empty-state">
                  <Receipt size={48} style={{ color: 'var(--text-light)', marginBottom: '8px' }} />
                  <h3>لا توجد فواتير تولدت بعد</h3>
                  <p>اضغط على زر "بدء شهر جديد" لتوليد فواتير للمشتركين النشطين.</p>
                </div>
              ) : filteredBills.length === 0 ? (
                <div className="empty-state">
                  <Receipt size={48} style={{ color: 'var(--text-light)', marginBottom: '8px' }} />
                  <h3>لا توجد فواتير مطابقة للبحث</h3>
                  <p>تأكد من كتابة الاسم أو الهاتف بشكل صحيح أو جرب فلاتر أخرى.</p>
                </div>
              ) : (
                filteredBills.map(b => (
                  <div key={b.id} className="month-pay-card">
                    <div className="month-pay-header">
                      <div>
                        <h4>{b.subscriber?.name} {b.subscriber?.address ? ` - ${b.subscriber.address}` : ''}</h4>
                        <p style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                          الشهر: <strong style={{ color: 'var(--primary)' }}>{b.month} / {b.year}</strong> • الفاتورة: {b.invoiceNumber || '—'} • {b.board?.name}
                        </p>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                        <span className={`badge-status ${
                          b.paymentStatus === 'PAID' ? 'badge-paid' :
                          b.paymentStatus === 'PARTIAL' ? 'badge-partial' : 
                          b.paymentStatus === 'CANCELLED' ? 'badge-stopped' : 'badge-unpaid'
                        }`}>
                          {b.paymentStatus === 'PAID' ? 'تم الدفع' :
                           b.paymentStatus === 'PARTIAL' ? 'دفع جزئي' : 
                           b.paymentStatus === 'CANCELLED' ? 'ملغاة' : 'غير دافع'}
                        </span>
                        <span className={`badge-status ${
                          b.reminderStatus === 'SENT' ? 'badge-active' :
                          b.reminderStatus === 'FAILED' ? 'badge-debt' :
                          b.reminderStatus === 'PENDING' ? 'badge-partial' : 'badge-stopped'
                        }`} style={{ fontSize: '.65rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <WhatsAppIcon size={12} /> {
                            b.reminderStatus === 'SENT' ? 'تم التذكير' :
                            b.reminderStatus === 'FAILED' ? 'فشل التذكير' :
                            b.reminderStatus === 'PENDING' ? 'تذكير معلق (يدوي)' : 'لم يرسل'
                          }
                        </span>
                      </div>
                    </div>

                    <div className="month-pay-details">
                      <div className="mpd-item">
                        <span className="mpd-label">أجرة الشهر</span>
                        <span className="mpd-value">{(b.monthAmount).toLocaleString('ar-IQ')} د.ع</span>
                      </div>
                      <div className="mpd-item">
                        <span className="mpd-label">ديون سابقة</span>
                        <span className="mpd-value">{(b.oldDebt).toLocaleString('ar-IQ')} د.ع</span>
                      </div>
                      <div className="mpd-item">
                        <span className="mpd-label">متبقي كلي</span>
                        <span className="mpd-value" style={{ color: b.remainingAmount > 0 ? 'var(--danger)' : 'inherit' }}>
                          {(b.remainingAmount).toLocaleString('ar-IQ')} د.ع
                        </span>
                      </div>
                      <div className="mpd-item">
                        <span className="mpd-label">تاريخ الإنشاء</span>
                        <span className="mpd-value">{new Date(b.createdAt).toLocaleDateString('ar-IQ', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                      </div>
                      <div className="mpd-item">
                        <span className="mpd-label">عدد الأمبيرات</span>
                        <span className="mpd-value">{b.amps} أمبير ({b.ampPrice.toLocaleString('ar-IQ')} د.ع/أمبير)</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px', gap: '8px', flexWrap: 'wrap' }}>
                      {/* Edit Bill Button (OWNER or generate_bills permission) */}
                      {(user.role === 'OWNER' || (user.permissions && user.permissions['generate_bills'])) && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ borderColor: 'var(--warning)', color: 'var(--warning)', background: 'transparent', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          onClick={() => {
                            setEditingBill(b);
                            setEditBillAmps(b.amps.toString());
                            setEditBillAmpPrice(b.ampPrice.toString());
                            setEditBillOldDebt(b.oldDebt.toString());
                            setEditBillPaidAmount(b.paidAmount.toString());
                            setEditBillStatus(b.paymentStatus);
                            setShowEditBillModal(true);
                          }}
                        >
                          <Pencil size={14} /> تعديل
                        </button>
                      )}

                      {/* Reprint receipt (if payment exists) */}
                      {b.payments && b.payments.length > 0 && (user.role === 'OWNER' || (user.permissions && user.permissions.reprint_receipt)) && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => openReceipt(b.payments[b.payments.length - 1].id)}
                          style={{ borderColor: 'var(--primary)', color: 'var(--primary)', background: 'transparent', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Printer size={14} /> وصل
                        </button>
                      )}

                      {/* Actions available only if remainingAmount > 0 */}
                      {b.remainingAmount > 0 && (user.role === 'OWNER' || (user.permissions && user.permissions['collect_payment'])) && (
                        <>
                          {(b.reminderStatus === 'FAILED' || b.reminderStatus === 'PENDING' || b.reminderStatus === 'NOT_SENT') && (
                            <button 
                              type="button" 
                              className="btn btn-secondary btn-sm" 
                              style={{ 
                                borderColor: b.reminderStatus === 'FAILED' ? 'var(--danger)' : (b.reminderStatus === 'PENDING' ? 'var(--warning)' : 'var(--border-dark)'), 
                                color: b.reminderStatus === 'FAILED' ? 'var(--danger)' : (b.reminderStatus === 'PENDING' ? 'var(--warning)' : 'var(--text-muted)'),
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                              onClick={() => handleSendReminder(b.id)}
                            >
                              تذكير واتساب <WhatsAppIcon size={14} />
                            </button>
                          )}
                          {(() => {
                            const text = b.paymentStatus === 'UNPAID'
                              ? `عزيزي المشترك، نود تذكيرك بأن فاتورة اشتراك المولدة لشهر ${b.month} / ${b.year} لم يتم تسديدها لحد الآن. يرجى التسديد بأقرب وقت، مع الشكر.`
                              : `عزيزي المشترك، نود تذكيرك بأن فاتورة اشتراك المولدة لشهر ${b.month} / ${b.year} غير مسددة بالكامل لحد الآن. يرجى إكمال التسديد، مع الشكر.`;
                            const cleanPhone = b.subscriber?.phone ? b.subscriber.phone.replace(/\D/g, '') : '';
                            let normalizedPhone = cleanPhone;
                            if (cleanPhone.startsWith('0')) {
                              normalizedPhone = '964' + cleanPhone.substring(1);
                            } else if (!cleanPhone.startsWith('964') && cleanPhone.length === 10) {
                              normalizedPhone = '964' + cleanPhone;
                            }
                            const waUrl = `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(text)}`;
                            
                            return (b.reminderStatus === 'FAILED' || b.reminderStatus === 'PENDING') && (
                              <a 
                                href={waUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-whatsapp btn-sm"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none', background: '#25d366', color: '#fff', border: 'none' }}
                              >
                                إرسال واتساب يدوياً <WhatsAppIcon size={14} />
                              </a>
                            );
                          })()}
                          {b.paymentStatus !== 'PAID' && b.paymentStatus !== 'CANCELLED' && user && (user.role === 'OWNER' || (user.permissions && user.permissions['cancel_bill'])) && (
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              onClick={() => handleCancelBill(b.id)}
                              style={{ background: 'var(--danger)', borderColor: 'var(--danger)', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            >
                              <Trash2 size={14} /> إلغاء
                            </button>
                          )}
                          <button className="btn btn-primary btn-sm" onClick={() => {
                            setSelectedBill(b);
                            setPaymentAmount(b.remainingAmount.toString());
                            setPaymentAmpPrice(b.ampPrice.toString());
                            setPaymentAmps(b.amps.toString());
                            setShowPaymentModal(true);
                          }} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Wallet size={14} /> تسجيل دفع
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
             
        {/* ====================================================
            TAB 5: SETTINGS (Boards + Employees + Profile)
            ==================================================== */}
        {activeTab === 'settings' && (
          <div className="dashboard-section active">

            {/* ---- Section: Profile ---- */}
            <div className="section-header" style={{ marginBottom: '8px' }}>
              <h2 style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><User size={20} /> بياناتي الشخصية</h2>
            </div>
            <div className="form-card" style={{ marginBottom: '20px' }}>
              <form onSubmit={handleUpdateProfile}>
                <div className="form-group">
                  <label>اسم المستخدم الجديد</label>
                  <input
                    type="text"
                    placeholder={user.username}
                    value={profileForm.username}
                    onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>الاسم الكامل الجديد</label>
                  <input
                    type="text"
                    placeholder={user.name}
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  />
                </div>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label>كلمة المرور الجديدة</label>
                    <input
                      type="password"
                      placeholder="اتركها فارغة إذا لا تريد تغييرها"
                      value={profileForm.password}
                      onChange={(e) => setProfileForm({ ...profileForm, password: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>تأكيد كلمة المرور</label>
                    <input
                      type="password"
                      placeholder="أعد كتابة كلمة المرور"
                      value={profileForm.confirmPassword}
                      onChange={(e) => setProfileForm({ ...profileForm, confirmPassword: e.target.value })}
                    />
                  </div>
                </div>
                {profileError && <div className="login-error show">{profileError}</div>}
                {profileMsg && <div style={{ color: '#10b981', fontSize: '.85rem', marginBottom: '8px' }}>{profileMsg}</div>}
                <button type="submit" className="btn btn-primary" style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <Save size={16} /> حفظ التغييرات
                </button>
              </form>
            </div>

            {/* ---- Section: Generator Settings (OWNER ONLY) ---- */}
            {user.role === 'OWNER' && (
              <>
                <div className="section-header" style={{ marginBottom: '8px', marginTop: '20px' }}>
                  <h2 style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><Settings size={20} /> إعدادات المولدة</h2>
                </div>
                <div className="form-card" style={{ marginBottom: '20px' }}>
                  <form onSubmit={handleUpdateGenerator}>
                    <div className="form-group">
                      <label>اسم المولدة</label>
                      <input
                        type="text"
                        placeholder="مثال: مولدة حي السلام"
                        value={generatorForm.name}
                        onChange={(e) => setGeneratorForm({ ...generatorForm, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>اسم صاحب المولدة</label>
                      <input
                        type="text"
                        placeholder="اسم المالك الكامل"
                        value={generatorForm.ownerName}
                        onChange={(e) => setGeneratorForm({ ...generatorForm, ownerName: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-grid-2">
                      <div className="form-group">
                        <label>رقم هاتف صاحب المولدة</label>
                        <input
                          type="text"
                          placeholder="رقم الهاتف للمبيعات والتحصيل"
                          value={generatorForm.phone}
                          onChange={(e) => setGeneratorForm({ ...generatorForm, phone: e.target.value })}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>عنوان / منطقة المولدة</label>
                        <input
                          type="text"
                          placeholder="مثال: بغداد، المنصور"
                          value={generatorForm.area}
                          onChange={(e) => setGeneratorForm({ ...generatorForm, area: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                    {generatorError && <div className="login-error show">{generatorError}</div>}
                    {generatorMsg && <div style={{ color: '#10b981', fontSize: '.85rem', marginBottom: '8px' }}>{generatorMsg}</div>}
                    <button type="submit" className="btn btn-primary" style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      <Save size={16} /> حفظ إعدادات المولدة
                    </button>
                  </form>
                </div>
              </>
            )}

            {/* ---- Section: Boards (OWNER ONLY) ---- */}
            {user.role === 'OWNER' && (
              <>
                <div className="section-header" style={{ marginBottom: '8px' }}>
                  <h2 style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><Network size={20} /> البوردات</h2>
                  <button className="btn btn-primary btn-sm" onClick={() => {
                    setSelectedBoard(null);
                    setBoardForm({ name: '', area: '', address: '', defaultAmpPrice: '12000', notes: '', status: 'ACTIVE' });
                    setShowBoardModal(true);
                  }} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Plus size={14} /> إضافة بورد
                  </button>
                </div>
                {/* Bulk update board price */}
                <div className="form-card" style={{ marginBottom: '15px', padding: '12px' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <input
                        type="number"
                        placeholder="سعر الأمبير الموحد لجميع البوردات (د.ع)"
                        value={bulkBoardPrice}
                        onChange={(e) => setBulkBoardPrice(e.target.value)}
                        style={{ width: '100%', padding: '6px 10px', fontSize: '.85rem', border: '1px solid var(--border-dark)', borderRadius: '6px', background: 'var(--surface)', color: 'var(--text-main)' }}
                      />
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={handleBulkUpdateBoardPrice}
                      style={{ padding: '7px 12px', whiteSpace: 'nowrap' }}
                    >
                      تحديث كل البوردات
                    </button>
                  </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  {boards.length === 0 ? (
                    <div className="empty-state">
                      <Network size={48} style={{ color: 'var(--text-light)', marginBottom: '8px' }} />
                      <h3>لا يوجد بوردات</h3>
                      <p>أضف أول بورد لتنظيم مشتركيك.</p>
                    </div>
                  ) : (
                    boards.map((b: any) => (
                      <div key={b.id} className="board-card" style={{ marginBottom: '10px' }}>
                        <div className="board-card-header">
                          <div>
                            <h3>{b.name}</h3>
                            <p style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>{b.area} — {b.address}</p>
                          </div>
                          <span className={`badge-status ${b.status === 'ACTIVE' ? 'badge-active' : 'badge-stopped'}`}>
                            {b.status === 'ACTIVE' ? 'نشط' : 'متوقف'}
                          </span>
                        </div>
                        <div className="board-stats">
                          <div className="bstat"><span>المشتركون</span><strong>{b._count?.subscribers ?? 0}</strong></div>
                          <div className="bstat">
                            <span>سعر الأمبير</span>
                            {editingBoardPrice === b.id ? (
                              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                <input
                                  type="number"
                                  value={editingBoardPriceValue}
                                  onChange={(e) => setEditingBoardPriceValue(e.target.value)}
                                  style={{ width: '90px', padding: '2px 6px', fontSize: '.8rem', border: '1px solid var(--primary)', borderRadius: '4px' }}
                                  autoFocus
                                />
                                <button onClick={() => handleUpdateBoardAmpPrice(b.id)} style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer', fontSize: '.75rem' }}>✓</button>
                                <button onClick={() => setEditingBoardPrice(null)} style={{ background: 'transparent', color: 'var(--danger)', border: 'none', cursor: 'pointer', fontSize: '.75rem' }}>✕</button>
                              </div>
                            ) : (
                              <strong
                                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                                onClick={() => { setEditingBoardPrice(b.id); setEditingBoardPriceValue(b.defaultAmpPrice?.toString() || ''); }}
                                title="اضغط لتعديل السعر"
                              >
                                {(b.defaultAmpPrice || 0).toLocaleString('ar-IQ')} د.ع <Pencil size={12} style={{ color: 'var(--primary)' }} />
                              </strong>
                            )}
                          </div>
                        </div>
                        <div className="board-card-actions">
                          <button className="btn btn-secondary btn-sm" onClick={() => {
                            setSelectedBoard(b);
                            setBoardForm({ name: b.name, area: b.area || '', address: b.address || '', defaultAmpPrice: b.defaultAmpPrice?.toString() || '12000', notes: b.notes || '', status: b.status });
                            setShowBoardModal(true);
                          }} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Pencil size={14} /> تعديل
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* ---- Section: Employees ---- */}
                <div className="section-header" style={{ marginBottom: '8px' }}>
                  <h2 style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><Shield size={20} /> الموظفون</h2>
                  <button className="btn btn-primary btn-sm" onClick={() => {
                    setSelectedEmp(null);
                    setEmpForm({
                      name: '', username: '', password: '', boardId: 'all', status: 'ACTIVE',
                      permissions: {
                        add_subscriber: true,
                        edit_subscriber: true,
                        delete_subscriber: false,
                        generate_bills: false,
                        collect_payment: true,
                        manage_expenses: false,
                        cancel_bill: false,
                        print_receipt: true,
                        reprint_receipt: false
                      }
                    });
                    setShowEmpModal(true);
                  }} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Plus size={14} /> موظف جديد
                  </button>
                </div>
                <div className="emp-cards-list">
                  {employees.length === 0 ? (
                    <div className="empty-state">
                      <Shield size={48} style={{ color: 'var(--text-light)', marginBottom: '8px' }} />
                      <h3>لا يوجد موظفين مضافين</h3>
                      <p>قم بإضافة الجباة والموظفين وحدد البوردات المسموحة لهم وصلاحياتهم.</p>
                    </div>
                  ) : (
                    employees.map(e => (
                      <div key={e.id} className="emp-card">
                        <div className="emp-card-header">
                          <h3>{e.name}</h3>
                          <span className={`badge-status ${e.status === 'ACTIVE' ? 'badge-active' : 'badge-stopped'}`}>
                            {e.status === 'ACTIVE' ? 'نشط' : 'معطل'}
                          </span>
                        </div>
                        <div className="emp-info">
                          <div>اسم المستخدم: <strong>{e.username}</strong></div>
                          <div>نطاق البورد: <strong>{e.board?.name || 'كل البوردات'}</strong></div>
                        </div>
                        <div className="emp-perms-preview">
                          {e.permissions?.filter((p: any) => p.value).map((p: any) => (
                            <span key={p.id} className="perm-pill">
                              {p.permissionKey === 'add_subscriber' ? 'إضافة مشترك' :
                               p.permissionKey === 'edit_subscriber' ? 'تعديل مشترك' :
                               p.permissionKey === 'delete_subscriber' ? 'حذف مشترك' :
                               p.permissionKey === 'generate_bills' ? 'توليد فواتير' :
                               p.permissionKey === 'collect_payment' ? 'جباية' :
                               p.permissionKey === 'manage_expenses' ? 'إدارة مصاريف' :
                               p.permissionKey === 'cancel_bill' ? 'إلغاء فواتير' : p.permissionKey === 'print_receipt' ? 'طباعة وصولات' : p.permissionKey === 'reprint_receipt' ? 'إعادة طباعة' : p.permissionKey}
                            </span>
                          ))}
                          {e.permissions?.filter((p: any) => p.value).length === 0 && (
                            <span style={{ fontSize: '.7rem', color: 'var(--text-light)' }}>بدون صلاحيات إضافية</span>
                          )}
                        </div>
                        <div className="emp-card-actions">
                          <button className="btn btn-secondary btn-sm" onClick={() => {
                            setSelectedEmp(e);
                            const permsObj: any = {};
                            e.permissions?.forEach((p: any) => { permsObj[p.permissionKey] = p.value; });
                            setEmpForm({
                              name: e.name, username: e.username, password: '',
                              boardId: e.boardId || 'all', status: e.status,
                              permissions: {
                                add_subscriber: permsObj.add_subscriber ?? true,
                                edit_subscriber: permsObj.edit_subscriber ?? true,
                                delete_subscriber: permsObj.delete_subscriber ?? false,
                                generate_bills: permsObj.generate_bills ?? false,
                                collect_payment: permsObj.collect_payment ?? true,
                                manage_expenses: permsObj.manage_expenses ?? false,
                                cancel_bill: permsObj.cancel_bill ?? false,
                                print_receipt: permsObj.print_receipt ?? true,
                                reprint_receipt: permsObj.reprint_receipt ?? false
                              }
                            });
                            setShowEmpModal(true);
                          }} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Pencil size={14} /> تعديل والصلاحيات
                          </button>
                          
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}

          </div>
        )}

        {/* ====================================================
            TAB 6: EXPENSES MANAGEMENT
            ==================================================== */}
        {activeTab === 'expenses' && (
          <div className="dashboard-section active">
            <div className="section-header">
              <h2>إدارة المصاريف 💸</h2>
              {(user.role === 'OWNER' || (user.permissions && user.permissions['manage_expenses'])) && (
                <button 
                  className="btn btn-primary btn-sm" 
                  onClick={() => {
                    setSelectedExpense(null);
                    setExpenseForm({
                      name: '',
                      type: 'وقود ديزل',
                      amount: '',
                      date: new Date().toISOString().split('T')[0],
                      notes: '',
                      boardId: 'general'
                    });
                    setErrorMsg('');
                    setShowExpenseModal(true);
                  }} 
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  <Plus size={16} /> إضافة مصروف
                </button>
              )}
            </div>

            {/* Total Filtered Expenses display card */}
            {(() => {
              // Filter logic for listing
              const filteredList = expenses.filter(exp => {
                // Parse note metadata
                let parsedNote = { name: exp.type, boardId: '', boardName: '', notes: exp.note || '' };
                try {
                  if (exp.note && exp.note.startsWith('{') && exp.note.endsWith('}')) {
                    parsedNote = JSON.parse(exp.note);
                  } else {
                    parsedNote = { name: exp.type || 'مصروف', boardId: '', boardName: '', notes: exp.note || '' };
                  }
                } catch (e) {
                  parsedNote = { name: exp.type || 'مصروف', boardId: '', boardName: '', notes: exp.note || '' };
                }

                // Query search
                const queryText = (parsedNote.name + ' ' + parsedNote.notes + ' ' + exp.type).toLowerCase();
                const matchesSearch = queryText.includes(expenseSearchQuery.toLowerCase());

                // Type filter
                const matchesType = expenseFilterType === 'all' || exp.type === expenseFilterType;

                // Month & Year filter
                const expDate = new Date(exp.date);
                const expMonthStr = String(expDate.getMonth() + 1).padStart(2, '0');
                const expYearStr = String(expDate.getFullYear());
                const matchesMonth = expenseFilterMonth === 'all' || expMonthStr === expenseFilterMonth;
                const matchesYear = expenseFilterYear === 'all' || expYearStr === expenseFilterYear;

                return matchesSearch && matchesType && matchesMonth && matchesYear;
              });

              const totalFiltered = filteredList.reduce((sum, e) => sum + e.amount, 0);

              return (
                <>
                  <div className="stat-card" style={{ marginBottom: '16px', background: 'var(--danger-light)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                    <div className="stat-card-title" style={{ color: 'var(--danger)' }}>إجمالي المصاريف المفلترة</div>
                    <div className="stat-card-value" style={{ color: 'var(--danger)', fontSize: '1.8rem', fontWeight: 'bold' }}>
                      {totalFiltered.toLocaleString('ar-IQ')} د.ع
                    </div>
                  </div>

                  {/* Search and Filters */}
                  <div className="search-controls" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                    <div className="search-input-box" style={{ position: 'relative', width: '100%' }}>
                      <Search size={16} style={{ position: 'absolute', right: '11px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
                      <input
                        type="text"
                        placeholder="ابحث عن مصروف بالاسم أو التفاصيل..."
                        value={expenseSearchQuery}
                        onChange={(e) => setExpenseSearchQuery(e.target.value)}
                        style={{ width: '100%', paddingRight: '36px', paddingLeft: '12px', boxSizing: 'border-box' }}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>تصفية المصاريف:</span>
                      <button 
                        type="button"
                        onClick={() => setShowExpenseFilters(!showExpenseFilters)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--primary)',
                          fontSize: '0.8rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          cursor: 'pointer',
                          fontWeight: 'bold'
                        }}
                      >
                        {showExpenseFilters ? 'إخفاء الفلاتر' : 'عرض الفلاتر'}
                        {showExpenseFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </div>

                    {showExpenseFilters && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          <select 
                            className="filter-select" 
                            value={expenseFilterMonth} 
                            onChange={(e) => setExpenseFilterMonth(e.target.value)}
                            style={{ width: '100%' }}
                          >
                            <option value="all">كل الأشهر</option>
                            {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].map(m => (
                              <option key={m} value={m}>شهر {m}</option>
                            ))}
                          </select>
                          <select 
                            className="filter-select" 
                            value={expenseFilterYear} 
                            onChange={(e) => setExpenseFilterYear(e.target.value)}
                            style={{ width: '100%' }}
                          >
                            <option value="all">كل السنوات</option>
                            {['2025', '2026', '2027', '2028'].map(y => (
                              <option key={y} value={y}>{y}</option>
                            ))}
                          </select>
                        </div>
                        <select 
                          className="filter-select" 
                          value={expenseFilterType} 
                          onChange={(e) => setExpenseFilterType(e.target.value)}
                          style={{ width: '100%' }}
                        >
                          <option value="all">جميع التصنيفات</option>
                          <option value="وقود ديزل">وقود ديزل</option>
                          <option value="صيانة وفلاتر">صيانة وفلاتر</option>
                          <option value="أجور عمال">أجور عمال</option>
                          <option value="شبكة وتوزيع">شبكة وتوزيع</option>
                          <option value="أخرى">أخرى</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Expenses Cards List */}
                  <div className="subscriber-cards-list">
                    {filteredList.length === 0 ? (
                      <div className="empty-state">
                        <Wallet size={48} style={{ color: 'var(--text-light)', marginBottom: '8px' }} />
                        <h3>لا توجد مصاريف مطابقة للبحث</h3>
                        <p>تأكد من كتابة الاسم بشكل صحيح أو جرب استخدام خيارات تصفية أخرى.</p>
                      </div>
                    ) : (
                      filteredList.map(exp => {
                        let parsedNote = { name: exp.type, boardId: '', boardName: '', notes: exp.note || '' };
                        try {
                          if (exp.note && exp.note.startsWith('{') && exp.note.endsWith('}')) {
                            parsedNote = JSON.parse(exp.note);
                          } else {
                            parsedNote = { name: exp.type || 'مصروف', boardId: '', boardName: '', notes: exp.note || '' };
                          }
                        } catch (e) {
                          parsedNote = { name: exp.type || 'مصروف', boardId: '', boardName: '', notes: exp.note || '' };
                        }

                        return (
                          <div key={exp.id} className="sub-card">
                            <div className="sub-card-header">
                              <div className="sub-card-title">
                                <h3 style={{ color: 'var(--text-main)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                  {parsedNote.name}
                                </h3>
                                <p style={{ fontSize: '.75rem', color: 'var(--text-light)' }}>
                                  التصنيف: <strong style={{ color: 'var(--primary)' }}>{exp.type}</strong> • البورد: {parsedNote.boardName || 'عام'}
                                </p>
                              </div>
                              <div className="sub-card-badges">
                                <span className="badge-status badge-stopped" style={{ background: 'var(--danger-light)', color: 'var(--danger)' }}>
                                  {(exp.amount).toLocaleString('ar-IQ')} د.ع
                                </span>
                              </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '.75rem', color: 'var(--text-muted)', marginTop: '8px', borderTop: '1px solid var(--border)', paddingTop: '6px' }}>
                              <span>تاريخ الصرف: {new Date(exp.date).toLocaleDateString('ar-IQ', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                            </div>

                            {parsedNote.notes && (
                              <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', background: 'var(--background)', padding: '6px 10px', borderRadius: '6px', marginTop: '8px', border: '1px solid var(--border-dark)', fontStyle: 'italic' }}>
                                <strong>ملاحظة:</strong> {parsedNote.notes}
                              </div>
                            )}

                            {(user.role === 'OWNER' || (user.permissions && user.permissions['manage_expenses'])) && (
                              <div className="sub-card-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px', borderTop: '1px solid var(--border)', paddingTop: '8px' }}>
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-sm"
                                  style={{ borderColor: 'var(--warning)', color: 'var(--warning)', background: 'transparent', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                  onClick={() => handleEditExpense(exp)}
                                >
                                  <Pencil size={12} /> تعديل
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-sm"
                                  style={{ borderColor: 'var(--danger)', color: 'var(--danger)', background: 'transparent', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                  onClick={() => handleDeleteExpense(exp.id)}
                                >
                                  <Trash2 size={12} /> حذف
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        )}

      </main>

      {/* Bottom Navigation Tabs Bar */}
      <nav className="app-nav">
        <button className={`nav-item ${activeTab === 'stats' ? 'active' : ''}`} onClick={() => setActiveTab('stats')}>
          <i style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Home size={22} /></i>
          <span>الرئيسية</span>
        </button>
        <button className={`nav-item ${activeTab === 'subscribers' ? 'active' : ''}`} onClick={() => setActiveTab('subscribers')}>
          <i style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Users size={22} /></i>
          <span>المشتركين</span>
        </button>
        <button className={`nav-item ${activeTab === 'bills' ? 'active' : ''}`} onClick={() => setActiveTab('bills')}>
          <i style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Receipt size={22} /></i>
          <span>الفواتير</span>
        </button>
        <button className={`nav-item ${activeTab === 'expenses' ? 'active' : ''}`} onClick={() => setActiveTab('expenses')}>
          <i style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Wallet size={22} /></i>
          <span>المصاريف</span>
        </button>
        <button className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
          <i style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Settings size={22} /></i>
          <span>الإعدادات</span>
        </button>
      </nav>

      {/* ========================================================
          MODALS SECTION (Bottom sheets)
          ======================================================== */}

      {/* Board Modal */}
      {showBoardModal && (
        <div className="modal show">
          <div className="modal-content">
            <div className="modal-handle"></div>
            <div className="modal-header">
              <h3>{selectedBoard ? 'تعديل بيانات البورد' : 'إضافة بورد توزيع جديد'}</h3>
              <button className="modal-close" onClick={() => setShowBoardModal(false)}>×</button>
            </div>
            <form onSubmit={handleSaveBoard}>
              <div className="modal-body">
                <div className="form-group">
                  <label>اسم البورد (مثال: بورد الزقاق 12)</label>
                  <input type="text" value={boardForm.name} onChange={(e) => setBoardForm({ ...boardForm, name: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>المنطقة</label>
                  <input type="text" value={boardForm.area} onChange={(e) => setBoardForm({ ...boardForm, area: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>العنوان بالتفصيل</label>
                  <input type="text" value={boardForm.address} onChange={(e) => setBoardForm({ ...boardForm, address: e.target.value })} required />
                </div>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label>سعر الأمبير الافتراضي (د.ع)</label>
                    <input type="number" value={boardForm.defaultAmpPrice} onChange={(e) => setBoardForm({ ...boardForm, defaultAmpPrice: e.target.value })} required />
                  </div>
                  {selectedBoard && (
                    <div className="form-group">
                      <label>الحالة</label>
                      <select value={boardForm.status} onChange={(e) => setBoardForm({ ...boardForm, status: e.target.value })}>
                        <option value="ACTIVE">نشط</option>
                        <option value="DISABLED">موقف</option>
                      </select>
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label>ملاحظات إضافية</label>
                  <textarea rows={2} value={boardForm.notes} onChange={(e) => setBoardForm({ ...boardForm, notes: e.target.value })}></textarea>
                </div>

                {errorMsg && <div className="login-error show">{errorMsg}</div>}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowBoardModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <Save size={16} /> حفظ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Subscriber Modal */}
      {showSubModal && (
        <div className="modal show">
          <div className="modal-content">
            <div className="modal-handle"></div>
            <div className="modal-header">
              <h3>{selectedSub ? 'تعديل بيانات المشترك' : 'إضافة مشترك جديد'}</h3>
              <button className="modal-close" onClick={() => setShowSubModal(false)}>×</button>
            </div>
            <form onSubmit={handleSaveSubscriber}>
              <div className="modal-body">
                <div className="form-group">
                  <label>اسم المشترك الثلاثي</label>
                  <input type="text" value={subForm.name} onChange={(e) => setSubForm({ ...subForm, name: e.target.value })} required />
                </div>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label>رقم الهاتف</label>
                    <input type="text" value={subForm.phone} onChange={(e) => setSubForm({ ...subForm, phone: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label>العنوان بالتفصيل</label>
                    <input type="text" value={subForm.address} onChange={(e) => setSubForm({ ...subForm, address: e.target.value })} required />
                  </div>
                </div>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label>البورد التابع له</label>
                    <select value={subForm.boardId} onChange={(e) => {
                      const selectedB = boards.find(b => b.id === e.target.value);
                      setSubForm({
                        ...subForm,
                        boardId: e.target.value,
                        ampPrice: selectedB ? selectedB.defaultAmpPrice.toString() : subForm.ampPrice
                      });
                    }} required>
                      {boards.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>عدد الأمبيرات</label>
                    <input type="number" min="1" value={subForm.amps} onChange={(e) => setSubForm({ ...subForm, amps: e.target.value })} required />
                  </div>
                </div>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label>سعر الأمبير الخاص (د.ع)</label>
                    <input type="number" value={subForm.ampPrice} onChange={(e) => setSubForm({ ...subForm, ampPrice: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label>ديون سابقة متراكمة (د.ع)</label>
                    <input type="number" value={subForm.oldDebt} onChange={(e) => setSubForm({ ...subForm, oldDebt: e.target.value })} required />
                  </div>
                </div>
                {selectedSub && (
                  <div className="form-group">
                    <label>الحالة</label>
                    <select value={subForm.status} onChange={(e) => setSubForm({ ...subForm, status: e.target.value })}>
                      <option value="ACTIVE">نشط</option>
                      <option value="DISABLED">موقف</option>
                    </select>
                  </div>
                )}

                {errorMsg && <div className="login-error show">{errorMsg}</div>}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowSubModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <Save size={16} /> حفظ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Expense Modal */}
      {showExpenseModal && (
        <div className="modal show">
          <div className="modal-content">
            <div className="modal-handle"></div>
            <div className="modal-header">
              <h3>{selectedExpense ? 'تعديل المصروف ✏️' : 'تسجيل مصروف جديد 💵'}</h3>
              <button className="modal-close" onClick={() => {
                setShowExpenseModal(false);
                setSelectedExpense(null);
              }}>×</button>
            </div>
            <form onSubmit={handleSaveExpense}>
              <div className="modal-body">
                <div className="form-group">
                  <label>اسم المصروف *</label>
                  <input 
                    type="text" 
                    value={expenseForm.name} 
                    onChange={(e) => setExpenseForm({ ...expenseForm, name: e.target.value })} 
                    placeholder="مثال: شراء ديزل، تصليح المولد، إلخ..." 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label>نوع المصروف / التصنيف *</label>
                  <select value={expenseForm.type} onChange={(e) => setExpenseForm({ ...expenseForm, type: e.target.value })}>
                    <option value="وقود ديزل">وقود ديزل</option>
                    <option value="صيانة وفلاتر">صيانة وفلاتر</option>
                    <option value="أجور عمال">أجور عمال</option>
                    <option value="شبكة وتوزيع">شبكة وتوزيع</option>
                    <option value="أخرى">أخرى</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>المبلغ (د.ع) *</label>
                  <input 
                    type="number" 
                    value={expenseForm.amount} 
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} 
                    placeholder="أدخل المبلغ بالدينار العراقي" 
                    min="1"
                    required 
                  />
                </div>

                <div className="form-group">
                  <label>التاريخ *</label>
                  <input 
                    type="date" 
                    value={expenseForm.date} 
                    onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })} 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label>البورد المرتبط (اختياري)</label>
                  <select value={expenseForm.boardId} onChange={(e) => setExpenseForm({ ...expenseForm, boardId: e.target.value })}>
                    <option value="general">عام / للمولدة بأكملها</option>
                    {boards.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>ملاحظات إضافية (اختياري)</label>
                  <textarea 
                    value={expenseForm.notes} 
                    onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })} 
                    placeholder="أدخل أي ملاحظات أو تفاصيل إضافية هنا..." 
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-dark)',
                      background: 'var(--surface)',
                      color: 'var(--text-main)',
                      fontSize: '0.9rem',
                      fontFamily: 'inherit',
                      resize: 'vertical',
                      minHeight: '60px'
                    }}
                  />
                </div>

                {errorMsg && <div className="login-error show">{errorMsg}</div>}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => {
                  setShowExpenseModal(false);
                  setSelectedExpense(null);
                }}>إلغاء</button>
                <button type="submit" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <Save size={16} /> حفظ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bill Generation Modal */}
      {showBillModal && (
        <div className="modal show">
          <div className="modal-content">
            <div className="modal-handle"></div>
            <div className="modal-header">
              <h3>بدء شهر جديد وتوليد الفواتير</h3>
              <button className="modal-close" onClick={() => setShowBillModal(false)}>×</button>
            </div>
            <form onSubmit={handleGenerateBills}>
              <div className="modal-body">
                <div style={{ background: 'var(--warning-light)', border: '1px solid rgba(245,158,11,.3)', padding: '10px', borderRadius: '8px', color: 'var(--warning)', fontSize: '.8rem', marginBottom: '14px' }}>
                  💡 <strong>ملاحظة:</strong> سيقوم النظام بتوليد فاتورة مستحقة لكل المشتركين النشطين في المولدة للشهر المختار بناءً على عدد أمبيراتهم وسعر الأمبير المحدد لهم. وسيتم جمع ديون الفواتير السابقة غير المدفوعة تلقائياً.
                </div>
                <div className="form-grid-3">
                  <div className="form-group">
                    <label>الشهر</label>
                    <select value={billForm.month} onChange={(e) => setBillForm({ ...billForm, month: e.target.value })}>
                      {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>السنة</label>
                    <select value={billForm.year} onChange={(e) => setBillForm({ ...billForm, year: e.target.value })}>
                      {['2025', '2026', '2027', '2028'].map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>سعر الأمبير الموحد (د.ع) - اختياري</label>
                    <input 
                      type="number" 
                      placeholder="اتركه فارغاً للاعتماد على سعر المشترك"
                      value={billForm.ampPrice} 
                      onChange={(e) => setBillForm({ ...billForm, ampPrice: e.target.value })} 
                    />
                  </div>
                </div>

                {errorMsg && <div className="login-error show">{errorMsg}</div>}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowBillModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-warning">توليد الفواتير الآن ⚡</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Collect Payment Modal */}
      {showPaymentModal && selectedBill && (
        <div className="modal show">
          <div className="modal-content">
            <div className="modal-handle"></div>
            <div className="modal-header">
              <h3>جباية وتسجيل دفعة مالية</h3>
              <button className="modal-close" onClick={() => setShowPaymentModal(false)}>×</button>
            </div>
            <form onSubmit={handleCollectPayment}>
              <div className="modal-body">
                <div style={{ marginBottom: '12px', fontSize: '.85rem' }}>
                  <div>المشترك: <strong>{selectedBill.subscriber?.name}</strong></div>
                  <div>الشهر المستحق: <strong>{selectedBill.month} / {selectedBill.year}</strong></div>
                  <div>المبلغ المتبقي: <strong className="text-danger">{(selectedBill.remainingAmount).toLocaleString('ar-IQ')} د.ع</strong></div>
                </div>

                <div className="form-grid-3">
                  <div className="form-group">
                    <label>عدد الأمبيرات</label>
                    <input type="number" value={paymentAmps} onChange={(e) => setPaymentAmps(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>سعر الأمبير لهذه الفاتورة (د.ع)</label>
                    <input type="number" value={paymentAmpPrice} onChange={(e) => setPaymentAmpPrice(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>مبلغ الجباية المستلم (د.ع)</label>
                    <input type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} required />
                  </div>
                </div>
                <div className="form-group">
                  <label>ملاحظة عن الدفعة</label>
                  <input type="text" value={paymentNote} onChange={(e) => setPaymentNote(e.target.value)} placeholder="مثال: دفع كاش، دفع زين كاش" />
                </div>

                {errorMsg && <div className="login-error show">{errorMsg}</div>}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowPaymentModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-success">تأكيد استلام المبلغ ✓</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Bill Modal */}
      {showEditBillModal && editingBill && (
        <div className="modal show">
          <div className="modal-content">
            <div className="modal-handle"></div>
            <div className="modal-header">
              <h3>تعديل بيانات الفاتورة ✏️</h3>
              <button className="modal-close" onClick={() => setShowEditBillModal(false)}>×</button>
            </div>
            <form onSubmit={handleUpdateBill}>
              <div className="modal-body">
                <div style={{ marginBottom: '12px', fontSize: '.85rem' }}>
                  <div>المشترك: <strong>{editingBill.subscriber?.name}</strong></div>
                  <div>الشهر المستحق: <strong>{editingBill.month} / {editingBill.year}</strong></div>
                  <div>المبلغ المتبقي الحالي: <strong className="text-danger">{(editingBill.remainingAmount).toLocaleString('ar-IQ')} د.ع</strong></div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label>عدد الأمبيرات</label>
                    <input type="number" value={editBillAmps} onChange={(e) => setEditBillAmps(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>سعر الأمبير (د.ع)</label>
                    <input type="number" value={editBillAmpPrice} onChange={(e) => setEditBillAmpPrice(e.target.value)} required />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label>ديون سابقة للفاتورة (د.ع)</label>
                    <input type="number" value={editBillOldDebt} onChange={(e) => setEditBillOldDebt(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>المبلغ المدفوع (د.ع)</label>
                    <input type="number" value={editBillPaidAmount} onChange={(e) => setEditBillPaidAmount(e.target.value)} required />
                  </div>
                </div>

                <div className="form-group">
                  <label>حالة الفاتورة</label>
                  <select value={editBillStatus} onChange={(e) => setEditBillStatus(e.target.value)}>
                    <option value="UNPAID">غير دافع</option>
                    <option value="PARTIAL">تسديد جزئي</option>
                    <option value="PAID">مدفوع بالكامل</option>
                    <option value="CANCELLED">ملغاة</option>
                  </select>
                </div>

                {errorMsg && <div className="login-error show">{errorMsg}</div>}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowEditBillModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary">حفظ التغييرات</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Employee Modal */}
      {showEmpModal && (
        <div className="modal show">
          <div className="modal-content">
            <div className="modal-handle"></div>
            <div className="modal-header">
              <h3>{selectedEmp ? 'تعديل بيانات وصلاحيات الموظف' : 'إضافة موظف جديد'}</h3>
              <button className="modal-close" onClick={() => setShowEmpModal(false)}>×</button>
            </div>
            <form onSubmit={handleSaveEmployee}>
              <div className="modal-body">
                <div className="form-group">
                  <label>الاسم الكامل</label>
                  <input type="text" value={empForm.name} onChange={(e) => setEmpForm({ ...empForm, name: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>اسم المستخدم</label>
                  <input type="text" value={empForm.username} onChange={(e) => setEmpForm({ ...empForm, username: e.target.value })} disabled={!!selectedEmp} required />
                </div>
                <div className="form-group">
                  <label>{selectedEmp ? 'كلمة المرور الجديدة (اتركها فارغة لعدم التغيير)' : 'كلمة المرور'}</label>
                  <input type="password" value={empForm.password} onChange={(e) => setEmpForm({ ...empForm, password: e.target.value })} required={!selectedEmp} />
                </div>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label>نطاق البورد المسموح به</label>
                    <select value={empForm.boardId} onChange={(e) => setEmpForm({ ...empForm, boardId: e.target.value })} required>
                      <option value="all">كل البوردات</option>
                      {boards.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                  {selectedEmp && (
                    <div className="form-group">
                      <label>الحالة</label>
                      <select value={empForm.status} onChange={(e) => setEmpForm({ ...empForm, status: e.target.value })}>
                        <option value="ACTIVE">نشط</option>
                        <option value="DISABLED">معطل</option>
                      </select>
                    </div>
                  )}
                </div>

                <div style={{ marginTop: '10px' }}>
                  <label style={{ fontSize: '.8rem', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>صلاحيات العمل الإضافية:</label>
                  <div className="permissions-grid">
                    <label className="perm-item">
                      <input type="checkbox" checked={empForm.permissions.add_subscriber} onChange={(e) => setEmpForm({ ...empForm, permissions: { ...empForm.permissions, add_subscriber: e.target.checked } })} />
                      إضافة مشترك جديد
                    </label>
                    <label className="perm-item">
                      <input type="checkbox" checked={empForm.permissions.edit_subscriber} onChange={(e) => setEmpForm({ ...empForm, permissions: { ...empForm.permissions, edit_subscriber: e.target.checked } })} />
                      تعديل مشترك
                    </label>
                    <label className="perm-item">
                      <input type="checkbox" checked={empForm.permissions.delete_subscriber} onChange={(e) => setEmpForm({ ...empForm, permissions: { ...empForm.permissions, delete_subscriber: e.target.checked } })} />
                      حذف مشترك
                    </label>
                    <label className="perm-item">
                      <input type="checkbox" checked={empForm.permissions.generate_bills} onChange={(e) => setEmpForm({ ...empForm, permissions: { ...empForm.permissions, generate_bills: e.target.checked } })} />
                      بدء شهر جديد (توليد فواتير)
                    </label>
                    <label className="perm-item">
                      <input type="checkbox" checked={empForm.permissions.collect_payment} onChange={(e) => setEmpForm({ ...empForm, permissions: { ...empForm.permissions, collect_payment: e.target.checked } })} />
                      تسجيل جباية ودفعات
                    </label>
                    <label className="perm-item">
                      <input type="checkbox" checked={empForm.permissions.manage_expenses} onChange={(e) => setEmpForm({ ...empForm, permissions: { ...empForm.permissions, manage_expenses: e.target.checked } })} />
                      إدارة المصاريف والوقود
                    </label>
                    <label className="perm-item">
                      <input type="checkbox" checked={(empForm.permissions as any).cancel_bill} onChange={(e) => setEmpForm({ ...empForm, permissions: { ...empForm.permissions, cancel_bill: e.target.checked } })} />
                      إلغاء فواتير
                    </label>
                    <label className="perm-item">
                      <input type="checkbox" checked={!!(empForm.permissions as any).print_receipt} onChange={(e) => setEmpForm({ ...empForm, permissions: { ...empForm.permissions, print_receipt: e.target.checked } })} />
                      طباعة وصل تسديد
                    </label>
                    <label className="perm-item">
                      <input type="checkbox" checked={!!(empForm.permissions as any).reprint_receipt} onChange={(e) => setEmpForm({ ...empForm, permissions: { ...empForm.permissions, reprint_receipt: e.target.checked } })} />
                      إعادة طباعة وصل
                    </label>
                  </div>
                </div>

                {errorMsg && <div className="login-error show">{errorMsg}</div>}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowEmpModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <Save size={16} /> حفظ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Hidden PDF template for receipt generation */}
      {(paymentSuccessData || pdfReceiptData) && (
        <div 
          id="receipt-pdf-template" 
          style={{
            position: 'absolute',
            left: '-9999px',
            top: '-9999px',
            width: '400px',
            padding: '24px',
            backgroundColor: '#ffffff',
            color: '#1f2937',
            fontFamily: "'Cairo', sans-serif",
            direction: 'rtl',
            textAlign: 'right',
            boxSizing: 'border-box',
            borderRadius: '12px',
            border: '2px solid #10b981',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
          }}
        >
          {(() => {
            const activeReceipt = pdfReceiptData || paymentSuccessData;
            if (!activeReceipt) return null;
            return (
              <>
                {/* Header */}
                <div style={{ textAlign: 'center', borderBottom: '2px solid #10b981', paddingBottom: '12px', marginBottom: '16px' }}>
                  <h4 style={{ margin: 0, color: '#374151', fontSize: '15px', fontWeight: 'bold' }}>{activeReceipt.generatorName || generatorInfo?.name || 'نظام إدارة المولدة'}</h4>
                  
                  {/* Owner Info Block */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '6px', fontSize: '12px', color: '#4b5563' }}>
                    {(activeReceipt.generatorOwner || generatorInfo?.ownerName) && (
                      <div>صاحب المولدة: <strong>{activeReceipt.generatorOwner || generatorInfo?.ownerName}</strong></div>
                    )}
                    {(activeReceipt.generatorPhone || generatorInfo?.phone) && (
                      <div>رقم الهاتف: <strong>{activeReceipt.generatorPhone || generatorInfo?.phone}</strong></div>
                    )}
                    {(activeReceipt.generatorArea || generatorInfo?.area) && (
                      <div>العنوان: <strong>{activeReceipt.generatorArea || generatorInfo?.area}</strong></div>
                    )}
                  </div>

                  <h1 style={{ margin: '14px 0 0 0', color: '#10b981', fontSize: '26px', fontWeight: '800', letterSpacing: '0.5px' }}>وصل تسديد</h1>
                </div>

                {/* Details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: '#374151' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e5e7eb', paddingBottom: '4px' }}>
                    <span style={{ color: '#6b7280' }}>رقم الفاتورة:</span>
                    <span style={{ fontWeight: 'bold' }}>{activeReceipt.invoiceNumber || '—'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e5e7eb', paddingBottom: '4px' }}>
                    <span style={{ color: '#6b7280' }}>رقم الوصل:</span>
                    <span style={{ fontWeight: 'bold', fontFamily: 'monospace' }}>{activeReceipt.receiptNumber || '—'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e5e7eb', paddingBottom: '4px' }}>
                    <span style={{ color: '#6b7280' }}>تاريخ التسديد:</span>
                    <span>{activeReceipt.date ? new Date(activeReceipt.date).toLocaleDateString('ar-IQ', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e5e7eb', paddingBottom: '4px' }}>
                    <span style={{ color: '#6b7280' }}>اسم المشترك:</span>
                    <span style={{ fontWeight: 'bold', color: '#111827' }}>{activeReceipt.subscriberName || '—'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e5e7eb', paddingBottom: '4px' }}>
                    <span style={{ color: '#6b7280' }}>البورد:</span>
                    <span>{activeReceipt.boardName || '—'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e5e7eb', paddingBottom: '4px' }}>
                    <span style={{ color: '#6b7280' }}>الشهر المسدد:</span>
                    <span style={{ fontWeight: 'bold' }}>{activeReceipt.month} / {activeReceipt.year}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e5e7eb', paddingBottom: '4px' }}>
                    <span style={{ color: '#6b7280' }}>عدد الأمبيرات:</span>
                    <span style={{ fontWeight: 'bold' }}>{activeReceipt.amps || '—'} أمبير</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e5e7eb', paddingBottom: '4px' }}>
                    <span style={{ color: '#6b7280' }}>سعر الأمبير:</span>
                    <span>{(activeReceipt.ampPrice || 0).toLocaleString('ar-IQ')} د.ع</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e5e7eb', paddingBottom: '4px' }}>
                    <span style={{ color: '#6b7280' }}>الديون السابقة:</span>
                    <span style={{ fontWeight: 'bold', color: activeReceipt.oldDebt > 0 ? '#ef4444' : 'inherit' }}>{(activeReceipt.oldDebt || 0).toLocaleString('ar-IQ')} د.ع</span>
                  </div>
                </div>

                {/* Amount Box */}
                <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '16px', margin: '18px 0', textAlign: 'center' }}>
                  <div style={{ fontSize: '13px', color: '#15803d', marginBottom: '4px', fontWeight: 'bold' }}>المبلغ المسدد</div>
                  <div style={{ fontSize: '32px', fontWeight: '800', color: '#166534' }}>
                    {activeReceipt.amount ? (activeReceipt.amount).toLocaleString('ar-IQ') : '0'} د.ع
                  </div>
                </div>

                {/* Remaining Amount & Status */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: '#374151' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#6b7280' }}>حالة الدفع:</span>
                    <span style={{ 
                      fontWeight: 'bold', 
                      color: activeReceipt.remainingAmount <= 0 ? '#15803d' : (activeReceipt.amount > 0 ? '#d97706' : '#ef4444') 
                    }}>
                      {activeReceipt.remainingAmount <= 0 ? 'تم تسديد الحساب بالكامل' : (activeReceipt.amount > 0 ? 'تسديد جزئي' : 'غير مسدد')}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e5e7eb', paddingBottom: '4px' }}>
                    <span style={{ color: '#6b7280' }}>المتبقي الكلي:</span>
                    <span style={{ fontWeight: 'bold', color: activeReceipt.remainingAmount > 0 ? '#ef4444' : '#15803d' }}>
                      {(activeReceipt.remainingAmount).toLocaleString('ar-IQ')} د.ع
                    </span>
                  </div>
                  {activeReceipt.note && (
                    <div style={{ borderTop: '1px dashed #e5e7eb', paddingTop: '8px', marginTop: '6px' }}>
                      <span style={{ color: '#6b7280', display: 'block', fontSize: '11px', marginBottom: '2px' }}>ملاحظة:</span>
                      <span style={{ fontSize: '12px', fontStyle: 'italic', color: '#4b5563', display: 'block', background: '#f9fafb', padding: '8px', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                        {activeReceipt.note}
                      </span>
                    </div>
                  )}
                </div>

                {/* Footer message */}
                <div style={{ textAlign: 'center', borderTop: '1px solid #e5e7eb', paddingTop: '10px', marginTop: '20px', fontSize: '11px', color: '#9ca3af' }}>
                  شكراً لكم على تسديدكم.
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* Payment Success & Printing Modal */}
      {paymentSuccessData && (
        <div className="modal show" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <div className="modal-content" style={{ maxWidth: '400px', width: '95%', borderRadius: '16px', background: 'var(--surface)', border: '1px solid var(--border-dark)', color: 'var(--text-main)' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid var(--border-dark)', paddingBottom: '10px' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--success)' }}>
                <CheckCircle2 size={22} /> تم تسجيل التسديد بنجاح
              </h3>
              <button className="modal-close" onClick={() => setPaymentSuccessData(null)}>×</button>
            </div>
            
            <div className="modal-body" style={{ padding: '16px 0', fontSize: '.9rem' }}>
              <div style={{ background: 'var(--background)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-dark)', marginBottom: '16px' }}>
                <div style={{ marginBottom: '6px' }}>المشترك: <strong>{paymentSuccessData.subscriberName}</strong></div>
                <div style={{ marginBottom: '6px' }}>المبلغ المسدد: <strong style={{ color: 'var(--success)', fontSize: '1.1rem' }}>{paymentSuccessData.amount?.toLocaleString('ar-IQ')} د.ع</strong></div>
                {paymentSuccessData.remainingAmount > 0 ? (
                  <div style={{ marginBottom: '6px' }}>المتبقي: <strong style={{ color: 'var(--danger)' }}>{paymentSuccessData.remainingAmount?.toLocaleString('ar-IQ')} د.ع</strong></div>
                ) : (
                  <div style={{ color: '#047857', fontWeight: 'bold' }}>تم تسديد الحساب بالكامل</div>
                )}
                {paymentSuccessData.receiptNumber && (
                  <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>رقم الوصل: <code style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{paymentSuccessData.receiptNumber}</code></div>
                )}
              </div>
              
              {paymentSuccessData.warning && (
                <div style={{ background: 'var(--warning-light)', padding: '10px', borderRadius: '8px', border: '1px solid var(--warning)', color: 'var(--warning)', fontSize: '.8rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertCircle size={16} />
                  <span>{paymentSuccessData.warning}</span>
                </div>
              )}
            </div>
            
            <div className="modal-footer" style={{ borderTop: '1px solid var(--border-dark)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(!user || !user.role || user.role === 'OWNER' || (user.permissions && user.permissions.print_receipt)) && (
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={printingBluetooth}
                  onClick={async () => {
                    setPrintingBluetooth(true);
                    const res = await printReceiptBluetooth(paymentSuccessData);
                    setPrintingBluetooth(false);
                    
                    // Log print action
                    await fetch('/api/owner/print-logs', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        billId: paymentSuccessData.billId,
                        paymentId: paymentSuccessData.paymentId,
                        printerType: 'BLUETOOTH',
                        status: res.success ? 'SUCCESS' : 'FAILED',
                        errorMessage: res.error || null
                      })
                    });
                    
                    if (res.success) {
                      alert('تمت عملية الطباعة بنجاح!');
                    } else {
                      alert(`الطباعة عبر البلوتوث غير مدعومة على هذا الجهاز أو فشل الاتصال. ${res.error}\nيمكنك طباعة الوصل من المتصفح.`);
                    }
                  }}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%' }}
                >
                  <Printer size={16} />
                  {printingBluetooth ? 'جاري الطباعة...' : 'طباعة وصل (حرارية بلوتوث)'}
                </button>
              )}
              
              <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={downloadingPDF}
                  onClick={() => handleDownloadPDF(paymentSuccessData)}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <FileText size={16} /> {downloadingPDF ? 'جاري التحميل...' : 'تحميل وصل PDF'}
                </button>
                
                {paymentSuccessData.whatsappMessage && (
                  <a
                    href={`https://wa.me/${paymentSuccessData.whatsappPhone ? (paymentSuccessData.whatsappPhone.startsWith('0') ? '964' + paymentSuccessData.whatsappPhone.substring(1) : paymentSuccessData.whatsappPhone) : ''}?text=${encodeURIComponent(paymentSuccessData.whatsappMessage)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-whatsapp"
                    style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: '#25d366', color: '#fff', textDecoration: 'none' }}
                  >
                    <WhatsAppIcon size={16} /> واتساب يدوياً
                  </a>
                )}
              </div>
              
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setPaymentSuccessData(null)}
                style={{ width: '100%', marginTop: '4px' }}
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Warning Modal */}
      {whatsappWarning && (
        <div className="modal show" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <div className="modal-content" style={{ maxWidth: '400px', background: '#1e293b', border: '1px solid #3d4f68', color: '#fff', borderRadius: '12px' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid #3d4f68', paddingBottom: '10px' }}>
              <h3 style={{ color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                ⚠️ تنبيه إرسال واتساب
              </h3>
              <button className="modal-close" onClick={() => setWhatsappWarning(null)}>×</button>
            </div>
            <div className="modal-body" style={{ padding: '20px 0', fontSize: '.9rem', textAlign: 'center' }}>
              <p>{whatsappWarning.message}</p>
            </div>
            <div className="modal-footer" style={{ borderTop: '1px solid #3d4f68', paddingTop: '10px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setWhatsappWarning(null)}>إغلاق</button>
              <a 
                href={whatsappWarning.url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="btn btn-whatsapp" 
                onClick={() => setWhatsappWarning(null)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none', background: '#25d366', color: '#fff' }}
              >
                إرسال واتساب يدوياً <WhatsAppIcon size={16} />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
