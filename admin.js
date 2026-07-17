// =====================================================================
//  MAISON ANARA — Panneau d'administration
// =====================================================================
const { createClient } = window.supabase;   // librairie hébergée en local (vendor/supabase.js)

const SUPABASE_URL = 'https://zhuukwcnzoueyoegmegi.supabase.co';
const SUPABASE_KEY = 'sb_publishable_9DYHswwUBkzXVEitvdKzBQ_fHHPJXuI';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const STATUTS = ['Nouveau', 'Confirmé', 'Acompte reçu', 'Expédié', 'Livré', 'Retourné'];
const STATUT_COULEUR = {
  'Nouveau': '#3b82f6', 'Confirmé': '#06b6d4', 'Acompte reçu': '#f59e0b',
  'Expédié': '#8b5cf6', 'Livré': '#16a34a', 'Retourné': '#dc2626'
};

const $ = (s) => document.querySelector(s);
const esc = (s) => (s ?? '').toString().replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmtMAD = (n) => `${Number(n || 0).toLocaleString('fr-FR')} MAD`;
const fmtDate = (d) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
const slugify = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// =====================================================================
//  AUTHENTIFICATION
// =====================================================================
async function init() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) montrerDashboard(); else montrerLogin();
}

function montrerLogin() { $('#login-vue').hidden = false; $('#dash-vue').hidden = true; }
async function montrerDashboard() {
  $('#login-vue').hidden = true;
  $('#dash-vue').hidden = false;
  await chargerProduits();      // PRODUITS chargé avant les analytics (noms produits)
  chargerCommandes();
  chargerAnalytics();
}

$('#login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const err = $('#lg-err'); err.textContent = '';
  const btn = $('#lg-btn'); btn.disabled = true; btn.textContent = 'Connexion…';
  try {
    const { error } = await supabase.auth.signInWithPassword({ email: $('#lg-email').value.trim(), password: $('#lg-pass').value });
    if (error) {
      const code = error.code || error.error_code || '';
      if (code === 'email_not_confirmed') err.textContent = "Compte non confirmé : confirmez-le dans Supabase (Authentication → Users).";
      else if (code === 'invalid_credentials') err.textContent = "Email ou mot de passe incorrect.";
      else err.textContent = `${error.message} (${code || error.status || 'erreur'})`;
      return;
    }
    montrerDashboard();
  } catch (ex) {
    err.textContent = 'Connexion impossible (problème réseau). Réessayez.';
  } finally {
    btn.disabled = false; btn.textContent = 'Se connecter';
  }
});

$('#btn-logout').addEventListener('click', async () => { await supabase.auth.signOut(); montrerLogin(); });

// ---- onglets ----
document.querySelectorAll('.onglet').forEach(o => o.addEventListener('click', () => {
  document.querySelectorAll('.onglet').forEach(x => x.classList.remove('actif'));
  o.classList.add('actif');
  const t = o.dataset.tab;
  $('#tab-produits').hidden = t !== 'produits';
  $('#tab-commandes').hidden = t !== 'commandes';
  $('#tab-analytics').hidden = t !== 'analytics';
  // recharge les données fraîches à chaque ouverture d'onglet
  if (t === 'produits') chargerProduits();
  else if (t === 'commandes') chargerCommandes();
  else if (t === 'analytics') chargerAnalytics();
}));

// =====================================================================
//  PRODUITS
// =====================================================================
let PRODUITS = [];

