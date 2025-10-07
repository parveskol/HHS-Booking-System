import React, { useState } from 'react';
import { User, Shield, ArrowRight, Globe, MapPin, Mail, Phone, ExternalLink, MessageCircle, Facebook, Instagram } from 'lucide-react';

interface LandingPageProps {
  onCustomerLogin: () => void;
  onAdminLogin: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onCustomerLogin, onAdminLogin }) => {
  const [isLoading, setIsLoading] = useState<'customer' | 'admin' | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const handleCustomerLogin = () => {
    setIsLoading('customer');
    setTimeout(() => {
      onCustomerLogin();
    }, 500);
  };

  const handleAdminLogin = () => {
    setIsLoading('admin');
    setTimeout(() => {
      onAdminLogin();
    }, 500);
  };

  const handleWebsiteClick = () => {
    window.open('https://www.harvardhousesports.com', '_blank');
  };

  const handleAddressClick = () => {
    window.open('https://maps.app.goo.gl/ZrrNhGJAeecU1xrK9', '_blank');
  };

  const handleEmailClick = () => {
    window.location.href = 'mailto:harvardhousesports@gmail.com';
  };

  const handlePhoneClick = () => {
    const phoneNumber = '+919062008888';
    const message = encodeURIComponent('Hi, help me to add a booking');

    // Try to open WhatsApp first
    const whatsappUrl = `https://wa.me/${phoneNumber.replace(/[^0-9]/g, '')}?text=${message}`;

    // Check if WhatsApp is available
    if (/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
      // Mobile device - try WhatsApp first, fallback to call
      window.open(whatsappUrl, '_blank');
    } else {
      // Desktop - show options
      if (confirm('Open WhatsApp Web? Click Cancel to make a phone call instead.')) {
        window.open(whatsappUrl, '_blank');
      } else {
        window.open(`tel:${phoneNumber}`, '_self');
      }
    }
  };

  const handleWhatsAppClick = () => {
    const phoneNumber = '+919062008888';
    const message = encodeURIComponent('Hi, help me to add a booking');
    const whatsappUrl = `https://wa.me/${phoneNumber.replace(/[^0-9]/g, '')}?text=${message}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleCallClick = () => {
    const phoneNumber = '+919062008888';
    window.open(`tel:${phoneNumber}`, '_self');
  };

  const handleFacebookClick = () => {
    window.open('https://www.facebook.com/pavlionkolkata', '_blank');
  };

  const handleInstagramClick = () => {
    window.open('https://www.instagram.com/harvardhousesports/', '_blank');
  };

  // Touch handlers for mobile slider
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && currentSlide < 1) {
      setCurrentSlide(1);
    }
    if (isRightSwipe && currentSlide > 0) {
      setCurrentSlide(0);
    }
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-500/20 to-purple-600/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-orange-500/20 to-red-600/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-cyan-500/10 to-blue-600/10 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      <div className="w-full max-w-7xl relative z-10 px-3 md:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-1 md:mb-3 animate-fadeInUp max-w-sm mx-auto md:max-w-4xl md:mx-auto px-4">
          <div className="inline-block mb-0.5 md:mb-1">
            <img
              src="logo.png"
              alt="Harvard House Sports Logo"
              className="h-[140px] w-[140px] md:h-[160px] md:w-[160px] mx-auto drop-shadow-lg"
            />
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-display font-bold text-white mb-0.5 md:mb-1 bg-gradient-to-r from-white via-blue-100 to-white bg-clip-text text-transparent animate-slideInUp leading-tight whitespace-nowrap text-center overflow-hidden">
            Harvard House Sports
          </h1>
          <p className="text-blue-200 text-xs md:text-sm font-medium mb-2 md:mb-3 animate-fadeIn">
            53, Matheswartola Road, Kolkata- 700 046
          </p>
          <div className="w-8 md:w-12 h-1 bg-gradient-to-r from-orange-400 to-blue-400 mx-auto mb-2 md:mb-3 rounded-full animate-scaleIn"></div>
          {/* Compact Contact Information */}
          <div className="animate-fadeIn delay-300 mb-4 md:mb-6">
            {/* Desktop Contact Buttons */}
            <div className="hidden md:flex flex-wrap justify-center items-center gap-2 md:gap-3 max-w-2xl mx-auto mt-1">
              <button
                onClick={handleWebsiteClick}
                className="flex items-center justify-center space-x-2 px-3 py-2 bg-white/5 rounded-full border border-white/10 hover:bg-white/10 transition-colors duration-200 group"
              >
                <Globe className="w-4 h-4 text-blue-300 group-hover:text-white flex-shrink-0" />
                <span className="text-xs text-blue-200 group-hover:text-white font-medium">Website</span>
              </button>

              <button
                onClick={handleAddressClick}
                className="flex items-center justify-center space-x-2 px-3 py-2 bg-white/5 rounded-full border border-white/10 hover:bg-white/10 transition-colors duration-200 group"
              >
                <MapPin className="w-4 h-4 text-blue-300 group-hover:text-white flex-shrink-0" />
                <span className="text-xs text-blue-200 group-hover:text-white font-medium">Location</span>
              </button>

              <button
                onClick={handleEmailClick}
                className="flex items-center justify-center space-x-2 px-3 py-2 bg-white/5 rounded-full border border-white/10 hover:bg-white/10 transition-colors duration-200 group"
              >
                <Mail className="w-4 h-4 text-blue-300 group-hover:text-white flex-shrink-0" />
                <span className="text-xs text-blue-200 group-hover:text-white font-medium">Email</span>
              </button>

              <button
                onClick={handlePhoneClick}
                className="flex items-center justify-center space-x-2 px-3 py-2 bg-white/5 rounded-full border border-white/10 hover:bg-white/10 transition-colors duration-200 group"
              >
                <Phone className="w-4 h-4 text-blue-300 group-hover:text-white flex-shrink-0" />
                <span className="text-xs text-blue-200 group-hover:text-white font-medium">Call</span>
              </button>
            </div>

            {/* Mobile Contact Buttons */}
            <div className="mobile-contact-buttons md:hidden">
              <button
                onClick={handleWebsiteClick}
                className="flex items-center justify-center space-x-1.5 xs:space-x-2 px-2 xs:px-2.5 sm:px-3 py-1.5 bg-white/5 rounded-full border border-white/10 hover:bg-white/10 transition-colors duration-200 group min-w-0 flex-1 xs:flex-none"
              >
                <Globe className="w-3 h-3 xs:w-3.5 xs:h-3.5 text-blue-300 group-hover:text-white flex-shrink-0" />
                <span className="text-xs text-blue-200 group-hover:text-white font-medium truncate">Web</span>
              </button>

              <button
                onClick={handleAddressClick}
                className="flex items-center justify-center space-x-1.5 xs:space-x-2 px-2 xs:px-2.5 sm:px-3 py-1.5 bg-white/5 rounded-full border border-white/10 hover:bg-white/10 transition-colors duration-200 group min-w-0 flex-1 xs:flex-none"
              >
                <MapPin className="w-3 h-3 xs:w-3.5 xs:h-3.5 text-blue-300 group-hover:text-white flex-shrink-0" />
                <span className="text-xs text-blue-200 group-hover:text-white font-medium truncate">Map</span>
              </button>

              <button
                onClick={handleEmailClick}
                className="flex items-center justify-center space-x-1.5 xs:space-x-2 px-2 xs:px-2.5 sm:px-3 py-1.5 bg-white/5 rounded-full border border-white/10 hover:bg-white/10 transition-colors duration-200 group min-w-0 flex-1 xs:flex-none"
              >
                <Mail className="w-3 h-3 xs:w-3.5 xs:h-3.5 text-blue-300 group-hover:text-white flex-shrink-0" />
                <span className="text-xs text-blue-200 group-hover:text-white font-medium truncate">Mail</span>
              </button>

              <button
                onClick={handleWhatsAppClick}
                className="flex items-center justify-center space-x-1.5 xs:space-x-2 px-2 xs:px-2.5 sm:px-3 py-1.5 bg-white/5 rounded-full border border-white/10 hover:bg-white/10 transition-colors duration-200 group min-w-0 flex-1 xs:flex-none"
              >
                <MessageCircle className="w-3 h-3 xs:w-3.5 xs:h-3.5 text-green-400 group-hover:text-green-300 flex-shrink-0" />
                <span className="text-xs text-blue-200 group-hover:text-white font-medium truncate">WA</span>
              </button>

              <button
                onClick={handleCallClick}
                className="flex items-center justify-center space-x-1.5 xs:space-x-2 px-2 xs:px-2.5 sm:px-3 py-1.5 bg-white/5 rounded-full border border-white/10 hover:bg-white/10 transition-colors duration-200 group min-w-0 flex-1 xs:flex-none"
              >
                <Phone className="w-3 h-3 xs:w-3.5 xs:h-3.5 text-blue-300 group-hover:text-white flex-shrink-0" />
                <span className="text-xs text-blue-200 group-hover:text-white font-medium truncate">Call</span>
              </button>
            </div>
          </div>
        </div>

        {/* Desktop Grid Layout */}
        <div className="hidden md:grid md:grid-cols-2 gap-4 lg:gap-6 max-w-4xl mx-auto">
          {/* Customer Login Card */}
          <div className="group bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-3 hover:shadow-3xl transition-all duration-500 transform hover:-translate-y-2 hover:scale-105 border border-white/20 animate-slideInLeft delay-200">
            <div className="text-center">
              <div className="relative mb-2.5">
                <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl flex items-center justify-center mx-auto shadow-xl group-hover:shadow-2xl transition-all duration-300 transform group-hover:rotate-6">
                  <User className="w-10 h-10 text-white" />
                </div>
              </div>

              <h2 className="text-lg font-bold text-gray-800 mb-1.5 group-hover:text-orange-600 transition-colors duration-300">
                Customer Portal
              </h2>

              <p className="text-gray-600 mb-3 text-sm leading-relaxed">
                Book sports facilities instantly with real-time availability, manage your reservations, track booking history, and receive instant confirmations for all your sporting needs
              </p>

              <div className="space-y-1.5 mb-3">
                <div className="flex items-center justify-center space-x-2 text-gray-600">
                  <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse"></div>
                  <span className="text-xs font-medium">Real-time availability</span>
                </div>
                <div className="flex items-center justify-center space-x-2 text-gray-600">
                  <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse delay-100"></div>
                  <span className="text-xs font-medium">Instant booking requests</span>
                </div>
                <div className="flex items-center justify-center space-x-2 text-gray-600">
                  <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse delay-200"></div>
                  <span className="text-xs font-medium">Live status updates</span>
                </div>
              </div>

              <button
                onClick={handleCustomerLogin}
                disabled={isLoading !== null}
                className="group/btn w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-2.5 px-3 rounded-2xl font-bold text-sm hover:from-orange-600 hover:to-red-600 focus:outline-none focus:ring-4 focus:ring-orange-300/50 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:scale-100 shadow-lg hover:shadow-xl"
              >
                {isLoading === 'customer' ? (
                  <div className="flex items-center justify-center space-x-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    <span>Accessing Portal...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2">
                    <span>Enter Customer Portal</span>
                    <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform duration-200 flex-shrink-0" />
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* Admin/Management Login Card */}
          <div className="group bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-3 hover:shadow-3xl transition-all duration-500 transform hover:-translate-y-2 hover:scale-105 border border-white/20 animate-slideInRight delay-400">
            <div className="text-center">
              <div className="relative mb-2.5">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-xl group-hover:shadow-2xl transition-all duration-300 transform group-hover:-rotate-6">
                  <Shield className="w-10 h-10 text-white" />
                </div>
              </div>

              <h2 className="text-lg font-bold text-gray-800 mb-1.5 group-hover:text-blue-600 transition-colors duration-300">
                Management Portal
              </h2>

              <p className="text-gray-600 mb-3 text-sm leading-relaxed">
                Oversee all facility bookings, manage customer requests, generate detailed reports, handle payments, and optimize resource allocation with advanced analytics
              </p>

              <div className="space-y-1.5 mb-3">
                <div className="flex items-center justify-center space-x-2 text-gray-600">
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse delay-200"></div>
                  <span className="text-xs font-medium">Request management</span>
                </div>
                <div className="flex items-center justify-center space-x-2 text-gray-600">
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse delay-300"></div>
                  <span className="text-xs font-medium">Advanced analytics</span>
                </div>
                <div className="flex items-center justify-center space-x-2 text-gray-600">
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse delay-400"></div>
                  <span className="text-xs font-medium">Data export tools</span>
                </div>
              </div>

              <button
                onClick={handleAdminLogin}
                disabled={isLoading !== null}
                className="group/btn w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-2.5 px-3 rounded-2xl font-bold text-sm hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-4 focus:ring-blue-300/50 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:scale-100 shadow-lg hover:shadow-xl"
              >
                {isLoading === 'admin' ? (
                  <div className="flex items-center justify-center space-x-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    <span>Accessing Portal...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2">
                    <span>Enter Management Portal</span>
                    <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform duration-200 flex-shrink-0" />
                  </div>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Slider Layout */}
        <div className="md:hidden">
          <div className="relative max-w-sm mx-auto">
            <div
              className="overflow-hidden rounded-3xl"
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
            >
              <div
                className="flex transition-transform duration-300 ease-in-out"
                style={{ transform: `translateX(-${currentSlide * 100}%)` }}
              >
                {/* Customer Portal Slide */}
                <div className="w-full flex-shrink-0">
                  <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-3 border border-white/20 mx-2">
                    <div className="text-center">
                      <div className="relative mb-2">
                        <div className="w-14 h-14 bg-gradient-to-br from-orange-400 to-red-500 rounded-xl flex items-center justify-center mx-auto shadow-xl">
                          <User className="w-7 h-7 text-white" />
                        </div>
                      </div>

                      <h2 className="text-base font-bold text-gray-800 mb-1.5">
                        Customer Portal
                      </h2>

                      <p className="text-gray-600 mb-2.5 text-sm leading-relaxed">
                        Book facilities instantly with real-time availability and track your reservations
                      </p>

                      <div className="space-y-1 mb-2.5">
                        <div className="flex items-center justify-center space-x-2 text-gray-600">
                          <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse"></div>
                          <span className="text-xs font-medium">Real-time availability</span>
                        </div>
                        <div className="flex items-center justify-center space-x-2 text-gray-600">
                          <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse delay-100"></div>
                          <span className="text-xs font-medium">Instant bookings</span>
                        </div>
                      </div>

                      <button
                        onClick={handleCustomerLogin}
                        disabled={isLoading !== null}
                        className="group/btn w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-2 px-3 rounded-2xl font-bold text-sm hover:from-orange-600 hover:to-red-600 focus:outline-none focus:ring-4 focus:ring-orange-300/50 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:scale-100 shadow-lg hover:shadow-xl"
                      >
                        {isLoading === 'customer' ? (
                          <div className="flex items-center justify-center space-x-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                            <span className="text-xs">Accessing Portal...</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center space-x-2">
                            <span className="text-xs">Enter Portal</span>
                            <ArrowRight className="w-3 h-3 group-hover/btn:translate-x-1 transition-transform duration-200 flex-shrink-0" />
                          </div>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Management Portal Slide */}
                <div className="w-full flex-shrink-0">
                  <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-3 border border-white/20 mx-2">
                    <div className="text-center">
                      <div className="relative mb-2">
                        <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mx-auto shadow-xl">
                          <Shield className="w-7 h-7 text-white" />
                        </div>
                      </div>

                      <h2 className="text-base font-bold text-gray-800 mb-1.5">
                        Management Portal
                      </h2>

                      <p className="text-gray-600 mb-2.5 text-sm leading-relaxed">
                        Manage bookings, handle requests, and access advanced analytics tools
                      </p>

                      <div className="space-y-1 mb-2.5">
                        <div className="flex items-center justify-center space-x-2 text-gray-600">
                          <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse delay-200"></div>
                          <span className="text-xs font-medium">Request management</span>
                        </div>
                        <div className="flex items-center justify-center space-x-2 text-gray-600">
                          <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse delay-300"></div>
                          <span className="text-xs font-medium">Advanced analytics</span>
                        </div>
                      </div>

                      <button
                        onClick={handleAdminLogin}
                        disabled={isLoading !== null}
                        className="group/btn w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-2 px-3 rounded-2xl font-bold text-sm hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-4 focus:ring-blue-300/50 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:scale-100 shadow-lg hover:shadow-xl"
                      >
                        {isLoading === 'admin' ? (
                          <div className="flex items-center justify-center space-x-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                            <span className="text-xs">Accessing Portal...</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center space-x-2">
                            <span className="text-xs">Enter Portal</span>
                            <ArrowRight className="w-3 h-3 group-hover/btn:translate-x-1 transition-transform duration-200 flex-shrink-0" />
                          </div>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modern Slider Track Navigation */}
            <div className="flex justify-center mt-4">
               <div className="relative bg-gray-200/50 rounded-full p-1 w-32 h-3 backdrop-blur-sm">
                 {/* Slider Track Background */}
                 <div className="absolute inset-0 bg-gradient-to-r from-gray-100/50 to-gray-200/50 rounded-full"></div>

                 {/* Active Slider Indicator */}
                 <div
                   className={`absolute top-1 h-1 rounded-full transition-all duration-500 ease-in-out ${
                     currentSlide === 0
                       ? 'w-12 bg-gradient-to-r from-orange-400 to-red-500 left-1'
                       : 'w-12 bg-gradient-to-r from-blue-500 to-indigo-600 right-1'
                   } shadow-sm`}
                 >
                   {/* Animated pulse effect */}
                   <div className={`absolute inset-0 rounded-full animate-pulse ${
                     currentSlide === 0 ? 'bg-orange-300' : 'bg-blue-300'
                   } opacity-30`}></div>
                 </div>

                 {/* Clickable Areas */}
                 <button
                   onClick={() => goToSlide(0)}
                   className="absolute left-0 top-0 w-1/2 h-full rounded-l-full hover:bg-white/10 transition-colors duration-200"
                   aria-label="Customer Portal Slide"
                 />

                 <button
                   onClick={() => goToSlide(1)}
                   className="absolute right-0 top-0 w-1/2 h-full rounded-r-full hover:bg-white/10 transition-colors duration-200"
                   aria-label="Management Portal Slide"
                 />

               </div>
             </div>
          </div>
        </div>

        {/* Enhanced Footer */}
        <div className="text-center mt-4 md:mt-6 animate-fadeInUp delay-700">
          <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1 border border-white/20">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse delay-200"></div>
              <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse delay-400"></div>
            </div>
            <span className="text-blue-100 text-xs font-medium">
              Choose your portal to continue
            </span>
          </div>
        </div>

        {/* Social Media Section */}
        <div className="text-center mt-3 md:mt-4 animate-fadeInUp delay-1000">
          <div className="flex justify-center items-center space-x-4">
            <button
              onClick={handleFacebookClick}
              className="flex items-center justify-center w-10 h-10 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 hover:bg-white/20 transition-all duration-300 group transform hover:scale-110"
              aria-label="Follow us on Facebook"
            >
              <Facebook className="w-5 h-5 text-blue-300 group-hover:text-blue-400 transition-colors duration-300" />
            </button>

            <button
              onClick={handleInstagramClick}
              className="flex items-center justify-center w-10 h-10 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 hover:bg-white/20 transition-all duration-300 group transform hover:scale-110"
              aria-label="Follow us on Instagram"
            >
              <Instagram className="w-5 h-5 text-pink-300 group-hover:text-pink-400 transition-colors duration-300" />
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default LandingPage;