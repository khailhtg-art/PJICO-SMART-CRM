import { useState, useEffect } from 'react';
import { Search, Phone, MessageCircle, Edit, Trash2, Download, Filter, ShieldAlert, ShieldCheck, Clock } from 'lucide-react';
import { Customer } from '../types';
import { differenceInDays, parseISO, isAfter, isBefore } from 'date-fns';
import * as XLSX from 'xlsx';

export default function Dashboard() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'valid' | 'expiring_30' | 'expiring_15' | 'expiring_7' | 'expired'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const res = await fetch('/api/customers');
      const data = await res.json();
      setCustomers(data);
    } catch (error) {
      console.error('Failed to fetch customers', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa khách hàng này?')) {
      try {
        await fetch(`/api/customers/${id}`, { method: 'DELETE' });
        setCustomers(customers.filter(c => c.id !== id));
      } catch (error) {
        console.error('Failed to delete customer', error);
      }
    }
  };

  const getStatus = (expirationDate: string) => {
    if (!expirationDate) return { label: 'Không rõ', color: 'bg-slate-100 text-slate-800', value: 'unknown' };
    
    const today = new Date();
    const expDate = parseISO(expirationDate);
    const daysLeft = differenceInDays(expDate, today);

    if (daysLeft < 0) return { label: 'Đã hết hạn', color: 'bg-red-100 text-red-800 border border-red-200', value: 'expired', icon: <ShieldAlert className="w-4 h-4 mr-1" /> };
    if (daysLeft <= 7) return { label: `Sắp hết hạn (${daysLeft} ngày)`, color: 'bg-orange-100 text-orange-800 border border-orange-200', value: 'expiring_7', icon: <Clock className="w-4 h-4 mr-1" /> };
    if (daysLeft <= 15) return { label: `Sắp hết hạn (${daysLeft} ngày)`, color: 'bg-yellow-100 text-yellow-800 border border-yellow-200', value: 'expiring_15', icon: <Clock className="w-4 h-4 mr-1" /> };
    if (daysLeft <= 30) return { label: `Sắp hết hạn (${daysLeft} ngày)`, color: 'bg-blue-100 text-blue-800 border border-blue-200', value: 'expiring_30', icon: <Clock className="w-4 h-4 mr-1" /> };
    return { label: 'Còn hiệu lực', color: 'bg-emerald-100 text-emerald-800 border border-emerald-200', value: 'valid', icon: <ShieldCheck className="w-4 h-4 mr-1" /> };
  };

  const filteredCustomers = customers.filter(c => {
    const matchesSearch = 
      c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone?.includes(searchTerm) ||
      c.licensePlate?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;
    
    if (filterStatus === 'all') return true;
    
    const status = getStatus(c.expirationDate).value;
    if (filterStatus === 'valid') return status === 'valid';
    if (filterStatus === 'expired') return status === 'expired';
    if (filterStatus === 'expiring_30') return ['expiring_30', 'expiring_15', 'expiring_7'].includes(status);
    if (filterStatus === 'expiring_15') return ['expiring_15', 'expiring_7'].includes(status);
    if (filterStatus === 'expiring_7') return status === 'expiring_7';
    
    return true;
  });

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredCustomers.map(c => ({
      'Tên khách hàng': c.name,
      'Số điện thoại': c.phone,
      'Biển số xe': c.licensePlate,
      'Loại xe': c.vehicleType,
      'Công ty bảo hiểm': c.insuranceCompany,
      'Ngày bắt đầu': c.startDate,
      'Ngày hết hạn': c.expirationDate,
      'Phí bảo hiểm': c.fee,
      'Trạng thái': getStatus(c.expirationDate).label
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "KhachHang");
    XLSX.writeFile(wb, "DanhSachKhachHang.xlsx");
  };

  // Stats calculations
  const totalCustomers = customers.length;
  const expiredPolicies = customers.filter(c => getStatus(c.expirationDate).value === 'expired').length;
  const expiringThisMonth = customers.filter(c => {
    const status = getStatus(c.expirationDate).value;
    return ['expiring_30', 'expiring_15', 'expiring_7'].includes(status);
  }).length;
  const totalRevenue = customers.reduce((sum, c) => {
    const fee = parseInt(c.fee?.replace(/[^0-9]/g, '') || '0');
    return sum + fee;
  }, 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Tổng quan</h1>
        <button 
          onClick={exportToExcel}
          className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors shadow-sm font-medium text-sm"
        >
          <Download className="w-4 h-4 mr-2" />
          Xuất Excel
        </button>
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100">
          <p className="text-sm font-medium text-slate-500 mb-1">Tổng khách hàng</p>
          <p className="text-3xl font-bold text-blue-600">{totalCustomers}</p>
        </div>
        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100">
          <p className="text-sm font-medium text-slate-500 mb-1">Sắp hết hạn (30 ngày)</p>
          <p className="text-3xl font-bold text-orange-500">{expiringThisMonth}</p>
        </div>
        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100">
          <p className="text-sm font-medium text-slate-500 mb-1">Đã hết hạn</p>
          <p className="text-3xl font-bold text-red-600">{expiredPolicies}</p>
        </div>
        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100">
          <p className="text-sm font-medium text-slate-500 mb-1">Tổng doanh thu</p>
          <p className="text-2xl sm:text-3xl font-bold text-emerald-600">{formatCurrency(totalRevenue)}</p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl leading-5 bg-white placeholder-slate-500 focus:outline-none focus:placeholder-slate-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
            placeholder="Tìm theo tên, SĐT, biển số xe..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="relative min-w-[200px]">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Filter className="h-5 w-5 text-slate-400" />
          </div>
          <select
            className="block w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-xl leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm appearance-none transition-colors"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="valid">Còn hiệu lực</option>
            <option value="expiring_30">Sắp hết hạn (≤ 30 ngày)</option>
            <option value="expiring_15">Sắp hết hạn (≤ 15 ngày)</option>
            <option value="expiring_7">Sắp hết hạn (≤ 7 ngày)</option>
            <option value="expired">Đã hết hạn</option>
          </select>
        </div>
      </div>

      {/* Customer List */}
      <div className="bg-white shadow-sm rounded-2xl border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Đang tải dữ liệu...</div>
        ) : filteredCustomers.length === 0 ? (
          <div className="p-8 text-center text-slate-500">Không tìm thấy khách hàng nào.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Khách hàng</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Phương tiện</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Bảo hiểm</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Trạng thái</th>
                  <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Thao tác</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {filteredCustomers.map((customer) => {
                  const status = getStatus(customer.expirationDate);
                  return (
                    <tr key={customer.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-lg">
                            {customer.name?.charAt(0) || 'U'}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-semibold text-slate-900">{customer.name}</div>
                            <div className="text-sm text-slate-500">{customer.phone}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-slate-900">{customer.licensePlate}</div>
                        <div className="text-sm text-slate-500">{customer.vehicleType}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-slate-900">{customer.insuranceCompany}</div>
                        <div className="text-xs text-slate-500">{customer.startDate} đến {customer.expirationDate}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
                          {status.icon}
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          <a href={`tel:${customer.phone}`} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Gọi điện">
                            <Phone className="w-5 h-5" />
                          </a>
                          <a href={`https://zalo.me/${customer.phone}`} target="_blank" rel="noreferrer" className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="Nhắn Zalo">
                            <MessageCircle className="w-5 h-5" />
                          </a>
                          <button className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors" title="Sửa">
                            <Edit className="w-5 h-5" />
                          </button>
                          <button onClick={() => handleDelete(customer.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Xóa">
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