async function chargerProduits() {
  const { data, error } = await supabase.from('produits').select('*').order('ordre', { ascending: true });
  const body = $('#produits-body');
  if (error) { body.innerHTML = `<tr><td colspan="6" class="vide">Erreur de chargement.</td></tr>`; return; }
  PRODUITS = data || [];
  if (!PRODUITS.length) { body.innerHTML = `<tr><td colspan="6" class="vide">Aucun produit. Ajoutez-en un.</td></tr>`; return; }
  body.innerHTML = PRODUITS.map(p => {
    const img = (Array.isArray(p.photos) && p.photos[0]) ? p.photos[0] : '';
    const prix = (p.prix_promo != null && +p.prix_promo > 0) ? `${fmtMAD(p.prix_promo)} <s style="color:#b8b3ab">${fmtMAD(p.prix)}</s>` : fmtMAD(p.prix);
    return `<tr>
      <td>${img ? `<img class="mini-img" src="${esc(img)}" alt="">` : ''}</td>
      <td><b>${esc(p.nom)}</b><br><span style="color:#8f8a82;font-size:12px">/${esc(p.slug)}</span></td>
      <td>${esc(p.categorie || '')}</td>
      <td>${prix}</td>
      <td>${p.visible ? '<span class="badge" style="background:#e7f5ea;color:#16a34a">Visible</span>' : '<span class="badge">Masqué</span>'}</td>
      <td style="white-space:nowrap;text-align:right">
        <button class="b ghost sm" data-edit="${p.id}">Modifier</button>
        <button class="b ghost sm" data-toggle="${p.id}">${p.visible ? 'Masquer' : 'Afficher'}</button>
        <button class="b danger sm" data-del="${p.id}">Suppr.</button>
      </td>
    </tr>`;
  }).join('');
  body.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => ouvrirProduit(PRODUITS.find(p => p.id === b.dataset.edit)));
  body.querySelectorAll('[data-toggle]').forEach(b => b.onclick = () => basculerVisible(PRODUITS.find(p => p.id === b.dataset.toggle)));
  body.querySelectorAll('[data-del]').forEach(b => b.onclick = () => supprimerProduit(PRODUITS.find(p => p.id === b.dataset.del)));
}

async function basculerVisible(p) {
  await supabase.from('produits').update({ visible: !p.visible }).eq('id', p.id);
  chargerProduits();
}

async function supprimerProduit(p) {
  if (!confirm(`Supprimer définitivement « ${p.nom} » ?`)) return;
  await supabase.from('produits').delete().eq('id', p.id);
  chargerProduits();
}

// ---- modale produit ----
let editId = null;
let teintesEdit = [];
let photosEdit = [];

