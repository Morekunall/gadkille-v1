import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AuthModal from '../components/auth/AuthModal';
import axios from '../lib/axiosAuth';
import { resolveMediaUrl } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useUi } from '../context/UiContext';
import VideoModal from '../components/VideoModal';

const featureData = [
  { icon: '🚌', title: 'Transport', description: 'Smart route options for buses, cabs, and self-drive trips.' },
  { icon: '🍲', title: 'Food', description: 'Discover local food stops and meal recommendations nearby.' },
  { icon: '🏨', title: 'Stay', description: 'Choose curated stays with comfort ratings and amenities.' },
  { icon: '⛽', title: 'Petrol', description: 'Locate fuel stations and travel essentials on your route.' }
];

const groupTours = [
  { title: 'School Trips', image: 'https://images.pexels.com/photos/8423393/pexels-photo-8423393.jpeg' },
  { title: 'Family Trips', image: 'https://images.pexels.com/photos/1287142/pexels-photo-1287142.jpeg' },
  { title: "Friends' Treks", image: 'https://images.pexels.com/photos/1761279/pexels-photo-1761279.jpeg' }
];

const testimonials = [
  { name: 'Aditi M.', text: 'GadKille made fort planning effortless. Routes, food, and stay details were all accurate.', rating: 5 },
  { name: 'Rohan P.', text: 'The group trek booking flow is smooth and quick. Great UI and very responsive.', rating: 5 },
  { name: 'Sneha K.', text: 'Loved the short history videos and recommendations for lesser-known forts.', rating: 4 }
];

