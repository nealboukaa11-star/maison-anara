// =====================================================================
//  MAISON ANARA — connexion Supabase (storefront + analytics)
//  Clé "publishable" : publique par nature, protégée par la sécurité RLS.
// =====================================================================
const { createClient } = window.supabase;   // librairie hébergée en local (vendor/supabase.js)

const SUPABASE_URL = 'https://zhuukwcnzoueyoegmegi.supabase.co';
const SUPABASE_KEY = 'sb_publishable_9DYHswwUBkzXVEitvdKzBQ_fHHPJXuI';
const WHATSAPP = '212661142161';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const page = location.pathname.split('/').pop() || 'index.html';

// ---------- Analytics ----------
async function track(type, extra = {}) {
  try { await supabase.from('evenements').insert([{ type, page, ...extra }]); }
  catch (e) { /* on n'interrompt jamais le site pour l'analytics */ }
}
track('visite');

// ---------- Helpers ----------
const fmtPrix = (p) => `${Number(p).toLocaleString('fr-FR')} MAD`;
const esc = (s) => (s ?? '').toString().replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const enPromo = (p) => p.prix_promo != null && Number(p.prix_promo) > 0 && Number(p.prix_promo) < Number(p.prix);

// =====================================================================
//  GRILLES DE PRODUITS (accueil + collection)
// =====================================================================
function carteProduit(p) {
  const prixHtml = enPromo(p)
    ? `<span style="color:var(--rouge)">${fmtPrix(p.prix_promo)}</span> <small style="text-decoration:line-through;color:#b8b3ab">${fmtPrix(p.prix)}</small>`
    : fmtPrix(p.prix);
  const sousTitre = (Array.isArray(p.teintes) && p.teintes.length > 1) ? `<small>Existe en ${p.teintes.length} teintes</small>` : '';
  const img = (Array.isArray(p.photos) && p.photos[0]) ? p.photos[0] : '';
  const a = document.createElement('a');
  a.className = 'carte';
  a.href = `produit.html?p=${encodeURIComponent(p.slug)}`;
  a.innerHTML = `
    <div class="carte-img">${img ? `<img src="${esc(img)}" alt="${esc(p.nom)}" loading="lazy">` : ''}</div>
    <div class="carte-txt">
      <div class="type">${esc(p.categorie || '')}</div>
      <h3>${esc(p.nom)}</h3>
      <div class="prix">${prixHtml}${sousTitre ? ' ' + sousTitre : ''}</div>
      <span class="carte-cta">Voir la pièce</span>
    </div>`;
  return a;
}

async function chargerGrilles() {
  const grilles = document.querySelectorAll('[data-produits]');
  if (!grilles.length) return;
  const { data, error } = await supabase
    .from('produits').select('*').eq('visible', true).order('ordre', { ascending: true });

  grilles.forEach(grille => {
    const mesure = grille.querySelector('[data-mesure]');
    grille.querySelectorAll('[data-placeholder]').forEach(n => n.remove());

    if (error || !data) {
      const msg = document.createElement('p');
      msg.style.cssText = 'color:#8f8a82;grid-column:1/-1';
      msg.textContent = 'Impossible de charger les produits pour le moment. Réessayez dans un instant.';
      grille.insertBefore(msg, mesure);
      return;
    }
    let list = data;
    const n = parseInt(grille.getAttribute('data-produits'), 10);
    if (n > 0) list = list.slice(0, n);
    list.forEach(p => grille.insertBefore(carteProduit(p), mesure));
  });
}
chargerGrilles();

// =====================================================================
//  PAGE PRODUIT DYNAMIQUE (produit.html?p=slug)
// =====================================================================
const WA_SVG = '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5.1-1.3A10 10 0 1 0 12 2Zm0 18.2a8.1 8.1 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.6-6.1c-.3-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.6.1a6.7 6.7 0 0 1-2-1.2 7.4 7.4 0 0 1-1.4-1.7c-.1-.3 0-.4.1-.5l.4-.5a1.7 1.7 0 0 0 .3-.4.5.5 0 0 0 0-.4c0-.1-.6-1.4-.8-1.9s-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 2.9 2.9 0 0 0-.9 2.1 5 5 0 0 0 1.1 2.7 11.4 11.4 0 0 0 4.4 3.9 14.6 14.6 0 0 0 1.5.5 3.5 3.5 0 0 0 1.6.1 2.6 2.6 0 0 0 1.7-1.2 2.1 2.1 0 0 0 .2-1.2c-.1-.1-.3-.2-.6-.3Z"/></svg>';

