import React from 'react';

export default function OfficialOnpoBadge({
  pilgrim = {},
  hotelMakkah = 'فجر نسك أجياد',
  hotelMedina = 'ديوان روز',
  guidePhone1 = '0547.50.52.93',
  guidePhone2 = '+213.558.90.30.11',
  onpoPhone = '0021323777864',
  makkahPhone = '00966555801433',
  medinaPhone = '00966555801866',
  consulatPhone = '0966/120985034/35',
  qrDataUrl = null,
  isPrint = false,
  widthMm = 75,
  heightMm = 120
}) {
  const nom = pilgrim.nomArabe || pilgrim.nom || 'بلحوت';
  const prenom = pilgrim.prenomArabe || pilgrim.prenom || 'دانية';
  const passport = pilgrim.passport || pilgrim.num_passeport || '309170403';
  const photo = pilgrim.photoUrl || pilgrim.photo_url || null;

  return (
    <div
      style={{
        width: isPrint ? `${widthMm}mm` : '290px',
        height: isPrint ? `${heightMm}mm` : '460px',
        boxSizing: 'border-box',
        backgroundColor: '#ffffff',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        borderRadius: isPrint ? '0' : '12px',
        boxShadow: isPrint ? 'none' : '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        border: isPrint ? 'none' : '1px solid #e2e8f0',
        overflow: 'hidden',
        fontFamily: "'Cairo', sans-serif",
        userSelect: 'none'
      }}
      className="official-onpo-badge"
    >
      {/* ── Background Subtle Watermark ── */}
      <div 
        style={{
          position: 'absolute',
          bottom: '36px',
          left: '0',
          right: '0',
          height: '240px',
          opacity: 0.08,
          pointerEvents: 'none',
          backgroundImage: 'radial-gradient(circle at center, #000 10%, transparent 70%)',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          zIndex: 1
        }}
      >
        <svg viewBox="0 0 400 300" width="100%" height="100%" fill="#1e293b" opacity="0.4">
          {/* Subtle outline silhouette of Kaaba & Clock Tower */}
          <rect x="160" y="160" width="80" height="80" rx="4" />
          <polygon points="190,40 210,40 205,160 195,160" />
          <polygon points="195,20 205,20 200,40" />
          <circle cx="200" cy="70" r="10" />
          <rect x="130" y="120" width="15" height="120" />
          <rect x="255" y="120" width="15" height="120" />
        </svg>
      </div>

      {/* ── Inner Content ── */}
      <div style={{ padding: '14px 14px 6px 14px', position: 'relative', zIndex: 2, flex: 1, display: 'flex', flexDirection: 'column' }}>
        
        {/* ── 1. Top Header (Logos Agence & ONPO) ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
          
          {/* Logo Agence El Mokhtar (Left) */}
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '38%' }}>
            <div style={{ height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src="/logo.png" alt="Agence El Mokhtar" style={{ maxHeight: '34px', maxWidth: '85px', objectFit: 'contain' }} />
            </div>
            <span style={{ fontSize: '9px', fontWeight: '800', color: '#0f172a', whiteSpace: 'nowrap', marginTop: '2px' }}>
              المختار للسياحة والسفر
            </span>
          </div>

          {/* Central Arabesque Emblem */}
          <div style={{ color: '#059669', opacity: 0.7, transform: 'scale(0.85)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" />
            </svg>
          </div>

          {/* Logo ONPO (Right) */}
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '48%' }}>
            <div style={{ height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {/* ONPO Algerian Crescent Logo vector */}
              <svg viewBox="0 0 100 80" style={{ height: '34px', width: 'auto' }}>
                <path d="M50 5 C25 5 5 25 5 50 C5 65 15 75 30 78 C18 68 15 50 25 35 C35 20 50 15 65 18 C58 10 50 5 50 5 Z" fill="#15803d" />
                <rect x="42" y="30" width="26" height="26" rx="3" fill="#1e293b" />
                <polygon points="55,18 60,30 50,30" fill="#b45309" />
                <circle cx="55" cy="43" r="5" fill="#f59e0b" />
                <path d="M36 46 A 8 8 0 0 0 36 58 A 6 6 0 0 1 36 46 Z" fill="#dc2626" />
                <polygon points="40,51 42,54 39,53 41,51" fill="#dc2626" />
              </svg>
            </div>
            <span style={{ fontSize: '9.5px', fontWeight: '800', color: '#0f172a', whiteSpace: 'nowrap', marginTop: '2px' }}>
              الديوان الوطني للحج والعمرة
            </span>
            <span style={{ fontSize: '5px', fontWeight: '700', color: '#64748b', letterSpacing: '0.2px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
              THE NATIONAL OFFICE OF PILGRIMAGE AND UMRAH
            </span>
          </div>

        </div>

        {/* ── 2. Pilgrim Photo & Info Section ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px', gap: '10px' }}>
          
          {/* Photo on Left */}
          <div 
            style={{
              width: '88px',
              height: '112px',
              borderRadius: '12px',
              border: '2px solid #cbd5e1',
              backgroundColor: '#f8fafc',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
              flexShrink: 0
            }}
          >
            {photo ? (
              <img src={photo} alt={nom} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ color: '#94a3b8', textAlign: 'center', fontSize: '9px', fontWeight: 'bold' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ margin: '0 auto 4px auto' }}>
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                صورة
              </div>
            )}
          </div>

          {/* Arabic Names & Hotels on Right (RTL) */}
          <div dir="rtl" style={{ flex: 1, textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {/* Nom en Arabe */}
            <div style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a', lineHeight: 1.15 }}>
              {nom}
            </div>

            {/* Prénom en Arabe */}
            <div style={{ fontSize: '16px', fontWeight: '800', color: '#1e293b', lineHeight: 1.15 }}>
              {prenom}
            </div>

            {/* Numéro Passeport */}
            <div style={{ fontSize: '14px', fontWeight: '800', color: '#334155', fontFamily: 'monospace', margin: '2px 0' }}>
              {passport}
            </div>

            {/* Hôtel Makkah */}
            <div style={{ fontSize: '11.5px', fontWeight: '800', color: '#0f172a', lineHeight: 1.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              مكة : <span style={{ fontWeight: '700', color: '#334155' }}>{hotelMakkah}</span>
            </div>

            {/* Hôtel Médine */}
            <div style={{ fontSize: '11.5px', fontWeight: '800', color: '#0f172a', lineHeight: 1.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              المدينة : <span style={{ fontWeight: '700', color: '#334155' }}>{hotelMedina}</span>
            </div>
          </div>

        </div>

        {/* ── 3. Contacts Badge ("أرقام التواصل") ── */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px', marginBottom: '6px' }}>
          <div 
            style={{
              backgroundColor: '#4a6b65',
              color: '#ffffff',
              fontSize: '12.5px',
              fontWeight: '900',
              padding: '2.5px 24px',
              borderRadius: '7px',
              boxShadow: '0 2px 4px rgba(74, 107, 101, 0.25)',
              letterSpacing: '0.3px',
              textAlign: 'center'
            }}
          >
            أرقام التواصل
          </div>
        </div>

        {/* ── 4. Emergency Numbers & Guide Contacts ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          
          {/* Header ONPO Center */}
          <div style={{ textAlign: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '3px' }}>
            <div style={{ fontSize: '11px', fontWeight: '800', color: '#0f172a' }}>
              الديوان الوطني للحج والعمرة
            </div>
            <div style={{ fontSize: '12px', fontWeight: '800', color: '#0f172a', fontFamily: 'monospace', letterSpacing: '0.4px' }}>
              {onpoPhone}
            </div>
          </div>

          {/* Grid: Left (QR & Guide) | Right (Mecca, Medina, Jeddah Consulate) */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '4px', gap: '6px' }}>
            
            {/* Left Column: QR Code + Guide Phones */}
            <div style={{ width: '42%', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <div 
                style={{
                  width: '64px',
                  height: '64px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '4px',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}
              >
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="QR Code" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                ) : (
                  <div style={{ fontSize: '8px', color: '#64748b', fontWeight: 'bold' }}>QR CODE</div>
                )}
              </div>

              {/* Guide Phone Numbers */}
              <div style={{ marginTop: '4px', width: '100%' }}>
                {guidePhone1 && (
                  <div style={{ fontSize: '10px', fontWeight: '900', color: '#0f172a', fontFamily: 'monospace', lineHeight: 1.25 }}>
                    {guidePhone1}
                  </div>
                )}
                {guidePhone2 && (
                  <div style={{ fontSize: '9.5px', fontWeight: '900', color: '#0f172a', fontFamily: 'monospace', lineHeight: 1.25 }}>
                    {guidePhone2}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Holy Places & Consulate Numbers (RTL) */}
            <div dir="rtl" style={{ width: '56%', textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '3px' }}>
              
              {/* Makkah */}
              <div>
                <div style={{ fontSize: '10px', fontWeight: '800', color: '#1e293b', lineHeight: 1.1 }}>
                  مكة المكرمة
                </div>
                <div style={{ fontSize: '10.5px', fontWeight: '800', color: '#0f172a', fontFamily: 'monospace', direction: 'ltr', textAlign: 'right' }}>
                  {makkahPhone}
                </div>
              </div>

              {/* Medina */}
              <div>
                <div style={{ fontSize: '10px', fontWeight: '800', color: '#1e293b', lineHeight: 1.1 }}>
                  المدينة المنورة
                </div>
                <div style={{ fontSize: '10.5px', fontWeight: '800', color: '#0f172a', fontFamily: 'monospace', direction: 'ltr', textAlign: 'right' }}>
                  {medinaPhone}
                </div>
              </div>

              {/* Consulate */}
              <div>
                <div style={{ fontSize: '10px', fontWeight: '800', color: '#1e293b', lineHeight: 1.1 }}>
                  القنصلية العامة بجدة
                </div>
                <div style={{ fontSize: '10px', fontWeight: '800', color: '#0f172a', fontFamily: 'monospace', direction: 'ltr', textAlign: 'right' }}>
                  {consulatPhone}
                </div>
              </div>

            </div>

          </div>

        </div>

      </div>

      {/* ── 5. Dark Footer Bar (Socials & Omra Year) ── */}
      <div 
        style={{
          backgroundColor: '#596b68',
          color: '#ffffff',
          padding: '4px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative',
          zIndex: 3
        }}
      >
        {/* Left: Social Media Icons & URL */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', opacity: 0.9 }}>
            {/* FB */}
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
            {/* X */}
            <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            {/* Insta */}
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" fill="#596b68"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" stroke="#596b68" strokeWidth="2"/></svg>
          </div>
          <span style={{ fontSize: '7px', fontWeight: 'bold', letterSpacing: '0.3px', opacity: 0.85 }}>
            www.onpo.dz
          </span>
        </div>

        {/* Right: Official Omra Arabic Logo ("عمرة 1447 / 1448") */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
          <span style={{ fontSize: '8px', fontWeight: '900', color: '#fef08a' }}>
            عمرة 1448 هـ
          </span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="#ffffff">
            <path d="M12 2L15 9H22L16.5 13.5L18.5 20.5L12 16.5L5.5 20.5L7.5 13.5L2 9H9L12 2Z" />
          </svg>
        </div>
      </div>

    </div>
  );
}

// Générateur HTML autonome pour l'impression haute-définition exacte
export function generateOfficialBadgeHtml(pilgrim = {}, options = {}) {
  const nom = pilgrim.nomArabe || pilgrim.nom || 'بلحوت';
  const prenom = pilgrim.prenomArabe || pilgrim.prenom || 'دانية';
  const passport = pilgrim.passport || pilgrim.num_passeport || '309170403';
  const photo = pilgrim.photoUrl || pilgrim.photo_url || null;

  const hotelMecca = options.hotelMecca || options.hotelMakkah || 'فجر نسك أجياد';
  const hotelMedinah = options.hotelMedinah || options.hotelMedina || 'ديوان روز';
  const telGuide1 = options.guidePhone1 || options.telGuide || '0547.50.52.93';
  const telGuide2 = options.guidePhone2 || '+213.558.90.30.11';
  const onpoPhone = options.onpoPhone || '0021323777864';
  const makkahPhone = options.makkahPhone || '00966555801433';
  const medinaPhone = options.medinaPhone || '00966555801866';
  const consulatPhone = options.consulatPhone || '0966/120985034/35';
  const qrDataUrl = options.qrDataUrl || null;
  const widthMm = options.widthMm || 75;
  const heightMm = options.heightMm || 120;
  const showCutMarks = options.showCutMarks !== false;

  return `
    <div class="official-onpo-card ${showCutMarks ? 'with-cutmarks' : ''}" style="
      width: ${widthMm}mm;
      height: ${heightMm}mm;
      background-color: #ffffff;
      box-sizing: border-box;
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
      font-family: 'Cairo', 'Arial', sans-serif;
      border: ${showCutMarks ? '1px dashed #cbd5e1' : 'none'};
      page-break-inside: avoid;
      break-inside: avoid;
      margin: 0 auto;
    ">
      <!-- Watermark Background -->
      <div style="position: absolute; bottom: 35px; left: 0; right: 0; height: 180px; opacity: 0.05; pointer-events: none; text-align: center; z-index: 1;">
        <svg viewBox="0 0 400 300" width="100%" height="100%" fill="#1e293b">
          <rect x="160" y="160" width="80" height="80" rx="4" />
          <polygon points="190,40 210,40 205,160 195,160" />
          <polygon points="195,20 205,20 200,40" />
          <circle cx="200" cy="70" r="10" />
          <rect x="130" y="120" width="15" height="120" />
          <rect x="255" y="120" width="15" height="120" />
        </svg>
      </div>

      <!-- Main Container -->
      <div style="padding: 12px 12px 4px 12px; position: relative; z-index: 2; flex: 1; display: flex; flex-direction: column;">
        
        <!-- Header Logos -->
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px;">
          <!-- Left: Agence El Mokhtar -->
          <div style="text-align: center; display: flex; flex-direction: column; align-items: center; width: 38%;">
            <div style="height: 32px; display: flex; align-items: center; justify-content: center;">
              <img src="/logo.png" style="max-height: 32px; max-width: 80px; object-fit: contain;" />
            </div>
            <div style="font-size: 8.5px; font-weight: 800; color: #0f172a; margin-top: 2px; white-space: nowrap;">
              المختار للسياحة والسفر
            </div>
          </div>

          <!-- Central Ornament -->
          <div style="color: #059669; opacity: 0.7;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" />
            </svg>
          </div>

          <!-- Right: ONPO -->
          <div style="text-align: center; display: flex; flex-direction: column; align-items: center; width: 48%;">
            <div style="height: 32px; display: flex; align-items: center; justify-content: center;">
              <svg viewBox="0 0 100 80" style="height: 32px; width: auto;">
                <path d="M50 5 C25 5 5 25 5 50 C5 65 15 75 30 78 C18 68 15 50 25 35 C35 20 50 15 65 18 C58 10 50 5 50 5 Z" fill="#15803d" />
                <rect x="42" y="30" width="26" height="26" rx="3" fill="#1e293b" />
                <polygon points="55,18 60,30 50,30" fill="#b45309" />
                <circle cx="55" cy="43" r="5" fill="#f59e0b" />
                <path d="M36 46 A 8 8 0 0 0 36 58 A 6 6 0 0 1 36 46 Z" fill="#dc2626" />
                <polygon points="40,51 42,54 39,53 41,51" fill="#dc2626" />
              </svg>
            </div>
            <div style="font-size: 9px; font-weight: 800; color: #0f172a; margin-top: 2px; white-space: nowrap;">
              الديوان الوطني للحج والعمرة
            </div>
            <div style="font-size: 4.5px; font-weight: 700; color: #64748b; text-transform: uppercase; white-space: nowrap;">
              THE NATIONAL OFFICE OF PILGRIMAGE AND UMRAH
            </div>
          </div>
        </div>

        <!-- Pilgrim Identity & Hotels -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 8px; gap: 8px;">
          <!-- Left Photo -->
          <div style="
            width: 82px;
            height: 105px;
            border-radius: 10px;
            border: 2px solid #cbd5e1;
            background-color: #f8fafc;
            overflow: hidden;
            flex-shrink: 0;
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            ${photo ? `<img src="${photo}" style="width: 100%; height: 100%; object-fit: cover;" />` : `<div style="font-size: 8px; color: #94a3b8; font-weight: bold;">صورة</div>`}
          </div>

          <!-- Right: Text (RTL) -->
          <div dir="rtl" style="flex: 1; text-align: right; display: flex; flex-direction: column; gap: 2px;">
            <div style="font-size: 17px; font-weight: 900; color: #0f172a; line-height: 1.15;">
              ${nom}
            </div>
            <div style="font-size: 15px; font-weight: 800; color: #1e293b; line-height: 1.15;">
              ${prenom}
            </div>
            <div style="font-size: 13.5px; font-weight: 800; color: #334155; font-family: monospace; margin: 1px 0;">
              ${passport}
            </div>
            <div style="font-size: 11px; font-weight: 800; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              مكة : <span style="font-weight: 700; color: #334155;">${hotelMecca}</span>
            </div>
            <div style="font-size: 11px; font-weight: 800; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              المدينة : <span style="font-weight: 700; color: #334155;">${hotelMedinah}</span>
            </div>
          </div>
        </div>

        <!-- Center Contacts Banner -->
        <div style="display: flex; justify-content: center; margin-top: 8px; margin-bottom: 5px;">
          <div style="
            background-color: #4a6b65;
            color: #ffffff;
            font-size: 11.5px;
            font-weight: 900;
            padding: 2px 20px;
            border-radius: 6px;
            text-align: center;
          ">
            أرقام التواصل
          </div>
        </div>

        <!-- Numbers Details -->
        <div style="flex: 1; display: flex; flex-direction: column; gap: 3px;">
          <div style="text-align: center; border-bottom: 1px solid #f1f5f9; padding-bottom: 2px;">
            <div style="font-size: 10px; font-weight: 800; color: #0f172a;">الديوان الوطني للحج والعمرة</div>
            <div style="font-size: 11.5px; font-weight: 800; color: #0f172a; font-family: monospace;">${onpoPhone}</div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-top: 3px;">
            <!-- Left: QR Code + Guide -->
            <div style="width: 42%; display: flex; flex-direction: column; align-items: center; text-align: center;">
              <div style="width: 58px; height: 58px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 3px; padding: 2px; display: flex; align-items: center; justify-content: center;">
                ${qrDataUrl ? `<img src="${qrDataUrl}" style="width: 100%; height: 100%; object-fit: contain;" />` : `<div style="font-size: 7px; color: #64748b; font-weight: bold;">QR</div>`}
              </div>
              <div style="margin-top: 3px; width: 100%;">
                ${telGuide1 ? `<div style="font-size: 9.5px; font-weight: 900; color: #0f172a; font-family: monospace; line-height: 1.2;">${telGuide1}</div>` : ''}
                ${telGuide2 ? `<div style="font-size: 9px; font-weight: 900; color: #0f172a; font-family: monospace; line-height: 1.2;">${telGuide2}</div>` : ''}
              </div>
            </div>

            <!-- Right: Holy Places & Consulate Numbers (RTL) -->
            <div dir="rtl" style="width: 56%; text-align: right; display: flex; flex-direction: column; gap: 2px;">
              <div>
                <div style="font-size: 9.5px; font-weight: 800; color: #1e293b; line-height: 1.1;">مكة المكرمة</div>
                <div style="font-size: 10px; font-weight: 800; color: #0f172a; font-family: monospace; direction: ltr; text-align: right;">${makkahPhone}</div>
              </div>
              <div>
                <div style="font-size: 9.5px; font-weight: 800; color: #1e293b; line-height: 1.1;">المدينة المنورة</div>
                <div style="font-size: 10px; font-weight: 800; color: #0f172a; font-family: monospace; direction: ltr; text-align: right;">${medinaPhone}</div>
              </div>
              <div>
                <div style="font-size: 9.5px; font-weight: 800; color: #1e293b; line-height: 1.1;">القنصلية العامة بجدة</div>
                <div style="font-size: 9.5px; font-weight: 800; color: #0f172a; font-family: monospace; direction: ltr; text-align: right;">${consulatPhone}</div>
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- Footer Bar -->
      <div style="background-color: #596b68; color: #ffffff; padding: 3px 10px; display: flex; align-items: center; justify-content: space-between; position: relative; z-index: 3;">
        <div style="display: flex; alignItems: center; gap: 4px;">
          <span style="font-size: 7px; font-weight: bold; opacity: 0.9;">www.onpo.dz</span>
        </div>
        <div style="display: flex; align-items: center; gap: 3px;">
          <span style="font-size: 7.5px; font-weight: 900; color: #fef08a;">عمرة 1448 هـ</span>
        </div>
      </div>
    </div>
  `;
}

