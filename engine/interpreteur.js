import { doitPreciserPose, KITS, PRODUITS } from "./catalogue.js";
import { ajouterLigne, ErreurMetier, supprimerLigne, syncAccessoires } from "./devis.js";

/**
 * Interprète du langage chantier, SANS LLM : règles + alias du catalogue.
 * Le contrat (message, devis) → texte de réponse + devis modifié est volontairement étroit :
 * un interpréteur LLM (qui renverrait des {produitId, qte, pose}) peut le remplacer sans toucher au reste.
 */

const MOTS_NB = {
	un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6,
	sept: 7, huit: 8, neuf: 9, dix: 10, douze: 12,
};
const MARQUES_ABSENTES = ["hager", "schneider", "legrand", "elko", "berker", "siemens"];
const COULEURS_NON_GEREES = ["noir", "anthracite", "gris", "alu", "inox", "ivoire", "creme"];
const RETRAIT = /^(enleve|enlever|supprime|supprimer|retire|retirer|efface|effacer)\b/;

/** Minuscules, sans accents, décimales et sections de câble normalisées (« 3 x 1,5 » → « 3x1.5 »). */
export function normaliser(texte) {
	return texte
		.toLowerCase()
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "")
		.replace(/[’‘`]/g, "'")
		.replace(/va[\s_-]+et[\s_-]+vient/g, "vaetvient")
		.replace(/(\d),(\d)/g, "$1.$2")
		.replace(/(\d)\s*[x×]\s*(\d)/g, "$1x$2");
}

const singulier = (t) =>
	/^\d/.test(t) || t.length <= 3 || !/[sx]$/.test(t) ? t : t.slice(0, -1);

const tokeniser = (seg) =>
	(seg.match(/[a-z0-9]+(?:\.[0-9]+)?/g) ?? []).map(singulier);

/** « va-et-vient » protégé avant le découpage, sinon son « et » coupe le segment. */
function decouper(message) {
	return message
		.replace(/va[\s_-]+et[\s_-]+vient/gi, "va_et_vient")
		.split(/[;\n+]|,\s+|\s+et\s+/i)
		.map((s) => s.trim())
		.filter(Boolean);
}

function extraireQuantites(seg) {
	const m = seg.match(
		/(?<![a-z0-9.])(\d+(?:\.\d+)?)\s*(?:ml|metres?|mtr|m)(?![a-z0-9.])/,
	);
	const nb = seg.match(/^\s*(\d+)\s*(?:[x×]\s+|\s+)(?=[a-z])/);
	const mot = seg.match(/^\s*(un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|douze)\s/);
	return {
		metres: m ? Number(m[1]) : null,
		compte: nb ? Number(nb[1]) : mot ? MOTS_NB[mot[1]] : null,
	};
}

function score(def, tokens) {
	if (def.sauf?.some((t) => tokens.has(t))) return 0;
	let best = 0;
	for (const alias of def.alias)
		if (alias.length && alias.every((t) => tokens.has(t)))
			best = Math.max(best, alias.length);
	return best;
}

function trouverCible(tokens) {
	let meilleur = null;
	for (const kit of KITS) {
		const s = score(kit, tokens);
		if (s && (!meilleur || s + 0.5 > meilleur.s))
			meilleur = { kit, s: s + 0.5 };
	}
	for (const produit of PRODUITS.values()) {
		const s = score(produit, tokens);
		if (s && (!meilleur || s > meilleur.s)) meilleur = { produit, s };
	}
	return meilleur;
}

function gammeCitee(tokens) {
	if (tokens.has("standarddue") || (tokens.has("standard") && tokens.has("due")))
		return "eco";
	if (tokens.has("edizio") || tokens.has("ediziodue")) return "standard";
	if (tokens.has("premium") || tokens.has("design") || tokens.has("luxe"))
		return "premium";
	if (tokens.has("eco") || tokens.has("economique")) return "eco";
	return null;
}

function poseCitee(tokens) {
	if (["up", "encastre", "encastree"].some((t) => tokens.has(t))) return "UP";
	if (["ap", "apparent", "apparente", "saillie"].some((t) => tokens.has(t))) return "AP";
	return null;
}

const fmtQte = (qte, unite) => (unite === "m" ? `${qte} m` : `${qte} ×`);

/** Modifie `devis` d'après `message` ; retourne la réponse texte du bot. */
export function interpreter(message, devis) {
	if (typeof message !== "string" || !message.trim())
		throw new ErreurMetier("Message vide.");
	if (message.length > 2000)
		throw new ErreurMetier("Message trop long (2000 caractères max).");

	const idsAvant = new Set(devis.lignes.map((l) => l.id));
	const ajouts = [];
	const retraits = [];
	const inconnus = [];
	const notes = new Set();

	for (const brut of decouper(message)) {
		const seg = normaliser(brut);
		const tokens = new Set(tokeniser(seg));
		for (const m of MARQUES_ABSENTES)
			if (tokens.has(m))
				notes.add(`Marque « ${m} » absente du catalogue démo (Feller seulement) : ignorée.`);
		for (const c of COULEURS_NON_GEREES)
			if (tokens.has(c))
				notes.add(`Couleur « ${c} » non gérée dans la démo : chiffré en blanc.`);

		const cible = trouverCible(tokens);
		if (!cible) {
			inconnus.push(brut.replace(/va_et_vient/gi, "va-et-vient"));
			continue;
		}
		const ids = cible.kit
			? cible.kit.composants.map((c) => c.id)
			: [cible.produit.id];

		if (RETRAIT.test(seg)) {
			const cibles = devis.lignes.filter(
				(l) => l.parentId === null && ids.includes(l.produitId),
			);
			for (const l of cibles) supprimerLigne(devis, l.id);
			(cibles.length ? retraits : inconnus).push(
				cibles.length
					? (cible.kit?.libelle ?? cible.produit.libelle)
					: `rien à retirer pour « ${brut} »`,
			);
			continue;
		}

		const { metres, compte } = extraireQuantites(seg);
		const gamme = gammeCitee(tokens);
		const pose = poseCitee(tokens);

		if (cible.kit) {
			const mult = compte ?? 1;
			const detail = cible.kit.composants.map((c) => {
				const produit = PRODUITS.get(c.id);
				ajouterLigne(devis, {
					produitId: c.id,
					pose: null,
					gamme: null,
					qte: c.qte * mult,
					origine: "kit",
				});
				return `${fmtQte(c.qte * mult, produit.unite)} ${produit.libelle}`;
			});
			ajouts.push(`${cible.kit.libelle} :\n    ${detail.join("\n    ")}`);
			continue;
		}

		const produit = cible.produit;
		let qte = produit.unite === "m" ? (metres ?? compte) : compte;
		if (qte === null) {
			qte = 1;
			if (produit.unite === "m")
				notes.add(`Pas de métrage pour « ${produit.libelle} » : 1 m par défaut, à corriger dans le devis.`);
		}
		const ligne = ajouterLigne(devis, {
			produitId: produit.id,
			pose,
			gamme,
			qte,
			origine: "saisi",
		});
		const attente = doitPreciserPose(produit, ligne.pose) ? " — pose à préciser" : "";
		ajouts.push(
			`${fmtQte(qte, produit.unite)} ${produit.libelle}${ligne.pose ? ` (${ligne.pose})` : ""}${attente}`,
		);
	}

	syncAccessoires(devis);

	const out = [];
	if (ajouts.length) out.push("Ajouté au devis :", ...ajouts.map((a) => `• ${a}`));
	const accessoires = new Map();
	for (const l of devis.lignes)
		if (l.parentId !== null && !idsAvant.has(l.id))
			accessoires.set(l.produitId, (accessoires.get(l.produitId) ?? 0) + l.qte);
	if (accessoires.size)
		out.push(
			`Accessoires obligatoires ajoutés : ${[...accessoires]
				.map(([id, q]) => `${q} × ${PRODUITS.get(id).libelle}`)
				.join(", ")}.`,
		);
	if (retraits.length) out.push(`Retiré : ${retraits.join(", ")}.`);
	if (inconnus.length)
		out.push(
			`Pas trouvé dans le catalogue démo : ${inconnus.map((s) => `« ${s} »`).join(", ")}.`,
		);
	if (devis.lignes.some((l) => doitPreciserPose(PRODUITS.get(l.produitId), l.pose)))
		out.push("Il me manque une info : choisis dans la liste (encastré ou apparent).");
	out.push(...notes);
	if (!ajouts.length && !retraits.length)
		out.push("Essaie par exemple : « 4 prises triples, 20 m de tube M25, 1 prise T23 four ».");
	return out.join("\n");
}
