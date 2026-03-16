import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Upload, Save, Loader2, AlertCircle } from 'lucide-react';
import { Customer } from '../types';

export default function AddCustomer() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState<Partial<Customer>>({
    name: '',
    phone: '',
    address: '',
    vehicleType: 'Xe máy',
    licensePlate: '',
    insuranceCompany: '',
    startDate: '',
    expirationDate: '',
    fee: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanning(true);
    setError('');

    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        body: formData,
      });
      
      if (!res.ok) {
        throw new Error('Lỗi khi quét ảnh');
      }

      const data = await res.json();
      
      setFormData(prev => ({
        ...prev,
        licensePlate: data.licensePlate || prev.licensePlate,
        insuranceCompany: data.insuranceCompany || prev.insuranceCompany,
        startDate: data.startDate || prev.startDate,
        expirationDate: data.expirationDate || prev.expirationDate,
      }));
    } catch (err: any) {
      setError(err.message || 'Không thể quét ảnh. Vui lòng nhập thủ công.');
    } finally {
      setScanning(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        throw new Error('Lỗi khi lưu dữ liệu');
      }

      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Đã có lỗi xảy ra');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Thêm khách hàng mới</h1>
        <p className="text-slate-500 mt-1">Quét giấy chứng nhận bảo hiểm hoặc nhập thủ công</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {/* AI Scanner Section */}
        <div className="p-6 bg-blue-50 border-b border-blue-100">
          <div className="flex flex-col sm:flex-row items-center gap-4 justify-between">
            <div>
              <h3 className="text-lg font-semibold text-blue-900 flex items-center gap-2">
                <Camera className="w-5 h-5" />
                Quét thông minh AI
              </h3>
              <p className="text-sm text-blue-700 mt-1">Tải lên ảnh giấy chứng nhận để tự động điền thông tin</p>
            </div>
            <div className="w-full sm:w-auto">
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleImageUpload}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={scanning}
                className="w-full sm:w-auto flex items-center justify-center px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-sm font-medium disabled:opacity-70"
              >
                {scanning ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Đang quét...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5 mr-2" />
                    Tải ảnh lên
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border-b border-red-100 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Form Section */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Personal Info */}
            <div className="space-y-4">
              <h4 className="font-semibold text-slate-900 border-b pb-2">Thông tin khách hàng</h4>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tên khách hàng *</label>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Nguyễn Văn A"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Số điện thoại *</label>
                <input
                  type="tel"
                  name="phone"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="0901234567"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Địa chỉ</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Số nhà, đường, quận/huyện..."
                />
              </div>
            </div>

            {/* Insurance Info */}
            <div className="space-y-4">
              <h4 className="font-semibold text-slate-900 border-b pb-2">Thông tin bảo hiểm</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Loại xe</label>
                  <select
                    name="vehicleType"
                    value={formData.vehicleType}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                  >
                    <option value="Xe máy">Xe máy</option>
                    <option value="Ô tô">Ô tô</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Biển số xe *</label>
                  <input
                    type="text"
                    name="licensePlate"
                    required
                    value={formData.licensePlate}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors uppercase"
                    placeholder="29A-123.45"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Công ty bảo hiểm</label>
                <input
                  type="text"
                  name="insuranceCompany"
                  value={formData.insuranceCompany}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="PJICO, Bảo Việt..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Ngày bắt đầu</label>
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Ngày hết hạn *</label>
                  <input
                    type="date"
                    name="expirationDate"
                    required
                    value={formData.expirationDate}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phí bảo hiểm (VNĐ)</label>
                <input
                  type="text"
                  name="fee"
                  value={formData.fee}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Ví dụ: 66000"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="px-6 py-2.5 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-sm font-medium disabled:opacity-70"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <Save className="w-5 h-5 mr-2" />
              )}
              Lưu thông tin
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
