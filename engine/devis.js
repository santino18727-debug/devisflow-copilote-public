import {
	article,
	doitPreciserPose,
	GAMMES,
	GAMMES_CLES,
	parseRef,
	poseEffective,
	produitDe,
} from "./catalogue.js";

/** Erreur attendue (saisie invalide) : le message est affichable tel quel à l'utilisateur. */
export class ErreurMetier extends Error {}

const r2 = (x) => Math.round(x * 100) / 100;
/** Arrondi commercial suisse au 0.05 (appliqué au TTC), comme dans DevisFlow. */
export const arrondi5cts = (x) => Math.round(x * 20) / 20;

/** Valeurs par défaut = hypothèses de démo, toutes modifiables dans l'UI. */
export const PARAMS_DEFAUT = {
	remisePct: 25,
	margeMatPct: 20,
	tauxHoraire: 110,
	tvaTaux: 8.1,
};
const BORNES = {
	remisePct: [0, 90],
	margeMatPct: [0, 300],
	tauxHoraire: [0, 1000],
	tvaTaux: [0, 30],
};
const ORIGINES = new Set(["saisi", "accessoire", "kit"]);
const MAX_LIGNES = 200;
const QTE_MAX = 100000;
export const MAX_PERSO = 50;
export const PRIX_MAX = 100000;
export const POSE_MAX_MIN = 600;

export function nouveauDevis(params = PARAMS_DEFAUT, gamme = "standard") {
	return {
		v: 1,
		gamme,
		params: { ...params },
		client: { nom: "", adresse: "" },
		objet: "",
		nextId: 1,
		lignes: [],
		accessoiresSupprimes: [],
		produitsPerso: [],
	};
}

function validerParams(partiel, base) {
	const out = { ...base };
	for (const [cle, [min, max]] of Object.entries(BORNES)) {
		if (partiel?.[cle] === undefined) continue;
		const n = Number(partiel[cle]);
		if (!Number.isFinite(n) || n < min || n > max)
			throw new ErreurMetier(`${cle} doit être entre ${min} et ${max}.`);
		out[cle] = n;
	}
	return out;
}

const chaine = (v, max) => (typeof v === "string" ? v.slice(0, max) : "");

/** Produits ajoutés par l'utilisateur, reconstruits champ par champ (jamais repris tels quels). */
function normaliserPerso(liste) {
	const out = [];
	const ids = new Set();
	for (const p of Array.isArray(liste) ? liste.slice(0, MAX_PERSO) : []) {
		const libelle = chaine(p?.libelle, 80).trim();
		const base = Number(p?.base);
		const poseMin = Number(p?.poseMin);
		const alias = (Array.isArray(p?.alias) ? p.alias.slice(0, 5) : [])
			.map((a) =>
				(Array.isArray(a) ? a.slice(0, 12) : []).filter(
					(t) => typeof t === "string" && /^[a-z0-9.]{1,30}$/.test(t),
				),
			)
			.filter((a) => a.length);
		if (
			typeof p?.id !== "string" ||
			!/^perso_\d{1,4}$/.test(p.id) ||
			ids.has(p.id) ||
			!libelle ||
			!["pce", "m"].includes(p.unite) ||
			!Number.isFinite(base) ||
			base < 0 ||
			base > PRIX_MAX ||
			!Number.isFinite(poseMin) ||
			poseMin < 0 ||
			poseMin > POSE_MAX_MIN ||
			!alias.length
		)
			continue;
		ids.add(p.id);
		out.push({
			id: p.id,
			libelle,
			unite: p.unite,
			base: r2(base),
			poseMin: r2(poseMin),
			alias,
			marque: "Produit ajouté (hors catalogue)",
			perso: true,
		});
	}
	return out;
}

/** Reconstruit un devis propre depuis un état venu du client (jamais fait confiance tel quel). */
export function normaliserDevis(entree) {
	const d = nouveauDevis();
	if (!entree || typeof entree !== "object") return d;
	if (GAMMES[entree.gamme]) d.gamme = entree.gamme;
	d.params = validerParams(entree.params, d.params);
	d.client = {
		nom: chaine(entree.client?.nom, 200),
		adresse: chaine(entree.client?.adresse, 300),
	};
	d.objet = chaine(entree.objet, 200);
	d.produitsPerso = normaliserPerso(entree.produitsPerso);

	const ids = new Set();
	for (const l of Array.isArray(entree.lignes)
		? entree.lignes.slice(0, MAX_LIGNES)
		: []) {
		const produit = produitDe(d, l?.produitId);
		const qte = Number(l?.qte);
		if (
			!produit ||
			!Number.isInteger(l.id) ||
			l.id < 1 ||
			ids.has(l.id) ||
			!Number.isFinite(qte) ||
			qte <= 0 ||
			qte > QTE_MAX
		)
			continue;
		ids.add(l.id);
		d.lignes.push({
			id: l.id,
			produitId: produit.id,
			pose: produit.poses?.includes(l.pose) ? l.pose : null,
			gamme: produit.gammes && GAMMES[l.gamme] ? l.gamme : null,
			qte: r2(qte),
			origine: ORIGINES.has(l.origine) ? l.origine : "saisi",
			parentId: Number.isInteger(l.parentId) ? l.parentId : null,
			...(l.manuel ? { manuel: true } : {}),
		});
	}
	d.lignes = d.lignes.filter((l) => l.parentId === null || ids.has(l.parentId));
	d.nextId = Math.max(0, ...ids) + 1;
	d.accessoiresSupprimes = (
		Array.isArray(entree.accessoiresSupprimes) ? entree.accessoiresSupprimes : []
	)
		.filter((s) => typeof s === "string" && /^\d+:[a-z0-9_.]+$/.test(s))
		.slice(0, MAX_LIGNES);
	return d;
}

