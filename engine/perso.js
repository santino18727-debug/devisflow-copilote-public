import {
	ajouterLigne,
	ErreurMetier,
	MAX_PERSO,
	POSE_MAX_MIN,
	PRIX_MAX,
	syncAccessoires,
} from "./devis.js";
import { normaliser, tokeniser } from "./interpreteur.js";

/**
 * Produit absent du catalogue : l'utilisateur le décrit (libellé, unité, prix brut, temps de pose)
 * et il rejoint `devis.produitsPerso`, reconnu ensuite par l'interpréteur comme n'importe quel produit.
 * Un produit ajouté n'a ni pose, ni gamme, ni accessoire obligatoire : il est chiffré tel que saisi.
 */

const MOTS_VIDES = new Set([
	"de", "du", "des", "la", "le", "les", "un", "une", "d", "l",
	"pour", "a", "au", "aux", "en", "et", "avec", "sur",
]);

const r2 = (x) => Math.round(x * 100) / 100;

function nombre(v, nom, min, max) {
	const n = Number(v);
	if (v === "" || v === null || !Number.isFinite(n) || n < min || n > max)
		throw new ErreurMetier(`${nom} doit être entre ${min} et ${max}.`);
	return n;
}

/** Ajoute le produit (ou réutilise le même s'il existe déjà) et pose la ligne au devis. */
export function ajouterProduitPerso(devis, saisie) {
	const libelle = typeof saisie?.libelle === "string" ? saisie.libelle.trim().slice(0, 80) : "";
	if (libelle.length < 2) throw new ErreurMetier("Donne un nom au produit (2 caractères min).");
	if (!["pce", "m"].includes(saisie.unite))
		throw new ErreurMetier("Unité : pièce ou mètre.");
	const prix = nombre(saisie.prix, "Le prix", 0, PRIX_MAX);
	const poseMin = nombre(saisie.poseMin ?? 0, "Le temps de pose (min)", 0, POSE_MAX_MIN);
	const qte = nombre(saisie.qte ?? 1, "La quantité", 0.01, 100000);

	const alias = [
		...new Set(tokeniser(normaliser(libelle)).filter((t) => !MOTS_VIDES.has(t))),
	].slice(0, 12);
	if (!alias.length)
		throw new ErreurMetier("Nom trop court pour être reconnu : ajoute un mot précis.");

	let produit = devis.produitsPerso.find((p) => p.alias[0].join(" ") === alias.join(" "));
	const dejaLa = Boolean(produit);
	if (!produit) {
		if (devis.produitsPerso.length >= MAX_PERSO)
			throw new ErreurMetier(`Maximum ${MAX_PERSO} produits ajoutés.`);
		const n = Math.max(0, ...devis.produitsPerso.map((p) => Number(p.id.slice(6)))) + 1;
		produit = {
			id: `perso_${n}`,
			libelle,
			unite: saisie.unite,
			base: r2(prix),
			poseMin: r2(poseMin),
			alias: [alias],
			marque: "Produit ajouté (hors catalogue)",
			perso: true,
		};
		devis.produitsPerso.push(produit);
	}
	ajouterLigne(devis, { produitId: produit.id, pose: null, gamme: null, qte, origine: "saisi" });
	syncAccessoires(devis);

	const quant = produit.unite === "m" ? `${r2(qte)} m` : `${r2(qte)} ×`;
	return dejaLa
		? `« ${produit.libelle} » était déjà dans ton catalogue (prix inchangé : CHF ${produit.base.toFixed(2)} brut). Ajouté au devis : ${quant}.`
		: `« ${produit.libelle} » ajouté à ton catalogue (CHF ${produit.base.toFixed(2)} brut) et au devis : ${quant}.`;
}