function messageIntrouvable() {
  return `<div style="grid-column:1/-1;text-align:center;padding:60px 0">
    <h1 style="font-family:var(--serif);font-weight:400;margin-bottom:16px">Pièce introuvable</h1>
    <p style="color:#57534d;margin-bottom:26px">Ce produit n'existe pas ou n'est plus disponible.</p>
    <a class="btn" href="collection.html">Voir la collection</a>
  </div>`;
}

function ficheHtml(p) {
  const prix = enPromo(p) ? p.prix_promo : p.prix;
  const prixBloc = enPromo(p)
    ? `<div class="prix"><span style="color:var(--rouge)">${fmtPrix(p.prix_promo)}</span> <small style="text-decoration:line-through;color:#b8b3ab;font-size:16px">${fmtPrix(p.prix)}</small></div>`
    : `<div class="prix">${fmtPrix(p.prix)}</div>`;

  const teintes = Array.isArray(p.teintes) ? p.teintes : [];
  const teinteBloc = teintes.length ? `
    <div class="bloc">
      <div class="bloc-titre">Teinte${teintes.length > 1 ? ' de la base' : ''}</div>
      <div class="teintes" role="radiogroup" aria-label="Choisir la teinte">
        ${teintes.map((t, i) => `<button class="teinte${i === 0 ? ' actif' : ''}" style="background:${esc(t.hex || '#ccc')}" data-nom="${esc(t.nom)}" role="radio" aria-checked="${i === 0 ? 'true' : 'false'}" aria-label="${esc(t.nom)}"></button>`).join('')}
      </div>
      <div class="teinte-nom">Teinte choisie : <b id="teinte-choisie">${esc(teintes[0].nom)}</b></div>
    </div>` : '';

  const specs = [];
  if (p.dimensions) specs.push(`<li><span>Dimensions</span><span>${esc(p.dimensions)}</span></li>`);
  specs.push(`<li><span>Fabrication</span><span>Faite main à Tétouan, à la commande</span></li>`);
  if (p.delai) specs.push(`<li><span>Délai</span><span>${esc(p.delai)}</span></li>`);
  specs.push(`<li><span>Douille</span><span>E27 — ampoule non incluse</span></li>`);

  const img = (Array.isArray(p.photos) && p.photos[0]) ? p.photos[0] : '';
  const vignettes = (Array.isArray(p.photos) && p.photos.length > 1)
    ? `<div style="display:flex;gap:12px;margin-top:14px;flex-wrap:wrap">${p.photos.map((u, i) => `<button class="vignette" data-src="${esc(u)}" style="width:72px;height:72px;border:1px solid var(--ligne);border-radius:3px;padding:6px;background:#fff;cursor:pointer${i === 0 ? ';outline:2px solid var(--or);outline-offset:2px' : ''}"><img src="${esc(u)}" alt="" style="width:100%;height:100%;object-fit:contain"></button>`).join('')}</div>`
    : '';

  return `
    <div class="galerie">
      <div class="visu" id="visu">${img ? `<img src="${esc(img)}" alt="${esc(p.nom)}">` : ''}</div>
      ${vignettes}
    </div>
    <div class="fiche">
      <div class="type">${esc(p.categorie || 'Édition faite main')} — Édition faite main</div>
      <h1>${esc(p.nom)}</h1>
      ${prixBloc}
      ${p.description ? `<p class="desc">${esc(p.description)}</p>` : ''}
      ${teinteBloc}
      <div class="bloc"><ul class="specs">${specs.join('')}</ul></div>
      <div class="cod-note">
        <span class="ar">الدفع عند الاستلام</span>
        <span>Vous payez à la livraison. Chaque pièce étant fabriquée pour vous, un acompte de 200 MAD confirme la commande — le reste à la réception.</span>
      </div>
      <button class="btn-wa" id="btn-commander">Commander — paiement à la livraison</button>
      <button class="lien-wa" id="btn-wa-direct">${WA_SVG} Ou commander sur WhatsApp</button>
      <div class="note-btn">Fabrication à la commande · acompte 200 MAD · solde à la livraison.</div>
    </div>`;
}