export function ajouterLigne(devis, { produitId, pose, gamme, qte, origine }) {
	const produit = produitDe(devis, produitId);
	const p = poseEffective(produit, pose);
	const g = produit.gammes ? (gamme ?? null) : null;
	const existante = devis.lignes.find(
		(l) =>
			l.parentId === null &&
			l.produitId === produitId &&
			l.pose === p &&
			l.gamme === g,
	);
	const total = r2((existante?.qte ?? 0) + qte);
	if (!(qte > 0) || total > QTE_MAX)
		throw new ErreurMetier("Quantité invalide (1 à 100 000).");
	if (existante) {
		existante.qte = total;
		return existante;
	}
	if (devis.lignes.length >= MAX_LIGNES)
		throw new ErreurMetier(`Devis limité à ${MAX_LIGNES} lignes.`);
	const ligne = {
		id: devis.nextId++,
		produitId,
		pose: p,
		gamme: g,
		qte: r2(qte),
		origine,
		parentId: null,
	};
	devis.lignes.push(ligne);
	return ligne;
}

/** Retire une ligne ; une ligne mère emporte ses accessoires, un accessoire retiré ne revient pas. */
export function supprimerLigne(devis, id) {
	const ligne = devis.lignes.find((l) => l.id === id);
	if (!ligne) throw new ErreurMetier("Ligne introuvable.");
	if (ligne.parentId !== null)
		devis.accessoiresSupprimes.push(`${ligne.parentId}:${ligne.produitId}`);
	devis.lignes = devis.lignes.filter(
		(l) => l.id !== id && l.parentId !== id,
	);
}

/** Crée / met à jour les accessoires obligatoires des lignes dont la pose est connue. */
export function syncAccessoires(devis) {
	for (const parent of [...devis.lignes]) {
		if (parent.parentId !== null) continue;
		const produit = produitDe(devis, parent.produitId);
		if (doitPreciserPose(produit, parent.pose)) continue;
		const pose = poseEffective(produit, parent.pose);
		for (const r of produit.requiert ?? []) {
			if (r.siPose && r.siPose !== pose) continue;
			const qte = r2(parent.qte * r.qte);
			const existant = devis.lignes.find(
				(l) => l.parentId === parent.id && l.produitId === r.id,
			);
			if (existant) {
				if (!existant.manuel) existant.qte = qte;
				continue;
			}
			if (devis.accessoiresSupprimes.includes(`${parent.id}:${r.id}`)) continue;
			let fin = devis.lignes.indexOf(parent);
			while (devis.lignes[fin + 1]?.parentId === parent.id) fin++;
			devis.lignes.splice(fin + 1, 0, {
				id: devis.nextId++,
				produitId: r.id,
				pose: null,
				gamme: parent.gamme,
				qte,
				origine: "accessoire",
				parentId: parent.id,
			});
		}
	}
}

/** Applique une action de l'UI. Retourne un message de confirmation (ou rien). */
export function appliquerAction(devis, action) {
	switch (action?.type) {
		case "rafraichir":
			return;
		case "supprimer":
			supprimerLigne(devis, action.id);
			return "Ligne supprimée.";
		case "qte": {
			const ligne = devis.lignes.find((l) => l.id === action.id);
			const n = Number(action.qte);
			if (!ligne) throw new ErreurMetier("Ligne introuvable.");
			if (!Number.isFinite(n) || n <= 0 || n > QTE_MAX)
				throw new ErreurMetier("Quantité invalide (1 à 100 000).");
			ligne.qte = r2(n);
			if (ligne.parentId !== null) ligne.manuel = true;
			return;
		}
		case "choisir": {
			const ligne = devis.lignes.find((l) => l.id === action.id);
			const cible = parseRef(action.ref);
			if (!ligne || !cible || cible.produitId !== ligne.produitId)
				throw new ErreurMetier("Choix invalide.");
			ligne.pose = cible.pose;
			return "C'est noté.";
		}
		case "gamme":
			if (!GAMMES[action.gamme]) throw new ErreurMetier("Gamme inconnue.");
			devis.gamme = action.gamme;
			return;
		case "params":
			devis.params = validerParams(action.params, devis.params);
			return;
		case "client":
			devis.client = {
				nom: chaine(action.client?.nom, 200),
				adresse: chaine(action.client?.adresse, 300),
			};
			devis.objet = chaine(action.objet, 200);
			return;
		case "reset": {
			const neuf = nouveauDevis(devis.params, devis.gamme);
			neuf.produitsPerso = devis.produitsPerso;
			Object.assign(devis, neuf);
			return "Nouveau devis vide (tes réglages et tes produits ajoutés sont conservés).";
		}
		default:
			throw new ErreurMetier("Action inconnue.");
	}
}