const HomePage = () => {
  const { user, authenticateWithToken } = useAuth();
  const { language } = useUi();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [forts, setForts] = useState([]);
  const [histories, setHistories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedFort, setSelectedFort] = useState('');
  const [tripType, setTripType] = useState('Weekend');
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const resolveImageUrl = resolveMediaUrl;

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      authenticateWithToken(token).then((authenticatedUser) => {
        if (authenticatedUser) {
          if (authenticatedUser.needsPhone) {
            navigate('/complete-profile', { replace: true });
            return;
          }
          navigate('/', { replace: true });
        } else {
          setShowAuthModal(true);
        }
      });
    }
  }, [user, navigate, searchParams, authenticateWithToken]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const fortsRes = await axios.get('/forts');
        setForts(fortsRes.data || []);
        try {
          const historiesRes = await axios.get('/history');
          setHistories(historiesRes.data || []);
        } catch {
          setHistories([]);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const topForts = useMemo(() => forts.slice(0, 6), [forts]);
  const isEnglish = language === 'en';

  return (
    <div className="bg-softBg text-primaryDark">
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
      <section className="relative min-h-[72vh] overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/hero-fort.png')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-primaryDark/85 via-primaryDark/70 to-primary/45" />
        <div className="relative mx-auto flex max-w-6xl flex-col gap-8 px-4 py-20 text-white md:py-24">
          <h1 className="max-w-2xl text-4xl font-bold leading-tight md:text-6xl">
            {isEnglish ? 'Explore Forts Like Never Before' : 'किल्ले यापूर्वी कधीच न पाहिल्यासारखे एक्सप्लोर करा'}
          </h1>
          <p className="max-w-2xl text-sm text-slate-100 md:text-base">
            {isEnglish
              ? 'Plan complete adventures with curated routes, stay options, trusted guides, and group packages in one platform.'
              : 'एकाच प्लॅटफॉर्मवर मार्ग, राहण्याची सोय, विश्वसनीय गाईड आणि ग्रुप पॅकेजेससह संपूर्ण प्रवास प्लॅन करा.'}
          </p>
          <div className="grid max-w-3xl gap-3 rounded-2xl border border-white/25 bg-white/15 p-3 backdrop-blur-md md:grid-cols-[1fr_1fr_auto]">
            <select value={selectedFort} onChange={(e) => setSelectedFort(e.target.value)} className="rounded-xl border border-white/25 bg-black/10 px-3 py-2 text-sm text-white focus:border-accent focus:outline-none">
              <option value="" className="text-primaryDark">{isEnglish ? 'Select Fort' : 'किल्ला निवडा'}</option>
              {forts.map((fort) => <option key={fort._id} value={fort.slug} className="text-primaryDark">{fort.name}</option>)}
            </select>
            <select value={tripType} onChange={(e) => setTripType(e.target.value)} className="rounded-xl border border-white/25 bg-black/10 px-3 py-2 text-sm text-white focus:border-accent focus:outline-none">
              {['Weekend', 'One Day', 'Family', 'School', 'Adventure'].map((type) => <option key={type} value={type} className="text-primaryDark">{isEnglish ? `${type} Trip` : `${type} ट्रिप`}</option>)}
            </select>
            <Link to={selectedFort ? `/fort/${selectedFort}` : '/plan-trip'} className="rounded-xl bg-gradient-to-r from-accent to-[#a8c287] px-5 py-2 text-center text-sm font-semibold text-primaryDark shadow-lg transition hover:brightness-95">
              {isEnglish ? 'Start Planning' : 'प्लॅनिंग सुरू करा'}
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-center text-2xl font-semibold text-primaryDark sm:text-2xl">{isEnglish ? 'Essential Trip Features' : 'महत्त्वाची ट्रिप फीचर्स'}</h2>

        <div className="mt-6 grid gap-3 sm:mt-8 sm:gap-4 sm:grid-cols-2 md:grid-cols-4">
          {featureData.map((item) => (
            <article
              key={item.title}
              className="rounded-2xl border border-primary/10 bg-white/85 p-3 shadow-soft transition hover:-translate-y-1 hover:border-primary/20 sm:p-4 md:p-5"
            >
              <div className="text-xl sm:text-2xl">{item.icon}</div>
              <h3 className="mt-2 text-sm font-semibold text-primaryDark sm:mt-3 sm:text-base md:text-lg">
                {isEnglish
                  ? item.title
                  : item.title === 'Transport'
                  ? 'प्रवास'
                  : item.title === 'Food'
                  ? 'अन्न'
                  : item.title === 'Stay'
                  ? 'राहण्याची सोय'
                  : 'पेट्रोल'}
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-gray-600 sm:mt-2 sm:text-sm sm:leading-snug">
                {isEnglish
                  ? item.description
                  : item.title === 'Transport'
                  ? 'बस, कॅब आणि सेल्फ-ड्राईव्हसाठी स्मार्ट रूट पर्याय.'
                  : item.title === 'Food'
                  ? 'स्थानिक फूड स्टॉप्स आणि जेवणाच्या शिफारसी शोधा.'
                  : item.title === 'Stay'
                  ? 'सुविधांसह निवडक राहण्याचे पर्याय निवडा.'
                  : 'तुमच्या मार्गावरील इंधन स्टेशन आणि आवश्यक सेवा शोधा.'}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8">
        <h2 className="text-2xl font-semibold text-primaryDark">{isEnglish ? 'Popular Forts' : 'लोकप्रिय किल्ले'}</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(loading ? Array.from({ length: 6 }) : topForts).map((fort, idx) => (
            <article key={fort?._id || idx} className="overflow-hidden rounded-2xl border border-primary/10 bg-white/90 shadow-soft transition hover:-translate-y-1 hover:border-primary/20">
              <div
                className="h-44 bg-accent/20 bg-cover bg-center"
                style={
                  !loading
                    ? { backgroundImage: `url(${resolveImageUrl(fort.images?.[0] || '')})` }
                    : undefined
                }
              />
              <div className="p-4">
                <h3 className="text-lg font-semibold text-primaryDark">{loading ? (isEnglish ? 'Loading...' : 'लोड होत आहे...') : fort.name}</h3>
                <p className="mt-1 text-sm text-gray-600">{loading ? (isEnglish ? 'Fetching fort details...' : 'किल्ल्याची माहिती घेत आहे...') : fort.description?.slice(0, 90) || fort.location}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-primary">4.7 ★</span>
                  {!loading && <Link to={`/fort/${fort.slug}`} className="text-sm font-semibold text-primaryDark hover:underline">{isEnglish ? 'View Details' : 'तपशील पहा'}</Link>}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-2xl font-semibold text-primaryDark">{isEnglish ? 'Group Tours' : 'ग्रुप टूर'}</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {groupTours.map((tour) => (
            <article key={tour.title} className="overflow-hidden rounded-2xl border border-primary/10 bg-white/90 shadow-soft">
              <div className="h-44 bg-cover bg-center" style={{ backgroundImage: `url(${tour.image})` }} />
              <div className="p-4">
                <h3 className="text-lg font-semibold text-primaryDark">
                  {isEnglish ? tour.title : tour.title === 'School Trips' ? 'शाळेच्या सहली' : tour.title === 'Family Trips' ? 'कुटुंब सहली' : 'मित्रांचे ट्रेक'}
                </h3>
                <Link to="/group-tours" className="mt-3 inline-block rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primaryDark">
                  {isEnglish ? 'Book Now' : 'आत्ताच बुक करा'}
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-2xl font-semibold text-primaryDark">{isEnglish ? 'Short History' : 'संक्षिप्त इतिहास'}</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {histories.length > 0 ? (
            histories.slice(0, 3).map((history) => (
              <article
                key={`history-${history._id}`}
                className="relative overflow-hidden rounded-2xl border border-primary/10 bg-white/90 shadow-soft cursor-pointer transition hover:-translate-y-1"
                onClick={() => {
                  setSelectedVideo(history);
                  setVideoModalOpen(true);
                }}
              >
                <div
                  className="h-44 bg-cover bg-center"
                  style={{
                    backgroundImage: `url(${history.thumbnail || resolveImageUrl(history.fort?.images?.[0] || '')})`
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/35 transition group-hover:bg-black/45">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-primaryDark hover:scale-110 transition">▶</div>
                </div>
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-primaryDark">{history.title}</h3>
                  <p className="text-sm text-gray-600 line-clamp-2">{history.description}</p>
                  {history.duration && (
                    <p className="text-xs text-gray-500 mt-2">
                      {history.duration}
                    </p>
                  )}
                </div>
              </article>
            ))
          ) : (
            topForts.slice(0, 3).map((fort) => (
              <article key={`history-${fort._id}`} className="relative overflow-hidden rounded-2xl border border-primary/10 bg-white/90 shadow-soft">
                <div
                  className="h-44 bg-cover bg-center"
                  style={{ backgroundImage: `url(${resolveImageUrl(fort.images?.[0] || '')})` }}
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/35">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-primaryDark">▶</div>
                </div>
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-primaryDark">{fort.name}</h3>
                  <p className="text-sm text-gray-600">{isEnglish ? "Watch a quick story of this fort's legacy." : 'या किल्ल्याचा थोडक्यात इतिहास पाहा.'}</p>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      <VideoModal
        isOpen={videoModalOpen}
        onClose={() => {
          setVideoModalOpen(false);
          setSelectedVideo(null);
        }}
        video={selectedVideo}
        language={language}
      />

      <section className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-2xl font-semibold text-primaryDark">{isEnglish ? 'What Travelers Say' : 'प्रवासी काय म्हणतात'}</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {testimonials.map((item) => (
            <article key={item.name} className="rounded-2xl border border-primary/10 bg-white/90 p-5 shadow-soft">
              <p className="text-primary">{"★".repeat(item.rating)}</p>
              <p className="mt-2 text-sm text-gray-600">{item.text}</p>
              <p className="mt-4 text-sm font-semibold text-primaryDark">{item.name}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
};

export default HomePage;