function activerFiche(p) {
  let teinte = (Array.isArray(p.teintes) && p.teintes[0]) ? p.teintes[0].nom : '';

  document.querySelectorAll('.teinte').forEach(b => {
    b.addEventListener('click', () => {
      document.querySelectorAll('.teinte').forEach(x => { x.classList.remove('actif'); x.setAttribute('aria-checked', 'false'); });
      b.classList.add('actif');
      b.setAttribute('aria-checked', 'true');
      teinte = b.dataset.nom;
      const nom = document.getElementById('teinte-choisie');
      if (nom) nom.textContent = teinte;
    });
  });

  document.querySelectorAll('.vignette').forEach(v => {
    v.addEventListener('click', () => {
      const visu = document.querySelector('#visu img');
      if (visu) visu.src = v.dataset.src;
      document.querySelectorAll('.vignette').forEach(x => x.style.outline = 'none');
      v.style.outline = '2px solid var(--or)';
      v.style.outlineOffset = '2px';
    });
  });

  const waLien = () => {
    const prix = enPromo(p) ? p.prix_promo : p.prix;
    let msg = `Bonjour Maison Anara 👋\nJe souhaite commander :\n\n• ${p.nom}`;
    if (teinte) msg += `\n• Teinte : ${teinte}`;
    msg += `\n• Prix : ${fmtPrix(prix)} (paiement à la livraison)\n\nMa ville : `;
    return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`;
  };

  const btn = document.getElementById('btn-commander');
  if (btn) btn.addEventListener('click', () => {
    track('clic_commander', { produit_id: p.id });
    ouvrirCheckout(p, () => teinte);
  });

  const btnWa = document.getElementById('btn-wa-direct');
  if (btnWa) btnWa.addEventListener('click', () => {
    track('clic_commander', { produit_id: p.id });
    window.open(waLien(), '_blank');
  });
}

// =====================================================================
//  CHECKOUT COD (formulaire de commande -> table commandes)
// =====================================================================
let modalEl = null;

function fermerCheckout() {
  if (modalEl) modalEl.classList.remove('ouvert');
  document.body.style.overflow = '';
}

function ouvrirCheckout(p, getTeinte) {
  const unit = enPromo(p) ? Number(p.prix_promo) : Number(p.prix);
  const teintes = Array.isArray(p.teintes) ? p.teintes : [];

  if (!modalEl) {
    modalEl = document.createElement('div');
    modalEl.className = 'modal-fond';
    document.body.appendChild(modalEl);
    modalEl.addEventListener('click', (e) => { if (e.target === modalEl) fermerCheckout(); });
  }

  const options = teintes.map(t => `<option value="${esc(t.nom)}">${esc(t.nom)}</option>`).join('');
  modalEl.innerHTML = `
    <div class="modal-boite" role="dialog" aria-modal="true" aria-label="Commander ${esc(p.nom)}">
      <button class="modal-x" aria-label="Fermer">×</button>
      <div id="ck-form">
        <h3>Commander — ${esc(p.nom)}</h3>
        <p class="modal-sub">Paiement à la livraison. Un acompte de 200 MAD confirme la fabrication, le solde à la réception.</p>
        <div class="champ"><label for="ck-nom">Nom complet</label><input id="ck-nom" autocomplete="name"></div>
        <div class="champ"><label for="ck-tel">Téléphone (WhatsApp)</label><input id="ck-tel" inputmode="tel" autocomplete="tel" placeholder="06 ..."></div>
        <div class="champ"><label for="ck-ville">Ville</label><input id="ck-ville" autocomplete="address-level2"></div>
        ${teintes.length ? `<div class="champ"><label for="ck-teinte">Teinte</label><select id="ck-teinte">${options}</select></div>` : ''}
        <div class="champ"><label for="ck-qte">Quantité</label><input id="ck-qte" type="number" min="1" value="1"></div>
        <div class="recap-total"><span>Total</span><b id="ck-total">${fmtPrix(unit)}</b></div>
        <button class="btn-wa" id="ck-valider">Valider ma commande</button>
        <div class="form-err" id="ck-err"></div>
      </div>
      <div id="ck-ok" hidden></div>
    </div>`;

  const selTeinte = modalEl.querySelector('#ck-teinte');
  if (selTeinte) selTeinte.value = getTeinte() || (teintes[0] && teintes[0].nom) || '';

  const qte = modalEl.querySelector('#ck-qte');
  const totalEl = modalEl.querySelector('#ck-total');
  qte.addEventListener('input', () => {
    const q = Math.max(1, parseInt(qte.value, 10) || 1);
    totalEl.textContent = fmtPrix(unit * q);
  });

  modalEl.querySelector('.modal-x').addEventListener('click', fermerCheckout);
  modalEl.querySelector('#ck-valider').addEventListener('click', () => validerCommande(p, unit));

  modalEl.classList.add('ouvert');
  document.body.style.overflow = 'hidden';
  setTimeout(() => modalEl.querySelector('#ck-nom').focus(), 50);
}

async function validerCommande(p, unit) {
  const val = (id) => (modalEl.querySelector(id)?.value || '').trim();
  const nom = val('#ck-nom'), tel = val('#ck-tel'), ville = val('#ck-ville');
  const selTeinte = modalEl.querySelector('#ck-teinte');
  const teinte = selTeinte ? selTeinte.value : null;
  const q = Math.max(1, parseInt(modalEl.querySelector('#ck-qte').value, 10) || 1);
  const err = modalEl.querySelector('#ck-err');
  err.textContent = '';

  if (!nom || !tel || !ville) { err.textContent = 'Merci de remplir votre nom, téléphone et ville.'; return; }
  if (tel.replace(/\D/g, '').length < 8) { err.textContent = 'Numéro de téléphone invalide.'; return; }

  const btn = modalEl.querySelector('#ck-valider');
  btn.disabled = true; btn.textContent = 'Envoi…';
  const total = unit * q;

  const { error } = await supabase.from('commandes').insert([{
    client_nom: nom, client_tel: tel, client_ville: ville,
    produit_id: p.id, produit_nom: p.nom, teinte, quantite: q,
    prix_unitaire: unit, total, statut: 'Nouveau', source: 'site'
  }]);

  if (error) {
    btn.disabled = false; btn.textContent = 'Valider ma commande';
    err.textContent = "Une erreur est survenue. Réessayez, ou commandez sur WhatsApp.";
    return;
  }

  track('commande', { produit_id: p.id });

  let msg = `Bonjour Maison Anara 👋\nJe viens de passer commande sur le site :\n\n• ${p.nom}`;
  if (teinte) msg += `\n• Teinte : ${teinte}`;
  msg += `\n• Quantité : ${q}\n• Total : ${fmtPrix(total)} (paiement à la livraison)\n\n• Nom : ${nom}\n• Ville : ${ville}`;
  const wa = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`;

  modalEl.querySelector('#ck-form').hidden = true;
  const ok = modalEl.querySelector('#ck-ok');
  ok.hidden = false;
  ok.className = 'checkout-ok';
  ok.innerHTML = `
    <div class="coche">✓</div>
    <h3>Commande enregistrée !</h3>
    <p>Merci ${esc(nom)}. Finalisez sur WhatsApp — c'est là qu'on organise l'acompte et la livraison.</p>
    <a class="btn-wa" href="${wa}" target="_blank" rel="noopener" style="text-decoration:none">${WA_SVG} Confirmer sur WhatsApp</a>
    <button class="lien-wa" id="ck-fermer2" style="margin-top:14px">Fermer</button>`;
  ok.querySelector('#ck-fermer2').addEventListener('click', fermerCheckout);
}

document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fermerCheckout(); });

async function chargerProduit() {
  const zone = document.getElementById('produit-dynamique');
  if (!zone) return;
  const slug = new URLSearchParams(location.search).get('p');
  if (!slug) { zone.innerHTML = messageIntrouvable(); return; }

  const { data, error } = await supabase
    .from('produits').select('*').eq('slug', slug).eq('visible', true).maybeSingle();

  if (error || !data) { zone.innerHTML = messageIntrouvable(); return; }

  document.title = `${data.nom} — Maison Anara`;
  track('vue_produit', { produit_id: data.id });
  zone.innerHTML = ficheHtml(data);
  activerFiche(data);
}
chargerProduit();