async function televerser(file) {
  const chemin = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${file.name.replace(/[^a-zA-Z0-9.\-]/g, '_')}`;
  const { error } = await supabase.storage.from('produits').upload(chemin, file, { cacheControl: '3600', upsert: false });
  if (error) return { error: error.message };
  const { data } = supabase.storage.from('produits').getPublicUrl(chemin);
  return { url: data.publicUrl };
}

function rendreTeintes() {
  $('#mp-teintes').innerHTML = teintesEdit.map((t, i) => `
    <div class="teinte-ligne">
      <input type="color" value="${esc(t.hex || '#cccccc')}" data-ti="${i}" data-tf="hex" title="Couleur">
      <input type="text" placeholder="Nom (ex: Rouge cerise)" value="${esc(t.nom || '')}" data-ti="${i}" data-tf="nom">
      <div class="teinte-photo">
        ${t.photo ? `<img src="${esc(t.photo)}" alt=""><button class="tp-x" data-tphotodel="${i}" type="button" title="Retirer">×</button>` : '<span class="tp-vide">—</span>'}
      </div>
      <button class="b ghost sm" data-tupload="${i}" type="button">${t.photo ? 'Changer' : 'Photo'}</button>
      <button class="b danger sm" data-tdel="${i}" type="button">×</button>
      <input type="file" accept="image/*" data-tfile="${i}" hidden>
    </div>`).join('');
  $('#mp-teintes').querySelectorAll('input[type=color],input[type=text]').forEach(inp => inp.oninput = () => {
    teintesEdit[+inp.dataset.ti][inp.dataset.tf] = inp.value;
  });
  $('#mp-teintes').querySelectorAll('[data-tdel]').forEach(b => b.onclick = () => { teintesEdit.splice(+b.dataset.tdel, 1); rendreTeintes(); });
  $('#mp-teintes').querySelectorAll('[data-tphotodel]').forEach(b => b.onclick = () => { teintesEdit[+b.dataset.tphotodel].photo = null; rendreTeintes(); });
  $('#mp-teintes').querySelectorAll('[data-tupload]').forEach(b => b.onclick = () => {
    $('#mp-teintes').querySelector(`[data-tfile="${b.dataset.tupload}"]`).click();
  });
  $('#mp-teintes').querySelectorAll('[data-tfile]').forEach(inp => inp.onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    const i = +inp.dataset.tfile;
    $('#mp-err').textContent = 'Téléversement de la photo de teinte…';
    const r = await televerser(f);
    $('#mp-err').textContent = r.error ? ('Erreur upload : ' + r.error) : '';
    if (r.url) { teintesEdit[i].photo = r.url; rendreTeintes(); }
  });
}

function rendrePhotos() {
  $('#mp-photos').innerHTML = photosEdit.map((u, i) => `
    <div class="photo-vig"><img src="${esc(u)}" alt=""><button data-pdel="${i}" type="button">×</button></div>`).join('');
  $('#mp-photos').querySelectorAll('[data-pdel]').forEach(b => b.onclick = () => { photosEdit.splice(+b.dataset.pdel, 1); rendrePhotos(); });
}

function ouvrirProduit(p) {
  editId = p ? p.id : null;
  $('#mp-titre').textContent = p ? 'Modifier le produit' : 'Nouveau produit';
  $('#mp-nom').value = p?.nom || '';
  $('#mp-slug').value = p?.slug || '';
  $('#mp-categorie').value = p?.categorie || '';
  $('#mp-ordre').value = p?.ordre ?? 0;
  $('#mp-description').value = p?.description || '';
  $('#mp-prix').value = p?.prix ?? '';
  $('#mp-promo').value = p?.prix_promo ?? '';
  $('#mp-dimensions').value = p?.dimensions || '';
  $('#mp-delai').value = p?.delai || '';
  $('#mp-visible').checked = p ? p.visible : true;
  teintesEdit = p && Array.isArray(p.teintes) ? JSON.parse(JSON.stringify(p.teintes)) : [];
  photosEdit = p && Array.isArray(p.photos) ? [...p.photos] : [];
  $('#mp-err').textContent = '';
  rendreTeintes(); rendrePhotos();
  $('#modal-produit').classList.add('ouvert');
}
function fermerProduit() { $('#modal-produit').classList.remove('ouvert'); }

$('#btn-add-produit').onclick = () => ouvrirProduit(null);
$('#mp-annuler').onclick = fermerProduit;
$('#mp-add-teinte').onclick = () => { teintesEdit.push({ nom: '', hex: '#cccccc' }); rendreTeintes(); };
$('#mp-nom').addEventListener('blur', () => { if (!$('#mp-slug').value.trim()) $('#mp-slug').value = slugify($('#mp-nom').value); });

$('#mp-file').addEventListener('change', async (e) => {
  const files = [...e.target.files];
  if (!files.length) return;
  $('#mp-err').textContent = 'Téléversement des photos…';
  for (const f of files) {
    const r = await televerser(f);
    if (r.error) { $('#mp-err').textContent = 'Erreur upload : ' + r.error; continue; }
    photosEdit.push(r.url);
  }
  $('#mp-err').textContent = '';
  $('#mp-file').value = '';
  rendrePhotos();
});

$('#mp-save').onclick = async () => {
  const err = $('#mp-err'); err.textContent = '';
  const nom = $('#mp-nom').value.trim();
  let slug = $('#mp-slug').value.trim() || slugify(nom);
  const prix = parseFloat($('#mp-prix').value);
  if (!nom) { err.textContent = 'Le nom est obligatoire.'; return; }
  if (!slug) { err.textContent = 'Le slug est obligatoire.'; return; }
  if (isNaN(prix)) { err.textContent = 'Le prix est obligatoire.'; return; }
  const promoRaw = $('#mp-promo').value.trim();
  const rec = {
    nom, slug,
    categorie: $('#mp-categorie').value.trim() || null,
    ordre: parseInt($('#mp-ordre').value, 10) || 0,
    description: $('#mp-description').value.trim() || null,
    prix,
    prix_promo: promoRaw === '' ? null : parseFloat(promoRaw),
    dimensions: $('#mp-dimensions').value.trim() || null,
    delai: $('#mp-delai').value.trim() || null,
    teintes: teintesEdit.filter(t => (t.nom || '').trim()),
    photos: photosEdit,
    visible: $('#mp-visible').checked
  };
  const btn = $('#mp-save'); btn.disabled = true; btn.textContent = 'Enregistrement…';
  let error;
  if (editId) ({ error } = await supabase.from('produits').update(rec).eq('id', editId));
  else ({ error } = await supabase.from('produits').insert([rec]));
  btn.disabled = false; btn.textContent = 'Enregistrer';
  if (error) { err.textContent = error.message.includes('duplicate') ? 'Ce slug existe déjà, choisissez-en un autre.' : 'Erreur : ' + error.message; return; }
  fermerProduit();
  chargerProduits();
};

// =====================================================================
//  COMMANDES
// =====================================================================
let COMMANDES = [];

async function chargerCommandes() {
  const { data, error } = await supabase.from('commandes').select('*').order('created_at', { ascending: false });
  const body = $('#commandes-body');
  if (error) { body.innerHTML = `<tr><td colspan="9" class="vide">Erreur de chargement.</td></tr>`; return; }
  COMMANDES = data || [];
  rendreKpisCommandes();
  if (!COMMANDES.length) { body.innerHTML = `<tr><td colspan="9" class="vide">Aucune commande pour le moment.</td></tr>`; return; }

  body.innerHTML = COMMANDES.map(c => {
    const opts = STATUTS.map(s => `<option value="${s}" ${s === c.statut ? 'selected' : ''}>${s}</option>`).join('');
    return `<tr>
      <td style="white-space:nowrap">${fmtDate(c.created_at)}</td>
      <td><b>${esc(c.client_nom)}</b><br><span style="color:#8f8a82;font-size:12px">${esc(c.client_tel)}${c.client_ville ? ' · ' + esc(c.client_ville) : ''}</span></td>
      <td>${esc(c.produit_nom || '')}${c.teinte ? `<br><span style="color:#8f8a82;font-size:12px">${esc(c.teinte)}</span>` : ''}</td>
      <td>${c.quantite}</td>
      <td style="white-space:nowrap">${fmtMAD(c.total)}</td>
      <td><input type="checkbox" data-acompte="${c.id}" ${c.acompte_recu ? 'checked' : ''}></td>
      <td><span class="pastille-etat" style="background:${STATUT_COULEUR[c.statut] || '#999'}"></span>
          <select class="statut" data-statut="${c.id}">${opts}</select></td>
      <td><span class="badge">${esc(c.source || 'site')}</span></td>
      <td style="white-space:nowrap">
        <button class="b ghost sm" data-notes="${c.id}" title="Notes">${c.notes ? '📝' : '+'}</button>
        <button class="b danger sm" data-delc="${c.id}" title="Supprimer">×</button>
      </td>
    </tr>`;
  }).join('');

  body.querySelectorAll('[data-delc]').forEach(b => b.onclick = async () => {
    const c = COMMANDES.find(x => x.id === b.dataset.delc);
    if (!confirm(`Supprimer la commande de « ${c.client_nom} » ?`)) return;
    await supabase.from('commandes').delete().eq('id', c.id);
    chargerCommandes();
  });

  body.querySelectorAll('[data-statut]').forEach(sel => sel.onchange = async () => {
    await supabase.from('commandes').update({ statut: sel.value }).eq('id', sel.dataset.statut);
    chargerCommandes();
  });
  body.querySelectorAll('[data-acompte]').forEach(chk => chk.onchange = async () => {
    await supabase.from('commandes').update({ acompte_recu: chk.checked }).eq('id', chk.dataset.acompte);
  });
  body.querySelectorAll('[data-notes]').forEach(b => b.onclick = async () => {
    const c = COMMANDES.find(x => x.id === b.dataset.notes);
    const val = prompt('Notes sur cette commande :', c.notes || '');
    if (val === null) return;
    await supabase.from('commandes').update({ notes: val }).eq('id', c.id);
    chargerCommandes();
  });
}

function rendreKpisCommandes() {
  const livrees = COMMANDES.filter(c => c.statut === 'Livré');
  const retournees = COMMANDES.filter(c => c.statut === 'Retourné');
  const enCours = COMMANDES.filter(c => ['Nouveau', 'Confirmé', 'Acompte reçu', 'Expédié'].includes(c.statut));
  const ca = livrees.reduce((s, c) => s + Number(c.total || 0), 0);
  const denom = livrees.length + retournees.length;
  const taux = denom ? Math.round(livrees.length / denom * 100) : null;
  $('#cmd-kpis').innerHTML = `
    <div class="kpi"><div class="lab">CA livré</div><div class="val">${fmtMAD(ca)}</div></div>
    <div class="kpi"><div class="lab">Commandes en cours</div><div class="val">${enCours.length}</div></div>
    <div class="kpi"><div class="lab">Taux de livraison</div><div class="val">${taux === null ? '—' : taux + '<small>%</small>'}<small> (${livrees.length} livrées / ${retournees.length} retours)</small></div></div>`;
}

// ---- commande manuelle ----
function ouvrirCommande() {
  $('#mc-nom').value = ''; $('#mc-tel').value = ''; $('#mc-ville').value = '';
  $('#mc-teinte').value = ''; $('#mc-qte').value = 1; $('#mc-total').value = '';
  $('#mc-notes').value = ''; $('#mc-acompte').checked = false; $('#mc-err').textContent = '';
  $('#mc-produit').innerHTML = '<option value="">— Produit —</option>' + PRODUITS.map(p => `<option value="${p.id}">${esc(p.nom)}</option>`).join('');
  $('#mc-statut').innerHTML = STATUTS.map(s => `<option value="${s}">${s}</option>`).join('');
  $('#modal-commande').classList.add('ouvert');
}
$('#btn-refresh-cmd').onclick = () => chargerCommandes();
$('#btn-add-commande').onclick = ouvrirCommande;
$('#mc-annuler').onclick = () => $('#modal-commande').classList.remove('ouvert');
$('#mc-produit').onchange = () => {
  const p = PRODUITS.find(x => x.id === $('#mc-produit').value);
  if (p && !$('#mc-total').value) {
    const unit = (p.prix_promo != null && +p.prix_promo > 0) ? p.prix_promo : p.prix;
    $('#mc-total').value = unit * (parseInt($('#mc-qte').value, 10) || 1);
  }
};
$('#mc-save').onclick = async () => {
  const err = $('#mc-err'); err.textContent = '';
  const nom = $('#mc-nom').value.trim(), tel = $('#mc-tel').value.trim();
  if (!nom || !tel) { err.textContent = 'Nom et téléphone obligatoires.'; return; }
  const p = PRODUITS.find(x => x.id === $('#mc-produit').value);
  const q = Math.max(1, parseInt($('#mc-qte').value, 10) || 1);
  const rec = {
    client_nom: nom, client_tel: tel, client_ville: $('#mc-ville').value.trim() || null,
    produit_id: p ? p.id : null, produit_nom: p ? p.nom : null,
    teinte: $('#mc-teinte').value.trim() || null, quantite: q,
    prix_unitaire: p ? ((p.prix_promo != null && +p.prix_promo > 0) ? p.prix_promo : p.prix) : null,
    total: parseFloat($('#mc-total').value) || 0,
    statut: $('#mc-statut').value, acompte_recu: $('#mc-acompte').checked,
    notes: $('#mc-notes').value.trim() || null, source: $('#mc-source').value
  };
  const btn = $('#mc-save'); btn.disabled = true; btn.textContent = 'Création…';
  const { error } = await supabase.from('commandes').insert([rec]);
  btn.disabled = false; btn.textContent = 'Créer la commande';
  if (error) { err.textContent = 'Erreur : ' + error.message; return; }
  $('#modal-commande').classList.remove('ouvert');
  chargerCommandes();
};

// =====================================================================
//  ANALYTICS
// =====================================================================
function barres(cible, entrees) {
  const max = Math.max(1, ...entrees.map(e => e.val));
  cible.innerHTML = entrees.length ? entrees.map(e => `
    <div class="chart-ligne">
      <span class="chart-lab" title="${esc(e.lab)}">${esc(e.lab)}</span>
      <div class="chart-barre"><span style="width:${Math.round(e.val / max * 100)}%"></span></div>
      <span class="chart-val">${e.val}</span>
    </div>`).join('') : '<div class="vide">Aucune donnée pour le moment.</div>';
}

async function chargerAnalytics() {
  const { data: evts } = await supabase.from('evenements').select('*').order('created_at', { ascending: false }).limit(10000);
  const events = evts || [];
  const cnt = (t) => events.filter(e => e.type === t).length;

  // KPIs
  $('#ana-kpis').innerHTML = `
    <div class="kpi"><div class="lab">Visites</div><div class="val">${cnt('visite')}</div></div>
    <div class="kpi"><div class="lab">Vues produit</div><div class="val">${cnt('vue_produit')}</div></div>
    <div class="kpi"><div class="lab">Commandes</div><div class="val">${cnt('commande')}</div></div>`;

  // visites par jour (14 j)
  const jours = [];
  for (let i = 13; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); jours.push(d.toISOString().slice(0, 10)); }
  const parJour = jours.map(j => ({
    lab: new Date(j).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
    val: events.filter(e => e.type === 'visite' && (e.created_at || '').slice(0, 10) === j).length
  }));
  barres($('#chart-visites'), parJour);

  // produits les plus vus
  const vpMap = {};
  events.filter(e => e.type === 'vue_produit' && e.produit_id).forEach(e => { vpMap[e.produit_id] = (vpMap[e.produit_id] || 0) + 1; });
  const nomProduit = (id) => (PRODUITS.find(p => p.id === id)?.nom) || 'Produit supprimé';
  const topProduits = Object.entries(vpMap).map(([id, val]) => ({ lab: nomProduit(id), val })).sort((a, b) => b.val - a.val).slice(0, 8);
  barres($('#chart-produits'), topProduits);

  // pages les plus vues
  const pgMap = {};
  events.filter(e => e.type === 'visite').forEach(e => { const p = e.page || '?'; pgMap[p] = (pgMap[p] || 0) + 1; });
  const topPages = Object.entries(pgMap).map(([lab, val]) => ({ lab, val })).sort((a, b) => b.val - a.val).slice(0, 8);
  barres($('#chart-pages'), topPages);

  // funnel
  const etapes = [
    { lab: 'Visites', val: cnt('visite') },
    { lab: 'Vues produit', val: cnt('vue_produit') },
    { lab: 'Clics « Commander »', val: cnt('clic_commander') },
    { lab: 'Commandes', val: cnt('commande') }
  ];
  const base = etapes[0].val || 1;
  $('#funnel').innerHTML = etapes.map((e, i) => {
    const tx = i === 0 ? '100%' : Math.round(e.val / base * 100) + '% des visites';
    return `<div class="funnel-etape"><span>${e.lab}</span><span><b>${e.val}</b> <span class="tx">${tx}</span></span></div>`;
  }).join('');
}

$('#btn-refresh-analytics').onclick = () => chargerAnalytics();

// fermeture modales au clic sur le fond
document.querySelectorAll('.amodal').forEach(m => m.addEventListener('click', (e) => { if (e.target === m) m.classList.remove('ouvert'); }));

init();