function prixerLigne(devis, l, gammeGlobale) {
	const produit = produitDe(devis, l.produitId);
	const g = l.gamme ?? gammeGlobale;
	const aPreciser = doitPreciserPose(produit, l.pose);
	const vue = {
		id: l.id,
		parentId: l.parentId,
		produitId: produit.id,
		ref: null,
		libelle: produit.libelle,
		marque: null,
		gamme: produit.gammes ? g : null,
		unite: produit.unite,
		qte: l.qte,
		origine: l.origine,
		aPreciser,
		prixNetUnitaire: null,
		tempsPoseMin: produit.poseMin,
		puVente: null,
		montant: null,
	};
	if (aPreciser) return vue;
	const { remisePct, margeMatPct, tauxHoraire } = devis.params;
	const art = article(produit, l.pose, g);
	const net = r2(art.brut * (1 - remisePct / 100));
	// PU vente = matériel net + marge matériel, plus la main-d'œuvre de pose au taux horaire.
	const pu = r2(net * (1 + margeMatPct / 100) + (produit.poseMin / 60) * tauxHoraire);
	return {
		...vue,
		ref: art.ref,
		libelle: art.libelle,
		marque: art.marque,
		gamme: art.gamme,
		prixNetUnitaire: net,
		puVente: pu,
		montant: r2(l.qte * pu),
	};
}

export function totaux(lignesVue, tvaTaux) {
	const ht = r2(
		lignesVue.reduce((s, l) => s + (l.montant ?? 0), 0),
	);
	const tva = r2((ht * tvaTaux) / 100);
	return { ht, tva, ttc: arrondi5cts(ht + tva) };
}

/** Tout ce que l'UI affiche : lignes chiffrées, totaux, 3 offres comparées, questions ouvertes. */
export function calculerVue(devis) {
	const lignes = devis.lignes.map((l) => prixerLigne(devis, l, devis.gamme));
	const questions = [];
	for (const l of devis.lignes) {
		const produit = produitDe(devis, l.produitId);
		if (!doitPreciserPose(produit, l.pose)) continue;
		const g = l.gamme ?? devis.gamme;
		questions.push({
			ligneId: l.id,
			texte: `${l.qte} × ${produit.libelle} : encastré (UP) ou apparent (AP) ?`,
			options: produit.poses.map((p) => {
				const a = article(produit, p, g);
				return { ref: a.ref, libelle: a.libelle, marque: a.marque, gamme: a.gamme };
			}),
		});
	}
	const offres = GAMMES_CLES.map((g) => ({
		gamme: g,
		...totaux(
			devis.lignes.map((l) => prixerLigne(devis, l, g)),
			devis.params.tvaTaux,
		),
	}));
	return {
		lignes,
		totaux: totaux(lignes, devis.params.tvaTaux),
		offres,
		questions,
		avertissements: questions.length
			? [
					`${questions.length} ligne(s) à préciser : exclue(s) du total, du PDF et de la commande.`,
				]
			: [],
	};
}

/** Liste de commande matériel (CSV ; séparateur « ; » pour Excel suisse), sans aucun prix de vente. */
export function commandeCsv(devis) {
	const vue = calculerVue(devis);
	if (vue.questions.length)
		throw new ErreurMetier("Précise d'abord les lignes en attente.");
	if (!vue.lignes.length) throw new ErreurMetier("Devis vide.");
	const parRef = new Map();
	for (const l of vue.lignes) {
		const cur = parRef.get(l.ref);
		if (cur) cur.qte = r2(cur.qte + l.qte);
		else parRef.set(l.ref, { ...l });
	}
	const cellule = (s) => `"${String(s).replace(/"/g, '""')}"`;
	const lignes = [
		["reference", "designation", "marque", "quantite", "unite", "prix_net_unitaire"],
		...[...parRef.values()].map((l) => [
			l.ref,
			l.libelle,
			l.marque,
			l.qte,
			l.unite,
			l.prixNetUnitaire.toFixed(2),
		]),
	];
	return `﻿${lignes.map((r) => r.map(cellule).join(";")).join("\r\n")}\r\n`;
}
