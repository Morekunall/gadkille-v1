import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from '../../lib/axiosAuth';
import { isUsingProductionApi } from '../../lib/api';
import { useUi } from '../../context/UiContext';
import HistoryManagementTab from '../../components/HistoryManagementTab';

const ADMIN_TABS = ['overview', 'requests', 'inquiries', 'forts', 'history', 'vendors'];

const TAB_TITLES = {
  overview: { en: 'Overview', mr: 'माहिती' },
  requests: { en: 'Booking requests', mr: 'बुकिंग विनंत्या' },
  inquiries: { en: 'Inquiries', mr: 'चौकशी' },
  forts: { en: 'Fort management', mr: 'किल्ले व्यवस्थापन' },
  history: { en: 'Short history', mr: 'संक्षिप्त इतिहास' },
  vendors: { en: 'Vendors', mr: 'वेंडर' },
};

const AdminDashboardPage = () => {
  const { language, showToast } = useUi();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') || 'overview';
  const tab = ADMIN_TABS.includes(tabParam) ? tabParam : 'overview';
  const setTab = (id) => setSearchParams({ tab: id }, { replace: true });
  const [bookings, setBookings] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [forts, setForts] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fortForm, setFortForm] = useState({
    _id: null,
    name: '',
    slug: '',
    location: '',
    history: '',
    description: '',
    imagesText: '',
    videosText: '',
    routes: [],
    facilities: [],
    stayOptions: [],
    guides: [],
    vehicleRentals: [],
    lat: '',
    lng: ''
  });
  const [savingFort, setSavingFort] = useState(false);
  const [uploadingStayIdx, setUploadingStayIdx] = useState(null);
  const [savingVendor, setSavingVendor] = useState(false);
  const [vendorForm, setVendorForm] = useState({
    _id: null,
    name: '',
    serviceType: 'stay',
    contactInfo: '',
    pricing: '',
    experienceYears: '',
    availability: true,
    fort: ''
  });

  const reloadForts = async () => {
    const fRes = await axios.get(`/forts`);
    setForts(fRes.data);
    return fRes.data;
  };

  useEffect(() => {
    const controller = new AbortController();
    const fetchData = async () => {
      try {
        const [bRes, vRes, fRes, iRes] = await Promise.all([
          axios.get(`/bookings`, { signal: controller.signal }),
          axios.get(`/vendors`, { signal: controller.signal }),
          axios.get(`/forts`, { signal: controller.signal }),
          axios.get(`/inquiries`, { signal: controller.signal })
        ]);
        if (controller.signal.aborted) return;
        setBookings(bRes.data);
        setVendors(vRes.data);
        setForts(fRes.data);
        setInquiries(iRes.data);
      } catch (err) {
        if (controller.signal.aborted || err.code === 'ERR_CANCELED') return;
        showToast(
          'error',
          err.response?.data?.message ||
            (language === 'en' ? 'Unable to load admin data.' : 'ॲडमिन डेटा लोड करता आला नाही.')
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    fetchData();
    return () => controller.abort();
  }, []);

  const setBookingStatus = async (booking, requestStatus) => {
    try {
      const updated = await axios.put(
        `/bookings/${booking._id}/status`,
        { requestStatus }
      );
      const { congratulationsEmailSent, emailError, ...bookingData } = updated.data;
      setBookings((prev) => prev.map((b) => (b._id === booking._id ? bookingData : b)));
      if (requestStatus === 'accepted') {
        showToast(
          congratulationsEmailSent ? 'success' : 'error',
          congratulationsEmailSent
            ? language === 'en'
              ? 'Accepted — congratulations email sent to the customer.'
              : 'स्वीकारले — ग्राहकाला अभिनंदन ई-मेल पाठवला.'
            : language === 'en'
              ? `Accepted, but email failed: ${emailError || 'Set RESEND_API_KEY on Render (SMTP is often blocked).'}`
              : `स्वीकारले, पण ई-मेल अयशस्वी: ${emailError || 'Render वर RESEND_API_KEY सेट करा.'}`
        );
      } else {
        showToast(
          'success',
          language === 'en' ? 'Booking updated.' : 'बुकिंग अपडेट झाले.'
        );
      }
    } catch (err) {
      showToast(
        'error',
        err.response?.data?.message ||
          (language === 'en' ? 'Unable to update booking.' : 'बुकिंग अपडेट करता आले नाही.')
      );
    }
  };

  const deleteBooking = async (booking) => {
    // eslint-disable-next-line no-alert
    const ok = window.confirm(
      language === 'en'
        ? `Delete booking request for ${booking.fortId?.name || 'Fort'}?`
        : `${booking.fortId?.name || 'किल्ला'} साठीची बुकिंग विनंती हटवायची आहे का?`
    );
    if (!ok) return;

    try {
      await axios.delete(`/bookings/${booking._id}/admin`);
      setBookings((prev) => prev.filter((b) => b._id !== booking._id));
      showToast(
        'success',
        language === 'en' ? 'Booking request deleted.' : 'बुकिंग विनंती हटवली.'
      );
    } catch (err) {
      showToast(
        'error',
        err.response?.data?.message ||
          (language === 'en' ? 'Unable to delete booking.' : 'बुकिंग हटवता आले नाही.')
      );
    }
  };

  const toggleVendorAvailability = async (vendor) => {
    try {
      const updated = await axios.put(
        `/vendors/${vendor._id}`,
        { availability: !vendor.availability }
      );
      setVendors((prev) =>
        prev.map((v) => (v._id === vendor._id ? updated.data : v))
      );
    } catch (err) {
      showToast(
        'error',
        err.response?.data?.message ||
          (language === 'en' ? 'Unable to update vendor.' : 'वेंडर अपडेट करता आले नाही.')
      );
    }
  };

  const resetVendorForm = () => {
    setVendorForm({
      _id: null,
      name: '',
      serviceType: 'stay',
      contactInfo: '',
      pricing: '',
      experienceYears: '',
      availability: true,
      fort: ''
    });
  };

  const startEditVendor = (vendor) => {
    setVendorForm({
      _id: vendor._id,
      name: vendor.name || '',
      serviceType: vendor.serviceType || 'stay',
      contactInfo: vendor.contactInfo || '',
      pricing: vendor.pricing || '',
      experienceYears: vendor.experienceYears ?? '',
      availability: vendor.availability !== false,
      fort: vendor.fort || ''
    });
  };

  const saveVendor = async (e) => {
    e.preventDefault();
    if (!vendorForm.name || !vendorForm.serviceType) {
      showToast(
        'error',
        language === 'en' ? 'Vendor name and service type are required.' : 'वेंडर नाव आणि सेवा प्रकार आवश्यक आहे.'
      );
      return;
    }

    setSavingVendor(true);
    try {
      const payload = {
        name: vendorForm.name,
        serviceType: vendorForm.serviceType,
        contactInfo: vendorForm.contactInfo,
        pricing: vendorForm.pricing,
        experienceYears: Number(vendorForm.experienceYears) || 0,
        availability: !!vendorForm.availability,
        fort: vendorForm.fort || undefined
      };

      const res = vendorForm._id
        ? await axios.put(`/vendors/${vendorForm._id}`, payload)
        : await axios.post(`/vendors`, payload);

      setVendors((prev) => {
        const exists = prev.some((v) => v._id === res.data._id);
        if (exists) return prev.map((v) => (v._id === res.data._id ? res.data : v));
        return [res.data, ...prev];
      });
      resetVendorForm();
      showToast(
        'success',
        language === 'en' ? 'Vendor saved.' : 'वेंडर सेव्ह झाला.'
      );
    } catch (err) {
      showToast(
        'error',
        err.response?.data?.message ||
          (language === 'en' ? 'Unable to save vendor.' : 'वेंडर सेव्ह करता आला नाही.')
      );
    } finally {
      setSavingVendor(false);
    }
  };

  const deleteVendor = async (vendor) => {
    // eslint-disable-next-line no-alert
    const ok = window.confirm(
      language === 'en'
        ? `Delete vendor ${vendor.name}?`
        : `${vendor.name} वेंडर हटवायचा आहे का?`
    );
    if (!ok) return;
    try {
      await axios.delete(`/vendors/${vendor._id}`);
      setVendors((prev) => prev.filter((v) => v._id !== vendor._id));
      if (vendorForm._id === vendor._id) resetVendorForm();
      showToast(
        'success',
        language === 'en' ? 'Vendor deleted.' : 'वेंडर हटवला.'
      );
    } catch (err) {
      showToast(
        'error',
        err.response?.data?.message ||
          (language === 'en' ? 'Unable to delete vendor.' : 'वेंडर हटवता आला नाही.')
      );
    }
  };

  const startEditFort = (fort) => {
    setSearchParams({ tab: 'forts' }, { replace: true });
    setFortForm({
      _id: fort._id,
      name: fort.name || '',
      slug: fort.slug || '',
      location: fort.location || '',
      history: fort.history || '',
      description: fort.description || '',
      imagesText: (fort.images || []).join('\n'),
      videosText: (fort.videos || []).join('\n'),
      routes: fort.routes || [],
      facilities: fort.facilities || [],
      stayOptions: (fort.stayOptions || []).map((stay) => ({
        ...stay,
        imagesText: (stay.images || []).join('\n')
      })),
      guides: fort.guides || [],
      vehicleRentals: fort.vehicleRentals || [],
      lat: fort.mapCoordinates?.lat ?? '',
      lng: fort.mapCoordinates?.lng ?? ''
    });
  };

  const resetFortForm = () => {
    setFortForm({
      _id: null,
      name: '',
      slug: '',
      location: '',
      history: '',
      description: '',
      imagesText: '',
      videosText: '',
      routes: [],
      facilities: [],
      stayOptions: [],
      guides: [],
      vehicleRentals: [],
      lat: '',
      lng: ''
    });
  };

  const updateFortArrayItem = (key, idx, patch) => {
    setFortForm((prev) => {
      const next = [...(prev[key] || [])];
      next[idx] = { ...(next[idx] || {}), ...patch };
      return { ...prev, [key]: next };
    });
  };

  const addFortArrayItem = (key, item) => {
    setFortForm((prev) => ({ ...prev, [key]: [...(prev[key] || []), item] }));
  };

  const removeFortArrayItem = (key, idx) => {
    setFortForm((prev) => ({
      ...prev,
      [key]: (prev[key] || []).filter((_, i) => i !== idx)
    }));
  };

  const parseImageUrls = (text) =>
    (text || '')
      .split(/\r?\n/g)
      .map((s) => s.trim())
      .filter(
        (s) =>
          (/^https?:\/\//i.test(s) || /^\/images\/[^\s]+$/i.test(s)) &&
          !/google\.com\/maps|\/maps\/place|data=!/i.test(s)
      );

  const parseVideoUrls = (text) =>
    (text || '')
      .split(/\r?\n/g)
      .map((s) => s.trim())
      .filter((s) => (/^https?:\/\//i.test(s) || /^\/uploads\/videos\/[^\s]+$/i.test(s)));

  const toSlug = (value) =>
    (value || '')
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

  const uploadStayImages = async (idx, fileList) => {
    const files = Array.from(fileList || []).slice(0, 8);
    if (!files.length) return;
    setUploadingStayIdx(idx);
    try {
      const formData = new FormData();
      files.forEach((file) => formData.append('images', file));
      const res = await axios.post(`/uploads/stay-images`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const uploadedUrls = res.data?.urls || [];
      setFortForm((prev) => {
        const current = prev.stayOptions?.[idx] || {};
        const existing = parseImageUrls(current.imagesText || '');
        const merged = [...existing, ...uploadedUrls];
        const next = [...(prev.stayOptions || [])];
        next[idx] = { ...current, imagesText: merged.join('\n') };
        return { ...prev, stayOptions: next };
      });
      showToast(
        'success',
        language === 'en' ? 'Stay photos uploaded.' : 'हॉटेल फोटो अपलोड झाले.'
      );
    } catch (err) {
      showToast(
        'error',
        err.response?.data?.message ||
          (language === 'en' ? 'Photo upload failed.' : 'फोटो अपलोड अयशस्वी.')
      );
    } finally {
      setUploadingStayIdx(null);
    }
  };

  const uploadFortImages = async (fileList) => {
    const files = Array.from(fileList || []).slice(0, 8);
    if (!files.length) return;
    try {
      const formData = new FormData();
      files.forEach((file) => formData.append('images', file));
      const res = await axios.post(`/uploads/stay-images`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const uploadedUrls = res.data?.urls || [];
      setFortForm((prev) => {
        const existing = parseImageUrls(prev.imagesText || '');
        const merged = [...existing, ...uploadedUrls];
        return { ...prev, imagesText: merged.join('\n') };
      });
      showToast(
        'success',
        language === 'en' ? 'Fort images uploaded.' : 'किल्ल्याचे फोटो अपलोड झाले.'
      );
    } catch (err) {
      showToast(
        'error',
        err.response?.data?.message ||
          (language === 'en' ? 'Photo upload failed.' : 'फोटो अपलोड अयशस्वी.')
      );
    }
  };

  const uploadFortVideos = async (fileList) => {
    const files = Array.from(fileList || []).slice(0, 3);
    if (!files.length) return;
    try {
      const formData = new FormData();
      files.forEach((file) => formData.append('videos', file));
      const res = await axios.post(`/uploads/fort-videos`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const uploadedUrls = res.data?.urls || [];
      setFortForm((prev) => {
        const existing = parseVideoUrls(prev.videosText || '');
        const merged = [...existing, ...uploadedUrls];
        return { ...prev, videosText: merged.join('\n') };
      });
      showToast(
        'success',
        language === 'en' ? 'Fort videos uploaded.' : 'किल्ल्याचे व्हिडिओ अपलोड झाले.'
      );
    } catch (err) {
      showToast(
        'error',
        err.response?.data?.message ||
          (language === 'en' ? 'Video upload failed.' : 'व्हिडिओ अपलोड अयशस्वी.')
      );
    }
  };

  const saveFort = async (e) => {
    e.preventDefault();
    const normalizedSlug = toSlug(fortForm.slug || fortForm.name);
    if (!fortForm.name || !fortForm.location || !normalizedSlug) {
      showToast(
        'error',
        language === 'en'
          ? 'Name and location are required.'
          : 'नाव आणि लोकेशन आवश्यक आहे.'
      );
      return;
    }

    setSavingFort(true);
    try {
      const images = parseImageUrls(fortForm.imagesText);
      const videos = parseVideoUrls(fortForm.videosText);
      const latNum =
        fortForm.lat === '' || fortForm.lat === null ? null : Number(fortForm.lat);
      const lngNum =
        fortForm.lng === '' || fortForm.lng === null ? null : Number(fortForm.lng);
      const mapCoordinates =
        latNum === null && lngNum === null
          ? undefined
          : { lat: latNum || 0, lng: lngNum || 0 };

      const payload = {
        name: fortForm.name,
        slug: normalizedSlug,
        location: fortForm.location,
        history: fortForm.history,
        description: fortForm.description,
        images,
        videos,
        routes: fortForm.routes || [],
        facilities: fortForm.facilities || [],
        stayOptions: (fortForm.stayOptions || []).map((stay) => ({
          name: stay.name || '',
          description: stay.description || '',
          pricePerNight: Number(stay.pricePerNight) || 0,
          maxGuests: Number(stay.maxGuests) || 1,
          availability: !!stay.availability,
          images: parseImageUrls(stay.imagesText || '')
        })),
        guides: fortForm.guides || [],
        vehicleRentals: fortForm.vehicleRentals || [],
        mapCoordinates
      };
      const res = fortForm._id
        ? await axios.put(`/forts/${fortForm._id}`, payload)
        : await axios.post(`/forts`, payload);

      setForts((prev) => {
        const exists = prev.some((f) => f._id === res.data._id);
        if (exists) return prev.map((f) => (f._id === res.data._id ? res.data : f));
        return [res.data, ...prev];
      });
      resetFortForm();
      showToast(
        'success',
        language === 'en' ? 'Fort saved.' : 'किल्ला सेव्ह झाला.'
      );
    } catch (err) {
      showToast(
        'error',
        err.response?.data?.message ||
          (language === 'en' ? 'Unable to save fort.' : 'किल्ला सेव्ह करता आला नाही.')
      );
    } finally {
      setSavingFort(false);
    }
  };

  const deleteFort = async (fort) => {
    const fortId = String(fort._id || fort.id || '').trim();
    if (!fortId) {
      showToast(
        'error',
        language === 'en' ? 'This fort has no id — refresh the page.' : 'किल्ल्याचा id नाही — पेज रिफ्रेश करा.'
      );
      return;
    }

    // eslint-disable-next-line no-alert
    const ok = window.confirm(
      language === 'en'
        ? `Delete ${fort.name}?`
        : `${fort.name} हटवायचा आहे का?`
    );
    if (!ok) return;
    try {
      await axios.delete(`/forts/${fortId}`);
      if (String(fortForm._id || '') === fortId) resetFortForm();
      await reloadForts();
      showToast(
        'success',
        language === 'en' ? 'Fort deleted.' : 'किल्ला हटवला.'
      );
    } catch (err) {
      const code = err.response?.data?.code;
      const msg =
        err.response?.data?.message ||
        (code === 'DB_STARTING'
          ? language === 'en'
            ? 'Server is still starting — wait a few seconds and try again.'
            : 'सर्व्हर सुरू होत आहे — काही सेकंद थांबा आणि पुन्हा प्रयत्न करा.'
          : language === 'en'
            ? 'Unable to delete fort.'
            : 'किल्ला हटवता आला नाही.');
      showToast('error', msg);
    }
  };

  const stats = {
    totalBookings: bookings.length,
    pendingRequests: bookings.filter((b) => (b.requestStatus || 'pending') === 'pending').length,
    totalForts: forts.length,
    totalVendors: vendors.length,
    totalInquiries: inquiries.length
  };

  const sectionTitle = TAB_TITLES[tab] || TAB_TITLES.overview;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          {language === 'en' ? 'Administration' : 'प्रशासन'}
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-primaryDark">
          {language === 'en' ? sectionTitle.en : sectionTitle.mr}
        </h1>
      </div>
      <div className="mb-4 hidden flex-wrap gap-2">
        {[
          { id: 'overview', labelEn: 'Overview', labelMr: 'माहिती' },
          { id: 'requests', labelEn: 'Requests', labelMr: 'विनंत्या' },
          { id: 'inquiries', labelEn: 'Inquiries', labelMr: 'चौकशी' },
          { id: 'forts', labelEn: 'Forts', labelMr: 'किल्ले' },
          { id: 'history', labelEn: 'Short History', labelMr: 'संक्षिप्त इतिहास' },
          { id: 'vendors', labelEn: 'Vendors', labelMr: 'वेंडर' }
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
              tab === t.id
                ? 'bg-primary text-white'
                : 'bg-white text-gray-700 shadow-soft hover:bg-softBg'
            }`}
          >
            {language === 'en' ? t.labelEn : t.labelMr}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-[2fr,1.3fr]">
        <div className="space-y-4">
          <div className="rounded-3xl bg-white p-5 shadow-soft" hidden={tab !== 'overview'}>
            <h1 className="text-lg font-semibold text-primaryDark">
              {language === 'en' ? 'Admin overview' : 'ॲडमिन माहिती'}
            </h1>
            <p className="mt-1 text-xs text-gray-500">
              {language === 'en'
                ? 'Live view of latest bookings across all forts.'
                : 'सर्व किल्ल्यांवरील नवीनतम बुकिंग्सचे थेट दृश्य.'}
            </p>

            <div className="mt-4 grid gap-3 text-[11px] md:grid-cols-4">
              {[
                {
                  labelEn: 'Bookings',
                  labelMr: 'बुकिंग्स',
                  value: stats.totalBookings
                },
                {
                  labelEn: 'Pending',
                  labelMr: 'प्रलंबित',
                  value: stats.pendingRequests
                },
                {
                  labelEn: 'Inquiries',
                  labelMr: 'चौकशी',
                  value: stats.totalInquiries
                },
                { labelEn: 'Forts', labelMr: 'किल्ले', value: stats.totalForts },
                { labelEn: 'Vendors', labelMr: 'वेंडर', value: stats.totalVendors }
              ].map((s) => (
                <div key={s.labelEn} className="rounded-2xl bg-softBg p-3">
                  <p className="text-[10px] text-gray-500">
                    {language === 'en' ? s.labelEn : s.labelMr}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-primaryDark">{s.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 space-y-2 text-[11px]">
              {loading ? (
                <div className="h-24 animate-pulse rounded-2xl bg-softBg" />
              ) : bookings.length === 0 ? (
                <p className="text-gray-500">
                  {language === 'en'
                    ? 'No bookings yet.'
                    : 'अजून कोणतीही बुकिंग्स नाहीत.'}
                </p>
              ) : (
                bookings.slice(0, 5).map((b) => (
                  <div
                    key={b._id}
                    className="flex items-center justify-between rounded-2xl bg-softBg px-3 py-2"
                  >
                    <div>
                      <p className="font-semibold text-primaryDark">
                        {b.fortId?.name || 'Fort'} · {b.userId?.name || 'User'}
                      </p>
                      <p className="text-[10px] text-gray-600">
                        {new Date(b.date).toLocaleDateString()} · {b.bookingType} ·{' '}
                        {(b.requestStatus || 'pending') === 'accepted'
                          ? language === 'en'
                            ? 'Accepted ✓'
                            : 'स्वीकृत ✓'
                          : (b.requestStatus || 'pending') === 'rejected'
                          ? language === 'en'
                            ? 'Rejected ✗'
                            : 'नाकारले ✗'
                          : language === 'en'
                          ? 'Pending'
                          : 'प्रलंबित'}
                      </p>
                      {/* Show selected item in overview */}
                      {b.bookingType === 'stay' && b.details?.stay && (
                        <p className="text-[10px] text-primary">🏨 {b.details.stay.name}</p>
                      )}
                      {b.bookingType === 'guide' && b.details?.guide && (
                        <p className="text-[10px] text-primary">👤 {b.details.guide.name}</p>
                      )}
                      {b.bookingType === 'vehicle' && b.details?.vehicle && (
                        <p className="text-[10px] text-primary">🚗 {b.details.vehicle.type}</p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-soft" hidden={tab !== 'requests'}>
            <h2 className="text-sm font-semibold text-primaryDark">
              {language === 'en' ? 'Booking requests' : 'बुकिंग विनंत्या'}
            </h2>
            {isUsingProductionApi() && (
              <p className="mt-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-[11px] text-sky-950">
                {language === 'en'
                  ? 'Render blocks Gmail SMTP. Set RESEND_API_KEY on Render (resend.com → API Keys) so acceptance emails are delivered.'
                  : 'Render Gmail SMTP blocked — set RESEND_API_KEY on Render for customer emails.'}
              </p>
            )}
            <p className="mt-2 text-xs text-gray-500">
              {language === 'en'
                ? 'Accept or reject booking requests and contact users.'
                : 'बुकिंग विनंत्या स्वीकारा/नकार द्या आणि युजरशी संपर्क साधा.'}
            </p>

            <div className="mt-3 space-y-2 text-[11px]">
              {loading ? (
                <div className="h-28 animate-pulse rounded-2xl bg-softBg" />
              ) : bookings.length === 0 ? (
                <p className="text-gray-500">
                  {language === 'en' ? 'No bookings yet.' : 'अजून बुकिंग्स नाहीत.'}
                </p>
              ) : (
                bookings.slice(0, 20).map((b) => {
                  const status = b.requestStatus || 'pending';
                  const statusLabel =
                    status === 'accepted'
                      ? language === 'en'
                        ? 'Accepted ✓'
                        : 'स्वीकृत ✓'
                      : status === 'rejected'
                      ? language === 'en'
                        ? 'Rejected ✗'
                        : 'नाकारले ✗'
                      : language === 'en'
                      ? 'Pending'
                      : 'प्रलंबित';
                  const badge =
                    status === 'accepted'
                      ? 'bg-emerald-50 text-emerald-700'
                      : status === 'rejected'
                      ? 'bg-red-50 text-red-700'
                      : 'bg-amber-50 text-amber-700';
                  return (
                    <div
                      key={b._id}
                      className="rounded-2xl bg-softBg px-3 py-2"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-primaryDark">
                            {b.fortId?.name || 'Fort'} · {b.userId?.name || 'User'}
                          </p>
                          <p className="mt-0.5 text-[10px] text-gray-600">
                            {new Date(b.date).toLocaleDateString()} · {b.bookingType} ·{' '}
                            <span className={`rounded-full px-2 py-0.5 ${badge}`}>
                              {statusLabel}
                            </span>
                          </p>
                          {/* Show selected stay/guide/vehicle details */}
                          {b.bookingType === 'stay' && b.details?.stay && (
                            <p className="mt-1 text-[10px] text-primary">
                              🏨 {b.details.stay.name} · ₹{b.details.stay.pricePerNight}/night
                            </p>
                          )}
                          {b.bookingType === 'guide' && b.details?.guide && (
                            <p className="mt-1 text-[10px] text-primary">
                              👤 {b.details.guide.name} · ₹{b.details.guide.pricing}
                            </p>
                          )}
                          {b.bookingType === 'vehicle' && b.details?.vehicle && (
                            <p className="mt-1 text-[10px] text-primary">
                              🚗 {b.details.vehicle.type} ({b.details.vehicle.model}) · ₹{b.details.vehicle.pricePerDay}/day
                            </p>
                          )}
                          {b.userId?.email && (
                            <a
                              className="mt-1 inline-block text-[10px] font-semibold text-primary hover:text-primaryDark"
                              href={`mailto:${b.userId.email}?subject=Gadkille booking request&body=Hi ${encodeURIComponent(
                                b.userId?.name || 'there'
                              )},%0D%0A%0D%0ARegarding your booking for ${
                                encodeURIComponent(b.fortId?.name || 'a fort')
                              } on ${encodeURIComponent(
                                new Date(b.date).toLocaleDateString()
                              )}.`}
                            >
                              {language === 'en' ? 'Contact user' : 'युजरला संपर्क'}
                            </a>
                          )}
                          {(b.userId?.phone || b.userId?.email) && (
                            <p className="mt-1 text-[10px] text-gray-600">
                              {b.userId?.email && (
                                <span className="mr-2">
                                  {language === 'en' ? 'Email' : 'ई-मेल'}: {b.userId.email}
                                </span>
                              )}
                              {b.userId?.phone && (
                                <span>
                                  {language === 'en' ? 'Phone' : 'फोन'}:{' '}
                                  <a
                                    className="font-semibold text-primary hover:text-primaryDark"
                                    href={`tel:${b.userId.phone}`}
                                  >
                                    {b.userId.phone}
                                  </a>
                                </span>
                              )}
                            </p>
                          )}
                        </div>

                        <div className="flex shrink-0 flex-col gap-1">
                          <button
                            onClick={() => setBookingStatus(b, 'accepted')}
                            className="rounded-full bg-emerald-600 px-3 py-1 text-[10px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                            disabled={status === 'accepted'}
                          >
                            {language === 'en' ? 'Accept ✓' : 'स्वीकारा ✓'}
                          </button>
                          <button
                            onClick={() => setBookingStatus(b, 'rejected')}
                            className="rounded-full bg-red-600 px-3 py-1 text-[10px] font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                            disabled={status === 'rejected'}
                          >
                            {language === 'en' ? 'Reject ✗' : 'नकार ✗'}
                          </button>
                          <button
                            onClick={() => deleteBooking(b)}
                            className="rounded-full bg-gray-600 px-3 py-1 text-[10px] font-semibold text-white hover:bg-gray-700"
                            title={language === 'en' ? 'Delete booking request' : 'बुकिंग विनंती हटवा'}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-soft" hidden={tab !== 'inquiries'}>
            <h2 className="text-sm font-semibold text-primaryDark">
              {language === 'en' ? 'Plan/Group/Contact inquiries' : 'प्लॅन/ग्रुप/संपर्क चौकशी'}
            </h2>
            <p className="mt-2 text-xs text-gray-500">
              {language === 'en'
                ? 'All form submissions from Plan Trip, Group Tours and Contact pages.'
                : 'Plan Trip, Group Tours आणि Contact पेजवरील सर्व फॉर्म सबमिशन्स.'}
            </p>

            <div className="mt-3 space-y-2 text-[11px]">
              {loading ? (
                <div className="h-24 animate-pulse rounded-2xl bg-softBg" />
              ) : inquiries.length === 0 ? (
                <p className="text-gray-500">
                  {language === 'en' ? 'No inquiries yet.' : 'अजून चौकशी आलेली नाही.'}
                </p>
              ) : (
                inquiries.slice(0, 50).map((inquiry) => (
                  <div key={inquiry._id} className="rounded-2xl bg-softBg px-3 py-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-primaryDark">
                          {inquiry.name} · {inquiry.location || (language === 'en' ? 'No location' : 'लोकेशन नाही')}
                        </p>
                        <p className="text-[10px] text-gray-600">
                          {new Date(inquiry.createdAt).toLocaleString()} · {inquiry.category}
                          {inquiry.tripType ? ` · ${inquiry.tripType}` : ''}
                          {inquiry.groupSize ? ` · ${inquiry.groupSize} ${language === 'en' ? 'people' : 'लोक'}` : ''}
                        </p>
                        <p className="mt-1 text-[10px] text-gray-700">
                          {inquiry.subject || inquiry.purpose || inquiry.message || '-'}
                        </p>
                        <p className="mt-1 text-[10px] text-primaryDark">
                          {inquiry.phone}
                          {inquiry.email ? ` · ${inquiry.email}` : ''}
                        </p>
                      </div>
                      {inquiry.email && (
                        <a
                          href={`mailto:${inquiry.email}`}
                          className="shrink-0 rounded-full bg-white px-3 py-1 text-[10px] font-semibold text-primary hover:bg-gray-100"
                        >
                          {language === 'en' ? 'Email' : 'ई-मेल'}
                        </a>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-soft" hidden={tab !== 'forts'}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-primaryDark">
                  {language === 'en' ? 'Forts manager' : 'किल्ले व्यवस्थापक'}
                </h2>
                <p className="mt-2 text-xs text-gray-500">
                  {language === 'en'
                    ? 'Add, update, or remove forts shown on the home page.'
                    : 'होम पेजवर दिसणारे किल्ले जोडा, अपडेट करा किंवा हटवा.'}
                </p>
                {isUsingProductionApi() && (
                  <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-950">
                    {language === 'en'
                      ? 'Live site (Render): paste full image URLs above (one per line). File uploads are lost when the server restarts — they are not your permanent photos. Delete demo forts (Lohagad/Visapur/Ramshej) if you do not need them.'
                      : 'लाइव साइट (Render): वर पूर्ण इमेज URL चिकटवा. फाइल अपलोड रीस्टार्टनंतर हरवतात. डेमो किल्ले हटवा.'}
                  </p>
                )}
              </div>
              <button
                onClick={resetFortForm}
                className="text-[11px] font-semibold text-primary hover:text-primaryDark"
              >
                {language === 'en' ? 'New fort' : 'नवीन किल्ला'}
              </button>
            </div>

            <form onSubmit={saveFort} className="mt-4 grid gap-3 text-xs md:grid-cols-2">
              <div className="md:col-span-1">
                <label className="mb-1 block text-[11px] text-gray-700">
                  {language === 'en' ? 'Name' : 'नाव'}
                </label>
                <input
                  value={fortForm.name}
                  onChange={(e) => setFortForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 bg-softBg px-3 py-2 focus:border-primary focus:outline-none"
                />
              </div>
              <div className="md:col-span-1">
                <label className="mb-1 block text-[11px] text-gray-700">
                  {language === 'en' ? 'Slug' : 'स्लग'}
                </label>
                <input
                  value={fortForm.slug}
                  onChange={(e) => setFortForm((p) => ({ ...p, slug: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 bg-softBg px-3 py-2 focus:border-primary focus:outline-none"
                />
                <p className="mt-1 text-[10px] text-gray-500">
                  {language === 'en'
                    ? 'If left blank, slug is auto-generated from name.'
                    : 'रिक्त ठेवल्यास स्लग नावावरून आपोआप तयार होईल.'}
                </p>
              </div>
              <div className="md:col-span-1">
                <label className="mb-1 block text-[11px] text-gray-700">
                  {language === 'en' ? 'Location' : 'ठिकाण'}
                </label>
                <input
                  value={fortForm.location}
                  onChange={(e) => setFortForm((p) => ({ ...p, location: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 bg-softBg px-3 py-2 focus:border-primary focus:outline-none"
                />
              </div>
              <div className="md:col-span-1">
                <label className="mb-1 block text-[11px] text-gray-700">
                  {language === 'en'
                    ? 'Images (one URL per line)'
                    : 'इमेजेस (प्रत्येक ओळीवर 1 URL)'}
                </label>
                <textarea
                  rows={3}
                  value={fortForm.imagesText}
                  onChange={(e) =>
                    setFortForm((p) => ({ ...p, imagesText: e.target.value }))
                  }
                  className="w-full resize-none rounded-xl border border-gray-200 bg-softBg px-3 py-2 focus:border-primary focus:outline-none"
                />
                <div className="mt-2">
                  <label className="mb-1 block text-[11px] text-gray-700">
                    {language === 'en'
                      ? 'Or upload images'
                      : 'किंवा इमेज अपलोड करा'}
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={async (e) => {
                      await uploadFortImages(e.target.files);
                      e.target.value = '';
                    }}
                    className="w-full rounded-xl border border-gray-200 bg-softBg px-3 py-2 text-[11px] file:mr-2 file:cursor-pointer file:rounded-full file:border-0 file:bg-primary file:px-3 file:py-1 file:text-xs file:text-white file:font-semibold"
                  />
                  <p className="mt-1 text-[10px] text-gray-500">
                    {isUsingProductionApi()
                      ? language === 'en'
                        ? 'On Render, prefer image URLs in the box above. Uploads work until the next deploy only.'
                        : 'Render वर वर URL वापरा. अपलोड फक्त तात्पुरते.'
                      : language === 'en'
                        ? 'Uploaded images are saved on the API server and URLs are auto-filled.'
                        : 'अपलोड केलेल्या प्रतिमा API सर्व्हरवर सेव्ह होतात.'}
                  </p>
                </div>
              </div>
              <div className="md:col-span-1">
                <label className="mb-1 block text-[11px] text-gray-700">
                  {language === 'en'
                    ? 'Videos (one URL per line)'
                    : 'व्हिडिओ (प्रत्येक ओळीवर 1 URL)'}
                </label>
                <textarea
                  rows={3}
                  value={fortForm.videosText}
                  onChange={(e) =>
                    setFortForm((p) => ({ ...p, videosText: e.target.value }))
                  }
                  className="w-full resize-none rounded-xl border border-gray-200 bg-softBg px-3 py-2 focus:border-primary focus:outline-none"
                />
                <div className="mt-2">
                  <label className="mb-1 block text-[11px] text-gray-700">
                    {language === 'en'
                      ? 'Or upload videos (MP4/WEBM/MOV)'
                      : 'किंवा व्हिडिओ अपलोड करा (MP4/WEBM/MOV)'}
                  </label>
                  <input
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime"
                    multiple
                    onChange={async (e) => {
                      await uploadFortVideos(e.target.files);
                      e.target.value = '';
                    }}
                    className="w-full rounded-xl border border-gray-200 bg-softBg px-3 py-2 text-[11px] file:mr-2 file:cursor-pointer file:rounded-full file:border-0 file:bg-primary file:px-3 file:py-1 file:text-xs file:text-white file:font-semibold"
                  />
                  <p className="mt-1 text-[10px] text-gray-500">
                    {language === 'en'
                      ? 'Uploaded videos are saved on the API server (uploads/videos) and URLs are auto-filled.'
                      : 'अपलोड केलेले व्हिडिओ API सर्व्हरवर (uploads/videos) सेव्ह होतात.'}
                  </p>
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-[11px] text-gray-700">
                  {language === 'en' ? 'History' : 'इतिहास'}
                </label>
                <textarea
                  rows={3}
                  value={fortForm.history}
                  onChange={(e) => setFortForm((p) => ({ ...p, history: e.target.value }))}
                  className="w-full resize-none rounded-xl border border-gray-200 bg-softBg px-3 py-2 focus:border-primary focus:outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-[11px] text-gray-700">
                  {language === 'en' ? 'Description' : 'वर्णन'}
                </label>
                <textarea
                  rows={3}
                  value={fortForm.description}
                  onChange={(e) =>
                    setFortForm((p) => ({ ...p, description: e.target.value }))
                  }
                  className="w-full resize-none rounded-xl border border-gray-200 bg-softBg px-3 py-2 focus:border-primary focus:outline-none"
                />
              </div>

              <div className="md:col-span-1">
                <label className="mb-1 block text-[11px] text-gray-700">
                  {language === 'en' ? 'Map latitude' : 'नकाशा अक्षांश'}
                </label>
                <input
                  value={fortForm.lat}
                  onChange={(e) => setFortForm((p) => ({ ...p, lat: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 bg-softBg px-3 py-2 focus:border-primary focus:outline-none"
                />
              </div>
              <div className="md:col-span-1">
                <label className="mb-1 block text-[11px] text-gray-700">
                  {language === 'en' ? 'Map longitude' : 'नकाशा रेखांश'}
                </label>
                <input
                  value={fortForm.lng}
                  onChange={(e) => setFortForm((p) => ({ ...p, lng: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 bg-softBg px-3 py-2 focus:border-primary focus:outline-none"
                />
              </div>

              <div className="md:col-span-2 rounded-2xl bg-softBg p-3 text-[11px] text-gray-700">
                {language === 'en'
                  ? 'Advanced details (simple form). Add rows as needed.'
                  : 'अतिरिक्त माहिती (सोप्या फॉर्ममध्ये). गरजेनुसार रकाने जोडा.'}
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-[11px] text-gray-700">
                  {language === 'en' ? 'Routes' : 'मार्ग'}
                </label>
                <div className="space-y-2">
                  {(fortForm.routes || []).map((r, idx) => (
                    <div key={idx} className="rounded-2xl bg-softBg p-3">
                      <div className="grid gap-2 md:grid-cols-4">
                        <select
                          value={r.type || 'bus'}
                          onChange={(e) => updateFortArrayItem('routes', idx, { type: e.target.value })}
                          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-[11px] focus:border-primary focus:outline-none"
                        >
                          {['bus', 'train', 'private', 'trek'].map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                        <input
                          value={r.duration || ''}
                          onChange={(e) => updateFortArrayItem('routes', idx, { duration: e.target.value })}
                          placeholder={language === 'en' ? 'Duration' : 'कालावधी'}
                          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-[11px] focus:border-primary focus:outline-none"
                        />
                        <input
                          value={r.distance || ''}
                          onChange={(e) => updateFortArrayItem('routes', idx, { distance: e.target.value })}
                          placeholder={language === 'en' ? 'Distance' : 'अंतर'}
                          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-[11px] focus:border-primary focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => removeFortArrayItem('routes', idx)}
                          className="rounded-full bg-red-50 px-4 py-2 text-[11px] font-semibold text-red-700 hover:bg-red-100"
                        >
                          {language === 'en' ? 'Remove' : 'काढा'}
                        </button>
                      </div>
                      <input
                        value={r.description || ''}
                        onChange={(e) => updateFortArrayItem('routes', idx, { description: e.target.value })}
                        placeholder={language === 'en' ? 'Description' : 'वर्णन'}
                        className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-[11px] focus:border-primary focus:outline-none"
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      addFortArrayItem('routes', {
                        type: 'bus',
                        description: '',
                        duration: '',
                        distance: ''
                      })
                    }
                    className="rounded-full bg-white px-4 py-2 text-[11px] font-semibold text-primary shadow-soft hover:bg-softBg"
                  >
                    {language === 'en' ? '+ Add route' : '+ मार्ग जोडा'}
                  </button>
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-[11px] text-gray-700">
                  {language === 'en' ? 'Facilities' : 'सुविधा'}
                </label>
                <div className="space-y-2">
                  {(fortForm.facilities || []).map((f, idx) => (
                    <div key={idx} className="rounded-2xl bg-softBg p-3">
                      <div className="grid gap-2 md:grid-cols-3">
                        <input
                          value={f.name || ''}
                          onChange={(e) => updateFortArrayItem('facilities', idx, { name: e.target.value })}
                          placeholder={language === 'en' ? 'Facility name' : 'सुविधेचे नाव'}
                          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-[11px] focus:border-primary focus:outline-none"
                        />
                        <label className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-[11px]">
                          <input
                            type="checkbox"
                            checked={f.available !== false}
                            onChange={(e) => updateFortArrayItem('facilities', idx, { available: e.target.checked })}
                          />
                          {language === 'en' ? 'Available' : 'उपलब्ध'}
                        </label>
                        <button
                          type="button"
                          onClick={() => removeFortArrayItem('facilities', idx)}
                          className="rounded-full bg-red-50 px-4 py-2 text-[11px] font-semibold text-red-700 hover:bg-red-100"
                        >
                          {language === 'en' ? 'Remove' : 'काढा'}
                        </button>
                      </div>
                      <input
                        value={f.details || ''}
                        onChange={(e) => updateFortArrayItem('facilities', idx, { details: e.target.value })}
                        placeholder={language === 'en' ? 'Details (optional)' : 'तपशील (ऐच्छिक)'}
                        className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-[11px] focus:border-primary focus:outline-none"
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addFortArrayItem('facilities', { name: '', available: true, details: '' })}
                    className="rounded-full bg-white px-4 py-2 text-[11px] font-semibold text-primary shadow-soft hover:bg-softBg"
                  >
                    {language === 'en' ? '+ Add facility' : '+ सुविधा जोडा'}
                  </button>
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-[11px] text-gray-700">
                  {language === 'en' ? 'Stay options' : 'राहण्याची सोय'}
                </label>
                <div className="space-y-2">
                  {(fortForm.stayOptions || []).map((s, idx) => (
                    <div key={idx} className="rounded-2xl bg-softBg p-3">
                      <div className="grid gap-2 md:grid-cols-4">
                        <input
                          value={s.name || ''}
                          onChange={(e) => updateFortArrayItem('stayOptions', idx, { name: e.target.value })}
                          placeholder={language === 'en' ? 'Name' : 'नाव'}
                          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-[11px] focus:border-primary focus:outline-none"
                        />
                        <input
                          value={s.pricePerNight ?? ''}
                          onChange={(e) => updateFortArrayItem('stayOptions', idx, { pricePerNight: Number(e.target.value) })}
                          placeholder={language === 'en' ? 'Price/night' : 'किंमत/रात्र'}
                          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-[11px] focus:border-primary focus:outline-none"
                        />
                        <input
                          value={s.maxGuests ?? ''}
                          onChange={(e) => updateFortArrayItem('stayOptions', idx, { maxGuests: Number(e.target.value) })}
                          placeholder={language === 'en' ? 'Max guests' : 'कमाल लोक'}
                          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-[11px] focus:border-primary focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => removeFortArrayItem('stayOptions', idx)}
                          className="rounded-full bg-red-50 px-4 py-2 text-[11px] font-semibold text-red-700 hover:bg-red-100"
                        >
                          {language === 'en' ? 'Remove' : 'काढा'}
                        </button>
                      </div>
                      <div className="mt-2 grid gap-2 md:grid-cols-[1fr,200px]">
                        <input
                          value={s.description || ''}
                          onChange={(e) => updateFortArrayItem('stayOptions', idx, { description: e.target.value })}
                          placeholder={language === 'en' ? 'Description' : 'वर्णन'}
                          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-[11px] focus:border-primary focus:outline-none"
                        />
                        <label className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-[11px]">
                          <input
                            type="checkbox"
                            checked={!!s.availability}
                            onChange={(e) => updateFortArrayItem('stayOptions', idx, { availability: e.target.checked })}
                          />
                          {language === 'en' ? 'Available' : 'उपलब्ध'}
                        </label>
                      </div>
                      <textarea
                        rows={2}
                        value={s.imagesText || ''}
                        onChange={(e) => updateFortArrayItem('stayOptions', idx, { imagesText: e.target.value })}
                        placeholder={language === 'en' ? 'Stay photo URLs (one per line)' : 'राहण्याच्या फोटो URL (प्रत्येक ओळीत एक)'}
                        className="mt-2 w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-[11px] focus:border-primary focus:outline-none"
                      />
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <label className="cursor-pointer rounded-full bg-primary px-4 py-2 text-[11px] font-semibold text-white hover:bg-primaryDark">
                          {uploadingStayIdx === idx
                            ? language === 'en'
                              ? 'Uploading...'
                              : 'अपलोड होत आहे...'
                            : language === 'en'
                            ? 'Upload Hotel Photos'
                            : 'हॉटेल फोटो अपलोड करा'}
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            disabled={uploadingStayIdx === idx}
                            onChange={(e) => {
                              uploadStayImages(idx, e.target.files);
                              e.target.value = '';
                            }}
                          />
                        </label>
                        <p className="text-[10px] text-gray-500">
                          {language === 'en'
                            ? 'You can upload 3-4 photos (or more) at once.'
                            : 'तुम्ही एकावेळी 3-4 (किंवा अधिक) फोटो अपलोड करू शकता.'}
                        </p>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      addFortArrayItem('stayOptions', {
                        name: '',
                        description: '',
                        pricePerNight: 0,
                        maxGuests: 1,
                        availability: true,
                        imagesText: ''
                      })
                    }
                    className="rounded-full bg-white px-4 py-2 text-[11px] font-semibold text-primary shadow-soft hover:bg-softBg"
                  >
                    {language === 'en' ? '+ Add stay option' : '+ राहण्याची सोय जोडा'}
                  </button>
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-[11px] text-gray-700">
                  {language === 'en' ? 'Guides' : 'मार्गदर्शक'}
                </label>
                <div className="space-y-2">
                  {(fortForm.guides || []).map((g, idx) => (
                    <div key={idx} className="rounded-2xl bg-softBg p-3">
                      <div className="grid gap-2 md:grid-cols-4">
                        <input
                          value={g.name || ''}
                          onChange={(e) => updateFortArrayItem('guides', idx, { name: e.target.value })}
                          placeholder={language === 'en' ? 'Name' : 'नाव'}
                          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-[11px] focus:border-primary focus:outline-none"
                        />
                        <input
                          value={Array.isArray(g.language) ? g.language.join(', ') : g.language || ''}
                          onChange={(e) =>
                            updateFortArrayItem('guides', idx, {
                              language: e.target.value
                                .split(',')
                                .map((s) => s.trim())
                                .filter(Boolean)
                            })
                          }
                          placeholder={language === 'en' ? 'Languages (comma)' : 'भाषा (कॉमा)'}
                          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-[11px] focus:border-primary focus:outline-none"
                        />
                        <input
                          value={g.contactInfo || ''}
                          onChange={(e) => updateFortArrayItem('guides', idx, { contactInfo: e.target.value })}
                          placeholder={language === 'en' ? 'Contact' : 'संपर्क'}
                          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-[11px] focus:border-primary focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => removeFortArrayItem('guides', idx)}
                          className="rounded-full bg-red-50 px-4 py-2 text-[11px] font-semibold text-red-700 hover:bg-red-100"
                        >
                          {language === 'en' ? 'Remove' : 'काढा'}
                        </button>
                      </div>
                      <div className="mt-2 grid gap-2 md:grid-cols-4">
                        <input
                          value={g.pricing ?? ''}
                          onChange={(e) => updateFortArrayItem('guides', idx, { pricing: Number(e.target.value) })}
                          placeholder={language === 'en' ? 'Pricing' : 'किंमत'}
                          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-[11px] focus:border-primary focus:outline-none"
                        />
                        <input
                          value={g.rating ?? ''}
                          onChange={(e) => updateFortArrayItem('guides', idx, { rating: Number(e.target.value) })}
                          placeholder={language === 'en' ? 'Rating' : 'रेटिंग'}
                          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-[11px] focus:border-primary focus:outline-none"
                        />
                        <label className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-[11px]">
                          <input
                            type="checkbox"
                            checked={g.available !== false}
                            onChange={(e) => updateFortArrayItem('guides', idx, { available: e.target.checked })}
                          />
                          {language === 'en' ? 'Available' : 'उपलब्ध'}
                        </label>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      addFortArrayItem('guides', {
                        name: '',
                        language: [],
                        pricing: 0,
                        rating: 0,
                        contactInfo: '',
                        available: true
                      })
                    }
                    className="rounded-full bg-white px-4 py-2 text-[11px] font-semibold text-primary shadow-soft hover:bg-softBg"
                  >
                    {language === 'en' ? '+ Add guide' : '+ मार्गदर्शक जोडा'}
                  </button>
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-[11px] text-gray-700">
                  {language === 'en' ? 'Vehicle rentals' : 'वाहने'}
                </label>
                <div className="space-y-2">
                  {(fortForm.vehicleRentals || []).map((v, idx) => (
                    <div key={idx} className="rounded-2xl bg-softBg p-3">
                      <div className="grid gap-2 md:grid-cols-4">
                        <select
                          value={v.type || 'cab'}
                          onChange={(e) => updateFortArrayItem('vehicleRentals', idx, { type: e.target.value })}
                          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-[11px] focus:border-primary focus:outline-none"
                        >
                          {['cab', 'car', 'bike'].map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                        <input
                          value={v.model || ''}
                          onChange={(e) => updateFortArrayItem('vehicleRentals', idx, { model: e.target.value })}
                          placeholder={language === 'en' ? 'Model' : 'मॉडेल'}
                          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-[11px] focus:border-primary focus:outline-none"
                        />
                        <input
                          value={v.driverName || ''}
                          onChange={(e) => updateFortArrayItem('vehicleRentals', idx, { driverName: e.target.value })}
                          placeholder={language === 'en' ? 'Driver name' : 'ड्रायव्हर नाव'}
                          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-[11px] focus:border-primary focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => removeFortArrayItem('vehicleRentals', idx)}
                          className="rounded-full bg-red-50 px-4 py-2 text-[11px] font-semibold text-red-700 hover:bg-red-100"
                        >
                          {language === 'en' ? 'Remove' : 'काढा'}
                        </button>
                      </div>
                      <div className="mt-2 grid gap-2 md:grid-cols-3">
                        <input
                          value={v.contactInfo || ''}
                          onChange={(e) => updateFortArrayItem('vehicleRentals', idx, { contactInfo: e.target.value })}
                          placeholder={language === 'en' ? 'Contact' : 'संपर्क'}
                          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-[11px] focus:border-primary focus:outline-none"
                        />
                        <input
                          value={v.pricePerDay ?? ''}
                          onChange={(e) => updateFortArrayItem('vehicleRentals', idx, { pricePerDay: Number(e.target.value) })}
                          placeholder={language === 'en' ? 'Price/day' : 'किंमत/दिवस'}
                          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-[11px] focus:border-primary focus:outline-none"
                        />
                        <label className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-[11px]">
                          <input
                            type="checkbox"
                            checked={v.available !== false}
                            onChange={(e) => updateFortArrayItem('vehicleRentals', idx, { available: e.target.checked })}
                          />
                          {language === 'en' ? 'Available' : 'उपलब्ध'}
                        </label>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      addFortArrayItem('vehicleRentals', {
                        type: 'cab',
                        model: '',
                        driverName: '',
                        contactInfo: '',
                        pricePerDay: 0,
                        available: true
                      })
                    }
                    className="rounded-full bg-white px-4 py-2 text-[11px] font-semibold text-primary shadow-soft hover:bg-softBg"
                  >
                    {language === 'en' ? '+ Add vehicle' : '+ वाहन जोडा'}
                  </button>
                </div>
              </div>

              <div className="md:col-span-2 flex gap-2">
                <button
                  type="submit"
                  disabled={savingFort}
                  className="rounded-full bg-primary px-5 py-2 text-[11px] font-semibold text-white shadow-soft hover:bg-primaryDark disabled:opacity-60"
                >
                  {savingFort
                    ? language === 'en'
                      ? 'Saving...'
                      : 'सेव्ह करत आहे...'
                    : fortForm._id
                    ? language === 'en'
                      ? 'Update fort'
                      : 'अपडेट करा'
                    : language === 'en'
                    ? 'Add fort'
                    : 'जोडा'}
                </button>
                {fortForm._id && (
                  <button
                    type="button"
                    onClick={resetFortForm}
                    className="rounded-full bg-softBg px-5 py-2 text-[11px] font-semibold text-gray-700 hover:bg-gray-100"
                  >
                    {language === 'en' ? 'Cancel edit' : 'रद्द करा'}
                  </button>
                )}
              </div>
            </form>

            <div className="mt-4 space-y-2 text-[11px]">
              {loading ? (
                <div className="h-20 animate-pulse rounded-2xl bg-softBg" />
              ) : forts.length === 0 ? (
                <p className="text-gray-500">
                  {language === 'en' ? 'No forts yet.' : 'अजून किल्ले नाहीत.'}
                </p>
              ) : (
                forts.slice(0, 30).map((f) => (
                  <div
                    key={f._id}
                    className="flex items-center justify-between rounded-2xl bg-softBg px-3 py-2"
                  >
                    <div>
                      <p className="font-semibold text-primaryDark">{f.name}</p>
                      <p className="text-[10px] text-gray-600">{f.slug} · {f.location}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => startEditFort(f)}
                        className="text-[10px] font-semibold text-primary hover:text-primaryDark"
                      >
                        {language === 'en' ? 'Edit' : 'संपादित'}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteFort(f)}
                        className="text-[10px] font-semibold text-red-600 hover:text-red-700"
                      >
                        {language === 'en' ? 'Delete' : 'हटवा'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div hidden={tab !== 'history'}>
            <HistoryManagementTab
              language={language}
              showToast={showToast}
              loading={loading}
              forts={forts}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl bg-white p-5 shadow-soft" hidden={tab !== 'vendors'}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-primaryDark">
                  {language === 'en' ? 'Vendors & guides' : 'वेंडर व मार्गदर्शक'}
                </h2>
                <p className="mt-2 text-xs text-gray-500">
                  {language === 'en'
                    ? 'Create, edit, delete and toggle local stays, guides and vehicles.'
                    : 'स्थानिक राहण्याची सोय, मार्गदर्शक व वाहने तयार/अपडेट/हटवा आणि उपलब्धता बदला.'}
                </p>
              </div>
              <button
                onClick={resetVendorForm}
                className="text-[11px] font-semibold text-primary hover:text-primaryDark"
              >
                {language === 'en' ? 'New vendor' : 'नवीन वेंडर'}
              </button>
            </div>

            <form onSubmit={saveVendor} className="mt-4 grid gap-2 text-[11px] md:grid-cols-2">
              <input
                value={vendorForm.name}
                onChange={(e) => setVendorForm((p) => ({ ...p, name: e.target.value }))}
                placeholder={language === 'en' ? 'Vendor name' : 'वेंडर नाव'}
                className="rounded-xl border border-gray-200 bg-softBg px-3 py-2 focus:border-primary focus:outline-none"
              />
              <select
                value={vendorForm.serviceType}
                onChange={(e) => setVendorForm((p) => ({ ...p, serviceType: e.target.value }))}
                className="rounded-xl border border-gray-200 bg-softBg px-3 py-2 focus:border-primary focus:outline-none"
              >
                <option value="stay">{language === 'en' ? 'Stay' : 'राहण्याची सोय'}</option>
                <option value="guide">{language === 'en' ? 'Guide' : 'मार्गदर्शक'}</option>
                <option value="vehicle">{language === 'en' ? 'Vehicle' : 'वाहन'}</option>
              </select>
              <input
                value={vendorForm.contactInfo}
                onChange={(e) => setVendorForm((p) => ({ ...p, contactInfo: e.target.value }))}
                placeholder={language === 'en' ? 'Contact info' : 'संपर्क माहिती'}
                className="rounded-xl border border-gray-200 bg-softBg px-3 py-2 focus:border-primary focus:outline-none"
              />
              <input
                value={vendorForm.pricing}
                onChange={(e) => setVendorForm((p) => ({ ...p, pricing: e.target.value }))}
                placeholder={language === 'en' ? 'Pricing' : 'किंमत'}
                className="rounded-xl border border-gray-200 bg-softBg px-3 py-2 focus:border-primary focus:outline-none"
              />
              <input
                type="number"
                min={0}
                value={vendorForm.experienceYears}
                onChange={(e) => setVendorForm((p) => ({ ...p, experienceYears: e.target.value }))}
                placeholder={language === 'en' ? 'Years of experience' : 'अनुभव वर्षे'}
                className="rounded-xl border border-gray-200 bg-softBg px-3 py-2 focus:border-primary focus:outline-none"
              />
              <select
                value={vendorForm.fort}
                onChange={(e) => setVendorForm((p) => ({ ...p, fort: e.target.value }))}
                className="rounded-xl border border-gray-200 bg-softBg px-3 py-2 focus:border-primary focus:outline-none"
              >
                <option value="">
                  {language === 'en' ? 'Select fort (optional)' : 'किल्ला निवडा (ऐच्छिक)'}
                </option>
                {forts.map((f) => (
                  <option key={f._id} value={f._id}>
                    {f.name}
                  </option>
                ))}
              </select>
              <label className="md:col-span-2 flex items-center gap-2 rounded-xl border border-gray-200 bg-softBg px-3 py-2">
                <input
                  type="checkbox"
                  checked={!!vendorForm.availability}
                  onChange={(e) => setVendorForm((p) => ({ ...p, availability: e.target.checked }))}
                />
                {language === 'en' ? 'Available' : 'उपलब्ध'}
              </label>
              <div className="md:col-span-2 flex gap-2">
                <button
                  type="submit"
                  disabled={savingVendor}
                  className="rounded-full bg-primary px-4 py-2 text-[11px] font-semibold text-white hover:bg-primaryDark disabled:opacity-60"
                >
                  {savingVendor
                    ? language === 'en'
                      ? 'Saving...'
                      : 'सेव्ह करत आहे...'
                    : vendorForm._id
                    ? language === 'en'
                      ? 'Update vendor'
                      : 'वेंडर अपडेट करा'
                    : language === 'en'
                    ? 'Add vendor'
                    : 'वेंडर जोडा'}
                </button>
                {vendorForm._id && (
                  <button
                    type="button"
                    onClick={resetVendorForm}
                    className="rounded-full bg-softBg px-4 py-2 text-[11px] font-semibold text-gray-700 hover:bg-gray-100"
                  >
                    {language === 'en' ? 'Cancel edit' : 'रद्द करा'}
                  </button>
                )}
              </div>
            </form>

            <div className="mt-3 space-y-2 text-[11px]">
              {loading ? (
                <div className="h-20 animate-pulse rounded-2xl bg-softBg" />
              ) : vendors.length === 0 ? (
                <p className="text-gray-500">
                  {language === 'en'
                    ? 'No vendors configured yet.'
                    : 'अजून कोणतेही वेंडर जोडलेले नाहीत.'}
                </p>
              ) : (
                vendors.slice(0, 30).map((v) => (
                  <div
                    key={v._id}
                    className="flex items-center justify-between rounded-2xl bg-softBg px-3 py-2"
                  >
                    <div>
                      <p className="font-semibold text-primaryDark">{v.name}</p>
                      <p className="text-[10px] text-gray-600">
                        {v.serviceType} · {v.pricing} ·{' '}
                        {v.availability
                          ? language === 'en'
                            ? 'Available'
                            : 'उपलब्ध'
                          : language === 'en'
                          ? 'Not available'
                          : 'उपलब्ध नाही'}
                      </p>
                      {v.experienceYears > 0 && (
                        <p className="text-[10px] text-gray-600">
                          {language === 'en'
                            ? `${v.experienceYears} years experience`
                            : `${v.experienceYears} वर्षांचा अनुभव`}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleVendorAvailability(v)}
                        className="text-[10px] font-semibold text-primary hover:text-primaryDark"
                      >
                        {language === 'en' ? 'Toggle' : 'बदल करा'}
                      </button>
                      <button
                        onClick={() => startEditVendor(v)}
                        className="text-[10px] font-semibold text-primary hover:text-primaryDark"
                      >
                        {language === 'en' ? 'Edit' : 'संपादित'}
                      </button>
                      <button
                        onClick={() => deleteVendor(v)}
                        className="text-[10px] font-semibold text-red-600 hover:text-red-700"
                      >
                        {language === 'en' ? 'Delete' : 'हटवा'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-soft" hidden={tab !== 'overview'}>
            <h2 className="text-sm font-semibold text-primaryDark">
              {language === 'en' ? 'Users & analytics' : 'युजर्स व विश्लेषण'}
            </h2>
            <p className="mt-2 text-xs text-gray-500">
              {language === 'en'
                ? 'Later, plug in charts for top forts, booking trends and peak seasons.'
                : 'पुढे, लोकप्रिय किल्ले, बुकिंग ट्रेन्ड्स आणि गर्दीच्या काळासाठी चार्ट्स जोडा.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;

