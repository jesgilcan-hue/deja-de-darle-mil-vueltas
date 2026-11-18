// Serverless Function para Vercel: /api/lulu-create-order
// Envía un Print Job real a Lulu Direct API (Sandbox o Producción)

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { luluApiRequest } from '../lib/lulu-client.js';
import { FIXED_RETAIL_PRICES } from './lulu-quote.js';

const FIREBASE_WEB_API_KEY =
  process.env.VITE_FIREBASE_API_KEY ||
  Buffer.from('QUl6YVN5RGlXblE1eS1BOG51emFaa1Z5ZTBvWWZIMUQxdVJxVXl3', 'base64').toString('utf-8');

const firebaseApp = getApps().length
  ? getApps()[0]
  : initializeApp({
      apiKey: FIREBASE_WEB_API_KEY,
      authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || 'editorialmenosruido.firebaseapp.com',
      projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'editorialmenosruido'
    });

const firestoreDb = getFirestore(firebaseApp);

const ALLOWED_ADMIN_EMAILS = ['jesgilcan@gmail.com', 'jesgilcan@hotmail.com'];

async function verifyAdminToken(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return { valid: false, error: 'Falta token de autorización de Firebase Auth.' };
  }
  const idToken = authHeader.replace('Bearer ', '').trim();
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_WEB_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken })
    }
  );
  const data = await res.json().catch(() => ({}));
  const email = (data?.users?.[0]?.email || '').toLowerCase().trim();
  if (!res.ok || !email || !ALLOWED_ADMIN_EMAILS.includes(email)) {
    return { valid: false, error: 'Acceso restringido al administrador.' };
  }
  return { valid: true, email };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Usa POST.' });

  const auth = await verifyAdminToken(req);
  if (!auth.valid) return res.status(403).json({ error: auth.error });

  try {
    const {
      orderId,
      orderNumber,
      book = {},
      shipping = {},
      customer = {},
      luluEnv = undefined
    } = req.body || {};

    const interiorUrl = book.interiorPdfUrl || book.data?.interiorPdfUrl || '';
    const coverUrl = book.coverPdfUrl || book.data?.coverPdfUrl || '';

    if (!interiorUrl.startsWith('https://') || !coverUrl.startsWith('https://')) {
      return res.status(400).json({
        error: 'Faltan URLs HTTPS públicas de interiorPdfUrl y coverPdfUrl para enviar a Lulu.'
      });
    }

    const bindingType = book.bindingType || 'softcover';
    const podPackageId =
      book.podPackageId ||
      (FIXED_RETAIL_PRICES[bindingType] || FIXED_RETAIL_PRICES.softcover).podPackageId;

    const extId = String(orderNumber || orderId || `MR-${Date.now()}`);
    const addrObj = (shipping.address && typeof shipping.address === 'object') ? shipping.address : {};

    const rawCustomerAddr = typeof customer.address === 'string' ? customer.address.trim() : '';
    const cpFromAddr = rawCustomerAddr.match(/\b(\d{5})\b/)?.[1] || '';
    const streetFromCustomer = rawCustomerAddr.includes(',')
      ? rawCustomerAddr.split(',')[0].trim()
      : rawCustomerAddr;

    const street1 =
      addrObj.street ||
      addrObj.street1 ||
      shipping.street1 ||
      (typeof shipping.address === 'string' ? shipping.address.trim() : '') ||
      streetFromCustomer;
    const postcode = String(
      addrObj.postalCode || addrObj.postcode || shipping.postalCode || customer.postalCode || cpFromAddr
    ).trim();
    const city = String(addrObj.city || shipping.city || customer.city || '').trim();
    const stateCode = String(addrObj.province || addrObj.state_code || customer.province || city || '').trim().slice(0, 30);

    const rawCountry = String(addrObj.country || addrObj.country_code || shipping.country || customer.country || 'ES').trim();
    const countryCode = /^(espa[ñn]a|spain|es)$/i.test(rawCountry)
      ? 'ES'
      : rawCountry.slice(0, 2).toUpperCase();

    if (!street1 || !postcode || !city) {
      return res.status(400).json({
        error: `Dirección de envío incompleta para Lulu (street1="${street1}", postcode="${postcode}", city="${city}").`
      });
    }

    const payload = {
      contact_email: 'pedidos@editorialmenosruido.com',
      external_id: extId,
      line_items: [
        {
          external_id: `${extId}-1`,
          printable_normalization: {
            cover: { source_url: coverUrl },
            interior: { source_url: interiorUrl },
            pod_package_id: podPackageId
          },
          quantity: Number(book.quantity || 1),
          title: book.title || 'Cuaderno Editorial Menos Ruido'
        }
      ],
      shipping_address: {
        name: shipping.name || customer.name || 'Cliente Editorial Menos Ruido',
        street1,
        city,
        postcode,
        country_code: countryCode,
        state_code: stateCode || city,
        phone_number: shipping.phone || customer.phone || '+34600000000'
      },
      shipping_level: shipping.shippingLevel || 'MAIL'
    };

    const luluRes = await luluApiRequest('/print-jobs/', {
      method: 'POST',
      body: payload,
      env: luluEnv
    });

    if (!luluRes.ok) {
      return res.status(luluRes.status || 400).json({
        ok: false,
        environment: luluRes.env,
        error: 'Lulu rechazó la creación del Print Job',
        details: luluRes.data
      });
    }

    const jobData = luluRes.data || {};
    const jobId = String(jobData.id || '');
    const luluStatus = jobData.status?.name || 'CREATED';
    const luluCosts = jobData.costs || null;
    const realLuluTotal = luluCosts
      ? parseFloat(luluCosts.total_cost_incl_tax || luluCosts.total_cost_excl_tax || 0)
      : null;

    if (orderId) {
      try {
        const orderRef = doc(firestoreDb, 'orders', String(orderId));
        const snap = await getDoc(orderRef);
        const existing = snap.exists() ? snap.data() : {};
        const prevTimeline = Array.isArray(existing.timeline) ? existing.timeline : [];
        const totalPaid = Number(existing.pricing?.totalPaid || 0);
        const stripeFeeEst = totalPaid > 0 ? +(totalPaid * 0.015 + 0.25).toFixed(2) : 0;
        const pricingPatch =
          realLuluTotal && realLuluTotal > 0
            ? {
                ...(existing.pricing || {}),
                luluCostReal: +realLuluTotal.toFixed(2),
                netMarginReal: +(totalPaid - realLuluTotal - stripeFeeEst).toFixed(2)
              }
            : existing.pricing;

        await setDoc(
          orderRef,
          {
            status: 'approved_printing',
            ...(pricingPatch ? { pricing: pricingPatch } : {}),
            luluJob: {
              ...(existing.luluJob || {}),
              jobId,
              environment: luluRes.env,
              status: luluStatus,
              rawStatus: jobData.status || null,
              ...(luluCosts ? { costs: luluCosts } : {}),
              createdAt: new Date().toISOString()
            },
            timeline: [
              ...prevTimeline,
              {
                date: new Date().toISOString(),
                message: `Print Job real creado en Lulu [${luluRes.env}] (ID: ${jobId} · Estado: ${luluStatus})`
              }
            ]
          },
          { merge: true }
        );
      } catch (dbErr) {
        console.warn('No se pudo actualizar Firestore tras crear job en Lulu:', dbErr.message);
      }
    }

    return res.status(200).json({
      ok: true,
      environment: luluRes.env,
      luluJobId: jobId,
      status: luluStatus,
      raw: jobData
    });
  } catch (err) {
    console.error('Error en /api/lulu-create-order:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
