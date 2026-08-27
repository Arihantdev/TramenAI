import { auth, db } from "./firebase";
import { collection, doc, getDoc, onSnapshot, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { isSignInWithEmailLink, sendSignInLinkToEmail, signInWithEmailLink, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "firebase/auth";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Train, AlertTriangle, Zap, Play, Pause,
  MapPin, MessageSquare, BarChart3, Sparkles, X,
  CheckCircle2, ArrowRight, LayoutGrid, Search, Send,
  Bot, Lightbulb, TrendingUp, Siren, Volume2, VolumeX,
  CloudFog, CloudRain, Thermometer, Sun, Users, Wrench,
  FileText, LogOut, KeyRound, Mail, Shield, ShieldCheck, Eye, EyeOff, Languages, Check, Ticket as TicketIcon, User as UserIcon
} from "lucide-react";
import { LangProvider, useLang, LANGUAGES, LANG_KEY } from "./i18n";
import { normalizeLiveTrainRecords, normalizeIrctcLiveTrain, normalizeRailRadarLiveTrain, normalizeRailRadarStationBoard, normalizeRailRadarRoute } from "./trainData";
import { searchLiveStations, stationKey, withStationCoordinates } from "./liveRailway";
import { getDemoProfile, saveDemoProfile, getNtesInquiry, getPnrStatus, searchDemoTickets, bookDemoTicket, getDemoBookings, cancelDemoBooking } from "./demoRailway";
import { ParticleField, Hero3D, useTilt, Reveal } from "./effects.jsx";
import "./App.css";

/* ============================== THEME / TOKENS ============================== */
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=Noto+Sans+Devanagari:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap');
  .rf-root{--bg:#070b12;--panel:#0d1420;--panel2:#111b2a;--line:#263449;
    --green:#1fcf8f;--amber:#f97316;--red:#ff4d5e;--blue:#3b82f6;--purple:#9b6bff;
    --saffron:#ff9933;--indiagreen:#0e8a4d;
    --text:#edf5ff;--muted:#8d9db3;--mono:'IBM Plex Mono','Courier New',monospace;
    font-family:'Space Grotesk','Noto Sans Devanagari',sans-serif;
    color:var(--text);background:var(--bg);letter-spacing:0;position:relative;isolation:isolate;}
  .rf-root:before{content:"";position:fixed;inset:0;z-index:-2;pointer-events:none;background:radial-gradient(circle at 8% 4%,rgba(0,212,255,.12),transparent 26%),radial-gradient(circle at 92% 92%,rgba(255,43,181,.075),transparent 28%),linear-gradient(135deg,transparent 0 48%,rgba(255,255,255,.018) 48% 49%,transparent 49% 100%);}
  .rf-root:after{content:"";position:fixed;inset:0;z-index:-1;pointer-events:none;opacity:.2;background-image:linear-gradient(rgba(155,190,220,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(155,190,220,.06) 1px,transparent 1px);background-size:40px 40px;mask-image:linear-gradient(to bottom,rgba(0,0,0,.9),transparent 82%);}
  .rf-root.light{--bg:#f5f7fb;--panel:#ffffff;--panel2:#f1f4fa;--line:#e2e7f0;
    --text:#151b28;--muted:#6b7690;}
  .rf-root.light:before{background:radial-gradient(circle at 10% 0%,rgba(244,119,33,.1),transparent 26%),radial-gradient(circle at 90% 80%,rgba(59,130,246,.08),transparent 30%),linear-gradient(135deg,transparent 0 48%,rgba(23,43,77,.025) 48% 49%,transparent 49% 100%);}
  .rf-root.light:after{opacity:.42;background-image:linear-gradient(rgba(23,43,77,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(23,43,77,.035) 1px,transparent 1px);}
  .rf-hi{font-family:'Noto Sans Devanagari','Inter',sans-serif;}
  .rf-tricolor{height:3px;width:100%;flex-shrink:0;
    background:linear-gradient(90deg,var(--saffron) 0%,var(--saffron) 33%,#fff 33%,#fff 66%,var(--indiagreen) 66%,var(--indiagreen) 100%);
    opacity:.85;}
  @keyframes rfPulse{0%{opacity:1;transform:scale(1);}50%{opacity:.4;transform:scale(1.6);}100%{opacity:1;transform:scale(1);}}
  @keyframes rfBlink{0%,100%{opacity:1;}50%{opacity:.25;}}
  @keyframes rfSlideIn{from{opacity:0;transform:translateX(12px);}to{opacity:1;transform:translateX(0);}}
  @keyframes rfFadeUp{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:translateY(0);}}
  @keyframes rfCountGlow{0%{text-shadow:0 0 0 rgba(59,130,246,0);}50%{text-shadow:0 0 14px rgba(59,130,246,.5);}100%{text-shadow:0 0 0 rgba(59,130,246,0);}}
  @keyframes rfAlarmFlash{0%,100%{background:rgba(255,20,30,.30);}50%{background:rgba(255,20,30,.04);}}
  @keyframes rfPageIn{from{opacity:0;transform:translateY(8px);filter:blur(3px);}to{opacity:1;transform:translateY(0);filter:blur(0);}}
  @keyframes rfGlow{0%,100%{box-shadow:0 0 0 rgba(59,130,246,0);}50%{box-shadow:0 0 24px rgba(59,130,246,.16);}}
  @keyframes rfFloat{0%,100%{transform:translateY(0) translateX(0);}33%{transform:translateY(-14px) translateX(8px);}66%{transform:translateY(8px) translateX(-6px);}}
  @keyframes rfFloatSlow{0%,100%{transform:translateY(0) scale(1);}50%{transform:translateY(-22px) scale(1.05);}}
  @keyframes rfDriftBg{0%{background-position:0% 0%,100% 100%;}50%{background-position:100% 40%,0% 60%;}100%{background-position:0% 0%,100% 100%;}}
  @keyframes rfShimmerText{0%{background-position:-200% center;}100%{background-position:200% center;}}
  @keyframes rfPopIn{0%{opacity:0;transform:translateY(18px) scale(.92);}70%{opacity:1;}100%{opacity:1;transform:translateY(0) scale(1);}}
  @keyframes rfSpin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}
  @keyframes rfTwinkle{0%,100%{opacity:.25;}50%{opacity:1;}}
  @keyframes rfUnderline{from{transform:scaleX(0);}to{transform:scaleX(1);}}
  .rf-orb{position:absolute;border-radius:50%;filter:blur(38px);pointer-events:none;animation:rfFloatSlow 9s ease-in-out infinite;}
  .rf-grad-text{background:linear-gradient(90deg,#19e7ff,#9b6bff,#ff2bb5,#19e7ff);background-size:300% auto;-webkit-background-clip:text;background-clip:text;color:transparent;animation:rfShimmerText 5s linear infinite;}
  .rf-pop-in{animation:rfPopIn .6s cubic-bezier(.16,1,.3,1) both;}
  .rf-tilt-card{transition:transform .28s cubic-bezier(.16,1,.3,1),box-shadow .28s ease,border-color .28s ease;}
  .rf-tilt-card:hover{transform:translateY(-4px) scale(1.015);box-shadow:0 18px 40px rgba(0,0,0,.35),0 0 0 1px rgba(59,130,246,.25);border-color:var(--blue)!important;}
  .rf-tilt-card:active{transform:translateY(-1px) scale(1.005);}
  .rf-underline-grow{position:relative;}
  .rf-underline-grow:after{content:"";position:absolute;left:0;right:0;bottom:-3px;height:2px;background:linear-gradient(90deg,var(--blue),var(--purple));transform-origin:left;animation:rfUnderline .7s cubic-bezier(.16,1,.3,1) both;}
  @media (prefers-reduced-motion:reduce){.rf-orb,.rf-grad-text,.rf-pop-in,.rf-tilt-card,.rf-underline-grow:after{animation:none!important;}.rf-tilt-card:hover{transform:none;}}
  @keyframes rf-dome-spin{from{transform:rotateY(0deg);}to{transform:rotateY(360deg);}}
  @keyframes rf-curve-spin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}
  @keyframes rf-splash{0%{transform:translate(-50%,-50%) scale(.2);opacity:.85;}100%{transform:translate(-50%,-50%) scale(2.6);opacity:0;}}
  @keyframes rf-pixel-out{0%{opacity:1;transform:scale(1);}100%{opacity:0;transform:scale(0);}}
  .rf-splash-ripple{position:fixed;border-radius:50%;border:1.5px solid #19e7ff;animation:rf-splash .75s cubic-bezier(.16,1,.3,1) both;}
  .rf-pixel-tile{background:linear-gradient(135deg,#0a1220,#0d1a2b);animation:rf-pixel-out .38s ease both;}
  @media (prefers-reduced-motion:reduce){.rf-dome-spin,.rf-splash-ripple,.rf-pixel-tile{animation:none!important;}}
  .rf-alarm-flash{position:fixed;inset:0;z-index:999;display:flex;align-items:center;justify-content:center;
    pointer-events:none;animation:rfAlarmFlash .55s steps(2) infinite;}
  .rf-mono{font-family:var(--mono);}
  .rf-live-dot{width:7px;height:7px;border-radius:50%;background:var(--green);display:inline-block;animation:rfBlink 1.4s infinite;
    box-shadow:0 0 8px var(--green);}
  .rf-scrollbar::-webkit-scrollbar{width:6px;height:6px;}
  .rf-scrollbar::-webkit-scrollbar-thumb{background:var(--line);border-radius:3px;}
  .rf-fade-up{animation:rfFadeUp .35s ease both;}
  .rf-slide-in{animation:rfSlideIn .3s ease both;}
  .rf-panel{animation:rfPageIn .45s cubic-bezier(.16,1,.3,1) both;box-shadow:0 16px 36px rgba(0,0,0,.2),inset 0 1px rgba(255,255,255,.06);transition:transform .24s cubic-bezier(.16,1,.3,1),box-shadow .24s ease,border-color .24s ease;}
  .rf-panel:hover{transform:perspective(900px) rotateX(.35deg) translateY(-3px);box-shadow:0 22px 48px rgba(0,0,0,.3),inset 0 1px rgba(255,255,255,.09);}
  .rf-topbar{position:relative;z-index:20;backdrop-filter:blur(18px);box-shadow:0 12px 32px rgba(0,0,0,.16);}
  .rf-topbar:after{content:"";position:absolute;left:16px;right:16px;bottom:-1px;height:1px;background:linear-gradient(90deg,transparent,var(--blue),transparent);opacity:.55;}
  .rf-notice{font-family:var(--mono);letter-spacing:.35px;}
  .rf-sidebar{background:linear-gradient(180deg,rgba(17,27,42,.96),rgba(9,14,23,.96))!important;box-shadow:12px 0 32px rgba(0,0,0,.12);}
  .rf-sidebar > button{transition:transform .18s ease,background .18s ease,color .18s ease;}
  .rf-sidebar > button:hover{transform:translateX(3px);background:rgba(59,130,246,.1)!important;color:var(--text)!important;}
  .rf-sidebar-heading{padding:2px 12px 14px;color:#6f8aa5;font:700 9px var(--mono);letter-spacing:1.4px;}
  .rf-modebar{backdrop-filter:blur(16px);box-shadow:0 -12px 30px rgba(0,0,0,.12);}
  .rf-view-canvas{min-width:0;min-height:0;overflow:auto;}
  .rf-card-hover:hover{border-color:var(--blue) !important;transform:translateY(-2px);box-shadow:0 10px 26px rgba(0,0,0,.25);}
  .rf-btn-primary{transition:transform .18s ease, box-shadow .18s ease, filter .18s ease;position:relative;overflow:hidden;}
  .rf-btn-primary:after{content:"";position:absolute;inset:0;transform:translateX(-120%);background:linear-gradient(100deg,transparent,rgba(255,255,255,.25),transparent);transition:transform .5s ease;pointer-events:none;}
  .rf-btn-primary:hover{transform:translateY(-2px);box-shadow:0 7px 20px rgba(59,130,246,.35);filter:saturate(1.12);}
  .rf-btn-primary:hover:after{transform:translateX(120%);}
  .rf-btn-primary:active{transform:translateY(0);}
  .rf-command .rf-kpis{scrollbar-width:none;}
  .rf-command .rf-kpis::-webkit-scrollbar{display:none;}
  .rf-right-rail{width:300px;border-left:1px solid var(--line);padding:14px;display:flex;flex-direction:column;gap:12px;overflow:hidden;min-height:0;min-width:0;}
  .rf-sidebar-panel{min-height:0;flex-shrink:0;}
  .rf-active-trains-panel{flex:1 1 0;min-height:170px;max-height:320px;}
  .rf-conflicts-panel{flex:.9 1 0;min-height:150px;max-height:280px;}
  .rf-recommendation-panel{flex:0 0 auto;min-height:110px;}
  .rf-sidebar-scroll{min-height:0;height:100%;overflow-y:auto;overscroll-behavior:contain;scrollbar-width:thin;}
  .rf-sidebar-scroll::-webkit-scrollbar{width:6px;}
  .rf-sidebar-scroll::-webkit-scrollbar-thumb{background:var(--line);border-radius:4px;}
  .rf-sidebar-link{display:block;width:100%;border:0;border-top:1px solid var(--line);background:transparent;color:var(--blue);font:700 10.5px var(--mono);padding:10px 8px;cursor:pointer;}
  .rf-sidebar-link:hover{background:rgba(59,130,246,.07);color:var(--text);}
  .rf-conflict-scroll{padding-bottom:2px;}
  .rf-event-grid{display:grid;grid-template-columns:1fr 1fr;column-gap:28px;}
  .rf-map-wrap{overflow:hidden;min-width:0;min-height:0;flex:1;display:flex;align-items:center;justify-content:center;position:relative;}
  .rf-map-wrap > .rf-digital-map-svg{display:block;width:100%;height:100%;max-width:100%;max-height:100%;min-width:0;min-height:0;overflow:hidden;}
  .rf-map-source-badge{position:absolute;top:10px;right:14px;z-index:4;padding:5px 8px;border:1px solid currentColor;border-radius:6px;background:rgba(7,16,31,.9);font:700 9px var(--mono);letter-spacing:.45px;}
  .rf-map-controls{position:absolute;right:14px;bottom:14px;z-index:4;display:flex;align-items:center;gap:4px;padding:4px;border:1px solid #315579;border-radius:8px;background:rgba(7,16,31,.94);box-shadow:0 8px 22px rgba(0,0,0,.3);}
  .rf-map-controls button{width:28px;height:28px;padding:0;border:1px solid #315579;border-radius:5px;background:#10243a;color:#dceeff;font:700 16px var(--mono);cursor:pointer;}
  .rf-map-controls button:hover{background:#1a3a59;border-color:#61d6d1;}
  .rf-map-controls span{min-width:42px;text-align:center;color:#88a0b9;font:700 9px var(--mono);}
  .rf-live-empty{position:absolute;inset:50% auto auto 50%;z-index:3;width:min(430px,80%);transform:translate(-50%,-50%);padding:22px;border:1px solid #315579;border-radius:10px;background:rgba(7,16,31,.94);text-align:center;box-shadow:0 16px 34px rgba(0,0,0,.3);}
  .rf-live-empty-title{color:#eef7ff;font:700 12px var(--mono);letter-spacing:.7px;}
  .rf-live-empty-text{margin-top:8px;color:#88a0b9;font-size:11.5px;line-height:1.5;}
  .rf-command-body{overflow:hidden;min-height:0;}
  .rf-kpis>div{flex:1 1 0;min-width:145px;}
  .rf-passenger-shell{background:#f7f8fb;min-height:100%;}
  .rf-passenger-hero{background:#172b4d;color:#fff;border-radius:16px;padding:26px 28px;position:relative;overflow:hidden;}
  .rf-passenger-hero:after{content:"";position:absolute;right:-60px;top:-80px;width:260px;height:260px;border:38px solid rgba(255,153,51,.18);border-radius:50%;}
  .rf-travel-search{display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:8px;background:#fff;padding:8px;border-radius:10px;margin-top:20px;position:relative;z-index:1;box-shadow:0 12px 28px rgba(9,30,66,.22);}
  .rf-travel-search input{border:0;outline:0;background:#f6f7fa;border-radius:7px;padding:12px;color:#172b4d;min-width:0;font-size:12px;}
  .rf-quick-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:16px 0 20px;}
  .rf-quick-action{background:#fff;border:1px solid #e3e7ef;border-radius:11px;padding:15px 12px;text-align:left;cursor:pointer;color:#172b4d;transition:transform .15s,box-shadow .15s;}
  .rf-quick-action:hover{transform:translateY(-2px);box-shadow:0 7px 18px rgba(9,30,66,.1);}
  .rf-quick-action svg{color:#f47721;margin-bottom:10px;}
  .rf-passenger-shell{color:#172b4d;}
  .rf-passenger-dark{background:#070b12!important;color:#edf5ff!important;}
  .rf-passenger-dark .rf-passenger-hero{background:linear-gradient(135deg,#0d1420,#111b2a);border:1px solid #263449;box-shadow:0 16px 36px rgba(0,0,0,.28);}
  .rf-passenger-dark .rf-travel-search{background:#0d1420;box-shadow:0 12px 28px rgba(0,0,0,.35);border:1px solid #263449;}
  .rf-passenger-dark .rf-travel-search input{background:#111b2a;color:#edf5ff;border:1px solid #263449;}
  .rf-passenger-dark .rf-quick-action{background:#0d1420;border-color:#263449;color:#edf5ff;box-shadow:0 10px 24px rgba(0,0,0,.18);}
  .rf-passenger-dark .rf-quick-action:hover{box-shadow:0 10px 24px rgba(0,0,0,.34);}
  .rf-passenger-dark .rf-quick-action div[style*="color: #7b8799"]{color:#8d9db3!important;}
  .rf-passenger-dark .rf-passenger-theme-toggle{background:#111b2a;border-color:#315579;color:#edf5ff;}
  .rf-passenger-dark .rf-passenger-theme-toggle:hover{background:#17263a;border-color:#3b82f6;}
  .rf-passenger-dark .rf-passenger-shell input,.rf-passenger-dark .rf-passenger-shell select,.rf-passenger-dark .rf-passenger-shell textarea{background:#0d1420!important;color:#edf5ff!important;border-color:#263449!important;}
  .rf-passenger-dark .rf-passenger-shell input::placeholder,.rf-passenger-dark .rf-passenger-shell textarea::placeholder{color:#708198;}
  .rf-passenger-dark .rf-passenger-shell option{background:#0d1420;color:#edf5ff;}
  .rf-passenger-theme-toggle{height:34px;border:1px solid #e3e7ef;border-radius:999px;background:#fff;color:#172b4d;padding:0 11px;display:flex;align-items:center;gap:6px;cursor:pointer;font:700 10px var(--mono);letter-spacing:.35px;box-shadow:0 2px 8px rgba(9,30,66,.1);}
  .rf-passenger-theme-toggle:hover{border-color:#3b82f6;box-shadow:0 5px 14px rgba(9,30,66,.12);}

  .rf-passenger-light .rf-passenger-panel{background:#fff!important;border-color:#dfe5ee!important;color:#172b4d!important;box-shadow:0 8px 24px rgba(9,30,66,.07)!important;}
  .rf-passenger-light .rf-passenger-panel > button{background:#fff!important;color:#172b4d!important;border-bottom-color:#eef1f5!important;}
  .rf-passenger-light .rf-passenger-panel > button span{color:#68758a!important;}
  .rf-passenger-dark .rf-passenger-panel{background:linear-gradient(145deg,#0d1a2b,#0a1524)!important;border-color:#263449!important;color:#edf5ff!important;}
  .rf-passenger-dark .rf-passenger-panel > button{background:transparent!important;color:#edf5ff!important;border-bottom-color:#263449!important;}
  .rf-root button:not(:disabled),.rf-root input,.rf-root select,.rf-root textarea{transition:box-shadow .18s ease,border-color .18s ease,background .18s ease;}
  .rf-root input:focus,.rf-root select:focus,.rf-root textarea:focus{border-color:var(--blue) !important;box-shadow:0 0 0 3px rgba(59,130,246,.13);}
  .rf-root button:disabled{opacity:.55;cursor:not-allowed;}
  .rf-live-dot{animation:rfBlink 1.4s infinite,rfGlow 2.4s ease-in-out infinite;}
  @media (prefers-reduced-motion:reduce){.rf-panel,.rf-fade-up,.rf-slide-in,.rf-btn-primary:after{animation:none!important;transition:none!important;}.rf-panel:hover,.rf-btn-primary:hover{transform:none;}}
  .rf-control-shell{overflow:auto!important;scroll-behavior:smooth;overscroll-behavior-y:contain;}
  .rf-control-shell > .rf-control-main{min-height:0;overflow:auto;}
  .rf-control-shell .rf-panel{position:relative;transform-style:preserve-3d;backface-visibility:hidden;}
  .rf-control-shell .rf-panel:before{content:"";position:absolute;inset:0;pointer-events:none;border-radius:inherit;background:linear-gradient(120deg,rgba(255,255,255,.07),transparent 24%,transparent 72%,rgba(59,130,246,.045));opacity:.5;}
  .rf-control-shell .rf-panel > *{position:relative;z-index:1;}
  .rf-control-shell .rf-kpis>div{background:linear-gradient(145deg,rgba(255,255,255,.025),transparent 62%);}
  .rf-section-view{flex:1 1 auto;min-height:clamp(420px,calc(100svh - 190px),760px);min-width:0;overflow-y:auto;overflow-x:hidden;box-sizing:border-box;overscroll-behavior:contain;}
  .rf-tab-scroll{flex:1 1 auto;min-height:0;min-width:0;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;scroll-behavior:smooth;}
  .rf-control-main{min-height:0;min-width:0;overflow:hidden;}
  .rf-control-main > .rf-tab-scroll{height:100%;}
  .rf-command{min-height:0;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;}
  .rf-command-body{flex:0 0 auto!important;min-height:520px!important;}
  .rf-right-rail{overflow-y:auto!important;overflow-x:hidden!important;}
  .rf-control-shell.light .rf-topbar{--panel:#0d1420;--panel2:#111b2a;--line:#263449;--text:#edf5ff;--muted:#8d9db3;color:#edf5ff!important;}
  .rf-control-shell.light .rf-notice{--panel:#0d1420;--panel2:#151613;--line:#33342d;--text:#edf5ff;--muted:#b4ae9d;color:#b4ae9d!important;}
  .rf-intro-grid{position:absolute;inset:0;pointer-events:none;opacity:.38;background-image:linear-gradient(rgba(25,231,255,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(25,231,255,.08) 1px,transparent 1px);background-size:72px 72px;mask-image:radial-gradient(ellipse at center,black,transparent 72%);}
  .rf-intro-scan{position:absolute;left:0;right:0;top:0;height:2px;background:linear-gradient(90deg,transparent,#19e7ff,#ff2bb5,transparent);box-shadow:0 0 18px #19e7ff;animation:rfi-scan 3.4s ease-in-out infinite;opacity:.7;}
  @keyframes rfi-scan{0%,100%{transform:translateY(8vh);opacity:0;}18%,78%{opacity:.75;}50%{transform:translateY(88vh);}}
  @media (prefers-reduced-motion:reduce){.rf-intro-scan{animation:none!important;}}
  @media (max-width:1050px){.rf-control-shell > .rf-control-main{overflow:visible;}.rf-control-shell{overflow:auto!important;}.rf-command{min-height:720px;}.rf-topbar{align-items:flex-start!important;}.rf-view-canvas{flex-direction:column!important;overflow:visible;}.rf-sidebar{width:100%!important;border-right:0!important;border-bottom:1px solid var(--line);display:flex;gap:4px;overflow-x:auto;padding:8px!important;}.rf-sidebar-heading{display:none;}.rf-sidebar>button{flex:0 0 auto;margin:0!important;width:auto!important;}.rf-sidebar>button>div{white-space:nowrap;}}
  @media (max-width:700px){.rf-travel-search{grid-template-columns:1fr 1fr}.rf-travel-search button{grid-column:1/-1}.rf-quick-grid{grid-template-columns:1fr 1fr}.rf-passenger-hero{padding:20px}.rf-passenger-shell{padding-left:14px !important;padding-right:14px !important;}.rf-control-shell .rf-kpis{position:sticky;top:0;z-index:8;background:var(--panel);}.rf-command{min-height:760px;}}
  @media (max-width:1200px){.rf-right-rail{width:270px}.rf-event-grid{grid-template-columns:1fr;}}
  @media (max-width:1050px){
    .rf-command-body{overflow-y:auto;flex-direction:column;}
    .rf-command-body > div:first-child{flex:0 0 auto;min-height:520px;}
    .rf-right-rail{width:auto;border-left:0;border-top:1px solid var(--line);display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);overflow:visible;}
    .rf-recommendation-panel{grid-column:1 / -1;}
  }
    .rf-control-shell > .rf-control-main{overflow-x:hidden!important;overflow-y:auto!important;overscroll-behavior:contain;}
    .rf-control-shell .rf-command{min-height:max-content!important;overflow:visible!important;}
    .rf-control-shell .rf-command-body{overflow:visible!important;}
    .rf-control-shell .rf-event-stream{max-height:none!important;overflow:visible!important;}
    @media (min-width:701px){
      .rf-control-shell .rf-command-body{flex:0 0 520px!important;min-height:520px!important;overflow:visible!important;}
      .rf-control-shell .rf-digital-twin-column{height:520px!important;min-height:520px!important;}
      .rf-control-shell .rf-digital-twin-panel{height:100%!important;min-height:500px!important;}
      .rf-control-shell .rf-right-rail{height:520px!important;overflow-y:auto!important;overflow-x:hidden!important;}
    }
    @media (min-width:1051px){
      .rf-control-shell .rf-right-rail{display:grid;grid-template-rows:minmax(145px,1fr) minmax(130px,1fr) minmax(174px,auto);align-content:stretch;}
      .rf-control-shell .rf-right-rail>.rf-active-trains-panel,.rf-control-shell .rf-right-rail>.rf-conflicts-panel{min-height:0;max-height:none;}
      .rf-control-shell .rf-right-rail>.rf-recommendation-panel{min-height:174px;position:relative;z-index:2;overflow:visible;}
    }
    .rf-control-shell .rf-event-stream{position:relative;z-index:3;background:var(--panel);}
  @media (max-width:650px){
    .rf-right-rail{grid-template-columns:1fr;}
    .rf-recommendation-panel{grid-column:auto;}
    .rf-command-body > div:first-child{min-height:430px;}
  }
  .rf-command{min-height:0;overflow-y:auto;overflow-x:hidden;}
  .rf-command-body{flex:0 0 auto!important;min-height:520px!important;}
  .rf-digital-twin-column{min-height:390px!important;display:flex;}
  .rf-digital-twin-panel{flex:1 1 auto;min-height:360px;}
  .rf-digital-twin-panel > div:last-child{min-height:0;}
  .rf-digital-twin-panel .rf-map-wrap{min-height:300px;}
  .rf-event-stream{max-height:150px!important;overflow-y:auto!important;overflow-x:hidden!important;}
  @media (max-width:1050px){
    .rf-command{overflow:visible;}
    .rf-command-body{min-height:0!important;}
    .rf-digital-twin-column{min-height:430px!important;}
    .rf-digital-twin-panel{min-height:400px;}
    .rf-digital-twin-panel .rf-map-wrap{min-height:340px;}
    .rf-event-stream{max-height:96px!important;}
  }
  @media (max-width:900px){.rf-map-wrap{min-height:420px !important}.rf-kpis{flex-wrap:nowrap}.rf-kpis>div{min-width:120px}.rf-event-stream{max-height:150px !important;}}
  /* Shared command-center theme */
  .rf-control-shell{--bg:#07101f;--panel:#0d1a2b;--panel2:#12243a;--line:#233b57;--text:#eef7ff;--muted:#88a0b9;--blue:#4ca8ff;--purple:#a886ff;--green:#43d6a2;--amber:#ff7a59;--red:#ff6b79;background:var(--bg)!important;}
  .rf-control-shell:before{background:radial-gradient(circle at 16% 0%,rgba(97,214,209,.11),transparent 24%),radial-gradient(circle at 88% 100%,rgba(76,168,255,.11),transparent 28%),linear-gradient(125deg,transparent 0 47%,rgba(255,255,255,.025) 47% 48%,transparent 48% 49%,transparent 49% 100%);}
  .rf-control-shell:after{opacity:.13;background-image:linear-gradient(rgba(244,240,231,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(244,240,231,.08) 1px,transparent 1px);background-size:48px 48px;}
  .rf-control-shell .rf-tricolor{height:3px;background:linear-gradient(90deg,#4ca8ff 0 62%,#43d6a2 62% 86%,#a886ff 86%);opacity:1;}
  .rf-control-shell .rf-topbar{background:rgba(9,22,38,.94)!important;border-bottom:1px solid #294866!important;padding:13px 20px!important;gap:12px!important;box-shadow:0 16px 40px rgba(0,0,0,.3);}
  .rf-control-shell .rf-topbar:after{left:20px;right:20px;background:linear-gradient(90deg,transparent,#4ca8ff 25%,#61d6d1 75%,transparent);}
  .rf-control-shell .rf-notice{color:#b8b4a3!important;background:#151613!important;border-bottom-color:#33342d!important;padding:7px 20px!important;font-size:9px!important;}
  .rf-control-shell .rf-sidebar{background:linear-gradient(180deg,#0d1b2e,#071221)!important;border-right-color:#233b57!important;padding:18px 10px!important;}
  .rf-control-shell .rf-sidebar>button{border-left:2px solid transparent!important;border-radius:10px!important;padding:11px 12px!important;margin-bottom:5px!important;}
  .rf-control-shell .rf-sidebar>button:hover{background:rgba(97,214,209,.08)!important;}
  .rf-control-shell .rf-sidebar>button[aria-current="page"]{background:linear-gradient(90deg,rgba(76,168,255,.2),rgba(76,168,255,.04))!important;border-left-color:#4ca8ff!important;color:#fff!important;}
  .rf-control-shell .rf-panel{border-color:#233b57!important;border-radius:10px!important;background:linear-gradient(145deg,rgba(15,31,51,.98),rgba(10,23,39,.98))!important;box-shadow:0 18px 45px rgba(0,0,0,.28),inset 0 1px rgba(255,255,255,.06)!important;}
  .rf-control-shell .rf-panel:hover{border-color:#6c6040!important;box-shadow:0 25px 60px rgba(0,0,0,.32),inset 0 1px rgba(255,255,255,.1)!important;}
  .rf-control-shell .rf-panel>button{border-bottom-color:#35362e!important;padding:13px 16px!important;}
  .rf-control-shell .rf-panel>button span{letter-spacing:1px!important;color:#b4ae9d!important;}
  .rf-control-shell .rf-kpis{background:rgba(12,13,11,.46);border-bottom-color:#3a3b32!important;}
  .rf-control-shell .rf-kpis>div{padding:16px 18px!important;border-right-color:#35362e!important;background:linear-gradient(145deg,rgba(255,255,255,.035),transparent 60%)!important;}
  .rf-control-shell .rf-kpis>div:nth-child(1) .rf-mono,.rf-control-shell .rf-kpis>div:nth-child(5) .rf-mono{color:#61d6d1!important;}
  .rf-control-shell .rf-kpis>div:nth-child(3) .rf-mono,.rf-control-shell .rf-kpis>div:nth-child(7) .rf-mono{color:#61d6d1!important;}
  .rf-control-shell .rf-right-rail{background:rgba(5,15,27,.32);border-left-color:#233b57!important;padding:16px!important;}
  .rf-control-shell .rf-modebar{background:#0a1728!important;border-top-color:#233b57!important;padding:10px 16px!important;}
  .rf-control-shell .rf-btn-primary{border-radius:10px!important;}
  .rf-control-shell button{border-radius:9px;}
  .rf-command-hero{display:flex;align-items:center;justify-content:space-between;gap:24px;padding:22px 24px;background:linear-gradient(115deg,rgba(13,32,54,.98),rgba(8,20,35,.78));border-bottom:1px solid #203852;}
  .rf-command-eyebrow{display:flex;align-items:center;gap:8px;color:#66c8ff;font:600 10px var(--mono);letter-spacing:1.2px;}
  .rf-command-title{margin-top:8px;color:#f2f8ff;font-size:25px;font-weight:600;letter-spacing:-.5px;}
  .rf-command-subtitle{max-width:560px;margin-top:6px;color:#88a0b9;font-size:13px;line-height:1.5;}
  .rf-network-health-card{display:flex;align-items:center;gap:12px;min-width:250px;padding:10px 14px;border:1px solid #315579;border-radius:10px;background:rgba(5,16,29,.52);box-shadow:inset 0 1px rgba(255,255,255,.06);}
  .rf-health-ring{display:grid;place-items:center;width:58px;height:58px;flex:0 0 auto;border-radius:50%;background:conic-gradient(#4ca8ff var(--health),#203852 0);position:relative;}
  .rf-health-ring:after{content:"";position:absolute;inset:6px;border-radius:50%;background:#0b192b;}
  .rf-health-ring span{position:relative;z-index:1;color:#f4f0e7;font:700 13px var(--mono);}
  .rf-health-label{color:#9c9a8d;font:600 9px var(--mono);letter-spacing:1px;}
  .rf-health-status{margin-top:3px;color:#79d7ad;font-size:13px;font-weight:600;}
  .rf-health-meta{margin-top:4px;color:#888a7d;font-size:10px;}
  .rf-control-shell .rf-map-wrap{background:radial-gradient(circle at 50% 40%,rgba(61,111,103,.18),transparent 64%)!important;}
  @media (min-width:1051px){.rf-control-shell .rf-topbar{display:grid!important;grid-template-columns:205px repeat(8,minmax(max-content,auto)) 1fr;align-items:center;}.rf-control-shell .rf-topbar>div:last-child{grid-column:1/-1;justify-content:flex-end;margin-top:2px;}.rf-control-shell .rf-topbar>div:nth-child(10){justify-self:end;}}
  @media (max-width:1050px){.rf-control-shell .rf-topbar{padding:12px 14px!important;}}
  @media (max-width:700px){.rf-command-hero{align-items:flex-start;flex-direction:column;padding:18px 16px;gap:16px;}.rf-command-title{font-size:22px;}.rf-network-health-card{width:100%;min-width:0;}}
  @media (min-width:701px) and (max-width:1050px){
    .rf-control-shell .rf-topbar{display:flex!important;align-items:center!important;min-height:72px!important;padding:10px 14px!important;gap:10px!important;}
    .rf-control-shell .rf-topbar>div:nth-child(5),.rf-control-shell .rf-topbar>div:nth-child(6),.rf-control-shell .rf-topbar>div:nth-child(7){display:none!important;}
    .rf-control-shell .rf-topbar>div:nth-child(n+2){font-size:10px!important;}
    .rf-control-shell .rf-topbar>div:last-child{margin-left:auto!important;}
    .rf-control-shell .rf-sidebar{display:grid!important;grid-template-columns:repeat(7,minmax(0,1fr));gap:3px!important;overflow:hidden!important;padding:7px!important;}
    .rf-control-shell .rf-sidebar>button{min-width:0!important;margin:0!important;padding:9px 5px!important;text-align:center;}
    .rf-control-shell .rf-sidebar>button>div{justify-content:center!important;gap:5px!important;font-size:10px!important;white-space:nowrap!important;}
    .rf-control-shell .rf-sidebar>button>div svg{width:15px!important;height:15px!important;}
    .rf-command-hero{padding:16px 20px!important;gap:16px!important;}
    .rf-command-title{font-size:22px!important;}
    .rf-network-health-card{min-width:220px!important;padding:8px 11px!important;}
    .rf-health-ring{width:48px!important;height:48px!important;}
    .rf-control-shell .rf-kpis>div{padding:11px 12px!important;min-width:105px!important;}
    .rf-control-shell .rf-kpis .rf-mono{font-size:18px!important;}
  }
  @media (min-width:701px) and (max-width:1050px){
    .rf-control-shell .rf-view-canvas{flex-direction:row!important;overflow:hidden!important;}
    .rf-control-shell .rf-sidebar{width:220px!important;display:block!important;overflow-y:auto!important;overflow-x:hidden!important;border-right:1px solid var(--line)!important;border-bottom:0!important;padding:16px 10px!important;}
    .rf-control-shell .rf-sidebar-heading{display:block!important;}
    .rf-control-shell .rf-sidebar>button{display:flex!important;width:100%!important;margin:0 0 5px!important;padding:11px 12px!important;text-align:left!important;}
    .rf-control-shell .rf-sidebar>button>div{justify-content:flex-start!important;gap:9px!important;font-size:12.5px!important;white-space:normal!important;}
    .rf-control-shell .rf-sidebar>button>div svg{width:14px!important;height:14px!important;}
  }
  @media (min-width:1051px){
    .rf-control-shell .rf-sidebar{position:relative;z-index:30;width:64px!important;flex:0 0 64px!important;overflow:hidden!important;padding:16px 8px!important;transition:width .2s ease,flex-basis .2s ease,box-shadow .2s ease;}
    .rf-control-shell .rf-sidebar:hover,.rf-control-shell .rf-sidebar:focus-within{width:220px!important;flex-basis:220px!important;overflow:visible!important;box-shadow:16px 0 34px rgba(0,0,0,.28);}
    .rf-control-shell .rf-sidebar-heading{padding-left:12px;white-space:nowrap;opacity:0;transition:opacity .15s ease;}
    .rf-control-shell .rf-sidebar:hover .rf-sidebar-heading,.rf-control-shell .rf-sidebar:focus-within .rf-sidebar-heading{opacity:1;}
    .rf-control-shell .rf-sidebar>button{position:relative;justify-content:flex-start;min-height:44px;padding:11px 12px!important;white-space:nowrap;}
    .rf-control-shell .rf-sidebar>button>span{position:absolute;top:3px;right:2px;margin:0!important;z-index:3;transform:translate(0,-1px);} .rf-control-shell .rf-sidebar>button>span>span{font-size:9px!important;padding:2px 5px!important;min-width:18px;text-align:center;line-height:1.2;}
    .rf-control-shell .rf-sidebar>button>div{overflow:hidden;max-width:0;opacity:0;transition:max-width .2s ease,opacity .12s ease;}
    .rf-control-shell .rf-sidebar:hover>button>div,.rf-control-shell .rf-sidebar:focus-within>button>div{max-width:150px;opacity:1;}
    .rf-control-shell .rf-sidebar:hover>button>span,.rf-control-shell .rf-sidebar:focus-within>button>span{position:static;margin-left:auto!important;}
  }

  /* ============================== SAFE V2 VISUAL LAYER ==============================
     Visual-only refinements applied on top of the stable V3 behavior.
     No routing, data, auth, Firebase, live-feed or passenger logic is changed.
  ============================== */
  .rf-control-shell .rf-command-v2{
    background:
      radial-gradient(circle at 18% -12%,rgba(73,188,255,.07),transparent 28%),
      radial-gradient(circle at 84% 112%,rgba(144,90,255,.06),transparent 30%);
  }
  .rf-control-shell .rf-command-v2 .rf-command-hero{
    padding:20px 22px!important;
    background:
      linear-gradient(120deg,rgba(14,37,62,.98),rgba(8,19,33,.88)),
      radial-gradient(circle at 78% 45%,rgba(79,184,255,.08),transparent 34%)!important;
    border-bottom-color:#2a4d6d!important;
  }
  .rf-control-shell .rf-command-v2 .rf-command-title{font-size:27px!important;font-weight:750!important;letter-spacing:-.75px!important;}
  .rf-control-shell .rf-command-v2 .rf-command-subtitle{font-size:12px!important;max-width:680px!important;}
  .rf-control-shell .rf-command-v2 .rf-command-eyebrow{font-size:9px!important;letter-spacing:1.45px!important;}
  .rf-control-shell .rf-command-v2 .rf-network-health-card{min-width:270px;padding:11px 14px;border-color:#3b6385!important;background:rgba(4,13,24,.78)!important;}
  .rf-control-shell .rf-command-v2 .rf-kpis{display:grid!important;grid-template-columns:repeat(7,minmax(125px,1fr));overflow-x:auto!important;background:#07111f!important;}
  .rf-control-shell .rf-command-v2 .rf-kpis>div{min-width:125px!important;padding:14px 15px!important;border-right-color:rgba(53,86,115,.55)!important;}
  .rf-control-shell .rf-command-v2 .rf-kpis>div:nth-child(1),
  .rf-control-shell .rf-command-v2 .rf-kpis>div:nth-child(2),
  .rf-control-shell .rf-command-v2 .rf-kpis>div:nth-child(3){background:linear-gradient(145deg,rgba(79,184,255,.08),transparent 75%)!important;}
  .rf-control-shell .rf-command-v2 .rf-kpis>div:nth-child(4){background:linear-gradient(145deg,rgba(255,139,92,.06),transparent 75%)!important;}
  .rf-control-shell .rf-command-v2 .rf-kpis>div:nth-child(6){background:linear-gradient(145deg,rgba(57,223,171,.06),transparent 75%)!important;}
  .rf-control-shell .rf-command-v2 .rf-kpis .rf-mono{font-size:22px!important;letter-spacing:-.55px!important;}
  .rf-control-shell .rf-command-v2 .rf-digital-twin-column{padding:12px!important;}
  .rf-control-shell .rf-command-v2 .rf-digital-twin-panel{border-color:#315578!important;border-radius:14px!important;box-shadow:0 20px 55px rgba(0,0,0,.28),inset 0 1px rgba(255,255,255,.08)!important;}
  .rf-control-shell .rf-command-v2 .rf-map-wrap{border-radius:12px!important;}
  .rf-control-shell .rf-command-v2 .rf-right-rail{background:linear-gradient(180deg,rgba(5,14,26,.72),rgba(5,10,18,.46))!important;}
  .rf-control-shell .rf-command-v2 .rf-right-rail .rf-panel{background:linear-gradient(145deg,rgba(13,28,47,.98),rgba(8,20,34,.98))!important;border-color:#2d4f6d!important;}
  .rf-control-shell .rf-command-v2 .rf-right-rail .rf-panel:hover{transform:none!important;border-color:#3a658b!important;}
  .rf-control-shell .rf-command-v2 .rf-recommendation-panel{border-color:rgba(169,120,255,.58)!important;background:linear-gradient(145deg,rgba(34,25,62,.98),rgba(17,20,45,.98))!important;}
  .rf-control-shell .rf-command-v2 .rf-event-stream{background:rgba(5,14,25,.72)!important;}

  /* Complaint center: no clipped text, no stacked wall, clear acknowledgement action. */
  .rf-control-shell .rf-complaints-shell{height:100%!important;min-height:0!important;padding:16px 18px!important;box-sizing:border-box!important;}
  .rf-control-shell .rf-complaints-shell > div:first-child > div:first-child{font-size:20px!important;font-weight:800!important;letter-spacing:-.35px!important;}
  .rf-control-shell .rf-complaints-shell > div:first-child > div:nth-child(2){font-size:11.5px!important;line-height:1.5!important;max-width:820px;}
  .rf-control-shell .rf-complaints-kpis{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px!important;margin-bottom:10px!important;}
  .rf-control-shell .rf-complaints-kpis>div{min-width:0!important;}
  .rf-control-shell .rf-correlation{border-color:rgba(169,120,255,.48)!important;background:linear-gradient(115deg,rgba(67,49,114,.34),rgba(22,31,64,.82))!important;border-radius:12px!important;box-shadow:0 14px 30px rgba(0,0,0,.16)!important;}
  .rf-control-shell .rf-correlation-grid{overflow-x:auto!important;flex-wrap:nowrap!important;scrollbar-width:thin;}
  .rf-control-shell .rf-correlation-grid>div{flex:0 0 auto!important;min-width:150px!important;padding:9px 11px!important;border-radius:9px!important;background:rgba(169,120,255,.07)!important;}
  .rf-control-shell .rf-complaints-list{flex:1 1 auto!important;min-height:260px!important;overflow-y:auto!important;overflow-x:hidden!important;padding:2px 4px 12px 0!important;display:flex!important;flex-direction:column!important;gap:10px!important;overscroll-behavior:contain!important;}
  .rf-control-shell .rf-complaint-card{flex:0 0 auto!important;min-height:0!important;height:auto!important;overflow:visible!important;border-color:#2c4b68!important;border-radius:12px!important;background:linear-gradient(145deg,rgba(13,29,48,.98),rgba(7,19,33,.98))!important;box-shadow:0 12px 32px rgba(0,0,0,.22)!important;}
  .rf-control-shell .rf-complaint-card > div{overflow:visible!important;}
  .rf-control-shell .rf-complaint-card button{white-space:normal!important;min-height:36px!important;}
  .rf-control-shell .rf-complaint-card *{overflow-wrap:anywhere;}
  .rf-control-shell .rf-complaint-card .rf-btn-primary{background:linear-gradient(90deg,#39dfab,#29c996)!important;color:#04140d!important;border-color:#39dfab!important;font-weight:900!important;box-shadow:0 8px 22px rgba(57,223,171,.12)!important;}

  /* Analytics: more information density without changing its data flow. */
  .rf-control-shell .rf-analytics-shell{padding:16px!important;}
  .rf-control-shell .rf-analytics-header{margin-bottom:12px;}
  .rf-control-shell .rf-analytics-title{font-size:20px!important;font-weight:800!important;letter-spacing:-.3px;}
  .rf-control-shell .rf-analytics-subtitle{font-size:11px!important;color:var(--muted);margin-top:4px;}
  .rf-control-shell .rf-analytics-grid{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px!important;margin-bottom:12px!important;}
  .rf-control-shell .rf-analytics-grid>div{min-width:0!important;}
  .rf-control-shell .rf-analytics-shell .rf-panel{border-radius:12px!important;}

  @media (min-width:1051px){
    .rf-control-shell .rf-command-v2 .rf-right-rail{width:315px!important;padding:12px!important;gap:10px!important;}
  }
  @media (max-width:1050px){
    .rf-control-shell .rf-complaints-kpis{grid-template-columns:repeat(2,minmax(0,1fr))!important;}
    .rf-control-shell .rf-analytics-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important;}
  }
  @media (max-width:700px){
    .rf-control-shell .rf-command-v2 .rf-command-title{font-size:22px!important;}
    .rf-control-shell .rf-command-v2 .rf-network-health-card{min-width:0!important;width:100%;}
    .rf-control-shell .rf-complaints-kpis{grid-template-columns:1fr 1fr!important;}
    .rf-control-shell .rf-analytics-grid{grid-template-columns:1fr 1fr!important;}
    .rf-control-shell .rf-complaint-card{font-size:11px;}
  }

  /* LIVE/DEMO separation + passenger theme isolation. */
  .rf-control-shell .rf-data-toggle{display:flex!important;align-items:center!important;flex-wrap:nowrap!important;gap:4px!important;white-space:nowrap!important;min-width:max-content!important;}
  .rf-control-shell .rf-data-toggle .rf-toggle-label{white-space:nowrap!important;flex:0 0 auto!important;}
  .rf-control-shell .rf-topbar>div:last-child{display:flex!important;align-items:center!important;flex-wrap:nowrap!important;min-width:max-content!important;}
  .rf-passenger-light{--panel:#ffffff;--panel2:#f6f7fa;--line:#e3e7ef;--text:#172b4d;--muted:#68758a;--bg:#f7f8fb;--blue:#3b9ff5;--green:#20c98a;--amber:#f47721;--red:#e05252;background:var(--bg)!important;color:var(--text)!important;}
  .rf-passenger-light .rf-panel{background:#ffffff!important;border-color:#e3e7ef!important;color:#172b4d!important;box-shadow:0 8px 24px rgba(9,30,66,.07)!important;}
  .rf-passenger-light .rf-panel>button{border-bottom-color:#eef1f5!important;color:#172b4d!important;}
  .rf-passenger-light .rf-panel>button span{color:#68758a!important;}
  .rf-passenger-light .rf-panel input,.rf-passenger-light .rf-panel select,.rf-passenger-light .rf-panel textarea{background:#f6f7fa!important;color:#172b4d!important;border-color:#dfe5ee!important;}
  .rf-passenger-light .rf-panel input::placeholder,.rf-passenger-light .rf-panel textarea::placeholder{color:#8b96a8!important;}
  .rf-passenger-light .rf-fade-up{color:#172b4d;}
  .rf-passenger-dark{--panel:#0d1420;--panel2:#111b2a;--line:#263449;--text:#edf5ff;--muted:#8d9db3;--bg:#070b12;--blue:#4ca8ff;--green:#39dfab;--amber:#ff8b5c;--red:#ff6b79;}
  .rf-passenger-dark .rf-panel{background:linear-gradient(145deg,#0d1a2b,#0a1524)!important;border-color:#263449!important;color:#edf5ff!important;}
  @media (min-width:1051px) and (max-width:1450px){
    .rf-control-shell .rf-topbar{display:flex!important;flex-wrap:nowrap!important;overflow:hidden!important;}
    .rf-control-shell .rf-topbar>div:nth-child(6),.rf-control-shell .rf-topbar>div:nth-child(7){display:none!important;}
    .rf-control-shell .rf-topbar>div:last-child{margin-left:auto!important;}
  }
  @media (max-width:1050px){.rf-control-shell .rf-topbar>div:last-child{flex-wrap:nowrap!important;overflow-x:auto!important;max-width:100%;}}

  /* ============================== PREMIUM ENHANCEMENT LAYER ==============================
     Additive-only visual upgrades (glass, 3D tilt, hero object, particle canvas, reveal).
     Nothing here overrides existing selectors or app behaviour.
  ============================== */
  .rf-glass{background:linear-gradient(145deg,rgba(20,32,50,.6),rgba(10,16,28,.46));backdrop-filter:blur(20px) saturate(150%);-webkit-backdrop-filter:blur(20px) saturate(150%);border:1px solid rgba(124,236,255,.16)!important;box-shadow:0 24px 64px rgba(0,0,0,.38),inset 0 1px rgba(255,255,255,.08);}
  .rf-passenger-light .rf-glass{background:rgba(255,255,255,.68)!important;border-color:rgba(59,130,246,.16)!important;}
  .rf-passenger-dark .rf-glass{background:linear-gradient(145deg,rgba(20,32,50,.62),rgba(10,16,28,.5))!important;border-color:rgba(124,236,255,.14)!important;}
  .rf-particle-canvas{position:absolute;inset:0;z-index:-1;pointer-events:none;}
  .rf-glow-btn{position:relative;isolation:isolate;}
  .rf-glow-btn:before{content:"";position:absolute;inset:-1.5px;z-index:-1;border-radius:inherit;background:linear-gradient(120deg,#19e7ff,#9b6bff,#ff2bb5,#19e7ff);background-size:300% 300%;opacity:0;filter:blur(11px);transition:opacity .3s ease;animation:rfShimmerText 6s linear infinite;}
  .rf-glow-btn:hover:before{opacity:.6;}
  .rf-tilt-live{will-change:transform;}
  .rf-tilt-glare{position:relative;overflow:hidden;}
  .rf-tilt-glare:after{content:"";position:absolute;inset:0;z-index:2;pointer-events:none;border-radius:inherit;opacity:var(--glare-o,0);background:radial-gradient(220px circle at var(--glare-x,50%) var(--glare-y,50%),rgba(255,255,255,.22),transparent 62%);transition:opacity .25s ease;}
  .rf-hero3d{perspective:900px;pointer-events:none;}
  .rf-hero3d-tilt{width:100%;height:100%;transform-style:preserve-3d;}
  .rf-hero3d-spin{position:relative;width:100%;height:100%;transform-style:preserve-3d;animation:rf-hero-spin 18s linear infinite;}
  .rf-hero3d-core{position:absolute;inset:24%;border-radius:50%;background:radial-gradient(circle at 32% 26%,rgba(255,255,255,.95),rgba(124,236,255,.4) 34%,rgba(155,107,255,.28) 64%,transparent 78%);box-shadow:0 0 60px rgba(25,231,255,.4),0 0 130px rgba(155,107,255,.2),inset 0 0 26px rgba(255,255,255,.3);}
  .rf-hero3d-ring{position:absolute;inset:6%;border-radius:50%;border:1px solid rgba(124,236,255,.5);box-shadow:0 0 22px rgba(124,236,255,.2);}
  .rf-hero3d-ring.a{transform:rotateX(72deg);}
  .rf-hero3d-ring.b{border-color:rgba(255,43,181,.4);transform:rotateX(64deg) rotateZ(58deg);}
  .rf-hero3d-ring.c{border-color:rgba(155,107,255,.38);inset:13%;transform:rotateX(60deg) rotateZ(-52deg);}
  .rf-hero3d-shard{position:absolute;top:50%;left:50%;width:9px;height:9px;margin:-4.5px 0 0 -4.5px;background:linear-gradient(135deg,#19e7ff,#9b6bff);clip-path:polygon(50% 0,100% 50%,50% 100%,0 50%);box-shadow:0 0 16px rgba(124,236,255,.6);transform:rotateY(calc(var(--i) * 72deg)) translateZ(118px) rotateX(18deg);}
  @keyframes rf-hero-spin{from{transform:rotateY(0deg) rotateX(6deg);}to{transform:rotateY(360deg) rotateX(6deg);}}
  .rf-quick-action.rf-tilt-live:hover{border-color:#f47721;}
  @media (prefers-reduced-motion:reduce){.rf-hero3d-spin{animation:none!important;}.rf-glow-btn:before{animation:none!important;}}
  @media (max-width:640px){.rf-hero3d{transform:scale(.8);}}
`;

const STATIONS = [
  { id: "RTNP", name: "Ratnapur",      hi: "रत्नपुर",      x: 70,  y: 250, platforms: 3, junction: true },
  { id: "KLYP", name: "Kalyanpur",     hi: "कल्याणपुर",    x: 190, y: 170, platforms: 2 },
  { id: "MDHP", name: "Madhopur",      hi: "माधोपुर",      x: 330, y: 95,  platforms: 2 },
  { id: "DVGR", name: "Devgarh",       hi: "देवगढ़",       x: 480, y: 170, platforms: 3, junction: true },
  { id: "SNGI", name: "Singrauli",     hi: "सिंगरौली",     x: 635, y: 95,  platforms: 2 },
  { id: "BRVP", name: "Bravpur",       hi: "ब्रवपुर",      x: 770, y: 170, platforms: 2 },
  { id: "CHJG", name: "Chandigarh Jn", hi: "चंडीगढ़ जं.",  x: 950, y: 250, platforms: 4, junction: true },
  { id: "SYNG", name: "Suryanagar",    hi: "सूर्यनगर",     x: 185, y: 345, platforms: 2 },
  { id: "TLKN", name: "Bhimgarh",      hi: "भीमगढ़",       x: 335, y: 395, platforms: 2 },
  { id: "JTNP", name: "Jaitpur",       hi: "जैतपुर",       x: 500, y: 365, platforms: 2 },
  { id: "NDLI", name: "Nandoli",       hi: "नंदोली",       x: 655, y: 405, platforms: 2 },
  { id: "PPRD", name: "Pipra Road",    hi: "पिपरा रोड",    x: 810, y: 365, platforms: 3 },
  { id: "ESHP", name: "Eshanpur",      hi: "एशानपुर",      x: 500, y: 265, platforms: 3, junction: true },
  { id: "FTPR", name: "Fatehpur Road", hi: "फतेहपुर रोड",  x: 700, y: 305, platforms: 2 },
  { id: "DHNP", name: "Dhanpur",       hi: "धनपुर",        x: 390, y: 58,  platforms: 2 },
  { id: "RJGR", name: "Rajgarh",       hi: "राजगढ़",        x: 545, y: 58,  platforms: 2 },
  { id: "SNPR", name: "Sonapur",       hi: "सोनापुर",       x: 700, y: 58,  platforms: 2 },
];

const SEGMENTS = [
  { id: "A-01", from: 0,  to: 1,  len: 5, track: "double", block: "A-01" },
  { id: "A-02", from: 1,  to: 2,  len: 5, track: "double", block: "A-02" },
  { id: "A-03", from: 2,  to: 3,  len: 5, track: "single", block: "A-03" },
  { id: "A-04", from: 3,  to: 4,  len: 5, track: "double", block: "A-04" },
  { id: "A-05", from: 4,  to: 5,  len: 5, track: "double", block: "A-05" },
  { id: "A-06", from: 5,  to: 6,  len: 5, track: "double", block: "A-06" },
  { id: "B-01", from: 0,  to: 7,  len: 5, track: "double", block: "B-01" },
  { id: "B-02", from: 7,  to: 8,  len: 5, track: "double", block: "B-02" },
  { id: "B-03", from: 8,  to: 9,  len: 5, track: "single", block: "B-03" },
  { id: "B-04", from: 9,  to: 10, len: 5, track: "double", block: "B-04" },
  { id: "B-05", from: 10, to: 11, len: 5, track: "double", block: "B-05" },
  { id: "B-06", from: 11, to: 6,  len: 5, track: "double", block: "B-06" },
  { id: "C-01", from: 1,  to: 7,  len: 5, track: "double", block: "C-01" },
  { id: "C-02", from: 7,  to: 8,  len: 5, track: "double", block: "C-02" },
  { id: "C-03", from: 8,  to: 12, len: 5, track: "double", block: "C-03" },
  { id: "C-04", from: 12, to: 13, len: 5, track: "single", block: "C-04" },
  { id: "C-05", from: 13, to: 6,  len: 5, track: "double", block: "C-05" },
  { id: "D-01", from: 0,  to: 5,  len: 6, track: "double", block: "D-01" },
  { id: "D-02", from: 5,  to: 14, len: 4, track: "double", block: "D-02" },
  { id: "D-03", from: 14, to: 15, len: 4, track: "double", block: "D-03" },
  { id: "D-04", from: 15, to: 16, len: 4, track: "double", block: "D-04" },
  { id: "D-05", from: 16, to: 13, len: 5, track: "double", block: "D-05" },
  { id: "D-06", from: 13, to: 6,  len: 5, track: "single", block: "D-06" },
];

const SEGMENT_INDEX = Object.fromEntries(SEGMENTS.map((seg, i) => [seg.id, i]));
const ROUTES = {
  R1: { id: "R1", name: "Chandigarh ↔ Ratnapur", short: "R1 NORTH", color: "#38bdf8", stationIds: ["RTNP", "KLYP", "MDHP", "DVGR", "SNGI", "BRVP", "CHJG"], segments: ["A-01", "A-02", "A-03", "A-04", "A-05", "A-06"] },
  R2: { id: "R2", name: "Chandigarh ↔ Ratnapur via Central", short: "R2 CENTRAL", color: "#34d399", stationIds: ["RTNP", "SYNG", "TLKN", "JTNP", "NDLI", "PPRD", "CHJG"], segments: ["B-01", "B-02", "B-03", "B-04", "B-05", "B-06"] },
  R3: { id: "R3", name: "Chandigarh ↔ Ratnapur via Eshanpur", short: "R3 EAST", color: "#a78bfa", stationIds: ["RTNP", "KLYP", "SYNG", "TLKN", "ESHP", "FTPR", "CHJG"], segments: ["A-01", "C-01", "C-02", "C-03", "C-04", "C-05"] },
  R4: { id: "R4", name: "Chandigarh ↔ Ratnapur via Bravpur", short: "R4 EXPRESS", color: "#f59e0b", stationIds: ["RTNP", "BRVP", "DHNP", "RJGR", "SNPR", "FTPR", "CHJG"], segments: ["D-01", "D-02", "D-03", "D-04", "D-05", "D-06"] },
};
const ROUTE_ORDER = Object.keys(ROUTES);
const LIVE_DELHI_STATIONS = [
  { code: "NDLS", name: "New Delhi", city: "Delhi", lat: 28.6428, lng: 77.2195 },
  { code: "DLI", name: "Delhi Junction", city: "Delhi", lat: 28.6647, lng: 77.2013 },
  { code: "NZM", name: "Hazrat Nizamuddin", city: "Delhi", lat: 28.5890, lng: 77.2532 },
  { code: "ANVT", name: "Anand Vihar Terminal", city: "Delhi", lat: 28.6508, lng: 77.3152 },
  { code: "DEE", name: "Delhi Sarai Rohilla", city: "Delhi", lat: 28.6634, lng: 77.1856 },
  { code: "DEC", name: "Delhi Cantt", city: "Delhi", lat: 28.6135, lng: 77.1166 },
  { code: "SSB", name: "Shakurbasti", city: "Delhi", lat: 28.6673, lng: 77.1714 },
  { code: "SZM", name: "Subzi Mandi", city: "Delhi", lat: 28.6666, lng: 77.2074 },
  { code: "DSA", name: "Delhi Shahdara", city: "Delhi", lat: 28.6763, lng: 77.2899 },
  { code: "DSB", name: "Sadar Bazar", city: "Delhi", lat: 28.6573, lng: 77.2030 },
  { code: "DKZ", name: "Delhi Kishanganj", city: "Delhi", lat: 28.6539, lng: 77.1578 },
  { code: "OKA", name: "Okhla", city: "Delhi", lat: 28.5635, lng: 77.2842 },
  { code: "TKJ", name: "Tilak Bridge", city: "Delhi", lat: 28.6265, lng: 77.2327 },
  { code: "CSB", name: "Shivaji Bridge", city: "Delhi", lat: 28.6402, lng: 77.2290 },
  { code: "ANDI", name: "Adarsh Nagar Delhi", city: "Delhi", lat: 28.7026, lng: 77.1767 },
  { code: "NNO", name: "Nangloi", city: "Delhi", lat: 28.6828, lng: 77.0683 },
  { code: "NUR", name: "Narela", city: "Delhi", lat: 28.8524, lng: 77.0921 },
  { code: "PM", name: "Palam", city: "Delhi", lat: 28.5880, lng: 77.0914 },
  { code: "TKD", name: "Tughlakabad", city: "Delhi", lat: 28.5023, lng: 77.2943 },
  { code: "BRSQ", name: "Brar Square", city: "Delhi", lat: 28.6190, lng: 77.1350 },
  { code: "DSJ", name: "Delhi Safdarjung", city: "Delhi", lat: 28.5821, lng: 77.1870 },
  { code: "SDPR", name: "Sardar Patel Road", city: "Delhi", lat: 28.5838, lng: 77.1638 },
  { code: "SMDP", name: "Shahabad Mohammadpur", city: "Delhi", lat: 28.5573, lng: 77.1005 },
  { code: "BWSN", name: "Bijwasan", city: "Delhi-NCR", lat: 28.5284, lng: 77.0525 },
  { code: "PTNR", name: "Patel Nagar", city: "Delhi", lat: 28.6507, lng: 77.1736 },
  { code: "VVB", name: "Vivek Vihar", city: "Delhi", lat: 28.6716, lng: 77.3160 },
  { code: "NOLI", name: "Noli", city: "Ghaziabad", lat: 28.7363, lng: 77.2894 },
  { code: "SBB", name: "Sahibabad", city: "Ghaziabad", lat: 28.6857, lng: 77.3593 },
  { code: "GZB", name: "Ghaziabad Junction", city: "Ghaziabad", lat: 28.6430, lng: 77.4285 },
  { code: "GZN", name: "New Ghaziabad", city: "Ghaziabad", lat: 28.6705, lng: 77.4307 },
  { code: "SNP", name: "Sonipat", city: "Sonipat", lat: 28.9940, lng: 77.0223 },
  { code: "GGN", name: "Gurugram", city: "Gurugram", lat: 28.4950, lng: 77.0430 },
  { code: "FDB", name: "Faridabad", city: "Faridabad", lat: 28.4089, lng: 77.3178 },
  { code: "BVH", name: "Ballabgarh", city: "Faridabad", lat: 28.3418, lng: 77.3239 },
  { code: "AST", name: "Asaoti", city: "Palwal", lat: 28.2570, lng: 77.3050 },
  { code: "PWL", name: "Palwal", city: "Palwal", lat: 28.1488, lng: 77.3259 },
  { code: "PTRD", name: "Pataudi Road", city: "Gurugram", lat: 28.3238, lng: 76.7822 },
  { code: "MDNR", name: "Modinagar", city: "Ghaziabad", lat: 28.8327, lng: 77.5815 },
];

const LIVE_DELHI_CENTER = { lat: 28.63, lng: 77.22 };
const LIVE_SEED_TRAINS = [];

function liveHaversineKm(a, b) {
  if (!a || !b) return Infinity;
  const lat1 = Number(a.lat), lat2 = Number(b.lat);
  const lng1 = Number(a.lng), lng2 = Number(b.lng);
  if (![lat1, lat2, lng1, lng2].every(Number.isFinite)) return Infinity;
  const rad = Math.PI / 180;
  const x = (lng2 - lng1) * rad * Math.cos(((lat1 + lat2) / 2) * rad);
  const y = (lat2 - lat1) * rad;
  return 6371 * Math.sqrt(x * x + y * y);
}

// Build a gently curved SVG path through ordered railway points.
// This changes only geometry rendering; route colors and status colors remain untouched.
function smoothSvgPath(points) {
  const pts = (points || []).filter((p) => Number.isFinite(p?.x) && Number.isFinite(p?.y));
  if (pts.length < 2) return "";
  if (pts.length === 2) return `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)} L ${pts[1].x.toFixed(2)} ${pts[1].y.toFixed(2)}`;
  let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
  for (let i = 0; i < pts.length - 1; i += 1) {
    const current = pts[i];
    const next = pts[i + 1];
    const midX = (current.x + next.x) / 2;
    const midY = (current.y + next.y) / 2;
    if (i === 0) {
      d += ` Q ${current.x.toFixed(2)} ${current.y.toFixed(2)} ${midX.toFixed(2)} ${midY.toFixed(2)}`;
    } else {
      d += ` Q ${current.x.toFixed(2)} ${current.y.toFixed(2)} ${midX.toFixed(2)} ${midY.toFixed(2)}`;
    }
  }
  const last = pts[pts.length - 1];
  d += ` Q ${last.x.toFixed(2)} ${last.y.toFixed(2)} ${last.x.toFixed(2)} ${last.y.toFixed(2)}`;
  return d;
}

// The LIVE map's precise track geometry comes from an external NCR
// infrastructure feed, which can be slow, rate-limited, or unavailable —
// and the per-train route fallback only covers whichever trains are
// currently tracked. Without either of those, stations rendered nothing
// but disconnected dots. This builds a minimum-spanning-tree over the real
// station coordinates so the map always shows *some* connective schematic
// between every visible station. It's an explicit straight-line
// approximation, not a claim about actual track curvature, so it's
// rendered underneath any real geometry and styled/labeled as a schematic.
function buildLiveSchematicNetwork(stations) {
  // Readable network backbone: each real station connects to its two nearest
  // real neighbors. This creates a connected-looking web without inventing a
  // national rail line; provider-backed RailRadar geometry is drawn above it.
  const nodes = (stations || []).filter((st) => Number.isFinite(Number(st?.lat)) && Number.isFinite(Number(st?.lng)));
  if (nodes.length < 2) return [];
  const edgeKeys = new Set();
  const edges = [];
  const MAX_EDGE_KM = 75;
  nodes.forEach((node, i) => {
    const neighbors = nodes
      .map((candidate, j) => ({ j, d: j === i ? Infinity : liveHaversineKm(node, candidate) }))
      .filter((item) => Number.isFinite(item.d) && item.d <= MAX_EDGE_KM)
      .sort((a, b) => a.d - b.d)
      .slice(0, 2);
    neighbors.forEach(({ j }) => {
      const a = Math.min(i, j), b = Math.max(i, j);
      const key = `${a}-${b}`;
      if (edgeKeys.has(key)) return;
      edgeKeys.add(key);
      edges.push([
        { lat: nodes[a].lat, lng: nodes[a].lng },
        { lat: nodes[b].lat, lng: nodes[b].lng },
      ]);
    });
  });
  return edges;
}

const stationById = Object.fromEntries(STATIONS.map((st, i) => [st.id, { ...st, index: i }]));

const getRoute = (train) => ROUTES[train.routeId] || ROUTES.R1;
const getRouteSegmentIndexes = (train) => getRoute(train).segments.map((id) => SEGMENT_INDEX[id]);
const getTrainSegment = (train) => SEGMENTS[train.seg] || SEGMENTS[getRouteSegmentIndexes(train)[0]];



const INITIAL_TRAINS = [
  { id: "12951", name: "SHRISTI SF EXP",  type: "Superfast", dir: "down", seg: 0,  prog: 1.4, delay: 0, load: 540, status: "MOVING", from: "Ratnapur", to: "Chandigarh Jn", crewHours: 3.2, rakeHealth: 92 },
  { id: "22439", name: "MEGHDOOT EXP",    type: "Express",   dir: "down", seg: 1,  prog: 3.0, delay: 0, load: 380, status: "MOVING", from: "Kalyanpur", to: "Devgarh", crewHours: 5.8, rakeHealth: 78 },
  { id: "19024", name: "TARANGINI EXP",   type: "Passenger", dir: "up",   seg: 11, prog: 2.2, delay: 0, load: 260, status: "MOVING", from: "Chandigarh Jn", to: "Ratnapur", crewHours: 7.1, rakeHealth: 64 },
  { id: "12784", name: "UDAYGIRI EXP",    type: "Express",   dir: "down", seg: 7,  prog: 1.8, delay: 0, load: 410, status: "MOVING", from: "Pipra Road", to: "Chandigarh Jn", crewHours: 2.4, rakeHealth: 88 },
  { id: "58402", name: "KAVERI GOODS",    type: "Freight",   dir: "up",   seg: 8,  prog: 3.5, delay: 0, load: 0,   status: "MOVING", from: "Chandigarh Jn", to: "Ratnapur", crewHours: 6.6, rakeHealth: 55 },
  { id: "12626", name: "VIRAAT SF EXP",   type: "Superfast", dir: "down", seg: 3,  prog: 0.8, delay: 0, load: 610, status: "MOVING", from: "Suryanagar", to: "Chandigarh Jn", crewHours: 4.5, rakeHealth: 96 },
  { id: "11078", name: "NARMADA MAIL",    type: "Express",   dir: "up",   seg: 5,  prog: 2.6, delay: 0, load: 430, status: "MOVING", from: "Chandigarh Jn", to: "Ratnapur", crewHours: 4.1, rakeHealth: 90 },
  { id: "12365", name: "GANGA SF",        type: "Superfast", dir: "down", seg: 9,  prog: 1.2, delay: 0, load: 520, status: "MOVING", from: "Eshanpur", to: "Chandigarh Jn", crewHours: 2.9, rakeHealth: 94 },
  { id: "12617", name: "MANAS EXPRESS",   type: "Express",   dir: "down", seg: 4,  prog: 2.1, delay: 0, load: 390, status: "MOVING", from: "Bhimgarh", to: "Chandigarh Jn", crewHours: 5.1, rakeHealth: 83 },
  { id: "16603", name: "MALABAR EXP",     type: "Passenger", dir: "up",   seg: 6,  prog: 0.9, delay: 0, load: 310, status: "MOVING", from: "Chandigarh Jn", to: "Ratnapur", crewHours: 3.8, rakeHealth: 87 },
  { id: "13489", name: "KOSHI EXPRESS",   type: "Passenger", dir: "up",   seg: 3,  prog: 4.0, delay: 0, load: 280, status: "MOVING", from: "Chandigarh Jn", to: "Ratnapur", crewHours: 6.2, rakeHealth: 76 },
  { id: "13204", name: "RAJDHANI LINK",   type: "Superfast", dir: "down", seg: 2,  prog: 2.8, delay: 0, load: 590, status: "MOVING", from: "Madhopur", to: "Chandigarh Jn", crewHours: 2.1, rakeHealth: 97 },
  { id: "15928", name: "BRAHMAPUTRA EXP", type: "Express",   dir: "up",   seg: 1,  prog: 1.1, delay: 0, load: 450, status: "MOVING", from: "Chandigarh Jn", to: "Ratnapur", crewHours: 5.4, rakeHealth: 81 },
  { id: "17412", name: "GODAVARI PASS",   type: "Passenger", dir: "down", seg: 10, prog: 3.1, delay: 0, load: 220, status: "MOVING", from: "Devgarh", to: "Chandigarh Jn", crewHours: 4.8, rakeHealth: 72 },
];

/* Additional rolling-stock mix for the digital twin. These are simulation/demo
   records unless a live Firestore or external feed overrides them. */
const ADDITIONAL_FLEET = [
  { id: "58321", name: "GANGA FREIGHT", type: "Freight", dir: "down", seg: 0, prog: 2.2, delay: 0, load: 0, status: "MOVING", from: "Ratnapur", to: "Chandigarh Jn", crewHours: 2.8, rakeHealth: 91 },
  { id: "70118", name: "NANDI OIL TANKER", type: "Oil Tanker", dir: "up", seg: 4, prog: 1.6, delay: 0, load: 0, status: "MOVING", from: "Bhimgarh", to: "Ratnapur", crewHours: 4.2, rakeHealth: 86 },
  { id: "70124", name: "DEVGARH OIL TANKER", type: "Oil Tanker", dir: "down", seg: 6, prog: 3.2, delay: 0, load: 0, status: "MOVING", from: "Nandoli", to: "Chandigarh Jn", crewHours: 5.0, rakeHealth: 89 },
  { id: "58109", name: "NORTHERN GOODS", type: "Freight", dir: "up", seg: 9, prog: 3.8, delay: 0, load: 0, status: "MOVING", from: "Eshanpur", to: "Ratnapur", crewHours: 6.0, rakeHealth: 80 },
  { id: "12973", name: "CITY LINK EXPRESS", type: "Express", dir: "down", seg: 12, prog: 1.4, delay: 0, load: 470, status: "MOVING", from: "Bravpur", to: "Chandigarh Jn", crewHours: 2.6, rakeHealth: 95 },
  { id: "14621", name: "INTERCITY PASSENGER", type: "Passenger", dir: "up", seg: 7, prog: 2.9, delay: 0, load: 340, status: "MOVING", from: "Pipra Road", to: "Ratnapur", crewHours: 3.4, rakeHealth: 84 },
];

const FLEET = [...INITIAL_TRAINS, ...ADDITIONAL_FLEET].map((train, index) => {
  const routeId = ROUTE_ORDER[index % ROUTE_ORDER.length];
  const route = ROUTES[routeId];
  const routePos = index % route.segments.length;
  const seg = SEGMENT_INDEX[route.segments[routePos]];
  const start = stationById[route.stationIds[0]]?.name || "Ratnapur";
  const end = stationById[route.stationIds[route.stationIds.length - 1]]?.name || "Chandigarh Jn";
  return {
    ...train,
    routeId,
    routePos,
    seg,
    dir: index % 2 === 0 ? "down" : "up",
    from: start,
    to: end,
  };
});

/* -------- platform-clash prediction -------- */
// Deterministic platform assignment (a train can carry an explicit `platform`
// override, e.g. for demo scenarios; otherwise it's hashed from id+station).
function assignPlatform(t, stationIdx) {
  const station = STATIONS[stationIdx];
  if (t.platformPlan?.[station?.id]) return t.platformPlan[station.id];
  if (t.platform) return t.platform;
  const platforms = station?.platforms || 1;
  const s = `${t.id}-${stationIdx}`;
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  return (hash % platforms) + 1;
}
// Minutes-to-arrival at the train's next station, given the sim's fixed
// prog/simMin tick ratio (prog += 0.35*speed, simMin += 0.5*speed per tick).
function getStationPlatformGeometry(stationIdx, platform = 1) {
  const st = STATIONS[stationIdx];
  if (!st) return null;
  const connected = SEGMENTS.find((seg) => seg.from === stationIdx || seg.to === stationIdx);
  const otherIdx = connected ? (connected.from === stationIdx ? connected.to : connected.from) : null;
  const other = otherIdx != null ? STATIONS[otherIdx] : null;
  const dx = other ? other.x - st.x : 1;
  const dy = other ? other.y - st.y : 0;
  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length;
  const uy = dy / length;
  const px = -uy;
  const py = ux;
  const count = st.platforms || 1;
  const spacing = 8;
  const offset = (platform - 1 - (count - 1) / 2) * spacing;
  const cx = st.x + px * (offset + 9);
  const cy = st.y + py * (offset + 9);
  const half = 22;
  return {
    x1: cx - ux * half, y1: cy - uy * half,
    x2: cx + ux * half, y2: cy + uy * half,
    cx, cy,
    connectorX: st.x + px * offset,
    connectorY: st.y + py * offset,
  };
}

function getTrainPlatformPosition(t) {
  if (t.stationIdx == null || t.platform == null) return null;
  const geo = getStationPlatformGeometry(t.stationIdx, t.platform);
  return geo ? { x: geo.cx, y: geo.cy } : null;
}

function isTargetTrackBlocked(trains, current, targetSegIdx, targetDir) {
  return trains.some((other) => {
    if (other.id === current.id || other.status === "ARRIVED" || other.status === "DWELLING") return false;
    if (other.seg !== targetSegIdx) return false;
    const target = SEGMENTS[targetSegIdx];
    // A double-track section has one physical lane per direction.
    if (target.track === "double" && other.dir !== targetDir) return false;
    // Same-direction trains share the same lane and must maintain a protected
    // separation. Opposing movements are blocked on single-track sections.
    if (other.dir === targetDir) return Math.abs(Number(other.prog || 0) - Number(current.prog || 0)) < 1.6;
    return target.track === "single";
  });
}

function isPlatformOccupied(trains, stationIdx, platform, exceptId) {
  return trains.some((t) => t.id !== exceptId && t.status === "DWELLING" && t.stationIdx === stationIdx && t.platform === platform);
}

function trainEta(t) {
  if (t.status === "DWELLING" && t.stationIdx != null) {
    return { stationIdx: t.stationIdx, etaMin: 0, platform: t.platform || assignPlatform(t, t.stationIdx) };
  }
  const seg = getTrainSegment(t);
  if (!seg || t.status === "ARRIVED") return null;
  const stationIdx = t.dir === "down" ? seg.to : seg.from;
  const remaining = Math.max(0, seg.len - t.prog);
  const etaMin = remaining * (0.5 / 0.35);
  return { stationIdx, etaMin, platform: assignPlatform(t, stationIdx) };
}
function findPlatformClashes(trains, clashWindowMin = 1.5) {
  const found = [];
  const active = trains.filter((t) => t.status !== "ARRIVED");
  for (let i = 0; i < active.length; i++) {
    const a = trainEta(active[i]);
    if (!a) continue;
    for (let j = i + 1; j < active.length; j++) {
      const b = trainEta(active[j]);
      if (!b) continue;
      if (a.stationIdx === b.stationIdx && a.platform === b.platform && Math.abs(a.etaMin - b.etaMin) < clashWindowMin) {
        const station = STATIONS[a.stationIdx];
        found.push({
          id: `PC-${station.id}-P${a.platform}-${active[i].id}-${active[j].id}`,
          type: "Platform Clash",
          severity: "CRITICAL",
          block: `${station.id} · PF${a.platform}`,
          segIdx: active[i].seg,
          station, platform: a.platform,
          trains: [active[i].id, active[j].id],
          etaA: a.etaMin, etaB: b.etaMin,
          desc: `${active[i].id} and ${active[j].id} are both due into ${station.name}, platform ${a.platform}, within minutes of each other.`,
        });
      }
    }
  }
  return found;
}


const PRIORITY_RANK = { Superfast: 5, Express: 4, Passenger: 3, "Oil Tanker": 2, Freight: 1 };
const PRIORITY_COLOR = { Superfast: "var(--purple)", Express: "var(--blue)", Passenger: "var(--text)", "Oil Tanker": "var(--amber)", Freight: "var(--muted)" };


const WEATHER_INFO = {
  clear:    { label: "Clear",      hi: "साफ़",      color: "var(--green)", delayRate: 0 },
  fog:      { label: "Dense Fog",  hi: "घना कोहरा", color: "var(--blue)",  delayRate: 0.055 },
  rain:     { label: "Heavy Rain", hi: "भारी वर्षा", color: "var(--amber)", delayRate: 0.038 },
  heatwave: { label: "Heatwave",   hi: "लू",        color: "var(--red)",   delayRate: 0.022 },
};

const KEYWORD_SEVERITY = [
  { words: ["danger", "unsafe", "fire", "smoke", "fell", "injur", "injured"], severity: "HIGH" },
  { words: ["late", "delay", "waiting", "slow", "stuck", "stopped"], severity: "MEDIUM" },
  { words: ["dirty", "clean", "food", "catering", "staff", "rude"], severity: "LOW" },
];

/* ============================== COPILOT REASONING ============================== */
function copilotAnswer(raw, ctx) {
  const { trains, conflicts, decision, applied, complaints, networkHealth, totalDelay, delayedCount, avgDelay, passengerImpact } = ctx;
  const q = raw.toLowerCase();

  const mentioned = trains.find((t) =>
    q.includes(t.id.toLowerCase()) ||
    q.includes(t.name.toLowerCase()) ||
    q.includes(t.name.toLowerCase().split(" ")[0])
  );

  if (mentioned) {
    const t = mentioned;
    const cf = conflicts.find((c) => c.trains.includes(t.id));
    const parts = [
      `${t.id} (${t.name}) is currently ${t.status.toLowerCase()}, running ${t.from} \u2192 ${t.to}${t.delay > 0 ? ` with a delay of ${Math.round(t.delay)} min` : ", on time"}.`,
    ];
    if (cf) parts.push(`It's involved in an active ${cf.severity.toLowerCase()} conflict (${cf.type}) at block ${cf.block} with ${cf.trains.filter((id) => id !== t.id).join(", ")}.`);
    if (decision && decision.hold.id === t.id) parts.push(`The optimizer recommends holding this train for ${decision.holdMin} min at block ${decision.conflict.block}${applied ? " — already applied." : ", not yet applied."}`);
    return parts.join(" ");
  }

  if (/status|summary|overview|how.{0,10}(network|things|corridor)/.test(q)) {
    return `Network health is at ${networkHealth}%. ${trains.filter((t) => t.status !== "ARRIVED").length} trains active, ${delayedCount} delayed (avg ${avgDelay}m), and ${conflicts.length} open conflict${conflicts.length === 1 ? "" : "s"}. Estimated passenger impact: ${passengerImpact.toLocaleString("en-IN")}.`;
  }

  if (/risk|conflict|danger/.test(q)) {
    if (!conflicts.length) return "No active conflicts right now — the corridor is running clean.";
    return conflicts.map((c) => `${c.severity} — ${c.type} at block ${c.block} between ${c.trains.join(" & ")}.`).join(" ");
  }

  if (/recommend|should i|what.{0,12}do|action|resolve/.test(q)) {
    if (decision) return `Latest recommendation: hold ${decision.hold.id} for ${decision.holdMin} min at block ${decision.conflict.block}, letting ${decision.proceed.id} proceed. ${applied ? "Already applied." : "Not yet applied — open the Optimizer tab to apply it."}`;
    if (conflicts.length) return `There ${conflicts.length === 1 ? "is" : "are"} ${conflicts.length} unresolved conflict${conflicts.length === 1 ? "" : "s"}. Run the optimizer to get an explainable hold/proceed recommendation.`;
    return "No conflicts to resolve at the moment — network is stable.";
  }

  if (/complaint/.test(q)) {
    if (!complaints || !complaints.length) return "No passenger complaints logged yet.";
    const high = complaints.filter((c) => c.severity === "HIGH").length;
    return `${complaints.length} complaint${complaints.length === 1 ? "" : "s"} logged, ${high} flagged HIGH severity. ${complaints.filter((c) => c.correlated).length} correlated with live operational events.`;
  }

  if (/delay/.test(q)) {
    return `Total network delay is ${Math.round(totalDelay)} min across ${delayedCount} train${delayedCount === 1 ? "" : "s"} (avg ${avgDelay}m/train).`;
  }

  return 'I can help with network status, conflicts, delay causes for a specific train, or recommended actions — try asking about a train number, e.g. "why is 22439 delayed".';
}

/* ============================== AI COPILOT ============================== */
function CopilotView({ trains, conflicts, decision, applied, complaints, networkHealth, totalDelay, delayedCount, avgDelay, passengerImpact, runOptimizer, applySchedule, setTab }) {
  const { t } = useLang();
  const [messages, setMessages] = useState([
    { role: "ai", text: t("copilotGreeting") },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, typing]);

  const ctx = { trains, conflicts, decision, applied, complaints, networkHealth, totalDelay, delayedCount, avgDelay, passengerImpact };

  const ask = (text) => {
    const q = (text ?? "").trim();
    if (!q) return;
    setMessages((m) => [...m, { role: "user", text: q }]);
    setInput("");
    setTyping(true);
    // eslint-disable-next-line react-hooks/purity
    const delay = 500 + Math.random() * 450;
    setTimeout(() => {
      setMessages((m) => [...m, { role: "ai", text: copilotAnswer(q, ctx) }]);
      setTyping(false);
    }, delay);
  };

  const delayedTrain = trains.find((t) => t.delay > 0);
  const suggestions = [
    "Give me a network status summary",
    "What conflicts are active right now?",
    "What should I do about it?",
    delayedTrain ? `Why is ${delayedTrain.id} delayed?` : (trains[0] ? `Where is ${trains[0].id} right now?` : "What trains are currently active?"),
  ];

  const topConflict = conflicts[0];
  const mostDelayed = [...trains].sort((a, b) => b.delay - a.delay)[0];

  return (
    <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 14, minWidth: 0 }}>
        <Panel title={t("copilot")} icon={Bot} style={{ flex: 1, minHeight: 0 }}
          right={<span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10.5, color: "var(--green)", fontWeight: 700 }}><span className="rf-live-dot" style={{ background: "var(--green)", boxShadow: "0 0 8px var(--green)" }} /> ONLINE</span>}>
          <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <div ref={scrollRef} className="rf-scrollbar" style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              {messages.map((m, i) => (
                <div key={i} className="rf-fade-up" style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                  <div style={{
                    maxWidth: "78%", padding: "9px 13px", borderRadius: 10, fontSize: 12.5, lineHeight: 1.5,
                    background: m.role === "user" ? "var(--blue)" : "var(--panel2)",
                    color: m.role === "user" ? "#fff" : "var(--text)",
                    border: m.role === "user" ? "none" : "1px solid var(--line)",
                  }}>{m.text}</div>
                </div>
              ))}
              {typing && (
                <div style={{ display: "flex", justifyContent: "flex-start" }}>
                  <div style={{ padding: "9px 13px", borderRadius: 10, background: "var(--panel2)", border: "1px solid var(--line)", display: "flex", gap: 4 }}>
                    {[0, 1, 2].map((i) => <span key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--muted)", animation: `rfBlink 1s ${i * 0.15}s infinite` }} />)}
                  </div>
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 6, padding: "8px 12px", flexWrap: "wrap", borderTop: "1px solid var(--line)" }}>
              {suggestions.map((s) => (
                <span key={s} onClick={() => ask(s)} style={{ fontSize: 10.5, padding: "5px 9px", borderRadius: 999, background: "var(--panel2)", border: "1px solid var(--line)", color: "var(--muted)", cursor: "pointer" }}>{s}</span>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, padding: 12, borderTop: "1px solid var(--line)" }}>
              <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && ask(input)}
                placeholder={t("askCopilotPlaceholder")}
                style={{ flex: 1, border: "1px solid var(--line)", borderRadius: 8, background: "var(--panel2)", color: "var(--text)", padding: "9px 12px", fontSize: 12.5, outline: "none" }} />
              <button onClick={() => ask(input)} className="rf-btn-primary" style={{ ...btnGhost, background: "var(--blue)", color: "#fff", borderColor: "var(--blue)" }}><Send size={13} /></button>
            </div>
          </div>
        </Panel>
      </div>

      <div style={{ width: 300, borderLeft: "1px solid var(--line)", padding: 14, display: "flex", flexDirection: "column", gap: 12, overflowY: "auto" }} className="rf-scrollbar">
        <Panel title={t("copilotInsights")} icon={Lightbulb}>
          <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
              <span style={{ color: "var(--muted)" }}>Network health</span>
              <b style={{ color: networkHealth > 80 ? "var(--green)" : networkHealth > 55 ? "var(--amber)" : "var(--red)" }}>{networkHealth}%</b>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
              <span style={{ color: "var(--muted)" }}>Delayed trains</span><b>{delayedCount}</b>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
              <span style={{ color: "var(--muted)" }}>Passenger impact</span><b style={{ color: passengerImpact ? "var(--red)" : "var(--text)" }}>{passengerImpact.toLocaleString("en-IN")}</b>
            </div>
          </div>
        </Panel>

        {topConflict && (
          <Panel title="Priority Alert" icon={AlertTriangle} style={{ borderColor: "var(--red)" }}>
            <div style={{ padding: 12 }}>
              <Badge color={SEV_COLOR[topConflict.severity]} solid>{topConflict.severity}</Badge>
              <div style={{ fontSize: 12.5, fontWeight: 700, margin: "8px 0 4px" }}>{topConflict.type}</div>
              <div style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 10 }}>{topConflict.desc}</div>
              <button onClick={() => { setTab("optimizer"); runOptimizer(); }} className="rf-btn-primary" style={{ ...btnGhost, background: "var(--purple)", color: "#fff", borderColor: "var(--purple)", width: "100%", justifyContent: "center" }}>
                <Sparkles size={12} /> RESOLVE WITH AI
              </button>
            </div>
          </Panel>
        )}

        {mostDelayed && mostDelayed.delay > 0 && (
          <Panel title="Delay Hotspot" icon={TrendingUp}>
            <div style={{ padding: 12 }}>
              <div className="rf-mono" style={{ fontWeight: 800, fontSize: 15 }}>{mostDelayed.id}</div>
              <div style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 6 }}>{mostDelayed.name}</div>
              <div style={{ fontSize: 12 }}>Delay: <b style={{ color: "var(--amber)" }}>+{Math.round(mostDelayed.delay)} min</b></div>
            </div>
          </Panel>
        )}

        {decision && !applied && (
          <Panel title="Pending Recommendation" icon={CheckCircle2}>
            <div style={{ padding: 12 }}>
              <div style={{ fontSize: 12, marginBottom: 8 }}>Hold <b className="rf-mono">{decision.hold.id}</b> for {decision.holdMin}m at {decision.conflict.block}.</div>
              <button onClick={applySchedule} className="rf-btn-primary" style={{ ...btnGhost, background: "var(--green)", color: "#04140c", borderColor: "var(--green)", width: "100%", justifyContent: "center", fontWeight: 800 }}>APPLY SCHEDULE</button>
            </div>
          </Panel>
        )}
      </div>
    </div>
  );
}

/* ============================== SMALL UI ============================== */
const Panel = ({ title, icon: Icon, right, children, style, className = "", bodyClassName = "", bodyStyle = {}, collapsed = false, onToggle }) => (
  <div className={`rf-panel ${className}`.trim()} style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 1px 3px rgba(0,0,0,.12)", ...style }}>
    {title && (
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={!collapsed}
        aria-label={onToggle ? `${collapsed ? "Expand" : "Collapse"} ${title}` : title}
        disabled={!onToggle}
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "10px 14px", border: 0, borderBottom: collapsed ? 0 : "1px solid var(--line)", background: "transparent", color: "inherit", textAlign: "left", cursor: onToggle ? "pointer" : "default", flexShrink: 0 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 700, letterSpacing: .6, textTransform: "uppercase", color: "var(--muted)" }}>
          {Icon && <Icon size={13} />} {title}
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 7, color: "var(--muted)", fontSize: 11 }}>
          {right}
          {onToggle && <span aria-hidden="true" style={{ fontSize: 13, lineHeight: 1 }}>{collapsed ? "▾" : "▴"}</span>}
        </span>
      </button>
    )}
    {!collapsed && <div className={bodyClassName} style={{ flex: 1, minHeight: 0, ...bodyStyle }}>{children}</div>}
  </div>
);

const Badge = ({ children, color = "var(--muted)", solid }) => (
  <span style={{
    fontSize: 10.5, fontWeight: 700, letterSpacing: .4, padding: "3px 8px", borderRadius: 5,
    color: solid ? "#0a0e14" : color, background: solid ? color : `${color}22`, border: solid ? "none" : `1px solid ${color}55`,
    whiteSpace: "nowrap",
  }}>{children}</span>
);

const Kpi = ({ label, value, sub, color = "var(--text)" }) => (
  <div style={{ padding: "12px 16px", borderRight: "1px solid var(--line)", flex: 1, minWidth: 110 }}>
    <div style={{ fontSize: 10.5, color: "var(--muted)", fontWeight: 700, letterSpacing: .5, textTransform: "uppercase", marginBottom: 5 }}>{label}</div>
    <div className="rf-mono" style={{ fontSize: 21, fontWeight: 700, color, animation: "rfCountGlow .6s ease" }}>{value}</div>
    {sub && <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 2 }}>{sub}</div>}
  </div>
);

const SEV_COLOR = { CRITICAL: "var(--red)", HIGH: "var(--red)", WARNING: "var(--amber)", MEDIUM: "var(--amber)", LOW: "var(--blue)", INFO: "var(--blue)" };

/* ============================== MAIN APP ============================== */
const PORTAL_OPTIONS = {
  controller: [["control", "controlRoom", LayoutGrid]],
  copilot: [["copilot", "copilot", Bot]],
  passenger: [["passenger", "passenger", Train]],
};

/* ============================== STAFF ROLES ==============================
   Control Room and Copilot sign in with real Firebase accounts. Each
   account's role ("controller" or "copilot") lives in Firestore at
   staff/{uid}. New team members self-register with one of the invite codes
   below, which only gates which role their own account gets created with —
   see the setup notes shared alongside this change. */
const CONTROL_INVITE_CODE = "RAIL-CTRL-2026";
const COPILOT_INVITE_CODE = "RAIL-COPILOT-2026";
const makeComplaintId = () => `CMP-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

function ControlApp({ role, onLogout, identifier }) {
  const { t, lang, setLang } = useLang();
  const [langOpen, setLangOpen] = useState(false);
  const [tab, setTab] = useState("command");
  const [portal, setPortal] = useState(role === "passenger" ? "passenger" : role === "copilot" ? "copilot" : "control");
  const [weather, setWeather] = useState("clear");
  const [trains, setTrains] = useState(() => {
    try { return localStorage.getItem("rf-data-mode") === "LIVE" ? LIVE_SEED_TRAINS : FLEET; } catch { return FLEET; }
  });
  const [running, setRunning] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [simMin, setSimMin] = useState(9 * 60 + 40);
  const [events, setEvents] = useState([{ t: "09:40:00", msg: "Network command center initialized" }]);
  const [optStage, setOptStage] = useState(null); // null | index while running | 'done'
  const [decision, setDecision] = useState(null);
  const [applied, setApplied] = useState(false);
  const [complaints, setComplaints] = useState([]);
  const [resolvedConflicts, setResolvedConflicts] = useState([]);
  const handledConflictIdsRef = useRef(new Set());
  const resolvingConflictRef = useRef(false);
  const [selectedTrain, setSelectedTrain] = useState("22439");
  const [demoStep, setDemoStep] = useState(0);
  const [drawerTrain, setDrawerTrain] = useState(null);
  const [alarmAcked, setAlarmAcked] = useState(false);
  const [alarmMuted, setAlarmMuted] = useState(() => { try { return localStorage.getItem("rf-alert-silenced") === "1"; } catch { return false; } });
  const [dataMode, setDataMode] = useState(() => {
    try { return localStorage.getItem("rf-data-mode") === "LIVE" ? "LIVE" : "DEMO"; } catch { return "DEMO"; }
  });
  const [dataSource, setDataSource] = useState(() => {
    try { return localStorage.getItem("rf-data-mode") === "LIVE" ? "LIVE RAILRADAR" : "DEMO SIMULATION"; } catch { return "DEMO SIMULATION"; }
  });
  const [liveLastUpdated, setLiveLastUpdated] = useState(null);
  const tickRef = useRef(null);
  const audioCtxRef = useRef(null);
  const prevClashSigRef = useRef("");
  const observedClashIdsRef = useRef(new Set());
  const lastPlatformAlertAtRef = useRef(new Map());
  const processingComplaintIdsRef = useRef(new Set());
  const switchDataMode = useCallback((mode) => {
    const next = mode === "LIVE" ? "LIVE" : "DEMO";
    setDataMode(next);
    try { localStorage.setItem("rf-data-mode", next); } catch { /* storage unavailable */ }
    handledConflictIdsRef.current.clear();
    observedClashIdsRef.current.clear();
    lastPlatformAlertAtRef.current.clear();
    prevClashSigRef.current = "";
    resolvingConflictRef.current = false;
    setResolvedConflicts([]);
    setDecision(null);
    setApplied(false);
    setDrawerTrain(null);
    if (next === "DEMO") {
      setTrains(FLEET);
      setDataSource("DEMO SIMULATION");
      setLiveLastUpdated(null);
      setEvents((ev) => [{ t: "MODE", msg: "Demo simulation enabled — fictional corridor active" }, ...ev].slice(0, 40));
    } else {
      // LIVE starts empty until the authoritative live feed returns records.
      // Never seed or retain demo/synthetic trains in LIVE mode.
      setTrains([]);
      setDataSource("LIVE DATA NOT CONNECTED");
      setLiveLastUpdated(null);
      setEvents((ev) => [{ t: "MODE", msg: "Live data mode enabled — waiting for the authorized RailRadar feed" }, ...ev].slice(0, 40));
    }
  }, []);

  // Firestore train documents are opt-in. LIVE mode defaults to RailRadar so
  // demo/seed Firestore records can never masquerade as real railway data.
  useEffect(() => {
    if (dataMode !== "LIVE" || import.meta.env.VITE_USE_FIRESTORE_LIVE !== "true") return undefined;
    const unsubscribe = onSnapshot(
      collection(db, "train"),
      (snapshot) => {
        if (snapshot.empty) {
          setDataSource("LIVE DATA NOT CONNECTED");
          return;
        }
        const records = normalizeLiveTrainRecords(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))).filter(Boolean);
        if (!records.length) {
          setDataSource("LIVE DATA NOT CONNECTED");
          return;
        }
        setTrains(records);
        setDataSource("FIRESTORE FEED");
        setLiveLastUpdated(new Date());
      },
      () => {
        setDataSource("LIVE DATA NOT CONNECTED");
        setTrains([]);
      }
    );
    return () => unsubscribe();
  }, [dataMode]);

  // Shared live operations adapter. Every interface uses the same snapshot.
  // By default this talks to the bundled
  // Netlify function at /api/live-trains, which proxies RailRadar
  // (https://railradar.in) and keeps RAILRADAR_API_KEY server-side only —
  // no key is ever shipped in the frontend bundle. Set VITE_TRAIN_DATA_URL
  // to point somewhere else (e.g. a different backend) if you don't want
  // RailRadar. The UI keeps the multi-route simulation as a safe fallback
  // when no feed is configured or the live service is unavailable.
  //
  // RailRadar's free sandbox key is capped at 1,000 requests/month, so this
  // deliberately polls a small, bounded set of trains on a slow interval
  // instead of refreshing everything constantly.
  const MAX_LIVE_TRACKED_TRAINS = Number(import.meta.env.VITE_MAX_LIVE_TRAINS) || 4;
  const trainsRef = useRef(trains);
  useEffect(() => { trainsRef.current = trains; }, [trains]);
  useEffect(() => {
    // All interfaces share the same authoritative live snapshot. Passenger
    // mode must not be excluded, otherwise the control room can show live
    // trains while the passenger portal incorrectly reports an empty feed.
    if (dataMode !== "LIVE") return;
    if (import.meta.env.VITE_USE_FIRESTORE_LIVE === "true") return;
    const baseUrl = import.meta.env.VITE_TRAIN_DATA_URL || "/api/live-trains";
    const legacyApiKey = import.meta.env.VITE_RAPIDAPI_KEY; // legacy client-side key path, kept for BC only
    let cancelled = false;

    const load = async () => {
      try {
        // RailRadar discovery: use the real New Delhi live board to discover
        // actual trains. This avoids inventing train numbers when LIVE mode
        // starts with an empty train list. One request per polling cycle.
        if (baseUrl === "/api/live-trains" && !legacyApiKey && trainsRef.current.length === 0) {
          const res = await fetch(`${baseUrl}?action=station-live&station=NDLS&hours=8&includeIntermediate=true`);
          if (res.status === 503) {
            setTrains([]);
            setLiveLastUpdated(null);
            setDataSource("LIVE DATA NOT CONNECTED");
            return;
          }
          if (res.ok) {
            const board = await res.json();
            const lookup = Object.fromEntries(LIVE_DELHI_STATIONS.map((x) => [x.code, x]));
            const discovered = normalizeRailRadarStationBoard(board, lookup)
              .filter((train) => train.status !== "ARRIVED" && train.status !== "CANCELLED")
              .slice(0, MAX_LIVE_TRACKED_TRAINS);
            if (cancelled) return;
            if (discovered.length) {
              const hydrated = await Promise.all(discovered.map(async (boardRecord) => {
                try {
                  const liveRes = await fetch(`${baseUrl}?train=${encodeURIComponent(boardRecord.id)}`);
                  const routeRes = await fetch(`${baseUrl}?action=route&train=${encodeURIComponent(boardRecord.id)}`);
                  const liveRecord = liveRes.ok ? normalizeRailRadarLiveTrain(await liveRes.json()) : null;
                  const routeRecord = routeRes.ok ? normalizeRailRadarRoute(await routeRes.json()) : null;
                  return {
                    ...boardRecord,
                    ...(liveRecord || {}),
                    routePoints: routeRecord?.routePoints?.length > 1 ? routeRecord.routePoints : (liveRecord?.routePoints || boardRecord.routePoints || []),
                    routeStops: routeRecord?.routeStops?.length ? routeRecord.routeStops : (liveRecord?.routeStops || boardRecord.routeStops || []),
                    latitude: Number.isFinite(Number(liveRecord?.latitude)) ? Number(liveRecord.latitude) : boardRecord.latitude,
                    longitude: Number.isFinite(Number(liveRecord?.longitude)) ? Number(liveRecord.longitude) : boardRecord.longitude,
                  };
                } catch {
                  return boardRecord;
                }
              }));
              if (cancelled) return;
              setTrains(hydrated);
              setDataSource("LIVE RAILRADAR");
              setLiveLastUpdated(new Date());
              return;
            }
            if (!cancelled) {
              setTrains([]);
              setLiveLastUpdated(null);
              setDataSource("LIVE DATA NOT CONNECTED");
            }
          }
        }

        // Legacy path: a fully custom bulk endpoint that returns every train
        // in one response (no per-train polling, no key needed here).
        if (baseUrl !== "/api/live-trains" && !legacyApiKey) {
          const res = await fetch(baseUrl);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const json = await res.json();
          const records = normalizeLiveTrainRecords(Array.isArray(json) ? json : (json.trains || json.data || []));
          if (cancelled) return;
          if (!records.length) {
            setTrains([]);
            setLiveLastUpdated(null);
            setDataSource("LIVE DATA NOT CONNECTED");
            return;
          }
          setTrains(records);
          setDataSource("AUTHORIZED LIVE API");
          setLiveLastUpdated(new Date());
          return;
        }

        // Legacy path: a RapidAPI-style provider called directly from the
        // browser with a client-side key. Not recommended (the key ships in
        // the bundle) — kept only so older configs keep working.
        if (legacyApiKey && baseUrl !== "/api/live-trains") {
          const host = new URL(baseUrl).hostname;
          const updates = [];
          for (const train of trainsRef.current.slice(0, MAX_LIVE_TRACKED_TRAINS)) {
            if (cancelled) return;
            try {
              const res = await fetch(`${baseUrl.replace(/\/$/, "")}/${encodeURIComponent(train.id)}/status`, {
                headers: { "x-rapidapi-host": host, "x-rapidapi-key": legacyApiKey },
              });
              if (!res.ok) continue;
              const mapped = normalizeIrctcLiveTrain(await res.json());
              if (mapped) updates.push(mapped);
            } catch {
              // One unavailable train must not break the rest of the dashboard.
            }
          }
          if (cancelled) return;
          if (!updates.length) {
            setTrains([]);
            setLiveLastUpdated(null);
            setDataSource("LIVE DATA NOT CONNECTED");
            return;
          }
          setTrains((prev) => prev.map((t) => {
            const live = updates.find((u) => String(u.id) === String(t.id));
            return live ? { ...t, ...live } : t;
          }));
          setDataSource("AUTHORIZED LIVE API");
          setLiveLastUpdated(new Date());
          return;
        }

        // Default path: RailRadar via the same-origin Netlify function.
        // One request per tracked train number (RailRadar has no bulk "all
        // live trains" endpoint), capped to protect the monthly quota.
        const updates = [];
        let sawConfigured = false;
        for (const train of trainsRef.current.slice(0, MAX_LIVE_TRACKED_TRAINS)) {
          if (cancelled) return;
          try {
            const res = await fetch(`${baseUrl}?train=${encodeURIComponent(train.id)}`);
            if (res.status === 503) continue; // no RAILRADAR_API_KEY configured server-side yet
            sawConfigured = true;
            if (!res.ok) continue;
            const mapped = normalizeRailRadarLiveTrain(await res.json());
            if (mapped) updates.push(mapped);
          } catch {
            // One unavailable train must not break the rest of the dashboard.
          }
        }
        if (cancelled) return;
        if (!sawConfigured) {
          setTrains([]);
          setLiveLastUpdated(null);
          setDataSource("LIVE DATA NOT CONNECTED");
          return;
        }
        if (!updates.length) {
          setTrains([]);
          setLiveLastUpdated(null);
          setDataSource("LIVE DATA NOT CONNECTED");
          return;
        }
        setTrains((prev) => prev.map((t) => {
          const live = updates.find((u) => String(u.id) === String(t.id));
          if (!live) return t;
          return {
            ...t,
            ...live,
            latitude: Number.isFinite(Number(live.latitude)) ? Number(live.latitude) : t.latitude,
            longitude: Number.isFinite(Number(live.longitude)) ? Number(live.longitude) : t.longitude,
            ...(t.simulatedDisruption ? { status: t.simulatedDisruption.status || t.status } : {}),
          };
        }));
        setDataSource("AUTHORIZED LIVE API");
        setLiveLastUpdated(new Date());
      } catch (error) {
        console.warn("Live train feed unavailable.", error);
        if (!cancelled) {
          setTrains([]);
          setLiveLastUpdated(null);
          setDataSource("LIVE DATA NOT CONNECTED");
        }
      }
    };

    // Discover immediately. The RailRadar station-board request works even
    // when the live train list is empty.
    load();

    // Quota math: the free RailRadar sandbox is 1,000 requests/month.
    // One discovery request + up to 4 live-train and 4 route requests every 4 hours is
    // kept within the free sandbox budget for a normal hackathon demo session. The UI therefore
    // favors a trustworthy periodic snapshot over fake second-by-second motion.
    const pollMs = Math.max(60000, Number(import.meta.env.VITE_TRAIN_DATA_POLL_MS) || 14400000);
    const timer = setInterval(load, pollMs);
    return () => { cancelled = true; clearInterval(timer); };
  }, [role, dataMode]);

  // Real-time passenger complaint feed. Every connected client listens to the
  // same Firestore collection, so a complaint submitted from another computer
  // appears here without a page refresh.
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "complaints"),
      (snapshot) => {
        const next = snapshot.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => {
            const at = a.createdAt?.toMillis?.() || 0;
            const bt = b.createdAt?.toMillis?.() || 0;
            return bt - at;
          });
        setComplaints(next);
      },
      (error) => {
        console.error("Complaint sync failed:", error);
      }
    );
    return () => unsubscribe();
  }, []);
  const addEvent = useCallback((msg) => {
    setSimMin((m) => {
      const hh = String(Math.floor(m / 60) % 24).padStart(2, "0");
      const mm = String(Math.floor(m % 60)).padStart(2, "0");
      const ss = String(Math.floor((m % 1) * 60)).padStart(2, "0");
      setEvents((ev) => [{ t: `${hh}:${mm}:${ss}`, msg }, ...ev].slice(0, 40));
      return m;
    });
  }, []);

  /* -------- simulation tick -------- */
  useEffect(() => {
    if (!running || dataMode !== "DEMO") return;
    tickRef.current = setInterval(() => {
      setSimMin((m) => m + 0.5 * speed);
      const weatherDelay = WEATHER_INFO[weather].delayRate * speed;
      setTrains((prev) => {
        const next = [];
        const movingReservations = new Set();
        const ordered = [...prev].sort((a, b) => String(a.id).localeCompare(String(b.id)));

        ordered.forEach((t) => {
          if (t.status === "ARRIVED") { next.push(t); return; }
          const crewHours = Math.min(14, (t.crewHours ?? 0) + 0.012 * speed);
          const rakeHealth = Math.max(30, (t.rakeHealth ?? 90) - 0.01 * speed);

          // A platform is a real occupancy state in the simulation. A train
          // remains on its assigned platform for a short dwell before it can
          // enter the next protected block.
          if (t.status === "DWELLING") {
            const dwellTicks = Math.max(0, Number(t.dwellTicks || 0) - 1);
            if (dwellTicks > 0) {
              next.push({ ...t, dwellTicks, crewHours, rakeHealth });
              return;
            }
            const route = getRoute(t);
            const routeIndexes = getRouteSegmentIndexes(t);
            let routePos = Number.isInteger(t.routePos) ? t.routePos : Math.max(0, routeIndexes.indexOf(t.seg));
            let dir = t.dir;
            let nextPos = dir === "down" ? routePos + 1 : routePos - 1;
            if (nextPos < 0 || nextPos >= routeIndexes.length) {
              dir = dir === "down" ? "up" : "down";
              nextPos = dir === "down" ? 0 : routeIndexes.length - 1;
            }
            const nextSegIdx = routeIndexes[nextPos];
            const nextSeg = SEGMENTS[nextSegIdx];
            const targetPlatformStation = dir === "down" ? nextSeg.from : nextSeg.to;
            const targetPlatform = assignPlatform(t, targetPlatformStation);
            const blocked = isTargetTrackBlocked([...prev, ...next], t, nextSegIdx, dir);
            const occupied = isPlatformOccupied([...prev, ...next], targetPlatformStation, targetPlatform, t.id);
            if (blocked || occupied) {
              next.push({ ...t, status: "DWELLING", dwellTicks: 1, crewHours, rakeHealth });
              return;
            }
            next.push({ ...t, routeId: route.id, routePos: nextPos, dir, seg: nextSegIdx, prog: 0, status: "MOVING", stationIdx: undefined, platform: undefined, dwellTicks: 0, crewHours, rakeHealth });
            movingReservations.add(`${nextSegIdx}:${dir}`);
            return;
          }

          if (t.status === "HELD") {
            if (t.waitingForPlatform && !isPlatformOccupied([...prev, ...next], t.stationIdx, t.platform, t.id)) {
              next.push({ ...t, status: "MOVING", waitingForPlatform: false, crewHours, rakeHealth });
            } else {
              next.push({ ...t, crewHours, rakeHealth });
            }
            return;
          }
          const seg = getTrainSegment(t);
          const route = getRoute(t);
          const routeIndexes = getRouteSegmentIndexes(t);
          if (!seg || !routeIndexes.length) {
            next.push({ ...t, status: "ARRIVED", crewHours, rakeHealth });
            return;
          }

          let prog = t.prog + 0.35 * speed;
          let routePos = Number.isInteger(t.routePos) ? t.routePos : Math.max(0, routeIndexes.indexOf(t.seg));
          const dir = t.dir;
          const delay = t.delay + weatherDelay;

          if (prog >= seg.len - 0.05) {
            const stationIdx = dir === "down" ? seg.to : seg.from;
            const platform = assignPlatform(t, stationIdx);
            const occupied = isPlatformOccupied([...prev, ...next], stationIdx, platform, t.id);
            if (occupied) {
              // Stop before the platform throat. The train cannot enter an
              // occupied platform, so it waits on the protected approach.
              next.push({ ...t, prog: Math.max(0, seg.len - 0.45), delay: delay + 0.5 * speed, status: "HELD", crewHours, rakeHealth, waitingForPlatform: true, platform });
              return;
            }
            next.push({ ...t, prog: seg.len, status: "DWELLING", stationIdx, platform, dwellTicks: 5, delay, crewHours, rakeHealth, waitingForPlatform: false });
            return;
          }

          // Block following trains from entering the same physical track lane
          // too closely. Opposite directions may coexist only on double track.
          const blocked = isTargetTrackBlocked([...prev, ...next], t, t.seg, dir);
          if (blocked) {
            next.push({ ...t, prog: Math.max(0, t.prog - 0.02), delay: delay + 0.25 * speed, status: "HELD", crewHours, rakeHealth, waitingForPlatform: false });
            return;
          }
          next.push({ ...t, routeId: route.id, routePos, dir, seg: routeIndexes[routePos], prog, delay, crewHours, rakeHealth, waitingForPlatform: false });
          movingReservations.add(`${t.seg}:${dir}`);
        });

        return next.map((t) => t.status === "HELD" && t.waitingForPlatform !== true && !t.autoHeld ? { ...t, status: "MOVING" } : t);
      });
    }, 700);
    return () => clearInterval(tickRef.current);
  }, [running, speed, weather, dataMode]);

  /* -------- conflict detection (deterministic) -------- */
  const conflicts = useMemo(() => {
    if (dataMode === "LIVE") return [];
    const found = [];
    SEGMENTS.forEach((seg, idx) => {
      const occ = trains.filter((t) => t.seg === idx && t.status !== "ARRIVED");
      if (seg.track === "single") {
        const down = occ.filter((t) => t.dir === "down");
        const up = occ.filter((t) => t.dir === "up");
        if (down.length && up.length) {
          down.forEach((d) => up.forEach((u) => {
            found.push({
              id: `CF-${seg.block}-${d.id}-${u.id}`,
              type: "Single-Track Occupancy",
                severity: "CRITICAL",
                 block: seg.block,
               segIdx: idx,
              trains: [d.id, u.id],
              desc: `${d.id} and ${u.id} both require single-track block ${seg.block} in opposing directions.`,
            });
          }));
        }
      }

      const byDir = {
        down: occ.filter((t) => t.dir === "down"),
        up: occ.filter((t) => t.dir === "up"),
      };
      Object.values(byDir).forEach((arr) => {
        for (let i = 0; i < arr.length; i++) {
          for (let j = i + 1; j < arr.length; j++) {
            if (Math.abs(arr[i].prog - arr[j].prog) < 1.1) {
              found.push({
                id: `HW-${seg.block}-${arr[i].id}-${arr[j].id}`,
                type: "Headway Violation",
                severity: "WARNING",
                block: seg.block,
                segIdx: idx,
                trains: [arr[i].id, arr[j].id],
                desc: `${arr[i].id} and ${arr[j].id} are running below minimum headway on block ${seg.block}.`,
              });
            }
          }
        }
      });
    });

    // Add station/platform clashes to the same conflict queue so TramenAI
    // can resolve them automatically.
    const platformConflicts = findPlatformClashes(trains);
    return [...found, ...platformConflicts];
  }, [trains]);

  /* -------- autonomous conflict resolution --------
     TramenAI resolves routine operational conflicts automatically. The operator
     only has to acknowledge the completed action, matching the complaint flow.
     Platform-aware conflicts are rerouted to another available platform first;
     holding a train is the fallback when every platform is occupied.
  */
  useEffect(() => {
    if (dataMode !== "DEMO" || role !== "controller" || resolvingConflictRef.current || !conflicts.length) return;

    const conflict = conflicts.find((c) => !handledConflictIdsRef.current.has(c.id));
    if (!conflict) return;

    const candidates = conflict.trains
      .map((id) => trains.find((t) => String(t.id) === String(id)))
      .filter(Boolean);
    if (candidates.length < 2) return;

    const score = (t) => (PRIORITY_RANK[t.type] || 1) * 100 - t.load * 0.1 - t.delay * 2;
    const [proceed, hold] = [...candidates].sort((a, b) => score(b) - score(a));
    const seg = SEGMENTS[conflict.segIdx];
    const station = conflict.station;
    const platformCount = station?.platforms || 1;
    const currentPlatform = conflict.platform || trainEta(hold)?.platform || 1;

    let alternatePlatform = null;
    if (conflict.type === "Platform Clash" && platformCount > 1 && station) {
      const stationIdx = STATIONS.indexOf(station);
      const used = new Set(
        trains
          .filter((t) => !conflict.trains.includes(t.id))
          .map((t) => trainEta(t))
          .filter((e) => e && e.stationIdx === stationIdx && e.etaMin < 4)
          .map((e) => e.platform)
      );
      for (let pNum = 1; pNum <= platformCount; pNum++) {
        if (pNum !== currentPlatform && !used.has(pNum)) {
          alternatePlatform = pNum;
          break;
        }
      }
    }

    const holdMin = Math.max(3, Math.min(6, Math.round((seg?.len || 5) - hold.prog)));
    handledConflictIdsRef.current.add(conflict.id);
    resolvingConflictRef.current = true;

    if (alternatePlatform) {
      setTrains((prev) => prev.map((t) =>
        t.id === hold.id
          ? { ...t, platformPlan: { ...(t.platformPlan || {}), [station.id]: alternatePlatform }, status: "MOVING", autoRouted: true }
          : t
      ));

      setResolvedConflicts((prev) => [{
        ...conflict,
        acknowledged: false,
        resolvedAt: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
        resolution: `TramenAI rerouted ${hold.id} from PF${currentPlatform} to PF${alternatePlatform}; ${proceed.id} retains PF${currentPlatform}.`,
        action: `AUTO-RESOLVED — REROUTE ${hold.id} → PF${alternatePlatform}`,
      }, ...prev].slice(0, 20));

      addEvent(`🤖 Platform-aware resolution — ${hold.id} rerouted PF${currentPlatform} → PF${alternatePlatform}; ${proceed.id} retains PF${currentPlatform}`);
      setTimeout(() => {
        setTrains((prev) => prev.map((t) => t.id === hold.id ? { ...t, autoRouted: false } : t));
        resolvingConflictRef.current = false;
      }, 2400);
      return;
    }

    setTrains((prev) => prev.map((t) =>
      t.id === hold.id
        ? { ...t, delay: t.delay + holdMin, status: "HELD", autoHeld: true }
        : t
    ));

    setResolvedConflicts((prev) => [{
      ...conflict,
      acknowledged: false,
      resolvedAt: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
      resolution: `TramenAI automatically allowed ${proceed.id} to proceed and held ${hold.id} for ${holdMin} min.`,
      action: `AUTO-RESOLVED — HOLD ${hold.id} ${holdMin} min`,
    }, ...prev].slice(0, 20));

    addEvent(`🤖 TramenAI auto-resolved ${conflict.id} — HOLD ${hold.id} ${holdMin}min; ${proceed.id} proceeds`);

    setTimeout(() => {
      setTrains((prev) => prev.map((t) => t.id === hold.id ? { ...t, status: "MOVING", autoHeld: false } : t));
      resolvingConflictRef.current = false;
    }, Math.max(2200, holdMin * 450));
  }, [dataMode, role, conflicts, trains, addEvent]);

  const acknowledgeConflict = (conflictId) => {
    setResolvedConflicts((prev) => prev.map((c) =>
      c.id === conflictId
        ? { ...c, acknowledged: true, acknowledgedAt: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) }
        : c
    ));
    addEvent(`✓ Operator acknowledged AI conflict resolution — ${conflictId}`);
  };

  const prevConflictCount = useRef(0);
  useEffect(() => {
    if (conflicts.length > prevConflictCount.current) {
      const newest = conflicts[conflicts.length - 1];
      addEvent(`Conflict detected — ${newest.id} (${newest.severity}) at block ${newest.block || "station platform"}`);
    }
    prevConflictCount.current = conflicts.length;
  }, [conflicts, addEvent]);

  const networkHealth = useMemo(() => {
    const critical = conflicts.filter((c) => c.severity === "CRITICAL").length;
    const warn = conflicts.filter((c) => c.severity === "WARNING").length;
    return Math.max(20, 100 - critical * 20 - warn * 8);
  }, [conflicts]);

  const totalDelay = useMemo(() => trains.reduce((sum, t) => sum + (Number(t.delay) || 0), 0), [trains]);
  const delayedCount = trains.filter((t) => Number(t.delay) > 0).length;
  const avgDelay = trains.length ? (totalDelay / trains.length).toFixed(1) : 0;
  const passengerImpact = useMemo(() =>
    conflicts.reduce((sum, c) => sum + c.trains.reduce((inner, id) => inner + (trains.find((t) => t.id === id)?.load || 0), 0), 0),
  [conflicts, trains]);

  /* -------- platform-clash alarm (sound + full-screen flash) -------- */
  const platformClashes = useMemo(() => findPlatformClashes(trains), [trains]);
  const clashSignature = platformClashes.map((c) => c.id).sort().join("|");

  // Alert only for genuinely NEW clashes. The same pair/platform combination
  // can remain in the live conflict set for many ticks, so it must not retrigger
  // the full-screen alarm every time the simulation updates.
  useEffect(() => {
    if (clashSignature === prevClashSigRef.current && !platformClashes.length) return;
    prevClashSigRef.current = clashSignature;

    const now = Date.now();
    const cooldownMs = dataMode === "DEMO" ? 15000 : 30000;
    const newEligible = platformClashes.filter((c) => {
      const last = lastPlatformAlertAtRef.current.get(c.id) || 0;
      const isNew = !observedClashIdsRef.current.has(c.id);
      const cooledDown = now - last >= cooldownMs;
      return (isNew || cooledDown) && c.etaA <= 6 && c.etaB <= 6;
    });

    platformClashes.forEach((c) => observedClashIdsRef.current.add(c.id));

    if (newEligible.length) {
      const c = newEligible[0];
      newEligible.forEach((item) => lastPlatformAlertAtRef.current.set(item.id, now));
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAlarmAcked(false);
      addEvent(`🚨 PLATFORM CLASH — ${c.trains.join(" & ")} both due at ${c.station.name} platform ${c.platform}`);
    }
  }, [clashSignature, platformClashes, dataMode, addEvent]);

  const ensureAudioCtx = () => {
    if (!audioCtxRef.current) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      audioCtxRef.current = new Ctx();
    }
    if (audioCtxRef.current.state === "suspended") audioCtxRef.current.resume();
    return audioCtxRef.current;
  };
  const playBeep = useCallback(() => {
    const ctx = ensureAudioCtx();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(920, now);
      osc.frequency.setValueAtTime(680, now + 0.16);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.28, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.32);
    } catch { /* audio unavailable — visual alert still shows */ }
  }, []);

  const alarmActive = platformClashes.length > 0 && !alarmAcked;
  useEffect(() => {
    if (!alarmActive || alarmMuted) return;
    playBeep();
    const id = setInterval(playBeep, 900);
    return () => clearInterval(id);
  }, [alarmActive, alarmMuted, playBeep]);

  /* -------- actions -------- */
  const injectDisruption = (trainId, minutes = 12, scenario = "Delay spike") => {
    const simulatedStatus = scenario === "Platform closure" || scenario === "Signal failure" || scenario === "Track blockage" ? "HELD" : "SLOWED";
    setTrains((prev) => prev.map((t) => t.id === trainId
      ? { ...t, delay: Number(t.delay || 0) + minutes, status: simulatedStatus, simulatedDisruption: { scenario, status: simulatedStatus, expiresAt: Date.now() + 15000 } }
      : t));
    addEvent(`⚡ SAFE ${dataMode} DISRUPTION — ${trainId}: ${scenario} (+${minutes}min) · simulation only`);
    setTimeout(() => {
      setTrains((prev) => prev.map((t) => {
        if (t.id !== trainId || !t.simulatedDisruption) return t;
        return { ...t, status: "MOVING", simulatedDisruption: undefined };
      }));
    }, 15000);
  };

  const triggerPlatformClash = () => {
    setTrains((prev) => {
      const active = prev.filter((t) => t.status !== "ARRIVED");
      if (active.length < 2) return prev;
      const [a, b] = active;
      const seg = SEGMENTS[a.seg];
      const forcedProg = Math.max(0, seg.len - 1);
      return prev.map((t) => {
        if (t.id === a.id) return { ...t, seg: a.seg, dir: a.dir, prog: forcedProg, status: "MOVING", platform: 1 };
        if (t.id === b.id) return { ...t, seg: a.seg, dir: a.dir, prog: forcedProg, status: "MOVING", platform: 1 };
        return t;
      });
    });
    addEvent("⚠️ Scenario injected — two trains routed onto the same platform at the same time");
  };

  const changeWeather = (w) => {
    if (w === weather) return;
    setWeather(w);
    const info = WEATHER_INFO[w];
    if (info.delayRate > 0) {
      setTrains((prev) => prev.map((t) => t.status !== "ARRIVED" ? { ...t, delay: t.delay + 3 } : t));
      addEvent(`🌫️ Weather update — ${info.label} conditions across the corridor, speed restrictions in effect`);
    } else {
      addEvent("☀️ Weather update — conditions have cleared, normal speeds restored");
    }
  };

  const exportIncidentReport = () => {
    const now = new Date();
    const lines = [
      "TramenAI — INCIDENT & OPERATIONS REPORT",
      `Generated: ${now.toLocaleString("en-IN")}`,
      `Simulated clock: ${simClock}   Weather: ${WEATHER_INFO[weather].label}`,
      "=".repeat(60),
      "",
      "NETWORK SNAPSHOT",
      `  Network health........ ${networkHealth}%`,
      `  Active trains.......... ${trains.filter((t) => t.status !== "ARRIVED").length}`,
      `  Delayed trains......... ${delayedCount} (avg ${avgDelay}m)`,
      `  Total delay............ ${Math.round(totalDelay)} min`,
      `  Open conflicts.......... ${conflicts.length}`,
      `  Passenger impact........ ${passengerImpact.toLocaleString("en-IN")}`,
      "",
      "TRAIN STATUS",
      ...trains.map((t) =>
        `  ${t.id.padEnd(8)} ${t.name.padEnd(18)} ${t.status.padEnd(8)} delay:${String(Math.round(t.delay)).padStart(3)}m  crew:${t.crewHours?.toFixed(1)}h  rake:${Math.round(t.rakeHealth)}%`
      ),
      "",
      "ACTIVE CONFLICTS",
      ...(conflicts.length ? conflicts.map((c) => `  [${c.severity}] ${c.type} — ${c.trains.join(" ↔ ")} @ ${c.block}`) : ["  None — network nominal."]),
      "",
      "LATEST AI RECOMMENDATION",
      ...(decision ? [`  Hold ${decision.hold.id} for ${decision.holdMin} min at ${decision.conflict.block}, let ${decision.proceed.id} proceed.`, `  Status: ${applied ? "Applied" : "Pending"}`] : ["  No recommendation generated yet."]),
      "",
      "PASSENGER COMPLAINTS",
      ...(complaints.length ? complaints.map((c) => `  [${c.severity}] ${c.trainId || "—"} — ${c.text}`) : ["  No complaints logged."]),
      "",
      "EVENT LOG (most recent first)",
      ...events.map((e) => `  ${e.t}  ${e.msg}`),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tramenai-incident-report-${now.toISOString().slice(0, 19).replace(/[:T]/g, "-")}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    addEvent("📄 Incident report exported");
  };

  const runOptimizer = () => {
    if (!conflicts.length) { addEvent("Optimizer run — no active conflicts, network nominal."); return; }
    setDecision(null); setApplied(false); setOptStage(0);
    let i = 0;
    const step = () => {
      i++;
      if (i < 5) { setOptStage(i); setTimeout(step, 420); }
      else {
        const cf = conflicts.find((c) => c.severity === "CRITICAL") || conflicts[0];
        const [aId, bId] = cf.trains;
        const a = trains.find((t) => t.id === aId), b = trains.find((t) => t.id === bId);
        const score = (t) => PRIORITY_RANK[t.type] * 100 - t.load * 0.1 - t.delay * 2;
        const [proceed, hold] = score(a) >= score(b) ? [a, b] : [b, a];
        const seg = SEGMENTS[cf.segIdx];
        const holdMin = Math.max(3, Math.round(seg.len - hold.prog));
        const beforeDelay = totalDelay;
        const afterDelay = totalDelay + holdMin;
        const beforePax = passengerImpact;
        const afterPax = Math.round(passengerImpact * 0.42);
        const alt = trains.filter((t) => t.id !== proceed.id && t.id !== hold.id).slice(0, 2);
        setDecision({
          conflict: cf, proceed, hold, holdMin,
          before: { delay: beforeDelay, conflicts: conflicts.length, pax: beforePax, throughput: trains.length - conflicts.length },
          after: { delay: afterDelay, conflicts: conflicts.length - 1, pax: afterPax, throughput: trains.length - (conflicts.length - 1) },
          reasons: [
            `${proceed.id} has higher operating priority (${proceed.type} vs ${hold.type}).`,
            `Holding ${hold.id} for ${holdMin} min prevents the single-track conflict at block ${seg.block}.`,
            `Minimum headway on block ${seg.block} is preserved for both movements.`,
            `Estimated downstream delay is reduced by resolving the conflict now rather than after entry.`,
          ],
          alternatives: [
            { label: `Hold ${proceed.id} instead`, reason: `Higher passenger impact (${proceed.load} vs ${hold.load}) — rejected.` },
            ...(alt[0] ? [{ label: `Hold ${alt[0].id} instead`, reason: `${alt[0].id} is not occupying the conflicting block — no effect on this conflict.` }] : []),
            { label: "Reroute via junction", reason: "Unavailable — single corridor path between Bravo and Charlie." },
          ],
        });
        setOptStage("done");
        addEvent(`AI optimization complete — recommend HOLD ${hold.id} at ${STATIONS[seg.from].name} for ${holdMin}min`);
      }
    };
    setTimeout(step, 420);
  };

  const applySchedule = () => {
    if (!decision) return;
    setTrains((prev) => prev.map((t) => t.id === decision.hold.id ? { ...t, delay: t.delay + decision.holdMin, status: "HELD" } : t));
    setApplied(true);
    addEvent(`Controller applied schedule — ${decision.hold.id} held ${decision.holdMin}min at block ${decision.conflict.block}`);
    setTimeout(() => setTrains((prev) => prev.map((t) => t.id === decision.hold.id ? { ...t, status: "MOVING" } : t)), 2600);
  };

  /* -------- AI complaint resolution + Firestore sync -------- */
  const analyzeAndResolveComplaint = useCallback(async (complaint) => {
    const lower = (complaint.text || "").toLowerCase();
    let severity = "LOW";
    for (const k of KEYWORD_SEVERITY) {
      if (k.words.some((w) => lower.includes(w))) {
        severity = k.severity;
        break;
      }
    }

    const correlated =
      conflicts.find((c) => c.trains.includes(String(complaint.trainId))) ||
      (decision?.hold.id === complaint.trainId ? decision.conflict : null);

    const isSafety = severity === "HIGH" || complaint.category === "Safety";
    let status = "AI_RESOLVED";
    let resolution;
    let action;
    let autoAction = false;

    if (isSafety) {
      status = "ESCALATED";
      resolution = "Safety-critical complaint detected. TramenAI stopped autonomous handling and escalated it to the control operator.";
      action = "Immediate operator intervention required";
    } else if (complaint.category === "Delay" || /late|delay|waiting|stopped|stuck|slow/.test(lower)) {
      if (correlated) {
        const ids = correlated.trains || [];
        const candidates = ids.map((id) => trains.find((t) => String(t.id) === String(id))).filter(Boolean);

        if (candidates.length >= 2) {
          const score = (t) => PRIORITY_RANK[t.type] * 100 - t.load * 0.1 - t.delay * 2;
          const [proceed, hold] = [...candidates].sort((a, b) => score(b) - score(a));
          const holdMin = Math.max(3, Math.round((SEGMENTS[correlated.segIdx]?.len || 5) - hold.prog));

          setTrains((prev) =>
            prev.map((t) =>
              t.id === hold.id
                ? { ...t, delay: t.delay + holdMin, status: "HELD" }
                : t
            )
          );

          setTimeout(() => {
            setTrains((prev) =>
              prev.map((t) =>
                t.id === hold.id ? { ...t, status: "MOVING" } : t
              )
            );
          }, 2600);

          autoAction = true;
          resolution = `TramenAI correlated the complaint with ${correlated.block}, allowed ${proceed.id} to proceed and automatically held ${hold.id} for ${holdMin} min to clear the conflict.`;
          action = `Schedule automatically optimized — HOLD ${hold.id} ${holdMin} min`;
        } else {
          resolution = `TramenAI correlated the complaint with ${correlated.block} and updated the passenger-facing status.`;
          action = "Passenger status automatically updated";
        }
      } else {
        resolution = "TramenAI reviewed the live corridor and found no active operational conflict requiring intervention.";
        action = "Passenger status automatically updated";
      }
    } else if (complaint.category === "Overcrowding") {
      resolution = "TramenAI classified the issue as a capacity problem and generated a load-balancing recommendation for the corridor.";
      action = "Capacity recommendation generated automatically";
    } else if (complaint.category === "Cleanliness") {
      resolution = "TramenAI classified the complaint as a cleanliness service issue and created a service task.";
      action = "Cleaning service task created automatically";
    } else if (complaint.category === "Catering") {
      resolution = "TramenAI classified the complaint as a catering issue and created a service task.";
      action = "Catering service task created automatically";
    } else if (complaint.category === "Staff behaviour") {
      resolution = "TramenAI classified the complaint and routed it to the responsible supervisory team.";
      action = "Supervisor task created automatically";
    } else {
      resolution = "TramenAI classified the complaint and created the appropriate operational service task.";
      action = "Operational service task created automatically";
    }

    const resolvedAt = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    await updateDoc(doc(db, "complaints", complaint.id), {
      severity,
      status,
      correlated: correlated ? correlated.block : null,
      resolution,
      action,
      acknowledged: false,
      autoAction,
      resolvedAt,
      resolvedAtServer: serverTimestamp(),
      resolvedBy: "TramenAI",
    });

    addEvent(`🤖 TramenAI resolved complaint ${complaint.id} — ${status} — ${action}`);
  }, [conflicts, decision, trains, addEvent]);

  // Only the control-room client performs autonomous resolution. Passenger
  // clients submit complaints and receive live status updates from Firestore.
  useEffect(() => {
    if (role !== "controller") return;

    complaints
      .filter((c) => c.status === "RECEIVED" && !processingComplaintIdsRef.current.has(c.id))
      .forEach((complaint) => {
        processingComplaintIdsRef.current.add(complaint.id);
        analyzeAndResolveComplaint(complaint).catch((error) => {
          console.error("AI complaint resolution failed:", error);
          processingComplaintIdsRef.current.delete(complaint.id);
          updateDoc(doc(db, "complaints", complaint.id), {
            status: "AI_ERROR",
            resolution: "TramenAI could not complete autonomous resolution.",
            action: "Operator review required",
          }).catch(() => {});
        });
      });
  }, [role, complaints, analyzeAndResolveComplaint]);

  const submitComplaint = async ({ trainId, category, text }) => {
    const complaintId = makeComplaintId();
    const c = {
      id: complaintId,
      trainId: String(trainId),
      category,
      text,
      status: "RECEIVED",
      severity: "PENDING",
      correlated: null,
      resolution: "Complaint received by TramenAI. Waiting for live control-room analysis.",
      action: "AI analysis queued",
      acknowledged: false,
      autoAction: false,
      createdAt: serverTimestamp(),
      source: "passenger_portal",
    };

    try {
      await setDoc(doc(db, "complaints", complaintId), c);
      addEvent(`📨 Complaint ${complaintId} received from passenger portal — ${trainId}`);
      return c;
    } catch (error) {
      console.error("Complaint submission failed:", error);
      addEvent(`❌ Complaint ${complaintId} could not sync to Firebase`);
      throw error;
    }
  };

  const acknowledgeComplaint = async (complaintId) => {
    // Optimistic UI: remove the item from the active queue immediately.
    // Firestore remains the source of truth and will reconcile the state.
    setComplaints((current) =>
      current.map((c) =>
        c.id === complaintId
          ? { ...c, acknowledged: true, status: "ACKNOWLEDGED" }
          : c
      )
    );

    try {
      await updateDoc(doc(db, "complaints", complaintId), {
        acknowledged: true,
        status: "ACKNOWLEDGED",
        acknowledgedAt: serverTimestamp(),
      });
      addEvent(`✓ Operator acknowledged AI complaint resolution — ${complaintId}`);
    } catch (error) {
      console.error("Complaint acknowledgment failed:", error);
      // Re-fetching is handled by the Firestore listener. Keep the event visible
      // so the operator knows the write failed.
      addEvent(`❌ Could not acknowledge complaint ${complaintId}`);
    }
  };

  /* -------- demo mode -------- */
  const demoSteps = [
    { label: "1 NORMAL", run: () => { setTab("command"); setPortal("control"); } },
    { label: "2 DISRUPT", run: () => { setTab("command"); injectDisruption("22439", 12); } },
    { label: "3 CASCADE", run: () => { setTab("conflicts"); triggerPlatformClash(); } },
    { label: "4 OPTIMIZE", run: () => { setTab("optimizer"); runOptimizer(); } },
    { label: "5 EXPLAIN", run: () => { setTab("optimizer"); } },
    { label: "6 APPLY", run: () => { applySchedule(); } },
    { label: "7 IMPACT", run: () => { setPortal("passenger"); setSelectedTrain(decision?.hold.id || "22439"); } },
    { label: "8 COMPLAINT", run: () => { submitComplaint({ trainId: decision?.hold.id || "22439", category: "Delay", text: "Train has been stopped outside the station for a while." }); } },
    { label: "9 CORRELATE", run: () => { setPortal("control"); setTab("complaints"); } },
  ];
  const runDemoStep = (i) => { demoSteps[i].run(); setDemoStep(i); };

  const simClock = `${String(Math.floor(simMin / 60) % 24).padStart(2, "0")}:${String(Math.floor(simMin % 60)).padStart(2, "0")}:${String(Math.floor((simMin % 1) * 60)).padStart(2, "0")}`;
  const WeatherIcon = { clear: Sun, fog: CloudFog, rain: CloudRain, heatwave: Thermometer }[weather];

  /* ============================== RENDER ============================== */
  return (
    <>
    <div className={`rf-root rf-control-shell${portal === "passenger" ? " light" : ""} rf-scrollbar`} style={{ height: "100%", width: "100%", display: "flex", flexDirection: "column", fontSize: 13, overflow: "auto" }}>
      <style>{CSS}</style>
      <div className="rf-tricolor" />

      {/* TOP BAR */}
      <div className="rf-topbar" style={{ display: "flex", alignItems: "center", gap: 18, padding: "9px 16px", borderBottom: "1px solid var(--line)", background: "var(--panel)", flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 7, fontWeight: 800, fontSize: 14.5, letterSpacing: .3 }}>
            <Train size={17} color="var(--blue)" /> Tramen<span style={{ color: "var(--blue)" }}>AI</span>
          </div>
          <div className="rf-hi" style={{ fontSize: 9.5, color: "var(--muted)", marginTop: 1 }}>रेल यातायात नियंत्रण प्रणाली · Digital Twin</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700 }}>
          <span className="rf-live-dot" style={{ background: dataMode === "LIVE" && dataSource !== "LIVE DATA NOT CONNECTED" ? "var(--green)" : dataMode === "LIVE" ? "var(--amber)" : "var(--purple)", boxShadow: dataMode === "LIVE" && dataSource !== "LIVE DATA NOT CONNECTED" ? "0 0 8px var(--green)" : "none" }} /> {dataMode === "LIVE" ? (dataSource === "LIVE DATA NOT CONNECTED" ? "LIVE OFFLINE" : "LIVE") : "DEMO"}
        </div>
        <div className="rf-mono" style={{ fontSize: 12, color: "var(--muted)" }}>{dataMode === "DEMO" ? `SIM ${simClock}` : liveLastUpdated ? `UPDATED ${liveLastUpdated.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}` : "WAITING FOR FEED"}</div>
        <div className="rf-mono" style={{ fontSize: 12, color: networkHealth > 80 ? "var(--green)" : networkHealth > 55 ? "var(--amber)" : "var(--red)" }}>
          NETWORK {networkHealth}%
        </div>
        <div style={{ fontSize: 11.5, color: "var(--muted)" }}>AI ENGINE <span style={{ color: "var(--green)" }}>READY</span></div>
        <div className="rf-mono" style={{ fontSize: 10.5, color: dataMode === "DEMO" ? "var(--amber)" : dataSource === "LIVE DATA NOT CONNECTED" ? "var(--red)" : "var(--green)", fontWeight: 800 }}>
          DATA {dataSource}
        </div>
        <div style={{ fontSize: 11.5, color: "var(--muted)" }}>SECTION: <b style={{ color: "var(--text)" }}>{dataMode === "DEMO" ? "DEMO CORRIDOR" : dataSource === "LIVE DATA NOT CONNECTED" ? "LIVE FEED NOT CONNECTED" : "LIVE RAIL DATA"}</b></div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11.5, color: WEATHER_INFO[weather].color, fontWeight: 700 }}>
          <WeatherIcon size={12} /> {WEATHER_INFO[weather].label.toUpperCase()}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11.5, color: conflicts.length ? "var(--red)" : "var(--muted)", fontWeight: 700 }}>
          <AlertTriangle size={12} /> {conflicts.length} ALERTS
        </div>
        {platformClashes.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11.5, color: "var(--red)", fontWeight: 800, animation: alarmActive && !alarmMuted ? "rfBlink .7s infinite" : "none" }}>
            <Siren size={12} /> PLATFORM CLASH
          </div>
        )}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <div className="rf-data-toggle" role="group" aria-label="Train data mode">
            <span className="rf-toggle-label">DATA MODE</span>
            <button type="button" onClick={() => switchDataMode("DEMO")} aria-pressed={dataMode === "DEMO"} style={{ ...btnGhost, background: dataMode === "DEMO" ? "var(--amber)" : "transparent", color: dataMode === "DEMO" ? "#111" : "var(--muted)", borderColor: dataMode === "DEMO" ? "var(--amber)" : "var(--line)" }}>DEMO</button>
            <button type="button" onClick={() => switchDataMode("LIVE")} aria-pressed={dataMode === "LIVE"} style={{ ...btnGhost, background: dataMode === "LIVE" ? "var(--green)" : "transparent", color: dataMode === "LIVE" ? "#07130f" : "var(--muted)", borderColor: dataMode === "LIVE" ? "var(--green)" : "var(--line)" }}>LIVE</button>
          </div>
          <button onClick={exportIncidentReport} title="Export incident report" style={btnGhost}>
            <FileText size={12} /> REPORT
          </button>
          {role === "controller" && dataMode === "DEMO" && (
            <>
              <button onClick={() => setRunning((r) => !r)} style={btnGhost}>{running ? <Pause size={12} /> : <Play size={12} />} {running ? "PAUSE" : "PLAY"}</button>
              {[1, 5, 20].map((s) => (
                <button key={s} onClick={() => setSpeed(s)} style={{ ...btnGhost, background: speed === s ? "var(--blue)" : "transparent", color: speed === s ? "#fff" : "var(--muted)", borderColor: speed === s ? "var(--blue)" : "var(--line)" }}>{s}x</button>
              ))}
            </>
          )}
          {PORTAL_OPTIONS[role].length > 1 && (
            <div className="rf-portal-switch" style={{ display: "flex", alignItems: "center", gap: 2, background: "var(--panel2)", border: "1px solid var(--line)", borderRadius: 8, padding: 2 }}>
              {PORTAL_OPTIONS[role].map(([id, labelKey, Icon]) => (
                <button key={id} onClick={() => setPortal(id)} className={portal === id ? "rf-btn-primary" : ""} style={{
                  ...btnGhost,
                  background: portal === id ? "var(--purple)" : "transparent",
                  color: portal === id ? "#fff" : "var(--muted)",
                  borderColor: "transparent",
                }}>
                  <Icon size={12} /> {t(labelKey).toUpperCase()}
                </button>
              ))}
            </div>
          )}
          <div style={{ position: "relative" }}>
            <button onClick={() => setLangOpen((o) => !o)} title={t("language")} style={{ ...btnGhost, color: "var(--muted)" }}>
              <Languages size={12} /> {(LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0]).native}
            </button>
            {langOpen && (
              <div style={{ position: "absolute", top: "calc(100% + 4px)", right: 0, zIndex: 40, width: 220, maxHeight: 320, overflowY: "auto", background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 8, padding: 4, boxShadow: "0 8px 24px rgba(0,0,0,.4)" }} className="rf-scrollbar">
                {LANGUAGES.map((l) => (
                  <div key={l.code} onClick={() => { setLang(l.code); setLangOpen(false); }} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, padding: "7px 9px", borderRadius: 6, cursor: "pointer", fontSize: 12,
                    background: lang === l.code ? "var(--panel2)" : "transparent", color: lang === l.code ? "var(--text)" : "var(--muted)", fontWeight: lang === l.code ? 700 : 500,
                  }}>
                    <span className="rf-hi">{l.native} <span style={{ fontSize: 9.5, opacity: .7 }}>· {l.name}</span></span>
                    {lang === l.code && <Check size={12} color="var(--purple)" />}
                  </div>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => setAlarmMuted((m) => {
              const next = !m;
              try { localStorage.setItem("rf-alert-silenced", next ? "1" : "0"); } catch { /* local storage may be unavailable */ }
              return next;
            })}
            title={alarmMuted ? "Enable on-screen alerts and alarm sound" : "Silence on-screen platform clash alerts"}
            style={{ ...btnGhost, color: alarmMuted ? "var(--amber)" : "var(--muted)", borderColor: alarmMuted ? "var(--amber)" : "var(--line)" }}
          >
            {alarmMuted ? <VolumeX size={12} /> : <Volume2 size={12} />} {alarmMuted ? "SILENT" : "ALERTS"}
          </button>
          <button onClick={onLogout} title={t("logout")} style={{ ...btnGhost, color: "var(--muted)" }}>
            <LogOut size={12} />
          </button>
        </div>
      </div>
      <div className="rf-notice" style={{ padding: "4px 16px", fontSize: 10, color: "var(--muted)", background: "var(--panel2)", borderBottom: "1px solid var(--line)" }}>
        {dataMode === "DEMO"
          ? t("simNoticeTop")
          : dataSource === "LIVE DATA NOT CONNECTED"
            ? "LIVE DATA · external railway feed unavailable · no demo fallback"
            : `LIVE DATA · ${dataSource} · operational status feed · prototype interface`}
      </div>

      {portal === "passenger" ? (
        <PassengerPortal trains={trains} segments={SEGMENTS} stations={STATIONS} selectedTrain={selectedTrain} setSelectedTrain={setSelectedTrain}
          decision={decision} applied={applied} submitComplaint={submitComplaint} identifier={role === "passenger" ? identifier : "demo-passenger"}
          dataMode={dataMode} dataSource={dataSource} />
      ) : portal === "copilot" ? (
        <CopilotView trains={trains} conflicts={conflicts} decision={decision} applied={applied} complaints={complaints}
          networkHealth={networkHealth} totalDelay={totalDelay} delayedCount={delayedCount} avgDelay={avgDelay}
          passengerImpact={passengerImpact} runOptimizer={runOptimizer} applySchedule={applySchedule}
          setTab={() => {}} />
      ) : (
        <div className="rf-view-canvas" style={{ display: "flex", flex: 1, minHeight: 0 }}>
          {/* SIDEBAR */}
          <nav className="rf-sidebar" aria-label="Control room operations" style={{ width: 220, borderRight: "1px solid var(--line)", background: "var(--panel)", padding: "16px 10px", flexShrink: 0 }}>
            <div className="rf-sidebar-heading">CONTROL ROOM</div>
            {[
              ["command", "commandCenter", LayoutGrid],
              ["conflicts", "conflicts", AlertTriangle],
              ["optimizer", "optimizerNav", Sparkles],
              ["disruptions", "disruptions", Zap],
              ["crew", "crewRake", Users],
              ["complaints", "complaints", MessageSquare],
              ["analytics", "analytics", BarChart3],
            ].map(([id, labelKey, Icon]) => (
              <button type="button" key={id} onClick={() => setTab(id)} aria-label={t(labelKey)} aria-current={tab === id ? "page" : undefined} style={{
                display: "flex", alignItems: "center", gap: 9, padding: "8px 10px", borderRadius: 7, cursor: "pointer", marginBottom: 2,
                background: tab === id ? "var(--panel2)" : "transparent", color: tab === id ? "var(--text)" : "var(--muted)",
                border: "0", borderLeft: tab === id ? "2px solid var(--blue)" : "2px solid transparent", width: "100%", textAlign: "left", fontSize: 12.5, fontWeight: 600,
                transition: "background .15s ease",
              }}>
                <Icon size={14} style={{ flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <div className="rf-hi">{t(labelKey)}</div>
                </div>
                {id === "conflicts" && conflicts.length > 0 && <span style={{ marginLeft: "auto" }}><Badge color="var(--red)" solid>{conflicts.length}</Badge></span>}
                {id === "complaints" && complaints.filter((c) => !c.acknowledged).length > 0 && <span style={{ marginLeft: "auto" }}><Badge color="var(--amber)" solid>{complaints.filter((c) => !c.acknowledged).length}</Badge></span>}
              </button>
            ))}
          </nav>

          {/* MAIN */}
          <div className="rf-control-main" style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div className="rf-tab-scroll rf-scrollbar">
              {tab === "command" && (
                <CommandCenter dataMode={dataMode} dataSource={dataSource} trains={trains} conflicts={conflicts} resolvedConflicts={resolvedConflicts} events={events} networkHealth={networkHealth}
                  totalDelay={totalDelay} delayedCount={delayedCount} avgDelay={avgDelay} passengerImpact={passengerImpact}
                  setDrawerTrain={setDrawerTrain} />
              )}
              {tab === "conflicts" && <ConflictsView conflicts={conflicts} resolvedConflicts={resolvedConflicts} trains={trains} acknowledgeConflict={acknowledgeConflict} />}
              {tab === "optimizer" && <OptimizerView conflicts={conflicts} optStage={optStage} decision={decision} applied={applied}
                runOptimizer={runOptimizer} applySchedule={applySchedule} />}
              {tab === "disruptions" && <DisruptionsView dataMode={dataMode} trains={trains} injectDisruption={injectDisruption} triggerPlatformClash={triggerPlatformClash} weather={weather} changeWeather={changeWeather} />}
              {tab === "crew" && <CrewRakeView trains={trains} />}
              {tab === "complaints" && <ComplaintsView complaints={complaints} conflicts={conflicts} decision={decision} trains={trains} submitComplaint={submitComplaint} acknowledgeComplaint={acknowledgeComplaint} />}
              {tab === "analytics" && <AnalyticsView trains={trains} conflicts={conflicts} totalDelay={totalDelay} passengerImpact={passengerImpact} />}
            </div>
          </div>

          {drawerTrain && <TrainDrawer train={trains.find((t) => t.id === drawerTrain)} onClose={() => setDrawerTrain(null)} />}
        </div>
      )}

      {/* MODE BAR */}
      {role === "controller" && (
        <div className="rf-modebar" style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderTop: "1px solid var(--line)", background: "var(--panel2)", flexWrap: "wrap" }}>
          <span style={{ fontSize: 10.5, fontWeight: 800, color: dataMode === "DEMO" ? "var(--purple)" : dataSource === "LIVE DATA NOT CONNECTED" ? "var(--red)" : "var(--green)", letterSpacing: .5, marginRight: 4 }}>{dataMode === "DEMO" ? "★ DEMO MODE" : dataSource === "LIVE DATA NOT CONNECTED" ? "⚠ LIVE MODE · NO FEED" : "● LIVE DATA MODE"}</span>
          {dataMode === "DEMO" && demoSteps.map((s, i) => (
            <button key={i} onClick={() => runDemoStep(i)} style={{
              ...btnGhost, fontSize: 10.5, padding: "5px 8px",
              background: demoStep === i ? "var(--purple)" : "transparent", color: demoStep === i ? "#fff" : "var(--muted)",
              borderColor: demoStep === i ? "var(--purple)" : "var(--line)",
            }}>{s.label}</button>
          ))}
        </div>
      )}
    </div>

    {alarmActive && !alarmMuted && (
      <PlatformClashOverlay clashes={platformClashes} onAck={() => setAlarmAcked(true)} />
    )}
    </>
  );
}

const btnGhost = {
  display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, letterSpacing: .3,
  padding: "6px 10px", borderRadius: 6, border: "1px solid var(--line)", background: "transparent", color: "var(--muted)", cursor: "pointer",
};

/* ============================== COMMAND CENTER ============================== */
function CommandCenter({ dataMode, dataSource, trains, conflicts, resolvedConflicts, events, networkHealth, delayedCount, avgDelay, passengerImpact, setDrawerTrain }) {
  const active = trains.filter((t) => t.status !== "ARRIVED");
  const recommendation = conflicts[0];
  const awaitingAck = resolvedConflicts.filter((c) => !c.acknowledged);
  const [activeTrainsCollapsed, setActiveTrainsCollapsed] = useState(false);
  const recommendedHold = recommendation ? trains.find((t) => t.id === recommendation.trains[0]) : null;
  return (
    <div className="rf-command rf-command-v2" style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <div className="rf-command-hero">
        <div>
          <div className="rf-command-eyebrow"><span className="rf-live-dot" /> OPERATIONS CONTROL · {dataMode === "DEMO" ? "DEMO CORRIDOR" : "LIVE NETWORK"}</div>
          <div className="rf-command-title">Network command center</div>
          <div className="rf-command-subtitle">A spatial view of movement, conflicts, and AI-guided decisions across the corridor.</div>
        </div>
        <div className="rf-network-health-card">
          <div className="rf-health-ring" style={{ "--health": `${Math.max(0, Math.min(100, networkHealth))}%` }}><span>{networkHealth}%</span></div>
          <div><div className="rf-health-label">NETWORK HEALTH</div><div className="rf-health-status">{networkHealth > 80 ? "Operationally stable" : "Attention required"}</div><div className="rf-health-meta">{conflicts.length} active incidents · {active.length} moving trains</div></div>
        </div>
      </div>
      <div className="rf-kpis" style={{ display: "flex", borderBottom: "1px solid var(--line)", overflowX: "auto" }}>
        <Kpi label="Active Trains" value={active.length} sub={`of ${trains.length + 10}`} />
        <Kpi label="Delayed Trains" value={delayedCount} sub={delayedCount ? "attention needed" : "all on time"} color={delayedCount ? "var(--amber)" : "var(--green)"} />
        <Kpi label="Conflicts" value={conflicts.length} sub={awaitingAck.length ? `${awaitingAck.length} awaiting ack` : "auto-resolved"} color={conflicts.length ? "var(--red)" : awaitingAck.length ? "var(--amber)" : "var(--green)"} />
        <Kpi label="Avg Delay" value={`${avgDelay}m`} sub="minutes" color={Number(avgDelay) > 3 ? "var(--amber)" : "var(--text)"} />
        <Kpi label="Throughput" value={Math.max(1, active.length - conflicts.length)} sub="trains/hour" color="var(--green)" />
        <Kpi label="Network Health" value={`${networkHealth}%`} sub={networkHealth > 80 ? "excellent" : "degraded"} color={networkHealth > 80 ? "var(--green)" : "var(--amber)"} />
        <Kpi label="Passenger Impact" value={passengerImpact.toLocaleString("en-IN")} sub="affected" color={passengerImpact ? "var(--amber)" : "var(--text)"} />
      </div>
      <div className="rf-command-body" style={{ display: "flex", minHeight: 520 }}>
        <div className="rf-digital-twin-column" style={{ flex: 1, padding: 14, minWidth: 0 }}>
          <DigitalTwin dataMode={dataMode} dataSource={dataSource} trains={trains} conflicts={conflicts} onSelect={setDrawerTrain} />
        </div>
        <div className="rf-right-rail rf-scrollbar">
          <Panel className="rf-sidebar-panel rf-active-trains-panel" title={`Active Trains (${active.length})`} icon={Train} collapsed={activeTrainsCollapsed} onToggle={() => setActiveTrainsCollapsed((value) => !value)} style={activeTrainsCollapsed ? { flex: "0 0 auto", minHeight: 0, maxHeight: "none" } : undefined}>
            <div className="rf-sidebar-scroll">
              {active.map((t) => (
                <div key={t.id} onClick={() => setDrawerTrain(t.id)} style={{ display: "grid", gridTemplateColumns: "18px minmax(0,1fr) auto", gap: 8, alignItems: "center", padding: "10px 12px", borderBottom: "1px solid var(--line)", cursor: "pointer" }}>
                  <Train size={15} color="var(--green)" />
                  <div style={{ minWidth: 0 }}>
                    <div className="rf-mono" style={{ fontSize: 11, fontWeight: 800 }}>{t.id}</div>
                    <div style={{ fontSize: 9.5, color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.from} → {t.to}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ color: t.status === "HELD" ? "var(--red)" : t.delay > 0 ? "var(--amber)" : "var(--green)", fontSize: 9, fontWeight: 800 }}>{t.status}</div>
                    <div className="rf-mono" style={{ fontSize: 9, color: "var(--muted)" }}>{dataMode === "LIVE" ? (Number.isFinite(Number(t.speedKmh)) ? `${Math.round(Number(t.speedKmh))} km/h` : "speed n/a") : `${60 + Math.round((t.prog / (getTrainSegment(t)?.len || 5)) * 25)} km/h`}</div>
                  </div>
                </div>
              ))}
              <button type="button" className="rf-sidebar-link" onClick={(event) => { event.currentTarget.parentElement?.scrollTo({ top: event.currentTarget.parentElement.scrollHeight, behavior: "smooth" }); }}>View all trains ↓</button>
            </div>
          </Panel>
          <Panel className="rf-sidebar-panel rf-conflicts-panel" title={`Conflicts (${conflicts.length})`} icon={AlertTriangle}>
            <div className="rf-sidebar-scroll rf-conflict-scroll">
              {conflicts.length === 0 && <div style={{ color: "var(--green)", fontSize: 11, padding: 12 }}>✓ No active conflicts. TramenAI is resolving routine conflicts automatically.</div>}
              {conflicts.map((c) => (
                <div key={c.id} className="rf-fade-up" style={{ margin: 10, border: `1px solid ${SEV_COLOR[c.severity]}55`, background: `${SEV_COLOR[c.severity]}10`, borderRadius: 7, padding: 9 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 4 }}><span style={{ color: SEV_COLOR[c.severity], fontSize: 10, fontWeight: 800 }}>{c.block}</span><Badge color={SEV_COLOR[c.severity]} solid>{c.severity}</Badge></div>
                  <div style={{ fontSize: 11, fontWeight: 700 }}>{c.type}</div>
                  <div className="rf-mono" style={{ fontSize: 9.5, color: "var(--muted)", marginTop: 3 }}>{c.trains.join(" × ")}</div>
                  <div style={{ marginTop: 5, fontSize: 9.5, color: "var(--amber)", fontWeight: 800 }}>AI RESOLUTION IN PROGRESS</div>
                </div>
              ))}
              {awaitingAck.length > 0 && (
                <div style={{ borderTop: "1px solid var(--line)", padding: "8px 10px", marginTop: 2 }}>
                  <div style={{ fontSize: 9.5, color: "var(--amber)", fontWeight: 800 }}>AI-RESOLVED · ACKNOWLEDGMENT REQUIRED</div>
                  <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 4 }}>{awaitingAck.length} completed AI action{awaitingAck.length === 1 ? "" : "s"} awaiting operator acknowledgment.</div>
                </div>
              )}
            </div>
          </Panel>
          <Panel className="rf-sidebar-panel rf-recommendation-panel" title="AI Recommendation" icon={Sparkles} style={{ borderColor: "rgba(155,107,255,.6)" }}>
            <div style={{ padding: 11 }}>
              {recommendation && recommendedHold ? (
                <>
                  <div style={{ fontSize: 11, lineHeight: 1.5 }}>Hold <b className="rf-mono" style={{ color: "var(--amber)" }}>{recommendedHold.id}</b> for <b>4 min</b> at {recommendation.block}</div>
                  <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 6 }}>Throughput improvement: <b style={{ color: "var(--green)" }}>+18%</b></div>
                </>
              ) : <div style={{ fontSize: 11, color: "var(--muted)" }}>No intervention required. TramenAI is monitoring the corridor.</div>}
              <button type="button" style={{ width: "100%", marginTop: 10, padding: "8px 10px", border: "0", borderRadius: 6, background: "linear-gradient(90deg,var(--purple),#6d42d8)", color: "#fff", fontWeight: 800, fontSize: 10.5, cursor: "pointer" }}>⚡ Apply Optimization</button>
            </div>
          </Panel>
        </div>
      </div>
      <div className="rf-event-stream rf-scrollbar" style={{ borderTop: "1px solid var(--line)", padding: "8px 14px", maxHeight: 150, overflowY: "auto" }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--muted)", letterSpacing: .5, marginBottom: 4 }}>EVENT STREAM</div>
        <div className="rf-event-grid">{events.slice(0, 8).map((e, i) => <div key={i} className="rf-mono" style={{ fontSize: 10.5, color: i === 0 ? "var(--text)" : "var(--muted)", display: "flex", gap: 8, padding: "2px 0" }}><span style={{ color: "var(--muted)" }}>{e.t}</span>{e.msg}</div>)}</div>
      </div>
    </div>
  );
}

const LIVE_MAJOR_LABELS = new Set([
  "NDLS", "DLI", "NZM", "ANVT", "DEE", "DEC", "SSB", "SNP", "GZB", "GGN", "FDB", "TKD", "GZN", "SBB", "NUR", "PWL"
]);

function DigitalTwin({ dataMode, dataSource, trains, conflicts, onSelect }) {
  const W = 1020, H = 480;
  const [zoom, setZoom] = useState(0.92);
  const [pan, setPan] = useState({ x: 18, y: 18 });
  const dragRef = useRef(null);
  const [liveStations, setLiveStations] = useState(LIVE_DELHI_STATIONS);
  const [stationQuery, setStationQuery] = useState("");
  const [stationResults, setStationResults] = useState([]);
  const [selectedLiveStation, setSelectedLiveStation] = useState(null);
  const [hoveredLiveStation, setHoveredLiveStation] = useState(null);
  const [liveNetworkLines, setLiveNetworkLines] = useState([]);
  const [stationSearchBusy, setStationSearchBusy] = useState(false);
  const [stationSearchError, setStationSearchError] = useState("");
  const stationSearchTimerRef = useRef(null);
  const stationAbortRef = useRef(null);

  useEffect(() => {
    if (dataMode !== "LIVE") { setLiveNetworkLines([]); return; }
    setLiveStations(LIVE_DELHI_STATIONS);
    setSelectedLiveStation(null);
    setStationQuery("");
    setStationResults([]);
    setStationSearchError("");
    setZoom(1);
    setPan({ x: 0, y: 0 });
    let cancelled = false;
    const loadNetwork = async () => {
      try {
        const baseUrl = import.meta.env.VITE_TRAIN_DATA_URL || "/api/live-trains";
        const response = await fetch(`${baseUrl}?action=ncr-network`, { headers: { accept: "application/json" } });
        if (!response.ok) throw new Error(`Network ${response.status}`);
        const json = await response.json();
        const features = Array.isArray(json?.features) ? json.features : Array.isArray(json?.data?.features) ? json.data.features : [];
        const lines = [];
        const normalizePair = (pair) => {
          if (!Array.isArray(pair) || pair.length < 2) return null;
          let x = Number(pair[0]);
          let y = Number(pair[1]);
          if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
          // Some ArcGIS GeoJSON responses ignore outSR and return Web Mercator
          // meters. Convert those coordinates before projecting into our SVG.
          if (Math.abs(x) > 180 || Math.abs(y) > 90) {
            const R = 6378137;
            x = (x / R) * 180 / Math.PI;
            y = (2 * Math.atan(Math.exp(y / R)) - Math.PI / 2) * 180 / Math.PI;
          }
          return [x, y];
        };
        features.forEach((feature) => {
          const geometry = feature?.geometry;
          if (!geometry) return;
          if (geometry.type === "LineString" && Array.isArray(geometry.coordinates)) {
            const line = geometry.coordinates.map(normalizePair).filter(Boolean);
            if (line.length > 1) lines.push(line);
          }
          if (geometry.type === "MultiLineString" && Array.isArray(geometry.coordinates)) {
            geometry.coordinates.forEach((rawLine) => {
              const line = Array.isArray(rawLine) ? rawLine.map(normalizePair).filter(Boolean) : [];
              if (line.length > 1) lines.push(line);
            });
          }
        });
        if (!cancelled) setLiveNetworkLines(lines.slice(0, 1200));
      } catch {
        if (!cancelled) setLiveNetworkLines([]);
      }
    };
    loadNetwork();
    return () => { cancelled = true; };
  }, [dataMode]);

  const liveNetworkStations = useMemo(() => {
    // Keep the initial LIVE canvas intentionally readable (~38 Delhi/NCR
    // stations). Route stops are used to correct coordinates for those same
    // stations, but we do not dump every long-distance stop onto the map.
    const merged = new Map(liveStations.map((st) => [stationKey(st), st]));
    trains.forEach((train) => {
      (train.routeStops || []).forEach((stop) => {
        if (!stop?.code || !Number.isFinite(Number(stop.lat)) || !Number.isFinite(Number(stop.lng))) return;
        const key = stationKey(stop);
        const existing = merged.get(key);
        if (!existing) return;
        merged.set(key, {
          ...existing,
          name: stop.name || existing.name,
          lat: Number(stop.lat),
          lng: Number(stop.lng),
          coordinatesSource: "railradar-route",
        });
      });
    });
    return Array.from(merged.values());
  }, [liveStations, trains]);

  // Build a real-data network fallback from the route geometry/stops returned
  // for the live trains. If the external NCR infrastructure service is slow
  // or unavailable, the map still has connected, provider-backed railway
  // corridors rather than a field of floating station dots.
  const liveRouteNetworkLines = useMemo(() => {
    const lines = [];
    trains.forEach((train) => {
      const points = Array.isArray(train.routePoints) ? train.routePoints
        .map((p) => ({ lat: Number(p?.lat), lng: Number(p?.lng) }))
        .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng)) : [];
      if (points.length > 1) lines.push(points);
      const stops = Array.isArray(train.routeStops) ? train.routeStops
        .map((p) => ({ lat: Number(p?.lat), lng: Number(p?.lng) }))
        .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng)) : [];
      if (points.length < 2 && stops.length > 1) lines.push(stops);
    });
    return lines;
  }, [trains]);

  // Always-available baseline connectivity — see buildLiveSchematicNetwork
  // for why this exists. Recomputed only when the visible station set
  // changes (not on every poll), since station coordinates rarely move.
  const liveSchematicNetwork = useMemo(() => buildLiveSchematicNetwork(liveNetworkStations), [liveNetworkStations]);

  const liveBounds = useMemo(() => ({
    centerLat: LIVE_DELHI_CENTER.lat,
    centerLng: LIVE_DELHI_CENTER.lng,
    spanLat: 0.82,
    spanLng: 0.96,
  }), []);

  // Project real geographic coordinates into the LIVE SVG viewport.
  // The real Delhi/NCR network is geographically dense around the core.
  // Apply a gentle cartographic spread around Delhi so nearby stations are
  // visually separated while EVERY map layer (stations, routes, trains and
  // network geometry) continues to use the exact same projection.
  const projectLiveStationRaw = useCallback((station) => {
    const lat = Number(station?.lat);
    const lng = Number(station?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    const rawX = ((lng - (liveBounds.centerLng - liveBounds.spanLng / 2)) / liveBounds.spanLng) * W;
    const rawY = ((liveBounds.centerLat + liveBounds.spanLat / 2 - lat) / liveBounds.spanLat) * H;
    if (!Number.isFinite(rawX) || !Number.isFinite(rawY)) return null;

    const cx = W / 2;
    const cy = H / 2;
    const dx = rawX - cx;
    const dy = rawY - cy;
    const distance = Math.hypot(dx, dy);

    // Spread the dense Delhi core strongly while keeping the exact same warp
    // for stations, tracks and live train markers so every layer stays aligned.
    const coreFactor = 2.05;
    const taperRadius = 320;
    const factor = 1 + (coreFactor - 1) * Math.exp(-((distance / taperRadius) ** 2));
    const x = cx + dx * factor * 1.10;
    const y = cy + dy * factor * 0.98;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return { x, y };
  }, [liveBounds]);

  const liveLabelKeys = useMemo(() => {
    const points = liveNetworkStations
      .map((st) => ({ st, point: projectLiveStationRaw(st) }))
      .filter(({ point }) => point);
    const accepted = [];
    const keys = new Set();
    const priority = (st) => {
      const key = stationKey(st);
      return selectedLiveStation && stationKey(selectedLiveStation) === key ? 0 : LIVE_MAJOR_LABELS.has(key) ? 1 : 2;
    };
    points.sort((a, b) => priority(a.st) - priority(b.st));
    for (const { st, point } of points) {
      const key = stationKey(st);
      if (priority(st) > 1) continue;
      const labelW = Math.max(34, String(st.name || key).length * 5.1);
      const box = { left: point.x + 7, right: point.x + 7 + labelW, top: point.y - 15, bottom: point.y + 6 };
      const overlaps = accepted.some((b) => !(box.right < b.left - 5 || box.left > b.right + 5 || box.bottom < b.top - 5 || box.top > b.bottom + 5));
      if (!overlaps || (selectedLiveStation && stationKey(selectedLiveStation) === key)) {
        accepted.push(box);
        keys.add(key);
      }
    }
    return keys;
  }, [liveNetworkStations, selectedLiveStation]);

  const projectLiveStation = useCallback((station) => projectLiveStationRaw(station), [liveBounds]);

  const liveDistanceKm = (a, b) => {
    if (!a || !b) return Infinity;
    const lat1 = Number(a.lat), lat2 = Number(b.lat);
    const lng1 = Number(a.lng), lng2 = Number(b.lng);
    if (![lat1, lat2, lng1, lng2].every(Number.isFinite)) return Infinity;
    const rad = Math.PI / 180;
    const x = (lng2 - lng1) * rad * Math.cos(((lat1 + lat2) / 2) * rad);
    const y = (lat2 - lat1) * rad;
    return 6371 * Math.sqrt(x * x + y * y);
  };

  const interpolateLiveRoutePosition = (train) => {
    const route = Array.isArray(train.routePoints) ? train.routePoints
      .map((p) => ({ lat: Number(p?.lat), lng: Number(p?.lng) }))
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng)) : [];
    if (route.length < 2) return null;
    const lat = Number(train.latitude), lng = Number(train.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    // Find the route vertex nearest the provider's current/last-known point.
    let nearest = 0, nearestDistance = Infinity;
    route.forEach((point, index) => {
      const distance = liveDistanceKm({ lat, lng }, point);
      if (distance < nearestDistance) { nearestDistance = distance; nearest = index; }
    });
    if (nearestDistance > 20) return { lat, lng, source: "provider" };

    const speed = Number(train.speedKmh);
    const updatedAt = train.lastUpdate ? Date.parse(train.lastUpdate) : NaN;
    const elapsedHours = Number.isFinite(updatedAt) ? Math.max(0, Math.min(0.05, (Date.now() - updatedAt) / 3600000)) : 0;
    const travelKm = Number.isFinite(speed) && speed > 0 && train.status !== "DWELLING" && train.status !== "HELD"
      ? Math.min(speed * elapsedHours, 12)
      : 0;
    if (travelKm <= 0) return { lat, lng, source: "provider" };

    // Determine direction from the next route stop when possible.
    const nextCode = String(train.nextStation || "").toUpperCase();
    const stopIndex = (train.routeStops || []).findIndex((stop) => String(stop?.code || "").toUpperCase() === nextCode);
    const currentStopIndex = (train.routeStops || []).findIndex((stop) => String(stop?.code || "").toUpperCase() === String(train.currentStation || "").toUpperCase());
    const direction = stopIndex >= 0 && currentStopIndex >= 0 && stopIndex < currentStopIndex ? -1 : 1;

    let remaining = travelKm;
    let index = nearest;
    while (remaining > 0 && index + direction >= 0 && index + direction < route.length) {
      const next = route[index + direction];
      const current = route[index];
      const segmentKm = liveDistanceKm(current, next);
      if (!Number.isFinite(segmentKm) || segmentKm <= 0) { index += direction; continue; }
      if (remaining <= segmentKm) {
        const ratio = remaining / segmentKm;
        return {
          lat: current.lat + (next.lat - current.lat) * ratio,
          lng: current.lng + (next.lng - current.lng) * ratio,
          source: "interpolated",
        };
      }
      remaining -= segmentKm;
      index += direction;
    }
    return { ...route[Math.max(0, Math.min(route.length - 1, index))], source: "interpolated" };
  };

  const focusLiveStation = useCallback((station) => {
    const point = projectLiveStation(station);
    if (!point) return;
    setSelectedLiveStation(station);
    setZoom((z) => Math.max(z, 1.35));
    setPan({ x: W / 2 - point.x * 1.35, y: H / 2 - point.y * 1.35 });
  }, [projectLiveStation]);

  const resolveStationCoordinates = useCallback(async (station) => {
    if (Number.isFinite(Number(station?.lat)) && Number.isFinite(Number(station?.lng))) return station;
    try {
      const searchText = `${station.name || station.code} railway station${station.city ? `, ${station.city}` : ""}, India`;
      const url = `${import.meta.env.VITE_TRAIN_DATA_URL || "/api/live-trains"}?action=geocode&q=${encodeURIComponent(searchText)}`;
      const response = await fetch(url, { headers: { accept: "application/json" } });
      if (!response.ok) return station;
      const json = await response.json();
      const point = json?.data;
      if (!Number.isFinite(Number(point?.lat)) || !Number.isFinite(Number(point?.lng))) return station;
      return { ...station, lat: Number(point.lat), lng: Number(point.lng), coordinatesSource: "geocoded" };
    } catch {
      return station;
    }
  }, []);

  const runStationSearch = useCallback(async (query) => {
    const q = String(query || "").trim();
    if (!q) { setStationResults([]); setStationSearchError(""); return; }
    stationAbortRef.current?.abort();
    const controller = new AbortController();
    stationAbortRef.current = controller;
    setStationSearchBusy(true);
    setStationSearchError("");
    try {
      const results = await searchLiveStations(q, controller.signal);
      if (controller.signal.aborted) return;
      const enriched = results.map((st) => withStationCoordinates(st, Object.fromEntries(LIVE_DELHI_STATIONS.map((x) => [x.code, x]))));
      setStationResults(enriched);
    } catch (error) {
      if (error?.name !== "AbortError") setStationSearchError(error?.message || "Live station search unavailable");
    } finally {
      if (!controller.signal.aborted) setStationSearchBusy(false);
    }
  }, []);

  useEffect(() => () => { stationAbortRef.current?.abort(); clearTimeout(stationSearchTimerRef.current); }, []);

  const handleStationQueryChange = (value) => {
    setStationQuery(value);
    clearTimeout(stationSearchTimerRef.current);
    if (!value.trim()) { setStationResults([]); setStationSearchError(""); return; }
    stationSearchTimerRef.current = setTimeout(() => runStationSearch(value), 280);
  };

  const clampZoom = (value) => Math.min(3.5, Math.max(0.65, value));
  const svgPoint = (event) => {
    const svg = event.currentTarget;
    const rect = svg.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * W,
      y: ((event.clientY - rect.top) / rect.height) * H,
    };
  };
  const handleWheel = (event) => {
    event.preventDefault();
    const point = svgPoint(event);
    const nextZoom = clampZoom(zoom * (event.deltaY < 0 ? 1.12 : 0.89));
    setPan((current) => ({
      x: point.x - (point.x - current.x) * (nextZoom / zoom),
      y: point.y - (point.y - current.y) * (nextZoom / zoom),
    }));
    setZoom(nextZoom);
  };
  const handlePointerDown = (event) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    dragRef.current = { clientX: event.clientX, clientY: event.clientY, panX: pan.x, panY: pan.y };
  };
  const handlePointerMove = (event) => {
    if (!dragRef.current) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const dx = (event.clientX - dragRef.current.clientX) / rect.width * W;
    const dy = (event.clientY - dragRef.current.clientY) / rect.height * H;
    setPan({ x: dragRef.current.panX + dx, y: dragRef.current.panY + dy });
  };
  const handlePointerUp = () => { dragRef.current = null; };
  const resetView = () => dataMode === "LIVE" ? (setZoom(1), setPan({ x: 0, y: 0 }), setSelectedLiveStation(null), setHoveredLiveStation(null)) : (setZoom(0.92), setPan({ x: 18, y: 18 }));
  const zoomBy = (factor) => setZoom((value) => clampZoom(value * factor));
  const conflictSegs = new Set(conflicts.map((c) => c.segIdx));
  const trainPos = (t) => {
    const seg = getTrainSegment(t);
    if (!seg) return null;
    const a = STATIONS[seg.from], b = STATIONS[seg.to];
    if (!a || !b) return null;
    if (t.status === "DWELLING") {
      const platformPos = getTrainPlatformPosition(t);
      if (platformPos) return platformPos;
    }
    if (Number.isFinite(Number(t.mapX)) && Number.isFinite(Number(t.mapY))) {
      return { x: Number(t.mapX), y: Number(t.mapY) };
    }
    const frac = Math.min(1, Math.max(0, t.prog / seg.len));
    const p = t.dir === "down" ? frac : 1 - frac;
    return { x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p };
  };
  const [, setLiveMotionTick] = useState(0);
  useEffect(() => {
    if (dataMode !== "LIVE") return undefined;
    const timer = setInterval(() => setLiveMotionTick((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [dataMode]);

  const statusColor = (t) => t.status === "DWELLING" ? "var(--blue)" : t.status === "HELD" ? "var(--purple)" : t.delay > 0 ? "var(--amber)" : "var(--green)";

  // Live train markers cluster tightly whenever several trains sit near the
  // same real station (e.g. multiple departures from New Delhi). Recomputed
  // every render — including the once-a-second LIVE motion tick — so labels
  // stay in sync with interpolated positions instead of only updating when
  // the trains array itself changes.
  const liveTrainMarkers = dataMode !== "LIVE" ? [] : (() => {
    const candidates = [];
    trains.forEach((t) => {
      const fallbackStation = liveNetworkStations.find((st) => String(st.code).toUpperCase() === String(t.currentStation || "").toUpperCase());
      const fallback = Number.isFinite(Number(t.latitude)) && Number.isFinite(Number(t.longitude))
        ? { lat: Number(t.latitude), lng: Number(t.longitude), source: "provider" }
        : fallbackStation?.lat != null && fallbackStation?.lng != null
          ? { lat: Number(fallbackStation.lat), lng: Number(fallbackStation.lng), source: "station" }
          : null;
      const motion = interpolateLiveRoutePosition(t) || fallback;
      if (!motion) return;
      const point = projectLiveStation(motion);
      if (!point) return;
      candidates.push({ train: t, point, motion });
    });
    // Place labels top-to-bottom so stacking order is stable frame to frame
    // instead of depending on the trains array's original ordering.
    candidates.sort((a, b) => a.point.y - b.point.y);
    // Seed collision boxes with the station labels that are currently
    // visible, so a train label never lands directly on top of a station
    // name like "New Delhi" — it gets nudged clear of it instead.
    const placedBoxes = liveNetworkStations
      .map((st) => {
        const key = stationKey(st);
        const isSelected = selectedLiveStation && stationKey(selectedLiveStation) === key;
        const isHovered = hoveredLiveStation && stationKey(hoveredLiveStation) === key;
        if (!isSelected && !isHovered && !liveLabelKeys.has(key)) return null;
        const point = projectLiveStationRaw(st);
        if (!point) return null;
        const labelW = Math.max(34, String(st.name || key).length * 5.1);
        return { left: point.x + 7, right: point.x + 7 + labelW + 10, top: point.y - 17, bottom: point.y + 6 };
      })
      .filter(Boolean);
    return candidates.map(({ train, point, motion }) => {
      const labelX = point.x + 18;
      const boxWidth = Math.max(68, String(train.id).length * 6 + 55);
      const boxHeight = 20;
      let labelY = point.y - 15;
      // Nudge the label upward until it no longer overlaps a label already
      // placed for another nearby train, instead of blindly stacking by
      // array index (which produced overlapping, unreadable labels when
      // trains' real positions weren't exactly aligned).
      for (let guard = 0; guard < 30; guard++) {
        const box = { left: labelX - 2, right: labelX - 2 + boxWidth, top: labelY - 10, bottom: labelY - 10 + boxHeight };
        const overlaps = placedBoxes.some((b) => !(box.right < b.left - 4 || box.left > b.right + 4 || box.bottom < b.top - 4 || box.top > b.bottom + 4));
        if (!overlaps) break;
        labelY -= boxHeight + 3;
      }
      placedBoxes.push({ left: labelX - 2, right: labelX - 2 + boxWidth, top: labelY - 10, bottom: labelY - 10 + boxHeight });
      return { train, point, motion, labelX, labelY, boxWidth };
    });
  })();

  return (
    <Panel className="rf-digital-twin-panel" title={dataMode === "LIVE" ? `Live Digital Twin — Live Feed · Platform-aware` : `Live Digital Twin — Multi-Route Demo Network · Platform-aware`} icon={MapPin} right={<div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 9, color: "var(--muted)", flexWrap: "wrap", justifyContent: "flex-end" }}>
        {ROUTE_ORDER.map((id) => <span key={id} style={{ color: ROUTES[id].color, fontWeight: 800 }}>{ROUTES[id].short}</span>)}
        <span>● Moving</span><span>● Slowed</span><span>● Delayed</span><span>● Held</span>
      </div>} style={{ height: "100%" }}>
      <div className="rf-map-wrap" style={{ height: "100%", minHeight: 0, padding: "6px 10px 10px", boxSizing: "border-box", background: "radial-gradient(circle at 50% 50%, rgba(21,42,55,.32), transparent 65%)" }}>
        <div className="rf-map-source-badge" style={{ color: dataMode === "DEMO" ? "var(--amber)" : dataSource === "LIVE DATA NOT CONNECTED" ? "var(--red)" : "var(--green)" }}>
          {dataMode === "DEMO" ? "● DEMO SIMULATION" : dataSource === "LIVE DATA NOT CONNECTED" ? "● LIVE FEED NOT CONNECTED" : `● ${dataSource}`}
        </div>
        {dataMode === "LIVE" && <div style={{ position: "absolute", top: 10, left: 12, zIndex: 6, width: "min(430px, calc(100% - 24px))" }}>
          <div style={{ display: "flex", gap: 7, alignItems: "center", background: "rgba(7,13,20,.94)", border: "1px solid #294057", borderRadius: 10, padding: 7, boxShadow: "0 10px 24px rgba(0,0,0,.25)" }}>
            <Search size={14} color="var(--muted)" />
            <input value={stationQuery} onChange={(e) => handleStationQueryChange(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") runStationSearch(stationQuery); }} placeholder="Search real station (e.g. New Delhi / NDLS)" aria-label="Search real railway station" style={{ flex: 1, minWidth: 0, border: 0, outline: 0, background: "transparent", color: "var(--text)", fontSize: 11.5 }} />
            {stationSearchBusy && <span style={{ fontSize: 9, color: "var(--blue)" }}>SEARCHING…</span>}
          </div>
          {(stationResults.length > 0 || stationSearchError) && <div style={{ marginTop: 5, background: "rgba(7,13,20,.97)", border: "1px solid #294057", borderRadius: 9, overflow: "hidden", maxHeight: 210, overflowY: "auto" }}>
            {stationResults.map((st) => <button key={stationKey(st)} type="button" onClick={async () => { const enriched = await resolveStationCoordinates(withStationCoordinates(st, Object.fromEntries(LIVE_DELHI_STATIONS.map((x) => [x.code, x])))); setLiveStations((prev) => [enriched, ...prev.filter((x) => stationKey(x) !== stationKey(enriched))]); setStationResults([]); setStationQuery(`${st.name} (${st.code})`); focusLiveStation(enriched); }} style={{ width: "100%", textAlign: "left", padding: "9px 11px", border: 0, borderBottom: "1px solid #1d2b3b", background: "transparent", color: "var(--text)", cursor: "pointer" }}>
              <div style={{ fontWeight: 800, fontSize: 11.5 }}>{st.name}</div><div style={{ color: "var(--muted)", fontSize: 9.5, marginTop: 2 }}>{st.code}{st.city ? ` · ${st.city}` : ""}{Number.isFinite(Number(st.lat)) ? " · mapped" : " · coordinates appear when a live route supplies them"}</div>
            </button>)}
            {stationSearchError && <div style={{ padding: 10, color: "var(--red)", fontSize: 10 }}>{stationSearchError}</div>}
          </div>}
        </div>}
        <div className="rf-map-controls" aria-label="Map controls">
          <button type="button" onClick={() => zoomBy(1.2)} title="Zoom in">+</button>
          <button type="button" onClick={() => zoomBy(1 / 1.2)} title="Zoom out">−</button>
          <button type="button" onClick={resetView} title="Reset map view">⌂</button>
          <span>{Math.round(zoom * 100)}%</span>
        </div>
        {dataMode === "DEMO" && <div style={{ position: "absolute", top: 8, left: 12, right: 12, zIndex: 2, display: "flex", gap: 6, flexWrap: "wrap", pointerEvents: "none" }}>
          {ROUTE_ORDER.map((id) => <span key={id} style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: .35, padding: "4px 7px", borderRadius: 999, color: ROUTES[id].color, background: "rgba(7,13,20,.88)", border: `1px solid ${ROUTES[id].color}55` }}>{ROUTES[id].short} · 7 STATIONS</span>)}
        </div>}
        {dataMode === "LIVE" && trains.length === 0 && dataSource === "LIVE DATA NOT CONNECTED" && (
          <div className="rf-live-empty" role="status" style={{ pointerEvents: "none" }}>
            <div className="rf-live-empty-title">LIVE TRAIN FEED OFFLINE</div>
            <div className="rf-live-empty-text">Real stations remain visible. Connect the RailRadar server function to show live train markers.</div>
          </div>
        )}
        <svg
          className="rf-digital-map-svg"
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="xMidYMid meet"
          // eslint-disable-next-line react-hooks/refs
          style={{ width: "100%", height: "100%", display: "block", overflow: "hidden", cursor: dragRef.current ? "grabbing" : "grab", touchAction: "none" }}
          aria-label="Multi-route railway digital twin. Drag to pan and use the mouse wheel or controls to zoom."
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          <defs>
            <filter id="glow"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
            <pattern id="grid" width="34" height="34" patternUnits="userSpaceOnUse"><path d="M 34 0 L 0 0 0 34" fill="none" stroke="#163040" strokeWidth=".5" opacity=".35"/></pattern><clipPath id="liveNetworkClip"><rect x="0" y="0" width={W} height={H} rx="4" /></clipPath>
          </defs>
          <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
          {dataMode === "DEMO" ? <>
          <rect width={W} height={H} fill="url(#grid)" opacity=".45" />
          {SEGMENTS.map((seg, i) => {
            const a = STATIONS[seg.from], b = STATIONS[seg.to];
            const inConflict = conflictSegs.has(i);
            return <g key={seg.id}>
              {(() => {
                const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
                const nx = -dy / len, ny = dx / len;
                const lane = 4.5;
                const line = (off, width, stroke, dash) => <line x1={a.x + nx * off} y1={a.y + ny * off} x2={b.x + nx * off} y2={b.y + ny * off} stroke={stroke} strokeWidth={width} strokeDasharray={dash || "none"} />;
                return <g>
                  {line(0, seg.track === "single" ? 8 : 12, "#091017")}
                  {seg.track === "double" ? <>
                    {line(-lane, 3.2, inConflict ? "var(--red)" : "#8b969e")}
                    {line(lane, 3.2, inConflict ? "var(--red)" : "#8b969e")}
                    {line(0, 1.1, "#4e5962", "2 5")}
                  </> : line(0, 2.7, inConflict ? "var(--red)" : "#8b969e", "8 5")}
                </g>;
              })()}
              <text x={(a.x+b.x)/2} y={(a.y+b.y)/2 - 9} textAnchor="middle" fontSize="8" fill="var(--muted)" fontFamily="monospace">{seg.block}</text>
              {inConflict && <circle cx={(a.x+b.x)/2} cy={(a.y+b.y)/2} r="9" fill="var(--red)" opacity=".3" filter="url(#glow)" style={{ animation: "rfPulse 1s infinite" }} />}
            </g>;
          })}
          {/* visual junction links */}
          <path d="M 610 205 Q 700 105 790 150" fill="none" stroke="#4e5962" strokeWidth="2" strokeDasharray="7 5" opacity=".8" />
          <path d="M 305 72 Q 455 25 610 205" fill="none" stroke="#4e5962" strokeWidth="2" strokeDasharray="7 5" opacity=".7" />
          <path d="M 385 315 Q 470 245 610 205" fill="none" stroke="#4e5962" strokeWidth="2" strokeDasharray="7 5" opacity=".6" />
          {/* Station platforms: each station gets visible platform faces so the
              resolver can route arrivals to separate platform slots instead of
              treating the station as one shared point. */}
          {STATIONS.map((st, stationIdx) => {
            const count = st.platforms || 1;
            return <g key={`platforms-${st.id}`} opacity=".98">
              {Array.from({ length: count }).map((_, pi) => {
                const platform = pi + 1;
                const geo = getStationPlatformGeometry(stationIdx, platform);
                if (!geo) return null;
                const occupied = trains.some((t) => t.status === "DWELLING" && t.stationIdx === stationIdx && t.platform === platform);
                return <g key={pi}>
                  <line x1={geo.x1} y1={geo.y1} x2={geo.x2} y2={geo.y2} stroke="#24384a" strokeWidth="6" strokeLinecap="round" />
                  <line x1={geo.x1} y1={geo.y1} x2={geo.x2} y2={geo.y2} stroke={occupied ? "var(--amber)" : pi === 0 ? "#6887a3" : "#465d73"} strokeWidth="1.8" strokeLinecap="round" />
                  <line x1={st.x} y1={st.y} x2={geo.connectorX} y2={geo.connectorY} stroke={occupied ? "var(--amber)" : "#52697d"} strokeWidth="1.3" strokeDasharray="3 3" />
                  <text x={geo.x2 + 5} y={geo.y2 + 2.5} fontSize="6.5" fill={occupied ? "var(--amber)" : "var(--muted)"} fontFamily="monospace">PF{platform}{occupied ? " · OCC" : ""}</text>
                </g>;
              })}
            </g>;
          })}
          {STATIONS.map((st) => <g key={st.id}>
            <circle cx={st.x} cy={st.y} r={st.junction ? 11 : 9} fill="#0b131b" stroke={st.junction ? "var(--purple)" : "#5d86b5"} strokeWidth="2" />
            <circle cx={st.x} cy={st.y} r="4" fill={st.junction ? "var(--purple)" : "#15283a"} />
            <text x={st.x} y={st.y - 16} textAnchor="middle" fontSize="10.5" fontWeight="800" fill="var(--text)">{st.name}</text>
            <text x={st.x} y={st.y + 22 + (st.platforms || 1) * 2} textAnchor="middle" fontSize="7.5" fill="var(--muted)" fontFamily="monospace">{st.id} · {st.platforms || 1} PF</text>
          </g>)}
          {trains.filter((t) => t.status !== "ARRIVED").map((t) => {
            const pos = trainPos(t); if (!pos) return null;
            return <g key={t.id} onClick={() => onSelect(t.id)} style={{ cursor: "pointer" }}>
              <circle cx={pos.x} cy={pos.y} r={t.status === "HELD" ? 9 : 7} fill={statusColor(t)} opacity=".22" filter="url(#glow)" />
              {t.type === "Oil Tanker" ? (
                <g>
                  <rect x={pos.x-10} y={pos.y-4} width="20" height="8" rx="4" fill={statusColor(t)} stroke="#071018" strokeWidth="1.5" />
                  <circle cx={pos.x-5} cy={pos.y} r="2.5" fill="#18232c" /><circle cx={pos.x} cy={pos.y} r="2.5" fill="#18232c" /><circle cx={pos.x+5} cy={pos.y} r="2.5" fill="#18232c" />
                </g>
              ) : t.type === "Freight" ? (
                <rect x={pos.x-10} y={pos.y-4} width="20" height="8" rx="1.5" fill={statusColor(t)} stroke="#071018" strokeWidth="1.5" />
              ) : (
                <rect x={pos.x-8} y={pos.y-4} width="16" height="8" rx="3" fill={statusColor(t)} stroke="#071018" strokeWidth="1.5" />
              )}
              <path d={t.dir === "down" ? `M ${pos.x+10} ${pos.y} l 5 -3 l 0 6 z` : `M ${pos.x-10} ${pos.y} l -5 -3 l 0 6 z`} fill={statusColor(t)} />
              <text x={pos.x} y={pos.y - 12} textAnchor="middle" fontSize="8.5" fontWeight="800" fill="var(--text)" fontFamily="monospace">{t.id}</text>
              {t.status === "DWELLING" && <text x={pos.x} y={pos.y + 16} textAnchor="middle" fontSize="7.5" fill="var(--blue)" fontFamily="monospace">PF{t.platform} · DWELL</text>}
              {t.waitingForPlatform && <text x={pos.x} y={pos.y + 16} textAnchor="middle" fontSize="7.5" fill="var(--amber)" fontFamily="monospace">WAIT PF{t.platform}</text>}
              {t.delay > 0 && t.status !== "DWELLING" && <text x={pos.x} y={pos.y + 16} textAnchor="middle" fontSize="8" fill="var(--amber)" fontFamily="monospace">+{Math.round(t.delay)}m</text>}
            </g>;
          })}
          </> : <>
            <rect width={W} height={H} fill="url(#grid)" opacity=".18" />
            <text x={W / 2} y={28} textAnchor="middle" fontSize="10" fill="var(--muted)" fontFamily="monospace" letterSpacing="1.2">REAL INDIAN RAILWAYS · DELHI / NCR OPERATIONS VIEW · {liveNetworkStations.length} STATIONS · LIVE RAIL NETWORK</text>
            <g clipPath="url(#liveNetworkClip)" pointerEvents="none">
              {/* Always-on schematic backbone (straight-line minimum-spanning
                  tree over real station coordinates) so the map never shows
                  disconnected floating dots, even when the external NCR
                  infrastructure feed and per-train route data are both
                  empty. Precise geometry (below) draws on top of this. */}
              {liveSchematicNetwork.map(([a, b], index) => {
                const pa = projectLiveStation(a), pb = projectLiveStation(b);
                if (!pa || !pb) return null;
                return <g key={`schematic-${index}`}>
                  <line x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} stroke="#061019" strokeWidth="5.2" strokeLinecap="round" opacity=".86" />
                  <line x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} stroke="#425a70" strokeWidth="2.15" strokeLinecap="round" opacity=".9" />
                  <line x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} stroke="#b7cad9" strokeWidth=".55" strokeLinecap="round" opacity=".34" strokeDasharray="2 6" />
                </g>;
              })}
              {liveNetworkLines.map((line, index) => {
                const points = line.map((pair) => projectLiveStation({ lat: Number(pair?.[1]), lng: Number(pair?.[0]) })).filter(Boolean);
                if (points.length < 2) return null;
                const d = smoothSvgPath(points);
                return <g key={`ncr-rail-${index}`}>
                  <path d={d} fill="none" stroke="#07131f" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" opacity=".94" />
                  <path d={d} fill="none" stroke="#647d92" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity=".9" />
                  <path d={d} fill="none" stroke="#b7c9d8" strokeWidth=".7" strokeLinecap="round" strokeLinejoin="round" opacity=".48" strokeDasharray="2 7" />
                </g>;
              })}
              {liveRouteNetworkLines.map((line, index) => {
                const points = line.map((p) => projectLiveStation(p)).filter(Boolean);
                if (points.length < 2) return null;
                const d = smoothSvgPath(points);
                return <g key={`route-network-${index}`}>
                  <path d={d} fill="none" stroke="#07131f" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" opacity=".95" />
                  <path d={d} fill="none" stroke="#71879b" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" opacity=".95" />
                  <path d={d} fill="none" stroke="#d5e2ec" strokeWidth=".7" strokeLinecap="round" strokeLinejoin="round" opacity=".5" strokeDasharray="2 7" />
                </g>;
              })}
            </g>
            {trains.filter((t) => Array.isArray(t.routePoints) && t.routePoints.length > 1).map((t, routeIndex) => {
              const points = t.routePoints.map((p) => projectLiveStation({ lat: p.lat, lng: p.lng })).filter(Boolean);
              if (points.length < 2) return null;
              const d = smoothSvgPath(points);
              const routeColor = t.delay > 0 ? "var(--amber)" : ["#4f9ad8", "#34d399", "#a78bfa", "#54d6d2", "#7fb3ff", "#c38cff"][routeIndex % 6];
              return <g key={`live-route-${t.id}`} pointerEvents="none" clipPath="url(#liveNetworkClip)">
                <path d={d} fill="none" stroke="#061019" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" opacity=".95" />
                <path d={d} fill="none" stroke={routeColor} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" opacity=".9" />
                <path d={d} fill="none" stroke="#d7e7f5" strokeWidth=".8" strokeLinecap="round" strokeLinejoin="round" opacity=".35" strokeDasharray="2 7" />
              </g>;
            })}
            {liveNetworkStations.map((st) => {
              const point = projectLiveStation(st);
              if (!point) return null;
              const key = stationKey(st);
              const selected = selectedLiveStation && stationKey(selectedLiveStation) === key;
              const hovered = hoveredLiveStation && stationKey(hoveredLiveStation) === key;
              const showLabel = selected || hovered || liveLabelKeys.has(key);
              return <g key={key} onClick={(e) => { e.stopPropagation(); focusLiveStation(st); }} onMouseEnter={() => setHoveredLiveStation(st)} onMouseLeave={() => setHoveredLiveStation(null)} style={{ cursor: "pointer" }}>
                <title>{st.name} ({st.code}) · {st.city || "India"}</title>
                <circle cx={point.x} cy={point.y} r={selected ? 12 : hovered ? 9 : 7} fill={selected ? "var(--amber)" : "#0b131b"} stroke={selected ? "var(--amber)" : hovered ? "#8bd7ff" : "#4f9ad8"} strokeWidth={selected ? 2.5 : 1.8} />
                <circle cx={point.x} cy={point.y} r={2.5} fill={selected ? "#0b131b" : "var(--blue)"} />
                {showLabel && <g>
                  <rect x={point.x + 6} y={point.y - 17} width={Math.max(34, String(st.name || key).length * 5.1 + 10)} height={22} rx={5} fill="rgba(7,13,20,.86)" stroke={selected ? "var(--amber)" : "#294057"} strokeWidth=".7" />
                  <text x={point.x + 11} y={point.y - 7} fontSize={selected ? 9.5 : 8} fontWeight="800" fill="var(--text)">{st.name}</text>
                  <text x={point.x + 11} y={point.y + 3} fontSize="7" fill="var(--muted)" fontFamily="monospace">{st.code}</text>
                </g>}
              </g>;
            })}
            {liveTrainMarkers.map(({ train: t, point, motion, labelX, labelY, boxWidth }) => {
              const color = t.delay > 0 ? "var(--amber)" : "var(--green)";
              return <g key={`live-${t.id}`} onClick={(e) => { e.stopPropagation(); onSelect(t); }} style={{ cursor: "pointer" }}>
                <title>{t.id} · {t.name || "Live train"} · {t.speedKmh != null ? `${Math.round(t.speedKmh)} km/h` : "speed unavailable"} · {motion.source}</title>
                <circle cx={point.x} cy={point.y} r="9.5" fill="none" stroke={color} strokeWidth="1.4" opacity=".42" style={{ animation: "rfPulse 1.8s infinite" }} />
                <circle cx={point.x} cy={point.y} r="7.3" fill="#071018" stroke={color} strokeWidth="2" />
                <rect x={point.x - 8} y={point.y - 3.5} width="16" height="7" rx="2.5" fill={color} stroke="#071018" strokeWidth="1.2" />
                <path d={`M ${point.x + 8} ${point.y} l 4.5 -2.5 l 0 5 z`} fill={color} />
                {/* If a label had to be nudged away from its marker to avoid
                    colliding with another train's label, draw a thin
                    connector so it's still clear which marker it belongs to. */}
                {labelY < point.y - 30 && <line x1={point.x} y1={point.y - 13} x2={labelX + 4} y2={labelY + 6} stroke={color} strokeWidth="1" opacity=".45" strokeDasharray="2 3" />}
                <rect x={labelX - 2} y={labelY - 10} width={boxWidth} height="20" rx="6" fill="rgba(7,13,20,.94)" stroke={color} strokeWidth="1" />
                <text x={labelX + 5} y={labelY + 1} fontSize="8.5" fontWeight="900" fill="var(--text)" fontFamily="monospace">🚆 {t.id}</text>
                <text x={labelX + 5} y={labelY + 9} fontSize="6.5" fill={color} fontFamily="monospace">LIVE{t.delay > 0 ? ` · +${Math.round(t.delay)}m` : ""}{motion.source === "interpolated" ? " · SMOOTH" : ""}</text>
              </g>;
            })}
            {selectedLiveStation && projectLiveStation(selectedLiveStation) && <g>
              {(() => { const p = projectLiveStation(selectedLiveStation); return <><line x1={p.x - 22} y1={p.y} x2={p.x + 22} y2={p.y} stroke="var(--amber)" strokeWidth="1" opacity=".65" /><line x1={p.x} y1={p.y - 22} x2={p.x} y2={p.y + 22} stroke="var(--amber)" strokeWidth="1" opacity=".65" /></>; })()}
            </g>}
            <g transform="translate(22 420)">
              <rect width="410" height="38" rx="8" fill="rgba(7,13,20,.9)" stroke="#294057" />
              <circle cx="15" cy="14" r="5" fill="#0b131b" stroke="#4f9ad8" strokeWidth="1.5" /><text x="27" y="17" fontSize="8" fill="var(--text)">Real station</text>
              <rect x="115" y="10" width="16" height="7" rx="3" fill="var(--green)" /><text x="139" y="17" fontSize="8" fill="var(--text)">Live train</text>
              <line x1="205" y1="14" x2="230" y2="14" stroke="#3a5470" strokeWidth="1.4" strokeDasharray="1 6" /><text x="236" y="17" fontSize="8" fill="var(--text)">Network track · schematic</text>
              <text x="15" y="31" fontSize="7.5" fill="var(--muted)">Search results are live RailRadar station records · {liveNetworkStations.length} real stations / route stops in the Delhi/NCR view.</text>
            </g>
          </>}
          </g>
        </svg>
      </div>
    </Panel>
  );
}
function TrainDrawer({ train, onClose }) {
  if (!train) return null;
  const isLive = Boolean(train.latitude !== undefined || train.currentStation || train.nextStation);
  const routeLabel = train.from && train.to ? `${train.from} → ${train.to}` : "—";
  const serviceLabel = isLive ? "RailRadar live service" : getRoute(train).name;
  const blockLabel = isLive ? (train.currentStationName || train.currentStation || "Live telemetry") : (getTrainSegment(train)?.block || "—");
  const delayValue = Number(train.delay);
  const passengerValue = Number(train.load);
  const detailRows = [
    ["Route", routeLabel],
    ["Service", serviceLabel],
    [isLive ? "Current station" : "Current block", blockLabel],
    ["Status", train.status || "—"],
    ["Current delay", `${delayValue > 0 ? "+" : ""}${Math.round(Number.isFinite(delayValue) ? delayValue : 0)} min`],
    ...(isLive && train.nextStationName ? [["Next station", `${train.nextStationName}${train.nextStation ? ` (${train.nextStation})` : ""}`]] : []),
    ...(isLive && Number.isFinite(Number(train.speedKmh)) ? [["Speed", `${Math.round(Number(train.speedKmh))} km/h`]] : []),
    ...(isLive ? [] : [[train.type === "Freight" || train.type === "Oil Tanker" ? "Consist" : "Passenger load", train.type === "Freight" || train.type === "Oil Tanker" ? (train.consist || train.type) : `${Number.isFinite(passengerValue) ? passengerValue.toLocaleString("en-IN") : "—"} pax`]]),
  ];
  return (
    <div className="rf-slide-in" style={{ width: 300, borderLeft: "1px solid var(--line)", background: "var(--panel)", padding: 16, flexShrink: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--muted)", letterSpacing: .5 }}>TRAIN INTELLIGENCE</div>
        <X size={15} style={{ cursor: "pointer", color: "var(--muted)" }} onClick={onClose} />
      </div>
      <div className="rf-mono" style={{ fontSize: 20, fontWeight: 800, marginBottom: 1 }}>{train.id}</div>
      <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, marginBottom: 8 }}>{train.name}</div>
      <Badge color={PRIORITY_COLOR[train.type]}>{train.type}</Badge>
      <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 9, fontSize: 12 }}>
        {detailRows.map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--line)", paddingBottom: 7 }}>
              <span style={{ color: "var(--muted)" }}>{k}</span><span style={{ fontWeight: 700 }}>{v}</span>
            </div>
          ))}
      </div>
    </div>
  );
}

/* ============================== PLATFORM CLASH ALERT ============================== */
function PlatformClashOverlay({ clashes, onAck }) {
  if (!clashes.length) return null;
  const c = clashes[0];
  const gap = Math.abs(Math.round(c.etaA - c.etaB));
  return (
    <div className="rf-alarm-flash" role="alert" aria-live="assertive">
      <div style={{
        pointerEvents: "auto", background: "#1a0508", border: "2px solid var(--red)", borderRadius: 14,
        padding: "28px 32px", maxWidth: 440, textAlign: "center", boxShadow: "0 0 70px rgba(255,20,30,.55)",
      }}>
        <Siren size={36} color="var(--red)" style={{ animation: "rfPulse 0.8s infinite" }} />
        <div style={{ fontSize: 19, fontWeight: 900, color: "var(--red)", letterSpacing: 1, margin: "12px 0 6px" }}>PLATFORM CLASH ALERT</div>
        <div style={{ fontSize: 13.5, color: "#fff", lineHeight: 1.6, marginBottom: 16 }}>
          <span className="rf-mono" style={{ fontWeight: 800 }}>{c.trains.join(" & ")}</span> are both due into{" "}
          <b>{c.station.name}</b>, platform <b>{c.platform}</b>{gap > 0 ? `, within ${gap} min of each other` : ", at the same time"}.
        </div>
        {clashes.length > 1 && (
          <div style={{ fontSize: 11.5, color: "#e5a3a8", marginBottom: 14 }}>+{clashes.length - 1} more platform clash{clashes.length - 1 > 1 ? "es" : ""} active.</div>
        )}
        <button onClick={onAck} className="rf-btn-primary" style={{ ...btnGhost, background: "var(--red)", color: "#fff", borderColor: "var(--red)", fontWeight: 800, padding: "9px 20px", fontSize: 12 }}>
          ACKNOWLEDGE &amp; SILENCE
        </button>
      </div>
    </div>
  );
}

/* ============================== CONFLICTS ============================== */
function ConflictsView({ conflicts, resolvedConflicts, trains, acknowledgeConflict }) {
  const awaitingAck = resolvedConflicts.filter((c) => !c.acknowledged);
  return (
    <div style={{ padding: 18, overflowY: "auto" }} className="rf-scrollbar">
      <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>Conflict Center</div>
      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 16 }}>TramenAI detects and automatically resolves routine operational conflicts. The control operator only acknowledges the completed AI action.</div>

      {awaitingAck.length > 0 && (
        <Panel title={`AI Resolved — ${awaitingAck.length} Awaiting Acknowledgment`} icon={CheckCircle2} style={{ borderColor: "rgba(34,197,94,.45)", marginBottom: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: 12 }}>
            {awaitingAck.map((c) => (
              <div key={c.id} style={{ border: "1px solid rgba(34,197,94,.35)", background: "rgba(34,197,94,.06)", borderRadius: 8, padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Badge color="var(--green)" solid>AI RESOLVED</Badge><span className="rf-mono" style={{ fontSize: 10.5 }}>{c.id}</span></div>
                  <span style={{ fontSize: 10, color: "var(--muted)" }}>{c.resolvedAt}</span>
                </div>
                <div style={{ fontSize: 12.5, fontWeight: 700 }}>{c.type} · {c.block}</div>
                <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 4 }}>{c.resolution}</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
                  <span className="rf-mono" style={{ fontSize: 10, color: "var(--green)", fontWeight: 800 }}>{c.action}</span>
                  <button onClick={() => acknowledgeConflict(c.id)} className="rf-btn-primary" style={{ ...btnGhost, background: "var(--green)", color: "#04140c", borderColor: "var(--green)", fontWeight: 800 }}>ACKNOWLEDGE</button>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      <Panel style={{ marginBottom: 12 }}>
        <div style={{ padding: 18, textAlign: "center", color: conflicts.length ? "var(--amber)" : "var(--green)" }}>
          <div style={{ fontSize: 18, fontWeight: 900 }}>{conflicts.length}</div>
          <div style={{ fontSize: 10.5, marginTop: 3 }}>{conflicts.length ? "ACTIVE CONFLICTS — AI RESOLUTION RUNNING" : "ACTIVE CONFLICTS — NETWORK NOMINAL"}</div>
        </div>
      </Panel>

      {conflicts.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {conflicts.map((c) => {
            const involved = c.trains.map((id) => trains.find((t) => t.id === id)).filter(Boolean);
            return (
              <Panel key={c.id}>
                <div style={{ padding: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Badge color={SEV_COLOR[c.severity]} solid>{c.severity}</Badge>
                      <span style={{ fontWeight: 700, fontSize: 13.5 }}>{c.type}</span>
                    </div>
                    <span className="rf-mono" style={{ fontSize: 11, color: "var(--muted)" }}>{c.id}</span>
                  </div>
                  <div style={{ fontSize: 12.5, marginBottom: 10 }}>{c.desc}</div>
                  <div style={{ display: "flex", gap: 16, fontSize: 11.5, color: "var(--muted)", marginBottom: 10 }}>
                    <span>Block: <b style={{ color: "var(--text)" }}>{c.block}</b></span>
                    <span>Trains: <b style={{ color: "var(--text)" }}>{c.trains.length}</b></span>
                    <span>Passenger impact: <b style={{ color: "var(--red)" }}>{involved.reduce((s, t) => s + t.load, 0).toLocaleString("en-IN")}</b></span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--amber)", fontSize: 11, fontWeight: 800 }}>
                    <Sparkles size={12} /> TREMANAI IS AUTO-RESOLVING THIS CONFLICT…
                  </div>
                </div>
              </Panel>
            );
          })}
        </div>
      )}

      {!conflicts.length && !awaitingAck.length && (
        <Panel><div style={{ padding: 30, textAlign: "center", color: "var(--muted)" }}>No active conflicts. TramenAI has resolved routine conflicts automatically and there are no pending acknowledgments.</div></Panel>
      )}
    </div>
  );
}

/* ============================== OPTIMIZER ============================== */
const STAGE_LABELS = ["SCANNING NETWORK…", "ANALYZING TRAINS…", "CHECKING CONSTRAINTS…", "EVALUATING CANDIDATE SCHEDULES…", "OPTIMAL PLAN FOUND"];

function OptimizerView({ conflicts, optStage, decision, applied, runOptimizer, applySchedule }) {
  return (
    <div style={{ padding: 18, overflowY: "auto" }} className="rf-scrollbar">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800 }}>Optimizer</div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>Constraint-based scheduling · deterministic engine (OR-Tools-ready interface)</div>
        </div>
        <button onClick={runOptimizer} disabled={!conflicts.length} style={{ ...btnGhost, background: conflicts.length ? "var(--purple)" : "var(--line)", color: "#fff", borderColor: conflicts.length ? "var(--purple)" : "var(--line)", opacity: conflicts.length ? 1 : .5 }}>
          <Sparkles size={13} /> OPTIMIZE NETWORK
        </button>
      </div>

      {optStage !== null && optStage !== "done" && (
        <Panel><div style={{ padding: 24, textAlign: "center" }}>
          <div className="rf-mono" style={{ color: "var(--purple)", fontWeight: 700, fontSize: 13, animation: "rfBlink 1s infinite" }}>{STAGE_LABELS[optStage]}</div>
          <div style={{ marginTop: 12, height: 3, background: "var(--line)", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${((optStage + 1) / 5) * 100}%`, background: "var(--purple)", transition: "width .3s" }} />
          </div>
        </div></Panel>
      )}

      {decision && optStage === "done" && (
        <div className="rf-fade-up" style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 14 }}>
          <Panel title="AI Recommendation" icon={Sparkles}>
            <div style={{ padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <Badge color="var(--red)" solid>HOLD</Badge>
                <span className="rf-mono" style={{ fontSize: 18, fontWeight: 800 }}>{decision.hold.id}</span>
                <span style={{ color: "var(--muted)", fontSize: 12 }}>for {decision.holdMin} min</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 14 }}>at block {decision.conflict.block} — allowing {decision.proceed.id} to proceed</div>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--muted)", letterSpacing: .5, marginBottom: 6 }}>WHY?</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
                {decision.reasons.map((r, i) => (
                  <div key={i} style={{ display: "flex", gap: 7, fontSize: 12.5 }}><CheckCircle2 size={14} color="var(--green)" style={{ flexShrink: 0, marginTop: 1 }} />{r}</div>
                ))}
              </div>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--muted)", letterSpacing: .5, marginBottom: 6 }}>OPTIONS EVALUATED</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: "var(--green)" }}>✓ Hold {decision.hold.id} — <b>selected</b></div>
                {decision.alternatives.map((a, i) => (
                  <div key={i} style={{ fontSize: 12, color: "var(--muted)" }}>✕ {a.label} — {a.reason}</div>
                ))}
              </div>
              {!applied ? (
                <button onClick={applySchedule} style={{ ...btnGhost, background: "var(--green)", color: "#04140c", borderColor: "var(--green)", fontWeight: 800 }}>APPLY SCHEDULE</button>
              ) : (
                <Badge color="var(--green)" solid>SCHEDULE APPLIED</Badge>
              )}
            </div>
          </Panel>

          <Panel title="Before / After">
            <div style={{ display: "flex", padding: 16, gap: 24 }}>
              <MetricCol title="BEFORE" m={decision.before} color="var(--muted)" />
              <div style={{ display: "flex", alignItems: "center" }}><ArrowRight color="var(--muted)" /></div>
              <MetricCol title="AFTER" m={decision.after} color="var(--green)" />
              <div style={{ marginLeft: "auto", textAlign: "right" }}>
                <div className="rf-mono" style={{ fontSize: 22, fontWeight: 800, color: "var(--green)" }}>
                  {Math.round((1 - decision.after.delay / Math.max(1, decision.before.delay)) * 100)}%
                </div>
                <div style={{ fontSize: 10.5, color: "var(--muted)" }}>LESS TOTAL DELAY</div>
              </div>
            </div>
          </Panel>
        </div>
      )}

      {!decision && optStage === null && (
        <Panel><div style={{ padding: 30, textAlign: "center", color: "var(--muted)" }}>Run the optimizer against an active conflict to see the explainable recommendation.</div></Panel>
      )}
    </div>
  );
}

function MetricCol({ title, m, color }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--muted)", letterSpacing: .5, marginBottom: 8 }}>{title}</div>
      {[["Total delay", `${Math.round(m.delay)}m`], ["Conflicts", m.conflicts], ["Passenger impact", m.pax], ["Throughput", m.throughput]].map(([k, v]) => (
        <div key={k} style={{ fontSize: 12, marginBottom: 4 }}><span style={{ color: "var(--muted)" }}>{k}: </span><span className="rf-mono" style={{ fontWeight: 700, color }}>{v}</span></div>
      ))}
    </div>
  );
}

/* ============================== DISRUPTIONS ============================== */
function DisruptionsView({ dataMode, trains, injectDisruption, triggerPlatformClash, weather, changeWeather }) {
  const [sel, setSel] = useState(trains[0]?.id ?? "");
  const isLive = dataMode === "LIVE";
  useEffect(() => { if (!trains.some((t) => t.id === sel)) setSel(trains[0]?.id ?? ""); }, [trains, sel]);
  return (
    <div className="rf-section-view rf-scrollbar" style={{ width: "100%", padding: 18, maxWidth: "none", overflowY: "auto" }}>
      <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>{isLive ? "⚡ Safe Disruption Simulator · LIVE" : "⚡ Disruption Simulator"}</div>
      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 18 }}>
        {isLive ? "Create operational stress scenarios for the digital twin only. Nothing is sent to Indian Railways or applied to a real train." : "Inject a controlled operational disruption into the demo corridor and watch the network react."}
      </div>
      <Panel style={{ borderColor: isLive ? "var(--amber)" : "var(--red)" }}>
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: .6, color: isLive ? "var(--amber)" : "var(--muted)" }}>SIMULATION ONLY</div>
          <div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 6 }}>SELECT TRAIN</div>
            <select value={sel} onChange={(e) => setSel(e.target.value)} style={selectStyle}>
              {trains.map((t) => <option key={t.id} value={t.id}>{t.id} — {t.name || t.type}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[["Delay spike", 12], ["Track blockage", 18], ["Signal failure", 8], ["Platform closure", 15]].map(([label, min]) => (
              <button key={label} type="button" onClick={() => injectDisruption(sel, min, label)} style={{ ...btnGhost, background: "var(--amber)", color: "#17120a", borderColor: "var(--amber)" }}>
                {label} (+{min}m)
              </button>
            ))}
          </div>
          {isLive && <div style={{ fontSize: 10.5, color: "var(--muted)", lineHeight: 1.5 }}>LIVE mode treats these as temporary UI-side scenarios so you can demonstrate detection and recovery without representing or causing a real-world accident.</div>}
        </div>
      </Panel>

      <div style={{ fontSize: 15, fontWeight: 800, margin: "22px 0 4px" }}>🌦️ Weather Control</div>
      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 14 }}>Adverse weather adds a speed-restriction penalty to simulated movement until conditions clear.</div>
      <Panel style={{ borderColor: WEATHER_INFO[weather].color }}>
        <div style={{ padding: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
          {Object.entries(WEATHER_INFO).map(([key, info]) => {
            const Icon = { clear: Sun, fog: CloudFog, rain: CloudRain, heatwave: Thermometer }[key];
            const active = weather === key;
            return <button key={key} type="button" onClick={() => changeWeather(key)} style={{ ...btnGhost, background: active ? info.color : "transparent", color: active ? "#04140c" : "var(--muted)", borderColor: info.color }}><Icon size={13} /> {info.label}</button>;
          })}
        </div>
      </Panel>

      {!isLive && <Panel style={{ borderColor: "var(--red)", marginTop: 22 }}>
        <div style={{ padding: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>🚨 Platform Conflict Scenario</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 12 }}>Force two demo trains onto the same platform at the same time to demonstrate TramenAI's conflict detection and resolution flow.</div>
          <button type="button" onClick={triggerPlatformClash} className="rf-btn-primary" style={{ ...btnGhost, background: "var(--red)", color: "#fff", borderColor: "var(--red)", fontWeight: 800 }}><Siren size={13} /> SIMULATE PLATFORM CONFLICT</button>
        </div>
      </Panel>}
    </div>
  );
}

const selectStyle = { width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid var(--line)", background: "var(--panel2)", color: "var(--text)", fontSize: 12.5 };

/* ============================== CREW & ROLLING STOCK ============================== */
function CrewRakeView({ trains }) {
  return (
    <div className="rf-section-view rf-scrollbar" style={{ padding: 18 }}>
      <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>👷 Crew Duty &amp; Rolling Stock</div>
      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 18 }}>Loco-pilot duty hours and rake condition across the active fleet — flags fatigue risk and maintenance needs before they become incidents.</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {trains.map((t) => {
          const fatigue = t.crewHours >= 8;
          const maint = t.rakeHealth < 60;
          return (
            <Panel key={t.id} style={{ borderColor: fatigue || maint ? "var(--amber)" : "var(--line)" }}>
              <div style={{ padding: 14, display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
                <div style={{ minWidth: 130 }}>
                  <div className="rf-mono" style={{ fontWeight: 800, fontSize: 14 }}>{t.id}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>{t.name}</div>
                </div>
                <div style={{ minWidth: 170 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--muted)", marginBottom: 3 }}>
                    <span><Users size={11} style={{ verticalAlign: -1, marginRight: 3 }} />Crew duty</span>
                    <b style={{ color: fatigue ? "var(--red)" : "var(--text)" }}>{t.crewHours?.toFixed(1)}h</b>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: "var(--panel2)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${Math.min(100, (t.crewHours / 12) * 100)}%`, background: fatigue ? "var(--red)" : "var(--blue)" }} />
                  </div>
                  {fatigue && <div style={{ fontSize: 10, color: "var(--red)", marginTop: 3, fontWeight: 700 }}>⚠ FATIGUE RISK — crew change advised</div>}
                </div>
                <div style={{ minWidth: 170, flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--muted)", marginBottom: 3 }}>
                    <span><Wrench size={11} style={{ verticalAlign: -1, marginRight: 3 }} />Rake health</span>
                    <b style={{ color: maint ? "var(--red)" : "var(--green)" }}>{Math.round(t.rakeHealth)}%</b>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: "var(--panel2)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${t.rakeHealth}%`, background: maint ? "var(--red)" : "var(--green)" }} />
                  </div>
                  {maint && <div style={{ fontSize: 10, color: "var(--red)", marginTop: 3, fontWeight: 700 }}>⚠ MAINTENANCE DUE — schedule at next yard stop</div>}
                </div>
                <Badge color={t.status === "HELD" ? "var(--red)" : t.delay > 0 ? "var(--amber)" : "var(--green)"} solid>{t.status}</Badge>
              </div>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}

/* ============================== COMPLAINTS (OPS) ============================== */
function ComplaintsView({ complaints, acknowledgeComplaint }) {
  // Acknowledged items leave the active work queue immediately.
  // The Firestore listener remains the source of truth, so the item also
  // stays gone after a refresh or when another operator acknowledges it.
  const activeComplaints = useMemo(
    () => complaints.filter((c) => !c.acknowledged),
    [complaints]
  );

  const correlatedGroups = useMemo(() => {
    const groups = {};
    activeComplaints.forEach((c) => {
      if (c.correlated) {
        groups[c.correlated] = groups[c.correlated] || [];
        groups[c.correlated].push(c);
      }
    });
    return groups;
  }, [activeComplaints]);

  const aiResolved = activeComplaints.filter((c) => c.status === "AI_RESOLVED").length;
  const awaitingAck = activeComplaints.length;
  const escalated = activeComplaints.filter((c) => c.status === "ESCALATED").length;
  const correlationEntries = Object.entries(correlatedGroups);

  return (
    <div
      style={{
        height: "100%",
        minHeight: 0,
        padding: 18,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        boxSizing: "border-box",
      }}
      className="rf-scrollbar rf-complaints-shell"
    >
      {/* Fixed header area */}
      <div style={{ flexShrink: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>
          AI Complaint Resolution Center
        </div>
        <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 14 }}>
          TramenAI analyzes, correlates and resolves routine complaints automatically.
          The control operator only acknowledges the completed AI action.
        </div>

        <div className="rf-complaints-kpis" style={{ display: "flex", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
          <Kpi label="Active" value={activeComplaints.length} />
          <Kpi label="AI Resolved" value={aiResolved} color="var(--green)" />
          <Kpi label="Awaiting ACK" value={awaitingAck} color="var(--amber)" />
          <Kpi label="Escalated" value={escalated} color="var(--red)" />
        </div>

        {/* Compact correlation summary instead of one large card per block.
            This prevents the page from growing endlessly as correlations arrive. */}
        {correlationEntries.length > 0 && (
          <Panel className="rf-correlation" style={{ marginBottom: 12, borderColor: "var(--purple)", flexShrink: 0 }}>
            <div style={{ padding: 10, background: "rgba(160,107,255,.08)" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  marginBottom: 7,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ fontSize: 11.5, fontWeight: 800, color: "var(--purple)" }}>
                  AI OPERATIONAL CORRELATION
                </div>
                <div style={{ fontSize: 10.5, color: "var(--muted)" }}>
                  {correlationEntries.length} active block{correlationEntries.length > 1 ? "s" : ""}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 7,
                  overflowX: "auto",
                  paddingBottom: 2,
                }}
                className="rf-scrollbar"
              >
                {correlationEntries.map(([block, list]) => (
                  <div
                    key={block}
                    style={{
                      flex: "0 0 auto",
                      padding: "7px 9px",
                      borderRadius: 7,
                      border: "1px solid rgba(160,107,255,.45)",
                      background: "rgba(160,107,255,.06)",
                      fontSize: 11,
                    }}
                  >
                    <b>{block}</b>
                    <span style={{ color: "var(--muted)" }}>
                      {" "}· {list.length} complaint{list.length > 1 ? "s" : ""}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Panel>
        )}
      </div>

      {/* Only this area scrolls, so the page itself never becomes an
          endlessly stacked complaint wall. */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          paddingRight: 4,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
        className="rf-scrollbar rf-complaints-list"
      >
        {activeComplaints.length === 0 && (
          <Panel>
            <div style={{ padding: 28, textAlign: "center", color: "var(--muted)" }}>
              {complaints.length > 0
                ? "All complaints have been acknowledged. Nothing needs attention."
                : "No complaints yet."}
            </div>
          </Panel>
        )}

        {activeComplaints.map((c) => (
          <Panel
            className="rf-complaint-card"
            key={c.id}
            style={{ flex: "0 0 auto", minHeight: 0, height: "auto", overflow: "visible" }}
            bodyStyle={{ flex: "0 0 auto", minHeight: 0, overflow: "visible" }}
          >
            <div style={{ padding: 14 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 10,
                  flexWrap: "wrap",
                }}
              >
                <Badge color={SEV_COLOR[c.severity] || "var(--muted)"}>{c.severity}</Badge>

                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700 }}>
                    {c.trainId} · {c.category}
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{c.text}</div>
                </div>

                <Badge
                  color={
                    c.status === "ESCALATED"
                      ? "var(--red)"
                      : c.status === "AI_RESOLVED"
                        ? "var(--green)"
                        : "var(--amber)"
                  }
                >
                  {c.status}
                </Badge>
              </div>

              <div
                style={{
                  padding: 12,
                  borderRadius: 8,
                  background: "rgba(59,130,246,.06)",
                  border: "1px solid var(--line)",
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    fontSize: 10.5,
                    fontWeight: 800,
                    color: "var(--blue)",
                    marginBottom: 6,
                  }}
                >
                  🤖 TRAMENAI AUTONOMOUS ACTION
                </div>
                <div style={{ fontSize: 12, marginBottom: 7 }}>{c.resolution}</div>
                <div style={{ fontSize: 11.5, color: "var(--muted)" }}>
                  <b>Action:</b> {c.action}
                </div>
                {c.resolvedAt && (
                  <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 6 }}>
                    Resolved at {c.resolvedAt}
                  </div>
                )}
              </div>

              {c.correlated && (
                <div style={{ fontSize: 11.5, color: "var(--purple)", marginBottom: 10 }}>
                  🔗 Correlated with operational block <b>{c.correlated}</b>
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 10,
                  paddingTop: 10,
                  borderTop: "1px solid var(--line)",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ fontSize: 11.5, color: "var(--muted)" }}>
                  AI action completed. Operator acknowledgment required.
                </div>

                <button
                  onClick={() => acknowledgeComplaint(c.id)}
                  className="rf-btn-primary"
                  style={{
                    ...btnGhost,
                    background: "var(--green)",
                    color: "#06130e",
                    borderColor: "var(--green)",
                    fontWeight: 800,
                  }}
                >
                  <CheckCircle2 size={13} /> ACKNOWLEDGE AI RESOLUTION
                </button>
              </div>
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}

/* ============================== ANALYTICS ============================== */
function AnalyticsView({ trains, conflicts, totalDelay, passengerImpact }) {
  const byType = {};
  trains.forEach((t) => { byType[t.type] = (byType[t.type] || 0) + 1; });
  const max = Math.max(...Object.values(byType), 1);
  return (
    <div className="rf-analytics-shell" style={{ padding: 18 }}>
      <div className="rf-analytics-header"><div><div className="rf-analytics-title">Analytics</div><div className="rf-analytics-subtitle">Network performance, fleet mix and operational impact.</div></div></div>
      <div className="rf-analytics-grid" style={{ display: "flex", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        <Kpi label="Total Delay" value={`${Math.round(totalDelay)}m`} />
        <Kpi label="Conflicts Now" value={conflicts.length} />
        <Kpi label="Passenger Impact" value={passengerImpact.toLocaleString("en-IN")} />
        <Kpi label="Fleet Size" value={trains.length} />
      </div>
      <Panel title="Trains by Type">
        <div style={{ padding: 16 }}>
          {Object.entries(byType).map(([type, count]) => (
            <div key={type} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{ width: 80, fontSize: 12 }}>{type}</div>
              <div style={{ flex: 1, background: "var(--line)", borderRadius: 4, height: 14 }}>
                <div style={{ width: `${(count / max) * 100}%`, height: "100%", background: PRIORITY_COLOR[type], borderRadius: 4 }} />
              </div>
              <div className="rf-mono" style={{ width: 20, fontSize: 12 }}>{count}</div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

/* ============================== PASSENGER PORTAL ============================== */
/** Passenger quick-action tile with real-time pointer-driven 3D tilt + glare. */
function QuickActionCard({ Icon, title, sub, onClick }) {
  const tilt = useTilt({ max: 8 });
  return (
    <button
      ref={tilt.ref}
      onPointerMove={tilt.onPointerMove}
      onPointerLeave={tilt.onPointerLeave}
      onClick={onClick}
      className="rf-quick-action rf-tilt-live rf-tilt-glare"
      style={{ width: "100%", height: "100%", boxSizing: "border-box", ...tilt.style }}
    >
      <Icon size={19} />
      <div style={{ fontSize: 12.5, fontWeight: 800 }}>{title}</div>
      <div style={{ color: "#7b8799", fontSize: 10.5, marginTop: 4 }}>{sub}</div>
    </button>
  );
}

function PassengerPortal({ trains, stations, selectedTrain, setSelectedTrain, decision, submitComplaint, identifier, dataMode, dataSource }) {
  const [view, setView] = useState("status");
  const [form, setForm] = useState({ category: "Delay", text: "" });
  const [sent, setSent] = useState(null);
  const [query, setQuery] = useState("");
  const [profile, setProfile] = useState(() => getDemoProfile(identifier));
  const [profileSaved, setProfileSaved] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [pnr, setPnr] = useState("");
  const [pnrResult, setPnrResult] = useState(null);
  const [inquiry, setInquiry] = useState({ trainNumber: "22439", station: "", question: "" });
  const [inquiryResult, setInquiryResult] = useState(null);
  const [ticketSearch, setTicketSearch] = useState({ from: "Ratnapur", to: "Chandigarh Jn", date: "2026-08-28" });
  const [ticketResults, setTicketResults] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [bookingPassenger, setBookingPassenger] = useState({ name: "Aarav Sharma", age: "28", berth: "LOWER" });
  const [booking, setBooking] = useState(null);
  const [bookings, setBookings] = useState(() => getDemoBookings());
  const [loading, setLoading] = useState(false);
  const isLive = dataMode === "LIVE";
  const liveFeedUnavailable = isLive && dataSource === "LIVE DATA NOT CONNECTED";
  const displayTrains = liveFeedUnavailable ? [] : trains;
  const [passengerDark, setPassengerDark] = useState(() => { try { return localStorage.getItem("rf-passenger-theme") === "dark"; } catch { return false; } });
  const togglePassengerTheme = () => setPassengerDark((v) => { const next = !v; try { localStorage.setItem("rf-passenger-theme", next ? "dark" : "light"); } catch {} return next; });
  const t = displayTrains.find((x) => String(x.id) === String(selectedTrain)) || displayTrains[0] || null;
  const seg = t ? getTrainSegment(t) : null;
  const route = t ? getRoute(t) : null;
  const isHeldByDecision = Boolean(t && decision && decision.hold.id === t.id);
  const matches = query.length > 0
    ? displayTrains.filter((tr) => tr.id.includes(query) || tr.name.toLowerCase().includes(query.toLowerCase())).slice(0, 5)
    : [];
  const routeStations = route ? route.stationIds.map((id, idx) => ({ ...stationById[id], idx })).filter(Boolean) : [];
  const routeEnd = Math.max(0, routeStations.length - 1);
  const routeProgress = t && seg && routeEnd > 0
    ? Math.max(0, Math.min(1, ((t.routePos ?? 0) + Math.min(1, t.prog / seg.len)) / routeEnd))
    : 0;
  const progressIdx = t && seg
    ? Math.min(routeEnd, (t.routePos ?? 0) + Math.min(1, t.prog / seg.len))
    : 0;

  return (
    <div style={{ flex: 1, minHeight: 0, minWidth: 0, padding: "24px 28px", overflowY: "auto" }} className={`rf-scrollbar rf-passenger-shell ${passengerDark ? "rf-passenger-dark" : "rf-passenger-light"}`}>
      <div style={{ maxWidth: 1040, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div><div style={{ fontSize: 21, fontWeight: 800, color: "#172b4d" }}>Good morning, {profile.name?.split(" ")[0] || "traveller"}</div><div style={{ fontSize: 12, color: "#68758a", marginTop: 4 }}>Where would you like to go today?</div></div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={togglePassengerTheme} title={passengerDark ? "Switch to light theme" : "Switch to dark theme"} className="rf-passenger-theme-toggle">{passengerDark ? "☀" : "☾"}<span>{passengerDark ? "LIGHT" : "DARK"}</span></button>
            <div style={{ position: "relative" }}>
            <button onClick={() => setAccountOpen((open) => !open)} title="Open account menu" style={{ width: 40, height: 40, borderRadius: "50%", border: "2px solid #fff", background: "#f47721", color: "#fff", fontSize: 16, fontWeight: 800, cursor: "pointer", boxShadow: "0 2px 8px rgba(9,30,66,.15)" }}>{profile.name?.charAt(0) || "P"}</button>
            {accountOpen && <div style={{ position: "absolute", top: 48, right: 0, zIndex: 8, width: 190, background: "#fff", border: "1px solid #e3e7ef", borderRadius: 10, padding: 6, boxShadow: "0 12px 28px rgba(9,30,66,.16)" }}>
              <div style={{ padding: "9px 10px 8px", borderBottom: "1px solid #eef1f5", marginBottom: 4 }}><b style={{ color: "#172b4d", fontSize: 12 }}>{profile.name}</b><div style={{ color: "#7b8799", fontSize: 10.5, marginTop: 2 }}>{profile.email}</div></div>
              {[['profile', 'My profile'], ['tickets', 'My bookings'], ['complaint', 'Help & complaints']].map(([id, label]) => <button key={id} onClick={() => { setView(id); setAccountOpen(false); }} style={{ width: "100%", border: 0, background: "transparent", textAlign: "left", padding: "9px 10px", borderRadius: 6, color: "#172b4d", cursor: "pointer", fontSize: 12 }}>{label}</button>)}
            </div>}
            </div>
          </div>
        </div>

        <div className="rf-passenger-hero">
          <div style={{ position: "absolute", top: -30, right: -10, zIndex: 0, opacity: .85 }}>
            <Hero3D size={150} />
          </div>
          <div style={{ position: "relative", zIndex: 1, fontSize: 22, fontWeight: 800 }}>Book your next journey</div>
          <div style={{ position: "relative", zIndex: 1, color: "#d9e3f4", fontSize: 12, marginTop: 5 }}>Search trains, check availability and travel with confidence.</div>
          <div className="rf-travel-search">
            <input value={ticketSearch.from} onChange={(e) => setTicketSearch((v) => ({ ...v, from: e.target.value }))} placeholder="From" aria-label="From station" />
            <input value={ticketSearch.to} onChange={(e) => setTicketSearch((v) => ({ ...v, to: e.target.value }))} placeholder="To" aria-label="To station" />
            <input type="date" value={ticketSearch.date} onChange={(e) => setTicketSearch((v) => ({ ...v, date: e.target.value }))} aria-label="Journey date" />
            <button onClick={async () => {
              setView("tickets");
              if (isLive) {
                setTicketResults(displayTrains.filter((tr) => {
                  const fromOk = !ticketSearch.from || String(tr.from || "").toLowerCase().includes(ticketSearch.from.toLowerCase());
                  const toOk = !ticketSearch.to || String(tr.to || "").toLowerCase().includes(ticketSearch.to.toLowerCase());
                  return fromOk || toOk;
                }).slice(0, 8).map((tr) => ({ id: tr.id, name: tr.name || tr.type, departure: "LIVE", arrival: "LIVE", className: tr.type || "Live", seats: null, fare: null, live: true })));
                return;
              }
              setLoading(true);
              setTicketResults(await searchDemoTickets(ticketSearch));
              setLoading(false);
            }} className="rf-btn-primary rf-glow-btn" style={{ ...btnGhost, background: "#f47721", color: "#fff", borderColor: "#f47721", justifyContent: "center", padding: "10px 17px", fontWeight: 800 }}>{isLive ? "VIEW LIVE TRAINS" : "SEARCH"}</button>
          </div>
        </div>

        <div className="rf-quick-grid">
          {[["pnr", Search, "Check PNR", "Get booking status"], ["status", Train, "Train status", "Track in real time"], ["inquiry", MessageSquare, "Ask NTES", "Get passenger help"], ["profile", UserIcon, "My profile", "Manage your details"]].map(([id, Icon, title, sub], i) => (
            <Reveal key={id} delay={i * 0.06} y={12}>
              <QuickActionCard Icon={Icon} title={title} sub={sub} onClick={() => setView(id)} />
            </Reveal>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {[['status', 'Live Status'], ['pnr', 'PNR'], ['tickets', 'Buy Ticket'], ['inquiry', 'NTES Inquiry'], ['complaint', 'Report an Issue']].map(([id, label]) => (
            <button key={id} onClick={() => setView(id)} className="rf-btn-primary" style={{ ...btnGhost, padding: "8px 12px", fontSize: 11.5, background: view === id ? "var(--blue)" : "var(--panel2)", color: view === id ? "#fff" : "var(--muted)", borderColor: view === id ? "var(--blue)" : "var(--line)" }}>{label}</button>
          ))}
        </div>

        <div style={{ marginBottom: 16, padding: "9px 12px", border: `1px solid ${dataMode === "DEMO" ? "#f47721" : dataSource === "LIVE DATA NOT CONNECTED" ? "#e05252" : "#20c98a"}`, background: dataMode === "DEMO" ? "rgba(244,119,33,.07)" : dataSource === "LIVE DATA NOT CONNECTED" ? "rgba(224,82,82,.07)" : "rgba(32,201,138,.07)", borderRadius: 8, fontSize: 11.5, color: dataMode === "DEMO" ? "#b85b12" : dataSource === "LIVE DATA NOT CONNECTED" ? "#b53d3d" : "#13845d" }}>
          {dataMode === "DEMO"
            ? "DEMO MODE · Simulated railway services · Fictional corridor"
            : dataSource === "LIVE DATA NOT CONNECTED"
              ? "LIVE MODE · Live railway feed unavailable · No demo data is being substituted"
              : `LIVE MODE · ${dataSource} · Live operational status feed`}
        </div>

        {view === "status" && (
          t ? (
          <>
            <div style={{ position: "relative", marginBottom: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 10, padding: "11px 14px" }}>
                <Search size={15} color="var(--muted)" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Enter train number or name — e.g. 12951 or Shristi"
                  style={{ border: "none", outline: "none", background: "transparent", color: "var(--text)", fontSize: 13, flex: 1 }} />
                {query && <X size={14} color="var(--muted)" style={{ cursor: "pointer" }} onClick={() => setQuery("")} />}
              </div>
              {matches.length > 0 && (
                <div className="rf-fade-up" style={{ position: "absolute", top: "108%", left: 0, right: 0, background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 10, overflow: "hidden", zIndex: 5, boxShadow: "0 10px 30px rgba(0,0,0,.3)" }}>
                  {matches.map((tr) => (
                    <div key={tr.id} onClick={() => { setSelectedTrain(tr.id); setQuery(""); }}
                      style={{ padding: "10px 14px", cursor: "pointer", display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--line)" }}>
                      <span><span className="rf-mono" style={{ fontWeight: 700 }}>{tr.id}</span> <span style={{ color: "var(--muted)", fontSize: 12 }}>{tr.name}</span></span>
                      <span style={{ fontSize: 11.5, color: "var(--muted)" }}>{tr.from} → {tr.to}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 7, marginBottom: 18, flexWrap: "wrap" }}>
              {displayTrains.map((tr) => (
                <span key={tr.id} onClick={() => setSelectedTrain(tr.id)} className="rf-mono" style={{
                  fontSize: 11, padding: "5px 10px", borderRadius: 999, cursor: "pointer",
                  background: tr.id === t.id ? "var(--blue)" : "var(--panel2)", color: tr.id === t.id ? "#fff" : "var(--muted)",
                  border: `1px solid ${tr.id === t.id ? "var(--blue)" : "var(--line)"}`,
                }}>{tr.id}</span>
              ))}
            </div>

            <Panel className="rf-passenger-panel" style={{ boxShadow: passengerDark ? "0 8px 24px rgba(0,0,0,.18)" : "0 8px 24px rgba(9,30,66,.07)" }}>
              <div style={{ padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                  <div>
                    <div className="rf-mono" style={{ fontSize: 23, fontWeight: 800 }}>{t.id}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)" }}>{t.name}</div>
                  </div>
                  <Badge color={t.delay > 0 ? "var(--amber)" : "var(--green)"} solid>{t.delay > 0 ? `${Math.round(t.delay)} MIN LATE` : "ON TIME"}</Badge>
                </div>
                <div style={{ fontSize: 12.5, color: "var(--muted)", margin: "10px 0 8px" }}>{t.from} → {t.to}</div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 9.5, fontWeight: 800, color: route.color, border: `1px solid ${route.color}55`, background: `${route.color}12`, padding: "4px 7px", borderRadius: 999, marginBottom: 12 }}>{route.short} · {routeStations.length} STATIONS</div>

                {/* journey progress */}
                <div style={{ position: "relative", height: 4, background: "var(--line)", borderRadius: 2, margin: "0 4px 10px" }}>
                  <div style={{ position: "absolute", left: t.dir === "up" ? `${routeProgress * 100}%` : 0, top: 0, height: "100%", width: `${(t.dir === "up" ? 1 - routeProgress : routeProgress) * 100}%`, background: "var(--blue)", borderRadius: 2, transition: "left .5s, width .5s" }} />
                  {routeStations.map((s) => (
                    <div key={s.id} style={{ position: "absolute", top: -3, left: `${(s.idx / routeEnd) * 100}%`, width: 10, height: 10, borderRadius: "50%", transform: "translateX(-50%)", background: t.dir === "up" ? s.idx >= progressIdx ? "var(--blue)" : "var(--panel2)" : s.idx <= progressIdx ? "var(--blue)" : "var(--panel2)", border: "2px solid var(--bg)" }} />
                  ))}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9.5, color: "var(--muted)", marginBottom: 18 }}>
                  {routeStations.map((s) => <span key={s.id} style={{ flex: "1 1 0", minWidth: 0, textAlign: "center", lineHeight: 1.2, overflowWrap: "anywhere", marginLeft: s.idx === 0 ? -4 : 0, marginRight: s.idx === routeEnd ? -4 : 0 }}>{s.name.split(" ")[0]}</span>)}
                </div>

                <div style={{ display: "flex", gap: 24 }}>
                  <div><div style={{ fontSize: 10.5, color: "var(--muted)" }}>NEAR</div><div style={{ fontWeight: 700, fontSize: 13 }}>{stations[seg.from].name}</div></div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{(t.load ?? 0).toLocaleString("en-IN")}</div>
                  <div><div style={{ fontSize: 10.5, color: "var(--muted)" }}>CLASS</div><div style={{ fontWeight: 700, fontSize: 13 }}>{t.type}</div></div>
                </div>

                {isHeldByDecision && (
                  <div style={{ background: "rgba(59,130,246,.08)", border: "1px solid var(--blue)", borderRadius: 8, padding: 14, marginTop: 16 }}>
                    <div style={{ fontWeight: 700, fontSize: 12.5, marginBottom: 6, color: "var(--blue)" }}>Why is my train delayed?</div>
                    <div style={{ fontSize: 12.5, marginBottom: 10 }}>Your train is being held near {stations[seg.from].name} to prevent a conflict with another train sharing the same section.</div>
                    <div style={{ display: "flex", gap: 18 }}>
                      <div><div style={{ fontSize: 10, color: "var(--muted)" }}>WITHOUT OPTIMIZATION</div><div className="rf-mono" style={{ fontWeight: 700 }}>{Math.round(decision.before.delay)}m</div></div>
                      <div><div style={{ fontSize: 10, color: "var(--muted)" }}>OPTIMIZED DELAY</div><div className="rf-mono" style={{ fontWeight: 700, color: "var(--green)" }}>{decision.holdMin}m</div></div>
                      <div><div style={{ fontSize: 10, color: "var(--muted)" }}>SAVED</div><div className="rf-mono" style={{ fontWeight: 700, color: "var(--green)" }}>{Math.max(0, Math.round(decision.before.delay - decision.holdMin))}m</div></div>
                    </div>
                  </div>
                )}
              </div>
            </Panel>
          </>
          ) : (
            <Panel className="rf-passenger-panel" title={isLive ? "Live Train Status" : "Demo Train Status"} icon={Train}>
              <div style={{ padding: 24, textAlign: "center" }}>
                <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 7, color: "var(--text)" }}>{isLive ? "Live train feed unavailable" : "No simulated trains available"}</div>
                <div style={{ fontSize: 11.5, color: "var(--muted)", lineHeight: 1.6 }}>
                  {isLive
                    ? "The passenger portal is still available, but no live train records are connected right now. No demo records are being shown as a fallback."
                    : "The demo corridor currently has no train records. Return to the command center or restart the simulation."}
                </div>
              </div>
            </Panel>
          )
        )}

        {view === "pnr" && (
          <Panel title="Check PNR Status" icon={Search}>
            <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
              <input value={pnr} onChange={(e) => setPnr(e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="Enter 10-digit PNR · Try 8456123098" style={selectStyle} />
              <button disabled={loading} onClick={async () => { if (isLive) { setPnrResult({ status: "LIVE SERVICE UNAVAILABLE", train: "", journey: "", coach: "", provider: "No authorized PNR service connected" }); return; } setLoading(true); setPnrResult(await getPnrStatus(pnr || "8456123098")); setLoading(false); }} className="rf-btn-primary" style={{ ...btnGhost, background: "var(--blue)", color: "#fff", borderColor: "var(--blue)", justifyContent: "center", padding: "10px 14px" }}>{loading ? "CHECKING..." : "CHECK PNR"}</button>
              {pnrResult && <div className="rf-fade-up" style={{ padding: 14, border: `1px solid ${isLive ? "#e05252" : "var(--green)"}`, borderRadius: 8, background: isLive ? "rgba(224,82,82,.06)" : "rgba(31,207,143,.08)" }}><Badge color={isLive ? "var(--red)" : "var(--green)"} solid>{pnrResult.status}</Badge>{!isLive && <><div style={{ fontWeight: 800, marginTop: 10 }}>{pnrResult.train}</div><div style={{ color: "var(--muted)", fontSize: 12, marginTop: 5 }}>{pnrResult.journey} · Coach {pnrResult.coach}</div><div style={{ color: "var(--muted)", fontSize: 10.5, marginTop: 10 }}>{pnrResult.provider} · Demo result</div></>} {isLive && <div style={{ color: "var(--muted)", fontSize: 11.5, marginTop: 8 }}>PNR services are not connected to the live railway feed in this prototype. No demo PNR result is shown.</div>}</div>}
            </div>
          </Panel>
        )}

        {view === "inquiry" && (
          <Panel title="NTES Passenger Inquiry" icon={MessageSquare}>
            <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
              <input value={inquiry.trainNumber} onChange={(e) => setInquiry((v) => ({ ...v, trainNumber: e.target.value }))} placeholder="Train number" style={selectStyle} />
              <input value={inquiry.station} onChange={(e) => setInquiry((v) => ({ ...v, station: e.target.value }))} placeholder="Station (optional)" style={selectStyle} />
              <textarea value={inquiry.question} onChange={(e) => setInquiry((v) => ({ ...v, question: e.target.value }))} placeholder="What would you like to know?" rows={3} style={{ ...selectStyle, resize: "vertical" }} />
              <button disabled={loading} onClick={async () => { if (isLive) { setInquiryResult({ answer: "Live passenger inquiry service is not connected in this prototype.", provider: "No authorized live NTES service connected", reference: "LIVE-OFFLINE" }); return; } setLoading(true); setInquiryResult(await getNtesInquiry(inquiry)); setLoading(false); }} className="rf-btn-primary" style={{ ...btnGhost, background: "var(--blue)", color: "#fff", borderColor: "var(--blue)", justifyContent: "center", padding: "10px 14px" }}>{loading ? "CONNECTING..." : "SEND INQUIRY"}</button>
              {inquiryResult && <div className="rf-fade-up" style={{ padding: 14, border: `1px solid ${isLive ? "#e05252" : "var(--blue)"}`, borderRadius: 8, fontSize: 12.5 }}>{inquiryResult.answer}<div style={{ color: "var(--muted)", fontSize: 10.5, marginTop: 10 }}>{inquiryResult.provider} · Ref {inquiryResult.reference}</div></div>}
            </div>
          </Panel>
        )}

        {view === "tickets" && (
          <Panel title={isLive ? "Live Train Availability" : "Buy a Demo Ticket"} icon={TicketIcon}>
            <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
              {isLive ? (
                <>
                  <div style={{ padding: 14, border: "1px solid #20c98a", borderRadius: 8, background: "rgba(32,201,138,.06)", color: "#172b4d" }}>
                    <div style={{ fontWeight: 800, marginBottom: 5 }}>Live booking is not connected</div>
                    <div style={{ fontSize: 11.5, color: "#68758a", lineHeight: 1.5 }}>TramenAI can display live train movement when the authorized RailRadar feed is available, but this prototype does not invent fares, seats or bookings in LIVE mode.</div>
                  </div>
                  {ticketResults.length > 0 ? ticketResults.map((ticket) => <div key={ticket.id} style={{ padding: 13, border: "1px solid #dfe5ee", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, background: "#fff" }}><div><b className="rf-mono">{ticket.id}</b> <b>{ticket.name}</b><div style={{ color: "#68758a", fontSize: 11.5, marginTop: 5 }}>{ticket.from || ticket.departure} → {ticket.to || ticket.arrival} · {ticket.status || "LIVE STATUS"}</div></div><span style={{ color: "#13845d", fontSize: 10.5, fontWeight: 800 }}>LIVE</span></div>) : <div style={{ padding: 16, textAlign: "center", color: "#68758a", fontSize: 11.5 }}>No live trains match the current search, or the live feed is unavailable.</div>}
                </>
              ) : (
                <>
              <div style={{ display: "flex", gap: 8 }}><input value={ticketSearch.from} onChange={(e) => setTicketSearch((v) => ({ ...v, from: e.target.value }))} placeholder="From" style={{ ...selectStyle, flex: 1 }} /><input value={ticketSearch.to} onChange={(e) => setTicketSearch((v) => ({ ...v, to: e.target.value }))} placeholder="To" style={{ ...selectStyle, flex: 1 }} /></div>
              <input type="date" value={ticketSearch.date} onChange={(e) => setTicketSearch((v) => ({ ...v, date: e.target.value }))} style={selectStyle} />
              <button disabled={loading} onClick={async () => { setLoading(true); setTicketResults(await searchDemoTickets(ticketSearch)); setSelectedTicket(null); setBooking(null); setLoading(false); }} className="rf-btn-primary" style={{ ...btnGhost, background: "var(--blue)", color: "#fff", borderColor: "var(--blue)", justifyContent: "center", padding: "10px 14px" }}>{loading ? "SEARCHING..." : "SEARCH TRAINS"}</button>
              {ticketResults.map((ticket) => <div key={ticket.id} style={{ padding: 13, border: "1px solid var(--line)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}><div><b className="rf-mono">{ticket.id}</b> <b>{ticket.name}</b><div style={{ color: "var(--muted)", fontSize: 11.5, marginTop: 5 }}>{ticket.departure} → {ticket.arrival} · {ticket.className} · {ticket.seats} seats</div></div><button onClick={() => setSelectedTicket(ticket)} style={{ ...btnGhost, color: "var(--blue)", borderColor: "var(--blue)" }}>SELECT ₹{ticket.fare}</button></div>)}
              {selectedTicket && !booking && <div style={{ padding: 14, border: "1px solid var(--blue)", borderRadius: 8, display: "flex", flexDirection: "column", gap: 10 }}><b>Passenger details</b><input value={bookingPassenger.name} onChange={(e) => setBookingPassenger((v) => ({ ...v, name: e.target.value }))} placeholder="Full name" style={selectStyle} /><input value={bookingPassenger.age} onChange={(e) => setBookingPassenger((v) => ({ ...v, age: e.target.value }))} placeholder="Age" style={selectStyle} /><select value={bookingPassenger.berth} onChange={(e) => setBookingPassenger((v) => ({ ...v, berth: e.target.value }))} style={selectStyle}><option>LOWER</option><option>MIDDLE</option><option>UPPER</option></select><button disabled={loading} onClick={async () => { setLoading(true); const result = await bookDemoTicket({ train: selectedTicket, passenger: bookingPassenger }); setBooking(result); setBookings(getDemoBookings()); setLoading(false); }} className="rf-btn-primary" style={{ ...btnGhost, background: "var(--green)", color: "#07130e", borderColor: "var(--green)", justifyContent: "center", padding: "10px 14px" }}>{loading ? "CONFIRMING..." : "CONFIRM DEMO BOOKING"}</button></div>}
              {booking && <div className="rf-fade-up" style={{ padding: 14, border: "1px solid var(--green)", borderRadius: 8, background: "rgba(31,207,143,.08)" }}><Badge color="var(--green)" solid>{booking.status}</Badge><div style={{ fontWeight: 800, fontSize: 20, marginTop: 10 }} className="rf-mono">PNR {booking.pnr}</div><div style={{ fontSize: 12, color: "var(--muted)", marginTop: 5 }}>Booking {booking.id} · {booking.train.name}</div></div>}
              {bookings.length > 0 && <div><b style={{ fontSize: 12 }}>Booking history</b>{bookings.map((item) => <div key={item.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--line)", fontSize: 11.5 }}><span><b className="rf-mono">{item.pnr}</b> · {item.train.name}<br /><span style={{ color: "var(--muted)" }}>{item.status}</span></span>{item.status.startsWith("CONFIRMED") && <button onClick={() => { cancelDemoBooking(item.id); setBookings(getDemoBookings()); }} style={{ ...btnGhost, color: "var(--red)", borderColor: "var(--red)" }}>CANCEL</button>}</div>)}</div>}
                </>
              )}
            </div>
          </Panel>
        )}

        {view === "profile" && (
          <Panel title="Passenger Profile" icon={UserIcon}>
            <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}><div style={{ width: 52, height: 52, borderRadius: "50%", background: "var(--blue)", color: "#fff", display: "grid", placeItems: "center", fontSize: 20, fontWeight: 800 }}>{profile.name?.charAt(0) || "P"}</div><div><b>{profile.name}</b><div style={{ color: "var(--muted)", fontSize: 11 }}>Demo authenticated passenger</div></div></div>
              <input value={profile.name} onChange={(e) => setProfile((v) => ({ ...v, name: e.target.value }))} placeholder="Full name" style={selectStyle} /><input value={profile.email} onChange={(e) => setProfile((v) => ({ ...v, email: e.target.value }))} placeholder="Email" style={selectStyle} /><input value={profile.phone} onChange={(e) => setProfile((v) => ({ ...v, phone: e.target.value }))} placeholder="Phone number" style={selectStyle} /><input value={profile.photo} onChange={(e) => setProfile((v) => ({ ...v, photo: e.target.value }))} placeholder="Photo URL (demo)" style={selectStyle} />
              <button onClick={() => { saveDemoProfile(profile); setProfileSaved(true); setTimeout(() => setProfileSaved(false), 2200); }} className="rf-btn-primary" style={{ ...btnGhost, background: "var(--blue)", color: "#fff", borderColor: "var(--blue)", justifyContent: "center", padding: "10px 14px" }}>SAVE PROFILE</button>
              {profileSaved && <div style={{ color: "var(--green)", fontSize: 12 }}>Profile saved locally for this demo account.</div>}
            </div>
          </Panel>
        )}

        {view === "complaint" && (
          <Panel title="Report an Issue" icon={MessageSquare}>
            <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
              {trains.length > 0 ? (
                <select value={t?.id || selectedTrain || ""} onChange={(e) => setSelectedTrain(e.target.value)} style={selectStyle}>
                  {trains.map((tr) => <option key={tr.id} value={tr.id}>{tr.id} — {tr.name}</option>)}
                </select>
              ) : (
                <input
                  value={selectedTrain || ""}
                  onChange={(e) => setSelectedTrain(e.target.value)}
                  placeholder="Enter train number (e.g. 12951)"
                  style={selectStyle}
                  inputMode="numeric"
                />
              )}
              <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} style={selectStyle}>
                {["Delay", "Cleanliness", "Safety", "Staff behaviour", "Overcrowding", "Catering", "Other"].map((c) => <option key={c}>{c}</option>)}
              </select>
              <textarea value={form.text} onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))} placeholder="What happened?" rows={4} style={{ ...selectStyle, resize: "vertical" }} />
              <button onClick={async () => {
                try {
                  const trainIdForComplaint = String(t?.id || selectedTrain || "UNKNOWN").trim() || "UNKNOWN";
                  const c = await submitComplaint({ trainId: trainIdForComplaint, category: form.category, text: form.text || "No details provided." });
                  setSent(c);
                  setForm({ category: "Delay", text: "" });
                } catch {
                  setSent({ id: "SYNC-ERROR", severity: "ERROR", correlated: null });
                }
              }}
                className="rf-btn-primary" style={{ ...btnGhost, background: "var(--blue)", color: "#fff", borderColor: "var(--blue)", justifyContent: "center", padding: "10px 14px" }}>
                <Send size={13} /> SUBMIT COMPLAINT
              </button>
              {sent && (
                <div className="rf-fade-up" style={{ fontSize: 12.5, lineHeight: 1.45, padding: 12, borderRadius: 7, background: sent.severity === "ERROR" ? "rgba(255,107,121,.12)" : "rgba(34,211,143,.1)", border: `1px solid ${sent.severity === "ERROR" ? "var(--red)" : "var(--green)"}`, color: sent.severity === "ERROR" ? "#ffd4d8" : "#c7ffe8" }}>
                  {sent.severity === "ERROR" ? (
                    <>We couldn&apos;t send your complaint. Please try again.</>
                  ) : (
                    <>Complaint <b className="rf-mono">{sent.id}</b> received. The control room has been notified and TramenAI is reviewing it. <b>Current status: RECEIVED</b>.</>
                  )}
                </div>
              )}
            </div>
          </Panel>
        )}
      </div>
    </div>
  );
}

/* ============================== INTRO ANIMATION ============================== */
// Deterministic pseudo-random (pure — safe to use during render, no Math.random needed).
function prng(seed) { const x = Math.sin(seed * 12.9898) * 43758.5453; return x - Math.floor(x); }

/* ============================== SHARED VIBE ELEMENTS ============================== */

/** 1. Floating dock-style menu — magnifies icons on hover, sits fixed bottom-center. */
function FloatingMenu({ items }) {
  const [hoverId, setHoverId] = useState(null);
  return (
    <div style={{ position: "fixed", left: "50%", bottom: 20, transform: "translateX(-50%)", zIndex: 60, display: "flex", alignItems: "flex-end", gap: 6, padding: "8px 10px", borderRadius: 999, background: "rgba(13,20,32,.72)", border: "1px solid rgba(124,236,255,.22)", backdropFilter: "blur(14px)", boxShadow: "0 14px 34px rgba(0,0,0,.4)" }}>
      {items.map((it) => {
        const active = hoverId === it.id;
        return (
          <button key={it.id} onClick={it.onClick} onMouseEnter={() => setHoverId(it.id)} onMouseLeave={() => setHoverId(null)} title={it.label} style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 2, background: active ? "rgba(59,130,246,.18)" : "transparent",
            border: "none", borderRadius: 12, cursor: "pointer", color: active ? "#7cecff" : "var(--muted)", padding: "8px 10px",
            transform: active ? "translateY(-8px) scale(1.18)" : "translateY(0) scale(1)", transition: "transform .22s cubic-bezier(.34,1.56,.64,1),background .2s ease,color .2s ease",
          }}>
            <it.icon size={17} />
            {active && <span className="rf-fade-up" style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: .3, whiteSpace: "nowrap" }}>{it.label}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** 2. Dome gallery — a slowly auto-rotating 3D ring of icon chips, purely decorative. */
function DomeGallery({ chips }) {
  const n = chips.length;
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", perspective: 900, overflow: "hidden", opacity: .8 }}>
      <div style={{ position: "relative", width: 1, height: 1, transformStyle: "preserve-3d", animation: "rf-dome-spin 26s linear infinite" }}>
        {chips.map((c, i) => {
          const angle = (360 / n) * i;
          return (
            <div key={c.label} style={{
              position: "absolute", top: 0, left: 0, width: 108, height: 40, marginLeft: -54, marginTop: -20,
              transform: `rotateY(${angle}deg) translateZ(200px)`,
              display: "flex", alignItems: "center", gap: 6, justifyContent: "center",
              borderRadius: 999, border: "1px solid rgba(124,236,255,.25)", background: "rgba(13,20,32,.55)",
              color: "#9be8ff", fontSize: 9.5, fontWeight: 700, letterSpacing: .3, backdropFilter: "blur(6px)",
            }}>
              <c.icon size={12} /> {c.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** 3. Splash cursor — pointer leaves a trail of fading neon ripples. */
function SplashCursor() {
  const [splashes, setSplashes] = useState([]);
  const lastRef = useRef(0);
  const idRef = useRef(0);

  const spawn = (x, y, big) => {
    const id = ++idRef.current;
    setSplashes((s) => [...s.slice(-18), { id, x, y, big }]);
    setTimeout(() => setSplashes((s) => s.filter((sp) => sp.id !== id)), 750);
  };

  useEffect(() => {
    const onMove = (e) => {
      const now = performance.now();
      if (now - lastRef.current < 55) return;
      lastRef.current = now;
      spawn(e.clientX, e.clientY, false);
    };
    const onDown = (e) => spawn(e.clientX, e.clientY, true);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerdown", onDown);
    return () => { window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerdown", onDown); };
  }, []);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, pointerEvents: "none", overflow: "hidden" }}>
      {splashes.map((s) => (
        <span key={s.id} className="rf-splash-ripple" style={{
          left: s.x, top: s.y, width: s.big ? 46 : 20, height: s.big ? 46 : 20,
          borderColor: s.big ? "#ff2bb5" : "#19e7ff", boxShadow: s.big ? "0 0 22px #ff2bb5" : "0 0 12px #19e7ff",
        }} />
      ))}
    </div>
  );
}

/** 4. Curved loop — text marquee bending around a circular SVG path. */
function CurvedLoop({ text, radius = 150, size = 340, color = "#7cecff", duration = 18 }) {
  const pathId = useMemo(() => `rf-curve-${Math.round(radius)}-${text.length}`, [radius, text.length]);
  const loopText = `${text} • `.repeat(3);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: "visible" }}>
      <defs>
        <path id={pathId} d={`M ${size / 2 - radius},${size / 2} a ${radius},${radius} 0 1,1 ${radius * 2},0 a ${radius},${radius} 0 1,1 ${-radius * 2},0`} />
      </defs>
      <g style={{ animation: `rf-curve-spin ${duration}s linear infinite`, transformOrigin: `${size / 2}px ${size / 2}px` }}>
        <text fill={color} fontSize="10.5" fontWeight="700" letterSpacing="2.5" style={{ fontFamily: "var(--mono)" }}>
          <textPath href={`#${pathId}`} startOffset="0%">{loopText}</textPath>
        </text>
      </g>
    </svg>
  );
}

/** 6. Pixel transition — a grid of tiles that dissolve away to reveal the screen beneath. */
function PixelTransition({ transitionKey, cols = 14, rows = 8 }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 760);
    return () => clearTimeout(t);
  }, [transitionKey]);
  const tiles = useMemo(() => {
    const arr = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) arr.push({ r, c, seed: r * cols + c });
    return arr;
  }, [cols, rows]);
  if (!visible) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 999, display: "grid", gridTemplateColumns: `repeat(${cols},1fr)`, gridTemplateRows: `repeat(${rows},1fr)`, pointerEvents: "none" }}>
      {tiles.map((tl) => (
        <div key={`${tl.r}-${tl.c}`} className="rf-pixel-tile" style={{ animationDelay: `${prng(tl.seed + 1) * 0.32}s` }} />
      ))}
    </div>
  );
}

const INTRO_BOOT_LINES = [
  "INITIALIZING DIGITAL TWIN…",
  "SYNCING SIGNAL NETWORK…",
  "CALIBRATING AI COPILOT…",
  "TRAMENAI READY.",
];

function IntroScreen({ onDone }) {
  const [phase, setPhase] = useState(0); // 0 boot, 1 train crossing, 2 reveal
  const [bootLine, setBootLine] = useState(0);
  const timers = useRef([]);
  const reducedMotion = useRef(typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);

  // Deterministic pseudo-random (pure, so safe to compute during render) — avoids Math.random in render.

  const stars = useMemo(() => Array.from({ length: 44 }).map((_, i) => ({
    id: i, top: prng(i + 1) * 70, left: prng(i + 51) * 100,
    size: 1 + prng(i + 101) * 2, delay: prng(i + 151) * 3, dur: 2 + prng(i + 201) * 2.5,
  })), []);

  const sparks = useMemo(() => Array.from({ length: 10 }).map((_, i) => ({
    id: i, left: 18 + prng(i + 301) * 8, w: 3 + prng(i + 351) * 3, h: 3 + prng(i + 401) * 3,
    sx: (prng(i + 451) - 0.5) * 60, sy: -20 - prng(i + 501) * 40,
  })), []);

  useEffect(() => {
    const localTimers = timers.current;
    if (reducedMotion.current) {
      setPhase(3);
      localTimers.push(setTimeout(onDone, 900));
      return () => localTimers.forEach(clearTimeout);
    }
    localTimers.push(setTimeout(() => setBootLine(1), 500));
    localTimers.push(setTimeout(() => setBootLine(2), 1050));
    localTimers.push(setTimeout(() => setBootLine(3), 1650));
    localTimers.push(setTimeout(() => setPhase(1), 700));
    localTimers.push(setTimeout(() => setPhase(2), 3050));
    localTimers.push(setTimeout(onDone, 5100));
    return () => localTimers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const skip = () => {
    timers.current.forEach(clearTimeout);
    onDone();
  };

  const crossing = phase >= 1;
  const title = "TramenAI";

  return (
    <div className="rf-root rf-scrollbar" style={{ height: "100%", width: "100%", overflow: "hidden", position: "relative", background: "radial-gradient(ellipse at 50% 25%,#15284c 0%,#090d1b 48%,#03050b 100%)" }}>
      <style>{CSS}</style>
      <style>{`
        @keyframes rfi-train{0%{transform:translateX(-135%) scale(.9);opacity:0;}10%{opacity:1;}72%{opacity:1;}100%{transform:translateX(135%) scale(1.08);opacity:0;}}
        @keyframes rfi-trail{0%{transform:scaleX(.1);opacity:0;}18%{opacity:.75;}100%{transform:scaleX(1);opacity:0;}}
        @keyframes rfi-light{0%,100%{opacity:.3;transform:scaleY(.9);}50%{opacity:1;transform:scaleY(1.15);}}
        @keyframes rfi-cloud{from{transform:translateX(0);}to{transform:translateX(-60px);}}
        @keyframes rfi-reveal{from{opacity:0;transform:translateY(12px) scale(.96);}to{opacity:1;transform:translateY(0) scale(1);}}
        @keyframes rfi-sky{from{transform:translateX(0);}to{transform:translateX(-80px);}}
        @keyframes rfi-ring{from{transform:scale(.6);opacity:0;}45%{opacity:.65;}to{transform:scale(1.35);opacity:0;}}
        @keyframes rfi-letter{from{opacity:0;transform:translateY(16px) rotateX(60deg);}to{opacity:1;transform:translateY(0) rotateX(0);}}
        @keyframes rfi-sparks{0%{transform:translate(0,0) scale(1);opacity:.9;}100%{transform:translate(var(--sx),var(--sy)) scale(0);opacity:0;}}
        @keyframes rfi-bootBlink{0%,100%{opacity:1;}50%{opacity:0;}}
        @keyframes rfi-barFill{from{width:0%;}to{width:100%;}}
        .rfi-train{animation:rfi-train 2.2s cubic-bezier(.18,.72,.24,1) both;}
        .rfi-light{animation:rfi-light 1.2s ease-in-out infinite;}
        .rfi-cloud{animation:rfi-cloud 7s linear infinite alternate;}
        .rfi-reveal{animation:rfi-reveal .8s cubic-bezier(.16,1,.3,1) both;}
        .rfi-trail{animation:rfi-trail 2.1s cubic-bezier(.16,1,.3,1) both;transform-origin:right center;}
        .rfi-sky{animation:rfi-sky 12s linear infinite alternate;}
        .rfi-ring{animation:rfi-ring 2.4s ease-out infinite;}
        .rfi-ring2{animation:rfi-ring 2.4s ease-out .5s infinite;}
        .rfi-letter{display:inline-block;animation:rfi-letter .55s cubic-bezier(.16,1,.3,1) both;}
        .rfi-spark{position:absolute;border-radius:50%;background:#7cecff;animation:rfi-sparks .9s ease-out infinite;}
        .rfi-star{position:absolute;border-radius:50%;background:#fff;animation:rfi-bootBlink 3s ease-in-out infinite;}
        .rfi-bar-fill{animation:rfi-barFill 5s linear both;}
        .rfi-cursor{display:inline-block;width:6px;height:12px;background:#7cecff;margin-left:2px;animation:rfi-bootBlink .8s steps(2) infinite;vertical-align:middle;}
        @media (prefers-reduced-motion:reduce){.rfi-train,.rfi-light,.rfi-cloud,.rfi-reveal,.rfi-trail,.rfi-sky,.rfi-ring,.rfi-ring2,.rfi-letter,.rfi-spark,.rfi-star,.rfi-bar-fill,.rfi-cursor{animation:none!important;}}
      `}</style>

      <div className="rf-intro-grid" />
      <div className="rf-intro-scan" />

      {stars.map((s) => (
        <div key={s.id} className="rfi-star" style={{ top: `${s.top}%`, left: `${s.left}%`, width: s.size, height: s.size, animationDelay: `${s.delay}s`, animationDuration: `${s.dur}s` }} />
      ))}
      <div className="rf-orb" style={{ top: "8%", left: "6%", width: 220, height: 220, background: "radial-gradient(circle,rgba(25,231,255,.28),transparent 70%)", animationDuration: "10s" }} />
      <div className="rf-orb" style={{ top: "58%", right: "8%", width: 260, height: 260, background: "radial-gradient(circle,rgba(255,43,181,.22),transparent 70%)", animationDuration: "13s", animationDelay: "1.2s" }} />
      <div className="rf-orb" style={{ bottom: "4%", left: "38%", width: 180, height: 180, background: "radial-gradient(circle,rgba(155,107,255,.24),transparent 70%)", animationDuration: "11s", animationDelay: "2.4s" }} />

      <button onClick={skip} style={{ position: "absolute", top: 18, right: 20, zIndex: 5, background: "transparent", border: "1px solid var(--line)", color: "var(--muted)", borderRadius: 6, padding: "6px 12px", fontSize: 11, fontWeight: 700, letterSpacing: .5, cursor: "pointer" }}>
        SKIP ►
      </button>

      {phase < 2 && (
        <div className="rf-mono" style={{ position: "absolute", top: 20, left: 22, zIndex: 5, fontSize: 10.5, color: "#7cecff", letterSpacing: .5, lineHeight: 1.9 }}>
          {INTRO_BOOT_LINES.slice(0, bootLine + 1).map((line, i) => (
            <div key={i} className="rf-fade-up" style={{ opacity: .85 }}>
              <span style={{ color: "#39dfab" }}>{'>'}</span> {line}{i === bootLine && <span className="rfi-cursor" />}
            </div>
          ))}
        </div>
      )}

      <div className="rfi-sky" style={{ position: "absolute", inset: 0, opacity: .75, backgroundImage: "radial-gradient(circle at 12% 23%,#fff 0 1px,transparent 2px),radial-gradient(circle at 28% 13%,#fff 0 1px,transparent 2px),radial-gradient(circle at 47% 27%,#fff 0 1px,transparent 2px),radial-gradient(circle at 67% 12%,#fff 0 1px,transparent 2px),radial-gradient(circle at 86% 30%,#fff 0 1px,transparent 2px),radial-gradient(circle at 74% 42%,#fff 0 1px,transparent 2px)", backgroundSize: "310px 210px" }} />
      <div className="rfi-cloud" style={{ position: "absolute", top: "22%", left: "8%", width: 170, height: 42, borderRadius: 40, background: "rgba(195,225,242,.14)", boxShadow: "120px 22px 0 rgba(195,225,242,.1), 440px -28px 0 rgba(195,225,242,.12)" }} />
      <div style={{ position: "absolute", inset: "26% 0 18%", background: "linear-gradient(180deg,transparent,rgba(8,13,30,.65)),repeating-linear-gradient(90deg,transparent 0 78px,rgba(29,218,255,.13) 79px 80px,transparent 81px 160px)", transform: "perspective(280px) rotateX(18deg)", transformOrigin: "bottom", opacity: .9 }} />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: "20%", height: 3, background: "linear-gradient(90deg,transparent 5%,#1de2ff 35%,#ff2bb5 70%,transparent 95%)", boxShadow: "0 0 28px #1de2ff,0 0 42px #ff2bb5" }} />
      <div style={{ position: "absolute", left: "-10%", right: "-10%", bottom: "9%", height: 4, background: "#111b32", transform: "perspective(180px) rotateX(22deg)", boxShadow: "0 15px 0 #070b16,0 30px 0 #03050b" }} />
      {crossing && <div className="rfi-trail" style={{ position: "absolute", right: "55%", bottom: "31%", width: "45vw", height: 4, borderRadius: 10, background: "linear-gradient(90deg,transparent,#19e7ff,#ff2bb5)", boxShadow: "0 0 22px #19e7ff" }} />}
      {crossing && sparks.map((s, i) => (
        <div key={s.id} className="rfi-spark" style={{
          left: `${s.left}%`, bottom: `29%`, width: s.w, height: s.h,
          animationDelay: `${i * 0.18}s`, boxShadow: "0 0 6px #7cecff",
          "--sx": `${s.sx}px`, "--sy": `${s.sy}px`,
        }} />
      ))}
      {crossing && <svg className="rfi-train" viewBox="0 0 760 220" style={{ position: "absolute", left: 0, bottom: "20%", width: "78vw", minWidth: 620, maxWidth: 980, overflow: "visible" }}>
        <defs><linearGradient id="rfiBody" x1="0" x2="1" y1="0" y2="1"><stop stopColor="#e9f5ff" /><stop offset=".28" stopColor="#8ea7c4" /><stop offset=".7" stopColor="#2e4568" /><stop offset="1" stopColor="#101b35" /></linearGradient><linearGradient id="rfiNeon" x1="0" x2="1"><stop stopColor="#19e7ff" /><stop offset=".5" stopColor="#bf52ff" /><stop offset="1" stopColor="#ff2bb5" /></linearGradient><filter id="rfiBlur"><feGaussianBlur stdDeviation="10" /></filter></defs>
        <path className="rfi-trail" d="M40 92h650" stroke="#19e7ff" strokeWidth="18" opacity=".22" filter="url(#rfiBlur)" />
        <path d="M48 72h560c45 0 72 18 108 54v49H48z" fill="#071022" opacity=".75" filter="url(#rfiBlur)" />
        <path d="M38 68h575c45 0 78 20 112 58v49H38z" fill="url(#rfiBody)" stroke="#d7f4ff" strokeWidth="2" />
        <path d="M38 68h62v107H38z" fill="#ff2bb5" opacity=".88" /><path d="M100 68h513" stroke="url(#rfiNeon)" strokeWidth="9" /><path d="M100 160h600" stroke="#19e7ff" strokeWidth="3" opacity=".9" />
        {Array.from({ length: 8 }).map((_, i) => <g key={i}><rect x={125 + i * 58} y="84" width="42" height="31" rx="3" fill="#08152a" stroke="#a8edff" strokeWidth="2" /><rect x={130 + i * 58} y="89" width="32" height="5" fill="#55f3ff" opacity=".45" /></g>)}
        <path d="M612 70l78 56 28 0-34-32c-17-16-36-24-72-24z" fill="#d7e8fa" stroke="#fff" strokeWidth="2" /><path d="M694 126h42" stroke="#ff2bb5" strokeWidth="5" /><circle className="rfi-light" cx="80" cy="176" r="16" fill="#111c36" stroke="#19e7ff" strokeWidth="3" /><circle className="rfi-light" cx="170" cy="176" r="16" fill="#111c36" stroke="#19e7ff" strokeWidth="3" /><circle className="rfi-light" cx="585" cy="176" r="16" fill="#111c36" stroke="#19e7ff" strokeWidth="3" />
      </svg>}

      <SplashCursor />

      <div className={phase >= 2 ? "rfi-reveal" : ""} style={{
        position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        opacity: phase >= 2 ? 1 : 0, transform: phase >= 2 ? "translateY(0)" : "translateY(14px)",
        transition: "opacity .6s ease-out, transform .6s ease-out", pointerEvents: "none",
      }}>
        <div className="rfi-ring" style={{ position: "absolute", width: 250, height: 250, borderRadius: "50%", border: "1px solid rgba(25,231,255,.65)", boxShadow: "0 0 35px rgba(255,43,181,.18)" }} />
        <div className="rfi-ring2" style={{ position: "absolute", width: 320, height: 320, borderRadius: "50%", border: "1px solid rgba(155,107,255,.4)" }} />
        {phase >= 2 && (
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)" }}>
            <CurvedLoop text="AI COPILOT • DIGITAL TWIN • CONFLICT-FREE ROUTING • REAL-TIME" radius={165} size={370} />
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 800, fontSize: 34, letterSpacing: .5, color: "var(--text)" }}>
          <Train size={30} color="var(--blue)" style={{ animation: phase >= 2 ? "rfPulse 1.8s ease-in-out infinite" : "none" }} />
          {phase >= 2 && title.split("").map((ch, i) => (
            <span key={i} className="rfi-letter rf-grad-text" style={{ animationDelay: `${i * 0.045}s` }}>{ch}</span>
          ))}
        </div>
        <div style={{ fontSize: 16, fontWeight: 800, color: "#7cecff", marginTop: 16, letterSpacing: 2, textTransform: "uppercase" }} className="rf-fade-up">THE FUTURE OF RAIL OPERATIONS</div>
        <div className="rf-hi rf-fade-up" style={{ fontSize: 12, color: "var(--muted)", marginTop: 6, animationDelay: ".15s" }}>रेल यातायात नियंत्रण प्रणाली · Digital Twin</div>
        <div className="rf-fade-up" style={{ display: "flex", gap: 8, marginTop: 18, animationDelay: ".3s" }}>
          {["AI Copilot", "Live Conflict Resolve", "Digital Twin"].map((chip) => (
            <span key={chip} style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: .4, padding: "5px 10px", borderRadius: 999, border: "1px solid rgba(124,236,255,.35)", color: "#9be8ff", background: "rgba(124,236,255,.06)" }}>{chip}</span>
          ))}
        </div>
      </div>

      <div style={{ position: "absolute", left: "50%", bottom: 26, transform: "translateX(-50%)", width: 180, height: 3, borderRadius: 3, background: "rgba(255,255,255,.08)", overflow: "hidden" }}>
        <div className="rfi-bar-fill" style={{ height: "100%", background: "linear-gradient(90deg,#19e7ff,#9b6bff,#ff2bb5)", boxShadow: "0 0 10px #19e7ff" }} />
      </div>
    </div>
  );
}

/* ============================== AUTH ============================== */
function LanguageScreen({ onDone }) {
  const { t, setLang } = useLang();
  const [picked, setPicked] = useState("en");

  const choose = (code) => {
    setPicked(code);
    setLang(code);
  };

  return (
    <div className="rf-root rf-scrollbar" style={{ height: "100%", width: "100%", display: "flex", flexDirection: "column", overflow: "auto", position: "relative" }}>
      <style>{CSS}</style>
      <ParticleField density={55} />
      <div className="rf-orb" style={{ top: "-6%", left: "-4%", width: 260, height: 260, background: "radial-gradient(circle,rgba(155,107,255,.2),transparent 70%)" }} />
      <div className="rf-orb" style={{ bottom: "-8%", right: "-4%", width: 300, height: 300, background: "radial-gradient(circle,rgba(59,130,246,.18),transparent 70%)", animationDelay: "1.5s" }} />
      <SplashCursor />
      <FloatingMenu items={[
        { id: "en", icon: Languages, label: "English", onClick: () => choose("en") },
        { id: "hi", icon: Languages, label: "हिन्दी", onClick: () => choose("hi") },
        { id: "help", icon: Sparkles, label: "About", onClick: () => {} },
      ]} />
      <div className="rf-tricolor" />
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 16px" }}>
        <div className="rf-pop-in" style={{ width: "100%", maxWidth: 560 }}>
          <div className="rf-fade-up" style={{ textAlign: "center", marginBottom: 22 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 9, fontWeight: 800, fontSize: 22, letterSpacing: .3 }}>
              <Train size={22} color="var(--blue)" style={{ animation: "rfPulse 2.2s ease-in-out infinite" }} /> Tramen<span className="rf-grad-text">AI</span>
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>{t("tagline")}</div>
          </div>

          <Panel style={{ padding: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <Languages size={16} color="var(--blue)" />
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700 }}>{t("chooseLanguageTitle")}</div>
                <div style={{ fontSize: 10.5, color: "var(--muted)" }}>{t("chooseLanguageSub")}</div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8, maxHeight: 340, overflowY: "auto", paddingRight: 2 }} className="rf-scrollbar">
              {LANGUAGES.map((l, i) => (
                <button key={l.code} onClick={() => choose(l.code)} className="rf-fade-up rf-tilt-card" style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6,
                  padding: "10px 12px", borderRadius: 8, cursor: "pointer", textAlign: "left",
                  border: picked === l.code ? "1px solid var(--purple)" : "1px solid var(--line)",
                  background: picked === l.code ? "rgba(155,107,255,.12)" : "var(--panel2)",
                  color: "var(--text)", fontSize: 12.5, fontWeight: 600,
                  animationDelay: `${Math.min(i * 0.025, 0.5)}s`,
                }}>
                  <span>
                    <span className="rf-hi" style={{ display: "block" }}>{l.native}</span>
                    <span style={{ display: "block", fontSize: 10, color: "var(--muted)", fontWeight: 400 }}>{l.name}</span>
                  </span>
                  {picked === l.code && <Check size={14} color="var(--purple)" style={{ flexShrink: 0 }} />}
                </button>
              ))}
            </div>
            <button onClick={onDone} className="rf-btn-primary rf-glow-btn" style={{ ...btnGhost, background: "var(--purple)", color: "#fff", borderColor: "var(--purple)", justifyContent: "center", padding: "11px 14px", fontSize: 12.5, fontWeight: 800, width: "100%", marginTop: 14 }}>
              {t("continue")} <ArrowRight size={13} />
            </button>
          </Panel>
        </div>
      </div>
    </div>
  );
}

/** Workspace-picker button with real-time pointer-driven 3D tilt + glare. */
function WorkspaceTabButton({ id, label, Icon, index, onSelect }) {
  const tilt = useTilt({ max: 7 });
  return (
    <button
      ref={tilt.ref}
      onPointerMove={tilt.onPointerMove}
      onPointerLeave={tilt.onPointerLeave}
      onClick={onSelect}
      className="rf-fade-up rf-tilt-live rf-tilt-glare"
      style={{
        display: "flex", alignItems: "center", gap: 12, padding: "13px 14px", borderRadius: 8,
        border: "1px solid var(--line)", background: "var(--panel2)", color: "var(--text)",
        cursor: "pointer", textAlign: "left", animationDelay: `${index * 0.08}s`, ...tilt.style,
      }}
    >
      <Icon size={18} color="var(--blue)" />
      <span>
        <b style={{ display: "block", fontSize: 13 }}>{label}</b>
        <span style={{ display: "block", color: "var(--muted)", fontSize: 11, marginTop: 3 }}>
          {id === "passenger" ? "Track trains, manage journeys and tickets" : id === "copilot" ? "Work with the AI operations assistant" : "Monitor and manage the railway network"}
        </span>
      </span>
      <ArrowRight size={14} style={{ marginLeft: "auto", color: "var(--muted)" }} />
    </button>
  );
}

function AuthScreen({ onAuth }) {
  const { t, lang, setLang } = useLang();
  const [langOpen, setLangOpen] = useState(false);
  const [mode, setMode] = useState(null); // "control" | "copilot" | "passenger"
  const [staffView, setStaffView] = useState("signin"); // "signin" | "register" (control/copilot only)
  const [staffEmail, setStaffEmail] = useState("");
  const [staffPassword, setStaffPassword] = useState("");
  const [showStaffPassword, setShowStaffPassword] = useState(false);
  const [staffLoading, setStaffLoading] = useState(false);
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [regCode, setRegCode] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [linkSent, setLinkSent] = useState(false);

  const fail = (msg) => {
    setError(msg);
    setShake(true);
    setTimeout(() => setShake(false), 420);
  };

  useEffect(() => {
    if (mode !== "passenger" || !isSignInWithEmailLink(auth, window.location.href)) return;
    const savedEmail = localStorage.getItem("rf_auth_email");
    if (!savedEmail) {
      setTimeout(() => fail("Please enter the same email address used for sign-in."), 0);
      return;
    }
    signInWithEmailLink(auth, savedEmail, window.location.href)
      .then(({ user }) => { localStorage.removeItem("rf_auth_email"); onAuth("passenger", user.email || savedEmail, "firebase"); })
      .catch(() => fail("This sign-in link is invalid or expired. Request a new one."));
    // The URL is a one-time Firebase sign-in link.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const submitStaffLogin = async () => {
    if (!/^\S+@\S+\.\S+$/.test(staffEmail.trim())) { fail("Enter the email for this account."); return; }
    if (!staffPassword) { fail("Enter the password for this account."); return; }
    setStaffLoading(true);
    const expectedRole = mode === "control" ? "controller" : "copilot";
    try {
      const cred = await signInWithEmailAndPassword(auth, staffEmail.trim(), staffPassword);
      const staffSnap = await getDoc(doc(db, "staff", cred.user.uid));
      const role = staffSnap.exists() ? staffSnap.data().role : null;
      if (role !== expectedRole) {
        await signOut(auth);
        fail(role ? `This account is set up for ${role}, not ${expectedRole}.` : "This account isn't set up as staff yet — check the staff/{uid} document in Firestore.");
        setStaffLoading(false);
        return;
      }
      onAuth(expectedRole, cred.user.email || staffEmail.trim(), "firebase");
    } catch {
      fail("Invalid email or password.");
    }
    setStaffLoading(false);
  };

  const submitStaffRegister = async () => {
    if (!regName.trim()) { fail("Enter your full name."); return; }
    if (!/^\S+@\S+\.\S+$/.test(regEmail.trim())) { fail("Enter a valid email."); return; }
    if (regPassword.length < 6) { fail("Password must be at least 6 characters."); return; }
    if (regPassword !== regConfirm) { fail("Passwords don't match."); return; }
    const expectedRole = mode === "control" ? "controller" : "copilot";
    const expectedCode = mode === "control" ? CONTROL_INVITE_CODE : COPILOT_INVITE_CODE;
    if (regCode.trim().toUpperCase() !== expectedCode) { fail(`Invalid ${mode === "control" ? "control room" : "copilot"} access code.`); return; }
    setStaffLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, regEmail.trim(), regPassword);
      await setDoc(doc(db, "staff", cred.user.uid), {
        role: expectedRole,
        name: regName.trim(),
        email: regEmail.trim(),
        createdAt: serverTimestamp(),
      });
      onAuth(expectedRole, regEmail.trim(), "firebase");
    } catch (err) {
      fail(err?.code === "auth/email-already-in-use" ? "That email is already registered — use Sign In instead." : "Couldn't create the account. Try again.");
    }
    setStaffLoading(false);
  };

 

 const sendMagicLink = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { 
      fail(t("enterValidEmail")); 
      return; 
    }

    const actionCodeSettings = {
      url: window.location.origin,
      handleCodeInApp: true,
    };

    try {
      await sendSignInLinkToEmail(auth, email.trim(), actionCodeSettings);
      localStorage.setItem("rf_auth_email", email.trim());
      setLinkSent(true);
      setError("");
    } catch (err) {
      fail("Failed to send sign-in link: " + (err.message || "Unknown error"));
    }
  };

  const TABS = [
    ["control", t("controlRoom"), Shield],
    ["copilot", t("copilot"), Bot],
    ["passenger", t("passenger"), Train],
  ];

  return (
    <div className="rf-root rf-scrollbar" style={{ height: "100%", width: "100%", display: "flex", flexDirection: "column", overflow: "auto", position: "relative" }}>
      <style>{CSS}</style>
      <style>{`
        @keyframes rfa-shake{0%,100%{transform:translateX(0);}20%{transform:translateX(-6px);}40%{transform:translateX(5px);}60%{transform:translateX(-4px);}80%{transform:translateX(3px);}}
        .rfa-shake{animation:rfa-shake .38s linear;}
      `}</style>
      <ParticleField density={70} />
      <div className="rf-orb" style={{ top: "-8%", right: "-6%", width: 300, height: 300, background: "radial-gradient(circle,rgba(59,130,246,.18),transparent 70%)" }} />
      <div className="rf-orb" style={{ bottom: "-10%", left: "-6%", width: 280, height: 280, background: "radial-gradient(circle,rgba(255,43,181,.14),transparent 70%)", animationDelay: "2s" }} />
      <SplashCursor />
      <FloatingMenu items={[
        { id: "lang", icon: Languages, label: "Language", onClick: () => setLangOpen((o) => !o) },
        { id: "replay", icon: Sparkles, label: "Replay Intro", onClick: () => { try { sessionStorage.removeItem("rf_intro_seen"); } catch { /* ignore */ } window.location.reload(); } },
        { id: "about", icon: ShieldCheck, label: "About", onClick: () => {} },
      ]} />
      <div className="rf-tricolor" />

      <div style={{ position: "absolute", top: 14, right: 16, zIndex: 40 }}>
        <button onClick={() => setLangOpen((o) => !o)} title={t("language")} style={{ ...btnGhost, color: "var(--muted)" }}>
          <Languages size={12} /> {(LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0]).native}
        </button>
        {langOpen && (
          <div style={{ position: "absolute", top: "calc(100% + 4px)", right: 0, width: 220, maxHeight: 320, overflowY: "auto", background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 8, padding: 4, boxShadow: "0 8px 24px rgba(0,0,0,.4)" }} className="rf-scrollbar">
            {LANGUAGES.map((l) => (
              <div key={l.code} onClick={() => { setLang(l.code); setLangOpen(false); }} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, padding: "7px 9px", borderRadius: 6, cursor: "pointer", fontSize: 12,
                background: lang === l.code ? "var(--panel2)" : "transparent", color: lang === l.code ? "var(--text)" : "var(--muted)", fontWeight: lang === l.code ? 700 : 500,
              }}>
                <span className="rf-hi">{l.native} <span style={{ fontSize: 9.5, opacity: .7 }}>· {l.name}</span></span>
                {lang === l.code && <Check size={12} color="var(--purple)" />}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 16px" }}>
        <div className="rf-pop-in" style={{ width: "100%", maxWidth: 420 }}>
          <div className="rf-fade-up" style={{ textAlign: "center", marginBottom: 26, position: "relative" }}>
            <div style={{ position: "absolute", top: "-64px", left: "50%", transform: "translateX(-50%)", zIndex: -1 }}>
              <Hero3D size={210} />
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 9, fontWeight: 800, fontSize: 22, letterSpacing: .3 }}>
              <Train size={22} color="var(--blue)" style={{ animation: "rfPulse 2.2s ease-in-out infinite" }} /> Tramen<span className="rf-grad-text">AI</span>
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>{t("tagline")}</div>
          </div>

          {!mode ? (
            <div style={{ position: "relative" }}>
              <DomeGallery chips={[
                { label: "Control Room", icon: Shield }, { label: "AI Copilot", icon: Bot }, { label: "Passenger", icon: Train },
                { label: "Live Conflicts", icon: AlertTriangle }, { label: "Analytics", icon: BarChart3 }, { label: "Digital Twin", icon: MapPin },
              ]} />
              <Panel title="Choose your workspace" icon={ShieldCheck} className="rf-fade-up">
                <div style={{ padding: 14, display: "grid", gap: 9 }}>
                  <div style={{ color: "var(--muted)", fontSize: 12, marginBottom: 3 }}>Select how you want to continue.</div>
                  {TABS.map(([id, label, Icon], i) => (
                    <WorkspaceTabButton key={id} id={id} label={label} Icon={Icon} index={i} onSelect={() => { setMode(id); setError(""); }} />
                  ))}
                </div>
              </Panel>
            </div>
          ) : (
          <>
          <button onClick={() => { setMode(null); setError(""); setStaffEmail(""); setStaffPassword(""); setRegName(""); setRegEmail(""); setRegPassword(""); setRegConfirm(""); setRegCode(""); setStaffView("signin"); setOtpSent(false); setLinkSent(false); }} style={{ ...btnGhost, color: "var(--muted)", marginBottom: 10 }}><ArrowRight size={13} style={{ transform: "rotate(180deg)" }} /> CHANGE WORKSPACE</button>

          {(mode === "control" || mode === "copilot") && (
            <div style={{ display: "flex", border: "1px solid var(--line)", borderRadius: 8, overflow: "hidden", marginBottom: 10 }}>
              {["signin", "register"].map((v) => (
                <button key={v} onClick={() => { setStaffView(v); setError(""); }} style={{
                  flex: 1, padding: "9px 0", border: "none", cursor: "pointer", fontSize: 11.5, fontWeight: 800, letterSpacing: .5,
                  background: staffView === v ? "var(--panel2)" : "transparent",
                  color: staffView === v ? "var(--text)" : "var(--muted)",
                  borderBottom: staffView === v ? "2px solid var(--purple)" : "2px solid transparent",
                }}>{v === "signin" ? "SIGN IN" : "REGISTER"}</button>
              ))}
            </div>
          )}

          <Panel className="rf-fade-up" style={{ padding: 0 }}>
            <div className={shake ? "rfa-shake" : ""} style={{ padding: 22, display: "flex", flexDirection: "column", gap: 14 }}>
              {(mode === "control" || mode === "copilot") && staffView === "signin" && (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--muted)", fontSize: 12.5 }}>
                    {mode === "control" ? <ShieldCheck size={15} /> : <Bot size={15} />}
                    {mode === "control" ? t("controlRoomDesc") : t("copilotDesc")}
                  </div>
                  <div style={{ position: "relative" }}>
                    <Mail size={14} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
                    <input value={staffEmail} onChange={(e) => setStaffEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submitStaffLogin()}
                      type="email" placeholder="you@example.com"
                      style={{ width: "100%", boxSizing: "border-box", padding: "11px 12px 11px 38px", borderRadius: 8, border: "1px solid var(--line)", background: "var(--panel2)", color: "var(--text)", fontSize: 13, outline: "none" }} />
                  </div>
                  <div style={{ position: "relative" }}>
                    <KeyRound size={14} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
                    <input value={staffPassword} onChange={(e) => setStaffPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submitStaffLogin()}
                      type={showStaffPassword ? "text" : "password"} placeholder="Password"
                      style={{ width: "100%", boxSizing: "border-box", padding: "11px 38px", borderRadius: 8, border: "1px solid var(--line)", background: "var(--panel2)", color: "var(--text)", fontSize: 13, fontFamily: "var(--mono)", letterSpacing: 1, outline: "none" }} />
                    <button onClick={() => setShowStaffPassword((s) => !s)} style={{ position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--muted)", cursor: "pointer", padding: 2 }}>
                      {showStaffPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  <button disabled={staffLoading} onClick={submitStaffLogin} className="rf-btn-primary rf-glow-btn" style={{ ...btnGhost, background: "var(--purple)", color: "#fff", borderColor: "var(--purple)", justifyContent: "center", padding: "11px 14px", fontSize: 12.5, fontWeight: 800, opacity: staffLoading ? .7 : 1 }}>
                    {staffLoading ? "SIGNING IN..." : (mode === "control" ? <><Shield size={13} /> {t("enterControlRoom")}</> : <><Bot size={13} /> {t("enterCopilot")}</>)}
                  </button>
                  <div style={{ fontSize: 10.5, color: "var(--muted)", textAlign: "center" }}>
                    No account yet? Use the REGISTER tab above.
                  </div>
                </>
              )}

              {(mode === "control" || mode === "copilot") && staffView === "register" && (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--muted)", fontSize: 12.5 }}>
                    {mode === "control" ? <ShieldCheck size={15} /> : <Bot size={15} />}
                    Create your own {mode === "control" ? "control room" : "copilot"} account.
                  </div>
                  <div style={{ position: "relative" }}>
                    <UserIcon size={14} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
                    <input value={regName} onChange={(e) => setRegName(e.target.value)} type="text" placeholder="Full name"
                      style={{ width: "100%", boxSizing: "border-box", padding: "11px 12px 11px 38px", borderRadius: 8, border: "1px solid var(--line)", background: "var(--panel2)", color: "var(--text)", fontSize: 13, outline: "none" }} />
                  </div>
                  <div style={{ position: "relative" }}>
                    <Mail size={14} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
                    <input value={regEmail} onChange={(e) => setRegEmail(e.target.value)} type="email" placeholder="you@example.com"
                      style={{ width: "100%", boxSizing: "border-box", padding: "11px 12px 11px 38px", borderRadius: 8, border: "1px solid var(--line)", background: "var(--panel2)", color: "var(--text)", fontSize: 13, outline: "none" }} />
                  </div>
                  <div style={{ position: "relative" }}>
                    <KeyRound size={14} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
                    <input value={regPassword} onChange={(e) => setRegPassword(e.target.value)} type={showRegPassword ? "text" : "password"} placeholder="Password (min 6 characters)"
                      style={{ width: "100%", boxSizing: "border-box", padding: "11px 38px", borderRadius: 8, border: "1px solid var(--line)", background: "var(--panel2)", color: "var(--text)", fontSize: 13, outline: "none" }} />
                    <button onClick={() => setShowRegPassword((s) => !s)} style={{ position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--muted)", cursor: "pointer", padding: 2 }}>
                      {showRegPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  <input value={regConfirm} onChange={(e) => setRegConfirm(e.target.value)} type={showRegPassword ? "text" : "password"} placeholder="Confirm password"
                    style={{ width: "100%", boxSizing: "border-box", padding: "11px 12px", borderRadius: 8, border: "1px solid var(--line)", background: "var(--panel2)", color: "var(--text)", fontSize: 13, outline: "none" }} />
                  <div style={{ position: "relative" }}>
                    <Shield size={14} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
                    <input value={regCode} onChange={(e) => setRegCode(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submitStaffRegister()}
                      type="text" placeholder={mode === "control" ? "Control room access code" : "Copilot access code"}
                      style={{ width: "100%", boxSizing: "border-box", padding: "11px 12px 11px 38px", borderRadius: 8, border: "1px solid var(--line)", background: "var(--panel2)", color: "var(--text)", fontSize: 13, fontFamily: "var(--mono)", letterSpacing: 1, outline: "none" }} />
                  </div>
                  <button disabled={staffLoading} onClick={submitStaffRegister} className="rf-btn-primary rf-glow-btn" style={{ ...btnGhost, background: "var(--purple)", color: "#fff", borderColor: "var(--purple)", justifyContent: "center", padding: "11px 14px", fontSize: 12.5, fontWeight: 800, opacity: staffLoading ? .7 : 1 }}>
                    {staffLoading ? "CREATING ACCOUNT..." : <><CheckCircle2 size={13} /> CREATE ACCOUNT</>}
                  </button>
                  <div style={{ fontSize: 10.5, color: "var(--muted)", textAlign: "center" }}>
                    Ask your admin for the {mode === "control" ? "control room" : "copilot"} access code.
                  </div>
                </>
              )}

              {mode === "passenger" && !linkSent && (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--muted)", fontSize: 12.5, marginBottom: 10 }}>
                    <Mail size={15} /> Sign in securely with an Email Magic Link.
                  </div>
                  <div style={{ position: "relative", marginBottom: 10 }}>
                    <Mail size={14} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
                    <input value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendMagicLink()}
                      type="email" placeholder="you@example.com"
                      style={{ width: "100%", boxSizing: "border-box", padding: "11px 12px 11px 38px", borderRadius: 8, border: "1px solid var(--line)", background: "var(--panel2)", color: "var(--text)", fontSize: 13, outline: "none" }} />
                  </div>
                  <button onClick={sendMagicLink} className="rf-btn-primary rf-glow-btn" style={{ ...btnGhost, background: "var(--blue)", color: "#fff", borderColor: "var(--blue)", justifyContent: "center", padding: "11px 14px", fontSize: 12.5, fontWeight: 800, width: "100%" }}>
                    <Send size={13} /> Send Sign-In Link
                  </button>
                </div>
              )}

              {mode === "passenger" && linkSent && (
                <div style={{ textAlign: "center", padding: "10px 0" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--green)", marginBottom: 8 }}>Check your inbox!</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5, marginBottom: 14 }}>
                    We sent a secure sign-in link to <b style={{ color: "var(--text)" }}>{email}</b>. Click the link in your email to log in instantly.
                  </div>
                  <button onClick={() => { setLinkSent(false); setError(""); }} style={{ ...btnGhost, color: "var(--muted)", justifyContent: "center" }}>
                    Use a different email
                  </button>
                </div>
              )}

              {error && <div style={{ fontSize: 11.5, color: "var(--red)", textAlign: "center", fontWeight: 600 }}>{error}</div>}
            </div>
          </Panel>
          </>
          )}

          <div style={{ textAlign: "center", fontSize: 10, color: "var(--muted)", marginTop: 16 }}>
            {t("simNoticeAuth")}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================== APP SHELL (intro → auth → control) ============================== */
const SESSION_KEY = "rf_session";
const INTRO_KEY = "rf_intro_seen";

function hasStoredLang() {
  try { return !!localStorage.getItem(LANG_KEY); } catch { return false; }
}

function App() {
  const [stage, setStage] = useState(() => {
    try {
      if (sessionStorage.getItem(INTRO_KEY)) {
        if (!hasStoredLang()) return "lang";
        return localStorage.getItem(SESSION_KEY) ? "app" : "auth";
      }
    } catch { /* storage unavailable — fall through to intro */ }
    return "intro";
  });
  const [session, setSession] = useState(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  });

  const finishIntro = () => {
    try { sessionStorage.setItem(INTRO_KEY, "1"); } catch { /* ignore */ }
    setStage((s) => {
      if (s !== "intro") return s;
      if (!hasStoredLang()) return "lang";
      return session ? "app" : "auth";
    });
  };

  const finishLang = () => {
    setStage((s) => (s === "lang" ? (session ? "app" : "auth") : s));
  };

  const handleAuth = (role, identifier, provider = "local") => {
    const sess = { role, identifier, at: Date.now(), provider };
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(sess)); } catch { /* ignore */ }
    setSession(sess);
    setStage("app");
  };

  const handleLogout = () => {
    // Real Firebase-backed sessions are signed out at the source. This fires
    // onAuthStateChanged below, which clears the session in real time —
    // including in any other tab/window signed in with the same account.
    if (session?.provider === "firebase") {
      signOut(auth).catch(() => { /* fall through to local cleanup below */ });
    }
    try { localStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
    setSession(null);
    setStage("auth");
  };

  // Real-time auth: mirror Firebase's live auth state instead of only trusting
  // whatever was last written to localStorage. This keeps the passenger
  // session in sync the moment it changes — a real sign-in completing on
  // another device/tab logs this tab in immediately, and a sign-out or an
  // expired/revoked session logs this tab out immediately, with no reload.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Determine the real role for this signed-in account: staff accounts
        // (control room / copilot) have a Firestore doc at staff/{uid};
        // anyone else signing in via the email link is a passenger.
        let role = "passenger";
        try {
          const staffSnap = await getDoc(doc(db, "staff", user.uid));
          if (staffSnap.exists() && staffSnap.data()?.role) role = staffSnap.data().role;
        } catch { /* couldn't read staff doc — treat as passenger */ }
        const sess = { role, identifier: user.email || user.uid, at: Date.now(), provider: "firebase" };
        try { localStorage.setItem(SESSION_KEY, JSON.stringify(sess)); } catch { /* ignore */ }
        setSession(sess);
        setStage((s) => (s === "intro" || s === "lang" ? s : "app"));
      } else {
        setSession((prev) => {
          // Only sessions Firebase itself created are governed by this listener.
          // Demo-OTP passenger sessions aren't Firebase-backed, so leave those alone.
          if (prev && prev.provider === "firebase") {
            try { localStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
            setStage((s) => (s === "intro" || s === "lang" ? s : "auth"));
            return null;
          }
          return prev;
        });
      }
    });
    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (stage === "intro") return <IntroScreen onDone={finishIntro} />;
  if (stage === "lang") return <><PixelTransition transitionKey="lang" /><LanguageScreen onDone={finishLang} /></>;
  if (stage === "auth" || !session) return <><PixelTransition transitionKey="auth" /><AuthScreen onAuth={handleAuth} /></>;
  return <><PixelTransition transitionKey="app" /><ControlApp role={session.role} identifier={session.identifier} onLogout={handleLogout} /></>;
}

export default function AppRoot() {
  return (
    <LangProvider>
      <App />
    </LangProvider>
  );
}
